import React from "react";

export interface ThemeCardProps {
  title?: string;
  description?: string;
  marketsCount?: number;
}

export default function ThemeCard({
  title = "Common Theme Placeholder",
  description = "Synthesized common theme across markets will be populated here.",
  marketsCount = 3,
}: ThemeCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          Consensus Theme
        </span>
        <span className="text-xs text-slate-500">{marketsCount} Markets</span>
      </div>
      <h4 className="text-sm font-semibold text-slate-900 mb-1">{title}</h4>
      <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}
