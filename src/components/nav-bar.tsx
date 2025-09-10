"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/i18n/i18n-client";

export function NavBar() {
  const { t } = useTranslation();

  return (
    <nav className="flex items-center gap-4 border-b px-4 py-2">
      <Link href="/" className="font-medium">
        {t("nav.wordbooks")}
      </Link>
      <Link href="/trash" className="font-medium">
        {t("nav.trash")}
      </Link>
    </nav>
  );
}
