import { NextRequest, NextResponse } from 'next/server';
import { processIncomingMessage } from '@/lib/conversation';
import { sendWhatsAppMessage, sendWhatsAppLocation, sendWhatsAppInteractive } from '@/lib/whatsapp';

/**
 * GET Handler - Webhook Verification by Meta
 * Meta sends a GET request when you configure or verify the webhook in Meta App Dashboard.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'scooty_ai_verify_2026';

  console.log('[Webhook Verification Attempt]', {
    mode,
    tokenProvided: token ? '***' : null,
    hasChallenge: !!challenge,
  });

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook Verification SUCCESS]');
    return new Response(challenge || '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[Webhook Verification FAILED] Token mismatch or invalid mode');
  return new Response('Forbidden', { status: 403 });
}

/**
 * WhatsApp Cloud API Webhook Payload Structures
 */
interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
  interactive?: {
    button_reply?: { id: string; title?: string };
    list_reply?: { id: string; title?: string };
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

interface WhatsAppChangeValue {
  messaging_product: string;
  metadata?: {
    display_phone_number: string;
    phone_number_id: string;
  };
  messages?: WhatsAppMessage[];
  statuses?: unknown[];
}

interface WhatsAppWebhookBody {
  object: string;
  entry?: Array<{
    id: string;
    changes: Array<{
      value: WhatsAppChangeValue;
      field: string;
    }>;
  }>;
}

/**
 * POST Handler - Receives incoming WhatsApp messages & events
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WhatsAppWebhookBody;

    // Verify payload is from WhatsApp Business Account
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored', reason: 'Not a whatsapp_business_account event' }, { status: 200 });
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;

        // Process message delivery status receipts (sent, delivered, read, failed)
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const status of value.statuses as any[]) {
            const statusType = status.status; // "sent", "delivered", "read", "failed"
            const recipient = status.recipient_id;
            const messageId = status.id;
            if (statusType === 'failed') {
              const err = status.errors?.[0];
              console.error(
                `🚨 [WhatsApp Delivery FAILED] To: +${recipient} (MsgID: ${messageId})\n` +
                `Code: ${err?.code} | Title: ${err?.title} | Message: ${err?.message}\n` +
                `Details: ${JSON.stringify(err?.error_data || {})}`
              );
            } else {
              console.log(
                `ℹ️ [WhatsApp Delivery Status] To: +${recipient} -> ${statusType?.toUpperCase()} (MsgID: ${messageId})`
              );
            }
          }
        }

        // If no incoming messages, continue to next change
        if (!value.messages || value.messages.length === 0) {
          continue;
        }

        for (const message of value.messages) {
          const sender = message.from;
          const messageId = message.id;
          const messageType = message.type;

          let messageText: string | undefined;
          let latitude: number | undefined;
          let longitude: number | undefined;

          if (messageType === 'text') {
            messageText = message.text?.body;
            console.log(
              `\nWhatsApp message received\nFrom: +${sender}\nType: text\nMessage: ${messageText}\n`
            );
          } else if (messageType === 'interactive') {
            messageText =
              message.interactive?.button_reply?.id ||
              message.interactive?.list_reply?.id ||
              message.interactive?.button_reply?.title ||
              message.interactive?.list_reply?.title;
            console.log(
              `\nWhatsApp interactive received\nFrom: +${sender}\nPayload: ${messageText}\n`
            );
          } else if (messageType === 'button') {
            messageText =
              (message as any).button?.payload ||
              (message as any).button?.text;
            console.log(
              `\nWhatsApp button received\nFrom: +${sender}\nPayload: ${messageText}\n`
            );
          } else if (messageType === 'location') {
            latitude = message.location?.latitude;
            longitude = message.location?.longitude;
            console.log(
              `\nWhatsApp location received\nFrom: +${sender}\nLatitude: ${latitude}\nLongitude: ${longitude}\n`
            );
          } else {
            console.log(
              `\nWhatsApp message received\nFrom: +${sender}\nType: ${messageType}\n`
            );
          }

          // Process message through deterministic Convex-backed state machine
          const result = await processIncomingMessage({
            phoneNumber: sender,
            type: messageType,
            text: messageText,
            latitude,
            longitude,
          });

          // Send text reply via WhatsApp Business Cloud API
          if (result.interactive) {
            const sent = await sendWhatsAppInteractive(sender, result.interactive);
            if (!sent.success) await sendWhatsAppMessage(sender, result.text);
          } else {
            await sendWhatsAppMessage(sender, result.text);
          }

          // If a native WhatsApp location was generated on confirmation, send native location pin
          if (result.nativeLocation) {
            await sendWhatsAppLocation(sender, result.nativeLocation);
          }
        }
      }
    }

    // Always acknowledge with 200 OK so Meta doesn't retry
    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Webhook Error]', message);
    // Still return 200 to prevent Meta webhook retries loops
    return NextResponse.json({ status: 'error', error: message }, { status: 200 });
  }
}
