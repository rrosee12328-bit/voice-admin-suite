create or replace function public.refresh_tenant_current_month_usage(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_start timestamptz := date_trunc('month', now() at time zone 'America/Chicago') at time zone 'America/Chicago';
  v_period_end timestamptz := v_period_start + interval '1 month';
  v_seconds integer;
begin
  if p_tenant_id is null then
    return;
  end if;

  select coalesce(sum(coalesce(duration_seconds, 0)), 0)::integer
  into v_seconds
  from public.calls
  where tenant_id = p_tenant_id
    and created_at >= v_period_start
    and created_at < v_period_end
    and coalesce(retell_call_id, '') not ilike 'test%'
    and coalesce(retell_call_id, '') not ilike '%debug%';

  update public.tenants
  set minutes_used_this_month = ceil(v_seconds / 60.0)::integer
  where id = p_tenant_id;
end;
$$;

do $$
declare
  tenant_record record;
begin
  for tenant_record in select id from public.tenants loop
    perform public.refresh_tenant_current_month_usage(tenant_record.id);
  end loop;
end;
$$;
