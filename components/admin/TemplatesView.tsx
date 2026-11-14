'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Copy,
  Check,
  Plus,
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
  Radio,
  Eye,
  Megaphone,
} from 'lucide-react';
import { QuickTemplate, WhatsAppSession } from './types';
import { SendTemplateModal } from './SendTemplateModal';

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

interface TemplatesViewProps {
  onUseTemplate?: (text: string) => void;
  onOpenBroadcast?: () => void;
  sessions?: WhatsAppSession[];
  selectedPhone?: string | null;
  onSendToContacts?: (phoneNumbers: string[], text: string, openFirstChat?: boolean) => Promise<void>;
  onOpenChat?: (phoneNumber: string) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  onUseTemplate,
  onOpenBroadcast,
  sessions = [],
  selectedPhone,
  onSendToContacts,
  onOpenChat,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'meta_approved' | 'meta_pending' | 'quick_reply'>('all');
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplate[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState<boolean>(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(true);

  // Send Template Modal State
  const [sendModalConfig, setSendModalConfig] = useState<{
    isOpen: boolean;
    text: string;
    title?: string;
  }>({
    isOpen: false,
    text: '',
    title: '',
  });

  // Form State for creating a new Meta template
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'UTILITY' | 'MARKETING'>('UTILITY');
  const [formHeader, setFormHeader] = useState('Svaasth Hospital Notice');
  const [formBody, setFormBody] = useState(
    'Dear {{1}}, please note that our OPD clinic will remain closed on {{2}} on account of {{3}}. For emergency 24/7 care, contact +91 9373280505.'
  );
  const [formSamples, setFormSamples] = useState(['Priya', '15 Nov 2026', 'National Holiday']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Hardcoded preset quick replies
  const quickReplies: QuickTemplate[] = [
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

  const fetchMetaTemplates = async () => {
    setIsLoadingMeta(true);
    setMetaError(null);
    try {
      const res = await fetch('/api/admin/templates');
      const data = await res.json();
      if (data.success && Array.isArray(data.templates)) {
        setMetaTemplates(data.templates);
      } else {
        setMetaError(data.error || 'Failed to fetch templates from Meta.');
      }
    } catch (e: any) {
      setMetaError(e.message || 'Network error fetching Meta templates');
    } finally {
      setIsLoadingMeta(false);
    }
  };

  useEffect(() => {
    fetchMetaTemplates();
  }, []);

  // Update sample count automatically when {{n}} tags in formBody change
  useEffect(() => {
    const matches = formBody.match(/\{\{(\d+)\}\}/g) || [];
    const count = matches.length;
    if (count > formSamples.length) {
      const diff = count - formSamples.length;
      const extra = Array.from({ length: diff }, (_, i) => `Sample ${formSamples.length + i + 1}`);
      setFormSamples([...formSamples, ...extra]);
    } else if (count < formSamples.length && count > 0) {
      setFormSamples(formSamples.slice(0, count));
    }
  }, [formBody]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim().toLowerCase().replace(/\s+/g, '_'),
          category: formCategory,
          headerText: formHeader.trim() || undefined,
          bodyText: formBody.trim(),
          sampleValues: formSamples,
          language: 'en_US',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit template to Meta.');
      }

      setSubmitSuccess(
        `Template "${formName}" successfully submitted to Meta! (ID: ${data.templateId}, Status: ${data.status}). Meta AI usually reviews UTILITY templates within 2 to 5 minutes.`
      );
      // Refresh template list
      await fetchMetaTemplates();
      setTimeout(() => {
        setShowCreateModal(false);
        setSubmitSuccess(null);
        setFormName('');
      }, 3000);
    } catch (err: any) {
      setSubmitError(err.message || 'Error creating template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to extract text from Meta template
  const getMetaTemplateBody = (tmpl: MetaTemplate) => {
    const bodyComp = tmpl.components.find((c) => c.type === 'BODY');
    return bodyComp?.text || '';
  };

  const getMetaTemplateHeader = (tmpl: MetaTemplate) => {
    const headerComp = tmpl.components.find((c) => c.type === 'HEADER');
    return headerComp?.text || null;
  };

  // Filter templates based on activeTab
  const approvedMeta = metaTemplates.filter((t) => t.status === 'APPROVED');
  const pendingMeta = metaTemplates.filter((t) => t.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#173d37]">WhatsApp Message Templates</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#eaf5ef] text-[#176e56] border border-[#dbe9e0]">
              Meta Cloud API
            </span>
          </div>
          <p className="text-xs text-[#55776d] mt-1">
            Meta-approved templates required for outbound broadcasts &amp; messaging patients outside the 24-hour service window.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMetaTemplates}
            disabled={isLoadingMeta}
            className="p-2 rounded-xl bg-white border border-[#dbe9e0] hover:bg-[#eaf5ef] text-[#176e56] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            title="Refresh templates from Meta"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMeta ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync Meta</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#176e56] hover:bg-[#125844] text-white text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Meta Template</span>
          </button>
        </div>
      </div>

      {/* Educational Banner on How Meta Approvals Work */}
      {showGuide && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#eaf5ef] to-[#f4faf6] border border-[#77d1a5]/50 relative">
          <button
            onClick={() => setShowGuide(false)}
            className="absolute top-3 right-3 text-[#55776d] hover:text-[#173d37] p-1 rounded-lg"
            title="Dismiss guide"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#176e56] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1.5 text-xs text-[#173d37] pr-6">
              <h4 className="font-bold text-sm text-[#176e56]">
                How WhatsApp Template Approvals Work Outside the 24-Hour Window
              </h4>
              <p className="text-[#3b5e54] leading-relaxed">
                WhatsApp allows free conversational replies for <strong>24 hours</strong> after a patient messages you.
                To start a conversation or broadcast after 24 hours, WhatsApp Cloud API requires a <strong>Meta-Approved Template</strong>.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1.5">
                <div className="p-2.5 rounded-xl bg-white/80 border border-[#dbe9e0]">
                  <strong className="text-[#176e56] block">1. Category Selection</strong>
                  Use <strong>UTILITY</strong> for reminders, delay alerts &amp; holiday notices (approved by Meta AI in <strong>1 to 5 minutes</strong>).
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 border border-[#dbe9e0]">
                  <strong className="text-[#176e56] block">2. Variables &amp; Samples</strong>
                  Use sequential placeholders like <code className="bg-white px-1 py-0.5 rounded border border-[#dbe9e0]">{'{{1}}'}</code>, <code className="bg-white px-1 py-0.5 rounded border border-[#dbe9e0]">{'{{2}}'}</code> with real sample values.
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 border border-[#dbe9e0]">
                  <strong className="text-[#176e56] block">3. One-Click Meta Submit</strong>
                  Click <strong>&quot;+ Create Meta Template&quot;</strong> above to submit directly, or manage templates in{' '}
                  <a
                    href="https://business.facebook.com/wa/manage/home/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-[#176e56] font-semibold inline-flex items-center gap-0.5"
                  >
                    Meta WhatsApp Manager <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dbe9e0] pb-2">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-[#176e56] text-white shadow-xs'
                : 'bg-white border border-[#dbe9e0] text-[#55776d] hover:bg-[#eaf5ef]'
            }`}
          >
            All ({metaTemplates.length + quickReplies.length})
          </button>
          <button
            onClick={() => setActiveTab('meta_approved')}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'meta_approved'
                ? 'bg-[#176e56] text-white shadow-xs'
                : 'bg-white border border-[#dbe9e0] text-[#176e56] hover:bg-[#eaf5ef]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#54a987]" />
            Meta Approved ({approvedMeta.length})
          </button>
          <button
            onClick={() => setActiveTab('meta_pending')}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'meta_pending'
                ? 'bg-[#176e56] text-white shadow-xs'
                : 'bg-white border border-[#dbe9e0] text-amber-700 hover:bg-amber-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Meta In-Review ({pendingMeta.length})
          </button>
          <button
            onClick={() => setActiveTab('quick_reply')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === 'quick_reply'
                ? 'bg-[#176e56] text-white shadow-xs'
                : 'bg-white border border-[#dbe9e0] text-[#55776d] hover:bg-[#eaf5ef]'
            }`}
          >
            24h Chat Snippets ({quickReplies.length})
          </button>
        </div>

        <div className="text-[11px] text-[#55776d] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#54a987] animate-pulse"></span>
          <span>Meta WABA ID: <strong>479847545221049</strong></span>
        </div>
      </div>

      {/* Grid of Meta Templates */}
      {(activeTab === 'all' || activeTab === 'meta_approved' || activeTab === 'meta_pending') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#55776d] flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-[#176e56]" />
              Official Meta Cloud API Templates (Broadcast Capable)
            </h3>
            {isLoadingMeta && <span className="text-[11px] text-[#55776d]">Checking Meta status...</span>}
          </div>

          {metaError && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{metaError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metaTemplates
              .filter((t) => {
                if (activeTab === 'meta_approved') return t.status === 'APPROVED';
                if (activeTab === 'meta_pending') return t.status === 'PENDING';
                return true;
              })
              .map((tmpl) => {
                const bodyText = getMetaTemplateBody(tmpl);
                const headerText = getMetaTemplateHeader(tmpl);

                return (
                  <div
                    key={tmpl.id}
                    className="p-5 rounded-2xl bg-white border border-[#dbe9e0] shadow-xs hover:border-[#54a987] hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Badge Row */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              tmpl.category === 'UTILITY'
                                ? 'bg-[#eaf5ef] text-[#176e56]'
                                : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {tmpl.category}
                          </span>
                          <span className="text-[10px] text-[#77a193] uppercase font-mono">{tmpl.language}</span>
                        </div>

                        {/* Status Badge */}
                        {tmpl.status === 'APPROVED' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eaf5ef] text-[#176e56] border border-[#77d1a5]/50 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#176e56]" />
                            APPROVED
                          </span>
                        ) : tmpl.status === 'PENDING' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                            REVIEW PENDING
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            {tmpl.status}
                          </span>
                        )}
                      </div>

                      {/* Title & Meta ID */}
                      <div className="mb-2">
                        <h4 className="text-sm font-bold text-[#173d37] font-mono">{tmpl.name}</h4>
                        <div className="text-[10px] text-[#77a193] font-mono">Meta ID: {tmpl.id}</div>
                      </div>

                      {/* Header preview if any */}
                      {headerText && (
                        <div className="text-xs font-bold text-[#176e56] mb-1 px-1">
                          📌 {headerText}
                        </div>
                      )}

                      {/* Body preview */}
                      <div className="p-3 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-xs font-mono text-[#173d37] whitespace-pre-wrap leading-relaxed line-clamp-6">
                        {bodyText}
                      </div>

                      {/* Notice for Pending */}
                      {tmpl.status === 'PENDING' && (
                        <div className="mt-2 p-2 rounded-lg bg-amber-50/70 border border-amber-200/50 text-[11px] text-amber-800 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>Submitted to Meta. Auto-verification in 1–5 mins.</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#dbe9e0]">
                      <button
                        onClick={() => handleCopy(bodyText, tmpl.id)}
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
                            <span>Copy Body</span>
                          </>
                        )}
                      </button>

                      {tmpl.status === 'APPROVED' ? (
                        <button
                          onClick={() => {
                            setSendModalConfig({
                              isOpen: true,
                              text: bodyText,
                              title: `Meta: ${tmpl.name}`,
                            });
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#176e56] hover:bg-[#125844] text-white text-xs font-bold transition-all shadow-xs"
                        >
                          <Send className="w-3 h-3" />
                          <span>Use in Chat</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-amber-700 font-medium">Awaiting Meta Approval</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Grid of 24h Quick Replies */}
      {(activeTab === 'all' || activeTab === 'quick_reply') && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#55776d] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#176e56]" />
              Hospital Quick Replies (Active 24h Patient Chats)
            </h3>
            <span className="text-[11px] text-[#55776d]">Freeform instant snippets for live conversations</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickReplies.map((tmpl) => (
              <div
                key={tmpl.id}
                className="p-5 rounded-2xl bg-white border border-[#dbe9e0] shadow-xs hover:border-[#54a987] hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#eaf5ef] text-[#176e56]">
                      {tmpl.category}
                    </span>
                    <span className="text-[10px] text-[#54a987] font-semibold">24h Ready</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#173d37] mb-2">{tmpl.title}</h4>
                  <div className="p-3 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-xs font-mono text-[#173d37] whitespace-pre-wrap leading-relaxed line-clamp-6">
                    {tmpl.text}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#dbe9e0]">
                  <button
                    onClick={() => handleCopy(tmpl.text, tmpl.id)}
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
                    onClick={() => {
                      setSendModalConfig({
                        isOpen: true,
                        text: tmpl.text,
                        title: tmpl.title,
                      });
                    }}
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
      )}

      {/* CREATE META TEMPLATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#dbe9e0] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#dbe9e0]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#176e56] text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#173d37]">Create &amp; Submit Meta Template</h3>
                  <p className="text-xs text-[#55776d]">
                    Submits to WhatsApp Cloud API for review (Auto-approved by Meta AI in 1–5 mins)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-[#55776d] hover:text-[#173d37] hover:bg-[#eaf5ef] rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success or Error Banners */}
            {submitSuccess && (
              <div className="p-3.5 rounded-2xl bg-[#eaf5ef] border border-[#77d1a5] text-xs text-[#176e56] font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}
            {submitError && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Row 1: Name and Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#173d37] mb-1">
                    Template Identifier (Lowercase, No spaces)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. svaasth_holiday_notice"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    className="w-full px-3 py-2 rounded-xl border border-[#dbe9e0] focus:outline-hidden focus:border-[#176e56] bg-[#f8faf8] font-mono text-xs text-[#173d37]"
                  />
                  <span className="text-[10px] text-[#77a193] mt-0.5 block">
                    Meta requires lowercase letters, numbers, and underscores only.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-[#173d37] mb-1">Meta Template Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#dbe9e0] focus:outline-hidden focus:border-[#176e56] bg-[#f8faf8] text-xs text-[#173d37] font-semibold"
                  >
                    <option value="UTILITY">UTILITY (Fastest Review: 1–5 min, reminders, alerts, notices)</option>
                    <option value="MARKETING">MARKETING (Health camps, discounts, announcements)</option>
                  </select>
                  <span className="text-[10px] text-[#77a193] mt-0.5 block">
                    UTILITY templates are cheaper and get instant automated approval.
                  </span>
                </div>
              </div>

              {/* Row 2: Header */}
              <div>
                <label className="block font-bold text-[#173d37] mb-1">Header Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Svaasth Hospital Notice"
                  value={formHeader}
                  onChange={(e) => setFormHeader(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#dbe9e0] focus:outline-hidden focus:border-[#176e56] bg-[#f8faf8] text-xs text-[#173d37]"
                />
              </div>

              {/* Row 3: Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#173d37]">
                    Message Body Text (with {'{{1}}'}, {'{{2}}'})
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFormBody((prev) => `${prev} {{1}}`)}
                      className="px-2 py-0.5 rounded-md bg-[#eaf5ef] text-[#176e56] text-[10px] font-bold hover:bg-[#176e56] hover:text-white transition-all"
                    >
                      + {'{{1}}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormBody((prev) => `${prev} {{2}}`)}
                      className="px-2 py-0.5 rounded-md bg-[#eaf5ef] text-[#176e56] text-[10px] font-bold hover:bg-[#176e56] hover:text-white transition-all"
                    >
                      + {'{{2}}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormBody((prev) => `${prev} {{3}}`)}
                      className="px-2 py-0.5 rounded-md bg-[#eaf5ef] text-[#176e56] text-[10px] font-bold hover:bg-[#176e56] hover:text-white transition-all"
                    >
                      + {'{{3}}'}
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  required
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#dbe9e0] focus:outline-hidden focus:border-[#176e56] bg-[#f8faf8] font-mono text-xs text-[#173d37] leading-relaxed"
                />
                <span className="text-[10px] text-[#77a193] mt-0.5 block">
                  Rule: Variables cannot be at the very start or end of text.
                </span>
              </div>

              {/* Row 4: Sample Values (Mandatory for Meta approval) */}
              {formSamples.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-[#f8faf8] border border-[#dbe9e0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#173d37] text-xs">
                      Mandatory Sample Values for Meta AI Review
                    </span>
                    <span className="text-[10px] text-[#55776d]">{formSamples.length} variables detected</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {formSamples.map((sample, idx) => (
                      <div key={idx}>
                        <label className="text-[10px] font-bold text-[#55776d] block mb-0.5">
                          {`{{${idx + 1}}}`} sample:
                        </label>
                        <input
                          type="text"
                          required
                          value={sample}
                          onChange={(e) => {
                            const updated = [...formSamples];
                            updated[idx] = e.target.value;
                            setFormSamples(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#dbe9e0] bg-white text-xs text-[#173d37]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Preview Card */}
              <div className="p-3.5 rounded-2xl bg-[#eaf5ef]/50 border border-[#77d1a5]/40">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#176e56] mb-1.5 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  Live WhatsApp Mobile Preview
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#dbe9e0] max-w-sm shadow-xs space-y-1">
                  {formHeader && (
                    <div className="font-bold text-xs text-[#173d37] pb-1 border-b border-[#f0f4f1]">
                      {formHeader}
                    </div>
                  )}
                  <div className="text-xs text-[#173d37] whitespace-pre-wrap leading-relaxed">
                    {formBody.replace(/\{\{(\d+)\}\}/g, (_, n) => {
                      const idx = parseInt(n, 10) - 1;
                      return formSamples[idx] || `[Variable ${n}]`;
                    })}
                  </div>
                  <div className="text-right text-[10px] text-gray-400">10:30 AM ✓✓</div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#dbe9e0]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#dbe9e0] text-[#55776d] hover:bg-[#eaf5ef] font-semibold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formName || !formBody}
                  className="px-5 py-2 rounded-xl bg-[#176e56] hover:bg-[#125844] text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting to Meta...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Submit to Meta Cloud API</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEND TEMPLATE MODAL WITH WHERE-TO-SEND & RECENT CONTACTS LIST */}
      <SendTemplateModal
        isOpen={sendModalConfig.isOpen}
        onClose={() => setSendModalConfig((prev) => ({ ...prev, isOpen: false }))}
        templateText={sendModalConfig.text}
        templateTitle={sendModalConfig.title}
        sessions={sessions || []}
        activePhone={selectedPhone}
        onSend={async (phoneNumbers, text, openFirstChat) => {
          if (onSendToContacts) {
            await onSendToContacts(phoneNumbers, text, openFirstChat);
          } else if (onUseTemplate) {
            onUseTemplate(text);
          }
        }}
      />
    </div>
  );
};
