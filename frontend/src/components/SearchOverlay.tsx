"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, ExternalLink, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Company } from "@/lib/api";

const SCORE_COLOR = (s: number) =>
  s >= 86 ? "#ef4444" : s >= 61 ? "#f97316" : s >= 31 ? "#eab308" : "#6b7280";

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const all = await api.getCompanies({ limit: 100 });
        const q = query.toLowerCase();
        setResults(
          all.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.domain.toLowerCase().includes(q) ||
              (c.industry ?? "").toLowerCase().includes(q) ||
              (c.headquarters_country ?? "").toLowerCase().includes(q) ||
              (c.detected_current_crm ?? "").toLowerCase().includes(q)
          )
        );
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#18181f", border: "1px solid #2a2a35" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "#2a2a35" }}>
          {loading
            ? <Loader2 className="w-4 h-4 text-gray-500 animate-spin flex-shrink-0" />
            : <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies, industries, CRM..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
          />
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {error && (
            <p className="text-center text-xs text-red-400 py-6">
              Could not reach backend. Make sure the server is running.
            </p>
          )}

          {!error && query && results.length === 0 && !loading && (
            <p className="text-center text-xs text-gray-600 py-6">
              No companies found matching "{query}"
            </p>
          )}

          {!query && (
            <p className="text-center text-xs text-gray-600 py-6">
              Type to search tracked companies
            </p>
          )}

          {results.map((c) => (
            <div key={c.id}
              className="flex items-center gap-3 px-4 py-3 border-b hover:bg-white/5 transition cursor-pointer"
              style={{ borderColor: "#1e1e28" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: "#2a2a35", color: "#aaa" }}>
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{c.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {[c.industry, c.headquarters_country, c.detected_current_crm ? `CRM: ${c.detected_current_crm}` : null]
                    .filter(Boolean).join(" · ")}
                </p>
              </div>
              {c.current_score !== null && (
                <span className="text-sm font-bold flex-shrink-0"
                  style={{ color: SCORE_COLOR(c.current_score) }}>
                  {c.current_score}
                </span>
              )}
              <a href={`https://${c.domain}`} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-gray-600 hover:text-gray-400 transition flex-shrink-0">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>

        <div className="px-4 py-2 flex items-center gap-3 text-xs text-gray-700">
          <span><kbd className="bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">ESC</kbd> close</span>
          <span><kbd className="bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">↵</kbd> open</span>
        </div>
      </div>
    </div>
  );
}
