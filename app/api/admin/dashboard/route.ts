import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/conversation';
import { api } from '@/convex/_generated/api';
import { sendWhatsAppMessage, sendWhatsAppTemplate, WhatsAppTemplateComponent } from '@/lib/whatsapp';
import { getOpdWaitingQueue } from '@/lib/cortexClient';

/**
 * Format recipient phone number for WhatsApp Cloud API.
 * Ensures the country code (91 for India) is present without '+' or formatting.
 */
function formatWhatsAppRecipientPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export async function GET(request: NextRequest) {
  try {
    const convex = getConvexClient();
    const sessions = await convex.query(api.sessions.listAllSessions, {});
    const stats = await convex.query(api.sessions.getDashboardStats, {});
    const waitingPatients = await getOpdWaitingQueue();

    return NextResponse.json({
      success: true,
      sessions,
      stats,
      waitingPatients,
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
      const waRecipient = formatWhatsAppRecipientPhone(cleanPhone);

      // Check whether patient has sent an inbound message within the last 24 hours
      const history = await convex.query(api.sessions.getChatHistory, { phoneNumber: cleanPhone });
      const lastPatientMsg = [...history].reverse().find((m) => m.sender === 'patient');
      const isOutside24h =
        !lastPatientMsg || Date.now() - lastPatientMsg.createdAt > 24 * 60 * 60 * 1000;

      // 1. Dispatch real message via WhatsApp Business Cloud API (Meta)
      console.log(
        `[Dashboard Outbound] Dispatching WhatsApp message to +${waRecipient}... (isOutside24h: ${isOutside24h})`
      );
      const waResult = await sendWhatsAppMessage(waRecipient, text);
      console.log(`[Dashboard Outbound Result]`, waResult);

      // 2. Persist to Convex database audit log with accurate metadata
      const res = await convex.mutation(api.sessions.sendStaffMessage, {
        phoneNumber: cleanPhone,
        text,
        metadata: {
          whatsappMessageId: waResult.messageId,
          delivered: !isOutside24h && waResult.success,
          outside24h: isOutside24h,
        },
      });

      return NextResponse.json({
        success: true,
        res,
        whatsappDelivered: !isOutside24h && waResult.success,
        whatsappMessageId: waResult.messageId,
        outside24h: isOutside24h,
        whatsappError: isOutside24h
          ? 'Patient outside 24h window. Meta policy blocks plain text until patient replies.'
          : waResult.error,
      });
    }

    if (action === 'send_template') {
      const {
        phoneNumber,
        templateName = 'appointment_booked',
        languageCode = 'en_US',
        parameters = [],
      } = body;
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const waRecipient = formatWhatsAppRecipientPhone(cleanPhone);

      // Construct component body parameters for Meta WhatsApp Cloud API
      const components: WhatsAppTemplateComponent[] = [];
      if (parameters && parameters.length > 0) {
        components.push({
          type: 'body',
          parameters: parameters.map((val: string) => ({
            type: 'text',
            text: String(val),
          })),
        });
      }

      console.log(`[Dashboard Outbound Template] Sending '${templateName}' to +${waRecipient}...`);
      const waResult = await sendWhatsAppTemplate(
        waRecipient,
        templateName,
        languageCode,
        components
      );
      console.log(`[Dashboard Outbound Template Result]`, waResult);

      // Audit text representation in Convex chat history
      const paramText = parameters.length > 0 ? `\nParameters: ${parameters.join(' | ')}` : '';
      const auditText = `📋 [Meta Template: ${templateName}]${paramText}`;
      const res = await convex.mutation(api.sessions.sendStaffMessage, {
        phoneNumber: cleanPhone,
        text: auditText,
      });

      return NextResponse.json({
        success: true,
        res,
        whatsappDelivered: waResult.success,
        whatsappMessageId: waResult.messageId,
        whatsappError: waResult.error,
      });
    }

    if (action === 'send_bulk') {
      const {
        phoneNumbers,
        text,
        campaignTitle,
        targetAudience,
        personalizedMessages = {},
      } = body;

      // 1. Dispatch real WhatsApp message to each recipient
      const deliveryResults = [];
      for (const phone of phoneNumbers) {
        const cleanPhone = phone.replace(/\D/g, '');
        const waRecipient = formatWhatsAppRecipientPhone(cleanPhone);
        if (waRecipient) {
          const msgToSend = personalizedMessages[cleanPhone] || text;
          const sendRes = await sendWhatsAppMessage(waRecipient, msgToSend);
          deliveryResults.push({ phone: waRecipient, ...sendRes });
        }
      }

      // 2. Persist campaign in Convex
      const res = await convex.mutation(api.sessions.sendBulkMessage, {
        phoneNumbers,
        text,
        campaignTitle,
        targetAudience,
      });

      return NextResponse.json({
        success: true,
        res,
        deliveries: deliveryResults,
      });
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
