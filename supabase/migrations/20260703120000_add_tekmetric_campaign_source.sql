create table if not exists public.tenant_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null,
  status text not null default 'connected',
  environment_url text,
  settings jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  template text not null default 'service_reminder',
  ai_script text,
  caller_id text,
  status text not null default 'draft',
  total_contacts integer not null default 0,
  calls_made integer not null default 0,
  calls_answered integer not null default 0,
  appointments_booked integer not null default 0,
  calls_per_day integer not null default 5,
  call_days text[] not null default array['mon','tue','wed','thu','fri']::text[],
  call_window_start text not null default '09:00',
  call_window_end text not null default '17:00',
  timezone text not null default 'America/Chicago',
  start_type text not null default 'immediate',
  scheduled_at timestamptz,
  campaign_end_type text not null default 'days',
  campaign_end_date date,
  campaign_end_days integer,
  started_at timestamptz,
  completed_at timestamptz,
  source text not null default 'csv',
  source_config jsonb not null default '{}'::jsonb,
  source_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_contacts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  first_name text,
  last_name text,
  phone text not null,
  email text,
  last_service_date text,
  vehicle_info text,
  notes text,
  call_status text not null default 'pending',
  call_outcome text,
  called_at timestamptz,
  external_source text,
  external_id text,
  source_payload jsonb not null default '{}'::jsonb,
  due_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.campaigns
  add column if not exists source text not null default 'csv',
  add column if not exists source_config jsonb not null default '{}'::jsonb,
  add column if not exists source_synced_at timestamptz;

alter table public.campaign_contacts
  add column if not exists external_source text,
  add column if not exists external_id text,
  add column if not exists source_payload jsonb not null default '{}'::jsonb,
  add column if not exists due_reason text;

create index if not exists campaign_contacts_external_source_idx
  on public.campaign_contacts (tenant_id, external_source, external_id);

create index if not exists campaigns_tenant_status_idx
  on public.campaigns (tenant_id, status, created_at desc);

create index if not exists campaign_contacts_campaign_idx
  on public.campaign_contacts (campaign_id, created_at);

alter table public.tenant_integrations enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_contacts enable row level security;

drop policy if exists "tenant integrations readable by tenant admins" on public.tenant_integrations;
create policy "tenant integrations readable by tenant admins"
on public.tenant_integrations
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or p.tenant_id = tenant_integrations.tenant_id
      )
  )
);

drop policy if exists "tenant integrations writable by super admins" on public.tenant_integrations;
create policy "tenant integrations writable by super admins"
on public.tenant_integrations
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
  )
);

drop policy if exists "campaigns readable by tenant members" on public.campaigns;
create policy "campaigns readable by tenant members"
on public.campaigns
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or p.tenant_id = campaigns.tenant_id
      )
  )
);

drop policy if exists "campaigns writable by tenant admins" on public.campaigns;
create policy "campaigns writable by tenant admins"
on public.campaigns
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or (p.tenant_id = campaigns.tenant_id and p.role = 'client_admin')
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or (p.tenant_id = campaigns.tenant_id and p.role = 'client_admin')
      )
  )
);

drop policy if exists "campaign contacts readable by tenant members" on public.campaign_contacts;
create policy "campaign contacts readable by tenant members"
on public.campaign_contacts
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or p.tenant_id = campaign_contacts.tenant_id
      )
  )
);

drop policy if exists "campaign contacts writable by tenant admins" on public.campaign_contacts;
create policy "campaign contacts writable by tenant admins"
on public.campaign_contacts
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or (p.tenant_id = campaign_contacts.tenant_id and p.role = 'client_admin')
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or (p.tenant_id = campaign_contacts.tenant_id and p.role = 'client_admin')
      )
  )
);
