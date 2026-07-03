create or replace view public.tenant_external_connection_health
with (security_invoker = true)
as
select
  t.id as tenant_id,
  t.name as tenant_name,
  t.slug,
  'tekmetric'::text as provider,
  (ti.id is not null) as is_connected,
  coalesce(ti.status, 'not_connected') as status,
  ti.environment_url,
  ti.settings,
  ti.last_synced_at,
  ti.updated_at as integration_updated_at,
  campaign_stats.last_campaign_at,
  campaign_stats.last_campaign_name,
  coalesce(campaign_stats.campaign_count, 0) as campaign_count,
  coalesce(contact_stats.contact_count, 0) as contact_count,
  coalesce(contact_stats.pending_contact_count, 0) as pending_contact_count,
  contact_stats.last_contact_imported_at,
  case
    when ti.id is null then 'not_connected'
    when ti.status <> 'connected' then ti.status
    when ti.last_synced_at is null then 'connected_never_synced'
    when ti.last_synced_at < now() - interval '7 days' then 'stale'
    else 'healthy'
  end as health_status
from public.tenants t
left join public.tenant_integrations ti
  on ti.tenant_id = t.id
  and ti.provider = 'tekmetric'
left join lateral (
  select
    count(*)::integer as campaign_count,
    max(c.created_at) as last_campaign_at,
    (array_agg(c.name order by c.created_at desc))[1] as last_campaign_name
  from public.campaigns c
  where c.tenant_id = t.id
    and c.source = 'tekmetric'
) campaign_stats on true
left join lateral (
  select
    count(*)::integer as contact_count,
    count(*) filter (where cc.call_status = 'pending')::integer as pending_contact_count,
    max(cc.created_at) as last_contact_imported_at
  from public.campaign_contacts cc
  where cc.tenant_id = t.id
    and cc.external_source = 'tekmetric'
) contact_stats on true;

grant select on public.tenant_external_connection_health to authenticated;
