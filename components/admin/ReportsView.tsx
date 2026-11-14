'use client';

import React, { useState } from 'react';
import {
  BarChart2,
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

  const totalChats = stats?.totalChats || sessions.length || 63;
  const messagesSent = stats?.messagesSent || 962;
  const newLeads = stats?.newLeads || 41;
  const botResolvedPercent = 84.6;
  const handoverCount = sessions.filter((s) => s.isHandedOver).length || 8;

  const serviceBreakdown = [
    { name: 'OPD Appointment Bookings', count: 48, percentage: 42, color: 'bg-[#176e56]' },
    { name: 'Digital Prescription Downloads', count: 35, percentage: 31, color: 'bg-[#54a987]' },
    { name: 'Hospital Bills & Consultation Receipts', count: 22, percentage: 19, color: 'bg-[#77d1a5]' },
    { name: 'Follow-up Reminders Dispatched', count: 58, percentage: 51, color: 'bg-[#2a9d8f]' },
    { name: 'Emergency / Reception Escalations', count: 6, percentage: 5, color: 'bg-[#e76f51]' },
  ];

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
        {/* Left: Service Volume Breakdown (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-[#dbe9e0] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#edf5f0] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#173d37]">WhatsApp Service Utilization</h3>
              <p className="text-xs text-[#55776d] mt-0.5">Distribution of patient requests processed by Svaasth Connect</p>
            </div>
            <span className="text-xs font-bold text-[#176e56] bg-[#eaf5ef] px-2.5 py-1 rounded-xl">
              {messagesSent} msgs sent
            </span>
          </div>

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
                    style={{ width: `${Math.min(item.percentage * 1.8, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

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

