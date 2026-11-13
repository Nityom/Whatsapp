'use client';

import React, { useState } from 'react';
import { Search, User, Phone, Tag, Calendar, MessageSquare, Plus, ExternalLink } from 'lucide-react';
import { WhatsAppSession } from './types';

interface ContactsViewProps {
  sessions: WhatsAppSession[];
  onOpenChat: (phone: string) => void;
  onBookAppointment: (phone: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  sessions,
  onOpenChat,
  onBookAppointment,
}) => {
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<string>('all');

  const filtered = sessions.filter((s) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = s.patientName?.toLowerCase().includes(q);
      const matchPhone = s.phoneNumber.includes(q);
      const matchRef = s.patientReference?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchRef) return false;
    }
    if (filterTag === 'patients') {
      return s.tags?.includes('Patient') || s.patientReference;
    }
    if (filterTag === 'leads') {
      return s.tags?.includes('Lead') && !s.patientReference;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#173d37]">Patients & Contacts Directory</h2>
          <p className="text-xs text-[#55776d] mt-1">
            Manage your patient contacts, UHID identifiers, and conversation records.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#77a193] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search name, phone, UHID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl bg-white border border-[#dbe9e0] text-xs text-[#173d37] focus:outline-none focus:border-[#54a987]"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            {['all', 'patients', 'leads'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterTag(t)}
                className={`px-3 py-2 rounded-xl font-semibold capitalize transition-all ${
                  filterTag === t
                    ? 'bg-[#176e56] text-white shadow-xs'
                    : 'bg-white border border-[#dbe9e0] text-[#55776d] hover:bg-[#eaf5ef]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contacts List Table */}
      <div className="bg-white border border-[#dbe9e0] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8faf8] border-b border-[#dbe9e0] text-[#55776d] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Contact / Patient</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">UHID / Reference</th>
                <th className="py-3 px-4">Tags</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf5f0]">
              {filtered.map((s) => {
                const tags = s.tags || ['Patient'];
                return (
                  <tr key={s.phoneNumber} className="hover:bg-[#fcfdfc] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#ede9fe] text-[#6d28d9] font-bold text-xs flex items-center justify-center">
                          {s.patientName ? s.patientName.slice(0, 2).toUpperCase() : 'WA'}
                        </div>
                        <div>
                          <p className="font-bold text-[#173d37]">
                            {s.patientName || `+${s.phoneNumber}`}
                          </p>
                          <p className="text-[10px] text-[#77a193]">
                            {s.isHandedOver ? 'Staff Handover' : 'Bot Active'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[#55776d]">+{s.phoneNumber}</td>

                    <td className="py-3.5 px-4">
                      {s.patientReference ? (
                        <span className="px-2 py-0.5 rounded-md bg-[#eaf5ef] text-[#176e56] font-mono font-bold text-[11px]">
                          {s.patientReference}
                        </span>
                      ) : (
                        <span className="text-[#77a193]">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {tags.map((t, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f3f9f5] text-[#176e56] border border-[#dbe9e0]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#55776d]">{s.assignedTo || 'Unassigned'}</td>

                    <td className="py-3.5 px-4 text-[#77a193]">
                      {new Date(s.lastMessageTimestamp || s.updatedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenChat(s.phoneNumber)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#eaf5ef] hover:bg-[#176e56] hover:text-white text-[#176e56] font-bold transition-all text-xs flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat</span>
                        </button>

                        <button
                          onClick={() => onBookAppointment(s.phoneNumber)}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-[#dbe9e0] hover:bg-[#f3f9f5] text-[#173d37] font-semibold transition-all text-xs flex items-center gap-1"
                        >
                          <Calendar className="w-3 h-3 text-[#54a987]" />
                          <span>Book</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
