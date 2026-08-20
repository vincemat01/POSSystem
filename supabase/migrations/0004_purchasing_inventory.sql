-- Kompass POS — purchases, inventory batches (expiry-aware) and the inventory movement ledger
create table purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  location_id uuid not null references locations (id) on delete restrict,
  supplier_id uuid references suppliers (id) on delete set null,
  purchase_date date not null default current_date,
  total_cost numeric(12, 2) not null default 0,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index purchases_business_id_idx on purchases (business_id);

-- inventory_batches: expiry belongs to the batch, never to the product (see spec §26-27).
create table inventory_batches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  location_id uuid not null references locations (id) on delete restrict,
  supplier_id uuid references suppliers (id) on delete set null,
  purchase_id uuid references purchases (id) on delete set null,
  batch_reference text,
  quantity_received numeric(12, 2) not null,
  quantity_remaining numeric(12, 2) not null,
  unit_cost numeric(12, 2) not null,
  received_date date not null default current_date,
  expiry_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quantity_remaining_bounds check (quantity_remaining >= 0 and quantity_remaining <= quantity_received)
);

create index inventory_batches_product_fefo_idx
  on inventory_batches (business_id, product_id, expiry_date)
  where quantity_remaining > 0;

create trigger inventory_batches_set_updated_at
  before update on inventory_batches
  for each row execute function set_updated_at();

create table purchase_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  purchase_id uuid not null references purchases (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  batch_id uuid references inventory_batches (id) on delete set null,
  quantity numeric(12, 2) not null,
  unit_cost numeric(12, 2) not null,
  line_total numeric(12, 2) generated always as (quantity * unit_cost) stored
);

create index purchase_items_purchase_id_idx on purchase_items (purchase_id);

-- inventory_movements: the append-only, auditable ledger. current stock is DERIVED from this
-- table (see product_stock view in 0010), never from a manually overwritten counter.
create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  location_id uuid not null references locations (id) on delete restrict,
  batch_id uuid references inventory_batches (id) on delete set null,
  movement_type inventory_movement_type not null,
  -- signed: positive = stock added, negative = stock removed
  quantity numeric(12, 2) not null,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users (id),
  -- client-generated id for offline idempotency (see spec §47); null for server-originated movements
  client_transaction_id uuid,
  created_at timestamptz not null default now()
);

create index inventory_movements_product_idx on inventory_movements (business_id, product_id, created_at desc);
create index inventory_movements_reference_idx on inventory_movements (reference_type, reference_id);
create unique index inventory_movements_client_txn_unique
  on inventory_movements (business_id, client_transaction_id)
  where client_transaction_id is not null;
