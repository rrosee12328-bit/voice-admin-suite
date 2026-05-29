## Problem

In the sidebar (`src/components/app-sidebar.tsx`), the "Platform Analytics" item under the Platform section points to `to="/admin"` — the same destination as "All Clients". Clicking it appears to do nothing because you're already on `/admin`. There is also no `/admin/analytics` route file, so even a corrected link would 404.

## Plan

1. **Create `src/routes/_authenticated/admin.analytics.tsx`**
   - New route at `/admin/analytics`, super-admin only (redirect non-super to `/dashboard`).
   - Aggregate platform-wide stats from existing tables:
     - Total clients (tenants count)
     - Active clients (subscription status active)
     - Total calls this month
     - Total minutes used this month
     - Appointments booked this month
   - Render with the existing `StatCard` component and a simple recent-activity list, matching the look of `admin.index.tsx`.
   - Standard `head()` with route-specific title/description.

2. **Fix the sidebar link in `src/components/app-sidebar.tsx`**
   - Change the Platform Analytics `<Link>` from `to="/admin"` to `to="/admin/analytics"`.
   - Keep the `isActive("/admin/analytics")` check (already correct).

3. **No schema, RLS, or auth changes** — reuses existing tenant/call/appointment tables and the `_authenticated` guard.

## Technical notes

- Route ID string must be `"/_authenticated/admin/analytics"` to match the filename `admin.analytics.tsx`.
- Data fetched via the existing `supabase` client inside a `useQuery` (same pattern as `admin.index.tsx`), no new server functions needed.
