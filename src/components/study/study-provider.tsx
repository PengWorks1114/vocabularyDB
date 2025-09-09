"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { Word } from "@/lib/firestore-service";

interface StudyContextType {
  words: Word[];
  setWords: (w: Word[]) => void;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [words, setWords] = useState<Word[]>([]);
  return (
    <StudyContext.Provider value={{ words, setWords }}>
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) {
    throw new Error("useStudy must be used within a StudyProvider");
  }
  return ctx;
}

