import React from "react";

// Circular gauge for officer accountability rating — the visual anchor
// of the officer dashboard and the admin leaderboard.
export default function RatingGauge({ value, size = 88 }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 70 ? "#1F7A5C" : pct >= 50 ? "#E2933D" : "#C1432E";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#EAE6DC" strokeWidth="8" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="absolute font-display font-bold text-lg" style={{ color }}>{Math.round(pct)}</span>
    </div>
  );
}
