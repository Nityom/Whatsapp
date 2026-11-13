"use client";

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

interface ConversationListProps {
  conversations: Conversation[];
  selected: string | null;
  onSelect: (phone: string) => void;
  search: string;
  onSearch: (q: string) => void;
}

const LANG_LABEL: Record<string, string> = { en: "EN", hi: "HI", mr: "MR" };

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function truncate(text: string, n = 50) {
  return text.length > n ? text.slice(0, n) + "…" : text;
}

export default function ConversationList({
  conversations,
  selected,
  onSelect,
  search,
  onSearch,
}: ConversationListProps) {
  const filtered = conversations.filter(
    (c) =>
      c.phoneNumber.includes(search) ||
      c.patientName.toLowerCase().includes(search.toLowerCase()) ||
      (c.patientReference || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-[#eaf5ef]">
        <input
          type="text"
          placeholder="Search patient or phone…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-[#f8faf8] border border-[#c5e3d3] rounded-lg text-[#173d37] placeholder-[#54a987]/60 focus:outline-none focus:ring-2 focus:ring-[#176e56]/30"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#54a987]">No conversations found.</div>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.phoneNumber}
              onClick={() => onSelect(conv.phoneNumber)}
              className={`w-full text-left px-4 py-3 border-b border-[#eaf5ef] hover:bg-[#f0fbf5] transition-colors ${
                selected === conv.phoneNumber ? "bg-[#eaf5ef] border-l-2 border-l-[#176e56]" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-[#173d37] truncate">
                      {conv.patientName}
                    </span>
                    {conv.isHandedOver && (
                      <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        Staff
                      </span>
                    )}
                    {conv.isVerified && (
                      <span className="text-xs bg-[#eaf5ef] text-[#176e56] px-1.5 py-0.5 rounded-full flex-shrink-0">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#54a987] mb-1">{conv.phoneNumber}</p>
                  {conv.lastMessage && (
                    <p className="text-xs text-[#173d37]/60 truncate">
                      {conv.lastMessage.sender === "patient" ? "👤" : conv.lastMessage.sender === "staff" ? "🏥" : "🤖"}{" "}
                      {truncate(conv.lastMessage.text, 45)}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs text-[#54a987]">{timeAgo(conv.updatedAt)}</span>
                  <span className="text-xs bg-[#eaf5ef] text-[#176e56] px-1.5 py-0.5 rounded-full">
                    {LANG_LABEL[conv.language] || "EN"}
                  </span>
                  {conv.messageCount > 0 && (
                    <span className="text-xs text-[#54a987]">{conv.messageCount} msgs</span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

