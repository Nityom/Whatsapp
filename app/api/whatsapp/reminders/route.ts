import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { sendWhatsAppMessage, sendWhatsAppInteractive, sendWhatsAppTemplate } from "@/lib/whatsapp";

function getConvexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  return new ConvexHttpClient(url);
}

/**
 * P0-5 & Phase 2 (Issue 11): Process and dispatch 1-hour appointment reminders
 * Checks DPDP consent (skips if user opted out with STOP) and falls back to
 * approved utility templates outside the 24-hour service window.
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

      // Check DPDP Consent: Do not message users who sent STOP / opted out
      const session = await convex.query(api.sessions.getWhatsAppSession, {
        phoneNumber: reminder.phoneNumber,
      });
      if (session && session.consentGranted === false) {
        console.log(`[Reminders DPDP Guard] Skipping reminder for +${reminder.phoneNumber} (Opted out / STOP).`);
        await convex.mutation(api.reminders.cancelReminder, {
          reminderId: reminder._id,
        });
        results.push({ id: reminder._id, phone: phoneToSend, status: "SKIPPED_OPT_OUT" });
        continue;
      }

      const reminderText = `⏰ *APPOINTMENT REMINDER (Starting in ~1 Hour)*

Hello *${reminder.patientName}*, your appointment is coming up today:

👨‍⚕️ *Doctor:* ${reminder.doctorName}
📅 *Date:* ${reminder.date}
⏰ *Time:* ${reminder.time}
🎫 *Token:* ${reminder.token || "#1"}
📍 *Location:* Cortex Hospital, Aarti Chowk, Nagpur Road, Wardha

⚠️ *Please arrive 15 minutes before your time for OPD registration and vitals check.*`;

      const interactive = {
        kind: "buttons" as const,
        body: reminderText,
        buttons: [
          { id: "btn_checkin", title: "📍 I'm Here / Check In" },
          { id: "btn_reschedule", title: "🔄 Reschedule" },
          { id: "btn_cancel_appt", title: "❌ Cancel" },
        ],
      };

      // 1. Send interactive reminder card with quick-action buttons
      const intRes = await sendWhatsAppInteractive(phoneToSend, interactive);
      if (!intRes.success) {
        // Fallback A: Try plain text
        const textRes = await sendWhatsAppMessage(phoneToSend, reminderText);
        if (!textRes.success) {
          // Fallback B: Outside 24-hour service window -> Dispatch Meta approved utility template
          console.warn(`[Reminder 24h Window Fallback] Text & interactive failed (${textRes.error}). Dispatching approved template.`);
          await sendWhatsAppTemplate(phoneToSend, "svaasth_opd_update", "en_US", [
            {
              type: "body",
              parameters: [
                { type: "text", text: reminder.patientName },
                { type: "text", text: reminder.token || "#1" },
                { type: "text", text: reminder.doctorName },
                { type: "text", text: `${reminder.date} at ${reminder.time}` },
              ],
            },
          ]);
        }
      }

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

