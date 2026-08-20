-- Kompass POS — returns/refunds: tables, RLS, and the record_return RPC.

create table returns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  sale_id uuid not null references sales (id) on delete cascade,
  return_number text not null,
  total numeric(12, 2) not null,
  refund_method text not null,
  notes text,
  client_transaction_id uuid,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index returns_sale_id_idx on returns (sale_id);
create unique index returns_client_txn_unique
  on returns (business_id, client_transaction_id)
  where client_transaction_id is not null;

create table return_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  return_id uuid not null references returns (id) on delete cascade,
  sale_item_id uuid not null references sale_items (id) on delete restrict,
  product_id uuid not null references products (id) on delete restrict,
  quantity numeric(12, 3) not null,
  unit_price numeric(12, 2) not null
);

create index return_items_return_id_idx on return_items (return_id);

alter table returns enable row level security;
alter table return_items enable row level security;

create policy returns_select on returns for select using (is_business_member(business_id));
create policy returns_insert on returns for insert with check (is_business_member(business_id));

create policy return_items_select on return_items for select using (is_business_member(business_id));
create policy return_items_insert on return_items for insert with check (is_business_member(business_id));

-- record_return: atomically processes a return against an existing sale.
-- Supports partial returns (subset of items / reduced quantities). Idempotent on
-- client_transaction_id. Restores inventory (movements + batch for expiry-tracked products),
-- optionally creates a store-credit refund, and updates the sale's status.
create or replace function record_return(
  p_business_id uuid,
  p_location_id uuid,
  p_sale_id uuid,
  p_items jsonb,
  p_refund_method text,
  p_client_transaction_id uuid
)
returns returns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_return returns;
  v_item jsonb;
  v_sale sales;
  v_sale_item sale_items;
  v_product products;
  v_total numeric := 0;
  v_qty numeric;
  v_line_refund numeric;
  v_batch record;
  v_all_returned boolean;
  v_credit_account credit_accounts;
begin
  if not is_business_member(p_business_id) then
    raise exception 'Not a member of this business' using errcode = '42501';
  end if;

  select * into v_return from returns
  where business_id = p_business_id and client_transaction_id = p_client_transaction_id;
  if found then
    return v_return;
  end if;

  select * into v_sale from sales
  where id = p_sale_id and business_id = p_business_id;
  if not found then
    raise exception 'Sale not found' using errcode = 'P0001';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_sale_item from sale_items
    where id = (v_item->>'sale_item_id')::uuid
      and sale_id = p_sale_id
      and business_id = p_business_id;

    if not found then
      raise exception 'Sale item not found: %', v_item->>'sale_item_id' using errcode = 'P0001';
    end if;

    v_qty := (v_item->>'quantity')::numeric;

    if v_qty <= 0 then
      raise exception 'Return quantity must be positive' using errcode = 'P0001';
    end if;

    if v_qty > (v_sale_item.quantity - v_sale_item.returned_quantity) then
      raise exception 'Return quantity exceeds remaining for item %', v_item->>'sale_item_id'
        using errcode = 'P0001';
    end if;

    v_line_refund := v_qty * v_sale_item.unit_price;
    v_total := v_total + v_line_refund;
  end loop;

  insert into returns (
    business_id, sale_id, return_number, total, refund_method,
    client_transaction_id, created_by
  ) values (
    p_business_id, p_sale_id,
    'R' || to_char(now(), 'YYMMDDHH24MISS') || '-' || substr(p_client_transaction_id::text, 1, 4),
    v_total, p_refund_method,
    p_client_transaction_id, auth.uid()
  )
  returning * into v_return;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_sale_item from sale_items
    where id = (v_item->>'sale_item_id')::uuid;

    select * into v_product from products
    where id = v_sale_item.product_id and business_id = p_business_id;

    v_qty := (v_item->>'quantity')::numeric;

    insert into return_items (
      business_id, return_id, sale_item_id, product_id, quantity, unit_price
    ) values (
      p_business_id, v_return.id, v_sale_item.id, v_product.id, v_qty, v_sale_item.unit_price
    );

    if v_product.tracks_expiry then
      select * into v_batch from inventory_batches
      where business_id = p_business_id
        and product_id = v_product.id
        and location_id = p_location_id
      order by expiry_date asc nulls last
      limit 1;

      if found then
        update inventory_batches
        set quantity_remaining = quantity_remaining + v_qty,
            quantity_received = greatest(quantity_received, quantity_remaining + v_qty)
        where id = v_batch.id;

        insert into inventory_movements (
          business_id, product_id, location_id, batch_id, movement_type, quantity,
          reference_type, reference_id, created_by
        ) values (
          p_business_id, v_product.id, p_location_id, v_batch.id, 'return', v_qty,
          'return', v_return.id, auth.uid()
        );
      else
        insert into inventory_movements (
          business_id, product_id, location_id, movement_type, quantity,
          reference_type, reference_id, created_by
        ) values (
          p_business_id, v_product.id, p_location_id, 'return', v_qty,
          'return', v_return.id, auth.uid()
        );
      end if;
    else
      insert into inventory_movements (
        business_id, product_id, location_id, movement_type, quantity,
        reference_type, reference_id, created_by
      ) values (
        p_business_id, v_product.id, p_location_id, 'return', v_qty,
        'return', v_return.id, auth.uid()
      );
    end if;

    update sale_items
    set returned_quantity = returned_quantity + v_qty
    where id = v_sale_item.id;
  end loop;

  if p_refund_method = 'credit' then
    if v_sale.customer_id is null then
      raise exception 'Store credit refund requires a customer on the original sale'
        using errcode = 'P0001';
    end if;

    select * into v_credit_account from credit_accounts
    where customer_id = v_sale.customer_id and business_id = p_business_id;

    if not found then
      insert into credit_accounts (business_id, customer_id)
      values (p_business_id, v_sale.customer_id)
      returning * into v_credit_account;
    end if;

    insert into credit_transactions (
      business_id, credit_account_id, type, amount, sale_id,
      notes, created_by, client_transaction_id
    ) values (
      p_business_id, v_credit_account.id, 'refund', -v_total, v_sale.id,
      'Refund for return ' || v_return.return_number, auth.uid(), p_client_transaction_id
    );
  end if;

  select not exists(
    select 1 from sale_items
    where sale_id = p_sale_id
      and business_id = p_business_id
      and returned_quantity < quantity
  ) into v_all_returned;

  if v_all_returned then
    update sales set status = 'refunded' where id = p_sale_id;
  else
    update sales set status = 'partially_refunded' where id = p_sale_id;
  end if;

  return v_return;
end;
$$;
