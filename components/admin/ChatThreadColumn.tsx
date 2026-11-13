'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  FolderArchive,
  UserCheck,
  CheckCheck,
  Bot,
  User,
  Sparkles,
  FileText,
  Reply,
  Play,
  Pause,
  UserCircle,
} from 'lucide-react';
import { WhatsAppSession, ChatMessage, QuickTemplate } from './types';

interface ChatThreadColumnProps {
  session?: WhatsAppSession | null;
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onToggleBotHandover: () => Promise<void>;
  onOpenProfile?: () => void;
  isProfileOpen?: boolean;
  isSending?: boolean;
}

export const ChatThreadColumn: React.FC<ChatThreadColumnProps> = ({
  session,
  messages,
  onSendMessage,
  onToggleBotHandover,
  onOpenProfile,
  isProfileOpen = false,
  isSending = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickTemplates: QuickTemplate[] = [
    {
      id: 'confirm-appt',
      title: 'Appointment Confirmed',
      category: 'appointment',
      text: '✅ Done! Your appointment with Dr. Raut is confirmed for tomorrow. You will receive a reminder on WhatsApp.',
    },
    {
      id: 'opd-timings',
      title: 'OPD Clinic Timings',
      category: 'general',
      text: '🏥 Svaasth Hospital OPD Timings:\nMon to Sat: 10:30 AM – 1:00 PM & 6:00 PM – 7:30 PM\nSunday: Closed (Casualty on-call).',
    },
    {
      id: 'rx-link',
      title: 'Prescription Ready',
      category: 'prescription',
      text: '💊 Your digital prescription from Dr. Vipeen Raut is ready. View and download your official document here: https://jovial-sheep-76.convex.site/print-prescription?ref=CRX0077',
    },
    {
      id: 'reminder-tomorrow',
      title: 'Follow-up Reminder',
      category: 'reminder',
      text: '🔔 Friendly reminder from Svaasth Hospital: You have an upcoming follow-up appointment scheduled for tomorrow. Please reply YES to confirm.',
    },
    {
      id: 'bill-details',
      title: 'Billing Receipt',
      category: 'billing',
      text: '🧾 Your OPD consultation bill has been generated. Total Amount: ₹400. Status: PAID. Thank you for choosing Svaasth Hospital!',
    },
  ];

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;
    const textToSend = inputText.trim();
    setInputText('');
    await onSendMessage(textToSend);
  };

  const handleSelectTemplate = (templateText: string) => {
    setInputText(templateText);
    setShowTemplates(false);
  };

  const formatMessageTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!session) {
    return (
      <div className="flex-1 bg-white border border-[#dbe9e0] rounded-2xl flex flex-col items-center justify-center h-[740px] text-center p-8 shadow-xs">
        <div className="w-16 h-16 rounded-full bg-[#eaf5ef] text-[#176e56] flex items-center justify-center mb-4">
          <Bot className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-[#173d37]">Select a Conversation</h3>
        <p className="text-xs text-[#55776d] mt-1 max-w-sm">
          Pick a chat from the left panel to review messages, reply directly, or manage the patient.
        </p>
      </div>
    );
  }

  const initials = session.patientName
    ? session.patientName.slice(0, 2).toUpperCase()
    : session.phoneNumber.slice(-2);

  const isHandedOver = session.isHandedOver ?? false;

  return (
    <div className="flex-1 bg-white border border-[#dbe9e0] rounded-2xl flex flex-col h-[740px] shadow-xs overflow-hidden relative">
      {/* Header: Clickable Profile Trigger */}
      <div className="p-3.5 border-b border-[#dbe9e0] flex items-center justify-between bg-white shrink-0">
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-3 text-left p-1.5 -ml-1.5 rounded-xl hover:bg-[#f3f9f5] transition-all group"
          title="Click to view patient profile & actions"
        >
          <div className="w-10 h-10 rounded-full bg-[#ede9fe] text-[#6d28d9] font-bold text-xs flex items-center justify-center shrink-0 group-hover:ring-2 group-hover:ring-[#54a987] transition-all">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#173d37] leading-tight group-hover:text-[#176e56] transition-colors">
                {session.patientName || `+${session.phoneNumber}`}
              </h2>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors ${
                  isProfileOpen
                    ? 'bg-[#176e56] text-white'
                    : 'bg-[#eaf5ef] text-[#176e56] group-hover:bg-[#176e56] group-hover:text-white'
                }`}
              >
                Profile {isProfileOpen ? '✕' : '↗'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#176e56]"></span>
              <span className="text-[11px] font-medium text-[#55776d]">
                WhatsApp Customer • +{session.phoneNumber}
              </span>
            </div>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Bot / Handover Toggle Pill */}
          <button
            onClick={onToggleBotHandover}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              isHandedOver
                ? 'bg-[#fff5f5] text-[#b91c1c] border-[#fecaca] hover:bg-[#fee2e2]'
                : 'bg-[#eaf5ef] text-[#176e56] border-[#c2e4cf] hover:bg-[#d9efe2]'
            }`}
            title={isHandedOver ? 'Click to resume AI Bot' : 'Click to pause AI Bot and take over'}
          >
            {isHandedOver ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Bot Paused (Staff)</span>
              </>
            ) : (
              <>
                <Bot className="w-3.5 h-3.5" />
                <span>Bot Active</span>
              </>
            )}
          </button>

          <button
            title="Archive"
            className="p-2 rounded-lg text-[#55776d] hover:text-[#176e56] hover:bg-[#f3f9f5] transition-colors"
          >
            <FolderArchive className="w-4 h-4" />
          </button>
          <button
            title="Assign agent"
            className="p-2 rounded-lg text-[#55776d] hover:text-[#176e56] hover:bg-[#f3f9f5] transition-colors"
          >
            <UserCheck className="w-4 h-4" />
          </button>
          <button
            title="More options"
            className="p-2 rounded-lg text-[#55776d] hover:text-[#176e56] hover:bg-[#f3f9f5] transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fcfdfc]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[#77a193]">
            <p>No messages recorded yet for this session.</p>
            <p className="mt-1">Send a message below to begin the conversation.</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isPatient = msg.sender === 'patient';
            const isStaff = msg.sender === 'staff';
            const isAssistant = msg.sender === 'assistant';

            return (
              <div
                key={idx}
                className={`flex flex-col ${isPatient ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl p-3.5 shadow-2xs text-xs leading-relaxed relative ${
                    isPatient
                      ? 'bg-white border border-[#dbe9e0] text-[#173d37] rounded-tl-xs'
                      : isStaff
                      ? 'bg-[#dcf3e8] border border-[#bde5cf] text-[#173d37] rounded-tr-xs'
                      : 'bg-[#eaf5ef] border border-[#cbe4d5] text-[#173d37] rounded-tr-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#77a193]">
                    <span>{formatMessageTime(msg.createdAt)}</span>
                    {!isPatient && <CheckCheck className="w-3.5 h-3.5 text-[#54a987]" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Bar (Reply & Templates) */}
      <div className="px-3.5 py-2 bg-white border-t border-[#dbe9e0] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f9f5] hover:bg-[#eaf5ef] text-[#176e56] text-xs font-semibold transition-all border border-[#dbe9e0]"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Templates</span>
          </button>

          <button
            onClick={() => {
              setInputText('Sure! ');
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f9f5] hover:bg-[#eaf5ef] text-[#176e56] text-xs font-semibold transition-all border border-[#dbe9e0]"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>
        </div>
      </div>

      {/* Templates Drawer / Popover */}
      {showTemplates && (
        <div className="p-3.5 bg-[#f8faf8] border-t border-[#dbe9e0] space-y-2 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between text-xs font-bold text-[#173d37] pb-1">
            <span>Select a pre-approved message template:</span>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-[#77a193] hover:text-[#173d37]"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {quickTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTemplate(t.text)}
                className="p-2.5 rounded-xl bg-white border border-[#dbe9e0] hover:border-[#176e56] hover:bg-[#eaf5ef] text-left transition-all group"
              >
                <p className="text-xs font-bold text-[#173d37] group-hover:text-[#176e56]">
                  {t.title}
                </p>
                <p className="text-[11px] text-[#55776d] line-clamp-1 mt-0.5">{t.text}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Message Input Bar */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-white border-t border-[#dbe9e0] flex items-center gap-2 shrink-0"
      >
        <button
          type="button"
          title="Insert emoji"
          onClick={() => setInputText((prev) => prev + ' 👋')}
          className="p-2 text-[#55776d] hover:text-[#176e56] hover:bg-[#f3f9f5] rounded-xl transition-colors"
        >
          <Smile className="w-5 h-5" />
        </button>

        <button
          type="button"
          title="Attach file"
          className="p-2 text-[#55776d] hover:text-[#176e56] hover:bg-[#f3f9f5] rounded-xl transition-colors"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <input
          type="text"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-xs text-[#173d37] placeholder-[#77a193] focus:outline-none focus:border-[#54a987] focus:bg-white transition-all"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="w-10 h-10 rounded-xl bg-[#176e56] hover:bg-[#125643] disabled:opacity-50 text-white flex items-center justify-center transition-all shadow-xs shrink-0"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
