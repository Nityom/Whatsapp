import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getWhatsAppSession = query({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
  },
});

export const saveWhatsAppSession = mutation({
  args: {
    phoneNumber: v.string(),
    currentStep: v.string(),
    language: v.optional(v.string()),
    patientId: v.optional(v.string()),
    patientReference: v.optional(v.string()),
    patientName: v.optional(v.string()),
    isVerified: v.optional(v.boolean()),
    verificationOtp: v.optional(v.string()),
    otpExpiresAt: v.optional(v.number()),
    pendingAction: v.optional(v.string()),
    isHandedOver: v.optional(v.boolean()),
    handoverReason: v.optional(v.string()),
    handoverTimestamp: v.optional(v.number()),
    bookingDraft: v.optional(
      v.object({
        doctorName: v.optional(v.string()),
        specialty: v.optional(v.string()),
        date: v.optional(v.string()),
        slot: v.optional(v.string()),
        patientName: v.optional(v.string()),
        patientAge: v.optional(v.string()),
        patientPhone: v.optional(v.string()),
        patientAddress: v.optional(v.string()),
        complaint: v.optional(v.string()),
        startDate: v.optional(v.string()),
        pickupTime: v.optional(v.string()),
        returnDate: v.optional(v.string()),
        returnTime: v.optional(v.string()),
        customerName: v.optional(v.string()),
        customerLatitude: v.optional(v.number()),
        customerLongitude: v.optional(v.number()),
        distanceKm: v.optional(v.number()),
        locationName: v.optional(v.string()),
        locationAddress: v.optional(v.string()),
        vehicleName: v.optional(v.string()),
        vehiclePrice: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    const now = Date.now();

    if (existing) {
      const mergedDraft = args.bookingDraft
        ? { ...(existing.bookingDraft || {}), ...args.bookingDraft }
        : existing.bookingDraft;

      await ctx.db.patch(existing._id, {
        currentStep: args.currentStep,
        language: args.language ?? existing.language,
        patientId: args.patientId ?? existing.patientId,
        patientReference: args.patientReference ?? existing.patientReference,
        patientName: args.patientName ?? existing.patientName,
        isVerified: args.isVerified ?? existing.isVerified,
        verificationOtp: args.verificationOtp ?? existing.verificationOtp,
        otpExpiresAt: args.otpExpiresAt ?? existing.otpExpiresAt,
        pendingAction: args.pendingAction ?? existing.pendingAction,
        isHandedOver: args.isHandedOver ?? existing.isHandedOver,
        handoverReason: args.handoverReason ?? existing.handoverReason,
        handoverTimestamp: args.handoverTimestamp ?? existing.handoverTimestamp,
        bookingDraft: mergedDraft,
        updatedAt: now,
      });

      return await ctx.db.get(existing._id);
    }

    const newId = await ctx.db.insert("whatsappSessions", {
      phoneNumber: args.phoneNumber,
      currentStep: args.currentStep,
      language: args.language,
      patientId: args.patientId,
      patientReference: args.patientReference,
      patientName: args.patientName,
      isVerified: args.isVerified ?? false,
      verificationOtp: args.verificationOtp,
      otpExpiresAt: args.otpExpiresAt,
      pendingAction: args.pendingAction,
      isHandedOver: args.isHandedOver ?? false,
      handoverReason: args.handoverReason,
      handoverTimestamp: args.handoverTimestamp,
      bookingDraft: args.bookingDraft,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(newId);
  },
});

export const clearWhatsAppSession = mutation({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        currentStep: "IDLE",
        isVerified: false,
        bookingDraft: undefined,
        pendingAction: undefined,
        verificationOtp: undefined,
        otpExpiresAt: undefined,
        isHandedOver: false,
        handoverReason: undefined,
        handoverTimestamp: undefined,
        updatedAt: now,
      });
      return await ctx.db.get(existing._id);
    }

    const newId = await ctx.db.insert("whatsappSessions", {
      phoneNumber: args.phoneNumber,
      currentStep: "IDLE",
      isVerified: false,
      isHandedOver: false,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(newId);
  },
});

export const setHandover = mutation({
  args: {
    phoneNumber: v.string(),
    isHandedOver: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isHandedOver: args.isHandedOver,
        handoverReason: args.reason,
        handoverTimestamp: args.isHandedOver ? now : undefined,
        currentStep: args.isHandedOver ? "HANDED_OVER" : "IDLE",
        updatedAt: now,
      });
      return await ctx.db.get(existing._id);
    }

    const newId = await ctx.db.insert("whatsappSessions", {
      phoneNumber: args.phoneNumber,
      currentStep: args.isHandedOver ? "HANDED_OVER" : "IDLE",
      isHandedOver: args.isHandedOver,
      handoverReason: args.reason,
      handoverTimestamp: args.isHandedOver ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(newId);
  },
});

export const logChatMessage = mutation({
  args: {
    phoneNumber: v.string(),
    sender: v.union(v.literal("patient"), v.literal("assistant"), v.literal("staff")),
    text: v.string(),
    type: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("chatMessages", {
      phoneNumber: args.phoneNumber,
      sender: args.sender,
      text: args.text,
      type: args.type || "text",
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});
