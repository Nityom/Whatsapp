"use client";
import { useEffect, useState } from "react";
import {
  Users,
  MessageSquare,
  Activity,
  UserCheck,
  TrendingUp,
  Clock,
  Bot,
  ArrowRight,
} from "lucide-react";
import StatsCard from "../../components/admin/StatsCard";
import TopBar from "../../components/admin/TopBar";
import Link from "next/link";

interface Stats {
  totalUsers: number;
  activeSessions: number;
  handedOver: number;
  messagesToday: number;
  totalSessions: number;
}

interface RecentConversation {
  phoneNumber: string;
  patientName: string;
  currentStep: string;
  language: string;
  isHandedOver: boolean;
  lastMessage: { text: string; sender: string; createdAt: number } | null;
  updatedAt: number;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function truncate(text: string, n = 60) {
  return text.length > n ? text.slice(0, n) + "…" : text;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, convRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/conversations"),
        ]);
        const statsData = await statsRes.json();
        const convData = await convRes.json();
        setStats(statsData);
        setRecent((convData.conversations || []).slice(0, 8));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <TopBar
        title="Dashboard"
        subtitle="Welcome back to Svaasth Connect Admin"
      />
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Patients"
            value={loading ? "—" : (stats?.totalUsers ?? 0)}
            subtitle="All time registrations"
            icon={Users}
            color="green"
          />
          <StatsCard
            title="Active Today"
            value={loading ? "—" : (stats?.activeSessions ?? 0)}
            subtitle="Sessions in last 24h"
            icon={Activity}
            color="mint"
          />
          <StatsCard
            title="Messages Today"
            value={loading ? "—" : (stats?.messagesToday ?? 0)}
            subtitle="Inbound + outbound"
            icon={MessageSquare}
            color="teal"
          />
          <StatsCard
            title="Needs Staff"
            value={loading ? "—" : (stats?.handedOver ?? 0)}
            subtitle="Handed over to staff"
            icon={UserCheck}
            color="emerald"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/admin/conversations"
            className="bg-white rounded-2xl p-5 border border-[#eaf5ef] hover:shadow-md transition-all group flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-[#173d37] mb-1">View Conversations</p>
              <p className="text-sm text-[#54a987]">Read & reply to patient messages</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#54a987] group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/admin/broadcast"
            className="bg-white rounded-2xl p-5 border border-[#eaf5ef] hover:shadow-md transition-all group flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-[#173d37] mb-1">Send Broadcast</p>
              <p className="text-sm text-[#54a987]">Message all or selected patients</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#54a987] group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/admin/sessions"
            className="bg-white rounded-2xl p-5 border border-[#eaf5ef] hover:shadow-md transition-all group flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-[#173d37] mb-1">Bot Sessions</p>
              <p className="text-sm text-[#54a987]">View active bot states</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#54a987] group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Recent Conversations */}
        <div className="bg-white rounded-2xl border border-[#eaf5ef] shadow-sm">
          <div className="px-5 py-4 border-b border-[#eaf5ef] flex items-center justify-between">
            <h2 className="font-bold text-[#173d37]">Recent Conversations</h2>
            <Link href="/admin/conversations" className="text-sm text-[#54a987] hover:text-[#176e56] flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#eaf5ef]">
            {loading ? (
              <div className="p-6 text-center text-sm text-[#54a987]">Loading…</div>
            ) : recent.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#54a987]">No conversations yet.</div>
            ) : (
              recent.map((conv) => (
                <Link
                  key={conv.phoneNumber}
                  href={`/admin/conversations?phone=${encodeURIComponent(conv.phoneNumber)}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-[#f0fbf5] transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-[#eaf5ef] flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-[#176e56]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#173d37]">{conv.patientName}</span>
                      {conv.isHandedOver && (
                        <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">
                          Staff
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#54a987] truncate">
                      {conv.lastMessage
                        ? truncate(conv.lastMessage.text, 60)
                        : conv.phoneNumber}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs text-[#54a987]">{timeAgo(conv.updatedAt)}</span>
                    <span className="text-xs font-mono bg-[#eaf5ef] text-[#176e56] px-2 py-0.5 rounded-full">
                      {conv.currentStep}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}

