/**
 * WhatsApp Cloud API Client
 * Used to send text, documents/PDFs, and native location messages
 * via the official WhatsApp Business Cloud API.
 */

const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v21.0';
const DEFAULT_ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN;
const DEFAULT_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '543187875543213';

/**
 * Recipient Phone Guard / Validator:
 * Validates that recipient has a valid phone number (at least 10 digits).
 * Previously restricted only to developer test number (7796308778).
 * Now enabled for all valid phone numbers for multi-number live testing and real dispatches.
 * (Optional isolation: set RESTRICT_DEV_RECIPIENT=true to restrict to ALLOWED_DEV_PHONES).
 */
/** Format recipient phone number to E.164 digits without '+' (defaulting to India +91 for 10-digit numbers) */
export function formatWhatsAppRecipient(phone: string): string {
  let digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export function isDevAllowedRecipient(to: string): boolean {
  if (!to) return false;
  const digits = to.replace(/\D/g, '');
  if (digits.length < 10) return false;

  if (process.env.RESTRICT_DEV_RECIPIENT === 'true') {
    const allowed = (process.env.ALLOWED_DEV_PHONES || '7796308778')
      .split(',')
      .map((p) => p.trim().replace(/\D/g, ''));
    return allowed.some((p) => digits === p || digits.endsWith(p));
  }

  return true;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type WhatsAppInteractive =
  | { kind: "buttons"; body: string; buttons: Array<{ id: string; title: string }> }
  | { kind: "list"; body: string; buttonText: string; sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }> };

export async function sendWhatsAppInteractive(to: string, interactive: WhatsAppInteractive): Promise<SendMessageResult> {
  const recipient = formatWhatsAppRecipient(to);
  if (!isDevAllowedRecipient(recipient)) {
    console.log(`[Dev Guard: Simulated Interactive for invalid phone +${recipient}]`, JSON.stringify(interactive));
    return { success: true, messageId: `sim_dev_int_${Date.now()}` };
  }

  const token = DEFAULT_ACCESS_TOKEN;
  const phoneNumberId = DEFAULT_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.log(`[WhatsApp API Simulated Interactive] To: ${recipient}\n${JSON.stringify(interactive)}`);
    return { success: true, messageId: `sim_interactive_${Date.now()}` };
  }
  const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
  const payload = interactive.kind === "buttons"
    ? { type: "interactive", interactive: { type: "button", body: { text: interactive.body }, action: { buttons: interactive.buttons.map((b) => ({ type: "reply", reply: { id: b.id, title: b.title } })) } } }
    : { type: "interactive", interactive: { type: "list", body: { text: interactive.body }, action: { button: interactive.buttonText, sections: interactive.sections } } };
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: recipient, ...payload }) });
    const data = await response.json();
    if (!response.ok) return { success: false, error: data?.error?.message || "Failed to send interactive message" };
    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export interface WhatsAppLocationPayload {
  latitude: number | string;
  longitude: number | string;
  name: string;
  address: string;
}

export interface WhatsAppTemplateComponent {
  type: "header" | "body" | "button";
  sub_type?: string;
  index?: string | number;
  parameters: Array<{
    type: "text" | "currency" | "date_time" | "image" | "document" | "video";
    text?: string;
    [key: string]: any;
  }>;
}

/**
 * Sends an approved WhatsApp Template message.
 * Required by Meta to initiate outbound messages outside the 24-hour service window.
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string = "en_US",
  components?: WhatsAppTemplateComponent[]
): Promise<SendMessageResult> {
  const recipient = formatWhatsAppRecipient(to);
  if (!isDevAllowedRecipient(recipient)) {
    console.log(`[Dev Guard: Simulated Template for invalid phone +${recipient}] Template: ${templateName}`);
    return { success: true, messageId: `sim_dev_tpl_${Date.now()}` };
  }

  const token = DEFAULT_ACCESS_TOKEN;
  const phoneNumberId = DEFAULT_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log(`[WhatsApp API Simulated Template] To: ${recipient}, Template: ${templateName}`);
    return { success: true, messageId: `sim_tpl_${Date.now()}` };
  }

  const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
  try {
    const payload: Record<string, any> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    };
    if (components && components.length > 0) {
      payload.template.components = components;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error(`[WhatsApp Template Error] HTTP ${response.status}:`, data);
      return {
        success: false,
        error: data?.error?.message || "Failed to send WhatsApp template message",
      };
    }

    const messageId = data?.messages?.[0]?.id;
    console.log(`[WhatsApp Template Success] Sent ${templateName} to ${to}. ID: ${messageId}`);
    return {
      success: true,
      messageId,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Sends a WhatsApp text message using the WhatsApp Cloud API.
 * 
 * @param to - Recipient phone number (with country code, without '+' or formatting, e.g. "919876543210")
 * @param message - Text content to send
 */
export async function sendWhatsAppMessage(to: string, message: string): Promise<SendMessageResult> {
  const recipient = formatWhatsAppRecipient(to);
  if (!isDevAllowedRecipient(recipient)) {
    console.log(`[Dev Guard: Simulated Outgoing Text for invalid phone +${recipient}]\nMessage: ${message}`);
    return {
      success: true,
      messageId: `sim_dev_msg_${Date.now()}`,
    };
  }

  const token = DEFAULT_ACCESS_TOKEN;
  const phoneNumberId = DEFAULT_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn(
      `[WhatsApp API] Message to ${recipient} was simulated because WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured.`
    );
    console.log(`[WhatsApp API Simulated Outgoing Text] To: ${recipient}\nMessage:\n${message}\n`);
    return {
      success: true,
      messageId: `sim_${Date.now()}`,
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
        to: recipient,
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

/**
 * Sends a native WhatsApp location pin message using the WhatsApp Cloud API.
 */
export async function sendWhatsAppLocation(
  to: string,
  location: WhatsAppLocationPayload
): Promise<SendMessageResult> {
  if (!isDevAllowedRecipient(to)) {
    console.log(
      `[Dev Guard: Simulated Outgoing Location for invalid phone +${to}]\nName: ${location.name}\nAddress: ${location.address}`
    );
    return {
      success: true,
      messageId: `sim_dev_loc_${Date.now()}`,
    };
  }

  const token = DEFAULT_ACCESS_TOKEN;
  const phoneNumberId = DEFAULT_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log(
      `[WhatsApp API Simulated Outgoing Location] To: ${to}\nName: ${location.name}\nAddress: ${location.address}\nLat: ${location.latitude}, Lon: ${location.longitude}\n`
    );
    return {
      success: true,
      messageId: `sim_loc_${Date.now()}`,
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
        type: 'location',
        location: {
          latitude: String(location.latitude),
          longitude: String(location.longitude),
          name: location.name,
          address: location.address,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[WhatsApp Location API Error] HTTP ${response.status}:`, data);
      return {
        success: false,
        error: data?.error?.message || 'Failed to send WhatsApp location',
      };
    }

    const messageId = data?.messages?.[0]?.id;
    return {
      success: true,
      messageId,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Upload binary media (Image, Document/PDF) directly to Meta WhatsApp Cloud API.
 * Returns the Meta media ID which can be sent to patients without needing a public file hosting server.
 */
export async function uploadWhatsAppMedia(
  fileBuffer: Buffer,
  mimeType: string,
  filename: string
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  const token = DEFAULT_ACCESS_TOKEN;
  const phoneNumberId = DEFAULT_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return { success: false, error: 'WhatsApp credentials not configured' };
  }

  try {
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', blob, filename);
    formData.append('type', mimeType);

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/media`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const data = await response.json();
    if (!response.ok || !data?.id) {
      console.error('[Meta Media Upload Error]', data);
      return {
        success: false,
        error: data?.error?.message || 'Failed to upload media to Meta Cloud API',
      };
    }

    console.log(`[Meta Media Upload Success] Media ID: ${data.id} for ${filename}`);
    return {
      success: true,
      mediaId: data.id,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/**
 * Sends an image via WhatsApp Cloud API (supports either Meta mediaId or public link).
 */
export async function sendWhatsAppImage(
  to: string,
  imageSource: { id?: string; link?: string },
  caption?: string
): Promise<SendMessageResult> {
  if (!isDevAllowedRecipient(to)) {
    console.log(
      `[Dev Guard: Simulated Outgoing Image for invalid phone +${to}]\nCaption: ${caption}`
    );
    return { success: true, messageId: `sim_dev_img_${Date.now()}` };
  }

  const token = DEFAULT_ACCESS_TOKEN;
  const phoneNumberId = DEFAULT_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log(`[WhatsApp API Simulated Outgoing Image] To: ${to}\nCaption: ${caption}`);
    return { success: true, messageId: `sim_img_${Date.now()}` };
  }

  const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
  try {
    const imagePayload: Record<string, any> = {};
    if (imageSource.id) {
      imagePayload.id = imageSource.id;
    } else if (imageSource.link) {
      imagePayload.link = imageSource.link;
    }
    if (caption) {
      imagePayload.caption = caption;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'image',
        image: imagePayload,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[Meta Send Image Error]', data);
      return {
        success: false,
        error: data?.error?.message || 'Failed to send image',
      };
    }

    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sends a document / PDF using WhatsApp Cloud API (supports either Meta mediaId or public link).
 */
export async function sendWhatsAppDocument(
  to: string,
  documentSource: { id?: string; link?: string } | string,
  filename: string,
  caption?: string
): Promise<SendMessageResult> {
  if (!isDevAllowedRecipient(to)) {
    console.log(
      `[Dev Guard: Simulated Outgoing Document for invalid phone +${to}]\nFile: ${filename}`
    );
    return {
      success: true,
      messageId: `sim_dev_doc_${Date.now()}`,
    };
  }

  const token = DEFAULT_ACCESS_TOKEN;
  const phoneNumberId = DEFAULT_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log(
      `[WhatsApp API Simulated Outgoing Document] To: ${to}\nFile: ${filename}\nCaption: ${caption}\n`
    );
    return {
      success: true,
      messageId: `sim_doc_${Date.now()}`,
    };
  }

  const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  try {
    const documentPayload: Record<string, any> = {
      filename: filename,
      caption: caption || filename,
    };

    if (typeof documentSource === 'string') {
      if (documentSource.startsWith('http')) {
        documentPayload.link = documentSource;
      } else {
        documentPayload.id = documentSource;
      }
    } else {
      if (documentSource.id) {
        documentPayload.id = documentSource.id;
      } else if (documentSource.link) {
        documentPayload.link = documentSource.link;
      }
    }

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
        type: 'document',
        document: documentPayload,
      }),
    });

    const data = await response.json();
    return {
      success: response.ok,
      messageId: data?.messages?.[0]?.id,
      error: data?.error?.message,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch all message templates from Meta WhatsApp Business Account (WABA).
 */
export async function getWhatsAppTemplates(): Promise<{
  success: boolean;
  templates?: any[];
  error?: string;
}> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "479847545221049";

  if (!token) {
    return { success: false, error: "WHATSAPP_ACCESS_TOKEN not configured" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/message_templates?limit=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data?.error?.message || "Failed to fetch WhatsApp templates",
      };
    }
    return {
      success: true,
      templates: data.data || [],
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Submit a new template to Meta WhatsApp Cloud API for review.
 */
export async function createWhatsAppTemplate(params: {
  name: string;
  category: "UTILITY" | "MARKETING";
  language?: string;
  headerText?: string;
  bodyText: string;
  sampleValues?: string[];
}): Promise<{
  success: boolean;
  templateId?: string;
  status?: string;
  error?: string;
}> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "479847545221049";

  if (!token) {
    return { success: false, error: "WHATSAPP_ACCESS_TOKEN not configured" };
  }

  const cleanName = params.name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 512);

  const components: any[] = [];

  if (params.headerText) {
    components.push({
      type: "HEADER",
      format: "TEXT",
      text: params.headerText,
    });
  }

  let processedBody = params.bodyText.trim();
  // Meta Rule: Variables cannot be at the very start or very end of the template body
  if (/^\{\{\d+\}\}/.test(processedBody)) {
    processedBody = 'Dear ' + processedBody;
  }
  if (/\{\{\d+\}\}[.!?]?\s*$/.test(processedBody)) {
    processedBody = processedBody + ' Thank you for choosing Svaasth Hospital.';
  }

  // Count variables {{1}}, {{2}}, etc.
  const variableMatches = processedBody.match(/\{\{(\d+)\}\}/g) || [];
  const varCount = variableMatches.length;

  const bodyComponent: any = {
    type: "BODY",
    text: processedBody,
  };

  if (varCount > 0) {
    const defaultSamples = [
      'Valued Patient',
      'Dr. Vipeen Raut',
      'Tomorrow at 10:30 AM',
      'OPD Consultation',
      'Token #12',
      'Svaasth Hospital',
    ];
    const samples =
      params.sampleValues && params.sampleValues.length >= varCount
        ? params.sampleValues.slice(0, varCount)
        : Array.from(
            { length: varCount },
            (_, i) => defaultSamples[i] || `Sample ${i + 1}`
          );

    bodyComponent.example = {
      body_text: [samples],
    };
  }

  components.push(bodyComponent);

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/message_templates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          category: params.category,
          language: params.language || "en_US",
          components,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data?.error?.message || "Failed to create template on Meta",
      };
    }

    return {
      success: true,
      templateId: data.id,
      status: data.status || "PENDING",
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a template from Meta WhatsApp Cloud API by name (and optional hsm_id).
 */
export async function deleteWhatsAppTemplate(params: {
  name: string;
  hsmId?: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "479847545221049";

  if (!token) {
    return { success: false, error: "WHATSAPP_ACCESS_TOKEN not configured" };
  }

  try {
    let url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/message_templates?name=${encodeURIComponent(params.name)}`;
    if (params.hsmId) {
      url += `&hsm_id=${encodeURIComponent(params.hsmId)}`;
    }

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data?.error?.message || "Failed to delete template from Meta",
      };
    }

    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}


