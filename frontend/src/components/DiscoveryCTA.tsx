"use client";

import { useState } from "react";
import { Sparkles, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function DiscoveryCTA({
  running,
  lastRunAt,
  onRunStarted,
}: {
  running: boolean;
  lastRunAt: string | null;
  onRunStarted?: () => void;
}) {
  const [localRunning, setLocalRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRunning = running || localRunning;

  async function handleClick() {
    if (isRunning) return;
    setError(null);
    setLocalRunning(true);
    try {
      await api.triggerBatch();
      onRunStarted?.();
    } catch (e) {
      setError("Could not reach the backend. Make sure the server is running on port 8000.");
      setLocalRunning(false);
    }
  }

  return (
    <div className="rounded-3xl p-5 flex flex-col justify-between h-full overflow-hidden relative"
      style={{ background: "linear-gradient(145deg, #c8f5a0 0%, #e8f9d4 60%, #f0fdf4 100%)", minHeight: "180px" }}>

      <div className="absolute bottom-0 right-0 w-32 h-32 opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #4ade80 0%, transparent 70%)", transform: "translate(20%, 20%)" }} />
      <div className="absolute bottom-4 right-4 text-6xl opacity-10 select-none pointer-events-none">🌐</div>

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-4 h-4" style={{ color: "#16a34a" }} />
          <span className="text-sm font-semibold" style={{ color: "#166534" }}>Run Discovery</span>
        </div>

        {error ? (
          <div className="flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#dc2626" }} />
            <p className="text-xs leading-snug" style={{ color: "#dc2626" }}>{error}</p>
          </div>
        ) : (
          <p className="text-sm leading-snug" style={{ color: "#15803d" }}>
            {isRunning
              ? "Scanning the web for CRM buying signals..."
              : lastRunAt
              ? `Last scan: ${new Date(lastRunAt).toLocaleDateString()}. Start a new batch.`
              : "Start your first batch to discover high-intent enterprise accounts."}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={handleClick}
          disabled={isRunning}
          className="px-5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{
            background: isRunning ? "#86efac" : error ? "#fee2e2" : "#111",
            color: isRunning ? "#166534" : error ? "#dc2626" : "#fff",
            cursor: isRunning ? "not-allowed" : "pointer",
          }}>
          {isRunning ? "Running..." : error ? "Retry" : "Start Now"}
        </button>
        <div className="flex gap-1">
          <button className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.6)" }}>
            <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <button className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.6)" }}>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
