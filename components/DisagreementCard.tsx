"use client";

import React, { useState } from "react";
import EvidenceCard from "./EvidenceCard";
import { ResolvedCrossCallTheme, ThemeType } from "@/lib/themes";

export interface DisagreementCardProps {
  theme?: ResolvedCrossCallTheme;
  topic?: string;
  divergenceSummary?: string;
  type?: ThemeType;
}

export default function DisagreementCard({
  theme,
  topic: propTopic,
  divergenceSummary: propSummary,
  type: propType,
}: DisagreementCardProps) {
  const [showEvidence, setShowEvidence] = useState(false);

  const title = theme?.title || propTopic || "Market Divergence";
  const summary = theme?.summary || propSummary || "";
  const type = theme?.type || propType || "difference_in_emphasis";
  const expertsCovered = theme?.expertsCovered ?? 3;
  const totalExperts = theme?.totalExperts ?? 3;
  const evidenceList = theme?.evidence || [];

  const getBadgeStyle = () => {
    switch (type) {
      case "disagreement":
        return { label: "Material Disagreement", bg: "bg-red-50 text-red-700 border-red-200" };
      case "difference_in_emphasis":
      default:
        return { label: "Difference in Emphasis", bg: "bg-amber-50 text-amber-800 border-amber-200" };
    }
  };

  const badge = getBadgeStyle();

  return (
    <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-xs transition-shadow">
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
            className="text-xs text-amber-800 font-medium hover:underline flex items-center gap-1"
          >
            {showEvidence ? "Hide Evidence" : `View Evidence (${evidenceList.length})`}
          </button>
        )}
      </div>

      <h4 className="text-base font-bold text-slate-900 mb-2">{title}</h4>
      <p className="text-sm text-slate-700 leading-relaxed mb-3">{summary}</p>

      {showEvidence && evidenceList.length > 0 && (
        <div className="mt-4 pt-4 border-t border-amber-100 space-y-3">
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
