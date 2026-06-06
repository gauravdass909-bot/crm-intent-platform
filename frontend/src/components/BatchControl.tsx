"use client";

import { useState, useEffect } from "react";
import { Play, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { BatchStatus, Stats } from "@/lib/api";

interface Props {
  onBatchComplete?: () => void;
}

export default function BatchControl({ onBatchComplete }: Props) {
  const [status, setStatus] = useState<BatchStatus | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [triggering, setTriggering] = useState(false);

  async function loadStats() {
    try {
      const [s, st] = await Promise.all([api.getBatchStatus(), api.getStats()]);
      setStatus(s);
      setStats(st);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadStats();
    const interval = setInterval(async () => {
      const s = await api.getBatchStatus().catch(() => null);
      if (s) setStatus(s);
      if (s?.status === "idle" && status?.status === "running") {
        await loadStats();
        onBatchComplete?.();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [status?.status]);

  async function handleTrigger() {
    setTriggering(true);
    try {
      await api.triggerBatch();
      await loadStats();
    } catch (e) {
      console.error(e);
    } finally {
      setTriggering(false);
    }
  }

  const isRunning = status?.status === "running";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-white">Batch Discovery</h3>
          {stats && (
            <p className="text-sm text-gray-400 mt-0.5">
              {stats.total_companies_tracked} companies tracked · avg score {stats.average_intent_score}
            </p>
          )}
          {stats?.last_batch_run?.completed_at && (
            <p className="text-xs text-gray-500 mt-0.5">
              Last run: {new Date(stats.last_batch_run.completed_at).toLocaleString()} ·{" "}
              {stats.last_batch_run.companies_scored} scored
            </p>
          )}
        </div>

        <button
          onClick={handleTrigger}
          disabled={isRunning || triggering}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
            isRunning ? "bg-gray-700 text-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
        >
          <Play className="w-4 h-4" />
          {isRunning ? "Running..." : "Run Discovery Now"}
        </button>
      </div>

      {isRunning && status && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {status.message}</span>
            <span>{status.progress_pct.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${status.progress_pct}%` }}
            />
          </div>
        </div>
      )}

      {stats && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {Object.entries(stats.buying_stage_distribution).map(([stage, count]) => (
            <div key={stage} className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-white">{count}</div>
              <div className="text-xs text-gray-400">{stage}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
