# Long-form Terms + scroll-to-read gate on intake checkout

## What changes

On the **Review & Pay** step (`src/routes/intake.$token.tsx`), replace the short `TERMS_PLACEHOLDER` with the full Vektiss Voice ToS below, render it in a ~480px-tall scrollable box, and keep the "I agree" checkbox **disabled until the user has scrolled to the bottom**. The Continue-to-payment button stays gated by the checkbox as today.

The new call-recording compliance language goes **inside the ToS body**, appended to Section 10.2 ("Your Consent Obligations") — your preferred placement.

No backend / billing / invite changes.

---

## Full ToS text to be embedded (verbatim from your PDF, with one added paragraph in 10.2 marked **NEW**)

> **Vektiss Voice — Terms of Service**
>
> **Effective Date:** June 10, 2026   **Last Updated:** June 10, 2026
> **Company:** Vektiss Technologies LLC ("Vektiss," "we," "us," "our")
> **Service:** Vektiss Voice AI Receptionist Platform
> **Contact:** info@vektiss.com | 346-594-7686
> **Website:** vektiss.com | **Privacy Policy:** vektiss.com/privacy
>
> ### 1. Agreement to Terms
> By accessing or using the Vektiss Voice platform, completing the client intake form, checking the acceptance box, and submitting payment, you ("Client," "you," "your") acknowledge that you have read, understood, and agree to be legally bound by these Terms of Service ("Terms") and our Privacy Policy at vektiss.com/privacy, which is incorporated herein by reference.
>
> If you are accepting these Terms on behalf of a business or other legal entity, you represent and warrant that you have the authority to bind that entity to these Terms. If you do not have such authority, or if you do not agree with these Terms, you must not use the service.
>
> These Terms constitute the entire agreement between you and Vektiss Technologies LLC with respect to the Vektiss Voice service and supersede all prior or contemporaneous communications, proposals, or agreements, whether oral or written.
>
> ### 2. Description of Services
> Vektiss Voice is an AI-powered phone receptionist platform that provides the following core services:
> - **Inbound call handling** — your AI agent answers calls on behalf of your business 24 hours a day, 7 days a week, 365 days a year.
> - **Call logging** — every call is automatically logged with caller information, duration, and outcome.
> - **Post-call summaries** — AI-generated summaries of each call are delivered to your dashboard and optionally by email.
> - **Custom agent configuration** — your AI agent is trained on your business information, services, hours, FAQs, and call handling instructions.
> - **Client dashboard** — a secure web portal where you can review call logs, recordings, summaries, usage statistics, and billing information.
> - **Configuration updates** — up to two (2) agent configuration changes per month are included at no additional charge. Additional changes may be subject to a service fee.
>
> The specific features available to you depend on the subscription plan you selected at the time of signup. Vektiss reserves the right to modify, enhance, or discontinue any feature with reasonable notice.
>
> ### 3. Eligibility
> To use Vektiss Voice, you must:
> - Be at least 18 years of age.
> - Be a legally operating business or sole proprietor in the United States.
> - Have the legal authority to enter into a binding contract.
> - Provide accurate, complete, and current business and billing information.
> - Maintain a valid payment method on file at all times.
>
> Vektiss reserves the right to refuse service to any business or individual at its sole discretion.
>
> ### 4. Account Registration & Security
> When you complete the intake form and payment, a Vektiss Voice account will be created for you. You are responsible for:
> - Maintaining the confidentiality of your account login credentials.
> - All activity that occurs under your account.
> - Immediately notifying Vektiss at info@vektiss.com if you suspect unauthorized access to your account.
>
> Vektiss will not be liable for any loss or damage arising from your failure to protect your account credentials. You may not share your account with, or transfer your account to, any third party without prior written consent from Vektiss.
>
> ### 5. Onboarding & Setup
> **5.1 Setup Fee.** A one-time, **non-refundable setup fee of $500** is charged at the time of signup. This fee covers: custom AI agent configuration and training on your business information; integration with your phone system; quality assurance testing prior to launch; and initial onboarding support. The setup fee applies to all standard plans. Custom enterprise plans may have a different setup fee as specified in the custom agreement.
>
> **5.2 Setup Timeline.** Vektiss will use commercially reasonable efforts to complete your AI agent setup within **3–5 business days** of receiving your completed intake form and payment. Complex configurations may require additional time, and Vektiss will communicate any delays promptly.
>
> **5.3 Client Cooperation.** You agree to provide accurate and complete business information during onboarding, including but not limited to: business name, address, phone number, hours of operation, services offered, pricing (if applicable), FAQs, and any specific call handling instructions. Delays caused by incomplete or inaccurate information provided by you are not the responsibility of Vektiss.
>
> **5.4 Phone System Configuration.** You are solely responsible for configuring your existing phone system to forward calls to the Vektiss Voice number assigned to your account. Vektiss will provide the assigned number and basic forwarding instructions, but is not responsible for your carrier's configuration, fees, or compatibility.
>
> **5.5 Configuration Update Requests.** After your AI agent is live, you may submit requests for changes or updates to your agent's configuration — such as updated business hours, revised FAQs, script changes, or new handling instructions — by emailing info@vektiss.com or calling 346-594-7686.
> - **Business hours for update requests:** Monday through Friday, 9:00 AM – 5:00 PM Central Time. Requests received outside of business hours will be reviewed on the next business day.
> - **Included updates:** Up to two (2) configuration changes per month are included in your subscription at no additional charge, as noted in Section 2. Additional changes beyond the monthly allotment may be subject to a service fee.
> - **Turnaround timeline:** Upon receipt of your update request, Vektiss will review the scope of the change and provide you with an estimated completion timeline. Simple updates (e.g., hours of operation, contact information, minor script edits) are typically completed within **24 business hours** of the request being received during business hours. More complex changes may require additional time, which will be communicated to you in advance.
> - Vektiss will make reasonable efforts to implement approved changes promptly, but cannot guarantee same-day completion for any update request.
> - Clients are encouraged to submit update requests as early as possible to allow adequate processing time before changes are needed.
>
> ### 6. Subscription Plans & Billing
> **6.1 Subscription Start Date.** Your monthly subscription billing begins on the date your AI agent goes live — not the date of signup or payment. You will be notified by email when your agent is live and billing has commenced.
>
> **6.2 Recurring Billing.** By providing your payment method and accepting these Terms, you authorize Vektiss to automatically charge your payment method on file for: your monthly or annual subscription fee on the applicable renewal date; any overage charges incurred during the prior billing cycle; and any applicable taxes or government-mandated fees.
>
> **6.3 Standard Monthly Plan Pricing.**
>
> | Plan          | Monthly Price | Included Minutes |
> |---------------|---------------|------------------|
> | Phone Starter | $45.99/mo     | 100 min/mo       |
> | Phone Pro     | $99.99/mo     | 300 min/mo       |
> | Phone Elite   | $199.99/mo    | 600 min/mo       |
>
> Pricing is subject to change with 30 days' advance written notice to the email address on file.
>
> **6.4 Annual Subscription Plans.** Annual subscriptions are billed as a single upfront payment covering 12 months of service. By selecting an annual plan, you agree to the following:
> - **Full payment is due at the time of signup.** Annual subscriptions are not billed monthly.
> - **Annual subscriptions are non-refundable.** No refunds, partial refunds, or prorated credits will be issued for any unused portion of an annual subscription term, regardless of the reason for cancellation or termination.
> - **Cancellation of an annual plan** takes effect at the end of the 12-month term. If you cancel before the end of the annual term, you will retain access to the service through the end of the paid period, but you **forfeit all remaining months** with no refund.
> - The 30-day money-back guarantee described in Section 8 applies to the first month's equivalent value of an annual subscription only, measured from the date your AI agent goes live.
> - Annual subscribers will be notified by email at least **30 days before** their annual renewal date. If no cancellation is received before the renewal date, the subscription will automatically renew for another 12-month term at the then-current annual rate.
>
> **6.5 Custom Enterprise Plans.** Vektiss offers custom plans for businesses with unique requirements, higher call volumes, multi-location needs, or specialized AI agent configurations. Custom plans are subject to the following:
> - Pricing, included minutes, overage rates, and setup fees for custom plans are individually negotiated and specified in a separate written agreement or order form between you and Vektiss.
> - All other provisions of these Terms apply to custom plan subscribers unless explicitly superseded by the terms of the custom agreement.
> - Custom plan subscribers must abide by the specific terms, pricing, and commitments outlined in their custom agreement for the full duration of that agreement.
> - Early termination of a custom plan agreement may result in an early termination fee as specified in the custom agreement.
> - To inquire about a custom plan, contact us at info@vektiss.com or call 346-594-7686.
>
> **6.6 Invoices.** A monthly invoice will be sent to your email address at the end of each billing cycle. Annual subscribers will receive a single invoice at the time of payment and a renewal notice 30 days before the annual term ends.
>
> **6.7 Failed Payments.** If a payment fails, Vektiss will attempt to retry the charge up to three (3) times over a seven (7) day period. If payment remains unsuccessful after three attempts, your service may be suspended until payment is received. You are responsible for keeping your payment information current and accurate.
>
> **6.8 Taxes.** All fees are exclusive of applicable sales tax, use tax, VAT, or other governmental charges. You are responsible for paying all such taxes associated with your use of the service.
>
> ### 7. Overage Charges
> **7.1 Overage Rates.** Usage beyond your plan's included monthly minutes is billed at the following overage rates:
>
> | Plan          | Overage Rate    |
> |---------------|-----------------|
> | Phone Starter | $0.25 per minute|
> | Phone Pro     | $0.20 per minute|
> | Phone Elite   | $0.18 per minute|
>
> Custom plan overage rates are specified in the applicable custom agreement.
>
> **7.2 Usage Notifications.** You will receive an automated email notification when your usage reaches **80%** of your included monthly minutes. This notification is provided as a courtesy and does not cap or limit your usage. Overage charges will continue to accrue beyond the 80% threshold.
>
> **7.3 Overage Billing.** Overage charges are calculated at the end of each billing cycle and added to your next invoice. By accepting these Terms, you authorize all overage charges that accrue under your account.
>
> **7.4 Plan Upgrades.** If you anticipate consistent overage usage, you may upgrade your plan at any time by contacting us at info@vektiss.com or calling 346-594-7686. Plan upgrades take effect at the start of the next billing cycle unless otherwise agreed.
>
> ### 8. Money-Back Guarantee
> Vektiss offers a **30-day satisfaction guarantee** on your first month's subscription fee (or the monthly equivalent for annual subscribers), measured from the date your AI agent goes live. If you are not satisfied with the service within this period, contact us at info@vektiss.com and we will issue a refund of the first month's subscription fee.
>
> The following are excluded from the money-back guarantee:
> - The one-time $500 setup fee (non-refundable under all circumstances).
> - Overage charges incurred during the guarantee period.
> - Subscription fees for any month after the first 30 days of service.
> - The remaining balance of an annual subscription after the first 30 days.
> - Accounts that have violated these Terms of Service.
>
> Refund requests must be submitted within 30 days of your agent's go-live date. Refunds are processed to the original payment method within 5–10 business days.
>
> ### 9. Cancellation
> **9.1 How to Cancel.** You may cancel your Vektiss Voice subscription at any time by emailing info@vektiss.com with your business name and cancellation request, or by calling 346-594-7686 during business hours.
>
> **9.2 Monthly Plan Cancellation.** Cancellations of monthly plans take effect at the **end of your current billing cycle**. You will retain access to the service and your dashboard through the end of the paid period. You will not be charged for any subsequent billing cycles after cancellation is confirmed.
>
> **9.3 Annual Plan Cancellation.** If you cancel an annual subscription before the end of the 12-month term, your access will continue through the end of the paid annual period. **No refund will be issued for the remaining months of the annual term.** All remaining months are forfeited upon cancellation.
>
> **9.4 Custom Plan Cancellation.** Cancellation of a custom plan is governed by the terms of your custom agreement. Early termination fees may apply as specified therein.
>
> **9.5 No Partial Refunds on Monthly Plans.** No partial refunds or credits are issued for unused days remaining in a monthly billing cycle at the time of cancellation, except as provided under the 30-day money-back guarantee in Section 8.
>
> **9.6 Data Retention After Cancellation.** Following cancellation, your call logs, recordings, and account data will be retained for **90 days**, during which you may request an export of your data. After 90 days, your data will be permanently deleted. Vektiss is not responsible for data loss after this period.
>
> **9.7 Reactivation.** If you wish to reactivate your account after cancellation, a new setup fee may apply depending on the length of the cancellation period and the configuration required.
>
> ### 10. Call Recording, Data, & Privacy
> **10.1 Call Recording.** Calls handled by your Vektiss Voice AI agent are recorded by default for quality assurance, AI training, and to generate post-call summaries. Call recordings are stored securely and accessible through your dashboard.
>
> **10.2 Your Consent Obligations.** Many U.S. states require that all parties to a phone call be notified of and consent to recording. You are solely responsible for ensuring that your use of Vektiss Voice complies with all applicable call recording consent laws in your jurisdiction and the jurisdictions of your callers. Vektiss recommends configuring your AI agent to include a call recording disclosure at the start of each call. Vektiss is not liable for your failure to obtain required consents.
>
> **[NEW] Plain-language reminder — recording consent across states.** Texas, where Vektiss Technologies LLC is based, is a **one-party consent** state, meaning only one party to a call (your AI agent) needs to be aware that the call is being recorded. However, **many other states require all parties to consent**, including but not limited to **California, Florida, Illinois, Maryland, Massachusetts, Montana, Nevada, New Hampshire, Pennsylvania, and Washington**. If your business takes calls from customers located in any two-party (all-party) consent state, you are responsible for ensuring your AI agent's greeting includes a clear recording disclosure (for example: *"This call may be recorded for quality and training purposes."*). Vektiss will verbally confirm this requirement with you during onboarding, but the legal responsibility to obtain consent from your callers remains solely with you, the Client.
>
> **10.3 Data Ownership.** You retain ownership of your business data, call recordings, and call summaries. By using the service, you grant Vektiss a limited, non-exclusive license to process and store this data solely for the purpose of providing the service to you.
>
> **10.4 Data Security.** Vektiss employs industry-standard security measures to protect your data, including encryption in transit and at rest, access controls, and regular security reviews. However, no system is 100% secure, and Vektiss cannot guarantee absolute security of your data.
>
> **10.5 Privacy Policy.** The collection, use, storage, and sharing of personal data in connection with Vektiss Voice is governed by our Privacy Policy, available at vektiss.com/privacy. The Privacy Policy is incorporated into these Terms by reference. By accepting these Terms, you also agree to the Privacy Policy.
>
> **10.6 Third-Party Services.** Vektiss Voice uses the following third-party services to deliver the platform. By using Vektiss Voice, you acknowledge that your data may be processed by these providers in accordance with their respective privacy policies:
> - **Stripe** — payment processing
> - **Supabase** — database and authentication
> - **Resend** — transactional email delivery
> - **VAPI / Twilio** — AI voice and telephony infrastructure
>
> ### 11. Acceptable Use
> You agree not to use Vektiss Voice to:
> - Engage in any unlawful, fraudulent, or deceptive activity.
> - Harass, threaten, or abuse callers or third parties.
> - Violate any applicable federal, state, or local law or regulation, including the Telephone Consumer Protection Act (TCPA), the Do Not Call Registry rules, or any applicable call recording consent laws.
> - Impersonate any person or entity in a misleading or fraudulent manner.
> - Transmit any content that is defamatory, obscene, or otherwise objectionable.
> - Attempt to gain unauthorized access to Vektiss systems, data, or other clients' accounts.
> - Use the service for any purpose other than legitimate business call handling.
>
> Vektiss reserves the right to suspend or terminate your account immediately and without notice if you violate this section.
>
> ### 12. Service Availability & Uptime
> **12.1 Uptime Target.** Vektiss targets **99.5% monthly uptime** for the Vektiss Voice platform. This excludes scheduled maintenance windows and outages caused by factors outside Vektiss's reasonable control.
>
> **12.2 Scheduled Maintenance.** Vektiss will provide advance notice of scheduled maintenance that may affect service availability, where reasonably practicable. Maintenance is typically performed during off-peak hours.
>
> **12.3 Force Majeure.** Vektiss is not liable for service interruptions caused by events beyond its reasonable control, including but not limited to: acts of God, natural disasters, war, terrorism, government actions, internet or telecommunications outages, third-party provider failures, or cyberattacks.
>
> **12.4 No Uptime Guarantee.** While Vektiss makes commercially reasonable efforts to maintain high availability, the 99.5% uptime target is not a guarantee and does not create any right to service credits or refunds for downtime.
>
> ### 13. Intellectual Property
> **13.1 Vektiss Property.** All software, algorithms, AI models, interfaces, branding, and content comprising the Vektiss Voice platform are the exclusive intellectual property of Vektiss Technologies LLC. Nothing in these Terms grants you any ownership interest in the platform or its underlying technology.
>
> **13.2 Your Content.** You retain all rights to your business information, call recordings, and data. You grant Vektiss a limited license to use this content solely to provide and improve the service.
>
> **13.3 Feedback.** If you provide Vektiss with feedback, suggestions, or ideas regarding the service, you grant Vektiss a perpetual, irrevocable, royalty-free license to use such feedback for any purpose without compensation to you.
>
> ### 14. Confidentiality
> Each party agrees to keep confidential any non-public information disclosed by the other party in connection with these Terms, and to use such information only for the purposes of performing obligations under these Terms. This obligation does not apply to information that is publicly available, independently developed, or required to be disclosed by law.
>
> ### 15. Disclaimer of Warranties
> THE VEKTISS VOICE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. VEKTISS DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS. YOUR USE OF THE SERVICE IS AT YOUR SOLE RISK.
>
> ### 16. Limitation of Liability
> TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
> - VEKTISS'S TOTAL CUMULATIVE LIABILITY TO YOU FOR ANY AND ALL CLAIMS ARISING FROM OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE TOTAL FEES PAID BY YOU TO VEKTISS IN THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
> - VEKTISS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO LOST PROFITS, LOST REVENUE, LOST DATA, LOSS OF GOODWILL, OR BUSINESS INTERRUPTION, EVEN IF VEKTISS HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
>
> Some jurisdictions do not allow the exclusion or limitation of certain damages, so the above limitations may not apply to you in full.
>
> ### 17. Indemnification
> You agree to indemnify, defend, and hold harmless Vektiss Technologies LLC, its officers, directors, employees, agents, and successors from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from: (a) your use of the service; (b) your violation of these Terms; (c) your violation of any applicable law or regulation; (d) your failure to obtain required call recording consents; or (e) any claim by a third party arising from your use of the service.
>
> ### 18. Dispute Resolution
> **18.1 Informal Resolution.** Before initiating any formal dispute, you agree to contact Vektiss at info@vektiss.com and attempt to resolve the dispute informally for at least 30 days.
>
> **18.2 Governing Law.** These Terms are governed by and construed in accordance with the laws of the **State of Texas**, without regard to its conflict of law provisions.
>
> **18.3 Jurisdiction.** Any legal action or proceeding arising under these Terms shall be brought exclusively in the state or federal courts located in **Harris County, Texas**, and you hereby consent to the personal jurisdiction and venue of such courts.
>
> **18.4 Waiver of Class Action.** You agree that any dispute resolution proceedings will be conducted on an individual basis only. You waive any right to bring or participate in a class action, collective action, or representative proceeding against Vektiss.
>
> ### 19. Modifications to Terms
> Vektiss reserves the right to modify these Terms at any time. When we make material changes, we will:
> - Send an email notification to the address on file at least **14 days** before the changes take effect.
> - Update the "Last Updated" date at the top of this document.
>
> Your continued use of the service after the effective date of the updated Terms constitutes your acceptance of the changes. If you do not agree to the updated Terms, you must cancel your subscription before the effective date.
>
> ### 20. Termination by Vektiss
> Vektiss reserves the right to suspend or terminate your account and access to the service at any time, with or without notice, if:
> - You violate any provision of these Terms.
> - Your payment fails and is not resolved within the cure period.
> - Vektiss determines, in its sole discretion, that continued service poses a legal, reputational, or operational risk.
>
> In the event of termination by Vektiss for cause, no refund of fees paid will be issued. In the event of termination by Vektiss without cause, a prorated refund of prepaid subscription fees for the unused portion of the current billing cycle (monthly plans) or remaining annual term (annual plans) will be issued.
>
> ### 21. Severability
> If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it enforceable.
>
> ### 22. Waiver
> The failure of Vektiss to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision. Any waiver must be in writing and signed by an authorized representative of Vektiss to be effective.
>
> ### 23. Assignment
> You may not assign or transfer your rights or obligations under these Terms without the prior written consent of Vektiss. Vektiss may assign these Terms or any rights hereunder without restriction, including in connection with a merger, acquisition, or sale of assets.
>
> ### 24. Entire Agreement
> These Terms, together with the Privacy Policy at vektiss.com/privacy and any order forms, custom agreements, or plan descriptions agreed to at signup, constitute the entire agreement between you and Vektiss with respect to the Vektiss Voice service and supersede all prior agreements and understandings.
>
> ### 25. Contact Information
> For questions about these Terms, billing, cancellations, or support:
> **Vektiss Technologies LLC** — Houston, Texas
> **Email:** info@vektiss.com   **Phone:** 346-594-7686 *(urgent requests)*
> **Website:** vektiss.com   **Privacy Policy:** vektiss.com/privacy
>
> *By checking the acceptance box during signup, you confirm that you have read, understood, and agree to these Terms of Service and the Vektiss Privacy Policy at vektiss.com/privacy.*

---

## Scroll-to-read UX

```text
┌─ Terms & Conditions ──────────────────────────┐
│  Full ToS rendered here, ~480px tall          │
│  scrollable, with proper headings & tables    │
└───────────────────────────────────────────────┘
  ⓘ  Please scroll to the bottom to continue
  ☐  I have read and agree…       (disabled)
  [ Continue to payment ]         (disabled)
```

When the user scrolls within ~8px of the bottom: hint flips to a green "✓ You've reached the end of the Terms", checkbox becomes enabled, ticking it enables the existing Continue button. The "scrolled" flag latches — scrolling back up doesn't re-lock it. If the container isn't actually scrollable (huge viewport), the flag flips to true on mount so no user gets trapped.

## Technical notes

- New module `src/lib/terms-of-service.tsx` exports the ToS as a React component (proper `<h2>/<h3>/<p>/<ul>/<table>`) so the route file stays manageable.
- Replace the `max-h-40` div with `<div ref={scrollRef} onScroll={…} className="max-h-[480px] overflow-y-auto …">`. Handler: `el.scrollHeight - el.scrollTop - el.clientHeight < 8 → setHasScrolledToBottom(true)`.
- Checkbox `disabled={!hasScrolledToBottom}`; Continue button keeps `disabled={!agreed || loading}`.
- Bump `tos_version` sent to `log-tos-acceptance` from `"2.0"` → `"2026-06-10"` so the audit log reflects the new long-form text.

## Out of scope
No change to invite/Resend flow, plan pricing, Stripe, or post-payment routing.

---

**Two confirmations before I implement:**
1. The **[NEW]** plain-language paragraph in Section 10.2 reads the way you want (Nevada included; example greeting wording).
2. The rest of the ToS above matches your official text — no edits needed.
