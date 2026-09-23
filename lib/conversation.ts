/**
 * ScootyGo Rentals WhatsApp Chatbot - Conversation Engine
 * Backed by Convex Database for 100% persistent state across Vercel serverless requests.
 * 
 * NO AI - NO DATABASE OTHER THAN CONVEX - DETERMINISTIC FIXED CONVERSATION FLOW
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { findNearestLocation, generateGoogleMapsUrl, GeoLocationItem } from "./geo";
import { WhatsAppLocationPayload } from "./whatsapp";

const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://quaint-hound-638.convex.cloud";

export function getConvexClient(): ConvexHttpClient {
  return new ConvexHttpClient(CONVEX_URL);
}

export type ConversationStep =
  | "WELCOME"
  | "WAITING_FOR_DATE"
  | "WAITING_FOR_PICKUP_TIME"
  | "WAITING_FOR_RETURN_TIME"
  | "WAITING_FOR_LOCATION"
  | "WAITING_FOR_SCOOTER"
  | "WAITING_FOR_NAME"
  | "WAITING_FOR_CONFIRMATION"
  | "COMPLETED";

export interface IncomingMessageInput {
  phoneNumber: string;
  type: "text" | "location" | string;
  text?: string;
  latitude?: number;
  longitude?: number;
}

export interface ProcessMessageResult {
  text: string;
  nativeLocation?: WhatsAppLocationPayload;
}

export const MESSAGE_TEMPLATES = {
  WELCOME: `👋 Welcome to ScootyGo Rentals!

I can help you book a scooter or bike. 🛵🏍️

Please choose an option:

1️⃣ Book a Scooty/Bike
2️⃣ Check Prices
3️⃣ My Booking
4️⃣ Talk to Support`,

  STEP_BOOK_DATE: `🛵 Great! Let's book your ride.

What date would you like to rent it?

Example:
20 October`,

  STEP_PICKUP_TIME: `⏰ What pickup time would you like?

Example:
10:00 AM`,

  STEP_RETURN_TIME: `🕐 What return time would you like?

Example:
6:00 PM`,

  STEP_REQUEST_LOCATION: `📍 Please share your current location with us.

This helps us find the nearest ScootyGo pickup location.

Please use WhatsApp's location-sharing option.`,

  SUPPORT: `📞 ScootyGo Support

We're available 24/7.

Phone:
+91 90000 00000

WhatsApp:
+91 90000 00000

📍 Pune`,
};

/**
 * Core state machine processor for incoming WhatsApp messages.
 * Uses Convex for persistent serverless state management.
 */
export async function processIncomingMessage(
  input: IncomingMessageInput
): Promise<ProcessMessageResult> {
  const convex = getConvexClient();
  const { phoneNumber, type, text = "", latitude, longitude } = input;
  const trimmedText = text.trim();
  const lowerText = trimmedText.toLowerCase();

  // Global reset trigger: if customer sends a greeting or reset word
  const isGreeting = ["hi", "hello", "hey", "start", "reset", "menu"].includes(lowerText);
  if (isGreeting) {
    try {
      await convex.mutation(api.sessions.clearWhatsAppSession, { phoneNumber });
    } catch (err) {
      console.error("[Convex Session Reset Error]", err);
    }
    return { text: MESSAGE_TEMPLATES.WELCOME };
  }

  // Fetch current session from Convex
  let session = null;
  try {
    session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber });
  } catch (err) {
    console.error("[Convex Query Session Error]", err);
  }

  const currentStep = (session?.currentStep as ConversationStep) || "WELCOME";
  const draft = session?.bookingDraft || {};

  switch (currentStep) {
    case "WELCOME": {
      if (trimmedText === "1") {
        await convex.mutation(api.sessions.saveWhatsAppSession, {
          phoneNumber,
          currentStep: "WAITING_FOR_DATE",
          bookingDraft: {},
        });
        return { text: MESSAGE_TEMPLATES.STEP_BOOK_DATE };
      }

      if (trimmedText === "2") {
        // Dynamic vehicle prices from Convex
        try {
          const vehicles = await convex.query(api.vehicles.listAvailableVehicles);
          if (!vehicles || vehicles.length === 0) {
            return { text: "No vehicles currently available for pricing. Please try again later." };
          }

          // Group by name/model to display distinct options
          const seen = new Set<string>();
          const lines: string[] = ["💰 ScootyGo Rental Prices\n"];
          for (const v of vehicles) {
            if (!seen.has(v.name)) {
              seen.add(v.name);
              const icon = v.type === "bike" ? "🏍️" : "🛵";
              lines.push(`${icon} ${v.name}\n₹${v.pricePerDay.toLocaleString("en-IN")}/day\n`);
            }
          }
          lines.push("To book a scooty or bike, reply:\n1");
          return { text: lines.join("\n") };
        } catch (err) {
          console.error("[Convex Prices Query Error]", err);
          return { text: "Unable to fetch prices right now. Please try again later." };
        }
      }

      if (trimmedText === "3") {
        // Query customer bookings from Convex
        try {
          const bookings = await convex.query(api.bookings.getBookingsByCustomer, {
            customerPhone: phoneNumber,
          });

          if (!bookings || bookings.length === 0) {
            return {
              text: `📋 You don't have any bookings yet.\n\nSend "1" to book a ride.`,
            };
          }

          const lines: string[] = ["📋 Your Bookings\n"];
          for (const b of bookings.slice(0, 3)) {
            lines.push(
              `Booking ID:\n${b.bookingId}\n\nRide:\n${b.vehicleName}\n\nDate:\n${b.startDate}\n\nPickup:\n${b.pickupTime}\n\nStatus:\n${b.status.toUpperCase()}\n---`
            );
          }
          return { text: lines.join("\n") };
        } catch (err) {
          console.error("[Convex Bookings Query Error]", err);
          return { text: "Could not retrieve bookings. Please try again." };
        }
      }

      if (trimmedText === "4") {
        return { text: MESSAGE_TEMPLATES.SUPPORT };
      }

      // Default prompt for any unrecognized input at welcome stage
      return { text: MESSAGE_TEMPLATES.WELCOME };
    }

    case "WAITING_FOR_DATE": {
      // Step 2: Save rental date
      await convex.mutation(api.sessions.saveWhatsAppSession, {
        phoneNumber,
        currentStep: "WAITING_FOR_PICKUP_TIME",
        bookingDraft: {
          startDate: trimmedText,
          returnDate: trimmedText, // Default to same day
        },
      });
      return { text: MESSAGE_TEMPLATES.STEP_PICKUP_TIME };
    }

    case "WAITING_FOR_PICKUP_TIME": {
      // Step 3: Save pickup time
      await convex.mutation(api.sessions.saveWhatsAppSession, {
        phoneNumber,
        currentStep: "WAITING_FOR_RETURN_TIME",
        bookingDraft: {
          pickupTime: trimmedText,
        },
      });
      return { text: MESSAGE_TEMPLATES.STEP_RETURN_TIME };
    }

    case "WAITING_FOR_RETURN_TIME": {
      // Step 4: Save return time and ask for location
      await convex.mutation(api.sessions.saveWhatsAppSession, {
        phoneNumber,
        currentStep: "WAITING_FOR_LOCATION",
        bookingDraft: {
          returnTime: trimmedText,
        },
      });
      return { text: MESSAGE_TEMPLATES.STEP_REQUEST_LOCATION };
    }

    case "WAITING_FOR_LOCATION": {
      // Step 5: Receive WhatsApp location
      if (type !== "location" || latitude === undefined || longitude === undefined) {
        return {
          text: `📍 Please share your current location using WhatsApp's location attachment pin so we can find your nearest ScootyGo hub.`,
        };
      }

      // Query active locations from Convex
      const activeLocations = await convex.query(api.locations.listActiveLocations);
      const nearest = findNearestLocation(latitude, longitude, activeLocations as GeoLocationItem[]);

      if (!nearest) {
        return {
          text: "Sorry, no rental locations are currently active. Please try again later or type 4 for support.",
        };
      }

      const nearestLocation = nearest.location;
      const distanceKm = nearest.distanceKm;

      // Query available vehicles for this location
      const availableVehicles = await convex.query(api.vehicles.listVehiclesByLocation, {
        locationId: nearestLocation._id as Id<"locations">,
        onlyAvailable: true,
      });

      // Save nearest location into session draft
      await convex.mutation(api.sessions.saveWhatsAppSession, {
        phoneNumber,
        currentStep: "WAITING_FOR_SCOOTER",
        pickupLocationId: nearestLocation._id as Id<"locations">,
        bookingDraft: {
          customerLatitude: latitude,
          customerLongitude: longitude,
          distanceKm,
          locationName: nearestLocation.name,
          locationAddress: nearestLocation.address,
        },
      });

      if (!availableVehicles || availableVehicles.length === 0) {
        return {
          text: `📍 We found the nearest ScootyGo location:

ScootyGo Rentals - ${nearestLocation.name}
📍 ${nearestLocation.address}
Approx. distance: ${distanceKm} km

Currently, there are no available vehicles at this hub. Please contact support (type 4) or start over with "Hi".`,
        };
      }

      // Format dynamic available rides list
      const vehicleLines: string[] = [
        `📍 We found the nearest ScootyGo location:\n\nScootyGo Rentals - ${nearestLocation.name}\n\n📍 ${nearestLocation.address}\n\nApprox. distance:\n${distanceKm} km\n\nNow let's find available rides for you. 🛵\n\n🛵 Available Rides Near You\n`,
      ];

      availableVehicles.forEach((v, idx) => {
        const icon = v.type === "bike" ? "🏍️" : "🛵";
        vehicleLines.push(
          `${idx + 1}️⃣ ${v.name}\n₹${v.pricePerDay.toLocaleString("en-IN")}/day\n📍 ${nearestLocation.name}\n`
        );
      });

      vehicleLines.push("Reply with the number of your preferred ride.");

      return { text: vehicleLines.join("\n") };
    }

    case "WAITING_FOR_SCOOTER": {
      // Step 6: Vehicle selection
      const locationId = session?.pickupLocationId;
      if (!locationId) {
        await convex.mutation(api.sessions.clearWhatsAppSession, { phoneNumber });
        return { text: "Session expired. Please send 'Hi' to start again." };
      }

      const availableVehicles = await convex.query(api.vehicles.listVehiclesByLocation, {
        locationId,
        onlyAvailable: true,
      });

      const selectedIndex = parseInt(trimmedText, 10) - 1;
      const selectedVehicle = availableVehicles[selectedIndex];

      if (isNaN(selectedIndex) || !selectedVehicle) {
        // Invalid selection response as required by specs
        const vehicleLines: string[] = [
          `❌ Sorry, this vehicle is currently unavailable.\n\nPlease choose another available ride.\n\n🛵 Available Rides Near You:\n`,
        ];
        availableVehicles.forEach((v, idx) => {
          vehicleLines.push(
            `${idx + 1}️⃣ ${v.name}\n₹${v.pricePerDay.toLocaleString("en-IN")}/day\n📍 ${draft.locationName || "Pune"}\n`
          );
        });
        vehicleLines.push("Reply with the number of your preferred ride.");
        return { text: vehicleLines.join("\n") };
      }

      // Valid vehicle selected
      await convex.mutation(api.sessions.saveWhatsAppSession, {
        phoneNumber,
        currentStep: "WAITING_FOR_NAME",
        selectedVehicleId: selectedVehicle._id,
        bookingDraft: {
          vehicleName: selectedVehicle.name,
          vehiclePrice: selectedVehicle.pricePerDay,
        },
      });

      return { text: `👤 Please enter your name.` };
    }

    case "WAITING_FOR_NAME": {
      // Step 7: Customer enters name
      const customerName = trimmedText;

      // Create or update customer in Convex
      const customer = await convex.mutation(api.customers.getOrCreateCustomer, {
        phoneNumber,
        name: customerName,
      });

      if (!customer) {
        return { text: "Unable to process customer details. Please send 'Hi' to start over." };
      }

      // Update session draft with customerId and customerName
      await convex.mutation(api.sessions.saveWhatsAppSession, {
        phoneNumber,
        currentStep: "WAITING_FOR_CONFIRMATION",
        customerId: customer._id,
        bookingDraft: {
          customerName,
        },
      });

      // Fetch location coordinates to generate Google Maps link
      const location = session?.pickupLocationId
        ? await convex.query(api.locations.getLocation, { locationId: session.pickupLocationId })
        : null;

      const lat = location?.latitude || 18.5590;
      const lon = location?.longitude || 73.7868;
      const mapsUrl = generateGoogleMapsUrl(lat, lon);

      const rideName = draft.vehicleName || "Honda Activa 6G";
      const startDate = draft.startDate || "20 October";
      const pickupTime = draft.pickupTime || "10:00 AM";
      const returnTime = draft.returnTime || "6:00 PM";
      const locName = location?.name || draft.locationName || "Baner";
      const locAddress = location?.address || draft.locationAddress || "Baner Road, Pune";
      const price = draft.vehiclePrice || 500;

      const summary = `🛵 Booking Summary

Ride:
${rideName}

Date:
${startDate}

Pickup:
${pickupTime}

Return:
${returnTime}

Pickup Location:
ScootyGo Rentals - ${locName}
${locAddress}

🗺️ Open in Google Maps:
${mapsUrl}

Name:
${customerName}

Price:
₹${price.toLocaleString("en-IN")}/day

Would you like to confirm?

Reply:
YES
or
NO`;

      return { text: summary };
    }

    case "WAITING_FOR_CONFIRMATION": {
      // Step 8: Confirmation
      if (lowerText === "yes" || lowerText === "confirm" || lowerText === "y") {
        if (!session?.customerId || !session?.selectedVehicleId || !session?.pickupLocationId) {
          await convex.mutation(api.sessions.clearWhatsAppSession, { phoneNumber });
          return { text: "Session expired or incomplete. Please send 'Hi' to start again." };
        }

        const location = await convex.query(api.locations.getLocation, {
          locationId: session.pickupLocationId,
        });

        const lat = location?.latitude || 18.5590;
        const lon = location?.longitude || 73.7868;
        const mapsUrl = generateGoogleMapsUrl(lat, lon);

        const totalAmount = draft.vehiclePrice || 500;
        const rideName = draft.vehicleName || "Honda Activa 6G";
        const startDate = draft.startDate || "20 October";
        const pickupTime = draft.pickupTime || "10:00 AM";
        const returnDate = draft.returnDate || startDate;
        const returnTime = draft.returnTime || "6:00 PM";
        const customerName = draft.customerName || "Customer";
        const locName = location?.name || "Baner";
        const locAddress = location?.address || "Baner Road, Pune";

        // Create the real booking in Convex
        const booking = await convex.mutation(api.bookings.createBooking, {
          customerId: session.customerId,
          vehicleId: session.selectedVehicleId,
          pickupLocationId: session.pickupLocationId,
          returnLocationId: session.pickupLocationId,
          startDate,
          pickupTime,
          returnDate,
          returnTime,
          totalAmount,
          customerName,
          customerPhone: phoneNumber,
          status: "confirmed",
          paymentStatus: "pending",
        });

        if (!booking) {
          return { text: "Unable to create booking. Please contact support or send 'Hi'." };
        }

        // Reset session in Convex
        await convex.mutation(api.sessions.clearWhatsAppSession, { phoneNumber });

        const confirmationText = `✅ Booking Confirmed!

Your ScootyGo booking is confirmed. 🛵

Booking ID:
${booking.bookingId}

Ride:
${rideName}

Date:
${startDate}

Pickup:
${pickupTime}

Return:
${returnTime}

Pickup Location:
ScootyGo Rentals - ${locName}

Address:
${locAddress}

💰 Total:
₹${totalAmount.toLocaleString("en-IN")}

🗺️ Google Maps:
${mapsUrl}

Thank you for choosing ScootyGo!`;

        return {
          text: confirmationText,
          nativeLocation: {
            latitude: lat,
            longitude: lon,
            name: `ScootyGo Rentals - ${locName}`,
            address: locAddress,
          },
        };
      }

      if (lowerText === "no" || lowerText === "cancel" || lowerText === "n") {
        await convex.mutation(api.sessions.clearWhatsAppSession, { phoneNumber });
        return {
          text: `❌ Booking cancelled.\n\nNo booking has been created.\n\nSend "Hi" anytime to start again.`,
        };
      }

      return {
        text: `Please reply:\n\nYES\n\nor\n\nNO`,
      };
    }

    case "COMPLETED": {
      await convex.mutation(api.sessions.clearWhatsAppSession, { phoneNumber });
      return { text: MESSAGE_TEMPLATES.WELCOME };
    }

    default: {
      await convex.mutation(api.sessions.clearWhatsAppSession, { phoneNumber });
      return { text: MESSAGE_TEMPLATES.WELCOME };
    }
  }
}
