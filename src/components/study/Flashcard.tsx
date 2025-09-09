"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Word } from "@/lib/firestore-service";
import { computeNextMastery, MasteryResponse } from "@/lib/compute-next-mastery";

interface FlashcardProps {
  word: Word;
  onAnswer: (id: string, mastery: number) => void;
}

export function Flashcard({ word, onAnswer }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    setFlipped(false);
    setAnswered(false);
  }, [word.id]);

  const handleClick = (response: MasteryResponse) => {
    if (answered) return;
    const newScore = computeNextMastery(word.mastery || 0, response);
    onAnswer(word.id, newScore);
    setFlipped(true);
    setAnswered(true);
  };

  return (
    <div className="border p-6 rounded-lg text-center">
      <div className="min-h-[120px] flex items-center justify-center mb-4">
        {flipped ? (
          <span className="text-2xl">{word.translation}</span>
        ) : (
          <span className="text-4xl font-bold">{word.word}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => handleClick("unknown")} disabled={answered}>
          陌生
        </Button>
        <Button onClick={() => handleClick("impression")} disabled={answered}>
          有印象
        </Button>
        <Button onClick={() => handleClick("familiar")} disabled={answered}>
          熟悉
        </Button>
        <Button onClick={() => handleClick("memorized")} disabled={answered}>
          牢記
        </Button>
      </div>
    </div>
  );
}

