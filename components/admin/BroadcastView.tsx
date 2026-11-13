'use client';

import React from 'react';
import { Send, Users, CheckCircle, Clock, Plus, BarChart2, MessageSquare } from 'lucide-react';
import { BroadcastCampaign } from './types';

interface BroadcastViewProps {
  campaigns?: BroadcastCampaign[];
  onOpenNewCampaign: () => void;
}

export const BroadcastView: React.FC<BroadcastViewProps> = ({
  campaigns = [],
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
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#173d37]">Broadcast & Bulk Messaging</h2>
          <p className="text-xs text-[#55776d] mt-1">
            Send bulk notices, health announcements, and reminders to patients directly on WhatsApp.
          </p>
        </div>

        <button
          onClick={onOpenNewCampaign}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#176e56] hover:bg-[#125643] text-white text-xs font-bold transition-all shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Broadcast Campaign</span>
        </button>
      </div>

      {/* Campaign Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#dbe9e0] shadow-xs">
          <p className="text-xs text-[#55776d] font-medium">Total Campaigns</p>
          <p className="text-2xl font-bold text-[#173d37] mt-1">
            {sampleCampaigns.length + 8}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#dbe9e0] shadow-xs">
          <p className="text-xs text-[#55776d] font-medium">Audience Reached</p>
          <p className="text-2xl font-bold text-[#173d37] mt-1">5,430</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#dbe9e0] shadow-xs">
          <p className="text-xs text-[#55776d] font-medium">Delivery Rate</p>
          <p className="text-2xl font-bold text-[#176e56] mt-1">98.6%</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#dbe9e0] shadow-xs">
          <p className="text-xs text-[#55776d] font-medium">Direct Inquiries</p>
          <p className="text-2xl font-bold text-[#54a987] mt-1">16.4%</p>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white border border-[#dbe9e0] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#dbe9e0] bg-[#f8faf8] flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#173d37] uppercase tracking-wider">
            Past Broadcast Campaigns
          </h3>
          <span className="text-xs text-[#77a193]">Showing {sampleCampaigns.length} campaigns</span>
        </div>

        <div className="divide-y divide-[#edf5f0]">
          {sampleCampaigns.map((camp) => (
            <div key={camp._id} className="p-4 hover:bg-[#fcfdfc] transition-colors space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#176e56]"></span>
                  <h4 className="text-sm font-bold text-[#173d37]">{camp.title}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#eaf5ef] text-[#176e56]">
                    {camp.targetAudience}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#55776d]">
                  <span className="flex items-center gap-1 font-semibold text-[#173d37]">
                    <Users className="w-3.5 h-3.5 text-[#54a987]" />
                    {camp.recipientCount.toLocaleString()} recipients
                  </span>
                  <span>•</span>
                  <span>{new Date(camp.sentAt).toLocaleDateString()}</span>
                </div>
              </div>

              <p className="text-xs text-[#55776d] leading-relaxed line-clamp-2 bg-[#f8faf8] p-2.5 rounded-xl border border-[#edf5f0]">
                {camp.message}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
