"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, RefreshCw, Copy } from "lucide-react";
import ScoreBadge from "./ScoreBadge";
import type { CompanyDetail } from "@/lib/api";
import { api } from "@/lib/api";

interface Props {
  company: CompanyDetail;
  onRefresh?: () => void;
}

const SIGNAL_ICONS: Record<string, string> = {
  job_posting: "💼",
  competitor_dissatisfaction: "🔄",
  news: "📰",
  review_site: "⭐",
  web_discussion: "💬",
};

export default function CompanyCard({ company, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const currentMessage = company.outreach_messages?.find((m) => m.is_current);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await api.refreshCompany(company.id);
      onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCopyMessage() {
    if (currentMessage) {
      await navigator.clipboard.writeText(currentMessage.message_content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold text-lg text-white truncate">{company.name}</h3>
            {company.current_score !== null && <ScoreBadge score={company.current_score} />}
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-400 flex-wrap">
            <a href={`https://${company.domain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-400">
              {company.domain} <ExternalLink className="w-3 h-3" />
            </a>
            {company.industry && <span>{company.industry}</span>}
            {company.headquarters_country && <span>{company.headquarters_country}</span>}
            {company.employee_count_estimate && (
              <span>{company.employee_count_estimate.toLocaleString()} employees</span>
            )}
            {company.detected_current_crm && (
              <span className="text-orange-400">Currently: {company.detected_current_crm}</span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            {company.current_buying_stage && (
              <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-300">
                {company.current_buying_stage}
              </span>
            )}
            {company.current_confidence && (
              <span className="text-xs text-gray-500">{company.current_confidence} confidence</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            title="Refresh analysis"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          {company.signals && company.signals.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Detected Signals</h4>
              <div className="space-y-2">
                {company.signals.map((sig) => (
                  <div key={sig.id} className="flex gap-2 text-sm">
                    <span className="shrink-0">{SIGNAL_ICONS[sig.signal_type] || "📌"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300">{sig.signal_description}</p>
                      {sig.source_url && (
                        <a href={sig.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-0.5">
                          {sig.source_name || "Source"} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {sig.signal_weight && (
                      <span className="shrink-0 text-xs text-gray-500">+{sig.signal_weight}pts</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentMessage && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-300">Outreach Message</h4>
                <button
                  onClick={handleCopyMessage}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition"
                >
                  <Copy className="w-3 h-3" />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="bg-gray-950 rounded-lg p-3 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {currentMessage.message_content}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
