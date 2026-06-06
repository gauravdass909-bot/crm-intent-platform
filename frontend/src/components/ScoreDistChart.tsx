"use client";

import type { Stats } from "@/lib/api";

const STAGE_ORDER = ["Decision-Ready", "Evaluation", "Research", "Awareness"];
const STAGE_SHORT: Record<string, string> = {
  "Decision-Ready": "Decision",
  "Evaluation": "Eval",
  "Research": "Research",
  "Awareness": "Awareness",
};
const STAGE_COLOR: Record<string, string> = {
  "Decision-Ready": "#ef4444",
  "Evaluation":     "#f97316",
  "Research":       "#eab308",
  "Awareness":      "#6b7280",
};

export default function ScoreDistChart({ stats }: { stats: Stats | null }) {
  const dist = stats?.buying_stage_distribution ?? {};
  const max = Math.max(...Object.values(dist), 1);
  const total = Object.values(dist).reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-3xl p-5 flex flex-col h-full" style={{ background: "#17171d" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">Intent Distribution</h2>
        <span className="text-xs px-3 py-1 rounded-full" style={{ background: "#222228", color: "#aaa" }}>
          {total} companies
        </span>
      </div>

      {total === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
          Run discovery to see data
        </div>
      ) : (
        <div className="flex items-end justify-around flex-1 gap-3 pb-2">
          {STAGE_ORDER.map((stage) => {
            const count = dist[stage] ?? 0;
            const pct = max > 0 ? (count / max) * 100 : 0;
            const isTop = count === max && count > 0;
            return (
              <div key={stage} className="flex flex-col items-center gap-2 flex-1">
                <span className="text-xs font-medium" style={{ color: isTop ? "#fff" : "#666" }}>
                  {count > 0 ? `${count}h` : ""}
                </span>
                <div className="w-full rounded-t-xl transition-all relative overflow-hidden"
                  style={{
                    height: `${Math.max(pct, 8)}%`,
                    minHeight: count > 0 ? "24px" : "8px",
                    maxHeight: "120px",
                    background: isTop ? STAGE_COLOR[stage] : "#2a2a35",
                  }}>
                  {isTop && (
                    <div className="absolute inset-0 opacity-30"
                      style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)" }} />
                  )}
                </div>
                <span className="text-xs text-center" style={{ color: isTop ? "#aaa" : "#555" }}>
                  {STAGE_SHORT[stage]}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: "#222" }}>
        <span className="text-xs" style={{ color: "#555" }}>Avg score</span>
        <span className="text-sm font-bold" style={{ color: "#f97316" }}>
          {stats?.average_intent_score?.toFixed(1) ?? "—"}
          <span className="text-xs font-normal text-gray-600 ml-1">/ 100</span>
        </span>
      </div>
    </div>
  );
}
