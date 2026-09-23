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
    customerId: v.optional(v.id("customers")),
    currentStep: v.string(),
    selectedVehicleId: v.optional(v.id("vehicles")),
    pickupLocationId: v.optional(v.id("locations")),
    bookingDraft: v.optional(
      v.object({
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
      // Merge draft if both exist
      const mergedDraft = args.bookingDraft
        ? { ...(existing.bookingDraft || {}), ...args.bookingDraft }
        : existing.bookingDraft;

      await ctx.db.patch(existing._id, {
        customerId: args.customerId ?? existing.customerId,
        currentStep: args.currentStep,
        selectedVehicleId: args.selectedVehicleId ?? existing.selectedVehicleId,
        pickupLocationId: args.pickupLocationId ?? existing.pickupLocationId,
        bookingDraft: mergedDraft,
        updatedAt: now,
      });

      return await ctx.db.get(existing._id);
    }

    const newId = await ctx.db.insert("whatsappSessions", {
      phoneNumber: args.phoneNumber,
      customerId: args.customerId,
      currentStep: args.currentStep,
      selectedVehicleId: args.selectedVehicleId,
      pickupLocationId: args.pickupLocationId,
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
        currentStep: "WELCOME",
        selectedVehicleId: undefined,
        pickupLocationId: undefined,
        bookingDraft: undefined,
        updatedAt: now,
      });
      return await ctx.db.get(existing._id);
    }

    const newId = await ctx.db.insert("whatsappSessions", {
      phoneNumber: args.phoneNumber,
      currentStep: "WELCOME",
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(newId);
  },
});
