'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Send,
  Users,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  UserCheck,
  Filter,
  Check,
} from 'lucide-react';
import { WhatsAppSession, OpdWaitingPatient } from './types';

interface BulkMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: WhatsAppSession[];
  waitingPatients?: OpdWaitingPatient[];
  onSendBulk: (
    phoneNumbers: string[],
    text: string,
    campaignTitle: string,
    targetAudience: string,
    personalizedMessages?: Record<string, string>
  ) => Promise<void>;
}

export const BulkMessageModal: React.FC<BulkMessageModalProps> = ({
  isOpen,
  onClose,
  sessions,
  waitingPatients = [],
  onSendBulk,
}) => {
  const [audience, setAudience] = useState<'opd_waiting' | 'all' | 'patients' | 'leads'>('opd_waiting');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all');
  const [selectedPatientIds, setSelectedPatientIds] = useState<Set<string>>(new Set());
  const [campaignTitle, setCampaignTitle] = useState('OPD Queue Update');
  const [messageText, setMessageText] = useState(
    '🏥 *Svaasth Hospital OPD Notice*\n\nDear {patient_name}, Dr. {doctor_name} is currently examining emergency surgical cases. OPD appointments are running approximately 15 minutes behind schedule. Your slot ({slot_time}) will commence shortly. Thank you for your patience!'
  );
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Initialize selected patients when modal opens or waiting list loads
  useEffect(() => {
    if (waitingPatients.length > 0) {
      setSelectedPatientIds(new Set(waitingPatients.map((p) => p.id)));
    }
  }, [waitingPatients]);

  // Filtered waiting patients by doctor
  const filteredWaitingPatients = useMemo(() => {
    if (selectedDoctorFilter === 'all') return waitingPatients;
    return waitingPatients.filter((p) =>
      p.doctorName.toLowerCase().includes(selectedDoctorFilter.toLowerCase())
    );
  }, [waitingPatients, selectedDoctorFilter]);

  if (!isOpen) return null;

  // Toggle individual patient selection
  const togglePatientSelection = (id: string) => {
    setSelectedPatientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select / Deselect all
  const selectAllWaiting = () => {
    setSelectedPatientIds(new Set(filteredWaitingPatients.map((p) => p.id)));
  };

  const deselectAllWaiting = () => {
    setSelectedPatientIds(new Set());
  };

  // Determine recipient phone numbers based on audience selection
  const getRecipientPhones = (): string[] => {
    if (audience === 'opd_waiting') {
      const selected = waitingPatients.filter((p) => selectedPatientIds.has(p.id) && p.phone);
      return Array.from(new Set(selected.map((p) => p.phone)));
    }

    let target = sessions;
    if (audience === 'patients') {
      target = sessions.filter((s) => s.tags?.includes('Patient') || s.patientReference);
    } else if (audience === 'leads') {
      target = sessions.filter((s) => s.tags?.includes('Lead') && !s.patientReference);
    }
    const phones = target.map((s) => s.phoneNumber);
    return Array.from(new Set(phones.length > 0 ? phones : sessions.map((s) => s.phoneNumber)));
  };

  const recipientPhones = getRecipientPhones();
  const recipientCount = recipientPhones.length;

  // Templates customized per audience
  const opdWaitingTemplates = [
    {
      title: 'OPD Delay Notice',
      text: '🏥 *Svaasth Hospital OPD Notice*\n\nDear {patient_name}, Dr. {doctor_name} is attending to an urgent case. OPD appointments are running ~15 mins delayed. Your slot ({slot_time}) will commence shortly. Thank you for your patience!',
    },
    {
      title: 'Next in Line Call',
      text: '🔔 *Next in Line – Svaasth Hospital*\n\nDear {patient_name}, your token #{token_no} for Dr. {doctor_name} is next! Please proceed to Consultation Room 1 with your medical files.',
    },
    {
      title: 'Pre-Consultation Vitals',
      text: '📋 *OPD Vitals Check – Svaasth Hospital*\n\nDear {patient_name}, please have your Blood Pressure and Weight recorded at the nurse triage station before your slot ({slot_time}) with Dr. {doctor_name}.',
    },
    {
      title: 'Token Called Alert',
      text: '📢 *Token Call – Svaasth Hospital*\n\nDear {patient_name}, Token #{token_no} has been called for Dr. {doctor_name}. Please report to the reception desk now.',
    },
  ];

  const generalTemplates = [
    {
      title: 'OPD Schedule Update',
      text: '🏥 *Svaasth Hospital Announcement*\n\nDear {patient_name}, our regular OPD timings are:\n• Mon to Sat: 10:30 AM – 1:00 PM & 6:00 PM – 7:30 PM\n• Sunday: Closed (Emergency triage available)\n\nConsult Dr. Vipeen Raut (Orthopaedics) & Dr. Shillpa Raut (Gynecology).\nReply 1 to book your slot!',
    },
    {
      title: 'Free Health Camp Alert',
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

  const activeTemplates = audience === 'opd_waiting' ? opdWaitingTemplates : generalTemplates;

  const handleApplyTemplate = (tmpl: { title: string; text: string }) => {
    setCampaignTitle(tmpl.title);
    setMessageText(tmpl.text);
  };

  const insertVariable = (variable: string) => {
    setMessageText((prev) => `${prev} ${variable}`);
  };

  // First sample waiting patient for live preview
  const samplePatient = useMemo(() => {
    if (audience === 'opd_waiting') {
      const selected = waitingPatients.find((p) => selectedPatientIds.has(p.id));
      return selected || waitingPatients[0] || null;
    }
    return null;
  }, [audience, waitingPatients, selectedPatientIds]);

  // Live preview formatting with variable replacement
  const previewText = useMemo(() => {
    if (audience === 'opd_waiting' && samplePatient) {
      return messageText
        .replace(/{patient_name}/g, samplePatient.name)
        .replace(/{doctor_name}/g, samplePatient.doctorName)
        .replace(/{slot_time}/g, samplePatient.slotTime)
        .replace(/{token_no}/g, String(samplePatient.tokenNo));
    }
    return messageText.replace(/{patient_name}/g, 'Rohit Patil');
  }, [messageText, audience, samplePatient]);

  const handleSend = async () => {
    if (!messageText.trim() || isSending || recipientCount === 0) return;
    setIsSending(true);

    // Build personalized messages per patient if targeting OPD waiting queue
    const personalizedMap: Record<string, string> = {};
    if (audience === 'opd_waiting') {
      for (const p of waitingPatients) {
        if (selectedPatientIds.has(p.id) && p.phone) {
          const personalized = messageText
            .replace(/{patient_name}/g, p.name)
            .replace(/{doctor_name}/g, p.doctorName)
            .replace(/{slot_time}/g, p.slotTime)
            .replace(/{token_no}/g, String(p.tokenNo));
          personalizedMap[p.phone] = personalized;
        }
      }
    }

    try {
      await onSendBulk(recipientPhones, messageText, campaignTitle, audience, personalizedMap);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-[#dbe9e0] rounded-3xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#dbe9e0] flex items-center justify-between bg-[#f8faf8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eaf5ef] text-[#176e56] flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#173d37]">Send Bulk WhatsApp Broadcast</h2>
                <span className="text-[10px] bg-[#eaf5ef] text-[#176e56] font-bold px-2 py-0.5 rounded-full border border-[#c2e4cf]">
                  Svaasth Connect
                </span>
              </div>
              <p className="text-xs text-[#55776d] mt-0.5">
                Broadcast official OPD queue updates, doctor notices, or clinic announcements to patients.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#55776d] hover:text-[#173d37] hover:bg-[#eaf5ef] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left Form: 3 cols */}
          <div className="md:col-span-3 space-y-4">
            {/* 1. Target Audience Selection */}
            <div>
              <label className="block text-xs font-bold text-[#173d37] uppercase tracking-wider mb-2">
                1. Select Target Audience
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* OPD Waiting Queue (Default / Primary Option) */}
                <button
                  type="button"
                  onClick={() => {
                    setAudience('opd_waiting');
                    setCampaignTitle('OPD Queue Update');
                    setMessageText(opdWaitingTemplates[0].text);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer relative ${
                    audience === 'opd_waiting'
                      ? 'bg-[#eaf5ef] border-[#176e56] text-[#176e56] ring-2 ring-[#54a987]/30 shadow-xs'
                      : 'bg-white border-[#dbe9e0] text-[#55776d] hover:bg-[#f8faf8]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
                    <p className="font-bold">OPD Waiting</p>
                  </div>
                  <span className="text-[10px] text-[#176e56] font-semibold block mt-0.5">
                    {waitingPatients.length} in queue
                  </span>
                </button>

                {/* All Contacts */}
                <button
                  type="button"
                  onClick={() => {
                    setAudience('all');
                    setCampaignTitle('Hospital Announcement');
                    setMessageText(generalTemplates[0].text);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                    audience === 'all'
                      ? 'bg-[#eaf5ef] border-[#176e56] text-[#176e56] shadow-xs'
                      : 'bg-white border-[#dbe9e0] text-[#55776d] hover:bg-[#f8faf8]'
                  }`}
                >
                  <p>All Contacts</p>
                  <span className="text-[10px] text-[#77a193] font-normal block mt-0.5">
                    ({sessions.length} chats)
                  </span>
                </button>

                {/* Patients Only */}
                <button
                  type="button"
                  onClick={() => {
                    setAudience('patients');
                    setCampaignTitle('Registered Patients Notice');
                    setMessageText(generalTemplates[1].text);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                    audience === 'patients'
                      ? 'bg-[#eaf5ef] border-[#176e56] text-[#176e56] shadow-xs'
                      : 'bg-white border-[#dbe9e0] text-[#55776d] hover:bg-[#f8faf8]'
                  }`}
                >
                  <p>Patients Only</p>
                  <span className="text-[10px] text-[#77a193] font-normal block mt-0.5">
                    Registered
                  </span>
                </button>

                {/* New Leads */}
                <button
                  type="button"
                  onClick={() => {
                    setAudience('leads');
                    setCampaignTitle('New Inquiries Update');
                    setMessageText(generalTemplates[0].text);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                    audience === 'leads'
                      ? 'bg-[#eaf5ef] border-[#176e56] text-[#176e56] shadow-xs'
                      : 'bg-white border-[#dbe9e0] text-[#55776d] hover:bg-[#f8faf8]'
                  }`}
                >
                  <p>New Leads</p>
                  <span className="text-[10px] text-[#77a193] font-normal block mt-0.5">
                    Inquiries
                  </span>
                </button>
              </div>
            </div>

            {/* LIVE OPD WAITING LIST TABLE (When OPD Waiting is selected) */}
            {audience === 'opd_waiting' && (
              <div className="rounded-2xl border border-[#c2e4cf] bg-[#f8fbf9] p-3.5 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#dbe9e0] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse"></span>
                    <h3 className="text-xs font-bold text-[#173d37]">
                      Live OPD Patients on Waiting ({selectedPatientIds.size} of {waitingPatients.length} selected)
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Doctor Filter Pill Tabs */}
                    <div className="flex items-center bg-white border border-[#dbe9e0] rounded-lg p-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setSelectedDoctorFilter('all')}
                        className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                          selectedDoctorFilter === 'all'
                            ? 'bg-[#176e56] text-white'
                            : 'text-[#55776d] hover:text-[#173d37]'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDoctorFilter('Vipeen')}
                        className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                          selectedDoctorFilter === 'Vipeen'
                            ? 'bg-[#176e56] text-white'
                            : 'text-[#55776d] hover:text-[#173d37]'
                        }`}
                      >
                        Dr. Vipeen
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDoctorFilter('Shillpa')}
                        className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                          selectedDoctorFilter === 'Shillpa'
                            ? 'bg-[#176e56] text-white'
                            : 'text-[#55776d] hover:text-[#173d37]'
                        }`}
                      >
                        Dr. Shillpa
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={selectAllWaiting}
                      className="text-[10px] text-[#176e56] hover:underline font-bold cursor-pointer"
                    >
                      All
                    </button>
                    <span className="text-[#c2e4cf]">|</span>
                    <button
                      type="button"
                      onClick={deselectAllWaiting}
                      className="text-[10px] text-[#77a193] hover:underline font-bold cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Patient Queue Checklist Rows */}
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {filteredWaitingPatients.length === 0 ? (
                    <p className="text-xs text-[#77a193] text-center py-4">
                      No OPD patients currently waiting for this selection.
                    </p>
                  ) : (
                    filteredWaitingPatients.map((patient) => {
                      const isChecked = selectedPatientIds.has(patient.id);
                      return (
                        <div
                          key={patient.id}
                          onClick={() => togglePatientSelection(patient.id)}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-white border-[#54a987] shadow-2xs'
                              : 'bg-white/60 border-[#e2ece5] text-[#8ea39b] hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Checkbox */}
                            <div
                              className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                isChecked
                                  ? 'bg-[#176e56] border-[#176e56] text-white'
                                  : 'border-[#b8cfc4] bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>

                            {/* Token Badge */}
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f3f9f5] text-[#176e56] border border-[#dbe9e0] shrink-0">
                              #{patient.tokenNo}
                            </span>

                            {/* Name & UHID */}
                            <div className="truncate">
                              <span className="font-bold text-[#173d37]">{patient.name}</span>
                              <span className="text-[10px] text-[#77a193] ml-1.5">({patient.uhid})</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-[11px]">
                            {/* Attending Doctor */}
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                patient.doctorName.includes('Vipeen')
                                  ? 'bg-[#eaf5ef] text-[#176e56]'
                                  : 'bg-[#fdf2f8] text-[#be185d]'
                              }`}
                            >
                              {patient.doctorName}
                            </span>

                            {/* Slot Time */}
                            <span className="text-[#55776d] font-mono text-[10px]">
                              {patient.slotTime}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 2. Campaign Name */}
            <div>
              <label className="block text-xs font-bold text-[#173d37] uppercase tracking-wider mb-1.5">
                2. Campaign Title
              </label>
              <input
                type="text"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                placeholder="e.g. OPD Delay Notice"
                className="w-full px-3.5 py-2 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-xs text-[#173d37] focus:outline-none focus:border-[#54a987] focus:bg-white transition-all font-medium"
              />
            </div>

            {/* 3. Pre-Approved Templates */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#173d37] uppercase tracking-wider">
                  3. Pre-Approved Message Templates
                </label>
                <span className="text-[11px] text-[#77a193]">Click to load</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeTemplates.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplyTemplate(t)}
                    className="px-2.5 py-1 rounded-lg bg-[#f3f9f5] hover:bg-[#eaf5ef] text-[#176e56] text-[11px] font-semibold border border-[#dbe9e0] transition-colors cursor-pointer"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Message Content Composer */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#173d37] uppercase tracking-wider">
                  4. Message Content
                </label>
                <span className="text-[11px] text-[#77a193]">{messageText.length} characters</span>
              </div>
              <textarea
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Write your broadcast message..."
                className="w-full p-3 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-xs text-[#173d37] focus:outline-none focus:border-[#54a987] focus:bg-white transition-all resize-none leading-relaxed"
              />

              {/* Variable Chips */}
              <div className="flex items-center flex-wrap gap-1.5 mt-2">
                <span className="text-[11px] text-[#55776d] mr-1">Insert Tags:</span>
                <button
                  type="button"
                  onClick={() => insertVariable('{patient_name}')}
                  className="px-2 py-0.5 rounded bg-[#f3f9f5] text-[#176e56] text-[10px] font-mono font-bold hover:bg-[#eaf5ef] border border-[#dbe9e0] cursor-pointer"
                >
                  {'{patient_name}'}
                </button>
                {audience === 'opd_waiting' && (
                  <>
                    <button
                      type="button"
                      onClick={() => insertVariable('{doctor_name}')}
                      className="px-2 py-0.5 rounded bg-[#f3f9f5] text-[#176e56] text-[10px] font-mono font-bold hover:bg-[#eaf5ef] border border-[#dbe9e0] cursor-pointer"
                    >
                      {'{doctor_name}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariable('{slot_time}')}
                      className="px-2 py-0.5 rounded bg-[#f3f9f5] text-[#176e56] text-[10px] font-mono font-bold hover:bg-[#eaf5ef] border border-[#dbe9e0] cursor-pointer"
                    >
                      {'{slot_time}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariable('{token_no}')}
                      className="px-2 py-0.5 rounded bg-[#f3f9f5] text-[#176e56] text-[10px] font-mono font-bold hover:bg-[#eaf5ef] border border-[#dbe9e0] cursor-pointer"
                    >
                      {'{token_no}'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Live WhatsApp Preview: 2 cols */}
          <div className="md:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-[#173d37] uppercase tracking-wider">
                WhatsApp Live Preview
              </label>
              {audience === 'opd_waiting' && samplePatient && (
                <span className="text-[10px] text-[#176e56] bg-[#eaf5ef] px-2 py-0.5 rounded-full font-semibold">
                  Preview: #{samplePatient.tokenNo} {samplePatient.name}
                </span>
              )}
            </div>

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

              {/* Recipient summary card */}
              <div className="mt-4 p-3.5 rounded-xl bg-white border border-[#dbe9e0] text-center shadow-xs">
                <p className="text-xs font-semibold text-[#55776d]">Broadcast Recipients</p>
                <p className="text-2xl font-bold text-[#176e56] mt-0.5">{recipientCount}</p>
                <p className="text-[10px] text-[#77a193] mt-0.5">
                  {audience === 'opd_waiting'
                    ? `Selected from live OPD queue`
                    : `Verified WhatsApp contacts`}
                </p>
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#55776d] hover:bg-[#eaf5ef] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleSend}
              disabled={isSending || recipientCount === 0 || !messageText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#176e56] hover:bg-[#125643] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {sentSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-[#77d1a5]" />
                  <span>Broadcast Sent!</span>
                </>
              ) : isSending ? (
                <span>Sending to {recipientCount} patients...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Broadcast to {recipientCount} Patients</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
