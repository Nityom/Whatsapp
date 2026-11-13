import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { sendWhatsAppMessage } from "../../../../lib/whatsapp";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, message } = await req.json();

    if (!phoneNumber || !message?.trim()) {
      return NextResponse.json({ error: "Missing phoneNumber or message" }, { status: 400 });
    }

    // Send via WhatsApp API
    const result = await sendWhatsAppMessage(phoneNumber, message.trim());

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to send message" }, { status: 500 });
    }

    // Log to Convex
    const { api } = await import("../../../../convex/_generated/api");
    await convex.mutation(api.admin.saveStaffMessage, {
      phoneNumber,
      text: message.trim(),
    });

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error("[Admin Send API]", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
