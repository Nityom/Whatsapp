"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Megaphone,
  Activity,
  Settings,
  Bot,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/admin/broadcast", label: "Broadcast", icon: Megaphone },
  { href: "/admin/sessions", label: "Sessions", icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-[#eaf5ef] border-r border-[#c5e3d3] flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#c5e3d3]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#176e56] flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#173d37] leading-tight">Svaasth Connect</p>
            <p className="text-xs text-[#54a987]">Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#176e56] text-white shadow-sm"
                  : "text-[#173d37] hover:bg-[#c5e3d3]/60"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[#c5e3d3]">
        <p className="text-xs text-[#54a987]">Cortex Hospital, Wardha</p>
        <p className="text-xs text-[#54a987] opacity-70">Powered by Svaasth HMS</p>
      </div>
    </aside>
  );
}
