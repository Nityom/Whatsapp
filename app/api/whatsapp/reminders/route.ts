import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { sendWhatsAppMessage, sendWhatsAppInteractive } from "@/lib/whatsapp";

function getConvexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  return new ConvexHttpClient(url);
}

/**
 * P0-5: Process and dispatch 1-hour appointment reminders
 * Can be triggered via cron job or on-demand
 */
export async function GET(request: NextRequest) {
  try {
    const convex = getConvexClient();
    const { searchParams } = new URL(request.url);
    const isTest = searchParams.get("test") === "1";
    const testPhone = searchParams.get("phone");

    const dueReminders = await convex.query(api.reminders.getDueReminders, {
      now: Date.now(),
    });

    const results = [];

    for (const reminder of dueReminders) {
      const phoneToSend = isTest && testPhone ? testPhone : reminder.phoneNumber;

      const reminderText = `⏰ *APPOINTMENT REMINDER (Starting in ~1 Hour)*
━━━━━━━━━━━━━━━━━━━━━
Hello *${reminder.patientName}*, your appointment is coming up today:

👨‍⚕️ *Doctor:* ${reminder.doctorName}
📅 *Date:* ${reminder.date}
⏰ *Time:* ${reminder.time}
🎫 *Token:* ${reminder.token || "#1"}
📍 *Location:* Cortex Hospital, Aarti Chowk, Nagpur Road, Wardha

⚠️ *Please arrive 15 minutes before your time for OPD registration and vitals check.*`;

      const interactive = {
        kind: "buttons" as const,
        body: "Please confirm your arrival or choose an option:",
        buttons: [
          { id: "btn_checkin", title: "📍 I'm Here / Check In" },
          { id: "btn_reschedule", title: "🔄 Reschedule" },
          { id: "btn_cancel_appt", title: "❌ Cancel" },
        ],
      };

      // Send text message
      await sendWhatsAppMessage(phoneToSend, reminderText);
      // Send quick action buttons
      await sendWhatsAppInteractive(phoneToSend, interactive);

      // Mark sent in database
      await convex.mutation(api.reminders.markReminderSent, {
        reminderId: reminder._id,
      });

      // Audit log
      await convex.mutation(api.audit.logAuditEvent, {
        eventType: "REMINDER_SENT",
        phoneNumber: reminder.phoneNumber,
        patientName: reminder.patientName,
        details: `Sent 1-hour reminder for appointment ${reminder.appointmentId} (${reminder.time})`,
        metadata: { appointmentId: reminder.appointmentId, time: reminder.time },
      });

      results.push({ id: reminder._id, phone: phoneToSend, status: "SENT" });
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      reminders: results,
    });
  } catch (error: any) {
    console.error("[Reminders API Error]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
