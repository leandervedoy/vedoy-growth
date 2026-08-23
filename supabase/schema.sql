create table if not exists public.business_profiles (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade unique, business_name text not null, description text not null default '', logo_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.business_profiles enable row level security;
revoke all on public.business_profiles from anon;
grant select, insert, update on public.business_profiles to authenticated;
drop policy if exists "owners can read their business profile" on public.business_profiles;
create policy "owners can read their business profile" on public.business_profiles for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists "owners can create their business profile" on public.business_profiles;
create policy "owners can create their business profile" on public.business_profiles for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "owners can update their business profile" on public.business_profiles;
create policy "owners can update their business profile" on public.business_profiles for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- Non-secret connection settings for each customer's workspace. API keys and OAuth
-- tokens stay in server environment variables or an OAuth vault, never in this table.
create table if not exists public.workspace_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  status text not null default 'configured' check (status in ('configured', 'live')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, module_id)
);

alter table public.workspace_connections enable row level security;
drop policy if exists "owners can read workspace connections" on public.workspace_connections;
create policy "owners can read workspace connections" on public.workspace_connections for select using (auth.uid() = owner_id);
drop policy if exists "owners can create workspace connections" on public.workspace_connections;
create policy "owners can create workspace connections" on public.workspace_connections for insert with check (auth.uid() = owner_id);
drop policy if exists "owners can update workspace connections" on public.workspace_connections;
create policy "owners can update workspace connections" on public.workspace_connections for update using (auth.uid() = owner_id);
drop policy if exists "owners can delete workspace connections" on public.workspace_connections;
create policy "owners can delete workspace connections" on public.workspace_connections for delete using (auth.uid() = owner_id);

create table if not exists public.work_time_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint work_time_entries_valid_period check (ended_at is null or ended_at >= started_at)
);

create index if not exists work_time_entries_owner_started_idx on public.work_time_entries(owner_id, started_at desc);
alter table public.work_time_entries enable row level security;
drop policy if exists "owners can read work time" on public.work_time_entries;
create policy "owners can read work time" on public.work_time_entries for select using (auth.uid() = owner_id);
drop policy if exists "owners can add work time" on public.work_time_entries;
create policy "owners can add work time" on public.work_time_entries for insert with check (auth.uid() = owner_id);
drop policy if exists "owners can update work time" on public.work_time_entries;
create policy "owners can update work time" on public.work_time_entries for update using (auth.uid() = owner_id);

-- Vedøy Growth multi-user workspace. A business owner can invite admins,
-- managers and employees without exposing any admin API key to the browser.
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'employee' check (role in ('owner', 'admin', 'manager', 'employee')),
  display_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index if not exists organization_members_business_user_idx on public.organization_members(business_id, user_id);
create index if not exists organization_members_user_idx on public.organization_members(user_id);
alter table public.organization_members enable row level security;
revoke all on public.organization_members from anon;
grant select, insert, update, delete on public.organization_members to authenticated;
drop policy if exists "members can view their organization" on public.organization_members;
create policy "members can view their organization" on public.organization_members for select to authenticated using (
  user_id = (select auth.uid()) or exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid()))
);
drop policy if exists "owners can add organization members" on public.organization_members;
create policy "owners can add organization members" on public.organization_members for insert to authenticated with check (
  exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid()))
);
drop policy if exists "owners can update organization members" on public.organization_members;
create policy "owners can update organization members" on public.organization_members for update to authenticated using (
  exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid()))
) with check (
  exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid()))
);
drop policy if exists "owners can delete organization members" on public.organization_members;
create policy "owners can delete organization members" on public.organization_members for delete to authenticated using (
  exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid()))
);

-- Employees need to read the company profile after membership is established.
drop policy if exists "owners can read their business profile" on public.business_profiles;
drop policy if exists "workspace members can read their business profile" on public.business_profiles;
create policy "workspace members can read their business profile" on public.business_profiles for select to authenticated using (
  owner_id = (select auth.uid()) or exists (
    select 1 from public.organization_members m where m.business_id = business_profiles.id and m.user_id = (select auth.uid())
  )
);

alter table public.work_time_entries add column if not exists business_id uuid references public.business_profiles(id) on delete cascade;
create index if not exists work_time_entries_business_started_idx on public.work_time_entries(business_id, started_at desc);
drop policy if exists "owners can read work time" on public.work_time_entries;
create policy "members can read allowed work time" on public.work_time_entries for select to authenticated using (
  owner_id = (select auth.uid()) or exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid())) or exists (select 1 from public.organization_members m where m.business_id = work_time_entries.business_id and m.user_id = (select auth.uid()) and m.role in ('admin', 'manager'))
);
drop policy if exists "owners can add work time" on public.work_time_entries;
create policy "members can add their own work time" on public.work_time_entries for insert to authenticated with check (
  owner_id = (select auth.uid()) and (exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid())) or exists (select 1 from public.organization_members m where m.business_id = work_time_entries.business_id and m.user_id = (select auth.uid())))
);
drop policy if exists "owners can update work time" on public.work_time_entries;
create policy "members can update their own work time" on public.work_time_entries for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  customer_email text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'pending', 'cancelled')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists booking_events_business_start_idx on public.booking_events(business_id, starts_at);
alter table public.booking_events enable row level security;
revoke all on public.booking_events from anon;
grant select, insert, update, delete on public.booking_events to authenticated;
drop policy if exists "members can read bookings" on public.booking_events;
create policy "members can read bookings" on public.booking_events for select to authenticated using (
  exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid())) or exists (select 1 from public.organization_members m where m.business_id = booking_events.business_id and m.user_id = (select auth.uid()))
);
drop policy if exists "members can create bookings" on public.booking_events;
create policy "members can create bookings" on public.booking_events for insert to authenticated with check (
  created_by = (select auth.uid()) and (exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid())) or exists (select 1 from public.organization_members m where m.business_id = booking_events.business_id and m.user_id = (select auth.uid())))
);
drop policy if exists "managers can update bookings" on public.booking_events;
create policy "managers can update bookings" on public.booking_events for update to authenticated using (
  created_by = (select auth.uid()) or exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid())) or exists (select 1 from public.organization_members m where m.business_id = booking_events.business_id and m.user_id = (select auth.uid()) and m.role in ('admin', 'manager'))
) with check (
  exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid()))
  or exists (select 1 from public.organization_members m where m.business_id = booking_events.business_id and m.user_id = (select auth.uid()) and m.role in ('admin', 'manager'))
  or created_by = (select auth.uid())
);
drop policy if exists "managers can delete bookings" on public.booking_events;
create policy "managers can delete bookings" on public.booking_events for delete to authenticated using (
  created_by = (select auth.uid()) or exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid())) or exists (select 1 from public.organization_members m where m.business_id = booking_events.business_id and m.user_id = (select auth.uid()) and m.role in ('admin', 'manager'))
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source text not null default 'vedoy' check (source in ('vedoy', 'google', 'microsoft', 'manual')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists calendar_events_business_start_idx on public.calendar_events(business_id, starts_at);
alter table public.calendar_events enable row level security;
revoke all on public.calendar_events from anon;
grant select, insert, update, delete on public.calendar_events to authenticated;
drop policy if exists "members can read calendar" on public.calendar_events;
create policy "members can read calendar" on public.calendar_events for select to authenticated using (
  exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid())) or exists (select 1 from public.organization_members m where m.business_id = calendar_events.business_id and m.user_id = (select auth.uid()))
);
drop policy if exists "members can create calendar" on public.calendar_events;
create policy "members can create calendar" on public.calendar_events for insert to authenticated with check (
  created_by = (select auth.uid()) and (exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid())) or exists (select 1 from public.organization_members m where m.business_id = calendar_events.business_id and m.user_id = (select auth.uid())))
);
drop policy if exists "members can update calendar" on public.calendar_events;
create policy "members can update calendar" on public.calendar_events for update to authenticated using (
  created_by = (select auth.uid()) or exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid())) or exists (select 1 from public.organization_members m where m.business_id = calendar_events.business_id and m.user_id = (select auth.uid()) and m.role in ('admin', 'manager'))
) with check (
  exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid()))
  or exists (select 1 from public.organization_members m where m.business_id = calendar_events.business_id and m.user_id = (select auth.uid()) and m.role in ('admin', 'manager'))
  or created_by = (select auth.uid())
);

create table if not exists public.dashboard_layouts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  modules jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);
create index if not exists dashboard_layouts_business_user_idx on public.dashboard_layouts(business_id, user_id);
alter table public.dashboard_layouts enable row level security;
revoke all on public.dashboard_layouts from anon;
grant select, insert, update on public.dashboard_layouts to authenticated;
drop policy if exists "users can manage own dashboard layout" on public.dashboard_layouts;
create policy "users can manage own dashboard layout" on public.dashboard_layouts for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "users can create own dashboard layout" on public.dashboard_layouts;
create policy "users can create own dashboard layout" on public.dashboard_layouts for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "users can update own dashboard layout" on public.dashboard_layouts;
create policy "users can update own dashboard layout" on public.dashboard_layouts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Hardened multi-tenant authorization. The helper lives outside the exposed
-- Data API schema and avoids circular RLS checks between profiles and members.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.has_business_access(target_business_id uuid, allowed_roles text[] default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    exists (select 1 from public.business_profiles b where b.id = target_business_id and b.owner_id = (select auth.uid()))
    or exists (select 1 from public.organization_members m where m.business_id = target_business_id and m.user_id = (select auth.uid()) and (allowed_roles is null or m.role = any(allowed_roles)))
  );
$$;
revoke all on function private.has_business_access(uuid, text[]) from public, anon;
grant execute on function private.has_business_access(uuid, text[]) to authenticated;

insert into public.organization_members (business_id, user_id, role, display_name, email)
select b.id, b.owner_id, 'owner', coalesce(u.raw_user_meta_data->>'full_name', ''), coalesce(u.email, '')
from public.business_profiles b join auth.users u on u.id = b.owner_id
on conflict (business_id, user_id) do update set role = 'owner';

drop policy if exists "workspace members can read their business profile" on public.business_profiles;
create policy "workspace members can read their business profile" on public.business_profiles for select to authenticated using (private.has_business_access(id));

drop policy if exists "members can view their organization" on public.organization_members;
drop policy if exists "owners can add organization members" on public.organization_members;
drop policy if exists "owners can update organization members" on public.organization_members;
drop policy if exists "owners can delete organization members" on public.organization_members;
create policy "members can view their organization" on public.organization_members for select to authenticated using (private.has_business_access(business_id));
create policy "owners and admins can add organization members" on public.organization_members for insert to authenticated with check (
  private.has_business_access(business_id, array['owner','admin']) and (role <> 'owner' or (user_id = (select auth.uid()) and exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid()))))
);
create policy "owners and admins can update organization members" on public.organization_members for update to authenticated using (role <> 'owner' and private.has_business_access(business_id, array['owner','admin'])) with check (role <> 'owner' and private.has_business_access(business_id, array['owner','admin']));
create policy "owners and admins can delete organization members" on public.organization_members for delete to authenticated using (role <> 'owner' and private.has_business_access(business_id, array['owner','admin']));

drop policy if exists "members can read allowed work time" on public.work_time_entries;
drop policy if exists "members can add their own work time" on public.work_time_entries;
drop policy if exists "members can update their own work time" on public.work_time_entries;
create policy "members can read allowed work time" on public.work_time_entries for select to authenticated using (owner_id = (select auth.uid()) or private.has_business_access(business_id, array['owner','admin','manager']));
create policy "members can add their own work time" on public.work_time_entries for insert to authenticated with check (owner_id = (select auth.uid()) and private.has_business_access(business_id));
create policy "members can update their own work time" on public.work_time_entries for update to authenticated using (owner_id = (select auth.uid()) and private.has_business_access(business_id)) with check (owner_id = (select auth.uid()) and private.has_business_access(business_id));

drop policy if exists "members can read bookings" on public.booking_events;
drop policy if exists "members can create bookings" on public.booking_events;
drop policy if exists "managers can update bookings" on public.booking_events;
drop policy if exists "managers can delete bookings" on public.booking_events;
create policy "members can read bookings" on public.booking_events for select to authenticated using (private.has_business_access(business_id));
create policy "members can create bookings" on public.booking_events for insert to authenticated with check (created_by = (select auth.uid()) and private.has_business_access(business_id));
create policy "creators and managers can update bookings" on public.booking_events for update to authenticated using (created_by = (select auth.uid()) or private.has_business_access(business_id, array['owner','admin','manager'])) with check (private.has_business_access(business_id) and (created_by = (select auth.uid()) or private.has_business_access(business_id, array['owner','admin','manager'])));
create policy "creators and managers can delete bookings" on public.booking_events for delete to authenticated using (created_by = (select auth.uid()) or private.has_business_access(business_id, array['owner','admin','manager']));

drop policy if exists "members can read calendar" on public.calendar_events;
drop policy if exists "members can create calendar" on public.calendar_events;
drop policy if exists "members can update calendar" on public.calendar_events;
create policy "members can read calendar" on public.calendar_events for select to authenticated using (private.has_business_access(business_id));
create policy "members can create calendar" on public.calendar_events for insert to authenticated with check (created_by = (select auth.uid()) and private.has_business_access(business_id));
create policy "creators and managers can update calendar" on public.calendar_events for update to authenticated using (created_by = (select auth.uid()) or private.has_business_access(business_id, array['owner','admin','manager'])) with check (private.has_business_access(business_id) and (created_by = (select auth.uid()) or private.has_business_access(business_id, array['owner','admin','manager'])));
create policy "creators and managers can delete calendar" on public.calendar_events for delete to authenticated using (created_by = (select auth.uid()) or private.has_business_access(business_id, array['owner','admin','manager']));

drop policy if exists "users can manage own dashboard layout" on public.dashboard_layouts;
drop policy if exists "users can create own dashboard layout" on public.dashboard_layouts;
drop policy if exists "users can update own dashboard layout" on public.dashboard_layouts;
create policy "users can read own dashboard layout" on public.dashboard_layouts for select to authenticated using (user_id = (select auth.uid()) and private.has_business_access(business_id));
create policy "users can create own dashboard layout" on public.dashboard_layouts for insert to authenticated with check (user_id = (select auth.uid()) and private.has_business_access(business_id));
create policy "users can update own dashboard layout" on public.dashboard_layouts for update to authenticated using (user_id = (select auth.uid()) and private.has_business_access(business_id)) with check (user_id = (select auth.uid()) and private.has_business_access(business_id));

drop policy if exists "owners can read workspace connections" on public.workspace_connections;
drop policy if exists "owners can create workspace connections" on public.workspace_connections;
drop policy if exists "owners can update workspace connections" on public.workspace_connections;
drop policy if exists "owners can delete workspace connections" on public.workspace_connections;
create policy "owners can read workspace connections" on public.workspace_connections for select to authenticated using (owner_id = (select auth.uid()));
create policy "owners can create workspace connections" on public.workspace_connections for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "owners can update workspace connections" on public.workspace_connections for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owners can delete workspace connections" on public.workspace_connections for delete to authenticated using (owner_id = (select auth.uid()));

revoke all on public.business_profiles, public.workspace_connections, public.work_time_entries, public.organization_members, public.booking_events, public.calendar_events, public.dashboard_layouts from anon, authenticated;
grant select, insert, update on public.business_profiles to authenticated;
grant select, insert, update, delete on public.workspace_connections to authenticated;
grant select, insert, update on public.work_time_entries to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update, delete on public.booking_events to authenticated;
grant select, insert, update, delete on public.calendar_events to authenticated;
grant select, insert, update on public.dashboard_layouts to authenticated;
revoke execute on function public.create_vedoy_profile() from public, anon, authenticated;

create index if not exists booking_events_created_by_idx on public.booking_events(created_by);
create index if not exists calendar_events_created_by_idx on public.calendar_events(created_by);
create index if not exists dashboard_layouts_user_id_idx on public.dashboard_layouts(user_id);
create index if not exists vedoy_blog_posts_author_id_idx on public.vedoy_blog_posts(author_id);

create table if not exists public.workspace_notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);
create index if not exists workspace_notes_user_id_idx on public.workspace_notes(user_id);
alter table public.workspace_notes enable row level security;
revoke all on public.workspace_notes from anon, authenticated;
grant select, insert, update on public.workspace_notes to authenticated;
create policy "users can read own workspace notes" on public.workspace_notes for select to authenticated using (user_id = (select auth.uid()) and private.has_business_access(business_id));
create policy "users can create own workspace notes" on public.workspace_notes for insert to authenticated with check (user_id = (select auth.uid()) and private.has_business_access(business_id));
create policy "users can update own workspace notes" on public.workspace_notes for update to authenticated using (user_id = (select auth.uid()) and private.has_business_access(business_id)) with check (user_id = (select auth.uid()) and private.has_business_access(business_id));


-- Vedøy Blogg: shared publishing managed by Growth owners.
alter table public.vedoy_blog_posts
  add column if not exists category text not null default 'Innsikt';

create or replace function private.is_growth_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_profiles bp
    where bp.owner_id = (select auth.uid())
  );
$$;

revoke all on function private.is_growth_owner() from public, anon;
grant execute on function private.is_growth_owner() to authenticated;

drop policy if exists "Anyone can read published Vedøy posts" on public.vedoy_blog_posts;
drop policy if exists "Published blog posts are public" on public.vedoy_blog_posts;
drop policy if exists "Growth owners can read all blog posts" on public.vedoy_blog_posts;
drop policy if exists "Growth owners can create blog posts" on public.vedoy_blog_posts;
drop policy if exists "Growth owners can update blog posts" on public.vedoy_blog_posts;
drop policy if exists "Growth owners can delete blog posts" on public.vedoy_blog_posts;

create policy "Published blog posts are public"
on public.vedoy_blog_posts for select
to anon
using (status = 'published');

create policy "Authenticated readers see published posts and owners see all"
on public.vedoy_blog_posts for select
to authenticated
using (status = 'published' or (select private.is_growth_owner()));

create policy "Growth owners can create blog posts"
on public.vedoy_blog_posts for insert
to authenticated
with check ((select private.is_growth_owner()) and author_id = (select auth.uid()));

create policy "Growth owners can update blog posts"
on public.vedoy_blog_posts for update
to authenticated
using ((select private.is_growth_owner()))
with check ((select private.is_growth_owner()));

create policy "Growth owners can delete blog posts"
on public.vedoy_blog_posts for delete
to authenticated
using ((select private.is_growth_owner()));

revoke all on table public.vedoy_blog_posts from anon, authenticated;
grant select on table public.vedoy_blog_posts to anon;
grant select, insert, update, delete on table public.vedoy_blog_posts to authenticated;

insert into public.vedoy_blog_posts (slug, title, excerpt, content, category, status, published_at)
values
  ('digital-oversikt', 'Hvorfor små bedrifter trenger bedre digital oversikt', 'Du trenger ikke flere systemer. Du trenger å se hva som faktisk skjer.', 'En god digital arbeidsflate gjør det enklere å prioritere, følge opp kunder og se hvor virksomheten kan forbedres.', 'Innsikt', 'published', '2026-08-01T10:00:00Z'),
  ('forste-steg', 'Tre små steg mot en enklere arbeidshverdag', 'Start med det viktigste, rydd bort resten og bygg videre etter behov.', 'Begynn med én tydelig arbeidsflyt. Mål det som betyr noe. Lag deretter faste rutiner.', 'Praktisk', 'published', '2026-07-28T10:00:00Z')
on conflict (slug) do nothing;

-- Shared Vedøy profiles use optimized auth checks and an explicit update check.
drop policy if exists "Users can read their own Vedøy profile" on public.vedoy_profiles;
drop policy if exists "Users can update their own Vedøy profile" on public.vedoy_profiles;
create policy "Users can read their own Vedøy profile" on public.vedoy_profiles for select to authenticated using (id = (select auth.uid()));
create policy "Users can update their own Vedøy profile" on public.vedoy_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Website monitoring history. Checks are isolated per owner and business.
create table if not exists public.website_status_checks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  site_url text not null,
  online boolean not null,
  status_code integer check (status_code is null or status_code between 0 and 599),
  response_time_ms integer check (response_time_ms is null or response_time_ms between 0 and 120000),
  source text not null default 'direct' check (source in ('direct', 'google-pagespeed', 'browser')),
  performance_score integer check (performance_score is null or performance_score between 0 and 100),
  accessibility_score integer check (accessibility_score is null or accessibility_score between 0 and 100),
  seo_score integer check (seo_score is null or seo_score between 0 and 100),
  checked_at timestamptz not null default now()
);
create index if not exists website_status_checks_owner_checked_idx on public.website_status_checks(owner_id, checked_at desc);
create index if not exists website_status_checks_business_checked_idx on public.website_status_checks(business_id, checked_at desc);
alter table public.website_status_checks enable row level security;
revoke all on public.website_status_checks from anon, authenticated;
grant select, insert on public.website_status_checks to authenticated;
drop policy if exists "owners can read website checks" on public.website_status_checks;
drop policy if exists "owners can create website checks" on public.website_status_checks;
create policy "owners can read website checks" on public.website_status_checks for select to authenticated
using (owner_id = (select auth.uid()) and private.has_business_access(business_id));
create policy "owners can create website checks" on public.website_status_checks for insert to authenticated
with check (owner_id = (select auth.uid()) and private.has_business_access(business_id));

-- Incident reports (avvik) with immutable reporter and timestamp traceability.
create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  reported_by uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 5 and 160),
  description text not null check (char_length(description) between 15 and 5000),
  immediate_action text not null check (char_length(immediate_action) between 10 and 2000),
  category text not null check (category in ('HSE', 'QUALITY', 'FINANCIAL')),
  severity text not null check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists incident_reports_business_created_idx on public.incident_reports(business_id, created_at desc);
create index if not exists incident_reports_reported_by_created_idx on public.incident_reports(reported_by, created_at desc);
alter table public.incident_reports enable row level security;
revoke all on public.incident_reports from anon, authenticated;
grant select, insert on public.incident_reports to authenticated;
drop policy if exists "members can read business incident reports" on public.incident_reports;
drop policy if exists "members can create incident reports" on public.incident_reports;
create policy "members can read business incident reports" on public.incident_reports for select to authenticated
using (private.has_business_access(business_id));
create policy "members can create incident reports" on public.incident_reports for insert to authenticated
with check (reported_by = (select auth.uid()) and private.has_business_access(business_id));

-- Server-managed Shopify OAuth installations. Tokens are encrypted by the app before storage.
create table if not exists public.shopify_store_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  connected_by uuid not null references auth.users(id) on delete restrict,
  shop_domain text not null check (shop_domain ~ '^[a-z0-9][a-z0-9-]*\.myshopify\.com$'),
  encrypted_access_token text not null,
  scopes text not null default '',
  status text not null default 'connected' check (status in ('connected', 'revoked', 'error')),
  installed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, shop_domain)
);
create index if not exists shopify_store_connections_business_idx on public.shopify_store_connections(business_id, updated_at desc);
alter table public.shopify_store_connections enable row level security;
revoke all on public.shopify_store_connections from anon, authenticated;
drop policy if exists "client access is denied" on public.shopify_store_connections;
create policy "client access is denied" on public.shopify_store_connections for all to authenticated
using (false) with check (false);

-- Extended company profile shared across Growth modules.
alter table public.business_profiles add column if not exists organization_number text check (organization_number is null or organization_number ~ '^[0-9]{9}$');
alter table public.business_profiles add column if not exists owner_name text;
alter table public.business_profiles add column if not exists founder_name text;
alter table public.business_profiles add column if not exists managing_director_name text;
alter table public.business_profiles add column if not exists representative_role text;
drop policy if exists "owners can update their business profile" on public.business_profiles;
drop policy if exists "owners and admins can update business profile" on public.business_profiles;
create policy "owners and admins can update business profile" on public.business_profiles for update to authenticated
using (private.has_business_access(id, array['owner','admin']))
with check (private.has_business_access(id, array['owner','admin']));
revoke update on public.business_profiles from authenticated;
grant update (business_name, description, logo_url, organization_number, owner_name, founder_name, managing_director_name, representative_role, updated_at) on public.business_profiles to authenticated;

-- Normalized Shopify webhook events. The webhook gateway writes with the
-- service role; signed-in users may only read events for their own workspace.
create table if not exists public.shopify_sync_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  delivery_id text not null unique,
  shop_domain text not null check (shop_domain ~ '^[a-z0-9][a-z0-9-]*\.myshopify\.com$'),
  topic text not null check (topic in ('orders/create', 'products/update', 'customers/create')),
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);
create index if not exists shopify_sync_events_business_received_idx on public.shopify_sync_events(business_id, received_at desc);
create index if not exists shopify_sync_events_shop_received_idx on public.shopify_sync_events(shop_domain, received_at desc);
alter table public.shopify_sync_events enable row level security;
revoke all on public.shopify_sync_events from anon, authenticated;
grant select on public.shopify_sync_events to authenticated;
grant select, insert, update, delete on public.shopify_sync_events to service_role;
drop policy if exists "members can read Shopify sync events" on public.shopify_sync_events;
create policy "members can read Shopify sync events" on public.shopify_sync_events for select to authenticated
using (private.has_business_access(business_id));
