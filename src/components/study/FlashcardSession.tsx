"use client";

import { useStudy } from "./study-provider";

export function FlashcardSession() {
  const { words } = useStudy();

  if (!words.length) {
    return <div className="p-8">No words selected.</div>;
  }

  return (
    <div className="p-8 space-y-4">
      {words.map((w) => (
        <div key={w.id} className="border rounded p-4">
          <div className="font-bold">{w.word}</div>
          <div className="text-sm text-muted-foreground">{w.translation}</div>
        </div>
      ))}
    </div>
  );
}

