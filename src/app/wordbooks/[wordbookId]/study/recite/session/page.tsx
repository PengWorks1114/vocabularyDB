"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { signOut } from "firebase/auth";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useAuth } from "@/components/auth-provider";
import {
  getWordsByWordbookId,
  updateWord,
  Word,
} from "@/lib/firestore-service";
import "@/i18n/i18n-client";

interface PageProps {
  params: Promise<{ wordbookId: string }>;
}

type Mode =
  | "random"
  | "masteryLow"
  | "masteryHigh"
  | "freqLow"
  | "freqHigh"
  | "recent"
  | "old"
  | "onlyUnknown"
  | "onlyImpression"
  | "onlyFamiliar"
  | "onlyMemorized"
  | "onlyFavorite";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function drawWords(all: Word[], count: number, mode: Mode): Word[] {
  let words = [...all];
  switch (mode) {
    case "onlyUnknown":
      words = words.filter((w) => w.mastery < 25);
      break;
    case "onlyImpression":
      words = words.filter((w) => w.mastery >= 25 && w.mastery < 50);
      break;
    case "onlyFamiliar":
      words = words.filter((w) => w.mastery >= 50 && w.mastery < 75);
      break;
    case "onlyMemorized":
      words = words.filter((w) => w.mastery >= 75);
      break;
    case "onlyFavorite":
      words = words.filter((w) => w.favorite);
      break;
  }

  switch (mode) {
    case "masteryLow":
      words.sort((a, b) => a.mastery - b.mastery);
      break;
    case "masteryHigh":
      words.sort((a, b) => b.mastery - a.mastery);
      break;
    case "freqLow":
      words.sort((a, b) => a.usageFrequency - b.usageFrequency);
      break;
    case "freqHigh":
      words.sort((a, b) => b.usageFrequency - a.usageFrequency);
      break;
    case "recent":
      words.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      break;
    case "old":
      words.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
      break;
    default:
      words = shuffle(words);
  }

  if (
    mode === "onlyUnknown" ||
    mode === "onlyImpression" ||
    mode === "onlyFamiliar" ||
    mode === "onlyMemorized" ||
    mode === "onlyFavorite"
  ) {
    words = shuffle(words);
  }

  return words.slice(0, count);
}

function computeMastery(current: number, choice: Answer): number {
  switch (choice) {
    case "unknown":
      return 0;
    case "memorized":
      return 100;
    case "impression":
      // move slightly toward 40
      return Math.round(current + (40 - current) * 0.15);
    case "familiar":
      // move slightly toward 70
      return Math.round(current + (70 - current) * 0.15);
  }
}

type Answer = "unknown" | "impression" | "familiar" | "memorized";
type Step = "reciting" | "finished";

export default function ReciteSessionPage({ params }: PageProps) {
  const { wordbookId } = use(params);
  const { auth } = useAuth();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const count = Number(searchParams?.get("count") ?? 5);
  const mode = (searchParams?.get("mode") as Mode) ?? "random";
  const [mounted, setMounted] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [step, setStep] = useState<Step>("reciting");
  const [index, setIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (auth.currentUser) {
        const all = await getWordsByWordbookId(
          auth.currentUser.uid,
          wordbookId
        );
        setWords(all);
        const drawn = drawWords(all, count, mode);
        setSessionWords(drawn);
        setUsedIds(new Set(drawn.map((w) => w.id)));
        setIndex(0);
        setShowDetails(false);
        setStep("reciting");
      }
    };
    load();
  }, [auth.currentUser, wordbookId, count, mode]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const startSession = () => {
    const available = words.filter((w) => !usedIds.has(w.id));
    const drawn = drawWords(available, count, mode);
    setSessionWords(drawn);
    setUsedIds(
      new Set([...Array.from(usedIds), ...drawn.map((w) => w.id)])
    );
    setIndex(0);
    setShowDetails(false);
    setStep("reciting");
  };

  const handleAnswer = async (choice: Answer) => {
    const word = sessionWords[index];
    if (!auth.currentUser) return;
    const newMastery = computeMastery(word.mastery, choice);
    await updateWord(auth.currentUser.uid, wordbookId, word.id, {
      mastery: newMastery,
    });
    setSessionWords((prev) => {
      const copy = [...prev];
      copy[index] = { ...word, mastery: newMastery };
      return copy;
    });
    setShowDetails(true);
  };

  const next = () => {
    if (index + 1 >= sessionWords.length) {
      setStep("finished");
    } else {
      setIndex(index + 1);
      setShowDetails(false);
    }
  };

  const repeatSet = () => {
    setIndex(0);
    setShowDetails(false);
    setStep("reciting");
  };

  const nextSet = () => {
    startSession();
  };

  const progressPercent =
    sessionWords.length > 0
      ? ((index + (showDetails ? 1 : 0)) / sessionWords.length) * 100
      : 0;
  const progressColor =
    progressPercent < 25
      ? "bg-red-500"
      : progressPercent < 50
      ? "bg-orange-500"
      : progressPercent < 75
      ? "bg-yellow-500"
      : "bg-green-500";

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/wordbooks/${wordbookId}/study/recite`}
          className="text-sm text-muted-foreground"
          suppressHydrationWarning
        >
          &larr; {mounted ? t("recite.settingsTitle") : ""}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button variant="outline" onClick={handleLogout}>
            <span suppressHydrationWarning>
              {mounted ? t("logout") : ""}
            </span>
          </Button>
        </div>
      </div>
      <h1 className="text-center text-3xl sm:text-4xl font-bold">
        <span suppressHydrationWarning>
          {mounted ? t("studyPage.recite") : ""}
        </span>
      </h1>

      {step === "reciting" && sessionWords.length > 0 && (
        <div className="max-w-md mx-auto space-y-4">
          <p className="text-center text-base sm:text-lg text-muted-foreground">
            {t("recite.progress", {
              current: index + 1,
              total: sessionWords.length,
            })}
          </p>
          <div className="border rounded p-4 sm:p-6 space-y-4 text-center">
            <div className="text-3xl sm:text-4xl font-bold">
              {sessionWords[index].word}
            </div>
            {showDetails && (
              <div className="space-y-2 text-left">
                <div>
                  {t("wordList.translation")}: {sessionWords[index].translation}
                </div>
                <div>
                  {t("wordList.pinyin")}: {sessionWords[index].pinyin}
                </div>
                <div className="whitespace-pre-line">
                  {t("wordList.example")}: {sessionWords[index].exampleSentence}
                </div>
                <div className="whitespace-pre-line">
                  {t("wordList.exampleTranslation")}:{" "}
                  {sessionWords[index].exampleTranslation}
                </div>
              </div>
            )}
            {!showDetails ? (
              <>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 px-2 py-2 text-lg sm:text-xl bg-red-500 text-white hover:bg-red-600"
                    onClick={() => handleAnswer("unknown")}
                  >
                    {t("wordList.masteryLevels.unknown")}
                  </Button>
                  <Button
                    className="flex-1 px-2 py-2 text-lg sm:text-xl bg-orange-500 text-white hover:bg-orange-600"
                    onClick={() => handleAnswer("impression")}
                  >
                    {t("wordList.masteryLevels.impression")}
                  </Button>
                  <Button
                    className="flex-1 px-2 py-2 text-lg sm:text-xl bg-yellow-500 text-black hover:bg-yellow-600"
                    onClick={() => handleAnswer("familiar")}
                  >
                    {t("wordList.masteryLevels.familiar")}
                  </Button>
                  <Button
                    className="flex-1 px-2 py-2 text-lg sm:text-xl bg-green-500 text-black hover:bg-green-600"
                    onClick={() => handleAnswer("memorized")}
                  >
                    {t("wordList.masteryLevels.memorized")}
                  </Button>
                </div>
                <p className="text-center text-base text-muted-foreground">
                  {t("recite.answerHint")}
                </p>
              </>
            ) : (
              <Button className="w-full" onClick={next}>
                {t("recite.next")}
              </Button>
            )}
          </div>
          <div className="h-3 sm:h-4 bg-muted rounded">
            <div
              className={`h-3 sm:h-4 rounded ${progressColor}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {step === "finished" && (
        <div className="max-w-md mx-auto space-y-4 text-center">
          <p>
            {t("recite.progress", {
              current: sessionWords.length,
              total: sessionWords.length,
            })}
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={repeatSet}>{t("recite.again")}</Button>
            <Button onClick={nextSet}>{t("recite.nextSet", { count })}</Button>
            <Link href={`/wordbooks/${wordbookId}/study`} className="w-full">
              <Button className="w-full" variant="outline">
                {t("recite.finish")}
              </Button>
            </Link>
            <Link href={`/wordbooks/${wordbookId}`} className="w-full">
              <Button className="w-full" variant="outline">
                {t("backToWordbook")}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

