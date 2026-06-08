## Problem

The "Manage subscription" button calls the Vektiss `customer-portal` backend function, but the request is sent without an `Authorization` header. The function rejects it with `UNAUTHORIZED_NO_AUTH_HEADER / Missing authorization header`.

## Fix

In `src/routes/_authenticated/dashboard.billing.tsx`, update `handleManageBilling` to:

1. Grab the current Supabase session via `supabase.auth.getSession()`.
2. If there's no access token, show a "Please sign in again" toast and stop.
3. Include the token on the fetch call:
   - `Authorization: Bearer <access_token>`
   - `apikey: <supabase publishable key>` (some Supabase functions also require this)
4. Keep the existing `Content-Type: application/json` and `{ tenant_id }` body.
5. Keep the existing success/error handling (open returned `url` in a new tab, toast on failure).

No other files change. No backend changes — the existing `customer-portal` function on the Vektiss backend already expects an authenticated caller; we just weren't sending the header.

## Validation

After the change, click "Manage subscription" as a client user and confirm the Stripe Customer Portal opens in a new tab instead of the error toast.
