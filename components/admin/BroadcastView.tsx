'use client';

import React from 'react';
import { Send, Users, CheckCircle, Clock, Plus, BarChart2, MessageSquare, Activity } from 'lucide-react';
import { BroadcastCampaign, OpdWaitingPatient } from './types';

interface BroadcastViewProps {
  campaigns?: BroadcastCampaign[];
  waitingPatients?: OpdWaitingPatient[];
  onOpenNewCampaign: () => void;
}

export const BroadcastView: React.FC<BroadcastViewProps> = ({
  campaigns = [],
  waitingPatients = [],
  onOpenNewCampaign,
}) => {
  const sampleCampaigns: BroadcastCampaign[] =
    campaigns.length > 0
      ? campaigns
      : [
          {
            _id: 'c1',
            title: 'Weekly OPD Timings & Specialist Schedule',
            message:
              '🏥 Svaasth Hospital Announcement: Our regular OPD timings are Mon–Sat 10:30 AM–1:00 PM & 6:00 PM–7:30 PM. Consult Dr. Vipeen Raut (Ortho) & Dr. Shillpa Raut (Gynae).',
            targetAudience: 'All Contacts',
            recipientCount: 1248,
            status: 'sent',
            sentAt: Date.now() - 86400000 * 2,
          },
          {
            _id: 'c2',
            title: 'Free Joint & Orthopaedic Camp Alert',
            message:
              '🌟 Special Joint & Bone Health Checkup Camp this Thursday from 6:00 PM to 7:30 PM. Free BMD checkup & consultation.',
            targetAudience: 'Patients Only',
            recipientCount: 520,
            status: 'sent',
            sentAt: Date.now() - 86400000 * 5,
          },
          {
            _id: 'c3',
            title: 'Holiday Casualty Helpline Notice',
            message:
              'Casualty & Emergency care remain active 24/7 on public holidays. Contact 07152-255795 for immediate help.',
            targetAudience: 'All Contacts',
            recipientCount: 980,
            status: 'sent',
            sentAt: Date.now() - 86400000 * 12,
          },
        ];

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#173d37]">Broadcast campaigns</h2>
          <p className="text-xs text-[#55776d] mt-0.5">
            Send bulk notices, health announcements, and reminders to patients directly on WhatsApp.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewCampaign}
          className="h-9 flex items-center gap-1.5 px-3.5 rounded-lg bg-[#176e56] hover:bg-[#125643] text-white text-xs font-medium transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New broadcast campaign</span>
        </button>
      </div>

      {/* Live OPD Waiting Queue Quick Broadcast Banner */}
      {waitingPatients.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[#f0f5f2] border border-[#dbe9e0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-[#dbe9e0] text-[#176e56] flex items-center justify-center font-mono font-medium text-xs shrink-0 tabular-nums">
              #{waitingPatients.length}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#16a34a]"></span>
                <h3 className="text-xs font-semibold text-[#173d37]">
                  {waitingPatients.length} patients currently waiting in OPD
                </h3>
              </div>
              <p className="text-xs text-[#55776d] mt-0.5">
                Send an instant queue update, doctor delay alert, or token call directly to all waiting patients.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenNewCampaign}
            className="h-8 flex items-center gap-1.5 px-3 rounded-lg bg-[#176e56] hover:bg-[#125643] text-white text-xs font-medium transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Send className="w-3 h-3" />
            <span>Notify waiting queue</span>
          </button>
        </div>
      )}

      {/* Campaign Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-[#e2ece6]">
          <p className="text-xs text-[#55776d]">Total campaigns</p>
          <p className="text-xl font-semibold text-[#173d37] mt-1 tabular-nums">
            {sampleCampaigns.length + 8}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e2ece6]">
          <p className="text-xs text-[#55776d]">Audience reached</p>
          <p className="text-xl font-semibold text-[#173d37] mt-1 tabular-nums">5,430</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e2ece6]">
          <p className="text-xs text-[#55776d]">Delivery rate</p>
          <p className="text-xl font-semibold text-[#176e56] mt-1 tabular-nums">98.6%</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e2ece6]">
          <p className="text-xs text-[#55776d]">Direct inquiries</p>
          <p className="text-xl font-semibold text-[#173d37] mt-1 tabular-nums">16.4%</p>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white border border-[#e2ece6] rounded-xl overflow-hidden">
        <div className="p-3 border-b border-[#e2ece6] bg-[#f8faf8] flex items-center justify-between">
          <h3 className="text-xs font-medium text-[#173d37]">
            Past broadcast campaigns
          </h3>
          <span className="text-xs text-[#77a193]">Showing {sampleCampaigns.length} campaigns</span>
        </div>

        <div className="divide-y divide-[#edf5f0]">
          {sampleCampaigns.map((camp) => (
            <div key={camp._id} className="p-3.5 hover:bg-[#f8faf8] transition-colors space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#176e56]"></span>
                  <h4 className="text-xs font-medium text-[#173d37]">{camp.title}</h4>
                  <span className="px-2 py-0.2 rounded text-[11px] font-medium bg-[#f0f5f2] text-[#176e56] border border-[#dbe9e0]">
                    {camp.targetAudience}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#55776d]">
                  <span className="font-mono tabular-nums text-[#173d37]">
                    {camp.recipientCount.toLocaleString()} recipients
                  </span>
                  <span>•</span>
                  <span className="tabular-nums">{new Date(camp.sentAt).toLocaleDateString()}</span>
                </div>
              </div>

              <p className="text-xs text-[#55776d] leading-relaxed line-clamp-2 bg-[#f8faf8] p-2 rounded-lg border border-[#e2ece6]">
                {camp.message}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

