"use client";

import { useState, useEffect } from "react";
import { Filter, ChevronRight, Pause, Play, RefreshCw, Copy } from "lucide-react";
import { api } from "@/lib/api";
import type { CompanyDetail } from "@/lib/api";

const STAGE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  "Decision-Ready": { bg: "#fef2f2", color: "#dc2626", label: "Decision-Ready" },
  "Evaluation":     { bg: "#fff7ed", color: "#ea580c", label: "In progress" },
  "Research":       { bg: "#f0fdf4", color: "#16a34a", label: "Research" },
  "Awareness":      { bg: "#f8fafc", color: "#64748b", label: "Awareness" },
};

function StagePill({ stage }: { stage: string | null }) {
  const s = STAGE_BADGE[stage ?? ""] ?? { bg: "#f1f5f9", color: "#64748b", label: stage ?? "Unknown" };
  return (
    <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function TrackingBtn({ score }: { score: number | null }) {
  const [active, setActive] = useState(score !== null && score >= 61);
  return (
    <button onClick={() => setActive(!active)}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
      style={{ background: active ? "#111" : "#f1f5f9" }}>
      {active
        ? <Pause className="w-3 h-3 text-white" fill="white" />
        : <Play className="w-3 h-3 text-gray-500" />}
    </button>
  );
}

export default function Leaderboard() {
  const [companies, setCompanies] = useState<CompanyDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getCompanies({ limit: 50, min_score: 0 });
      const detailed = await Promise.all(data.slice(0, 10).map((c) => api.getCompany(c.id)));
      setCompanies(detailed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function copyMessage(company: CompanyDetail) {
    const msg = company.outreach_messages?.find((m) => m.is_current)?.message_content;
    if (msg) {
      await navigator.clipboard.writeText(msg);
      setCopied(company.id);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  return (
    <div className="rounded-3xl flex flex-col h-full overflow-hidden" style={{ background: "#ffffff" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900">Account Signals</h2>
          <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition">
            <Filter className="w-3 h-3" /> Filter
          </button>
        </div>
        <button onClick={load} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition">
          <RefreshCw className="w-3 h-3" /> See all
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Column headers */}
      <div className="grid px-5 pb-2 text-xs text-gray-400"
        style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 40px" }}>
        <span>Company</span>
        <span>Stage</span>
        <span>Score</span>
        <span>Current CRM</span>
        <span></span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading accounts...</div>
        ) : companies.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm px-8 text-center">
            No accounts yet — click Run Discovery to find intent signals.
          </div>
        ) : (
          companies.map((company, i) => {
            const isExpanded = expanded === company.id;
            const outreach = company.outreach_messages?.find((m) => m.is_current);
            const signals = company.signals?.slice(0, 2) ?? [];
            return (
              <div key={company.id}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : company.id)}
                  className="w-full grid px-5 py-3 text-left hover:bg-gray-50 transition-colors border-t"
                  style={{
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 40px",
                    borderColor: "#f1f5f9",
                  }}>
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    {i < 3 && (
                      <span className="text-xs">
                        {i === 0 ? "🔥" : i === 1 ? "🔥" : "🔸"}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{company.name}</p>
                      <p className="text-xs text-gray-400 truncate">{company.domain}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <StagePill stage={company.current_buying_stage ?? null} />
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-bold"
                      style={{
                        color: (company.current_score ?? 0) >= 86 ? "#dc2626"
                          : (company.current_score ?? 0) >= 61 ? "#ea580c"
                          : (company.current_score ?? 0) >= 31 ? "#ca8a04"
                          : "#6b7280"
                      }}>
                      {company.current_score ?? "—"}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">/100</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 truncate">
                      {company.detected_current_crm ?? "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <TrackingBtn score={company.current_score ?? null} />
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-5 py-3 bg-gray-50 border-t" style={{ borderColor: "#f1f5f9" }}>
                    {signals.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Top signals</p>
                        {signals.map((s) => (
                          <p key={s.id} className="text-xs text-gray-600 mb-1">
                            <span className="font-medium text-gray-700">
                              {s.signal_type === "job_posting" ? "💼" : s.signal_type === "competitor_dissatisfaction" ? "🔄" : "📰"}
                            </span>{" "}
                            {s.signal_description}
                          </p>
                        ))}
                      </div>
                    )}
                    {outreach && (
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-gray-500 italic leading-relaxed line-clamp-2">{outreach.message_content}</p>
                        <button onClick={() => copyMessage(company)}
                          className="flex-shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition"
                          style={{ background: "#111", color: "#fff" }}>
                          <Copy className="w-3 h-3" />
                          {copied === company.id ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
