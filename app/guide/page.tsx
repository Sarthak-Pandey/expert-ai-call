"use client";

import React, { useState, useEffect } from "react";
import AnswerCard from "@/components/AnswerCard";
import EvidenceCard from "@/components/EvidenceCard";
import ThemeCard from "@/components/ThemeCard";
import DisagreementCard from "@/components/DisagreementCard";
import { Evidence } from "@/lib/evidence";
import { CrossCallAnalysis } from "@/lib/themes";

interface GuideQuestionItem {
  id: string;
  question: string;
}

interface GuideApiResponse {
  questionId: string;
  question: string;
  answer: string;
  synthesisType: "consensus" | "mixed" | "single_source" | "insufficient_evidence";
  coverage: {
    expertsCovered: number;
    totalExperts: number;
  };
  evidence: Evidence[];
}

const GUIDE_QUESTIONS: GuideQuestionItem[] = [
  { id: "Q1", question: "How would you describe current adoption of robotic surgery in your market?" },
  { id: "Q2", question: "What are the main barriers to adoption?" },
  { id: "Q3", question: "How important are hospital budgets and ROI in purchasing decisions?" },
  { id: "Q4", question: "How important are surgeon training and clinical outcomes?" },
  { id: "Q5", question: "What adoption trend do you expect over the next 3–5 years?" },
  { id: "Q6", question: "What is the typical hospital decision-making timeline for purchasing a new robotic system?" },
];

export default function GuidePage() {
  const questions = GUIDE_QUESTIONS;
  const [activeQuestionId, setActiveQuestionId] = useState<string>("Q1");
  const [analysisData, setAnalysisData] = useState<Record<string, GuideApiResponse>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  // Phase 5 — Cross-Call Themes state
  const [themesData, setThemesData] = useState<CrossCallAnalysis | null>(null);
  const [loadingThemes, setLoadingThemes] = useState<boolean>(false);
  const [errorThemes, setErrorThemes] = useState<string>("");
  const [themesMode, setThemesMode] = useState<"overall" | "question">("overall");

  async function fetchGuideAnalysis(questionId: string) {
    if (loadingMap[questionId]) return;

    setLoadingMap((prev) => ({ ...prev, [questionId]: true }));
    setErrorMap((prev) => ({ ...prev, [questionId]: "" }));

    try {
      const res = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to evaluate question ${questionId}`);
      }

      setAnalysisData((prev) => ({ ...prev, [questionId]: data }));
    } catch (err: unknown) {
      const errorObj = err as Error;
      setErrorMap((prev) => ({ ...prev, [questionId]: errorObj.message || "An unexpected error occurred" }));
    } finally {
      setLoadingMap((prev) => ({ ...prev, [questionId]: false }));
    }
  }

  async function fetchThemes(mode: "overall" | "question", qId?: string) {
    setLoadingThemes(true);
    setErrorThemes("");

    try {
      const payload = mode === "question" && qId ? { questionId: qId } : {};
      const res = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load cross-call themes");
      }

      setThemesData(data);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setErrorThemes(errorObj.message || "Failed to analyze cross-call themes");
    } finally {
      setLoadingThemes(false);
    }
  }

  // Automatically load analysis for active question on tab change if not loaded
  useEffect(() => {
    if (!analysisData[activeQuestionId] && !loadingMap[activeQuestionId] && !errorMap[activeQuestionId]) {
      Promise.resolve().then(() => {
        fetchGuideAnalysis(activeQuestionId);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuestionId, analysisData, loadingMap, errorMap]);

  // Load overall cross-call themes on initial page load
  useEffect(() => {
    Promise.resolve().then(() => {
      fetchThemes("overall");
    });
  }, []);

  const activeQuestion = questions.find((q) => q.id === activeQuestionId) || questions[0];
  const activeData = analysisData[activeQuestionId];
  const isLoading = loadingMap[activeQuestionId];
  const activeError = errorMap[activeQuestionId];

  // Separate themes into common themes vs differences/disagreements
  const consensusThemes = themesData?.themes.filter(
    (t) => t.type === "consensus" || t.type === "single_expert"
  ) || [];

  const differenceThemes = themesData?.themes.filter(
    (t) => t.type === "difference_in_emphasis" || t.type === "disagreement" || t.type === "insufficient_evidence"
  ) || [];

  return (
    <div className="space-y-10 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Grounded Interview Guide & Cross-Call Analysis
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Grounded synthesis of expert interviews (France, Germany, UK) using Groq LLM (openai/gpt-oss-120b) verified by Phase 3 transcript evidence.
        </p>
      </div>

      {/* Guide Question Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-2">
        {questions.map((q) => {
          const isActive = q.id === activeQuestionId;
          const isDone = !!analysisData[q.id];
          return (
            <button
              key={q.id}
              onClick={() => {
                setActiveQuestionId(q.id);
                if (themesMode === "question") {
                  fetchThemes("question", q.id);
                }
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>{q.id}</span>
              {isDone && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
            </button>
          );
        })}
      </div>

      {/* Active Question Banner & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active Question [{activeQuestion.id}]
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
            {activeQuestion.question}
          </h2>
        </div>
        <button
          onClick={() => fetchGuideAnalysis(activeQuestion.id)}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white font-medium text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {isLoading ? "Analyzing..." : activeData ? "Re-analyze" : "Analyze Question"}
        </button>
      </div>

      {/* Error Message */}
      {activeError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {activeError}
        </div>
      )}

      {/* Question Analysis Output & Supporting Evidence Grid */}
      {activeData ? (
        <div className="space-y-6">
          <AnswerCard
            questionId={activeData.questionId}
            questionText={activeData.question}
            answer={activeData.answer}
            synthesisType={activeData.synthesisType}
            coverage={activeData.coverage}
            loading={isLoading}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-base font-semibold text-slate-900">
                Supporting Grounded Evidence ({activeData.evidence.length})
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                Source: data/chunks.json (Authoritative Verbatim)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeData.evidence.map((ev) => (
                <EvidenceCard key={ev.chunkId} evidence={ev} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        isLoading && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center animate-pulse space-y-4">
            <div className="h-4 bg-slate-100 rounded w-1/3 mx-auto"></div>
            <div className="h-4 bg-slate-100 rounded w-2/3 mx-auto"></div>
            <p className="text-xs text-slate-400">Performing semantic retrieval and Groq LLM grounded synthesis...</p>
          </div>
        )
      )}

      {/* PHASE 5: Cross-Call Themes & Differences Section */}
      <div className="pt-8 border-t border-slate-200 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Cross-Call Themes & Key Differences
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Multi-market comparison across France, Germany, and the UK identifying consensus themes and material differences.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => {
                setThemesMode("overall");
                fetchThemes("overall");
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                themesMode === "overall"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Overall Cross-Call Analysis
            </button>
            <button
              onClick={() => {
                setThemesMode("question");
                fetchThemes("question", activeQuestionId);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                themesMode === "question"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Question [{activeQuestionId}] Analysis
            </button>
          </div>
        </div>

        {errorThemes && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {errorThemes}
          </div>
        )}

        {loadingThemes ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center animate-pulse space-y-4">
            <div className="h-4 bg-slate-100 rounded w-1/4 mx-auto"></div>
            <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto"></div>
            <p className="text-xs text-slate-400">Synthesizing cross-call themes and validating evidence IDs...</p>
          </div>
        ) : themesData ? (
          <div className="space-y-8">
            {/* Common Themes Sub-section */}
            {consensusThemes.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Common Themes & Consensus ({consensusThemes.length})
                </h3>
                <div className="space-y-4">
                  {consensusThemes.map((theme) => (
                    <ThemeCard key={theme.id} theme={theme} />
                  ))}
                </div>
              </div>
            )}

            {/* Key Differences / Disagreements Sub-section */}
            {differenceThemes.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  Key Differences & Disagreements ({differenceThemes.length})
                </h3>
                <div className="space-y-4">
                  {differenceThemes.map((theme) => (
                    <DisagreementCard key={theme.id} theme={theme} />
                  ))}
                </div>
              </div>
            )}

            {consensusThemes.length === 0 && differenceThemes.length === 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500">
                No cross-call themes found for this analysis context.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
