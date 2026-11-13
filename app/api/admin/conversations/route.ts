import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  try {
    // Dynamically import to avoid issues with server/client boundaries
    const { api } = await import("../../../../convex/_generated/api");
    const sessions = await convex.query(api.admin.getAllSessions, {});
    const messages = await convex.query(api.admin.getAllMessages, { limit: 500 });

    // Group messages by phone and get last message per phone
    const lastMessageByPhone: Record<string, { text: string; sender: string; createdAt: number }> = {};
    for (const msg of messages) {
      const existing = lastMessageByPhone[msg.phoneNumber];
      if (!existing || msg.createdAt > existing.createdAt) {
        lastMessageByPhone[msg.phoneNumber] = {
          text: msg.text,
          sender: msg.sender,
          createdAt: msg.createdAt,
        };
      }
    }

    // Count messages per phone
    const msgCountByPhone: Record<string, number> = {};
    for (const msg of messages) {
      msgCountByPhone[msg.phoneNumber] = (msgCountByPhone[msg.phoneNumber] || 0) + 1;
    }

    const conversations = sessions.map((session) => ({
      phoneNumber: session.phoneNumber,
      patientName: session.patientName || "Unknown",
      patientReference: session.patientReference || null,
      currentStep: session.currentStep,
      language: session.language || "en",
      isHandedOver: session.isHandedOver || false,
      isVerified: session.isVerified || false,
      lastMessage: lastMessageByPhone[session.phoneNumber] || null,
      messageCount: msgCountByPhone[session.phoneNumber] || 0,
      updatedAt: session.updatedAt,
      createdAt: session.createdAt,
    }));

    // Sort by last activity
    conversations.sort((a, b) => b.updatedAt - a.updatedAt);

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("[Admin Conversations API]", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
