import { NextRequest, NextResponse } from 'next/server';
import { processIncomingMessage, getConvexClient } from '@/lib/conversation';
import { api } from '@/convex/_generated/api';

/**
 * Webhook Simulator API
 * Enables testing the chatbot state machine locally directly from the browser UI
 */
export async function POST(request: NextRequest) {
  try {
    const convex = getConvexClient();
    const body = await request.json();
    const { action, phoneNumber = '919876543210', text, type = 'text', latitude, longitude } = body;

    if (action === 'reset') {
      const resetState = await convex.mutation(api.sessions.clearWhatsAppSession, { phoneNumber });
      return NextResponse.json({
        success: true,
        session: resetState,
        message: 'Session reset',
      });
    }

    if (action === 'get_session') {
      const session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber });
      return NextResponse.json({
        success: true,
        session,
      });
    }

    // Default action: send message
    const result = await processIncomingMessage({
      phoneNumber,
      type,
      text,
      latitude,
      longitude,
    });

    const session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber });

    return NextResponse.json({
      success: true,
      reply: result.text,
      nativeLocation: result.nativeLocation,
      session,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
