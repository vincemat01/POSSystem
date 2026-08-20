-- Kompass POS — expenses and stock takes
create table expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  location_id uuid references locations (id) on delete set null,
  category text not null,
  amount numeric(12, 2) not null,
  description text,
  expense_date date not null default current_date,
  payment_method payment_method not null default 'cash',
  created_by uuid references auth.users (id),
  client_transaction_id uuid,
  created_at timestamptz not null default now()
);

create index expenses_business_id_idx on expenses (business_id, expense_date desc);
create unique index expenses_client_txn_unique
  on expenses (business_id, client_transaction_id)
  where client_transaction_id is not null;

create table stock_takes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  location_id uuid not null references locations (id) on delete restrict,
  status text not null default 'in_progress',
  started_by uuid references auth.users (id),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index stock_takes_business_id_idx on stock_takes (business_id);

create table stock_take_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  stock_take_id uuid not null references stock_takes (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  system_quantity numeric(12, 2) not null,
  counted_quantity numeric(12, 2) not null,
  difference numeric(12, 2) generated always as (counted_quantity - system_quantity) stored,
  reason text
);

create index stock_take_items_stock_take_idx on stock_take_items (stock_take_id);
