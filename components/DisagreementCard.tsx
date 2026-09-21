import React from "react";

export interface DisagreementCardProps {
  topic?: string;
  divergenceSummary?: string;
}

export default function DisagreementCard({
  topic = "Market Disagreement Topic",
  divergenceSummary = "Specific differences and contrasting viewpoints between experts will be displayed here.",
}: DisagreementCardProps) {
  return (
    <div className="bg-white border border-amber-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          Divergence / Disagreement
        </span>
      </div>
      <h4 className="text-sm font-semibold text-slate-900 mb-1">{topic}</h4>
      <p className="text-xs text-slate-600 leading-relaxed">
        {divergenceSummary}
      </p>
    </div>
  );
}
