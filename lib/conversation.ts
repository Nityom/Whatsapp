/**
 * Cortex Hospital WhatsApp Assistant – Conversation Manager
 * Persistent state machine backed by Convex Database
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { handleConversationTurn, AgentContext, AgentResponse } from "./cortexAgent";
import { WhatsAppLocationPayload, WhatsAppInteractive } from "./whatsapp";

const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://quaint-hound-638.convex.cloud";

export function getConvexClient(): ConvexHttpClient {
  return new ConvexHttpClient(CONVEX_URL);
}

export interface IncomingMessageInput {
  phoneNumber: string;
  type: "text" | "location" | string;
  text?: string;
  latitude?: number;
  longitude?: number;
}

export interface ProcessMessageResult {
  text: string;
  nativeLocation?: WhatsAppLocationPayload;
  interactive?: WhatsAppInteractive;
  session?: any;
}

/**
 * Core state machine processor for incoming WhatsApp messages
 */
export async function processIncomingMessage(
  input: IncomingMessageInput
): Promise<ProcessMessageResult> {
  const convex = getConvexClient();
  const phone = input.phoneNumber.replace(/\D/g, "");

  // 1. Fetch current session from Convex
  let sessionDoc: any = null;
  try {
    sessionDoc = await convex.query(api.sessions.getWhatsAppSession, {
      phoneNumber: phone,
    });
  } catch (err) {
    console.error("[Session Load Error]", err);
  }

  // 2. Build AgentContext
  const context: AgentContext = {
    phoneNumber: phone,
    currentStep: sessionDoc?.currentStep || "WELCOME",
    language: sessionDoc?.language,
    patientId: sessionDoc?.patientId,
    patientReference: sessionDoc?.patientReference,
    patientName: sessionDoc?.patientName,
    isVerified: sessionDoc?.isVerified ?? false,
    verificationOtp: sessionDoc?.verificationOtp,
    otpExpiresAt: sessionDoc?.otpExpiresAt,
    pendingAction: sessionDoc?.pendingAction,
    isHandedOver: sessionDoc?.isHandedOver ?? false,
    handoverReason: sessionDoc?.handoverReason,
    lastBookedDoctor: sessionDoc?.lastBookedDoctor,
    lastBookedDate: sessionDoc?.lastBookedDate,
    bookingDraft: sessionDoc?.bookingDraft,
  };

  // 3. Log incoming patient message
  try {
    await convex.mutation(api.sessions.logChatMessage, {
      phoneNumber: phone,
      sender: "patient",
      text: input.text || (input.type === "location" ? "Sent Location Pin" : "Message"),
      type: input.type,
      metadata: input.latitude ? { lat: input.latitude, lng: input.longitude } : undefined,
    });
  } catch (err) {
    console.warn("[Chat Log Warning]", err);
  }

  // 4. Run conversation turn through Cortex AI Agent
  const agentResponse: AgentResponse = await handleConversationTurn(
    {
      phoneNumber: phone,
      text: input.text,
      type: input.type,
      latitude: input.latitude,
      longitude: input.longitude,
    },
    context
  );

  // 5. Update and persist session in Convex
  const nextStep = agentResponse.nextStep ?? context.currentStep;
  const updatedContext = {
    ...context,
    currentStep: nextStep,
    ...(agentResponse.updatedContext || {}),
  };

  let savedSession: any = null;
  try {
    savedSession = await convex.mutation(api.sessions.saveWhatsAppSession, {
      phoneNumber: phone,
      currentStep: nextStep,
      language: updatedContext.language,
      patientId: updatedContext.patientId,
      patientReference: updatedContext.patientReference,
      patientName: updatedContext.patientName,
      isVerified: updatedContext.isVerified,
      verificationOtp: updatedContext.verificationOtp,
      otpExpiresAt: updatedContext.otpExpiresAt,
      pendingAction: updatedContext.pendingAction,
      isHandedOver: updatedContext.isHandedOver,
      handoverReason: updatedContext.handoverReason,
      lastBookedDoctor: updatedContext.lastBookedDoctor,
      lastBookedDate: updatedContext.lastBookedDate,
      bookingDraft: updatedContext.bookingDraft,
    });
  } catch (err) {
    console.error("[Session Save Error]", err);
  }

  // 6. Log outgoing assistant message (only if agent produced non-empty text)
  if (agentResponse.text && agentResponse.text.trim().length > 0) {
    try {
      await convex.mutation(api.sessions.logChatMessage, {
        phoneNumber: phone,
        sender: "assistant",
        text: agentResponse.text,
        type: agentResponse.nativeLocation ? "location_reply" : "text",
      });
    } catch (err) {
      console.warn("[Chat Log Warning]", err);
    }
  }

  return {
    text: agentResponse.text,
    nativeLocation: agentResponse.nativeLocation,
    interactive: agentResponse.interactive,
    session: savedSession || updatedContext,
  };
}
