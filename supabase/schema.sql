create table if not exists public.business_profiles (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade unique, business_name text not null, description text not null default '', logo_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.business_profiles enable row level security;
create policy "owners can read their business profile" on public.business_profiles for select using (auth.uid() = owner_id);
create policy "owners can create their business profile" on public.business_profiles for insert with check (auth.uid() = owner_id);
create policy "owners can update their business profile" on public.business_profiles for update using (auth.uid() = owner_id);
