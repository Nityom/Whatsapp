'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Send,
  Users,
  Search,
  Check,
  CheckCheck,
  Sparkles,
  User,
  Clock,
  Edit2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { WhatsAppSession } from './types';

interface SendTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateText: string;
  templateTitle?: string;
  sessions: WhatsAppSession[];
  activePhone?: string | null;
  onSend: (
    phoneNumbers: string[],
    text: string,
    openFirstChat?: boolean
  ) => Promise<void>;
}

export const SendTemplateModal: React.FC<SendTemplateModalProps> = ({
  isOpen,
  onClose,
  templateText,
  templateTitle,
  sessions,
  activePhone,
  onSend,
}) => {
  const [editedText, setEditedText] = useState(templateText);
  const [isEditingText, setIsEditingText] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [isSentSuccess, setIsSentSuccess] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  // Sync editedText whenever templateText changes
  useEffect(() => {
    setEditedText(templateText);
    setIsEditingText(false);
    setIsSentSuccess(false);
  }, [templateText, isOpen]);

  // If there's an activePhone, pre-select it when modal opens
  useEffect(() => {
    if (isOpen) {
      if (activePhone) {
        setSelectedPhones(new Set([activePhone.replace(/\D/g, '')]));
      } else if (sessions.length > 0) {
        setSelectedPhones(new Set([sessions[0].phoneNumber.replace(/\D/g, '')]));
      }
    }
  }, [isOpen, activePhone, sessions]);

  // Filtered contacts based on search query
  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => {
      const name = (s.patientName || '').toLowerCase();
      const phone = s.phoneNumber.replace(/\D/g, '');
      const ref = (s.patientReference || '').toLowerCase();
      const lastMsg = (s.lastMessage || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || ref.includes(q) || lastMsg.includes(q);
    });
  }, [sessions, searchQuery]);

  // Find active session
  const activeSession = useMemo(() => {
    if (!activePhone) return null;
    const cleanActive = activePhone.replace(/\D/g, '');
    return sessions.find((s) => s.phoneNumber.replace(/\D/g, '') === cleanActive) || null;
  }, [sessions, activePhone]);

  if (!isOpen) return null;

  // Toggle selection for a contact
  const toggleContact = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(clean)) {
        next.delete(clean);
      } else {
        next.add(clean);
      }
      return next;
    });
  };

  // Select all visible contacts
  const handleSelectAll = () => {
    const allPhones = filteredSessions.map((s) => s.phoneNumber.replace(/\D/g, ''));
    setSelectedPhones(new Set(allPhones));
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedPhones(new Set());
  };

  // Send message to selected contacts
  const handleDispatch = async (phonesToSend: string[], openFirstChat: boolean = false) => {
    if (phonesToSend.length === 0 || isSending) return;
    setIsSending(true);

    try {
      await onSend(phonesToSend, editedText, openFirstChat);
      setSentCount(phonesToSend.length);
      setIsSentSuccess(true);
      setTimeout(() => {
        setIsSentSuccess(false);
        onClose();
      }, 1400);
    } catch (err) {
      console.error('[Send Template Error]', err);
    } finally {
      setIsSending(false);
    }
  };

  const selectedCount = selectedPhones.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-[#dbe9e0] shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-[#dbe9e0] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eaf5ef] text-[#176e56] flex items-center justify-center shadow-xs">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#173d37]">
                Where to send this template?
              </h3>
              <p className="text-xs text-[#55776d]">
                {templateTitle ? `Template: ${templateTitle} • ` : ''}Select one or multiple recent patient contacts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#55776d] hover:text-[#173d37] hover:bg-[#f3f9f5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* SUCCESS BANNER */}
          {isSentSuccess ? (
            <div className="bg-[#eaf5ef] border border-[#77d1a5] rounded-2xl p-6 text-center space-y-2 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-[#176e56] text-white flex items-center justify-center mx-auto shadow-sm">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h4 className="text-base font-bold text-[#173d37]">
                Dispatched Successfully!
              </h4>
              <p className="text-xs text-[#55776d]">
                Template message sent to {sentCount} patient contact{sentCount > 1 ? 's' : ''}. AI bot paused for staff handover.
              </p>
            </div>
          ) : (
            <>
              {/* 1. TEMPLATE PREVIEW & OPTIONAL EDIT */}
              <div className="bg-[#f8faf8] border border-[#dbe9e0] rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#176e56] bg-[#eaf5ef] px-2.5 py-0.5 rounded-full">
                      Message Content
                    </span>
                    {templateTitle && (
                      <span className="text-xs font-semibold text-[#173d37]">
                        {templateTitle}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setIsEditingText(!isEditingText)}
                    className="flex items-center gap-1 text-xs font-semibold text-[#176e56] hover:underline"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{isEditingText ? 'Done Editing' : 'Customize Text'}</span>
                  </button>
                </div>

                {isEditingText ? (
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    rows={4}
                    className="w-full text-xs font-mono bg-white border border-[#54a987] rounded-xl p-3 text-[#173d37] focus:outline-none focus:ring-2 focus:ring-[#176e56]"
                    placeholder="Enter or customize template text..."
                  />
                ) : (
                  <div className="text-xs font-mono text-[#173d37] bg-white border border-[#e5efe8] rounded-xl p-3 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                    {editedText}
                  </div>
                )}

                {editedText.includes('{patient_name}') && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#55776d]">
                    <Sparkles className="w-3.5 h-3.5 text-[#54a987]" />
                    <span>
                      <strong className="text-[#176e56]">{'{patient_name}'}</strong> will automatically be personalized with each recipient's name.
                    </span>
                  </div>
                )}
              </div>

              {/* 2. OPTION A: QUICK SEND TO ACTIVE CHAT */}
              {activeSession && (
                <div className="bg-[#eaf5ef]/60 border border-[#c2e4cf] rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#176e56] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      {activeSession.patientName
                        ? activeSession.patientName.slice(0, 2).toUpperCase()
                        : activeSession.phoneNumber.slice(-2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#173d37]">
                          Active Chat: {activeSession.patientName || `+${activeSession.phoneNumber}`}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#176e56] text-white font-medium">
                          Currently Open
                        </span>
                      </div>
                      <p className="text-[11px] text-[#55776d] mt-0.5">
                        +{activeSession.phoneNumber}
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={isSending}
                    onClick={() => handleDispatch([activeSession.phoneNumber.replace(/\D/g, '')], true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#176e56] hover:bg-[#125844] text-white text-xs font-bold transition-all shadow-xs shrink-0"
                  >
                    <span>Send &amp; Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 3. OPTION B: RECENT CONTACTS LIST (MULTI-SELECT) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#173d37]">
                      Select from Recent Contacts
                    </h4>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#eaf5ef] text-[#176e56]">
                      {selectedCount} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="text-xs font-semibold text-[#176e56] hover:underline"
                    >
                      Select All ({filteredSessions.length})
                    </button>
                    <span className="text-[#c2e4cf]">|</span>
                    <button
                      onClick={handleClearSelection}
                      className="text-xs font-semibold text-[#55776d] hover:text-[#b91c1c] transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* SEARCH INPUT */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[#55776d] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search recent contacts by patient name, phone, or UHID..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-[#dbe9e0] rounded-xl text-xs text-[#173d37] focus:outline-none focus:border-[#54a987] focus:ring-1 focus:ring-[#54a987]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#55776d] hover:text-[#173d37]"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* CONTACTS SCROLLABLE LIST */}
                <div className="border border-[#dbe9e0] rounded-2xl max-h-[260px] overflow-y-auto divide-y divide-[#eaf5ef] bg-white">
                  {filteredSessions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#55776d]">
                      No contacts found matching &ldquo;{searchQuery}&rdquo;.
                    </div>
                  ) : (
                    filteredSessions.map((sess) => {
                      const cleanPhone = sess.phoneNumber.replace(/\D/g, '');
                      const isSelected = selectedPhones.has(cleanPhone);
                      const initials = sess.patientName
                        ? sess.patientName.slice(0, 2).toUpperCase()
                        : sess.phoneNumber.slice(-2);

                      return (
                        <div
                          key={sess._id}
                          onClick={() => toggleContact(cleanPhone)}
                          className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#eaf5ef]/70 hover:bg-[#eaf5ef]'
                              : 'hover:bg-[#f8faf8]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Checkbox */}
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                                isSelected
                                  ? 'bg-[#176e56] border-[#176e56] text-white'
                                  : 'border-[#c2e4cf] bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>

                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-[#ede9fe] text-[#6d28d9] font-bold text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>

                            {/* Patient Info */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#173d37] truncate">
                                  {sess.patientName || `+${sess.phoneNumber}`}
                                </span>
                                {sess.patientReference && (
                                  <span className="text-[10px] font-mono text-[#55776d] bg-[#f0f4f2] px-1.5 py-0.2 rounded">
                                    {sess.patientReference}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#55776d] truncate">
                                +{sess.phoneNumber}
                                {sess.lastMessage && ` • ${sess.lastMessage}`}
                              </p>
                            </div>
                          </div>

                          {/* Meta Tags */}
                          <div className="flex items-center gap-2 shrink-0">
                            {sess.tags && sess.tags[0] && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f9f5] text-[#176e56] border border-[#dbe9e0]">
                                {sess.tags[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        {!isSentSuccess && (
          <div className="p-4 border-t border-[#dbe9e0] bg-white flex items-center justify-between shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#55776d] hover:bg-[#f3f9f5] transition-colors"
            >
              Cancel
            </button>

            <button
              disabled={selectedCount === 0 || isSending}
              onClick={() => handleDispatch(Array.from(selectedPhones), selectedCount === 1)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                selectedCount === 0 || isSending
                  ? 'bg-[#dbe9e0] text-[#8fa79d] cursor-not-allowed'
                  : 'bg-[#176e56] hover:bg-[#125844] text-white hover:shadow'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>
                {isSending
                  ? 'Dispatching WhatsApp...'
                  : selectedCount === 0
                  ? 'Select recipient(s)'
                  : selectedCount === 1
                  ? 'Send to Selected Contact'
                  : `Send to ${selectedCount} Contacts`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

