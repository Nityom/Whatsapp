import { NextRequest, NextResponse } from 'next/server';
import { processIncomingMessage, getOrCreateSession, resetSession } from '@/lib/conversation';

/**
 * Webhook Simulator API
 * Enables testing the chatbot state machine locally directly from the browser UI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, phoneNumber = '919876543210', text, type = 'text', latitude, longitude } = body;

    if (action === 'reset') {
      const resetState = resetSession(phoneNumber);
      return NextResponse.json({
        success: true,
        session: resetState,
        message: 'Session reset',
      });
    }

    if (action === 'get_session') {
      const session = getOrCreateSession(phoneNumber);
      return NextResponse.json({
        success: true,
        session,
      });
    }

    // Default action: send message
    const reply = processIncomingMessage({
      phoneNumber,
      type,
      text,
      latitude,
      longitude,
    });

    const session = getOrCreateSession(phoneNumber);

    return NextResponse.json({
      success: true,
      reply,
      session,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
