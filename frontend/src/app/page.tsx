"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PageLayout } from "@/components/templates/PageLayout";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { dashboardService } from "@/services/dashboard";
import { useAuthStore } from "@/context/AuthStore";
import { cn } from "@/utils/cn";
import dynamic from "next/dynamic";

const ChartLoader = ({ messageKey }: { messageKey: string }) => {
  const { t } = useTranslation();
  return (
    <div className="h-full flex items-center justify-center text-body-sm text-secondary animate-pulse">
      {t(messageKey)}
    </div>
  );
};

const ComplianceBarChart = dynamic(
  () => import("@/components/atoms/ComplianceBarChart"),
  { ssr: false, loading: () => <ChartLoader messageKey="dashboard.loadingComplianceChart" /> }
);

const RiskDonutChart = dynamic(
  () => import("@/components/atoms/RiskDonutChart"),
  { ssr: false, loading: () => <ChartLoader messageKey="dashboard.loadingRiskProfile" /> }
);
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  TrendingUp,
  Activity,
  FileText,
  AlertCircle,
} from "lucide-react";

// Safe helper function to resolve severity color mapping without prototype-vulnerable bracket lookup
const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case "Critical":
      return "#E11D48"; // rose-600
    case "High":
      return "#F97316";     // orange-500
    case "Medium":
      return "#F59E0B";   // amber-500
    case "Low":
      return "#10B981";      // emerald-500
    default:
      return "#64748B";      // slate-500
  }
};

export default function Home() {
  const { user } = useAuthStore();
  const { t } = useTranslation();

  // Fetch Dashboard Summary
  const { data: summary, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => dashboardService.getSummary(),
    refetchInterval: 30000, // auto-refresh every 30s
  });

  // Action: Export Risks Register (CSV)
  const handleExportRisks = async () => {
    try {
      const blob = await dashboardService.downloadRisksCsv();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "risk_register_export.csv");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert(err.message || "Failed to download risks CSV");
    }
  };

  // Action: Export CAPA Tracker (CSV)
  const handleExportCapas = async () => {
    try {
      const blob = await dashboardService.downloadCapasCsv();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "capa_tracker_export.csv");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert(err.message || "Failed to download CAPAs CSV");
    }
  };

  const breadcrumbs = [{ label: t("dashboard.title"), href: "/" }];

  if (isLoading) {
    return (
      <PageLayout breadcrumbs={breadcrumbs} title={t("dashboard.title")}>
        <div className="py-32 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-primary dark:border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-body-md text-secondary dark:text-slate-405 font-medium animate-pulse">
            {t("dashboard.loading")}
          </p>
        </div>
      </PageLayout>
    );
  }

  if (isError || !summary) {
    return (
      <PageLayout breadcrumbs={breadcrumbs} title={t("dashboard.title")}>
        <div className="py-20 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-rose-500/10 text-danger-rose dark:text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/20 shadow-inner">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-headline-sm font-bold text-primary dark:text-slate-100">
            {t("dashboard.error.title")}
          </h3>
          <p className="text-body-sm text-secondary dark:text-slate-400">
            {(error as any)?.message || t("dashboard.error.default")}
          </p>
          <Button onClick={() => window.location.reload()} variant="primary">
            {t("dashboard.error.retry")}
          </Button>
        </div>
      </PageLayout>
    );
  }

  // Format Recharts Data (with translated severity names for tooltip display)
  const riskSeverityData = Object.entries(summary.risks_by_severity || {})
    .map(([name, value]) => ({
      name: t(`findings.severity.${name.toLowerCase()}`),
      rawName: name,
      value,
    }))
    .filter((item) => item.value > 0);

  const complianceFrameworkData = Object.entries(summary.controls_by_framework || {}).map(
    ([framework, metrics]) => ({
      name: framework === "SOC2" ? "SOC 2" : framework === "ISO27001" ? "ISO 27001" : framework,
      complianceScore: metrics.compliance_score,
      implemented: metrics.implemented,
      total: metrics.total,
    })
  );

  const incidentStatusData = Object.entries(summary.incidents_by_status || {})
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0);

  // SLA MTTR Alert Level
  const isHighMttr = summary.avg_mttr_minutes > 120; // SLA MTTR is typically 2 hours

  return (
    <PageLayout breadcrumbs={breadcrumbs} title={t("dashboard.title")}>
      <div className="space-y-8">
        
        {/* Header Summary & CSV Exports */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/40 dark:to-slate-800/20 border border-surface-border dark:border-slate-800/80 p-5 rounded-xl shadow-sm">
          <div>
            <h2 className="text-headline-sm font-bold text-primary dark:text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" />
              {t("dashboard.healthOverview")}
            </h2>
            <p className="text-body-sm text-secondary dark:text-slate-400">
              {t("dashboard.metricsForTenant")}{" "}
              <span className="font-semibold text-primary dark:text-slate-200 font-mono">
                {user?.tenant_id}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExportRisks}
              size="sm"
            >
              {t("dashboard.exportRisks")}
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExportCapas}
              size="sm"
            >
              {t("dashboard.exportCapas")}
            </Button>
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          
          {/* Card 1: Compliance Score */}
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-xl p-5 shadow-sm hover:translate-y-[-2px] transition-all duration-300 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-body-xs font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">
                {t("dashboard.overallCompliance")}
              </p>
              <p className="text-display-md font-bold text-primary dark:text-slate-100">
                {summary.compliance_score}%
              </p>
              <p className="text-body-xs text-secondary dark:text-slate-400">
                {t("dashboard.controlsActive", {
                  implemented: summary.implemented_controls_count,
                  total: summary.total_controls_count,
                })}
              </p>
            </div>
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  className="stroke-slate-100 dark:stroke-slate-800 fill-none"
                  strokeWidth="5"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  className="stroke-emerald-500 fill-none transition-all duration-500 ease-out"
                  strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - summary.compliance_score / 100)}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </div>

          {/* Card 2: Risk Profile */}
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-xl p-5 shadow-sm hover:translate-y-[-2px] transition-all duration-300 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-body-xs font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">
                {t("dashboard.activeRiskRegister")}
              </p>
              <p className="text-display-md font-bold text-primary dark:text-slate-100">
                {summary.open_risks_count}{" "}
                <span className="text-body-md font-normal text-secondary dark:text-slate-500">
                  {t("dashboard.open")}
                </span>
              </p>
              <div className="flex items-center gap-1.5 text-body-xs text-secondary dark:text-slate-400">
                <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
                <span>{t("dashboard.avgRiskScore")}</span>
                <span className="font-bold text-primary dark:text-slate-200 font-mono">
                  {summary.avg_risk_score}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Incidents Tracker */}
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-xl p-5 shadow-sm hover:translate-y-[-2px] transition-all duration-300 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-body-xs font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">
                {t("dashboard.activeIncidents")}
              </p>
              <p className="text-display-md font-bold text-primary dark:text-slate-100">
                {summary.active_incidents_count}{" "}
                <span className="text-body-md font-normal text-secondary dark:text-slate-550">
                  {t("dashboard.active")}
                </span>
              </p>
              <p className="text-body-xs text-secondary dark:text-slate-400">
                {t("dashboard.incidentsSummary", {
                  open: summary.open_incidents_count,
                  total: summary.total_incidents_count,
                })}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          {/* Card 4: CAPA Items */}
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-xl p-5 shadow-sm hover:translate-y-[-2px] transition-all duration-300 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-body-xs font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">
                {t("dashboard.correctiveActions")}
              </p>
              <p className="text-display-md font-bold text-primary dark:text-slate-100">
                {summary.open_capas_count}{" "}
                <span className="text-body-md font-normal text-secondary dark:text-slate-500">
                  {t("dashboard.open")}
                </span>
              </p>
              <p className="text-body-xs text-secondary dark:text-slate-400">
                {t("dashboard.capasSummary", {
                  total: summary.total_capas_count,
                  open: summary.open_findings_count,
                })}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
              <FileText className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* Main Charts & Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart 1: Framework Compliance Score (Bar Chart) */}
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-xl p-5 shadow-sm lg:col-span-2 flex flex-col justify-between min-h-[350px]">
            <div>
              <h3 className="text-body-sm font-bold text-primary dark:text-slate-200">
                {t("dashboard.complianceByFramework")}
              </h3>
              <p className="text-body-xs text-secondary dark:text-slate-400 mb-4">
                {t("dashboard.complianceDescription")}
              </p>
            </div>
            <div className="h-60 w-full">
              {complianceFrameworkData.length > 0 ? (
                <ComplianceBarChart data={complianceFrameworkData} scoreLabel={t("controls.stats.score")} />
              ) : (
                <div className="h-full flex items-center justify-center text-body-sm text-secondary dark:text-slate-500">
                  {t("dashboard.noFrameworks")}
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Risk Profile Severity Distribution (Donut Chart) */}
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[350px]">
            <div>
              <h3 className="text-body-sm font-bold text-primary dark:text-slate-200">
                {t("dashboard.riskSeverityProfile")}
              </h3>
              <p className="text-body-xs text-secondary dark:text-slate-400 mb-4">
                {t("dashboard.riskSeverityDescription")}
              </p>
            </div>
            <div className="h-44 w-full relative flex items-center justify-center">
              {riskSeverityData.length > 0 ? (
                <>
                  <RiskDonutChart data={riskSeverityData} getSeverityColor={getSeverityColor} />
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-body-xs font-semibold text-secondary dark:text-slate-400">
                      {t("dashboard.totalRisks")}
                    </span>
                    <span className="text-headline-md font-bold text-primary dark:text-slate-100">
                      {summary.total_risks_count}
                    </span>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-body-sm text-secondary dark:text-slate-500">
                  {t("dashboard.noRisks")}
                </div>
              )}
            </div>
            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-surface-border dark:border-slate-850 text-body-xs">
              {Object.entries(summary.risks_by_severity || {}).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getSeverityColor(key) }}
                  />
                  <span className="text-secondary dark:text-slate-400 truncate capitalize">
                    {t(`findings.severity.${key.toLowerCase()}`)}:
                  </span>
                  <span className="font-semibold text-primary dark:text-slate-200 font-mono">
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Second Level Insights: Incidents MTTR/MTTD & Recent SLA Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* SLA Performance and MTTD / MTTR Metrics */}
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-xl p-5 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="text-body-sm font-bold text-primary dark:text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              {t("dashboard.slaPerformance")}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* MTTD Card */}
              <div className="bg-slate-50 dark:bg-slate-800/20 border border-surface-border dark:border-slate-800 p-4 rounded-lg flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-body-xs font-semibold text-secondary dark:text-slate-400 uppercase">
                    {t("dashboard.mttd")}
                  </p>
                  <p className="text-headline-sm font-bold text-primary dark:text-slate-100 font-mono text-data-mono">
                    {summary.avg_mttd_minutes}{" "}
                    <span className="text-body-xs font-normal text-secondary dark:text-slate-550">
                      {t("dashboard.mins")}
                    </span>
                  </p>
                </div>
              </div>

              {/* MTTR Card */}
              <div className={cn(
                "border p-4 rounded-lg flex items-center gap-4 transition-colors",
                isHighMttr
                  ? "bg-rose-500/5 border-rose-500/25"
                  : "bg-slate-50 dark:bg-slate-800/20 border-surface-border dark:border-slate-800"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  isHighMttr
                    ? "bg-rose-500/10 text-danger-rose"
                    : "bg-emerald-500/10 text-emerald-500"
                )}>
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-body-xs font-semibold text-secondary dark:text-slate-400 uppercase">
                    {t("dashboard.mttr")}
                  </p>
                  <p className="text-headline-sm font-bold text-primary dark:text-slate-100 font-mono text-data-mono flex items-center gap-1.5">
                    {summary.avg_mttr_minutes}{" "}
                    <span className="text-body-xs font-normal text-secondary dark:text-slate-550">
                      {t("dashboard.mins")}
                    </span>
                    {isHighMttr && (
                      <Badge variant="danger" size="sm" className="font-sans font-bold">
                        {t("dashboard.slaBreach")}
                      </Badge>
                    )}
                  </p>
                </div>
              </div>

            </div>

            <div className="border-t border-surface-border dark:border-slate-800 pt-3 flex flex-col sm:flex-row justify-between text-body-xs text-secondary dark:text-slate-400 gap-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>{t("dashboard.mttdTarget")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>{t("dashboard.mttrTarget")}</span>
              </div>
            </div>
          </div>

          {/* Incidents Status Chart / Distribution */}
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <h3 className="text-body-sm font-bold text-primary dark:text-slate-200">
                {t("dashboard.incidentLifecycle")}
              </h3>
              <p className="text-body-xs text-secondary dark:text-slate-400 mb-2">
                {t("dashboard.incidentLifecycleDescription")}
              </p>
            </div>
            
            <div className="space-y-2.5">
              {incidentStatusData.length > 0 ? (
                incidentStatusData.map((item) => {
                  const percentage = summary.total_incidents_count > 0 
                    ? Math.round((item.value / summary.total_incidents_count) * 100)
                    : 0;
                  
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-body-xs font-medium">
                        <span className="text-primary dark:text-slate-350">{item.name}</span>
                        <span className="text-secondary dark:text-slate-450 font-mono">
                          {item.value} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            item.name === "Open" ? "bg-red-500" :
                            item.name === "Contained" ? "bg-amber-500" :
                            item.name === "Resolved" ? "bg-blue-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-body-xs text-secondary dark:text-slate-500 py-6 text-center italic">
                  {t("dashboard.noIncidents")}
                </p>
              )}
            </div>
          </div>

        </div>

      </div>
    </PageLayout>
  );
}
