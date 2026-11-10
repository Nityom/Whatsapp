import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { formatDisplayDate } from '@/lib/cortexAgent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      phoneNumber,
      patientName,
      prescriptionId,
      doctorName,
      date,
      diagnosis,
    } = body;

    if (!phoneNumber || !prescriptionId) {
      return NextResponse.json(
        { success: false, error: 'phoneNumber and prescriptionId are required' },
        { status: 400 }
      );
    }

    const liveSiteBase = process.env.CORTEX_CONVEX_SITE_URL || 'https://jovial-sheep-76.convex.site';
    const prescriptionUrl = `${liveSiteBase}/print-prescription?id=${encodeURIComponent(prescriptionId)}`;
    const formattedDate = date ? formatDisplayDate(date) : '';

    const message = `🏥 *CORTEX HOSPITAL, WARDHA*
Hello *${patientName || 'Patient'}* 👋

Your digital prescription from *${doctorName || 'Dr. Vipeen Raut'}* has been generated.

📅 *Date:* ${formattedDate}
🩺 *Diagnosis:* ${diagnosis || 'Consultation'}

🔗 *View / Print Your Prescription:*
${prescriptionUrl}

_Please follow the dosage instructions. For any queries, reply to this WhatsApp chat or call reception at 07152-255795._ ❤️`;

    const sendRes = await sendWhatsAppMessage(phoneNumber, message);
    return NextResponse.json(sendRes);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

