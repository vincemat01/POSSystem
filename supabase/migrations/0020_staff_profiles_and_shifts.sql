-- Add display name to business_members so we know who's who
alter table business_members add column if not exists display_name text;

-- Shifts: tracks when a cashier opens and closes their register
create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  location_id uuid not null references locations(id),
  user_id uuid not null references auth.users(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  opening_cash numeric(12,2) not null default 0,
  closing_cash numeric(12,2),
  notes text,
  created_at timestamptz not null default now()
);

alter table shifts enable row level security;

create policy shifts_select on shifts for select
  using (is_business_member(business_id));

create policy shifts_insert on shifts for insert
  with check (is_business_member(business_id) and user_id = auth.uid());

create policy shifts_update on shifts for update
  using (is_business_member(business_id) and user_id = auth.uid());

-- Update get_member_emails to also return display_name
create or replace function get_member_emails(p_business_id uuid)
returns table(user_id uuid, email text, display_name text)
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.has_business_role(p_business_id, array['owner','manager']::public.business_role[]) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
    select bm.user_id, au.email::text, bm.display_name
    from public.business_members bm
    join auth.users au on au.id = bm.user_id
    where bm.business_id = p_business_id and bm.active = true;
end;
$$;

-- Helper to get the display name for a cashier (used in sales queries)
create or replace function get_cashier_name(p_business_id uuid, p_user_id uuid)
returns text
language sql security definer set search_path = ''
stable
as $$
  select coalesce(bm.display_name, au.email::text)
  from public.business_members bm
  join auth.users au on au.id = bm.user_id
  where bm.business_id = p_business_id and bm.user_id = p_user_id
  limit 1;
$$;
