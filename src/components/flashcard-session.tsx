"use client";

import { useState } from "react";
import { updateWordMastery, type Word } from "@/lib/firestore-service";
import { Button } from "@/components/ui/button";

interface FlashcardSessionProps {
  userId: string;
  wordbookId: string;
  words: Word[];
  onComplete?: () => void;
}

export function FlashcardSession({
  userId,
  wordbookId,
  words,
  onComplete,
}: FlashcardSessionProps) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<string, number>>({});

  const handleAnswer = (wordId: string, mastery: number) => {
    setResults((prev) => ({ ...prev, [wordId]: mastery }));
    if (index + 1 < words.length) {
      setIndex(index + 1);
    } else {
      finishSession({ ...results, [wordId]: mastery });
    }
  };

  const finishSession = async (finalResults: Record<string, number>) => {
    await Promise.all(
      Object.entries(finalResults).map(([id, m]) =>
        updateWordMastery(userId, wordbookId, id, m)
      )
    );
    onComplete?.();
  };

  if (!words.length) {
    return <p>No words to review.</p>;
  }

  const current = words[index];

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold">{current.word}</div>
      <div className="flex gap-2">
        <Button
          onClick={() =>
            handleAnswer(current.id, Math.min(100, (current.mastery || 0) + 10))
          }
        >
          I knew this
        </Button>
        <Button onClick={() => handleAnswer(current.id, current.mastery || 0)}>
          I forgot
        </Button>
      </div>
    </div>
  );
}
