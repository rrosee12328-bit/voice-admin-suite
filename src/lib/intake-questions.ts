// Vektiss Voice intake questionnaire schema.
// Each question has a stable id used as the key in `answers` JSON.

export type QuestionType = "text" | "textarea" | "checkbox" | "multiselect";

export type Question = {
  id: string;
  label: string;
  help?: string;
  type: QuestionType;
  options?: string[]; // for multiselect
  prefill?: "business_name" | "contact_phone" | "website" | "services"; // bind to column
};

export type Section = {
  id: string;
  title: string;
  intro?: string;
  questions: Question[];
};

export const INTAKE_SECTIONS: Section[] = [
  {
    id: "basics",
    title: "Business Basics",
    intro: "We may have pre-filled some of this from your website. Please confirm or correct.",
    questions: [
      { id: "business_name", label: "Business legal name", type: "text", prefill: "business_name" },
      { id: "dba", label: "DBA / name used on phones", type: "text" },
      { id: "primary_phone", label: "Primary phone number", type: "text", prefill: "contact_phone" },
      { id: "address", label: "Address", type: "text" },
      { id: "website", label: "Website", type: "text", prefill: "website" },
      { id: "hours_weekday", label: "Weekday hours", type: "text" },
      { id: "hours_saturday", label: "Saturday hours", type: "text" },
      { id: "hours_sunday", label: "Sunday hours", type: "text" },
      { id: "after_hours_dropoff", label: "After-hours drop-off available?", type: "text" },
      { id: "owners", label: "Owners' names (for agent to reference)", type: "text" },
      { id: "second_phone", label: "Is there a second phone number (cell, back office, parts line)?", type: "textarea" },
      { id: "direct_email", label: "Direct email for appointment requests or estimates?", type: "text" },
      { id: "online_booking", label: "Do you use an online booking system? Which platform?", type: "textarea" },
      { id: "mention_booking_link", label: "Should the AI mention your online booking link, or only schedule via phone?", type: "textarea" },
    ],
  },
  {
    id: "services",
    title: "Services Offered",
    intro: "Confirm the full list and flag anything the AI should NOT discuss or quote.",
    questions: [
      { id: "services_list", label: "Services offered", help: "List or paste your services", type: "textarea", prefill: "services" },
      { id: "vehicle_types", label: "Vehicle types serviced (Domestic, Asian, European, etc.)", type: "text" },
      { id: "services_not_offered", label: "Services you do NOT offer that callers commonly ask about", type: "textarea" },
      { id: "make_exclusions", label: "Make/model exclusions (e.g., exotics, salvage, RVs, motorcycles)", type: "textarea" },
      { id: "fleet_accounts", label: "Do you offer fleet accounts / fleet billing? How should the AI handle fleet calls?", type: "textarea" },
      { id: "towing", label: "Do you offer towing or roadside assistance?", type: "textarea" },
    ],
  },
  {
    id: "pricing",
    title: "Pricing & Estimates",
    intro: "This section determines what the AI can and cannot quote on the phone.",
    questions: [
      { id: "oil_change_pricing", label: "Oil change pricing (conventional / blend / synthetic)", type: "textarea" },
      { id: "diagnostic_fee", label: "Diagnostic fee — amount and waiver policy", type: "textarea" },
      {
        id: "phone_estimate_policy",
        label: "General policy on phone estimates",
        type: "multiselect",
        options: [
          "Give general price ranges for common services",
          "Always say 'we need to inspect the vehicle first'",
          "Offer to have a tech call them back with an estimate",
        ],
      },
      { id: "promotions", label: "Current specials or promotions?", type: "textarea" },
      { id: "financing", label: "Financing offered? Which provider? Should AI mention it?", type: "textarea" },
      { id: "payment_methods", label: "Accepted payment methods", type: "text" },
    ],
  },
  {
    id: "booking",
    title: "Appointment Booking Workflow",
    questions: [
      {
        id: "booking_method",
        label: "How should the AI handle appointment requests?",
        type: "multiselect",
        options: [
          "Collect caller info and transfer to a live person to confirm",
          "Collect caller info and text/message the team to call back",
          "Direct caller to your online booking link",
          "Collect name, phone, vehicle, preferred time — then confirm via text/email",
        ],
      },
      {
        id: "appt_fields",
        label: "Information AI should collect for every appointment request",
        type: "multiselect",
        options: [
          "Caller's full name",
          "Callback phone number",
          "Year, Make, Model of vehicle",
          "Mileage",
          "Description of the issue / service needed",
          "Preferred drop-off date and time",
        ],
      },
      { id: "appt_other_fields", label: "Any other fields to collect?", type: "textarea" },
      { id: "dropoff_vs_wait", label: "Drop-off vs. wait — should AI ask which they prefer?", type: "textarea" },
      { id: "shuttle", label: "Shuttle service — should AI proactively mention this?", type: "textarea" },
      { id: "after_hours_dropoff_instructions", label: "After-hours drop-off instructions", type: "textarea" },
    ],
  },
  {
    id: "routing",
    title: "Call Routing Rules",
    intro: "This defines what the AI handles vs. what gets transferred to a live person.",
    questions: [
      {
        id: "ai_handles",
        label: "Calls the AI should HANDLE FULLY (no transfer)",
        type: "multiselect",
        options: [
          "General hours and location questions",
          "Services offered (yes/no)",
          "Directions to the shop",
          "Online booking link",
          "Financing availability",
          "Shuttle service availability",
          "After-hours drop-off instructions",
          "Leaving a message for a callback",
          "General 'how much does X cost' (scripted response)",
        ],
      },
      { id: "ai_handles_other", label: "Other calls AI should handle", type: "textarea" },
      {
        id: "ai_transfers",
        label: "Calls the AI should TRANSFER to a live person",
        type: "multiselect",
        options: [
          "Caller wants to speak to a specific person",
          "Caller is calling about a vehicle currently in the shop",
          "Caller has a complaint or warranty claim",
          "Caller is a parts vendor or supplier",
          "Fleet account inquiries",
          "Insurance/claim-related calls",
          "Caller explicitly asks to speak to a human",
        ],
      },
      { id: "ai_transfers_other", label: "Other calls AI should transfer", type: "textarea" },
      { id: "transfer_number", label: "Transfer to one main number, or different extensions for different call types?", type: "textarea" },
      {
        id: "no_answer_action",
        label: "If no one answers the transfer, AI should:",
        type: "multiselect",
        options: [
          "Take a message and promise a callback",
          "Send caller to voicemail",
          "Ask the caller to call back during business hours",
        ],
      },
      {
        id: "after_hours_action",
        label: "After-hours calls — when shop is closed, AI should:",
        type: "multiselect",
        options: [
          "Take a message with name, number, and reason",
          "Mention after-hours drop-off option",
          "Provide emergency instructions (roadside referral)",
        ],
      },
    ],
  },
  {
    id: "caller_info",
    title: "Caller Information to Collect",
    questions: [
      {
        id: "always_collect",
        label: "For every inbound call, always collect:",
        type: "multiselect",
        options: [
          "Caller's name",
          "Callback number",
          "Vehicle year, make, model",
          "Reason for calling",
        ],
      },
      {
        id: "appt_collect",
        label: "For appointment requests, also collect:",
        type: "multiselect",
        options: [
          "Preferred date/time",
          "Is this a new or returning customer?",
          "How did you hear about us? (referral tracking)",
        ],
      },
      { id: "new_vs_returning", label: "Ask if caller is new or returning?", type: "textarea" },
    ],
  },
  {
    id: "personality",
    title: "Agent Personality & Script",
    questions: [
      { id: "agent_name", label: "Agent name (custom name, or just the business name?)", type: "text" },
      { id: "greeting_script", label: "Preferred greeting / opening line", type: "textarea" },
      {
        id: "tone",
        label: "Tone",
        type: "multiselect",
        options: [
          "Friendly and conversational",
          "Professional and efficient",
          "Warm and family-oriented",
        ],
      },
      { id: "bilingual", label: "Spanish-speaking callers — should agent be bilingual?", type: "textarea" },
      { id: "never_say", label: "Anything the agent should NEVER say?", type: "textarea" },
    ],
  },
  {
    id: "sms",
    title: "SMS Follow-Up (Optional)",
    intro: "If Vektiss Voice SMS is enabled, the AI can send automated texts after calls.",
    questions: [
      { id: "sms_appt_confirmation", label: "Send appointment confirmation text after booking?", type: "textarea" },
      { id: "sms_thankyou", label: "Send 'thank you for calling' text with booking link?", type: "textarea" },
      { id: "sms_from_number", label: "What phone number should SMS come from?", type: "text" },
      { id: "sms_optin", label: "Should callers be informed during the call they may get a follow-up text?", type: "textarea" },
    ],
  },
  {
    id: "integrations",
    title: "Integrations & Tech Stack",
    questions: [
      { id: "shop_software", label: "Shop management software (Tekmetric, Mitchell1, Shop-Ware, etc.)", type: "text" },
      { id: "crm", label: "CRM / customer communication platform (Kukui, Podium, Birdeye, etc.)", type: "text" },
      { id: "google_business", label: "Use Google Business Profile for booking?", type: "text" },
      { id: "recordings_delivery", label: "Want call recordings/transcripts in email or dashboard?", type: "textarea" },
    ],
  },
];
