"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { HeatmapCell } from "@/lib/api";

const scoreColor = (s: number) =>
  s >= 86 ? { bg: "#7f1d1d", text: "#fca5a5" } :
  s >= 61 ? { bg: "#7c2d12", text: "#fdba74" } :
  s >= 31 ? { bg: "#713f12", text: "#fde68a" } :
           { bg: "#1e1e28", text: "#6b7280" };

export default function MarketView() {
  const [cells, setCells] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHeatmap(60).then((d) => { setCells(d); setLoading(false); }).catch(console.error);
  }, []);

  const industries = Array.from(new Set(cells.map((c) => c.industry)));
  const geographies = Array.from(new Set(cells.map((c) => c.geography)));
  const cellMap = new Map(cells.map((c) => [`${c.industry}|${c.geography}`, c]));

  const top5 = [...cells].sort((a, b) => b.avg_intent_score - a.avg_intent_score).slice(0, 5);

  return (
    <div className="p-7">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Market Intelligence</h1>
        <p className="text-sm text-gray-500 mt-0.5">CRM buying intent by industry and geography</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-600">Loading market data...</div>
      ) : cells.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
          No market data yet. Run a discovery batch first.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {/* Heatmap */}
          <div className="col-span-2 rounded-3xl p-5" style={{ background: "#17171d" }}>
            <h2 className="text-sm font-semibold text-white mb-4">Intent Heatmap — Industry × Geography</h2>
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse w-full">
                <thead>
                  <tr>
                    <th className="text-left text-gray-600 font-normal pb-2 pr-4 w-36">Industry</th>
                    {geographies.slice(0, 8).map((g) => (
                      <th key={g} className="text-gray-500 font-normal pb-2 px-2 text-center min-w-16">{g}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {industries.slice(0, 12).map((ind) => (
                    <tr key={ind}>
                      <td className="text-gray-400 pr-4 py-1 text-right whitespace-nowrap">{ind}</td>
                      {geographies.slice(0, 8).map((geo) => {
                        const cell = cellMap.get(`${ind}|${geo}`);
                        const { bg, text } = cell ? scoreColor(cell.avg_intent_score) : { bg: "#111116", text: "" };
                        return (
                          <td key={geo} className="px-1 py-1">
                            {cell ? (
                              <div title={`${cell.avg_intent_score.toFixed(0)} avg · ${cell.company_count} companies`}
                                className="rounded-lg text-center py-1.5 font-semibold cursor-default"
                                style={{ background: bg, color: text }}>
                                {cell.avg_intent_score.toFixed(0)}
                              </div>
                            ) : (
                              <div className="rounded-lg py-1.5" style={{ background: "#111116" }} />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-4 mt-4 text-xs text-gray-600">
              <span><span className="inline-block w-2 h-2 rounded bg-red-900 mr-1" />86+ Very High</span>
              <span><span className="inline-block w-2 h-2 rounded bg-orange-900 mr-1" />61-85 High</span>
              <span><span className="inline-block w-2 h-2 rounded bg-yellow-900 mr-1" />31-60 Medium</span>
              <span><span className="inline-block w-2 h-2 rounded mr-1" style={{ background: "#1e1e28" }} />0-30 Low</span>
            </div>
          </div>

          {/* Top segments */}
          <div className="rounded-3xl p-5" style={{ background: "#17171d" }}>
            <h2 className="text-sm font-semibold text-white mb-4">Hottest Segments</h2>
            <div className="space-y-3">
              {top5.map((c, i) => {
                const { text } = scoreColor(c.avg_intent_score);
                return (
                  <div key={`${c.industry}|${c.geography}`} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{c.industry}</p>
                      <p className="text-xs text-gray-600">{c.geography} · {c.company_count} cos</p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: text }}>
                      {c.avg_intent_score.toFixed(0)}
                    </span>
                  </div>
                );
              })}
              {top5.length === 0 && <p className="text-xs text-gray-600">No data yet</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
