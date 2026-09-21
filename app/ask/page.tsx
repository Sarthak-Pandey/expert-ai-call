"use client";

import React, { useState, useRef, useEffect } from "react";
import EvidenceCard from "@/components/EvidenceCard";
import { Evidence } from "@/lib/evidence";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  evidence?: Evidence[];
  synthesisType?: "consensus" | "mixed" | "single_source" | "insufficient_evidence";
  coverage?: {
    expertsCovered: number;
    totalExperts: number;
  };
  timestamp: string;
}

let msgIdCounter = 0;
function createMsgId(prefix: string): string {
  msgIdCounter += 1;
  return `${prefix}_${msgIdCounter}_${msgIdCounter}`;
}

function getFormattedTime(): string {
  const d = new Date();
  const hrs = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${hrs}:${mins}`;
}

const SUGGESTED_QUESTIONS = [
  "What are the biggest barriers to robotic surgery adoption?",
  "How important is ROI across the three markets?",
  "How does the UK view economics compared with France and Germany?",
  "Which experts mention training?",
  "What are the reported purchasing timelines?",
  "What do the experts say about electric vehicle charging?",
];

export default function AskPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  async function handleAskQuestion(questionText: string) {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    setError(null);
    setInputQuery("");

    // Create user message
    const userMsg: ChatMessage = {
      id: createMsgId("user"),
      role: "user",
      content: trimmed,
      timestamp: getFormattedTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setLoadingStatus("Searching transcripts...");

    try {
      // Simulate status transition for user feedback
      const statusTimer = setTimeout(() => {
        setLoadingStatus("Analyzing evidence...");
      }, 700);

      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, topK: 6 }),
      });

      clearTimeout(statusTimer);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process question. Please try again.");
      }

      const assistantMsg: ChatMessage = {
        id: createMsgId("assistant"),
        role: "assistant",
        content: data.answer || "No response generated.",
        evidence: data.evidence || [],
        synthesisType: data.synthesisType || "mixed",
        coverage: data.coverage || { expertsCovered: 0, totalExperts: 3 },
        timestamp: getFormattedTime(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || "An unexpected error occurred while querying expert calls.");
    } finally {
      setLoading(false);
      setLoadingStatus("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleAskQuestion(inputQuery);
  }

  function clearHistory() {
    setMessages([]);
    setError(null);
  }

  const getSynthesisBadge = (type?: string) => {
    switch (type) {
      case "consensus":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "mixed":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "single_source":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "insufficient_evidence":
        return "bg-slate-100 text-slate-600 border-slate-300";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Ask Across Calls
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Ask a question about the three expert interviews.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
          >
            Clear Conversation
          </button>
        )}
      </div>

      {/* Suggested Questions */}
      {messages.length === 0 && (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Suggested Questions
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleAskQuestion(q)}
                className="text-left p-3 text-xs text-slate-700 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 rounded-lg shadow-2xs transition-all flex items-center justify-between group"
              >
                <span>&ldquo;{q}&rdquo;</span>
                <span className="text-slate-400 group-hover:text-blue-600 text-sm font-semibold ml-2">
                  &rarr;
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Log */}
      <div className="space-y-6 min-h-[300px]">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-3">
            {/* User Message */}
            {msg.role === "user" && (
              <div className="flex justify-end">
                <div className="bg-slate-900 text-white rounded-2xl rounded-tr-xs px-5 py-3.5 text-sm max-w-2xl shadow-sm">
                  <p className="leading-relaxed">{msg.content}</p>
                  <span className="block text-[10px] text-slate-400 mt-1.5 text-right font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            )}

            {/* Assistant Response */}
            {msg.role === "assistant" && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
                {/* Header Metadata */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">
                      Answer
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 border rounded-full capitalize ${getSynthesisBadge(
                        msg.synthesisType
                      )}`}
                    >
                      {msg.synthesisType?.replace("_", " ") || "Synthesis"}
                    </span>
                  </div>
                  {msg.coverage && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 font-medium">
                      Coverage: {msg.coverage.expertsCovered} / {msg.coverage.totalExperts} experts
                    </div>
                  )}
                </div>

                {/* Synthesis Body */}
                <div className="text-slate-800 text-sm leading-relaxed prose prose-slate max-w-none">
                  {msg.content}
                </div>

                {/* Supporting Evidence Cards */}
                {msg.evidence && msg.evidence.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Supporting Evidence ({msg.evidence.length})
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        Exact Verbatim Quotes
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {msg.evidence.map((ev) => (
                        <EvidenceCard key={ev.chunkId} evidence={ev} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Loading Spinner State */}
        {loading && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-slate-700">{loadingStatus}</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold ml-4">
              &times;
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Chat Box */}
      <div className="sticky bottom-4 bg-white border border-slate-300 rounded-xl p-3 shadow-lg">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask a question about the expert calls across markets..."
            disabled={loading}
            className="flex-1 px-4 py-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="px-6 py-3 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center gap-2"
          >
            <span>Ask</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
