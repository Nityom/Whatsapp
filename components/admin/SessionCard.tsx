"use client";

interface Session {
  phoneNumber: string;
  patientName: string;
  patientReference: string | null;
  currentStep: string;
  language: string;
  isHandedOver: boolean;
  isVerified: boolean;
  updatedAt: number;
}

interface SessionCardProps {
  session: Session;
}

const STEP_COLORS: Record<string, string> = {
  WELCOME: "bg-gray-100 text-gray-600",
  IDLE: "bg-blue-50 text-blue-600",
  BOOKING_SELECT_DOCTOR: "bg-purple-50 text-purple-600",
  BOOKING_SELECT_DATE: "bg-purple-50 text-purple-600",
  BOOKING_SELECT_SLOT: "bg-purple-50 text-purple-600",
  BOOKING_CONFIRMATION: "bg-purple-50 text-purple-600",
  REGISTER_NAME: "bg-yellow-50 text-yellow-700",
  REGISTER_AGE: "bg-yellow-50 text-yellow-700",
  REGISTER_SEX: "bg-yellow-50 text-yellow-700",
  REGISTER_ADDRESS: "bg-yellow-50 text-yellow-700",
  OTP_VERIFICATION: "bg-orange-50 text-orange-600",
  HANDED_OVER: "bg-red-50 text-red-600",
};

const LANG_LABEL: Record<string, string> = { en: "🇬🇧 EN", hi: "🇮🇳 HI", mr: "🫘 MR" };

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SessionCard({ session }: SessionCardProps) {
  const stepColor = STEP_COLORS[session.currentStep] || "bg-gray-100 text-gray-600";

  return (
    <div className="bg-white border border-[#eaf5ef] rounded-2xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-semibold text-sm text-[#173d37]">{session.patientName}</p>
          {session.patientReference && (
            <p className="text-xs text-[#54a987] font-mono">{session.patientReference}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {session.isVerified && (
            <span className="text-xs bg-[#eaf5ef] text-[#176e56] px-2 py-0.5 rounded-full">✓ Verified</span>
          )}
          {session.isHandedOver && (
            <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">Staff</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${stepColor}`}>
          {session.currentStep}
        </span>
        <span className="text-xs text-[#54a987]">
          {LANG_LABEL[session.language] || "EN"}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-[#54a987] font-mono">{session.phoneNumber}</p>
        <p className="text-xs text-[#173d37]/50">{timeAgo(session.updatedAt)}</p>
      </div>
    </div>
  );
}
