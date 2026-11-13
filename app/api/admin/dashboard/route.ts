import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/conversation';
import { api } from '@/convex/_generated/api';

export async function GET(request: NextRequest) {
  try {
    const convex = getConvexClient();
    const sessions = await convex.query(api.sessions.listAllSessions, {});
    const stats = await convex.query(api.sessions.getDashboardStats, {});

    return NextResponse.json({
      success: true,
      sessions,
      stats,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Dashboard API GET Error]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const convex = getConvexClient();
    const body = await request.json();
    const { action } = body;

    if (action === 'get_history') {
      const { phoneNumber } = body;
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const messages = await convex.query(api.sessions.getChatHistory, {
        phoneNumber: cleanPhone,
      });
      return NextResponse.json({ success: true, messages });
    }

    if (action === 'send_staff_reply') {
      const { phoneNumber, text } = body;
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const res = await convex.mutation(api.sessions.sendStaffMessage, {
        phoneNumber: cleanPhone,
        text,
      });
      return NextResponse.json({ success: true, res });
    }

    if (action === 'send_bulk') {
      const { phoneNumbers, text, campaignTitle, targetAudience } = body;
      const res = await convex.mutation(api.sessions.sendBulkMessage, {
        phoneNumbers,
        text,
        campaignTitle,
        targetAudience,
      });
      return NextResponse.json({ success: true, res });
    }

    if (action === 'toggle_handover') {
      const { phoneNumber, isHandedOver } = body;
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const res = await convex.mutation(api.sessions.setHandover, {
        phoneNumber: cleanPhone,
        isHandedOver,
        reason: isHandedOver
          ? 'Manual staff takeover from Svaasth Connect Dashboard'
          : undefined,
      });
      return NextResponse.json({ success: true, session: res });
    }

    if (action === 'update_meta') {
      const { phoneNumber, notes, tags, assignedTo, patientName, unreadCount } = body;
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const res = await convex.mutation(api.sessions.updateSessionMeta, {
        phoneNumber: cleanPhone,
        notes,
        tags,
        assignedTo,
        patientName,
        unreadCount,
      });
      return NextResponse.json({ success: true, session: res });
    }

    if (action === 'seed') {
      const res = await convex.mutation(api.sessions.seedSampleData, {});
      return NextResponse.json({ success: true, res });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Dashboard API POST Error]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

