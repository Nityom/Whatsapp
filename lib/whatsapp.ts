/**
 * WhatsApp Cloud API Client
 * Used to send text, documents/PDFs, and native location messages
 * via the official WhatsApp Business Cloud API.
 */

const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v21.0';

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type WhatsAppInteractive =
  | { kind: "buttons"; body: string; buttons: Array<{ id: string; title: string }> }
  | { kind: "list"; body: string; buttonText: string; sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }> };

export async function sendWhatsAppInteractive(to: string, interactive: WhatsAppInteractive): Promise<SendMessageResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.log(`[WhatsApp API Simulated Interactive] To: ${to}\n${JSON.stringify(interactive)}`);
    return { success: true, messageId: `sim_interactive_${Date.now()}` };
  }
  const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
  const payload = interactive.kind === "buttons"
    ? { type: "interactive", interactive: { type: "button", body: { text: interactive.body }, action: { buttons: interactive.buttons.map((b) => ({ type: "reply", reply: { id: b.id, title: b.title } })) } } }
    : { type: "interactive", interactive: { type: "list", body: { text: interactive.body }, action: { button: interactive.buttonText, sections: interactive.sections } } };
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, ...payload }) });
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
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log(`[WhatsApp API Simulated Template] To: ${to}, Template: ${templateName}`);
    return { success: true, messageId: `sim_tpl_${Date.now()}` };
  }

  const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
  try {
    const payload: Record<string, any> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
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
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn(
      `[WhatsApp API] Message to ${to} was simulated because WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured.`
    );
    console.log(`[WhatsApp API Simulated Outgoing Text] To: ${to}\nMessage:\n${message}\n`);
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

/**
 * Sends a native WhatsApp location pin message using the WhatsApp Cloud API.
 */
export async function sendWhatsAppLocation(
  to: string,
  location: WhatsAppLocationPayload
): Promise<SendMessageResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

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
 * Sends a document / PDF using WhatsApp Cloud API
 */
export async function sendWhatsAppDocument(
  to: string,
  documentUrl: string,
  filename: string,
  caption?: string
): Promise<SendMessageResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log(
      `[WhatsApp API Simulated Outgoing Document] To: ${to}\nFile: ${filename}\nLink: ${documentUrl}\nCaption: ${caption}\n`
    );
    return {
      success: true,
      messageId: `sim_doc_${Date.now()}`,
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
        type: 'document',
        document: {
          link: documentUrl,
          caption: caption || filename,
          filename: filename,
        },
      }),
    });

    const data = await response.json();
    return {
      success: response.ok,
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

  // Count variables {{1}}, {{2}}, etc.
  const variableMatches = params.bodyText.match(/\{\{(\d+)\}\}/g) || [];
  const varCount = variableMatches.length;

  const bodyComponent: any = {
    type: "BODY",
    text: params.bodyText,
  };

  if (varCount > 0) {
    const samples = params.sampleValues && params.sampleValues.length >= varCount
      ? params.sampleValues.slice(0, varCount)
      : Array.from({ length: varCount }, (_, i) => `Sample ${i + 1}`);

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

