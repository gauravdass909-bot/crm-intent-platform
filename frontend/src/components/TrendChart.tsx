"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { api } from "@/lib/api";
import type { TimelinePoint } from "@/lib/api";

export default function TrendChart() {
  const [data, setData] = useState<TimelinePoint[]>([]);

  useEffect(() => {
    api.getTimeline(90).then(setData).catch(console.error);
  }, []);

  const latest = data[data.length - 1];
  const peak = data.reduce((a, b) => (b.total_companies > (a?.total_companies ?? 0) ? b : a), data[0]);

  return (
    <div className="rounded-3xl p-5 flex flex-col h-full"
      style={{ background: "linear-gradient(160deg, #c4b5fd 0%, #a78bfa 40%, #8b5cf6 100%)" }}>

      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-white">Companies Tracked</h2>
        {latest && (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: "rgba(255,255,255,0.25)", color: "white" }}>
            +{latest.high_intent_companies} high-intent
          </span>
        )}
      </div>
      <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.7)" }}>90-day trend</p>

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-purple-200 text-sm opacity-70">
          Run a batch to generate trend data
        </div>
      ) : (
        <div className="flex-1 relative">
          {peak && (
            <div className="absolute top-0 z-10 flex flex-col items-center"
              style={{
                left: `${(data.indexOf(peak) / (data.length - 1)) * 100}%`,
                transform: "translateX(-50%)",
              }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg"
                style={{ background: "white", color: "#6d28d9" }}>
                {peak.total_companies}
              </div>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 36, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgba(255,255,255,0.4)" />
                  <stop offset="95%" stopColor="rgba(255,255,255,0.05)" />
                </linearGradient>
              </defs>
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "rgba(109,40,217,0.9)", border: "none", borderRadius: 8, color: "white", fontSize: 12 }}
                formatter={(v: number) => [v, "companies"]}
                labelFormatter={(l) => l}
              />
              <Area type="monotone" dataKey="total_companies"
                stroke="rgba(255,255,255,0.8)" strokeWidth={2}
                fill="url(#trendGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
