"use client";

interface Props {
  score: number;
  size?: "sm" | "md" | "lg";
}

const TIER_COLORS: Record<string, string> = {
  "Very High": "bg-red-500 text-white",
  High: "bg-orange-500 text-white",
  Medium: "bg-yellow-400 text-gray-900",
  Low: "bg-gray-500 text-gray-100",
};

function getTier(score: number): string {
  if (score >= 86) return "Very High";
  if (score >= 61) return "High";
  if (score >= 31) return "Medium";
  return "Low";
}

export default function ScoreBadge({ score, size = "md" }: Props) {
  const tier = getTier(score);
  const color = TIER_COLORS[tier];
  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : size === "lg" ? "text-xl px-4 py-2 font-bold" : "text-sm px-2 py-1";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${color} ${sizeClass}`}>
      {score}
      <span className="opacity-75 text-xs">{tier}</span>
    </span>
  );
}
