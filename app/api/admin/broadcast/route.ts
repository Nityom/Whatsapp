import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { sendWhatsAppMessage } from "../../../../lib/whatsapp";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { message, filter } = await req.json();
    // filter: "all" | "verified" | "handed_over" | language code

    if (!message?.trim()) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const { api } = await import("../../../../convex/_generated/api");
    const sessions = await convex.query(api.admin.getAllSessions, {});

    // Apply filter
    let targets = sessions;
    if (filter === "verified") {
      targets = sessions.filter((s) => s.isVerified);
    } else if (filter === "handed_over") {
      targets = sessions.filter((s) => s.isHandedOver);
    } else if (filter === "en" || filter === "hi" || filter === "mr") {
      targets = sessions.filter((s) => s.language === filter);
    }

    const results: Array<{ phone: string; success: boolean; error?: string }> = [];

    for (const session of targets) {
      const result = await sendWhatsAppMessage(session.phoneNumber, message.trim());
      results.push({
        phone: session.phoneNumber,
        success: result.success,
        error: result.error,
      });

      if (result.success) {
        await convex.mutation(api.admin.saveStaffMessage, {
          phoneNumber: session.phoneNumber,
          text: `[BROADCAST] ${message.trim()}`,
        });
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 100));
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({ success: true, sent, failed, total: targets.length, results });
  } catch (error) {
    console.error("[Admin Broadcast API]", error);
    return NextResponse.json({ error: "Failed to broadcast" }, { status: 500 });
  }
}

