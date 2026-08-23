create table if not exists public.shopify_sync_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  delivery_id text not null unique,
  shop_domain text not null check (shop_domain ~ '^[a-z0-9][a-z0-9-]*\.myshopify\.com$'),
  topic text not null check (topic in ('orders/create', 'products/update', 'customers/create')),
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index if not exists shopify_sync_events_business_received_idx
on public.shopify_sync_events(business_id, received_at desc);

create index if not exists shopify_sync_events_shop_received_idx
on public.shopify_sync_events(shop_domain, received_at desc);

alter table public.shopify_sync_events enable row level security;
revoke all on public.shopify_sync_events from anon, authenticated;
grant select on public.shopify_sync_events to authenticated;
grant select, insert, update, delete on public.shopify_sync_events to service_role;

drop policy if exists "members can read Shopify sync events" on public.shopify_sync_events;
create policy "members can read Shopify sync events"
on public.shopify_sync_events for select
to authenticated
using (private.has_business_access(business_id));
