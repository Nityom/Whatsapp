'use client';

import React from 'react';
import { Search, SlidersHorizontal, ChevronDown, CheckCheck, Bot } from 'lucide-react';
import { WhatsAppSession, ChatFilter } from './types';

interface ChatListColumnProps {
  sessions: WhatsAppSession[];
  selectedPhone: string;
  onSelectSession: (phone: string) => void;
  filter: ChatFilter;
  onChangeFilter: (filter: ChatFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const ChatListColumn: React.FC<ChatListColumnProps> = ({
  sessions,
  selectedPhone,
  onSelectSession,
  filter,
  onChangeFilter,
  searchQuery,
  onSearchChange,
}) => {
  // Compute unread total
  const unreadTotal = sessions.reduce((acc, s) => acc + (s.unreadCount || 0), 0);

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.patientName?.toLowerCase().includes(q);
      const matchPhone = s.phoneNumber.includes(q);
      const matchMsg = s.lastMessage?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchMsg) return false;
    }

    // Tab filter
    if (filter === 'unread') {
      return (s.unreadCount || 0) > 0;
    }
    if (filter === 'assigned') {
      return !!s.assignedTo;
    }
    if (filter === 'bot') {
      return !s.isHandedOver;
    }
    return true;
  });

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatarInitials = (name?: string, phone?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return phone?.slice(-2) || 'WA';
  };

  return (
    <div className="w-full h-full bg-white border border-[#e2ece6] rounded-xl flex flex-col overflow-hidden">
      {/* Top Filter Tabs */}
      <div className="p-3 border-b border-[#e2ece6] space-y-2.5">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => onChangeFilter('all')}
              className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-[#176e56] text-white'
                  : 'bg-[#f0f5f2] text-[#55776d] hover:text-[#173d37]'
              }`}
            >
              All
            </button>

            <button
              type="button"
              onClick={() => onChangeFilter('unread')}
              className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                filter === 'unread'
                  ? 'bg-[#176e56] text-white'
                  : 'bg-[#f0f5f2] text-[#55776d] hover:text-[#173d37]'
              }`}
            >
              <span>Unread</span>
              {unreadTotal > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                    filter === 'unread'
                      ? 'bg-white text-[#176e56] font-medium'
                      : 'bg-[#176e56] text-white'
                  }`}
                >
                  {unreadTotal}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onChangeFilter('assigned')}
              className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors ${
                filter === 'assigned'
                  ? 'bg-[#176e56] text-white'
                  : 'bg-[#f0f5f2] text-[#55776d] hover:text-[#173d37]'
              }`}
            >
              Assigned
            </button>

            <button
              type="button"
              onClick={() => onChangeFilter('bot')}
              className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors ${
                filter === 'bot'
                  ? 'bg-[#176e56] text-white'
                  : 'bg-[#f0f5f2] text-[#55776d] hover:text-[#173d37]'
              }`}
            >
              Bot
            </button>
          </div>

          <button
            type="button"
            title="Filter options"
            className="p-1 rounded-md text-[#55776d] hover:text-[#173d37] hover:bg-[#f0f5f2] transition-colors shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#77a193] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-lg bg-[#f8faf8] border border-[#dbe9e0] text-xs text-[#173d37] placeholder-[#77a193] focus:outline-none focus:border-[#176e56] focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#edf5f0]">
        {filteredSessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#55776d]">
            <p>No conversations found</p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="mt-2 text-[#176e56] font-medium underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isSelected = selectedPhone === session.phoneNumber;
            const initials = getAvatarInitials(session.patientName, session.phoneNumber);
            const unread = session.unreadCount || 0;

            return (
              <div
                key={session.phoneNumber}
                onClick={() => onSelectSession(session.phoneNumber)}
                className={`p-3 flex items-start gap-2.5 cursor-pointer transition-colors border-l-2 ${
                  isSelected
                    ? 'bg-[#f0f5f2] border-[#176e56]'
                    : 'bg-white border-transparent hover:bg-[#f8faf8]'
                }`}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-[#f0f5f2] border border-[#dbe9e0] text-[#176e56] font-medium text-xs flex items-center justify-center shrink-0">
                  {initials}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3
                      className={`text-xs truncate ${
                        isSelected || unread > 0
                          ? 'font-semibold text-[#173d37]'
                          : 'font-medium text-[#173d37]'
                      }`}
                    >
                      {session.patientName || `+${session.phoneNumber}`}
                    </h3>
                    <span className="text-[11px] text-[#77a193] shrink-0 tabular-nums">
                      {formatTime(session.lastMessageTimestamp || session.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-[#55776d] truncate">
                      {session.lastMessage || 'No recent messages'}
                    </p>

                    {unread > 0 && (
                      <span className="w-4 h-4 rounded-full bg-[#176e56] text-white text-[10px] font-medium tabular-nums flex items-center justify-center shrink-0">
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

