export type NavTab =
  | 'dashboard'
  | 'chats'
  | 'broadcast'
  | 'automation'
  | 'templates'
  | 'contacts'
  | 'campaigns'
  | 'reports'
  | 'simulator'
  | 'settings';

export type ChatFilter = 'all' | 'unread' | 'assigned' | 'bot';

export interface WhatsAppSession {
  _id: string;
  phoneNumber: string;
  currentStep: string;
  language?: string;
  patientId?: string;
  patientReference?: string;
  patientName?: string;
  isVerified?: boolean;
  verificationOtp?: string;
  otpExpiresAt?: number;
  pendingAction?: string;
  isHandedOver?: boolean;
  handoverReason?: string;
  handoverTimestamp?: number;
  bookingDraft?: {
    doctorName?: string;
    specialty?: string;
    date?: string;
    session?: string;
    slot?: string;
    slotTime?: string;
    patientName?: string;
    patientAge?: string;
    patientPhone?: string;
    patientAddress?: string;
    complaint?: string;
  };
  notes?: string;
  tags?: string[];
  unreadCount?: number;
  assignedTo?: string;
  lastMessage?: string;
  lastMessageTimestamp?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  _id?: string;
  phoneNumber: string;
  sender: 'patient' | 'assistant' | 'staff';
  text: string;
  type?: string;
  metadata?: any;
  createdAt: number;
}

export interface BroadcastCampaign {
  _id: string;
  title: string;
  message: string;
  targetAudience: string;
  recipientCount: number;
  status: string;
  sentAt: number;
  tags?: string[];
}

export interface DashboardStats {
  totalChats: number;
  replied: number;
  newLeads: number;
  messagesSent: number;
  campaigns?: BroadcastCampaign[];
}

export interface QuickTemplate {
  id: string;
  title: string;
  category: 'appointment' | 'prescription' | 'billing' | 'reminder' | 'general';
  text: string;
}

export interface OpdWaitingPatient {
  id: string;
  name: string;
  phone: string;
  uhid?: string;
  doctorName: string;
  date: string;
  slotTime: string;
  tokenNo: number;
  status: 'WAITING' | 'CONFIRMED';
}

