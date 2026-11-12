/**
 * Cortex Hospital PMS Backend Client
 * Strictly connected to DEVELOPMENT deployment: dev:jovial-sheep-76 (jovial-sheep-76.convex.cloud)
 * Note: Production deployment (majestic-setter-702) is protected and intentionally isolated.
 */

import { ConvexHttpClient } from "convex/browser";
import { CORTEX_HOSPITAL_CONFIG, DoctorInfo } from "./cortexConfig";

// Target Convex environment: Strictly DEV (dev:jovial-sheep-76)
const CORTEX_URL =
  process.env.CORTEX_CONVEX_URL ||
  process.env.NEXT_PUBLIC_CORTEX_URL ||
  "https://jovial-sheep-76.convex.cloud";

export function getCortexConvexClient(): ConvexHttpClient {
  return new ConvexHttpClient(CORTEX_URL);
}

/** Normalize phone number by extracting the last 10 digits */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/** Check if two phone strings represent the same phone number */
export function isPhoneMatch(p1?: string, p2?: string): boolean {
  if (!p1 || !p2) return false;
  return normalizePhone(p1) === normalizePhone(p2);
}

export interface PatientRecord {
  _id: string;
  name: string;
  age: string;
  sex: "Male" | "Female" | "Other";
  phone_number: string;
  reference_number?: string;
  address?: string;
  email?: string;
  whatsapp_number?: string;
}

export interface AppointmentRecord {
  _id: string;
  name?: string;
  phone?: string;
  age?: string | number;
  address?: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  doctor_name?: string;
  duration_minutes?: number;
  dental_problem?: string; // used for chief complaint / problem
  status?: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  notes?: string;
  created_at?: number;
}

export interface PrescriptionRecord {
  _id: string;
  patient_name: string;
  phone_number: string;
  age: string;
  sex: "Male" | "Female" | "Other";
  reference_number?: string;
  prescription_date: string;
  doctor_name?: string;
  diagnosis?: string;
  chief_complaint?: string;
  medicines?: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    when?: string;
    quantity?: number;
    note?: string;
  }>;
  advice?: string;
  dr_notes?: string;
  followup_date?: string;
  vitals?: Record<string, any>;
}

export interface BillRecord {
  _id: string;
  prescription_id?: string;
  patient_id?: string;
  reference_number?: string;
  bill_number?: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: "PENDING" | "PARTIAL" | "PAID";
  items?: any;
  notes?: string;
  patient_name?: string;
}

export interface FollowupRecord {
  _id: string;
  patient_name: string;
  phone_number: string;
  reference_number?: string;
  followup_date: string;
  treatment_summary?: string;
  doctor_name?: string;
  status: string;
  notes?: string;
  next_followup_date?: string;
}

export interface InvestigationRecord {
  _id: string;
  patient_name: string;
  phone_number: string;
  reference_number?: string;
  investigation_type: string;
  investigation_date: string;
  doctor_name?: string;
  technician_name?: string;
  indication?: string;
  findings?: string;
  cost?: number;
  payment_status?: string;
}

/* =========================================================================
   1. DOCTORS & SCHEDULES
   ========================================================================= */

export async function fetchDoctors(): Promise<DoctorInfo[]> {
  try {
    const client = getCortexConvexClient();
    const docs = await client.query("doctors:list" as any);
    if (Array.isArray(docs) && docs.length > 0) {
      // Map database doctors with rich config data
      return docs.map((d: any) => {
        const configDoc = CORTEX_HOSPITAL_CONFIG.doctors.find((cd) =>
          d.name.toLowerCase().includes(cd.name.toLowerCase()) || cd.name.toLowerCase().includes(d.name.toLowerCase())
        );
        return {
          id: d._id,
          name: d.name,
          degrees: configDoc?.degrees || "M.B.B.S.",
          designation: configDoc?.designation || d.notes || "Consultant Doctor",
          specialty: configDoc?.specialty || (d.name.includes("Vipeen") ? "Orthopaedics & Joint Replacement" : "Gynecology & Obstetrics"),
          subSpecialty: configDoc?.subSpecialty,
          phone: d.phone,
          consultationFee: configDoc?.consultationFee || { firstVisit: 400, followupVisit: 200, followupValidityDays: 10 },
          scheduleDescription: configDoc?.scheduleDescription || CORTEX_HOSPITAL_CONFIG.schedule.opdTimings,
        };
      });
    }
  } catch (err) {
    console.warn("[Cortex PMS] fetchDoctors fallback to config:", err);
  }
  return CORTEX_HOSPITAL_CONFIG.doctors;
}

export function matchDoctorByName(input: string): DoctorInfo | undefined {
  const clean = input.toLowerCase().trim();

  // Explicit check for Dr. Shillpa Raut
  if (
    clean.includes("shillpa") ||
    clean.includes("shilpa") ||
    clean.includes("शिल्पा") ||
    clean.includes("स्त्रीरोग") ||
    clean.includes("gyn") ||
    clean.includes("preg") ||
    clean.includes("deliver") ||
    clean.includes("महिला")
  ) {
    return CORTEX_HOSPITAL_CONFIG.doctors.find((d) => d.id === "dr-shillpa-raut");
  }

  // Explicit check for Dr. Vipeen Raut
  if (
    clean.includes("vipeen") ||
    clean.includes("vipin") ||
    clean.includes("विपिन") ||
    clean.includes("ortho") ||
    clean.includes("bone") ||
    clean.includes("joint") ||
    clean.includes("हाड") ||
    clean.includes("सांधे") ||
    clean.includes("गुडघे") ||
    clean.includes("राऊत") ||
    clean.includes("राउत") ||
    clean.includes("raut")
  ) {
    return CORTEX_HOSPITAL_CONFIG.doctors.find((d) => d.id === "dr-vipeen-raut");
  }

  return CORTEX_HOSPITAL_CONFIG.doctors.find((doc) => {
    const docName = doc.name.toLowerCase();
    const docSpecialty = doc.specialty.toLowerCase();
    return clean.includes(docName) || docName.includes(clean);
  });
}

/* =========================================================================
   2. PATIENT REGISTRATION & PROFILE LOOKUP
   ========================================================================= */

export async function findPatient(phoneOrUhid: string): Promise<PatientRecord | null> {
  const client = getCortexConvexClient();
  const raw = phoneOrUhid.trim();

  try {
    // 1. Try by UHID / Reference Number (CRX...)
    if (raw.toUpperCase().startsWith("CRX")) {
      const byRef = await client.query("patients:getByReference" as any, { reference_number: raw.toUpperCase() });
      if (byRef) return byRef as PatientRecord;
    }

    // 2. Try by exact phone number
    const byPhone = await client.query("patients:getByPhoneNumber" as any, { phone_number: raw });
    if (byPhone) return byPhone as PatientRecord;

    // 3. Fallback: normalize 10 digits and check all patients
    const normalized = normalizePhone(raw);
    if (normalized.length === 10) {
      const allPatients = (await client.query("patients:list" as any)) as PatientRecord[];
      if (Array.isArray(allPatients)) {
        const found = allPatients.find((p) => normalizePhone(p.phone_number) === normalized);
        if (found) return found;
      }
    }
  } catch (err) {
    console.error("[Cortex PMS] findPatient error:", err);
  }

  return null;
}

export async function findPatientsByPhone(phoneNumber: string): Promise<PatientRecord[]> {
  const client = getCortexConvexClient();
  const raw = phoneNumber.trim();
  const normalized = normalizePhone(raw);
  if (!normalized) return [];

  try {
    const allPatients = (await client.query("patients:list" as any)) as PatientRecord[];
    if (Array.isArray(allPatients)) {
      const matched = allPatients.filter((p) => {
        const pNorm = normalizePhone(p.phone_number || "");
        const wNorm = normalizePhone(p.whatsapp_number || "");
        return pNorm === normalized || wNorm === normalized;
      });

      // Filter out invalid/test records and de-duplicate by name (case-insensitive)
      const valid = matched.filter(
        (p) => p.name && p.name.trim().length >= 2 && p.name.trim().toLowerCase() !== "abcd"
      );
      // Sort newest first
      valid.sort((a, b) => ((b as any)._creationTime || 0) - ((a as any)._creationTime || 0));

      const uniqueByName: PatientRecord[] = [];
      for (const p of valid) {
        const cleanName = p.name.trim().toLowerCase();
        if (!uniqueByName.some((u) => u.name.trim().toLowerCase() === cleanName)) {
          uniqueByName.push(p);
        }
      }
      return uniqueByName;
    }
  } catch (err) {
    console.error("[Cortex PMS] findPatientsByPhone error:", err);
  }
  return [];
}

export async function updatePatient(
  id: string,
  data: {
    name?: string;
    age?: string;
    sex?: "Male" | "Female" | "Other";
    address?: string;
    phone_number?: string;
    whatsapp_number?: string;
  }
): Promise<void> {
  const client = getCortexConvexClient();
  try {
    await client.mutation("patients:update" as any, { id: id as any, ...data });
  } catch (err) {
    console.error("[Cortex PMS] updatePatient error:", err);
  }
}

export async function createPatient(data: {
  name: string;
  age: string;
  sex: "Male" | "Female" | "Other";
  phone_number: string;
  address?: string;
  email?: string;
  whatsapp_number?: string;
}): Promise<{ id: string; reference_number?: string }> {
  const client = getCortexConvexClient();
  const id = (await client.mutation("patients:create" as any, data)) as string;

  // Fetch created patient to get generated reference_number (CRX...)
  try {
    const patient = (await client.query("patients:getById" as any, { id })) as PatientRecord;
    return { id, reference_number: patient?.reference_number };
  } catch {
    return { id };
  }
}

/* =========================================================================
   3. APPOINTMENTS & REAL-TIME SLOTS
   ========================================================================= */

export interface DetailedSlot {
  slot: string; // Start time "HH:mm" e.g. "10:30"
  endTime: string; // End time "HH:mm" e.g. "10:45"
  display: string; // "10:30 AM – 10:45 AM"
  period: "morning" | "evening";
  isBooked: boolean;
}

export function formatSlotRange12(startHHMM: string): { endHHMM: string; display: string } {
  const [h, m] = startHHMM.split(":").map(Number);
  const startMins = h * 60 + m;
  const endMins = startMins + 15;
  const endH = Math.floor(endMins / 60);
  const endM = endMins % 60;
  const endHHMM = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

  const format12 = (hour24: number, min: number) => {
    const h12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;
    const ampm = hour24 >= 12 ? "PM" : "AM";
    return `${String(h12).padStart(2, "0")}:${String(min).padStart(2, "0")} ${ampm}`;
  };

  return {
    endHHMM,
    display: `${format12(h, m)} – ${format12(endH, endM)}`,
  };
}

export function isSlotBooked(slotStartHHMM: string, bookedTimes: string[]): boolean {
  const [sh, sm] = slotStartHHMM.split(":").map(Number);
  const slotStartMins = sh * 60 + sm;
  const slotEndMins = slotStartMins + 15;

  for (const bt of bookedTimes) {
    if (!bt) continue;
    if (bt.includes(slotStartHHMM)) return true;

    const m = bt.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
    if (m) {
      let bh = parseInt(m[1], 10);
      const bm = parseInt(m[2], 10);
      const meridiem = m[3]?.toLowerCase();
      if (meridiem === "pm" && bh < 12) bh += 12;
      if (meridiem === "am" && bh === 12) bh = 0;
      const bMins = bh * 60 + bm;
      if (bMins >= slotStartMins && bMins < slotEndMins) {
        return true;
      }
    }
  }
  return false;
}

export const MORNING_SLOT_STARTS = [
  "10:30", "10:45", "11:00", "11:15", "11:30", "11:45",
  "12:00", "12:15", "12:30", "12:45",
];

export const EVENING_SLOT_STARTS = [
  "18:00", "18:15", "18:30", "18:45", "19:00", "19:15",
];

/**
 * Generate standard 15-minute appointment slots based on Cortex OPD Timings
 * Mon-Sat: 10:30 AM - 1:00 PM & 6:00 PM - 7:30 PM
 * Sun: Closed
 */
export function generateDaySlots(dateStr: string): string[] {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0 = Sunday

  if (dayOfWeek === 0) {
    return []; // Sunday closed
  }

  return [...MORNING_SLOT_STARTS, ...EVENING_SLOT_STARTS];
}

export async function getAvailableSlots(dateStr: string, doctorName?: string): Promise<{
  date: string;
  dayOfWeek: string;
  isSunday: boolean;
  bookedSlots: string[];
  availableSlots: string[];
  morningSlots: DetailedSlot[];
  eveningSlots: DetailedSlot[];
}> {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = dayNames[date.getDay()];

  if (date.getDay() === 0) {
    return {
      date: dateStr,
      dayOfWeek: dayName,
      isSunday: true,
      bookedSlots: [],
      availableSlots: [],
      morningSlots: [],
      eveningSlots: [],
    };
  }

  let bookedSlots: string[] = [];

  try {
    const client = getCortexConvexClient();
    const res = await client.query("appointments:getBookedSlots" as any, {
      date: dateStr,
      doctor_name: doctorName,
    });
    if (Array.isArray(res)) {
      bookedSlots = res;
    }
  } catch (err) {
    console.error("[Cortex PMS] Error getting booked slots:", err);
  }

  const morningSlots: DetailedSlot[] = MORNING_SLOT_STARTS.map((slot) => {
    const { endHHMM, display } = formatSlotRange12(slot);
    return {
      slot,
      endTime: endHHMM,
      display,
      period: "morning",
      isBooked: isSlotBooked(slot, bookedSlots),
    };
  });

  const eveningSlots: DetailedSlot[] = EVENING_SLOT_STARTS.map((slot) => {
    const { endHHMM, display } = formatSlotRange12(slot);
    return {
      slot,
      endTime: endHHMM,
      display,
      period: "evening",
      isBooked: isSlotBooked(slot, bookedSlots),
    };
  });

  const allDetailed = [...morningSlots, ...eveningSlots];
  const availableSlots = allDetailed.filter((s) => !s.isBooked).map((s) => s.slot);

  return {
    date: dateStr,
    dayOfWeek: dayName,
    isSunday: false,
    bookedSlots,
    availableSlots,
    morningSlots,
    eveningSlots,
  };
}

export async function getPatientAppointments(phone: string): Promise<AppointmentRecord[]> {
  try {
    const client = getCortexConvexClient();
    const all = (await client.query("appointments:list" as any)) as AppointmentRecord[];
    if (Array.isArray(all)) {
      const normalized = normalizePhone(phone);
      return all
        .filter((a) => a.phone && normalizePhone(a.phone) === normalized)
        .sort((a, b) => ((b.date || "") + (b.time || "")).localeCompare((a.date || "") + (a.time || "")));
    }
  } catch (err) {
    console.error("[Cortex PMS] getPatientAppointments error:", err);
  }
  return [];
}

export async function bookAppointment(data: {
  name: string;
  phone: string;
  age?: string | number;
  address?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  doctor_name?: string;
  duration_minutes?: number;
  dental_problem?: string; // problem/complaint
  notes?: string;
}): Promise<string> {
  const client = getCortexConvexClient();
  const cleanPhone = normalizePhone(data.phone);
  const cleanAge = data.age !== undefined && data.age !== null ? String(data.age).replace(/\D/g, '') || String(data.age) : undefined;

  let appointmentId: string;
  try {
    appointmentId = (await client.mutation("appointments:create" as any, {
      name: data.name,
      phone: cleanPhone || data.phone,
      age: cleanAge,
      address: data.address || "Wardha",
      date: data.date,
      time: data.time,
      doctor_name: data.doctor_name || "Dr. Vipeen Raut",
      duration_minutes: data.duration_minutes || 15,
      dental_problem: data.dental_problem || "General Consultation",
      status: "CONFIRMED",
      notes: data.notes || "Booked via WhatsApp Virtual Assistant",
      is_offline: false,
    })) as string;
  } catch (createErr: any) {
    const errMsg = String(createErr?.message || "");
    if (errMsg.includes("already booked")) {
      throw new Error("SLOT_ALREADY_BOOKED");
    }

    // Fallback if status not accepted in create args on older deployment
    try {
      appointmentId = (await client.mutation("appointments:create" as any, {
        name: data.name,
        phone: cleanPhone || data.phone,
        age: cleanAge,
        address: data.address || "Wardha",
        date: data.date,
        time: data.time,
        doctor_name: data.doctor_name || "Dr. Vipeen Raut",
        duration_minutes: data.duration_minutes || 15,
        dental_problem: data.dental_problem || "General Consultation",
        notes: data.notes || "Booked via WhatsApp Virtual Assistant",
        is_offline: false,
      })) as string;

      try {
        await client.mutation("appointments:update" as any, {
          id: appointmentId,
          status: "CONFIRMED",
        });
      } catch {}
    } catch (fallbackErr: any) {
      const fallbackMsg = String(fallbackErr?.message || "");
      if (fallbackMsg.includes("already booked")) {
        throw new Error("SLOT_ALREADY_BOOKED");
      }
      console.error("[Cortex PMS] appointments:create fallback failed:", fallbackErr);
      throw new Error("BOOKING_FAILED");
    }
  }

  return appointmentId;
}

export async function cancelAppointment(appointmentId: string): Promise<boolean> {
  try {
    const client = getCortexConvexClient();
    await client.mutation("appointments:update" as any, {
      id: appointmentId,
      status: "CANCELLED",
      notes: "Cancelled via WhatsApp Virtual Assistant",
    });
    return true;
  } catch (err) {
    console.error("[Cortex PMS] cancelAppointment error:", err);
    return false;
  }
}

export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newTime: string
): Promise<boolean> {
  try {
    const client = getCortexConvexClient();
    await client.mutation("appointments:update" as any, {
      id: appointmentId,
      date: newDate,
      time: newTime,
      status: "CONFIRMED",
      notes: `Rescheduled to ${newDate} at ${newTime} via WhatsApp Virtual Assistant`,
    });
    return true;
  } catch (err) {
    console.error("[Cortex PMS] rescheduleAppointment error:", err);
    return false;
  }
}

/* =========================================================================
   4. PRESCRIPTIONS
   ========================================================================= */

export async function getPatientPrescriptions(phoneOrUhid: string): Promise<PrescriptionRecord[]> {
  try {
    const client = getCortexConvexClient();
    const patient = await findPatient(phoneOrUhid);

    const all = (await client.query("prescriptions:list" as any)) as PrescriptionRecord[];
    if (Array.isArray(all)) {
      const normalizedPhone = normalizePhone(phoneOrUhid);
      const refNumber = patient?.reference_number?.toUpperCase();

      return all.filter((p) => {
        if (refNumber && p.reference_number && p.reference_number.toUpperCase() === refNumber) {
          return true;
        }
        if (p.phone_number && normalizePhone(p.phone_number) === normalizedPhone) {
          return true;
        }
        return false;
      });
    }
  } catch (err) {
    console.error("[Cortex PMS] getPatientPrescriptions error:", err);
  }
  return [];
}

/* =========================================================================
   5. BILLS & INVOICES
   ========================================================================= */

export async function getPatientBills(phoneOrUhid: string): Promise<BillRecord[]> {
  try {
    const client = getCortexConvexClient();
    const patient = await findPatient(phoneOrUhid);

    const allBills = (await client.query("bills:list" as any, {})) as BillRecord[];
    if (Array.isArray(allBills)) {
      const refNumber = patient?.reference_number?.toUpperCase();
      const patientId = patient?._id;

      return allBills
        .filter((b) => {
          if (refNumber && b.reference_number && b.reference_number.toUpperCase() === refNumber) {
            return true;
          }
          if (patientId && b.patient_id === patientId) {
            return true;
          }
          return false;
        })
        .map((b) => ({
          ...b,
          patient_name: patient?.name,
        }));
    }
  } catch (err) {
    console.error("[Cortex PMS] getPatientBills error:", err);
  }
  return [];
}

/* =========================================================================
   6. FOLLOW-UPS
   ========================================================================= */

export async function getPatientFollowups(phoneOrUhid: string): Promise<FollowupRecord[]> {
  try {
    const client = getCortexConvexClient();
    const patient = await findPatient(phoneOrUhid);
    const normalized = normalizePhone(phoneOrUhid);
    const ref = patient?.reference_number?.toUpperCase();

    const allFollowups = (await client.query("registers:listFollowups" as any, {})) as FollowupRecord[];
    if (Array.isArray(allFollowups)) {
      return allFollowups.filter((f) => {
        if (ref && f.reference_number && f.reference_number.toUpperCase() === ref) return true;
        if (f.phone_number && normalizePhone(f.phone_number) === normalized) return true;
        return false;
      });
    }
  } catch (err) {
    console.error("[Cortex PMS] getPatientFollowups error:", err);
  }
  return [];
}

/* =========================================================================
   7. LABORATORY REPORTS / INVESTIGATIONS
   ========================================================================= */

export async function getPatientInvestigations(phoneOrUhid: string): Promise<InvestigationRecord[]> {
  try {
    const client = getCortexConvexClient();
    const patient = await findPatient(phoneOrUhid);
    const normalized = normalizePhone(phoneOrUhid);
    const ref = patient?.reference_number?.toUpperCase();

    const all = (await client.query("investigations:list" as any, {})) as InvestigationRecord[];
    if (Array.isArray(all)) {
      return all.filter((i) => {
        if (ref && i.reference_number && i.reference_number.toUpperCase() === ref) return true;
        if (i.phone_number && normalizePhone(i.phone_number) === normalized) return true;
        return false;
      });
    }
  } catch (err) {
    console.error("[Cortex PMS] getPatientInvestigations error:", err);
  }
  return [];
}
