/**
 * WhatsApp Cloud API Client
 * Used to send text messages via the official WhatsApp Business Cloud API.
 * 
 * Note: Never log access tokens or expose them to the client.
 */

const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v21.0';

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends a WhatsApp text message using the WhatsApp Cloud API.
 * 
 * @param to - Recipient phone number (with country code, without '+' or formatting, e.g. "919876543210")
 * @param message - Text content to send
 */
export async function sendWhatsAppMessage(to: string, message: string): Promise<SendMessageResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn(
      `[WhatsApp API] Message to ${to} was not sent via Cloud API because WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured.`
    );
    console.log(`[WhatsApp API Simulated Outgoing] To: ${to}\nMessage:\n${message}\n`);
    return {
      success: false,
      error: 'WhatsApp credentials not configured in environment',
    };
  }

  const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
          preview_url: false,
          body: message,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[WhatsApp API Error] HTTP ${response.status}:`, data);
      return {
        success: false,
        error: data?.error?.message || 'Failed to send WhatsApp message',
      };
    }

    const messageId = data?.messages?.[0]?.id;
    console.log(`[WhatsApp API Success] Message sent to ${to}. MessageId: ${messageId}`);
    return {
      success: true,
      messageId,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[WhatsApp API Exception] Failed to send message to ${to}:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
