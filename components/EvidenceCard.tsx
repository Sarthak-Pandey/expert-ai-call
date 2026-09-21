"use client";

import React, { useState } from "react";
import { Evidence } from "@/lib/evidence";

export interface EvidenceCardProps {
  evidence?: Evidence;
  // Backward compatibility props
  market?: string;
  expertName?: string;
  role?: string;
  exactQuote?: string;
  snippet?: string;
  timestamp?: string;
  sourceFile?: string;
  score?: number;
}

function formatMarketName(raw: string): string {
  if (raw === "FR" || raw === "France") return "France";
  if (raw === "DE" || raw === "Germany") return "Germany";
  if (raw === "UK" || raw === "United Kingdom") return "United Kingdom";
  return raw;
}

export default function EvidenceCard({
  evidence,
  market: propMarket,
  expertName: propExpertName,
  role: propRole,
  exactQuote: propExactQuote,
  snippet: propSnippet,
  timestamp: propTimestamp,
  sourceFile: propSourceFile,
}: EvidenceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const rawMarket = evidence?.market || propMarket || "Market";
  const market = formatMarketName(rawMarket);
  const expertName = evidence?.expertName || propExpertName || "Expert Speaker";
  const role = evidence?.role || propRole || "";
  const quote = evidence?.exactQuote || propExactQuote || propSnippet || "Exact verbatim quote from transcript.";
  const timestamp = evidence?.timestamp || propTimestamp || "00:00";
  const sourceFile = evidence?.sourceFile || propSourceFile || "";

  const isLongQuote = quote.length > 220;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[11px] text-blue-800 bg-blue-50 px-2 py-0.5 border border-blue-200 rounded-md">
              {market}
            </span>
            <span className="font-semibold text-xs text-slate-900">{expertName}</span>
            {role && <span className="text-xs text-slate-500">({role})</span>}
          </div>
          <span className="text-xs font-mono font-medium text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-md shrink-0">
            {timestamp}
          </span>
        </div>

        {evidence?.interviewQuestion && (
          <div className="mb-2 text-[11px] text-slate-500 font-medium bg-white p-2 rounded-md border border-slate-100">
            Topic: &ldquo;{evidence.interviewQuestion}&rdquo;
          </div>
        )}

        {/* Verbatim Quote Container */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 relative">
          <p className={`text-slate-800 text-xs leading-relaxed italic ${!isExpanded && isLongQuote ? "line-clamp-4" : ""}`}>
            &ldquo;{quote}&rdquo;
          </p>

          {isLongQuote && (
            <button
              onClick={() => setIsExpanded((prev) => !prev)}
              className="mt-2 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              {isExpanded ? "Show Less" : "Show Full Verbatim Quote"}
            </button>
          )}
        </div>
      </div>

      {/* Card Footer Source Metadata */}
      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1 font-medium text-slate-600">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Transcript evidence
        </span>
        {sourceFile && (
          <span className="font-mono text-slate-400">
            {sourceFile}{evidence?.sourceTurnId ? ` (${evidence.sourceTurnId})` : ""}
          </span>
        )}
      </div>
    </div>
  );
}
