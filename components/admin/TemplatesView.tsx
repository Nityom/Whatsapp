'use client';

import React, { useState } from 'react';
import { FileText, Copy, Check, Plus, Sparkles, Send } from 'lucide-react';
import { QuickTemplate } from './types';

interface TemplatesViewProps {
  onUseTemplate: (text: string) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({ onUseTemplate }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const templates: QuickTemplate[] = [
    {
      id: 'tmpl-1',
      title: 'Appointment Confirmation',
      category: 'appointment',
      text: '✅ *Appointment Confirmed – Svaasth Hospital*\n━━━━━━━━━━━━━━━━━━━━━\nDear {patient_name}, your appointment with Dr. Vipeen Raut is confirmed for tomorrow at 10:30 AM.\n📍 Aarti Chowk, Nagpur Road, Wardha\n\nPlease arrive 10 minutes before your slot.',
    },
    {
      id: 'tmpl-2',
      title: 'Digital Prescription Link',
      category: 'prescription',
      text: '💊 *Digital Prescription – Svaasth Hospital*\n━━━━━━━━━━━━━━━━━━━━━\nDear {patient_name}, your official digital prescription has been issued by Dr. Raut.\n🔗 View/Download: https://jovial-sheep-76.convex.site/print-prescription?ref={reference}\n\nTake medications on time and feel better soon!',
    },
    {
      id: 'tmpl-3',
      title: 'OPD Timings & Schedule',
      category: 'general',
      text: '🏥 *Svaasth Hospital OPD Timings:*\n• Mon to Sat: 10:30 AM – 1:00 PM & 6:00 PM – 7:30 PM\n• Sunday: Closed (Emergency Casualty open 24/7)\n📞 Helpline: 07152-255795 / +91 9373280505',
    },
    {
      id: 'tmpl-4',
      title: 'Follow-up Consultation Reminder',
      category: 'reminder',
      text: '🔔 *Follow-up Reminder – Svaasth Hospital*\n━━━━━━━━━━━━━━━━━━━━━\nDear {patient_name}, this is a reminder for your upcoming follow-up checkup with Dr. Shillpa Raut. Timely follow-ups ensure seamless recovery.\nReply 1 to confirm your presence.',
    },
    {
      id: 'tmpl-5',
      title: 'Free Joint & Ortho Camp Alert',
      category: 'general',
      text: '🌟 *Special Bone & Joint Camp Notice*\n\nSvaasth Hospital invites you to our Complimentary Joint & Bone Health Checkup Camp this Thursday from 6:00 PM to 7:30 PM.\nConsult Dr. Vipeen Raut and receive free mobility assessment.\nReply YES to reserve your free token.',
    },
    {
      id: 'tmpl-6',
      title: 'Consultation Fee Receipt',
      category: 'billing',
      text: '🧾 *Receipt – Svaasth Hospital*\n━━━━━━━━━━━━━━━━━━━━━\nPatient: {patient_name}\nConsultation: ₹400\nPayment: Confirmed (Cash / UPI)\nThank you for trusting Svaasth Hospital with your care.',
    },
  ];

  const filtered =
    selectedCategory === 'all'
      ? templates
      : templates.filter((t) => t.category === selectedCategory);

  const handleCopy = (t: QuickTemplate) => {
    navigator.clipboard.writeText(t.text);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#173d37]">WhatsApp Message Templates</h2>
          <p className="text-xs text-[#55776d] mt-1">
            Pre-approved message templates for instant patient replies and broadcasts.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {['all', 'appointment', 'prescription', 'billing', 'reminder', 'general'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full font-semibold capitalize transition-all ${
                selectedCategory === cat
                  ? 'bg-[#176e56] text-white shadow-xs'
                  : 'bg-white border border-[#dbe9e0] text-[#55776d] hover:bg-[#eaf5ef]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((tmpl) => (
          <div
            key={tmpl.id}
            className="p-5 rounded-2xl bg-white border border-[#dbe9e0] shadow-xs hover:border-[#54a987] hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#eaf5ef] text-[#176e56]">
                  {tmpl.category}
                </span>
                <span className="text-[10px] text-[#77a193]">Verified</span>
              </div>
              <h3 className="text-sm font-bold text-[#173d37] mb-2">{tmpl.title}</h3>
              <div className="p-3 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-xs font-mono text-[#173d37] whitespace-pre-wrap leading-relaxed line-clamp-6">
                {tmpl.text}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#dbe9e0]">
              <button
                onClick={() => handleCopy(tmpl)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#55776d] hover:text-[#176e56] transition-colors"
              >
                {copiedId === tmpl.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#176e56]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onUseTemplate(tmpl.text)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#eaf5ef] hover:bg-[#176e56] hover:text-white text-[#176e56] text-xs font-bold transition-all"
              >
                <Send className="w-3 h-3" />
                <span>Use in Chat</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
