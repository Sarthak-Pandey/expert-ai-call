import React from "react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header section */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Expert Call AI Analyst
        </h1>
        <p className="text-base text-slate-600 mt-1.5 leading-relaxed">
          Analyze three expert interviews with grounded AI evidence.
        </p>
      </div>

      {/* Dataset Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Dataset Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-l-3 border-slate-900 pl-4 py-1">
            <p className="text-3xl font-extrabold text-slate-900">3</p>
            <p className="text-xs font-semibold text-slate-600 mt-1">
              Expert Calls
            </p>
            <p className="text-[11px] text-slate-400">Dr. Jean Martin, Anna Keller, Dr. Emily Carter</p>
          </div>
          <div className="border-l-3 border-slate-900 pl-4 py-1">
            <p className="text-3xl font-extrabold text-slate-900">3</p>
            <p className="text-xs font-semibold text-slate-600 mt-1">
              Markets
            </p>
            <p className="text-[11px] text-slate-400">France, Germany, United Kingdom</p>
          </div>
          <div className="border-l-3 border-slate-900 pl-4 py-1">
            <p className="text-3xl font-extrabold text-slate-900">6</p>
            <p className="text-xs font-semibold text-slate-600 mt-1">
              Guide Questions
            </p>
            <p className="text-[11px] text-slate-400">Adoption, Barriers, ROI, Training, Trends, Timeline</p>
          </div>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/guide"
          className="group bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-6 transition-all shadow-xs hover:shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="w-12 h-12 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </span>
              <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-900 transition-colors flex items-center gap-1">
                Explore Guide &rarr;
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Interview Guide
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Explore 6 key interview-guide questions with grounded cross-call AI synthesis, market coverage metrics, and verbatim evidence citations.
            </p>
          </div>
        </Link>

        <Link
          href="/ask"
          className="group bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-6 transition-all shadow-xs hover:shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="w-12 h-12 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-900 transition-colors flex items-center gap-1">
                Start Query &rarr;
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Ask Across Calls
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Ask custom natural-language questions across all three expert interviews with strict verbatim quote grounding and source traceability.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
