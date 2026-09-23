/**
 * Scooty Rental WhatsApp Chatbot - Conversation State Machine
 * Business: ScootyGo Rentals (Pune, Maharashtra)
 *
 * NOTE: This is an IN-MEMORY state store for demonstration purposes only.
 * This state will NOT persist across server restarts or serverless function cold starts.
 * For production, replace this with a persistent store (e.g., Redis, PostgreSQL, etc.).
 *
 * NO AI - NO DATABASE - FIXED CONVERSATION FLOW ONLY
 */

export type ConversationStep =
  | 'WELCOME'
  | 'WAITING_FOR_DATE'
  | 'WAITING_FOR_PICKUP_TIME'
  | 'WAITING_FOR_RETURN_TIME'
  | 'WAITING_FOR_LOCATION'
  | 'WAITING_FOR_SCOOTER'
  | 'WAITING_FOR_NAME'
  | 'WAITING_FOR_CONFIRMATION'
  | 'COMPLETED';

export interface UserSession {
  phoneNumber: string;
  currentStep: ConversationStep;
  date?: string;
  pickupTime?: string;
  returnTime?: string;
  latitude?: number;
  longitude?: number;
  selectedScooter?: string;
  scooterPrice?: string;
  customerName?: string;
  lastUpdated: number;
}

// In-memory session store mapping phone number -> UserSession
// DEMO ONLY: Does not survive server restart
const sessions = new Map<string, UserSession>();

/**
 * Scooter catalog details
 */
export const SCOOTER_OPTIONS: Record<string, { name: string; location: string; price: string }> = {
  '1': {
    name: 'Honda Activa 6G',
    location: 'Baner',
    price: '₹500/day',
  },
  '2': {
    name: 'Honda Activa 125',
    location: 'Aundh',
    price: '₹600/day',
  },
  '3': {
    name: 'TVS Jupiter',
    location: 'Wakad',
    price: '₹550/day',
  },
};

export const MESSAGE_TEMPLATES = {
  WELCOME: `👋 Welcome to ScootyGo Rentals!

I can help you book a scooty. 🛵

Please choose an option:

1️⃣ Book a Scooty
2️⃣ Check Prices
3️⃣ My Booking
4️⃣ Talk to Support`,

  STEP_BOOK_DATE: `🛵 Great! Let's book your scooty.

What date would you like to rent it?

Example:
25 September`,

  STEP_PICKUP_TIME: `Great! 📅

What time would you like to pick up the scooty?

Example:
10 AM`,

  STEP_RETURN_TIME: `Perfect! 🕙

What time would you like to return the scooty?

Example:
8 PM`,

  STEP_REQUEST_LOCATION: `📍 Now please share your WhatsApp location.

This will help us find the nearest available scooty.`,

  SCOOTER_CATALOG: `🛵 Available Scooties Near You

1️⃣ Honda Activa 6G
📍 Baner
💰 ₹500/day

2️⃣ Honda Activa 125
📍 Aundh
💰 ₹600/day

3️⃣ TVS Jupiter
📍 Wakad
💰 ₹550/day

Reply with 1, 2, or 3 to select.`,

  PRICES: `💰 ScootyGo Rentals — Demo Prices

🛵 Honda Activa 6G
₹500/day

🛵 Honda Activa 125
₹600/day

🛵 TVS Jupiter
₹550/day

To book a scooty, reply:

1`,

  MY_BOOKING: `📋 Demo Booking

Booking ID: SCR-DEMO-001
Status: Pending Confirmation

For this demo, booking information is temporary and is not stored in a database.`,

  SUPPORT: `👨💼 Our support team will assist you.

Please call the rental office or continue this conversation.`,
};

/**
 * Retrieve or initialize a session for a given phone number.
 */
export function getOrCreateSession(phoneNumber: string): UserSession {
  let session = sessions.get(phoneNumber);
  if (!session) {
    session = {
      phoneNumber,
      currentStep: 'WELCOME',
      lastUpdated: Date.now(),
    };
    sessions.set(phoneNumber, session);
  }
  return session;
}

/**
 * Reset a user's session back to initial state.
 */
export function resetSession(phoneNumber: string): UserSession {
  const session: UserSession = {
    phoneNumber,
    currentStep: 'WELCOME',
    lastUpdated: Date.now(),
  };
  sessions.set(phoneNumber, session);
  return session;
}

export interface IncomingMessageInput {
  phoneNumber: string;
  type: 'text' | 'location' | string;
  text?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Core state machine processor for incoming WhatsApp messages.
 * Returns the exact fixed text response to be sent back to the customer.
 */
export function processIncomingMessage(input: IncomingMessageInput): string {
  const { phoneNumber, type, text = '', latitude, longitude } = input;
  const trimmedText = text.trim();
  const lowerText = trimmedText.toLowerCase();

  const session = getOrCreateSession(phoneNumber);
  session.lastUpdated = Date.now();

  // Global reset trigger: if user says hi, hello, hey, start, reset
  const isGreeting = ['hi', 'hello', 'hey', 'start'].includes(lowerText);
  if (isGreeting) {
    resetSession(phoneNumber);
    return MESSAGE_TEMPLATES.WELCOME;
  }

  // Handle flow based on current step
  switch (session.currentStep) {
    case 'WELCOME': {
      if (trimmedText === '1') {
        session.currentStep = 'WAITING_FOR_DATE';
        return MESSAGE_TEMPLATES.STEP_BOOK_DATE;
      }
      if (trimmedText === '2') {
        return MESSAGE_TEMPLATES.PRICES;
      }
      if (trimmedText === '3') {
        return MESSAGE_TEMPLATES.MY_BOOKING;
      }
      if (trimmedText === '4') {
        return MESSAGE_TEMPLATES.SUPPORT;
      }

      // Default prompt if unrecognized option at welcome stage
      return MESSAGE_TEMPLATES.WELCOME;
    }

    case 'WAITING_FOR_DATE': {
      // Step 3: Accept text as requested date
      session.date = trimmedText;
      session.currentStep = 'WAITING_FOR_PICKUP_TIME';
      return MESSAGE_TEMPLATES.STEP_PICKUP_TIME;
    }

    case 'WAITING_FOR_PICKUP_TIME': {
      // Step 4: Accept text as pickup time
      session.pickupTime = trimmedText;
      session.currentStep = 'WAITING_FOR_RETURN_TIME';
      return MESSAGE_TEMPLATES.STEP_RETURN_TIME;
    }

    case 'WAITING_FOR_RETURN_TIME': {
      // Step 5: Accept text as return time
      session.returnTime = trimmedText;
      session.currentStep = 'WAITING_FOR_LOCATION';
      return MESSAGE_TEMPLATES.STEP_REQUEST_LOCATION;
    }

    case 'WAITING_FOR_LOCATION': {
      // Step 6: When location is received
      if (type === 'location' && latitude !== undefined && longitude !== undefined) {
        session.latitude = latitude;
        session.longitude = longitude;
        session.currentStep = 'WAITING_FOR_SCOOTER';
        return MESSAGE_TEMPLATES.SCOOTER_CATALOG;
      }

      // If user sent text instead of location attachment
      return `📍 Now please share your WhatsApp location.

This will help us find the nearest available scooty.`;
    }

    case 'WAITING_FOR_SCOOTER': {
      // Step 7: Scooter selection (1, 2, or 3)
      if (trimmedText === '1' || trimmedText === '2' || trimmedText === '3') {
        const selected = SCOOTER_OPTIONS[trimmedText];
        session.selectedScooter = selected.name;
        session.scooterPrice = selected.price;
        session.currentStep = 'WAITING_FOR_NAME';

        return `Great choice! 🛵

${selected.name}
💰 ${selected.price}

Please enter your full name.`;
      }

      return `Please reply with 1, 2, or 3 to select your scooty:

1️⃣ Honda Activa 6G (₹500/day)
2️⃣ Honda Activa 125 (₹600/day)
3️⃣ TVS Jupiter (₹550/day)`;
    }

    case 'WAITING_FOR_NAME': {
      // Step 8: Customer provides full name
      session.customerName = trimmedText;
      session.currentStep = 'WAITING_FOR_CONFIRMATION';

      const scooter = session.selectedScooter || 'Honda Activa 6G';
      const date = session.date || '25 September';
      const pickupTime = session.pickupTime || '10 AM';
      const returnTime = session.returnTime || '8 PM';
      const price = session.scooterPrice || '₹500/day';
      const name = session.customerName || 'Valued Customer';

      return `Please confirm your booking:

🛵 Scooter: ${scooter}
📅 Pickup: ${date}
🕙 Pickup Time: ${pickupTime}
🕙 Return Time: ${returnTime}
📍 Location received
👤 Name: ${name}
💰 Price: ${price}

Reply:

CONFIRM

to submit your booking.`;
    }

    case 'WAITING_FOR_CONFIRMATION': {
      // Step 9: Customer confirms
      if (lowerText === 'confirm' || lowerText === 'yes') {
        session.currentStep = 'COMPLETED';

        const scooter = session.selectedScooter || 'Honda Activa 6G';
        const date = session.date || '25 September';
        const pickupTime = session.pickupTime || '10 AM';
        const returnTime = session.returnTime || '8 PM';
        const name = session.customerName || 'Valued Customer';

        return `✅ Booking request submitted!

🛵 ${scooter}
📅 ${date}
🕙 ${pickupTime} → ${returnTime}
👤 ${name}

Booking ID: SCR-DEMO-001

Our rental team will confirm your booking shortly.

Thank you for choosing ScootyGo Rentals! 🛵`;
      }

      return `Please reply:

CONFIRM

to submit your booking, or type HI to start over.`;
    }

    case 'COMPLETED': {
      // After completion, if user sends another message, restart with welcome
      resetSession(phoneNumber);
      return MESSAGE_TEMPLATES.WELCOME;
    }

    default: {
      resetSession(phoneNumber);
      return MESSAGE_TEMPLATES.WELCOME;
    }
  }
}

/**
 * Helper to inspect active sessions (used by local simulation and debugging)
 */
export function getAllSessions(): Record<string, UserSession> {
  const result: Record<string, UserSession> = {};
  sessions.forEach((val, key) => {
    result[key] = val;
  });
  return result;
}
