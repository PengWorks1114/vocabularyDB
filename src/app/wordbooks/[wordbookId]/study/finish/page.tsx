"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/auth-provider";
import ProgressCircle from "@/components/study/ProgressCircle";
import {
  getWordbook,
  getWordsByWordbookId,
  type Word,
} from "@/lib/firestore-service";

interface PageProps {
  params: Promise<{ wordbookId: string }>;
}

export default function StudyFinishPage({ params }: PageProps) {
  const { wordbookId } = use(params);
  const { user } = useAuth();
  const { t } = useTranslation();
  const [avg, setAvg] = useState(0);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user) return;
    async function load() {
      const wb = await getWordbook(user.uid, wordbookId);
      setName(wb?.name || "");
      const words: Word[] = await getWordsByWordbookId(user.uid, wordbookId);
      if (!words.length) {
        setAvg(0);
        return;
      }
      const avgMastery =
        words.reduce((sum, w) => sum + (w.mastery || 0), 0) / words.length;
      setAvg(avgMastery);
    }
    load();
  }, [user, wordbookId]);

  return (
    <div className="p-8 space-y-6">
      <Link
        href={`/wordbooks/${wordbookId}`}
        className="text-sm text-muted-foreground"
        suppressHydrationWarning
      >
        &larr; {t("backToList")}
      </Link>
      <h1 className="text-2xl font-bold">
        {t("wordList.overallMastery")} - {name}
      </h1>
      <div className="flex justify-center">
        <ProgressCircle progress={avg} />
      </div>
    </div>
  );
}

