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
  Sprout,
  CheckCircle2,
} from 'lucide-react';
import { NavTab } from './types';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unreadCount?: number;
  isWhatsAppConnected?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  unreadCount = 12,
  isWhatsAppConnected = true,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'chats' as NavTab,
      label: 'Chats',
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
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
    <aside className="w-64 bg-white border-r border-[#dbe9e0] flex flex-col justify-between h-screen shrink-0 sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#176e56] text-white flex items-center justify-center shadow-sm">
            <Sprout className="w-6 h-6 text-[#77d1a5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-[#173d37]">Svaasth</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#54a987]">
              Connect Hub
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="mt-7 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#eaf5ef] text-[#176e56] font-semibold shadow-xs'
                    : 'text-[#55776d] hover:bg-[#f3f9f5] hover:text-[#173d37]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-[#176e56]' : 'text-[#77a193]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#176e56] text-white">
                    {item.badge}
                  </span>
                )}
                {item.highlight && !isActive && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#eaf5ef] text-[#176e56]">
                    Test
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Connection Status */}
      <div className="p-4 border-t border-[#dbe9e0] bg-[#f8faf8]">
        <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#dbe9e0] shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#eaf5ef] text-[#176e56] flex items-center justify-center">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.347.491 1.2.534 1.288.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.087-.179.182-.077.357.101.174.45 0.744.966 1.203.665.592 1.226.776 1.4.863.173.087.275.072.376-.043.101-.116.433-.505.549-.679.115-.173.231-.144.39-.087.159.058 1.011.477 1.184.564.173.087.289.13.332.202.043.072.043.419-.101.824z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#173d37]">WhatsApp Business</p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#176e56] animate-pulse"></span>
                <span className="text-[11px] font-medium text-[#176e56]">Connected</span>
              </div>
            </div>
          </div>
          <button
            title="View API status"
            onClick={() => onSelectTab('settings')}
            className="text-[#77a193] hover:text-[#176e56] p-1 rounded-md transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
