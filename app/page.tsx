'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/admin/Sidebar';
import { Header } from '@/components/admin/Header';
import { StatCards } from '@/components/admin/StatCards';
import { DashboardHomeView } from '@/components/admin/DashboardHomeView';
import { ChatListColumn } from '@/components/admin/ChatListColumn';
import { ChatThreadColumn } from '@/components/admin/ChatThreadColumn';
import { PatientDetailColumn } from '@/components/admin/PatientDetailColumn';
import { BulkMessageModal } from '@/components/admin/BulkMessageModal';
import { QuickActionModals } from '@/components/admin/QuickActionModals';
import { TemplatesView } from '@/components/admin/TemplatesView';
import { BroadcastView } from '@/components/admin/BroadcastView';
import { ContactsView } from '@/components/admin/ContactsView';
import { SimulatorDrawer } from '@/components/admin/SimulatorDrawer';
import { ReportsView } from '@/components/admin/ReportsView';
import { AutomationView } from '@/components/admin/AutomationView';
import {
  NavTab,
  ChatFilter,
  WhatsAppSession,
  ChatMessage,
  DashboardStats,
  OpdWaitingPatient,
} from '@/components/admin/types';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [dateRange, setDateRange] = useState('Last 7 Days');
  const [chatFilter, setChatFilter] = useState<ChatFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [waitingPatients, setWaitingPatients] = useState<OpdWaitingPatient[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string>('919876543210');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<DashboardStats | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // New UX state: minimize sidebar & toggle client profile drawer
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Modals state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [quickActionType, setQuickActionType] = useState<
    'appointment' | 'prescription' | 'bill' | 'reminder' | null
  >(null);

  // Fetch all sessions & dashboard stats
  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
        setStats(data.stats);
        if (Array.isArray(data.waitingPatients)) {
          setWaitingPatients(data.waitingPatients);
        }

        // If no phone selected yet, pick the first one
        if (!selectedPhone && data.sessions?.length > 0) {
          setSelectedPhone(data.sessions[0].phoneNumber);
        }
      }
    } catch (err) {
      console.error('[Fetch Dashboard Error]', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPhone]);

  // Fetch chat history for selected phone
  const fetchChatHistory = useCallback(async (phone: string) => {
    if (!phone) return;
    try {
      const res = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_history',
          phoneNumber: phone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('[Fetch Chat History Error]', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh chat history when selected phone changes
  useEffect(() => {
    if (selectedPhone) {
      fetchChatHistory(selectedPhone);
    }
  }, [selectedPhone, fetchChatHistory]);

  // Periodic poll to keep conversations reactive & in real-time sync with WhatsApp
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
      if (selectedPhone) {
        fetchChatHistory(selectedPhone);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchDashboardData, fetchChatHistory, selectedPhone]);

  // Active selected session object
  const activeSession =
    sessions.find((s) => s.phoneNumber === selectedPhone) ||
    sessions[0] ||
    null;

  // Handle staff reply
  const handleSendMessage = async (
    text: string,
    attachment?: {
      fileUrl: string;
      filename: string;
      mimeType: string;
      fileSize?: string;
    }
  ) => {
    if (!selectedPhone || (!text.trim() && !attachment)) return;
    setIsSendingMessage(true);

    const messageText = text || (attachment ? `📎 ${attachment.filename}` : '');

    // Optimistic UI update
    const optimisticMsg: ChatMessage = {
      phoneNumber: selectedPhone,
      sender: 'staff',
      text: messageText,
      metadata: attachment ? { ...attachment, isAttachment: true } : undefined,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_staff_reply',
          phoneNumber: selectedPhone,
          text: messageText,
          attachment,
        }),
      });
      await fetchChatHistory(selectedPhone);
      await fetchDashboardData();
    } catch (err) {
      console.error('[Send Message Error]', err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handle Meta WhatsApp Template message dispatch (bypasses 24h care window)
  const handleSendTemplate = async (templateName: string, parameters: string[] = []) => {
    if (!selectedPhone) return;
    setIsSendingMessage(true);

    try {
      await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_template',
          phoneNumber: selectedPhone,
          templateName,
          parameters,
        }),
      });
      await fetchChatHistory(selectedPhone);
      await fetchDashboardData();
    } catch (err) {
      console.error('[Send Template Error]', err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Toggle bot handover / takeover
  const handleToggleBotHandover = async () => {
    if (!activeSession) return;
    const nextHandoverState = !(activeSession.isHandedOver ?? false);

    try {
      await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_handover',
          phoneNumber: activeSession.phoneNumber,
          isHandedOver: nextHandoverState,
        }),
      });
      await fetchDashboardData();
    } catch (err) {
      console.error('[Toggle Handover Error]', err);
    }
  };

  // Handle update notes
  const handleUpdateNotes = async (notes: string) => {
    if (!activeSession) return;
    try {
      await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_meta',
          phoneNumber: activeSession.phoneNumber,
          notes,
        }),
      });
      await fetchDashboardData();
    } catch (err) {
      console.error('[Update Notes Error]', err);
    }
  };

  // Handle add tag
  const handleAddTag = async (newTag: string) => {
    if (!activeSession) return;
    const currentTags = activeSession.tags || ['Patient'];
    if (currentTags.includes(newTag)) return;
    const updatedTags = [...currentTags, newTag];

    try {
      await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_meta',
          phoneNumber: activeSession.phoneNumber,
          tags: updatedTags,
        }),
      });
      await fetchDashboardData();
    } catch (err) {
      console.error('[Add Tag Error]', err);
    }
  };

  // Handle bulk broadcast
  const handleSendBulk = async (
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
  ) => {
    try {
      await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_bulk',
          phoneNumbers,
          text,
          campaignTitle,
          targetAudience,
          personalizedMessages,
          templateName: templateMeta?.templateName,
          templateLanguage: templateMeta?.templateLanguage,
          personalizedTemplateParams: templateMeta?.personalizedTemplateParams,
        }),
      });
      await fetchDashboardData();
      if (selectedPhone) {
        await fetchChatHistory(selectedPhone);
      }
    } catch (err) {
      console.error('[Send Bulk Error]', err);
    }
  };

  // Handle template dispatch to one or multiple selected contacts
  const handleSendTemplateToContacts = async (
    phoneNumbers: string[],
    text: string,
    openFirstChat: boolean = false
  ) => {
    if (phoneNumbers.length === 0) return;

    if (phoneNumbers.length === 1) {
      const targetPhone = phoneNumbers[0];
      const targetSession = sessions.find(
        (s) => s.phoneNumber.replace(/\D/g, '') === targetPhone
      );
      const personalized = text
        .replace(/{patient_name}/g, targetSession?.patientName || 'Valued Patient')
        .replace(/{reference}/g, targetSession?.patientReference || '');

      await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_staff_reply',
          phoneNumber: targetPhone,
          text: personalized,
        }),
      });

      setSelectedPhone(targetPhone);
      await fetchChatHistory(targetPhone);
      await fetchDashboardData();

      if (openFirstChat) {
        setActiveTab('chats');
      }
    } else {
      const personalizedMap: Record<string, string> = {};
      phoneNumbers.forEach((p) => {
        const sess = sessions.find((s) => s.phoneNumber.replace(/\D/g, '') === p);
        personalizedMap[p] = text
          .replace(/{patient_name}/g, sess?.patientName || 'Valued Patient')
          .replace(/{reference}/g, sess?.patientReference || '');
      });

      await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_bulk',
          phoneNumbers,
          text,
          campaignTitle: 'Template Message Broadcast',
          targetAudience: 'Selected Contacts',
          personalizedMessages: personalizedMap,
        }),
      });

      await fetchDashboardData();
      if (openFirstChat && phoneNumbers.length > 0) {
        setSelectedPhone(phoneNumbers[0]);
        await fetchChatHistory(phoneNumbers[0]);
        setActiveTab('chats');
      }
    }
  };

  const unreadTotal = sessions.reduce((acc, s) => acc + (s.unreadCount || 0), 0);

  return (
    <div className="min-h-screen bg-[#f8faf8] text-[#173d37] flex">
      {/* 1. Left Persistent Sidebar with Minimize/Collapse */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        unreadCount={unreadTotal}
        isWhatsAppConnected={true}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* 2. Main Dashboard Content */}
      <main className="flex-1 p-6 md:p-8 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <Header
          userName="Nityom"
          dateRange={dateRange}
          onChangeDateRange={setDateRange}
          onOpenBulkModal={() => setIsBulkModalOpen(true)}
        />

        {/* 4 Stat Cards (Displayed on Executive Dashboard Overview) */}
        {activeTab === 'dashboard' && <StatCards stats={stats} />}

        {/* TAB 1: EXECUTIVE DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <DashboardHomeView
            sessions={sessions}
            stats={stats}
            onOpenChat={(phone) => {
              setSelectedPhone(phone);
              setActiveTab('chats');
            }}
            onOpenBulkModal={() => setIsBulkModalOpen(true)}
            onOpenQuickAction={(action) => setQuickActionType(action)}
            onNavigateTab={setActiveTab}
          />
        )}

        {/* TAB 2: DEDICATED CHATS WORKSPACE */}
        {activeTab === 'chats' && (
          <div className="flex flex-col lg:flex-row gap-5 items-start mt-1">
            {/* Column 1: Conversations List */}
            <ChatListColumn
              sessions={sessions}
              selectedPhone={selectedPhone}
              onSelectSession={(phone) => setSelectedPhone(phone)}
              filter={chatFilter}
              onChangeFilter={setChatFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            {/* Column 2: Active Chat Conversation Thread */}
            <ChatThreadColumn
              session={activeSession}
              messages={messages}
              onSendMessage={handleSendMessage}
              onSendTemplate={handleSendTemplate}
              onToggleBotHandover={handleToggleBotHandover}
              onOpenProfile={() => setIsProfileOpen((prev) => !prev)}
              isProfileOpen={isProfileOpen}
              isSending={isSendingMessage}
            />

            {/* Column 3: Patient Profile & Quick Actions (ONLY open when clicking profile header) */}
            {isProfileOpen && (
              <PatientDetailColumn
                session={activeSession}
                onOpenQuickAction={(action) => setQuickActionType(action)}
                onUpdateNotes={handleUpdateNotes}
                onAddTag={handleAddTag}
                onClose={() => setIsProfileOpen(false)}
              />
            )}
          </div>
        )}

        {/* TAB 3: Broadcast & Campaigns View (Serves both 'broadcast' and 'campaigns' tabs) */}
        {(activeTab === 'broadcast' || activeTab === 'campaigns') && (
          <div className="mt-4">
            <BroadcastView
              campaigns={stats?.campaigns}
              waitingPatients={waitingPatients}
              onOpenNewCampaign={() => setIsBulkModalOpen(true)}
            />
          </div>
        )}

        {/* TAB 4: Templates View */}
        {activeTab === 'templates' && (
          <div className="mt-4">
            <TemplatesView
              sessions={sessions}
              selectedPhone={selectedPhone}
              onSendToContacts={handleSendTemplateToContacts}
              onOpenChat={(phone) => {
                setSelectedPhone(phone);
                setActiveTab('chats');
              }}
              onOpenBroadcast={() => setIsBulkModalOpen(true)}
              onUseTemplate={(text) => {
                setActiveTab('chats');
                handleSendMessage(text);
              }}
            />
          </div>
        )}

        {/* TAB 5: Contacts Directory View with Pagination */}
        {activeTab === 'contacts' && (
          <div className="mt-4">
            <ContactsView
              sessions={sessions}
              onOpenChat={(phone) => {
                setSelectedPhone(phone);
                setActiveTab('chats');
              }}
              onBookAppointment={(phone) => {
                setSelectedPhone(phone);
                setQuickActionType('appointment');
              }}
            />
          </div>
        )}

        {/* TAB 6: Live Simulator View */}
        {activeTab === 'simulator' && (
          <div className="mt-4">
            <SimulatorDrawer
              onRefreshSessions={() => {
                fetchDashboardData();
                if (selectedPhone) fetchChatHistory(selectedPhone);
              }}
            />
          </div>
        )}

        {/* TAB 7: Hospital Automation Workflows View */}
        {activeTab === 'automation' && (
          <div className="mt-4">
            <AutomationView />
          </div>
        )}

        {/* TAB 8: Reports & Hospital Analytics View */}
        {activeTab === 'reports' && (
          <div className="mt-4">
            <ReportsView
              stats={stats}
              sessions={sessions}
              dateRange={dateRange}
            />
          </div>
        )}

        {/* TAB 9: Settings View */}
        {activeTab === 'settings' && (
          <div className="mt-4 p-6 bg-white border border-[#dbe9e0] rounded-2xl shadow-xs space-y-4 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-[#173d37]">Svaasth Connect System Settings</h3>
              <p className="text-xs text-[#55776d] mt-0.5">Configuration and integration health for WhatsApp Business API and Cortex PMS.</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#173d37]">WhatsApp Cloud API</p>
                  <p className="text-[#55776d] mt-0.5">Meta Graph API v21.0 • WABA ID: 479847545221049</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#eaf5ef] text-[#176e56] font-bold border border-[#c2e4cf]">
                  Connected ✓
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#173d37]">Hospital PMS Integration</p>
                  <p className="text-[#55776d] mt-0.5">Cortex PMS (Appointments, Prescriptions, Billing, Patients)</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#eaf5ef] text-[#176e56] font-bold border border-[#c2e4cf]">
                  Synced ✓
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#166534]">Development Guardrail Active</p>
                  <p className="text-[#15803d] mt-0.5">Target Developer Phone: +91 7796308778 (Other numbers are simulated safely)</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#dcfce7] text-[#166534] font-bold">
                  Enforced
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. Global Bulk Message Modal */}
      <BulkMessageModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        sessions={sessions}
        waitingPatients={waitingPatients}
        onSendBulk={handleSendBulk}
      />

      {/* 4. Quick Action Modals (Appointment, Prescription, Bill, Reminder) */}
      <QuickActionModals
        actionType={quickActionType}
        onClose={() => setQuickActionType(null)}
        session={activeSession}
        onSendDirectMessage={handleSendMessage}
      />
    </div>
  );
}
