import React from "react";

export interface AnswerCardProps {
  questionId?: string;
  questionText?: string;
  answer?: string;
  synthesisType?: "consensus" | "mixed" | "single_source" | "insufficient_evidence";
  coverage?: {
    expertsCovered: number;
    totalExperts: number;
  };
  loading?: boolean;
}

const synthesisBadgeStyles: Record<string, { label: string; style: string }> = {
  consensus: { label: "Broad Consensus", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  mixed: { label: "Mixed Perspectives", style: "bg-amber-50 text-amber-700 border-amber-200" },
  single_source: { label: "Single Expert Source", style: "bg-blue-50 text-blue-700 border-blue-200" },
  insufficient_evidence: { label: "Insufficient Evidence", style: "bg-slate-100 text-slate-600 border-slate-300" },
};

export default function AnswerCard({
  questionId = "Q1",
  questionText,
  answer,
  synthesisType = "consensus",
  coverage,
  loading = false,
}: AnswerCardProps) {
  const badgeInfo = synthesisBadgeStyles[synthesisType] || synthesisBadgeStyles.consensus;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded text-xs font-bold bg-slate-900 text-white">
            {questionId}
          </span>
          {questionText && (
            <h3 className="text-base font-bold text-slate-900">
              {questionText}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${badgeInfo.style}`}>
            {badgeInfo.label}
          </span>
          {coverage && (
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              Expert Coverage: {coverage.expertsCovered} / {coverage.totalExperts || 3}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3 py-4">
          <div className="h-4 bg-slate-100 rounded w-full"></div>
          <div className="h-4 bg-slate-100 rounded w-5/6"></div>
          <div className="h-4 bg-slate-100 rounded w-4/6"></div>
          <p className="text-xs text-slate-400 font-medium text-center pt-2">Searching the interviews &amp; analyzing retrieved evidence...</p>
        </div>
      ) : answer ? (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            AI Analysis
          </h4>
          <p className="text-sm text-slate-800 leading-relaxed font-normal bg-slate-50 p-4 rounded-xl border border-slate-200">
            {answer}
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-500 italic py-2">
          Select a question to view the analysis.
        </p>
      )}
    </div>
  );
}
