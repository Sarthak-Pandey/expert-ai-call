import React from "react";

export default function Header() {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-wide">
          EX
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-900 leading-none">
            Expert Call AI Analyst
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Internal Research Tool &bull; Grounded Interview Intelligence
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <span className="inline-flex items-center gap-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Grounded Analysis System
        </span>
        <span className="text-xs text-slate-500 hidden sm:inline font-medium">
          3 Expert Calls (FR, DE, UK)
        </span>
      </div>
    </header>
  );
}
