'use client';

import React, { useState } from 'react';
import { Calendar, Bell, Plus, ChevronDown, Check } from 'lucide-react';

interface HeaderProps {
  userName?: string;
  onOpenBulkModal: () => void;
  dateRange: string;
  onChangeDateRange: (range: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName = 'Nityom',
  onOpenBulkModal,
  dateRange,
  onChangeDateRange,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ranges = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month'];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#dbe9e0]">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#173d37] flex items-center gap-2">
          {getGreeting()}, {userName} <span className="text-xl">👋</span>
        </h1>
        <p className="text-sm text-[#55776d] mt-0.5">
          Manage your WhatsApp conversations, automations and broadcasts in one place.
        </p>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* Date Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#dbe9e0] text-sm font-medium text-[#173d37] hover:bg-[#f3f9f5] transition-all shadow-xs"
          >
            <Calendar className="w-4 h-4 text-[#54a987]" />
            <span>{dateRange}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#55776d]" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-44 bg-white border border-[#dbe9e0] rounded-xl shadow-lg py-1.5 z-30">
              {ranges.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    onChangeDateRange(r);
                    setDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-left ${
                    dateRange === r
                      ? 'bg-[#eaf5ef] text-[#176e56] font-semibold'
                      : 'text-[#173d37] hover:bg-[#f8faf8]'
                  }`}
                >
                  <span>{r}</span>
                  {dateRange === r && <Check className="w-3.5 h-3.5 text-[#176e56]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <button
          className="relative p-2.5 rounded-xl bg-white border border-[#dbe9e0] text-[#55776d] hover:text-[#176e56] hover:bg-[#f3f9f5] transition-all shadow-xs"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#176e56]"></span>
        </button>

        {/* Primary "+ Send Bulk Message" Button */}
        <button
          onClick={onOpenBulkModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#176e56] hover:bg-[#125643] text-white text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Send Bulk Message</span>
        </button>
      </div>
    </header>
  );
};

