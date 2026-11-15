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
import { sendWhatsAppMessage, formatWhatsAppRecipient } from '@/lib/whatsapp';

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

      // Calculate sequential daily 2-digit token across all patients (guaranteed no duplicate)
      const token = await calculateNextDailyToken(doctor, date);

      const currentTime = time || new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const queueRecordId = `walkin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const department = doctor.toLowerCase().includes('shillpa') || doctor.toLowerCase().includes('shilpa')
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
        const waRecipient = formatWhatsAppRecipient(phone);
        const confirmationMsg =
          `🏥 *Svaasth Hospital – OPD Walk-in Token*\n\n` +
          `Hello *${name.trim()}*,\n` +
          `Your OPD walk-in registration has been confirmed.\n\n` +
          `🎫 *OPD Token:* #${token}\n` +
          `👨‍⚕️ *Doctor:* ${doctor}\n` +
          `📍 *Department:* ${department}\n` +
          `📅 *Date:* ${date} (${currentTime})\n\n` +
          `Please take a seat in the patient waiting area. You will be alerted as soon as your turn arrives.`;

        console.log(`[OPD Walk-in] Dispatching WhatsApp confirmation to +${waRecipient}...`);
        const waRes = await sendWhatsAppMessage(waRecipient, confirmationMsg);
        console.log(`[OPD Walk-in WhatsApp Result]`, waRes);
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

      const waRecipient = formatWhatsAppRecipient(phone);
      const alertMsg =
        `🔔 *Consultation Call – Svaasth Hospital*\n\n` +
        `Dear *${name || 'Patient'}*,\n` +
        `*${doctor}* is ready to see you now in the OPD Consultation Room.\n\n` +
        `🎫 *Your Token Number:* #${token}\n\n` +
        `Please proceed to the doctor's consultation room immediately. Thank you!`;

      console.log(`[OPD Call Patient] Dispatching WhatsApp alert to +${waRecipient}...`);
      const waRes = await sendWhatsAppMessage(waRecipient, alertMsg);
      console.log(`[OPD Call Patient WhatsApp Result]`, waRes);

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
