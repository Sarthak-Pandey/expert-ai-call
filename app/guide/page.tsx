import React from "react";
import AnswerCard from "@/components/AnswerCard";
import EvidenceCard from "@/components/EvidenceCard";
import QuoteCard from "@/components/QuoteCard";
import ThemeCard from "@/components/ThemeCard";

const guideQuestions = [
  {
    id: "Q1",
    title: "Question 1",
    text: "What are the primary market drivers and growth expectations for the project scope across regions?",
  },
  {
    id: "Q2",
    title: "Question 2",
    text: "How do regulatory environments and compliance requirements differ between France, Germany, and the UK?",
  },
  {
    id: "Q3",
    title: "Question 3",
    text: "What key operational challenges or bottlenecks were highlighted by the industry experts?",
  },
  {
    id: "Q4",
    title: "Question 4",
    text: "How are competitive dynamics and vendor landscape positioning evolving in each market?",
  },
  {
    id: "Q5",
    title: "Question 5",
    text: "What customer adoption patterns and purchasing criteria are driving decision-making?",
  },
  {
    id: "Q6",
    title: "Question 6",
    text: "What strategic outlook and investment priorities do experts recommend for the next 3-5 years?",
  },
];

export default function GuidePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Interview Guide
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Structured evaluation of key research guide questions backed by grounded evidence from France, Germany, and UK expert calls.
        </p>
      </div>

      <div className="space-y-6">
        {guideQuestions.map((q) => (
          <div
            key={q.id}
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4"
          >
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-900 text-white">
                  {q.id}
                </span>
                <h3 className="text-base font-semibold text-slate-900">
                  {q.text}
                </h3>
              </div>
            </div>

            {/* Answer & Analysis Placeholder Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Future AI Answer
                </h4>
                <AnswerCard
                  questionId={q.id}
                  questionText={q.text}
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Future Evidence & Exact Quotes
                </h4>
                <div className="space-y-2">
                  <EvidenceCard />
                  <QuoteCard />
                </div>
              </div>
            </div>

            {/* Cross-call analysis & timestamps placeholder */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Future Cross-Call Themes
                </h4>
                <ThemeCard />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Supporting Timestamps
                </h4>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500 font-mono">
                  Timestamps placeholder (e.g. FR [04:12], DE [12:45], UK [08:30])
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
