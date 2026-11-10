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
  name: "Cortex Hospital",
  tagline: "Dedicated to Complete Orthopaedic, Maternity & Family Care",
  address: {
    line1: "Aarti Chowk",
    line2: "Nagpur Road",
    city: "Wardha",
    state: "Maharashtra",
    pincode: "442001",
    fullFormatted: "Cortex Hospital, Aarti Chowk, Nagpur Road, Wardha - 442001, Maharashtra",
  },
  coordinates: {
    latitude: 20.7453,
    longitude: 78.5992,
  },
  contacts: {
    phones: ["07152-255795", "+91 9373280505"],
    mobile: "+91 9373280505",
    landline: "07152-255795",
    whatsapp: "+91 9373280505",
    email: "cortexhospital@gmail.com",
    website: "https://cortexhospital.com",
    emergency: "112 / +91 9373280505",
  },
  schedule: {
    opdTimings: "Mon. to Fri. - 10:00 AM to 1:00 PM & 6:00 PM to 8:00 PM | Sat. - 10:00 AM to 1:00 PM | Sunday Closed",
    weekdays: "10:00 AM – 1:00 PM & 6:00 PM – 8:00 PM",
    saturday: "10:00 AM – 1:00 PM (Morning Only)",
    sunday: "Closed (Emergency triage on-call)",
    specialClinics: "HIP & KNEE JOINT CLINIC • Every Thursday 6:00 PM – 8:00 PM",
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
      scheduleDescription: "Mon–Fri: 10:00 AM–1:00 PM & 6:00 PM–8:00 PM | Sat: 10:00 AM–1:00 PM | Special Joint Clinic: Thu 6:00 PM–8:00 PM",
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
      scheduleDescription: "Mon–Fri: 10:00 AM–1:00 PM & 6:00 PM–8:00 PM | Sat: 10:00 AM–1:00 PM",
    },
  ],
};

/**
 * Standard Default Welcome Message (Strictly adhering to Section 15 of System Prompt, numbered 1-9 for easy access)
 */
export const DEFAULT_WELCOME_MESSAGE = `Welcome to Cortex Hospital 👋
Please choose your language / कृपया भाषा चुनें / कृपया भाषा निवडा:

1️⃣ English
2️⃣ हिन्दी
3️⃣ मराठी

Reply with 1, 2, or 3 (or type the language).`;
