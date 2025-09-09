"use client";

import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ wordbookId: string }>;
}

export default function DictationPage({ params }: PageProps) {
  const { wordbookId } = use(params);
  return (
    <div className="p-8 space-y-4">
      <Link href={`/wordbooks/${wordbookId}/study`}>
        <Button variant="outline">&larr; 返回</Button>
      </Link>
      <div className="flex flex-col items-center justify-center h-64 border rounded-md">
        <p className="mb-4">Dictation Page - wordbook {wordbookId}</p>
        <Button disabled>開始</Button>
      </div>
    </div>
  );
}
