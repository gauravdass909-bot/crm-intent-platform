"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Loader2, Copy, CheckCircle, ExternalLink, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { AnalyzeResult } from "@/lib/api";

const SCORE_COLOR = (s: number) =>
  s >= 86 ? "#ef4444" : s >= 61 ? "#f97316" : s >= 31 ? "#eab308" : "#6b7280";

const STAGE_BG: Record<string, string> = {
  "Decision-Ready": "#450a0a",
  Evaluation: "#431407",
  Research: "#422006",
  Awareness: "#1c1c24",
};

const SIGNAL_ICON: Record<string, string> = {
  job_posting: "💼",
  competitor_dissatisfaction: "🔄",
  news: "📰",
  review_site: "⭐",
  web_discussion: "💬",
};

const STAGES = [
  { label: "Researching company...", pct: 20 },
  { label: "Analyzing CRM signals...", pct: 50 },
  { label: "Scoring intent...", pct: 75 },
  { label: "Validating result...", pct: 92 },
];

interface Props {
  onClose: () => void;
}

export default function CompanyLookupModal({ onClose }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); if (timerRef.current) clearInterval(timerRef.current); };
  }, [onClose]);

  async function handleAnalyze() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setStageIdx(0);

    // Cycle through loading stages while waiting
    let idx = 0;
    timerRef.current = setInterval(() => {
      idx = Math.min(idx + 1, STAGES.length - 1);
      setStageIdx(idx);
    }, 5000);

    try {
      const data = await api.analyzeUrl(trimmed);
      setResult(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes("502") ? "Analysis failed — check that the backend is running and API keys are valid." : msg);
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result?.outreach_message) return;
    await navigator.clipboard.writeText(result.outreach_message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const progress = loading ? STAGES[stageIdx].pct : result ? 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{ background: "#17171d", maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#222" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "#a3ff6e22" }}>
              <Search className="w-4 h-4" style={{ color: "#a3ff6e" }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Analyze Company</h2>
              <p className="text-xs" style={{ color: "#555" }}>Paste any company URL to score its CRM buying intent</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* URL input */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleAnalyze(); }}
              placeholder="e.g. salesforce.com or https://www.oracle.com"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white outline-none disabled:opacity-50"
              style={{ background: "#111116", border: "1px solid #2a2a35" }}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !url.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40"
              style={{ background: "#a3ff6e", color: "#111" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
            </button>
          </div>

          {/* Progress bar */}
          {(loading || result) && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: "#555" }}>
                  {loading ? STAGES[stageIdx].label : "Analysis complete"}
                </span>
                <span className="text-xs font-mono" style={{ color: "#a3ff6e" }}>{progress}%</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "#2a2a35" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: loading ? "#a3ff6e" : "#22c55e" }} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: "#2a0a0a", border: "1px solid #5a1010" }}>
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">

            {/* Score card */}
            <div className="rounded-2xl p-5 flex items-center gap-6"
              style={{ background: STAGE_BG[result.buying_stage] ?? "#1c1c24" }}>
              <div className="flex-shrink-0 text-center">
                <div className="text-5xl font-bold leading-none" style={{ color: SCORE_COLOR(result.validated_score) }}>
                  {result.validated_score}
                </div>
                <div className="text-xs mt-1" style={{ color: "#555" }}>/ 100</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-white truncate">{result.company_name}</h3>
                  <a href={`https://${result.company_domain}`} target="_blank" rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-400 flex-shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full font-semibold"
                    style={{ background: SCORE_COLOR(result.validated_score) + "30", color: SCORE_COLOR(result.validated_score) }}>
                    {result.buying_stage}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full" style={{ background: "#2a2a35", color: "#888" }}>
                    {result.confidence_level} confidence
                  </span>
                  {result.detected_current_crm && (
                    <span className="px-2.5 py-0.5 rounded-full" style={{ background: "#2a2a35", color: "#888" }}>
                      Currently: {result.detected_current_crm}
                    </span>
                  )}
                  {result.industry && (
                    <span className="px-2.5 py-0.5 rounded-full" style={{ background: "#2a2a35", color: "#888" }}>
                      {result.industry}
                    </span>
                  )}
                  {result.headquarters_country && (
                    <span className="px-2.5 py-0.5 rounded-full" style={{ background: "#2a2a35", color: "#888" }}>
                      {result.headquarters_country}
                    </span>
                  )}
                </div>
                {result.intent_summary && (
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: "#888" }}>
                    {result.intent_summary}
                  </p>
                )}
              </div>
            </div>

            {/* Signals */}
            {result.signals.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                  Intent Signals ({result.signals.length})
                </p>
                <div className="space-y-2">
                  {result.signals.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl"
                      style={{ background: "#111116" }}>
                      <span className="text-base flex-shrink-0 mt-0.5">
                        {SIGNAL_ICON[s.signal_type] ?? "🔍"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 leading-relaxed">{s.signal_description}</p>
                        {s.source_url && (
                          <a href={s.source_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs mt-1 inline-block truncate max-w-full hover:underline"
                            style={{ color: "#555" }}>
                            {s.source_name ?? s.source_url}
                          </a>
                        )}
                      </div>
                      {s.signal_weight && (
                        <span className="text-xs font-bold flex-shrink-0" style={{ color: "#a3ff6e" }}>
                          +{s.signal_weight}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pain points */}
            {result.pain_points.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Pain Points</p>
                <div className="flex flex-wrap gap-2">
                  {result.pain_points.map((p, i) => (
                    <span key={i} className="text-xs px-3 py-1 rounded-full"
                      style={{ background: "#1e1e28", color: "#aaa" }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Outreach message */}
            {result.outreach_message && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outreach Message</p>
                  <button onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg transition"
                    style={{ background: "#2a2a35", color: copied ? "#a3ff6e" : "#888" }}>
                    {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="px-4 py-3 rounded-xl text-xs leading-relaxed"
                  style={{ background: "#111116", color: "#bbb", whiteSpace: "pre-wrap" }}>
                  {result.outreach_message}
                </div>
              </div>
            )}

            {result.saved_company_id && (
              <p className="text-xs text-center" style={{ color: "#3a3a4a" }}>
                Saved to database · ID {result.saved_company_id.slice(0, 8)}
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && !result && !error && (
          <div className="px-6 pb-8 text-center">
            <p className="text-xs" style={{ color: "#3a3a45" }}>
              Enter any company URL above and press Analyze or Enter
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
