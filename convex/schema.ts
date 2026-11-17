import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Hospital WhatsApp Conversation & Patient Session State
  whatsappSessions: defineTable({
    phoneNumber: v.string(),
    currentStep: v.string(), // "WELCOME", "IDLE", "BOOKING_SELECT_DOCTOR", "BOOKING_SELECT_DATE", "BOOKING_SELECT_SLOT", "BOOKING_CONFIRMATION", "REGISTER_NAME", "REGISTER_AGE", "REGISTER_SEX", "REGISTER_ADDRESS", "OTP_VERIFICATION", "HANDED_OVER"
    language: v.optional(v.string()), // "en" | "hi" | "mr"
    patientId: v.optional(v.string()),
    patientReference: v.optional(v.string()), // UHID e.g. CRX0001
    patientName: v.optional(v.string()),
    isVerified: v.optional(v.boolean()),
    verificationOtp: v.optional(v.string()),
    otpExpiresAt: v.optional(v.number()),
    pendingAction: v.optional(v.string()), // e.g. "VIEW_PRESCRIPTION", "VIEW_BILL"
    isHandedOver: v.optional(v.boolean()),
    handoverReason: v.optional(v.string()),
    handoverTimestamp: v.optional(v.number()),
    lastBookedDoctor: v.optional(v.string()),
    lastBookedDate: v.optional(v.string()),
    lastBookedPatientName: v.optional(v.string()),
    consentGranted: v.optional(v.boolean()),
    rescheduleDraft: v.optional(
      v.object({
        appointmentId: v.optional(v.string()),
        doctorName: v.optional(v.string()),
        specialty: v.optional(v.string()),
        date: v.optional(v.string()),
        time: v.optional(v.string()),
        patientName: v.optional(v.string()),
        slot: v.optional(v.string()),
        slotTime: v.optional(v.string()),
      })
    ),
    bookingDraft: v.optional(
      v.object({
        doctorName: v.optional(v.string()),
        specialty: v.optional(v.string()),
        date: v.optional(v.string()),
        session: v.optional(v.string()),
        currentSession: v.optional(v.string()),
        slot: v.optional(v.string()),
        slotTime: v.optional(v.string()),
        patientName: v.optional(v.string()),
        patientAge: v.optional(v.string()),
        patientPhone: v.optional(v.string()),
        patientAddress: v.optional(v.string()),
        sex: v.optional(v.union(v.literal("Male"), v.literal("Female"), v.literal("Other"))),
        complaint: v.optional(v.string()),
        isSecondBooking: v.optional(v.boolean()),
        previousPatientName: v.optional(v.string()),
        explicitPatientName: v.optional(v.boolean()),
        // Legacy fields for backward compatibility
        startDate: v.optional(v.string()),
        pickupTime: v.optional(v.string()),
        returnDate: v.optional(v.string()),
        returnTime: v.optional(v.string()),
        customerName: v.optional(v.string()),
        customerLatitude: v.optional(v.number()),
        customerLongitude: v.optional(v.number()),
        distanceKm: v.optional(v.number()),
        locationName: v.optional(v.string()),
        locationAddress: v.optional(v.string()),
        vehicleName: v.optional(v.string()),
        vehiclePrice: v.optional(v.number()),
      })
    ),
    // Legacy fields for backward compatibility
    customerId: v.optional(v.string()),
    selectedVehicleId: v.optional(v.string()),
    pickupLocationId: v.optional(v.string()),
    // Dashboard & CRM metadata
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())), // e.g. ["Patient", "Lead", "VIP"]
    unreadCount: v.optional(v.number()),
    assignedTo: v.optional(v.string()),
    lastMessage: v.optional(v.string()),
    lastMessageTimestamp: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_phoneNumber", ["phoneNumber"]),

  // Chat message audit log
  chatMessages: defineTable({
    phoneNumber: v.string(),
    sender: v.union(v.literal("patient"), v.literal("assistant"), v.literal("staff")),
    text: v.string(),
    type: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_phone", ["phoneNumber"]),

  // Broadcast & Bulk Campaigns
  broadcastCampaigns: defineTable({
    title: v.string(),
    message: v.string(),
    targetAudience: v.string(), // "all" | "patients" | "leads" | "custom"
    recipientCount: v.number(),
    status: v.string(), // "sent" | "scheduled" | "draft"
    sentAt: v.number(),
    tags: v.optional(v.array(v.string())),
  }),

  // Aggregate stats counters (avoids full table scans for dashboard counts)
  metrics: defineTable({
    key: v.string(),
    count: v.number(),
  }).index("by_key", ["key"]),

  // P0-5: Appointment Reminders (Scheduled 1 hour before appointment slot)
  appointmentReminders: defineTable({
    appointmentId: v.string(),
    phoneNumber: v.string(),
    patientName: v.string(),
    doctorName: v.string(),
    date: v.string(), // YYYY-MM-DD
    time: v.string(), // e.g. "11:45 AM - 12:00 PM"
    slotTime: v.string(), // "11:45"
    token: v.optional(v.string()), // e.g. "#5"
    reminderScheduledFor: v.number(), // Epoch ms (1 hour before slot)
    status: v.string(), // "PENDING" | "SENT" | "CANCELLED"
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_status_and_time", ["status", "reminderScheduledFor"])
    .index("by_appointmentId", ["appointmentId"])
    .index("by_phone", ["phoneNumber"]),

  // P0-1: Audit Logs for critical system, webhook, consent & appointment lifecycle events
  auditLogs: defineTable({
    eventType: v.string(), // "WEBHOOK_EVENT" | "APPOINTMENT_BOOKED" | "APPOINTMENT_RESCHEDULED" | "APPOINTMENT_CANCELLED" | "QR_CHECKIN" | "REMINDER_SCHEDULED" | "REMINDER_SENT" | "CONSENT_RECORDED" | "HANDOVER_TO_RECEPTION" | "BOT_RESUMED" | "EMERGENCY_TRIGGERED"
    phoneNumber: v.string(),
    patientName: v.optional(v.string()),
    details: v.string(),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_event", ["eventType", "timestamp"])
    .index("by_phone", ["phoneNumber", "timestamp"]),
});
