## Update Resend sender + API key

1. **Update `RESEND_API_KEY` secret** to `re_2WNhp25c_3ENRZsTsHKkaEwV1Tx8jNkaJ` via the secrets tool.
2. **Update `RESEND_FROM` secret** to `Vektiss Support <support@vektiss.com>` (replaces the current `support@support.vektiss.com` sender). If `RESEND_FROM` doesn't exist yet, add it.
3. **No code changes needed** — `src/lib/invite-email.functions.ts` already reads both from env.
4. **Send a test invite** to confirm delivery from the new address.

### Note
For `support@vektiss.com` to send successfully, the `vektiss.com` root domain (not just `support.vektiss.com`) must be verified in Resend. If it isn't, the send will fail with a domain-not-verified error and we'll need to either verify `vektiss.com` in Resend or keep the subdomain sender.
