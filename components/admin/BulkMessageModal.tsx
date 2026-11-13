'use client';

import React, { useState } from 'react';
import { X, Send, Users, Sparkles, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { WhatsAppSession } from './types';

interface BulkMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: WhatsAppSession[];
  onSendBulk: (
    phoneNumbers: string[],
    text: string,
    campaignTitle: string,
    targetAudience: string
  ) => Promise<void>;
}

export const BulkMessageModal: React.FC<BulkMessageModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onSendBulk,
}) => {
  const [audience, setAudience] = useState<'all' | 'patients' | 'leads'>('all');
  const [campaignTitle, setCampaignTitle] = useState('Hospital Announcement');
  const [messageText, setMessageText] = useState(
    '🏥 *Svaasth Hospital Notice*\n\nDear {patient_name}, our OPD clinic is open Monday to Saturday from 10:30 AM to 1:00 PM and 6:00 PM to 7:30 PM. For appointments or inquiries, reply to this chat.'
  );
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  // Filter recipient phone numbers based on audience selection
  const getRecipientPhones = () => {
    let target = sessions;
    if (audience === 'patients') {
      target = sessions.filter((s) => s.tags?.includes('Patient') || s.patientReference);
    } else if (audience === 'leads') {
      target = sessions.filter((s) => s.tags?.includes('Lead') && !s.patientReference);
    }
    // Fallback if target is empty, use all sessions
    const phones = target.map((s) => s.phoneNumber);
    return Array.from(new Set(phones.length > 0 ? phones : sessions.map((s) => s.phoneNumber)));
  };

  const recipientCount = getRecipientPhones().length;

  const templates = [
    {
      title: 'OPD Schedule Update',
      text: '🏥 *Svaasth Hospital Announcement*\n\nDear {patient_name}, our regular OPD timings are:\n• Mon to Sat: 10:30 AM – 1:00 PM & 6:00 PM – 7:30 PM\n• Sunday: Closed (Emergency triage available)\n\nConsult Dr. Vipeen Raut (Orthopaedics) & Dr. Shillpa Raut (Gynecology).\nReply 1 to book your slot!',
    },
    {
      title: 'Free Health Checkup Camp',
      text: '🌟 *Free Joint & Bone Health Checkup Camp*\n\nSvaasth Hospital is organizing a complimentary Joint & Bone Health Camp this Thursday from 6:00 PM to 7:30 PM at Aarti Chowk, Wardha.\n\nFree BMD screening & doctor consultation.\nReply YES to register for free!',
    },
    {
      title: 'Holiday Notice',
      text: '🏥 *Holiday Notice – Svaasth Hospital*\n\nDear patient, please note our OPD will remain closed tomorrow on account of public holiday. Emergency & Casualty services remain active 24/7 at +91 9373280505.\n\nWe wish you great health!',
    },
    {
      title: 'Follow-up Care Reminder',
      text: '🩺 *Health Reminder from Svaasth Hospital*\n\nDear {patient_name}, routine health checkups and timely follow-ups ensure faster healing and peace of mind. To review your prescription or consult Dr. Raut, reply to this message.',
    },
  ];

  const handleApplyTemplate = (tmpl: (typeof templates)[0]) => {
    setCampaignTitle(tmpl.title);
    setMessageText(tmpl.text);
  };

  const insertVariable = (variable: string) => {
    setMessageText((prev) => `${prev} ${variable}`);
  };

  const handleSend = async () => {
    if (!messageText.trim() || isSending) return;
    setIsSending(true);
    const phones = getRecipientPhones();
    try {
      await onSendBulk(phones, messageText, campaignTitle, audience);
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        setIsSending(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setIsSending(false);
    }
  };

  // Preview formatted message replacing {patient_name} with sample name
  const previewText = messageText.replace('{patient_name}', 'Rohit Patil');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-[#dbe9e0] rounded-3xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#dbe9e0] flex items-center justify-between bg-[#f8faf8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eaf5ef] text-[#176e56] flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#173d37]">Send Bulk WhatsApp Broadcast</h2>
              <p className="text-xs text-[#55776d]">
                Broadcast official updates, clinic schedules, or camp alerts to your patients.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#55776d] hover:text-[#173d37] hover:bg-[#eaf5ef] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left Form: 3 cols */}
          <div className="md:col-span-3 space-y-4">
            {/* Audience Picker */}
            <div>
              <label className="block text-xs font-bold text-[#173d37] uppercase tracking-wider mb-2">
                1. Select Target Audience
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAudience('all')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                    audience === 'all'
                      ? 'bg-[#eaf5ef] border-[#176e56] text-[#176e56] shadow-xs'
                      : 'bg-white border-[#dbe9e0] text-[#55776d] hover:bg-[#f8faf8]'
                  }`}
                >
                  <p>All Contacts</p>
                  <span className="text-[10px] text-[#77a193] font-normal">
                    ({sessions.length} chats)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAudience('patients')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                    audience === 'patients'
                      ? 'bg-[#eaf5ef] border-[#176e56] text-[#176e56] shadow-xs'
                      : 'bg-white border-[#dbe9e0] text-[#55776d] hover:bg-[#f8faf8]'
                  }`}
                >
                  <p>Patients Only</p>
                  <span className="text-[10px] text-[#77a193] font-normal">Registered</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAudience('leads')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                    audience === 'leads'
                      ? 'bg-[#eaf5ef] border-[#176e56] text-[#176e56] shadow-xs'
                      : 'bg-white border-[#dbe9e0] text-[#55776d] hover:bg-[#f8faf8]'
                  }`}
                >
                  <p>New Leads</p>
                  <span className="text-[10px] text-[#77a193] font-normal">Inquiries</span>
                </button>
              </div>
            </div>

            {/* Campaign Name */}
            <div>
              <label className="block text-xs font-bold text-[#173d37] uppercase tracking-wider mb-1.5">
                2. Campaign Title
              </label>
              <input
                type="text"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                placeholder="e.g. Health Checkup Camp Notice"
                className="w-full px-3.5 py-2 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-xs text-[#173d37] focus:outline-none focus:border-[#54a987] focus:bg-white transition-all font-medium"
              />
            </div>

            {/* Quick Template Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#173d37] uppercase tracking-wider">
                  3. Pre-Approved Templates
                </label>
                <span className="text-[11px] text-[#77a193]">Click to load</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplyTemplate(t)}
                    className="px-2.5 py-1 rounded-lg bg-[#f3f9f5] hover:bg-[#eaf5ef] text-[#176e56] text-[11px] font-semibold border border-[#dbe9e0] transition-colors"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Composer */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#173d37] uppercase tracking-wider">
                  4. Message Content
                </label>
                <span className="text-[11px] text-[#77a193]">
                  {messageText.length} characters
                </span>
              </div>
              <textarea
                rows={5}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Write your broadcast message..."
                className="w-full p-3 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-xs text-[#173d37] focus:outline-none focus:border-[#54a987] focus:bg-white transition-all resize-none leading-relaxed"
              />

              {/* Variable Buttons */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-[#55776d]">Insert:</span>
                <button
                  type="button"
                  onClick={() => insertVariable('{patient_name}')}
                  className="px-2 py-0.5 rounded bg-[#f3f9f5] text-[#176e56] text-[10px] font-mono font-bold hover:bg-[#eaf5ef] border border-[#dbe9e0]"
                >
                  {'{patient_name}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('Dr. Vipeen Raut')}
                  className="px-2 py-0.5 rounded bg-[#f3f9f5] text-[#176e56] text-[10px] font-bold hover:bg-[#eaf5ef] border border-[#dbe9e0]"
                >
                  Dr. Raut
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('Dr. Shillpa Raut')}
                  className="px-2 py-0.5 rounded bg-[#f3f9f5] text-[#176e56] text-[10px] font-bold hover:bg-[#eaf5ef] border border-[#dbe9e0]"
                >
                  Dr. Shillpa
                </button>
              </div>
            </div>
          </div>

          {/* Right Live WhatsApp Preview: 2 cols */}
          <div className="md:col-span-2 flex flex-col">
            <label className="block text-xs font-bold text-[#173d37] uppercase tracking-wider mb-2">
              WhatsApp Live Preview
            </label>
            <div className="flex-1 rounded-2xl bg-[#f4f7f5] border border-[#dbe9e0] p-4 flex flex-col justify-between shadow-inner">
              <div className="bg-white rounded-2xl p-3.5 border border-[#dbe9e0] shadow-xs text-xs leading-relaxed text-[#173d37] rounded-tl-xs">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#176e56] mb-1.5">
                  <Sparkles className="w-3 h-3 text-[#54a987]" />
                  <span>Svaasth Hospital Broadcast</span>
                </div>
                <p className="whitespace-pre-wrap">{previewText}</p>
                <div className="flex items-center justify-end text-[10px] text-[#77a193] mt-2">
                  <span>Just now</span>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-white border border-[#dbe9e0] text-center">
                <p className="text-xs font-semibold text-[#173d37]">Recipients</p>
                <p className="text-lg font-bold text-[#176e56]">{recipientCount}</p>
                <p className="text-[10px] text-[#77a193]">Verified WhatsApp numbers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#dbe9e0] bg-[#f8faf8] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#55776d]">
            <AlertCircle className="w-4 h-4 text-[#54a987]" />
            <span>Messages are logged to individual chat threads.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#55776d] hover:bg-[#eaf5ef] transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleSend}
              disabled={isSending || recipientCount === 0 || !messageText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#176e56] hover:bg-[#125643] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
            >
              {sentSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-[#77d1a5]" />
                  <span>Broadcast Sent!</span>
                </>
              ) : isSending ? (
                <span>Sending to {recipientCount} contacts...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Broadcast to {recipientCount} Contacts</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

