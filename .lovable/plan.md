
## Change
Update `src/routes/intake.$token.tsx` so the POST body to `create-checkout` includes all fields needed for Stripe session metadata.

## Implementation
1. Pass new props from `IntakePage` → `ReviewAndPay`:
   - `businessName` (from `pre.business_name`)
   - `contactName` (from `pre.contact_name` if present, else first word of business name)
   - `contactPhone` (from `pre.contact_phone`)

2. In `ReviewAndPay.handlePay`, expand the fetch body sent to `https://hygmztvpmmyxuomjwrbt.supabase.co/functions/v1/create-checkout`:

```ts
body: JSON.stringify({
  plan,
  intake_token: token,
  business_name: businessName,
  client_name: (contactName ?? businessName ?? "").split(" ")[0],
  client_email: contactEmail,
  client_phone: contactPhone,
  plan_price: String(PLAN_PRICE[plan]),
}),
```

## Notes
- Edge function code itself lives in the external Vektiss Supabase project — you'll wire the `metadata` + `customer_email` there using the snippet I provided.
- No UI changes, no new deps.
