import React from "react";

export interface AnswerCardProps {
  questionId?: string;
  questionText?: string;
  answer?: string;
  loading?: boolean;
}

export default function AnswerCard({
  questionId = "Q0",
  questionText = "Question placeholder",
  answer,
  loading = false,
}: AnswerCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
          {questionId}
        </span>
        <span className="text-xs text-slate-400 font-medium">Answer Summary</span>
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-2">
        {questionText}
      </h3>
      {loading ? (
        <div className="animate-pulse space-y-2 py-2">
          <div className="h-4 bg-slate-100 rounded w-5/6"></div>
          <div className="h-4 bg-slate-100 rounded w-4/6"></div>
        </div>
      ) : answer ? (
        <p className="text-sm text-slate-700 leading-relaxed">{answer}</p>
      ) : (
        <p className="text-sm text-slate-400 italic">
          Answer space reserved for future AI analysis.
        </p>
      )}
    </div>
  );
}
