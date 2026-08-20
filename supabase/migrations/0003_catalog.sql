-- Kompass POS — categories, products, price history, suppliers
create table categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  parent_id uuid references categories (id) on delete set null,
  created_at timestamptz not null default now()
);

create index categories_business_id_idx on categories (business_id);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index suppliers_business_id_idx on suppliers (business_id);

create table products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  category_id uuid references categories (id) on delete set null,
  primary_supplier_id uuid references suppliers (id) on delete set null,
  name text not null,
  description text,
  barcode text,
  sku text,
  image_url text,
  unit text not null default 'each',
  -- Current price snapshot for fast POS lookups; historical truth lives in product_price_history
  -- and sale_items.unit_cost / unit_price (never overwritten retroactively).
  cost_price numeric(12, 2) not null default 0,
  selling_price numeric(12, 2) not null default 0,
  minimum_stock numeric(12, 2) not null default 0,
  tracks_expiry boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_business_id_idx on products (business_id);
create index products_barcode_idx on products (business_id, barcode);
create index products_active_idx on products (business_id, active);

create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

create table product_price_history (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  cost_price numeric(12, 2) not null,
  selling_price numeric(12, 2) not null,
  changed_by uuid references auth.users (id),
  effective_from timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index product_price_history_product_id_idx on product_price_history (product_id, effective_from desc);

-- Record a price history row whenever cost or selling price changes. security definer because
-- this fires from a trigger on `products` — the inserting user (e.g. a stock_manager) may not
-- otherwise have insert rights on product_price_history, which has no direct-write policy since
-- it should only ever be written here, not by client code (see 0009 RLS policies).
create or replace function record_product_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.cost_price is distinct from old.cost_price or new.selling_price is distinct from old.selling_price then
    insert into product_price_history (business_id, product_id, cost_price, selling_price, changed_by)
    values (new.business_id, new.id, new.cost_price, new.selling_price, auth.uid());
  end if;
  return new;
end;
$$;

create trigger products_record_price_history
  after insert or update of cost_price, selling_price on products
  for each row execute function record_product_price_change();

create table supplier_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  supplier_id uuid not null references suppliers (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  last_cost_price numeric(12, 2),
  last_purchase_date date,
  created_at timestamptz not null default now(),
  unique (supplier_id, product_id)
);

create index supplier_products_business_id_idx on supplier_products (business_id);
