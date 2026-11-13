"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ConversationList from "../../../components/admin/ConversationList";
import ChatWindow from "../../../components/admin/ChatWindow";
import TopBar from "../../../components/admin/TopBar";
import { RefreshCw, MessageSquare } from "lucide-react";

interface Conversation {
  phoneNumber: string;
  patientName: string;
  patientReference: string | null;
  currentStep: string;
  language: string;
  isHandedOver: boolean;
  isVerified: boolean;
  lastMessage: { text: string; sender: string; createdAt: number } | null;
  messageCount: number;
  updatedAt: number;
}

function ConversationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const selectedPhone = searchParams.get("phone") || null;

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/admin/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSelect = (phone: string) => {
    router.push(`/admin/conversations?phone=${encodeURIComponent(phone)}`);
  };

  const selectedConv = conversations.find((c) => c.phoneNumber === selectedPhone);

  return (
    <>
      <TopBar
        title="Conversations"
        subtitle={`${conversations.length} total conversations`}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ height: "calc(100vh - 73px)" }}>
        {/* Left: Conversation List */}
        <div className="w-80 flex-shrink-0 border-r border-[#eaf5ef] bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#eaf5ef] flex items-center justify-between">
            <span className="text-xs font-medium text-[#54a987] uppercase tracking-wide">
              {conversations.length} conversations
            </span>
            <button
              onClick={fetchConversations}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-[#eaf5ef] text-[#54a987] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ConversationList
              conversations={conversations}
              selected={selectedPhone}
              onSelect={handleSelect}
              search={search}
              onSearch={setSearch}
            />
          </div>
        </div>

        {/* Right: Chat Window */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f8faf8]">
          {selectedPhone && selectedConv ? (
            <ChatWindow
              phoneNumber={selectedPhone}
              patientName={selectedConv.patientName}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-[#eaf5ef] flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-[#54a987]" />
              </div>
              <p className="text-lg font-semibold text-[#173d37] mb-2">Select a conversation</p>
              <p className="text-sm text-[#54a987]">
                Choose a patient from the left to view their conversation history and reply.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-[#54a987]">Loading…</div>}>
      <ConversationsContent />
    </Suspense>
  );
}

