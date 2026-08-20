-- Kompass POS — customers and the Credit Book ledger
create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  phone text,
  address text,
  id_reference text,
  notes text,
  status text not null default 'active',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_business_id_idx on customers (business_id);
create index customers_phone_idx on customers (business_id, phone);

create trigger customers_set_updated_at
  before update on customers
  for each row execute function set_updated_at();

create table credit_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  credit_limit numeric(12, 2) not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (customer_id)
);

create index credit_accounts_business_id_idx on credit_accounts (business_id);

-- credit_transactions is the append-only ledger. Balance is ALWAYS derived (see
-- credit_account_balances view in 0010) — never stored as a mutable customer.balance column
-- (spec §17: "Do NOT simply store customer.balance = 300 as the source of truth").
create table credit_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  credit_account_id uuid not null references credit_accounts (id) on delete cascade,
  type credit_transaction_type not null,
  -- signed: credit_sale/adjustment(+) increase what's owed, payment/refund/adjustment(-) decrease it
  amount numeric(12, 2) not null,
  sale_id uuid,
  due_date date,
  notes text,
  created_by uuid references auth.users (id),
  client_transaction_id uuid,
  created_at timestamptz not null default now()
);

create index credit_transactions_account_idx on credit_transactions (credit_account_id, created_at desc);
create unique index credit_transactions_client_txn_unique
  on credit_transactions (business_id, client_transaction_id)
  where client_transaction_id is not null;
