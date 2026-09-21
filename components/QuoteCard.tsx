import React from "react";

export interface QuoteCardProps {
  quote?: string;
  speaker?: string;
  market?: string;
  timestamp?: string;
}

export default function QuoteCard({
  quote = "Exact quote text will be surfaced with strict transcript traceability.",
  speaker = "Expert Speaker",
  market = "FR",
  timestamp = "00:00",
}: QuoteCardProps) {
  return (
    <div className="border-l-2 border-slate-900 bg-white p-3 rounded-r-md border-y border-r border-slate-200">
      <blockquote className="text-xs text-slate-700 italic mb-1.5">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{speaker} ({market})</span>
        <span className="font-mono">{timestamp}</span>
      </div>
    </div>
  );
}
