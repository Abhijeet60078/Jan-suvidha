import React from "react";
import { useTranslation } from "react-i18next";

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const setLang = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("jansuvidha_lang", lng);
  };
  return (
    <div className="inline-flex rounded-full bg-white/10 p-0.5 text-sm font-medium">
      <button
        onClick={() => setLang("hi")}
        className={`px-3 py-1 rounded-full transition-colors ${i18n.language === "hi" ? "bg-marigold text-ink-dark" : "text-white/80 hover:text-white"}`}
      >
        हिं
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-3 py-1 rounded-full transition-colors ${i18n.language === "en" ? "bg-marigold text-ink-dark" : "text-white/80 hover:text-white"}`}
      >
        EN
      </button>
    </div>
  );
}
