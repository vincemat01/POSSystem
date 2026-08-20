-- Kompass POS — businesses, locations, membership/roles
create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_type business_type not null default 'general_retail',
  currency text not null default 'ZAR',
  timezone text not null default 'Africa/Johannesburg',
  logo_url text,
  receipt_footer text,
  address text,
  phone text,
  prevent_expired_sale boolean not null default false,
  low_stock_default_threshold integer not null default 5,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table businesses is 'Root tenant. Every business-owned record must carry business_id and be scoped by RLS.';

create table locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  address text,
  is_primary boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index locations_business_id_idx on locations (business_id);

-- One membership row per (user, business). A user may belong to more than one business.
create table business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role business_role not null default 'cashier',
  active boolean not null default true,
  invited_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index business_members_user_id_idx on business_members (user_id);
create index business_members_business_id_idx on business_members (business_id);

-- Helper: is the current user an active member of this business?
create or replace function is_business_member(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from business_members
    where business_id = target_business_id
      and user_id = auth.uid()
      and active = true
  );
$$;

-- Helper: does the current user hold one of the given roles on this business?
create or replace function has_business_role(target_business_id uuid, allowed_roles business_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from business_members
    where business_id = target_business_id
      and user_id = auth.uid()
      and active = true
      and role = any(allowed_roles)
  );
$$;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_set_updated_at
  before update on businesses
  for each row execute function set_updated_at();
