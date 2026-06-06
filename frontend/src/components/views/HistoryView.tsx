"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface BatchRun {
  id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  companies_discovered: number;
  companies_scored: number;
  signals_collected: number;
  claude_tokens_used: number;
  created_at: string;
}

const STATUS_ICON = {
  completed: <CheckCircle className="w-4 h-4" style={{ color: "#a3ff6e" }} />,
  failed: <XCircle className="w-4 h-4 text-red-500" />,
  running: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
  pending: <Clock className="w-4 h-4 text-gray-500" />,
};

export default function HistoryView() {
  const [runs, setRuns] = useState<BatchRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBatchHistory()
      .then((data) => { setRuns(data as BatchRun[]); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function duration(run: BatchRun) {
    if (!run.started_at || !run.completed_at) return "—";
    const ms = new Date(run.completed_at).getTime() - new Date(run.started_at).getTime();
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
  }

  return (
    <div className="p-7">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Batch History</h1>
        <p className="text-sm text-gray-500 mt-0.5">All discovery runs</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-600">Loading history...</div>
      ) : runs.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
          No runs yet. Click "Start Now" to run your first discovery batch.
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <div key={run.id} className="rounded-2xl px-5 py-4 flex items-center gap-5"
              style={{ background: "#17171d" }}>
              <div className="flex-shrink-0">
                {STATUS_ICON[run.status as keyof typeof STATUS_ICON] ?? STATUS_ICON.pending}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {run.status === "completed" ? "Discovery complete" :
                   run.status === "running" ? "Running..." :
                   run.status === "failed" ? "Failed" : "Pending"}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {run.created_at ? new Date(run.created_at).toLocaleString() : "—"}
                </p>
              </div>
              <div className="grid grid-cols-4 gap-6 text-center flex-shrink-0">
                {[
                  { label: "Discovered", value: run.companies_discovered },
                  { label: "Scored", value: run.companies_scored },
                  { label: "Signals", value: run.signals_collected },
                  { label: "Duration", value: duration(run) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-sm font-bold text-white">{value}</p>
                    <p className="text-xs text-gray-600">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
