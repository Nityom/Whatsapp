'use client';

import React, { useState } from 'react';
import {
  Bot,
  Zap,
  Clock,
  CheckCircle2,
  Bell,
  FileText,
  Calendar,
  AlertTriangle,
  Play,
  Pause,
  Sparkles,
} from 'lucide-react';

interface AutomationRule {
  id: string;
  title: string;
  description: string;
  trigger: string;
  channel: string;
  isActive: boolean;
  totalTriggered: number;
  lastTriggered: string;
  badge: string;
}

export const AutomationView: React.FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>([
    {
      id: 'rule-1',
      title: '24h Pre-Appointment WhatsApp Reminder',
      description: 'Sends automated WhatsApp reminder with doctor name, OPD timing, token, and clinic address 24 hours prior to appointment.',
      trigger: '24 hours before consultation slot',
      channel: 'WhatsApp Template (Utility)',
      isActive: true,
      totalTriggered: 142,
      lastTriggered: '10 mins ago',
      badge: 'High Impact',
    },
    {
      id: 'rule-2',
      title: 'Post-Consultation Digital Prescription Dispatch',
      description: 'Automatically delivers verified WhatsApp PDF link to patient as soon as Dr. Raut saves prescription in Cortex PMS.',
      trigger: 'Doctor saves clinical Rx in Cortex PMS',
      channel: 'Direct Document Message',
      isActive: true,
      totalTriggered: 89,
      lastTriggered: '1 hour ago',
      badge: 'Real-time',
    },
    {
      id: 'rule-3',
      title: 'Emergency Surgery OPD Delay Alert',
      description: 'Automatically alerts patients in queue if emergency trauma case causes OPD delay greater than 15 minutes.',
      trigger: 'OPD delay flag checked by receptionist',
      channel: 'Broadcast Queue Alert',
      isActive: true,
      totalTriggered: 14,
      lastTriggered: 'Yesterday',
      badge: 'Queue Safety',
    },
    {
      id: 'rule-4',
      title: '7-Day Post-Consultation Follow-up Scheduler',
      description: 'Follows up with patient 7 days after ortho/gynae visit to check medication compliance and offer seamless follow-up booking.',
      trigger: '7 days after completed OPD consultation',
      channel: 'Interactive WhatsApp Button',
      isActive: true,
      totalTriggered: 67,
      lastTriggered: '3 hours ago',
      badge: 'Retention',
    },
    {
      id: 'rule-5',
      title: 'Out-of-Hours Emergency Casualty Auto-Router',
      description: 'Responds to night queries with 24/7 casualty helpline (+91 9373280505) and instant Google Maps hospital location pin.',
      trigger: 'Incoming message outside 10:30 AM–1 PM & 6 PM–7:30 PM',
      channel: 'Instant AI Safety Guard',
      isActive: true,
      totalTriggered: 53,
      lastTriggered: 'Last night',
      badge: '24/7 Safety',
    },
  ]);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#173d37]">Automated Hospital Workflows</h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#eaf5ef] text-[#176e56] border border-[#c2e4cf]">
              5 Workflows Active
            </span>
          </div>
          <p className="text-xs text-[#55776d] mt-1">
            Automated event-driven WhatsApp triggers running 24/7 connected directly to Cortex Hospital PMS.
          </p>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`p-4 rounded-2xl border transition-all ${
              rule.isActive
                ? 'bg-white border-[#dbe9e0] hover:border-[#54a987] shadow-xs'
                : 'bg-[#fcfdfc] border-[#edf5f0] opacity-75'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      rule.isActive ? 'bg-[#10b981]' : 'bg-gray-400'
                    }`}
                  ></span>
                  <h3 className="text-sm font-bold text-[#173d37]">{rule.title}</h3>
                  <span className="text-[10px] font-semibold bg-[#eaf5ef] text-[#176e56] px-2 py-0.5 rounded-full border border-[#c2e4cf]">
                    {rule.badge}
                  </span>
                </div>
                <p className="text-xs text-[#55776d] leading-relaxed max-w-2xl">
                  {rule.description}
                </p>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => toggleRule(rule.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  rule.isActive
                    ? 'bg-[#eaf5ef] text-[#176e56] border border-[#c2e4cf] hover:bg-[#d9efe2]'
                    : 'bg-gray-100 text-gray-500 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                {rule.isActive ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-[#176e56]" />
                    <span>Active</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Paused</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-[#edf5f0] flex flex-wrap items-center justify-between gap-3 text-xs text-[#55776d]">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#54a987]" />
                <span>
                  <strong>Trigger:</strong> {rule.trigger}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#173d37]">
                  {rule.totalTriggered} executions
                </span>
                <span>•</span>
                <span>Last fired {rule.lastTriggered}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

