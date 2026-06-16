// Vektiss Voice — Lead Capture Form
// Simple 4-question form sent via SMS after demo calls on (346) 594-7686
// Designed to be quick, mobile-friendly, and low-friction

import type { Section } from "./intake-questions";

export const VEKTISS_LEAD_SECTIONS: Section[] = [
  {
    id: "about_you",
    title: "Let's Get You Connected",
    intro: "You just experienced Vektiss Voice. Fill out a few quick details and our team will be in touch.",
    questions: [
      {
        id: "full_name",
        label: "Your name",
        type: "text",
      },
      {
        id: "business_name",
        label: "Business name",
        type: "text",
        prefill: "business_name",
      },
      {
        id: "primary_phone",
        label: "Best phone number",
        type: "text",
        prefill: "contact_phone",
      },
      {
        id: "__contact_email",
        label: "Email address",
        type: "text",
      },
    ],
  },
];
