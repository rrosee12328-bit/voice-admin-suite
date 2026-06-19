// Custom proposal templates that super admins can send to clients.
// Each template renders to a public proposal page and a downloadable PDF.
// Add new templates here — they show up automatically in the admin UI.

export type ProposalSection =
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "callout"; label: string; text: string };

export type ProposalTemplate = {
  slug: string;
  name: string;
  category: string;
  summary: string;
  /** Default placeholder for the recipient line ("Prepared for …"). */
  defaultClientName: string;
  /** Build the proposal body. `clientName` is interpolated wherever it makes sense. */
  build: (clientName: string) => ProposalSection[];
};

const foreclosureTexting: ProposalTemplate = {
  slug: "foreclosure-ai-texting-phase-1",
  name: "Phase 1 — Foreclosure AI Texting Engine",
  category: "Law firm",
  summary:
    "Outbound foreclosure outreach, AI text qualification, and booking handoff. 3-day build, $3,500 one-time + $1,500/mo.",
  defaultClientName: "HC Law Firm",
  build: (clientName) => [
    { type: "heading", text: "Phase 1 Proposal: Foreclosure AI Texting Engine" },
    { type: "callout", label: "Prepared for", text: clientName },

    { type: "subheading", text: "Overview" },
    {
      type: "paragraph",
      text: `Based on the immediate priority for June, we recommend starting with a focused Phase 1 system designed to help ${clientName} reach foreclosure leads, qualify them through AI-powered text conversations, and route qualified prospects to the right next step.`,
    },
    {
      type: "paragraph",
      text: "This phase is focused specifically on the foreclosure texting and lead qualification workflow. RingCentral can remain in place for phone calls during this first phase.",
    },

    { type: "subheading", text: "Goal" },
    {
      type: "paragraph",
      text: "The goal of this system is to reduce manual texting and pre-qualification work by allowing the AI to:",
    },
    {
      type: "bullets",
      items: [
        "Reach out to foreclosure leads by text",
        "Respond to interested leads automatically",
        "Ask approved qualification questions",
        "Identify hot, warm, cold, or rejected leads",
        "Send qualified leads to a booking link",
        "Filter out leads that do not meet the firm's criteria",
        "Track campaign activity and lead outcomes",
      ],
    },

    { type: "subheading", text: "Phase 1 Includes" },
    {
      type: "bullets",
      items: [
        "Monthly outreach to foreclosure lead lists uploaded by CSV/Excel",
        "AI-powered text conversations with interested leads",
        "4-question qualification flow based on approved screening criteria",
        "Hot, warm, cold, and rejected lead categorization",
        "Automatic booking link sent to qualified hot leads",
        "Automatic rejection message for leads that do not meet criteria",
        "Lead tracking dashboard",
        "Campaign monitoring and workflow maintenance",
        "Script updates based on approved changes",
        "Basic reporting on outreach, replies, qualified leads, and booked calls",
      ],
    },

    { type: "subheading", text: "Estimated Timeline" },
    {
      type: "paragraph",
      text: "The system build can be completed in approximately 3 business days once we have the approved messaging, qualification questions, booking link, and campaign requirements.",
    },
    {
      type: "paragraph",
      text: "Because this system involves outbound texting, the full launch may depend on phone number / A2P texting approval. If approval is required, the realistic launch window is approximately 3–7 business days, depending on carrier approval timing.",
    },

    { type: "subheading", text: "Timeline Breakdown" },
    { type: "paragraph", text: "Day 1 — Setup & Workflow Build" },
    {
      type: "bullets",
      items: [
        "Configure texting workflow",
        "Set up lead upload process",
        "Build the AI qualification flow",
        "Add approved screening questions and responses",
        "Configure hot, warm, cold, and rejected lead logic",
      ],
    },
    { type: "paragraph", text: "Day 2 — Routing, Booking & Tracking" },
    {
      type: "bullets",
      items: [
        "Connect booking link for qualified leads",
        "Set up automatic rejection response",
        "Configure lead tracking dashboard",
        "Set up internal notifications for hot leads",
        "Test lead status updates and campaign tracking",
      ],
    },
    { type: "paragraph", text: "Day 3 — Testing & Final Review" },
    {
      type: "bullets",
      items: [
        "Run test conversations",
        "Review AI responses",
        "Adjust wording and lead scoring logic",
        "Confirm booking handoff",
        "Prepare system for launch",
      ],
    },

    { type: "subheading", text: "Launch Window" },
    {
      type: "bullets",
      items: [
        "If texting approval is already active: launch can happen shortly after testing.",
        "If A2P / texting approval is required: launch may take closer to one week depending on approval timing.",
      ],
    },

    { type: "subheading", text: "Pricing" },
    { type: "callout", label: "Implementation", text: "$3,500 one-time" },
    { type: "callout", label: "Monthly Management", text: "$1,500 / month" },
    { type: "callout", label: "Initial Term", text: "90 days" },
    {
      type: "paragraph",
      text: "The monthly plan includes up to 5,000 text messages per month. This includes both messages sent by the system and replies received from leads.",
    },
    {
      type: "paragraph",
      text: "Additional text usage above 5,000 messages per month is billed at $0.05 per message.",
    },

    { type: "subheading", text: "Monthly Management Covers" },
    {
      type: "paragraph",
      text: "The monthly management fee covers the ongoing operation and improvement of the system, including:",
    },
    {
      type: "bullets",
      items: [
        "Monitoring campaign activity",
        "Reviewing AI qualification performance",
        "Updating scripts based on approved changes",
        "Maintaining the automation workflow",
        "Making sure qualified leads are routed correctly",
        "Tracking outreach, replies, qualified leads, and booked calls",
        "Basic support and troubleshooting",
        "Monthly performance review",
      ],
    },

    { type: "subheading", text: "90-Day Success Focus" },
    {
      type: "paragraph",
      text: "During the first 90 days, the main success metrics will be:",
    },
    {
      type: "bullets",
      items: [
        "Less manual texting",
        "Faster response to interested foreclosure leads",
        "Better filtering of unqualified leads",
        "More qualified prospects routed to the booking link",
        "Clear reporting on outreach, replies, and qualified leads",
      ],
    },
  ],
};

export const PROPOSAL_TEMPLATES: ProposalTemplate[] = [foreclosureTexting];

export function getProposalTemplate(slug: string): ProposalTemplate | undefined {
  return PROPOSAL_TEMPLATES.find((t) => t.slug === slug);
}
