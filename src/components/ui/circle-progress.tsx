import React from "react";

interface CircleProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export function CircleProgress({
  value,
  size = 200,
  strokeWidth = 12,
  color = "#facc15", // tailwind yellow-400
}: CircleProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#e5e7eb" // gray-200
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="text-3xl font-bold"
      >
        {value.toFixed(1)}%
      </text>
    </svg>
  );
}

export default CircleProgress;
