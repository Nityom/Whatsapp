/**
 * Cortex Hospital – AI WhatsApp Assistant Brain & Conversational Engine
 * Implements all 16 Sections of the Cortex Hospital System Prompt.
 * Connects directly to Cortex-Admin (Convex dev:jovial-sheep-76) for live PMS data.
 */

import crypto from "crypto";
import {
  CORTEX_HOSPITAL_CONFIG,
  DoctorInfo,
} from "./cortexConfig";
import {
  fetchDoctors,
  findPatient,
  createPatient,
  updatePatient,
  findPatientsByPhone,
  getAvailableSlots,
  bookAppointment,
  getPatientAppointments,
  cancelAppointment,
  rescheduleAppointment,
  getPatientPrescriptions,
  getPatientBills,
  getPatientFollowups,
  getPatientInvestigations,
  normalizePhone,
  matchDoctorByName,
  PatientRecord,
  DetailedSlot,
  calculateNextDailyToken,
  upsertOpdQueueItem,
  fetchLiveOpdQueue,
  getCortexConvexClient,
  isPhoneMatch,
} from "./cortexClient";
import { api } from "@/convex/_generated/api";
import { WhatsAppLocationPayload, WhatsAppInteractive } from "./whatsapp";

export interface AgentContext {
  phoneNumber: string;
  currentStep: string;
  language?: string; // "en" | "hi" | "mr"
  patientId?: string;
  patientReference?: string;
  patientName?: string;
  isVerified?: boolean;
  pendingAction?: string;
  isHandedOver?: boolean;
  handoverReason?: string;
  handoverTimestamp?: number;
  lastBookedDoctor?: string;
  lastBookedDate?: string;
  lastBookedPatientName?: string;
  resetSession?: boolean;
  consentGranted?: boolean;
  rescheduleDraft?: {
    appointmentId?: string;
    doctorName?: string;
    specialty?: string;
    date?: string;
    time?: string;
    patientName?: string;
    slot?: string;
    slotTime?: string;
  };
  bookingDraft?: {
    doctorName?: string;
    specialty?: string;
    date?: string; // YYYY-MM-DD
    session?: "morning" | "evening";
    currentSession?: "morning" | "evening";
    slot?: string; // e.g. "10:30 AM – 10:45 AM"
    slotTime?: string; // "10:30"
    patientName?: string;
    patientAge?: string;
    patientPhone?: string;
    patientAddress?: string;
    sex?: "Male" | "Female" | "Other";
    complaint?: string;
    isSecondBooking?: boolean;
    previousPatientName?: string;
    explicitPatientName?: boolean;
  };
}

export interface AgentResponse {
  text: string;
  nativeLocation?: WhatsAppLocationPayload;
  interactive?: WhatsAppInteractive;
  nextStep?: string;
  updatedContext?: Partial<AgentContext>;
}

/* =========================================================================
   LANGUAGE & DATE HELPERS
   ========================================================================= */

export function inLanguage(
  language: string | undefined,
  english: string,
  hindi: string,
  marathi: string
): string {
  if (language === "hi") return hindi;
  if (language === "mr") return marathi;
  return english;
}

/** Format dates for display strictly as DD/MM/YY */
export function formatDisplayDate(dateStr: string): string {
  try {
    const iso = String(dateStr).match(/^(20\d{2})-(\d{1,2})-(\d{1,2})/);
    if (iso) return `${iso[3].padStart(2, "0")}/${iso[2].padStart(2, "0")}/${iso[1].slice(-2)}`;
    const dmy = String(dateStr).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|20\d{2})/);
    if (dmy) return `${dmy[1].padStart(2, "0")}/${dmy[2].padStart(2, "0")}/${dmy[3].slice(-2)}`;
    return dateStr;
  } catch {
    return dateStr;
  }
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface AvailableDateOption {
  date: Date;
  dateStr: string;
  displayDmy: string;
  isToday: boolean;
  isTomorrow: boolean;
  labelEn: string;
  labelHi: string;
  labelMr: string;
}

/** Returns the next 3 available OPD dates, skipping Sundays when hospital is closed */
export function getNextAvailableDates(): AvailableDateOption[] {
  const dates: AvailableDateOption[] = [];
  const curr = new Date();

  // If today is Sunday, skip today because OPD is closed
  let offset = curr.getDay() === 0 ? 1 : 0;

  while (dates.length < 3 && offset < 10) {
    const candidate = new Date(curr);
    candidate.setDate(curr.getDate() + offset);
    if (candidate.getDay() !== 0) { // Skip Sundays
      const dateStr = formatDate(candidate);
      const displayDmy = formatDisplayDate(dateStr);
      const isToday = offset === 0;
      const isTomorrow = offset === 1 || (curr.getDay() === 0 && offset === 1);

      let labelEn = isToday ? `Today (${displayDmy})` : isTomorrow ? `Tomorrow (${displayDmy})` : displayDmy;
      let labelHi = isToday ? `आज (${displayDmy})` : isTomorrow ? `कल (${displayDmy})` : displayDmy;
      let labelMr = isToday ? `आज (${displayDmy})` : isTomorrow ? `उद्या (${displayDmy})` : displayDmy;

      // Keep <= 20 chars for Meta WhatsApp button title limit
      if (labelEn.length > 20) labelEn = isToday ? "Today" : isTomorrow ? "Tomorrow" : displayDmy;
      if (labelHi.length > 20) labelHi = isToday ? "आज" : isTomorrow ? "कल" : displayDmy;
      if (labelMr.length > 20) labelMr = isToday ? "आज" : isTomorrow ? "उद्या" : displayDmy;

      dates.push({ date: candidate, dateStr, displayDmy, isToday, isTomorrow, labelEn, labelHi, labelMr });
    }
    offset++;
  }
  return dates;
}

/** Check for medical emergencies */
export function isEmergencyQuery(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /chest pain|heart attack|breathless|shortness of breath|heavy bleed|unconscious|fainted|head injury|convulsion|stroke|accident|trauma|emergency|सीने में दर्द|छातीत दुखणे|श्वास|रक्तस्त्राव|बेहोश|हार्ट अटैक/.test(
      t
    ) ||
    /chhati me dard|saas nahi aa rahi|bahut khoon|behosh|emergency/.test(t)
  );
}

/** Check if user is asking for medical diagnosis / prescription */
export function isMedicalAdviceQuery(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /what medicine should i take|which tablet|can i take paracetamol|prescribe me|what is the dose|diagnose me|what disease do i have|dawai batao|kaunsi goli lu|dawa chahiye|औषध सांगा|कोणती गोळी घ्यावी/.test(
      t
    )
  );
}

/** Check if user input is a greeting or restart request */
export function isGreetingText(text: string): boolean {
  const clean = text.toLowerCase().trim().replace(/[!.,?]+$/, "");
  return (
    /^h+i+$/i.test(clean) ||
    /^h+e+y+$/i.test(clean) ||
    /^h+e+l+o+$/i.test(clean) ||
    /^h+e+l+l+o+$/i.test(clean) ||
    clean === "namaste" ||
    clean === "namaskar" ||
    clean === "start" ||
    clean === "restart" ||
    clean === "help"
  );
}

/** Check if the input represents a language choice */
export function detectLanguageChoice(
  text: string,
  isLanguageStep: boolean = false
): "en" | "hi" | "mr" | undefined {
  const clean = (text || "").trim().toLowerCase();

  // Explicit button payload or full title
  if (
    clean === "lang_en" ||
    clean === "language_en" ||
    clean === "english" ||
    clean === "1. english" ||
    clean.startsWith("1. english")
  ) {
    return "en";
  }

  if (
    clean === "lang_hi" ||
    clean === "language_hi" ||
    clean === "hindi" ||
    clean === "हिन्दी" ||
    clean === "हिंदी" ||
    clean === "2. हिन्दी" ||
    clean === "2. हिंदी" ||
    clean === "2. hindi" ||
    clean.startsWith("2. हिन्दी") ||
    clean.startsWith("2. हिंदी") ||
    clean.startsWith("2. hindi")
  ) {
    return "hi";
  }

  if (
    clean === "lang_mr" ||
    clean === "language_mr" ||
    clean === "marathi" ||
    clean === "मराठी" ||
    clean === "3. मराठी" ||
    clean === "3. marathi" ||
    clean.startsWith("3. मराठी") ||
    clean.startsWith("3. marathi")
  ) {
    return "mr";
  }

  // Pure numbers '1', '2', '3' are ONLY language choices if currently in LANGUAGE_SELECT / WELCOME step
  if (isLanguageStep) {
    if (clean === "1" || clean === "1.") return "en";
    if (clean === "2" || clean === "2.") return "hi";
    if (clean === "3" || clean === "3.") return "mr";
  }

  return undefined;
}

/** Check if user wants to change language */
export function isLanguageChangeQuery(text: string): boolean {
  const clean = (text || "").toLowerCase().trim();
  const normalized = clean.startsWith("menu_") ? clean.replace("menu_", "") : clean;

  if (normalized === "9" || normalized === "9.") return true;
  if (/^9\.\s*(change language|भाषा|language)/i.test(clean)) return true;
  if (clean.includes("change language") || clean.includes("language") || clean === "lang") return true;
  if (
    clean.includes("भाषा") ||
    clean.includes("bhasha") ||
    clean.includes("basha") ||
    /b[h]?as[h]?a\s*bad[a-z]+/i.test(clean)
  ) return true;

  return false;
}

/** Check if user query is an interruption of an active sub-step */
export function isInterruptionQuery(text: string, currentStep?: string): boolean {
  const l = text.toLowerCase().trim();

  // Button IDs, numerical choices, slot IDs, or dates are NEVER interruptions!
  if (
    l.startsWith("doctor_") ||
    l.startsWith("date_") ||
    l.startsWith("slot_") ||
    l.startsWith("session_") ||
    l.startsWith("profile_") ||
    l.startsWith("btn_") ||
    l.startsWith("lang_") ||
    /^[1-9]$|^10$/.test(l)
  ) {
    return false;
  }

  // Doctor selection step: selecting or naming a doctor is the answer!
  if (currentStep === "BOOKING_SELECT_DOCTOR") {
    if (matchDoctorByName(text) || /^(1|2|doctor_1|doctor_2)$/i.test(l)) {
      return false;
    }
  }

  // Date selection step: date choices/inputs are not interruptions
  if (currentStep === "BOOKING_SELECT_DATE") {
    if (parseDateInput(text) || /^(today|tomorrow|कल|आज|उद्या|परसों|परवा|date_1|date_2|date_3|1|2|3)$/i.test(l)) {
      return false;
    }
  }

  // Address/name registration steps: entering text is the answer
  if (currentStep === "REGISTER_ADDRESS" || currentStep === "REGISTER_NAME") {
    if (
      isEmergencyQuery(text) ||
      isLanguageChangeQuery(text) ||
      isGreetingText(text) ||
      l === "cancel" ||
      l === "reset" ||
      l === "menu" ||
      l === "stop" ||
      l === "exit"
    ) {
      return true;
    }
    return false;
  }

  return (
    isGreetingText(text) ||
    isLanguageChangeQuery(text) ||
    isEmergencyQuery(text) ||
    isMedicalAdviceQuery(text) ||
    l === "cancel" ||
    l === "reset" ||
    l === "menu" ||
    l === "main menu" ||
    l === "stop" ||
    l === "exit" ||
    l.includes("reception") ||
    l.includes("prescription") ||
    l.includes("parcha") ||
    l.includes("bill") ||
    l.includes("invoice") ||
    l.includes("followup") ||
    l.includes("follow up") ||
    l.includes("lab report") ||
    l.includes("blood test")
  );
}

/** Parse various date formats into YYYY-MM-DD */
export function parseDateInput(input: string): string | null {
  const clean = input.trim().toLowerCase();
  const nextDates = getNextAvailableDates();

  if (clean === "1" || clean === "date_1") {
    return nextDates[0]?.dateStr || formatDate(new Date());
  }
  if (clean === "2" || clean === "date_2") {
    return nextDates[1]?.dateStr || null;
  }
  if (clean === "3" || clean === "date_3") {
    return nextDates[2]?.dateStr || null;
  }
  if (/\b(today|आज)\b/i.test(clean)) {
    return formatDate(new Date());
  }
  if (/\b(tomorrow|कल|उद्या)\b/i.test(clean)) {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    return formatDate(tmrw);
  }
  if (/\b(day after tomorrow|day after|परसों|परवा)\b/i.test(clean)) {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    return formatDate(dayAfter);
  }

  // Check ISO format YYYY-MM-DD
  const isoMatch = clean.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Check DD-MM-YYYY, DD/MM/YYYY, DD-MM-YY or DD/MM/YY
  const dmyMatch = clean.match(/\b(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](\d{2}|20\d{2})\b/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, "0");
    const m = dmyMatch[2].padStart(2, "0");
    const y = dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  return null;
}

/* =========================================================================
   UI MENUS & INTERACTIVE BUTTONS
   ========================================================================= */

export function languagePrompt(): string {
  return `👋 *Welcome to Svaasth Connect*\n\nPlease select your preferred language / भाषा चुनें:`;
}

export function languageButtons(): WhatsAppInteractive {
  return {
    kind: "buttons",
    body: "Please select your language / कृपया भाषा चुनें / कृपया भाषा निवडा:",
    buttons: [
      { id: "lang_en", title: "1. English" },
      { id: "lang_hi", title: "2. हिन्दी" },
      { id: "lang_mr", title: "3. मराठी" },
    ],
  };
}

export function mainMenu(language: string): string {
  if (language === "hi") {
    return `🏥 *Svaasth Connect*\nनमस्ते! 👋 मैं आपका डिजिटल अस्पताल सहायक हूँ।\n\nकृपया नीचे दिए गए मेनू से विकल्प चुनें:`;
  }

  if (language === "mr") {
    return `🏥 *Svaasth Connect*\nनमस्कार! 👋 मी आपला डिजिटल हॉस्पिटल सहाय्यक आहे.\n\nकृपया खालील मेनूमधून पर्याय निवडा:`;
  }

  return `🏥 *Svaasth Connect*\nHello! 👋 I am your virtual hospital assistant.\n\nPlease choose an option from the menu below:`;
}

export function menuList(language: string): WhatsAppInteractive {
  const isHi = language === "hi";
  const isMr = language === "mr";

  const labels = isHi
    ? [
        { id: "menu_1", title: "1. अपॉइंटमेंट बुक करें" },
        { id: "menu_2", title: "2. मेरी अपॉइंटमेंट" },
        { id: "menu_checkin", title: "3. QR चेक-इन व टोकन" },
        { id: "menu_queue", title: "4. लाइव OPD कतार" },
        { id: "menu_3", title: "5. प्रिस्क्रिप्शन देखें" },
        { id: "menu_4", title: "6. बिल और भुगतान" },
        { id: "menu_5", title: "7. अगली फ़ॉलो-अप" },
        { id: "menu_6", title: "8. डॉक्टर का समय" },
        { id: "menu_8", title: "9. रिसेप्शन से बात करें" },
        { id: "menu_10", title: "10. परिजन प्रोफाइल" },
      ]
    : isMr
    ? [
        { id: "menu_1", title: "1. अपॉइंटमेंट बुक करा" },
        { id: "menu_2", title: "2. माझी अपॉइंटमेंट" },
        { id: "menu_checkin", title: "3. QR चेक-इन व टोकन" },
        { id: "menu_queue", title: "4. थेट OPD रांग" },
        { id: "menu_3", title: "5. प्रिस्क्रिप्शन पहा" },
        { id: "menu_4", title: "6. बिल आणि पेमेंट" },
        { id: "menu_5", title: "7. पुढील फॉलो-अप" },
        { id: "menu_6", title: "8. डॉक्टरांची वेळ" },
        { id: "menu_8", title: "9. रिसेप्शनशी बोला" },
        { id: "menu_10", title: "10. कुटुंब प्रोफाइल" },
      ]
    : [
        { id: "menu_1", title: "1. Book Appointment" },
        { id: "menu_2", title: "2. My Appointments" },
        { id: "menu_checkin", title: "3. QR Check-In & Token" },
        { id: "menu_queue", title: "4. Live OPD Queue" },
        { id: "menu_3", title: "5. View Prescription" },
        { id: "menu_4", title: "6. Bills & Payments" },
        { id: "menu_5", title: "7. Next Follow-up" },
        { id: "menu_6", title: "8. Doctor Timings" },
        { id: "menu_8", title: "9. Talk to Reception" },
        { id: "menu_10", title: "10. Family Profiles" },
      ];

  const bodyText = isHi
    ? "🏥 Svaasth Connect\nकृपया नीचे दी गई सेवाओं में से कोई एक चुनें:"
    : isMr
    ? "🏥 Svaasth Connect\nकृपया खालील सेवांपैकी एक पर्याय निवडा:"
    : "🏥 Svaasth Connect\nPlease choose a service from the options below:";

  const buttonTitle = isHi ? "सेवाएं चुनें" : isMr ? "पर्याय निवडा" : "Select Service";

  return {
    kind: "list",
    body: bodyText,
    buttonText: buttonTitle,
    sections: [
      {
        title: isHi ? "उपलब्ध सेवाएं" : isMr ? "उपलब्ध पर्याय" : "Available Options",
        rows: labels,
      },
    ],
  };
}

/* =========================================================================
   MAIN AGENT DISPATCHER
   ========================================================================= */

export async function handleConversationTurn(
  input: {
    phoneNumber: string;
    text?: string;
    type?: string;
    latitude?: number;
    longitude?: number;
  },
  context: AgentContext
): Promise<AgentResponse> {
  let userText = (input.text || "").trim();
  const choiceId = userText.toLowerCase();

  // Normalize interactive button / list clicks
  if (/^(doctor|date|slot|sex)_\d+$/.test(choiceId)) {
    userText = choiceId.split("_")[1];
  } else if (choiceId === "session_morning") {
    userText = "morning";
  } else if (choiceId === "session_evening") {
    userText = "evening";
  }
  const lower = userText.toLowerCase();
  const normalizedText = lower.startsWith("menu_")
    ? lower.replace("menu_", "")
    : lower;

  // DEMO RESET: Keyword to treat as a brand-new first-time user
  if (
    lower === "#demo" ||
    lower === "demo" ||
    lower === "#reset" ||
    lower === "reset" ||
    lower === "#fresh" ||
    lower === "fresh" ||
    lower === "#first" ||
    lower === "first time" ||
    lower === "/reset" ||
    lower === "/demo"
  ) {
    return {
      text: languagePrompt(),
      interactive: languageButtons(),
      nextStep: "LANGUAGE_SELECT",
      updatedContext: {
        currentStep: "LANGUAGE_SELECT",
        language: undefined,
        patientId: undefined,
        patientReference: undefined,
        patientName: undefined,
        bookingDraft: undefined,
        lastBookedDoctor: undefined,
        lastBookedDate: undefined,
        lastBookedPatientName: undefined,
        isHandedOver: false,
        handoverReason: undefined,
        handoverTimestamp: undefined,
        isVerified: false,
        pendingAction: undefined,
        resetSession: true,
      },
    };
  }

  // 0. Human Handover / Staff Conversation Guard
  // When staff is managing this chat or bot is paused (isHandedOver === true or currentStep === "HANDED_OVER"),
  // the automated assistant MUST REMAIN COMPLETELY SILENT!
  // All patient messages pass quietly to the staff dashboard without automated bot interruptions.
  if (context.isHandedOver || context.currentStep === "HANDED_OVER") {
    const isExplicitResume =
      lower === "#bot" ||
      lower === "#resume" ||
      lower === "/bot" ||
      lower === "resume bot" ||
      lower === "start bot" ||
      lower === "menu" ||
      lower === "hi" ||
      lower === "hello" ||
      lower === "namaste" ||
      lower === "start" ||
      lower === "1" ||
      lower.startsWith("menu_") ||
      choiceId.startsWith("doctor_") ||
      choiceId.startsWith("menu_");

    if (isExplicitResume) {
      const activeLang = context.language || "en";
      return {
        text: inLanguage(
          activeLang,
          `🤖 *AI Assistant Resumed*\n\nWelcome back to Svaasth Connect! How can I help you today?\n\nType *Menu* to see available options.`,
          `🤖 *AI सहायक पुनः सक्रिय*\n\nस्वास्थ कनेक्ट में आपका स्वागत है! मैं आपकी क्या सहायता कर सकता हूँ?\n\nउपलब्ध विकल्प देखने के लिए *Menu* लिखें।`,
          `🤖 *AI सहाय्यक पुन्हा सुरू झाला*\n\nस्वास्थ कनेक्ट मध्ये आपले स्वागत आहे! मी आपल्याला कशी मदत करू शकतो?\n\nपुन्हा मेनू पाहण्यासाठी *Menu* पाठवा.`
        ),
        interactive: menuList(activeLang),
        nextStep: "IDLE",
        updatedContext: {
          isHandedOver: false,
          handoverReason: undefined,
          currentStep: "IDLE",
        },
      };
    }

    // Keep bot 100% silent - patient message will be visible to staff on dashboard
    return {
      text: "",
      nextStep: "HANDED_OVER",
      updatedContext: {
        isHandedOver: true,
        currentStep: "HANDED_OVER",
      },
    };
  }

  const isLangStep =
    !context.language ||
    context.currentStep === "WELCOME" ||
    context.currentStep === "LANGUAGE_SELECT";

  // 1. Language Selection (via button click e.g. "lang_hi", title "2. हिन्दी", or number "2")
  const explicitLang = detectLanguageChoice(userText, isLangStep);
  if (explicitLang) {
    return {
      text: mainMenu(explicitLang),
      interactive: menuList(explicitLang),
      nextStep: "IDLE",
      updatedContext: {
        language: explicitLang,
        currentStep: "IDLE",
        bookingDraft: undefined,
      },
    };
  }

  // 1b. User explicitly asks to change language (Option 10 or typing "language", "भाषा बदलें", etc.)
  if (isLanguageChangeQuery(userText) || isLanguageChangeQuery(normalizedText)) {
    return {
      text: languagePrompt(),
      interactive: languageButtons(),
      nextStep: "LANGUAGE_SELECT",
      updatedContext: { currentStep: "LANGUAGE_SELECT" },
    };
  }

  // 1c. If user sends a greeting / help / menu or English text while in language prompt,
  // do NOT repeatedly ask for language! Auto-default to English (or Hindi/Marathi for native greetings)
  // and show the Main Menu directly.
  if (
    isLangStep &&
    (isGreetingText(userText) ||
      lower === "help" ||
      lower === "menu" ||
      lower === "main menu" ||
      lower === "hi" ||
      lower === "hello" ||
      lower === "hey" ||
      lower === "start" ||
      lower === "restart")
  ) {
    const defaultedLang: "en" | "hi" | "mr" =
      lower === "namaskar" ? "mr" : lower === "namaste" ? "hi" : "en";
    return {
      text:
        mainMenu(defaultedLang) +
        (defaultedLang === "en"
          ? "\n\n_(Defaulted to English. Type *Language* anytime to switch to हिन्दी / मराठी)_"
          : ""),
      interactive: menuList(defaultedLang),
      nextStep: "IDLE",
      updatedContext: {
        language: defaultedLang,
        currentStep: "IDLE",
        bookingDraft: undefined,
      },
    };
  }

  // 1d. If no language has been selected yet and no recognizable greeting, prompt for language
  if (isLangStep) {
    return {
      text: languagePrompt(),
      interactive: languageButtons(),
      nextStep: "LANGUAGE_SELECT",
      updatedContext: { currentStep: "LANGUAGE_SELECT" },
    };
  }

  const lang = context.language || "en";

  // 3. User says "Hi", "Hello", "Menu", "Start" while language IS ALREADY SELECTED ->
  // Show Main Menu directly in their selected language! DO NOT ask for language again!
  if (
    isGreetingText(userText) ||
    lower === "menu" ||
    lower === "main menu" ||
    lower === "start" ||
    lower === "restart"
  ) {
    return {
      text: mainMenu(lang),
      interactive: menuList(lang),
      nextStep: "IDLE",
      updatedContext: {
        currentStep: "IDLE",
        bookingDraft: undefined,
      },
    };
  }

  // 4. User sent a location pin
  if (input.type === "location" || (input.latitude && input.longitude)) {
    return {
      text: inLanguage(
        lang,
        `📍 Thank you for sharing your location!\n\n🏥 *Cortex Hospital, Wardha*\nAarti Chowk, Nagpur Road, Wardha - 442001, Maharashtra\n📞 Reception: 07152-255795 / +91 9373280505\n\nGoogle Maps Directions:\nhttps://maps.google.com/?q=${CORTEX_HOSPITAL_CONFIG.coordinates.latitude},${CORTEX_HOSPITAL_CONFIG.coordinates.longitude}\n\nHow can I help you today?\n1️⃣ Book an Appointment\n2️⃣ Doctor Availability\n3️⃣ Talk to Reception`,
        `📍 अपनी लोकेशन साझा करने के लिए धन्यवाद!\n\n🏥 *Cortex Hospital, वर्धा*\nआरती चौक, नागपुर रोड, वर्धा - 442001, महाराष्ट्र\n📞 रिसेप्शन: 07152-255795 / +91 9373280505\n\nगूगल मैप्स दिशा-निर्देश:\nhttps://maps.google.com/?q=${CORTEX_HOSPITAL_CONFIG.coordinates.latitude},${CORTEX_HOSPITAL_CONFIG.coordinates.longitude}\n\nमैं आपकी क्या मदद करूँ?\n1️⃣ अपॉइंटमेंट बुक करें\n2️⃣ डॉक्टर का समय\n3️⃣ रिसेप्शन से बात करें`,
        `📍 आपली लोकेशन पाठवल्याबद्दल धन्यवाद!\n\n🏥 *Cortex Hospital, वर्धा*\nआरती चौक, नागपूर रोड, वर्धा - 442001, महाराष्ट्र\n📞 रिसेप्शन: 07152-255795 / +91 9373280505\n\nगुगल मॅप्स दिशानिर्देश:\nhttps://maps.google.com/?q=${CORTEX_HOSPITAL_CONFIG.coordinates.latitude},${CORTEX_HOSPITAL_CONFIG.coordinates.longitude}\n\nमी आपली काय मदत करू शकतो?\n1️⃣ नवीन अपॉइंटमेंट बुक करा\n2️⃣ डॉक्टरांची वेळ\n3️⃣ रिसेप्शनशी बोला`
      ),
      nativeLocation: {
        latitude: CORTEX_HOSPITAL_CONFIG.coordinates.latitude,
        longitude: CORTEX_HOSPITAL_CONFIG.coordinates.longitude,
        name: CORTEX_HOSPITAL_CONFIG.name,
        address: CORTEX_HOSPITAL_CONFIG.address.fullFormatted,
      },
    };
  }

  // 4. User requests Reception Handover (Option 8 or 9 from main menu)
  const isGlobalMenuStep = !context.currentStep || context.currentStep === "IDLE" || context.currentStep === "WELCOME";
  if (
    (isGlobalMenuStep && (normalizedText === "8" || normalizedText === "9")) ||
    choiceId === "menu_8" ||
    lower.includes("reception") ||
    lower.includes("human") ||
    lower.includes("operator") ||
    lower.includes("staff") ||
    lower.includes("baat karni hai") ||
    lower.includes("bolna hai") ||
    lower.includes("bolayche aahe") ||
    lower.includes("connect to reception")
  ) {
    try {
      const convex = getCortexConvexClient();
      await convex.mutation(api.audit.logAuditEvent, {
        eventType: "HANDOVER_TO_RECEPTION",
        phoneNumber: input.phoneNumber,
        patientName: context.patientName,
        details: "Patient requested human receptionist handover",
      });
    } catch {}

    return {
      text: inLanguage(
        lang,
        `☎️ *Connecting to Svaasth Hospital Reception*\n\nOur receptionist will be happy to assist you directly!\n\n🏥 *Reception Helplines:*\n📞 Landline: *07152-255795*\n📱 Mobile / WhatsApp: *+91 9373280505*\n⏰ Timings: 10:00 AM – 1:00 PM & 6:00 PM – 8:00 PM\n\nWe have transferred your chat context to the front desk.\nAutomated messages are now paused so staff can assist you.\n\n_(Type *#bot* whenever you wish to resume virtual assistance.)_`,
        `☎️ *Svaasth Hospital रिसेप्शन से संपर्क*\n\nहमारे रिसेप्शनिस्ट आपकी सीधी सहायता करेंगे!\n\n🏥 *हेल्पलाइन नंबर:*\n📞 लैंडलाइन: *07152-255795*\n📱 मोबाइल / WhatsApp: *+91 9373280505*\n⏰ समय: सुबह 10:00 – दोपहर 1:00 व शाम 6:00 – रात 8:00\n\nआपकी चैट रिसेप्शन को भेज दी गई है। ऑटोमेटेड संदेश रोक दिए गए हैं ताकि स्टाफ आपकी सहायता कर सके।\n\n_(वर्चुअल असिस्टेंट पुनः शुरू करने के लिए *#bot* लिखें।)_`,
        `☎️ *Svaasth Hospital रिसेप्शनशी संपर्क*\n\nआमचे रिसेप्शनिस्ट आपल्याला थेट मदत करतील!\n\n🏥 *हेल्पलाइन क्रमांक:*\n📞 लँडलाइन: *07152-255795*\n📱 मोबाइल / WhatsApp: *+91 9373280505*\n⏰ वेळ: सकाळी 10:00 ते दुपारी 1:00 आणि संध्याकाळी 6:00 ते रात्री 8:00\n\nआपले संभाषण फ्रंट डेस्ककडे पाठवले आहे. ऑटोमेटेड संदेश थांबवले आहेत.\n\n_(पुन्हा व्हर्च्युअल असिस्टंट सुरू करण्यासाठी *#bot* लिहा.)_`
      ),
      nextStep: "HANDED_OVER",
      updatedContext: {
        isHandedOver: true,
        handoverReason: "Patient requested human receptionist handover",
        handoverTimestamp: Date.now(),
      },
    };
  }

  // 5. Medical Emergency Safety Rule (Section 12)
  if (isEmergencyQuery(userText)) {
    try {
      const convex = getCortexConvexClient();
      await convex.mutation(api.audit.logAuditEvent, {
        eventType: "EMERGENCY_TRIGGERED",
        phoneNumber: input.phoneNumber,
        patientName: context.patientName,
        details: `Emergency advisory triggered: ${userText.slice(0, 80)}`,
      });
    } catch {}

    return {
      text: inLanguage(
        lang,
        `🚨 *EMERGENCY MEDICAL ADVICE* 🚨\n\nIf you or the patient are experiencing severe symptoms such as acute chest pain, severe breathlessness, uncontrolled bleeding, convulsions, or serious injury:\n\n⚠️ *PLEASE SEEK IMMEDIATE EMERGENCY MEDICAL ATTENTION:*\n1. 🚑 *Call National Emergency: 112*\n2. 🏥 *Cortex Hospital Emergency Helpline: +91 9373280505*\n3. 📍 *Emergency Address:* Cortex Hospital, Aarti Chowk, Nagpur Road, Wardha\n\nOur medical casualty is prepared to assist emergency patients. Please do not wait for chat replies.`,
        `🚨 *आपातकालीन चिकित्सा सूचना* 🚨\n\nयदि मरीज को सीने में तेज दर्द, सांस लेने में अत्यधिक तकलीफ, भारी रक्तस्राव या गंभीर चोट जैसी आपात स्थिति है:\n\n⚠️ *कृपया तुरंत आपातकालीन सहायता लें:*\n1. 🚑 *राष्ट्रीय आपातकालीन नंबर: 112*\n2. 🏥 *Cortex Hospital आपातकालीन नंबर: +91 9373280505*\n3. 📍 *पता:* Cortex Hospital, आरती चौक, नागपुर रोड, वर्धा\n\nकृपया चैट के उत्तर का इंतजार न करें और सीधे अस्पताल पहुंचें।`,
        `🚨 *तातडीची वैद्यकीय सूचना (इमर्जन्सी)* 🚨\n\nरुग्णास छातीत तीव्र वेदना, श्वास घेण्यास त्रास, तीव्र रक्तस्त्राव किंवा गंभीर इजा असल्यास:\n\n⚠️ *कृपया त्वरित वैद्यकीय मदत मिळवा:*\n1. 🚑 *राष्ट्रीय आपत्कालीन क्रमांक: 112*\n2. 🏥 *Cortex Hospital आपत्कालीन क्रमांक: +91 9373280505*\n3. 📍 *पत्ता:* Cortex Hospital, आरती चौक, नागपूर रोड, वर्धा\n\nकृपया चॅटच्या उत्तराची वाट न पाहता त्वरित हॉस्पिटलच्या कॅज्युअल्टी विभागात यावे.`
      ),
      nativeLocation: {
        latitude: CORTEX_HOSPITAL_CONFIG.coordinates.latitude,
        longitude: CORTEX_HOSPITAL_CONFIG.coordinates.longitude,
        name: CORTEX_HOSPITAL_CONFIG.name + " (Emergency)",
        address: CORTEX_HOSPITAL_CONFIG.address.fullFormatted,
      },
    };
  }

  // 6. Medical Safety Guardrail: Never diagnose or prescribe medicines (Section 12)
  if (isMedicalAdviceQuery(userText)) {
    return {
      text: inLanguage(
        lang,
        `⚠️ *Medical Safety Note:*\n\nI am an administrative hospital assistant, not a doctor. I cannot diagnose conditions, recommend medicines, or alter dosages.\n\nFor accurate clinical diagnosis, please consult our specialists:\n👨‍⚕️ *Dr. Vipeen Raut* (Orthopaedics & Joint Replacement)\n👩‍⚕️ *Dr. Shillpa Raut* (Gynecology & Obstetrics)\n\nReply *1* to book an appointment.`,
        `⚠️ *चिकित्सा सुरक्षा सूचना:*\n\nमैं एक प्रशासनिक अस्पताल सहायक हूँ, डॉक्टर नहीं। मैं बीमारियों का निदान या दवाइयां नहीं बता सकता।\n\nसुरक्षित और सही इलाज के लिए कृपया हमारे विशेषज्ञ डॉक्टरों से परामर्श लें:\n👨‍⚕️ *Dr. Vipeen Raut* (हड्डी एवं जोड़ रोग विशेषज्ञ)\n👩‍⚕️ *Dr. Shillpa Raut* (स्त्री रोग व प्रसूति विशेषज्ञ)\n\nअपॉइंटमेंट बुक करने के लिए *1* भेजें।`,
        `⚠️ *वैद्यकीय सुरक्षा सूचना:*\n\nमी एक प्रशासकीय हॉस्पिटल सहाय्यक आहे, डॉक्टर नाही. मी आजाराचे निदान किंवा औषधांची शिफारस करू शकत नाही.\n\nयोग्य तपासणी व सल्ल्यासाठी कृपया आमच्या तज्ज्ञ डॉक्टरांना भेटा:\n👨‍⚕️ *Dr. Vipeen Raut* (हाडे व सांधे तज्ज्ञ)\n👩‍⚕️ *Dr. Shillpa Raut* (स्त्रीरोग व प्रसूती तज्ज्ञ)\n\nअपॉइंटमेंट बुक करण्यासाठी *1* पाठवा.`
      ),
    };
  }

  // 8. Multi-step Appointment Booking Interrupt check
  if (
    context.currentStep.startsWith("BOOKING_") ||
    context.currentStep.startsWith("REGISTER_")
  ) {
    if (isInterruptionQuery(userText, context.currentStep)) {
      context.currentStep = "IDLE";
      context.bookingDraft = undefined;
    }
  }

  if (context.currentStep === "RESCHEDULE_SELECT_DATE") {
    return await handleRescheduleSelectDate(userText, context);
  }
  if (context.currentStep === "RESCHEDULE_SELECT_SLOT") {
    return await handleRescheduleSelectSlot(userText, context);
  }
  if (context.currentStep === "BOOKING_SELECT_DOCTOR") {
    return await handleBookingSelectDoctor(userText, context);
  }
  if (context.currentStep === "BOOKING_SELECT_DATE") {
    return await handleBookingSelectDate(userText, context);
  }
  if (context.currentStep === "BOOKING_SELECT_SESSION") {
    return await handleBookingSelectSession(userText, context);
  }
  if (context.currentStep === "BOOKING_SELECT_SLOT") {
    return await handleBookingSelectSlot(userText, context);
  }
  if (context.currentStep === "BOOKING_SELECT_PROFILE") {
    return await handleBookingSelectProfile(userText, context);
  }
  if (context.currentStep === "VIEW_APPOINTMENTS_SELECT_PROFILE") {
    return await handleAppointmentsSelectProfile(userText, context);
  }
  if (context.currentStep === "VIEW_PRESCRIPTION_SELECT_PROFILE") {
    return await handlePrescriptionSelectProfile(userText, context);
  }
  if (context.currentStep === "VIEW_PRESCRIPTION_SEARCH_REF") {
    return await handlePrescriptionSelectProfile(userText, context);
  }
  if (context.currentStep === "VIEW_BILL_SELECT_PROFILE") {
    return await handleBillSelectProfile(userText, context);
  }
  if (context.currentStep === "VIEW_FOLLOWUP_SELECT_PROFILE") {
    return await handleFollowupSelectProfile(userText, context);
  }
  if (context.currentStep === "MANAGE_PROFILES_ACTION") {
    return await handleManageProfilesAction(userText, context);
  }
  if (context.currentStep === "REGISTER_NAME") {
    return await handleRegisterName(userText, context);
  }
  if (context.currentStep === "REGISTER_AGE") {
    return await handleRegisterAge(userText, context);
  }
  if (context.currentStep === "REGISTER_SEX") {
    return await handleRegisterSex(userText, context);
  }
  if (context.currentStep === "REGISTER_ADDRESS") {
    return await handleRegisterAddress(userText, context);
  }

  // 9. Top-Level Intent Routing
  const matchedDoc = matchDoctorByName(normalizedText);
  const parsedDate = parseDateInput(userText);

  // 0: Family Profiles / Switch Profile / Add Member (Option 10 or keywords)
  if (
    normalizedText === "10" ||
    lower === "switch" ||
    lower === "profile" ||
    lower === "profiles" ||
    lower.includes("switch profile") ||
    lower.includes("change profile") ||
    lower.includes("switch patient") ||
    lower.includes("change patient") ||
    lower.includes("change name") ||
    lower.includes("change my name") ||
    lower.includes("wrong name") ||
    lower.includes("another person") ||
    lower.includes("other person") ||
    lower.includes("someone else") ||
    lower.includes("family profile") ||
    lower.includes("family member") ||
    lower.includes("add family") ||
    lower.includes("add profile") ||
    lower.includes("add member") ||
    lower.includes("add patient") ||
    lower.includes("new profile") ||
    lower.includes("new patient") ||
    lower.includes("other profile") ||
    lower.includes("naam badal") ||
    lower.includes("naam change") ||
    lower.includes("nav badal")
  ) {
    return await handleManageProfiles(input.phoneNumber, context);
  }

  // 1b: User wants to book for another family member / 2nd person (Consecutive booking)
  if (
    choiceId === "book_another_member" ||
    lower.includes("another person") ||
    lower.includes("another member") ||
    lower.includes("another patient") ||
    lower.includes("second person") ||
    lower.includes("2nd person") ||
    lower.includes("book another") ||
    lower.includes("more than 1") ||
    lower.includes("2 people") ||
    lower.includes("two people") ||
    lower.includes("2 patients") ||
    lower.includes("two patients") ||
    lower.includes("dusra patient") ||
    lower.includes("dusre patient") ||
    lower.includes("dusri appointment") ||
    lower.includes("aankhi ek") ||
    lower.includes("dusryasathi")
  ) {
    if (context.lastBookedDate && context.lastBookedDoctor) {
      const docName = context.lastBookedDoctor;
      const dateStr = context.lastBookedDate;
      const slotView = await showAvailableSlotsForSession(
        dateStr,
        docName,
        "morning",
        {
          doctorName: docName,
          date: dateStr,
          dateLabel: formatDisplayDate(dateStr),
          session: "morning",
          isSecondBooking: true,
          previousPatientName: context.lastBookedPatientName || context.patientName,
        },
        {
          ...context,
          patientName: undefined,
          patientId: undefined,
          patientReference: undefined,
        }
      );

      return {
        ...slotView,
        updatedContext: {
          ...slotView.updatedContext,
          patientName: undefined,
          patientId: undefined,
          patientReference: undefined,
        },
        text: inLanguage(
          lang,
          `👥 *Booking for Second Patient / Family Member*\n━━━━━━━━━━━━━━━━━━━━━\nHere are the adjacent slots with *${docName}* on *${formatDisplayDate(dateStr)}*:\n\n${slotView.text}`,
          `👥 *दूसरे मरीज / परिजन के लिए बुकिंग*\n━━━━━━━━━━━━━━━━━━━━━\n*${formatDisplayDate(dateStr)}* को *${docName}* के साथ उपलब्ध समय:\n\n${slotView.text}`,
          `👥 *दुसऱ्या रुग्णासाठी / कुटुंब सदस्यासाठी बुकिंग*\n━━━━━━━━━━━━━━━━━━━━━\n*${formatDisplayDate(dateStr)}* रोजी *${docName}* यांच्याकडे उपलब्ध वेळा:\n\n${slotView.text}`
        ),
      };
    }

    return await initiateAppointmentBooking(userText, context);
  }

  // 1: Book Appointment
  if (
    normalizedText === "1" ||
    lower.includes("book") ||
    lower.includes("appointment") ||
    lower.includes("apointment") ||
    lower.includes("consult") ||
    lower.includes("dikhana") ||
    lower.includes("milna") ||
    lower.includes("bhet") ||
    lower.includes("dakhvayche") ||
    lower.includes("checkup") ||
    lower.includes("want to see") ||
    lower.includes("want to meet") ||
    lower.includes("see dr") ||
    lower.includes("see doctor") ||
    lower.includes("meet dr") ||
    lower.includes("visit dr") ||
    lower.includes("वेळ") ||
    lower.includes("हवी") ||
    lower.includes("पाहिजे") ||
    lower.includes("भेट") ||
    (matchedDoc &&
      (Boolean(parsedDate) ||
        lower.includes("tomorrow") ||
        lower.includes("today") ||
        lower.includes("slot") ||
        lower.includes("available") ||
        lower.includes("time") ||
        lower.includes("chi") ||
        lower.includes("se") ||
        lower.includes("यांची") ||
        lower.includes("की") ||
        lower.includes("का")))
  ) {
    return await initiateAppointmentBooking(userText, context);
  }

  // P0-3: Reschedule Appointment
  if (
    choiceId === "btn_reschedule" ||
    lower === "reschedule" ||
    lower.includes("reschedule appointment") ||
    lower.includes("change slot") ||
    lower.includes("change time") ||
    lower.includes("change date") ||
    lower.includes("tarikh badla") ||
    lower.includes("time badla")
  ) {
    return await handleRescheduleRequest(input.phoneNumber, userText, context);
  }

  // P0-4: QR Check-In & Token
  if (
    choiceId === "btn_checkin" ||
    choiceId === "menu_checkin" ||
    choiceId === "checkin" ||
    choiceId === "check_in" ||
    lower.includes("check in") ||
    lower.includes("checkin") ||
    lower.includes("arrived") ||
    lower.includes("pohochlo") ||
    lower.includes("pohachlo") ||
    lower.includes("i am here") ||
    lower.includes("qr code") ||
    lower.includes("qr check") ||
    lower === "qr"
  ) {
    return await handleQrCheckIn(input.phoneNumber, context);
  }

  // P0-4: Live OPD Queue & Waiting Token
  if (
    choiceId === "btn_queue" ||
    choiceId === "menu_queue" ||
    choiceId === "queue" ||
    lower.includes("live queue") ||
    lower.includes("opd queue") ||
    lower.includes("token number") ||
    lower.includes("my token") ||
    lower.includes("waiting time") ||
    lower.includes("how many patients") ||
    lower === "queue" ||
    lower === "token"
  ) {
    return await handleLiveQueueStatus(input.phoneNumber, context);
  }

  // P0-5: Consent & Privacy Policy
  if (
    lower === "consent" ||
    lower.includes("privacy") ||
    lower.includes("digital consent") ||
    lower.includes("terms")
  ) {
    return await handleConsentQuery(input.phoneNumber, context);
  }

  // 2: My Appointments
  if (
    normalizedText === "2" ||
    lower.includes("my appointment") ||
    lower.includes("check appointment") ||
    lower.includes("upcoming appointment") ||
    lower.includes("booked appointment") ||
    lower.includes("cancel appointment")
  ) {
    return await handleMyAppointments(input.phoneNumber, userText, context);
  }

  // 3: My Prescriptions (No OTP required)
  if (
    normalizedText === "3" ||
    lower.includes("prescription") ||
    lower.includes("prescribtion") ||
    lower.includes("parcha") ||
    lower.includes("parchi") ||
    lower.includes("dawai") ||
    lower.includes("dawa") ||
    lower.includes("medicine list") ||
    lower.includes("aushadh")
  ) {
    return await handlePrescriptionQuery(input.phoneNumber, context);
  }

  // 4: Bills & Payments (No OTP required)
  if (
    normalizedText === "4" ||
    lower.includes("bill") ||
    lower.includes("payment") ||
    lower.includes("invoice") ||
    lower.includes("owe") ||
    lower.includes("balance") ||
    lower.includes("fees") ||
    lower.includes("charge") ||
    lower.includes("receipt") ||
    lower.includes("kharcha") ||
    lower.includes("paisa")
  ) {
    return await handleBillingQuery(input.phoneNumber, context);
  }

  // 5: Next Follow-up
  if (
    normalizedText === "5" ||
    lower.includes("follow up") ||
    lower.includes("followup") ||
    lower.includes("follow-up") ||
    lower.includes("next visit") ||
    lower.includes("kab aana hai") ||
    lower.includes("pudhchi tarikh") ||
    lower.includes("punha kadhi")
  ) {
    return await handleFollowupQuery(input.phoneNumber, context);
  }

  // 6: Doctor Availability & Schedules
  if (
    normalizedText === "6" ||
    lower.includes("doctor") ||
    lower.includes("availability") ||
    lower.includes("schedule") ||
    lower.includes("timing") ||
    lower.includes("kab baithenge") ||
    lower.includes("dr vipeen") ||
    lower.includes("dr shillpa") ||
    lower.includes("orthopaedic") ||
    lower.includes("gynecologist") ||
    lower.includes("kadhi ahet")
  ) {
    return await handleDoctorAvailabilityQuery(userText, context);
  }

  // 7: Hospital Information & Location (Option 7 or 8)
  if (
    normalizedText === "7" ||
    normalizedText === "8" ||
    lower.includes("hospital") ||
    lower.includes("location") ||
    lower.includes("address") ||
    lower.includes("where") ||
    lower.includes("directions") ||
    lower.includes("sunday") ||
    lower.includes("open") ||
    lower.includes("kaha hai") ||
    lower.includes("pata") ||
    lower.includes("kothe aahe") ||
    lower.includes("wardha")
  ) {
    return await handleHospitalInfoQuery(userText, context);
  }

  // 9: Change Language (bhasha badle / भाषा बदलें) (Option 9)
  if (
    normalizedText === "9" ||
    isLanguageChangeQuery(userText) ||
    isLanguageChangeQuery(normalizedText)
  ) {
    return {
      text: languagePrompt(),
      interactive: languageButtons(),
      nextStep: "LANGUAGE_SELECT",
      updatedContext: { currentStep: "LANGUAGE_SELECT" },
    };
  }

  // Laboratory Reports (By explicit keyword query only)
  if (
    lower.includes("lab report") ||
    lower.includes("laboratory") ||
    lower.includes("blood test") ||
    lower.includes("xray report") ||
    lower.includes("x-ray report") ||
    lower.includes("लॅब रिपोर्ट") ||
    lower.includes("लैब रिपोर्ट")
  ) {
    return await handleLabReportsQuery(input.phoneNumber, context);
  }

  // Default fallback in user's selected language
  return {
    text: mainMenu(lang),
    interactive: menuList(lang),
    nextStep: "IDLE",
  };
}

/* =========================================================================
   APPOINTMENT BOOKING FLOW (Sections 2 & 10)
   ========================================================================= */

async function initiateAppointmentBooking(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const matchedDoc = matchDoctorByName(userText);
  const parsedDate = parseDateInput(userText);

  // Check if user explicitly specified a patient name in their message (e.g. "for Rahul", "book for Priya")
  let explicitPatientName: string | undefined;
  const forMatch = userText.match(/(?:for|ke liye|chya sathi|sathi)\s+([A-Za-z\u0900-\u097F\s]{2,30})/i);
  if (forMatch && !forMatch[1].toLowerCase().includes("appointment") && !forMatch[1].toLowerCase().includes("dr")) {
    explicitPatientName = forMatch[1].trim();
  }

  const draft: Record<string, any> = {
    doctorName: matchedDoc ? matchedDoc.name : undefined,
    specialty: matchedDoc ? matchedDoc.specialty : undefined,
    date: parsedDate || undefined,
    patientName: explicitPatientName,
    explicitPatientName: Boolean(explicitPatientName),
  };

  // Step 1: If doctor not specified, ask doctor
  if (!draft.doctorName) {
    const docs = await fetchDoctors();

    return {
      text: inLanguage(
        lang,
        "🏥 *Book Appointment*\nPlease select a doctor below:",
        "🏥 *अपॉइंटमेंट बुकिंग*\nकृपया नीचे डॉक्टर चुनें:",
        "🏥 *अपॉइंटमेंट बुकिंग*\nकृपया खालील डॉक्टर निवडा:"
      ),
      nextStep: "BOOKING_SELECT_DOCTOR",
      updatedContext: { bookingDraft: draft },
      interactive: {
        kind: "buttons",
        body: inLanguage(lang, "Choose a specialist doctor:", "विशेषज्ञ डॉक्टर चुनें:", "तज्ज्ञ डॉक्टर निवडा:"),
        buttons: [
          { id: "doctor_1", title: docs[0]?.name || "Dr. Vipeen Raut" },
          { id: "doctor_2", title: docs[1]?.name || "Dr. Shillpa Raut" },
        ],
      },
    };
  }

  // Step 2: If date not specified, ask date
  if (!draft.date) {
    const nextDates = getNextAvailableDates();

    return {
      text: inLanguage(
        lang,
        `👨‍⚕️ *${draft.doctorName}*\nPlease select an appointment date below (or enter DD/MM/YY):`,
        `👨‍⚕️ *${draft.doctorName}*\nकृपया नीचे तारीख चुनें (या DD/MM/YY लिखें):`,
        `👨‍⚕️ *${draft.doctorName}*\nकृपया खाली तारीख निवडा (किंवा DD/MM/YY लिहा):`
      ),
      nextStep: "BOOKING_SELECT_DATE",
      updatedContext: { bookingDraft: draft },
      interactive: {
        kind: "buttons",
        body: inLanguage(lang, "Select date (DD/MM/YY):", "तारीख चुनें (DD/MM/YY):", "तारीख निवडा (DD/MM/YY):"),
        buttons: nextDates.map((d, idx) => ({
          id: `date_${idx + 1}`,
          title: inLanguage(lang, d.labelEn, d.labelHi, d.labelMr).slice(0, 20),
        })),
      },
    };
  }

  // Doctor and Date are both known: ask for Session (Morning or Evening) or show session slots if specified
  const clean = userText.toLowerCase();
  let session: "morning" | "evening" | null = null;
  if (clean.includes("morn") || clean.includes("subah") || clean.includes("sakal")) {
    session = "morning";
  } else if (clean.includes("even") || clean.includes("sham") || clean.includes("shaam") || clean.includes("sandhya")) {
    session = "evening";
  }

  if (session) {
    return await showAvailableSlotsForSession(draft.date, draft.doctorName, session, draft, context);
  }

  return await promptBookingSession(draft.date, draft.doctorName, draft, context);
}

async function handleBookingSelectDoctor(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const docs = await fetchDoctors();
  const clean = userText.toLowerCase().trim();

  let selectedDoc: DoctorInfo | undefined;
  if (clean === "1" || clean === "doctor_1" || clean === "doc_1") {
    selectedDoc = docs[0];
  } else if (clean === "2" || clean === "doctor_2" || clean === "doc_2") {
    selectedDoc = docs[1];
  } else {
    selectedDoc = matchDoctorByName(userText);
  }

  if (!selectedDoc) {
    return {
      text: inLanguage(
        lang,
        "Please select a doctor below:",
        "कृपया नीचे डॉक्टर चुनें:",
        "कृपया खालील डॉक्टर निवडा:"
      ),
      nextStep: "BOOKING_SELECT_DOCTOR",
      interactive: {
        kind: "buttons",
        body: inLanguage(lang, "Choose doctor:", "डॉक्टर चुनें:", "डॉक्टर निवडा:"),
        buttons: [
          { id: "doctor_1", title: docs[0]?.name || "Dr. Vipeen Raut" },
          { id: "doctor_2", title: docs[1]?.name || "Dr. Shillpa Raut" },
        ],
      },
    };
  }

  const prevDraft = context.bookingDraft || {};
  const updatedDraft = {
    doctorName: selectedDoc.name,
    specialty: selectedDoc.specialty,
    date: prevDraft.date,
    session: prevDraft.session,
    currentSession: prevDraft.currentSession,
    slot: prevDraft.slot,
    slotTime: prevDraft.slotTime,
    isSecondBooking: prevDraft.isSecondBooking,
    previousPatientName: prevDraft.previousPatientName,
    patientName: prevDraft.explicitPatientName ? prevDraft.patientName : undefined,
    explicitPatientName: prevDraft.explicitPatientName,
  };

  const nextDates = getNextAvailableDates();

  return {
    text: inLanguage(
      lang,
      `👨‍⚕️ *${selectedDoc.name}*\nPlease select an appointment date below (or enter DD/MM/YY):`,
      `👨‍⚕️ *${selectedDoc.name}*\nकृपया नीचे तारीख चुनें (या DD/MM/YY लिखें):`,
      `👨‍⚕️ *${selectedDoc.name}*\nकृपया खाली तारीख निवडा (किंवा DD/MM/YY लिहा):`
    ),
    nextStep: "BOOKING_SELECT_DATE",
    updatedContext: { bookingDraft: updatedDraft },
    interactive: {
      kind: "buttons",
      body: inLanguage(lang, "Select date (DD/MM/YY):", "तारीख चुनें (DD/MM/YY):", "तारीख निवडा (DD/MM/YY):"),
      buttons: nextDates.map((d, idx) => ({
        id: `date_${idx + 1}`,
        title: inLanguage(lang, d.labelEn, d.labelHi, d.labelMr).slice(0, 20),
      })),
    },
  };
}

async function handleBookingSelectDate(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const parsedDate = parseDateInput(userText);

  if (!parsedDate) {
    const nextDates = getNextAvailableDates();

    return {
      text: inLanguage(
        lang,
        "Please select a date below (or enter DD/MM/YY):",
        "कृपया नीचे तारीख चुनें (या DD/MM/YY लिखें):",
        "कृपया खालील तारीख निवडा (किंवा DD/MM/YY लिहा):"
      ),
      nextStep: "BOOKING_SELECT_DATE",
      interactive: {
        kind: "buttons",
        body: inLanguage(lang, "Select date:", "तारीख चुनें:", "तारीख निवडा:"),
        buttons: nextDates.map((d, idx) => ({
          id: `date_${idx + 1}`,
          title: inLanguage(lang, d.labelEn, d.labelHi, d.labelMr).slice(0, 20),
        })),
      },
    };
  }

  const docName = context.bookingDraft?.doctorName || "Dr. Vipeen Raut";
  const draft = context.bookingDraft || {};

  const clean = userText.toLowerCase();
  let session: "morning" | "evening" | null = null;
  if (clean.includes("morn") || clean.includes("subah") || clean.includes("sakal")) {
    session = "morning";
  } else if (clean.includes("even") || clean.includes("sham") || clean.includes("shaam") || clean.includes("sandhya")) {
    session = "evening";
  }

  if (session) {
    return await showAvailableSlotsForSession(parsedDate, docName, session, draft, context);
  }

  return await promptBookingSession(parsedDate, docName, draft, context);
}

async function proceedToPatientRegistration(
  dateStr: string,
  docName: string,
  draft: Record<string, any>,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const [year, month, day] = dateStr.split("-").map(Number);
  const checkDate = new Date(year, month - 1, day);
  const dateDmy = formatDisplayDate(dateStr);

  if (checkDate.getDay() === 0) {
    const nextDates = getNextAvailableDates();
    return {
      text: inLanguage(
        lang,
        `⚠️ Cortex Hospital OPD is closed on Sundays (*${dateDmy}*).\n\nPlease choose another date below:`,
        `⚠️ Cortex Hospital OPD रविवार (*${dateDmy}*) को बंद रहता है।\n\nकृपया नीचे से दूसरी तारीख चुनें:`,
        `⚠️ Cortex Hospital OPD रविवारी (*${dateDmy}*) बंद असते.\n\nकृपया खालीलपैकी दुसरी तारीख निवडा:`
      ),
      nextStep: "BOOKING_SELECT_DATE",
      updatedContext: { bookingDraft: draft },
      interactive: {
        kind: "buttons",
        body: inLanguage(lang, "Select valid OPD date:", "OPD तारीख चुनें:", "OPD तारीख निवडा:"),
        buttons: nextDates.map((d, idx) => ({
          id: `date_${idx + 1}`,
          title: inLanguage(lang, d.labelEn, d.labelHi, d.labelMr).slice(0, 20),
        })),
      },
    };
  }

  // Find first available slot for this doctor & date
  let chosenSlot = draft.slot;
  if (!chosenSlot) {
    try {
      const slotData = await getAvailableSlots(dateStr, docName);
      if (slotData.availableSlots && slotData.availableSlots.length > 0) {
        chosenSlot = slotData.availableSlots[0];
      }
    } catch {}
    if (!chosenSlot) chosenSlot = "10:00 AM";
  }

  const updatedDraft: Record<string, any> = {
    ...draft,
    date: dateStr,
    doctorName: docName,
    slot: chosenSlot,
  };

  // Find all registered profiles under this WhatsApp phone number
  const profiles = await findPatientsByPhone(context.phoneNumber);

  // If this is a second patient booking, make sure we do NOT inherit previous patient details
  if (updatedDraft.isSecondBooking) {
    delete updatedDraft.patientName;
    delete updatedDraft.patientAge;
    delete updatedDraft.patientPhone;
    delete updatedDraft.patientAddress;
    delete updatedDraft.sex;
  }

  // If user explicitly specified a name in their initial message (e.g. "for Rahul" or "for my sister Priya")
  if (updatedDraft.explicitPatientName && updatedDraft.patientName) {
    const matchedProfile = profiles.find(
      (p) =>
        p.name.toLowerCase() === updatedDraft.patientName.toLowerCase() ||
        p.name.toLowerCase().includes(updatedDraft.patientName.toLowerCase()) ||
        updatedDraft.patientName.toLowerCase().includes(p.name.toLowerCase())
    );

    if (matchedProfile) {
      updatedDraft.patientName = matchedProfile.name;
      updatedDraft.patientPhone = matchedProfile.phone_number;
      updatedDraft.patientAge = matchedProfile.age;
      updatedDraft.sex = matchedProfile.sex;
      updatedDraft.patientAddress = matchedProfile.address;

      if (matchedProfile.address) {
        // All details already known! Book directly!
        return await executeBookingCreation(updatedDraft, context, {
          name: matchedProfile.name,
          reference_number: matchedProfile.reference_number,
        });
      }

      // Address missing -> ask address once
      return {
        text: inLanguage(
          lang,
          `📅 *Appointment Date:* ${dateDmy}\n👨‍⚕️ *Doctor:* ${docName}\n👤 *Patient:* ${matchedProfile.name} (${matchedProfile.age || "N/A"} yrs, ${matchedProfile.sex})\n\n👉 *Please enter ${matchedProfile.name}'s residential address / city or village (e.g. Wardha):*`,
          `📅 *अपॉइंटमेंट तारीख:* ${dateDmy}\n👨‍⚕️ *डॉक्टर:* ${docName}\n👤 *मरीज:* ${matchedProfile.name} (${matchedProfile.age || "N/A"} वर्ष, ${matchedProfile.sex === "Female" ? "महिला" : "पुरुष"})\n\n👉 *कृपया ${matchedProfile.name} का शहर या गांव (पता) लिखें (जैसे वर्धा):*`,
          `📅 *अपॉइंटमेंट तारीख:* ${dateDmy}\n👨‍⚕️ *डॉक्टर:* ${docName}\n👤 *रुग्ण:* ${matchedProfile.name} (${matchedProfile.age || "N/A"} वर्षे, ${matchedProfile.sex === "Female" ? "महिला" : "पुरुष"})\n\n👉 *कृपया ${matchedProfile.name} यांचे शहर किंवा गाव (पत्ता) लिहा (उदा. वर्धा):*`
        ),
        nextStep: "REGISTER_ADDRESS",
        updatedContext: {
          bookingDraft: updatedDraft,
          patientId: matchedProfile._id,
          patientReference: matchedProfile.reference_number,
          patientName: matchedProfile.name,
        },
      };
    }
  }

  // Filter candidate profiles: when booking for 2nd person, exclude the previous patient
  const availableProfiles =
    updatedDraft.isSecondBooking && updatedDraft.previousPatientName
      ? profiles.filter(
          (p) =>
            p.name.toLowerCase().trim() !==
            String(updatedDraft.previousPatientName).toLowerCase().trim()
        )
      : profiles;

  // If registered profiles exist under this phone number: Ask who the appointment is for!
  if (availableProfiles.length > 0) {
    const listLines = availableProfiles
      .slice(0, 3)
      .map(
        (p, idx) =>
          `*${idx + 1}️⃣ ${p.name}* (${inLanguage(lang, "Age", "उम्र", "वय")}: ${p.age || "N/A"} yrs, ${p.sex})`
      )
      .join("\n");

    const someoneElseNum = Math.min(availableProfiles.length, 3) + 1;
    const someoneElseText = `*${someoneElseNum}️⃣ ➕ ${inLanguage(
      lang,
      "Someone Else / New Member",
      "किसी अन्य के लिए / नया परिजन",
      "इतर व्यक्ती / नवीन कुटुंब सदस्य"
    )}*`;

    const buttons = availableProfiles.slice(0, 2).map((p, idx) => ({
      id: `profile_${idx + 1}`,
      title: `${idx + 1}. ${p.name.slice(0, 16)}`,
    }));
    buttons.push({
      id: "profile_new",
      title: inLanguage(lang, `${someoneElseNum}. Someone Else`, `${someoneElseNum}. नया परिजन`, `${someoneElseNum}. इतर व्यक्ती`),
    });

    const promptTitle = updatedDraft.isSecondBooking
      ? inLanguage(
          lang,
          "👥 *Who is the second patient?*",
          "👥 *दूसरा मरीज कौन है?*",
          "👥 *दुसरे रुग्ण कोण आहेत?*"
        )
      : inLanguage(
          lang,
          "👤 *Who is this appointment for?*",
          "👤 *यह अपॉइंटमेंट किसके लिए है?*",
          "👤 *ही अपॉइंटमेंट कोणासाठी आहे?*"
        );

    return {
      text: inLanguage(
        lang,
        `📅 *Date:* ${dateDmy} | ⏰ *Slot:* ${chosenSlot}\n${promptTitle}`,
        `📅 *तारीख:* ${dateDmy} | ⏰ *समय:* ${chosenSlot}\n${promptTitle}`,
        `📅 *तारीख:* ${dateDmy} | ⏰ *वेळ:* ${chosenSlot}\n${promptTitle}`
      ),
      nextStep: "BOOKING_SELECT_PROFILE",
      updatedContext: {
        bookingDraft: updatedDraft,
        patientName: undefined,
        patientId: undefined,
        patientReference: undefined,
      },
      interactive: {
        kind: "buttons",
        body: inLanguage(lang, "Select patient profile:", "मरीज का चयन करें:", "रुग्ण निवडा:"),
        buttons,
      },
    };
  }

  // New patient (or no other profiles): Prompt for Full Name
  return {
    text: inLanguage(
      lang,
      `📅 *Appointment Date:* ${dateDmy}\n👨‍⚕️ *Doctor:* ${docName}\n⏰ *Slot:* ${chosenSlot}\n\n👉 *Please enter the patient's full name (e.g. Ramesh Patil):*`,
      `📅 *अपॉइंटमेंट तारीख:* ${dateDmy}\n👨‍⚕️ *डॉक्टर:* ${docName}\n⏰ *समय:* ${chosenSlot}\n\n👉 *कृपया मरीज का पूरा नाम लिखें (जैसे रमेश पाटिल):*`,
      `📅 *अपॉइंटमेंट तारीख:* ${dateDmy}\n👨‍⚕️ *डॉक्टर:* ${docName}\n⏰ *वेळ:* ${chosenSlot}\n\n👉 *कृपया रुग्णाचे पूर्ण नाव लिहा (उदा. रमेश पाटील):*`
    ),
    nextStep: "REGISTER_NAME",
    updatedContext: {
      bookingDraft: updatedDraft,
      patientName: undefined,
      patientId: undefined,
      patientReference: undefined,
    },
  };
}

async function promptBookingSession(
  dateStr: string,
  docName: string,
  draft: Record<string, any>,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const [year, month, day] = dateStr.split("-").map(Number);
  const checkDate = new Date(year, month - 1, day);
  const dateDmy = formatDisplayDate(dateStr);

  if (checkDate.getDay() === 0) {
    const nextDates = getNextAvailableDates();
    return {
      text: inLanguage(
        lang,
        `⚠️ Cortex Hospital OPD is closed on Sundays (*${dateDmy}*).\n\nPlease choose another date below:`,
        `⚠️ Cortex Hospital OPD रविवार (*${dateDmy}*) को बंद रहता है।\n\nकृपया नीचे से दूसरी तारीख चुनें:`,
        `⚠️ Cortex Hospital OPD रविवारी (*${dateDmy}*) बंद असते.\n\nकृपया खालीलपैकी दुसरी तारीख निवडा:`
      ),
      nextStep: "BOOKING_SELECT_DATE",
      updatedContext: { bookingDraft: draft },
      interactive: {
        kind: "buttons",
        body: inLanguage(lang, "Select valid OPD date:", "OPD तारीख चुनें:", "OPD तारीख निवडा:"),
        buttons: nextDates.map((d, idx) => ({
          id: `date_${idx + 1}`,
          title: inLanguage(lang, d.labelEn, d.labelHi, d.labelMr).slice(0, 20),
        })),
      },
    };
  }

  const updatedDraft = {
    ...draft,
    date: dateStr,
    doctorName: docName,
  };

  return {
    text: inLanguage(
      lang,
      `📅 *Date:* ${dateDmy} | 👨‍⚕️ *${docName}*\nPlease choose an OPD session below:`,
      `📅 *तारीख:* ${dateDmy} | 👨‍⚕️ *${docName}*\nकृपया नीचे सेशन चुनें:`,
      `📅 *तारीख:* ${dateDmy} | 👨‍⚕️ *${docName}*\nकृपया खाली सेशन निवडा:`
    ),
    nextStep: "BOOKING_SELECT_SESSION",
    updatedContext: { bookingDraft: updatedDraft },
    interactive: {
      kind: "buttons",
      body: inLanguage(lang, "Choose Session:", "सत्र चुनें:", "सत्र निवडा:"),
      buttons: [
        { id: "session_morning", title: inLanguage(lang, "🌅 Morning", "🌅 सुबह", "🌅 सकाळ") },
        { id: "session_evening", title: inLanguage(lang, "🌆 Evening", "🌆 शाम", "🌆 संध्याकाळ") },
      ],
    },
  };
}

async function handleBookingSelectSession(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const draft = context.bookingDraft || {};
  const clean = userText.toLowerCase().trim();

  let session: "morning" | "evening" | null = null;
  if (
    clean === "1" ||
    clean === "session_morning" ||
    clean.includes("morn") ||
    clean.includes("subah") ||
    clean.includes("sakal")
  ) {
    session = "morning";
  } else if (
    clean === "2" ||
    clean === "session_evening" ||
    clean.includes("even") ||
    clean.includes("sham") ||
    clean.includes("shaam") ||
    clean.includes("sandhya")
  ) {
    session = "evening";
  }

  if (!session) {
    return {
      text: inLanguage(
        lang,
        "Please choose an OPD session below:",
        "कृपया नीचे सेशन चुनें:",
        "कृपया खाली सेशन निवडा:"
      ),
      nextStep: "BOOKING_SELECT_SESSION",
      interactive: {
        kind: "buttons",
        body: inLanguage(lang, "Choose Session:", "सत्र चुनें:", "सत्र निवडा:"),
        buttons: [
          { id: "session_morning", title: inLanguage(lang, "🌅 Morning", "🌅 सुबह", "🌅 सकाळ") },
          { id: "session_evening", title: inLanguage(lang, "🌆 Evening", "🌆 शाम", "🌆 संध्याकाळ") },
        ],
      },
    };
  }

  const dateStr = draft.date || formatDate(new Date());
  const docName = draft.doctorName || "Dr. Vipeen Raut";
  return await showAvailableSlotsForSession(dateStr, docName, session, draft, context);
}

async function showAvailableSlotsForSession(
  dateStr: string,
  docName: string,
  session: "morning" | "evening",
  draft: Record<string, any>,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const slotData = await getAvailableSlots(dateStr, docName);
  const dateDmy = formatDisplayDate(dateStr);

  const slotsList: DetailedSlot[] = session === "morning" ? slotData.morningSlots : slotData.eveningSlots;
  const sessionName = session === "morning"
    ? inLanguage(lang, "Morning (10:30 AM – 1:00 PM)", "सुबह (10:30 AM – 1:00 PM)", "सकाळ (10:30 AM – 1:00 PM)")
    : inLanguage(lang, "Evening (6:00 PM – 7:30 PM)", "शाम (6:00 PM – 7:30 PM)", "संध्याकाळ (6:00 PM – 7:30 PM)");

  const oppositeSession = session === "morning" ? "Evening" : "Morning";
  const oppositeLabel = session === "morning"
    ? inLanguage(lang, "Evening (6:00 PM – 7:30 PM)", "शाम (6:00 PM – 7:30 PM)", "संध्याकाळ (6:00 PM – 7:30 PM)")
    : inLanguage(lang, "Morning (10:30 AM – 1:00 PM)", "सुबह (10:30 AM – 1:00 PM)", "सकाळ (10:30 AM – 1:00 PM)");

  const availableInSession = slotsList.filter((s) => !s.isBooked);
  if (availableInSession.length === 0) {
    return {
      text: inLanguage(
        lang,
        `⚠️ All ${session} slots on *${dateDmy}* with *${docName}* are fully booked.\n\n👉 Would you like to check *${oppositeSession}* slots? Reply *${oppositeSession}* or specify another date.`,
        `⚠️ *${dateDmy}* को ${docName} के सभी ${session === "morning" ? "सुबह" : "शाम"} के स्लॉट बुक हो चुके हैं।\n\n👉 क्या आप ${session === "morning" ? "शाम" : "सुबह"} के स्लॉट देखना चाहते हैं? *${session === "morning" ? "शाम" : "सुबह"}* लिखें या दूसरी तारीख बताएं।`,
        `⚠️ *${dateDmy}* रोजी ${docName} यांच्या सर्व ${session === "morning" ? "सकाळच्या" : "संध्याकाळच्या"} वेळा बुक झाल्या आहेत.\n\n👉 आपण ${session === "morning" ? "संध्याकाळच्या" : "सकाळच्या"} वेळा पाहू इच्छिता का? *${session === "morning" ? "संध्याकाळ" : "सकाळ"}* लिहा किंवा दुसरी तारीख सांगा.`
      ),
      nextStep: "BOOKING_SELECT_SESSION",
      updatedContext: { bookingDraft: { ...draft, date: dateStr, doctorName: docName } },
    };
  }

  const slotText = inLanguage(
    lang,
    `📅 *${dateDmy}* (${session === "morning" ? "Morning" : "Evening"})\nPlease tap *Choose Slot* below:`,
    `📅 *${dateDmy}* (${session === "morning" ? "सुबह" : "शाम"})\nकृपया नीचे *समय चुनें* पर टैप करें:`,
    `📅 *${dateDmy}* (${session === "morning" ? "सकाळ" : "संध्याकाळ"})\nकृपया खाली *वेळ निवडा* वर टॅप करा:`
  );

  const updatedDraft = {
    ...draft,
    date: dateStr,
    doctorName: docName,
    currentSession: session,
  };

  // Only AVAILABLE slots are clickable in the WhatsApp interactive list! Booked slots are omitted so they cannot be clicked.
  const interactiveRows = availableInSession.map((s) => {
    const overallIndex = slotsList.findIndex((item) => item.slot === s.slot) + 1;
    return {
      id: `slot_${overallIndex}`,
      title: `${overallIndex}. ${s.display}`,
      description: session === "morning" ? "Morning OPD" : "Evening OPD",
    };
  });

  return {
    text: slotText,
    nextStep: "BOOKING_SELECT_SLOT",
    updatedContext: { bookingDraft: updatedDraft },
    interactive: {
      kind: "list",
      body: inLanguage(
        lang,
        `Choose available slot (${sessionName}):`,
        `उपलब्ध समय चुनें (${sessionName}):`,
        `उपलब्ध वेळ निवडा (${sessionName}):`
      ),
      buttonText: inLanguage(lang, "Choose Slot", "समय चुनें", "वेळ निवडा"),
      sections: [
        {
          title: inLanguage(lang, "Available 15-min Slots", "उपलब्ध 15 मिनट स्लॉट", "उपलब्ध 15 मिनिटांच्या वेळा"),
          rows: interactiveRows.slice(0, 10),
        },
      ],
    },
  };
}

async function handleBookingSelectSlot(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const draft = context.bookingDraft;
  if (!draft || !draft.date) {
    return await initiateAppointmentBooking(userText, context);
  }

  const cleanInput = userText.trim().toLowerCase();
  const dateStr = draft.date;
  const docName = draft.doctorName || "Dr. Vipeen Raut";
  const currentSession: "morning" | "evening" = draft.currentSession || "morning";

  // Check if user wants to switch session (e.g. "evening" or "morning")
  if (cleanInput.includes("even") || cleanInput.includes("sham") || cleanInput.includes("shaam") || cleanInput.includes("sandhya")) {
    return await showAvailableSlotsForSession(dateStr, docName, "evening", draft, context);
  }
  if (cleanInput.includes("morn") || cleanInput.includes("subah") || cleanInput.includes("sakal")) {
    return await showAvailableSlotsForSession(dateStr, docName, "morning", draft, context);
  }

  const slotData = await getAvailableSlots(dateStr, docName);
  const slotsList: DetailedSlot[] = currentSession === "morning" ? slotData.morningSlots : slotData.eveningSlots;

  // Check if selected via "slot_X" or numeric index e.g. "1", "2"
  const slotMatch = cleanInput.match(/^slot_(\d+)$/i);
  const numIndex = slotMatch ? parseInt(slotMatch[1], 10) : parseInt(cleanInput, 10);

  let matchedDetailed: DetailedSlot | undefined;
  if (!isNaN(numIndex) && numIndex >= 1 && numIndex <= slotsList.length) {
    matchedDetailed = slotsList[numIndex - 1];
  }

  // Fallback: match by time text e.g. "10:30", "10:30 am", "6:15", "10:30 - 10:45"
  if (!matchedDetailed) {
    const timeMatch = cleanInput.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2];
      const meridiem = timeMatch[3]?.toLowerCase();
      if (meridiem === "pm" && h < 12) h += 12;
      if (meridiem === "am" && h === 12) h = 0;
      const targetTime = `${String(h).padStart(2, "0")}:${m}`;

      matchedDetailed = slotsList.find((s) => s.slot === targetTime) ||
        [...slotData.morningSlots, ...slotData.eveningSlots].find((s) => s.slot === targetTime);
    }
  }

  if (!matchedDetailed) {
    return {
      text: inLanguage(
        lang,
        `⚠️ Please reply with a valid slot number (e.g. *1*, *2*...) or tap "Choose Slot" below:`,
        `⚠️ कृपया सही स्लॉट नंबर भेजें (जैसे *1*, *2*...) या नीचे "समय चुनें" पर टैप करें:`,
        `⚠️ कृपया योग्य वेळेचा नंबर पाठवा (उदा. *1*, *2*...) किंवा खाली "वेळ निवडा" वर टॅप करा:`
      ),
      nextStep: "BOOKING_SELECT_SLOT",
    };
  }

  // Check if slot is already booked
  if (matchedDetailed.isBooked) {
    const slotView = await showAvailableSlotsForSession(
      dateStr,
      docName,
      matchedDetailed.period || currentSession,
      draft,
      context
    );
    const alertPrefix = inLanguage(
      lang,
      `⚠️ *${matchedDetailed.display}* is already booked (Booked 🚫).\n\nPlease choose from the remaining available slots below:\n\n`,
      `⚠️ *${matchedDetailed.display}* पहले से बुक हो चुका है (Booked 🚫)।\n\nकृपया नीचे दिए गए उपलब्ध स्लॉट में से चुनें:\n\n`,
      `⚠️ *${matchedDetailed.display}* ही वेळ आधीच बुक झाली आहे (Booked 🚫).\n\nकृपया खालील उपलब्ध वेळेमधून एक वेळ निवडा:\n\n`
    );
    return {
      ...slotView,
      text: alertPrefix + slotView.text,
    };
  }

  // Slot successfully selected!
  draft.slot = matchedDetailed.display;
  draft.slotTime = matchedDetailed.slot;

  // Proceed to patient identification / registration
  return await proceedToPatientRegistration(dateStr, docName, draft, context);
}

async function handleBookingSelectProfile(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const draft = context.bookingDraft || {};
  const cleanInput = userText.trim();
  const lower = cleanInput.toLowerCase();

  const profiles = await findPatientsByPhone(context.phoneNumber);
  const availableProfiles =
    draft.isSecondBooking && draft.previousPatientName
      ? profiles.filter(
          (p) =>
            p.name.toLowerCase().trim() !==
            String(draft.previousPatientName).toLowerCase().trim()
        )
      : profiles;

  // Check if user selected "Someone Else / New"
  const newOptionNum = Math.min(availableProfiles.length, 3) + 1;
  const isNewSelected =
    lower === "profile_new" ||
    lower === String(newOptionNum) ||
    lower.includes("someone else") ||
    lower.includes("other") ||
    lower.includes("new") ||
    lower.includes("अन्य") ||
    lower.includes("नया") ||
    lower.includes("इतर") ||
    lower.includes("नवीन") ||
    lower.includes("sister") ||
    lower.includes("brother") ||
    lower.includes("mother") ||
    lower.includes("father") ||
    lower.includes("बहीण") ||
    lower.includes("बहन");

  if (isNewSelected) {
    // Check if user typed a specific name with relationship, e.g. "my sister Priya" or "sister Priya"
    let candidateName = "";
    const relMatch = cleanInput.match(/(?:sister|brother|mother|father|बहीण|भाऊ|आई|वडील|बहन|भाई|माता|पिता)\s+([A-Za-z\u0900-\u097F\s]+)/i);
    if (relMatch && relMatch[1].trim().length >= 2) {
      candidateName = relMatch[1].trim();
    }

    if (candidateName) {
      draft.patientName = candidateName;
      return {
        text: inLanguage(
          lang,
          `Booking for *${candidateName}*.\n\n👉 *What is ${candidateName}'s age in years? (e.g. 24):*`,
          `*${candidateName}* के लिए अपॉइंटमेंट।\n\n👉 *${candidateName} की उम्र (आयु) कितने वर्ष है? (जैसे 24):*`,
          `*${candidateName}* यांच्यासाठी अपॉइंटमेंट.\n\n👉 *${candidateName} यांचे वय किती वर्षे आहे? (उदा. 24):*`
        ),
        nextStep: "REGISTER_AGE",
        updatedContext: {
          bookingDraft: draft,
          patientId: undefined,
          patientReference: undefined,
          patientName: candidateName,
        },
      };
    }

    return {
      text: inLanguage(
        lang,
        `👉 *Please enter the patient's full name (e.g. Priya Tikhe):*`,
        `👉 *कृपया मरीज का पूरा नाम लिखें (जैसे प्रिया तिखे):*`,
        `👉 *कृपया रुग्णाचे पूर्ण नाव लिहा (उदा. प्रिया तिखे):*`
      ),
      nextStep: "REGISTER_NAME",
      updatedContext: {
        bookingDraft: draft,
        patientId: undefined,
        patientReference: undefined,
        patientName: undefined,
      },
    };
  }

  // Check if selected by index (1, 2...)
  let selectedProfile: PatientRecord | undefined;
  const numIndex = parseInt(cleanInput, 10);
  if (!isNaN(numIndex) && numIndex >= 1 && numIndex <= availableProfiles.length) {
    selectedProfile = availableProfiles[numIndex - 1];
  } else if (lower.startsWith("profile_")) {
    const pIdx = parseInt(lower.replace("profile_", ""), 10);
    if (!isNaN(pIdx) && pIdx >= 1 && pIdx <= availableProfiles.length) {
      selectedProfile = availableProfiles[pIdx - 1];
    }
  }

  // Check if matched by name (e.g. "Nityom", "myself", "me")
  if (!selectedProfile) {
    if (lower === "myself" || lower === "me" || lower === "self" || lower === "खुद" || lower === "स्वयं" || lower === "स्वतः") {
      selectedProfile = availableProfiles[0];
    } else {
      selectedProfile = availableProfiles.find(
        (p) => p.name.toLowerCase() === lower || p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase())
      );
    }
  }

  if (selectedProfile) {
    draft.patientName = selectedProfile.name;
    draft.patientPhone = selectedProfile.phone_number;
    draft.patientAge = selectedProfile.age;
    draft.sex = selectedProfile.sex;
    draft.patientAddress = selectedProfile.address;

    // If address is already saved, book immediately without asking anything!
    if (selectedProfile.address) {
      return await executeBookingCreation(draft, context, {
        name: selectedProfile.name,
        reference_number: selectedProfile.reference_number,
      });
    }

    // Address missing on profile -> ask once
    return {
      text: inLanguage(
        lang,
        `Profile selected: *${selectedProfile.name}* (${selectedProfile.age || "N/A"} yrs, ${selectedProfile.sex}).\n\n👉 *Please enter ${selectedProfile.name}'s residential address / city or village (e.g. Wardha):*`,
        `मरीज चुना गया: *${selectedProfile.name}* (${selectedProfile.age || "N/A"} वर्ष, ${selectedProfile.sex === "Female" ? "महिला" : "पुरुष"})।\n\n👉 *कृपया ${selectedProfile.name} का शहर या गांव (पता) लिखें (जैसे वर्धा):*`,
        `रुग्ण निवडला: *${selectedProfile.name}* (${selectedProfile.age || "N/A"} वर्षे, ${selectedProfile.sex === "Female" ? "महिला" : "पुरुष"}).\n\n👉 *कृपया ${selectedProfile.name} यांचे शहर किंवा गाव (पत्ता) लिहा (उदा. वर्धा):*`
      ),
      nextStep: "REGISTER_ADDRESS",
      updatedContext: {
        bookingDraft: draft,
        patientId: selectedProfile._id,
        patientReference: selectedProfile.reference_number,
        patientName: selectedProfile.name,
      },
    };
  }

  // Not matched to existing profile -> Treat userText as a new patient's name!
  if (cleanInput.length >= 2) {
    draft.patientName = cleanInput;
    return {
      text: inLanguage(
        lang,
        `Thank you, *${cleanInput}*.\n\n👉 *What is the patient's age in years? (e.g. 24):*`,
        `धन्यवाद, *${cleanInput}*।\n\n👉 *मरीज की उम्र (आयु) कितने वर्ष है? (जैसे 24):*`,
        `धन्यवाद, *${cleanInput}*.\n\n👉 *रुग्णाचे वय किती वर्षे आहे? (उदा. 24):*`
      ),
      nextStep: "REGISTER_AGE",
      updatedContext: {
        bookingDraft: draft,
        patientId: undefined,
        patientReference: undefined,
        patientName: cleanInput,
      },
    };
  }

  return {
    text: inLanguage(
      lang,
      `Please select a valid option from the list or write the patient's name:`,
      `कृपया सूची में से सही विकल्प चुनें या मरीज का नाम लिखें:`,
      `कृपया यादीतील योग्य पर्याय निवडा किंवा रुग्णाचे नाव लिहा:`
    ),
    nextStep: "BOOKING_SELECT_PROFILE",
  };
}

async function handleRegisterName(userText: string, context: AgentContext): Promise<AgentResponse> {
  const lang = context.language || "en";
  const name = userText.trim();
  if (name.length < 2) {
    return {
      text: inLanguage(
        lang,
        "Please provide a valid patient name (at least 2 letters):",
        "कृपया मरीज का सही नाम लिखें (कम से कम 2 अक्षर):",
        "कृपया रुग्णाचे योग्य नाव लिहा (किमान 2 अक्षरे):"
      ),
      nextStep: "REGISTER_NAME",
    };
  }

  // Check if this name matches an existing profile under this number
  const profiles = await findPatientsByPhone(context.phoneNumber);
  const matched = profiles.find(
    (p) => p.name.toLowerCase() === name.toLowerCase() || p.name.toLowerCase().includes(name.toLowerCase())
  );

  if (matched && matched.address && matched.age) {
    // Already saved!
    const draft = {
      ...(context.bookingDraft || {}),
      patientName: matched.name,
      patientPhone: matched.phone_number,
      patientAge: matched.age,
      sex: matched.sex,
      patientAddress: matched.address,
    };
    return await executeBookingCreation(draft, context, {
      name: matched.name,
      reference_number: matched.reference_number,
    });
  }

  const draft = { ...(context.bookingDraft || {}), patientName: name };
  return {
    text: inLanguage(
      lang,
      `Thank you, *${name}*.\n\n👉 *What is the patient's age in years? (e.g. 28):*`,
      `धन्यवाद, *${name}*।\n\n👉 *मरीज की उम्र (आयु) कितने वर्ष है? (जैसे 28):*`,
      `धन्यवाद, *${name}*.\n\n👉 *रुग्णाचे वय किती वर्षे आहे? (उदा. 28):*`
    ),
    nextStep: "REGISTER_AGE",
    updatedContext: { bookingDraft: draft },
  };
}

async function handleRegisterAge(userText: string, context: AgentContext): Promise<AgentResponse> {
  const lang = context.language || "en";
  const ageMatch = userText.match(/\d+/);
  if (!ageMatch) {
    return {
      text: inLanguage(
        lang,
        "Please enter the patient's age in numbers (e.g. 28):",
        "कृपया मरीज की आयु केवल अंकों में लिखें (जैसे 28):",
        "कृपया रुग्णाचे वय आकड्यांमध्ये सांगा (उदा. 28):"
      ),
      nextStep: "REGISTER_AGE",
    };
  }

  const ageStr = ageMatch[0];
  const draft = { ...(context.bookingDraft || {}), patientAge: ageStr };

  // If gender is not yet known, ask gender next
  if (!draft.sex) {
    return {
      text: inLanguage(
        lang,
        `Age recorded: *${ageStr} years*.\n\n👉 *Please select the patient's gender:*`,
        `आयु दर्ज की गई: *${ageStr} वर्ष*।\n\n👉 *कृपया मरीज का लिंग चुनें:*`,
        `वय नोंदवले: *${ageStr} वर्षे*.\n\n👉 *कृपया रुग्णाचे लिंग निवडा:*`
      ),
      nextStep: "REGISTER_SEX",
      updatedContext: { bookingDraft: draft },
      interactive: {
        kind: "buttons",
        body: inLanguage(lang, "Select Gender:", "लिंग चुनें:", "लिंग निवडा:"),
        buttons: [
          { id: "sex_1", title: inLanguage(lang, "1. Male", "1. पुरुष", "1. पुरुष") },
          { id: "sex_2", title: inLanguage(lang, "2. Female", "2. महिला", "2. महिला") },
          { id: "sex_3", title: inLanguage(lang, "3. Other", "3. अन्य", "3. इतर") },
        ],
      },
    };
  }

  // Gender already known (e.g. registered patient): Ask patient address next!
  return {
    text: inLanguage(
      lang,
      `Age recorded: *${ageStr} years*.\n\n👉 *Please enter the patient's residential address / city or village (e.g. Wardha, Samudrapur, Hinganghat):*`,
      `आयु दर्ज की गई: *${ageStr} वर्ष*।\n\n👉 *कृपया मरीज का शहर या गांव (पता) लिखें (जैसे वर्धा, समुद्रपुर, हिंगणघाट):*`,
      `वय नोंदवले: *${ageStr} वर्षे*.\n\n👉 *कृपया रुग्णाचे शहर किंवा गाव (पत्ता) लिहा (उदा. वर्धा, समुद्रपूर, हिंगणघाट):*`
    ),
    nextStep: "REGISTER_ADDRESS",
    updatedContext: { bookingDraft: draft },
  };
}

async function handleRegisterSex(userText: string, context: AgentContext): Promise<AgentResponse> {
  const lang = context.language || "en";
  let sex: "Male" | "Female" | "Other" = "Male";
  const clean = userText.toLowerCase().trim();

  if (clean === "2" || clean === "sex_2" || clean.startsWith("f") || clean.includes("female") || clean.includes("स्त्री") || clean.includes("महिला")) {
    sex = "Female";
  } else if (clean === "3" || clean === "sex_3" || clean.startsWith("o") || clean.includes("other") || clean.includes("इतर") || clean.includes("अन्य")) {
    sex = "Other";
  }

  const draft = { ...(context.bookingDraft || {}), sex };
  return {
    text: inLanguage(
      lang,
      `Gender: *${sex}*.\n\n👉 *Please enter the patient's residential address / city or village (e.g. Wardha, Samudrapur, Hinganghat):*`,
      `लिंग: *${sex === "Female" ? "महिला" : sex === "Other" ? "अन्य" : "पुरुष"}*।\n\n👉 *कृपया मरीज का शहर या गांव (पता) लिखें (जैसे वर्धा, समुद्रपुर, हिंगणघाट):*`,
      `लिंग: *${sex === "Female" ? "महिला" : sex === "Other" ? "इतर" : "पुरुष"}*.\n\n👉 *कृपया रुग्णाचे शहर किंवा गाव (पत्ता) लिहा (उदा. वर्धा, समुद्रपूर, हिंगणघाट):*`
    ),
    nextStep: "REGISTER_ADDRESS",
    updatedContext: { bookingDraft: draft },
  };
}

async function handleRegisterAddress(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const address = userText.trim() || "Wardha";
  const draft = { ...(context.bookingDraft || {}), patientAddress: address };

  // 1. Create patient in Cortex PMS if not already registered, or update address if existing
  let createdPatientRef = context.patientReference;
  const isExistingSamePatient = Boolean(
    context.patientId &&
    context.patientName &&
    draft.patientName &&
    context.patientName.toLowerCase().trim() === draft.patientName.toLowerCase().trim()
  );

  try {
    if (isExistingSamePatient) {
      await updatePatient(context.patientId!, { address });
    } else {
      const regRes = await createPatient({
        name: draft.patientName || "Patient",
        age: draft.patientAge || "30",
        sex: draft.sex || "Male",
        phone_number: context.phoneNumber,
        address,
        whatsapp_number: context.phoneNumber,
      });
      createdPatientRef = regRes.reference_number;
    }
  } catch (err) {
    console.warn("[Cortex PMS] Patient registration/update non-fatal error:", err);
  }

  // 2. If user was booking an appointment, complete the booking
  if (draft.date && draft.slot) {
    return await executeBookingCreation(draft, context, {
      name: draft.patientName || context.patientName || "Patient",
      reference_number: createdPatientRef,
    });
  }

  // 3. Otherwise, confirm new family profile creation
  const lang = context.language || "en";
  return {
    text: inLanguage(
      lang,
      `✅ *Family Member Profile Registered!*\n━━━━━━━━━━━━━━━━━━━━━\n👤 *Name:* ${draft.patientName}\n🎂 *Age:* ${draft.patientAge || "N/A"} yrs (${draft.sex || "Male"})\n🏠 *Address:* ${address}\n🆔 *UHID / Ref:* \`${createdPatientRef || "CRX"}\`\n\nHow would you like to proceed for *${draft.patientName}*?\n1️⃣ Book an Appointment\n2️⃣ View Appointments\n3️⃣ Main Menu`,
      `✅ *नया परिजन प्रोफ़ाइल दर्ज हो गया!*\n━━━━━━━━━━━━━━━━━━━━━\n👤 *नाम:* ${draft.patientName}\n🎂 *उम्र:* ${draft.patientAge || "N/A"} वर्ष (${draft.sex === "Female" ? "महिला" : "पुरुष"})\n🏠 *पता:* ${address}\n🆔 *UHID / Ref:* \`${createdPatientRef || "CRX"}\`\n\n*${draft.patientName}* के लिए आप क्या करना चाहते हैं?\n1️⃣ अपॉइंटमेंट बुक करें\n2️⃣ अपॉइंटमेंट देखें\n3️⃣ मुख्य मेनू`,
      `✅ *नवीन कुटुंब सदस्य प्रोफाइल नोंदवले गेले!*\n━━━━━━━━━━━━━━━━━━━━━\n👤 *नाव:* ${draft.patientName}\n🎂 *वय:* ${draft.patientAge || "N/A"} वर्षे (${draft.sex === "Female" ? "महिला" : "पुरुष"})\n🏠 *पत्ता:* ${address}\n🆔 *UHID / Ref:* \`${createdPatientRef || "CRX"}\`\n\n*${draft.patientName}* यांच्यासाठी आपण काय करू इच्छिता?\n1️⃣ अपॉइंटमेंट बुक करा\n2️⃣ अपॉइंटमेंट्स पहा\n3️⃣ मुख्य मेनू`
    ),
    nextStep: "IDLE",
    updatedContext: {
      bookingDraft: undefined,
      patientName: draft.patientName,
      patientReference: createdPatientRef,
    },
  };
}

async function executeBookingCreation(
  draft: Record<string, any>,
  context: AgentContext,
  patientInfo?: { name?: string; reference_number?: string }
): Promise<AgentResponse> {
  const lang = context.language || "en";

  try {
    const chosenDoctor = draft.doctorName || "Dr. Vipeen Raut";
    const tokenNumber = await calculateNextDailyToken(chosenDoctor, draft.date);

    const appointmentId = await bookAppointment({
      name: draft.patientName || patientInfo?.name || "Patient",
      phone: context.phoneNumber,
      age: draft.patientAge,
      address: draft.patientAddress || "Wardha",
      date: draft.date,
      time: draft.slotTime || (draft.slot ? draft.slot.slice(0, 5) : "10:30"),
      doctor_name: chosenDoctor,
      duration_minutes: 15,
      dental_problem: draft.specialty || "Consultation",
      notes: `Booked via WhatsApp Assistant | Token: #${tokenNumber} | Slot: ${draft.slot || "10:30 AM – 10:45 AM"} | UHID: ${patientInfo?.reference_number || "New"}`,
    });

    // Auto-sync into Cortex PMS OPD Queue with generated daily token
    try {
      await upsertOpdQueueItem({
        id: `appointment_${appointmentId}`,
        token: tokenNumber,
        uhid: patientInfo?.reference_number || "CRX0001",
        patientId: (patientInfo as any)?._id,
        appointmentId,
        name: draft.patientName || patientInfo?.name || "Patient",
        age: draft.patientAge || "—",
        sex: (draft.sex as any) || "Male",
        phone: context.phoneNumber,
        address: draft.patientAddress || "Wardha",
        doctor: chosenDoctor,
        department: draft.specialty,
        priority: "Normal",
        visitType: "Appointment",
        status: "Waiting",
        registeredAt: `${draft.date}T${draft.slotTime || "10:30"}:00.000Z`,
        time: draft.slotTime || "10:30",
      });
    } catch (queueErr) {
      console.warn("[Cortex PMS] Could not auto-sync to opd_queue:", queueErr);
    }

    const patientDisplay = `${draft.patientName || patientInfo?.name || "Patient"}${
      patientInfo?.reference_number ? ` (${patientInfo.reference_number})` : ""
    }`;
    const dateDmy = formatDisplayDate(draft.date);
    const slotDisplay = draft.slot || "10:30 AM – 10:45 AM";

    const confirmationText = inLanguage(
      lang,
      `✅ *APPOINTMENT CONFIRMED!* 🎉
━━━━━━━━━━━━━━━━━━━━━
🏥 *Cortex Hospital, Wardha*
🎫 *OPD Token:* #${tokenNumber}
🆔 *Appointment ID:* \`${appointmentId.slice(-8).toUpperCase()}\`
👤 *Patient:* ${patientDisplay}
🎂 *Age:* ${draft.patientAge || "N/A"} years
📱 *Phone:* ${context.phoneNumber}
🏠 *Patient Address:* ${draft.patientAddress || "Wardha"}
👨‍⚕️ *Doctor:* ${chosenDoctor}
📅 *Date:* ${dateDmy}
⏰ *Time Slot:* ${slotDisplay}
📍 *Hospital Location:* Aarti Chowk, Nagpur Road, Wardha

*Instructions for Patient:*
• OPD Timings: Mon–Sat 10:30 AM – 1:00 PM & 6:00 PM – 7:30 PM (Sunday Closed).
• Bring any previous prescriptions, X-rays, or medical reports.
• Hospital reception: 07152-255795.

Your health matters to us. We look forward to serving you! ❤️`,

      `✅ *अपॉइंटमेंट पक्की हो गई!* 🎉
━━━━━━━━━━━━━━━━━━━━━
🏥 *Cortex Hospital, वर्धा*
🎫 *ओपीडी टोकन नंबर:* #${tokenNumber}
🆔 *अपॉइंटमेंट ID:* \`${appointmentId.slice(-8).toUpperCase()}\`
👤 *मरीज:* ${patientDisplay}
🎂 *उम्र:* ${draft.patientAge || "N/A"} वर्ष
📱 *मोबाइल:* ${context.phoneNumber}
🏠 *मरीज का पता:* ${draft.patientAddress || "वर्धा"}
👨‍⚕️ *डॉक्टर:* ${chosenDoctor}
📅 *तारीख:* ${dateDmy}
⏰ *समय:* ${slotDisplay}
📍 *अस्पताल का पता:* आरती चौक, नागपुर रोड, वर्धा

*मरीज के लिए निर्देश:*
• ओपीडी समय: सोमवार से शनिवार सुबह 10:30 से 1:00 एवं शाम 6:00 से 7:30 (रविवार बंद)।
• अपने पुराने पर्चे, एक्स-रे या रिपोर्ट साथ लाएं।
• अस्पताल रिसेप्शन: 07152-255795।

आपका स्वास्थ्य हमारी सर्वोच्च प्राथमिकता है। ❤️`,

      `✅ *अपॉइंटमेंट निश्चित झाली!* 🎉
━━━━━━━━━━━━━━━━━━━━━
🏥 *Cortex Hospital, वर्धा*
🎫 *ओपीडी टोकन क्रमांक:* #${tokenNumber}
🆔 *अपॉइंटमेंट ID:* \`${appointmentId.slice(-8).toUpperCase()}\`
👤 *रुग्ण:* ${patientDisplay}
🎂 *वय:* ${draft.patientAge || "N/A"} वर्षे
📱 *मोबाइल:* ${context.phoneNumber}
🏠 *रुग्णाचा पत्ता:* ${draft.patientAddress || "वर्धा"}
👨‍⚕️ *डॉक्टर:* ${chosenDoctor}
📅 *तारीख:* ${dateDmy}
⏰ *वेळ:* ${slotDisplay}
📍 *हॉस्पिटलचा पत्ता:* आरती चौक, नागपूर रोड, वर्धा

*रुग्णासाठी सूचना:*
• ओपीडी वेळ: सोमवार ते शनिवार सकाळी 10:30 ते 1:00 आणि संध्याकाळी 6:00 ते 7:30 (रविवार बंद).
• जुनी औषधांची कागदपत्रे, एक्स-रे किंवा रिपोर्ट सोबत आणा.
• हॉस्पिटल रिसेप्शन: 07152-255795.

आपले आरोग्य आमची प्राथमिकता आहे। ❤️`
    );

    const followupPrompt = inLanguage(
      lang,
      `👥 Need to book an appointment for another family member or second patient?`,
      `👥 क्या आप परिवार के किसी अन्य सदस्य या दूसरे मरीज के लिए भी अपॉइंटमेंट बुक करना चाहते हैं?`,
      `👥 आपण कुटुंबातील दुसऱ्या व्यक्तीसाठी अपॉइंटमेंट बुक करू इच्छिता का?`
    );

    // P0-5: Schedule 1-Hour Reminder & P0-1: Log Audit Event
    try {
      const convex = getCortexConvexClient();
      await convex.mutation(api.reminders.scheduleReminder, {
        appointmentId,
        phoneNumber: context.phoneNumber,
        patientName: draft.patientName || patientInfo?.name || "Patient",
        doctorName: chosenDoctor,
        date: draft.date,
        time: draft.slot || slotDisplay,
        slotTime: draft.slotTime || "10:30",
        token: `#${tokenNumber}`,
      });

      await convex.mutation(api.audit.logAuditEvent, {
        eventType: "APPOINTMENT_BOOKED",
        phoneNumber: context.phoneNumber,
        patientName: draft.patientName || patientInfo?.name || "Patient",
        details: `Booked appointment ${appointmentId} with ${chosenDoctor} on ${dateDmy} at ${slotDisplay} (Token: #${tokenNumber})`,
        metadata: { appointmentId, doctor: chosenDoctor, date: draft.date, slot: slotDisplay, token: `#${tokenNumber}` },
      });
    } catch (schedErr) {
      console.warn("[Reminder/Audit Error]", schedErr);
    }

    return {
      text: confirmationText,
      nextStep: "IDLE",
      interactive: {
        kind: "buttons",
        body: followupPrompt,
        buttons: [
          {
            id: "book_another_member",
            title: inLanguage(lang, "➕ Book 2nd Person", "➕ दूसरा मरीज जोड़ें", "➕ आणखी एक व्यक्ती"),
          },
          {
            id: "menu_2",
            title: inLanguage(lang, "📅 View Appointments", "📅 अपॉइंटमेंट देखें", "📅 अपॉइंटमेंट्स पहा"),
          },
          {
            id: "menu_start",
            title: inLanguage(lang, "🏠 Main Menu", "🏠 मुख्य मेनू", "🏠 मुख्य मेनू"),
          },
        ],
      },
      updatedContext: {
        bookingDraft: undefined,
        lastBookedDoctor: draft.doctorName,
        lastBookedDate: draft.date,
        lastBookedPatientName: draft.patientName || patientInfo?.name,
        patientName: undefined,
        patientReference: undefined,
        patientId: undefined,
      },
      nativeLocation: {
        latitude: CORTEX_HOSPITAL_CONFIG.coordinates.latitude,
        longitude: CORTEX_HOSPITAL_CONFIG.coordinates.longitude,
        name: CORTEX_HOSPITAL_CONFIG.name,
        address: CORTEX_HOSPITAL_CONFIG.address.fullFormatted,
      },
    };
  } catch (err: any) {
    console.error("[Cortex PMS] Booking execution error:", err);

    const isAlreadyBooked =
      err?.message === "SLOT_ALREADY_BOOKED" ||
      String(err?.message || "").toLowerCase().includes("already booked");

    if (isAlreadyBooked && draft.date) {
      const session: "morning" | "evening" =
        draft.currentSession === "evening" ||
        (draft.slotTime && parseInt(draft.slotTime.split(":")[0], 10) >= 16)
          ? "evening"
          : "morning";

      const slotView = await showAvailableSlotsForSession(
        draft.date,
        draft.doctorName || "Dr. Vipeen Raut",
        session,
        draft,
        context
      );

      const alertPrefix = inLanguage(
        lang,
        `⚠️ *The slot (${draft.slot || "selected time"}) is already booked.*\nAnother patient just reserved this time. Please choose from the remaining available slots below:\n\n`,
        `⚠️ *यह समय (${draft.slot || "चुना गया स्लॉट"}) पहले ही बुक हो चुका है।*\nकिसी अन्य मरीज ने यह समय आरक्षित कर लिया है। कृपया नीचे दिए गए उपलब्ध स्लॉट में से चुनें:\n\n`,
        `⚠️ *ही वेळ (${draft.slot || "निवडलेली वेळ"}) आधीच आरक्षित झाली आहे.*\nकृपया खाली दिलेल्या उपलब्ध वेळेमधून एक वेळ निवडा:\n\n`
      );

      return {
        ...slotView,
        text: alertPrefix + slotView.text,
      };
    }

    return {
      text: inLanguage(
        lang,
        `⚠️ *We could not complete your booking at this moment.*\nPlease reply with another time slot or contact hospital reception at *07152-255795*.`,
        `⚠️ *तकनीकी समस्या के कारण अपॉइंटमेंट बुक नहीं हो सकी।*\nकृपया दूसरा स्लॉट चुनें या अस्पताल रिसेप्शन *07152-255795* पर संपर्क करें।`,
        `⚠️ *काही कारणास्तव अपॉइंटमेंट पूर्ण होऊ शकली नाही.*\nकृपया दुसरी वेळ निवडा किंवा हॉस्पिटल रिसेप्शनशी *07152-255795* वर संपर्क साधा.`
      ),
      nextStep: "BOOKING_SELECT_SLOT",
      updatedContext: {
        bookingDraft: draft,
      },
    };
  }
}

/* =========================================================================
   FAMILY PROFILE HELPER
   ========================================================================= */

function matchProfileFromInput(
  cleanInput: string,
  profiles: PatientRecord[]
): PatientRecord | undefined {
  const lower = cleanInput.toLowerCase().trim();

  // 1. Numeric index e.g. "1", "2"
  const numIndex = parseInt(cleanInput, 10);
  if (!isNaN(numIndex) && numIndex >= 1 && numIndex <= profiles.length) {
    return profiles[numIndex - 1];
  }

  // 2. Button IDs like "profile_1", "rx_profile_1", "appt_profile_1", etc.
  const btnMatch = lower.match(/(?:profile|rx_profile|appt_profile|bill_profile|followup_profile|manage_profile)_(\d+)/);
  if (btnMatch) {
    const pIdx = parseInt(btnMatch[1], 10);
    if (!isNaN(pIdx) && pIdx >= 1 && pIdx <= profiles.length) {
      return profiles[pIdx - 1];
    }
  }

  // 3. Self aliases
  if (
    lower === "myself" ||
    lower === "me" ||
    lower === "self" ||
    lower === "खुद" ||
    lower === "स्वयं" ||
    lower === "स्वतः"
  ) {
    return profiles[0];
  }

  // 4. Match by name or UHID
  return profiles.find((p) => {
    const pName = (p.name || "").toLowerCase();
    const pRef = (p.reference_number || "").toLowerCase();
    return (
      pName === lower ||
      pName.includes(lower) ||
      lower.includes(pName) ||
      pRef === lower ||
      (pRef && lower.includes(pRef))
    );
  });
}

/* =========================================================================
   P0-3: RESCHEDULE APPOINTMENT FLOW
   ========================================================================= */

async function handleRescheduleRequest(
  phoneNumber: string,
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const appts = await getPatientAppointments(phoneNumber, context.patientName, context.patientReference);
  const activeAppts = appts.filter((a) => a.status !== "CANCELLED");

  if (activeAppts.length === 0) {
    return {
      text: inLanguage(
        lang,
        "⚠️ You don't have any active appointments to reschedule.\n\nReply *1* to Book an Appointment.",
        "⚠️ आपके पास पुनर्निर्धारित (reschedule) करने के लिए कोई सक्रिय अपॉइंटमेंट नहीं है।\n\nअपॉइंटमेंट बुक करने के लिए *1* भेजें।",
        "⚠️ आपल्याकडे बदलण्यासाठी कोणतीही सक्रिय अपॉइंटमेंट नाही.\n\nनवीन अपॉइंटमेंट बुक करण्यासाठी *1* पाठवा."
      ),
      nextStep: "IDLE",
      interactive: {
        kind: "buttons",
        body: "Choose an option:",
        buttons: [
          { id: "menu_1", title: "🏥 Book Slot" },
          { id: "menu_start", title: "🏠 Main Menu" },
        ],
      },
    };
  }

  const target = activeAppts[0];
  const nextDates = getNextAvailableDates();

  const rescheduleDraft = {
    appointmentId: target._id,
    doctorName: target.doctor_name,
    specialty: target.doctor_name?.includes("Shillpa") ? "Gynecology" : "Orthopaedics",
    date: target.date,
    time: target.time,
    patientName: target.name,
  };

  return {
    text: inLanguage(
      lang,
      `🔄 *Reschedule Appointment*\n👤 *Patient:* ${target.name}\n👨‍⚕️ *Doctor:* ${target.doctor_name}\n📅 *Current Slot:* ${formatDisplayDate(target.date || "")} at ${target.time}\n\nPlease select your *new appointment date* below:`,
      `🔄 *अपॉइंटमेंट की तारीख बदलें*\n👤 *मरीज:* ${target.name}\n👨‍⚕️ *डॉक्टर:* ${target.doctor_name}\n📅 *वर्तमान समय:* ${formatDisplayDate(target.date || "")} को ${target.time}\n\nकृपया नीचे से *नई तारीख* चुनें:`,
      `🔄 *अपॉइंटमेंटची तारीख बदला*\n👤 *रुग्ण:* ${target.name}\n👨‍⚕️ *डॉक्टर:* ${target.doctor_name}\n📅 *सध्याची वेळ:* ${formatDisplayDate(target.date || "")} रोजी ${target.time}\n\nकृपया खालीलपैकी *नवीन तारीख* निवडा:`
    ),
    nextStep: "RESCHEDULE_SELECT_DATE",
    updatedContext: {
      rescheduleDraft,
    },
    interactive: {
      kind: "buttons",
      body: inLanguage(lang, "Select New Date:", "नई तारीख चुनें:", "नवीन तारीख निवडा:"),
      buttons: nextDates.map((d, idx) => ({
        id: `date_${idx + 1}`,
        title: inLanguage(lang, d.labelEn, d.labelHi, d.labelMr).slice(0, 20),
      })),
    },
  };
}

async function handleRescheduleSelectDate(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const parsedDate = parseDateInput(userText);
  const draft = context.rescheduleDraft;

  if (!parsedDate || !draft) {
    const nextDates = getNextAvailableDates();
    return {
      text: inLanguage(
        lang,
        "Please select a valid new date below (or enter DD/MM/YY):",
        "कृपया नीचे नई तारीख चुनें (या DD/MM/YY लिखें):",
        "कृपया खाली नवीन तारीख निवडा (किंवा DD/MM/YY लिहा):"
      ),
      nextStep: "RESCHEDULE_SELECT_DATE",
      interactive: {
        kind: "buttons",
        body: inLanguage(lang, "Select New Date:", "नई तारीख चुनें:", "नवीन तारीख निवडा:"),
        buttons: nextDates.map((d, idx) => ({
          id: `date_${idx + 1}`,
          title: inLanguage(lang, d.labelEn, d.labelHi, d.labelMr).slice(0, 20),
        })),
      },
    };
  }

  const updatedDraft = {
    ...draft,
    date: parsedDate,
  };

  const slotView = await showAvailableSlotsForSession(
    parsedDate,
    draft.doctorName || "Dr. Vipeen Raut",
    "morning",
    updatedDraft,
    context
  );

  return {
    ...slotView,
    nextStep: "RESCHEDULE_SELECT_SLOT",
    updatedContext: {
      ...slotView.updatedContext,
      rescheduleDraft: updatedDraft,
    },
  };
}

async function handleRescheduleSelectSlot(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const draft = context.rescheduleDraft;
  if (!draft || !draft.appointmentId || !draft.date) {
    return {
      text: "Unable to find appointment to reschedule. Please type *Menu*.",
      nextStep: "IDLE",
    };
  }

  const dateStr = draft.date;
  const docName = draft.doctorName || "Dr. Vipeen Raut";
  const slotData = await getAvailableSlots(dateStr, docName);
  const cleanInput = userText.toLowerCase().trim();

  const slotsList = slotData.morningSlots.concat(slotData.eveningSlots);
  const slotMatch = cleanInput.match(/^slot_(\d+)$/i);
  const numIndex = slotMatch ? parseInt(slotMatch[1], 10) : parseInt(cleanInput, 10);

  let chosenSlot: DetailedSlot | undefined;
  if (!isNaN(numIndex) && numIndex >= 1 && numIndex <= slotsList.length) {
    chosenSlot = slotsList[numIndex - 1];
  } else {
    chosenSlot = slotsList.find((s) => cleanInput.includes(s.slot.toLowerCase()));
  }

  const newTime = chosenSlot ? chosenSlot.display : userText;
  const ok = await rescheduleAppointment(draft.appointmentId, dateStr, newTime);
  const newDateDmy = formatDisplayDate(dateStr);

  if (ok) {
    // Schedule / Update reminder 1 hour before new slot & log audit
    try {
      const convex = getCortexConvexClient();
      await convex.mutation(api.reminders.scheduleReminder, {
        appointmentId: draft.appointmentId,
        phoneNumber: context.phoneNumber,
        patientName: draft.patientName || "Patient",
        doctorName: docName,
        date: dateStr,
        time: newTime,
        slotTime: chosenSlot ? chosenSlot.slot : "10:30",
      });

      await convex.mutation(api.audit.logAuditEvent, {
        eventType: "APPOINTMENT_RESCHEDULED",
        phoneNumber: context.phoneNumber,
        patientName: draft.patientName || "Patient",
        details: `Rescheduled appointment ${draft.appointmentId} to ${newDateDmy} at ${newTime}`,
        metadata: { appointmentId: draft.appointmentId, newDate: dateStr, newTime },
      });
    } catch (e) {
      console.warn("[Reschedule Audit Error]", e);
    }

    return {
      text: inLanguage(
        lang,
        `✅ *APPOINTMENT RESCHEDULED!* 🎉\n━━━━━━━━━━━━━━━━━━━━━\n👤 *Patient:* ${draft.patientName || "Patient"}\n👨‍⚕️ *Doctor:* ${docName}\n📅 *New Date:* ${newDateDmy}\n⏰ *New Time:* ${newTime}\n📍 *Location:* Cortex Hospital, Aarti Chowk, Wardha\n\n⏰ *Reminder:* A WhatsApp reminder has been set 1 hour before your new slot.`,
        `✅ *अपॉइंटमेंट सफलतापूर्वक बदल दी गई!* 🎉\n━━━━━━━━━━━━━━━━━━━━━\n👤 *मरीज:* ${draft.patientName || "मरीज"}\n👨‍⚕️ *डॉक्टर:* ${docName}\n📅 *नई तारीख:* ${newDateDmy}\n⏰ *नया समय:* ${newTime}\n📍 *स्थान:* Cortex Hospital, आरती चौक, वर्धा\n\n⏰ *रिमाइंडर:* नए समय से 1 घंटे पहले WhatsApp रिमाइंडर सेट कर दिया गया है।`,
        `✅ *अपॉइंटमेंट यशस्वीरीत्या बदलण्यात आली!* 🎉\n━━━━━━━━━━━━━━━━━━━━━\n👤 *रुग्ण:* ${draft.patientName || "रुग्ण"}\n👨‍⚕️ *डॉक्टर:* ${docName}\n📅 *नवीन तारीख:* ${newDateDmy}\n⏰ *नवीन वेळ:* ${newTime}\n📍 *ठिकाण:* Cortex Hospital, आरती चौक, वर्धा\n\n⏰ *स्मरणपत्र:* नवीन वेळेच्या 1 तास आधी WhatsApp रिमाइंडर सेट केले आहे.`
      ),
      nextStep: "IDLE",
      updatedContext: {
        rescheduleDraft: undefined,
      },
      interactive: {
        kind: "buttons",
        body: "What would you like to do next?",
        buttons: [
          { id: "menu_2", title: "📅 View Appointments" },
          { id: "menu_queue", title: "📊 Live OPD Queue" },
          { id: "menu_start", title: "🏠 Main Menu" },
        ],
      },
    };
  }

  return {
    text: inLanguage(
      lang,
      "⚠️ Unable to reschedule at this time. Please try another slot or call reception 07152-255795.",
      "⚠️ अपॉइंटमेंट बदलने में समस्या आई। कृपया दूसरा समय चुनें या 07152-255795 पर कॉल करें।",
      "⚠️ अपॉइंटमेंट बदलण्यात त्रुटी आली. कृपया दुसरी वेळ निवडा किंवा 07152-255795 वर संपर्क साधा."
    ),
    nextStep: "IDLE",
  };
}

/* =========================================================================
   P0-4: QR CHECK-IN & TOKEN FLOW
   ========================================================================= */

async function handleQrCheckIn(
  phoneNumber: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const now = new Date();
  const todayStr = formatDate(now);
  const appts = await getPatientAppointments(phoneNumber, context.patientName, context.patientReference);
  const todayAppt = appts.find(
    (a) => (a.date === todayStr || a.status === "CONFIRMED") && a.status !== "CANCELLED"
  );

  const docName = todayAppt?.doctor_name || context.lastBookedDoctor || "Dr. Vipeen Raut";
  const patientName = todayAppt?.name || context.patientName || "Patient";
  const token = await calculateNextDailyToken(docName, todayStr);

  try {
    await upsertOpdQueueItem({
      id: todayAppt?._id || `Q-${phoneNumber.slice(-4)}-${Date.now()}`,
      patientId: todayAppt?._id || `PAT-${phoneNumber.slice(-4)}`,
      name: patientName,
      age: "N/A",
      sex: "Other",
      phone: phoneNumber,
      token,
      doctor: docName,
      status: "ARRIVED",
    });

    const convex = getCortexConvexClient();
    await convex.mutation(api.audit.logAuditEvent, {
      eventType: "QR_CHECKIN",
      phoneNumber,
      patientName,
      details: `Patient checked in via QR / WhatsApp: Token ${token} with ${docName}`,
      metadata: { token, doctor: docName },
    });
  } catch (err) {
    console.warn("[QR Checkin Sync Error]", err);
  }

  const queue = await fetchLiveOpdQueue({ date: todayStr, doctor: docName });
  const waitingPatients = queue.filter((q) => q.status === "ARRIVED" || q.status === "WAITING");
  const inConsultation = queue.find((q) => q.status === "IN_CONSULTATION");
  const servingToken = inConsultation?.token ? `#${inConsultation.token}` : "#1";
  const myPos = waitingPatients.findIndex((q) => q.phone && isPhoneMatch(q.phone, phoneNumber)) + 1;
  const aheadCount = myPos > 1 ? myPos - 1 : 0;
  const estWait = aheadCount > 0 ? aheadCount * 12 : 5;

  return {
    text: inLanguage(
      lang,
      `✅ *OPD CHECK-IN SUCCESSFUL!* 🏥\n━━━━━━━━━━━━━━━━━━━━━\n👤 *Patient:* ${patientName}\n👨‍⚕️ *Consulting:* ${docName}\n🎫 *Your OPD Token:* *#${token}*\n\n📊 *Live Queue Status:*\n🟢 *Currently Consulting:* Token ${servingToken}\n⏳ *Patients Ahead of You:* ${aheadCount}\n⏱️ *Estimated Wait Time:* ~${estWait} mins\n📍 *Room:* OPD Consultation Room 1, Ground Floor\n\n_Please be seated in the patient waiting area. Your token will be announced on the display board._`,
      `✅ *OPD चेक-इन सफल!* 🏥\n━━━━━━━━━━━━━━━━━━━━━\n👤 *मरीज:* ${patientName}\n👨‍⚕️ *डॉक्टर:* ${docName}\n🎫 *आपका टोकन नंबर:* *#${token}*\n\n📊 *लाइव कतार स्थिति:*\n🟢 *अभी चल रहा है:* टोकन ${servingToken}\n⏳ *आपसे आगे मरीज:* ${aheadCount}\n⏱️ *अनुमानित प्रतीक्षा समय:* ~${estWait} मिनट\n📍 *कक्ष:* OPD रूम 1, भूतल\n\n_कृपया प्रतीक्षा कक्ष में बैठें। टोकन नंबर डिस्प्ले बोर्ड पर दिखाया जाएगा।_`,
      `✅ *OPD चेक-इन यशस्वी!* 🏥\n━━━━━━━━━━━━━━━━━━━━━\n👤 *रुग्ण:* ${patientName}\n👨‍⚕️ *डॉक्टर:* ${docName}\n🎫 *आपला OPD टोकन नंबर:* *#${token}*\n\n📊 *थेट रांग स्थिती:*\n🟢 *सध्या तपासणी सुरू:* टोकन ${servingToken}\n⏳ *तुमच्या पुढे रुग्ण:* ${aheadCount}\n⏱️ *अंदाजे प्रतीक्षा वेळ:* ~${estWait} मिनिटे\n📍 *खोली:* OPD रूम 1, तळमजला\n\n_कृपया प्रतीक्षा कक्षात बसावे. आपला टोकन नंबर स्क्रीनवर दाखवला जाईल._`
    ),
    nextStep: "IDLE",
    interactive: {
      kind: "buttons",
      body: inLanguage(lang, "Live Queue Actions:", "कतार विकल्प:", "रांग पर्याय:"),
      buttons: [
        { id: "menu_queue", title: "🔄 Refresh Queue" },
        { id: "menu_8", title: "☎️ Talk to Reception" },
        { id: "menu_start", title: "🏠 Main Menu" },
      ],
    },
  };
}

/* =========================================================================
   P0-4: LIVE OPD QUEUE STATUS
   ========================================================================= */

async function handleLiveQueueStatus(
  phoneNumber: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const now = new Date();
  const todayStr = formatDate(now);
  const queue = await fetchLiveOpdQueue({ date: todayStr });

  const waitingCount = queue.filter((q) => q.status === "ARRIVED" || q.status === "WAITING").length;
  const inConsultation = queue.find((q) => q.status === "IN_CONSULTATION");
  const currentToken = inConsultation?.token ? `#${inConsultation.token}` : "#2";

  const patientItem = queue.find((q) => q.phone && isPhoneMatch(q.phone, phoneNumber));
  const myTokenInfo = patientItem
    ? `🎫 *Your Token:* #${patientItem.token} (Status: ${patientItem.status})`
    : `ℹ️ *Your Token:* Not checked in yet. (Type *Check in* when at hospital)`;

  return {
    text: inLanguage(
      lang,
      `📊 *CORTEX HOSPITAL – LIVE OPD QUEUE* 🏥\n━━━━━━━━━━━━━━━━━━━━━\n📅 *Today's OPD:* ${formatDisplayDate(todayStr)}\n\n🟢 *Now Consulting:* Token ${currentToken}\n⏳ *Total Patients Waiting:* ${waitingCount}\n⏱️ *Average Consultation Time:* ~10-15 mins per patient\n\n${myTokenInfo}\n\n👨‍⚕️ *Doctors on Duty:*\n• *Dr. Vipeen Raut* (Orthopaedics) – Available\n• *Dr. Shillpa Raut* (Gynecology) – Available`,
      `📊 *Cortex Hospital – लाइव OPD कतार स्थिति* 🏥\n━━━━━━━━━━━━━━━━━━━━━\n📅 *आज की OPD:* ${formatDisplayDate(todayStr)}\n\n🟢 *अभी चल रहा है:* टोकन ${currentToken}\n⏳ *प्रतीक्षारत मरीज:* ${waitingCount}\n⏱️ *औसत समय:* ~10-15 मिनट प्रति मरीज\n\n${myTokenInfo}\n\n👨‍⚕️ *उपस्थित डॉक्टर:*\n• *Dr. Vipeen Raut* (हड्डी रोग) – उपलब्ध\n• *Dr. Shillpa Raut* (स्त्री रोग) – उपलब्ध`,
      `📊 *Cortex Hospital – थेट OPD रांग स्थिती* 🏥\n━━━━━━━━━━━━━━━━━━━━━\n📅 *आजची OPD:* ${formatDisplayDate(todayStr)}\n\n🟢 *सध्या सुरू:* टोकन ${currentToken}\n⏳ *प्रतीक्षेत असलेले रुग्ण:* ${waitingCount}\n⏱️ *सरासरी वेळ:* ~10-15 मिनिटे प्रति रुग्ण\n\n${myTokenInfo}\n\n👨‍⚕️ *हजर डॉक्टर:*\n• *Dr. Vipeen Raut* (हाडे व सांधे) – उपलब्ध\n• *Dr. Shillpa Raut* (स्त्रीरोग) – उपलब्ध`
    ),
    nextStep: "IDLE",
    interactive: {
      kind: "buttons",
      body: inLanguage(lang, "Queue Options:", "कतार विकल्प:", "रांग पर्याय:"),
      buttons: [
        { id: "menu_checkin", title: "📍 QR Check-In" },
        { id: "menu_1", title: "🏥 Book Slot" },
        { id: "menu_start", title: "🏠 Main Menu" },
      ],
    },
  };
}

/* =========================================================================
   P0-5: DIGITAL HEALTH CONSENT & PRIVACY
   ========================================================================= */

async function handleConsentQuery(
  phoneNumber: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";

  try {
    const convex = getCortexConvexClient();
    await convex.mutation(api.audit.logAuditEvent, {
      eventType: "CONSENT_RECORDED",
      phoneNumber,
      patientName: context.patientName,
      details: "Patient acknowledged digital healthcare & WhatsApp communication consent",
    });
  } catch {}

  return {
    text: inLanguage(
      lang,
      `📋 *PATIENT CONSENT & DATA PRIVACY (ABDM)*\n━━━━━━━━━━━━━━━━━━━━━\n🏥 *Svaasth Connect – Cortex Hospital*\n\n✅ *Digital Healthcare Consent:*\nBy interacting with Svaasth Connect, you give informed consent to receive:\n1. 🎫 OPD tokens & appointment confirmations\n2. ⏰ 1-hour appointment reminders\n3. 💊 Official signed digital prescriptions & lab reports\n4. 🧾 Billing estimates & payment receipts\n\n🔒 *Privacy & Security:*\n• Your health data is strictly encrypted and shared only with consulting doctors and authorized hospital staff.\n• We adhere to the Telemedicine Practice Guidelines and Digital Personal Data Protection (DPDP) Act.\n\nType *Menu* to return to the main services.`,
      `📋 *डिजिटल स्वास्थ्य सहमति और डेटा गोपनीयता (ABDM)*\n━━━━━━━━━━━━━━━━━━━━━\n🏥 *Svaasth Connect – Cortex Hospital*\n\n✅ *सहमति विवरण:*\nSvaasth Connect का उपयोग करने पर आप WhatsApp पर निम्नलिखित प्राप्त करने की सहमति देते हैं:\n1. 🎫 OPD टोकन और अपॉइंटमेंट रसीद\n2. ⏰ 1 घंटे पूर्व अपॉइंटमेंट रिमाइंडर\n3. 💊 डिजिटल प्रिस्क्रिप्शन और जांच रिपोर्ट\n4. 🧾 बिलिंग विवरण और रसीद\n\n🔒 *डेटा सुरक्षा:*\nआपका डेटा पूरी तरह सुरक्षित है और केवल अधिकृत डॉक्टरों के साथ साझा किया जाता है।\n\nवापस जाने के लिए *Menu* लिखें।`,
      `📋 *रुग्ण संमती आणि डेटा गोपनीयता (ABDM)*\n━━━━━━━━━━━━━━━━━━━━━\n🏥 *Svaasth Connect – Cortex Hospital*\n\n✅ *डिजिटल संमती तपशील:*\nSvaasth Connect वापरताना आपण WhatsApp वर खालील गोष्टी मिळवण्यास संमती देता:\n1. 🎫 OPD टोकन आणि अपॉइंटमेंट पावती\n2. ⏰ 1 तास आधी अपॉइंटमेंट रिमाइंडर\n3. 💊 डिजिटल प्रिस्क्रिप्शन आणि रिपोर्ट्स\n4. 🧾 बिलिंग तपशील\n\n🔒 *सुरक्षा:*\nआपली माहिती पूर्णपणे सुरक्षित असून फक्त तपासणी करणाऱ्या डॉक्टरांकडेच उपलब्ध असते.\n\nमुख्य मेनूसाठी *Menu* पाठवा.`
    ),
    nextStep: "IDLE",
    updatedContext: {
      consentGranted: true,
    },
    interactive: {
      kind: "buttons",
      body: "Choose an option:",
      buttons: [
        { id: "menu_1", title: "🏥 Book Appointment" },
        { id: "menu_start", title: "🏠 Main Menu" },
      ],
    },
  };
}

/* =========================================================================
   MY APPOINTMENTS (Section 2) – Multi-Profile Enabled
   ========================================================================= */

async function handleMyAppointments(
  phoneNumber: string,
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const profiles = await findPatientsByPhone(phoneNumber);

  // If multiple patient profiles exist under this phone number, ask whose appointments to view
  if (profiles.length > 1) {
    const listLines = profiles
      .slice(0, 4)
      .map(
        (p, idx) =>
          `*${idx + 1}️⃣ ${p.name}* (${p.reference_number || "CRX"}, ${p.age || "N/A"} yrs)`
      )
      .join("\n");
    const allOptionNum = Math.min(profiles.length, 4) + 1;
    const newOptionNum = allOptionNum + 1;

    const buttons = profiles.slice(0, 2).map((p, idx) => ({
      id: `appt_profile_${idx + 1}`,
      title: `${idx + 1}. ${p.name.slice(0, 16)}`,
    }));
    buttons.push({
      id: "appt_profile_all",
      title: inLanguage(lang, `${allOptionNum}. All Patients`, `${allOptionNum}. सभी मरीज`, `${allOptionNum}. सर्व रुग्ण`),
    });

    return {
      text: inLanguage(
        lang,
        "📋 *View Appointments*\nPlease select a patient profile below:",
        "📋 *अपॉइंटमेंट देखें*\nकृपया नीचे मरीज चुनें:",
        "📋 *अपॉइंटमेंट्स पहा*\nकृपया खालील रुग्ण निवडा:"
      ),
      nextStep: "VIEW_APPOINTMENTS_SELECT_PROFILE",
      interactive: {
        kind: "buttons",
        body: inLanguage(lang, "Select patient profile:", "मरीज चुनें:", "रुग्ण निवडा:"),
        buttons,
      },
    };
  }

  // 1 or 0 profiles: Show directly
  const pName = profiles[0]?.name;
  const pRef = profiles[0]?.reference_number;
  return await displayAppointmentsForPatient(phoneNumber, pName, pRef, userText, context);
}

async function handleAppointmentsSelectProfile(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const profiles = await findPatientsByPhone(context.phoneNumber);
  const cleanInput = userText.trim();
  const lower = cleanInput.toLowerCase();

  const allOptionNum = Math.min(profiles.length, 4) + 1;
  const newOptionNum = allOptionNum + 1;

  if (
    lower === "appt_profile_all" ||
    lower === String(allOptionNum) ||
    lower.includes("all") ||
    lower.includes("सभी") ||
    lower.includes("सर्व")
  ) {
    return await displayAppointmentsForPatient(context.phoneNumber, undefined, undefined, userText, context);
  }

  if (
    lower === "appt_profile_new" ||
    lower === String(newOptionNum) ||
    lower.includes("someone else") ||
    lower.includes("other") ||
    lower.includes("new")
  ) {
    return await initiateAppointmentBooking("book", context);
  }

  const selected = matchProfileFromInput(cleanInput, profiles);
  if (selected) {
    return await displayAppointmentsForPatient(
      context.phoneNumber,
      selected.name,
      selected.reference_number,
      userText,
      context
    );
  }

  return {
    text: inLanguage(
      lang,
      "Please select a valid patient number from the list or write their name:",
      "कृपया सूची में से सही मरीज का नंबर चुनें या नाम लिखें:",
      "कृपया यादीतील योग्य रुग्णाचा नंबर निवडा किंवा नाव लिहा:"
    ),
    nextStep: "VIEW_APPOINTMENTS_SELECT_PROFILE",
  };
}

async function displayAppointmentsForPatient(
  phoneNumber: string,
  patientName?: string,
  patientReference?: string,
  userText?: string,
  context?: AgentContext
): Promise<AgentResponse> {
  const lang = context?.language || "en";
  const appts = await getPatientAppointments(phoneNumber, patientName, patientReference);

  if (appts.length === 0) {
    const targetLabel = patientName ? ` for *${patientName}*` : ` for +${phoneNumber}`;
    return {
      text: inLanguage(
        lang,
        `📅 No appointments found${targetLabel}.\n\nWould you like to schedule one now?\nReply *1* to Book an Appointment.\n_(Reply *Switch* to view another family member's records)_`,
        `📅${patientName ? ` *${patientName}* के लिए` : ""} कोई अपॉइंटमेंट दर्ज नहीं है।\n\nक्या आप अभी अपॉइंटमेंट बुक करना चाहते हैं?\nनया अपॉइंटमेंट बुक करने के लिए *1* भेजें।\n_(अन्य परिजन के लिए *Switch* लिखें)_`,
        `📅${patientName ? ` *${patientName}* यांच्यासाठी` : ""} कोणतीही अपॉइंटमेंट नोंदवलेली नाही.\n\nनवीन अपॉइंटमेंटसाठी *1* पाठवा.\n_(दुसऱ्या व्यक्तीसाठी *Switch* लिहा)_`
      ),
      nextStep: "IDLE",
    };
  }

  // Check if user wants to cancel an appointment
  if (
    userText &&
    (userText.toLowerCase().includes("cancel") || userText.toLowerCase() === "btn_cancel_appt")
  ) {
    const active = appts.find((a) => a.status !== "CANCELLED");
    if (active) {
      const ok = await cancelAppointment(active._id);
      if (ok) {
        try {
          const convex = getCortexConvexClient();
          await convex.mutation(api.reminders.cancelReminder, { appointmentId: active._id });
          await convex.mutation(api.audit.logAuditEvent, {
            eventType: "APPOINTMENT_CANCELLED",
            phoneNumber,
            patientName: active.name || patientName || "Patient",
            details: `Cancelled appointment ${active._id} with ${active.doctor_name}`,
            metadata: { appointmentId: active._id },
          });
        } catch (cErr) {
          console.warn("[Cancel Reminder Error]", cErr);
        }

        return {
          text: inLanguage(
            lang,
            `🚫 *Appointment Cancelled Successfully*\nAppointment for *${active.name || patientName || "Patient"}* on *${formatDisplayDate(active.date || "")} at ${active.time}* with *${active.doctor_name}* has been cancelled.\n\nReply *1* to book anytime.`,
            `🚫 *अपॉइंटमेंट सफलतापूर्वक रद्द की गई*\n*${active.name || patientName || "मरीज"}* की *${active.doctor_name}* के साथ *${formatDisplayDate(active.date || "")} को ${active.time}* की अपॉइंटमेंट रद्द कर दी गई है।\n\nपुनः बुक करने के लिए *1* भेजें।`,
            `🚫 *अपॉइंटमेंट यशस्वीरीत्या रद्द करण्यात आली*\n*${active.name || patientName || "रुग्ण"}* यांची *${active.doctor_name}* यांच्यासोबत *${formatDisplayDate(active.date || "")} रोजी ${active.time}* ची अपॉइंटमेंट रद्द झाली आहे.\n\nपुन्हा बुक करण्यासाठी *1* पाठवा.`
          ),
          nextStep: "IDLE",
          interactive: {
            kind: "buttons",
            body: "Choose an action:",
            buttons: [
              { id: "menu_1", title: "🏥 Book New Slot" },
              { id: "menu_start", title: "🏠 Main Menu" },
            ],
          },
        };
      }
    }
  }

  const apptList = appts
    .slice(0, 4)
    .map(
      (a, i) =>
        `*${i + 1}.* 👤 *${a.name || patientName || "Patient"}*\n   📅 *${formatDisplayDate(a.date || "")}* at *${a.time}*\n   👨‍⚕️ ${a.doctor_name || "Doctor"}\n   📊 ${inLanguage(lang, "Status", "स्थिति", "स्थिती")}: *${a.status || "CONFIRMED"}*\n   🆔 Ref: \`${a._id.slice(-6).toUpperCase()}\``
    )
    .join("\n\n");

  return {
    text: inLanguage(
      lang,
      `📋 *Appointments – Svaasth Connect:*\n━━━━━━━━━━━━━━━━━━━━━\n${apptList}\n\nPlease choose an action below:`,
      `📋 *Svaasth Connect में आपकी अपॉइंटमेंट:*\n━━━━━━━━━━━━━━━━━━━━━\n${apptList}\n\nकृपया नीचे विकल्प चुनें:`,
      `📋 *Svaasth Connect मधील अपॉइंटमेंट्स:*\n━━━━━━━━━━━━━━━━━━━━━\n${apptList}\n\nकृपया खालील पर्याय निवडा:`
    ),
    nextStep: "IDLE",
    interactive: {
      kind: "buttons",
      body: "Appointment Actions:",
      buttons: [
        { id: "btn_reschedule", title: "🔄 Reschedule" },
        { id: "btn_cancel_appt", title: "❌ Cancel" },
        { id: "btn_checkin", title: "📍 QR Check-In" },
      ],
    },
  };
}

/* =========================================================================
   PATIENT RECORD ACCESS (DIRECT ACCESS - NO OTP REQUIRED)
   ========================================================================= */

async function initiateSecureAccess(
  phoneNumber: string,
  context: AgentContext,
  action: "VIEW_PRESCRIPTION" | "VIEW_BILL" | "VIEW_LAB"
): Promise<AgentResponse> {
  if (action === "VIEW_PRESCRIPTION") return await handlePrescriptionQuery(phoneNumber, context);
  if (action === "VIEW_BILL") return await handleBillingQuery(phoneNumber, context);
  if (action === "VIEW_LAB") return await handleLabReportsQuery(phoneNumber, context);
  return await handlePrescriptionQuery(phoneNumber, context);
}

/* =========================================================================
   PRESCRIPTION MANAGEMENT (Section 4) – Multi-Profile Enabled
   ========================================================================= */

async function handlePrescriptionQuery(
  phoneNumber: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const profiles = await findPatientsByPhone(phoneNumber);

  // If multiple profiles exist under this phone, prompt which patient's prescription to view
  if (profiles.length > 1) {
    const listLines = profiles
      .slice(0, 4)
      .map(
        (p, idx) =>
          `*${idx + 1}️⃣ ${p.name}* (${p.reference_number || "CRX"}, ${p.age || "N/A"} yrs)`
      )
      .join("\n");
    const otherOptionNum = Math.min(profiles.length, 4) + 1;

    const buttons = profiles.slice(0, 3).map((p, idx) => ({
      id: `rx_profile_${idx + 1}`,
      title: `${idx + 1}. ${p.name.slice(0, 16)}`,
    }));

    return {
      text: inLanguage(
        lang,
        "💊 *View Prescription*\nPlease select a patient profile below:",
        "💊 *प्रिस्क्रिप्शन देखें*\nकृपया नीचे मरीज चुनें:",
        "💊 *प्रिस्क्रिप्शन पहा*\nकृपया खालील रुग्ण निवडा:"
      ),
      nextStep: "VIEW_PRESCRIPTION_SELECT_PROFILE",
      interactive: {
        kind: "buttons",
        body: inLanguage(lang, "Select patient profile:", "मरीज चुनें:", "रुग्ण निवडा:"),
        buttons,
      },
    };
  }

  // Single profile or none
  const pName = profiles[0]?.name;
  const pRef = profiles[0]?.reference_number;
  return await displayPrescriptionForPatient(phoneNumber, pName, pRef, context);
}

/**
 * Generates an expiring, HMAC-SHA256 signed URL for secure prescription access (Phase 0: Issue 5).
 */
export function generateSignedPrescriptionUrl(prescriptionId: string, phone: string): string {
  const secret = process.env.WHATSAPP_APP_SECRET || process.env.CORTEX_PRESCRIPTION_WEBHOOK_SECRET || "svaasth_rx_sec_2026";
  const expiresAt = Math.floor(Date.now() / 1000) + 86400 * 7; // 7 days expiry
  const data = `${prescriptionId}:${phone}:${expiresAt}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("hex").slice(0, 16);
  return `https://jovial-sheep-76.convex.site/print-prescription?id=${encodeURIComponent(prescriptionId)}&exp=${expiresAt}&sig=${sig}`;
}

async function handlePrescriptionSelectProfile(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const profiles = await findPatientsByPhone(context.phoneNumber);
  const cleanInput = userText.trim();

  const selected = matchProfileFromInput(cleanInput, profiles);
  if (selected) {
    return await displayPrescriptionForPatient(
      context.phoneNumber,
      selected.name,
      selected.reference_number,
      context
    );
  }

  // Phase 0: Issue 1 Security Guard - Refuse unauthenticated or stranger records
  return {
    text: inLanguage(
      lang,
      `🔒 *Patient Privacy & Confidentiality Notice:*\n\nUnder DPDP & healthcare privacy regulations, medical prescriptions can only be accessed for family profiles registered under this WhatsApp number (+${context.phoneNumber}).\n\nTo view prescriptions for another patient or hospital file, please visit the hospital reception or contact *07152-255795*.`,
      `🔒 *मरीज गोपनीयता एवं डेटा सुरक्षा सूचना:*\n\nDPDP व स्वास्थ्य डेटा नियमों के तहत, मेडिकल पर्चे केवल इस मोबाइल नंबर (+${context.phoneNumber}) से जुड़े मरीजों के ही देखे जा सकते हैं।\n\nअन्य मरीज या अस्पताल फाइल के लिए कृपया रिसेप्शन *07152-255795* से संपर्क करें।`,
      `🔒 *रुग्ण गोपनीयता व सुरक्षा सूचना:*\n\nDPDP आणि आरोग्य डेटा नियमांनुसार, वैद्यकीय प्रिस्क्रिप्शन फक्त या नोंदणीकृत मोबाइल नंबरशी (+${context.phoneNumber}) जोडलेल्या व्यक्तींसाठीच उपलब्ध आहेत.\n\nइतर फाइल किंवा रुग्णाच्या रेकॉर्डसाठी कृपया रिसेप्शन *07152-255795* शी संपर्क साधा.`
    ),
    nextStep: "IDLE",
    interactive: {
      kind: "buttons",
      body: "Choose an option:",
      buttons: [
        { id: "menu_8", title: inLanguage(lang, "👩‍💼 Talk to Reception", "👩‍💼 रिसेप्शन से बात करें", "👩‍💼 रिसेप्शनशी बोला") },
        { id: "menu_start", title: inLanguage(lang, "🏠 Main Menu", "🏠 मुख्य मेनू", "🏠 मुख्य मेनू") },
      ],
    },
  };
}

async function displayPrescriptionForPatient(
  phoneNumber: string,
  patientName?: string,
  patientReference?: string,
  context?: AgentContext
): Promise<AgentResponse> {
  const lang = context?.language || "en";
  const prescriptions = await getPatientPrescriptions(phoneNumber, patientName, patientReference);

  if (prescriptions.length === 0) {
    const targetLabel = patientName ? ` for *${patientName}*` : ` for registered number +${phoneNumber}`;
    return {
      text: inLanguage(
        lang,
        `💊 No prescriptions found on record${targetLabel}.\n\nReply *Switch* to check another family member or contact reception at *07152-255795*.`,
        `💊${patientName ? ` *${patientName}* के लिए` : ""} कोई डिजिटल पर्चा दर्ज नहीं है।\n\nअन्य परिजन के लिए *Switch* लिखें या रिसेप्शन *07152-255795* से संपर्क करें।`,
        `💊${patientName ? ` *${patientName}* यांच्यासाठी` : ""} कोणतेही प्रिस्क्रिप्शन सापडले नाही.\n\nदुसऱ्या व्यक्तीसाठी *Switch* लिहा किंवा रिसेप्शन *07152-255795* शी संपर्क साधा.`
      ),
      nextStep: "IDLE",
    };
  }

  const latest = prescriptions[0];
  const medsList =
    Array.isArray(latest.medicines) && latest.medicines.length > 0
      ? latest.medicines
          .map(
            (m, i) =>
              `  ${i + 1}. *${m.name}*\n     • ${inLanguage(lang, "Dose", "खुराक", "डोस")}: ${m.dosage || inLanguage(lang, "As directed", "डॉक्टर के निर्देशानुसार", "डॉक्टरांच्या सल्ल्यानुसार")} (${m.when || inLanguage(lang, "After food", "भोजन के बाद", "जेवणानंतर")})\n     • ${inLanguage(lang, "Duration", "अवधि", "कालावधी")}: ${m.duration || inLanguage(lang, "5 days", "5 दिन", "5 दिवस")}`
          )
          .join("\n")
      : inLanguage(lang, "No oral medicines recorded.", "कोई दवा दर्ज नहीं है।", "कोणतीही औषधे नोंदलेली नाहीत.");

  const signedUrl = generateSignedPrescriptionUrl(latest._id, phoneNumber);

  return {
    text: inLanguage(
      lang,
      `👤 *Patient:* ${latest.patient_name} (${latest.reference_number || "CRX"})\n👨‍⚕️ *Doctor:* ${latest.doctor_name || "Dr. Vipeen Raut"}\n📅 *Prescription Date:* ${formatDisplayDate(latest.prescription_date)}\n🩺 *Diagnosis:* ${latest.diagnosis || "Consultation"}\n\n📋 *Prescribed Medicines:*\n${medsList}\n\n📝 *Doctor's Advice:*\n${latest.advice || "Follow medication schedule."}\n\n🔔 *Next Follow-up:* ${latest.followup_date ? formatDisplayDate(latest.followup_date) : "As advised"}\n\n🔗 *View / Print Official Document:*\n${signedUrl}\n\n🔄 _Reply *Switch* to view prescription for another family member._`,

      `👤 *मरीज:* ${latest.patient_name} (${latest.reference_number || "CRX"})\n👨‍⚕️ *डॉक्टर:* ${latest.doctor_name || "Dr. Vipeen Raut"}\n📅 *तारीख:* ${formatDisplayDate(latest.prescription_date)}\n🩺 *निदान:* ${latest.diagnosis || "परामर्श"}\n\n📋 *दवाएं:*\n${medsList}\n\n📝 *सलाह:*\n${latest.advice || "दवा की समय सारणी का पालन करें।"}\n\n🔔 *अगली फ़ॉलो-अप:* ${latest.followup_date ? formatDisplayDate(latest.followup_date) : "डॉक्टर के निर्देशानुसार"}\n\n🔗 *पर्चा डाउनलोड लिंक:*\n${signedUrl}\n\n🔄 _अन्य परिजन का पर्चा देखने के लिए *Switch* लिखें।_`,

      `👤 *रुग्ण:* ${latest.patient_name} (${latest.reference_number || "CRX"})\n👨‍⚕️ *डॉक्टर:* ${latest.doctor_name || "Dr. Vipeen Raut"}\n📅 *तारीख:* ${formatDisplayDate(latest.prescription_date)}\n🩺 *निदान:* ${latest.diagnosis || "तपासणी"}\n\n📋 *औषधे:*\n${medsList}\n\n📝 *डॉक्टरांचा सल्ला:*\n${latest.advice || "औषधांचे वेळापत्रक पाळावे."}\n\n🔔 *पुढील भेट:* ${latest.followup_date ? formatDisplayDate(latest.followup_date) : "डॉक्टरांच्या सल्ल्यानुसार"}\n\n🔗 *प्रिस्क्रिप्शन डाउनलोड लिंक:*\n${signedUrl}\n\n🔄 _दुसऱ्या व्यक्तीचे प्रिस्क्रिप्शन पाहण्यासाठी *Switch* लिहा._`
    ),
    nextStep: "IDLE",
  };
}

/* =========================================================================
   BILLING & PAYMENTS (Section 5) – Multi-Profile Enabled
   ========================================================================= */

async function handleBillingQuery(
  phoneNumber: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const profiles = await findPatientsByPhone(phoneNumber);

  if (profiles.length > 1) {
    const listLines = profiles
      .slice(0, 4)
      .map(
        (p, idx) =>
          `*${idx + 1}️⃣ ${p.name}* (${p.reference_number || "CRX"})`
      )
      .join("\n");
    const allOptionNum = Math.min(profiles.length, 4) + 1;

    const buttons = profiles.slice(0, 2).map((p, idx) => ({
      id: `bill_profile_${idx + 1}`,
      title: `${idx + 1}. ${p.name.slice(0, 16)}`,
    }));
    buttons.push({
      id: "bill_profile_all",
      title: inLanguage(lang, `${allOptionNum}. Family Summary`, `${allOptionNum}. कुल बिल`, `${allOptionNum}. एकूण बिल`),
    });

    return {
      text: inLanguage(
        lang,
        "🧾 *Hospital Bills & Receipts*\nPlease select a patient profile below:",
        "🧾 *अस्पताल बिल और रसीद*\nकृपया नीचे मरीज चुनें:",
        "🧾 *हॉस्पिटल बिल आणि पावती*\nकृपया खालील रुग्ण निवडा:"
      ),
      nextStep: "VIEW_BILL_SELECT_PROFILE",
      interactive: {
        kind: "buttons",
        body: inLanguage(lang, "Select patient profile:", "मरीज चुनें:", "रुग्ण निवडा:"),
        buttons,
      },
    };
  }

  const pName = profiles[0]?.name;
  const pRef = profiles[0]?.reference_number;
  return await displayBillForPatient(phoneNumber, pName, pRef, context);
}

async function handleBillSelectProfile(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const profiles = await findPatientsByPhone(context.phoneNumber);
  const cleanInput = userText.trim();
  const lower = cleanInput.toLowerCase();
  const allOptionNum = Math.min(profiles.length, 4) + 1;

  if (
    lower === "bill_profile_all" ||
    lower === String(allOptionNum) ||
    lower.includes("all") ||
    lower.includes("कुल") ||
    lower.includes("एकूण")
  ) {
    return await displayBillForPatient(context.phoneNumber, undefined, undefined, context);
  }

  const selected = matchProfileFromInput(cleanInput, profiles);
  if (selected) {
    return await displayBillForPatient(
      context.phoneNumber,
      selected.name,
      selected.reference_number,
      context
    );
  }

  return {
    text: inLanguage(
      lang,
      "Please select a valid option from the list:",
      "कृपया सूची में से सही विकल्प चुनें:",
      "कृपया यादीतील योग्य पर्याय निवडा:"
    ),
    nextStep: "VIEW_BILL_SELECT_PROFILE",
  };
}

async function displayBillForPatient(
  phoneNumber: string,
  patientName?: string,
  patientReference?: string,
  context?: AgentContext
): Promise<AgentResponse> {
  const lang = context?.language || "en";
  const bills = await getPatientBills(phoneNumber, patientName, patientReference);

  if (bills.length === 0) {
    return {
      text: inLanguage(
        lang,
        `🧾 *Billing & Consultation Fees*\n\nNo pending hospital invoices found${patientName ? ` for *${patientName}*` : ""}.\n\n💰 *Consultation Fee Schedule:*\n• *Dr. Vipeen Raut* (Orthopaedics):\n  First Visit: ₹400 | Follow-up: ₹200 (within 10 days)\n\n• *Dr. Shillpa Raut* (Gynecology):\n  First Visit: ₹200 | Follow-up: ₹100 (within 10 days)\n\nPayment Modes:\n💳 UPI: \`cortexhospital@upi\`\n💵 Cash / Card at Hospital Reception Desk.\n\n🔄 _Reply *Switch* to view bills for another family member._`,
        `🧾 *बिल और परामर्श शुल्क*\n\n${patientName ? `*${patientName}* के लिए ` : ""}कोई बकाया बिल नहीं मिला।\n\n💰 *परामर्श शुल्क:*\n• *Dr. Vipeen Raut* (हड्डी रोग): ₹400 (पहला) / ₹200 (फ़ॉलो-अप)\n• *Dr. Shillpa Raut* (स्त्री रोग): ₹200 (पहला) / ₹100 (फ़ॉलो-अप)\n\nभुगतान माध्यम: \`cortexhospital@upi\` या अस्पताल काउंटर पर नकद/कार्ड।\n\n🔄 _अन्य परिजन के लिए *Switch* लिखें।_`,
        `🧾 *हॉस्पिटल बिल व सल्ला शुल्क*\n\n${patientName ? `*${patientName}* यांच्यासाठी ` : ""}कोणतेही प्रलंबित बिल नाही.\n\n💰 *सल्ला शुल्क:*\n• *Dr. Vipeen Raut* (हाडे व सांधे): ₹400 (पहिली भेट) / ₹200 (फॉलो-अप)\n• *Dr. Shillpa Raut* (स्त्रीरोग): ₹200 (पहिली भेट) / ₹100 (फॉलो-अप)\n\nपेमेंट: \`cortexhospital@upi\` किंवा हॉस्पिटल काउंंटरवर रोख/कार्ड.\n\n🔄 _दुसऱ्या व्यक्तीसाठी *Switch* लिहा._`
      ),
      nextStep: "IDLE",
    };
  }

  const latest = bills[0];
  const totalBalance = bills.reduce((sum, b) => sum + (b.balance_amount || 0), 0);

  return {
    text: inLanguage(
      lang,
      `🧾 *SVAASHTH HOSPITAL – BILL SUMMARY*\n━━━━━━━━━━━━━━━━━━━━━\n👤 *Patient:* ${latest.patient_name || patientName || "Patient"} (${latest.reference_number || "CRX"})\n📄 *Bill Number:* ${latest.bill_number || `CRX-INV-${latest._id.slice(-6).toUpperCase()}`}\n📊 *Status:* ${latest.payment_status === "PAID" ? "✅ FULLY PAID" : "⚠️ " + latest.payment_status}\n\n💰 *Total Amount:* ₹${latest.total_amount}\n💵 *Amount Paid:* ₹${latest.paid_amount}\n🔴 *Balance Due:* ₹${latest.balance_amount}\n\n${totalBalance > 0 ? "💳 UPI ID: `cortexhospital@upi`" : "All dues are cleared. Thank you!"}\n\n🔗 *Download Official Invoice:*\nhttps://cortexhospital.com/print-bill?billId=${latest._id}\n\n🔄 _Reply *Switch* to view bills for another family member._`,
      `🧾 *SVAASHTH HOSPITAL – बिल विवरण*\n━━━━━━━━━━━━━━━━━━━━━\n👤 *मरीज:* ${latest.patient_name || patientName || "Patient"} (${latest.reference_number || "CRX"})\n📄 *बिल नंबर:* ${latest.bill_number || `CRX-INV-${latest._id.slice(-6).toUpperCase()}`}\n📊 *स्थिति:* ${latest.payment_status === "PAID" ? "✅ पूर्ण भुगतान" : "⚠️ " + latest.payment_status}\n\n💰 *कुल राशि:* ₹${latest.total_amount}\n💵 *जमा राशि:* ₹${latest.paid_amount}\n🔴 *बकाया राशि:* ₹${latest.balance_amount}\n\n${totalBalance > 0 ? "💳 UPI: `cortexhospital@upi`" : "सभी बिल चुकता हैं। धन्यवाद!"}\n\n🔗 *बिल डाउनलोड लिंक:*\nhttps://cortexhospital.com/print-bill?billId=${latest._id}\n\n🔄 _अन्य परिजन के लिए *Switch* लिखें।_`,
      `🧾 *SVAASHTH HOSPITAL – बिल तपशील*\n━━━━━━━━━━━━━━━━━━━━━\n👤 *रुग्ण:* ${latest.patient_name || patientName || "Patient"} (${latest.reference_number || "CRX"})\n📄 *बिल क्रमांक:* ${latest.bill_number || `CRX-INV-${latest._id.slice(-6).toUpperCase()}`}\n📊 *स्थिती:* ${latest.payment_status === "PAID" ? "✅ पूर्ण भरले" : "⚠️ " + latest.payment_status}\n\n💰 *एकूण रक्कम:* ₹${latest.total_amount}\n💵 *भरलेली रक्कम:* ₹${latest.paid_amount}\n🔴 *बाकी रक्कम:* ₹${latest.balance_amount}\n\n${totalBalance > 0 ? "💳 UPI ID: `cortexhospital@upi`" : "सर्व बिल भरले आहे. धन्यवाद!"}\n\n🔗 *बिल डाउनलोड लिंक:*\nhttps://cortexhospital.com/print-bill?billId=${latest._id}\n\n🔄 _दुसऱ्या व्यक्तीसाठी *Switch* लिहा._`
    ),
    nextStep: "IDLE",
  };
}

/* =========================================================================
   FOLLOW-UP MANAGEMENT (Section 6) – Multi-Profile Enabled
   ========================================================================= */

async function handleFollowupQuery(
  phoneNumber: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const profiles = await findPatientsByPhone(phoneNumber);

  if (profiles.length > 1) {
    const listLines = profiles
      .slice(0, 4)
      .map(
        (p, idx) =>
          `*${idx + 1}️⃣ ${p.name}* (${p.reference_number || "CRX"})`
      )
      .join("\n");

    const buttons = profiles.slice(0, 3).map((p, idx) => ({
      id: `followup_profile_${idx + 1}`,
      title: `${idx + 1}. ${p.name.slice(0, 16)}`,
    }));

    return {
      text: inLanguage(
        lang,
        "🔔 *Follow-up Checkup*\nPlease select a patient profile below:",
        "🔔 *फ़ॉलो-अप जांच*\nकृपया नीचे मरीज चुनें:",
        "🔔 *फॉलो-अप तपासणी*\nकृपया खालील रुग्ण निवडा:"
      ),
      nextStep: "VIEW_FOLLOWUP_SELECT_PROFILE",
      interactive: {
        kind: "buttons",
        body: inLanguage(lang, "Select patient profile:", "मरीज चुनें:", "रुग्ण निवडा:"),
        buttons,
      },
    };
  }

  const pName = profiles[0]?.name;
  const pRef = profiles[0]?.reference_number;
  return await displayFollowupForPatient(phoneNumber, pName, pRef, context);
}

async function handleFollowupSelectProfile(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const profiles = await findPatientsByPhone(context.phoneNumber);
  const cleanInput = userText.trim();

  const selected = matchProfileFromInput(cleanInput, profiles);
  if (selected) {
    return await displayFollowupForPatient(
      context.phoneNumber,
      selected.name,
      selected.reference_number,
      context
    );
  }

  return {
    text: inLanguage(
      lang,
      "Please select a valid option from the list:",
      "कृपया सूची में से सही विकल्प चुनें:",
      "कृपया यादीतील योग्य पर्याय निवडा:"
    ),
    nextStep: "VIEW_FOLLOWUP_SELECT_PROFILE",
  };
}

async function displayFollowupForPatient(
  phoneNumber: string,
  patientName?: string,
  patientReference?: string,
  context?: AgentContext
): Promise<AgentResponse> {
  const lang = context?.language || "en";
  const followups = await getPatientFollowups(phoneNumber, patientName, patientReference);
  const prescriptions = await getPatientPrescriptions(phoneNumber, patientName, patientReference);

  let nextDate = "";
  let doctorName = "Dr. Vipeen Raut";
  let summary = "";

  if (followups.length > 0) {
    const f = followups[0];
    nextDate = f.next_followup_date || f.followup_date;
    doctorName = f.doctor_name || doctorName;
    summary = f.treatment_summary || "";
  } else if (prescriptions.length > 0 && prescriptions[0].followup_date) {
    nextDate = prescriptions[0].followup_date;
    doctorName = prescriptions[0].doctor_name || doctorName;
    summary = prescriptions[0].diagnosis || "";
  }

  if (!nextDate) {
    return {
      text: inLanguage(
        lang,
        `🔔 No upcoming scheduled follow-up was found on record${patientName ? ` for *${patientName}*` : ""}.\n\nReply *1* to Book an Appointment anytime.\n_(Reply *Switch* to check another family member)_`,
        `🔔 ${patientName ? `*${patientName}* के लिए ` : ""}कोई निर्धारित फ़ॉलो-अप नहीं मिला।\n\nअपॉइंटमेंट बुक करने के लिए *1* भेजें।\n_(अन्य परिजन के लिए *Switch* लिखें)_`,
        `🔔 ${patientName ? `*${patientName}* यांच्यासाठी ` : ""}कोणतीही पुढील तारीख नोंदवलेली नाही.\n\nअपॉइंटमेंट बुक करण्यासाठी *1* पाठवा.\n_(दुसऱ्या व्यक्तीसाठी *Switch* लिहा)_`
      ),
      nextStep: "IDLE",
    };
  }

  const nextDateDmy = formatDisplayDate(nextDate);

  return {
    text: inLanguage(
      lang,
      `🔔 *RECOMMENDED NEXT FOLLOW-UP*\n━━━━━━━━━━━━━━━━━━━━━\n👤 *Patient:* ${patientName || "Patient"}\n👨‍⚕️ *Doctor:* ${doctorName}\n📅 *Recommended Date:* ${nextDateDmy}\n📝 *Condition:* ${summary || "Routine Follow-up"}\n\n💡 Consultations within 10 days of your visit are charged at discounted follow-up rates.\n\nWould you like to book this follow-up slot for *${nextDateDmy}*?\nReply *1* to Book this Follow-up.\n_(Reply *Switch* to view another family member)_`,
      `🔔 *अगली अनुशंसित फ़ॉलो-अप तारीख*\n━━━━━━━━━━━━━━━━━━━━━\n👤 *मरीज:* ${patientName || "मरीज"}\n👨‍⚕️ *डॉक्टर:* ${doctorName}\n📅 *तारीख:* ${nextDateDmy}\n📝 *स्थिति:* ${summary || "नियमित फ़ॉलो-अप"}\n\n💡 10 दिनों के भीतर परामर्श पर रियायती दर लागू होती है।\n\nक्या आप *${nextDateDmy}* के लिए समय बुक करना चाहते हैं?\n*1* भेजें।\n_(अन्य परिजन के लिए *Switch* लिखें)_`,
      `🔔 *पुढील फॉलो-अप तारीख*\n━━━━━━━━━━━━━━━━━━━━━\n👤 *रुग्ण:* ${patientName || "रुग्ण"}\n👨‍⚕️ *डॉक्टर:* ${doctorName}\n📅 *तारीख:* ${nextDateDmy}\n📝 *तपासणी:* ${summary || "नियमित फॉलो-अप"}\n\n💡 10 दिवसांच्या आत तपासणी केल्यास कमी शुल्क आकारले जाते.\n\nआपण *${nextDateDmy}* साठी वेळ आरक्षित करू इच्छिता का?\n*1* पाठवा.\n_(दुसऱ्या व्यक्तीसाठी *Switch* लिहा)_`
    ),
    nextStep: "IDLE",
    updatedContext: {
      bookingDraft: {
        doctorName,
        date: nextDate,
        patientName,
      },
    },
  };
}

/* =========================================================================
   GLOBAL FAMILY PROFILE MANAGER (Switch / Add Member)
   ========================================================================= */

async function handleManageProfiles(
  phoneNumber: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const profiles = await findPatientsByPhone(phoneNumber);

  const listLines =
    profiles.length > 0
      ? profiles
          .slice(0, 4)
          .map(
            (p, idx) =>
              `*${idx + 1}️⃣ ${p.name}* (${p.reference_number || "CRX"}, ${p.age || "N/A"} yrs, ${p.sex})`
          )
          .join("\n")
      : inLanguage(lang, "No registered family members yet.", "अभी कोई सदस्य दर्ज नहीं है।", "अद्याप कोणीही सदस्य नोंदवलेला नाही.");

  const addOptionNum = profiles.length + 1;

  const buttons = profiles.slice(0, 2).map((p, idx) => ({
    id: `manage_profile_${idx + 1}`,
    title: `${idx + 1}. ${p.name.slice(0, 16)}`,
  }));
  buttons.push({
    id: "manage_profile_add",
    title: inLanguage(lang, `${addOptionNum}. + Add Person`, `${addOptionNum}. + नया परिजन`, `${addOptionNum}. + नवीन व्यक्ती`),
  });

  return {
    text: inLanguage(
      lang,
      `👤 *Family Profiles (+${phoneNumber})*\nPlease select a profile or add a new member below:`,
      `👤 *+${phoneNumber} से जुड़े परिजन*\nकृपया नीचे प्रोफाइल चुनें या नया सदस्य जोड़ें:`,
      `👤 *+${phoneNumber} शी जोडलेले कुटुंब सदस्य*\nकृपया खाली प्रोफाइल निवडा किंवा नवीन सदस्य जोडा:`
    ),
    nextStep: "MANAGE_PROFILES_ACTION",
    interactive: {
      kind: "buttons",
      body: inLanguage(lang, "Manage profiles:", "प्रोफाइल चुनें:", "प्रोफाइल निवडा:"),
      buttons,
    },
  };
}

async function handleManageProfilesAction(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const cleanInput = userText.trim();
  const lower = cleanInput.toLowerCase();
  const profiles = await findPatientsByPhone(context.phoneNumber);
  const addOptionNum = profiles.length + 1;

  if (
    lower === "manage_profile_add" ||
    lower === String(addOptionNum) ||
    lower.includes("add") ||
    lower.includes("new") ||
    lower.includes("जोड़") ||
    lower.includes("जोडा")
  ) {
    return {
      text: inLanguage(
        lang,
        `👉 *Please enter the new family member's full name (e.g. Suresh Ingole):*`,
        `👉 *कृपया नए परिजन का पूरा नाम लिखें (जैसे सुरेश इंगोले):*`,
        `👉 *कृपया नवीन सदस्याचे पूर्ण नाव लिहा (उदा. सुरेश इंगोले):*`
      ),
      nextStep: "REGISTER_NAME",
      updatedContext: {
        bookingDraft: undefined,
        patientName: undefined,
        patientId: undefined,
        patientReference: undefined,
      },
    };
  }

  const selected = matchProfileFromInput(cleanInput, profiles);
  if (selected) {
    return {
      text: inLanguage(
        lang,
        `✅ Selected profile: *${selected.name}* (${selected.reference_number || "CRX"})\n\nHow would you like to proceed for *${selected.name}*?\n1️⃣ 🏥 Book Appointment\n2️⃣ 📅 View Appointments\n3️⃣ 💊 View Digital Prescriptions\n4️⃣ 🧾 View Hospital Bills\n5️⃣ 🔔 Next Follow-up Checkup`,
        `✅ चुना गया मरीज: *${selected.name}* (${selected.reference_number || "CRX"})\n\n*${selected.name}* के लिए आप क्या देखना चाहते हैं?\n1️⃣ 🏥 अपॉइंटमेंट बुक करें\n2️⃣ 📅 अपॉइंटमेंट देखें\n3️⃣ 💊 डिजिटल पर्चा देखें\n4️⃣ 🧾 अस्पताल बिल देखें\n5️⃣ 🔔 अगली फ़ॉलो-अप जांच`,
        `✅ निवडलेला रुग्ण: *${selected.name}* (${selected.reference_number || "CRX"})\n\n*${selected.name}* यांच्यासाठी आपण काय करू इच्छिता?\n1️⃣ 🏥 अपॉइंटमेंट बुक करा\n2️⃣ 📅 अपॉइंटमेंट्स पहा\n3️⃣ 💊 डिजिटल प्रिस्क्रिप्शन पहा\n4️⃣ 🧾 हॉस्पिटल बिल पहा\n5️⃣ 🔔 पुढील फॉलो-अप तपासणी`
      ),
      nextStep: "IDLE",
      updatedContext: {
        patientName: selected.name,
        patientReference: selected.reference_number,
        patientId: selected._id,
      },
    };
  }

  return {
    text: inLanguage(lang, "Please choose a valid profile number:", "कृपया सही विकल्प चुनें:", "कृपया योग्य पर्याय निवडा:"),
    nextStep: "MANAGE_PROFILES_ACTION",
  };
}

/* =========================================================================
   DOCTOR AVAILABILITY (Section 7)
   ========================================================================= */

async function handleDoctorAvailabilityQuery(
  userText: string,
  context?: AgentContext
): Promise<AgentResponse> {
  const lang = context?.language || "en";
  const docs = await fetchDoctors();

  const docProfiles = docs
    .map(
      (d) =>
        `👨‍⚕️ *${d.name}*\n📜 ${d.degrees}\n🩺 *${inLanguage(lang, "Specialty", "विशेषज्ञता", "तज्ज्ञ")}:* ${d.specialty}\n⏰ *${inLanguage(lang, "Timings", "समय", "वेळ")}:* ${d.scheduleDescription}\n💰 *${inLanguage(lang, "Fees", "परामर्श शुल्क", "सल्ला शुल्क")}:* ₹${d.consultationFee.firstVisit} (${inLanguage(lang, "First Visit", "पहला", "पहिली भेट")}) | ₹${d.consultationFee.followupVisit} (${inLanguage(lang, "Follow-up", "फ़ॉलो-अप", "फॉलो-अप")})`
    )
    .join("\n\n");

  return {
    text: inLanguage(
      lang,
      `👨‍⚕️ *CORTEX HOSPITAL – SPECIALIST DOCTORS & OPD TIMINGS*\n━━━━━━━━━━━━━━━━━━━━━\n${docProfiles}\n\n⭐ *Special Clinic:*\n🦴 *HIP & KNEE JOINT CLINIC* – Every Thursday 6:00 PM to 8:00 PM\n\nReply *1* to book an appointment with any doctor!`,
      `👨‍⚕️ *CORTEX HOSPITAL – विशेषज्ञ डॉक्टर एवं OPD समय*\n━━━━━━━━━━━━━━━━━━━━━\n${docProfiles}\n\n⭐ *विशेष क्लिनिक:*\n🦴 *हिप एवं घुटना जोड़ क्लिनिक* – प्रत्येक गुरुवार शाम 6:00 से 8:00 बजे\n\nअपॉइंटमेंट बुक करने के लिए *1* भेजें!`,
      `👨‍⚕️ *CORTEX HOSPITAL – तज्ज्ञ डॉक्टर व OPD वेळ*\n━━━━━━━━━━━━━━━━━━━━━\n${docProfiles}\n\n⭐ *विशेष क्लिनिक:*\n🦴 *हिप व गुडघे सांधे क्लिनिक* – दर गुरुवारी संध्याकाळी 6:00 ते 8:00\n\nअपॉइंटमेंट बुक करण्यासाठी *1* पाठवा!`
    ),
    nextStep: "IDLE",
  };
}

/* =========================================================================
   HOSPITAL LOCATION & CONTACT (Section 7)
   ========================================================================= */

async function handleHospitalInfoQuery(
  userText: string,
  context?: AgentContext
): Promise<AgentResponse> {
  const lang = context?.language || "en";
  const conf = CORTEX_HOSPITAL_CONFIG;

  return {
    text: inLanguage(
      lang,
      `🏥 *CORTEX HOSPITAL, WARDHA*\n━━━━━━━━━━━━━━━━━━━━━\n📍 *Address:*\n${conf.address.fullFormatted}\n\n📞 *Telephone / Helplines:*\n• Reception: 07152-255795\n• Mobile / WhatsApp: +91 9373280505\n• Emergency 24/7 Casualty: +91 9373280505\n\n⏰ *OPD Working Hours:*\n• Monday to Saturday: 10:30 AM – 1:00 PM & 6:00 PM – 7:30 PM\n• Sunday: OPD Closed (Emergency Casualty 24/7 Open)\n\n🗺️ *Google Maps Link:*\nhttps://maps.google.com/?q=${conf.coordinates.latitude},${conf.coordinates.longitude}\n\nReply *1* to Book an Appointment or *8* to talk to Reception.`,
      `🏥 *CORTEX HOSPITAL, वर्धा*\n━━━━━━━━━━━━━━━━━━━━━\n📍 *पता:*\n${conf.address.fullFormatted}\n\n📞 *हेल्पलाइन नंबर:*\n• रिसेप्शन: 07152-255795\n• मोबाइल / WhatsApp: +91 9373280505\n• 24/7 आपातकालीन सेवा: +91 9373280505\n\n⏰ *OPD समय:*\n• सोमवार से शनिवार: सुबह 10:30 – दोपहर 1:00 व शाम 6:00 – शाम 7:30\n• रविवार: OPD बंद (आपातकालीन सेवा 24 घंटे चालू)\n\n🗺️ *गूगल मैप्स लिंक:*\nhttps://maps.google.com/?q=${conf.coordinates.latitude},${conf.coordinates.longitude}\n\nअपॉइंटमेंट बुक करने के लिए *1* भेजें या रिसेप्शन के लिए *8* भेजें।`,
      `🏥 *CORTEX HOSPITAL, वर्धा*\n━━━━━━━━━━━━━━━━━━━━━\n📍 *पत्ता:*\n${conf.address.fullFormatted}\n\n📞 *संपर्क क्रमांक:*\n• रिसेप्शन: 07152-255795\n• मोबाइल / WhatsApp: +91 9373280505\n• 24/7 आपत्कालीन सेवा: +91 9373280505\n\n⏰ *OPD वेळ:*\n• सोमवार ते शनिवार: सकाळी 10:30 ते दुपारी 1:00 आणि संध्याकाळी 6:00 ते 7:30\n• रविवार: OPD बंद (इमर्जन्सी 24 तास सुरू)\n\n🗺️ *गुगल मॅप्स लिंक:*\nhttps://maps.google.com/?q=${conf.coordinates.latitude},${conf.coordinates.longitude}\n\nअपॉइंटमेंटसाठी *1* पाठवा किंवा रिसेप्शनसाठी *8* पाठवा.`
    ),
    nativeLocation: {
      latitude: conf.coordinates.latitude,
      longitude: conf.coordinates.longitude,
      name: conf.name,
      address: conf.address.fullFormatted,
    },
    nextStep: "IDLE",
  };
}

/* =========================================================================
   LABORATORY REPORTS (Section 8)
   ========================================================================= */

async function handleLabReportsQuery(
  phoneNumber: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const investigations = await getPatientInvestigations(phoneNumber);

  if (investigations.length === 0) {
    return {
      text: inLanguage(
        lang,
        `🧪 *Laboratory & Radiology Reports*\n\nNo test reports found for +${phoneNumber}.\n\nHospital Diagnostic Facilities:\n• Digital X-Ray\n• Pathology & Blood Tests\n\nFor collected sample status, please contact the diagnostic lab counter at *07152-255795*.`,
        `🧪 *लैब एवं एक्स-रे रिपोर्ट*\n\n+${phoneNumber} के लिए कोई टेस्ट रिपोर्ट दर्ज नहीं है।\n\nउपलब्ध सुविधाएं:\n• डिजिटल एक्स-रे\n• पैथोलॉजी एवं रक्त जांच\n\nजांच रिपोर्ट की स्थिति के लिए लैब काउंटर *07152-255795* से संपर्क करें।`,
        `🧪 *लॅब व एक्स-रे रिपोर्ट*\n\n+${phoneNumber} या नंबरवर कोणतेही चाचणी अहवाल सापडले नाहीत.\n\nहॉस्पिटल तपासणी सुविधा:\n• डिजिटल एक्स-रे\n• पॅथॉलॉजी व रक्त चाचण्या\n\nरिपोर्टच्या स्थितीसाठी कृपया लॅब काउंंटर *07152-255795* शी संपर्क साधा.`
      ),
      nextStep: "IDLE",
    };
  }

  const reportsList = investigations
    .slice(0, 3)
    .map(
      (inv, idx) =>
        `*${idx + 1}.* 🧪 *${inv.investigation_type}*\n   📅 ${inLanguage(lang, "Date", "तारीख", "तारीख")}: ${formatDisplayDate(inv.investigation_date)}\n   👨‍⚕️ ${inLanguage(lang, "Doctor", "डॉक्टर", "डॉक्टर")}: ${inv.doctor_name || "Dr. Vipeen Raut"}\n   📝 ${inLanguage(lang, "Status", "स्थिति", "स्थिती")}: ${inv.findings ? "✅ Available at Reception Desk" : "⏳ In Processing"}`
    )
    .join("\n\n");

  return {
    text: inLanguage(
      lang,
      `🧪 *CORTEX HOSPITAL – LABORATORY REPORTS*\n━━━━━━━━━━━━━━━━━━━━━\n${reportsList}\n\n⚠️ *Medical Note:* Lab reports must be clinically interpreted by your treating doctor. Please do not self-medicate based on report values.`,
      `🧪 *CORTEX HOSPITAL – लैब रिपोर्ट*\n━━━━━━━━━━━━━━━━━━━━━\n${reportsList}\n\n⚠️ *महत्वपूर्ण:* लैब रिपोर्ट का विश्लेषण आपके विशेषज्ञ डॉक्टर द्वारा किया जाना अनिवार्य है। स्वयं दवा न लें।`,
      `🧪 *CORTEX HOSPITAL – लॅब रिपोर्ट*\n━━━━━━━━━━━━━━━━━━━━━\n${reportsList}\n\n⚠️ *महत्त्वाची सूचना:* चाचणी अहवालांची तपासणी डॉक्टरांकडून करून घेणे आवश्यक आहे. परस्पर औषधे घेऊ नयेत.`
    ),
    nextStep: "IDLE",
  };
}
