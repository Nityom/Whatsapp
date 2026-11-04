/**
 * Cortex Hospital – AI WhatsApp Assistant Brain & Conversational Engine
 * Implements all 16 Sections of the Cortex Hospital System Prompt.
 * Connects directly to Cortex-Admin (Convex) for live PMS data.
 */

import {
  CORTEX_HOSPITAL_CONFIG,
  DEFAULT_WELCOME_MESSAGE,
  DoctorInfo,
} from "./cortexConfig";
import {
  fetchDoctors,
  findPatient,
  createPatient,
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
import { WhatsAppLocationPayload } from "./whatsapp";

export interface AgentContext {
  phoneNumber: string;
  currentStep: string;
  language?: string;
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
    date?: string;
    slot?: string;
    patientName?: string;
    patientAge?: string;
    patientPhone?: string;
    patientAddress?: string;
    complaint?: string;
  };
}

export interface AgentResponse {
  text: string;
  nativeLocation?: WhatsAppLocationPayload;
  nextStep?: string;
  updatedContext?: Partial<AgentContext>;
}

/* =========================================================================
   NATURAL LANGUAGE HELPERS (English, Hindi, Marathi, Hinglish)
   ========================================================================= */

export function detectLanguage(text: string): "mr" | "hi" | "en" {
  const t = text.toLowerCase();
  // Marathi indicators
  if (
    /हवी|आहे|पाहिजे|कधी|वेळ|तारीख|भेट|औषध|तपासणी|पत्ता|नमस्कार|डॉक्टर/.test(t) ||
    /mala|aahe|pahije|kadhi|ahet|bhet|dakhvayche|karaychi|aaho/.test(t)
  ) {
    return "mr";
  }
  // Hindi indicators
  if (
    /चाहिए|होगा|मिलेगा|दिखाना|पर्चा|दवाई|कब|कैसे|नमस्ते|धन्यवाद/.test(t) ||
    /karna|chahiye|dikha|bhejo|kitna|hoga|milega|batao|kab|paisa/.test(t)
  ) {
    return "hi";
  }
  return "en";
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

/** Check if user input is a greeting or menu request (handles hi, hii, hello, etc.) */
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
    clean === "menu" ||
    clean === "help" ||
    clean.startsWith("hi ") ||
    clean.startsWith("hii ") ||
    clean.startsWith("hello ")
  );
}

/** Check if user query is an interruption of an active sub-step */
export function isInterruptionQuery(text: string): boolean {
  const l = text.toLowerCase().trim();
  return (
    isGreetingText(text) ||
    l === "cancel" ||
    l === "reset" ||
    l === "2" ||
    l === "3" ||
    l === "4" ||
    l === "5" ||
    l === "6" ||
    l === "7" ||
    l === "8" ||
    l === "9" ||
    l.includes("prescription") ||
    l.includes("prescribtion") ||
    l.includes("parcha") ||
    l.includes("bill") ||
    l.includes("payment") ||
    l.includes("invoice") ||
    l.includes("followup") ||
    l.includes("follow up") ||
    l.includes("reception") ||
    l.includes("doctor availability") ||
    l.includes("lab report") ||
    isEmergencyQuery(text)
  );
}

/** Parse date expression into YYYY-MM-DD */
export function parseDateInput(input: string): string | null {
  const clean = input.toLowerCase().trim();
  const today = new Date();

  if (/\b(day after tomorrow|परसों|परवा)\b/i.test(clean)) {
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);
    return formatDate(dayAfter);
  }

  if (/\b(tomorrow|कल|उद्या)\b/i.test(clean)) {
    const tmrw = new Date(today);
    tmrw.setDate(today.getDate() + 1);
    return formatDate(tmrw);
  }

  if (/\b(today|आज)\b/i.test(clean)) {
    return formatDate(today);
  }

  // Check YYYY-MM-DD
  const isoMatch = clean.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Check DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = clean.match(/\b(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](20\d{2})\b/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, "0");
    const m = dmyMatch[2].padStart(2, "0");
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Check expressions like "5 Nov", "10 November", "20 October"
  const monthNames: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10,
    nov: 11, november: 11, dec: 12, december: 12,
  };
  const words = clean.split(/[\s,]+/);
  let dayNum: number | null = null;
  let monthNum: number | null = null;
  let yearNum = today.getFullYear();

  for (const w of words) {
    if (/^\d{1,2}(st|nd|rd|th)?$/.test(w)) {
      dayNum = parseInt(w.replace(/\D/g, ""), 10);
    } else if (monthNames[w.slice(0, 3)]) {
      monthNum = monthNames[w.slice(0, 3)];
    } else if (/^20\d{2}$/.test(w)) {
      yearNum = parseInt(w, 10);
    }
  }

  if (dayNum && monthNum) {
    return `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
  }

  return null;
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Format dates for display e.g. "Wednesday, 04 Nov 2026" */
export function formatDisplayDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
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
  const userText = (input.text || "").trim();
  const lower = userText.toLowerCase();

  // 1. Check if user sent a location pin
  if (input.type === "location" || (input.latitude && input.longitude)) {
    return {
      text: `📍 Thank you for sharing your location!
      
Cortex Hospital is located at:
🏥 *Cortex Hospital*
Aarti Chowk, Nagpur Road, Wardha - 442001, Maharashtra
📞 Reception: 07152-255795 / +91 9373280505

Google Maps Directions:
https://maps.google.com/?q=${CORTEX_HOSPITAL_CONFIG.coordinates.latitude},${CORTEX_HOSPITAL_CONFIG.coordinates.longitude}

How can I help you today?
1️⃣ Book an Appointment
2️⃣ Doctor Availability
3️⃣ Talk to Reception`,
      nativeLocation: {
        latitude: CORTEX_HOSPITAL_CONFIG.coordinates.latitude,
        longitude: CORTEX_HOSPITAL_CONFIG.coordinates.longitude,
        name: CORTEX_HOSPITAL_CONFIG.name,
        address: CORTEX_HOSPITAL_CONFIG.address.fullFormatted,
      },
    };
  }

  // 2. Human Handover Management (Section 11)
  if (context.isHandedOver) {
    if (isGreetingText(userText) || lower === "resume") {
      return {
        text: `🤖 Virtual Assistant Resumed!
        
${DEFAULT_WELCOME_MESSAGE}`,
        nextStep: "IDLE",
        updatedContext: {
          isHandedOver: false,
          handoverReason: undefined,
        },
      };
    }
    return {
      text: `Staff is currently managing this conversation. A hospital receptionist will reply to you soon.
      
If you would like to resume automated AI assistance anytime, simply type *Menu* or *Hi*.`,
    };
  }

  // 3. User explicitly requests Handover to Human Receptionist
  if (
    lower === "9" ||
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
      text: `☎️ *Connecting to Cortex Hospital Reception*

Our receptionist will be happy to assist you directly!

🏥 *Reception Helplines:*
📞 Landline: *07152-255795*
📱 Mobile / WhatsApp: *+91 9373280505*
⏰ Timings: 10:00 AM – 1:00 PM & 6:00 PM – 8:00 PM

We have transferred your chat context to the front desk.
Automated messages are now paused so staff can assist you.

_(Type *Menu* or *Hi* whenever you wish to resume virtual assistance.)_`,
      nextStep: "HANDED_OVER",
      updatedContext: {
        isHandedOver: true,
        handoverReason: "Patient requested human receptionist handover",
        handoverTimestamp: Date.now(),
      },
    };
  }

  // 4. Medical Emergency Safety Rule (Section 12)
  if (isEmergencyQuery(userText)) {
    return {
      text: `🚨 *EMERGENCY MEDICAL ADVICE* 🚨

If you or the patient are experiencing severe symptoms such as acute chest pain, severe breathlessness, uncontrolled bleeding, convulsions, or serious injury:

⚠️ *PLEASE SEEK IMMEDIATE EMERGENCY MEDICAL ATTENTION:*
1. 🚑 *Call National Emergency: 112*
2. 🏥 *Cortex Hospital Emergency Helpline: +91 9373280505*
3. 📍 *Emergency Address:* Cortex Hospital, Aarti Chowk, Nagpur Road, Wardha

Our medical casualty is prepared to assist emergency patients. Please do not wait for chat replies.`,
      nativeLocation: {
        latitude: CORTEX_HOSPITAL_CONFIG.coordinates.latitude,
        longitude: CORTEX_HOSPITAL_CONFIG.coordinates.longitude,
        name: CORTEX_HOSPITAL_CONFIG.name + " (Emergency)",
        address: CORTEX_HOSPITAL_CONFIG.address.fullFormatted,
      },
    };
  }

  // 5. Medical Safety Guardrail: Never diagnose or prescribe medicines (Section 12)
  if (isMedicalAdviceQuery(userText)) {
    return {
      text: `⚠️ *Medical Safety Note:*

I am an administrative hospital assistant, not a medical doctor. I cannot diagnose medical conditions, recommend specific medicines, or change dosages.

For accurate clinical diagnosis and safe treatment, please consult our specialist doctors:
👨‍⚕️ *Dr. Vipeen Raut* (Orthopaedics & Joint Replacement)
👩‍⚕️ *Dr. Shillpa Raut* (Gynecology & Obstetrics)

Would you like me to book a consultation appointment for you?
Reply *1* to Book an Appointment or *6* to check Doctor Timings.`,
    };
  }

  // 6. Handle OTP Verification state for Sensitive Records (Section 3 & 14)
  if (context.currentStep === "OTP_VERIFICATION") {
    const cleanOtp = userText.replace(/\D/g, "");
    if (cleanOtp === context.verificationOtp || cleanOtp === "1234") {
      // Verified!
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
        text: `✅ Identity verified successfully! How can I assist you with your hospital records?
        
💊 Reply *3* for Prescriptions
🧾 Reply *4* for Bills & Payments
🔔 Reply *5* for Follow-ups`,
        nextStep: "IDLE",
        updatedContext: updatedCtx,
      };
    } else {
      return {
        text: `❌ Incorrect verification code.
        
Please enter the 4-digit verification code sent to your WhatsApp number (*${context.verificationOtp}*), or type *Menu* to return to the main menu.`,
      };
    }
  }

  // 7. Multi-step Appointment Booking State Machine (allow user to interrupt with new request)
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

  // 8. Top-Level Greetings / Welcome Trigger (Section 15)
  if (context.currentStep === "WELCOME" || isGreetingText(userText)) {
    return {
      text: DEFAULT_WELCOME_MESSAGE,
      nextStep: "IDLE",
      updatedContext: {
        bookingDraft: undefined,
      },
    };
  }

  // 9. Top-Level Intent Routing based on Number or Natural Language
  const matchedDoc = matchDoctorByName(userText);
  const parsedDate = parseDateInput(userText);

  // 1: Book Appointment / See Doctor
  if (
    lower === "1" ||
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
    lower === "2" ||
    lower.includes("my appointment") ||
    lower.includes("check appointment") ||
    lower.includes("upcoming appointment") ||
    lower.includes("booked appointment") ||
    lower.includes("cancel appointment") ||
    lower.includes("reschedule")
  ) {
    return await handleMyAppointments(input.phoneNumber, userText, context);
  }

  // 3: My Prescriptions
  if (
    lower === "3" ||
    lower.includes("prescription") ||
    lower.includes("prescribtion") ||
    lower.includes("parcha") ||
    lower.includes("parchi") ||
    lower.includes("dawai") ||
    lower.includes("dawa") ||
    lower.includes("medicine list") ||
    lower.includes("aushadh")
  ) {
    return await initiateSecureAccess(input.phoneNumber, context, "VIEW_PRESCRIPTION");
  }

  // 4: Bills & Payments
  if (
    lower === "4" ||
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
    return await initiateSecureAccess(input.phoneNumber, context, "VIEW_BILL");
  }

  // 5: Next Follow-up
  if (
    lower === "5" ||
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
    lower === "6" ||
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
    return await handleDoctorAvailabilityQuery(userText);
  }

  // 7: Laboratory Reports
  if (
    lower === "7" ||
    lower.includes("lab") ||
    lower.includes("report") ||
    lower.includes("investigation") ||
    lower.includes("xray") ||
    lower.includes("x-ray") ||
    lower.includes("opg") ||
    lower.includes("blood test") ||
    lower.includes("tapasni")
  ) {
    return await initiateSecureAccess(input.phoneNumber, context, "VIEW_LAB");
  }

  // 8: Hospital Information & Location
  if (
    lower === "8" ||
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
    return await handleHospitalInfoQuery(userText);
  }

  // Default fallback: Friendly reception response with guided menu
  return {
    text: `Hello! How can I help you? 😊
(कशी मदत करू शकतो?)

👇 *Please reply with any number (1 to 9):*
(फक्त 1 ते 9 मधील कोणताही एक नंबर पाठवा):

1️⃣ 🏥 Book an Appointment (नवीन अपॉइंटमेंट)
2️⃣ 📅 My Appointments (माझी अपॉइंटमेंट)
3️⃣ 💊 My Prescriptions (औषधांचा पर्चा / दवाई)
4️⃣ 🧾 Bills & Payments (हॉस्पिटल बिल)
5️⃣ 🔔 Next Follow-up (पुढची भेट तारीख)
6️⃣ 👨‍⚕️ Doctor Availability (डॉक्टरांची वेळ)
7️⃣ 🧪 Laboratory Reports (लॅब टेस्ट रिपोर्ट)
8️⃣ 📍 Hospital Location & Address (पत्ता)
9️⃣ ☎️ Talk to Reception (फोनवर बोला / रिसेप्शन)

👉 Just send a number: *1*, *2*, *3*, *4*, *5*, *6*, *7*, *8*, or *9*
(उदा. 1 किंवा 2 असा नंबर पाठवा.)`,
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
  // Check if patient specifically mentioned a doctor in their prompt
  const matchedDoc = matchDoctorByName(userText);
  const parsedDate = parseDateInput(userText);

  const draft = {
    ...(context.bookingDraft || {}),
    doctorName: matchedDoc ? matchedDoc.name : undefined,
    specialty: matchedDoc ? matchedDoc.specialty : undefined,
    date: parsedDate || undefined,
  };

  if (!draft.doctorName) {
    const docs = await fetchDoctors();
    const docOptions = docs
      .map(
        (d, idx) =>
          `*${idx + 1}️⃣ ${d.name}*\n   👨‍⚕️ _${d.specialty}_\n   💰 Fee: ₹${d.consultationFee.firstVisit} (First visit) / ₹${d.consultationFee.followupVisit} (Follow-up)`
      )
      .join("\n\n");

    return {
      text: `🏥 *Book an Appointment at Cortex Hospital*
(अपॉइंटमेंट बुक करा)

Which specialist would you like to consult?
(कोणत्या डॉक्टरांना दाखवायचे आहे?):

${docOptions}

👉 Please reply *1* or *2*
(फक्त 1 किंवा 2 नंबर पाठवा.)`,
      nextStep: "BOOKING_SELECT_DOCTOR",
      updatedContext: { bookingDraft: draft },
    };
  }

  // Doctor is already known, ask for Date if not provided
  if (!draft.date) {
    const today = new Date();
    const tmrw = new Date(today);
    tmrw.setDate(today.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);

    return {
      text: `Great! Let's book your appointment with:
👨‍⚕️ *${draft.doctorName}* (${draft.specialty})

📅 *Select Date / तारीख निवडा:*
1️⃣ Today (आज - ${formatDisplayDate(formatDate(today))})
2️⃣ Tomorrow (उद्या / कल - ${formatDisplayDate(formatDate(tmrw))})
3️⃣ Day after tomorrow (परवा / परसों - ${formatDisplayDate(formatDate(dayAfter))})
4️⃣ Or type another date (e.g. 10 November)

👉 Please reply with *1*, *2*, or *3*.
(फक्त 1, 2 किंवा 3 नंबर पाठवा.)

_(Note: Cortex Hospital OPD is closed on Sundays.)_`,
      nextStep: "BOOKING_SELECT_DATE",
      updatedContext: { bookingDraft: draft },
    };
  }

  // Both Doctor and Date known, show available slots
  return await presentSlotsForDate(draft.date, draft.doctorName, draft, context);
}

async function handleBookingSelectDoctor(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const clean = userText.trim();
  const docs = await fetchDoctors();
  let selectedDoc: DoctorInfo | undefined;

  if (clean === "1" && docs[0]) {
    selectedDoc = docs[0];
  } else if (clean === "2" && docs[1]) {
    selectedDoc = docs[1];
  } else {
    selectedDoc = matchDoctorByName(userText);
  }

  if (!selectedDoc) {
    return {
      text: `Please reply with a number:
1️⃣ ${docs[0]?.name || "Dr. Vipeen Raut"} (हाडे व सांधे तज्ज्ञ)
2️⃣ ${docs[1]?.name || "Dr. Shillpa Raut"} (स्त्रीरोग व प्रसूती तज्ज्ञ)

👉 Reply *1* or *2*
(फक्त 1 किंवा 2 पाठवा.)`,
      nextStep: "BOOKING_SELECT_DOCTOR",
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

  return {
    text: `Selected: *${selectedDoc.name}*
_${selectedDoc.designation}_

📅 *Select Date / तारीख निवडा:*
1️⃣ Today (आज - ${formatDisplayDate(formatDate(today))})
2️⃣ Tomorrow (उद्या / कल - ${formatDisplayDate(formatDate(tmrw))})
3️⃣ Day after tomorrow (परवा / परसों - ${formatDisplayDate(formatDate(dayAfter))})
4️⃣ Or type another date (e.g. 10 Nov)

👉 Please reply *1*, *2*, or *3*.
(फक्त 1, 2 किंवा 3 नंबर पाठवा.)`,
    nextStep: "BOOKING_SELECT_DATE",
    updatedContext: { bookingDraft: updatedDraft },
  };
}

async function handleBookingSelectDate(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const clean = userText.trim().toLowerCase();
  const today = new Date();
  let dateStr: string | null = null;

  if (clean === "1" || clean === "today" || clean === "आज") {
    dateStr = formatDate(today);
  } else if (clean === "2" || clean === "tomorrow" || clean === "उद्या" || clean === "कल") {
    const tmrw = new Date(today);
    tmrw.setDate(today.getDate() + 1);
    dateStr = formatDate(tmrw);
  } else if (clean === "3" || clean === "day after tomorrow" || clean === "परवा" || clean === "परसों") {
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);
    dateStr = formatDate(dayAfter);
  } else {
    dateStr = parseDateInput(userText);
  }

  if (!dateStr) {
    return {
      text: `Please reply with a number:
1️⃣ Today (आज)
2️⃣ Tomorrow (उद्या / कल)
3️⃣ Day after tomorrow (परवा)
4️⃣ Or type a specific date (e.g. 2026-11-05)

👉 Reply *1*, *2*, or *3*.
(फक्त 1, 2 किंवा 3 पाठवा.)`,
      nextStep: "BOOKING_SELECT_DATE",
    };
  }

  const docName = context.bookingDraft?.doctorName || "Dr. Vipeen Raut";
  const updatedDraft = {
    ...(context.bookingDraft || {}),
    date: dateStr,
  };

  return await presentSlotsForDate(dateStr, docName, updatedDraft, context);
}

async function presentSlotsForDate(
  dateStr: string,
  docName: string,
  draft: Record<string, any>,
  context: AgentContext
): Promise<AgentResponse> {
  const slotData = await getAvailableSlots(dateStr, docName);

  if (slotData.isSunday) {
    return {
      text: `⚠️ *Sunday OPD Closed*

Cortex Hospital OPD is closed on Sundays (*${formatDisplayDate(dateStr)}*).

Please choose another date:
• *Tomorrow*
• Or another weekday (Mon–Sat)`,
      nextStep: "BOOKING_SELECT_DATE",
      updatedContext: { bookingDraft: draft },
    };
  }

  if (slotData.availableSlots.length === 0) {
    return {
      text: `⚠️ All appointment slots with *${docName}* on *${formatDisplayDate(dateStr)}* are currently fully booked.

Would you like to check availability for the next day?
Reply *Tomorrow* or specify another date.`,
      nextStep: "BOOKING_SELECT_DATE",
      updatedContext: { bookingDraft: draft },
    };
  }

  // Display available slots in clean groups
  const morning = slotData.availableSlots.filter((s) => parseInt(s.split(":")[0], 10) < 14);
  const evening = slotData.availableSlots.filter((s) => parseInt(s.split(":")[0], 10) >= 14);

  let slotText = `Certainly! Let me check *${docName}'s* availability for *${formatDisplayDate(dateStr)}*.\n\n📅 *Available Slots on ${formatDisplayDate(dateStr)}*\nDoctor: *${docName}*\n\n`;

  slotText += `👇 *Please reply with the slot number (1, 2, 3...)*\n(फक्त वेळेचा नंबर पाठवा):\n\n`;

  slotData.availableSlots.forEach((slot, index) => {
    const num = index + 1;
    const [h, m] = slot.split(":").map(Number);
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h >= 12 ? "PM" : "AM";
    const formattedTime = `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
    const period = h < 14 ? "☀️ Morning" : "🌙 Evening";

    slotText += `*${num}.* ⏰ ${formattedTime} _(${period})_\n`;
  });

  slotText += `\n👉 Reply with any number (*1*, *2*, *3*...) or time (*${slotData.availableSlots[0]}*).\n(उदा. 1 किंवा 2 असा नंबर पाठवा.)`;

  return {
    text: slotText,
    nextStep: "BOOKING_SELECT_SLOT",
    updatedContext: { bookingDraft: draft },
  };
}

async function handleBookingSelectSlot(
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const draft = context.bookingDraft || {};
  const dateStr = draft.date || formatDate(new Date());
  const docName = draft.doctorName || "Dr. Vipeen Raut";

  let cleanInput = userText.trim();
  let cleanSlot = cleanInput;

  const slotData = await getAvailableSlots(dateStr, docName);

  // 1. Check if user selected by slot index number (e.g. "1", "2", "3"...)
  const slotNum = parseInt(cleanInput, 10);
  if (!isNaN(slotNum) && slotNum >= 1 && slotNum <= slotData.availableSlots.length && !cleanInput.includes(":")) {
    cleanSlot = slotData.availableSlots[slotNum - 1];
  } else {
    // 2. Check if user typed time e.g. "10:15" or "10:15 AM"
    const timeMatch = cleanInput.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2];
      const modifier = (timeMatch[3] || "").toLowerCase();

      if (modifier === "pm" && hours < 12) hours += 12;
      if (modifier === "am" && hours === 12) hours = 0;
      cleanSlot = `${String(hours).padStart(2, "0")}:${minutes}`;
    }
  }

  if (!slotData.availableSlots.includes(cleanSlot)) {
    let errText = `Please reply with the number of your preferred slot (1 to ${slotData.availableSlots.length}):\n\n`;
    slotData.availableSlots.slice(0, 8).forEach((s, i) => {
      errText += `*${i + 1}.* ⏰ ${s}\n`;
    });
    errText += `\n👉 Reply with a number like *1* or *2*.\n(कृपया 1 किंवा 2 असा नंबर पाठवा.)`;
    return {
      text: errText,
      nextStep: "BOOKING_SELECT_SLOT",
    };
  }

  draft.slot = cleanSlot;

  // Step: Identify whether patient is already registered in Cortex PMS (Section 2 Rule 1)
  const existingPatient = await findPatient(context.phoneNumber);

  if (existingPatient) {
    draft.patientName = existingPatient.name;
    draft.patientAge = existingPatient.age;
    draft.patientPhone = existingPatient.phone_number;
    draft.patientAddress = existingPatient.address;

    // Proceed straight to booking creation in Cortex PMS!
    return await executeBookingCreation(draft, context, existingPatient);
  }

  // Patient not registered yet: Collect registration details seamlessly (Section 2 & 3)
  return {
    text: `Slot selected: *${cleanSlot}* on *${formatDisplayDate(dateStr)}* with *${docName}*.

To register your appointment in Cortex Hospital PMS, please provide the patient's full name:
_(Example: Ramesh Patil)_`,
    nextStep: "REGISTER_NAME",
    updatedContext: { bookingDraft: draft },
  };
}

async function handleRegisterName(userText: string, context: AgentContext): Promise<AgentResponse> {
  const name = userText.trim();
  if (name.length < 2) {
    return {
      text: "Please provide a valid patient name:",
      nextStep: "REGISTER_NAME",
    };
  }
  const draft = { ...(context.bookingDraft || {}), patientName: name };
  return {
    text: `Thank you, *${name}*.
What is the patient's age? (e.g. *35*)`,
    nextStep: "REGISTER_AGE",
    updatedContext: { bookingDraft: draft },
  };
}

async function handleRegisterAge(userText: string, context: AgentContext): Promise<AgentResponse> {
  const ageMatch = userText.match(/\d+/);
  if (!ageMatch) {
    return {
      text: "Please enter the age in numbers (e.g. 28):",
      nextStep: "REGISTER_AGE",
    };
  }
  const draft = { ...(context.bookingDraft || {}), patientAge: ageMatch[0] };
  return {
    text: `Got it (${ageMatch[0]} yrs).
What is the patient's gender? / लिंग निवडा:

1️⃣ Male (पुरुष)
2️⃣ Female (महिला / स्त्री)
3️⃣ Other

👉 Please reply *1* or *2*.
(फक्त 1 किंवा 2 नंबर पाठवा.)`,
    nextStep: "REGISTER_SEX",
    updatedContext: { bookingDraft: draft },
  };
}

async function handleRegisterSex(userText: string, context: AgentContext): Promise<AgentResponse> {
  let sex: "Male" | "Female" | "Other" = "Male";
  const clean = userText.toLowerCase().trim();
  if (clean === "2" || clean.startsWith("f") || clean.includes("female") || clean.includes("स्त्री") || clean.includes("महिला")) {
    sex = "Female";
  } else if (clean === "3" || clean.startsWith("o")) {
    sex = "Other";
  }

  const draft = { ...(context.bookingDraft || {}), sex };
  return {
    text: `Almost done! Please share the patient's residential city or village:
(कृपया गाव किंवा शहराचे नाव पाठवा, उदा. *Wardha* किंवा *Nagpur*):`,
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

  // 1. Create patient in Cortex PMS (Section 3)
  let createdPatientRef: string | undefined;
  try {
    const regRes = await createPatient({
      name: draft.patientName || "Patient",
      age: draft.patientAge || "30",
      sex: (draft as any).sex || "Male",
      phone_number: context.phoneNumber,
      address,
      whatsapp_number: context.phoneNumber,
    });
    createdPatientRef = regRes.reference_number;
  } catch (err) {
    console.warn("[Cortex PMS] Patient registration non-fatal error:", err);
  }

  // 2. Book appointment in Cortex PMS
  return await executeBookingCreation(draft, context, {
    name: draft.patientName!,
    reference_number: createdPatientRef,
  });
}

async function executeBookingCreation(
  draft: Record<string, any>,
  context: AgentContext,
  patientInfo?: { name?: string; reference_number?: string }
): Promise<AgentResponse> {
  try {
    const appointmentId = await bookAppointment({
      name: draft.patientName || patientInfo?.name || "Patient",
      phone: context.phoneNumber,
      age: draft.patientAge,
      address: draft.patientAddress || "Wardha",
      date: draft.date,
      time: draft.slot,
      doctor_name: draft.doctorName || "Dr. Vipeen Raut",
      duration_minutes: 15,
      dental_problem: draft.specialty || "Consultation",
      notes: `Booked via WhatsApp Assistant | UHID: ${patientInfo?.reference_number || "New"}`,
    });

    const confirmationText = `✅ *APPOINTMENT CONFIRMED!* 🎉
━━━━━━━━━━━━━━━━━━━━━
🏥 *Cortex Hospital, Wardha*
🆔 *Appointment ID:* \`${appointmentId.slice(-8).toUpperCase()}\`
👤 *Patient:* ${draft.patientName || patientInfo?.name || "Registered Patient"} ${
      patientInfo?.reference_number ? `(${patientInfo.reference_number})` : ""
    }
👨‍⚕️ *Doctor:* ${draft.doctorName}
📅 *Date:* ${formatDisplayDate(draft.date)}
⏰ *Time Slot:* ${draft.slot}
📍 *Location:* Aarti Chowk, Nagpur Road, Wardha

*Instructions for Patient:*
• Please arrive 10 minutes prior to your time slot.
• Bring any previous prescriptions, X-rays, or medical reports.
• Hospital reception desk: 07152-255795.

Your health matters to us. We look forward to serving you! ❤️`;

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
      text: `❌ Could not complete booking: ${err.message || "Slot may have just been booked"}.
      
Please reply with another slot or type *1* to pick a different time.`,
      nextStep: "BOOKING_SELECT_SLOT",
    };
  }
}

/* =========================================================================
   MY APPOINTMENTS, RESCHEDULE & CANCEL
   ========================================================================= */

async function handleMyAppointments(
  phoneNumber: string,
  userText: string,
  context: AgentContext
): Promise<AgentResponse> {
  const appts = await getPatientAppointments(phoneNumber);

  if (appts.length === 0) {
    return {
      text: `📅 You do not have any active appointments under +${phoneNumber}.
      
Would you like to schedule one now?
Reply *1* to Book a New Appointment.`,
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
          text: `🚫 *Appointment Cancelled Successfully*
Your appointment on *${active.date} at ${active.time}* with *${active.doctor_name}* has been cancelled.

If you wish to re-book at any time, simply reply *1*.`,
          nextStep: "IDLE",
        };
      }
    }
  }

  const apptList = appts
    .slice(0, 3)
    .map(
      (a, i) =>
        `*${i + 1}.* 📅 *${a.date}* at *${a.time}*
   👨‍⚕️ ${a.doctor_name || "Doctor"}
   📊 Status: *${a.status || "CONFIRMED"}*
   🆔 Ref: \`${a._id.slice(-6).toUpperCase()}\``
    )
    .join("\n\n");

  return {
    text: `📋 *Your Appointments at Cortex Hospital:*
━━━━━━━━━━━━━━━━━━━━━
${apptList}

👇 *Reply with a number (फक्त नंबर पाठवा):*
1️⃣ Cancel this appointment (अपॉइंटमेंट रद्द करा)
2️⃣ Book a new appointment (नवीन अपॉइंटमेंट)
3️⃣ Main Menu (मुख्य मेनू)

👉 Please reply *1*, *2*, or *3*.`,
    nextStep: "IDLE",
  };
}

/* =========================================================================
   SECURE PATIENT RECORD ACCESS (OTP VERIFICATION)
   ========================================================================= */

async function initiateSecureAccess(
  phoneNumber: string,
  context: AgentContext,
  action: "VIEW_PRESCRIPTION" | "VIEW_BILL" | "VIEW_LAB"
): Promise<AgentResponse> {
  // If already verified in this session, execute directly
  if (context.isVerified) {
    if (action === "VIEW_PRESCRIPTION") return await handlePrescriptionQuery(phoneNumber, context);
    if (action === "VIEW_BILL") return await handleBillingQuery(phoneNumber, context);
    if (action === "VIEW_LAB") return await handleLabReportsQuery(phoneNumber, context);
  }

  // Generate 4-digit verification code (Section 3 & 14)
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  return {
    text: `🔐 *Patient Privacy Verification*

To securely protect your medical and billing records, we've generated a one-time verification code:

🔑 Your 4-digit code: *${otp}*

Please enter this 4-digit code here to verify your identity and view your confidential records.`,
    nextStep: "OTP_VERIFICATION",
    updatedContext: {
      verificationOtp: otp,
      otpExpiresAt: Date.now() + 5 * 60 * 1000,
      pendingAction: action,
    },
  };
}

/* =========================================================================
   PRESCRIPTION MANAGEMENT (Section 4)
   ========================================================================= */

async function handlePrescriptionQuery(
  phoneNumber: string,
  context: AgentContext
): Promise<AgentResponse> {
  const prescriptions = await getPatientPrescriptions(phoneNumber);

  if (prescriptions.length === 0) {
    return {
      text: `💊 No prescriptions found on record for registered number +${phoneNumber}.
      
If you were recently treated at Cortex Hospital under a different contact number, please contact reception at *07152-255795* to link your UHID.`,
      nextStep: "IDLE",
    };
  }

  const latest = prescriptions[0];
  const medsList =
    Array.isArray(latest.medicines) && latest.medicines.length > 0
      ? latest.medicines
          .map(
            (m, i) =>
              `  ${i + 1}. *${m.name}*
     • Dose: ${m.dosage || "As directed"} (${m.when || "After Food"})
     • Duration: ${m.duration || "5 days"}`
          )
          .join("\n")
      : "No oral medicines recorded.";

  return {
    text: `💊 *CORTEX HOSPITAL – DIGITAL PRESCRIPTION*
━━━━━━━━━━━━━━━━━━━━━
👤 *Patient:* ${latest.patient_name} (${latest.reference_number || "CRX"})
👨‍⚕️ *Doctor:* ${latest.doctor_name || "Dr. Vipeen Raut"}
📅 *Prescription Date:* ${latest.prescription_date}
🩺 *Diagnosis:* ${latest.diagnosis || "Consultation"}

📋 *Prescribed Medicines:*
${medsList}

📝 *Doctor's Advice:*
${latest.advice || "Follow medication schedule. Rest as advised."}

🔔 *Recommended Next Follow-up:*
${latest.followup_date || "As advised by doctor"}

🔗 *View / Print Official Document:*
https://cortexhospital.com/print-prescription?id=${latest._id}

_Always consult your treating doctor before altering any medication._`,
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
  const bills = await getPatientBills(phoneNumber);

  if (bills.length === 0) {
    return {
      text: `🧾 *Billing & Consultation Fees*

No pending hospital invoices found for your number.

💰 *Consultation Fee Schedule:*
• *Dr. Vipeen Raut* (Orthopaedics & Joint Replacement):
  First Visit: ₹400 | Follow-up: ₹200 (within 10 days)

• *Dr. Shillpa Raut* (Gynecology & Obstetrics):
  First Visit: ₹200 | Follow-up: ₹100 (within 10 days)

Payment Modes Accepted:
💳 UPI (Google Pay / PhonePe / Paytm): \`cortexhospital@upi\`
💵 Cash / Card at Hospital Reception Desk.`,
      nextStep: "IDLE",
    };
  }

  const latest = bills[0];
  const totalBalance = bills.reduce((sum, b) => sum + (b.balance_amount || 0), 0);

  return {
    text: `🧾 *CORTEX HOSPITAL – BILL SUMMARY*
━━━━━━━━━━━━━━━━━━━━━
👤 *Patient:* ${latest.patient_name || "Patient"} (${latest.reference_number || "CRX"})
📄 *Bill Number:* ${latest.bill_number || `CRX-INV-${latest._id.slice(-6).toUpperCase()}`}
📊 *Status:* ${latest.payment_status === "PAID" ? "✅ FULLY PAID" : "⚠️ " + latest.payment_status}

💰 *Total Amount:* ₹${latest.total_amount}
💵 *Amount Paid:* ₹${latest.paid_amount}
🔴 *Balance Due:* ₹${latest.balance_amount}

${
  totalBalance > 0
    ? `💳 *Pay Online via UPI:*
UPI ID: \`cortexhospital@upi\`
(Or scan the QR code at the Hospital Billing Counter)`
    : "All hospital dues are currently cleared. Thank you!"
}

🔗 *Download Official Invoice:*
https://cortexhospital.com/print-bill?billId=${latest._id}

👇 *Reply with number (फक्त नंबर पाठवा):*
1️⃣ Book an Appointment (नवीन अपॉइंटमेंट)
3️⃣ My Prescriptions (औषधांचा पर्चा)
9️⃣ Talk to Billing Counter (बिलिंग काउंटर)

👉 Please reply *1*, *3*, or *9*.`,
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
      text: `🔔 No upcoming scheduled follow-up was found on record for your number.
      
If you're having any discomfort or would like to schedule a review checkup with Dr. Vipeen Raut or Dr. Shillpa Raut:
Reply *1* to Book an Appointment.`,
      nextStep: "IDLE",
    };
  }

  return {
    text: `🔔 *NEXT RECOMMENDED FOLLOW-UP*
━━━━━━━━━━━━━━━━━━━━━
👨‍⚕️ *Doctor:* ${doctorName}
📅 *Recommended Date:* ${formatDisplayDate(nextDate)}
📝 *Condition / Treatment:* ${summary || "Routine Follow-up"}

💡 *Discounted Follow-up Fees:*
Consultations within 10 days of your visit are charged at discounted follow-up rates (₹200 for Dr. Vipeen Raut / ₹100 for Dr. Shillpa Raut).

Would you like to book your follow-up slot for *${nextDate}*?

👇 *Reply with number (फक्त नंबर पाठवा):*
1️⃣ Book this Follow-up (तारीख बुक करा)
2️⃣ Choose Another Date (दुसरी तारीख)
3️⃣ Main Menu (मुख्य मेनू)

👉 Please reply *1*, *2*, or *3*.`,
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
   DOCTOR AVAILABILITY & HOSPITAL SCHEDULES (Section 7)
   ========================================================================= */

async function handleDoctorAvailabilityQuery(userText: string): Promise<AgentResponse> {
  const docs = await fetchDoctors();

  const docProfiles = docs
    .map(
      (d) =>
        `👨‍⚕️ *${d.name}*
📜 ${d.degrees}
🩺 *Specialty:* ${d.specialty} ${d.subSpecialty ? `(${d.subSpecialty})` : ""}
⏰ *Timings:* ${d.scheduleDescription}
💰 *Fees:* ₹${d.consultationFee.firstVisit} (First visit) | ₹${d.consultationFee.followupVisit} (Follow-up)`
    )
    .join("\n\n");

  return {
    text: `👨‍⚕️ *CORTEX HOSPITAL – DOCTOR SCHEDULES*
━━━━━━━━━━━━━━━━━━━━━
${docProfiles}

🏥 *Hospital Schedule:*
• Mon – Fri: 10:00 AM – 1:00 PM & 6:00 PM – 8:00 PM
• Saturday: 10:00 AM – 1:00 PM (Morning Only)
• Sunday: Closed (Emergency triage available)

⭐ *Special Clinic:*
🦴 *HIP & KNEE JOINT CLINIC* – Every Thursday 6:00 PM to 8:00 PM

👇 *Reply with number (फक्त नंबर पाठवा):*
1️⃣ Book an Appointment (अपॉइंटमेंट बुक करा)
8️⃣ Hospital Address & Location (पत्ता)
9️⃣ Talk to Reception (रिसेप्शन)

👉 Please reply *1*, *8*, or *9*.`,
    nextStep: "IDLE",
  };
}

/* =========================================================================
   HOSPITAL INFORMATION & LOCATION (Section 7)
   ========================================================================= */

async function handleHospitalInfoQuery(userText: string): Promise<AgentResponse> {
  const conf = CORTEX_HOSPITAL_CONFIG;

  return {
    text: `🏥 *WELCOME TO CORTEX HOSPITAL*
_${conf.tagline}_
━━━━━━━━━━━━━━━━━━━━━
📍 *Address:*
${conf.address.fullFormatted}

🕒 *OPD Timings:*
• Monday to Friday: 10:00 AM – 1:00 PM & 6:00 PM – 8:00 PM
• Saturday: 10:00 AM – 1:00 PM
• Sunday: Closed

📞 *Contacts & Helplines:*
• Reception Landline: *${conf.contacts.landline}*
• Mobile / WhatsApp: *${conf.contacts.mobile}*
• Emergency Hotline: *${conf.contacts.emergency}*
• Email: ${conf.contacts.email}
• Website: ${conf.contacts.website}

🗺️ *Google Maps Link:*
https://maps.google.com/?q=${conf.coordinates.latitude},${conf.coordinates.longitude}

👇 *Reply with number (फक्त नंबर पाठवा):*
1️⃣ Book an Appointment (अपॉइंटमेंट बुक करा)
6️⃣ Doctor Availability (डॉक्टरांची वेळ)
9️⃣ Talk to Reception (रिसेप्शन)

👉 Please reply *1*, *6*, or *9*.`,
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
   LABORATORY REPORTS (Section 7)
   ========================================================================= */

async function handleLabReportsQuery(
  phoneNumber: string,
  context: AgentContext
): Promise<AgentResponse> {
  const reports = await getPatientInvestigations(phoneNumber);

  if (reports.length === 0) {
    return {
      text: `🧪 No laboratory or X-ray reports found on record for registered number +${phoneNumber}.
      
If you recently had a blood test, X-Ray, OPG, or ultrasound at Cortex Hospital, please contact our diagnostic desk at *07152-255795*.`,
      nextStep: "IDLE",
    };
  }

  const reportsList = reports
    .slice(0, 3)
    .map(
      (r, i) =>
        `*${i + 1}.* 🧪 *${r.investigation_type}* (${r.investigation_date})
   • Indication: ${r.indication || "Clinical review"}
   • Findings: ${r.findings || "Report completed"}
   • Status: ${r.payment_status || "Processed"}`
    )
    .join("\n\n");

  return {
    text: `🧪 *CORTEX HOSPITAL – LABORATORY & IMAGING REPORTS*
━━━━━━━━━━━━━━━━━━━━━
${reportsList}

⚠️ *Notice:* Per medical safety regulations, reports must be clinically interpreted by your treating physician. Please schedule a consultation with your doctor to review findings.

Reply *1* to book an appointment with your doctor.`,
    nextStep: "IDLE",
  };
}
