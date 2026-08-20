-- Kompass POS — sales, line items, payments, refunds, receipts
create table sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  location_id uuid not null references locations (id) on delete restrict,
  customer_id uuid references customers (id) on delete set null,
  cashier_id uuid references auth.users (id),
  sale_number text not null,
  subtotal numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  tax_total numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  status sale_status not null default 'completed',
  -- client-generated id created at time of sale (possibly offline); the sync engine
  -- upserts on this to guarantee idempotent replay (spec §47-48).
  client_transaction_id uuid not null,
  device_id text,
  sold_at timestamptz not null default now(),
  synced_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index sales_client_txn_unique on sales (business_id, client_transaction_id);
create index sales_business_id_idx on sales (business_id, sold_at desc);
create index sales_customer_id_idx on sales (customer_id);
create unique index sales_number_unique on sales (business_id, sale_number);

create table sale_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  sale_id uuid not null references sales (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  batch_id uuid references inventory_batches (id) on delete set null,
  quantity numeric(12, 2) not null,
  -- captured at time of sale — never recomputed from the product's current price (spec §22).
  unit_cost numeric(12, 2) not null,
  unit_price numeric(12, 2) not null,
  discount numeric(12, 2) not null default 0,
  line_total numeric(12, 2) generated always as (quantity * unit_price - discount) stored,
  profit numeric(12, 2) generated always as (quantity * unit_price - discount - quantity * unit_cost) stored,
  returned_quantity numeric(12, 2) not null default 0
);

create index sale_items_sale_id_idx on sale_items (sale_id);
create index sale_items_product_id_idx on sale_items (product_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  sale_id uuid references sales (id) on delete cascade,
  credit_transaction_id uuid references credit_transactions (id) on delete set null,
  method payment_method not null,
  amount numeric(12, 2) not null,
  reference text,
  received_by uuid references auth.users (id),
  client_transaction_id uuid,
  created_at timestamptz not null default now()
);

create index payments_sale_id_idx on payments (sale_id);
create unique index payments_client_txn_unique
  on payments (business_id, client_transaction_id)
  where client_transaction_id is not null;

create table refunds (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  sale_id uuid not null references sales (id) on delete cascade,
  sale_item_id uuid references sale_items (id) on delete set null,
  quantity numeric(12, 2) not null,
  amount numeric(12, 2) not null,
  reason text,
  processed_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index refunds_sale_id_idx on refunds (sale_id);

create table receipts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  sale_id uuid not null references sales (id) on delete cascade,
  receipt_number text not null,
  delivery_method text,
  delivered_to text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index receipts_sale_id_idx on receipts (sale_id);
