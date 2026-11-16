'use client';

import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  PieChart,
  BarChart2,
} from 'lucide-react';
import { WhatsAppSession, DashboardStats } from './types';

interface DashboardHomeViewProps {
  sessions: WhatsAppSession[];
  stats?: DashboardStats;
  dateRange?: string;
  onOpenChat: (phone: string) => void;
  onOpenBulkModal: () => void;
  onOpenQuickAction: (action: 'appointment' | 'prescription' | 'bill' | 'reminder') => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardHomeView: React.FC<DashboardHomeViewProps> = ({
  sessions,
  stats,
  dateRange = 'Last 7 Days',
  onOpenChat,
  onOpenBulkModal,
  onOpenQuickAction,
  onNavigateTab,
}) => {
  const recentSessions = sessions.slice(0, 6);
  const [chartView, setChartView] = useState<'pie' | 'bars'>('pie');
  const [hoveredIntentIdx, setHoveredIntentIdx] = useState<number | null>(null);

  const scale =
    dateRange === 'Today' ? 0.08 :
    dateRange === 'Yesterday' ? 0.10 :
    dateRange === 'Last 7 Days' ? 0.40 :
    dateRange === 'This Month' ? 0.80 : 1.0;

  // Chatbot services engagement breakdown dynamically scaled by dateRange
  const chatbotIntents = useMemo(() => [
    {
      label: 'OPD Appointments Booked',
      shortLabel: 'Appointments',
      percentage: 48,
      count: Math.max(1, Math.round(598 * scale)),
      color: 'bg-[#176e56]',
      hex: '#176e56',
    },
    {
      label: 'Digital Prescriptions Viewed',
      shortLabel: 'Prescriptions',
      percentage: 26,
      count: Math.max(1, Math.round(324 * scale)),
      color: 'bg-[#2a9d8f]',
      hex: '#2a9d8f',
    },
    {
      label: 'Clinic Timings & Directions',
      shortLabel: 'Timings & Address',
      percentage: 14,
      count: Math.max(1, Math.round(175 * scale)),
      color: 'bg-[#52b788]',
      hex: '#52b788',
    },
    {
      label: 'Billing & Payment Queries',
      shortLabel: 'Billing & UPI',
      percentage: 8,
      count: Math.max(1, Math.round(99 * scale)),
      color: 'bg-[#f59e0b]',
      hex: '#f59e0b',
    },
    {
      label: 'Reception Staff Handover',
      shortLabel: 'Staff Handover',
      percentage: 4,
      count: Math.max(1, Math.round(52 * scale)),
      color: 'bg-[#8b5cf6]',
      hex: '#8b5cf6',
    },
  ], [scale]);

  const totalSessionsCount = useMemo(() => {
    return chatbotIntents.reduce((acc, curr) => acc + curr.count, 0);
  }, [chatbotIntents]);

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
          <div className="bg-white border border-[#e2ece6] rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[#173d37]">
                  Automated services breakdown
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-[#f0f5f2] border border-[#dbe9e0] rounded-lg p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setChartView('pie')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      chartView === 'pie'
                        ? 'bg-white text-[#173d37] shadow-2xs border border-[#dbe9e0]'
                        : 'text-[#55776d] hover:text-[#173d37]'
                    }`}
                  >
                    <PieChart className="w-3 h-3" />
                    <span>Pie</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('bars')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      chartView === 'bars'
                        ? 'bg-white text-[#173d37] shadow-2xs border border-[#dbe9e0]'
                        : 'text-[#55776d] hover:text-[#173d37]'
                    }`}
                  >
                    <BarChart2 className="w-3 h-3" />
                    <span>Bars</span>
                  </button>
                </div>

                <span className="text-xs text-[#55776d] tabular-nums font-medium">
                  {totalSessionsCount.toLocaleString()} sessions
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
                            strokeWidth={isHovered ? 24 : 20}
                            strokeDasharray={`${slice.length} ${circumference - slice.length}`}
                            strokeDashoffset={-slice.offset}
                            className="transition-all duration-200 cursor-pointer"
                            style={{
                              opacity: hoveredIntentIdx === null || isHovered ? 1 : 0.45,
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
                        <div>
                          <span
                            className="text-2xl font-semibold tracking-tight tabular-nums block"
                            style={{ color: chatbotIntents[hoveredIntentIdx].hex }}
                          >
                            {chatbotIntents[hoveredIntentIdx].percentage}%
                          </span>
                          <span className="block text-xs font-medium text-[#173d37] tabular-nums mt-0.5">
                            {chatbotIntents[hoveredIntentIdx].count} sessions
                          </span>
                          <span className="block text-[11px] text-[#55776d] truncate max-w-[110px] mt-0.5">
                            {chatbotIntents[hoveredIntentIdx].shortLabel}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-2xl font-semibold text-[#173d37] tracking-tight tabular-nums block">
                            {totalSessionsCount.toLocaleString()}
                          </span>
                          <span className="block text-xs text-[#55776d] mt-0.5">
                            Total sessions
                          </span>
                          <span className="block text-[11px] text-[#77a193] mt-0.5">
                            {dateRange}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#77a193] mt-2">Hover over a slice to inspect</p>
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
                        className={`px-3 py-2 rounded-lg border transition-colors cursor-pointer flex items-center justify-between ${
                          isHovered
                            ? 'bg-[#f8faf8] border-[#c8dcd0]'
                            : 'bg-white border-[#e8f1ec] hover:border-[#dbe9e0]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.hex }}
                          />
                          <div className="truncate">
                            <p className="text-xs font-medium text-[#173d37] truncate">{item.label}</p>
                            <p className="text-[11px] text-[#77a193] tabular-nums">{item.count} sessions</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-mono tabular-nums font-medium text-[#55776d]">
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
              <div className="space-y-3 pt-1">
                {chatbotIntents.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#173d37]">{item.label}</span>
                      <div className="flex items-center gap-2 text-[#55776d]">
                        <span className="tabular-nums">{item.count} sessions</span>
                        <span className="font-medium text-[#173d37] tabular-nums">{item.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-[#eef4f0] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`${item.color} h-full rounded-full transition-all`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Bot Performance & Automation Health */}
          <div className="bg-white border border-[#e2ece6] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#173d37]">
                Automation health
              </h3>
              <span className="text-xs text-[#77a193]">Live metrics</span>
            </div>

            <div className="grid grid-cols-3 gap-3.5 text-center">
              <div className="p-3.5 rounded-lg bg-[#f8faf8] border border-[#e2ece6]">
                <p className="text-xs text-[#55776d]">Automated resolution</p>
                <p className="text-xl font-semibold text-[#173d37] mt-1 tracking-tight tabular-nums">92.4%</p>
                <p className="text-[11px] text-[#77a193] mt-0.5">Completed without staff</p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#f8faf8] border border-[#e2ece6]">
                <p className="text-xs text-[#55776d]">Staff handover</p>
                <p className="text-xl font-semibold text-[#173d37] mt-1 tracking-tight tabular-nums">7.6%</p>
                <p className="text-[11px] text-[#77a193] mt-0.5">Escalated to reception</p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#f8faf8] border border-[#e2ece6]">
                <p className="text-xs text-[#55776d]">Avg response speed</p>
                <p className="text-xl font-semibold text-[#173d37] mt-1 tracking-tight tabular-nums">1.1s</p>
                <p className="text-[11px] text-[#77a193] mt-0.5">Cloud API v20.0</p>
              </div>
            </div>

            {/* Language distribution */}
            <div className="mt-4 pt-3 border-t border-[#edf5f0] flex items-center justify-between text-xs text-[#55776d]">
              <span>Active languages:</span>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="px-2 py-0.5 rounded bg-[#f0f5f2] text-[#173d37] font-medium tabular-nums">
                  English (52%)
                </span>
                <span className="px-2 py-0.5 rounded bg-[#f0f5f2] text-[#173d37] font-medium tabular-nums">
                  मराठी (34%)
                </span>
                <span className="px-2 py-0.5 rounded bg-[#f0f5f2] text-[#173d37] font-medium tabular-nums">
                  हिन्दी (14%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Live Conversations Stream */}
        <div className="lg:col-span-2 bg-white border border-[#e2ece6] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#173d37]">Live inquiries</h3>
              <button
                type="button"
                onClick={() => onNavigateTab('chats')}
                className="text-xs font-medium text-[#176e56] hover:underline"
              >
                View all
              </button>
            </div>

            <div className="divide-y divide-[#edf5f0]">
              {recentSessions.map((session) => (
                <div
                  key={session.phoneNumber}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#f0f5f2] border border-[#dbe9e0] text-[#176e56] font-medium text-xs flex items-center justify-center shrink-0">
                      {session.patientName
                        ? session.patientName.slice(0, 2).toUpperCase()
                        : 'WA'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#173d37] truncate">
                        {session.patientName || `+${session.phoneNumber}`}
                      </p>
                      <p className="text-xs text-[#55776d] truncate">
                        {session.lastMessage || 'Recent inquiry'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenChat(session.phoneNumber);
                      onNavigateTab('chats');
                    }}
                    className="h-7 px-2.5 rounded-md bg-white border border-[#dbe9e0] hover:bg-[#f0f5f2] text-[#176e56] text-xs font-medium transition-colors shrink-0"
                  >
                    Reply
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('chats')}
            className="w-full mt-5 h-9 rounded-lg border border-[#dbe9e0] bg-white hover:bg-[#f8faf8] text-[#173d37] text-xs font-medium transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#55776d]" />
            <span>Open conversations workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
