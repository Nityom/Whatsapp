"use client";
import { Bell, LogOut } from "lucide-react";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  return (
    <div className="bg-white border-b border-[#eaf5ef] px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-[#173d37]">{title}</h1>
        {subtitle && <p className="text-sm text-[#54a987]">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right mr-2">
          <p className="text-sm font-medium text-[#173d37]">Admin</p>
          <p className="text-xs text-[#54a987]">Cortex Hospital</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#176e56] flex items-center justify-center text-white text-sm font-bold">
          A
        </div>
      </div>
    </div>
  );
}

