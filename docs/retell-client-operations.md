# Retell Client Operations

Use this checklist whenever a client is added, a Retell workspace changes, a phone number is moved, or email recipients change.

## What Must Stay True

Each client workspace needs four things to keep calls flowing into Vektiss Voice:

1. The Supabase `tenants` row must identify the Retell workspace by agent ID and/or phone number.
2. The Retell workspace must send post-call webhooks to the deployed `retell-webhook` Supabase function.
3. The tenant must have at least one profile email, and Vektiss super admins must remain `super_admin`.
4. Calls must insert/update in `calls`; the database trigger then recalculates monthly minutes automatically.

## Client Setup Checklist

For every new client:

1. Create or confirm the tenant row in Supabase.
2. Set these fields on the tenant:
   - `name`
   - `slug`
   - `plan`
   - `agent_status`
   - `retell_agent_id` or `retell_agent_ids`
   - `retell_phone_number` or `retell_phone_numbers`
   - `minutes_included`
3. Confirm the client admin profile is linked to the tenant with `profiles.tenant_id`.
4. Confirm `rrose@vektiss.com` or another Vektiss account remains `super_admin`.
5. In that client's Retell workspace, configure the webhook URL to the deployed Supabase `retell-webhook` endpoint.
6. Make one test call.
7. Verify the call appears in:
   - the client's dashboard call log
   - the super admin dashboard
   - Supabase `calls`
   - Supabase `email_messages`
8. Verify `tenants.minutes_used_this_month` changes after the call.

## Retell Mapping Rules

The webhook assigns a call to a tenant in this order:

1. `metadata.tenant_id` from Retell.
2. `retell_llm_dynamic_variables.tenant_id` from Retell.
3. The Supabase `DEFAULT_TENANT_ID` fallback, if configured.
4. Matching `call.agent_id` to `tenants.retell_agent_id` or `tenants.retell_agent_ids`.
5. Matching `call.to_number` or `call.from_number` to `tenants.retell_phone_number` or `tenants.retell_phone_numbers`.

Best practice: add the tenant ID to Retell metadata or dynamic variables when possible, and also keep agent IDs and phone numbers populated in Supabase. That gives the webhook more than one way to route the call correctly.

## Retell API Deprecation Checks

Retell warning emails about deprecated API usage are about outbound API calls made from a client, script, automation, or older deployed app into Retell. The Vektiss Voice dashboard should receive live call data through Retell webhooks; it should not need to poll Retell list endpoints to keep calls updated.

If Retell sends an action-required deprecation email, search every active codebase, Lovable action, automation, and Retell workspace helper for these replacements:

| Deprecated usage | Use instead |
| --- | --- |
| `GET /list-phone-numbers` | `GET /v2/list-phone-numbers` |
| `POST /v2/list-calls` | `POST /v3/list-calls` |
| `PATCH /update-phone-number/:phone_number` with `inbound_agent_id` | `PATCH /update-phone-number/:phone_number` with `inbound_agents: [{ agent_id, agent_version, weight: 1 }]` |
| `POST /publish-agent/:agent_id` | `POST /publish-agent-version/:agent_id` |

For all versioned list endpoints, read results from the `items` array and keep paging with `pagination_key` and `has_more`.

The active source in this repository is webhook-based and should not call those deprecated Retell endpoints. If Retell continues sending these warnings after this repo is clean, the remaining caller is likely an older Lovable deployment, a separate script, a Retell dashboard action, or another project connected to the same Retell organization.

## Email Notification Rules

Post-call emails are sent only after the call is ready, not at `call_started`.

Recipients are:

1. All profiles with `role = super_admin`.
2. All profiles with `tenant_id` matching the call's tenant.

Emails are deduped by `call_id` plus recipient email, so retries should not send duplicate notifications to the same person.

## Monthly Minutes

Monthly usage is recalculated by the database trigger `refresh_tenant_current_month_usage_on_calls`.

It runs whenever `calls` are inserted, updated, or deleted. The calculation uses America/Chicago month boundaries and rounds total seconds up to billable minutes.

If numbers ever look wrong, run:

```sql
select public.refresh_tenant_current_month_usage('<tenant-id>'::uuid);
```

To refresh every tenant:

```sql
do $$
declare
  tenant_record record;
begin
  for tenant_record in select id from public.tenants loop
    perform public.refresh_tenant_current_month_usage(tenant_record.id);
  end loop;
end;
$$;
```

## Health Checks

Run this after onboarding or after Retell changes:

```sql
select
  t.id,
  t.name,
  t.slug,
  t.agent_status,
  t.retell_agent_id,
  t.retell_agent_ids,
  t.retell_phone_number,
  t.retell_phone_numbers,
  max(c.created_at) as last_call_at,
  count(c.id) filter (where c.created_at >= now() - interval '7 days') as calls_last_7_days,
  count(em.id) filter (where em.status = 'failed' and em.sent_at >= now() - interval '7 days') as failed_emails_last_7_days
from public.tenants t
left join public.calls c on c.tenant_id = t.id
left join public.email_messages em on em.tenant_id = t.id
group by t.id
order by t.name;
```

Red flags:

- `retell_agent_id`, `retell_agent_ids`, `retell_phone_number`, and `retell_phone_numbers` are all empty.
- The Retell workspace shows recent calls but `last_call_at` is old.
- `failed_emails_last_7_days` is above `0`.
- The tenant has no linked client profile.
- Super admin profiles are missing or do not have `role = super_admin`.

## When Something Stops Updating

Check in this order:

1. Retell call history: confirm the call exists in the correct Retell workspace.
2. Retell webhook settings: confirm the workspace points to the deployed Supabase function.
3. Supabase function logs: look for `retell-webhook failed`, `Invalid Retell webhook authentication`, or `Call notification email failed`.
4. Supabase `calls`: search by Retell call ID.
5. Supabase `email_messages`: look for `failed` rows and `error_message`.
6. Tenant mapping fields: verify agent IDs and phone numbers match the Retell workspace.

## Deployment Reminder

When `supabase/functions/retell-webhook/index.ts` changes:

1. Commit and push the code.
2. Deploy the Supabase function.
3. Make one test call or replay a safe test payload.
4. Confirm `calls`, `email_messages`, and minutes all update.
