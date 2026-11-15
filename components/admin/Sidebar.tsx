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
  X,
} from 'lucide-react';
import { NavTab } from './types';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unreadCount?: number;
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
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } w-64 bg-white border-r border-[#dbe9e0] flex flex-col justify-between h-screen shrink-0 fixed inset-y-0 left-0 z-50 md:sticky md:top-0 transition-transform duration-300 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        } select-none overflow-y-auto`}
      >
        {/* Brand Header */}
        <div className={isCollapsed ? 'p-3 flex flex-col items-center' : 'p-4 sm:p-5'}>
          <div
            className={`flex items-center ${
              isCollapsed ? 'flex-col gap-2.5' : 'justify-between'
            }`}
          >
            <div
              onClick={() => {
                onSelectTab('dashboard');
                onCloseMobile?.();
              }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-[#dbe9e0] p-1 flex items-center justify-center shadow-xs group-hover:border-[#54a987] transition-all shrink-0 overflow-hidden">
                <img
                  src="/svaasth-logo.png"
                  alt="Svaasth Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              {!isCollapsed && (
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-bold tracking-tight text-[#173d37]">
                      Svaasth
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#54a987]">
                    Connect Hub
                  </p>
                </div>
              )}
            </div>

            {/* Mobile Close Button & Desktop Collapse Toggle */}
            <div className="flex items-center gap-1">
              <button
                onClick={onCloseMobile}
                title="Close sidebar"
                className="md:hidden p-1.5 rounded-lg text-[#77a193] hover:text-[#176e56] hover:bg-[#eaf5ef] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={onToggleCollapse}
                title={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
                className="hidden md:block p-1.5 rounded-lg text-[#77a193] hover:text-[#176e56] hover:bg-[#eaf5ef] transition-colors"
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
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
                  className={`relative flex items-center rounded-xl text-sm font-medium transition-all ${
                    isCollapsed
                      ? 'w-12 h-12 justify-center'
                      : 'w-full justify-between px-3.5 py-2.5'
                  } ${
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
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>

                  {!isCollapsed && item.badge !== undefined && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#176e56] text-white">
                      {item.badge}
                    </span>
                  )}
                  {!isCollapsed && item.highlight && !isActive && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#eaf5ef] text-[#176e56]">
                      Test
                    </span>
                  )}

                  {/* Collapsed Badge Dot */}
                  {isCollapsed && item.badge !== undefined && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#176e56] ring-2 ring-white" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

      {/* Footer / Connection Status */}
      <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-[#dbe9e0] bg-[#f8faf8]`}>
        {isCollapsed ? (
          <div
            title="WhatsApp Business Connected"
            className="w-12 h-12 mx-auto rounded-xl bg-white border border-[#dbe9e0] flex items-center justify-center text-[#176e56] shadow-xs relative"
          >
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#176e56] ring-2 ring-white"></span>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#dbe9e0] shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#eaf5ef] text-[#176e56] flex items-center justify-center shrink-0">
                <svg className="w-5.5 h-5.5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
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
              className="text-[#77a193] hover:text-[#176e56] p-1.5 rounded-md hover:bg-[#f0f7f3] transition-colors"
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
