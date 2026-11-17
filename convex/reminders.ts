import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * P0-5: Schedule a reminder 1 hour before the appointment slot
 */
export const scheduleReminder = mutation({
  args: {
    appointmentId: v.string(),
    phoneNumber: v.string(),
    patientName: v.string(),
    doctorName: v.string(),
    date: v.string(), // YYYY-MM-DD
    time: v.string(), // e.g. "11:45 AM – 12:00 PM"
    slotTime: v.string(), // e.g. "11:45"
    token: v.optional(v.string()),
    testMode: v.optional(v.boolean()), // If true, sets reminder to fire in 60s for immediate demo verification
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Parse date and slotTime (24h or 12h format)
    let slotHour = 10;
    let slotMinute = 30;
    const timeMatch = args.slotTime.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      slotHour = parseInt(timeMatch[1], 10);
      slotMinute = parseInt(timeMatch[2], 10);
      const isPm = args.time.toLowerCase().includes("pm") && slotHour < 12;
      if (isPm) slotHour += 12;
    }

    // Appointment timestamp in Indian Standard Time (UTC+05:30)
    const [year, month, day] = args.date.split("-").map(Number);
    const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
    const appointmentEpoch = Date.UTC(year, month - 1, day, slotHour, slotMinute, 0) - IST_OFFSET_MS;

    // Exactly 1 hour before the appointment slot:
    let reminderScheduledFor = appointmentEpoch - 60 * 60 * 1000;

    // Scheduling rules:
    if (args.testMode) {
      reminderScheduledFor = now + 60 * 1000; // 1 min for instant testing/verification
    } else if (appointmentEpoch <= now) {
      // Appointment is already in the past - do not schedule
      return null;
    } else if (reminderScheduledFor <= now) {
      // If booked less than 1 hour before the slot (e.g. 30 mins before),
      // schedule reminder to fire in 2 minutes so patient still gets arrival guidance
      reminderScheduledFor = now + 2 * 60 * 1000;
    }

    // Check if a reminder for this appointment already exists; update it if so
    const existing = await ctx.db
      .query("appointmentReminders")
      .withIndex("by_appointmentId", (q) => q.eq("appointmentId", args.appointmentId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        phoneNumber: args.phoneNumber,
        patientName: args.patientName,
        doctorName: args.doctorName,
        date: args.date,
        time: args.time,
        slotTime: args.slotTime,
        token: args.token ?? existing.token,
        reminderScheduledFor,
        status: "PENDING",
      });
      return existing._id;
    }

    return await ctx.db.insert("appointmentReminders", {
      appointmentId: args.appointmentId,
      phoneNumber: args.phoneNumber,
      patientName: args.patientName,
      doctorName: args.doctorName,
      date: args.date,
      time: args.time,
      slotTime: args.slotTime,
      token: args.token,
      reminderScheduledFor,
      status: "PENDING",
      createdAt: now,
    });
  },
});

/**
 * Cancel pending reminders when an appointment is cancelled
 */
export const cancelReminder = mutation({
  args: {
    appointmentId: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    reminderId: v.optional(v.id("appointmentReminders")),
  },
  handler: async (ctx, args) => {
    if (args.reminderId) {
      const r = await ctx.db.get(args.reminderId);
      if (r && r.status === "PENDING") {
        await ctx.db.patch(r._id, { status: "CANCELLED" });
      }
      return { success: true, count: 1 };
    }

    let reminders: any[] = [];
    if (args.appointmentId) {
      reminders = await ctx.db
        .query("appointmentReminders")
        .withIndex("by_appointmentId", (q) => q.eq("appointmentId", args.appointmentId!))
        .collect();
    } else if (args.phoneNumber) {
      reminders = await ctx.db
        .query("appointmentReminders")
        .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber!))
        .collect();
    }

    for (const r of reminders) {
      if (r.status === "PENDING") {
        await ctx.db.patch(r._id, { status: "CANCELLED" });
      }
    }
    return { success: true, count: reminders.length };
  },
});

/**
 * Fetch pending reminders that are due to be sent (reminderScheduledFor <= now)
 */
export const getDueReminders = query({
  args: {
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const checkTime = args.now || Date.now();
    const pending = await ctx.db
      .query("appointmentReminders")
      .withIndex("by_status_and_time", (q) =>
        q.eq("status", "PENDING").lte("reminderScheduledFor", checkTime)
      )
      .take(50);

    return pending;
  },
});

/**
 * Mark a reminder as sent
 */
export const markReminderSent = mutation({
  args: {
    reminderId: v.id("appointmentReminders"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.reminderId, {
      status: "SENT",
      sentAt: now,
    });
    return { success: true };
  },
});

/**
 * List upcoming reminders for a patient or overall
 */
export const listReminders = query({
  args: {
    phoneNumber: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    if (args.phoneNumber) {
      return await ctx.db
        .query("appointmentReminders")
        .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber!))
        .order("desc")
        .take(limit);
    }
    return await ctx.db.query("appointmentReminders").order("desc").take(limit);
  },
});

