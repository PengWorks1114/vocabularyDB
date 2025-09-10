"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useAuth } from "@/components/auth-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export default function ReciteSettingsPage({ params }: PageProps) {
  const { wordbookId } = use(params);
  const { auth } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [count, setCount] = useState(5);
  const [mode, setMode] = useState<Mode>("random");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const start = () => {
    router.push(
      `/wordbooks/${wordbookId}/study/recite/session?count=${count}&mode=${mode}`
    );
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/wordbooks/${wordbookId}/study`}
          className="text-base text-muted-foreground"
          suppressHydrationWarning
        >
          &larr; {mounted ? t("backToStudy") : ""}
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
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-2xl">
            <span suppressHydrationWarning>
              {mounted ? t("recite.settingsTitle") : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="count-select" className="text-base sm:text-lg">
              {t("recite.count")}
            </Label>
            <Select
              value={String(count)}
              onValueChange={(value) => setCount(Number(value))}
            >
              <SelectTrigger id="count-select" className="w-full text-base sm:text-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 20, 30].map((n) => (
                  <SelectItem
                    key={n}
                    value={String(n)}
                    className="text-base sm:text-lg"
                  >
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mode-select" className="text-base sm:text-lg">
              {t("recite.mode")}
            </Label>
            <Select
              value={mode}
              onValueChange={(value) => setMode(value as Mode)}
            >
              <SelectTrigger id="mode-select" className="w-full text-base sm:text-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    "random",
                    "masteryLow",
                    "masteryHigh",
                    "freqLow",
                    "freqHigh",
                    "recent",
                    "old",
                    "onlyUnknown",
                    "onlyImpression",
                    "onlyFamiliar",
                    "onlyMemorized",
                    "onlyFavorite",
                  ] as Mode[]
                ).map((m) => (
                  <SelectItem key={m} value={m} className="text-base sm:text-lg">
                    {t(`recite.modes.${m}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full text-lg" onClick={start}>
            {t("recite.start")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

