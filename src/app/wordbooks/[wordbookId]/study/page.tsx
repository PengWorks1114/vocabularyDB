"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getWordsByWordbookId } from "@/lib/firestore-service";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";
import { useTranslation } from "react-i18next";
import { CircleProgress } from "@/components/ui/circle-progress";

interface PageProps {
  params: Promise<{ wordbookId: string }>;
}

export default function StudyPage({ params }: PageProps) {
  const { wordbookId } = use(params);
  const { user, auth } = useAuth();
  const { t } = useTranslation();
  const [overallMastery, setOverallMastery] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!user) return;
    getWordsByWordbookId(user.uid, wordbookId).then((words) => {
      setWordCount(words.length);
      const mastery =
        words.length > 0
          ? words.reduce((sum, w) => sum + (w.mastery || 0), 0) / words.length
          : 0;
      setOverallMastery(mastery);
    });
  }, [user, wordbookId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const masteryColor = `hsl(${(overallMastery / 100) * 120}, 80%, 45%)`;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/wordbooks/${wordbookId}`}
          className="text-sm text-muted-foreground"
          suppressHydrationWarning
        >
          &larr; {mounted ? t("backToList") : ""}
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

      <div className="flex flex-col items-center gap-6">
        <CircleProgress value={overallMastery} />
        <div>{t("studyPage.totalWords", { count: wordCount })}</div>
        <div className="flex items-center gap-2">
          <span>{t("wordList.overallMastery")}</span>
          <div className="h-2 w-40 rounded bg-gray-200">
            <div
              className="h-2 rounded"
              style={{ width: `${overallMastery}%`, backgroundColor: masteryColor }}
            />
          </div>
          <span>{overallMastery.toFixed(1)}%</span>
        </div>
        <div className="flex gap-4 mt-4">
          <Button className="bg-orange-500 text-black hover:bg-orange-600">
            {t("studyPage.recite")}
          </Button>
          <Button className="bg-green-500 text-black hover:bg-green-600">
            {t("studyPage.dictation")}
          </Button>
        </div>
      </div>
    </div>
  );
}
