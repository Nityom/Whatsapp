"use client";
import { useState, useEffect, useRef } from "react";
import { Send, RefreshCw, Phone } from "lucide-react";

interface Message {
  _id: string;
  phoneNumber: string;
  sender: "patient" | "assistant" | "staff";
  text: string;
  createdAt: number;
}

interface ChatWindowProps {
  phoneNumber: string;
  patientName: string;
}

const SENDER_STYLES = {
  patient: "bg-white border border-[#eaf5ef] text-[#173d37] self-start rounded-tl-none",
  assistant: "bg-[#eaf5ef] text-[#173d37] self-start rounded-tl-none",
  staff: "bg-[#176e56] text-white self-end rounded-tr-none",
};

const SENDER_LABEL = {
  patient: "Patient",
  assistant: "Bot",
  staff: "Staff",
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ChatWindow({ phoneNumber, patientName }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/messages?phone=${encodeURIComponent(phoneNumber)}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [phoneNumber]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = replyText.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError("");
    setSendSuccess(false);
    try {
      const res = await fetch("/api/admin/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error || "Failed to send");
      } else {
        setReplyText("");
        setSendSuccess(true);
        setTimeout(() => setSendSuccess(false), 3000);
        await fetchMessages();
      }
    } catch {
      setSendError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const d = formatDate(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) {
      last.messages.push(msg);
    } else {
      grouped.push({ date: d, messages: [msg] });
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#eaf5ef] bg-white flex items-center justify-between">
        <div>
          <p className="font-semibold text-[#173d37]">{patientName}</p>
          <div className="flex items-center gap-1 text-xs text-[#54a987]">
            <Phone className="w-3 h-3" />
            {phoneNumber}
          </div>
        </div>
        <button
          onClick={fetchMessages}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-[#eaf5ef] text-[#54a987] transition-colors"
          title="Refresh messages"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-[#f8faf8]">
        {messages.length === 0 && !loading && (
          <div className="text-center text-sm text-[#54a987] mt-10">
            No messages yet for this conversation.
          </div>
        )}
        {grouped.map(({ date, messages: dayMsgs }) => (
          <div key={date}>
            <div className="flex justify-center my-3">
              <span className="text-xs bg-white border border-[#eaf5ef] text-[#54a987] px-3 py-1 rounded-full">
                {date}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {dayMsgs.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex flex-col max-w-[75%] ${msg.sender === "staff" ? "self-end items-end" : "self-start items-start"}`}
                >
                  <span className="text-xs text-[#54a987]/70 mb-0.5 px-1">
                    {SENDER_LABEL[msg.sender]}
                  </span>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${SENDER_STYLES[msg.sender]}`}>
                    {msg.text}
                  </div>
                  <span className="text-xs text-[#54a987]/60 mt-0.5 px-1">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply Box */}
      <div className="px-4 py-3 border-t border-[#eaf5ef] bg-white">
        {sendSuccess && (
          <p className="text-xs text-[#176e56] mb-2">✓ Message sent successfully!</p>
        )}
        {sendError && (
          <p className="text-xs text-red-500 mb-2">{sendError}</p>
        )}
        <div className="flex gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            rows={2}
            className="flex-1 resize-none px-3 py-2 text-sm bg-[#f8faf8] border border-[#c5e3d3] rounded-xl text-[#173d37] placeholder-[#54a987]/60 focus:outline-none focus:ring-2 focus:ring-[#176e56]/30"
          />
          <button
            onClick={handleSend}
            disabled={!replyText.trim() || sending}
            className="px-4 py-2 bg-[#176e56] hover:bg-[#1a5c48] disabled:opacity-50 text-white rounded-xl flex items-center gap-2 text-sm font-medium transition-colors"
          >
            {sending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

