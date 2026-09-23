import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getBooking = query({
  args: { bookingId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookings")
      .withIndex("by_bookingId", (q) => q.eq("bookingId", args.bookingId))
      .first();
  },
});

export const getBookingsByCustomer = query({
  args: { customerPhone: v.string() },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_customerPhone", (q) => q.eq("customerPhone", args.customerPhone))
      .order("desc")
      .take(10);

    // Enrich with vehicle and location details
    return await Promise.all(
      bookings.map(async (b) => {
        const vehicle = await ctx.db.get(b.vehicleId);
        const pickupLoc = await ctx.db.get(b.pickupLocationId);
        return {
          ...b,
          vehicleName: vehicle ? `${vehicle.brand} ${vehicle.model}` : "Scooty",
          locationName: pickupLoc?.name || "Pune",
          locationAddress: pickupLoc?.address || "",
        };
      })
    );
  },
});

export const createBooking = mutation({
  args: {
    customerId: v.id("customers"),
    vehicleId: v.id("vehicles"),
    pickupLocationId: v.id("locations"),
    returnLocationId: v.id("locations"),
    startDate: v.string(),
    pickupTime: v.string(),
    returnDate: v.string(),
    returnTime: v.string(),
    totalAmount: v.number(),
    customerName: v.string(),
    customerPhone: v.string(),
    notes: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("confirmed"),
        v.literal("active"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
    paymentStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("paid"),
        v.literal("refunded")
      )
    ),
    customBookingId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Generate realistic SG-2026-XXXX booking ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingId = args.customBookingId || `SG-2026-${randomSuffix}`;

    const newBookingId = await ctx.db.insert("bookings", {
      bookingId,
      customerId: args.customerId,
      vehicleId: args.vehicleId,
      pickupLocationId: args.pickupLocationId,
      returnLocationId: args.returnLocationId,
      startDate: args.startDate,
      pickupTime: args.pickupTime,
      returnDate: args.returnDate,
      returnTime: args.returnTime,
      status: args.status || "confirmed",
      totalAmount: args.totalAmount,
      paymentStatus: args.paymentStatus || "pending",
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // Increment customer booking count
    const customer = await ctx.db.get(args.customerId);
    if (customer) {
      await ctx.db.patch(args.customerId, {
        totalBookings: (customer.totalBookings || 0) + 1,
        updatedAt: now,
      });
    }

    return await ctx.db.get(newBookingId);
  },
});

export const updateBookingStatus = mutation({
  args: {
    bookingId: v.id("bookings"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    paymentStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("paid"),
        v.literal("refunded")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { bookingId, ...updates } = args;
    await ctx.db.patch(bookingId, {
      ...updates,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(bookingId);
  },
});
