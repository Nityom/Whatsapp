'use client';

import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Send,
  Bot,
  FileText,
  Users,
  Megaphone,
  BarChart2,
  Settings,
  Smartphone,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarDays,
  X,
} from 'lucide-react';
import { NavTab } from './types';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unreadCount?: number;
  handoverCount?: number;
  isWhatsAppConnected?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  unreadCount = 12,
  handoverCount = 0,
  isWhatsAppConnected = true,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'chats' as NavTab,
      label: 'Chats',
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : undefined,
      handoverCount: handoverCount > 0 ? handoverCount : undefined,
    },
    { id: 'opd' as NavTab, label: 'OPD Queue', icon: CalendarDays },
    { id: 'broadcast' as NavTab, label: 'Broadcast / Bulk', icon: Send },
    { id: 'automation' as NavTab, label: 'Automation', icon: Bot },
    { id: 'templates' as NavTab, label: 'Templates', icon: FileText },
    { id: 'contacts' as NavTab, label: 'Contacts', icon: Users },
    { id: 'campaigns' as NavTab, label: 'Campaigns', icon: Megaphone },
    { id: 'reports' as NavTab, label: 'Reports', icon: BarChart2 },
    { id: 'simulator' as NavTab, label: 'Live Simulator', icon: Smartphone, highlight: true },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      <aside
        className={`${
          isCollapsed ? 'md:w-20' : 'md:w-72'
        } w-72 bg-white border-r border-[#dbe9e0] flex flex-col justify-between h-screen shrink-0 fixed inset-y-0 left-0 z-50 md:sticky md:top-0 transition-transform duration-300 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        } select-none overflow-y-auto`}
      >
        {/* Brand Header */}
        <div className={isCollapsed ? 'p-3 flex flex-col items-center' : 'p-4 sm:p-5'}>
          <div
            className={`flex items-center ${
              isCollapsed ? 'flex-col gap-2' : 'justify-between'
            }`}
          >
            <div
              onClick={() => {
                onSelectTab('dashboard');
                onCloseMobile?.();
              }}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-[#dbe9e0] p-1 flex items-center justify-center shadow-2xs shrink-0 overflow-hidden">
                <img
                  src="/svaasth-logo.png"
                  alt="Svaasth Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="text-lg font-semibold tracking-tight text-[#173d37] leading-tight">
                    Svaasth
                  </span>
                  <span className="text-xs text-[#55776d] mt-0.5 leading-tight">
                    Connect Hub
                  </span>
                </div>
              )}
            </div>

            {/* Mobile Close Button & Desktop Collapse Toggle */}
            <div className="flex items-center">
              <button
                onClick={onCloseMobile}
                title="Close sidebar"
                className="md:hidden p-2 rounded-lg text-[#77a193] hover:text-[#176e56] hover:bg-[#eaf5ef] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={onToggleCollapse}
                title={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
                className="hidden md:block p-2 rounded-lg text-[#77a193] hover:text-[#176e56] hover:bg-[#eaf5ef] transition-colors"
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-5 h-5" />
                ) : (
                  <PanelLeftClose className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Navigation List */}
          <nav className={`mt-6 space-y-1 w-full ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile?.();
                  }}
                  title={isCollapsed ? item.label : undefined}
                  className={`relative flex items-center rounded-lg text-sm font-medium transition-colors ${
                    isCollapsed
                      ? 'w-10 h-10 justify-center'
                      : 'w-full justify-between px-3.5 h-10'
                  } ${
                    isActive
                      ? 'bg-[#eaf5ef] text-[#176e56] font-semibold'
                      : 'text-[#55776d] hover:bg-[#f3f9f5] hover:text-[#173d37]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-colors ${
                        isActive ? 'text-[#176e56]' : 'text-[#77a193]'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!isCollapsed && item.handoverCount && item.handoverCount > 0 ? (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500 text-white tabular-nums animate-pulse flex items-center gap-1 shadow-2xs">
                      <span>☎️</span>
                      <span>{item.handoverCount}</span>
                    </span>
                  ) : (
                    !isCollapsed && item.badge !== undefined && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#176e56] text-white tabular-nums">
                        {item.badge}
                      </span>
                    )
                  )}

                  {/* Collapsed Badge Dot */}
                  {isCollapsed && item.handoverCount && item.handoverCount > 0 ? (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white animate-ping" />
                  ) : (
                    isCollapsed && item.badge !== undefined && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#176e56] ring-2 ring-white" />
                    )
                  )}
                </button>
              );
            })}
          </nav>
        </div>

      {/* Footer / Connection Status */}
      <div className={`${isCollapsed ? 'p-2' : 'p-3.5'} border-t border-[#dbe9e0] bg-[#fcfdfc]`}>
        {isCollapsed ? (
          <div
            title="WhatsApp API Connected"
            className="w-10 h-10 mx-auto rounded-lg bg-white border border-[#dbe9e0] flex items-center justify-center relative shadow-2xs"
          >
            <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
          </div>
        ) : (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white border border-[#dbe9e0] shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#173d37] truncate leading-tight">WhatsApp API</p>
                <p className="text-xs text-[#55776d] leading-tight mt-0.5">Connected</p>
              </div>
            </div>
            <button
              title="View settings"
              onClick={() => onSelectTab('settings')}
              className="text-[#77a193] hover:text-[#176e56] p-1.5 rounded hover:bg-[#f0f7f3] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  </>
  );
};
