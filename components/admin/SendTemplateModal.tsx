'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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

  // Pre-select active contact only ONCE per modal opening
  const initializedOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      initializedOpenRef.current = false;
      return;
    }
    if (!initializedOpenRef.current && (activePhone || sessions.length > 0)) {
      if (activePhone) {
        setSelectedPhones(new Set([activePhone.replace(/\D/g, '')]));
      } else if (sessions.length > 0) {
        setSelectedPhones(new Set([sessions[0].phoneNumber.replace(/\D/g, '')]));
      }
      initializedOpenRef.current = true;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-xl border border-[#e2ece6] shadow-2xl max-w-2xl w-full max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-[#e2ece6] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#f0f5f2] border border-[#dbe9e0] text-[#176e56] flex items-center justify-center shrink-0">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#173d37]">
                Dispatch template
              </h3>
              <p className="text-xs text-[#55776d]">
                {templateTitle ? `Template: ${templateTitle} • ` : ''}Select one or multiple recent patient contacts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#55776d] hover:text-[#173d37] hover:bg-[#f0f5f2] border border-transparent hover:border-[#dbe9e0] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* SUCCESS BANNER */}
          {isSentSuccess ? (
            <div className="bg-[#f0f5f2] border border-[#dbe9e0] rounded-xl p-6 text-center space-y-2 animate-in zoom-in-95">
              <div className="w-10 h-10 rounded-full bg-[#176e56] text-white flex items-center justify-center mx-auto shadow-xs">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h4 className="text-sm font-semibold text-[#173d37]">
                Dispatched successfully
              </h4>
              <p className="text-xs text-[#55776d] tabular-nums">
                Template message sent to {sentCount} patient contact{sentCount > 1 ? 's' : ''}. AI assistant paused for staff handover.
              </p>
            </div>
          ) : (
            <>
              {/* 1. TEMPLATE PREVIEW & OPTIONAL EDIT */}
              <div className="bg-[#f8faf8] border border-[#e2ece6] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-[#176e56] bg-[#f0f5f2] border border-[#dbe9e0] px-2 py-0.5 rounded">
                      Message content
                    </span>
                    {templateTitle && (
                      <span className="text-xs font-semibold text-[#173d37]">
                        {templateTitle}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setIsEditingText(!isEditingText)}
                    className="flex items-center gap-1 text-xs font-medium text-[#176e56] hover:underline"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{isEditingText ? 'Done editing' : 'Customize text'}</span>
                  </button>
                </div>

                {isEditingText ? (
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    rows={4}
                    className="w-full text-xs font-mono bg-white border border-[#176e56] rounded-lg p-3 text-[#173d37] focus:outline-none focus:ring-1 focus:ring-[#176e56]"
                    placeholder="Enter or customize template text..."
                  />
                ) : (
                  <div className="text-xs font-mono text-[#173d37] bg-white border border-[#e2ece6] rounded-lg p-3 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                    {editedText}
                  </div>
                )}

                {editedText.includes('{patient_name}') && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#55776d]">
                    <Sparkles className="w-3.5 h-3.5 text-[#176e56]" />
                    <span>
                      <strong className="text-[#176e56] font-medium">{'{patient_name}'}</strong> will automatically be personalized with each recipient's name.
                    </span>
                  </div>
                )}
              </div>

              {/* 2. OPTION A: QUICK SEND TO ACTIVE CHAT */}
              {activeSession && (
                <div className="bg-[#f0f5f2] border border-[#dbe9e0] rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#dbe9e0] text-[#176e56] flex items-center justify-center font-medium text-xs shrink-0">
                      {activeSession.patientName
                        ? activeSession.patientName.slice(0, 2).toUpperCase()
                        : activeSession.phoneNumber.slice(-2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#173d37]">
                          Active chat: {activeSession.patientName || `+${activeSession.phoneNumber}`}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#176e56] text-white font-medium">
                          Currently open
                        </span>
                      </div>
                      <p className="text-[11px] text-[#55776d] mt-0.5 tabular-nums">
                        +{activeSession.phoneNumber}
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={isSending}
                    onClick={() => handleDispatch([activeSession.phoneNumber.replace(/\D/g, '')], true)}
                    className="h-8 flex items-center gap-1.5 px-3 rounded-lg bg-[#176e56] hover:bg-[#125643] text-white text-xs font-medium transition-colors shrink-0"
                  >
                    <span>Send and open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 3. OPTION B: RECENT CONTACTS LIST (MULTI-SELECT) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-[#173d37]">
                      Select from recent contacts
                    </h4>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#f0f5f2] border border-[#dbe9e0] text-[#176e56] tabular-nums">
                      {selectedCount} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="text-xs font-medium text-[#176e56] hover:underline"
                    >
                      Select all ({filteredSessions.length})
                    </button>
                    <span className="text-[#dbe9e0]">|</span>
                    <button
                      onClick={handleClearSelection}
                      className="text-xs font-medium text-[#55776d] hover:text-[#b91c1c] transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* SEARCH INPUT */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[#77a193] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search recent contacts by patient name, phone, or UHID..."
                    className="w-full h-9 pl-9 pr-8 bg-white border border-[#dbe9e0] rounded-lg text-xs text-[#173d37] focus:outline-none focus:border-[#176e56] focus:ring-1 focus:ring-[#176e56]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#55776d] hover:text-[#173d37]"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* CONTACTS SCROLLABLE LIST */}
                <div className="border border-[#e2ece6] rounded-xl max-h-[260px] overflow-y-auto divide-y divide-[#e2ece6] bg-white">
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
                              ? 'bg-[#f0f5f2]'
                              : 'hover:bg-[#f8faf8]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Checkbox */}
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                isSelected
                                  ? 'bg-[#176e56] border-[#176e56] text-white'
                                  : 'border-[#dbe9e0] bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                            </div>

                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-lg bg-[#f0f5f2] border border-[#dbe9e0] text-[#176e56] font-medium text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>

                            {/* Patient Info */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-[#173d37] truncate">
                                  {sess.patientName || `+${sess.phoneNumber}`}
                                </span>
                                {sess.patientReference && (
                                  <span className="text-[10px] font-mono text-[#55776d] bg-[#f0f5f2] border border-[#dbe9e0] px-1.5 py-0.2 rounded">
                                    {sess.patientReference}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#55776d] truncate tabular-nums">
                                +{sess.phoneNumber}
                                {sess.lastMessage && ` • ${sess.lastMessage}`}
                              </p>
                            </div>
                          </div>

                          {/* Meta Tags */}
                          <div className="flex items-center gap-2 shrink-0">
                            {sess.tags && sess.tags[0] && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#f8faf8] text-[#176e56] border border-[#e2ece6]">
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
          <div className="p-4 border-t border-[#e2ece6] bg-white flex items-center justify-between shrink-0">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg text-xs font-medium text-[#55776d] hover:text-[#173d37] hover:bg-[#f0f5f2] border border-[#dbe9e0] transition-colors"
            >
              Cancel
            </button>

            <button
              disabled={selectedCount === 0 || isSending}
              onClick={() => handleDispatch(Array.from(selectedPhones), selectedCount === 1)}
              className={`h-9 flex items-center gap-2 px-4 rounded-lg text-xs font-medium transition-colors ${
                selectedCount === 0 || isSending
                  ? 'bg-[#dbe9e0] text-[#8fa79d] cursor-not-allowed'
                  : 'bg-[#176e56] hover:bg-[#125643] text-white shadow-xs'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSending
                  ? 'Dispatching WhatsApp...'
                  : selectedCount === 0
                  ? 'Select recipient(s)'
                  : selectedCount === 1
                  ? 'Send to selected contact'
                  : `Send to ${selectedCount} contacts`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

