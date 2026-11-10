import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/conversation";
import { getPatientPrescriptions, normalizePhone } from "@/lib/cortexClient";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.CORTEX_PRESCRIPTION_WEBHOOK_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const phone = typeof body?.phoneNumber === "string" ? body.phoneNumber.replace(/\D/g, "") : "";
  const prescriptionId = typeof body?.prescriptionId === "string" ? body.prescriptionId : "";
  if (!phone || !prescriptionId) return NextResponse.json({ error: "phoneNumber and prescriptionId are required" }, { status: 400 });

  const prescription = (await getPatientPrescriptions(phone)).find((item) => item._id === prescriptionId && normalizePhone(item.phone_number) === normalizePhone(phone));
  if (!prescription) return NextResponse.json({ error: "Prescription not found for this phone number" }, { status: 404 });

  const convex = getConvexClient();
  const session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: phone });
  const language = session?.language || "en";
  const link = `https://cortexhospital.com/print-prescription?id=${encodeURIComponent(prescriptionId)}`;
  const message = language === "hi"
    ? `Cortex Hospital आने के लिए धन्यवाद, ${prescription.patient_name}। आपका प्रिस्क्रिप्शन तैयार है: ${link}`
    : language === "mr"
      ? `Cortex Hospital ला भेट दिल्याबद्दल धन्यवाद, ${prescription.patient_name}. तुमचे प्रिस्क्रिप्शन तयार आहे: ${link}`
      : `Thank you for visiting Cortex Hospital, ${prescription.patient_name}. Your prescription is ready: ${link}`;
  const result = await sendWhatsAppMessage(phone, message);
  if (!result.success) return NextResponse.json({ error: result.error || "WhatsApp send failed" }, { status: 502 });
  return NextResponse.json({ success: true });
}
