import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getCustomerByPhone = query({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
  },
});

export const getOrCreateCustomer = mutation({
  args: {
    phoneNumber: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    const now = Date.now();

    if (existing) {
      if (args.name && args.name.trim() && existing.name !== args.name.trim()) {
        await ctx.db.patch(existing._id, {
          name: args.name.trim(),
          updatedAt: now,
        });
        return await ctx.db.get(existing._id);
      }
      return existing;
    }

    const customerId = await ctx.db.insert("customers", {
      name: args.name.trim(),
      phoneNumber: args.phoneNumber,
      whatsappNumber: args.phoneNumber,
      email: args.email,
      totalBookings: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(customerId);
  },
});

export const updateCustomer = mutation({
  args: {
    customerId: v.id("customers"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const { customerId, ...updates } = args;
    await ctx.db.patch(customerId, {
      ...updates,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(customerId);
  },
});
