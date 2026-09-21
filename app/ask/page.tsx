import React from "react";
import ChatBox from "@/components/ChatBox";

export default function AskPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Ask Across Calls
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Query across all expert interview transcripts simultaneously with grounded citation extraction.
        </p>
      </div>

      {/* Question Input Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          New Query
        </h3>
        <ChatBox
          placeholder="Ask a question about the expert interviews (e.g., 'What were the main regulatory differences reported between Germany and France?')..."
        />
      </div>

      {/* AI Response & Evidence Output Placeholder Container */}
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center min-h-[250px] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 3v1.5M15.75 3v1.5M3 8.25h18M3 15.75h18M8.25 21v-1.5M15.75 21v-1.5" />
          </svg>
        </div>
        <p className="text-slate-600 font-medium text-sm mb-1">
          Ask a question about the expert interviews.
        </p>
        <p className="text-xs text-slate-400 max-w-md leading-relaxed">
          AI synthesis, source chunk retrieval, exact transcript quotes, and timestamp evidence will appear here after RAG pipeline execution.
        </p>
      </div>
    </div>
  );
}
