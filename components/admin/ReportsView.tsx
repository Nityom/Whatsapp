'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart2,
  PieChart,
  TrendingUp,
  Users,
  Calendar,
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  ArrowUpRight,
  Sparkles,
  Bot,
  UserCheck,
} from 'lucide-react';
import { DashboardStats, WhatsAppSession } from './types';

interface ReportsViewProps {
  stats?: DashboardStats;
  sessions?: WhatsAppSession[];
  dateRange?: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  stats,
  sessions = [],
  dateRange = 'This Month',
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'appointments' | 'prescriptions' | 'billing'>('all');
  const [chartView, setChartView] = useState<'pie' | 'bars'>('pie');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totalChats = stats?.totalChats || sessions.length || 63;
  const messagesSent = stats?.messagesSent || 962;
  const newLeads = stats?.newLeads || 41;
  const botResolvedPercent = 84.6;
  const handoverCount = sessions.filter((s) => s.isHandedOver).length || 8;

  const serviceBreakdown = [
    {
      name: 'Follow-up Reminders Dispatched',
      shortName: 'Follow-up Alerts',
      count: 58,
      percentage: 34,
      color: 'bg-[#176e56]',
      hex: '#176e56',
    },
    {
      name: 'OPD Appointment Bookings',
      shortName: 'Appointments',
      count: 48,
      percentage: 28,
      color: 'bg-[#2a9d8f]',
      hex: '#2a9d8f',
    },
    {
      name: 'Digital Prescription Downloads',
      shortName: 'Prescriptions',
      count: 35,
      percentage: 21,
      color: 'bg-[#52b788]',
      hex: '#52b788',
    },
    {
      name: 'Hospital Bills & Consultation Receipts',
      shortName: 'Bills & Receipts',
      count: 22,
      percentage: 13,
      color: 'bg-[#f59e0b]',
      hex: '#f59e0b',
    },
    {
      name: 'Emergency / Reception Escalations',
      shortName: 'Emergency Escalations',
      count: 6,
      percentage: 4,
      color: 'bg-[#8b5cf6]',
      hex: '#8b5cf6',
    },
  ];

  const totalRequests = 169;
  const radius = 68;
  const circumference = 2 * Math.PI * radius; // ~427.256

  const pieSlices = useMemo(() => {
    let currentOffset = 0;
    const gap = 2; // pixel separator between slices
    return serviceBreakdown.map((item) => {
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
  }, [serviceBreakdown, circumference]);

  const doctorPerformance = [
    {
      doctorName: 'Dr. Vipeen Raut',
      specialty: 'Orthopaedics & Joint Replacement',
      consultations: 32,
      revenue: '₹12,800',
      patientRating: '4.9 ★',
      avgConsultTime: '14 mins',
    },
    {
      doctorName: 'Dr. Shillpa Raut',
      specialty: 'Gynecology & Obstetrics',
      consultations: 16,
      revenue: '₹3,200',
      patientRating: '4.8 ★',
      avgConsultTime: '18 mins',
    },
  ];

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Metric,Value,Period\n' +
      `Total Patient Chats,${totalChats},${dateRange}\n` +
      `Messages Sent via WhatsApp,${messagesSent},${dateRange}\n` +
      `AI Automated Resolution Rate,${botResolvedPercent}%,${dateRange}\n` +
      `Staff Handover Cases,${handoverCount},${dateRange}\n` +
      `New Patient Inquiries,${newLeads},${dateRange}\n` +
      'Appointments Booked,48,This Month\n' +
      'Prescriptions Issued,35,This Month\n' +
      'Consultation Revenue Billed,₹16000,This Month\n';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Svaasth_Hospital_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#173d37]">Hospital Analytics &amp; Reports</h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#eaf5ef] text-[#176e56] border border-[#c2e4cf]">
              {dateRange}
            </span>
          </div>
          <p className="text-xs text-[#55776d] mt-1">
            Real-time patient engagement, appointment conversions, clinical dispatches, and WhatsApp bot efficiency.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#dbe9e0] hover:bg-[#eaf5ef] text-[#176e56] font-bold text-xs transition-all shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#dbe9e0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#55776d] font-semibold">Total Patient Chats</span>
            <span className="flex items-center text-[10px] text-[#176e56] font-bold bg-[#eaf5ef] px-1.5 py-0.5 rounded">
              +14% <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-2xl font-bold text-[#173d37] mt-1.5">{totalChats}</p>
          <p className="text-[11px] text-[#77a193] mt-1">Active patient conversations</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#dbe9e0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#55776d] font-semibold">AI Bot Resolution Rate</span>
            <span className="flex items-center text-[10px] text-[#176e56] font-bold bg-[#eaf5ef] px-1.5 py-0.5 rounded">
              High SLA
            </span>
          </div>
          <p className="text-2xl font-bold text-[#176e56] mt-1.5">{botResolvedPercent}%</p>
          <p className="text-[11px] text-[#77a193] mt-1">Handled without receptionist intervention</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#dbe9e0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#55776d] font-semibold">OPD Bookings Completed</span>
            <span className="flex items-center text-[10px] text-[#176e56] font-bold bg-[#eaf5ef] px-1.5 py-0.5 rounded">
              48 slots
            </span>
          </div>
          <p className="text-2xl font-bold text-[#173d37] mt-1.5">₹16,000</p>
          <p className="text-[11px] text-[#77a193] mt-1">Consultation fee billed via WhatsApp</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#dbe9e0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#55776d] font-semibold">Average Response Time</span>
            <span className="flex items-center text-[10px] text-[#176e56] font-bold bg-[#eaf5ef] px-1.5 py-0.5 rounded">
              Instant
            </span>
          </div>
          <p className="text-2xl font-bold text-[#176e56] mt-1.5">&lt; 1.8s</p>
          <p className="text-[11px] text-[#77a193] mt-1">AI virtual assistant latency</p>
        </div>
      </div>

      {/* Main Grid: Breakdown & Doctor Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Service Volume Breakdown (3 cols) - Interactive Pie / Donut Chart */}
        <div className="lg:col-span-3 bg-white border border-[#dbe9e0] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf5f0] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#173d37] flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#176e56]" />
                <span>WhatsApp Service Utilization</span>
              </h3>
              <p className="text-xs text-[#55776d] mt-0.5">Distribution of patient requests processed by Svaasth Connect</p>
            </div>

            <div className="flex items-center gap-2">
              {/* View Toggle */}
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

              <span className="text-xs font-bold text-[#176e56] bg-[#eaf5ef] px-2.5 py-1 rounded-xl">
                {messagesSent} msgs sent
              </span>
            </div>
          </div>

          {chartView === 'pie' ? (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center pt-1">
              {/* Left: Interactive SVG Donut / Pie Chart (5 cols) */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center">
                <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
                  <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
                    <circle
                      cx="90"
                      cy="90"
                      r={radius}
                      fill="none"
                      stroke="#eef4f0"
                      strokeWidth="20"
                    />
                    {pieSlices.map((slice, idx) => {
                      const isHovered = hoveredIdx === idx;
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
                            opacity: hoveredIdx === null || isHovered ? 1 : 0.45,
                            filter: isHovered ? 'drop-shadow(0px 2px 6px rgba(0,0,0,0.18))' : 'none',
                          }}
                          onMouseEnter={() => setHoveredIdx(idx)}
                          onMouseLeave={() => setHoveredIdx(null)}
                        />
                      );
                    })}
                  </svg>

                  {/* Center Hole Info */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2 select-none">
                    {hoveredIdx !== null ? (
                      <div className="animate-in fade-in zoom-in-95 duration-150">
                        <span
                          className="text-2xl font-black tracking-tight"
                          style={{ color: serviceBreakdown[hoveredIdx].hex }}
                        >
                          {serviceBreakdown[hoveredIdx].percentage}%
                        </span>
                        <span className="block text-[11px] font-bold text-[#173d37]">
                          {serviceBreakdown[hoveredIdx].count} requests
                        </span>
                        <span className="block text-[9px] text-[#55776d] font-medium truncate max-w-[100px] mt-0.5">
                          {serviceBreakdown[hoveredIdx].shortName}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-2xl font-black text-[#173d37] tracking-tight">
                          {totalRequests}
                        </span>
                        <span className="block text-[10px] uppercase font-bold tracking-wider text-[#77a193]">
                          Requests
                        </span>
                        <span className="inline-block text-[9px] text-[#176e56] font-semibold bg-[#eaf5ef] px-2 py-0.5 rounded-full mt-0.5 border border-[#c2e4cf]">
                          100% Processed
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-[#77a193] mt-2">Hover over a slice or legend item</p>
              </div>

              {/* Right: Legend Breakdown List (7 cols) */}
              <div className="sm:col-span-7 space-y-1.5">
                {serviceBreakdown.map((item, idx) => {
                  const isHovered = hoveredIdx === idx;
                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
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
                          <p className="text-xs font-semibold text-[#173d37] truncate">{item.name}</p>
                          <p className="text-[10px] text-[#77a193]">{item.count} requests</p>
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
              {serviceBreakdown.map((item) => (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#173d37]">{item.name}</span>
                    <span className="font-bold text-[#55776d]">
                      {item.count} <span className="font-normal text-[#77a193]">({item.percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-[#f0f4f2] h-2 rounded-full overflow-hidden">
                    <div
                      className={`${item.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-[#edf5f0] grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 bg-[#f8faf8] rounded-xl border border-[#edf5f0]">
              <p className="text-[10px] text-[#55776d] uppercase font-bold">Inbound Patient Msgs</p>
              <p className="text-sm font-bold text-[#173d37] mt-0.5">384</p>
            </div>
            <div className="p-2.5 bg-[#f8faf8] rounded-xl border border-[#edf5f0]">
              <p className="text-[10px] text-[#55776d] uppercase font-bold">Outbound AI &amp; Staff</p>
              <p className="text-sm font-bold text-[#173d37] mt-0.5">{messagesSent}</p>
            </div>
            <div className="p-2.5 bg-[#f8faf8] rounded-xl border border-[#edf5f0]">
              <p className="text-[10px] text-[#55776d] uppercase font-bold">Human Staff Takeovers</p>
              <p className="text-sm font-bold text-[#176e56] mt-0.5">{handoverCount}</p>
            </div>
          </div>
        </div>

        {/* Right: Doctor Specialty Breakdown (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-[#dbe9e0] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-[#edf5f0] pb-3">
            <h3 className="text-sm font-bold text-[#173d37]">Doctor OPD Consultation Performance</h3>
            <p className="text-xs text-[#55776d] mt-0.5">Appointments confirmed via WhatsApp bot</p>
          </div>

          <div className="space-y-3">
            {doctorPerformance.map((doc) => (
              <div
                key={doc.doctorName}
                className="p-3.5 rounded-2xl border border-[#dbe9e0] bg-[#f8faf8] space-y-2 hover:border-[#54a987] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#173d37]">{doc.doctorName}</h4>
                    <p className="text-[10px] text-[#55776d]">{doc.specialty}</p>
                  </div>
                  <span className="text-xs font-bold text-[#176e56] bg-[#eaf5ef] px-2 py-0.5 rounded-full">
                    {doc.consultations} slots
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#edf5f0] text-center">
                  <div>
                    <span className="text-[9px] text-[#77a193] block">Revenue</span>
                    <span className="text-xs font-bold text-[#173d37]">{doc.revenue}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#77a193] block">Rating</span>
                    <span className="text-xs font-bold text-[#176e56]">{doc.patientRating}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#77a193] block">Avg Time</span>
                    <span className="text-xs font-bold text-[#55776d]">{doc.avgConsultTime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Compliance Card */}
          <div className="p-3.5 rounded-2xl bg-[#eaf5ef] border border-[#c2e4cf] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#176e56] text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#173d37]">Meta 24h Care Window: 99.2%</p>
              <p className="text-[10px] text-[#55776d] mt-0.5">Messages fully compliant with WhatsApp Business policies</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

