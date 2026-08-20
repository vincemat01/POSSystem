-- Kompass POS — cash tendered / change tracking on payments, for till reconciliation.
-- amount stays the true sale-share collected via this method (what actually stays in the
-- drawer); tendered_amount/change_amount are the customer-facing "gave R100, got R20 back"
-- figures, kept only as an audit trail — they never change what's counted as revenue.
alter table payments add column tendered_amount numeric(12, 2);
alter table payments add column change_amount numeric(12, 2);

-- Re-create record_sale to pass tendered_amount/change_amount through from p_payments when the
-- client supplies them (cash payments only) — everything else about the function is unchanged
-- from 0011/0012.
create or replace function record_sale(
  p_business_id uuid,
  p_location_id uuid,
  p_client_transaction_id uuid,
  p_items jsonb,
  p_payments jsonb,
  p_customer_id uuid default null,
  p_credit_due_date date default null,
  p_allow_expired boolean default false,
  p_device_id text default null
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
begin
  if not is_business_member(p_business_id) then
    raise exception 'Not a member of this business' using errcode = '42501';
  end if;

  select * into v_sale from sales
  where business_id = p_business_id and client_transaction_id = p_client_transaction_id;
  if found then
    return v_sale;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_subtotal := v_subtotal + (v_item->>'quantity')::numeric * (v_item->>'unit_price')::numeric;
    v_discount := v_discount + coalesce((v_item->>'discount')::numeric, 0);
  end loop;

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
  end loop;

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

  insert into sync_queue (business_id, device_id, entity_type, entity_id, client_transaction_id)
  values (p_business_id, coalesce(v_sale.device_id, 'unknown'), 'sale', v_sale.id, p_client_transaction_id)
  on conflict (business_id, client_transaction_id) do nothing;

  return v_sale;
end;
$$;
