import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

/**
 * GET Handler - Meta Webhook Verification
 * Meta hits this URL to verify the subscription.
 */
http.route({
  path: "/api/whatsapp/webhook",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = "scooty_ai_verify_2026";

    if (mode === "subscribe" && token === verifyToken) {
      return new Response(challenge || "", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response("Forbidden", { status: 403 });
  }),
});

/**
 * POST Handler - Inbound WhatsApp Messages & Status Updates
 * Meta posts customer messages and message delivery status here.
 * Directly synchronizes incoming customer chats into Convex chatMessages table.
 */
http.route({
  path: "/api/whatsapp/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body: any = await request.json();
      if (body.object !== "whatsapp_business_account") {
        return new Response("ignored", { status: 200 });
      }

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;

          // 1. Log delivery status updates
          if (value.statuses && Array.isArray(value.statuses)) {
            for (const status of value.statuses) {
              console.log(
                `[Convex Webhook Delivery Status] To: ${status.recipient_id} -> ${status.status} (MsgID: ${status.id})`
              );
            }
          }

          // 2. Process incoming messages from customer
          if (value.messages && Array.isArray(value.messages)) {
            for (const msg of value.messages) {
              const sender = msg.from;
              let text = "";

              if (msg.type === "text") {
                text = msg.text?.body || "";
              } else if (msg.type === "interactive") {
                text =
                  msg.interactive?.button_reply?.title ||
                  msg.interactive?.list_reply?.title ||
                  msg.interactive?.button_reply?.id ||
                  "";
              } else if (msg.type === "button") {
                text = msg.button?.text || msg.button?.payload || "";
              }

              if (sender && text) {
                console.log(`[Convex Webhook Inbound Message] From: +${sender} -> "${text}"`);

                await ctx.runMutation(api.sessions.logChatMessage, {
                  phoneNumber: sender,
                  sender: "patient",
                  text,
                  type: msg.type || "text",
                });
              }
            }
          }
        }
      }

      return new Response("EVENT_RECEIVED", { status: 200 });
    } catch (err) {
      console.error("[Convex HTTP Webhook Error]", err);
      return new Response("OK", { status: 200 });
    }
  }),
});

export default http;
