"use client";

import { useState } from "react";

interface OutputCardProps {
  label: string;
  text: string;
  multiline?: boolean;
}

export default function OutputCard({ label, text, multiline = false }: OutputCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {label}
        </span>
        <button
          onClick={handleCopy}
          aria-label={`${label}をコピー`}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            copied
              ? "border-green-300 bg-green-50 text-green-700"
              : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700"
          }`}
        >
          {copied ? "コピー済み ✓" : "コピー"}
        </button>
      </div>
      {multiline ? (
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{text}</p>
      ) : (
        <p className="text-sm text-gray-800 break-all">{text}</p>
      )}
    </div>
  );
}
