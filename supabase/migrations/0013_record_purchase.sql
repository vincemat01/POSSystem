-- Kompass POS — record_purchase: the single, transactional entry point for receiving stock.
-- Atomically creates a purchase header, line items, inventory batches, and stock movements.
-- Updates product cost prices and supplier_products metadata.
-- security definer: writes across multiple RLS-protected tables in one transaction.
create or replace function record_purchase(
  p_business_id uuid,
  p_location_id uuid,
  p_items jsonb,
  p_supplier_id uuid default null,
  p_purchase_date date default current_date,
  p_notes text default null
)
returns purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase purchases;
  v_item jsonb;
  v_product products;
  v_batch inventory_batches;
  v_total numeric := 0;
  v_qty numeric;
  v_cost numeric;
  v_expiry date;
begin
  if not is_business_member(p_business_id) then
    raise exception 'Not a member of this business' using errcode = '42501';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_total := v_total + (v_item->>'quantity')::numeric * (v_item->>'unit_cost')::numeric;
  end loop;

  insert into purchases (business_id, location_id, supplier_id, purchase_date, total_cost, notes, created_by)
  values (p_business_id, p_location_id, p_supplier_id, p_purchase_date, v_total, p_notes, auth.uid())
  returning * into v_purchase;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products
    where id = (v_item->>'product_id')::uuid and business_id = p_business_id;

    if not found then
      raise exception 'Unknown product %', v_item->>'product_id' using errcode = 'P0001';
    end if;

    v_qty := (v_item->>'quantity')::numeric;
    v_cost := (v_item->>'unit_cost')::numeric;
    v_expiry := case
      when v_item->>'expiry_date' is not null and v_item->>'expiry_date' != ''
      then (v_item->>'expiry_date')::date else null end;

    insert into inventory_batches (
      business_id, product_id, location_id, supplier_id, purchase_id,
      quantity_received, quantity_remaining, unit_cost, received_date, expiry_date
    ) values (
      p_business_id, v_product.id, p_location_id, p_supplier_id, v_purchase.id,
      v_qty, v_qty, v_cost, p_purchase_date, v_expiry
    )
    returning * into v_batch;

    insert into purchase_items (business_id, purchase_id, product_id, batch_id, quantity, unit_cost)
    values (p_business_id, v_purchase.id, v_product.id, v_batch.id, v_qty, v_cost);

    insert into inventory_movements (
      business_id, product_id, location_id, batch_id, movement_type, quantity,
      reference_type, reference_id, created_by
    ) values (
      p_business_id, v_product.id, p_location_id, v_batch.id, 'purchase',
      v_qty, 'purchase', v_purchase.id, auth.uid()
    );

    update products set cost_price = v_cost
    where id = v_product.id and business_id = p_business_id;

    if p_supplier_id is not null then
      insert into supplier_products (business_id, supplier_id, product_id, last_cost_price, last_purchase_date)
      values (p_business_id, p_supplier_id, v_product.id, v_cost, p_purchase_date)
      on conflict (supplier_id, product_id)
      do update set last_cost_price = excluded.last_cost_price, last_purchase_date = excluded.last_purchase_date;
    end if;
  end loop;

  return v_purchase;
end;
$$;
