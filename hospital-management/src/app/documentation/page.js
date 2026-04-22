"use client";

import { useTranslation } from "next-i18next";
import { Playfair_Display, Space_Grotesk } from "next/font/google";

const displayFont = Playfair_Display({ subsets: ["latin"], weight: ["600"] });
const bodyFont = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500"] });

const languageOptions = [
  { code: "as", label: "Assamese" },
  { code: "bn", label: "Bengali" },
  { code: "brx", label: "Bodo" },
  { code: "doi", label: "Dogri" },
  { code: "en", label: "English" },
  { code: "gu", label: "Gujarati" },
  { code: "hi", label: "Hindi" },
  { code: "kn", label: "Kannada" },
  { code: "ks", label: "Kashmiri" },
  { code: "kok", label: "Konkani" },
  { code: "mai", label: "Maithili" },
  { code: "ml", label: "Malayalam" },
  { code: "mni", label: "Manipuri (Meitei)" },
  { code: "mr", label: "Marathi" },
  { code: "ne", label: "Nepali" },
  { code: "or", label: "Odia" },
  { code: "pa", label: "Punjabi" },
  { code: "sa", label: "Sanskrit" },
  { code: "sat", label: "Santali" },
  { code: "sd", label: "Sindhi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "ur", label: "Urdu" },
];

const labelByLanguage = {
  as: { badge: "প্ৰলেখ", languageLabel: "ভাষা" },
  bn: { badge: "ডকুমেন্টেশন", languageLabel: "ভাষা" },
  brx: { badge: "दखुमेन्टेसन", languageLabel: "भाषा" },
  doi: { badge: "दस्तावेज़ीकरण", languageLabel: "भाषा" },
  en: { badge: "Documentation", languageLabel: "Language" },
  gu: { badge: "દસ્તાવેજીકરણ", languageLabel: "ભાષા" },
  hi: { badge: "प्रलेखन", languageLabel: "भाषा" },
  kn: { badge: "ದಾಖಲೆಗಳು", languageLabel: "ಭಾಷೆ" },
  ks: { badge: "دستاویزات", languageLabel: "زبان" },
  kok: { badge: "दस्तावेज", languageLabel: "भाषा" },
  mai: { badge: "प्रलेखन", languageLabel: "भाषा" },
  ml: { badge: "ഡോക്യുമെന്റേഷൻ", languageLabel: "ഭാഷ" },
  mni: { badge: "ꯗꯣꯀ꯭ꯌꯨꯃꯦꯟꯇꯦꯁꯟ", languageLabel: "ꯂꯥꯡꯁꯤꯡ" },
  mr: { badge: "दस्तऐवजीकरण", languageLabel: "भाषा" },
  ne: { badge: "दस्तावेजीकरण", languageLabel: "भाषा" },
  or: { badge: "ଡକ୍ୟୁମେଣ୍ଟେସନ୍", languageLabel: "ଭାଷା" },
  pa: { badge: "ਦਸਤਾਵੇਜ਼ੀਕਰਨ", languageLabel: "ਭਾਸ਼ਾ" },
  sa: { badge: "प्रलेखनम्", languageLabel: "भाषा" },
  sat: { badge: "ᱫᱚᱠᱩᱢᱮᱱᱴᱮᱥᱚᱱ", languageLabel: "ᱵᱷᱟᱥᱟ" },
  sd: { badge: "دستاويز", languageLabel: "ٻولي" },
  ta: { badge: "ஆவணங்கள்", languageLabel: "மொழி" },
  te: { badge: "డాక్యుమెంటేషన్", languageLabel: "భాష" },
  ur: { badge: "دستاویزات", languageLabel: "زبان" },
};

const englishSections = [
  {
    title: "Project Overview",
    points: [
      "Hospital Scheduling & Ticketing is a web app for OPD/IPD workflows, scheduling, and billing.",
      "Roles include super admin, company admin, administration staff, and doctors.",
      "The system separates configuration (masters) from daily operations (appointments, admissions, billing).",
    ],
  },
  {
    title: "Local Setup",
    points: [
      "Clone the repo and install dependencies for both backend and frontend.",
      "Create environment variables for API base URLs and database connections.",
      "Start the backend server, apply migrations, and confirm API health.",
      "Start the frontend dev server and verify the login screen loads.",
    ],
  },
  {
    title: "Admin Configuration Flow",
    points: [
      "Log in as a super admin or company admin.",
      "Create departments, doctor types, administration types, and fee/rate charts.",
      "Add doctors, assign department/type, and capture available schedules.",
      "Register administration users and assign their role access.",
    ],
  },
  {
    title: "Doctor Scheduling",
    points: [
      "Navigate to doctor schedules and define date, shift, and slot capacity.",
      "Publish schedules so booking screens can show real-time availability.",
      "Adjust schedules for leave or emergency coverage to avoid overbooking.",
    ],
  },
  {
    title: "OPD Booking & Ticketing",
    points: [
      "Search or create a patient profile in the OPD booking flow.",
      "Select department/doctor and pick an available slot.",
      "Generate the OPD ticket and capture payment details if required.",
      "Print or share the ticket for the patient visit.",
    ],
  },
  {
    title: "IPD Admission",
    points: [
      "Register an IPD admission with patient details and admitting doctor.",
      "Assign ward, room, and bed based on real-time availability.",
      "Track daily administration notes, vitals, and nursing attendance.",
    ],
  },
  {
    title: "Billing & Payments",
    points: [
      "Create billing entries for consultation, bed charges, and services.",
      "Collect deposits, update payment status, and generate receipts.",
      "Finalize discharge bills and close the IPD case once paid.",
    ],
  },
  {
    title: "Audit & Reporting",
    points: [
      "Review OPD/IPD patient lists for daily reconciliation.",
      "Track doctor schedules and attendance for operational reporting.",
      "Export lists or summaries as needed for accounting or compliance.",
    ],
  },
  {
    title: "Security & Session Handling",
    points: [
      "Users authenticate through the login page with role-based routing.",
      "Session data is stored locally and cleared on logout.",
      "Access to dashboards is determined by role (admin, doctor, administration).",
    ],
  },
];

export default function DocumentationPage() {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language || "en";
  const labels = labelByLanguage[currentLanguage] || labelByLanguage.en;

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-[#f7f1e8] via-[#fdfcfb] to-[#e5f4f1] text-slate-900 ${bodyFont.className}`}
    >
      <div className="relative overflow-hidden">
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-[#f4c8a5]/40 blur-3xl" />
        <div className="absolute top-24 -left-20 h-72 w-72 rounded-full bg-[#9bd9d9]/40 blur-3xl" />
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#c67f42]">
                {labels.badge}
              </p>
              <h1
                className={`mt-3 text-3xl font-semibold sm:text-4xl ${displayFont.className}`}
              >
                Hospital Scheduling & Ticketing Process
              </h1>
              <p className="mt-3 max-w-2xl text-base text-slate-600">
                A step-by-step overview of setup, roles, and core workflows.
                Each section is intentionally written in bullet points for easy
                skimming and onboarding.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-full bg-white/80 px-4 py-2 shadow-sm ring-1 ring-black/5 sm:self-start">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {labels.languageLabel}
              </span>
              <select
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm focus:border-[#c67f42] focus:outline-none focus:ring-2 focus:ring-[#f4c8a5]"
                aria-label="Select language"
                value={currentLanguage}
                onChange={(event) => i18n.changeLanguage(event.target.value)}
              >
                {languageOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-6 lg:grid-cols-2">
          {englishSections.map((section) => (
            <section
              key={section.title}
              className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl shadow-[#d8b6a6]/20 backdrop-blur-sm"
            >
              <h2
                className={`text-xl font-semibold text-[#6f3b1b] ${displayFont.className}`}
              >
                {section.title}
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-slate-700">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
