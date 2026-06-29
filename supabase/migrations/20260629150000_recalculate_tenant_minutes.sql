create or replace function public.refresh_tenant_current_month_usage(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_start timestamptz := date_trunc('month', now());
  v_period_end timestamptz := date_trunc('month', now()) + interval '1 month';
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

create or replace function public.refresh_tenant_current_month_usage_from_call()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_tenant_current_month_usage(old.tenant_id);
    return old;
  end if;

  perform public.refresh_tenant_current_month_usage(new.tenant_id);

  if tg_op = 'UPDATE' and old.tenant_id is distinct from new.tenant_id then
    perform public.refresh_tenant_current_month_usage(old.tenant_id);
  end if;

  return new;
end;
$$;

drop trigger if exists refresh_tenant_current_month_usage_on_calls on public.calls;

create trigger refresh_tenant_current_month_usage_on_calls
after insert or update or delete on public.calls
for each row
execute function public.refresh_tenant_current_month_usage_from_call();

update public.tenants
set retell_agent_ids = (
  select array_agg(distinct agent_id)
  from unnest(
    coalesce(retell_agent_ids, '{}'::text[]) ||
    array[
      nullif(retell_agent_id, ''),
      'agent_6824bc37934b708b8e10fc117b'
    ]
  ) as agent_id
  where agent_id is not null and agent_id <> ''
)
where id = '00000000-0000-0000-0000-000000346000'::uuid;

delete from public.calls
where coalesce(retell_call_id, '') ilike 'test%'
   or coalesce(retell_call_id, '') ilike '%debug%';

do $$
declare
  tenant_record record;
begin
  for tenant_record in select id from public.tenants loop
    perform public.refresh_tenant_current_month_usage(tenant_record.id);
  end loop;
end;
$$;
