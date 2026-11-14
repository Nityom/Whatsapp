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
  X,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { WhatsAppSession, ChatMessage, QuickTemplate } from './types';

interface ChatThreadColumnProps {
  session?: WhatsAppSession | null;
  messages: ChatMessage[];
  onSendMessage: (
    text: string,
    attachment?: {
      fileUrl: string;
      filename: string;
      mimeType: string;
      fileSize?: string;
    }
  ) => Promise<void>;
  onSendTemplate?: (templateName: string, parameters: string[]) => Promise<void>;
  onToggleBotHandover: () => Promise<void>;
  onOpenProfile?: () => void;
  isProfileOpen?: boolean;
  isSending?: boolean;
}

export const ChatThreadColumn: React.FC<ChatThreadColumnProps> = ({
  session,
  messages,
  onSendMessage,
  onSendTemplate,
  onToggleBotHandover,
  onOpenProfile,
  isProfileOpen = false,
  isSending = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiTab, setActiveEmojiTab] = useState<'medical' | 'courtesies' | 'expressions' | 'admin'>('medical');
  const [selectedAttachment, setSelectedAttachment] = useState<{
    file: File;
    name: string;
    size: string;
    type: string;
    dataUrl: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate whether contact is outside Meta's 24-hour service window
  const lastPatientMessage = [...messages].reverse().find((m) => m.sender === 'patient');
  const lastPatientTime = lastPatientMessage?.createdAt;
  const isOutside24Hours = !lastPatientTime || Date.now() - lastPatientTime > 24 * 60 * 60 * 1000;

  // Multi-Category Emojis
  const emojiCategories = {
    medical: {
      label: '🏥 Medical',
      emojis: [
        '🏥', '🩺', '💊', '💉', '🩹', '👨‍⚕️', '👩‍⚕️', '🚑', '📋', '🩻',
        '🦷', '🧬', '🌡️', '🩸', '🧴', '🧑‍⚕️', '🩼', '🦽', '♿', '🫀', '🫁', '🧠', '👁️'
      ],
    },
    courtesies: {
      label: '👋 Courtesies',
      emojis: [
        '👋', '🙏', '👍', '🤝', '❤️', '😊', '👏', '💐', '✨', '🌟',
        '💡', '📢', '🔔', '📞', '✉️', '📍', '🏠', '⏰', '🗓️', '📅', '⏳', '🎯', '💯'
      ],
    },
    expressions: {
      label: '😊 Expressions',
      emojis: [
        '😊', '😄', '😃', '😁', '😇', '🥰', '🤗', '😌', '😷', '🤒',
        '🤕', '🥺', '🤲', '🤍', '💚', '💙', '💛', '🧡', '💜', '💖', '🕊️', '☀️', '🌸'
      ],
    },
    admin: {
      label: '🧾 Clinic & Billing',
      emojis: [
        '🧾', '💳', '💵', '💰', '✅', '❌', '⚠️', 'ℹ️', '🔒', '🏷️',
        '📌', '🔗', '📲', '💬', '🗨️', '🆗', '🆒', '🆙', '🆓', '🆕', '🔢', '🆔'
      ],
    },
  };

  const quickEmojis = ['👋', '🙏', '👍', '❤️', '🩺', '💊', '✅', '🏥', '📅', '🧾'];

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

  // Click outside listener for Emoji Picker
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  // File selection handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeInKb = Math.round(file.size / 1024);
    const sizeStr = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedAttachment({
        file,
        name: file.name,
        size: sizeStr,
        type: file.type || 'application/octet-stream',
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleInsertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !selectedAttachment) || isSending) return;

    const textToSend = inputText.trim();
    const attachmentToSend = selectedAttachment
      ? {
          fileUrl: selectedAttachment.dataUrl,
          filename: selectedAttachment.name,
          mimeType: selectedAttachment.type,
          fileSize: selectedAttachment.size,
        }
      : undefined;

    setInputText('');
    setSelectedAttachment(null);
    setShowEmojiPicker(false);

    await onSendMessage(textToSend, attachmentToSend);
  };

  const handleSelectTemplate = (templateText: string) => {
    setInputText(templateText);
    setShowTemplates(false);
    inputRef.current?.focus();
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
          Pick a chat from the left panel to review messages, reply directly, attach files, or manage patient care.
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
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        className="hidden"
      />

      {/* Header: Clickable Profile Trigger */}
      <div className="p-3.5 border-b border-[#dbe9e0] flex items-center justify-between bg-white shrink-0">
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-3 text-left p-1.5 -ml-1.5 rounded-xl hover:bg-[#f3f9f5] transition-all group cursor-pointer"
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
                {isProfileOpen ? 'Profile Open ▾' : 'View Profile ▸'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[#55776d] font-mono">+{session.phoneNumber}</span>
              {session.patientReference && (
                <span className="text-[10px] text-[#77a193] font-mono">
                  • {session.patientReference}
                </span>
              )}
            </div>
          </div>
        </button>

        {/* Bot Handover Switch Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleBotHandover}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-xs cursor-pointer ${
              isHandedOver
                ? 'bg-[#fee2e2] text-[#991b1b] border-[#fca5a5] hover:bg-[#fecaca]'
                : 'bg-[#eaf5ef] text-[#176e56] border-[#a3e2c3] hover:bg-[#d5ece0]'
            }`}
            title={
              isHandedOver
                ? 'Staff is currently handling this chat. Click to resume AI Bot.'
                : 'AI Bot is actively answering. Click to take over as human staff.'
            }
          >
            {isHandedOver ? (
              <>
                <UserCheck className="w-4 h-4 text-[#dc2626]" />
                <span>Staff Active</span>
                <span className="w-2 h-2 rounded-full bg-[#dc2626] animate-pulse"></span>
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 text-[#176e56]" />
                <span>AI Bot Active</span>
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Meta 24-Hour Policy Indicator Bar */}
      <div
        className={`px-4 py-2 border-b flex items-center justify-between text-xs transition-colors shrink-0 ${
          isOutside24Hours
            ? 'bg-[#fffbeb] border-[#fef3c7] text-[#92400e]'
            : 'bg-[#f0fdf4] border-[#dcfce7] text-[#166534]'
        }`}
      >
        <div className="flex items-center gap-2 font-medium">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isOutside24Hours ? 'bg-[#f59e0b] ring-2 ring-[#fde68a]' : 'bg-[#22c55e]'
            }`}
          />
          {isOutside24Hours ? (
            <span>
              <strong>Outside 24-Hour Window:</strong> Plain messages are restricted by Meta policy until patient replies.
            </span>
          ) : (
            <span>
              <strong>24-Hour Care Window Active:</strong> Normal text replies and staff attachments deliver directly to WhatsApp.
            </span>
          )}
        </div>
        {isOutside24Hours && onSendTemplate && (
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            className="text-[10px] bg-[#fef3c7] hover:bg-[#fde68a] text-[#78350f] px-2.5 py-1 rounded-lg font-bold transition-colors shrink-0 ml-2 shadow-2xs border border-[#fcd34d] cursor-pointer"
          >
            Send Approved Template ⚡
          </button>
        )}
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fcfdfc]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[#77a193]">
            <p>No messages recorded yet for this session.</p>
            <p className="mt-1">Send a message or attachment below to begin the conversation.</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isPatient = msg.sender === 'patient';
            const isStaff = msg.sender === 'staff';
            const isAttachment = msg.metadata?.isAttachment || msg.metadata?.fileUrl;

            return (
              <div
                key={idx}
                className={`flex flex-col ${isPatient ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl p-3.5 shadow-2xs text-xs leading-relaxed relative ${
                    isPatient
                      ? 'bg-white border border-[#dbe9e0] text-[#173d37] rounded-tl-xs'
                      : isStaff
                      ? 'bg-[#dcf3e8] border border-[#bde5cf] text-[#173d37] rounded-tr-xs'
                      : 'bg-[#eaf5ef] border border-[#cbe4d5] text-[#173d37] rounded-tr-xs'
                  }`}
                >
                  {/* ATTACHMENT CARD (If present in message) */}
                  {isAttachment && (
                    <div className="mb-2">
                      {msg.metadata?.mimeType?.startsWith('image/') ||
                      msg.metadata?.fileUrl?.startsWith('data:image/') ? (
                        <div className="rounded-xl overflow-hidden border border-[#bde5cf] bg-white">
                          <img
                            src={msg.metadata.fileUrl}
                            alt={msg.metadata.filename || 'Image Attachment'}
                            className="max-h-56 w-full object-cover"
                          />
                          <div className="p-2 flex items-center justify-between text-[11px] bg-white/90">
                            <span className="font-semibold text-[#173d37] truncate">
                              {msg.metadata.filename || 'Image'}
                            </span>
                            {msg.metadata.fileUrl && (
                              <a
                                href={msg.metadata.fileUrl}
                                download={msg.metadata.filename || 'image'}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 hover:bg-[#eaf5ef] rounded text-[#176e56]"
                                title="Open / Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-white/95 border border-[#bde5cf] flex items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#fef2f2] border border-[#fecdd3] text-[#e11d48] flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <p className="font-bold text-[#173d37] truncate text-xs">
                                {msg.metadata?.filename || 'Document.pdf'}
                              </p>
                              <p className="text-[10px] text-[#77a193]">
                                {msg.metadata?.fileSize || 'PDF Document'}
                              </p>
                            </div>
                          </div>
                          {msg.metadata?.fileUrl && (
                            <a
                              href={msg.metadata.fileUrl}
                              download={msg.metadata.filename || 'document'}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-[#eaf5ef] hover:bg-[#d5ece0] text-[#176e56] transition-colors shrink-0"
                              title="Download Attachment"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Text (Hide if identical to filename tag) */}
                  {msg.text && !msg.text.startsWith('📎 ') && (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  )}

                  <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px]">
                    <span className="text-[#77a193]">{formatMessageTime(msg.createdAt)}</span>
                    {!isPatient &&
                      (msg.metadata?.outside24h ? (
                        <span
                          className="flex items-center gap-1 text-[#b45309] bg-[#fef3c7] px-1.5 py-0.5 rounded text-[9px] font-semibold"
                          title="Patient has not messaged in >24h. Plain text blocked by Meta."
                        >
                          <span>⚠️ 24h Blocked</span>
                        </span>
                      ) : (
                        <span title="Delivered to WhatsApp">
                          <CheckCheck className="w-3.5 h-3.5 text-[#54a987]" />
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Bar (Reply & Templates) */}
      <div className="px-3.5 py-1.5 bg-white border-t border-[#edf5f0] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f9f5] hover:bg-[#eaf5ef] text-[#176e56] text-xs font-semibold transition-all border border-[#dbe9e0] cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Templates</span>
          </button>
        </div>

        {/* Quick Reaction Emojis Row (1-click insert) */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleInsertEmoji(emoji)}
              className="w-7 h-7 flex items-center justify-center hover:bg-[#f3f9f5] rounded-lg text-sm transition-transform hover:scale-120 cursor-pointer"
              title={`Insert ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Templates Drawer */}
      {showTemplates && (
        <div className="p-3 bg-[#f8faf8] border-t border-[#dbe9e0] space-y-2 max-h-56 overflow-y-auto animate-in slide-in-from-bottom-2 duration-150 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#173d37] uppercase tracking-wider">
              Quick Reply Templates
            </span>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-[#77a193] hover:text-[#173d37] text-xs cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {quickTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTemplate(t.text)}
                className="p-2.5 rounded-xl bg-white border border-[#dbe9e0] hover:border-[#176e56] hover:bg-[#eaf5ef] text-left transition-all group cursor-pointer"
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

      {/* MULTI-CATEGORY EMOJI PICKER POPOVER */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-16 left-4 z-50 bg-white border border-[#c2e4cf] rounded-2xl shadow-xl w-72 sm:w-80 overflow-hidden animate-in zoom-in-95 duration-150"
        >
          {/* Header & Tabs */}
          <div className="p-2.5 bg-[#f8faf8] border-b border-[#e2ece5] flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#176e56]">
              <Smile className="w-3.5 h-3.5" />
              <span>Choose Emoji</span>
            </div>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="p-1 rounded-md text-[#55776d] hover:bg-[#eaf5ef] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Category Tabs */}
          <div className="grid grid-cols-4 p-1 bg-[#f4f8f5] border-b border-[#e2ece5] text-[10px]">
            {(Object.keys(emojiCategories) as Array<keyof typeof emojiCategories>).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveEmojiTab(cat)}
                className={`py-1 rounded-md font-semibold text-center transition-colors cursor-pointer ${
                  activeEmojiTab === cat
                    ? 'bg-white text-[#176e56] shadow-2xs'
                    : 'text-[#55776d] hover:text-[#173d37]'
                }`}
              >
                {emojiCategories[cat].label.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Emojis Grid */}
          <div className="p-3 max-h-48 overflow-y-auto">
            <p className="text-[10px] font-bold text-[#77a193] uppercase tracking-wider mb-2">
              {emojiCategories[activeEmojiTab].label}
            </p>
            <div className="grid grid-cols-6 sm:grid-cols-7 gap-1">
              {emojiCategories[activeEmojiTab].emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleInsertEmoji(emoji)}
                  className="w-8 h-8 rounded-lg hover:bg-[#eaf5ef] flex items-center justify-center text-lg transition-transform hover:scale-120 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ATTACHMENT PREVIEW CHIP (Above Input Bar) */}
      {selectedAttachment && (
        <div className="p-2.5 px-4 bg-[#eaf5ef] border-t border-[#c2e4cf] flex items-center justify-between text-xs animate-in slide-in-from-bottom-2 duration-150 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white border border-[#c2e4cf] flex items-center justify-center text-[#176e56] shrink-0 shadow-2xs">
              {selectedAttachment.type.startsWith('image/') ? (
                <ImageIcon className="w-4 h-4 text-[#176e56]" />
              ) : (
                <FileText className="w-4 h-4 text-[#e11d48]" />
              )}
            </div>
            <div className="truncate">
              <p className="font-bold text-[#173d37] truncate">{selectedAttachment.name}</p>
              <p className="text-[10px] text-[#55776d]">
                {selectedAttachment.size} • Attached for WhatsApp
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedAttachment(null)}
            className="p-1 rounded-lg text-[#55776d] hover:text-[#b91c1c] hover:bg-white transition-colors cursor-pointer"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bottom Message Input Bar */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-white border-t border-[#dbe9e0] flex items-center gap-2 shrink-0"
      >
        {/* Emoji Button */}
        <button
          type="button"
          title="Open Emoji Picker"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            showEmojiPicker
              ? 'bg-[#176e56] text-white shadow-2xs'
              : 'text-[#55776d] hover:text-[#176e56] hover:bg-[#f3f9f5]'
          }`}
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Paperclip Attachment Button */}
        <button
          type="button"
          title="Attach Document or Image"
          onClick={() => fileInputRef.current?.click()}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            selectedAttachment
              ? 'bg-[#eaf5ef] text-[#176e56] ring-2 ring-[#54a987]'
              : 'text-[#55776d] hover:text-[#176e56] hover:bg-[#f3f9f5]'
          }`}
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          placeholder={selectedAttachment ? 'Add a caption for this file (optional)...' : 'Type a message...'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-xs text-[#173d37] placeholder-[#77a193] focus:outline-none focus:border-[#54a987] focus:bg-white transition-all font-medium"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={(!inputText.trim() && !selectedAttachment) || isSending}
          className="w-10 h-10 rounded-xl bg-[#176e56] hover:bg-[#125643] disabled:opacity-50 text-white flex items-center justify-center transition-all shadow-xs shrink-0 cursor-pointer"
          title="Send message or attachment"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
