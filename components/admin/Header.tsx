'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Plus, ChevronDown, Check, Menu } from 'lucide-react';

interface HeaderProps {
  userName?: string;
  onOpenBulkModal: () => void;
  dateRange: string;
  onChangeDateRange: (range: string) => void;
  onOpenMobileMenu?: () => void;
  handoverCount?: number;
  onOpenHandover?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenBulkModal,
  dateRange,
  onChangeDateRange,
  onOpenMobileMenu,
  handoverCount = 0,
  onOpenHandover,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const ranges = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#e2ece6]">
      {/* Title & Subtitle with Mobile Hamburger */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden h-9 w-9 rounded-lg bg-white border border-[#dbe9e0] text-[#173d37] hover:bg-[#f4f7f5] transition-colors flex items-center justify-center shrink-0"
            title="Open navigation menu"
          >
            <Menu className="w-4 h-4 text-[#55776d]" />
          </button>
        )}
        <div>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight text-[#173d37]">
            Overview
          </h1>
          <p className="text-xs text-[#55776d] mt-0.5">
            Real-time patient messaging, automated triage, and dispatch logs.
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2.5">
        {/* Reception Handover Alert Pill (Visible when patients waiting) */}
        {handoverCount > 0 && onOpenHandover && (
          <button
            type="button"
            onClick={onOpenHandover}
            className="h-9 flex items-center gap-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs animate-pulse transition-colors cursor-pointer"
            title="Patients waiting for reception staff"
          >
            <span className="w-2 h-2 rounded-full bg-white"></span>
            <span>☎️ {handoverCount} {handoverCount === 1 ? 'Handover' : 'Handovers'}</span>
          </button>
        )}

        {/* Date Filter Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="h-9 flex items-center gap-2 px-3 rounded-lg bg-white border border-[#dbe9e0] text-xs font-medium text-[#173d37] hover:bg-[#f8faf8] transition-colors cursor-pointer select-none"
          >
            <Calendar className="w-3.5 h-3.5 text-[#55776d]" />
            <span>{dateRange}</span>
            <ChevronDown className={`w-3 h-3 text-[#77a193] transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-[#dbe9e0] rounded-lg shadow-md py-1 z-50 animate-in fade-in duration-100">
              {ranges.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    onChangeDateRange(r);
                    setDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors ${
                    dateRange === r
                      ? 'bg-[#eaf5ef] text-[#176e56] font-medium'
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

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={onOpenBulkModal}
          className="h-9 flex items-center gap-1.5 px-3.5 rounded-lg bg-[#176e56] hover:bg-[#125643] text-white text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Send bulk message</span>
        </button>
      </div>
    </header>
  );
};

