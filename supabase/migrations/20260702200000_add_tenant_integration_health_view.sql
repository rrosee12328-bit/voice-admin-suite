create or replace view public.tenant_integration_health as
select
  t.id as tenant_id,
  t.name as tenant_name,
  t.slug,
  t.agent_status,
  (
    nullif(t.retell_agent_id, '') is not null
    or coalesce(cardinality(t.retell_agent_ids), 0) > 0
    or nullif(t.retell_phone_number, '') is not null
    or coalesce(cardinality(t.retell_phone_numbers), 0) > 0
  ) as has_retell_mapping,
  profile_counts.client_profile_count,
  profile_counts.super_admin_count,
  call_stats.last_call_at,
  coalesce(call_stats.calls_last_24_hours, 0) as calls_last_24_hours,
  coalesce(call_stats.calls_last_7_days, 0) as calls_last_7_days,
  coalesce(call_stats.minutes_last_7_days, 0) as minutes_last_7_days,
  t.minutes_used_this_month,
  t.minutes_included,
  email_stats.last_email_at,
  coalesce(email_stats.failed_emails_last_7_days, 0) as failed_emails_last_7_days,
  case
    when not (
      nullif(t.retell_agent_id, '') is not null
      or coalesce(cardinality(t.retell_agent_ids), 0) > 0
      or nullif(t.retell_phone_number, '') is not null
      or coalesce(cardinality(t.retell_phone_numbers), 0) > 0
    ) then 'missing_retell_mapping'
    when profile_counts.super_admin_count = 0 then 'missing_super_admin'
    when profile_counts.client_profile_count = 0 then 'missing_client_profile'
    when coalesce(email_stats.failed_emails_last_7_days, 0) > 0 then 'email_failures'
    when t.agent_status = 'live' and call_stats.last_call_at is null then 'live_no_calls'
    else 'healthy'
  end as health_status
from public.tenants t
cross join lateral (
  select
    count(*) filter (where p.tenant_id = t.id and p.email is not null) as client_profile_count,
    count(*) filter (where p.role = 'super_admin' and p.email is not null) as super_admin_count
  from public.profiles p
) profile_counts
left join lateral (
  select
    max(c.created_at) as last_call_at,
    count(*) filter (where c.created_at >= now() - interval '24 hours') as calls_last_24_hours,
    count(*) filter (where c.created_at >= now() - interval '7 days') as calls_last_7_days,
    ceil(coalesce(sum(coalesce(c.duration_seconds, 0)) filter (where c.created_at >= now() - interval '7 days'), 0) / 60.0)::integer as minutes_last_7_days
  from public.calls c
  where c.tenant_id = t.id
    and coalesce(c.retell_call_id, '') not ilike 'test%'
    and coalesce(c.retell_call_id, '') not ilike '%debug%'
) call_stats on true
left join lateral (
  select
    max(em.sent_at) as last_email_at,
    count(*) filter (where em.status = 'failed' and em.sent_at >= now() - interval '7 days') as failed_emails_last_7_days
  from public.email_messages em
  where em.tenant_id = t.id
) email_stats on true;
