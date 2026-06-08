
# New Customer Onboarding Flow

End-to-end: admin clicks "Invite client" → intake link is created (with plan + customer email pre-attached) → an invite email is sent automatically AND the link is shown to copy → customer opens link, fills intake, sees their selected plan + T&C checkbox → on accept they're sent to Stripe Checkout.

## User flows

### Admin side
1. New **"Invite client"** button appears in two places:
   - `Admin → Clients` (top of list)
   - `Admin → Intake` (alongside existing "New intake" — relabeled to share the same modal)
2. Modal asks for:
   - Customer email *(required)*
   - Business name
   - Plan dropdown: Phone Starter / Phone + Email / AI Front Office
   - (Optional) phone, website, services — same as today
3. On submit:
   - Creates an `intake_forms` row with token, plan, and customer email saved.
   - Calls the new email server function to send the invite (subject: "Welcome to Vektiss — finish setting up your AI receptionist").
   - Shows a success panel with: copyable link, "Open" button, and "Resend email" button.
4. The admin intake list gets two new columns: **Plan** badge and **Email status** (Sent / Failed / Not sent) with a "Resend" action.

### Customer side (`/intake/$token`)
1. Page loads with intake questionnaire (unchanged for now) but the selected plan is shown at the top as a banner ("You've been invited to the Phone + Email plan — $89.99/mo").
2. After submitting the intake, instead of just "Submitted! Thanks", they're moved to a new **Step 2: Review & Pay** screen on the same page that shows:
   - Plan name, price, included minutes, full feature list (pulled from existing `PLANS` array in `pricing.tsx`)
   - "I agree to the Terms & Conditions" checkbox (placeholder T&C text for now, easy to swap later)
   - Big "Continue to payment" button (disabled until checked)
3. Clicking the button calls the existing Vektiss `create-checkout` edge function with the plan + token, then redirects to Stripe Checkout.
4. After Stripe success, Stripe webhook (already exists on Vektiss side) creates the tenant and links `stripe_customer_id`. We just send them to a confirmation page.

## Technical details

### Data model (intake_forms)
The Vektiss `intake_forms` table doesn't currently have plan/email columns. To avoid a schema migration on the external Supabase project, I'll store:
- `plan` and `contact_email` inside the existing `answers` jsonb (keys `__plan` and `__contact_email`)
- email send status as `__email_sent_at` in the same jsonb

If you'd rather have real columns, say so and I'll do it as a follow-up (requires running SQL against the Vektiss project).

### Email sending
- Use **Lovable Emails** (built-in, no third-party key needed). I'll run the email infrastructure + transactional scaffolder. You'll need to complete the email domain dialog once (pick the sender subdomain, add DNS records).
- Template: `client-invite.tsx` — branded, includes plan summary, "Open your intake form" CTA, fallback link.
- Triggered from a TanStack server function `sendClientInvite` so the admin can also click "Resend".
- Send result is logged in `email_send_log` (auto). The admin UI badge reads from `__email_sent_at` set after a successful send.

### T&C
Placeholder copy lives in a small constant `TERMS_PLACEHOLDER` inside the intake route. Easy to replace with real T&C or a link later.

### Stripe checkout
Calls the existing `https://hygmztvpmmyxuomjwrbt.supabase.co/functions/v1/create-checkout` endpoint with `{ plan, intake_token, customer_email }`. No backend changes needed on Vektiss; the function already returns `{ url }` and the webhook handles tenant creation.

### Files I'll touch / add
- `src/routes/_authenticated/admin.intake.tsx` — extend modal (email + plan), add "Resend" + email-status column, show plan badge
- `src/routes/_authenticated/admin.clients.$slug.tsx` — wait, this is the detail page. I'll instead add the "Invite client" button to `admin.index.tsx` (the clients list/dashboard) so it's reachable from both places
- `src/routes/intake.$token.tsx` — add plan banner, add Step 2 (plan recap + T&C + pay button)
- `src/lib/invite.functions.ts` *(new)* — `sendClientInvite` server function
- `src/lib/email-templates/client-invite.tsx` *(new, after scaffolder runs)*

### Order of operations
1. Run email infrastructure + scaffold transactional email (one-time setup; you'll complete the domain dialog).
2. Build the customer-facing Step 2 (plan + T&C + Stripe) — this is the highest-value piece and works even before email is verified.
3. Build the admin "Invite client" modal + email send + resend.

## Open items / assumptions
- Plan badge in the intake list reads from `answers.__plan`; safe if missing.
- "Custom" plan is not offered in the invite modal (no Stripe price), only the three priced plans.
- If you ever want the customer to be auto-logged-in to the dashboard after paying, that's a follow-up (requires a passwordless auth link in the success email).
