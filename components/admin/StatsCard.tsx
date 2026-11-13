"use client";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: "green" | "mint" | "teal" | "emerald";
}

const COLOR_MAP = {
  green: { bg: "bg-[#176e56]", light: "bg-[#eaf5ef]", text: "text-[#176e56]" },
  mint: { bg: "bg-[#54a987]", light: "bg-[#eaf5ef]", text: "text-[#54a987]" },
  teal: { bg: "bg-[#2d9479]", light: "bg-[#e0f2eb]", text: "text-[#2d9479]" },
  emerald: { bg: "bg-[#77d1a5]", light: "bg-[#f0fbf5]", text: "text-[#2d9479]" },
};

export default function StatsCard({ title, value, subtitle, icon: Icon, color = "green" }: StatsCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#eaf5ef] hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-[#173d37]/70">{title}</p>
        <div className={`w-10 h-10 rounded-xl ${c.light} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-[#173d37]">{value}</p>
      {subtitle && <p className="text-xs text-[#54a987] mt-1">{subtitle}</p>}
    </div>
  );
}
