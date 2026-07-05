// Vektiss Voice intake questionnaire schema — Foreclosure / Probate Law Office
// AI Phone & Text Intake System — Pricing Discovery Questions

import type { Section } from "./intake-questions";

export const FORECLOSURE_INTAKE_SECTIONS: Section[] = [
  {
    id: "current_system",
    title: "Current System",
    intro: "Help us understand your existing tools and pain points so we can build the right solution.",
    questions: [
      {
        id: "current_tools",
        label: "What tools are you currently using for phone calls, texting, intake, and lead follow-up?",
        help: "Examples: Clio, RingCentral, Grasshopper, HubSpot, spreadsheets, manual process, etc.",
        type: "textarea",
      },
      {
        id: "current_monthly_cost",
        label: "Approximately what are you currently paying per month for those tools combined?",
        type: "text",
      },
      {
        id: "biggest_issues",
        label: "What are the biggest issues with the current system?",
        help: "Examples: dropped calls, misrouted calls, too much manual lead qualification, slow follow-up, disconnected tools, etc.",
        type: "textarea",
      },
      {
        id: "call_volume",
        label: "Approximately how many calls do you receive per month (or per day)?",
        help: "e.g., 50 calls/month, 10–15 calls/day",
        type: "text",
      },
      {
        id: "call_duration",
        label: "How long are your calls typically?",
        type: "multiselect",
        options: ["Under 2 minutes", "2–5 minutes", "5–10 minutes", "10+ minutes", "It varies"],
      },
    ],
  },
  {
    id: "texting_volume",
    title: "Texting Volume",
    intro: "This section helps us size the outreach campaigns and messaging infrastructure.",
    questions: [
      {
        id: "monthly_text_leads",
        label: "Approximately how many foreclosure leads do you want to text per month?",
        type: "text",
      },
      {
        id: "campaign_frequency",
        label: "How often do you want to send outreach campaigns?",
        type: "multiselect",
        options: [
          "Weekly",
          "Bi-weekly",
          "Monthly",
          "As needed / ad hoc",
        ],
      },
      {
        id: "lead_upload_method",
        label: "Will the leads be uploaded from a spreadsheet or exported from another system?",
        type: "multiselect",
        options: [
          "Uploaded from a spreadsheet (CSV/Excel)",
          "Exported from a CRM or case management system",
          "Manually entered one by one",
          "Pulled automatically via integration",
        ],
      },
      {
        id: "lead_type",
        label: "Are these leads cold contacts, previous inquiries, existing clients, or people who have already given permission to be contacted?",
        type: "multiselect",
        options: [
          "Cold contacts (no prior relationship)",
          "Previous inquiries (expressed interest before)",
          "Existing clients",
          "People who have given explicit permission to be contacted",
          "Mix of the above",
        ],
      },
    ],
  },
  {
    id: "lead_qualification",
    title: "Lead Qualification",
    intro: "Define what makes a lead worth pursuing so the AI can score and route them correctly.",
    questions: [
      {
        id: "qualification_questions",
        label: "Can you send over the qualification questions your team currently uses to pre-qualify foreclosure leads?",
        help: "Paste your current script or list the key questions here.",
        type: "textarea",
      },
      {
        id: "ai_question_count",
        label: "How many questions should the AI ask before deciding if someone is hot, warm, cold, or not interested?",
        type: "multiselect",
        options: [
          "3–5 questions (quick screen)",
          "6–8 questions (standard screen)",
          "9–12 questions (thorough screen)",
          "As many as needed — no limit",
        ],
      },
      {
        id: "hot_lead_criteria",
        label: "What makes someone a \"hot\" lead that should be sent to your team immediately?",
        help: "Examples: sale date within 30 days, equity in property, motivated to act, has received notice of default, etc.",
        type: "textarea",
      },
    ],
  },
  {
    id: "phone_routing",
    title: "Phone Routing",
    intro: "This section defines how inbound calls are handled and distributed to your team.",
    questions: [
      {
        id: "daily_call_volume",
        label: "How many calls do you receive on an average day?",
        type: "multiselect",
        options: [
          "Under 10 calls/day",
          "10–25 calls/day",
          "25–50 calls/day",
          "50–100 calls/day",
          "100+ calls/day",
        ],
      },
      {
        id: "routing_categories",
        label: "What are the main routing categories?",
        help: "Examples: new client, existing client, attorney/court/opposing counsel, billing.",
        type: "multiselect",
        options: [
          "New client / new lead",
          "Existing client with case update",
          "Attorney, court, or opposing counsel",
          "Billing or payment inquiry",
          "Referral partner",
          "Vendor or service provider",
        ],
      },
      {
        id: "routing_recipients",
        label: "Who should receive each type of call?",
        help: "List the person or team for each category above (e.g., 'New leads → intake coordinator', 'Existing clients → case manager').",
        type: "textarea",
      },
      {
        id: "ai_role",
        label: "Should the AI mainly route calls, or should it also answer basic questions before routing?",
        type: "multiselect",
        options: [
          "Route only — transfer as quickly as possible",
          "Answer basic FAQs (hours, location, services) then route",
          "Fully qualify the lead before routing",
          "Handle everything it can, only transfer when necessary",
        ],
      },
    ],
  },
  {
    id: "lead_handoff_roi",
    title: "Lead Handoff & ROI",
    intro: "Define how hot leads are delivered to your team and help us understand the value of a converted matter.",
    questions: [
      {
        id: "hot_lead_destination",
        label: "When a lead is marked hot, where should it go?",
        type: "multiselect",
        options: [
          "Text notification to attorney or intake coordinator",
          "Email notification",
          "Pushed to Clio (case management)",
          "Added to a spreadsheet or dashboard",
          "Warm transfer to live team member immediately",
          "Another system (describe below)",
        ],
      },
      {
        id: "hot_lead_destination_other",
        label: "If another system, describe where hot leads should go:",
        type: "textarea",
      },
      {
        id: "matter_revenue_range",
        label: "We do not need exact financials, but what is the typical revenue range of a converted foreclosure or probate matter?",
        type: "multiselect",
        options: [
          "Under $1,500",
          "$1,500 – $3,000",
          "$3,000 – $5,000",
          "$5,000 – $10,000",
          "$10,000+",
          "Varies significantly by case",
        ],
      },
      {
        id: "success_definition",
        label: "What would make this system a clear success in the first 90 days?",
        help: "Examples: fewer misrouted calls, faster lead response, more qualified consultations, less manual texting, more booked appointments.",
        type: "textarea",
      },
    ],
  },
  {
    id: "access_approval",
    title: "Access & Approval",
    intro: "Final logistics to get the system launched smoothly.",
    questions: [
      {
        id: "script_approver",
        label: "Who will approve the AI phone and text scripts before launch?",
        help: "Name and role of the person who needs to sign off on the messaging.",
        type: "text",
      },
      {
        id: "clio_access",
        label: "Do you have access to Clio admin settings or integration permissions?",
        type: "multiselect",
        options: [
          "Yes — I am the Clio admin",
          "Yes — I can request admin access",
          "No — we do not use Clio",
          "We use a different case management system",
          "Unsure — need to check",
        ],
      },
      {
        id: "compliance_rules",
        label: "Are there any legal, ethical, or compliance rules your team wants included in the messaging?",
        help: "Examples: TCPA opt-out language, state bar advertising rules, specific disclaimers, prohibited statements.",
        type: "textarea",
      },
    ],
  },
];
