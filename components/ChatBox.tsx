"use client";

import React, { useState } from "react";

export interface ChatBoxProps {
  onSend?: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatBox({
  onSend,
  placeholder = "Ask a question about the expert interviews...",
  disabled = false,
}: ChatBoxProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    if (onSend) {
      onSend(input);
    }
    setInput("");
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex gap-2">
        <textarea
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 resize-none disabled:bg-slate-50 disabled:text-slate-400"
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="self-end px-5 py-3 rounded-lg bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          Ask
        </button>
      </div>
    </form>
  );
}
