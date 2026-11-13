import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/** Get all sessions (for dashboard overview) */
export const getAllSessions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("whatsappSessions")
      .order("desc")
      .collect();
  },
});

/** Get messages for a specific phone number */
export const getMessagesByPhone = query({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .order("asc")
      .collect();
  },
});

/** Get all messages (for broadcast / global view) */
export const getAllMessages = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200;
    return await ctx.db
      .query("chatMessages")
      .order("desc")
      .take(limit);
  },
});

/** Get dashboard stats */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allSessions = await ctx.db.query("whatsappSessions").collect();
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const activeSessions = allSessions.filter(
      (s) => s.currentStep !== "WELCOME" && s.updatedAt > oneDayAgo
    ).length;

    const handedOver = allSessions.filter((s) => s.isHandedOver === true).length;

    const recentMessages = await ctx.db
      .query("chatMessages")
      .order("desc")
      .take(500);

    const messagesToday = recentMessages.filter(
      (m) => m.createdAt > oneDayAgo
    ).length;

    const uniquePhones = new Set(allSessions.map((s) => s.phoneNumber));

    return {
      totalUsers: uniquePhones.size,
      activeSessions,
      handedOver,
      messagesToday,
      totalSessions: allSessions.length,
    };
  },
});

/** Save a staff message (sent from dashboard) */
export const saveStaffMessage = mutation({
  args: {
    phoneNumber: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("chatMessages", {
      phoneNumber: args.phoneNumber,
      sender: "staff",
      text: args.text,
      type: "text",
      createdAt: Date.now(),
    });
  },
});

