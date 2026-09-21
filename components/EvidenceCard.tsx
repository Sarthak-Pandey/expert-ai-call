import React from "react";
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

export default function EvidenceCard({
  evidence,
  market: propMarket,
  expertName: propExpertName,
  role: propRole,
  exactQuote: propExactQuote,
  snippet: propSnippet,
  timestamp: propTimestamp,
  sourceFile: propSourceFile,
  score: propScore,
}: EvidenceCardProps) {
  const market = evidence?.market || propMarket || "Market";
  const expertName = evidence?.expertName || propExpertName || "Expert Name";
  const role = evidence?.role || propRole || "";
  const quote = evidence?.exactQuote || propExactQuote || propSnippet || "Exact quote snippet.";
  const timestamp = evidence?.timestamp || propTimestamp || "00:00";
  const sourceFile = evidence?.sourceFile || propSourceFile || "";
  const score = evidence?.score ?? propScore;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm shadow-sm hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 border border-blue-200 rounded">
            {market}
          </span>
          <span className="font-medium text-xs text-slate-800">{expertName}</span>
          {role && <span className="text-xs text-slate-500">· {role}</span>}
        </div>
        <div className="flex items-center gap-2">
          {score !== undefined && (
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              Score: {score.toFixed(4)}
            </span>
          )}
          <span className="text-xs font-mono font-medium text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
            @ {timestamp}
          </span>
        </div>
      </div>
      
      {evidence?.interviewQuestion && (
        <div className="mb-2 text-xs text-slate-500 font-medium bg-white p-2 rounded border border-slate-100">
          Q: &ldquo;{evidence.interviewQuestion}&rdquo;
        </div>
      )}

      <p className="text-slate-800 text-xs leading-relaxed italic bg-white p-3 rounded border border-slate-200">
        &ldquo;{quote}&rdquo;
      </p>

      {sourceFile && (
        <div className="mt-2 text-[11px] text-slate-400 font-mono flex items-center justify-between">
          <span>Source: {sourceFile}</span>
          {evidence?.sourceTurnId && <span>Turn: {evidence.sourceTurnId}</span>}
        </div>
      )}
    </div>
  );
}
