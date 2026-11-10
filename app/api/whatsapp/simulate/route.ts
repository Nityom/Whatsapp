import { NextRequest, NextResponse } from 'next/server';
import { processIncomingMessage, getConvexClient } from '@/lib/conversation';
import { findPatient } from '@/lib/cortexClient';
import { api } from '@/convex/_generated/api';

/**
 * Webhook Simulator API for Cortex Hospital Assistant
 * Enables testing the chatbot state machine locally directly from the browser UI
 */
export async function POST(request: NextRequest) {
  try {
    const convex = getConvexClient();
    const body = await request.json();
    const {
      action,
      phoneNumber = '919373280505',
      text,
      type = 'text',
      latitude,
      longitude,
    } = body;

    const cleanPhone = phoneNumber.replace(/\D/g, '');

    if (action === 'reset') {
      const resetState = await convex.mutation(api.sessions.clearWhatsAppSession, {
        phoneNumber: cleanPhone,
      });
      const patient = await findPatient(cleanPhone);
      return NextResponse.json({
        success: true,
        session: resetState,
        patient,
        message: 'Session reset to IDLE',
      });
    }

    if (action === 'toggle_handover') {
      const current = await convex.query(api.sessions.getWhatsAppSession, {
        phoneNumber: cleanPhone,
      });
      const newHandoverState = !(current?.isHandedOver ?? false);
      const updated = await convex.mutation(api.sessions.setHandover, {
        phoneNumber: cleanPhone,
        isHandedOver: newHandoverState,
        reason: newHandoverState ? 'Manual handover toggled from simulator UI' : undefined,
      });
      return NextResponse.json({
        success: true,
        session: updated,
        isHandedOver: newHandoverState,
      });
    }

    if (action === 'get_session') {
      const session = await convex.query(api.sessions.getWhatsAppSession, {
        phoneNumber: cleanPhone,
      });
      const patient = await findPatient(cleanPhone);
      return NextResponse.json({
        success: true,
        session,
        patient,
      });
    }

    // Default action: process incoming WhatsApp message
    const result = await processIncomingMessage({
      phoneNumber: cleanPhone,
      type,
      text,
      latitude,
      longitude,
    });

    const session = await convex.query(api.sessions.getWhatsAppSession, {
      phoneNumber: cleanPhone,
    });
    const patient = await findPatient(cleanPhone);

    return NextResponse.json({
      success: true,
      reply: result.text,
      interactive: result.interactive,
      nativeLocation: result.nativeLocation,
      session,
      patient,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Simulator Error]', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
