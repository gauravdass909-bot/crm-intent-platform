"use client";

import { useState, useEffect } from "react";
import { RefreshCw, ExternalLink, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import type { CompanyDetail } from "@/lib/api";

const SCORE_COLOR = (s: number) =>
  s >= 86 ? "#ef4444" : s >= 61 ? "#f97316" : s >= 31 ? "#eab308" : "#6b7280";

const STAGES = ["All", "Decision-Ready", "Evaluation", "Research", "Awareness"];

export default function CompaniesView() {
  const [companies, setCompanies] = useState<CompanyDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, number | string> = { limit: 100 };
      if (stage !== "All") params.buying_stage = stage;
      const data = await api.getCompanies(params as { limit: number; buying_stage?: string });
      const detailed = await Promise.all(data.slice(0, 30).map((c) => api.getCompany(c.id)));
      setCompanies(detailed);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [stage]);

  async function copyMsg(c: CompanyDetail) {
    const m = c.outreach_messages?.find((m) => m.is_current)?.message_content;
    if (m) { await navigator.clipboard.writeText(m); setCopied(c.id); setTimeout(() => setCopied(null), 2000); }
  }

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">All Companies</h1>
          <p className="text-sm text-gray-500 mt-0.5">{companies.length} accounts tracked</p>
        </div>
        <div className="flex items-center gap-2">
          {STAGES.map((s) => (
            <button key={s} onClick={() => setStage(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition"
              style={{ background: stage === s ? "#a3ff6e" : "#1e1e28", color: stage === s ? "#111" : "#888" }}>
              {s}
            </button>
          ))}
          <button onClick={load} className="ml-2 p-2 rounded-xl transition hover:bg-white/5">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-600">Loading companies...</div>
      ) : companies.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
          No companies found. Run a discovery batch first.
        </div>
      ) : (
        <div className="space-y-2">
          {companies.map((c) => {
            const isOpen = expanded === c.id;
            const outreach = c.outreach_messages?.find((m) => m.is_current);
            return (
              <div key={c.id} className="rounded-2xl overflow-hidden" style={{ background: "#17171d" }}>
                <button className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/5 transition"
                  onClick={() => setExpanded(isOpen ? null : c.id)}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: "#2a2a35", color: "#aaa" }}>
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[c.domain, c.industry, c.headquarters_country].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {c.detected_current_crm && (
                      <span className="text-xs px-2.5 py-1 rounded-lg" style={{ background: "#2a2a35", color: "#888" }}>
                        {c.detected_current_crm}
                      </span>
                    )}
                    {c.current_buying_stage && (
                      <span className="text-xs font-medium" style={{ color: "#888" }}>{c.current_buying_stage}</span>
                    )}
                    {c.current_score !== null && (
                      <span className="text-base font-bold w-10 text-right"
                        style={{ color: SCORE_COLOR(c.current_score) }}>
                        {c.current_score}
                      </span>
                    )}
                    <a href={`https://${c.domain}`} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-700 hover:text-gray-400 transition">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 border-t" style={{ borderColor: "#222" }}>
                    {c.signals?.length > 0 && (
                      <div className="mt-3 mb-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">Signals detected</p>
                        <div className="grid grid-cols-2 gap-2">
                          {c.signals.slice(0, 4).map((s) => (
                            <div key={s.id} className="text-xs p-2.5 rounded-xl" style={{ background: "#1e1e28" }}>
                              <span className="mr-1">
                                {s.signal_type === "job_posting" ? "💼" : s.signal_type === "competitor_dissatisfaction" ? "🔄" : s.signal_type === "news" ? "📰" : "🔍"}
                              </span>
                              <span className="text-gray-300">{s.signal_description.slice(0, 80)}...</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {outreach && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-medium text-gray-500">Outreach message</p>
                          <button onClick={() => copyMsg(c)}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition"
                            style={{ background: "#2a2a35", color: copied === c.id ? "#a3ff6e" : "#888" }}>
                            <Copy className="w-3 h-3" />
                            {copied === c.id ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{outreach.message_content}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
