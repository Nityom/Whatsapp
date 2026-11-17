import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * P0-1: Log an audit event for system lifecycle, appointment, consent or webhook activity
 */
export const logAuditEvent = mutation({
  args: {
    eventType: v.string(),
    phoneNumber: v.string(),
    patientName: v.optional(v.string()),
    details: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("auditLogs", {
      eventType: args.eventType,
      phoneNumber: args.phoneNumber,
      patientName: args.patientName,
      details: args.details,
      metadata: args.metadata,
      timestamp: now,
    });
  },
});

/**
 * List audit logs with pagination / filter
 */
export const listAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
    eventType: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    if (args.phoneNumber) {
      return await ctx.db
        .query("auditLogs")
        .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber!))
        .order("desc")
        .take(limit);
    }
    if (args.eventType) {
      return await ctx.db
        .query("auditLogs")
        .withIndex("by_event", (q) => q.eq("eventType", args.eventType!))
        .order("desc")
        .take(limit);
    }
    return await ctx.db.query("auditLogs").order("desc").take(limit);
  },
});
