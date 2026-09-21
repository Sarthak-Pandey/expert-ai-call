"use client";

import React, { useState } from "react";
import EvidenceCard from "./EvidenceCard";
import { ResolvedCrossCallTheme } from "@/lib/themes";

export interface ThemeCardProps {
  theme?: ResolvedCrossCallTheme;
  title?: string;
  summary?: string;
  description?: string;
  type?: string;
  expertsCovered?: number;
  totalExperts?: number;
}

export default function ThemeCard({
  theme,
  title: propTitle,
  summary: propSummary,
  description: propDescription,
  type: propType,
  expertsCovered: propExpertsCovered,
  totalExperts: propTotalExperts,
}: ThemeCardProps) {
  const [showEvidence, setShowEvidence] = useState(false);

  const title = theme?.title || propTitle || "Common Theme";
  const summary = theme?.summary || propSummary || propDescription || "";
  const type = theme?.type || propType || "consensus";
  const expertsCovered = theme?.expertsCovered ?? propExpertsCovered ?? 3;
  const totalExperts = theme?.totalExperts ?? propTotalExperts ?? 3;
  const evidenceList = theme?.evidence || [];

  const getBadgeStyle = () => {
    switch (type) {
      case "consensus":
        return { label: "Consensus Theme", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "single_expert":
        return { label: "Single Expert Focus", bg: "bg-purple-50 text-purple-700 border-purple-200" };
      case "insufficient_evidence":
        return { label: "Insufficient Evidence", bg: "bg-slate-100 text-slate-600 border-slate-200" };
      default:
        return { label: "Common Theme", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
  };

  const badge = getBadgeStyle();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition-shadow">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${badge.bg}`}>
            {badge.label}
          </span>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {expertsCovered} / {totalExperts} Experts Covered
          </span>
        </div>

        {evidenceList.length > 0 && (
          <button
            onClick={() => setShowEvidence((prev) => !prev)}
            className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
          >
            {showEvidence ? "Hide Evidence" : `View Evidence (${evidenceList.length})`}
          </button>
        )}
      </div>

      <h4 className="text-base font-bold text-slate-900 mb-2">{title}</h4>
      <p className="text-sm text-slate-600 leading-relaxed">{summary}</p>

      {showEvidence && evidenceList.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Supporting Grounded Evidence ({evidenceList.length})
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {evidenceList.map((ev) => (
              <EvidenceCard key={ev.chunkId} evidence={ev} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
