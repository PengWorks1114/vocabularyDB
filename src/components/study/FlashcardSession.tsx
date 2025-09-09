"use client";

import { useState } from "react";
import { Word } from "@/lib/firestore-service";
import { Flashcard } from "./Flashcard";
import { Button } from "@/components/ui/button";

interface FlashcardSessionProps {
  words: Word[];
}

interface Result {
  id: string;
  mastery: number;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function FlashcardSession({ words }: FlashcardSessionProps) {
  const [order, setOrder] = useState<Word[]>(() => shuffle(words));
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);

  const current = order[index];
  const progress = (index / order.length) * 100;

  const handleAnswer = (id: string, mastery: number) => {
    setResults((prev) => [...prev, { id, mastery }]);
    setTimeout(() => setIndex((prev) => prev + 1), 800);
  };

  const repeat = () => {
    setIndex(0);
    setResults([]);
  };

  const reshuffle = () => {
    setOrder(shuffle(words));
    setIndex(0);
    setResults([]);
  };

  if (!order.length) {
    return <p className="text-center">沒有題目</p>;
  }

  return (
    <div className="space-y-4">
      <div className="w-full h-2 bg-gray-200 rounded">
        <div
          className="h-full bg-blue-500 rounded"
          style={{ width: `${progress}%` }}
        />
      </div>
      {index < order.length ? (
        <Flashcard word={current} onAnswer={handleAnswer} />
      ) : (
        <div className="text-center space-y-4">
          <p>練習結束！</p>
          <p className="text-sm text-gray-500">已回答 {results.length} 題</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={repeat}>重複</Button>
            <Button onClick={reshuffle}>重新抽題</Button>
          </div>
        </div>
      )}
    </div>
  );
}

