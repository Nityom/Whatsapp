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

  const totalChats = stats?.totalChats || sessions.length || 0;
  const messagesSent = stats?.messagesSent || 0;
  const newLeads = stats?.newLeads || 0;
  const handoverCount = sessions.filter((s) => s.isHandedOver).length;
  const botResolvedPercent = sessions.length > 0
    ? Number((((sessions.length - handoverCount) / sessions.length) * 100).toFixed(1))
    : 100;

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
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[#173d37]">Analytics and reports</h2>
            <span className="text-[11px] font-medium px-2 py-0.2 rounded bg-[#f0f5f2] text-[#176e56] border border-[#dbe9e0]">
              {dateRange}
            </span>
          </div>
          <p className="text-xs text-[#55776d] mt-0.5">
            Real-time patient engagement, appointment conversions, clinical dispatches, and WhatsApp bot efficiency.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="h-9 flex items-center gap-1.5 px-3.5 rounded-lg bg-white border border-[#dbe9e0] hover:bg-[#f8faf8] text-[#173d37] font-medium text-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[#55776d]" />
          <span>Export CSV report</span>
        </button>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-[#e2ece6]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#55776d]">Total patient chats</span>
            <span className="flex items-center text-[11px] text-[#176e56] font-medium bg-[#eaf5ef] px-1.5 py-0.2 rounded tabular-nums">
              +14% <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <p className="text-xl font-semibold text-[#173d37] mt-1 tabular-nums">{totalChats}</p>
          <p className="text-[11px] text-[#77a193] mt-0.5">Active conversations</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#e2ece6]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#55776d]">Bot resolution rate</span>
            <span className="text-[11px] text-[#176e56] font-medium bg-[#eaf5ef] px-1.5 py-0.2 rounded">
              High SLA
            </span>
          </div>
          <p className="text-xl font-semibold text-[#176e56] mt-1 tabular-nums">{botResolvedPercent}%</p>
          <p className="text-[11px] text-[#77a193] mt-0.5">Handled without reception</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#e2ece6]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#55776d]">OPD bookings completed</span>
            <span className="text-[11px] text-[#176e56] font-medium bg-[#eaf5ef] px-1.5 py-0.2 rounded tabular-nums">
              48 slots
            </span>
          </div>
          <p className="text-xl font-semibold text-[#173d37] mt-1 tabular-nums">₹16,000</p>
          <p className="text-[11px] text-[#77a193] mt-0.5">Consultation fee billed</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#e2ece6]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#55776d]">Average response time</span>
            <span className="text-[11px] text-[#176e56] font-medium bg-[#eaf5ef] px-1.5 py-0.2 rounded">
              Instant
            </span>
          </div>
          <p className="text-xl font-semibold text-[#176e56] mt-1 tabular-nums">&lt; 1.8s</p>
          <p className="text-[11px] text-[#77a193] mt-0.5">AI virtual assistant latency</p>
        </div>
      </div>

      {/* Main Grid: Breakdown & Doctor Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Service Volume Breakdown (3 cols) - Interactive Pie / Donut Chart */}
        <div className="lg:col-span-3 bg-white border border-[#e2ece6] rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf5f0] pb-3">
            <div>
              <h3 className="text-sm font-semibold text-[#173d37]">
                Service utilization breakdown
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {/* View Toggle */}
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
                          strokeWidth={isHovered ? 24 : 20}
                          strokeDasharray={`${slice.length} ${circumference - slice.length}`}
                          strokeDashoffset={-slice.offset}
                          className="transition-all duration-200 cursor-pointer"
                          style={{
                            opacity: hoveredIdx === null || isHovered ? 1 : 0.45,
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
                      <div>
                        <span
                          className="text-2xl font-semibold tracking-tight tabular-nums block"
                          style={{ color: serviceBreakdown[hoveredIdx].hex }}
                        >
                          {serviceBreakdown[hoveredIdx].percentage}%
                        </span>
                        <span className="block text-xs font-medium text-[#173d37] tabular-nums mt-0.5">
                          {serviceBreakdown[hoveredIdx].count} requests
                        </span>
                        <span className="block text-[11px] text-[#55776d] truncate max-w-[110px] mt-0.5">
                          {serviceBreakdown[hoveredIdx].shortName}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-2xl font-semibold text-[#173d37] tracking-tight tabular-nums block">
                          {totalRequests}
                        </span>
                        <span className="block text-xs text-[#55776d] mt-0.5">
                          Total requests
                        </span>
                        <span className="block text-[11px] text-[#77a193] mt-0.5">
                          Processed
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-[#77a193] mt-2">Hover over a slice to inspect</p>
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
                          <p className="text-xs font-medium text-[#173d37] truncate">{item.name}</p>
                          <p className="text-[11px] text-[#77a193] tabular-nums">{item.count} requests</p>
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
              {serviceBreakdown.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#173d37]">{item.name}</span>
                    <span className="text-[#55776d] tabular-nums">
                      {item.count} <span className="text-[#77a193]">({item.percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-[#f0f4f2] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`${item.color} h-full rounded-full transition-all`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-[#edf5f0] grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 bg-[#f8faf8] rounded-lg border border-[#e2ece6]">
              <p className="text-[11px] text-[#55776d]">Inbound patient msgs</p>
              <p className="text-sm font-semibold text-[#173d37] mt-0.5 tabular-nums">384</p>
            </div>
            <div className="p-2.5 bg-[#f8faf8] rounded-lg border border-[#e2ece6]">
              <p className="text-[11px] text-[#55776d]">Outbound AI and staff</p>
              <p className="text-sm font-semibold text-[#173d37] mt-0.5 tabular-nums">{messagesSent}</p>
            </div>
            <div className="p-2.5 bg-[#f8faf8] rounded-lg border border-[#e2ece6]">
              <p className="text-[11px] text-[#55776d]">Staff takeovers</p>
              <p className="text-sm font-semibold text-[#176e56] mt-0.5 tabular-nums">{handoverCount}</p>
            </div>
          </div>
        </div>

        {/* Right: Doctor Specialty Breakdown (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-[#e2ece6] rounded-xl p-5 space-y-4">
          <div className="border-b border-[#edf5f0] pb-3">
            <h3 className="text-sm font-semibold text-[#173d37]">Doctor OPD performance</h3>
            <p className="text-xs text-[#55776d] mt-0.5">Appointments confirmed via WhatsApp bot</p>
          </div>

          <div className="space-y-2.5">
            {doctorPerformance.map((doc) => (
              <div
                key={doc.doctorName}
                className="p-3.5 rounded-lg border border-[#e2ece6] bg-[#f8faf8] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-[#173d37]">{doc.doctorName}</h4>
                    <p className="text-[11px] text-[#55776d]">{doc.specialty}</p>
                  </div>
                  <span className="text-xs font-medium text-[#176e56] bg-[#eaf5ef] px-2 py-0.5 rounded tabular-nums">
                    {doc.consultations} slots
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#edf5f0] text-center">
                  <div>
                    <span className="text-[11px] text-[#77a193] block">Revenue</span>
                    <span className="text-xs font-semibold text-[#173d37] tabular-nums">{doc.revenue}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#77a193] block">Rating</span>
                    <span className="text-xs font-semibold text-[#176e56]">{doc.patientRating}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#77a193] block">Avg time</span>
                    <span className="text-xs font-medium text-[#55776d]">{doc.avgConsultTime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Compliance Card */}
          <div className="p-3 rounded-lg bg-[#f0f5f2] border border-[#dbe9e0] flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-[#176e56] text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#173d37]">Meta 24h care window: 99.2%</p>
              <p className="text-[11px] text-[#55776d] mt-0.5">Fully compliant with WhatsApp Business policies</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

