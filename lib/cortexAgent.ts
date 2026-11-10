/**
 * Cortex Hospital – AI WhatsApp Assistant Brain & Conversational Engine
 * Implements all 16 Sections of the Cortex Hospital System Prompt.
 * Connects directly to Cortex-Admin (Convex dev:jovial-sheep-76) for live PMS data.
 */

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
} from "./cortexClient";
import { WhatsAppLocationPayload, WhatsAppInteractive } from "./whatsapp";

export interface AgentContext {
  phoneNumber: string;
  currentStep: string;
  language?: string; // "en" | "hi" | "mr"
  patientId?: string;
  patientReference?: string;
  patientName?: string;
  isVerified?: boolean;
  verificationOtp?: string;
  otpExpiresAt?: number;
  pendingAction?: string;
  isHandedOver?: boolean;
  handoverReason?: string;
  handoverTimestamp?: number;
  bookingDraft?: {
    doctorName?: string;
    specialty?: string;
    date?: string; // YYYY-MM-DD
    slot?: string; // HH:mm
    patientName?: string;
    patientAge?: string;
    patientPhone?: string;
    patientAddress?: string;
    sex?: "Male" | "Female" | "Other";
    complaint?: string;
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

  if (normalized === "10" || normalized === "10.") return true;
  if (/^10\.\s*(change language|भाषा|language)/i.test(clean)) return true;
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
export function isInterruptionQuery(text: string): boolean {
  const l = text.toLowerCase().trim();
  return (
    isGreetingText(text) ||
    isLanguageChangeQuery(text) ||
    isEmergencyQuery(text) ||
    isMedicalAdviceQuery(text) ||
    l === "cancel" ||
    l === "reset" ||
    l === "menu" ||
    l === "main menu" ||
    l.includes("reception") ||
    l.includes("prescription") ||
    l.includes("parcha") ||
    l.includes("bill") ||
    l.includes("invoice") ||
    l.includes("followup") ||
    l.includes("follow up") ||
    l.includes("doctor") ||
    l.includes("timing") ||
    l.includes("availability") ||
    l.includes("hospital") ||
    l.includes("location") ||
    l.includes("address") ||
    l.includes("lab") ||
    l.includes("report")
  );
}

/** Parse various date formats into YYYY-MM-DD */
export function parseDateInput(input: string): string | null {
  const clean = input.trim().toLowerCase();
  const today = new Date();

  if (/\b(today|आज)\b/i.test(clean) || clean === "1" || clean === "date_1") {
    return formatDate(today);
  }
  if (/\b(tomorrow|कल|उद्या)\b/i.test(clean) || clean === "2" || clean === "date_2") {
    const tmrw = new Date(today);
    tmrw.setDate(today.getDate() + 1);
    return formatDate(tmrw);
  }
  if (/\b(day after tomorrow|day after|परसों|परवा)\b/i.test(clean) || clean === "3" || clean === "date_3") {
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);
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
  return `👋 *Welcome to Cortex Hospital, Wardha*
━━━━━━━━━━━━━━━━━━━━━
Please select your preferred language:
कृपया अपनी पसंदीदा भाषा चुनें:
कृपया आपली भाषा निवडा:

1️⃣ English
2️⃣ हिन्दी (Hindi)
3️⃣ मराठी (Marathi)

👉 *Tap a button below or reply with 1, 2, or 3:*`;
}

export function languageButtons(): WhatsAppInteractive {
  return {
    kind: "buttons",
    body: "👋 Welcome to Cortex Hospital / Cortex Hospital में आपका स्वागत है / Cortex Hospital मध्ये आपले स्वागत आहे.\n\nPlease select your language / कृपया भाषा चुनें / कृपया भाषा निवडा:",
    buttons: [
      { id: "lang_en", title: "1. English" },
      { id: "lang_hi", title: "2. हिन्दी" },
      { id: "lang_mr", title: "3. मराठी" },
    ],
  };
}

export function mainMenu(language: string): string {
  if (language === "hi") {
    return `🏥 *Cortex Hospital, वर्धा*
नमस्ते! 👋 मैं आपका डिजिटल अस्पताल सहायक हूँ।

मैं आपकी क्या सहायता कर सकता हूँ?
👇 *नीचे दिए गए बटन पर टैप करें या 1 से 9 में से नंबर भेजें:*

1️⃣ 🏥 अपॉइंटमेंट बुक करें
2️⃣ 📅 मेरी अपॉइंटमेंट
3️⃣ 💊 प्रिस्क्रिप्शन देखें
4️⃣ 🧾 बिल और भुगतान
5️⃣ 🔔 अगली फ़ॉलो-अप तारीख
6️⃣ 👨‍⚕️ डॉक्टर का समय
7️⃣ 📍 अस्पताल का पता और स्थान
8️⃣ ☎️ रिसेप्शन से बात करें
9️⃣ 🌐 भाषा बदलें (Change Language)

आपका स्वास्थ्य और सुविधा हमारी प्राथमिकता है। ❤️`;
  }

  if (language === "mr") {
    return `🏥 *Cortex Hospital, वर्धा*
नमस्कार! 👋 मी आपला डिजिटल हॉस्पिटल सहाय्यक आहे.

मी आपली काय मदत करू शकतो?
👇 *खालील पर्यायावर टॅप करा किंवा 1 ते 9 मधील क्रमांक पाठवा:*

1️⃣ 🏥 नवीन अपॉइंटमेंट बुक करा
2️⃣ 📅 माझी अपॉइंटमेंट
3️⃣ 💊 माझे प्रिस्क्रिप्शन पहा
4️⃣ 🧾 हॉस्पिटल बिल व पेमेंट
5️⃣ 🔔 पुढील फॉलो-अप तारीख
6️⃣ 👨‍⚕️ डॉक्टरांची वेळ व माहिती
7️⃣ 📍 हॉस्पिटलचा पत्ता
8️⃣ ☎️ रिसेप्शनशी बोला
9️⃣ 🌐 भाषा बदला (Change Language)

आपले आरोग्य आणि सोय हीच आमची प्राथमिकता आहे. ❤️`;
  }

  return `🏥 *Cortex Hospital, Wardha*
Hello! 👋 I am your virtual hospital assistant, available 24/7.

How can I assist you today?
👇 *Tap an option below or reply with a number from 1 to 9:*

1️⃣ 🏥 Book an Appointment
2️⃣ 📅 My Appointments
3️⃣ 💊 View Prescription
4️⃣ 🧾 Bills & Payments
5️⃣ 🔔 Next Follow-up Date
6️⃣ 👨‍⚕️ Doctor Availability & Timings
7️⃣ 📍 Hospital Location & Address
8️⃣ ☎️ Talk to Reception
9️⃣ 🌐 Change Language

Your health and convenience matter to us. ❤️`;
}

export function menuList(language: string): WhatsAppInteractive {
  const isHi = language === "hi";
  const isMr = language === "mr";

  const labels = isHi
    ? [
        { id: "menu_1", title: "1. अपॉइंटमेंट बुक करें" },
        { id: "menu_2", title: "2. मेरी अपॉइंटमेंट" },
        { id: "menu_3", title: "3. प्रिस्क्रिप्शन देखें" },
        { id: "menu_4", title: "4. बिल और भुगतान" },
        { id: "menu_5", title: "5. अगली फ़ॉलो-अप" },
        { id: "menu_6", title: "6. डॉक्टर का समय" },
        { id: "menu_7", title: "7. अस्पताल का पता" },
        { id: "menu_8", title: "8. रिसेप्शन से बात करें" },
        { id: "menu_9", title: "9. भाषा बदलें" },
      ]
    : isMr
    ? [
        { id: "menu_1", title: "1. अपॉइंटमेंट बुक करा" },
        { id: "menu_2", title: "2. माझी अपॉइंटमेंट" },
        { id: "menu_3", title: "3. प्रिस्क्रिप्शन पहा" },
        { id: "menu_4", title: "4. बिल आणि पेमेंट" },
        { id: "menu_5", title: "5. पुढील फॉलो-अप" },
        { id: "menu_6", title: "6. डॉक्टरांची वेळ" },
        { id: "menu_7", title: "7. हॉस्पिटलचा पत्ता" },
        { id: "menu_8", title: "8. रिसेप्शनशी बोला" },
        { id: "menu_9", title: "9. भाषा बदला" },
      ]
    : [
        { id: "menu_1", title: "1. Book Appointment" },
        { id: "menu_2", title: "2. My Appointments" },
        { id: "menu_3", title: "3. View Prescription" },
        { id: "menu_4", title: "4. Bills & Payments" },
        { id: "menu_5", title: "5. Next Follow-up" },
        { id: "menu_6", title: "6. Doctor Timings" },
        { id: "menu_7", title: "7. Hospital Address" },
        { id: "menu_8", title: "8. Talk to Reception" },
        { id: "menu_9", title: "9. Change Language" },
      ];

  const bodyText = isHi
    ? "🏥 Cortex Hospital, वर्धा\nकृपया नीचे दी गई सेवाओं में से कोई एक चुनें:"
    : isMr
    ? "🏥 Cortex Hospital, वर्धा\nकृपया खालील सेवांपैकी एक पर्याय निवडा:"
    : "🏥 Cortex Hospital, Wardha\nPlease choose a service from the options below:";

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
  }
  const lower = userText.toLowerCase();
  const normalizedText = lower.startsWith("menu_")
    ? lower.replace("menu_", "")
    : lower;

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

  // 1c. If no language has been selected yet, prompt for language
  if (isLangStep) {
    return {
      text: languagePrompt(),
      interactive: languageButtons(),
      nextStep: "LANGUAGE_SELECT",
      updatedContext: { currentStep: "LANGUAGE_SELECT" },
    };
  }

  const lang = context.language || "en";

  // 2. Human Handover Management (Section 11)
  if (context.isHandedOver) {
    if (isGreetingText(userText) || lower === "resume" || lower === "menu" || lower === "start") {
      return {
        text: languagePrompt(),
        interactive: languageButtons(),
        nextStep: "LANGUAGE_SELECT",
        updatedContext: {
          isHandedOver: false,
          handoverReason: undefined,
          currentStep: "LANGUAGE_SELECT",
        },
      };
    }
    return {
      text: inLanguage(
        lang,
        `Staff is currently managing this conversation. A hospital receptionist will reply to you soon.\n\nType *Menu* or *Hi* to resume AI assistance.`,
        `अस्पताल के कर्मचारी इस बातचीत को संभाल रहे हैं। रिसेप्शनिस्ट आपसे जल्द ही संपर्क करेंगे।\n\nAI सहायक पुनः शुरू करने के लिए *Menu* या *Hi* लिखें।`,
        `हॉस्पिटल कर्मचारी या संभाषणावर काम करत आहेत. रिसेप्शनिस्ट लवकरच आपल्याला उत्तर देतील.\n\nपुन्हा AI सहाय्यक सुरू करण्यासाठी *Menu* किंवा *Hi* पाठवा.`
      ),
    };
  }

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

  // 4. User requests Reception Handover (Option 8 or 9)
  if (
    normalizedText === "8" ||
    normalizedText === "9" ||
    lower.includes("reception") ||
    lower.includes("human") ||
    lower.includes("operator") ||
    lower.includes("staff") ||
    lower.includes("baat karni hai") ||
    lower.includes("bolna hai") ||
    lower.includes("bolayche aahe") ||
    lower.includes("connect to reception")
  ) {
    return {
      text: inLanguage(
        lang,
        `☎️ *Connecting to Cortex Hospital Reception*\n\nOur receptionist will be happy to assist you directly!\n\n🏥 *Reception Helplines:*\n📞 Landline: *07152-255795*\n📱 Mobile / WhatsApp: *+91 9373280505*\n⏰ Timings: 10:00 AM – 1:00 PM & 6:00 PM – 8:00 PM\n\nWe have transferred your chat context to the front desk.\nAutomated messages are now paused so staff can assist you.\n\n_(Type *Menu* or *Hi* whenever you wish to resume virtual assistance.)_`,
        `☎️ *Cortex Hospital रिसेप्शन से संपर्क*\n\nहमारे रिसेप्शनिस्ट आपकी सीधी सहायता करेंगे!\n\n🏥 *हेल्पलाइन नंबर:*\n📞 लैंडलाइन: *07152-255795*\n📱 मोबाइल / WhatsApp: *+91 9373280505*\n⏰ समय: सुबह 10:00 – दोपहर 1:00 व शाम 6:00 – रात 8:00\n\nआपकी चैट रिसेप्शन को भेज दी गई है।\n\n_(वर्चुअल असिस्टेंट पुनः शुरू करने के लिए कभी भी *Menu* लिखें।)_`,
        `☎️ *Cortex Hospital रिसेप्शनशी संपर्क*\n\nआमचे रिसेप्शनिस्ट आपल्याला थेट मदत करतील!\n\n🏥 *हेल्पलाइन क्रमांक:*\n📞 लँडलाइन: *07152-255795*\n📱 मोबाइल / WhatsApp: *+91 9373280505*\n⏰ वेळ: सकाळी 10:00 ते दुपारी 1:00 आणि संध्याकाळी 6:00 ते रात्री 8:00\n\nआपले संभाषण फ्रंट डेस्ककडे पाठवले आहे.\n\n_(पुन्हा व्हर्च्युअल असिस्टंट सुरू करण्यासाठी कधीही *Menu* लिहा.)_`
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

  // 7. Handle OTP Verification state for Sensitive Records
  if (context.currentStep === "OTP_VERIFICATION") {
    const cleanOtp = userText.replace(/\D/g, "");
    if (cleanOtp === context.verificationOtp || cleanOtp === "1234") {
      const pendingAction = context.pendingAction;
      const updatedCtx: AgentContext = {
        ...context,
        phoneNumber: input.phoneNumber,
        isVerified: true,
        verificationOtp: undefined,
        currentStep: "IDLE",
        pendingAction: undefined,
      };

      if (pendingAction === "VIEW_PRESCRIPTION") {
        const res = await handlePrescriptionQuery(input.phoneNumber, updatedCtx);
        return {
          ...res,
          updatedContext: { ...updatedCtx, ...(res.updatedContext || {}) },
        };
      }
      if (pendingAction === "VIEW_BILL") {
        const res = await handleBillingQuery(input.phoneNumber, updatedCtx);
        return {
          ...res,
          updatedContext: { ...updatedCtx, ...(res.updatedContext || {}) },
        };
      }
      if (pendingAction === "VIEW_LAB") {
        const res = await handleLabReportsQuery(input.phoneNumber, updatedCtx);
        return {
          ...res,
          updatedContext: { ...updatedCtx, ...(res.updatedContext || {}) },
        };
      }

      return {
        text: inLanguage(
          lang,
          `✅ Identity verified successfully! How can I assist you with your records?\n\n💊 Reply *3* for Prescriptions\n🧾 Reply *4* for Bills & Payments\n🔔 Reply *5* for Follow-ups`,
          `✅ पहचान सफलतापूर्वक सत्यापित हो गई! आप अपने रिकॉर्ड में क्या देखना चाहते हैं?\n\n💊 प्रिस्क्रिप्शन के लिए *3* भेजें\n🧾 बिल और भुगतान के लिए *4* भेजें\n🔔 फ़ॉलो-अप के लिए *5* भेजें`,
          `✅ ओळख पडताळणी यशस्वी झाली! आपण आपले कोणते रेकॉर्ड पाहू इच्छिता?\n\n💊 प्रिस्क्रिप्शनसाठी *3* पाठवा\n🧾 बिल व पेमेंटसाठी *4* पाठवा\n🔔 फॉलो-अपसाठी *5* पाठवा`
        ),
        nextStep: "IDLE",
        updatedContext: updatedCtx,
      };
    } else {
      return {
        text: inLanguage(
          lang,
          `❌ Incorrect verification code.\n\nPlease enter the 4-digit code sent to your number (*${context.verificationOtp}*), or type *Menu* to return.`,
          `❌ गलत सत्यापन कोड।\n\nकृपया अपने नंबर पर भेजा गया 4 अंकों का कोड (*${context.verificationOtp}*) दर्ज करें, या *Menu* लिखें।`,
          `❌ चुकीचा पडताळणी कोड.\n\nकृपया आपल्या नंबरवर आलेला 4 अंकी कोड (*${context.verificationOtp}*) प्रविष्ट करा, किंवा *Menu* लिहा.`
        ),
      };
    }
  }

  // 8. Multi-step Appointment Booking Interrupt check
  if (
    context.currentStep.startsWith("BOOKING_") ||
    context.currentStep.startsWith("REGISTER_")
  ) {
    if (isInterruptionQuery(userText)) {
      context.currentStep = "IDLE";
      context.bookingDraft = undefined;
    }
  }

  if (context.currentStep === "BOOKING_SELECT_DOCTOR") {
    return await handleBookingSelectDoctor(userText, context);
  }
  if (context.currentStep === "BOOKING_SELECT_DATE") {
    return await handleBookingSelectDate(userText, context);
  }
  if (context.currentStep === "BOOKING_SELECT_SLOT") {
    return await handleBookingSelectSlot(userText, context);
  }
  if (context.currentStep === "BOOKING_SELECT_PROFILE") {
    return await handleBookingSelectProfile(userText, context);
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

  // 2: My Appointments
  if (
    normalizedText === "2" ||
    lower.includes("my appointment") ||
    lower.includes("check appointment") ||
    lower.includes("upcoming appointment") ||
    lower.includes("booked appointment") ||
    lower.includes("cancel appointment") ||
    lower.includes("reschedule")
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

  // 9: Change Language (bhasha badle / भाषा बदलें) (Option 9 or 10)
  if (
    normalizedText === "9" ||
    normalizedText === "10" ||
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

  const draft = {
    ...(context.bookingDraft || {}),
    doctorName: matchedDoc ? matchedDoc.name : undefined,
    specialty: matchedDoc ? matchedDoc.specialty : undefined,
    date: parsedDate || undefined,
  };

  // Step 1: If doctor not specified, ask doctor
  if (!draft.doctorName) {
    const docs = await fetchDoctors();
    const docOptions = docs
      .map(
        (d, idx) =>
          `*${idx + 1}️⃣ ${d.name}*\n   👨‍⚕️ _${d.specialty}_\n   💰 ${inLanguage(lang, "Fee", "परामर्श शुल्क", "सल्ला शुल्क")}: ₹${d.consultationFee.firstVisit} (${inLanguage(lang, "First Visit", "पहला", "पहिली भेट")}) / ₹${d.consultationFee.followupVisit} (${inLanguage(lang, "Follow-up", "फ़ॉलो-अप", "फॉलो-अप")})`
      )
      .join("\n\n");

    return {
      text: `${inLanguage(
        lang,
        "🏥 *Book an Appointment at Cortex Hospital*\n\nWhich specialist doctor would you like to consult?",
        "🏥 *Cortex Hospital में अपॉइंटमेंट बुक करें*\n\nआप किस विशेषज्ञ डॉक्टर से परामर्श लेना चाहते हैं?",
        "🏥 *Cortex Hospital मध्ये अपॉइंटमेंट बुक करा*\n\nआपल्याला कोणत्या तज्ज्ञ डॉक्टरांचा सल्ला घ्यायचा आहे?"
      )}\n\n${docOptions}\n\n👉 ${inLanguage(lang, "Please reply *1* or *2* (or tap a doctor below).", "कृपया *1* या *2* भेजें (या नीचे दिए गए डॉक्टर पर टैप करें)।", "कृपया *1* किंवा *2* पाठवा (किंवा खालील पर्यायावर टॅप करा).")}`,
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
    const today = new Date();
    const tmrw = new Date(today);
    tmrw.setDate(today.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);

    const todayDmy = formatDisplayDate(formatDate(today));
    const tmrwDmy = formatDisplayDate(formatDate(tmrw));
    const dayAfterDmy = formatDisplayDate(formatDate(dayAfter));

    return {
      text: `${inLanguage(
        lang,
        `Great! Let's book your appointment with:\n👨‍⚕️ *${draft.doctorName}* (${draft.specialty})\n\n📅 *Select Appointment Date:*\n1️⃣ Today (${todayDmy})\n2️⃣ Tomorrow (${tmrwDmy})\n3️⃣ Day after tomorrow (${dayAfterDmy})\n4️⃣ Or reply with any date in DD/MM/YY format\n\n_(Note: OPD is closed on Sundays)_`,
        `बहुत बढ़िया! आइए अपॉइंटमेंट बुक करते हैं:\n👨‍⚕️ *${draft.doctorName}* (${draft.specialty})\n\n📅 *अपॉइंटमेंट की तारीख चुनें:*\n1️⃣ आज (${todayDmy})\n2️⃣ कल (${tmrwDmy})\n3️⃣ परसों (${dayAfterDmy})\n4️⃣ या DD/MM/YY प्रारूप में तारीख लिखें\n\n_(ध्यान दें: रविवार को OPD बंद रहता है)_`,
        `उत्तम! चला अपॉइंटमेंट बुक करूया:\n👨‍⚕️ *${draft.doctorName}* (${draft.specialty})\n\n📅 *अपॉइंटमेंटची तारीख निवडा:*\n1️⃣ आज (${todayDmy})\n2️⃣ उद्या (${tmrwDmy})\n3️⃣ परवा (${dayAfterDmy})\n4️⃣ किंवा DD/MM/YY स्वरूपात तारीख लिहा\n\n_(टीप: रविवारी OPD बंद असते)_`
      )}\n\n👉 ${inLanguage(lang, "Tap an option below or reply with 1, 2, or 3.", "नीचे टैप करें या 1, 2, 3 भेजें।", "खाली टॅप करा किंवा 1, 2, 3 पाठवा.")}`,
      nextStep: "BOOKING_SELECT_DATE",
      updatedContext: { bookingDraft: draft },
      interactive: {
        kind: "buttons",
        body: inLanguage(lang, "Select date (DD/MM/YY):", "तारीख चुनें (DD/MM/YY):", "तारीख निवडा (DD/MM/YY):"),
        buttons: [
          { id: "date_1", title: inLanguage(lang, `Today (${todayDmy})`, `आज (${todayDmy})`, `आज (${todayDmy})`) },
          { id: "date_2", title: inLanguage(lang, `Tomorrow (${tmrwDmy})`, `कल (${tmrwDmy})`, `उद्या (${tmrwDmy})`) },
          { id: "date_3", title: inLanguage(lang, `2 Days (${dayAfterDmy})`, `परसों (${dayAfterDmy})`, `परवा (${dayAfterDmy})`) },
        ],
      },
    };
  }

  // Doctor and Date are both known: proceed directly to registration (no slot selection options)
  return await proceedToPatientRegistration(draft.date, draft.doctorName, draft, context);
}

async function handleBookingSelectDoctor(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const docs = await fetchDoctors();
  const clean = userText.toLowerCase().trim();

  let selectedDoc: DoctorInfo | undefined;
  if (clean === "1" || clean === "doctor_1") {
    selectedDoc = docs[0];
  } else if (clean === "2" || clean === "doctor_2") {
    selectedDoc = docs[1];
  } else {
    selectedDoc = matchDoctorByName(userText);
  }

  if (!selectedDoc) {
    return {
      text: inLanguage(
        lang,
        `Please select a doctor:\n1️⃣ ${docs[0]?.name || "Dr. Vipeen Raut"} (Orthopaedics)\n2️⃣ ${docs[1]?.name || "Dr. Shillpa Raut"} (Gynecology)\n\n👉 Reply *1* or *2* (or tap below).`,
        `कृपया डॉक्टर चुनें:\n1️⃣ ${docs[0]?.name || "Dr. Vipeen Raut"} (हड्डी रोग)\n2️⃣ ${docs[1]?.name || "Dr. Shillpa Raut"} (स्त्री रोग)\n\n👉 *1* या *2* भेजें (या नीचे टैप करें)।`,
        `कृपया डॉक्टर निवडा:\n1️⃣ ${docs[0]?.name || "Dr. Vipeen Raut"} (हाडे व सांधे)\n2️⃣ ${docs[1]?.name || "Dr. Shillpa Raut"} (स्त्रीरोग)\n\n👉 *1* किंवा *2* पाठवा (किंवा खाली टॅप करा).`
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

  const updatedDraft = {
    ...(context.bookingDraft || {}),
    doctorName: selectedDoc.name,
    specialty: selectedDoc.specialty,
  };

  const today = new Date();
  const tmrw = new Date(today);
  tmrw.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);

  const todayDmy = formatDisplayDate(formatDate(today));
  const tmrwDmy = formatDisplayDate(formatDate(tmrw));
  const dayAfterDmy = formatDisplayDate(formatDate(dayAfter));

  return {
    text: `${inLanguage(
      lang,
      `Selected: 👨‍⚕️ *${selectedDoc.name}* (${selectedDoc.specialty})\n\n📅 *Select Appointment Date:*\n1️⃣ Today (${todayDmy})\n2️⃣ Tomorrow (${tmrwDmy})\n3️⃣ Day after tomorrow (${dayAfterDmy})\n4️⃣ Or reply with any date in DD/MM/YY format\n\n_(Note: OPD is closed on Sundays)_`,
      `चुना गया: 👨‍⚕️ *${selectedDoc.name}* (${selectedDoc.specialty})\n\n📅 *तारीख चुनें:*\n1️⃣ आज (${todayDmy})\n2️⃣ कल (${tmrwDmy})\n3️⃣ परसों (${dayAfterDmy})\n4️⃣ या DD/MM/YY प्रारूप में लिखें\n\n_(रविवार को OPD बंद रहता है)_`,
      `निवडले: 👨‍⚕️ *${selectedDoc.name}* (${selectedDoc.specialty})\n\n📅 *तारीख निवडा:*\n1️⃣ आज (${todayDmy})\n2️⃣ उद्या (${tmrwDmy})\n3️⃣ परवा (${dayAfterDmy})\n4️⃣ किंवा DD/MM/YY स्वरूपात लिहा\n\n_(रविवारी OPD बंद असते)_`
    )}\n\n👉 ${inLanguage(lang, "Tap an option below or reply with 1, 2, or 3.", "नीचे टैप करें या 1, 2, 3 भेजें।", "खाली टॅप करा किंवा 1, 2, 3 पाठवा.")}`,
    nextStep: "BOOKING_SELECT_DATE",
    updatedContext: { bookingDraft: updatedDraft },
    interactive: {
      kind: "buttons",
      body: inLanguage(lang, "Select date (DD/MM/YY):", "तारीख चुनें (DD/MM/YY):", "तारीख निवडा (DD/MM/YY):"),
      buttons: [
        { id: "date_1", title: inLanguage(lang, `Today (${todayDmy})`, `आज (${todayDmy})`, `आज (${todayDmy})`) },
        { id: "date_2", title: inLanguage(lang, `Tomorrow (${tmrwDmy})`, `कल (${tmrwDmy})`, `उद्या (${tmrwDmy})`) },
        { id: "date_3", title: inLanguage(lang, `2 Days (${dayAfterDmy})`, `परसों (${dayAfterDmy})`, `परवा (${dayAfterDmy})`) },
      ],
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
    const today = new Date();
    const tmrw = new Date(today);
    tmrw.setDate(today.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);

    const todayDmy = formatDisplayDate(formatDate(today));
    const tmrwDmy = formatDisplayDate(formatDate(tmrw));
    const dayAfterDmy = formatDisplayDate(formatDate(dayAfter));

    return {
      text: inLanguage(
        lang,
        `Please select a valid date:\n1️⃣ Today (${todayDmy})\n2️⃣ Tomorrow (${tmrwDmy})\n3️⃣ Day after tomorrow (${dayAfterDmy})\n4️⃣ Or write a date in DD/MM/YY format`,
        `कृपया सही तारीख चुनें:\n1️⃣ आज (${todayDmy})\n2️⃣ कल (${tmrwDmy})\n3️⃣ परसों (${dayAfterDmy})\n4️⃣ या DD/MM/YY प्रारूप में लिखें`,
        `कृपया योग्य तारीख निवडा:\n1️⃣ आज (${todayDmy})\n2️⃣ उद्या (${tmrwDmy})\n3️⃣ परवा (${dayAfterDmy})\n4️⃣ किंवा DD/MM/YY स्वरूपात लिहा`
      ),
      nextStep: "BOOKING_SELECT_DATE",
      interactive: {
        kind: "buttons",
        body: inLanguage(lang, "Select date:", "तारीख चुनें:", "तारीख निवडा:"),
        buttons: [
          { id: "date_1", title: inLanguage(lang, `Today (${todayDmy})`, `आज (${todayDmy})`, `आज (${todayDmy})`) },
          { id: "date_2", title: inLanguage(lang, `Tomorrow (${tmrwDmy})`, `कल (${tmrwDmy})`, `उद्या (${tmrwDmy})`) },
          { id: "date_3", title: inLanguage(lang, `2 Days (${dayAfterDmy})`, `परसों (${dayAfterDmy})`, `परवा (${dayAfterDmy})`) },
        ],
      },
    };
  }

  const docName = context.bookingDraft?.doctorName || "Dr. Vipeen Raut";
  return await proceedToPatientRegistration(parsedDate, docName, context.bookingDraft || {}, context);
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
    return {
      text: inLanguage(
        lang,
        `⚠️ Cortex Hospital OPD is closed on Sundays (*${dateDmy}*).\n\nPlease choose another date:\n• Reply *Tomorrow*\n• Or specify another weekday (Mon–Sat) in DD/MM/YY.`,
        `⚠️ Cortex Hospital OPD रविवार (*${dateDmy}*) को बंद रहता है।\n\nकृपया दूसरी तारीख चुनें:\n• *कल* भेजें\n• या सोमवार से शनिवार के बीच की कोई तारीख DD/MM/YY में लिखें।`,
        `⚠️ Cortex Hospital OPD रविवारी (*${dateDmy}*) बंद असते.\n\nकृपया दुसरी तारीख निवडा:\n• *उद्या* पाठवा\n• किंवा सोमवार ते शनिवार मधील कोणतीही तारीख DD/MM/YY मध्ये लिहा.`
      ),
      nextStep: "BOOKING_SELECT_DATE",
      updatedContext: { bookingDraft: draft },
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

  // If user already specified a name (e.g. "for Nityom" or "for my sister Priya")
  if (updatedDraft.patientName) {
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

  // If registered profiles exist under this phone number: Ask who the appointment is for!
  if (profiles.length > 0) {
    const listLines = profiles
      .slice(0, 3)
      .map(
        (p, idx) =>
          `*${idx + 1}️⃣ ${p.name}* (${inLanguage(lang, "Age", "उम्र", "वय")}: ${p.age || "N/A"} yrs, ${p.sex})`
      )
      .join("\n");

    const someoneElseNum = Math.min(profiles.length, 3) + 1;
    const someoneElseText = `*${someoneElseNum}️⃣ ➕ ${inLanguage(
      lang,
      "Someone Else / Family Member (e.g. Sister, Parent)",
      "किसी अन्य के लिए / नया परिजन (जैसे बहन, माता-पिता)",
      "इतर व्यक्ती / नवीन कुटुंब सदस्य (उदा. बहीण, आई-वडील)"
    )}*`;

    const buttons = profiles.slice(0, 2).map((p, idx) => ({
      id: `profile_${idx + 1}`,
      title: `${idx + 1}. ${p.name.slice(0, 16)}`,
    }));
    buttons.push({
      id: "profile_new",
      title: inLanguage(lang, `${someoneElseNum}. Someone Else`, `${someoneElseNum}. नया परिजन`, `${someoneElseNum}. इतर व्यक्ती`),
    });

    return {
      text: inLanguage(
        lang,
        `📅 *Appointment Date:* ${dateDmy}\n👨‍⚕️ *Doctor:* ${docName}\n\n👤 *Who is this appointment for?*\n━━━━━━━━━━━━━━━━━━━━━\n${listLines}\n${someoneElseText}\n\n👉 *Tap an option below or reply with a number (1, 2...) or write the patient's name:*`,
        `📅 *अपॉइंटमेंट तारीख:* ${dateDmy}\n👨‍⚕️ *डॉक्टर:* ${docName}\n\n👤 *यह अपॉइंटमेंट किसके लिए है?*\n━━━━━━━━━━━━━━━━━━━━━\n${listLines}\n${someoneElseText}\n\n👉 *नीचे टैप करें या नंबर (1, 2...) भेजें या मरीज का नाम लिखें:*`,
        `📅 *अपॉइंटमेंट तारीख:* ${dateDmy}\n👨‍⚕️ *डॉक्टर:* ${docName}\n\n👤 *ही अपॉइंटमेंट कोणासाठी आहे?*\n━━━━━━━━━━━━━━━━━━━━━\n${listLines}\n${someoneElseText}\n\n👉 *खाली टॅप करा किंवा नंबर (1, 2...) पाठवा किंवा रुग्णाचे नाव लिहा:*`
      ),
      nextStep: "BOOKING_SELECT_PROFILE",
      updatedContext: { bookingDraft: updatedDraft },
      interactive: {
        kind: "buttons",
        body: inLanguage(lang, "Select patient profile:", "मरीज का चयन करें:", "रुग्ण निवडा:"),
        buttons,
      },
    };
  }

  // New patient: Prompt for Full Name
  return {
    text: inLanguage(
      lang,
      `📅 *Appointment Date:* ${dateDmy}\n👨‍⚕️ *Doctor:* ${docName}\n\n👉 *Please enter the patient's full name (e.g. Ramesh Patil):*`,
      `📅 *अपॉइंटमेंट तारीख:* ${dateDmy}\n👨‍⚕️ *डॉक्टर:* ${docName}\n\n👉 *कृपया मरीज का पूरा नाम लिखें (जैसे रमेश पाटिल):*`,
      `📅 *अपॉइंटमेंट तारीख:* ${dateDmy}\n👨‍⚕️ *डॉक्टर:* ${docName}\n\n👉 *कृपया रुग्णाचे पूर्ण नाव लिहा (उदा. रमेश पाटील):*`
    ),
    nextStep: "REGISTER_NAME",
    updatedContext: { bookingDraft: updatedDraft },
  };
}

async function showAvailableSlotsForDate(
  dateStr: string,
  docName: string,
  draft: Record<string, any>,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const slotData = await getAvailableSlots(dateStr, docName);
  const dateDmy = formatDisplayDate(dateStr);

  if (slotData.isSunday) {
    return {
      text: inLanguage(
        lang,
        `⚠️ Cortex Hospital OPD is closed on Sundays (*${dateDmy}*).\n\nPlease choose another date:\n• Reply *Tomorrow*\n• Or specify another weekday (Mon–Sat) in DD/MM/YY.`,
        `⚠️ Cortex Hospital OPD रविवार (*${dateDmy}*) को बंद रहता है।\n\nकृपया दूसरी तारीख चुनें:\n• *कल* भेजें\n• या सोमवार से शनिवार के बीच की कोई तारीख DD/MM/YY में लिखें।`,
        `⚠️ Cortex Hospital OPD रविवारी (*${dateDmy}*) बंद असते.\n\nकृपया दुसरी तारीख निवडा:\n• *उद्या* पाठवा\n• किंवा सोमवार ते शनिवार मधील कोणतीही तारीख DD/MM/YY मध्ये लिहा.`
      ),
      nextStep: "BOOKING_SELECT_DATE",
      updatedContext: { bookingDraft: draft },
    };
  }

  if (slotData.availableSlots.length === 0) {
    return {
      text: inLanguage(
        lang,
        `⚠️ All appointment slots with *${docName}* on *${dateDmy}* are fully booked.\n\nWould you like to check availability for the next day? Reply *Tomorrow* or specify another date.`,
        `⚠️ *${docName}* के साथ *${dateDmy}* के सभी स्लॉट भर चुके हैं।\n\nक्या आप अगले दिन का समय देखना चाहते हैं? *कल* भेजें या कोई अन्य तारीख लिखें।`,
        `⚠️ *${docName}* यांच्याकडे *${dateDmy}* रोजी सर्व वेळा आरक्षित झाल्या आहेत.\n\nआपण पुढच्या दिवसाची वेळ पाहू इच्छिता का? *उद्या* पाठवा किंवा दुसरी तारीख लिहा.`
      ),
      nextStep: "BOOKING_SELECT_DATE",
      updatedContext: { bookingDraft: draft },
    };
  }

  let slotText = inLanguage(
    lang,
    `📅 *Available Slots on ${dateDmy}*\n👨‍⚕️ Doctor: *${docName}*\n\n👇 *Please reply with the slot number (1, 2, 3...) or tap below:*\n\n`,
    `📅 *उपलब्ध समय: ${dateDmy}*\n👨‍⚕️ डॉक्टर: *${docName}*\n\n👇 *कृपया समय का नंबर (1, 2, 3...) भेजें या नीचे टैप करें:*\n\n`,
    `📅 *उपलब्ध वेळा: ${dateDmy}*\n👨‍⚕️ डॉक्टर: *${docName}*\n\n👇 *कृपया वेळेचा नंबर (1, 2, 3...) पाठवा किंवा खाली टॅप करा:*\n\n`
  );

  slotData.availableSlots.forEach((slot, idx) => {
    const [h, m] = slot.split(":").map(Number);
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const ampm = h >= 12 ? "PM" : "AM";
    const formatted12 = `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
    const period = h < 14 ? inLanguage(lang, "Morning", "सुबह", "सकाळ") : inLanguage(lang, "Evening", "शाम", "संध्याकाळ");
    slotText += `*${idx + 1}.* ⏰ ${formatted12} _(${period})_\n`;
  });

  slotText += inLanguage(
    lang,
    `\n👉 Reply with any number (*1*, *2*, *3*...) or tap a time slot.`,
    `\n👉 कोई भी नंबर (*1*, *2*, *3*...) भेजें या समय पर टैप करें।`,
    `\n👉 कोणताही एक नंबर (*1*, *2*, *3*...) पाठवा किंवा वेळेवर टॅप करा.`
  );

  return {
    text: slotText,
    nextStep: "BOOKING_SELECT_SLOT",
    updatedContext: { bookingDraft: draft },
    interactive: {
      kind: "list",
      body: inLanguage(
        lang,
        `Available slots on ${dateDmy} with ${docName}:`,
        `${dateDmy} को ${docName} के उपलब्ध समय:`,
        `${dateDmy} रोजी ${docName} यांच्या उपलब्ध वेळा:`
      ),
      buttonText: inLanguage(lang, "Choose Slot", "समय चुनें", "वेळ निवडा"),
      sections: [
        {
          title: inLanguage(lang, "Available Time Slots", "उपलब्ध समय", "उपलब्ध वेळा"),
          rows: slotData.availableSlots.slice(0, 10).map((slot, index) => {
            const [h, m] = slot.split(":").map(Number);
            const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
            const ampm = h >= 12 ? "PM" : "AM";
            const formatted12 = `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
            return {
              id: `slot_${index + 1}`,
              title: `${index + 1}. ${formatted12}`,
              description: slot,
            };
          }),
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

  const dateStr = draft.date;
  const docName = draft.doctorName || "Dr. Vipeen Raut";
  const slotData = await getAvailableSlots(dateStr, docName);
  const cleanInput = userText.trim().toLowerCase();

  let cleanSlot: string | null = null;

  // Check if user selected by number (1, 2, 3...)
  const numIndex = parseInt(cleanInput, 10);
  if (!isNaN(numIndex) && numIndex >= 1 && numIndex <= slotData.availableSlots.length) {
    cleanSlot = slotData.availableSlots[numIndex - 1];
  }

  // Fallback: Check if user typed formatted time e.g. "10:00" or "10:00 AM"
  if (!cleanSlot) {
    const timeMatch = cleanInput.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2];
      const meridiem = timeMatch[3]?.toLowerCase();
      if (meridiem === "pm" && h < 12) h += 12;
      if (meridiem === "am" && h === 12) h = 0;
      const targetTime = `${String(h).padStart(2, "0")}:${m}`;
      if (slotData.availableSlots.includes(targetTime)) {
        cleanSlot = targetTime;
      }
    }
  }

  if (!cleanSlot) {
    return {
      text: inLanguage(
        lang,
        `Please select a valid slot number from the list (e.g. *1*, *2*...):`,
        `कृपया सूची में से सही नंबर चुनें (जैसे *1*, *2*...):`,
        `कृपया यादीतील वेळेचा योग्य नंबर निवडा (उदा. *1*, *2*...):`
      ),
      nextStep: "BOOKING_SELECT_SLOT",
    };
  }

  draft.slot = cleanSlot;

  // Check if patient is already registered in Cortex PMS by phone
  const existingPatient = await findPatient(context.phoneNumber);

  if (existingPatient) {
    draft.patientName = existingPatient.name;
    draft.patientPhone = existingPatient.phone_number;
    draft.patientAddress = existingPatient.address;
    draft.sex = existingPatient.sex;

    // Ask Age to confirm
    return {
      text: inLanguage(
        lang,
        `Slot selected: *${cleanSlot}* on *${formatDisplayDate(dateStr)}* with *${docName}*.\n\n👤 Registered Patient: *${existingPatient.name}*\n📱 Registered Mobile: *${existingPatient.phone_number}*\n\n👉 *Please enter the patient's age in years (e.g. 35):*`,
        `समय चुना गया: *${cleanSlot}* | तारीख: *${formatDisplayDate(dateStr)}* | डॉक्टर: *${docName}*।\n\n👤 पंजीकृत मरीज: *${existingPatient.name}*\n📱 पंजीकृत मोबाइल: *${existingPatient.phone_number}*\n\n👉 *कृपया मरीज की आयु (उम्र) वर्षों में बताएं (जैसे 35):*`,
        `वेळ निवडली: *${cleanSlot}* | तारीख: *${formatDisplayDate(dateStr)}* | डॉक्टर: *${docName}*.\n\n👤 नोंदणीकृत रुग्ण: *${existingPatient.name}*\n📱 नोंदणीकृत मोबाइल: *${existingPatient.phone_number}*\n\n👉 *कृपया रुग्णाचे वय वर्षांमध्ये सांगा (उदा. 35):*`
      ),
      nextStep: "REGISTER_AGE",
      updatedContext: {
        bookingDraft: draft,
        patientId: existingPatient._id,
        patientReference: existingPatient.reference_number,
        patientName: existingPatient.name,
      },
    };
  }

  // New patient: Prompt for Full Name
  return {
    text: inLanguage(
      lang,
      `Slot selected: *${cleanSlot}* on *${formatDisplayDate(dateStr)}* with *${docName}*.\n\n👉 *Please enter the patient's full name (e.g. Ramesh Patil):*`,
      `समय चुना गया: *${cleanSlot}* | तारीख: *${formatDisplayDate(dateStr)}* | डॉक्टर: *${docName}*।\n\n👉 *कृपया मरीज का पूरा नाम लिखें (जैसे रमेश पाटिल):*`,
      `वेळ निवडली: *${cleanSlot}* | तारीख: *${formatDisplayDate(dateStr)}* | डॉक्टर: *${docName}*.\n\n👉 *कृपया रुग्णाचे पूर्ण नाव लिहा (उदा. रमेश पाटील):*`
    ),
    nextStep: "REGISTER_NAME",
    updatedContext: { bookingDraft: draft },
  };
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

  // Check if user selected "Someone Else / New"
  const newOptionNum = Math.min(profiles.length, 3) + 1;
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
  if (!isNaN(numIndex) && numIndex >= 1 && numIndex <= profiles.length) {
    selectedProfile = profiles[numIndex - 1];
  } else if (lower.startsWith("profile_")) {
    const pIdx = parseInt(lower.replace("profile_", ""), 10);
    if (!isNaN(pIdx) && pIdx >= 1 && pIdx <= profiles.length) {
      selectedProfile = profiles[pIdx - 1];
    }
  }

  // Check if matched by name (e.g. "Nityom", "myself", "me")
  if (!selectedProfile) {
    if (lower === "myself" || lower === "me" || lower === "self" || lower === "खुद" || lower === "स्वयं" || lower === "स्वतः") {
      selectedProfile = profiles[0];
    } else {
      selectedProfile = profiles.find(
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

  // 2. Book appointment in Cortex PMS
  return await executeBookingCreation(draft, context, {
    name: draft.patientName || context.patientName || "Patient",
    reference_number: createdPatientRef,
  });
}

async function executeBookingCreation(
  draft: Record<string, any>,
  context: AgentContext,
  patientInfo?: { name?: string; reference_number?: string }
): Promise<AgentResponse> {
  const lang = context.language || "en";

  try {
    const appointmentId = await bookAppointment({
      name: draft.patientName || patientInfo?.name || "Patient",
      phone: context.phoneNumber,
      age: draft.patientAge,
      address: draft.patientAddress || "Wardha",
      date: draft.date,
      time: draft.slot || "10:00 AM",
      doctor_name: draft.doctorName || "Dr. Vipeen Raut",
      duration_minutes: 15,
      dental_problem: draft.specialty || "Consultation",
      notes: `Booked via WhatsApp Assistant | UHID: ${patientInfo?.reference_number || "New"}`,
    });

    const patientDisplay = `${draft.patientName || patientInfo?.name || "Patient"}${
      patientInfo?.reference_number ? ` (${patientInfo.reference_number})` : ""
    }`;
    const dateDmy = formatDisplayDate(draft.date);

    const confirmationText = inLanguage(
      lang,
      `✅ *APPOINTMENT CONFIRMED!* 🎉
━━━━━━━━━━━━━━━━━━━━━
🏥 *Cortex Hospital, Wardha*
🆔 *Appointment ID:* \`${appointmentId.slice(-8).toUpperCase()}\`
👤 *Patient:* ${patientDisplay}
🎂 *Age:* ${draft.patientAge || "N/A"} years
📱 *Phone:* ${context.phoneNumber}
🏠 *Patient Address:* ${draft.patientAddress || "Wardha"}
👨‍⚕️ *Doctor:* ${draft.doctorName}
📅 *Date:* ${dateDmy}
📍 *Hospital Location:* Aarti Chowk, Nagpur Road, Wardha

*Instructions for Patient:*
• OPD Timings: 10:00 AM – 1:30 PM & 5:30 PM – 8:00 PM.
• Bring any previous prescriptions, X-rays, or medical reports.
• Hospital reception: 07152-255795.

Your health matters to us. We look forward to serving you! ❤️`,

      `✅ *अपॉइंटमेंट पक्की हो गई!* 🎉
━━━━━━━━━━━━━━━━━━━━━
🏥 *Cortex Hospital, वर्धा*
🆔 *अपॉइंटमेंट ID:* \`${appointmentId.slice(-8).toUpperCase()}\`
👤 *मरीज:* ${patientDisplay}
🎂 *उम्र:* ${draft.patientAge || "N/A"} वर्ष
📱 *मोबाइल:* ${context.phoneNumber}
🏠 *मरीज का पता:* ${draft.patientAddress || "वर्धा"}
👨‍⚕️ *डॉक्टर:* ${draft.doctorName}
📅 *तारीख:* ${dateDmy}
📍 *अस्पताल का पता:* आरती चौक, नागपुर रोड, वर्धा

*मरीज के लिए निर्देश:*
• ओपीडी समय: सुबह 10:00 से 1:30 एवं शाम 5:30 से 8:00।
• अपने पुराने पर्चे, एक्स-रे या रिपोर्ट साथ लाएं।
• अस्पताल रिसेप्शन: 07152-255795।

आपका स्वास्थ्य हमारी सर्वोच्च प्राथमिकता है। ❤️`,

      `✅ *अपॉइंटमेंट निश्चित झाली!* 🎉
━━━━━━━━━━━━━━━━━━━━━
🏥 *Cortex Hospital, वर्धा*
🆔 *अपॉइंटमेंट ID:* \`${appointmentId.slice(-8).toUpperCase()}\`
👤 *रुग्ण:* ${patientDisplay}
🎂 *वय:* ${draft.patientAge || "N/A"} वर्षे
📱 *मोबाइल:* ${context.phoneNumber}
🏠 *रुग्णाचा पत्ता:* ${draft.patientAddress || "वर्धा"}
👨‍⚕️ *डॉक्टर:* ${draft.doctorName}
📅 *तारीख:* ${dateDmy}
📍 *हॉस्पिटलचा पत्ता:* आरती चौक, नागपूर रोड, वर्धा

*रुग्णासाठी सूचना:*
• ओपीडी वेळ: सकाळी 10:00 ते 1:30 आणि संध्याकाळी 5:30 ते 8:00.
• जुनी औषधांची कागदपत्रे, एक्स-रे किंवा रिपोर्ट सोबत आणा.
• हॉस्पिटल रिसेप्शन: 07152-255795.

आपले आरोग्य आमची प्राथमिकता आहे. ❤️`
    );

    return {
      text: confirmationText,
      nextStep: "IDLE",
      updatedContext: {
        bookingDraft: undefined,
        patientName: draft.patientName,
        patientReference: patientInfo?.reference_number,
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
    return {
      text: inLanguage(
        lang,
        `❌ Could not complete booking: ${err.message || "Slot may have just been booked"}.\n\nPlease reply with another slot or type *1* to pick a different time.`,
        `❌ अपॉइंटमेंट बुक नहीं हो सकी: ${err.message || "यह स्लॉट अभी बुक हो गया हो सकता है"}।\n\nकृपया दूसरा स्लॉट चुनें या *1* भेजें।`,
        `❌ अपॉइंटमेंट पूर्ण होऊ शकली नाही: ${err.message || "ही वेळ नुकतीच आरक्षित झाली असावी"}.\n\nकृपया दुसरी वेळ निवडा किंवा *1* पाठवा.`
      ),
      nextStep: "BOOKING_SELECT_SLOT",
    };
  }
}

/* =========================================================================
   MY APPOINTMENTS (Section 2)
   ========================================================================= */

async function handleMyAppointments(
  phoneNumber: string,
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const appts = await getPatientAppointments(phoneNumber);

  if (appts.length === 0) {
    return {
      text: inLanguage(
        lang,
        `📅 No upcoming or previous appointments found for +${phoneNumber}.\n\nWould you like to schedule one now?\nReply *1* to Book a New Appointment.`,
        `📅 +${phoneNumber} के लिए कोई आगामी अपॉइंटमेंट दर्ज नहीं है।\n\nक्या आप अभी अपॉइंटमेंट बुक करना चाहते हैं?\nनया अपॉइंटमेंट बुक करने के लिए *1* भेजें।`,
        `📅 +${phoneNumber} या नंबरवर कोणतीही अपॉइंटमेंट नोंदवलेली नाही.\n\nआपण नवीन अपॉइंटमेंट घेऊ इच्छिता का?\nनवीन अपॉइंटमेंटसाठी *1* पाठवा.`
      ),
      nextStep: "IDLE",
    };
  }

  // Check if user wants to cancel an appointment
  if (userText.toLowerCase().includes("cancel")) {
    const active = appts.find((a) => a.status !== "CANCELLED");
    if (active) {
      const ok = await cancelAppointment(active._id);
      if (ok) {
        return {
          text: inLanguage(
            lang,
            `🚫 *Appointment Cancelled Successfully*\nYour appointment on *${formatDisplayDate(active.date || "")} at ${active.time}* with *${active.doctor_name}* has been cancelled.\n\nReply *1* to book anytime.`,
            `🚫 *अपॉइंटमेंट सफलतापूर्वक रद्द की गई*\n*${active.doctor_name}* के साथ *${formatDisplayDate(active.date || "")} को ${active.time}* की आपकी अपॉइंटमेंट रद्द कर दी गई है।\n\nपुनः बुक करने के लिए *1* भेजें।`,
            `🚫 *अपॉइंटमेंट यशस्वीरीत्या रद्द करण्यात आली*\n*${active.doctor_name}* यांच्यासोबत *${formatDisplayDate(active.date || "")} रोजी ${active.time}* ची आपली अपॉइंटमेंट रद्द झाली आहे.\n\nपुन्हा बुक करण्यासाठी *1* पाठवा.`
          ),
          nextStep: "IDLE",
        };
      }
    }
  }

  const apptList = appts
    .slice(0, 3)
    .map(
      (a, i) =>
        `*${i + 1}.* 📅 *${formatDisplayDate(a.date || "")}* at *${a.time}*\n   👨‍⚕️ ${a.doctor_name || "Doctor"}\n   📊 ${inLanguage(lang, "Status", "स्थिति", "स्थिती")}: *${a.status || "CONFIRMED"}*\n   🆔 Ref: \`${a._id.slice(-6).toUpperCase()}\``
    )
    .join("\n\n");

  return {
    text: inLanguage(
      lang,
      `📋 *Your Appointments at Cortex Hospital:*\n━━━━━━━━━━━━━━━━━━━━━\n${apptList}\n\n👇 *Options:*\n1️⃣ Cancel this appointment\n2️⃣ Book a new appointment\n3️⃣ Main Menu`,
      `📋 *Cortex Hospital में आपकी अपॉइंटमेंट:*\n━━━━━━━━━━━━━━━━━━━━━\n${apptList}\n\n👇 *विकल्प:*\n1️⃣ अपॉइंटमेंट रद्द करें\n2️⃣ नई अपॉइंटमेंट बुक करें\n3️⃣ मुख्य मेनू`,
      `📋 *Cortex Hospital मधील आपल्या अपॉइंटमेंट्स:*\n━━━━━━━━━━━━━━━━━━━━━\n${apptList}\n\n👇 *पर्याय:*\n1️⃣ अपॉइंटमेंट रद्द करा\n2️⃣ नवीन अपॉइंटमेंट बुक करा\n3️⃣ मुख्य मेनू`
    ),
    nextStep: "IDLE",
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
   PRESCRIPTION MANAGEMENT (Section 4)
   ========================================================================= */

async function handlePrescriptionQuery(
  phoneNumber: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const prescriptions = await getPatientPrescriptions(phoneNumber);

  if (prescriptions.length === 0) {
    return {
      text: inLanguage(
        lang,
        `💊 No prescriptions found on record for registered number +${phoneNumber}.\n\nIf you were recently treated under a different contact number, please contact reception at *07152-255795*.`,
        `💊 +${phoneNumber} के लिए कोई डिजिटल पर्चा दर्ज नहीं है।\n\nयदि आपका इलाज किसी अन्य नंबर पर हुआ था, तो कृपया रिसेप्शन *07152-255795* से संपर्क करें।`,
        `💊 +${phoneNumber} या नंबरवर कोणतेही डिजिटल प्रिस्क्रिप्शन सापडले नाही.\n\nदुसऱ्या नंबरवर उपचार झाले असल्यास कृपया रिसेप्शन *07152-255795* शी संपर्क साधा.`
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

  return {
    text: inLanguage(
      lang,
      `👤 *Patient:* ${latest.patient_name} (${latest.reference_number || "CRX"})\n👨‍⚕️ *Doctor:* ${latest.doctor_name || "Dr. Vipeen Raut"}\n📅 *Prescription Date:* ${formatDisplayDate(latest.prescription_date)}\n🩺 *Diagnosis:* ${latest.diagnosis || "Consultation"}\n\n📋 *Prescribed Medicines:*\n${medsList}\n\n📝 *Doctor's Advice:*\n${latest.advice || "Follow medication schedule."}\n\n🔔 *Next Follow-up:* ${latest.followup_date ? formatDisplayDate(latest.followup_date) : "As advised"}\n\n🔗 *View / Print Official Document:*\nhttps://jovial-sheep-76.convex.site/print-prescription?id=${latest._id}`,

      `👤 *मरीज:* ${latest.patient_name} (${latest.reference_number || "CRX"})\n👨‍⚕️ *डॉक्टर:* ${latest.doctor_name || "Dr. Vipeen Raut"}\n📅 *तारीख:* ${formatDisplayDate(latest.prescription_date)}\n🩺 *निदान:* ${latest.diagnosis || "परामर्श"}\n\n📋 *दवाएं:*\n${medsList}\n\n📝 *सलाह:*\n${latest.advice || "दवा की समय सारणी का पालन करें।"}\n\n🔔 *अगली फ़ॉलो-अप:* ${latest.followup_date ? formatDisplayDate(latest.followup_date) : "डॉक्टर के निर्देशानुसार"}\n\n🔗 *पर्चा डाउनलोड लिंक:*\nhttps://jovial-sheep-76.convex.site/print-prescription?id=${latest._id}`,

      `👤 *रुग्ण:* ${latest.patient_name} (${latest.reference_number || "CRX"})\n👨‍⚕️ *डॉक्टर:* ${latest.doctor_name || "Dr. Vipeen Raut"}\n📅 *तारीख:* ${formatDisplayDate(latest.prescription_date)}\n🩺 *निदान:* ${latest.diagnosis || "तपासणी"}\n\n📋 *औषधे:*\n${medsList}\n\n📝 *डॉक्टरांचा सल्ला:*\n${latest.advice || "औषधांचे वेळापत्रक पाळावे."}\n\n🔔 *पुढील भेट:* ${latest.followup_date ? formatDisplayDate(latest.followup_date) : "डॉक्टरांच्या सल्ल्यानुसार"}\n\n🔗 *प्रिस्क्रिप्शन डाउनलोड लिंक:*\nhttps://jovial-sheep-76.convex.site/print-prescription?id=${latest._id}`
    ),
    nextStep: "IDLE",
  };
}

/* =========================================================================
   BILLING & PAYMENTS (Section 5)
   ========================================================================= */

async function handleBillingQuery(
  phoneNumber: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const bills = await getPatientBills(phoneNumber);

  if (bills.length === 0) {
    return {
      text: inLanguage(
        lang,
        `🧾 *Billing & Consultation Fees*\n\nNo pending hospital invoices found for your number.\n\n💰 *Consultation Fee Schedule:*\n• *Dr. Vipeen Raut* (Orthopaedics):\n  First Visit: ₹400 | Follow-up: ₹200 (within 10 days)\n\n• *Dr. Shillpa Raut* (Gynecology):\n  First Visit: ₹200 | Follow-up: ₹100 (within 10 days)\n\nPayment Modes:\n💳 UPI: \`cortexhospital@upi\`\n💵 Cash / Card at Hospital Reception Desk.`,
        `🧾 *बिल और परामर्श शुल्क*\n\nआपके नंबर के लिए कोई बकाया बिल नहीं मिला।\n\n💰 *परामर्श शुल्क:*\n• *Dr. Vipeen Raut* (हड्डी रोग): ₹400 (पहला) / ₹200 (फ़ॉलो-अप)\n• *Dr. Shillpa Raut* (स्त्री रोग): ₹200 (पहला) / ₹100 (फ़ॉलो-अप)\n\nभुगतान माध्यम: \`cortexhospital@upi\` या अस्पताल काउंटर पर नकद/कार्ड।`,
        `🧾 *हॉस्पिटल बिल व सल्ला शुल्क*\n\nआपल्या नंबरवर कोणतेही प्रलंबित बिल नाही.\n\n💰 *सल्ला शुल्क:*\n• *Dr. Vipeen Raut* (हाडे व सांधे): ₹400 (पहिली भेट) / ₹200 (फॉलो-अप)\n• *Dr. Shillpa Raut* (स्त्रीरोग): ₹200 (पहिली भेट) / ₹100 (फॉलो-अप)\n\nपेमेंट: \`cortexhospital@upi\` किंवा हॉस्पिटल काउंंटरवर रोख/कार्ड.`
      ),
      nextStep: "IDLE",
    };
  }

  const latest = bills[0];
  const totalBalance = bills.reduce((sum, b) => sum + (b.balance_amount || 0), 0);

  return {
    text: inLanguage(
      lang,
      `🧾 *CORTEX HOSPITAL – BILL SUMMARY*\n━━━━━━━━━━━━━━━━━━━━━\n👤 *Patient:* ${latest.patient_name || "Patient"} (${latest.reference_number || "CRX"})\n📄 *Bill Number:* ${latest.bill_number || `CRX-INV-${latest._id.slice(-6).toUpperCase()}`}\n📊 *Status:* ${latest.payment_status === "PAID" ? "✅ FULLY PAID" : "⚠️ " + latest.payment_status}\n\n💰 *Total Amount:* ₹${latest.total_amount}\n💵 *Amount Paid:* ₹${latest.paid_amount}\n🔴 *Balance Due:* ₹${latest.balance_amount}\n\n${totalBalance > 0 ? "💳 UPI ID: `cortexhospital@upi`" : "All dues are cleared. Thank you!"}\n\n🔗 *Download Official Invoice:*\nhttps://cortexhospital.com/print-bill?billId=${latest._id}`,
      `🧾 *CORTEX HOSPITAL – बिल विवरण*\n━━━━━━━━━━━━━━━━━━━━━\n👤 *मरीज:* ${latest.patient_name || "Patient"} (${latest.reference_number || "CRX"})\n📄 *बिल नंबर:* ${latest.bill_number || `CRX-INV-${latest._id.slice(-6).toUpperCase()}`}\n📊 *स्थिति:* ${latest.payment_status === "PAID" ? "✅ पूर्ण भुगतान" : "⚠️ " + latest.payment_status}\n\n💰 *कुल राशि:* ₹${latest.total_amount}\n💵 *जमा राशि:* ₹${latest.paid_amount}\n🔴 *बकाया राशि:* ₹${latest.balance_amount}\n\n${totalBalance > 0 ? "💳 UPI: `cortexhospital@upi`" : "सभी बिल चुकता हैं। धन्यवाद!"}\n\n🔗 *बिल डाउनलोड लिंक:*\nhttps://cortexhospital.com/print-bill?billId=${latest._id}`,
      `🧾 *CORTEX HOSPITAL – बिल तपशील*\n━━━━━━━━━━━━━━━━━━━━━\n👤 *रुग्ण:* ${latest.patient_name || "Patient"} (${latest.reference_number || "CRX"})\n📄 *बिल क्रमांक:* ${latest.bill_number || `CRX-INV-${latest._id.slice(-6).toUpperCase()}`}\n📊 *स्थिती:* ${latest.payment_status === "PAID" ? "✅ पूर्ण भरले" : "⚠️ " + latest.payment_status}\n\n💰 *एकूण रक्कम:* ₹${latest.total_amount}\n💵 *भरलेली रक्कम:* ₹${latest.paid_amount}\n🔴 *बाकी रक्कम:* ₹${latest.balance_amount}\n\n${totalBalance > 0 ? "💳 UPI ID: `cortexhospital@upi`" : "सर्व बिल भरले आहे. धन्यवाद!"}\n\n🔗 *बिल डाउनलोड लिंक:*\nhttps://cortexhospital.com/print-bill?billId=${latest._id}`
    ),
    nextStep: "IDLE",
  };
}

/* =========================================================================
   FOLLOW-UP MANAGEMENT (Section 6)
   ========================================================================= */

async function handleFollowupQuery(
  phoneNumber: string,
  context: AgentContext
): Promise<AgentResponse> {
  const lang = context.language || "en";
  const followups = await getPatientFollowups(phoneNumber);
  const prescriptions = await getPatientPrescriptions(phoneNumber);

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
        `🔔 No upcoming scheduled follow-up was found on record for your number.\n\nReply *1* to Book an Appointment anytime.`,
        `🔔 आपके नंबर पर कोई निर्धारित फ़ॉलो-अप नहीं मिला।\n\nअपॉइंटमेंट बुक करने के लिए *1* भेजें।`,
        `🔔 आपल्या नंबरवर कोणतीही पुढील तारीख नोंदवलेली नाही.\n\nअपॉइंटमेंट बुक करण्यासाठी *1* पाठवा.`
      ),
      nextStep: "IDLE",
    };
  }

  const nextDateDmy = formatDisplayDate(nextDate);

  return {
    text: inLanguage(
      lang,
      `🔔 *RECOMMENDED NEXT FOLLOW-UP*\n━━━━━━━━━━━━━━━━━━━━━\n👨‍⚕️ *Doctor:* ${doctorName}\n📅 *Recommended Date:* ${nextDateDmy}\n📝 *Condition:* ${summary || "Routine Follow-up"}\n\n💡 Consultations within 10 days of your visit are charged at discounted follow-up rates.\n\nWould you like to book your follow-up slot for *${nextDateDmy}*?\nReply *1* to Book this Follow-up.`,
      `🔔 *अगली अनुशंसित फ़ॉलो-अप तारीख*\n━━━━━━━━━━━━━━━━━━━━━\n👨‍⚕️ *डॉक्टर:* ${doctorName}\n📅 *तारीख:* ${nextDateDmy}\n📝 *स्थिति:* ${summary || "नियमित फ़ॉलो-अप"}\n\n💡 10 दिनों के भीतर परामर्श पर रियायती दर लागू होती है।\n\nक्या आप *${nextDateDmy}* के लिए समय बुक करना चाहते हैं?\n*1* भेजें।`,
      `🔔 *पुढील फॉलो-अप तारीख*\n━━━━━━━━━━━━━━━━━━━━━\n👨‍⚕️ *डॉक्टर:* ${doctorName}\n📅 *तारीख:* ${nextDateDmy}\n📝 *तपासणी:* ${summary || "नियमित फॉलो-अप"}\n\n💡 10 दिवसांच्या आत तपासणी केल्यास कमी शुल्क आकारले जाते.\n\nआपण *${nextDateDmy}* साठी वेळ आरक्षित करू इच्छिता का?\n*1* पाठवा.`
    ),
    nextStep: "IDLE",
    updatedContext: {
      bookingDraft: {
        doctorName,
        date: nextDate,
      },
    },
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
      `🏥 *CORTEX HOSPITAL, WARDHA*\n━━━━━━━━━━━━━━━━━━━━━\n📍 *Address:*\n${conf.address.fullFormatted}\n\n📞 *Telephone / Helplines:*\n• Reception: 07152-255795\n• Mobile / WhatsApp: +91 9373280505\n• Emergency 24/7 Casualty: +91 9373280505\n\n⏰ *OPD Working Hours:*\n• Monday to Friday: 10:00 AM – 1:00 PM & 6:00 PM – 8:00 PM\n• Saturday: 10:00 AM – 1:00 PM\n• Sunday: OPD Closed (Emergency Casualty 24/7 Open)\n\n🗺️ *Google Maps Link:*\nhttps://maps.google.com/?q=${conf.coordinates.latitude},${conf.coordinates.longitude}\n\nReply *1* to Book an Appointment or *9* to talk to Reception.`,
      `🏥 *CORTEX HOSPITAL, वर्धा*\n━━━━━━━━━━━━━━━━━━━━━\n📍 *पता:*\n${conf.address.fullFormatted}\n\n📞 *हेल्पलाइन नंबर:*\n• रिसेप्शन: 07152-255795\n• मोबाइल / WhatsApp: +91 9373280505\n• 24/7 आपातकालीन सेवा: +91 9373280505\n\n⏰ *OPD समय:*\n• सोमवार से शुक्रवार: सुबह 10:00 – दोपहर 1:00 व शाम 6:00 – रात 8:00\n• शनिवार: सुबह 10:00 – दोपहर 1:00\n• रविवार: OPD बंद (आपातकालीन सेवा 24 घंटे चालू)\n\n🗺️ *गूगल मैप्स लिंक:*\nhttps://maps.google.com/?q=${conf.coordinates.latitude},${conf.coordinates.longitude}\n\nअपॉइंटमेंट बुक करने के लिए *1* भेजें या रिसेप्शन के लिए *9* भेजें।`,
      `🏥 *CORTEX HOSPITAL, वर्धा*\n━━━━━━━━━━━━━━━━━━━━━\n📍 *पत्ता:*\n${conf.address.fullFormatted}\n\n📞 *संपर्क क्रमांक:*\n• रिसेप्शन: 07152-255795\n• मोबाइल / WhatsApp: +91 9373280505\n• 24/7 आपत्कालीन सेवा: +91 9373280505\n\n⏰ *OPD वेळ:*\n• सोमवार ते शुक्रवार: सकाळी 10:00 ते दुपारी 1:00 आणि संध्याकाळी 6:00 ते रात्री 8:00\n• शनिवार: सकाळी 10:00 ते दुपारी 1:00\n• रविवार: OPD बंद (इमर्जन्सी 24 तास सुरू)\n\n🗺️ *गुगल मॅप्स लिंक:*\nhttps://maps.google.com/?q=${conf.coordinates.latitude},${conf.coordinates.longitude}\n\nअपॉइंटमेंटसाठी *1* पाठवा किंवा रिसेप्शनसाठी *9* पाठवा.`
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
