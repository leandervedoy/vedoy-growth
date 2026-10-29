-- Standalone launch registration. No workspace, billing, or existing profile writes.
-- Email/phone verification remains owned by Supabase Auth. These preferences do
-- not activate campaigns, grant application access, or prove contact ownership.

create schema if not exists growth_launch_private;
revoke all on schema growth_launch_private from public, anon, authenticated, service_role;

create table public.growth_launch_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  organization_name text not null,
  organization_kind text not null,
  email_updates boolean not null default false,
  sms_updates boolean not null default false,
  phone_e164 text,
  consent_version text not null default '2026-10-29-v1',
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),
  consent_updated_at timestamptz not null default pg_catalog.clock_timestamp(),
  constraint growth_launch_display_name_valid check (
    display_name = pg_catalog.btrim(display_name)
    and pg_catalog.char_length(display_name) between 1 and 120
  ),
  constraint growth_launch_organization_name_valid check (
    organization_name = pg_catalog.btrim(organization_name)
    and pg_catalog.char_length(organization_name) between 1 and 160
  ),
  constraint growth_launch_organization_kind_valid check (
    organization_kind in ('business', 'sole_trader', 'association', 'nonprofit', 'other')
  ),
  constraint growth_launch_phone_matches_sms check (
    (sms_updates and phone_e164 is not null and phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
    or (not sms_updates and phone_e164 is null)
  ),
  constraint growth_launch_current_consent_version check (consent_version = '2026-10-29-v1')
);

create table public.growth_launch_consent_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email_updates boolean not null,
  sms_updates boolean not null,
  phone_e164 text,
  consent_version text not null,
  event_source text not null check (event_source in ('registration', 'preferences')),
  recorded_at timestamptz not null default pg_catalog.clock_timestamp(),
  constraint growth_launch_event_phone_valid check (
    (sms_updates and phone_e164 is not null and phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
    or (not sms_updates and phone_e164 is null)
  )
);

create index growth_launch_consent_events_user_recorded_idx
  on public.growth_launch_consent_events(user_id, recorded_at desc);

alter table public.growth_launch_profiles enable row level security;
alter table public.growth_launch_consent_events enable row level security;

-- Explicit grants also handle projects that do not automatically expose new tables.
-- Clients cannot write timestamps, change ownership, delete profiles, or alter audit.
revoke all on public.growth_launch_profiles from public, anon, authenticated, service_role;
revoke all on public.growth_launch_consent_events from public, anon, authenticated, service_role;
grant select on public.growth_launch_profiles to authenticated;
grant insert (user_id, display_name, organization_name, organization_kind,
  email_updates, sms_updates, phone_e164, consent_version)
  on public.growth_launch_profiles to authenticated;
grant update (display_name, organization_name, organization_kind,
  email_updates, sms_updates, phone_e164, consent_version)
  on public.growth_launch_profiles to authenticated;
grant select on public.growth_launch_consent_events to authenticated;

create policy growth_launch_profiles_select_own
  on public.growth_launch_profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy growth_launch_profiles_insert_own
  on public.growth_launch_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy growth_launch_profiles_update_own
  on public.growth_launch_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy growth_launch_consent_events_select_own
  on public.growth_launch_consent_events for select to authenticated
  using ((select auth.uid()) = user_id);

create function growth_launch_private.stamp_profile()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := pg_catalog.clock_timestamp();
    new.updated_at := new.created_at;
    new.consent_updated_at := new.created_at;
  else
    if new.user_id is distinct from old.user_id then
      raise exception 'Launch profile ownership cannot be changed' using errcode = '42501';
    end if;
    new.created_at := old.created_at;
    new.updated_at := pg_catalog.clock_timestamp();
    if (new.email_updates, new.sms_updates, new.phone_e164, new.consent_version)
        is distinct from
       (old.email_updates, old.sms_updates, old.phone_e164, old.consent_version) then
      new.consent_updated_at := new.updated_at;
    else
      new.consent_updated_at := old.consent_updated_at;
    end if;
  end if;
  return new;
end;
$$;

create function growth_launch_private.record_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- This private trigger is not an RPC. RLS protects authenticated profile writes;
  -- Auth's nested signup trigger legitimately has no end-user JWT yet.
  if tg_table_schema <> 'public' or tg_table_name <> 'growth_launch_profiles'
      or tg_op not in ('INSERT', 'UPDATE') then
    raise exception 'Invalid launch consent trigger context' using errcode = '42501';
  end if;
  if (select auth.uid()) is not null and (select auth.uid()) <> new.user_id then
    raise exception 'Cannot record another account''s consent' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' or
      (new.email_updates, new.sms_updates, new.phone_e164, new.consent_version)
      is distinct from
      (old.email_updates, old.sms_updates, old.phone_e164, old.consent_version) then
    insert into public.growth_launch_consent_events
      (user_id, email_updates, sms_updates, phone_e164, consent_version, event_source)
    values
      (new.user_id, new.email_updates, new.sms_updates, new.phone_e164,
       new.consent_version, case when tg_op = 'INSERT' then 'registration' else 'preferences' end);
  end if;
  return new;
end;
$$;

create trigger growth_launch_profile_stamp
  before insert or update on public.growth_launch_profiles
  for each row execute function growth_launch_private.stamp_profile();
create trigger growth_launch_profile_consent_audit
  after insert or update on public.growth_launch_profiles
  for each row execute function growth_launch_private.record_consent();

create function growth_launch_private.initialize_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wants_email boolean;
  wants_sms boolean;
  sms_phone text;
begin
  -- Never reads authorization/roles from user-editable metadata. This trigger
  -- only creates a private launch profile for the newly inserted Auth user.
  if tg_table_schema <> 'auth' or tg_table_name <> 'users' or tg_op <> 'INSERT' then
    raise exception 'Invalid launch registration trigger context' using errcode = '42501';
  end if;
  if metadata -> 'growth_launch_registration' is distinct from 'true'::jsonb then
    return new;
  end if;
  if pg_catalog.jsonb_typeof(metadata -> 'display_name') is distinct from 'string'
      or pg_catalog.jsonb_typeof(metadata -> 'organization_name') is distinct from 'string'
      or pg_catalog.jsonb_typeof(metadata -> 'organization_kind') is distinct from 'string'
      or (metadata ? 'email_updates'
          and pg_catalog.jsonb_typeof(metadata -> 'email_updates') is distinct from 'boolean')
      or (metadata ? 'sms_updates'
          and pg_catalog.jsonb_typeof(metadata -> 'sms_updates') is distinct from 'boolean') then
    raise exception 'Invalid launch registration fields' using errcode = '23514';
  end if;
  wants_email := coalesce((metadata ->> 'email_updates')::boolean, false);
  wants_sms := coalesce((metadata ->> 'sms_updates')::boolean, false);
  if wants_sms then
    if pg_catalog.jsonb_typeof(metadata -> 'phone_e164') is distinct from 'string' then
      raise exception 'An international phone number is required for SMS' using errcode = '23514';
    end if;
    sms_phone := pg_catalog.btrim(metadata ->> 'phone_e164');
  else
    -- Do not retain a phone number when SMS was not selected.
    sms_phone := null;
  end if;
  insert into public.growth_launch_profiles
    (user_id, display_name, organization_name, organization_kind,
     email_updates, sms_updates, phone_e164, consent_version)
  values
    (new.id, pg_catalog.btrim(metadata ->> 'display_name'),
     pg_catalog.btrim(metadata ->> 'organization_name'), metadata ->> 'organization_kind',
     wants_email, wants_sms, sms_phone, '2026-10-29-v1');
  return new;
end;
$$;

-- Auth controls auth.users INSERT. The private trigger cannot be invoked through
-- the Data API. A failure affects only registrations explicitly marked for Growth.
create trigger growth_launch_auth_registration
  after insert on auth.users
  for each row execute function growth_launch_private.initialize_registration();

revoke all on function growth_launch_private.stamp_profile()
  from public, anon, authenticated, service_role;
revoke all on function growth_launch_private.record_consent()
  from public, anon, authenticated, service_role;
revoke all on function growth_launch_private.initialize_registration()
  from public, anon, authenticated, service_role;

comment on table public.growth_launch_profiles is
  'Private launch profiles. Optional email/SMS choices are not contact verification or access authorization.';
comment on table public.growth_launch_consent_events is
  'Append-only for application roles. DB-generated preference history; erased when the Auth account is deleted.';
