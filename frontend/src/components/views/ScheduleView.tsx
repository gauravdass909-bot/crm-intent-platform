"use client";

import { Calendar, Clock, RefreshCw } from "lucide-react";

const SCHEDULE = [
  { icon: RefreshCw, label: "Weekly Discovery Batch", cron: "0 6 * * 1", desc: "Every Monday at 6:00 AM — full signal scan across all 5 sources", color: "#a3ff6e", active: true },
  { icon: Clock, label: "Nightly Score Decay", cron: "0 2 * * *", desc: "Every night at 2:00 AM — decay scores for companies with no new signals", color: "#60a5fa", active: true },
];

export default function ScheduleView() {
  return (
    <div className="p-7">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Schedule</h1>
        <p className="text-sm text-gray-500 mt-0.5">Automated jobs running in the background</p>
      </div>

      <div className="space-y-3 max-w-2xl">
        {SCHEDULE.map(({ icon: Icon, label, cron, desc, color, active }) => (
          <div key={label} className="rounded-2xl px-5 py-4 flex items-start gap-4"
            style={{ background: "#17171d" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: color + "18" }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">{label}</p>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono"
                  style={{ background: active ? "#1a2a1a" : "#1e1e28", color: active ? "#a3ff6e" : "#555" }}>
                  {active ? "active" : "paused"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              <code className="text-xs mt-2 inline-block px-2 py-1 rounded-lg font-mono"
                style={{ background: "#111116", color: "#666" }}>
                {cron}
              </code>
            </div>
          </div>
        ))}

        <div className="rounded-2xl px-5 py-4 mt-4" style={{ background: "#17171d", border: "1px dashed #2a2a35" }}>
          <p className="text-xs text-gray-500">
            To change the schedule, edit <code className="text-gray-400 bg-black/30 px-1 rounded">backend/.env</code>:
          </p>
          <pre className="text-xs text-gray-400 mt-2 font-mono leading-relaxed"
            style={{ background: "#111116", padding: "10px 12px", borderRadius: 8 }}>
{`BATCH_SCHEDULE_CRON=0 6 * * 1   # Mon 6am
DECAY_SCHEDULE_CRON=0 2 * * *   # Daily 2am`}
          </pre>
        </div>
      </div>
    </div>
  );
}
