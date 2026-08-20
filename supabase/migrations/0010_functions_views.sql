-- Kompass POS — derived views and transactional RPCs.
-- Stock and credit balances are DERIVED, never stored as a mutable counter (spec §17, §24).

create view product_stock as
select
  business_id,
  product_id,
  location_id,
  sum(quantity) as quantity_on_hand
from inventory_movements
group by business_id, product_id, location_id;

create view credit_account_balances as
select
  ca.id as credit_account_id,
  ca.business_id,
  ca.customer_id,
  coalesce(sum(ct.amount), 0) as balance
from credit_accounts ca
left join credit_transactions ct on ct.credit_account_id = ca.id
group by ca.id, ca.business_id, ca.customer_id;

-- Atomically create a business, its primary location, and the creator's owner membership.
-- Runs as security definer because the very first business_members insert cannot pass the
-- normal is_business_member() check (no membership exists yet).
create or replace function create_business_with_owner(
  p_name text,
  p_business_type business_type,
  p_currency text default 'ZAR',
  p_location_name text default 'Main Location'
)
returns businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business businesses;
begin
  insert into businesses (name, business_type, currency, created_by)
  values (p_name, p_business_type, p_currency, auth.uid())
  returning * into v_business;

  insert into locations (business_id, name, is_primary)
  values (v_business.id, p_location_name, true);

  insert into business_members (business_id, user_id, role)
  values (v_business.id, auth.uid(), 'owner');

  return v_business;
end;
$$;

-- Deduct `p_quantity` of a product from its expiring batches oldest-expiry-first (FEFO, spec
-- §28), skipping expired batches unless p_allow_expired is true. Returns the rows deducted so
-- the caller can write matching inventory_movements / sale_items.batch_id.
create or replace function fefo_deduct(
  p_business_id uuid,
  p_product_id uuid,
  p_location_id uuid,
  p_quantity numeric,
  p_allow_expired boolean default false
)
returns table (batch_id uuid, deducted_quantity numeric, unit_cost numeric)
language plpgsql
as $$
declare
  v_remaining numeric := p_quantity;
  v_batch record;
  v_take numeric;
begin
  for v_batch in
    select ib.id, ib.quantity_remaining, ib.unit_cost
    from inventory_batches ib
    where ib.business_id = p_business_id
      and ib.product_id = p_product_id
      and ib.location_id = p_location_id
      and ib.quantity_remaining > 0
      and (p_allow_expired or ib.expiry_date is null or ib.expiry_date >= current_date)
    order by ib.expiry_date asc nulls last, ib.received_date asc
    for update
  loop
    exit when v_remaining <= 0;
    v_take := least(v_remaining, v_batch.quantity_remaining);

    update inventory_batches
    set quantity_remaining = quantity_remaining - v_take
    where id = v_batch.id;

    batch_id := v_batch.id;
    deducted_quantity := v_take;
    unit_cost := v_batch.unit_cost;
    return next;

    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    raise exception 'Insufficient batch stock for product % (short by %)', p_product_id, v_remaining
      using errcode = 'P0001';
  end if;
end;
$$;
