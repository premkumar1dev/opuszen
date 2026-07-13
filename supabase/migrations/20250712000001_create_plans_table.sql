-- Plans table for subscription pricing
create table if not exists public.plans (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 description text,
 duration_days integer not null default 30,
 price numeric(10,2) not null default 0,
 currency text not null default 'INR',
 features jsonb default '[]'::jsonb,
 multiplier numeric(4,2) not null default 1,
 is_active boolean not null default true,
 sort_order integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;

create policy "allow_read_plans"
 on public.plans for select
 to anon, authenticated
 using (true);

create policy "allow_insert_plans_auth"
 on public.plans for insert
 to authenticated
 with check (true);

create policy "allow_update_plans_auth"
 on public.plans for update
 to authenticated
 using (true);

create policy "allow_delete_plans_auth"
 on public.plans for delete
 to authenticated
 using (true);

create index if not exists idx_plans_active on public.plans(is_active);
create index if not exists idx_plans_sort on public.plans(sort_order);
