import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const seedAllData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // 1. Seed Locations
    const demoLocations = [
      {
        name: "Baner",
        city: "Pune",
        address: "Baner Road, Pune, Maharashtra",
        latitude: 18.5590,
        longitude: 73.7868,
        phone: "+91 90000 00000",
        status: "active" as const,
      },
      {
        name: "Aundh",
        city: "Pune",
        address: "Aundh Road, Pune, Maharashtra",
        latitude: 18.5595,
        longitude: 73.8077,
        phone: "+91 90000 00000",
        status: "active" as const,
      },
      {
        name: "Wakad",
        city: "Pune",
        address: "Wakad, Pune, Maharashtra",
        latitude: 18.5975,
        longitude: 73.7898,
        phone: "+91 90000 00000",
        status: "active" as const,
      },
      {
        name: "Kothrud",
        city: "Pune",
        address: "Kothrud, Pune, Maharashtra",
        latitude: 18.5074,
        longitude: 73.8077,
        phone: "+91 90000 00000",
        status: "active" as const,
      },
      {
        name: "Hinjawadi",
        city: "Pune",
        address: "Hinjawadi, Pune, Maharashtra",
        latitude: 18.5912,
        longitude: 73.7389,
        phone: "+91 90000 00000",
        status: "active" as const,
      },
      {
        name: "Viman Nagar",
        city: "Pune",
        address: "Viman Nagar, Pune, Maharashtra",
        latitude: 18.5679,
        longitude: 73.9143,
        phone: "+91 90000 00000",
        status: "active" as const,
      },
      {
        name: "Koregaon Park",
        city: "Pune",
        address: "Koregaon Park, Pune, Maharashtra",
        latitude: 18.5362,
        longitude: 73.8958,
        phone: "+91 90000 00000",
        status: "active" as const,
      },
      {
        name: "Shivajinagar",
        city: "Pune",
        address: "Shivajinagar, Pune, Maharashtra",
        latitude: 18.5308,
        longitude: 73.8475,
        phone: "+91 90000 00000",
        status: "active" as const,
      },
    ];

    const locationIdMap = new Map<string, Id<"locations">>();

    for (const loc of demoLocations) {
      const existing = await ctx.db
        .query("locations")
        .withIndex("by_name", (q) => q.eq("name", loc.name))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { ...loc, updatedAt: now });
        locationIdMap.set(loc.name, existing._id);
      } else {
        const id = await ctx.db.insert("locations", {
          ...loc,
          createdAt: now,
          updatedAt: now,
        });
        locationIdMap.set(loc.name, id);
      }
    }

    // 2. Seed Customers
    const demoCustomers = [
      {
        name: "Nityom Tikhe",
        phoneNumber: "919876543210",
        whatsappNumber: "919876543210",
        email: "nityom@example.com",
        totalBookings: 1,
        status: "active" as const,
      },
      {
        name: "Rahul Sharma",
        phoneNumber: "919812345678",
        whatsappNumber: "919812345678",
        email: "rahul@example.com",
        totalBookings: 1,
        status: "active" as const,
      },
      {
        name: "Amit Patil",
        phoneNumber: "919876543211",
        whatsappNumber: "919876543211",
        email: "amit@example.com",
        totalBookings: 1,
        status: "active" as const,
      },
      {
        name: "Priya Deshmukh",
        phoneNumber: "919812345679",
        whatsappNumber: "919812345679",
        email: "priya@example.com",
        totalBookings: 1,
        status: "active" as const,
      },
      {
        name: "Sneha Kulkarni",
        phoneNumber: "919876543212",
        whatsappNumber: "919876543212",
        email: "sneha@example.com",
        totalBookings: 1,
        status: "active" as const,
      },
    ];

    const customerIdMap = new Map<string, Id<"customers">>();

    for (const cust of demoCustomers) {
      const existing = await ctx.db
        .query("customers")
        .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", cust.phoneNumber))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { ...cust, updatedAt: now });
        customerIdMap.set(cust.phoneNumber, existing._id);
      } else {
        const id = await ctx.db.insert("customers", {
          ...cust,
          createdAt: now,
          updatedAt: now,
        });
        customerIdMap.set(cust.phoneNumber, id);
      }
    }

    // 3. Seed 12 Vehicles
    const demoVehicles = [
      {
        name: "Honda Activa 6G",
        brand: "Honda",
        model: "Activa 6G",
        type: "scooter" as const,
        registrationNumber: "MH12AB1234",
        pricePerDay: 500,
        pricePerHour: 100,
        locationName: "Baner",
        status: "available" as const,
        description: "Reliable automatic scooter for city travel.",
        features: ["Automatic", "Petrol", "2 Seater", "Helmet Available"],
      },
      {
        name: "Honda Activa 125",
        brand: "Honda",
        model: "Activa 125",
        type: "scooter" as const,
        registrationNumber: "MH12CD5678",
        pricePerDay: 600,
        pricePerHour: 120,
        locationName: "Aundh",
        status: "available" as const,
        description: "Comfortable 125cc scooter with digital meter.",
        features: ["Automatic", "Petrol", "2 Seater", "Helmet Available"],
      },
      {
        name: "TVS Jupiter",
        brand: "TVS",
        model: "Jupiter",
        type: "scooter" as const,
        registrationNumber: "MH14EF9012",
        pricePerDay: 550,
        pricePerHour: 110,
        locationName: "Wakad",
        status: "available" as const,
        description: "Great mileage and comfortable suspension.",
        features: ["Automatic", "Petrol", "2 Seater", "Helmet Available"],
      },
      {
        name: "Suzuki Access 125",
        brand: "Suzuki",
        model: "Access 125",
        type: "scooter" as const,
        registrationNumber: "MH12GH3456",
        pricePerDay: 600,
        pricePerHour: 120,
        locationName: "Kothrud",
        status: "booked" as const,
        description: "Smooth ride with retro styling.",
        features: ["Automatic", "Petrol", "2 Seater"],
      },
      {
        name: "Yamaha RayZR 125",
        brand: "Yamaha",
        model: "RayZR 125",
        type: "scooter" as const,
        registrationNumber: "MH12JK7890",
        pricePerDay: 650,
        pricePerHour: 130,
        locationName: "Hinjawadi",
        status: "available" as const,
        description: "Sporty and lightweight street scooter.",
        features: ["Automatic", "Petrol", "Sporty Look", "Helmet Available"],
      },
      {
        name: "Royal Enfield Classic 350",
        brand: "Royal Enfield",
        model: "Classic 350",
        type: "bike" as const,
        registrationNumber: "MH12KL1122",
        pricePerDay: 1400,
        pricePerHour: 250,
        locationName: "Baner",
        status: "available" as const,
        description: "Iconic cruiser for Pune city and highway trips.",
        features: ["Manual", "Petrol", "Dual Disc", "Helmet Available"],
      },
      {
        name: "Bajaj Pulsar 150",
        brand: "Bajaj",
        model: "Pulsar 150",
        type: "bike" as const,
        registrationNumber: "MH12MN3344",
        pricePerDay: 900,
        pricePerHour: 180,
        locationName: "Aundh",
        status: "available" as const,
        description: "Dependable commuter motorcycle.",
        features: ["Manual", "Petrol", "Helmet Available"],
      },
      {
        name: "KTM Duke 200",
        brand: "KTM",
        model: "Duke 200",
        type: "bike" as const,
        registrationNumber: "MH12PQ5566",
        pricePerDay: 1500,
        pricePerHour: 300,
        locationName: "Wakad",
        status: "maintenance" as const,
        description: "High-performance street naked motorcycle.",
        features: ["Manual", "Petrol", "ABS"],
      },
      {
        name: "TVS Ntorq 125",
        brand: "TVS",
        model: "Ntorq 125",
        type: "scooter" as const,
        registrationNumber: "MH12RS7788",
        pricePerDay: 650,
        pricePerHour: 130,
        locationName: "Viman Nagar",
        status: "available" as const,
        description: "Punchy race-inspired scooter with digital connectivity.",
        features: ["Automatic", "Petrol", "Bluetooth Screen", "Helmet Available"],
      },
      {
        name: "Honda Hornet 2.0",
        brand: "Honda",
        model: "Hornet 2.0",
        type: "bike" as const,
        registrationNumber: "MH12TU9900",
        pricePerDay: 1000,
        pricePerHour: 200,
        locationName: "Koregaon Park",
        status: "available" as const,
        description: "Agile naked street motorcycle.",
        features: ["Manual", "Petrol", "Golden USD Forks", "Helmet Available"],
      },
      {
        name: "Hero Xpulse 200",
        brand: "Hero",
        model: "Xpulse 200",
        type: "bike" as const,
        registrationNumber: "MH12VW2233",
        pricePerDay: 1200,
        pricePerHour: 220,
        locationName: "Shivajinagar",
        status: "available" as const,
        description: "All-terrain dual-purpose adventure motorcycle.",
        features: ["Manual", "Petrol", "Long Travel Suspension", "Helmet Available"],
      },
      {
        name: "Honda Dio",
        brand: "Honda",
        model: "Dio",
        type: "scooter" as const,
        registrationNumber: "MH12XY4455",
        pricePerDay: 450,
        pricePerHour: 90,
        locationName: "Baner",
        status: "available" as const,
        description: "Youthful and nimble city scooter.",
        features: ["Automatic", "Petrol", "Helmet Available"],
      },
    ];

    const vehicleIdMap = new Map<string, Id<"vehicles">>();

    for (const v of demoVehicles) {
      const locationId = locationIdMap.get(v.locationName);
      if (!locationId) continue;

      const existing = await ctx.db
        .query("vehicles")
        .filter((q) => q.eq(q.field("registrationNumber"), v.registrationNumber))
        .first();

      const { locationName: _, ...vehicleData } = v;

      if (existing) {
        await ctx.db.patch(existing._id, {
          ...vehicleData,
          locationId,
          updatedAt: now,
        });
        vehicleIdMap.set(v.registrationNumber, existing._id);
      } else {
        const id = await ctx.db.insert("vehicles", {
          ...vehicleData,
          locationId,
          createdAt: now,
          updatedAt: now,
        });
        vehicleIdMap.set(v.registrationNumber, id);
      }
    }

    // 4. Seed Demo Bookings
    const demoBookings = [
      {
        bookingId: "SG-1001",
        customerPhone: "919812345678",
        customerName: "Rahul Sharma",
        vehicleReg: "MH12AB1234",
        pickupLoc: "Baner",
        startDate: "20 October",
        pickupTime: "10:00 AM",
        returnDate: "20 October",
        returnTime: "6:00 PM",
        status: "confirmed" as const,
        totalAmount: 500,
        paymentStatus: "pending" as const,
      },
      {
        bookingId: "SG-1002",
        customerPhone: "919876543211",
        customerName: "Amit Patil",
        vehicleReg: "MH12KL1122",
        pickupLoc: "Baner",
        startDate: "19 October",
        pickupTime: "09:00 AM",
        returnDate: "21 October",
        returnTime: "08:00 PM",
        status: "active" as const,
        totalAmount: 2800,
        paymentStatus: "paid" as const,
      },
      {
        bookingId: "SG-1003",
        customerPhone: "919812345679",
        customerName: "Priya Deshmukh",
        vehicleReg: "MH14EF9012",
        pickupLoc: "Wakad",
        startDate: "15 October",
        pickupTime: "10:00 AM",
        returnDate: "16 October",
        returnTime: "10:00 AM",
        status: "completed" as const,
        totalAmount: 550,
        paymentStatus: "paid" as const,
      },
      {
        bookingId: "SG-1004",
        customerPhone: "919876543212",
        customerName: "Sneha Kulkarni",
        vehicleReg: "MH12MN3344",
        pickupLoc: "Aundh",
        startDate: "12 October",
        pickupTime: "11:00 AM",
        returnDate: "13 October",
        returnTime: "11:00 AM",
        status: "cancelled" as const,
        totalAmount: 900,
        paymentStatus: "refunded" as const,
      },
      {
        bookingId: "SG-1005",
        customerPhone: "919876543210",
        customerName: "Nityom Tikhe",
        vehicleReg: "MH12XY4455",
        pickupLoc: "Baner",
        startDate: "10 October",
        pickupTime: "08:00 AM",
        returnDate: "10 October",
        returnTime: "08:00 PM",
        status: "completed" as const,
        totalAmount: 450,
        paymentStatus: "paid" as const,
      },
    ];

    for (const b of demoBookings) {
      const customerId = customerIdMap.get(b.customerPhone);
      const vehicleId = vehicleIdMap.get(b.vehicleReg);
      const locationId = locationIdMap.get(b.pickupLoc);

      if (!customerId || !vehicleId || !locationId) continue;

      const existing = await ctx.db
        .query("bookings")
        .withIndex("by_bookingId", (q) => q.eq("bookingId", b.bookingId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          customerId,
          vehicleId,
          pickupLocationId: locationId,
          returnLocationId: locationId,
          startDate: b.startDate,
          pickupTime: b.pickupTime,
          returnDate: b.returnDate,
          returnTime: b.returnTime,
          status: b.status,
          totalAmount: b.totalAmount,
          paymentStatus: b.paymentStatus,
          customerName: b.customerName,
          customerPhone: b.customerPhone,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("bookings", {
          bookingId: b.bookingId,
          customerId,
          vehicleId,
          pickupLocationId: locationId,
          returnLocationId: locationId,
          startDate: b.startDate,
          pickupTime: b.pickupTime,
          returnDate: b.returnDate,
          returnTime: b.returnTime,
          status: b.status,
          totalAmount: b.totalAmount,
          paymentStatus: b.paymentStatus,
          customerName: b.customerName,
          customerPhone: b.customerPhone,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return {
      locations: locationIdMap.size,
      vehicles: vehicleIdMap.size,
      customers: customerIdMap.size,
      bookings: demoBookings.length,
    };
  },
});
