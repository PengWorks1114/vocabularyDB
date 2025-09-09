"use client";

import Link from "next/link";
import { use, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(ArcElement, Tooltip, Legend);

interface PageProps {
  params: Promise<{ wordbookId: string }>;
}

export default function StudyPage({ params }: PageProps) {
  const { wordbookId } = use(params);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["掌握", "未掌握"],
        datasets: [
          {
            data: [70, 30],
            backgroundColor: ["#4ade80", "#f87171"],
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div className="flex gap-4">
        <Link href={`/wordbooks/${wordbookId}/study/memorize`}>
          <Button>背單字</Button>
        </Link>
        <Link href={`/wordbooks/${wordbookId}/study/dictation`}>
          <Button>默寫單字</Button>
        </Link>
      </div>
      <div className="max-w-xs">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

