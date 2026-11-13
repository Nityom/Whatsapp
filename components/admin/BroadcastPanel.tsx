"use client";
import { useState } from "react";
import { Megaphone, RefreshCw, Users, CheckCircle, XCircle } from "lucide-react";

interface BroadcastPanelProps {
  totalUsers: number;
}

const FILTERS = [
  { value: "all", label: "All Users", desc: "Send to everyone" },
  { value: "verified", label: "Verified Patients", desc: "Only registered patients" },
  { value: "handed_over", label: "Staff-Assisted", desc: "Currently with staff" },
  { value: "en", label: "English Users", desc: "Language: English" },
  { value: "hi", label: "Hindi Users", desc: "Language: Hindi" },
  { value: "mr", label: "Marathi Users", desc: "Language: Marathi" },
];

interface BroadcastResult {
  sent: number;
  failed: number;
  total: number;
}

export default function BroadcastPanel({ totalUsers }: BroadcastPanelProps) {
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedFilter = FILTERS.find((f) => f.value === filter)!;

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    setError("");
    setResult(null);
    setConfirmOpen(false);

    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), filter }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to broadcast");
      } else {
        setResult(data);
        setMessage("");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#eaf5ef] p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#eaf5ef] rounded-xl flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-[#176e56]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#173d37]">Broadcast Message</h2>
          <p className="text-sm text-[#54a987]">Send a message to multiple patients at once</p>
        </div>
      </div>

      {/* Audience filter */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[#173d37] mb-2">Select Audience</label>
        <div className="grid grid-cols-2 gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`p-3 rounded-xl border text-left transition-all ${
                filter === f.value
                  ? "border-[#176e56] bg-[#eaf5ef]"
                  : "border-[#eaf5ef] hover:border-[#54a987]"
              }`}
            >
              <p className={`text-sm font-medium ${filter === f.value ? "text-[#176e56]" : "text-[#173d37]"}`}>
                {f.label}
              </p>
              <p className="text-xs text-[#54a987]">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Message box */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[#173d37] mb-2">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your broadcast message here…"
          rows={4}
          className="w-full px-4 py-3 text-sm bg-[#f8faf8] border border-[#c5e3d3] rounded-xl text-[#173d37] placeholder-[#54a987]/60 focus:outline-none focus:ring-2 focus:ring-[#176e56]/30 resize-none"
        />
        <p className="text-xs text-[#54a987] mt-1">{message.length} characters</p>
      </div>

      {/* Audience preview */}
      <div className="flex items-center gap-2 mb-5 p-3 bg-[#f8faf8] rounded-xl border border-[#eaf5ef]">
        <Users className="w-4 h-4 text-[#54a987]" />
        <p className="text-sm text-[#173d37]">
          Sending to: <span className="font-semibold text-[#176e56]">{selectedFilter.label}</span>
          <span className="text-[#54a987] ml-1">(~{totalUsers} users max)</span>
        </p>
      </div>

      {/* Errors / Results */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {result && (
        <div className="flex items-start gap-2 p-3 bg-[#eaf5ef] border border-[#c5e3d3] rounded-xl mb-4">
          <CheckCircle className="w-4 h-4 text-[#176e56] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#176e56]">Broadcast Complete!</p>
            <p className="text-xs text-[#54a987]">
              ✓ {result.sent} sent · ✗ {result.failed} failed · {result.total} total
            </p>
          </div>
        </div>
      )}

      {/* Send Button */}
      {!confirmOpen ? (
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={!message.trim() || sending}
          className="w-full py-3 bg-[#176e56] hover:bg-[#1a5c48] disabled:opacity-50 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Megaphone className="w-4 h-4" />
          Send Broadcast
        </button>
      ) : (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <p className="text-sm font-medium text-orange-800 mb-3">
            ⚠️ Are you sure? This will send a WhatsApp message to all{" "}
            <strong>{selectedFilter.label}</strong> patients.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 py-2 bg-[#176e56] hover:bg-[#1a5c48] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            >
              {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              {sending ? "Sending…" : "Yes, Send"}
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
              className="flex-1 py-2 border border-[#c5e3d3] text-[#173d37] rounded-lg text-sm font-medium hover:bg-[#eaf5ef] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

