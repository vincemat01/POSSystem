-- Staff invite codes: owner/manager generates a short code, staff member enters it on signup to join
create table if not exists staff_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  code text not null unique,
  role business_role not null default 'cashier',
  created_by uuid not null references auth.users(id),
  claimed_by uuid references auth.users(id),
  claimed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

alter table staff_invites enable row level security;

create policy staff_invites_select on staff_invites for select
  using (is_business_member(business_id));

create policy staff_invites_insert on staff_invites for insert
  with check (has_business_role(business_id, array['owner','manager']::business_role[]));

create policy staff_invites_update on staff_invites for update
  using (has_business_role(business_id, array['owner','manager']::business_role[]));

create policy staff_invites_delete on staff_invites for delete
  using (has_business_role(business_id, array['owner','manager']::business_role[]));

-- Allow anyone authenticated to read a single invite by code (for claiming)
create policy staff_invites_claim_read on staff_invites for select
  using (auth.uid() is not null);

-- Return emails for members of a business (owner/manager only, security definer to access auth.users)
create or replace function get_member_emails(p_business_id uuid)
returns table(user_id uuid, email text)
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.has_business_role(p_business_id, array['owner','manager']::public.business_role[]) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
    select bm.user_id, au.email::text
    from public.business_members bm
    join auth.users au on au.id = bm.user_id
    where bm.business_id = p_business_id and bm.active = true;
end;
$$;

-- Function to claim an invite code and join a business
create or replace function claim_invite(p_code text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_invite record;
  v_user_id uuid := auth.uid();
  v_existing record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_invite
  from public.staff_invites
  where code = p_code
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invalid invite code.');
  end if;

  if v_invite.claimed_by is not null then
    return jsonb_build_object('ok', false, 'error', 'This invite code has already been used.');
  end if;

  if v_invite.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'This invite code has expired.');
  end if;

  -- Check if user is already a member of this business
  select * into v_existing
  from public.business_members
  where business_id = v_invite.business_id and user_id = v_user_id;

  if found then
    if v_existing.active then
      return jsonb_build_object('ok', false, 'error', 'You are already a member of this business.');
    else
      -- Reactivate membership
      update public.business_members
      set active = true, role = v_invite.role
      where id = v_existing.id;
    end if;
  else
    insert into public.business_members (business_id, user_id, role, invited_by)
    values (v_invite.business_id, v_user_id, v_invite.role, v_invite.created_by);
  end if;

  -- Mark invite as claimed
  update public.staff_invites
  set claimed_by = v_user_id, claimed_at = now()
  where id = v_invite.id;

  return jsonb_build_object('ok', true, 'business_id', v_invite.business_id);
end;
$$;
