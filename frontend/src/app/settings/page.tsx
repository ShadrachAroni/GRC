"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PageLayout } from "@/components/templates/PageLayout";
import { Button } from "@/components/atoms/Button";
import { useAuthStore } from "@/context/AuthStore";
import { useNotification } from "@/context/NotificationContext";
import {
  User,
  Building,
  ShieldCheck,
  Globe,
  Sun,
  Moon,
  Settings,
  AlertCircle,
  KeyRound,
  CheckCircle,
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { t, i18n } = useTranslation();
  const { showToast } = useNotification();

  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  // Sync initial state of theme and language
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (storedTheme) {
      setCurrentTheme(storedTheme);
    } else {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setCurrentTheme(systemPrefersDark ? "dark" : "light");
    }

    if (i18n.language) {
      setSelectedLanguage(i18n.language);
    }

    const handleThemeSync = () => {
      const syncTheme = localStorage.getItem("theme") as "light" | "dark" | null;
      if (syncTheme) {
        setCurrentTheme(syncTheme);
      }
    };
    window.addEventListener("theme-change", handleThemeSync);
    return () => window.removeEventListener("theme-change", handleThemeSync);
  }, [i18n.language]);

  const handleApplyPreferences = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Theme transition
    if (currentTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    window.dispatchEvent(new Event("theme-change"));

    // 2. Language switch
    i18n.changeLanguage(selectedLanguage);

    showToast(t("settings.preferences.saveSuccess"), "success");
  };

  const breadcrumbs = [{ label: "Settings", href: "/settings" }, { label: "Preferences" }];

  return (
    <PageLayout breadcrumbs={breadcrumbs} title={t("settings.title")}>
      <div className="space-y-6 max-w-4xl text-left">
        <p className="text-body-md text-secondary dark:text-slate-400">
          {t("settings.subtitle")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Section 1: User & Workspace Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Corporate Profile Card */}
            <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-headline-sm font-bold text-primary dark:text-slate-100 flex items-center gap-2 border-b border-surface-border dark:border-slate-800 pb-3">
                <User className="w-5 h-5 text-indigo-500" />
                {t("settings.profile.title")}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-body-xs font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider block">
                    {t("settings.profile.email")}
                  </span>
                  <span className="text-body-md font-medium text-primary dark:text-slate-200 block mt-1 break-all select-all font-mono">
                    {user?.email || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="text-body-xs font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider block">
                    {t("settings.profile.role")}
                  </span>
                  <span className="text-body-md font-bold text-indigo-600 dark:text-indigo-400 block mt-1 capitalize">
                    {user?.role || "Viewer"}
                  </span>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-body-xs font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider block">
                    {t("settings.profile.tenant")}
                  </span>
                  <span className="text-body-md font-mono text-data-mono font-bold text-primary dark:text-slate-200 block mt-1 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded border border-slate-100 dark:border-slate-800 select-all">
                    {user?.tenant_id || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Security MFA Card */}
            <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-headline-sm font-bold text-primary dark:text-slate-100 flex items-center gap-2 border-b border-surface-border dark:border-slate-800 pb-3">
                <KeyRound className="w-5 h-5 text-indigo-500" />
                {t("settings.security.title")}
              </h3>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20 flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-body-sm text-primary dark:text-slate-200">
                      {t("settings.security.mfaStatus")}
                    </span>
                    <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/40">
                      {t("settings.security.mfaActive")}
                    </span>
                  </div>
                  <p className="text-body-sm text-secondary dark:text-slate-400 leading-relaxed">
                    {t("settings.security.mfaDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Preferences configuration Form */}
          <div className="md:col-span-1">
            <form
              onSubmit={handleApplyPreferences}
              className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5 flex flex-col justify-between h-full min-h-[350px]"
            >
              <div className="space-y-5">
                <h3 className="text-headline-sm font-bold text-primary dark:text-slate-100 flex items-center gap-2 border-b border-surface-border dark:border-slate-800 pb-3">
                  <Settings className="w-5 h-5 text-indigo-500" />
                  {t("settings.preferences.title")}
                </h3>

                {/* Theme selection toggle buttons */}
                <div className="space-y-2">
                  <label className="text-body-sm font-semibold text-secondary dark:text-slate-350 block">
                    {t("settings.preferences.theme")}
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded-lg border border-slate-150 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCurrentTheme("light")}
                      className={`flex items-center justify-center gap-2 py-2 rounded-md font-semibold text-body-xs transition-all duration-150 ${
                        currentTheme === "light"
                          ? "bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-slate-100 border border-surface-border dark:border-slate-600"
                          : "text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-200 border border-transparent"
                      }`}
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      {t("settings.preferences.themeLight")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentTheme("dark")}
                      className={`flex items-center justify-center gap-2 py-2 rounded-md font-semibold text-body-xs transition-all duration-150 ${
                        currentTheme === "dark"
                          ? "bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-slate-100 border border-surface-border dark:border-slate-600"
                          : "text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-200 border border-transparent"
                      }`}
                    >
                      <Moon className="w-4 h-4 text-indigo-500" />
                      {t("settings.preferences.themeDark")}
                    </button>
                  </div>
                </div>

                {/* Language translation selector */}
                <div className="space-y-2">
                  <label
                    htmlFor="settings-language-select"
                    className="text-body-sm font-semibold text-secondary dark:text-slate-350 block"
                  >
                    {t("settings.preferences.language")}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Globe className="w-4 h-4" />
                    </span>
                    <select
                      id="settings-language-select"
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm text-primary dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    >
                      <option value="en">English (US)</option>
                      <option value="de">Deutsch (German)</option>
                      <option value="es">Español (Spanish)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-surface-border dark:border-slate-800">
                <Button type="submit" className="w-full justify-center">
                  {t("settings.preferences.saveButton")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
