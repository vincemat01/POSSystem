-- Kompass POS — notifications, AI insights, audit log, sync log
create table notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, read_at);
create index notifications_business_idx on notifications (business_id);

-- ai_insights: every insight must reference the data that produced it (spec §69).
create table ai_insights (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data_reference jsonb not null,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create index ai_insights_business_idx on ai_insights (business_id, created_at desc);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  user_id uuid references auth.users (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  location_id uuid references locations (id) on delete set null,
  created_at timestamptz not null default now()
);

create index audit_logs_business_idx on audit_logs (business_id, created_at desc);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);

-- sync_queue: server-side ledger of offline operations that have been accepted, keyed by the
-- device-generated client_transaction_id. Lets any device query "did my queued op make it?"
-- without relying on the (client-local) IndexedDB queue alone. The tables it references each
-- also enforce the same idempotency via their own unique client_transaction_id indexes.
create table sync_queue (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  device_id text not null,
  entity_type sync_entity_type not null,
  entity_id uuid,
  client_transaction_id uuid not null,
  status text not null default 'synced',
  error text,
  created_at timestamptz not null default now(),
  synced_at timestamptz default now()
);

create unique index sync_queue_client_txn_unique on sync_queue (business_id, client_transaction_id);
create index sync_queue_device_idx on sync_queue (business_id, device_id);
