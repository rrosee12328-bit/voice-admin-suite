
## Prerequisite: Connect Supabase

The project does not yet have a Supabase client (`src/integrations/supabase/` is missing). Before building, I'll enable the Supabase integration so the existing project (with `tenants`, `profiles`, `calls`) is wired up. No tables or migrations will be created — read-only usage of your existing schema.

If you'd rather paste your Supabase URL + publishable key manually instead of using the integration, let me know.

## Design system

- Dark theme only. Tokens added to `src/styles.css`:
  - `--background: #0A0F1E`, `--primary: #2563EB`, surfaces/borders tuned for premium dark SaaS
  - Inter loaded via Google Fonts in `__root.tsx` head
- All components use semantic tokens (no hard-coded hex in JSX)

## Auth & routing

- `src/routes/login.tsx` — email/password Supabase auth (signInWithPassword)
- Router context exposes `auth` (session + profile with role + tenant_id)
- `src/routes/__root.tsx` registers single `onAuthStateChange` listener; invalidates router + query cache
- `_authenticated.tsx` layout: `beforeLoad` redirects to `/login` if no session; fetches profile once via server fn, exposes role
- Role-based redirect on `/`:
  - `super_admin` → `/admin/dashboard`
  - `client_admin` → `/app/dashboard`

## Route tree

```
routes/
  __root.tsx
  index.tsx                       # redirect by role
  login.tsx
  _authenticated.tsx              # session gate + profile load
  _authenticated/_admin.tsx       # role === 'super_admin' gate + AdminSidebar
  _authenticated/_admin/dashboard.tsx
  _authenticated/_admin/clients.tsx
  _authenticated/_admin/clients.$tenantId.tsx   # client's call log
  _authenticated/_admin/billing.tsx
  _authenticated/_admin/settings.tsx
  _authenticated/_client.tsx      # role === 'client_admin' gate + ClientSidebar
  _authenticated/_client/dashboard.tsx
  _authenticated/_client/calls.tsx
  _authenticated/_client/calls.$callId.tsx      # transcript dialog/page
  _authenticated/_client/usage.tsx
  _authenticated/_client/settings.tsx
```

## Data access

All reads via `createServerFn` + `requireSupabaseAuth` (RLS-scoped). Files under `src/lib/`:

- `profile.functions.ts` — `getMyProfile()`
- `admin.functions.ts` — `getAdminStats()` (clients count, calls this month, MRR derived from plan, total minutes), `listTenants()`, `getTenantCalls(tenantId)`
- `client.functions.ts` — `getClientDashboard()` (today / this week / appointments booked from `calls` scoped to tenant), `listMyCalls()`, `getMyUsage()` (from `tenants` row), `getCall(id)`

TanStack Query wires each loader via `ensureQueryData` + `useSuspenseQuery`.

## Views

**Super Admin**
- Sidebar: Dashboard, Clients, Billing, Settings (shadcn `Sidebar`, collapsible icon)
- Dashboard: 4 stat cards (total clients, calls this month, MRR, platform minutes used)
- Clients: shadcn `Table` with name / plan / `minutes_used/minutes_included` / `stripe_subscription_status` / `created_at`; row click → `/admin/clients/$tenantId` showing that tenant's calls table
- Billing & Settings: placeholder cards (no schema for billing details in scope)

**Client**
- Sidebar: Dashboard, Calls, Usage, Settings
- Dashboard: stat cards (today's calls, this week's calls, appointments booked)
- Calls: table (caller_name, caller_phone, call_reason, outcome, appointment_booked badge, duration formatted m:ss, started_at); row opens transcript dialog with recording player if `recording_url`
- Usage: minutes used / included with `Progress` bar
  - color via token classes: <80% primary blue, 80–99% amber, ≥100% red
  - Overage warning `Alert` when used > included
  - "Resets on 1st of next month" helper text
- Settings: shows `full_name` + `email` from profile, "Manage Billing" button (disabled stub for now; can wire to Stripe portal later)

## Notes / open questions

- MRR calc: I'll derive from `tenants.plan` using a simple plan→price map in code. If you want exact MRR, we should pull from Stripe later.
- "Manage Billing" button: stub now, or wire to a `createServerFn` that opens a Stripe Customer Portal session? (Needs `STRIPE_SECRET_KEY`.)
- No new tables, no migrations, no Prisma/Drizzle — confirmed.

After you approve, I'll switch to build mode and implement in this order: Supabase connect → tokens/fonts → auth + layouts → admin views → client views.
