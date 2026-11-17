/**
 * Cortex Hospital PMS Backend Client
 * Strictly connected to DEVELOPMENT deployment: dev:jovial-sheep-76 (jovial-sheep-76.convex.cloud)
 * Note: Production deployment (majestic-setter-702) is protected and intentionally isolated.
 */

import { ConvexHttpClient } from "convex/browser";
import { CORTEX_HOSPITAL_CONFIG, DoctorInfo } from "./cortexConfig";
import { api } from "@/convex/_generated/api";

// Target Convex environment: Strictly DEV (dev:jovial-sheep-76)
const CORTEX_URL =
  process.env.CORTEX_CONVEX_URL ||
  process.env.NEXT_PUBLIC_CORTEX_URL ||
  "https://jovial-sheep-76.convex.cloud";

export function getCortexConvexClient(): ConvexHttpClient {
  return new ConvexHttpClient(CORTEX_URL);
}

/** Local WhatsApp Convex Client for session state, reminders, atomic tokens, and audit logs */
export function getLocalConvexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL || "https://quaint-hound-638.convex.cloud";
  return new ConvexHttpClient(url);
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
  patient_id?: string;
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
  patient_id?: string;
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

  // Phase 1: Issue 10 - Check 5-minute active slot holds
  try {
    const localConvex = getLocalConvexClient();
    const heldSlots = await localConvex.query(api.sessions.getActiveSlotHolds, {
      doctorName: doctorName || "Dr. Vipeen Raut",
      date: dateStr,
    });
    if (Array.isArray(heldSlots) && heldSlots.length > 0) {
      bookedSlots = bookedSlots.concat(heldSlots);
    }
  } catch (holdErr) {
    console.warn("[Slot Hold Query Warning]", holdErr);
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

export async function getPatientAppointments(
  phone: string,
  patientName?: string,
  patientReference?: string
): Promise<AppointmentRecord[]> {
  try {
    const client = getCortexConvexClient();
    const all = (await client.query("appointments:list" as any)) as AppointmentRecord[];
    if (Array.isArray(all)) {
      const normalized = normalizePhone(phone);
      const targetName = (patientName || "").trim().toLowerCase();
      const targetRef = (patientReference || "").trim().toUpperCase();

      return all
        .filter((a) => {
          if (!a.phone || normalizePhone(a.phone) !== normalized) return false;
          if (targetRef && a.notes && a.notes.toUpperCase().includes(targetRef)) return true;
          if (targetName) {
            const aName = (a.name || "").trim().toLowerCase();
            return aName === targetName || aName.includes(targetName) || targetName.includes(aName);
          }
          return true;
        })
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

/**
 * 4. PRESCRIPTIONS (Phase 0: Issue 1 - Strict Phone Scoping)
 * Only returns prescriptions for patients legitimately registered under callerPhone.
 * Prevents strangers from typing arbitrary CRX numbers or patient names.
 */
export async function getPatientPrescriptions(
  callerPhone: string,
  patientName?: string,
  patientReference?: string
): Promise<PrescriptionRecord[]> {
  try {
    const client = getCortexConvexClient();
    const normalizedCallerPhone = normalizePhone(callerPhone);
    if (!normalizedCallerPhone) return [];

    // 1. Fetch patient profiles legitimately registered under callerPhone
    const registeredPatients = await findPatientsByPhone(callerPhone);
    if (registeredPatients.length === 0) {
      return [];
    }

    const allowedRefs = new Set(
      registeredPatients.map((p) => (p.reference_number || "").trim().toUpperCase()).filter(Boolean)
    );
    const allowedNames = new Set(
      registeredPatients.map((p) => p.name.trim().toLowerCase())
    );
    const allowedIds = new Set(registeredPatients.map((p) => p._id));

    // Security check: If caller specified a reference or name, verify it belongs to this phone!
    if (patientReference && !allowedRefs.has(patientReference.trim().toUpperCase())) {
      console.warn(`[Security Alert] Phone +${callerPhone} attempted access to unlinked reference ${patientReference}`);
      return [];
    }
    if (patientName && !allowedNames.has(patientName.trim().toLowerCase())) {
      console.warn(`[Security Alert] Phone +${callerPhone} attempted access to unlinked patient name ${patientName}`);
      return [];
    }

    const all = (await client.query("prescriptions:list" as any)) as PrescriptionRecord[];
    if (Array.isArray(all)) {
      const targetRef = patientReference?.trim().toUpperCase();
      const targetName = patientName?.trim().toLowerCase();

      return all.filter((p) => {
        const pRef = (p.reference_number || "").trim().toUpperCase();
        const pName = (p.patient_name || "").trim().toLowerCase();
        const pPhone = p.phone_number ? normalizePhone(p.phone_number) : "";
        const pId = p.patient_id;

        // Security invariant: record MUST belong to an allowed patient profile under this phone
        const isAuthorizedPatient =
          (pRef && allowedRefs.has(pRef)) ||
          (pId && allowedIds.has(pId)) ||
          (pPhone === normalizedCallerPhone && allowedNames.has(pName));

        if (!isAuthorizedPatient) return false;

        // Filter by requested patient if specified
        if (targetRef) return pRef === targetRef;
        if (targetName) return pName === targetName || pName.includes(targetName);

        return true;
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

/**
 * 5. BILLS & INVOICES (Phase 0: Issue 1 - Strict Phone Scoping)
 * Only returns bills/invoices for patients legitimately registered under callerPhone.
 */
export async function getPatientBills(
  callerPhone: string,
  patientName?: string,
  patientReference?: string
): Promise<BillRecord[]> {
  try {
    const client = getCortexConvexClient();
    const normalizedCallerPhone = normalizePhone(callerPhone);
    if (!normalizedCallerPhone) return [];

    const registeredPatients = await findPatientsByPhone(callerPhone);
    if (registeredPatients.length === 0) {
      return [];
    }

    const allowedRefs = new Set(
      registeredPatients.map((p) => (p.reference_number || "").trim().toUpperCase()).filter(Boolean)
    );
    const allowedNames = new Set(
      registeredPatients.map((p) => p.name.trim().toLowerCase())
    );
    const allowedIds = new Set(registeredPatients.map((p) => p._id));

    if (patientReference && !allowedRefs.has(patientReference.trim().toUpperCase())) {
      console.warn(`[Security Alert] Phone +${callerPhone} attempted access to unlinked bill reference ${patientReference}`);
      return [];
    }
    if (patientName && !allowedNames.has(patientName.trim().toLowerCase())) {
      console.warn(`[Security Alert] Phone +${callerPhone} attempted access to unlinked patient bill name ${patientName}`);
      return [];
    }

    const allBills = (await client.query("bills:list" as any, {})) as BillRecord[];
    if (Array.isArray(allBills)) {
      const targetRef = patientReference?.trim().toUpperCase();
      const targetName = patientName?.trim().toLowerCase();

      return allBills.filter((b) => {
        const bRef = (b.reference_number || "").trim().toUpperCase();
        const bName = (b.patient_name || "").trim().toLowerCase();
        const bId = b.patient_id;

        const isAuthorizedPatient =
          (bRef && allowedRefs.has(bRef)) ||
          (bId && allowedIds.has(bId)) ||
          allowedNames.has(bName);

        if (!isAuthorizedPatient) return false;

        if (targetRef) return bRef === targetRef;
        if (targetName) return bName === targetName || bName.includes(targetName);

        return true;
      });
    }
  } catch (err) {
    console.error("[Cortex PMS] getPatientBills error:", err);
  }
  return [];
}

/* =========================================================================
   6. FOLLOW-UPS
   ========================================================================= */

/**
 * 6. FOLLOW-UPS (Phase 0: Issue 1 - Strict Phone Scoping)
 * Only returns follow-ups for patients legitimately registered under callerPhone.
 */
export async function getPatientFollowups(
  callerPhone: string,
  patientName?: string,
  patientReference?: string
): Promise<FollowupRecord[]> {
  try {
    const client = getCortexConvexClient();
    const normalizedCallerPhone = normalizePhone(callerPhone);
    if (!normalizedCallerPhone) return [];

    const registeredPatients = await findPatientsByPhone(callerPhone);
    if (registeredPatients.length === 0) {
      return [];
    }

    const allowedRefs = new Set(
      registeredPatients.map((p) => (p.reference_number || "").trim().toUpperCase()).filter(Boolean)
    );
    const allowedNames = new Set(
      registeredPatients.map((p) => p.name.trim().toLowerCase())
    );
    const allowedIds = new Set(registeredPatients.map((p) => p._id));

    if (patientReference && !allowedRefs.has(patientReference.trim().toUpperCase())) {
      return [];
    }
    if (patientName && !allowedNames.has(patientName.trim().toLowerCase())) {
      return [];
    }

    const allFollowups = (await client.query("registers:listFollowups" as any, {})) as FollowupRecord[];
    if (Array.isArray(allFollowups)) {
      const targetRef = patientReference?.trim().toUpperCase();
      const targetName = patientName?.trim().toLowerCase();

      return allFollowups.filter((f) => {
        const fRef = (f.reference_number || "").trim().toUpperCase();
        const fName = (f.patient_name || "").trim().toLowerCase();
        const fPhone = f.phone_number ? normalizePhone(f.phone_number) : "";
        const fId = f.patient_id;

        const isAuthorizedPatient =
          (fRef && allowedRefs.has(fRef)) ||
          (fId && allowedIds.has(fId)) ||
          (fPhone === normalizedCallerPhone && allowedNames.has(fName));

        if (!isAuthorizedPatient) return false;

        if (targetRef) return fRef === targetRef;
        if (targetName) return fName === targetName || fName.includes(targetName);

        return true;
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

export async function getPatientInvestigations(
  phoneOrUhid: string,
  patientName?: string,
  patientReference?: string
): Promise<InvestigationRecord[]> {
  try {
    const client = getCortexConvexClient();
    const normalizedPhone = normalizePhone(phoneOrUhid);
    const targetRef = (
      patientReference ||
      (phoneOrUhid.trim().toUpperCase().startsWith("CRX") ? phoneOrUhid.trim() : "")
    ).toUpperCase();
    const targetName = (patientName || "").trim().toLowerCase();

    const all = (await client.query("investigations:list" as any, {})) as InvestigationRecord[];
    if (Array.isArray(all)) {
      return all.filter((i) => {
        const iRef = (i.reference_number || "").trim().toUpperCase();
        const iName = (i.patient_name || "").trim().toLowerCase();
        const iPhone = i.phone_number ? normalizePhone(i.phone_number) : "";

        if (targetRef && iRef) return iRef === targetRef;
        if (targetName && normalizedPhone) {
          const nameMatches =
            iName === targetName ||
            iName.includes(targetName) ||
            targetName.includes(iName);
          return iPhone === normalizedPhone && nameMatches;
        }
        if (targetName) {
          return (
            iName === targetName ||
            iName.includes(targetName) ||
            targetName.includes(iName)
          );
        }
        if (normalizedPhone && iPhone) return iPhone === normalizedPhone;
        return false;
      });
    }
  } catch (err) {
    console.error("[Cortex PMS] getPatientInvestigations error:", err);
  }
  return [];
}

/* =========================================================================
   8. OPD LIVE WAITING QUEUE
   ========================================================================= */

export interface OpdWaitingPatient {
  id: string;
  name: string;
  phone: string;
  uhid?: string;
  doctorName: string;
  date: string;
  slotTime: string;
  tokenNo: number;
  status: "WAITING" | "CONFIRMED";
}

export async function getOpdWaitingQueue(): Promise<OpdWaitingPatient[]> {
  try {
    const client = getCortexConvexClient();
    const all = (await client.query("appointments:list" as any, {})) as AppointmentRecord[];
    if (!Array.isArray(all)) return [];

    const active = all.filter(
      (a) => a.status === "CONFIRMED" || !a.status || a.status === "PENDING"
    );

    active.sort((a, b) => {
      const cmpDate = (b.date || "").localeCompare(a.date || "");
      if (cmpDate !== 0) return cmpDate;
      return (a.time || "").localeCompare(b.time || "");
    });

    return active.slice(0, 15).map((a, idx) => {
      const rawSlot = a.time || "10:30";
      const slotEnd = rawSlot.includes(":")
        ? rawSlot.replace(/:(\d+)/, (_, m) => `:${String(Math.min(59, Number(m) + 15)).padStart(2, "0")}`)
        : rawSlot;

      return {
        id: a._id,
        name: a.name || "Patient",
        phone: a.phone ? normalizePhone(a.phone) : "",
        uhid: a.notes?.match(/UHID:\s*([A-Z0-9]+)/)?.[1] || `CRX${String(100 + idx).padStart(4, "0")}`,
        doctorName: a.doctor_name || "Dr. Vipeen Raut",
        date: a.date || "Today",
        slotTime: `${rawSlot} – ${slotEnd}`,
        tokenNo: idx + 1,
        status: "WAITING" as const,
      };
    });
  } catch (err) {
    console.error("[Cortex PMS] getOpdWaitingQueue error:", err);
    return [];
  }
}

export interface OpdQueueRecord {
  _id?: string;
  queue_id: string;
  token: string;
  uhid?: string;
  patientId?: string;
  appointmentId?: string;
  name: string;
  age: string;
  ageUnit?: string;
  sex: string;
  phone: string;
  address?: string;
  doctor: string;
  department: string;
  priority: string;
  visitType: string;
  status: "Waiting" | "Ready" | "In Consultation" | "Completed" | "Cancelled";
  vitals?: Record<string, any>;
  consultationFee?: number;
  paymentMode?: string;
  paymentStatus?: string;
  registeredAt: string;
  time: string;
}

/** Calculate the next sequential 2-digit daily token number (01, 02...) per doctor on a given date atomically (Phase 1: Issue 8) */
export async function calculateNextDailyToken(doctorName: string, dateStr: string): Promise<string> {
  try {
    const localConvex = getLocalConvexClient();
    const token = await localConvex.mutation(api.sessions.issueAtomicDailyToken, {
      doctorName: doctorName || "Dr. Vipeen Raut",
      date: dateStr,
    });
    if (token) return token;
  } catch (convErr) {
    console.warn("[Atomic Token Server Fallback]", convErr);
  }

  try {
    const client = getCortexConvexClient();
    const existingTokens: number[] = [];
    const targetDocKey = (doctorName || "").toLowerCase().replace(/l+/g, "l");

    // 1. Check opd_queue table for this doctor on this date
    const queue = (await client.query("opd_queue:list" as any, {})) as any[];
    if (Array.isArray(queue)) {
      const matching = queue.filter((q) => {
        const itemDate = (q.registeredAt || "").split("T")[0];
        const qDoc = (q.doctor || "").toLowerCase().replace(/l+/g, "l");
        const docMatch = qDoc.includes(targetDocKey) || targetDocKey.includes(qDoc);
        return itemDate === dateStr && docMatch;
      });
      matching.forEach((q) => {
        const n = parseInt(q.token, 10);
        if (!isNaN(n) && n > 0) existingTokens.push(n);
      });
    }

    // 2. Check appointments table for this doctor on this date
    const appts = (await client.query("appointments:list" as any, {})) as any[];
    if (Array.isArray(appts)) {
      const matchingAppts = appts.filter((a) => {
        const aDate = (a.date || "").split("T")[0];
        const aDoc = (a.doctor_name || "").toLowerCase().replace(/l+/g, "l");
        const docMatch = aDoc.includes(targetDocKey) || targetDocKey.includes(aDoc);
        return aDate === dateStr && docMatch && a.status !== "CANCELLED";
      });
      matchingAppts.forEach((a) => {
        const matchToken = a.notes?.match(/Token:\s*#?(\d+)/i)?.[1];
        if (matchToken) {
          const n = parseInt(matchToken, 10);
          if (!isNaN(n) && n > 0) existingTokens.push(n);
        }
      });
    }

    const nextToken = existingTokens.length > 0 ? Math.max(...existingTokens) + 1 : 1;
    return String(nextToken).padStart(2, "0");
  } catch (err) {
    console.error("[Cortex PMS] calculateNextDailyToken error:", err);
  }
  return "01";
}

/** Inserts or updates an OPD Queue record directly in Cortex PMS */
export async function upsertOpdQueueItem(item: {
  id: string;
  token: string;
  uhid?: string;
  patientId?: string;
  appointmentId?: string;
  name: string;
  age: string;
  ageUnit?: string;
  sex: string;
  phone: string;
  address?: string;
  doctor: string;
  department?: string;
  priority?: string;
  visitType?: string;
  status?: string;
  registeredAt?: string;
  time?: string;
  consultationFee?: number;
  paymentMode?: string;
  paymentStatus?: string;
}): Promise<string> {
  const client = getCortexConvexClient();
  const dept = item.department || (item.doctor.includes("Shillpa") ? "Obstetrics & Gynaecology" : "Orthopaedics & Joint Replacement");

  return (await client.mutation("opd_queue:upsert" as any, {
    id: item.id,
    token: item.token,
    uhid: item.uhid,
    patientId: item.patientId,
    appointmentId: item.appointmentId,
    name: item.name,
    age: item.age || "—",
    ageUnit: item.ageUnit || "years",
    sex: item.sex || "Male",
    phone: normalizePhone(item.phone),
    address: item.address || "",
    doctor: item.doctor,
    department: dept,
    priority: item.priority || "Normal",
    visitType: item.visitType || "Appointment",
    status: item.status || "Waiting",
    vitals: {},
    consultationFee: item.consultationFee || 0,
    paymentMode: item.paymentMode || "Pending at Counter",
    paymentStatus: item.paymentStatus || "PENDING",
    registeredAt: item.registeredAt || new Date().toISOString(),
    time: item.time || "10:30",
  })) as string;
}

/** Updates the status of an OPD Queue item */
export async function updateOpdQueueItemStatus(queueId: string, status: string): Promise<boolean> {
  try {
    const client = getCortexConvexClient();
    return (await client.mutation("opd_queue:updateStatus" as any, {
      queue_id: queueId,
      status,
    })) as boolean;
  } catch (err) {
    console.error("[Cortex PMS] updateOpdQueueItemStatus error:", err);
    return false;
  }
}

/** Deletes an OPD Queue record from Cortex PMS */
export async function removeOpdQueueItem(queueId: string): Promise<boolean> {
  try {
    const client = getCortexConvexClient();
    return (await client.mutation("opd_queue:remove" as any, {
      queue_id: queueId,
    })) as boolean;
  } catch (err) {
    console.error("[Cortex PMS] removeOpdQueueItem error:", err);
    return false;
  }
}

/** Fetch all OPD Queue items filtered by date, doctor, and status */
export async function fetchLiveOpdQueue(options?: {
  date?: string;
  doctor?: string;
  status?: string;
}): Promise<any[]> {
  try {
    const client = getCortexConvexClient();
    let queue = (await client.query("opd_queue:list" as any, {})) as any[];
    if (!Array.isArray(queue)) return [];

    if (options?.date) {
      queue = queue.filter((item) => {
        const itemDate = (item.registeredAt || "").split("T")[0];
        return itemDate === options.date;
      });
    }

    if (options?.doctor && options.doctor !== "ALL") {
      const qDoc = options.doctor.toLowerCase().replace(/l+/g, "l");
      queue = queue.filter((item) => {
        const doc = (item.doctor || "").toLowerCase().replace(/l+/g, "l");
        return doc.includes(qDoc) || qDoc.includes(doc);
      });
    }

    if (options?.status && options.status !== "ALL") {
      queue = queue.filter((item) => item.status === options.status);
    }

    // Sort by token numeric ascending
    queue.sort((a, b) => {
      const tokenA = parseInt(a.token, 10) || 999;
      const tokenB = parseInt(b.token, 10) || 999;
      return tokenA - tokenB;
    });

    // Ensure every item has a normalized id equal to queue_id
    return queue.map((item) => ({
      ...item,
      id: item.queue_id || item.id || String(item._id),
      queue_id: item.queue_id || item.id || String(item._id),
    }));
  } catch (err) {
    console.error("[Cortex PMS] fetchLiveOpdQueue error:", err);
    return [];
  }
}
