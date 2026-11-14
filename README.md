# 🏥 Svaasth Connect — AI WhatsApp Patient Engagement Hub & Hospital Administration Dashboard

> **Bridging Patients & Hospital Care via Official WhatsApp Business Cloud API & Cortex PMS**  


---

## 💡 The Vision & Philosophy ("Our Thought")

### 1. The Real-World Healthcare Challenge in India
In Indian healthcare—particularly in Tier-2 and Tier-3 cities—hospitals struggle with patient engagement:
* **App Fatigue:** Patients (especially rural, elderly, and family caregivers) do not download standalone hospital mobile apps or remember patient portal passwords.
* **OPD Queue Congestion:** Patients travel long distances, wait hours in crowded OPD corridors without real-time delay updates, and face token confusion.
* **Family-Centric Phone Usage:** In most households, a single smartphone owner (e.g., a son or daughter) books appointments, tracks prescriptions, and pays bills for multiple family members (parents, spouse, children). Conventional healthcare bots lock a phone number to one patient and fail completely in this environment.
* **Disjointed Clinical Workflow:** After an OPD visit, paper prescriptions get lost, medication compliance drops, and follow-up consultation rates plummet.

### 2. Our Core Thought & Solution
**"Healthcare belongs where patients already are: WhatsApp."**

WhatsApp has 100% penetration across Indian smartphone users. **Svaasth Connect** reimagines the patient journey by turning WhatsApp into an interactive, multilingual hospital front desk that:
1. **Eliminates Portal Logins:** Instant access via WhatsApp without app installation or login credentials.
2. **Empowers Indian Families (Multi-Profile Architecture):** Supports multiple patients under a single phone number. Whether booking an appointment, downloading a prescription, or checking bills, patients can seamlessly select which family member the action is for or register a new member on the fly.
3. **Pairs Deterministic Healthcare Guardrails with AI:** Clinical operations require zero hallucination. We combine a deterministic state machine for appointment slots, PMS transactions, and emergency routing with natural conversational understanding in **English**, **Hindi (हिन्दी)**, and **Marathi (मराठी)**.
4. **Protects Human Staff Conversations (Zero-Interruption Handover):** When hospital reception or medical staff replies to a patient from the dashboard, the AI bot remains **100% silent**. Incoming patient messages pass directly to staff without automated bot greetings interrupting the conversation.
5. **Closes the Loop Post-Consultation:** As soon as doctors save clinical notes in Cortex PMS, the system automatically dispatches official digital prescriptions (PDF) and scheduled follow-up reminders.

---

## 🏛️ System Architecture

```
                                  ┌────────────────────────────────────────┐
                                  │      PATIENT ON WHATSAPP              │
                                  │   (English / हिन्दी / मराठी)            │
                                  └──────────────────┬─────────────────────┘
                                                     │
                                                     ▼
                                  ┌────────────────────────────────────────┐
                                  │    Meta WhatsApp Business Cloud API    │
                                  │    (v21.0 Webhooks & Interactive)      │
                                  └──────────────────┬─────────────────────┘
                                                     │
                                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               NEXT.JS APP ROUTER CORE                                  │
│                                                                                        │
│   ┌────────────────────────────┐    ┌──────────────────────────────────────────────┐   │
│   │ /api/whatsapp/webhook      │───▶│ Deterministic Clinical State Machine         │   │
│   │ Inbound Webhook Dispatcher │    │ (lib/cortexAgent.ts)                         │   │
│   └────────────────────────────┘    │  • 15-Minute OPD Slot Engine                 │   │
│                                     │  • Multi-Profile Family Member Selector      │   │
│   ┌────────────────────────────┐    │  • Clinical Safety & Emergency Triage        │   │
│   │ /api/admin/dashboard       │    │  • Silent Human Staff Handover (Step 0)      │   │
│   │ Staff Reply & Broadcasts   │    └──────────────────────┬───────────────────────┘   │
│   └────────────────────────────┘                           │                           │
│                                                            ▼                           │
│   ┌────────────────────────────┐    ┌──────────────────────────────────────────────┐   │
│   │ Developer Safety Guardrail │◀───│ Outbound WhatsApp Dispatcher                 │   │
│   │ (lib/whatsapp.ts)          │    │ (Text, Interactive Buttons, Lists, Maps Pin)│   │
│   │ Dev Phone: 7796308778 only │    └──────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┼───────────────────────────┘
                                                             │
                     ┌───────────────────────────────────────┴───────────────────────────┐
                     ▼                                                                   ▼
┌────────────────────────────────────────┐           ┌────────────────────────────────────────┐
│     CONVEX REALTIME APP DATABASE       │           │        CORTEX PMS BACKEND              │
│     (dev:quaint-hound-638)             │           │        (dev:jovial-sheep-76)           │
│  • whatsappSessions (Handover State)   │           │  • OPD Appointments (Dr. Vipeen Raut)  │
│  • chatMessages (Audit Trail)          │           │  • OPD Appointments (Dr. Shillpa Raut) │
│  • broadcastCampaigns (Delivery Stats) │           │  • Digital Prescriptions & Investigations│
│  • dashboardStats (Metrics & SLAs)     │           │  • OPD Waiting Queue & Token Management│
└────────────────────────────────────────┘           └────────────────────────────────────────┘
```

---

## ✨ Key Capabilities & Features

### 1. 👨‍👩‍👧 Multi-Profile Family Member Management
* **Single Phone, Multiple Family Members:** Recognizes all family profiles linked to a mobile number (e.g. *Nityom*, *Kishor Tikhe*, *Priya Tikhe*).
* **Profile Selection on Every Personalized Flow:**
  * **Book Appointment:** Asks *"Who is this appointment for?"* with interactive quick-reply buttons and an option for `➕ Someone Else`.
  * **My Appointments:** Filter bookings per family member or view a combined schedule.
  * **Digital Prescriptions:** Keeps records segregated so medications are never mixed up.
  * **Hospital Bills & Receipts:** Download individual OPD consultation receipts or a family billing summary.
  * **Option 10 (Family Profiles):** View, switch active patient profiles, or register new family members anytime.

### 2. 🤫 Zero-Interruption Human Staff Handover
* When hospital receptionists reply from the dashboard or send a template, the conversation is marked `isHandedOver: true`.
* The AI bot stays **100% silent**. Incoming patient messages (e.g. *"hii"*, *"Help"*, *"tomorrow works"*) will not trigger language selection or main menu auto-replies.
* All patient messages flow directly into the staff dashboard in real time.
* Virtual assistant assistance resumes only when staff unpauses the bot from the UI or the patient explicitly types `#bot`.

### 3. ⏰ 15-Minute Live Slot Booking Engine
* Synchronized in real time with doctors' schedules:
  * **Dr. Vipeen Raut** — *Orthopaedics & Joint Replacement* (Fee: ₹400 / ₹200)
  * **Dr. Shillpa Raut** — *Gynecology & Obstetrics* (Fee: ₹200 / ₹100)
* Morning OPD: `10:30 AM – 1:00 PM` | Evening OPD: `6:00 PM – 7:30 PM` (Sunday: Closed / Casualty on-call).
* Real-time slot conflict prevention: Already booked slots are visually flagged `(Booked 🚫)` in WhatsApp list menus.

### 4. 🚨 Clinical Safety & Emergency Triage Guardrails
* **No Medical Hallucinations:** The bot never prescribes medicines or alters dosages.
* **Emergency Triage:** Keywords like *"acute chest pain"*, *"severe breathlessness"*, *"heavy bleeding"*, or *"trauma"* trigger an emergency safety protocol:
  * 🚑 National Emergency `112`
  * 🏥 Hospital 24/7 Casualty: `+91 9373280505` / `07152-255795`
  * 📍 Native WhatsApp Google Maps location pin to Aarti Chowk, Wardha.

### 5. 🛡️ Developer Environment Protection Guardrail
* To prevent disturbing real patients during development and testing, [lib/whatsapp.ts](file:///Users/nityomtikhe/Whatsapp/lib/whatsapp.ts) strictly enforces `isDevAllowedRecipient`:
  * Real WhatsApp messages are **only** sent to verified developer number `7796308778` (`+917796308778`).
  * Outbound messages to all other numbers are cleanly simulated, logged, and persisted without hitting the Meta Cloud API.

### 6. 💻 Unified Hospital Administration Dashboard
* **Chats Workspace:** Split-pane inbox with real-time sync, patient initials, 24h care window tags, quick replies, and patient profile drawer.
* **Templates Hub:** WhatsApp Quick Replies + Official Meta Cloud API templates with a **"Use in Chat"** recipient picker for active chats or multi-select recent contacts.
* **Broadcast & Campaigns:** Live OPD waiting queue delay notices, token calls, and announcements with delivery tracking.
* **Hospital Analytics & Reports:** Service volume breakdown, bot resolution rate (84.6%), doctor-wise consultation counts, and one-click **CSV export**.
* **Automations Hub:** Status and triggers for 24h appointment reminders, prescription auto-dispatches, and delay alerts.
* **Live Simulator Drawer:** Test end-to-end patient conversations across English, Hindi, and Marathi in the browser without consuming WhatsApp Meta credits.

---

## 📂 Project Structure

```
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── dashboard/route.ts      # Staff replies, bulk broadcasts, handover toggle
│   │   │   └── templates/route.ts      # Meta WABA template review and submission
│   │   └── whatsapp/
│   │       ├── webhook/route.ts        # Inbound Meta Cloud API webhook receiver
│   │       ├── simulate/route.ts       # Test simulator API for browser drawer
│   │       ├── notify-prescription/    # Triggered on prescription creation
│   │       └── prescription-saved/     # Webhook for PMS prescription events
│   ├── globals.css                     # Tailwind CSS v4 styling
│   ├── layout.tsx                      # Root layout & metadata
│   └── page.tsx                        # Main Hospital Staff Administration Dashboard
├── components/admin/
│   ├── Sidebar.tsx                     # Collapsible navigation sidebar
│   ├── Header.tsx                      # Executive greeting, date range, + Send Bulk Message
│   ├── StatCards.tsx                   # Top metric cards (Chats, Replied, Leads, Outbound)
│   ├── DashboardHomeView.tsx           # Hospital executive overview & quick actions
│   ├── ChatListColumn.tsx              # Recent conversations list with search & filters
│   ├── ChatThreadColumn.tsx            # Live WhatsApp chat view with Bot Active/Paused toggle
│   ├── PatientDetailColumn.tsx         # Patient demographics, UHID, quick actions, & clinical notes
│   ├── SendTemplateModal.tsx           # "Where to send?" recipient picker with multiselect
│   ├── BulkMessageModal.tsx            # Broadcast modal for OPD waiting queue & patient cohorts
│   ├── BroadcastView.tsx               # Broadcast campaign history & queue notifications
│   ├── TemplatesView.tsx               # Meta templates & 24h quick reply snippets
│   ├── ContactsView.tsx                # Patient directory with search & pagination
│   ├── ReportsView.tsx                 # Hospital analytics, service breakdown, CSV export
│   ├── AutomationView.tsx              # Active 24/7 background hospital automation triggers
│   └── SimulatorDrawer.tsx             # Interactive patient test chat drawer
├── convex/
│   ├── schema.ts                       # Convex database schema
│   └── sessions.ts                     # Sessions, chat audit logs, and handover mutations
├── lib/
│   ├── cortexAgent.ts                  # Core conversational engine & deterministic state machine
│   ├── cortexClient.ts                 # Integration layer for Cortex PMS (Doctors, Slots, Rx, Bills)
│   ├── conversation.ts                 # Message processor bridging Webhook & Convex
│   └── whatsapp.ts                     # Meta WhatsApp Cloud API client & dev phone guard
└── package.json
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript (Strict mode) |
| **UI & Styling** | React 19, Tailwind CSS v4, Lucide Icons |
| **Realtime Backend** | Convex Cloud (`quaint-hound-638`) |
| **PMS Integration** | Cortex Hospital PMS (`jovial-sheep-76`) |
| **Messaging Provider** | Meta WhatsApp Business Cloud API (`v21.0`) |
| **AI Engine** | Google Gemini 2.5 Flash with Function Calling |

---

## 🚀 Getting Started

### 1. Prerequisites
* Node.js v20+ or v24+
* npm or pnpm
* Convex account & CLI (`npx convex dev`)

### 2. Environment Variables (`.env.local`)
Create a `.env.local` file in the project root:

```env
# Meta WhatsApp Business Cloud API
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=479847545221049
WHATSAPP_WEBHOOK_VERIFY_TOKEN=svaasth_connect_verify_token_2026
GRAPH_API_VERSION=v21.0

# Convex Deployments
NEXT_PUBLIC_CONVEX_URL=https://quaint-hound-638.convex.cloud
CORTEX_CONVEX_URL=https://jovial-sheep-76.convex.cloud

# AI Model
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Install & Run Locally
```bash
# Install dependencies
npm install

# Start Convex synchronization
npx convex dev

# In another terminal, run Next.js development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to open the Svaasth Connect Administration Dashboard.

---

## 🏥 Hospital Reference Information
* **Hospital Name:** Svaasth Hospital (Cortex Hospital)
* **Address:** Aarti Chowk, Nagpur Road, Wardha - 442001, Maharashtra
* **Orthopaedics & Joint Replacement:** Dr. Vipeen Raut
* **Gynecology & Obstetrics:** Dr. Shillpa Raut
* **OPD Hours:** Mon–Sat: 10:30 AM – 1:00 PM & 6:00 PM – 7:30 PM (Sunday Closed)
* **Helplines:** Reception: `07152-255795` | Emergency/WhatsApp: `+91 9373280505`

