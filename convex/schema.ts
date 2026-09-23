import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  locations: defineTable({
    name: v.string(),
    city: v.string(),
    address: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    phone: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_name", ["name"]),

  vehicles: defineTable({
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_locationId", ["locationId"])
    .index("by_status", ["status"])
    .index("by_location_and_status", ["locationId", "status"]),

  customers: defineTable({
    name: v.string(),
    phoneNumber: v.string(),
    whatsappNumber: v.string(),
    email: v.optional(v.string()),
    totalBookings: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_phoneNumber", ["phoneNumber"]),

  bookings: defineTable({
    bookingId: v.string(),
    customerId: v.id("customers"),
    vehicleId: v.id("vehicles"),
    pickupLocationId: v.id("locations"),
    returnLocationId: v.id("locations"),
    startDate: v.string(),
    pickupTime: v.string(),
    returnDate: v.string(),
    returnTime: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    totalAmount: v.number(),
    paymentStatus: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("refunded")
    ),
    customerName: v.string(),
    customerPhone: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_bookingId", ["bookingId"])
    .index("by_customerId", ["customerId"])
    .index("by_vehicleId", ["vehicleId"])
    .index("by_status", ["status"])
    .index("by_customerPhone", ["customerPhone"]),

  whatsappSessions: defineTable({
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
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_phoneNumber", ["phoneNumber"]),
});
