"use client";
import { useEffect, useState } from "react";
import BroadcastPanel from "../../../components/admin/BroadcastPanel";
import TopBar from "../../../components/admin/TopBar";

export default function BroadcastPage() {
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => setTotalUsers(d.totalUsers || 0))
      .catch(() => {});
  }, []);

  return (
    <>
      <TopBar
        title="Broadcast"
        subtitle="Send messages to all or selected patients"
      />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl">
          <BroadcastPanel totalUsers={totalUsers} />

          {/* Info */}
          <div className="mt-6 p-4 bg-[#eaf5ef] rounded-2xl border border-[#c5e3d3]">
            <h3 className="text-sm font-semibold text-[#173d37] mb-2">📋 Broadcast Guidelines</h3>
            <ul className="text-xs text-[#54a987] space-y-1">
              <li>• Messages are sent directly via WhatsApp Business API</li>
              <li>• Patients can reply to these messages as normal</li>
              <li>• Keep messages concise and relevant to healthcare</li>
              <li>• Respect patient privacy — do not share personal data</li>
              <li>• Use for appointment reminders, health tips, hospital notices</li>
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}
