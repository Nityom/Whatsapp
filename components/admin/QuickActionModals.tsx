'use client';

import React, { useState } from 'react';
import {
  X,
  Calendar,
  FileText,
  CreditCard,
  Bell,
  CheckCircle,
  Clock,
  User,
  Stethoscope,
} from 'lucide-react';
import { WhatsAppSession } from './types';

interface QuickActionModalsProps {
  actionType: 'appointment' | 'prescription' | 'bill' | 'reminder' | null;
  onClose: () => void;
  session?: WhatsAppSession | null;
  onSendDirectMessage: (text: string) => Promise<void>;
}

export const QuickActionModals: React.FC<QuickActionModalsProps> = ({
  actionType,
  onClose,
  session,
  onSendDirectMessage,
}) => {
  const [selectedDoctor, setSelectedDoctor] = useState('Dr. Vipeen Raut (Orthopaedics)');
  const [selectedDate, setSelectedDate] = useState('Tomorrow');
  const [selectedSlot, setSelectedSlot] = useState('10:30 AM');
  const [complaint, setComplaint] = useState('Joint checkup');
  const [billAmount, setBillAmount] = useState('400');
  const [billStatus, setBillStatus] = useState<'PAID' | 'PENDING'>('PAID');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!actionType || !session) return null;

  const patientName = session.patientName || `+${session.phoneNumber}`;

  const handleSubmit = async (text: string) => {
    setIsSubmitting(true);
    try {
      await onSendDirectMessage(text);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsSubmitting(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-[#e2ece6] rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#e2ece6] flex items-center justify-between bg-[#f8faf8]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#f0f5f2] border border-[#dbe9e0] text-[#176e56] flex items-center justify-center shrink-0">
              {actionType === 'appointment' && <Calendar className="w-4 h-4" />}
              {actionType === 'prescription' && <FileText className="w-4 h-4" />}
              {actionType === 'bill' && <CreditCard className="w-4 h-4" />}
              {actionType === 'reminder' && <Bell className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#173d37]">
                {actionType === 'appointment' && 'Book appointment'}
                {actionType === 'prescription' && 'Send official prescription'}
                {actionType === 'bill' && 'Send consultation bill'}
                {actionType === 'reminder' && 'Send follow-up reminder'}
              </h3>
              <p className="text-[11px] text-[#55776d]">Patient: {patientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#55776d] hover:text-[#173d37] hover:bg-[#f0f5f2] border border-transparent hover:border-[#dbe9e0] flex items-center justify-center transition-colors text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* APPOINTMENT BOOKING */}
          {actionType === 'appointment' && (
            <>
              <div>
                <label className="block text-xs font-medium text-[#173d37] mb-1.5">Select doctor</label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-white border border-[#dbe9e0] text-[#173d37] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#176e56] focus:border-[#176e56]"
                >
                  <option value="Dr. Vipeen Raut (Orthopaedics)">
                    Dr. Vipeen Raut (Orthopaedics & Joint Replacement)
                  </option>
                  <option value="Dr. Shillpa Raut (Gynecology)">
                    Dr. Shillpa Raut (Gynecology & Obstetrics)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#173d37] mb-1.5">Date</label>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-white border border-[#dbe9e0] text-[#173d37] text-xs focus:outline-none focus:ring-1 focus:ring-[#176e56] focus:border-[#176e56]"
                  >
                    <option value="Today">Today</option>
                    <option value="Tomorrow">Tomorrow</option>
                    <option value="Next Monday">Next Monday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#173d37] mb-1.5">Time slot</label>
                  <select
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-white border border-[#dbe9e0] text-[#173d37] text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-[#176e56] focus:border-[#176e56]"
                  >
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="12:00 PM">12:00 PM</option>
                    <option value="06:00 PM">06:00 PM</option>
                    <option value="06:30 PM">06:30 PM</option>
                    <option value="07:00 PM">07:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#173d37] mb-1.5">Chief complaint</label>
                <input
                  type="text"
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  placeholder="e.g. Joint pain, Routine checkup"
                  className="w-full h-9 px-3 rounded-lg bg-white border border-[#dbe9e0] text-[#173d37] text-xs focus:outline-none focus:ring-1 focus:ring-[#176e56] focus:border-[#176e56]"
                />
              </div>

              <button
                onClick={() =>
                  handleSubmit(
                    `✅ *Appointment Confirmed – Svaasth Hospital*\n━━━━━━━━━━━━━━━━━━━━━\n👤 *Patient:* ${patientName}\n👨‍⚕️ *Doctor:* ${selectedDoctor}\n📅 *Date:* ${selectedDate}\n⏰ *Time:* ${selectedSlot}\n🏥 *Hospital:* Aarti Chowk, Nagpur Road, Wardha\n\nPlease arrive 10 minutes prior to your slot. See you soon!`
                  )
                }
                disabled={isSubmitting}
                className="w-full h-9 rounded-lg bg-[#176e56] hover:bg-[#125643] text-white font-medium text-xs transition-colors shadow-xs"
              >
                {success ? 'Confirmation sent' : 'Confirm and dispatch to WhatsApp'}
              </button>
            </>
          )}

          {/* PRESCRIPTION SENDER */}
          {actionType === 'prescription' && (
            <>
              <div className="p-3 rounded-lg bg-[#f8faf8] border border-[#e2ece6] space-y-0.5">
                <p className="font-medium text-[#173d37]">Active patient reference</p>
                <p className="text-[#55776d] tabular-nums">
                  UHID: {session.patientReference || 'CRX0077'} • Phone: +{session.phoneNumber}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#173d37] mb-1.5">
                  Official digital prescription link
                </label>
                <input
                  type="text"
                  readOnly
                  value={`https://jovial-sheep-76.convex.site/print-prescription?ref=${
                    session.patientReference || 'CRX0077'
                  }`}
                  className="w-full h-9 px-3 rounded-lg bg-[#f0f5f2] border border-[#dbe9e0] text-[#176e56] font-mono text-xs select-all"
                />
              </div>

              <button
                onClick={() =>
                  handleSubmit(
                    `💊 *Official Digital Prescription – Svaasth Hospital*\n━━━━━━━━━━━━━━━━━━━━━\nDear ${patientName},\nYour official consultation prescription is available for viewing and printing:\n\n🔗 https://jovial-sheep-76.convex.site/print-prescription?ref=${
                      session.patientReference || 'CRX0077'
                    }\n\n*Instructions:*\n• Take prescribed medications with meals as directed.\n• Maintain adequate hydration.\n• For any questions, reply here.`
                  )
                }
                disabled={isSubmitting}
                className="w-full h-9 rounded-lg bg-[#176e56] hover:bg-[#125643] text-white font-medium text-xs transition-colors shadow-xs"
              >
                {success ? 'Prescription sent' : 'Send prescription to WhatsApp'}
              </button>
            </>
          )}

          {/* SEND BILL */}
          {actionType === 'bill' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#173d37] mb-1.5">Consultation amount (₹)</label>
                  <input
                    type="number"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-white border border-[#dbe9e0] text-[#173d37] text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-[#176e56] focus:border-[#176e56]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#173d37] mb-1.5">Payment status</label>
                  <select
                    value={billStatus}
                    onChange={(e) => setBillStatus(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-lg bg-white border border-[#dbe9e0] text-[#173d37] text-xs focus:outline-none focus:ring-1 focus:ring-[#176e56] focus:border-[#176e56]"
                  >
                    <option value="PAID">Paid</option>
                    <option value="PENDING">Pending</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() =>
                  handleSubmit(
                    `🧾 *OPD Consultation Bill – Svaasth Hospital*\n━━━━━━━━━━━━━━━━━━━━━\n👤 *Patient:* ${patientName}\n💵 *Total Amount:* ₹${billAmount}\n📊 *Status:* ${billStatus}\n🏥 *Billing Desk:* Svaasth Hospital, Wardha\n\nThank you for choosing Svaasth Hospital!`
                  )
                }
                disabled={isSubmitting}
                className="w-full h-9 rounded-lg bg-[#176e56] hover:bg-[#125643] text-white font-medium text-xs transition-colors shadow-xs"
              >
                {success ? 'Bill sent' : 'Send billing receipt to WhatsApp'}
              </button>
            </>
          )}

          {/* SEND REMINDER */}
          {actionType === 'reminder' && (
            <>
              <p className="text-[#55776d]">
                Send an automated reminder to {patientName} about their upcoming OPD visit or
                medicine schedule.
              </p>

              <button
                onClick={() =>
                  handleSubmit(
                    `🔔 *Follow-up Care Reminder – Svaasth Hospital*\n━━━━━━━━━━━━━━━━━━━━━\nDear ${patientName},\nThis is a friendly reminder from Svaasth Hospital regarding your follow-up consultation with Dr. Vipeen Raut.\n\n⏰ OPD Hours: 10:30 AM – 1:00 PM & 6:00 PM – 7:30 PM\nReply *1* to confirm or *2* to reschedule.`
                  )
                }
                disabled={isSubmitting}
                className="w-full h-9 rounded-lg bg-[#176e56] hover:bg-[#125643] text-white font-medium text-xs transition-colors shadow-xs"
              >
                {success ? 'Reminder sent' : 'Send reminder to WhatsApp'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

