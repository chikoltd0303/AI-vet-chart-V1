"use client";
import React from "react";
import { useI18n } from "@/lib/i18n";

export default function LanguageSelector() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-900 font-medium">Language:</span>
      <select
        className="border border-gray-500 rounded px-2 py-1 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={lang}
        onChange={(e) => setLang(e.target.value as any)}
      >
        <option value="ja">日本語</option>
        <option value="en">English</option>
      </select>
    </div>
  );
}
