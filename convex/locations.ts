import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listActiveLocations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("locations")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

export const listLocationsWithVehicles = query({
  args: {},
  handler: async (ctx) => {
    const locations = await ctx.db
      .query("locations")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return await Promise.all(
      locations.map(async (loc) => {
        const vehicles = await ctx.db
          .query("vehicles")
          .withIndex("by_location_and_status", (q) =>
            q.eq("locationId", loc._id).eq("status", "available")
          )
          .collect();

        return {
          id: loc._id,
          name: loc.name,
          address: loc.address,
          latitude: loc.latitude,
          longitude: loc.longitude,
          availableCount: vehicles.length,
          vehicles: vehicles.map((v) => v.name),
        };
      })
    );
  },
});

export const getLocation = query({
  args: { locationId: v.id("locations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.locationId);
  },
});

export const createLocation = mutation({
  args: {
    name: v.string(),
    city: v.string(),
    address: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    phone: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("locations", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateLocation = mutation({
  args: {
    id: v.id("locations"),
    name: v.optional(v.string()),
    city: v.optional(v.string()),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    phone: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});
