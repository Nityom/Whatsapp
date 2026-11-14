'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ShieldCheck,
  RefreshCw,
  Plus,
  ExternalLink,
  Megaphone,
  FileText,
} from 'lucide-react';
import { WhatsAppSession, OpdWaitingPatient } from './types';

interface MetaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: string;
  text?: string;
  example?: {
    body_text?: string[][];
  };
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
  }>;
}

interface MetaTemplate {
  id: string;
  name: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED';
  components: MetaTemplateComponent[];
}

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
    personalizedMessages?: Record<string, string>,
    templateMeta?: {
      templateName?: string;
      templateLanguage?: string;
      personalizedTemplateParams?: Record<string, string[]>;
    }
  ) => Promise<void>;
}

export const BulkMessageModal: React.FC<BulkMessageModalProps> = ({
  isOpen,
  onClose,
  sessions,
  waitingPatients = [],
  onSendBulk,
}) => {
  // Modal Mode: meta_approved (outside 24h capable), meta_create (auto-submit to Meta), custom_text (24h chat)
  const [dispatchMode, setDispatchMode] = useState<'meta_approved' | 'meta_create' | 'custom_text'>('meta_approved');
  const [audience, setAudience] = useState<'opd_waiting' | 'all' | 'patients' | 'leads'>('opd_waiting');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all');
  const [selectedPatientIds, setSelectedPatientIds] = useState<Set<string>>(new Set());
  const [campaignTitle, setCampaignTitle] = useState('OPD Queue Update');

  // Meta templates from live Meta Cloud API
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplate[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState<boolean>(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('appointment_booked');
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({
    '1': '{patient_name}',
    '2': 'Svaasth Hospital',
    '3': 'OPD Consultation',
    '4': 'Today',
    '5': '{slot_time}',
  });

  // Custom text fallback
  const [messageText, setMessageText] = useState(
    '🏥 *Svaasth Hospital OPD Notice*\n\nDear {patient_name}, Dr. {doctor_name} is currently examining emergency surgical cases. OPD appointments are running approximately 15 minutes behind schedule. Your slot ({slot_time}) will commence shortly. Thank you for your patience!'
  );

  // Form State for submitting new template for Meta auto-approval
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newCategory, setNewCategory] = useState<'UTILITY' | 'MARKETING'>('UTILITY');
  const [newHeader, setNewHeader] = useState('Svaasth Hospital Notice');
  const [newBody, setNewBody] = useState(
    'Dear {{1}}, please note that our OPD clinic will remain closed on {{2}} on account of {{3}}. For emergency 24/7 care, contact +91 9373280505. Thank you for choosing Svaasth Hospital.'
  );
  const [newSamples, setNewSamples] = useState(['Valued Patient', 'Tomorrow', 'Public Holiday']);
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [submitErrorMsg, setSubmitErrorMsg] = useState<string | null>(null);

  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Fetch Meta templates from WABA API
  const fetchMetaTemplates = async () => {
    setIsLoadingMeta(true);
    try {
      const res = await fetch('/api/admin/templates');
      const data = await res.json();
      if (data.success && Array.isArray(data.templates)) {
        setMetaTemplates(data.templates);
        // Default to first approved template if available
        const approved = data.templates.find((t: MetaTemplate) => t.status === 'APPROVED');
        if (approved) {
          setSelectedTemplateName(approved.name);
        }
      }
    } catch (err) {
      console.error('[Fetch Meta Templates Error]', err);
    } finally {
      setIsLoadingMeta(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMetaTemplates();
    }
  }, [isOpen]);

  // Initialize selected patients only ONCE when modal opens
  const initializedOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      initializedOpenRef.current = false;
      return;
    }
    // Only initialize once per open when waitingPatients has data
    if (!initializedOpenRef.current && waitingPatients.length > 0) {
      setSelectedPatientIds(new Set(waitingPatients.map((p) => p.id)));
      initializedOpenRef.current = true;
    }
  }, [isOpen, waitingPatients]);

  // Filtered waiting patients by doctor
  const filteredWaitingPatients = useMemo(() => {
    if (selectedDoctorFilter === 'all') return waitingPatients;
    return waitingPatients.filter((p) =>
      p.doctorName.toLowerCase().includes(selectedDoctorFilter.toLowerCase())
    );
  }, [waitingPatients, selectedDoctorFilter]);

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

  // Find currently selected Meta template
  const currentMetaTemplate = useMemo(() => {
    return metaTemplates.find((t) => t.name === selectedTemplateName) || null;
  }, [metaTemplates, selectedTemplateName]);

  // Extract variables from current Meta template body
  const metaVariables = useMemo(() => {
    if (!currentMetaTemplate) return [];
    const bodyComp = currentMetaTemplate.components.find((c) => c.type === 'BODY');
    if (!bodyComp || !bodyComp.text) return [];
    const matches = bodyComp.text.match(/\{\{(\d+)\}\}/g) || [];
    return Array.from(new Set(matches.map((m) => m.replace(/\D/g, ''))));
  }, [currentMetaTemplate]);

  // Set default param values when selected template changes
  useEffect(() => {
    if (currentMetaTemplate && metaVariables.length > 0) {
      setTemplateParams((prev) => {
        const next = { ...prev };
        metaVariables.forEach((v, idx) => {
          if (!next[v]) {
            if (idx === 0) next[v] = '{patient_name}';
            else if (idx === 1) next[v] = 'Svaasth Hospital';
            else if (idx === 2) next[v] = 'OPD Consultation';
            else if (idx === 3) next[v] = 'Today';
            else if (idx === 4) next[v] = '{slot_time}';
            else next[v] = `Param ${v}`;
          }
        });
        return next;
      });
    }
  }, [currentMetaTemplate, metaVariables]);

  // First sample waiting patient for live preview
  const samplePatient = useMemo(() => {
    if (audience === 'opd_waiting') {
      const selected = waitingPatients.find((p) => selectedPatientIds.has(p.id));
      return selected || waitingPatients[0] || null;
    }
    return null;
  }, [audience, waitingPatients, selectedPatientIds]);

  // Meta template formatted preview
  const templatePreviewText = useMemo(() => {
    if (!currentMetaTemplate) return messageText;
    const bodyComp = currentMetaTemplate.components.find((c) => c.type === 'BODY');
    if (!bodyComp || !bodyComp.text) return '';

    let text = bodyComp.text;
    metaVariables.forEach((v) => {
      let val = templateParams[v] || `{{${v}}}`;
      if (samplePatient) {
        val = val
          .replace(/{patient_name}/g, samplePatient.name)
          .replace(/{doctor_name}/g, samplePatient.doctorName)
          .replace(/{slot_time}/g, samplePatient.slotTime)
          .replace(/{token_no}/g, String(samplePatient.tokenNo));
      } else {
        val = val.replace(/{patient_name}/g, 'Valued Patient');
      }
      text = text.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), val);
    });
    return text;
  }, [currentMetaTemplate, metaVariables, templateParams, samplePatient, messageText]);

  // Plain text preview
  const plainPreviewText = useMemo(() => {
    if (audience === 'opd_waiting' && samplePatient) {
      return messageText
        .replace(/{patient_name}/g, samplePatient.name)
        .replace(/{doctor_name}/g, samplePatient.doctorName)
        .replace(/{slot_time}/g, samplePatient.slotTime)
        .replace(/{token_no}/g, String(samplePatient.tokenNo));
    }
    return messageText.replace(/{patient_name}/g, 'Rohit Patil');
  }, [messageText, audience, samplePatient]);

  // Submit new template to Meta for auto-approval
  const handleSubmitNewTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim() || !newBody.trim() || isSubmittingTemplate) return;

    setIsSubmittingTemplate(true);
    setSubmitSuccessMsg(null);
    setSubmitErrorMsg(null);

    try {
      const cleanName = newTemplateName
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_');

      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          category: newCategory,
          headerText: newHeader.trim() || undefined,
          bodyText: newBody.trim(),
          sampleValues: newSamples,
          language: 'en_US',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setSubmitErrorMsg(data.error || 'Failed to submit template to Meta.');
      } else {
        setSubmitSuccessMsg(
          `🎉 Template "${cleanName}" submitted to Meta Cloud API! Review typically takes 1–5 minutes.`
        );
        await fetchMetaTemplates();
        setSelectedTemplateName(cleanName);
        setTimeout(() => {
          setDispatchMode('meta_approved');
        }, 2000);
      }
    } catch (err: unknown) {
      setSubmitErrorMsg(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsSubmittingTemplate(false);
    }
  };

  // Handle Send Broadcast
  const handleSend = async () => {
    if (isSending || recipientCount === 0) return;
    setIsSending(true);

    try {
      if (dispatchMode === 'meta_approved' && currentMetaTemplate) {
        // Build per-recipient template parameters
        const personalizedTemplateParams: Record<string, string[]> = {};
        const personalizedMap: Record<string, string> = {};

        for (const phone of recipientPhones) {
          const cleanPhone = phone.replace(/\D/g, '');
          const patient = waitingPatients.find(
            (p) => p.phone && p.phone.replace(/\D/g, '') === cleanPhone
          );
          const sess = sessions.find(
            (s) => s.phoneNumber.replace(/\D/g, '') === cleanPhone
          );

          const patientName = patient?.name || sess?.patientName || 'Valued Patient';
          const doctorName = patient?.doctorName || 'Dr. Vipeen Raut';
          const slotTime = patient?.slotTime || '10:30 AM';
          const tokenNo = patient?.tokenNo ? String(patient.tokenNo) : '1';

          // Map each variable in order [v1, v2, v3, ...]
          const paramValues = metaVariables.map((v) => {
            const raw = templateParams[v] || '';
            return raw
              .replace(/{patient_name}/g, patientName)
              .replace(/{doctor_name}/g, doctorName)
              .replace(/{slot_time}/g, slotTime)
              .replace(/{token_no}/g, tokenNo);
          });

          personalizedTemplateParams[cleanPhone] = paramValues;

          // Also build preview string for Convex history
          let rendered =
            currentMetaTemplate.components.find((c) => c.type === 'BODY')?.text || '';
          metaVariables.forEach((v, idx) => {
            rendered = rendered.replace(
              new RegExp(`\\{\\{${v}\\}\\}`, 'g'),
              paramValues[idx] || ''
            );
          });
          personalizedMap[cleanPhone] = rendered;
        }

        await onSendBulk(
          recipientPhones,
          templatePreviewText,
          campaignTitle || `Meta Broadcast: ${currentMetaTemplate.name}`,
          audience,
          personalizedMap,
          {
            templateName: currentMetaTemplate.name,
            templateLanguage: currentMetaTemplate.language || 'en_US',
            personalizedTemplateParams,
          }
        );
      } else {
        // Plain text broadcast with personalized replacement
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

        await onSendBulk(recipientPhones, messageText, campaignTitle, audience, personalizedMap);
      }

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

  if (!isOpen) return null;

  const approvedTemplates = metaTemplates.filter((t) => t.status === 'APPROVED');
  const pendingTemplates = metaTemplates.filter((t) => t.status === 'PENDING');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-[#dbe9e0] rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-[#dbe9e0] flex items-center justify-between bg-[#f8faf8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eaf5ef] text-[#176e56] flex items-center justify-center shadow-xs">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#173d37]">Send Bulk WhatsApp Broadcast</h2>
                <span className="text-[10px] bg-[#eaf5ef] text-[#176e56] font-bold px-2 py-0.5 rounded-full border border-[#c2e4cf] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#176e56]" />
                  Meta Official API
                </span>
              </div>
              <p className="text-xs text-[#55776d] mt-0.5">
                Send guaranteed broadcasts to all contacts outside 24h via Meta Templates, or auto-submit custom templates for instant approval.
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

        {/* BROADCAST CHANNEL MODE SELECTOR */}
        <div className="px-6 py-2.5 bg-white border-b border-[#eaf2ed] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setDispatchMode('meta_approved')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                dispatchMode === 'meta_approved'
                  ? 'bg-[#176e56] text-white shadow-xs'
                  : 'bg-[#f4f8f5] text-[#176e56] hover:bg-[#eaf5ef] border border-[#dbe9e0]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Meta Approved Template ({approvedTemplates.length})</span>
              <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
                Outside 24h Ready
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDispatchMode('meta_create')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                dispatchMode === 'meta_create'
                  ? 'bg-[#176e56] text-white shadow-xs'
                  : 'bg-[#f4f8f5] text-[#176e56] hover:bg-[#eaf5ef] border border-[#dbe9e0]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Auto-Submit to Meta</span>
              <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                Auto-Review
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDispatchMode('custom_text')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                dispatchMode === 'custom_text'
                  ? 'bg-[#176e56] text-white shadow-xs'
                  : 'bg-[#f4f8f5] text-[#55776d] hover:bg-[#eaf5ef] border border-[#dbe9e0]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Active 24h Chat Message</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchMetaTemplates}
            disabled={isLoadingMeta}
            className="flex items-center gap-1 text-[11px] text-[#176e56] font-semibold hover:underline cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingMeta ? 'animate-spin' : ''}`} />
            <span>Sync Meta Templates</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left Form: 3 cols */}
          <div className="md:col-span-3 space-y-4">
            {/* 1. Target Audience Selection */}
            <div>
              <label className="block text-xs font-bold text-[#173d37] uppercase tracking-wider mb-2">
                1. Select Target Audience
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* OPD Waiting Queue */}
                <button
                  type="button"
                  onClick={() => {
                    setAudience('opd_waiting');
                    setCampaignTitle('OPD Queue Update');
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

            {/* LIVE OPD WAITING LIST TABLE */}
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
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
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
                            <div
                              className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                isChecked
                                  ? 'bg-[#176e56] border-[#176e56] text-white'
                                  : 'border-[#b8cfc4] bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>

                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f3f9f5] text-[#176e56] border border-[#dbe9e0] shrink-0">
                              #{patient.tokenNo}
                            </span>

                            <div className="truncate">
                              <span className="font-bold text-[#173d37]">{patient.name}</span>
                              <span className="text-[10px] text-[#77a193] ml-1.5">({patient.uhid})</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-[11px]">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                patient.doctorName.includes('Vipeen')
                                  ? 'bg-[#eaf5ef] text-[#176e56]'
                                  : 'bg-[#fdf2f8] text-[#be185d]'
                              }`}
                            >
                              {patient.doctorName}
                            </span>
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

            {/* Campaign Name */}
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

            {/* MODE 1: META APPROVED TEMPLATES */}
            {dispatchMode === 'meta_approved' && (
              <div className="space-y-3 rounded-2xl bg-[#f7faf8] border border-[#c2e4cf] p-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#176e56] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#176e56]" />
                    3. Select Meta Approved Template
                  </label>
                  <span className="text-[10px] text-[#176e56] font-semibold bg-[#eaf5ef] px-2 py-0.5 rounded-md border border-[#c2e4cf]">
                    Reaches All Inactive &amp; Cold Contacts
                  </span>
                </div>

                {/* Template Cards Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {approvedTemplates.length === 0 ? (
                    <div className="col-span-2 p-3 text-center text-xs text-[#55776d] bg-white rounded-xl border border-[#dbe9e0]">
                      No approved Meta templates found yet. You can submit one in the{' '}
                      <strong>&quot;Auto-Submit to Meta&quot;</strong> tab.
                    </div>
                  ) : (
                    approvedTemplates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTemplateName(t.name)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedTemplateName === t.name
                            ? 'bg-white border-[#176e56] ring-2 ring-[#54a987]/30 shadow-xs'
                            : 'bg-white/80 border-[#dbe9e0] hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold text-xs text-[#173d37]">{t.name}</span>
                          <span className="text-[9px] bg-[#eaf5ef] text-[#176e56] font-bold px-1.5 py-0.2 rounded-full">
                            APPROVED
                          </span>
                        </div>
                        <p className="text-[11px] text-[#55776d] line-clamp-2">
                          {t.components.find((c) => c.type === 'BODY')?.text}
                        </p>
                      </button>
                    ))
                  )}
                </div>

                {/* Variable Parameter Inputs */}
                {currentMetaTemplate && metaVariables.length > 0 && (
                  <div className="pt-2 border-t border-[#dbe9e0] space-y-2">
                    <label className="text-[11px] font-bold text-[#173d37] uppercase tracking-wider block">
                      Template Variables ({metaVariables.length} Parameters)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {metaVariables.map((v) => (
                        <div key={v} className="bg-white p-2 rounded-xl border border-[#dbe9e0]">
                          <div className="flex items-center justify-between text-[10px] text-[#77a193] font-mono mb-1">
                            <span>Placeholder: {`{{${v}}}`}</span>
                            <span className="text-[#176e56] font-semibold">Auto-injected</span>
                          </div>
                          <input
                            type="text"
                            value={templateParams[v] || ''}
                            onChange={(e) =>
                              setTemplateParams((prev) => ({ ...prev, [v]: e.target.value }))
                            }
                            placeholder={`Value for {{${v}}}`}
                            className="w-full text-xs text-[#173d37] font-medium focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#55776d] flex-wrap">
                      <span>Available Tags:</span>
                      <button
                        type="button"
                        onClick={() =>
                          metaVariables[0] &&
                          setTemplateParams((prev) => ({ ...prev, [metaVariables[0]]: '{patient_name}' }))
                        }
                        className="px-1.5 py-0.5 rounded bg-white text-[#176e56] font-mono border border-[#dbe9e0] hover:bg-[#eaf5ef]"
                      >
                        {'{patient_name}'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          metaVariables[1] &&
                          setTemplateParams((prev) => ({ ...prev, [metaVariables[1]]: '{doctor_name}' }))
                        }
                        className="px-1.5 py-0.5 rounded bg-white text-[#176e56] font-mono border border-[#dbe9e0] hover:bg-[#eaf5ef]"
                      >
                        {'{doctor_name}'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          metaVariables[3] &&
                          setTemplateParams((prev) => ({ ...prev, [metaVariables[3]]: '{slot_time}' }))
                        }
                        className="px-1.5 py-0.5 rounded bg-white text-[#176e56] font-mono border border-[#dbe9e0] hover:bg-[#eaf5ef]"
                      >
                        {'{slot_time}'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODE 2: AUTO-SUBMIT TO META FOR APPROVAL */}
            {dispatchMode === 'meta_create' && (
              <form
                onSubmit={handleSubmitNewTemplate}
                className="space-y-3 rounded-2xl bg-amber-50/50 border border-amber-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Submit Custom Notice for Meta Auto-Approval
                  </label>
                  <span className="text-[10px] text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded-md">
                    Instant AI Review (1–5 mins)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-[#55776d] block mb-1">
                      Template Name (lowercase &amp; underscores)
                    </label>
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="e.g. svaasth_holiday_notice"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#dbe9e0] text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#55776d] block mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as 'UTILITY' | 'MARKETING')}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#dbe9e0] text-xs font-medium"
                    >
                      <option value="UTILITY">UTILITY (Recommended - Faster Review)</option>
                      <option value="MARKETING">MARKETING</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#55776d] block mb-1">Header Title (Optional)</label>
                  <input
                    type="text"
                    value={newHeader}
                    onChange={(e) => setNewHeader(e.target.value)}
                    placeholder="e.g. Svaasth Hospital Notice"
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#dbe9e0] text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#55776d] block mb-1">
                    Body Text with Placeholders: {'{{1}}'}, {'{{2}}'}, etc.
                  </label>
                  <textarea
                    rows={3}
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-[#dbe9e0] text-xs leading-relaxed resize-none font-sans"
                    required
                  />
                </div>

                {submitSuccessMsg && (
                  <div className="p-2.5 rounded-xl bg-[#eaf5ef] border border-[#77d1a5] text-[#176e56] text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{submitSuccessMsg}</span>
                  </div>
                )}

                {submitErrorMsg && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitErrorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingTemplate || !newTemplateName.trim() || !newBody.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#176e56] hover:bg-[#125844] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isSubmittingTemplate ? 'Submitting to Meta...' : 'Submit to Meta Cloud API for Auto-Approval'}
                  </span>
                </button>
              </form>
            )}

            {/* MODE 3: ACTIVE 24H CHAT MESSAGE */}
            {dispatchMode === 'custom_text' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#173d37] uppercase tracking-wider">
                    3. Message Content
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

                <div className="flex items-center flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] text-[#55776d] mr-1">Insert Tags:</span>
                  <button
                    type="button"
                    onClick={() => setMessageText((prev) => `${prev} {patient_name}`)}
                    className="px-2 py-0.5 rounded bg-[#f3f9f5] text-[#176e56] text-[10px] font-mono font-bold hover:bg-[#eaf5ef] border border-[#dbe9e0] cursor-pointer"
                  >
                    {'{patient_name}'}
                  </button>
                  {audience === 'opd_waiting' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setMessageText((prev) => `${prev} {doctor_name}`)}
                        className="px-2 py-0.5 rounded bg-[#f3f9f5] text-[#176e56] text-[10px] font-mono font-bold hover:bg-[#eaf5ef] border border-[#dbe9e0] cursor-pointer"
                      >
                        {'{doctor_name}'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMessageText((prev) => `${prev} {slot_time}`)}
                        className="px-2 py-0.5 rounded bg-[#f3f9f5] text-[#176e56] text-[10px] font-mono font-bold hover:bg-[#eaf5ef] border border-[#dbe9e0] cursor-pointer"
                      >
                        {'{slot_time}'}
                      </button>
                    </>
                  )}
                </div>

                <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Free-form messages only reach active chats inside Meta&apos;s 24-hour window. Recipients outside 24h will auto-fallback to an approved Meta template.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Live WhatsApp Preview: 2 cols */}
          <div className="md:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-[#173d37] uppercase tracking-wider">
                WhatsApp Live Preview
              </label>
              {audience === 'opd_waiting' && samplePatient && (
                <span className="text-[10px] text-[#176e56] bg-[#eaf5ef] px-2 py-0.5 rounded-full font-semibold">
                  #{samplePatient.tokenNo} {samplePatient.name}
                </span>
              )}
            </div>

            <div className="flex-1 rounded-2xl bg-[#f4f7f5] border border-[#dbe9e0] p-4 flex flex-col justify-between shadow-inner">
              <div className="bg-white rounded-2xl p-4 border border-[#dbe9e0] shadow-xs text-xs leading-relaxed text-[#173d37] rounded-tl-xs space-y-2">
                {/* Header preview */}
                <div className="flex items-center justify-between border-b border-[#f0f4f1] pb-2 text-[11px] font-bold text-[#176e56]">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#54a987]" />
                    <span>
                      {dispatchMode === 'meta_approved' && currentMetaTemplate
                        ? currentMetaTemplate.components.find((c) => c.type === 'HEADER')?.text ||
                          'Official Hospital Notification'
                        : 'Svaasth Hospital Broadcast'}
                    </span>
                  </div>
                  {dispatchMode === 'meta_approved' && (
                    <span className="text-[9px] bg-[#eaf5ef] text-[#176e56] font-mono px-1.5 py-0.2 rounded">
                      Meta Template
                    </span>
                  )}
                </div>

                {/* Body Text */}
                <p className="whitespace-pre-wrap text-xs text-[#173d37] leading-relaxed">
                  {dispatchMode === 'meta_approved' ? templatePreviewText : plainPreviewText}
                </p>

                {/* Interactive button preview */}
                {dispatchMode === 'meta_approved' && currentMetaTemplate?.components?.find((c) => c.type === 'BUTTONS') && (
                  <div className="pt-2 border-t border-[#f0f4f1] space-y-1">
                    {currentMetaTemplate.components
                      .find((c) => c.type === 'BUTTONS')
                      ?.buttons?.map((b, i) => (
                        <div
                          key={i}
                          className="w-full py-1.5 px-3 rounded-lg bg-[#f4f8f5] text-[#176e56] text-[11px] font-semibold text-center border border-[#dbe9e0] flex items-center justify-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{b.text}</span>
                        </div>
                      ))}
                  </div>
                )}

                <div className="flex items-center justify-end text-[10px] text-[#77a193] pt-1">
                  <span>Just now • Delivered</span>
                </div>
              </div>

              {/* Delivery Guarantee Card */}
              <div className="mt-4 p-3.5 rounded-xl bg-white border border-[#dbe9e0] space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#55776d]">Recipients Target</span>
                  <span className="font-bold text-[#176e56] text-sm">{recipientCount} Patients</span>
                </div>
                <div className="text-[10px] text-[#55776d] flex items-start gap-1.5 bg-[#f7faf8] p-2 rounded-lg border border-[#e2ece5]">
                  <ShieldCheck className="w-4 h-4 text-[#176e56] shrink-0 mt-0.5" />
                  <span>
                    {dispatchMode === 'meta_approved'
                      ? 'Guaranteed Delivery: Reaches all patients, even if they have not chatted within 24 hours.'
                      : 'Active 24h Chat Mode: Outside 24h contacts will auto-fallback to an approved template.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-[#dbe9e0] bg-[#f8faf8] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#55776d]">
            <AlertCircle className="w-4 h-4 text-[#54a987]" />
            <span>Developer Mode: Outbound Meta API restricted to +91 7796308778.</span>
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
              disabled={
                isSending ||
                recipientCount === 0 ||
                (dispatchMode === 'meta_approved' && !currentMetaTemplate) ||
                (dispatchMode === 'custom_text' && !messageText.trim())
              }
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#176e56] hover:bg-[#125643] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {sentSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-[#77d1a5]" />
                  <span>Broadcast Dispatched!</span>
                </>
              ) : isSending ? (
                <span>Dispatching to {recipientCount} patients...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {dispatchMode === 'meta_approved'
                      ? `Send Meta Template to ${recipientCount} Patients`
                      : `Send Broadcast to ${recipientCount} Patients`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
