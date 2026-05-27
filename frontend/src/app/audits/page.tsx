"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageLayout } from "@/components/templates/PageLayout";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { auditService, AuditLog } from "@/services/audit";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/context/AuthStore";
import {
  ShieldAlert,
  Search,
  Clock,
  User as UserIcon,
  Globe,
  Activity,
  FileCode,
  X,
  Database,
} from "lucide-react";

export default function AuditsPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const isAdminOrAnalyst = user?.role === "Administrator" || user?.role === "GRC Analyst";

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDetails, setSelectedDetails] = useState<string | null>(null);

  // Fetch Audit Logs
  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs"],
    queryFn: () => auditService.getAuditLogs(),
    enabled: isAdminOrAnalyst, // Only fetch if authorized
  });

  // Filtered Logs
  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      log.user_email.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(term)) ||
      (log.details && log.details.toLowerCase().includes(term))
    );
  });

  // Derived Stats
  const totalOperations = logs.length;
  const uniqueUsers = new Set(logs.map((l) => l.user_email)).size;
  const deleteOperations = logs.filter((l) => l.action.includes("DELETE")).length;
  const createOperations = logs.filter((l) => l.action.includes("CREATE")).length;

  const breadcrumbs = [{ label: "Audits", href: "/audits" }, { label: "Activity Logs" }];

  if (!isAdminOrAnalyst) {
    return (
      <PageLayout breadcrumbs={breadcrumbs} title="System Audit Logs">
        <div className="max-w-md mx-auto mt-12 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-6 shadow-sm text-center">
          <ShieldAlert className="w-12 h-12 text-danger-rose mx-auto mb-4" />
          <h2 className="text-headline-sm font-bold text-primary dark:text-slate-100 mb-2">{t('audits.accessDenied.title')}</h2>
          <p className="text-body-sm text-secondary dark:text-slate-400">
            {t('audits.accessDenied.description')}
          </p>
        </div>
      </PageLayout>
    );
  }

  const formatJson = (jsonStr: string | undefined) => {
    if (!jsonStr) return t('audits.inspector.noDetails');
    try {
      const parsed = JSON.parse(jsonStr);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonStr;
    }
  };

  return (
    <PageLayout breadcrumbs={breadcrumbs} title="System Audit Trail">
      <div className="space-y-6">
        {/* KPI Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm text-left flex items-center justify-between">
            <div>
              <p className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">{t('audits.stats.totalOperations')}</p>
              <p className="text-display-lg font-bold mt-1 text-primary dark:text-slate-100">{totalOperations}</p>
            </div>
            <Activity className="w-8 h-8 text-indigo-500 opacity-60" />
          </div>
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm text-left flex items-center justify-between">
            <div>
              <p className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">{t('audits.stats.activeUsers')}</p>
              <p className="text-display-lg font-bold mt-1 text-primary dark:text-slate-100">{uniqueUsers}</p>
            </div>
            <UserIcon className="w-8 h-8 text-emerald-500 opacity-60" />
          </div>
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm text-left flex items-center justify-between">
            <div>
              <p className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">{t('audits.stats.creations')}</p>
              <p className="text-display-lg font-bold mt-1 text-emerald-600 dark:text-emerald-400">{createOperations}</p>
            </div>
            <Database className="w-8 h-8 text-emerald-500 opacity-60" />
          </div>
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm text-left flex items-center justify-between">
            <div>
              <p className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">{t('audits.stats.deletions')}</p>
              <p className="text-display-lg font-bold mt-1 text-rose-600 dark:text-rose-400">{deleteOperations}</p>
            </div>
            <ShieldAlert className="w-8 h-8 text-rose-500 opacity-60" />
          </div>
        </div>

        {/* Logs Table Container */}
        <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
          {/* Action Filter Header */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-surface-border dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('audits.table.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-1.5 h-9 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-primary dark:border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-body-sm text-secondary dark:text-slate-400">{t('audits.loading')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto table-scroll">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-surface-border dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-label-caps text-secondary dark:text-slate-400">
                    <th className="py-2.5 px-4">{t('audits.table.timestamp')}</th>
                    <th className="py-2.5 px-4">{t('audits.table.user')}</th>
                    <th className="py-2.5 px-4">{t('audits.table.action')}</th>
                    <th className="py-2.5 px-4">{t('audits.table.ipAddress')}</th>
                    <th className="py-2.5 px-4 text-right">{t('audits.table.details')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border dark:divide-slate-800 text-body-sm text-primary dark:text-slate-200">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-secondary dark:text-slate-400 whitespace-nowrap font-mono text-data-mono">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium flex items-center gap-1.5">
                          <UserIcon className="w-4 h-4 text-slate-400" />
                          {log.user_email}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              log.action.includes("DELETE")
                                ? "danger"
                                : log.action.includes("UPDATE")
                                ? "warning"
                                : "success"
                            }
                            size="sm"
                          >
                            {log.action}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-secondary dark:text-slate-400 font-mono text-data-mono">
                          <span className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            {log.ip_address || t('audits.table.internal')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {log.details ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<FileCode className="w-3.5 h-3.5" />}
                              onClick={() => setSelectedDetails(log.details || null)}
                            >
                              {t('audits.table.inspect')}
                            </Button>
                          ) : (
                            <span className="text-body-sm text-slate-400 italic">{t('audits.table.none')}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-secondary dark:text-slate-400">
                        {logs.length === 0 ? t('audits.table.noActivity') : t('audits.table.noMatch')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* INSPECTOR MODAL */}
      {selectedDetails && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg shadow-xl max-w-lg w-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-surface-border dark:border-slate-800 flex items-center justify-between">
              <h4 className="text-headline-sm font-bold text-primary dark:text-slate-100 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-primary dark:text-slate-200" />
                {t('audits.inspector.title')}
              </h4>
              <button
                onClick={() => setSelectedDetails(null)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"
                title="Close"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* JSON Content */}
            <div className="p-4 bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-y-auto max-h-[60vh] text-left select-text">
              <pre className="whitespace-pre-wrap">{formatJson(selectedDetails)}</pre>
            </div>
            {/* Footer */}
            <div className="p-3 border-t border-surface-border dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900">
              <Button onClick={() => setSelectedDetails(null)}>{t('audits.inspector.close')}</Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
