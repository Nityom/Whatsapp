'use client';

import React from 'react';
import { MessageSquare, Reply, UserPlus, Send, ArrowUpRight } from 'lucide-react';
import { DashboardStats } from './types';

interface StatCardsProps {
  stats?: DashboardStats;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  const defaultStats = {
    totalChats: stats?.totalChats || 1248,
    replied: stats?.replied || 1102,
    newLeads: stats?.newLeads || 86,
    messagesSent: stats?.messagesSent || 5430,
  };

  const cards = [
    {
      title: 'Total Chats',
      value: defaultStats.totalChats.toLocaleString(),
      change: '+12%',
      icon: MessageSquare,
    },
    {
      title: 'Replied',
      value: defaultStats.replied.toLocaleString(),
      change: '+15%',
      icon: Reply,
    },
    {
      title: 'New Leads',
      value: defaultStats.newLeads.toLocaleString(),
      change: '+24%',
      icon: UserPlus,
    },
    {
      title: 'Messages Sent',
      value: defaultStats.messagesSent.toLocaleString(),
      change: '+18%',
      icon: Send,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-white border border-[#dbe9e0] shadow-xs flex items-center justify-between transition-all hover:border-[#54a987] hover:shadow-sm"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#eaf5ef] text-[#176e56] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#55776d]">{card.title}</p>
                <p className="text-xl font-bold text-[#173d37] mt-0.5 tracking-tight">
                  {card.value}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#eaf5ef] text-[#176e56] text-xs font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5 text-[#176e56]" />
              <span>{card.change}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

