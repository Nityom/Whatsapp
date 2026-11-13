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
      <div className="bg-white border border-[#dbe9e0] rounded-3xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#dbe9e0] flex items-center justify-between bg-[#f8faf8]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#eaf5ef] text-[#176e56] flex items-center justify-center">
              {actionType === 'appointment' && <Calendar className="w-4 h-4" />}
              {actionType === 'prescription' && <FileText className="w-4 h-4" />}
              {actionType === 'bill' && <CreditCard className="w-4 h-4" />}
              {actionType === 'reminder' && <Bell className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#173d37]">
                {actionType === 'appointment' && 'Book Appointment'}
                {actionType === 'prescription' && 'Send Official Prescription'}
                {actionType === 'bill' && 'Send Consultation Bill'}
                {actionType === 'reminder' && 'Send Follow-up Reminder'}
              </h3>
              <p className="text-[11px] text-[#55776d]">Patient: {patientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#55776d] hover:bg-[#eaf5ef] text-xs"
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
                <label className="block font-bold text-[#173d37] mb-1">Select Doctor</label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-[#173d37] font-medium"
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
                  <label className="block font-bold text-[#173d37] mb-1">Date</label>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-[#173d37]"
                  >
                    <option value="Today">Today</option>
                    <option value="Tomorrow">Tomorrow</option>
                    <option value="Next Monday">Next Monday</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#173d37] mb-1">Time Slot (15-min)</label>
                  <select
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-[#173d37]"
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
                <label className="block font-bold text-[#173d37] mb-1">Chief Complaint</label>
                <input
                  type="text"
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  placeholder="e.g. Joint pain, Routine checkup"
                  className="w-full p-2.5 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-[#173d37]"
                />
              </div>

              <button
                onClick={() =>
                  handleSubmit(
                    `✅ *Appointment Confirmed – Svaasth Hospital*\n━━━━━━━━━━━━━━━━━━━━━\n👤 *Patient:* ${patientName}\n👨‍⚕️ *Doctor:* ${selectedDoctor}\n📅 *Date:* ${selectedDate}\n⏰ *Time:* ${selectedSlot}\n🏥 *Hospital:* Aarti Chowk, Nagpur Road, Wardha\n\nPlease arrive 10 minutes prior to your slot. See you soon!`
                  )
                }
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-[#176e56] hover:bg-[#125643] text-white font-bold transition-all shadow-xs"
              >
                {success ? 'Confirmation Sent!' : 'Confirm & Dispatch to WhatsApp'}
              </button>
            </>
          )}

          {/* PRESCRIPTION SENDER */}
          {actionType === 'prescription' && (
            <>
              <div className="p-3 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] space-y-1">
                <p className="font-semibold text-[#173d37]">Active Patient Reference</p>
                <p className="text-[#55776d]">
                  UHID: {session.patientReference || 'CRX0077'} • Phone: +{session.phoneNumber}
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#173d37] mb-1">
                  Official Digital Prescription Link
                </label>
                <input
                  type="text"
                  readOnly
                  value={`https://jovial-sheep-76.convex.site/print-prescription?ref=${
                    session.patientReference || 'CRX0077'
                  }`}
                  className="w-full p-2.5 rounded-xl bg-[#f3f9f5] border border-[#dbe9e0] text-[#176e56] font-mono select-all"
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
                className="w-full py-2.5 rounded-xl bg-[#176e56] hover:bg-[#125643] text-white font-bold transition-all shadow-xs"
              >
                {success ? 'Prescription Sent!' : 'Send Prescription to WhatsApp'}
              </button>
            </>
          )}

          {/* SEND BILL */}
          {actionType === 'bill' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#173d37] mb-1">Consultation Amount (₹)</label>
                  <input
                    type="number"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-[#173d37]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#173d37] mb-1">Payment Status</label>
                  <select
                    value={billStatus}
                    onChange={(e) => setBillStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-[#173d37]"
                  >
                    <option value="PAID">PAID</option>
                    <option value="PENDING">PENDING</option>
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
                className="w-full py-2.5 rounded-xl bg-[#176e56] hover:bg-[#125643] text-white font-bold transition-all shadow-xs"
              >
                {success ? 'Bill Sent!' : 'Send Billing Receipt to WhatsApp'}
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
                className="w-full py-2.5 rounded-xl bg-[#176e56] hover:bg-[#125643] text-white font-bold transition-all shadow-xs"
              >
                {success ? 'Reminder Sent!' : 'Send Reminder to WhatsApp'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
