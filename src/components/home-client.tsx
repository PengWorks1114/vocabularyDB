"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AuthForm } from "@/components/auth-form";
import { useAuth } from "@/components/auth-provider";
import "@/i18n/i18n-client";
import { signOut } from "firebase/auth";

// Wordbook list component
import WordbookList from "@/components/wordbooks/wordbook-list";
import ProgressCircle from "@/components/study/ProgressCircle";
import {
  getWordbooksByUserId,
  getWordsByWordbookId,
  type Word,
} from "@/lib/firestore-service";

export default function HomeClient() {
  const { t } = useTranslation();
  const { user, loading, auth } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [avgMastery, setAvgMastery] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    async function loadAvg() {
      const wordbooks = await getWordbooksByUserId(user.uid);
      let words: Word[] = [];
      for (const wb of wordbooks) {
        const ws = await getWordsByWordbookId(user.uid, wb.id);
        words = words.concat(ws);
      }
      if (!words.length) {
        setAvgMastery(0);
        return;
      }
      const avg =
        words.reduce((sum, w) => sum + (w.mastery || 0), 0) / words.length;
      setAvgMastery(avg);
    }
    loadAvg();
  }, [user]);

  const handleAuthSuccess = () => setIsAuthOpen(false);
  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading || !mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p suppressHydrationWarning>
          {mounted ? t("loading") : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {user ? (
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xl font-bold">
              {t("welcomeUser", { email: user.email || "" })}
            </p>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button onClick={handleLogout} variant="outline">
                {t("logout")}
              </Button>
            </div>
          </div>

          {avgMastery !== null && (
            <div className="flex justify-center">
              <ProgressCircle progress={avgMastery} />
            </div>
          )}

          {/* Wordbook list (load / create / rename / delete) */}
          <WordbookList />
        </div>
      ) : (
        <div className="flex min-h-[60vh] items-center justify-center gap-4">
          <Button>{t("welcome")}</Button>
          <LanguageSwitcher />
          <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">{t("login")}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t("login")}</DialogTitle>
                <DialogDescription>
                  Log in to your account or create a new one.
                </DialogDescription>
              </DialogHeader>
              <AuthForm onSuccess={handleAuthSuccess} />
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
