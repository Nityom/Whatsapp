# Svaasth Hospital — WhatsApp Patient Care & OPD Queue Simulation Seed Material

## 1. Background & Context
* **Organization:** Svaasth Hospital & Multispecialty Center
* **Location:** Aarti Chowk, Nagpur Road, Wardha, Maharashtra, India
* **Specialties:** Orthopaedics & Joint Replacement (Dr. Vipeen Raut), Gynaecology & Obstetrics (Dr. Shillpa Raut), General OPD
* **Daily Footfall:** ~180 OPD consultations daily, 65% rural/semi-urban patients

## 2. Core Operational Problem
1. **Corridor Congestion:** Patients arrive early in the morning and wait 2 to 4 hours in waiting rooms without queue visibility or delay alerts.
2. **App Fatigue & Digital Literacy:** Elderly patients cannot use native apps or portals. However, 98% of patients and their family caregivers actively use WhatsApp.
3. **Single-Phone Household Dilemma:** Typically, one family member's smartphone is used to book and manage medical records for parents, spouse, and children.

## 3. The New WhatsApp Intervention (Svaasth Connect)
Svaasth Hospital is rolling out an automated WhatsApp Business Cloud platform with the following capabilities:
* **Interactive 15-Minute OPD Slot Booking:** Patients pick time slots directly on WhatsApp in English, Hindi (हिन्दी), or Marathi (मराठी).
* **Multi-Profile Family Care:** Allows one phone number to manage records for multiple dependents (e.g., father, mother, child) with separate UHID references.
* **Live Token & Waiting Time Broadcast:** Real-time delay notices sent via WhatsApp if surgeries run late.
* **Instant Digital Prescriptions:** Official signed PDFs and medicine schedules dispatched to WhatsApp right after consultation.
* **Silent Human Handover:** Hospital front desk staff can seamlessly take over the conversation from the admin dashboard when medical judgment is needed, while the AI bot stays silent.

## 4. Key Agent Personas in the Simulation
* **Elderly Chronic Patient (Ramesh, 68):** Suffers from osteoarthritis, relies on his son for appointments, prefers Marathi voice notes or simple buttons.
* **Tech-Savvy Caregiver (Sandeep, 34):** IT professional in Pune managing his parents' healthcare back home in Wardha via WhatsApp.
* **Walk-in Rural Farmer (Anil, 45):** Arrives unannounced without an appointment, impatient with long physical queues.
* **Expectant Mother (Pooja, 27):** Visiting Dr. Shillpa Raut for routine prenatal scans; values timely reminders and diet instructions.
* **Hospital Receptionist (Sunita):** Overwhelmed with incoming phone calls and token issuing at the physical front desk.
* **Consulting Doctor (Dr. Vipeen Raut):** Demands punctuality, dislikes crowded examination corridors, needs accurate complaint notes before seeing patients.

## 5. Objectives for MiroFish Multi-Agent Simulation
1. **Adoption Rate Prediction:** How quickly will patients transition from physical queue tokens to WhatsApp self-booking?
2. **Family Multi-Profile Friction:** Will caregivers face confusion when selecting between their own profile and family dependents?
3. **Staff Workload Impact:** What is the reduction in front desk phone calls and physical corridor chaos over a 30-day simulation?
4. **Edge Cases & Failure Points:** Identify scenarios where automated triage needs immediate human escalation (e.g., acute chest pain, trauma).

