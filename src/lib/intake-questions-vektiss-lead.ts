// Vektiss Voice — Lead Capture Form
// Simple 5-question form sent via SMS after demo calls on (346) 594-7686
// Designed to be quick, mobile-friendly, and low-friction

import type { Section } from "./intake-questions";

export const VEKTISS_LEAD_SECTIONS: Section[] = [
  {
    id: "about_you",
    title: "Let's Get You Connected",
    intro: "You just experienced Vektiss Voice. Fill out a few quick details and our team will follow up with a custom proposal for your business.",
    questions: [
      {
        id: "business_name",
        label: "Business name",
        type: "text",
        prefill: "business_name",
      },
      {
        id: "primary_phone",
        label: "Best phone number to reach you",
        type: "text",
        prefill: "contact_phone",
      },
      {
        id: "__contact_email",
        label: "Email address",
        type: "text",
      },
      {
        id: "business_type",
        label: "What type of business do you run?",
        help: "e.g. Auto repair, medical office, law firm, home services, etc.",
        type: "text",
      },
      {
        id: "pain_point",
        label: "What's your biggest challenge with phone calls or customer communication right now?",
        type: "textarea",
      },
      {
        id: "referral_source",
        label: "How did you hear about Vektiss?",
        type: "text",
      },
      {
        id: "custom_message",
        label: "Anything else you'd like us to know?",
        help: "Optional — share any additional context, ideas, or questions for our team.",
        type: "textarea",
      },
    ],
  },
];
