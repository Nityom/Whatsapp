'use client';

import React from 'react';
import {
  MessageSquare,
  Send,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  FileText,
  Users,
  Smartphone,
  Bot,
  Zap,
} from 'lucide-react';
import { WhatsAppSession, DashboardStats } from './types';

interface DashboardHomeViewProps {
  sessions: WhatsAppSession[];
  stats?: DashboardStats;
  onOpenChat: (phone: string) => void;
  onOpenBulkModal: () => void;
  onOpenQuickAction: (action: 'appointment' | 'prescription' | 'bill' | 'reminder') => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardHomeView: React.FC<DashboardHomeViewProps> = ({
  sessions,
  stats,
  onOpenChat,
  onOpenBulkModal,
  onOpenQuickAction,
  onNavigateTab,
}) => {
  const recentSessions = sessions.slice(0, 6);

  // Chatbot services engagement breakdown
  const chatbotIntents = [
    { label: 'OPD Appointments Booked', percentage: 48, count: 598, color: 'bg-[#176e56]' },
    { label: 'Digital Prescriptions Viewed', percentage: 26, count: 324, color: 'bg-[#54a987]' },
    { label: 'Clinic Timings & Directions', percentage: 14, count: 175, color: 'bg-[#77d1a5]' },
    { label: 'Billing & Payment Queries', percentage: 8, count: 99, color: 'bg-[#a3e2c3]' },
    { label: 'Reception Staff Handover', percentage: 4, count: 52, color: 'bg-[#d2efe2]' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Quick Launchpad Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={onOpenBulkModal}
          className="p-4 rounded-2xl bg-white border border-[#dbe9e0] hover:border-[#176e56] hover:shadow-xs text-left transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eaf5ef] text-[#176e56] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#173d37]">Send Bulk Broadcast</p>
              <p className="text-[11px] text-[#55776d]">Reach all contacts</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#77a193] group-hover:text-[#176e56] transition-colors" />
        </button>

        <button
          onClick={() => onNavigateTab('templates')}
          className="p-4 rounded-2xl bg-white border border-[#dbe9e0] hover:border-[#176e56] hover:shadow-xs text-left transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eaf5ef] text-[#176e56] flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#173d37]">Message Templates</p>
              <p className="text-[11px] text-[#55776d]">Pre-approved texts</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#77a193] group-hover:text-[#176e56] transition-colors" />
        </button>

        <button
          onClick={() => onNavigateTab('contacts')}
          className="p-4 rounded-2xl bg-white border border-[#dbe9e0] hover:border-[#176e56] hover:shadow-xs text-left transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eaf5ef] text-[#176e56] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#173d37]">Contacts Directory</p>
              <p className="text-[11px] text-[#55776d]">Patient database</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#77a193] group-hover:text-[#176e56] transition-colors" />
        </button>

        <button
          onClick={() => onNavigateTab('simulator')}
          className="p-4 rounded-2xl bg-white border border-[#dbe9e0] hover:border-[#176e56] hover:shadow-xs text-left transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eaf5ef] text-[#176e56] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#173d37]">Live Bot Simulator</p>
              <p className="text-[11px] text-[#55776d]">Test AI interactions</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#77a193] group-hover:text-[#176e56] transition-colors" />
        </button>
      </div>

      {/* 2. Middle Grid: Chatbot Analytics & Live Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left 3 Cols: Chatbot Engagement & AI Performance */}
        <div className="lg:col-span-3 space-y-6">
          {/* Chatbot Inquiries & Intent Breakdown */}
          <div className="bg-white border border-[#dbe9e0] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#173d37] flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#176e56]" />
                  <span>Chatbot Automated Services Breakdown</span>
                </h3>
                <p className="text-xs text-[#55776d]">
                  Patient self-service engagement via Svaasth Connect
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#eaf5ef] text-[#176e56] text-[11px] font-bold">
                1,248 Sessions
              </span>
            </div>

            <div className="space-y-3.5">
              {chatbotIntents.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#173d37]">{item.label}</span>
                    <div className="flex items-center gap-2 text-[#55776d]">
                      <span>{item.count} sessions</span>
                      <span className="font-bold text-[#176e56]">{item.percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#e2eee7] h-2 rounded-full overflow-hidden">
                    <div
                      className={`${item.color} h-full rounded-full transition-all`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-[#edf5f0] flex items-center justify-between text-xs text-[#55776d]">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#54a987]" />
                Peak Bot Traffic: 10:00 AM – 1:00 PM & 6:00 PM – 8:00 PM
              </span>
              <span className="font-semibold text-[#176e56]">24/7 Virtual Availability</span>
            </div>
          </div>

          {/* AI Bot Performance & Automation Health */}
          <div className="bg-white border border-[#dbe9e0] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#173d37] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#176e56]" />
                <span>AI Bot Automation Health</span>
              </h3>
              <span className="text-xs text-[#77a193]">Live Metrics</span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3.5 rounded-xl bg-[#f8faf8] border border-[#dbe9e0]">
                <p className="text-xs text-[#55776d] font-medium">Automated Resolution</p>
                <p className="text-2xl font-bold text-[#176e56] mt-1 tracking-tight">92.4%</p>
                <p className="text-[10px] text-[#77a193] mt-0.5">Completed without staff</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#f8faf8] border border-[#dbe9e0]">
                <p className="text-xs text-[#55776d] font-medium">Human Handover</p>
                <p className="text-2xl font-bold text-[#b91c1c] mt-1 tracking-tight">7.6%</p>
                <p className="text-[10px] text-[#77a193] mt-0.5">Transferred to reception</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#f8faf8] border border-[#dbe9e0]">
                <p className="text-xs text-[#55776d] font-medium">Avg Response Speed</p>
                <p className="text-2xl font-bold text-[#173d37] mt-1 tracking-tight">1.1s</p>
                <p className="text-[10px] text-[#77a193] mt-0.5">Meta Graph API v20.0</p>
              </div>
            </div>

            {/* Language distribution pills */}
            <div className="mt-4 pt-3 border-t border-[#edf5f0] flex items-center justify-between text-xs text-[#55776d]">
              <span>Active Languages:</span>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="px-2 py-0.5 rounded-full bg-[#eaf5ef] text-[#176e56]">
                  English (52%)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#eaf5ef] text-[#176e56]">
                  मराठी (34%)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#eaf5ef] text-[#176e56]">
                  हिन्दी (14%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Live Conversations Stream */}
        <div className="lg:col-span-2 bg-white border border-[#dbe9e0] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#173d37]">Live Inquiries Stream</h3>
                <p className="text-xs text-[#55776d]">Recent patient WhatsApp messages</p>
              </div>
              <button
                onClick={() => onNavigateTab('chats')}
                className="text-xs font-bold text-[#176e56] hover:underline"
              >
                View all
              </button>
            </div>

            <div className="divide-y divide-[#edf5f0] space-y-2">
              {recentSessions.map((session) => (
                <div
                  key={session.phoneNumber}
                  className="pt-2 pb-1 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#ede9fe] text-[#6d28d9] font-bold text-xs flex items-center justify-center shrink-0">
                      {session.patientName
                        ? session.patientName.slice(0, 2).toUpperCase()
                        : 'WA'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#173d37] truncate">
                        {session.patientName || `+${session.phoneNumber}`}
                      </p>
                      <p className="text-[11px] text-[#55776d] truncate">
                        {session.lastMessage || 'Recent inquiry'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onOpenChat(session.phoneNumber);
                      onNavigateTab('chats');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#eaf5ef] hover:bg-[#176e56] hover:text-white text-[#176e56] text-[11px] font-bold transition-all shrink-0"
                  >
                    Reply
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('chats')}
            className="w-full mt-6 py-2.5 rounded-xl bg-[#176e56] hover:bg-[#125643] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Open All WhatsApp Conversations</span>
          </button>
        </div>
      </div>
    </div>
  );
};
