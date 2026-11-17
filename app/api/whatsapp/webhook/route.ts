import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { processIncomingMessage, getConvexClient } from '@/lib/conversation';
import { sendWhatsAppMessage, sendWhatsAppLocation, sendWhatsAppInteractive } from '@/lib/whatsapp';
import { api } from '@/convex/_generated/api';

/**
 * Meta Webhook HMAC-SHA256 Signature Verification (Phase 0: Issue 4)
 * Ensures requests originate authentically from Meta's servers.
 */
function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.warn('[Webhook Security] WHATSAPP_APP_SECRET is not configured in environment. Allowing webhook through.');
    return true;
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    console.warn('[Webhook Security] Missing or malformed X-Hub-Signature-256 header.');
    return false;
  }

  const expectedSignature = signatureHeader.slice(7);
  const hmac = crypto.createHmac('sha256', appSecret);
  const digest = hmac.update(rawBody, 'utf8').digest('hex');

  const trustedBuffer = Buffer.from(digest, 'hex');
  const providedBuffer = Buffer.from(expectedSignature, 'hex');

  if (trustedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(trustedBuffer, providedBuffer);
}

/**
 * GET Handler - Webhook Verification by Meta
 * Meta sends a GET request when you configure or verify the webhook in Meta App Dashboard.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error('[Webhook Verification] CRITICAL: WHATSAPP_VERIFY_TOKEN is not configured in environment.');
    return new Response('Configuration error', { status: 500 });
  }

  // Supports token rotation (e.g. comma-separated current and new tokens)
  const allowedTokens = verifyToken.split(',').map((t) => t.trim()).filter(Boolean);

  console.log('[Webhook Verification Attempt]', {
    mode,
    tokenProvided: token ? '***' : null,
    hasChallenge: !!challenge,
  });

  if (mode === 'subscribe' && token && allowedTokens.includes(token)) {
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
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // 1. Verify Meta HMAC-SHA256 Signature (Phase 0: Issue 4)
    if (!verifyMetaSignature(rawBody, signature)) {
      return NextResponse.json(
        { status: 'error', error: 'Invalid or missing X-Hub-Signature-256' },
        { status: 401 }
      );
    }

    let body: WhatsAppWebhookBody;
    try {
      body = JSON.parse(rawBody) as WhatsAppWebhookBody;
    } catch {
      return NextResponse.json({ status: 'error', error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Verify payload is from WhatsApp Business Account
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored', reason: 'Not a whatsapp_business_account event' }, { status: 200 });
    }

    const convex = getConvexClient();

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

          // 2. Webhook Deduplication (Phase 0: Issue 4): prevent replays
          if (messageId) {
            try {
              const dedup = await convex.mutation(api.sessions.checkAndRecordMessageId, {
                messageId,
                phoneNumber: sender,
              });
              if (dedup.isDuplicate) {
                console.warn(`[Webhook Deduplication] Replay detected! Skipping already processed messageId: ${messageId}`);
                continue;
              }
            } catch (dedupErr) {
              console.warn('[Webhook Deduplication Warning]', dedupErr);
            }
          }

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

          // 1. Check if interactive message already duplicates the exact text response
          const isDuplicateOfInteractive = Boolean(
            result.interactive &&
            result.text &&
            result.text.trim().toLowerCase() === result.interactive.body.trim().toLowerCase()
          );

          // 2. Send formatted text reply if present and distinct from interactive body
          if (result.text && result.text.trim().length > 0 && !isDuplicateOfInteractive) {
            await sendWhatsAppMessage(sender, result.text);
            if (result.interactive) {
              // Pause ensures WhatsApp displays confirmation card first, then action buttons
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }

          // 3. Send interactive quick buttons or list picker if present
          if (result.interactive) {
            await sendWhatsAppInteractive(sender, result.interactive);
            if (result.nativeLocation) {
              await new Promise((resolve) => setTimeout(resolve, 400));
            }
          }

          // 4. If a native WhatsApp location was generated on confirmation, send native location pin
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
