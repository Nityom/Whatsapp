import { NextRequest, NextResponse } from 'next/server';
import {
  fetchLiveOpdQueue,
  calculateNextDailyToken,
  upsertOpdQueueItem,
  updateOpdQueueItemStatus,
  removeOpdQueueItem,
  normalizePhone,
  getAvailableSlots,
} from '@/lib/cortexClient';
import {
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
  formatWhatsAppRecipient,
} from '@/lib/whatsapp';
import { getConvexClient } from '@/lib/conversation';
import { api } from '@/convex/_generated/api';

/**
 * Dispatches an OPD notification to WhatsApp.
 * First uses the officially approved Meta Utility Template `svaasth_opd_update`
 * which bypasses the 24-hour window restriction and guarantees delivery.
 * Also saves the message to the Convex chat logs.
 */
async function dispatchOpdWhatsApp(params: {
  phone: string;
  name: string;
  doctor: string;
  dateOrStatus: string;
  token: string;
  plainText: string;
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const waRecipient = formatWhatsAppRecipient(params.phone);

  // 1. Send via approved Meta Template `svaasth_opd_update` (100% delivered by Meta)
  try {
    const tplRes = await sendWhatsAppTemplate(
      waRecipient,
      'svaasth_opd_update',
      'en_US',
      [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.name || 'Valued Patient' },
            { type: 'text', text: params.doctor },
            { type: 'text', text: params.dateOrStatus },
            { type: 'text', text: params.token },
          ],
        },
      ]
    );

    if (tplRes.success) {
      console.log(`[OPD WhatsApp Template Delivered] To: ${waRecipient}, ID: ${tplRes.messageId}`);
      try {
        const convex = getConvexClient();
        await convex.mutation(api.sessions.sendStaffMessage, {
          phoneNumber: waRecipient,
          text: `[OPD Update] Dear ${params.name}, your visit with ${params.doctor} is confirmed for ${params.dateOrStatus}. Token: #${params.token}.`,
          metadata: {
            template: 'svaasth_opd_update',
            token: params.token,
            whatsappMessageId: tplRes.messageId,
          },
        });
      } catch (dbErr) {
        console.error('[OPD WhatsApp DB Log Error]', dbErr);
      }
      return tplRes;
    }
  } catch (err: any) {
    console.warn(`[OPD WhatsApp] Template send attempt error:`, err?.message);
  }

  // 2. Fallback to direct plain text message
  const textRes = await sendWhatsAppMessage(waRecipient, params.plainText);
  if (textRes.success) {
    try {
      const convex = getConvexClient();
      await convex.mutation(api.sessions.sendStaffMessage, {
        phoneNumber: waRecipient,
        text: params.plainText,
        metadata: { whatsappMessageId: textRes.messageId },
      });
    } catch {}
  }
  return textRes;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // Slot availability query for walk-in appointment scheduling
    if (action === 'slots') {
      const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
      const doctor = searchParams.get('doctor') || 'Dr. Vipeen Raut';
      const slotData = await getAvailableSlots(date, doctor);
      return NextResponse.json({ success: true, slotData });
    }

    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const doctor = searchParams.get('doctor') || 'ALL';
    const status = searchParams.get('status') || 'ALL';

    const queue = await fetchLiveOpdQueue({ date, doctor, status });
    return NextResponse.json({ success: true, queue, date, doctor });
  } catch (error: any) {
    console.error('[OPD API GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch OPD queue' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'walkin') {
      const {
        name,
        phone,
        age,
        sex = 'Male',
        doctor = 'Dr. Vipeen Raut',
        address = '',
        priority = 'Normal',
        visitType = 'New Registration',
        date = new Date().toISOString().split('T')[0],
        time,
        sendWhatsApp = true,
      } = body;

      if (!name || !phone) {
        return NextResponse.json(
          { success: false, error: 'Name and phone number are required for walk-in' },
          { status: 400 }
        );
      }

      // Calculate sequential daily 2-digit token per doctor (e.g. 01, 02)
      const token = await calculateNextDailyToken(doctor, date);

      const currentTime = time || new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const queueRecordId = `walkin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const department =
        doctor.toLowerCase().includes('shillpa') || doctor.toLowerCase().includes('shilpa')
          ? 'Obstetrics & Gynaecology'
          : 'Orthopaedics & Joint Replacement';

      await upsertOpdQueueItem({
        id: queueRecordId,
        token,
        name: name.trim(),
        age: String(age || '—'),
        sex,
        phone: normalizePhone(phone),
        address: address.trim(),
        doctor,
        department,
        priority,
        visitType,
        status: 'Waiting',
        registeredAt: `${date}T${currentTime}:00`,
        time: currentTime,
      });

      // Send Instant WhatsApp Confirmation
      let whatsappStatus = 'skipped';
      let whatsappError: string | undefined;

      if (sendWhatsApp && phone) {
        const plainMsg =
          `🏥 *Svaasth Hospital – OPD Walk-in Token*\n\n` +
          `Hello *${name.trim()}*,\n` +
          `Your OPD walk-in registration has been confirmed.\n\n` +
          `🎫 *OPD Token:* #${token}\n` +
          `👨‍⚕️ *Doctor:* ${doctor}\n` +
          `📍 *Department:* ${department}\n` +
          `📅 *Date:* ${date} (${currentTime})\n\n` +
          `Please take a seat in the waiting area. You will be alerted when your turn arrives.`;

        const waRes = await dispatchOpdWhatsApp({
          phone,
          name: name.trim(),
          doctor,
          dateOrStatus: `${date} at ${currentTime}`,
          token,
          plainText: plainMsg,
        });

        whatsappStatus = waRes.success ? 'sent' : 'failed';
        whatsappError = waRes.error;
      }

      return NextResponse.json({
        success: true,
        token,
        queueId: queueRecordId,
        whatsappStatus,
        whatsappError,
      });
    }

    if (action === 'update_status') {
      const queueId = body.queueId || body.id || body.queue_id;
      const status = body.status;
      if (!queueId || !status) {
        return NextResponse.json(
          { success: false, error: 'queueId and status are required' },
          { status: 400 }
        );
      }

      const updated = await updateOpdQueueItemStatus(queueId, status);
      return NextResponse.json({ success: updated });
    }

    if (action === 'delete') {
      const queueId = body.queueId || body.id || body.queue_id;
      if (!queueId) {
        return NextResponse.json(
          { success: false, error: 'queueId is required for deletion' },
          { status: 400 }
        );
      }

      const deleted = await removeOpdQueueItem(queueId);
      return NextResponse.json({ success: deleted });
    }

    if (action === 'call_patient') {
      const { queueId, phone, name, token, doctor = 'Dr. Vipeen Raut' } = body;
      if (!phone || !token) {
        return NextResponse.json(
          { success: false, error: 'Phone and token are required to call patient' },
          { status: 400 }
        );
      }

      const alertMsg =
        `🔔 *Consultation Call – Svaasth Hospital*\n\n` +
        `Dear *${name || 'Patient'}*,\n` +
        `*${doctor}* is ready to see you now in the OPD Consultation Room.\n\n` +
        `🎫 *Your Token Number:* #${token}\n\n` +
        `Please proceed to the doctor's consultation room immediately. Thank you!`;

      console.log(`[OPD Call Patient] Dispatching WhatsApp alert for Token #${token} to ${phone}...`);
      const waRes = await dispatchOpdWhatsApp({
        phone,
        name: name || 'Patient',
        doctor,
        dateOrStatus: 'Now in Consultation Room',
        token,
        plainText: alertMsg,
      });

      // Advance status to In Consultation if queueId is provided
      if (queueId) {
        await updateOpdQueueItemStatus(queueId, 'In Consultation');
      }

      return NextResponse.json({
        success: true,
        whatsappSent: waRes.success,
        whatsappError: waRes.error,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[OPD API POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Operation failed' },
      { status: 500 }
    );
  }
}
