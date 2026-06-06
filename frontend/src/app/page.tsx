"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Search } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PipelineCards from "@/components/PipelineCards";
import ScoreDistChart from "@/components/ScoreDistChart";
import Leaderboard from "@/components/Leaderboard";
import DiscoveryCTA from "@/components/DiscoveryCTA";
import TrendChart from "@/components/TrendChart";
import SearchOverlay from "@/components/SearchOverlay";
import CompanyLookupModal from "@/components/CompanyLookupModal";
import CompaniesView from "@/components/views/CompaniesView";
import MarketView from "@/components/views/MarketView";
import HistoryView from "@/components/views/HistoryView";
import ScheduleView from "@/components/views/ScheduleView";
import { api } from "@/lib/api";
import type { Stats, BatchStatus } from "@/lib/api";

export default function Dashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);

  const loadStats = useCallback(async () => {
    try { setStats(await api.getStats()); } catch { /* backend offline */ }
  }, []);

  // Poll batch status every 5s
  useEffect(() => {
    loadStats();
    const interval = setInterval(async () => {
      const status = await api.getBatchStatus().catch(() => null);
      if (!status) return;
      setBatchStatus(status);
      const nowRunning = status.status === "running";
      if (running && !nowRunning) { setRefreshKey((k) => k + 1); await loadStats(); }
      setRunning(nowRunning);
    }, 5000);
    return () => clearInterval(interval);
  }, [running, loadStats]);

  // Global keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const completedPct = stats
    ? Math.round(
        (((stats.buying_stage_distribution["Decision-Ready"] ?? 0) +
          (stats.buying_stage_distribution["Evaluation"] ?? 0)) /
          Math.max(stats.total_companies_tracked, 1)) * 100
      )
    : 0;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#111114" }}>
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      {lookupOpen && <CompanyLookupModal onClose={() => setLookupOpen(false)} />}

      <Sidebar active={activeNav} onChange={setActiveNav} />

      <div className="flex-1 flex flex-col ml-[68px] overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-7 py-4 flex-shrink-0">
          <div />
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            {stats && stats.total_companies_tracked > 0 ? (
              <>
                <span style={{ color: "#a3ff6e", fontSize: "1.1rem" }}>{completedPct}%</span>
                <span className="text-gray-400 font-normal">of accounts in active buying stage</span>
              </>
            ) : (
              <span className="text-gray-600 font-normal text-xs">No data yet — run a discovery batch</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {running && (
              <span className="text-xs px-3 py-1 rounded-full font-medium animate-pulse"
                style={{ background: "#1a2a1a", color: "#a3ff6e" }}>
                Scanning...
              </span>
            )}
            <button className="relative w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "#1e1e24" }}>
              <Bell className="w-4 h-4 text-gray-400" />
              {running && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-green-400" />}
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              title="Search (Ctrl+K)"
              className="w-9 h-9 rounded-xl flex items-center justify-center transition hover:brightness-125"
              style={{ background: "#1e1e24" }}>
              <Search className="w-4 h-4 text-gray-400" />
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)", color: "white" }}>
              G
            </div>
          </div>
        </header>

        {/* View router */}
        <div className="flex-1 overflow-y-auto">
          {activeNav === "dashboard" && (
            <div className="px-7 pb-7">
              {/* Welcome + pipeline */}
              <div className="flex items-start gap-6 mb-5">
                <div className="flex-shrink-0">
                  <h1 className="text-3xl font-bold text-white leading-tight">Welcome back!</h1>
                  <p className="text-sm mt-1" style={{ color: "#666" }}>
                    Discover enterprise CRM buying intent at scale.
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <PipelineCards stats={stats} running={running} onRunStarted={() => setRunning(true)} />
                </div>
              </div>

              {/* Batch progress */}
              {running && batchStatus && (
                <div className="mb-4 px-4 py-3 rounded-2xl flex items-center gap-4"
                  style={{ background: "#1a1f2e" }}>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{batchStatus.message}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#2a2a35" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${batchStatus.progress_pct}%`, background: "#a3ff6e" }} />
                  </div>
                  <span className="text-xs font-mono" style={{ color: "#a3ff6e" }}>
                    {batchStatus.progress_pct.toFixed(0)}%
                  </span>
                </div>
              )}

              {/* Main grid */}
              <div className="grid gap-4" style={{ gridTemplateColumns: "340px 1fr", gridTemplateRows: "auto auto" }}>
                <div style={{ gridRow: "1", gridColumn: "1" }}>
                  <ScoreDistChart stats={stats} />
                </div>
                <div style={{ gridRow: "1 / 3", gridColumn: "2", minHeight: "420px" }}>
                  <div key={refreshKey} className="h-full"><Leaderboard /></div>
                </div>
                <div style={{ gridRow: "2", gridColumn: "1" }}>
                  <div className="grid grid-cols-2 gap-4" style={{ minHeight: "180px" }}>
                    <DiscoveryCTA running={running} lastRunAt={stats?.last_batch_run?.completed_at ?? null} onRunStarted={() => setRunning(true)} />
                    <TrendChart />
                  </div>
                </div>
              </div>

              {/* Stats footer */}
              {stats && stats.total_companies_tracked > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {[
                    { label: "Companies tracked", value: stats.total_companies_tracked, color: "#fff" },
                    { label: "Decision-Ready", value: stats.buying_stage_distribution["Decision-Ready"] ?? 0, color: "#ef4444" },
                    { label: "In Evaluation", value: stats.buying_stage_distribution["Evaluation"] ?? 0, color: "#f97316" },
                    { label: "Avg intent score", value: stats.average_intent_score.toFixed(1), color: "#a3ff6e" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-2xl px-4 py-3" style={{ background: "#17171d" }}>
                      <p className="text-xs mb-1" style={{ color: "#555" }}>{label}</p>
                      <p className="text-xl font-bold" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeNav === "companies" && <CompaniesView />}
          {activeNav === "market" && <MarketView />}
          {activeNav === "history" && <HistoryView />}
          {activeNav === "schedule" && <ScheduleView />}
          {/* Floating Analyze button — visible on all views */}
          <button
            onClick={() => setLookupOpen(true)}
            title="Analyze a company by URL"
            className="fixed bottom-7 right-7 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold shadow-2xl transition hover:brightness-110 z-40"
            style={{ background: "#a3ff6e", color: "#111" }}>
            <Search className="w-4 h-4" />
            Analyze Company
          </button>

          {activeNav === "settings" && (
            <div className="p-7">
              <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
              <p className="text-sm text-gray-500 mb-6">Configure your API keys and preferences in <code className="text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">backend/.env</code></p>
              <div className="rounded-2xl p-5 max-w-lg" style={{ background: "#17171d" }}>
                <pre className="text-xs text-gray-400 font-mono leading-relaxed">{`ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
DATABASE_URL=sqlite:///./intent_platform.db
BATCH_SCHEDULE_CRON=0 6 * * 1
DECAY_SCHEDULE_CRON=0 2 * * *
MAX_COMPANIES_PER_BATCH=500
MIN_SIGNALS_FOR_QUALIFICATION=2`}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
