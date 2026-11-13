'use client';

import React from 'react';
import {
  MessageSquare,
  Send,
  Calendar,
  Clock,
  UserCheck,
  Stethoscope,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertCircle,
  Plus,
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
  const recentSessions = sessions.slice(0, 5);

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
              <p className="text-xs font-bold text-[#173d37]">Send Broadcast</p>
              <p className="text-[11px] text-[#55776d]">Reach all patients</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#77a193] group-hover:text-[#176e56] transition-colors" />
        </button>

        <button
          onClick={() => onOpenQuickAction('appointment')}
          className="p-4 rounded-2xl bg-white border border-[#dbe9e0] hover:border-[#176e56] hover:shadow-xs text-left transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eaf5ef] text-[#176e56] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#173d37]">Book Appointment</p>
              <p className="text-[11px] text-[#55776d]">15-min OPD slot</p>
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
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#173d37]">Message Templates</p>
              <p className="text-[11px] text-[#55776d]">Pre-approved texts</p>
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
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#173d37]">AI Live Simulator</p>
              <p className="text-[11px] text-[#55776d]">Test bot replies</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#77a193] group-hover:text-[#176e56] transition-colors" />
        </button>
      </div>

      {/* 2. Middle Grid: Doctor OPD Schedule & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left 3 Cols: OPD Schedule & Occupancy */}
        <div className="lg:col-span-3 space-y-6">
          {/* OPD Doctors Schedule Card */}
          <div className="bg-white border border-[#dbe9e0] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#173d37] flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#176e56]" />
                  <span>Today's OPD Schedule & Occupancy</span>
                </h3>
                <p className="text-xs text-[#55776d]">Live slot bookings synchronized with PMS</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#eaf5ef] text-[#176e56] text-[11px] font-bold">
                OPD Active
              </span>
            </div>

            <div className="space-y-4">
              {/* Doctor 1 */}
              <div className="p-4 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#173d37]">Dr. Vipeen Raut</h4>
                    <p className="text-xs text-[#55776d]">Orthopaedics & Joint Replacement Surgeon</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#176e56]">12 of 16 Slots Booked</span>
                    <p className="text-[10px] text-[#77a193]">75% Occupancy</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#e2eee7] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#176e56] h-full rounded-full" style={{ width: '75%' }}></div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#55776d] pt-1">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#54a987]" />
                    Morning: 10:30 AM – 1:00 PM (8 booked)
                  </span>
                  <span>Evening: 6:00 PM – 7:30 PM (4 booked)</span>
                </div>
              </div>

              {/* Doctor 2 */}
              <div className="p-4 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#173d37]">Dr. Shillpa Raut</h4>
                    <p className="text-xs text-[#55776d]">Consulting Gynecologist & Obstetrician</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#176e56]">9 of 16 Slots Booked</span>
                    <p className="text-[10px] text-[#77a193]">56% Occupancy</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#e2eee7] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#54a987] h-full rounded-full" style={{ width: '56%' }}></div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#55776d] pt-1">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#54a987]" />
                    Morning: 10:30 AM – 1:00 PM (5 booked)
                  </span>
                  <span>Evening: 6:00 PM – 7:30 PM (4 booked)</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Bot Performance Stats */}
          <div className="bg-white border border-[#dbe9e0] rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#173d37] mb-3">AI Engine Performance</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-xl bg-[#f8faf8] border border-[#dbe9e0]">
                <p className="text-xs text-[#55776d]">Automated Resolution</p>
                <p className="text-xl font-bold text-[#176e56] mt-1">92.4%</p>
                <p className="text-[10px] text-[#77a193]">Zero staff intervention</p>
              </div>
              <div className="p-3 rounded-xl bg-[#f8faf8] border border-[#dbe9e0]">
                <p className="text-xs text-[#55776d]">Human Takeover</p>
                <p className="text-xl font-bold text-[#b91c1c] mt-1">7.6%</p>
                <p className="text-[10px] text-[#77a193]">Complex triage / reception</p>
              </div>
              <div className="p-3 rounded-xl bg-[#f8faf8] border border-[#dbe9e0]">
                <p className="text-xs text-[#55776d]">Avg Reply Time</p>
                <p className="text-xl font-bold text-[#173d37] mt-1">1.1 sec</p>
                <p className="text-[10px] text-[#77a193]">Real-time WhatsApp</p>
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
                <p className="text-xs text-[#55776d]">Real-time patient WhatsApp messages</p>
              </div>
              <button
                onClick={() => onNavigateTab('chats')}
                className="text-xs font-bold text-[#176e56] hover:underline"
              >
                View all chats
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
