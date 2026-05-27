"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageLayout } from "@/components/templates/PageLayout";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { auditService, AuditLog, AuditFinding, Capa } from "@/services/audit";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Plus,
  Trash2,
  Edit2,
  Download,
  AlertTriangle,
  ClipboardCheck,
  Calendar,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

export default function AuditsPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  const isAdmin = user?.role === "Administrator";
  const isAnalyst = user?.role === "GRC Analyst";
  const isAdminOrAnalyst = isAdmin || isAnalyst;

  // Tabs: "findings", "capas", "logs"
  const [activeTab, setActiveTab] = useState<"findings" | "capas" | "logs">(
    isAdmin ? "logs" : "findings"
  );

  // Search / Filters
  const [logSearch, setLogSearch] = useState("");
  const [findingSearch, setFindingSearch] = useState("");
  const [capaSearch, setCapaSearch] = useState("");
  const [findingSeverityFilter, setFindingSeverityFilter] = useState("all");
  
  // Selected Details (Audit Trail inspector)
  const [selectedDetails, setSelectedDetails] = useState<string | null>(null);

  // Form Modals State
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<AuditFinding | null>(null);
  const [findingForm, setFindingForm] = useState({
    finding_id: "",
    title: "",
    severity: "High",
    control_id: "",
    recommendation: "",
    status: "Open",
  });

  const [isCapaModalOpen, setIsCapaModalOpen] = useState(false);
  const [editingCapa, setEditingCapa] = useState<Capa | null>(null);
  const [capaForm, setCapaForm] = useState({
    capa_id: "",
    finding_id: "",
    title: "",
    root_cause: "",
    action: "",
    owner: "",
    due_date: "",
    status: "Open",
  });

  // Fetch Data
  const { data: logs = [], isLoading: isLoadingLogs } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs"],
    queryFn: () => auditService.getAuditLogs(),
    enabled: isAdmin, // Only admins can fetch raw audit logs
  });

  const { data: findings = [], isLoading: isLoadingFindings } = useQuery<AuditFinding[]>({
    queryKey: ["audit-findings"],
    queryFn: () => auditService.getFindings(),
    enabled: isAdminOrAnalyst,
  });

  const { data: capas = [], isLoading: isLoadingCapas } = useQuery<Capa[]>({
    queryKey: ["audit-capas"],
    queryFn: () => auditService.getCapas(),
    enabled: isAdminOrAnalyst,
  });

  // Mutations
  const createFindingMutation = useMutation({
    mutationFn: (data: Partial<AuditFinding>) => auditService.createFinding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-findings"] });
      setIsFindingModalOpen(false);
      resetFindingForm();
    },
  });

  const updateFindingMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AuditFinding> }) =>
      auditService.updateFinding(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-findings"] });
      setIsFindingModalOpen(false);
      resetFindingForm();
    },
  });

  const deleteFindingMutation = useMutation({
    mutationFn: (id: string) => auditService.deleteFinding(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-findings"] });
    },
  });

  const createCapaMutation = useMutation({
    mutationFn: (data: Partial<Capa>) => auditService.createCapa(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-capas"] });
      setIsCapaModalOpen(false);
      resetCapaForm();
    },
  });

  const updateCapaMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Capa> }) =>
      auditService.updateCapa(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-capas"] });
      setIsCapaModalOpen(false);
      resetCapaForm();
    },
  });

  const deleteCapaMutation = useMutation({
    mutationFn: (id: string) => auditService.deleteCapa(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-capas"] });
    },
  });

  // Handlers
  const handleDownloadCsv = async () => {
    try {
      const blob = await auditService.downloadAuditLogsCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `system_audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error downloading logs", err);
    }
  };

  const handleOpenAddFinding = () => {
    setEditingFinding(null);
    resetFindingForm();
    setIsFindingModalOpen(true);
  };

  const handleOpenEditFinding = (finding: AuditFinding) => {
    setEditingFinding(finding);
    setFindingForm({
      finding_id: finding.finding_id,
      title: finding.title,
      severity: finding.severity,
      control_id: finding.control_id || "",
      recommendation: finding.recommendation || "",
      status: finding.status,
    });
    setIsFindingModalOpen(true);
  };

  const handleSaveFinding = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFinding) {
      updateFindingMutation.mutate({
        id: editingFinding.finding_id,
        data: findingForm,
      });
    } else {
      createFindingMutation.mutate(findingForm);
    }
  };

  const handleDeleteFinding = (findingId: string) => {
    if (confirm(`Are you sure you want to delete finding ${findingId}?`)) {
      deleteFindingMutation.mutate(findingId);
    }
  };

  const handleOpenAddCapa = () => {
    setEditingCapa(null);
    resetCapaForm();
    setIsCapaModalOpen(true);
  };

  const handleOpenEditCapa = (capa: Capa) => {
    setEditingCapa(capa);
    setCapaForm({
      capa_id: capa.capa_id,
      finding_id: capa.finding_id,
      title: capa.title,
      root_cause: capa.root_cause || "",
      action: capa.action,
      owner: capa.owner || "",
      due_date: capa.due_date || "",
      status: capa.status,
    });
    setIsCapaModalOpen(true);
  };

  const handleSaveCapa = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCapa) {
      updateCapaMutation.mutate({
        id: editingCapa.capa_id,
        data: capaForm,
      });
    } else {
      createCapaMutation.mutate(capaForm);
    }
  };

  const handleDeleteCapa = (capaId: string) => {
    if (confirm(`Are you sure you want to delete CAPA ${capaId}?`)) {
      deleteCapaMutation.mutate(capaId);
    }
  };

  const resetFindingForm = () => {
    setFindingForm({
      finding_id: "",
      title: "",
      severity: "High",
      control_id: "",
      recommendation: "",
      status: "Open",
    });
  };

  const resetCapaForm = () => {
    setCapaForm({
      capa_id: "",
      finding_id: "",
      title: "",
      root_cause: "",
      action: "",
      owner: "",
      due_date: "",
      status: "Open",
    });
  };

  // Helper SLA Calculation
  const getCapaSlaInfo = (capa: Capa, findingsList: AuditFinding[]) => {
    const finding = findingsList.find((f) => f.finding_id === capa.finding_id);
    const severity = finding?.severity || "Medium";
    const totalDays =
      severity === "Critical"
        ? 7
        : severity === "High"
        ? 14
        : severity === "Medium"
        ? 30
        : 90;

    if (capa.status === "Closed" || capa.status === "Resolved") {
      return {
        percent: 100,
        label: "Completed",
        color: "bg-emerald-500",
        barColor: "bg-emerald-500",
        daysLeft: 0,
        isOverdue: false,
      };
    }

    if (!capa.due_date) {
      return {
        percent: 100,
        label: "No Due Date",
        color: "bg-slate-400",
        barColor: "bg-slate-400",
        daysLeft: 0,
        isOverdue: false,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(capa.due_date);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return {
        percent: 100,
        label: `Overdue by ${Math.abs(daysLeft)}d`,
        color: "text-rose-600 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800",
        barColor: "bg-rose-600 animate-pulse",
        daysLeft,
        isOverdue: true,
      };
    }

    const percent = Math.min(100, Math.max(0, (daysLeft / totalDays) * 100));
    let color = "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800";
    let barColor = "bg-emerald-500";
    
    if (percent < 25) {
      color = "text-rose-700 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800";
      barColor = "bg-rose-500";
    } else if (percent < 50) {
      color = "text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800";
      barColor = "bg-amber-500";
    }

    return {
      percent,
      label: `${daysLeft}d remaining`,
      color,
      barColor,
      daysLeft,
      isOverdue: false,
    };
  };

  // Filtered Lists
  const filteredLogs = logs.filter((log) => {
    const term = logSearch.toLowerCase();
    return (
      log.user_email.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(term)) ||
      (log.details && log.details.toLowerCase().includes(term))
    );
  });

  const filteredFindings = findings.filter((f) => {
    const term = findingSearch.toLowerCase();
    const matchesSearch =
      f.title.toLowerCase().includes(term) ||
      f.finding_id.toLowerCase().includes(term) ||
      (f.control_id && f.control_id.toLowerCase().includes(term)) ||
      (f.recommendation && f.recommendation.toLowerCase().includes(term));
      
    const matchesSeverity =
      findingSeverityFilter === "all" ||
      f.severity.toLowerCase() === findingSeverityFilter.toLowerCase();

    return matchesSearch && matchesSeverity;
  });

  const filteredCapas = capas.filter((c) => {
    const term = capaSearch.toLowerCase();
    return (
      c.title.toLowerCase().includes(term) ||
      c.capa_id.toLowerCase().includes(term) ||
      c.finding_id.toLowerCase().includes(term) ||
      (c.owner && c.owner.toLowerCase().includes(term)) ||
      (c.root_cause && c.root_cause.toLowerCase().includes(term)) ||
      c.action.toLowerCase().includes(term)
    );
  });

  // Derived Stats
  const totalOperations = logs.length;
  const uniqueUsers = new Set(logs.map((l) => l.user_email)).size;
  const deleteOperations = logs.filter((l) => l.action.includes("DELETE")).length;
  const createOperations = logs.filter((l) => l.action.includes("CREATE")).length;

  const breadcrumbs = [
    { label: "Audits", href: "/audits" },
    { label: activeTab === "logs" ? "System Audit Trail" : activeTab === "findings" ? "Audit Findings" : "CAPA Tracker" }
  ];

  if (!isAdminOrAnalyst) {
    return (
      <PageLayout breadcrumbs={breadcrumbs} title="System Audit Logs">
        <div className="max-w-md mx-auto mt-12 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-6 shadow-sm text-center">
          <ShieldAlert className="w-12 h-12 text-danger-rose mx-auto mb-4" />
          <h2 className="text-headline-sm font-bold text-primary dark:text-slate-100 mb-2">
            {t("audits.accessDenied.title")}
          </h2>
          <p className="text-body-sm text-secondary dark:text-slate-400">
            {t("audits.accessDenied.description")}
          </p>
        </div>
      </PageLayout>
    );
  }

  const formatJson = (jsonStr: string | undefined) => {
    if (!jsonStr) return t("audits.inspector.noDetails");
    try {
      const parsed = JSON.parse(jsonStr);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonStr;
    }
  };

  return (
    <PageLayout breadcrumbs={breadcrumbs} title="Audit & CAPA Manager">
      <div className="space-y-6">
        
        {/* Dynamic Tabs Navigation */}
        <div className="flex border-b border-surface-border dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-1 rounded-lg">
          {isAdmin && (
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex-1 py-2.5 px-4 text-center rounded-md font-medium text-body-sm transition-all duration-150 flex items-center justify-center gap-2 ${
                activeTab === "logs"
                  ? "bg-white dark:bg-slate-800 shadow-sm text-primary dark:text-slate-100"
                  : "text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Activity className="w-4 h-4" />
              {t("audits.tabs.logs")}
            </button>
          )}
          <button
            onClick={() => setActiveTab("findings")}
            className={`flex-1 py-2.5 px-4 text-center rounded-md font-medium text-body-sm transition-all duration-150 flex items-center justify-center gap-2 ${
              activeTab === "findings"
                ? "bg-white dark:bg-slate-800 shadow-sm text-primary dark:text-slate-100"
                : "text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            {t("audits.tabs.findings")}
          </button>
          <button
            onClick={() => setActiveTab("capas")}
            className={`flex-1 py-2.5 px-4 text-center rounded-md font-medium text-body-sm transition-all duration-150 flex items-center justify-center gap-2 ${
              activeTab === "capas"
                ? "bg-white dark:bg-slate-800 shadow-sm text-primary dark:text-slate-100"
                : "text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {t("audits.tabs.capas")}
          </button>
        </div>

        {/* --- TAB CONTENT: SYSTEM AUDIT LOGS (ADMIN ONLY) --- */}
        {activeTab === "logs" && isAdmin && (
          <div className="space-y-6">
            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-secondary dark:text-slate-400 uppercase tracking-wider">
                    {t("audits.stats.totalOperations")}
                  </p>
                  <p className="text-display-lg font-bold mt-1 text-primary dark:text-slate-100">
                    {totalOperations}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-indigo-500 opacity-60" />
              </div>
              <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-secondary dark:text-slate-400 uppercase tracking-wider">
                    {t("audits.stats.activeUsers")}
                  </p>
                  <p className="text-display-lg font-bold mt-1 text-primary dark:text-slate-100">
                    {uniqueUsers}
                  </p>
                </div>
                <UserIcon className="w-8 h-8 text-emerald-500 opacity-60" />
              </div>
              <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-secondary dark:text-slate-400 uppercase tracking-wider">
                    {t("audits.stats.creations")}
                  </p>
                  <p className="text-display-lg font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                    {createOperations}
                  </p>
                </div>
                <Database className="w-8 h-8 text-emerald-500 opacity-60" />
              </div>
              <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-secondary dark:text-slate-400 uppercase tracking-wider">
                    {t("audits.stats.deletions")}
                  </p>
                  <p className="text-display-lg font-bold mt-1 text-rose-600 dark:text-rose-400">
                    {deleteOperations}
                  </p>
                </div>
                <ShieldAlert className="w-8 h-8 text-rose-500 opacity-60" />
              </div>
            </div>

            {/* Logs Table Container */}
            <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg shadow-sm overflow-hidden animate-fadeIn">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-surface-border dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="relative flex-1 sm:max-w-xs">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder={t("audits.table.searchPlaceholder")}
                    className="w-full pl-9 pr-3 py-1.5 h-9 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-400"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleDownloadCsv}
                >
                  {t("audits.downloadLogs")}
                </Button>
              </div>

              {isLoadingLogs ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-body-sm text-secondary">{t("audits.loading")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto table-scroll">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-surface-border dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-label-caps text-secondary dark:text-slate-400">
                        <th className="py-2.5 px-4">{t("audits.table.timestamp")}</th>
                        <th className="py-2.5 px-4">{t("audits.table.user")}</th>
                        <th className="py-2.5 px-4">{t("audits.table.action")}</th>
                        <th className="py-2.5 px-4">{t("audits.table.ipAddress")}</th>
                        <th className="py-2.5 px-4 text-right">{t("audits.table.details")}</th>
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
                                {log.ip_address || t("audits.table.internal")}
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
                                  {t("audits.table.inspect")}
                                </Button>
                              ) : (
                                <span className="text-body-sm text-slate-400 italic">
                                  {t("audits.table.none")}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-secondary">
                            {logs.length === 0 ? t("audits.table.noActivity") : t("audits.table.noMatch")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB CONTENT: AUDIT FINDINGS --- */}
        {activeTab === "findings" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-2 flex-1 sm:max-w-lg">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    value={findingSearch}
                    onChange={(e) => setFindingSearch(e.target.value)}
                    placeholder={t("findings.searchPlaceholder")}
                    className="w-full pl-9 pr-3 py-1.5 h-9 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-400"
                  />
                </div>
                <select
                  value={findingSeverityFilter}
                  onChange={(e) => setFindingSeverityFilter(e.target.value)}
                  className="px-3 h-9 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-secondary dark:text-slate-300"
                  title="Filter by severity"
                  aria-label="Filter by severity"
                >
                  <option value="all">{t("findings.severity.all")}</option>
                  <option value="Critical">{t("findings.severity.critical")}</option>
                  <option value="High">{t("findings.severity.high")}</option>
                  <option value="Medium">{t("findings.severity.medium")}</option>
                  <option value="Low">{t("findings.severity.low")}</option>
                </select>
              </div>
              
              {isAdminOrAnalyst && (
                <Button
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenAddFinding}
                >
                  {t("findings.addFinding")}
                </Button>
              )}
            </div>

            {/* Findings Table */}
            <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
              {isLoadingFindings ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-body-sm text-secondary">{t("findings.loading")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto table-scroll">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-surface-border dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-label-caps text-secondary dark:text-slate-400">
                        <th className="py-2.5 px-4">{t("findings.table.id")}</th>
                        <th className="py-2.5 px-4">{t("findings.table.title")}</th>
                        <th className="py-2.5 px-4">{t("findings.table.severity")}</th>
                        <th className="py-2.5 px-4">{t("findings.table.controlId")}</th>
                        <th className="py-2.5 px-4">{t("findings.table.status")}</th>
                        <th className="py-2.5 px-4">{t("findings.table.detected")}</th>
                        {isAdminOrAnalyst && <th className="py-2.5 px-4 text-right">{t("findings.table.actions")}</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border dark:divide-slate-800 text-body-sm text-primary dark:text-slate-200">
                      {filteredFindings.length > 0 ? (
                        filteredFindings.map((finding) => (
                          <tr key={finding.finding_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono text-data-mono font-bold text-primary dark:text-slate-200">
                              {finding.finding_id}
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-semibold text-primary dark:text-slate-100">{finding.title}</p>
                                {finding.recommendation && (
                                  <p className="text-[11px] text-secondary dark:text-slate-400 mt-0.5 line-clamp-1 italic">
                                    {t("findings.table.rec")} {finding.recommendation}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  finding.severity.toLowerCase() as any
                                }
                                size="sm"
                              >
                                {finding.severity}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 font-mono text-data-mono text-secondary dark:text-slate-400">
                              {finding.control_id || "None"}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={finding.status === "Open" ? "warning" : "success"}
                                size="sm"
                              >
                                {finding.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-secondary dark:text-slate-400 font-mono text-data-mono">
                              {new Date(finding.detected_at).toLocaleDateString()}
                            </td>
                            {isAdminOrAnalyst && (
                              <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                                  onClick={() => handleOpenEditFinding(finding)}
                                >
                                  {t("findings.table.edit")}
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                  onClick={() => handleDeleteFinding(finding.finding_id)}
                                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-800"
                                >
                                  {t("findings.table.delete")}
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-secondary">
                            {t("findings.table.none")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB CONTENT: CAPA TRACKER --- */}
        {activeTab === "capas" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1 sm:max-w-xs">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  value={capaSearch}
                  onChange={(e) => setCapaSearch(e.target.value)}
                  placeholder={t("capa.searchPlaceholder")}
                  className="w-full pl-9 pr-3 py-1.5 h-9 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-400"
                />
              </div>
              
              {isAdminOrAnalyst && (
                <Button
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenAddCapa}
                >
                  {t("capa.addCapa")}
                </Button>
              )}
            </div>

            {/* CAPA Cards / List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoadingCapas || isLoadingFindings ? (
                <div className="py-20 col-span-2 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-body-sm text-secondary">{t("capa.loading")}</p>
                </div>
              ) : filteredCapas.length > 0 ? (
                filteredCapas.map((capa) => {
                  const sla = getCapaSlaInfo(capa, findings);
                  return (
                    <div
                      key={capa.capa_id}
                      className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4 relative flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      <div className="space-y-2">
                        {/* Header Row */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-data-mono text-primary dark:text-slate-100 font-bold">
                            {capa.capa_id}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={capa.status === "Closed" ? "success" : "warning"} size="sm">
                              {capa.status}
                            </Badge>
                            <Badge variant="info" size="sm" className="font-mono">
                              {t("capa.ref")}: {capa.finding_id}
                            </Badge>
                          </div>
                        </div>

                        {/* Title & Root Cause */}
                        <div>
                          <h4 className="font-semibold text-body-md text-primary dark:text-slate-100">
                            {capa.title}
                          </h4>
                          {capa.root_cause && (
                            <p className="text-body-xs text-secondary dark:text-slate-400 mt-1">
                              <span className="font-semibold">{t("capa.rootCauseLabel")}</span> {capa.root_cause}
                            </p>
                          )}
                          <p className="text-body-sm text-primary dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded border border-slate-100 dark:border-slate-800">
                            <span className="font-semibold text-[11px] uppercase tracking-wider block text-secondary mb-1">{t("capa.correctiveActionLabel")}</span>
                            {capa.action}
                          </p>
                        </div>

                        {/* Owner & Due Date */}
                        <div className="grid grid-cols-2 gap-2 text-body-xs text-secondary dark:text-slate-400 pt-2">
                          <div className="flex items-center gap-1">
                            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t("capa.ownerLabel")} {capa.owner || t("risks.table.unassigned")}</span>
                          </div>
                          <div className="flex items-center gap-1 justify-end">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t("capa.dueLabel")} {capa.due_date ? new Date(capa.due_date).toLocaleDateString() : t("capa.noDate")}</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress / SLA Status */}
                      <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-body-xs">
                          <span className="font-medium text-secondary dark:text-slate-400">{t("capa.table.progress")}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sla.color}`}>
                            {sla.label}
                          </span>
                        </div>
                        {/* Progress Bar container */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded overflow-hidden">
                          <div
                            className={`h-full rounded transition-all duration-300 ${sla.barColor}`}
                            style={{ width: `${sla.percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      {isAdminOrAnalyst && (
                        <div className="flex justify-end gap-2 pt-3">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                            onClick={() => handleOpenEditCapa(capa)}
                          >
                            {t("findings.table.edit")}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                            onClick={() => handleDeleteCapa(capa.capa_id)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-800"
                          >
                            {t("findings.table.delete")}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-secondary col-span-2 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg">
                  {t("capa.noCapas")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- MODAL: ADD/EDIT FINDING --- */}
        {isFindingModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden flex flex-col animate-scaleIn">
              <div className="p-4 border-b border-surface-border dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-headline-sm font-bold text-primary dark:text-slate-100 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-indigo-500" />
                  {editingFinding 
                    ? t("findings.modal.editTitle", { findingId: editingFinding.finding_id }) 
                    : t("findings.modal.createTitle")
                  }
                </h3>
                <button
                  onClick={() => setIsFindingModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"
                  title="Close"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveFinding} className="p-5 space-y-4">
                <div>
                  <label className="block text-body-sm font-semibold text-secondary dark:text-slate-300 mb-1">
                    {t("findings.form.findingId")}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingFinding}
                    placeholder={t("findings.form.findingIdPlaceholder")}
                    value={findingForm.finding_id}
                    onChange={(e) => setFindingForm({ ...findingForm, finding_id: e.target.value })}
                    className="w-full p-2.5 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-semibold text-secondary dark:text-slate-300 mb-1">
                    {t("findings.form.title")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t("findings.form.titlePlaceholder")}
                    value={findingForm.title}
                    onChange={(e) => setFindingForm({ ...findingForm, title: e.target.value })}
                    className="w-full p-2.5 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-body-sm font-semibold text-secondary dark:text-slate-300 mb-1">
                      {t("findings.form.severity")}
                    </label>
                    <select
                      value={findingForm.severity}
                      onChange={(e) => setFindingForm({ ...findingForm, severity: e.target.value })}
                      className="w-full px-3 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none"
                      title={t("findings.form.severity")}
                      aria-label={t("findings.form.severity")}
                    >
                      <option value="Critical">{t("findings.severity.critical", "Critical")}</option>
                      <option value="High">{t("findings.severity.high", "High")}</option>
                      <option value="Medium">{t("findings.severity.medium", "Medium")}</option>
                      <option value="Low">{t("findings.severity.low", "Low")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-body-sm font-semibold text-secondary dark:text-slate-300 mb-1">
                      {t("findings.form.controlId")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("findings.form.controlIdPlaceholder")}
                      value={findingForm.control_id}
                      onChange={(e) => setFindingForm({ ...findingForm, control_id: e.target.value })}
                      className="w-full p-2.5 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-body-sm font-semibold text-secondary dark:text-slate-300 mb-1">
                    {t("findings.form.recommendation")}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={t("findings.form.recommendationPlaceholder")}
                    value={findingForm.recommendation}
                    onChange={(e) => setFindingForm({ ...findingForm, recommendation: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-semibold text-secondary dark:text-slate-300 mb-1">
                    {t("findings.form.status")}
                  </label>
                  <select
                    value={findingForm.status}
                    onChange={(e) => setFindingForm({ ...findingForm, status: e.target.value })}
                    className="w-full px-3 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none"
                    title={t("findings.form.status")}
                    aria-label={t("findings.form.status")}
                  >
                    <option value="Open">{t("findings.form.statusOpen")}</option>
                    <option value="Closed">{t("findings.form.statusClosed")}</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <Button variant="secondary" onClick={() => setIsFindingModalOpen(false)}>
                    {t("findings.modal.cancel")}
                  </Button>
                  <Button type="submit">
                    {editingFinding ? t("findings.modal.saveChanges") : t("findings.modal.createFinding", "Record Finding")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- MODAL: ADD/EDIT CAPA --- */}
        {isCapaModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden flex flex-col animate-scaleIn">
              <div className="p-4 border-b border-surface-border dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-headline-sm font-bold text-primary dark:text-slate-100 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  {editingCapa 
                    ? t("capa.modal.editTitle", { capaId: editingCapa.capa_id }) 
                    : t("capa.modal.createTitle")
                  }
                </h3>
                <button
                  onClick={() => setIsCapaModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"
                  title="Close"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCapa} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-body-sm font-semibold text-secondary dark:text-slate-300 mb-1">
                      {t("capa.form.capaId")}
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!editingCapa}
                      placeholder={t("capa.form.capaIdPlaceholder")}
                      value={capaForm.capa_id}
                      onChange={(e) => setCapaForm({ ...capaForm, capa_id: e.target.value })}
                      className="w-full p-2.5 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-body-sm font-semibold text-secondary dark:text-slate-300 mb-1">
                      {t("capa.form.findingId")}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t("capa.form.findingIdPlaceholder")}
                      value={capaForm.finding_id}
                      onChange={(e) => setCapaForm({ ...capaForm, finding_id: e.target.value })}
                      className="w-full p-2.5 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-body-sm font-semibold text-secondary dark:text-slate-300 mb-1">
                    {t("capa.form.title")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t("capa.form.titlePlaceholder")}
                    value={capaForm.title}
                    onChange={(e) => setCapaForm({ ...capaForm, title: e.target.value })}
                    className="w-full p-2.5 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-semibold text-secondary dark:text-slate-300 mb-1">
                    {t("capa.form.rootCause")}
                  </label>
                  <textarea
                    rows={2}
                    placeholder={t("capa.form.rootCausePlaceholder")}
                    value={capaForm.root_cause}
                    onChange={(e) => setCapaForm({ ...capaForm, root_cause: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-semibold text-secondary dark:text-slate-300 mb-1">
                    {t("capa.form.action")}
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder={t("capa.form.actionPlaceholder")}
                    value={capaForm.action}
                    onChange={(e) => setCapaForm({ ...capaForm, action: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-body-sm font-semibold text-secondary dark:text-slate-300 mb-1">
                      {t("capa.form.owner")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("capa.form.ownerPlaceholder")}
                      value={capaForm.owner}
                      onChange={(e) => setCapaForm({ ...capaForm, owner: e.target.value })}
                      className="w-full p-2.5 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-body-sm font-semibold text-secondary dark:text-slate-300 mb-1">
                      {t("capa.form.dueDate")}
                    </label>
                    <input
                      type="date"
                      value={capaForm.due_date}
                      onChange={(e) => setCapaForm({ ...capaForm, due_date: e.target.value })}
                      className="w-full p-2.5 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none"
                      title={t("capa.form.dueDate")}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-body-sm font-semibold text-secondary dark:text-slate-300 mb-1">
                    {t("capa.form.status")}
                  </label>
                  <select
                    value={capaForm.status}
                    onChange={(e) => setCapaForm({ ...capaForm, status: e.target.value })}
                    className="w-full px-3 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none"
                    title={t("capa.form.status")}
                    aria-label={t("capa.form.status")}
                  >
                    <option value="Open">{t("capa.form.statusOpen")}</option>
                    <option value="Resolved">{t("capa.form.statusResolved")}</option>
                    <option value="Closed">{t("capa.form.statusClosed")}</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <Button variant="secondary" onClick={() => setIsCapaModalOpen(false)}>
                    {t("capa.modal.cancel")}
                  </Button>
                  <Button type="submit">
                    {editingCapa ? t("capa.modal.saveChanges") : t("capa.modal.initiate")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* INSPECTOR MODAL */}
        {selectedDetails && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg shadow-xl max-w-lg w-full overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-surface-border dark:border-slate-800 flex items-center justify-between">
                <h4 className="text-headline-sm font-bold text-primary dark:text-slate-100 flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-primary dark:text-slate-200" />
                  {t("audits.inspector.title")}
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
                <Button onClick={() => setSelectedDetails(null)}>{t("audits.inspector.close")}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
