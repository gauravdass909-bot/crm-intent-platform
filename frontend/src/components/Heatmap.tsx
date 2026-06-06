"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { HeatmapCell } from "@/lib/api";

function scoreColor(score: number): string {
  if (score >= 86) return "bg-red-600";
  if (score >= 61) return "bg-orange-500";
  if (score >= 31) return "bg-yellow-500";
  return "bg-gray-700";
}

function scoreTextColor(score: number): string {
  if (score >= 31) return "text-white";
  return "text-gray-400";
}

export default function Heatmap() {
  const [cells, setCells] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  useEffect(() => {
    api.getHeatmap(30).then((data) => {
      setCells(data);
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading market heatmap...</div>;
  }

  if (cells.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No market trend data yet. Run a batch discovery to generate the heatmap.
      </div>
    );
  }

  const industries = Array.from(new Set(cells.map((c) => c.industry))).slice(0, 12);
  const geographies = Array.from(new Set(cells.map((c) => c.geography))).slice(0, 10);

  const cellMap = new Map(cells.map((c) => [`${c.industry}|${c.geography}`, c]));

  return (
    <div className="relative">
      {hoveredCell && (
        <div className="absolute top-0 right-0 bg-gray-800 border border-gray-700 rounded-lg p-3 z-10 text-sm shadow-xl min-w-48">
          <p className="font-semibold text-white">{hoveredCell.industry}</p>
          <p className="text-gray-400">{hoveredCell.geography}</p>
          <p className="text-white mt-1">Avg score: <span className="font-bold">{hoveredCell.avg_intent_score.toFixed(1)}</span></p>
          <p className="text-gray-300">Companies: {hoveredCell.company_count}</p>
          <p className="text-orange-400">High intent: {hoveredCell.high_intent_count}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left text-gray-500 font-normal w-36">Industry \ Geo</th>
              {geographies.map((geo) => (
                <th key={geo} className="p-2 text-gray-400 font-normal min-w-20 text-center">{geo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {industries.map((industry) => (
              <tr key={industry}>
                <td className="p-2 text-gray-400 text-right pr-3 whitespace-nowrap">{industry}</td>
                {geographies.map((geo) => {
                  const cell = cellMap.get(`${industry}|${geo}`);
                  return (
                    <td
                      key={geo}
                      className={`p-1 cursor-pointer transition-opacity hover:opacity-80`}
                      onMouseEnter={() => cell && setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {cell ? (
                        <div className={`${scoreColor(cell.avg_intent_score)} ${scoreTextColor(cell.avg_intent_score)} rounded text-center py-2 font-semibold`}>
                          {cell.avg_intent_score.toFixed(0)}
                        </div>
                      ) : (
                        <div className="bg-gray-900 rounded py-2" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-600" /> 86-100 Very High</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-orange-500" /> 61-85 High</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-500" /> 31-60 Medium</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-700" /> 0-30 Low</div>
      </div>
    </div>
  );
}
