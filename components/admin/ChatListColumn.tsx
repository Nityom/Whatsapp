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

  const getAvatarColor = (index: number) => {
    const palette = [
      'bg-[#e2e8f0] text-[#334155]',
      'bg-[#eaf5ef] text-[#176e56]',
      'bg-[#ede9fe] text-[#6d28d9]',
      'bg-[#fef3c7] text-[#92400e]',
      'bg-[#e0f2fe] text-[#0369a1]',
      'bg-[#ffe4e6] text-[#be123c]',
    ];
    return palette[index % palette.length];
  };

  return (
    <div className="w-full md:w-80 lg:w-96 bg-white border border-[#dbe9e0] rounded-2xl flex flex-col h-[740px] shrink-0 shadow-xs overflow-hidden">
      {/* Top Filter Tabs */}
      <div className="p-3.5 border-b border-[#dbe9e0] space-y-3">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => onChangeFilter('all')}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-[#176e56] text-white shadow-xs'
                  : 'bg-[#f3f9f5] text-[#55776d] hover:bg-[#eaf5ef]'
              }`}
            >
              All
            </button>

            <button
              onClick={() => onChangeFilter('unread')}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
                filter === 'unread'
                  ? 'bg-[#176e56] text-white shadow-xs'
                  : 'bg-[#f3f9f5] text-[#55776d] hover:bg-[#eaf5ef]'
              }`}
            >
              <span>Unread</span>
              {unreadTotal > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    filter === 'unread'
                      ? 'bg-white text-[#176e56] font-bold'
                      : 'bg-[#176e56] text-white'
                  }`}
                >
                  {unreadTotal}
                </span>
              )}
            </button>

            <button
              onClick={() => onChangeFilter('assigned')}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                filter === 'assigned'
                  ? 'bg-[#176e56] text-white shadow-xs'
                  : 'bg-[#f3f9f5] text-[#55776d] hover:bg-[#eaf5ef]'
              }`}
            >
              Assigned
            </button>

            <button
              onClick={() => onChangeFilter('bot')}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                filter === 'bot'
                  ? 'bg-[#176e56] text-white shadow-xs'
                  : 'bg-[#f3f9f5] text-[#55776d] hover:bg-[#eaf5ef]'
              }`}
            >
              Bot
            </button>
          </div>

          <button
            title="Filter options"
            className="p-1.5 rounded-lg text-[#55776d] hover:text-[#176e56] hover:bg-[#f3f9f5] transition-colors shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#77a193] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search chats, name or number..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-xs text-[#173d37] placeholder-[#77a193] focus:outline-none focus:border-[#54a987] focus:bg-white transition-all"
          />
          <ChevronDown className="w-3.5 h-3.5 text-[#77a193] absolute right-3 top-3 pointer-events-none" />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#edf5f0]">
        {filteredSessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#55776d]">
            <p>No conversations found</p>
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="mt-2 text-[#176e56] font-semibold underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          filteredSessions.map((session, idx) => {
            const isSelected = selectedPhone === session.phoneNumber;
            const initials = getAvatarInitials(session.patientName, session.phoneNumber);
            const avatarColor = getAvatarColor(idx);
            const unread = session.unreadCount || 0;

            return (
              <div
                key={session.phoneNumber}
                onClick={() => onSelectSession(session.phoneNumber)}
                className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all border-l-3 ${
                  isSelected
                    ? 'bg-[#eaf5ef] border-[#176e56]'
                    : 'bg-white border-transparent hover:bg-[#f8faf8]'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${avatarColor}`}
                >
                  {initials}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3
                      className={`text-sm truncate ${
                        isSelected || unread > 0
                          ? 'font-bold text-[#173d37]'
                          : 'font-semibold text-[#173d37]'
                      }`}
                    >
                      {session.patientName || `+${session.phoneNumber}`}
                    </h3>
                    <span className="text-[11px] text-[#77a193] shrink-0 whitespace-nowrap">
                      {formatTime(session.lastMessageTimestamp || session.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-xs text-[#55776d] truncate">
                      {session.lastMessage || 'Tap to view chat history'}
                    </p>

                    {unread > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#176e56] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
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

