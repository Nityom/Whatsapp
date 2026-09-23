import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAvailableVehicles = query({
  args: {},
  handler: async (ctx) => {
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .collect();

    // Attach location details for convenience
    const vehiclesWithLocations = await Promise.all(
      vehicles.map(async (v) => {
        const location = await ctx.db.get(v.locationId);
        return {
          ...v,
          locationName: location?.name || "Unknown",
          locationAddress: location?.address || "",
        };
      })
    );

    return vehiclesWithLocations;
  },
});

export const listVehiclesByLocation = query({
  args: {
    locationId: v.id("locations"),
    onlyAvailable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const onlyAvailable = args.onlyAvailable ?? true;
    if (onlyAvailable) {
      return await ctx.db
        .query("vehicles")
        .withIndex("by_location_and_status", (q) =>
          q.eq("locationId", args.locationId).eq("status", "available")
        )
        .collect();
    }
    return await ctx.db
      .query("vehicles")
      .withIndex("by_locationId", (q) => q.eq("locationId", args.locationId))
      .collect();
  },
});

export const getVehicle = query({
  args: { vehicleId: v.id("vehicles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.vehicleId);
  },
});

export const createVehicle = mutation({
  args: {
    name: v.string(),
    brand: v.string(),
    model: v.string(),
    type: v.union(v.literal("scooter"), v.literal("bike")),
    registrationNumber: v.string(),
    pricePerDay: v.number(),
    pricePerHour: v.number(),
    locationId: v.id("locations"),
    status: v.union(
      v.literal("available"),
      v.literal("booked"),
      v.literal("maintenance"),
      v.literal("inactive")
    ),
    imageUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("vehicles", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateVehicle = mutation({
  args: {
    id: v.id("vehicles"),
    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    model: v.optional(v.string()),
    type: v.optional(v.union(v.literal("scooter"), v.literal("bike"))),
    registrationNumber: v.optional(v.string()),
    pricePerDay: v.optional(v.number()),
    pricePerHour: v.optional(v.number()),
    locationId: v.optional(v.id("locations")),
    status: v.optional(
      v.union(
        v.literal("available"),
        v.literal("booked"),
        v.literal("maintenance"),
        v.literal("inactive")
      )
    ),
    imageUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
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

export const updateVehicleStatus = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    status: v.union(
      v.literal("available"),
      v.literal("booked"),
      v.literal("maintenance"),
      v.literal("inactive")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.vehicleId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(args.vehicleId);
  },
});
