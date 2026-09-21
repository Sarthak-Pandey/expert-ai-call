import React from "react";

export interface EvidenceCardProps {
  market?: string;
  expertId?: string;
  snippet?: string;
  timestamp?: string;
}

export default function EvidenceCard({
  market = "Market Placeholder",
  expertId = "Expert ID",
  snippet = "Evidence snippet text will be extracted from transcript chunks in later phases.",
  timestamp = "00:00 - 00:00",
}: EvidenceCardProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-slate-800 bg-white px-2 py-0.5 border border-slate-200 rounded">
            {market}
          </span>
          <span className="text-xs text-slate-500">{expertId}</span>
        </div>
        <span className="text-xs font-mono text-slate-400">{timestamp}</span>
      </div>
      <p className="text-slate-600 text-xs leading-relaxed italic">
        &ldquo;{snippet}&rdquo;
      </p>
    </div>
  );
}
