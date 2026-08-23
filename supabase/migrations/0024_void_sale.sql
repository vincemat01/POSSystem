-- Kompass POS — Void Sale
-- A cashier/owner mistake (wrong items rung up, duplicate sale) needs to be cancelled entirely
-- and immediately — distinct from a Return, which represents a customer physically bringing
-- goods back later. Voiding never deletes the sale (spec §61): it restocks inventory, reverses
-- any credit-sale debt and loyalty points earned/redeemed on it, and flips status to 'voided'.
-- Only 'completed' sales (no returns yet applied) can be voided, and only by an owner/manager.

alter table sales
  add column if not exists void_reason text,
  add column if not exists voided_at timestamptz;

create or replace function void_sale(
  p_business_id uuid,
  p_sale_id uuid,
  p_reason text default null
)
returns sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale sales;
  v_sale_item sale_items;
  v_product products;
  v_batch record;
  v_credit_owed numeric;
  v_credit_account credit_accounts;
  v_loyalty_txn record;
  v_loyalty_reversed integer;
begin
  if not has_business_role(p_business_id, array['owner', 'manager']::business_role[]) then
    raise exception 'Only an owner or manager can void a sale' using errcode = '42501';
  end if;

  select * into v_sale from sales where id = p_sale_id and business_id = p_business_id;
  if not found then
    raise exception 'Sale not found' using errcode = 'P0001';
  end if;

  if v_sale.status <> 'completed' then
    raise exception 'Only a completed sale with no returns can be voided' using errcode = 'P0001';
  end if;

  -- Restock every line item at the sale's own location.
  for v_sale_item in select * from sale_items where sale_id = p_sale_id and business_id = p_business_id loop
    select * into v_product from products where id = v_sale_item.product_id and business_id = p_business_id;

    if v_product.tracks_expiry and v_sale_item.batch_id is not null then
      update inventory_batches
      set quantity_remaining = quantity_remaining + v_sale_item.quantity
      where id = v_sale_item.batch_id;

      insert into inventory_movements (
        business_id, product_id, location_id, batch_id, movement_type, quantity,
        reference_type, reference_id, created_by
      ) values (
        p_business_id, v_product.id, v_sale.location_id, v_sale_item.batch_id, 'return', v_sale_item.quantity,
        'void', v_sale.id, auth.uid()
      );
    elsif v_product.tracks_expiry then
      select * into v_batch from inventory_batches
      where business_id = p_business_id and product_id = v_product.id and location_id = v_sale.location_id
      order by expiry_date asc nulls last
      limit 1;

      if found then
        update inventory_batches
        set quantity_remaining = quantity_remaining + v_sale_item.quantity,
            quantity_received = greatest(quantity_received, quantity_remaining + v_sale_item.quantity)
        where id = v_batch.id;

        insert into inventory_movements (
          business_id, product_id, location_id, batch_id, movement_type, quantity,
          reference_type, reference_id, created_by
        ) values (
          p_business_id, v_product.id, v_sale.location_id, v_batch.id, 'return', v_sale_item.quantity,
          'void', v_sale.id, auth.uid()
        );
      else
        insert into inventory_movements (
          business_id, product_id, location_id, movement_type, quantity,
          reference_type, reference_id, created_by
        ) values (
          p_business_id, v_product.id, v_sale.location_id, 'return', v_sale_item.quantity,
          'void', v_sale.id, auth.uid()
        );
      end if;
    else
      insert into inventory_movements (
        business_id, product_id, location_id, movement_type, quantity,
        reference_type, reference_id, created_by
      ) values (
        p_business_id, v_product.id, v_sale.location_id, 'return', v_sale_item.quantity,
        'void', v_sale.id, auth.uid()
      );
    end if;
  end loop;

  -- Reverse any credit-sale debt this sale created.
  select coalesce(sum(amount), 0) into v_credit_owed
  from credit_transactions
  where business_id = p_business_id and sale_id = p_sale_id and type = 'credit_sale';

  if v_credit_owed > 0 then
    select * into v_credit_account from credit_accounts
    where customer_id = v_sale.customer_id and business_id = p_business_id;

    if found then
      insert into credit_transactions (
        business_id, credit_account_id, type, amount, sale_id, notes, created_by
      ) values (
        p_business_id, v_credit_account.id, 'adjustment', -v_credit_owed, p_sale_id,
        'Reversal for voided sale ' || v_sale.sale_number, auth.uid()
      );
    end if;
  end if;

  -- Reverse any loyalty points earned or redeemed on this sale.
  for v_loyalty_txn in select * from loyalty_transactions where business_id = p_business_id and sale_id = p_sale_id loop
    v_loyalty_reversed := -v_loyalty_txn.points;

    update customers set loyalty_points = loyalty_points + v_loyalty_reversed
    where id = v_loyalty_txn.customer_id and business_id = p_business_id;

    insert into loyalty_transactions (
      business_id, customer_id, sale_id, type, points, description, created_by
    ) values (
      p_business_id, v_loyalty_txn.customer_id, p_sale_id, 'adjustment', v_loyalty_reversed,
      'Reversed: sale ' || v_sale.sale_number || ' voided', auth.uid()
    );
  end loop;

  update sales
  set status = 'voided', void_reason = p_reason, voided_at = now()
  where id = p_sale_id
  returning * into v_sale;

  return v_sale;
end;
$$;
