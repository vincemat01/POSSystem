-- Kompass POS — record_stock_take: atomically finalize a stock count.
-- For each counted product, snapshots the system quantity, records the difference, and creates
-- inventory movements to reconcile. Expiry-tracked products with negative differences go through
-- fefo_deduct (oldest batches reduced first); positive differences create an adjustment batch.
-- security definer: writes across multiple RLS-protected tables and calls fefo_deduct.
create or replace function record_stock_take(
  p_business_id uuid,
  p_location_id uuid,
  p_items jsonb
)
returns stock_takes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock_take stock_takes;
  v_item jsonb;
  v_product products;
  v_system_qty numeric;
  v_counted_qty numeric;
  v_diff numeric;
  v_batch record;
  v_new_batch inventory_batches;
begin
  if not is_business_member(p_business_id) then
    raise exception 'Not a member of this business' using errcode = '42501';
  end if;

  insert into stock_takes (business_id, location_id, status, started_by, completed_at)
  values (p_business_id, p_location_id, 'completed', auth.uid(), now())
  returning * into v_stock_take;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products
    where id = (v_item->>'product_id')::uuid and business_id = p_business_id;

    if not found then
      raise exception 'Unknown product %', v_item->>'product_id' using errcode = 'P0001';
    end if;

    select coalesce(sum(quantity_on_hand), 0) into v_system_qty
    from product_stock
    where business_id = p_business_id
      and product_id = v_product.id
      and location_id = p_location_id;

    v_counted_qty := (v_item->>'counted_quantity')::numeric;
    v_diff := v_counted_qty - v_system_qty;

    insert into stock_take_items (
      business_id, stock_take_id, product_id, system_quantity, counted_quantity, reason
    ) values (
      p_business_id, v_stock_take.id, v_product.id, v_system_qty, v_counted_qty,
      v_item->>'reason'
    );

    if v_diff = 0 then continue; end if;

    if v_product.tracks_expiry then
      if v_diff < 0 then
        for v_batch in
          select * from fefo_deduct(p_business_id, v_product.id, p_location_id, abs(v_diff), true)
        loop
          insert into inventory_movements (
            business_id, product_id, location_id, batch_id, movement_type, quantity,
            reference_type, reference_id, notes, created_by
          ) values (
            p_business_id, v_product.id, p_location_id, v_batch.batch_id, 'stock_take',
            -v_batch.deducted_quantity, 'stock_take', v_stock_take.id,
            v_item->>'reason', auth.uid()
          );
        end loop;
      else
        insert into inventory_batches (
          business_id, product_id, location_id,
          quantity_received, quantity_remaining, unit_cost, received_date
        ) values (
          p_business_id, v_product.id, p_location_id,
          v_diff, v_diff, v_product.cost_price, current_date
        )
        returning * into v_new_batch;

        insert into inventory_movements (
          business_id, product_id, location_id, batch_id, movement_type, quantity,
          reference_type, reference_id, notes, created_by
        ) values (
          p_business_id, v_product.id, p_location_id, v_new_batch.id, 'stock_take',
          v_diff, 'stock_take', v_stock_take.id,
          v_item->>'reason', auth.uid()
        );
      end if;
    else
      insert into inventory_movements (
        business_id, product_id, location_id, movement_type, quantity,
        reference_type, reference_id, notes, created_by
      ) values (
        p_business_id, v_product.id, p_location_id, 'stock_take',
        v_diff, 'stock_take', v_stock_take.id,
        v_item->>'reason', auth.uid()
      );
    end if;
  end loop;

  return v_stock_take;
end;
$$;
