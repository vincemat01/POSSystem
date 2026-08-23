-- Kompass POS — Tax/VAT support
-- Businesses can configure a tax rate. Prices can be tax-inclusive (default, common in SA)
-- or tax-exclusive. Individual products can be marked tax-exempt (zero-rated).

alter table businesses
  add column tax_rate numeric(5, 2) not null default 0,
  add column tax_inclusive boolean not null default true;

alter table products
  add column tax_exempt boolean not null default false;

-- Update record_sale to calculate and store tax_total
-- Drop the prior 9-parameter signature defensively — if this migration runs on a database where
-- 0021's ambiguous overload was never cleaned up, this removes it so only one signature remains.
drop function if exists record_sale(uuid, uuid, uuid, jsonb, jsonb, uuid, date, boolean, text);

create or replace function record_sale(
  p_business_id uuid,
  p_location_id uuid,
  p_client_transaction_id uuid,
  p_items jsonb,
  p_payments jsonb,
  p_customer_id uuid default null,
  p_credit_due_date date default null,
  p_allow_expired boolean default false,
  p_device_id text default null,
  p_loyalty_points_redeemed integer default 0
)
returns sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale sales;
  v_item jsonb;
  v_payment jsonb;
  v_product products;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_batch record;
  v_line_qty numeric;
  v_line_deducted numeric;
  v_line_cost_total numeric;
  v_line_unit_cost numeric;
  v_first_batch_id uuid;
  v_sale_item_id uuid;
  v_credit_amount numeric := 0;
  v_credit_account credit_accounts;
  v_available numeric;
  v_loyalty_enabled boolean;
  v_earn_rate numeric;
  v_point_value numeric;
  v_loyalty_discount numeric := 0;
  v_current_points integer;
  v_earned_points integer;
  v_tax_rate numeric;
  v_tax_inclusive boolean;
  v_tax_total numeric := 0;
  v_line_total numeric;
begin
  if not is_business_member(p_business_id) then
    raise exception 'Not a member of this business' using errcode = '42501';
  end if;

  select * into v_sale from sales
  where business_id = p_business_id and client_transaction_id = p_client_transaction_id;
  if found then
    return v_sale;
  end if;

  -- Load business settings
  select tax_rate, tax_inclusive, loyalty_enabled, loyalty_earn_rate, loyalty_point_value
  into v_tax_rate, v_tax_inclusive, v_loyalty_enabled, v_earn_rate, v_point_value
  from businesses where id = p_business_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_subtotal := v_subtotal + (v_item->>'quantity')::numeric * (v_item->>'unit_price')::numeric;
    v_discount := v_discount + coalesce((v_item->>'discount')::numeric, 0);
  end loop;

  -- Apply loyalty discount before inserting the sale
  if p_loyalty_points_redeemed > 0 and p_customer_id is not null then
    if not v_loyalty_enabled then
      raise exception 'Loyalty programme is not enabled' using errcode = 'P0001';
    end if;

    select loyalty_points into v_current_points
    from customers where id = p_customer_id and business_id = p_business_id
    for update;

    if v_current_points < p_loyalty_points_redeemed then
      raise exception 'Insufficient loyalty points (have %, trying to redeem %)', v_current_points, p_loyalty_points_redeemed
        using errcode = 'P0001';
    end if;

    v_loyalty_discount := least(
      p_loyalty_points_redeemed * v_point_value,
      v_subtotal - v_discount
    );
    v_discount := v_discount + v_loyalty_discount;
  end if;

  insert into sales (
    business_id, location_id, customer_id, cashier_id, sale_number,
    subtotal, discount_total, total, client_transaction_id, device_id
  ) values (
    p_business_id, p_location_id, p_customer_id, auth.uid(),
    'S' || to_char(now(), 'YYMMDDHH24MISS') || '-' || substr(p_client_transaction_id::text, 1, 4),
    v_subtotal, v_discount, v_subtotal - v_discount,
    p_client_transaction_id, p_device_id
  )
  returning * into v_sale;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from products where id = (v_item->>'product_id')::uuid and business_id = p_business_id;
    if not found then
      raise exception 'Unknown product %', v_item->>'product_id';
    end if;

    v_line_qty := (v_item->>'quantity')::numeric;
    v_first_batch_id := null;
    v_line_cost_total := 0;

    if v_product.tracks_expiry then
      for v_batch in
        select * from fefo_deduct(p_business_id, v_product.id, p_location_id, v_line_qty, p_allow_expired)
      loop
        if v_first_batch_id is null then
          v_first_batch_id := v_batch.batch_id;
        end if;
        v_line_cost_total := v_line_cost_total + v_batch.deducted_quantity * v_batch.unit_cost;

        insert into inventory_movements (
          business_id, product_id, location_id, batch_id, movement_type, quantity,
          reference_type, reference_id, created_by, client_transaction_id
        ) values (
          p_business_id, v_product.id, p_location_id, v_batch.batch_id, 'sale', -v_batch.deducted_quantity,
          'sale', v_sale.id, auth.uid(), p_client_transaction_id
        );
      end loop;
      v_line_unit_cost := v_line_cost_total / v_line_qty;
    else
      select coalesce(sum(quantity_on_hand), 0) into v_available
      from product_stock
      where business_id = p_business_id and product_id = v_product.id and location_id = p_location_id;

      if v_available < v_line_qty then
        raise exception 'Insufficient stock for product % (have %, need %)', v_product.name, v_available, v_line_qty
          using errcode = 'P0001';
      end if;

      v_line_unit_cost := v_product.cost_price;

      insert into inventory_movements (
        business_id, product_id, location_id, batch_id, movement_type, quantity,
        reference_type, reference_id, created_by, client_transaction_id
      ) values (
        p_business_id, v_product.id, p_location_id, null, 'sale', -v_line_qty,
        'sale', v_sale.id, auth.uid(), p_client_transaction_id
      );
    end if;

    insert into sale_items (
      business_id, sale_id, product_id, batch_id, quantity, unit_cost, unit_price, discount
    ) values (
      p_business_id, v_sale.id, v_product.id, v_first_batch_id, v_line_qty, v_line_unit_cost,
      (v_item->>'unit_price')::numeric, coalesce((v_item->>'discount')::numeric, 0)
    )
    returning id into v_sale_item_id;

    -- Calculate tax for this line item
    if v_tax_rate > 0 and not v_product.tax_exempt then
      v_line_total := v_line_qty * (v_item->>'unit_price')::numeric - coalesce((v_item->>'discount')::numeric, 0);
      if v_tax_inclusive then
        v_tax_total := v_tax_total + round(v_line_total - (v_line_total / (1 + v_tax_rate / 100)), 2);
      else
        v_tax_total := v_tax_total + round(v_line_total * v_tax_rate / 100, 2);
      end if;
    end if;
  end loop;

  -- For tax-exclusive: add tax to the sale total
  if v_tax_rate > 0 and not v_tax_inclusive and v_tax_total > 0 then
    update sales set
      tax_total = v_tax_total,
      total = total + v_tax_total
    where id = v_sale.id
    returning * into v_sale;
  elsif v_tax_total > 0 then
    update sales set tax_total = v_tax_total where id = v_sale.id;
    v_sale.tax_total := v_tax_total;
  end if;

  for v_payment in select * from jsonb_array_elements(p_payments)
  loop
    insert into payments (
      business_id, sale_id, method, amount, reference, received_by, tendered_amount, change_amount
    )
    values (
      p_business_id, v_sale.id, (v_payment->>'method')::payment_method,
      (v_payment->>'amount')::numeric, v_payment->>'reference', auth.uid(),
      nullif(v_payment->>'tendered_amount', '')::numeric,
      nullif(v_payment->>'change_amount', '')::numeric
    );

    if (v_payment->>'method')::payment_method = 'credit' then
      v_credit_amount := v_credit_amount + (v_payment->>'amount')::numeric;
    end if;
  end loop;

  if v_credit_amount > 0 then
    if p_customer_id is null then
      raise exception 'A customer is required for a credit sale' using errcode = 'P0001';
    end if;

    select * into v_credit_account from credit_accounts where customer_id = p_customer_id and business_id = p_business_id;
    if not found then
      insert into credit_accounts (business_id, customer_id) values (p_business_id, p_customer_id)
      returning * into v_credit_account;
    end if;

    insert into credit_transactions (
      business_id, credit_account_id, type, amount, sale_id, due_date, created_by, client_transaction_id
    ) values (
      p_business_id, v_credit_account.id, 'credit_sale', v_credit_amount, v_sale.id, p_credit_due_date,
      auth.uid(), p_client_transaction_id
    );
  end if;

  -- Loyalty programme: redeem and earn
  if p_customer_id is not null and v_loyalty_enabled then
    -- Record redemption
    if p_loyalty_points_redeemed > 0 then
      update customers set loyalty_points = loyalty_points - p_loyalty_points_redeemed
      where id = p_customer_id;

      insert into loyalty_transactions (business_id, customer_id, sale_id, type, points, description, created_by)
      values (p_business_id, p_customer_id, v_sale.id, 'redeemed', -p_loyalty_points_redeemed,
              'Points redeemed at checkout', auth.uid());
    end if;

    -- Earn points on the final sale total
    v_earned_points := floor(v_sale.total * v_earn_rate)::integer;
    if v_earned_points > 0 then
      update customers set loyalty_points = loyalty_points + v_earned_points
      where id = p_customer_id;

      insert into loyalty_transactions (business_id, customer_id, sale_id, type, points, description, created_by)
      values (p_business_id, p_customer_id, v_sale.id, 'earned', v_earned_points,
              'Points earned from purchase', auth.uid());
    end if;
  end if;

  insert into sync_queue (business_id, device_id, entity_type, entity_id, client_transaction_id)
  values (p_business_id, coalesce(v_sale.device_id, 'unknown'), 'sale', v_sale.id, p_client_transaction_id)
  on conflict (business_id, client_transaction_id) do nothing;

  return v_sale;
end;
$$;
