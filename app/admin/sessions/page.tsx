"use client";
import { useEffect, useState } from "react";
import SessionCard from "../../../components/admin/SessionCard";
import TopBar from "../../../components/admin/TopBar";
import { RefreshCw, Filter } from "lucide-react";

interface Session {
  phoneNumber: string;
  patientName: string;
  patientReference: string | null;
  currentStep: string;
  language: string;
  isHandedOver: boolean;
  isVerified: boolean;
  messageCount: number;
  updatedAt: number;
  createdAt: number;
}

const FILTERS = ["all", "active", "handed_over", "verified"];

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/conversations");
      const data = await res.json();
      setSessions(data.conversations || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 20000);
    return () => clearInterval(interval);
  }, []);

  const filtered = sessions.filter((s) => {
    if (filter === "active") return s.currentStep !== "WELCOME" && s.currentStep !== "IDLE";
    if (filter === "handed_over") return s.isHandedOver;
    if (filter === "verified") return s.isVerified;
    return true;
  });

  return (
    <>
      <TopBar
        title="Bot Sessions"
        subtitle="Real-time view of all patient bot interactions"
      />
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Controls */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-1 bg-white border border-[#eaf5ef] rounded-xl p-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  filter === f
                    ? "bg-[#176e56] text-white"
                    : "text-[#173d37] hover:bg-[#eaf5ef]"
                }`}
              >
                {f === "all" ? "All" : f === "active" ? "Active" : f === "handed_over" ? "Staff" : "Verified"}
              </button>
            ))}
          </div>
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="p-2 bg-white border border-[#eaf5ef] rounded-xl text-[#54a987] hover:bg-[#eaf5ef] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <span className="text-sm text-[#54a987]">{filtered.length} sessions</span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center text-sm text-[#54a987] py-12">Loading sessions…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-[#54a987] py-12">No sessions match this filter.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((session) => (
              <SessionCard key={session.phoneNumber} session={session} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

