"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

interface ProgressCircleProps {
  /** progress value between 0 and 1 */
  progress: number;
}

export default function ProgressCircle({ progress }: ProgressCircleProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const chart = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: [progress, 1 - progress],
            backgroundColor: ["#3b82f6", "#e5e7eb"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        cutout: "80%",
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
      },
    });

    return () => chart.destroy();
  }, [progress]);

  return (
    <div className="relative h-32 w-32">
      <canvas ref={canvasRef} />
      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">
        {Math.round(progress * 100)}%
      </span>
    </div>
  );
}

