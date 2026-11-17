/**
 * Official Cortex Hospital Configuration & Metadata
 * Synchronized with Cortex PMS / Cortex-Admin
 */

export interface DoctorInfo {
  id: string;
  name: string;
  degrees: string;
  designation: string;
  specialty: string;
  subSpecialty?: string;
  registrationNumber?: string;
  phone?: string;
  email?: string;
  consultationFee: {
    firstVisit: number;
    followupVisit: number;
    followupValidityDays: number;
  };
  scheduleDescription: string;
}

export interface HospitalConfig {
  name: string;
  tagline: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
    fullFormatted: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  contacts: {
    phones: string[];
    mobile: string;
    landline: string;
    whatsapp: string;
    email: string;
    website: string;
    emergency: string;
  };
  schedule: {
    opdTimings: string;
    weekdays: string;
    saturday: string;
    sunday: string;
    specialClinics: string;
  };
  doctors: DoctorInfo[];
}

export const CORTEX_HOSPITAL_CONFIG: HospitalConfig = {
  name: process.env.HOSPITAL_NAME || "Cortex Hospital",
  tagline: process.env.HOSPITAL_TAGLINE || "Dedicated to Complete Orthopaedic, Maternity & Family Care",
  address: {
    line1: process.env.HOSPITAL_ADDR_LINE1 || "Aarti Chowk",
    line2: process.env.HOSPITAL_ADDR_LINE2 || "Nagpur Road",
    city: process.env.HOSPITAL_CITY || "Wardha",
    state: process.env.HOSPITAL_STATE || "Maharashtra",
    pincode: process.env.HOSPITAL_PINCODE || "442001",
    fullFormatted: process.env.HOSPITAL_FULL_ADDRESS || "Cortex Hospital, Aarti Chowk, Nagpur Road, Wardha - 442001, Maharashtra",
  },
  coordinates: {
    latitude: process.env.HOSPITAL_LAT ? parseFloat(process.env.HOSPITAL_LAT) : 20.7453,
    longitude: process.env.HOSPITAL_LON ? parseFloat(process.env.HOSPITAL_LON) : 78.5992,
  },
  contacts: {
    phones: [process.env.HOSPITAL_LANDLINE || "07152-255795", process.env.HOSPITAL_PHONE || "+91 9373280505"],
    mobile: process.env.HOSPITAL_PHONE || "+91 9373280505",
    landline: process.env.HOSPITAL_LANDLINE || "07152-255795",
    whatsapp: process.env.HOSPITAL_WHATSAPP || "+91 9373280505",
    email: process.env.HOSPITAL_EMAIL || "cortexhospital@gmail.com",
    website: process.env.HOSPITAL_WEBSITE || "https://cortexhospital.com",
    emergency: process.env.HOSPITAL_EMERGENCY || "112 / +91 9373280505",
  },
  schedule: {
    opdTimings: "Mon. to Sat. - 10:30 AM to 1:00 PM & 6:00 PM to 7:30 PM | Sunday Closed",
    weekdays: "10:30 AM – 1:00 PM & 6:00 PM – 7:30 PM",
    saturday: "10:30 AM – 1:00 PM & 6:00 PM – 7:30 PM",
    sunday: "Closed (Emergency triage on-call)",
    specialClinics: "HIP & KNEE JOINT CLINIC • Every Thursday 6:00 PM – 7:30 PM",
  },
  doctors: [
    {
      id: "dr-vipeen-raut",
      name: "Dr. Vipeen Raut",
      degrees: "M.B.B.S., Dip.Ortho., DNB Ortho",
      registrationNumber: "1692/03/2002",
      designation: "Consulting Orthopaedic & Joint Replacement Surgeon",
      specialty: "Orthopaedics & Joint Replacement",
      subSpecialty: "Knee & Hip Replacement, Complex Trauma & Arthroscopy",
      consultationFee: {
        firstVisit: 400,
        followupVisit: 200,
        followupValidityDays: 10,
      },
      scheduleDescription: "Mon–Sat: 10:30 AM–1:00 PM & 6:00 PM–7:30 PM | Sunday Closed | Special Joint Clinic: Thu 6:00 PM–7:30 PM",
    },
    {
      id: "dr-shillpa-raut",
      name: "Dr. Shillpa Raut",
      degrees: "M.B.B.S., M.D. (Gynecology & Obstetrics)",
      registrationNumber: "2004/05/1842",
      designation: "Consulting Gynecologist & Obstetrician",
      specialty: "Gynecology & Obstetrics",
      subSpecialty: "Maternity, Infertility & Comprehensive Women Care",
      consultationFee: {
        firstVisit: 200,
        followupVisit: 100,
        followupValidityDays: 10,
      },
      scheduleDescription: "Mon–Sat: 10:30 AM–1:00 PM & 6:00 PM–7:30 PM | Sunday Closed",
    },
  ],
};

export const BOT_NAME = process.env.BOT_NAME || "Svaasth Connect";
export const BOT_TAGLINE = process.env.BOT_TAGLINE || "Healthcare WhatsApp AI & Operations Hub";

/**
 * Standard Default Welcome Message (Strictly adhering to Section 15 of System Prompt, numbered 1-9 for easy access)
 */
export const DEFAULT_WELCOME_MESSAGE = `Welcome to Svaasth Connect 👋
Please choose your language / कृपया भाषा चुनें / कृपया भाषा निवडा:

1️⃣ English
2️⃣ हिन्दी
3️⃣ मराठी

Reply with 1, 2, or 3 (or type the language).`;
