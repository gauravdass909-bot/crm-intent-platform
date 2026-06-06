"use client";

import { useState } from "react";
import { Plus, ChevronRight, Search, Brain, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import type { Stats } from "@/lib/api";

const STAGES = [
  { icon: Search, label: "Gemini Discovery", sub: "Google Search grounding", color: "#4285F4", bg: "#1a2540" },
  { icon: Brain, label: "Claude Reasoning", sub: "Intent scoring (0–100)", color: "#d97706", bg: "#2a1f10" },
  { icon: ShieldCheck, label: "Score Validation", sub: "Confidence + buying stage", color: "#10b981", bg: "#0f2420" },
];

export default function PipelineCards({
  stats,
  running,
  onRunStarted,
}: {
  stats: Stats | null;
  running: boolean;
  onRunStarted?: () => void;
}) {
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState(false);

  const isRunning = running || localLoading;

  async function handleRun() {
    if (isRunning) return;
    setError(false);
    setLocalLoading(true);
    try {
      await api.triggerBatch();
      onRunStarted?.();
    } catch {
      setError(true);
      setLocalLoading(false);
    }
  }

  return (
    <div className="flex items-stretch gap-3">
      <button
        onClick={handleRun}
        disabled={isRunning}
        title={error ? "Backend not reachable — check server" : "Run discovery batch"}
        className="flex-shrink-0 w-12 min-h-[72px] rounded-2xl flex items-center justify-center transition-all active:scale-95"
        style={{
          background: error ? "#2a1010" : isRunning ? "#1a1a22" : "#1e1e28",
          border: `1.5px dashed ${error ? "#7f1d1d" : "#333"}`,
        }}>
        <Plus className={`w-5 h-5 transition-all ${isRunning ? "text-gray-600 animate-spin" : error ? "text-red-700" : "text-gray-400"}`} />
      </button>

      {STAGES.map(({ icon: Icon, label, sub, color, bg }) => (
        <div key={label}
          className="flex-1 flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer group transition-all hover:brightness-110"
          style={{ background: bg, minWidth: 0 }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: color + "22" }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {label}<span className="ml-1.5 text-xs" style={{ color }}>✦</span>
              </p>
              <p className="text-xs truncate" style={{ color: "#888" }}>{sub}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0 group-hover:text-gray-400 transition-colors" />
        </div>
      ))}
    </div>
  );
}
