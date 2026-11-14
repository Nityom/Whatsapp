'use client';

import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Calendar,
  Clock,
  Sparkles,
  TrendingUp,
  Activity,
  CheckCircle2,
  Bot,
  Zap,
  PieChart,
  BarChart2,
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
  const [chartView, setChartView] = useState<'pie' | 'bars'>('pie');
  const [hoveredIntentIdx, setHoveredIntentIdx] = useState<number | null>(null);

  // Chatbot services engagement breakdown
  const chatbotIntents = [
    {
      label: 'OPD Appointments Booked',
      shortLabel: 'Appointments',
      percentage: 48,
      count: 598,
      color: 'bg-[#176e56]',
      hex: '#176e56',
    },
    {
      label: 'Digital Prescriptions Viewed',
      shortLabel: 'Prescriptions',
      percentage: 26,
      count: 324,
      color: 'bg-[#2a9d8f]',
      hex: '#2a9d8f',
    },
    {
      label: 'Clinic Timings & Directions',
      shortLabel: 'Timings & Address',
      percentage: 14,
      count: 175,
      color: 'bg-[#52b788]',
      hex: '#52b788',
    },
    {
      label: 'Billing & Payment Queries',
      shortLabel: 'Billing & UPI',
      percentage: 8,
      count: 99,
      color: 'bg-[#f59e0b]',
      hex: '#f59e0b',
    },
    {
      label: 'Reception Staff Handover',
      shortLabel: 'Staff Handover',
      percentage: 4,
      count: 52,
      color: 'bg-[#8b5cf6]',
      hex: '#8b5cf6',
    },
  ];

  const radius = 68;
  const circumference = 2 * Math.PI * radius; // ~427.256

  // Pre-calculate cumulative offsets for each slice
  const pieSlices = useMemo(() => {
    let currentOffset = 0;
    const gap = 2; // pixel separator between slices
    return chatbotIntents.map((item) => {
      const sliceLength = (item.percentage / 100) * circumference;
      const lengthWithGap = Math.max(1, sliceLength - gap);
      const sliceData = {
        ...item,
        length: lengthWithGap,
        offset: currentOffset,
      };
      currentOffset += sliceLength;
      return sliceData;
    });
  }, [chatbotIntents, circumference]);

  return (
    <div className="space-y-6">
      {/* Middle Grid: Chatbot Analytics & Live Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left 3 Cols: Chatbot Engagement & AI Performance */}
        <div className="lg:col-span-3 space-y-6">
          {/* Chatbot Inquiries & Intent Breakdown - Interactive Pie / Donut Chart */}
          <div className="bg-white border border-[#dbe9e0] rounded-2xl p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#173d37] flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#176e56]" />
                  <span>Chatbot Automated Services Breakdown</span>
                </h3>
                <p className="text-xs text-[#55776d]">
                  Patient self-service engagement via Svaasth Connect
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-[#f3f9f5] border border-[#dbe9e0] rounded-lg p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setChartView('pie')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                      chartView === 'pie'
                        ? 'bg-[#176e56] text-white shadow-2xs'
                        : 'text-[#55776d] hover:text-[#173d37]'
                    }`}
                  >
                    <PieChart className="w-3 h-3" />
                    <span>Pie Chart</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('bars')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                      chartView === 'bars'
                        ? 'bg-[#176e56] text-white shadow-2xs'
                        : 'text-[#55776d] hover:text-[#173d37]'
                    }`}
                  >
                    <BarChart2 className="w-3 h-3" />
                    <span>Bars</span>
                  </button>
                </div>

                <span className="px-2.5 py-0.5 rounded-full bg-[#eaf5ef] text-[#176e56] text-[11px] font-bold">
                  1,248 Sessions
                </span>
              </div>
            </div>

            {chartView === 'pie' ? (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center pt-1">
                {/* Left: Interactive SVG Donut / Pie Chart (5 cols) */}
                <div className="sm:col-span-5 flex flex-col items-center justify-center">
                  <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
                    <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
                      {/* Background circle track */}
                      <circle
                        cx="90"
                        cy="90"
                        r={radius}
                        fill="none"
                        stroke="#eef4f0"
                        strokeWidth="20"
                      />
                      {/* Slices */}
                      {pieSlices.map((slice, idx) => {
                        const isHovered = hoveredIntentIdx === idx;
                        return (
                          <circle
                            key={idx}
                            cx="90"
                            cy="90"
                            r={radius}
                            fill="none"
                            stroke={slice.hex}
                            strokeWidth={isHovered ? 26 : 20}
                            strokeDasharray={`${slice.length} ${circumference - slice.length}`}
                            strokeDashoffset={-slice.offset}
                            className="transition-all duration-200 cursor-pointer"
                            style={{
                              opacity: hoveredIntentIdx === null || isHovered ? 1 : 0.45,
                              filter: isHovered ? 'drop-shadow(0px 2px 6px rgba(0,0,0,0.18))' : 'none',
                            }}
                            onMouseEnter={() => setHoveredIntentIdx(idx)}
                            onMouseLeave={() => setHoveredIntentIdx(null)}
                          />
                        );
                      })}
                    </svg>

                    {/* Center Info Hole */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2 select-none">
                      {hoveredIntentIdx !== null ? (
                        <div className="animate-in fade-in zoom-in-95 duration-150">
                          <span
                            className="text-2xl font-black tracking-tight"
                            style={{ color: chatbotIntents[hoveredIntentIdx].hex }}
                          >
                            {chatbotIntents[hoveredIntentIdx].percentage}%
                          </span>
                          <span className="block text-[11px] font-bold text-[#173d37]">
                            {chatbotIntents[hoveredIntentIdx].count} sessions
                          </span>
                          <span className="block text-[9px] text-[#55776d] font-medium truncate max-w-[100px] mt-0.5">
                            {chatbotIntents[hoveredIntentIdx].shortLabel}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-2xl font-black text-[#173d37] tracking-tight">
                            1,248
                          </span>
                          <span className="block text-[10px] uppercase font-bold tracking-wider text-[#77a193]">
                            Sessions
                          </span>
                          <span className="inline-block text-[9px] text-[#176e56] font-semibold bg-[#eaf5ef] px-2 py-0.5 rounded-full mt-0.5 border border-[#c2e4cf]">
                            100% Bot
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-[#77a193] mt-2">Hover over a slice or legend item</p>
                </div>

                {/* Right: Legend Breakdown List (7 cols) */}
                <div className="sm:col-span-7 space-y-1.5">
                  {chatbotIntents.map((item, idx) => {
                    const isHovered = hoveredIntentIdx === idx;
                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredIntentIdx(idx)}
                        onMouseLeave={() => setHoveredIntentIdx(null)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isHovered
                            ? 'bg-white border-[#54a987] shadow-xs translate-x-1'
                            : 'bg-[#fcfdfc] border-[#e8f1ec] hover:bg-white hover:border-[#dbe9e0]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-2xs transition-transform"
                            style={{
                              backgroundColor: item.hex,
                              transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                            }}
                          />
                          <div className="truncate">
                            <p className="text-xs font-semibold text-[#173d37] truncate">{item.label}</p>
                            <p className="text-[10px] text-[#77a193]">{item.count} sessions</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-md border font-mono"
                            style={{
                              backgroundColor: `${item.hex}15`,
                              color: item.hex,
                              borderColor: `${item.hex}30`,
                            }}
                          >
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Alternate Bars View */
              <div className="space-y-3.5 pt-1">
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
            )}

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
