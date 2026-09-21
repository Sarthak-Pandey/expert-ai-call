"use client";

import React, { useState } from "react";
import EvidenceCard from "@/components/EvidenceCard";
import { Evidence } from "@/lib/evidence";

export default function AskPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), topK: 5 }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch search results");
      }

      setResults(data.results || []);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || "An unexpected error occurred");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Semantic Search & Evidence Retrieval Viewer
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Query expert-call transcripts across all markets with exact transcript quote extraction.
        </p>
      </div>

      {/* Query Input Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Semantic Evidence Search
        </h3>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question (e.g. 'What are the main barriers to robotic surgery adoption?')..."
            className="flex-1 px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Retrieving..." : "Search Evidence"}
          </button>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Evidence Results Display */}
      {searched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">
              Retrieved Grounded Evidence ({results.length})
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Source: data/chunks.json (Authoritative)
            </span>
          </div>

          {results.length === 0 && !loading && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm">
              No matching transcript evidence chunks retrieved.
            </div>
          )}

          <div className="space-y-4">
            {results.map((ev) => (
              <EvidenceCard key={ev.chunkId} evidence={ev} />
            ))}
          </div>
        </div>
      )}

      {!searched && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium text-sm mb-1">
            Submit a query to inspect grounded evidence hits.
          </p>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            Phase 3 retrieves exact transcript quotes, timestamps, and metadata with zero AI synthesis or LLM generation.
          </p>
        </div>
      )}
    </div>
  );
}
