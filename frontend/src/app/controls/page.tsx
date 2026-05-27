"use client";

import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/templates/PageLayout";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { useAuthStore } from "@/context/AuthStore";
import { controlsService, Control, Evidence } from "@/services/controls";
import { cn } from "@/utils/cn";
import {
  ShieldCheck,
  Search,
  UploadCloud,
  FileText,
  Download,
  X,
  Clock,
  AlertCircle,
  FileCheck,
  CheckCircle,
  Circle,
  Info,
  Building,
  User as UserIcon,
  Calendar,
} from "lucide-react";

export default function ControlsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const isReadOnly = user?.role === "Viewer";

  // State Management
  const [activeFramework, setActiveFramework] = useState<string>("SOC2");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  
  // File Upload State
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Controls
  const { data: controls = [], isLoading: isControlsLoading } = useQuery<Control[]>({
    queryKey: ["controls"],
    queryFn: () => controlsService.getControls(),
  });

  // 2. Fetch Evidence for Selected Control
  const { data: evidence = [], isLoading: isEvidenceLoading } = useQuery<Evidence[]>({
    queryKey: ["evidence", selectedControl?.control_id],
    queryFn: () => {
      if (!selectedControl) return Promise.resolve([]);
      return controlsService.getEvidence(selectedControl.control_id);
    },
    enabled: !!selectedControl,
  });

  // 3. Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ controlId, status }: { controlId: string; status: string }) =>
      controlsService.updateControl(controlId, { status }),
    onSuccess: (updatedControl) => {
      queryClient.invalidateQueries({ queryKey: ["controls"] });
      if (selectedControl?.control_id === updatedControl.control_id) {
        setSelectedControl(updatedControl);
      }
    },
    onError: (err: any) => {
      alert(err.message || "Failed to update control status");
    },
  });

  // 4. Upload Evidence Mutation
  const uploadMutation = useMutation({
    mutationFn: ({ controlId, file }: { controlId: string; file: File }) =>
      controlsService.uploadEvidence(controlId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidence", selectedControl?.control_id] });
      setUploadSuccess(true);
      setUploadError(null);
      setIsUploading(false);
      setTimeout(() => setUploadSuccess(false), 3000);
    },
    onError: (err: any) => {
      setUploadError(err.message || "Failed to upload file");
      setIsUploading(false);
    },
  });

  // Actions
  const handleStatusChange = (controlId: string, newStatus: string) => {
    updateStatusMutation.mutate({ controlId, status: newStatus });
  };

  const handleFileValidationAndUpload = (file: File) => {
    if (!selectedControl) return;
    setUploadError(null);
    setUploadSuccess(false);

    // 1. Check size limit (< 1MB)
    if (file.size > 1024 * 1024) {
      setUploadError("File too large. Maximum size allowed is 1MB.");
      return;
    }

    // 2. Check file type extension
    const allowedExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".csv"];
    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      setUploadError("Invalid file type. Supported formats: PDF, PNG, JPG, CSV.");
      return;
    }

    setIsUploading(true);
    uploadMutation.mutate({ controlId: selectedControl.control_id, file });
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileValidationAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileValidationAndUpload(e.target.files[0]);
    }
  };

  const handleDownload = async (evidenceItem: Evidence) => {
    try {
      await controlsService.downloadEvidence(
        evidenceItem.control_id,
        evidenceItem.evidence_id,
        evidenceItem.file_name
      );
    } catch (err: any) {
      alert(err.message || "Failed to download file");
    }
  };

  // Stats / KPIs
  const currentFrameworkControls = controls.filter(
    (c) => c.framework.toLowerCase() === activeFramework.toLowerCase()
  );
  
  const totalCount = currentFrameworkControls.length;
  const implementedCount = currentFrameworkControls.filter((c) => c.status === "Implemented").length;
  const inProgressCount = currentFrameworkControls.filter((c) => c.status === "In Progress").length;
  const notStartedCount = currentFrameworkControls.filter((c) => c.status === "Not Started").length;
  
  const complianceScore = totalCount > 0 ? Math.round((implementedCount / totalCount) * 100) : 0;

  // Filtered List
  const filteredControls = currentFrameworkControls.filter((c) => {
    const matchesSearch =
      c.control_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.owner && c.owner.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.company_control && c.company_control.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "All" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Implemented":
        return (
          <Badge variant="success" className="capitalize">
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            {t("controls.stats.implemented")}
          </Badge>
        );
      case "In Progress":
        return (
          <Badge variant="warning" className="capitalize">
            <Clock className="w-3.5 h-3.5 mr-1 animate-pulse" />
            {t("controls.stats.inProgress")}
          </Badge>
        );
      default:
        return (
          <Badge variant="danger" className="capitalize">
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            {t("controls.stats.notStarted")}
          </Badge>
        );
    }
  };

  const breadcrumbs = [{ label: "Controls", href: "/controls" }, { label: "Compliance Dashboard" }];

  return (
    <PageLayout breadcrumbs={breadcrumbs} title="Compliance Dashboard">
      <div className="space-y-6">
        {/* KPI Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm text-left col-span-1 md:col-span-2 flex items-center justify-between">
            <div>
              <p className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">
                {t("controls.stats.score")}
              </p>
              <p className="text-display-lg font-bold mt-1 text-primary dark:text-slate-100">
                {complianceScore}%
              </p>
            </div>
            {/* Progress Circular Bar */}
            <div className="relative w-16 h-16">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  className="stroke-slate-100 dark:stroke-slate-800 fill-none"
                  strokeWidth="6"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  className="stroke-success-emerald fill-none transition-all duration-500 ease-out"
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - complianceScore / 100)}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-success-emerald" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm text-left">
            <p className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">
              {t("controls.stats.total")}
            </p>
            <p className="text-display-lg font-bold mt-1 text-primary dark:text-slate-100">{totalCount}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm text-left">
            <p className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider text-emerald-600 dark:text-emerald-500">
              {t("controls.stats.implemented")}
            </p>
            <p className="text-display-lg font-bold mt-1 text-success-emerald">{implementedCount}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm text-left">
            <p className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider text-amber-600 dark:text-amber-500">
              {t("controls.stats.inProgress")}
            </p>
            <p className="text-display-lg font-bold mt-1 text-warning-amber">{inProgressCount}</p>
          </div>
        </div>

        {/* Tab System for Regulatory Frameworks */}
        <div className="flex border-b border-surface-border dark:border-slate-800 gap-6">
          {["SOC2", "ISO27001", "PCI-DSS"].map((fw) => (
            <button
              key={fw}
              onClick={() => {
                setActiveFramework(fw);
                setStatusFilter("All");
              }}
              className={cn(
                "pb-3.5 text-body-md font-semibold relative transition-colors duration-150 focus:outline-none",
                activeFramework === fw
                  ? "text-primary dark:text-slate-100 font-bold border-b-2 border-primary dark:border-slate-100"
                  : "text-secondary dark:text-slate-400 hover:text-primary dark:hover:text-slate-200"
              )}
            >
              {fw === "SOC2" ? "SOC 2" : fw === "ISO27001" ? "ISO 27001" : "PCI-DSS"}
            </button>
          ))}
        </div>

        {/* Controls Listing Table */}
        <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
          {/* Filters & Actions */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-surface-border dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("controls.searchPlaceholder")}
                className="w-full pl-9 pr-3 py-1.5 h-9 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <label htmlFor="status-filter" className="text-body-sm font-semibold text-secondary dark:text-slate-300 whitespace-nowrap">
                Filter Status:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 h-9 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm text-primary dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="All">All Statuses</option>
                <option value="Implemented">{t("controls.stats.implemented")}</option>
                <option value="In Progress">{t("controls.stats.inProgress")}</option>
                <option value="Not Started">{t("controls.stats.notStarted")}</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {isControlsLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-primary dark:border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-body-sm text-secondary dark:text-slate-400">{t("controls.loading")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto table-scroll">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-surface-border dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-label-caps text-secondary dark:text-slate-400">
                    <th className="py-2.5 px-4">{t("controls.table.id")}</th>
                    <th className="py-2.5 px-4">{t("controls.table.description")}</th>
                    <th className="py-2.5 px-4">{t("controls.table.status")}</th>
                    <th className="py-2.5 px-4">{t("controls.table.owner")}</th>
                    <th className="py-2.5 px-4">{t("controls.table.lastReviewed")}</th>
                    <th className="py-2.5 px-4 text-right">{t("controls.table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border dark:divide-slate-800 text-body-sm text-primary dark:text-slate-200">
                  {filteredControls.length > 0 ? (
                    filteredControls.map((control) => (
                      <tr key={control.control_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-data-mono">{control.control_id}</td>
                        <td className="py-3.5 px-4 max-w-sm truncate" title={control.description}>
                          {control.description}
                        </td>
                        <td className="py-3.5 px-4">
                          {!isReadOnly ? (
                            <select
                              value={control.status}
                              onChange={(e) => handleStatusChange(control.control_id, e.target.value)}
                              className="px-2 py-0.5 border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-900 text-body-sm rounded focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                              aria-label={`Change status for ${control.control_id}`}
                            >
                              <option value="Not Started">{t("controls.stats.notStarted")}</option>
                              <option value="In Progress">{t("controls.stats.inProgress")}</option>
                              <option value="Implemented">{t("controls.stats.implemented")}</option>
                            </select>
                          ) : (
                            getStatusBadge(control.status)
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-secondary dark:text-slate-400 truncate max-w-[120px]" title={control.owner || ""}>
                          {control.owner || "Unassigned"}
                        </td>
                        <td className="py-3.5 px-4 text-secondary dark:text-slate-400 font-mono text-data-mono">
                          {control.last_reviewed || "Never"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<FileText className="w-3.5 h-3.5" />}
                            onClick={() => {
                              setUploadError(null);
                              setUploadSuccess(false);
                              setSelectedControl(control);
                            }}
                          >
                            {t("controls.table.manage")}
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-secondary dark:text-slate-400">
                        {t("controls.table.noControls")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MANAGE CONTROL & EVIDENCE MODAL */}
      {selectedControl && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg shadow-xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-surface-border dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
              <h4 className="text-headline-sm font-bold text-primary dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-success-emerald" />
                {t("controls.modal.title", { controlId: selectedControl.control_id })}
              </h4>
              <button
                onClick={() => setSelectedControl(null)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-left">
              {/* Properties */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/20 p-3.5 rounded border border-surface-border dark:border-slate-800/40">
                <div>
                  <span className="text-body-xs font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider block">
                    {t("controls.modal.framework")}
                  </span>
                  <span className="text-body-sm font-bold text-primary dark:text-slate-200">
                    {selectedControl.framework}
                  </span>
                </div>
                <div>
                  <span className="text-body-xs font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider block">
                    {t("controls.table.status")}
                  </span>
                  <span className="mt-1 block">{getStatusBadge(selectedControl.status)}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <span className="text-body-xs font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider block mb-1">
                  {t("controls.table.description")}
                </span>
                <p className="text-body-sm text-primary dark:text-slate-200 leading-relaxed">
                  {selectedControl.description}
                </p>
              </div>

              {/* Policy Mapping */}
              {selectedControl.company_control && (
                <div>
                  <span className="text-body-xs font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider block mb-1">
                    {t("controls.modal.policy")}
                  </span>
                  <p className="text-body-sm text-primary dark:text-slate-300 bg-slate-50 dark:bg-slate-800/30 p-3 rounded italic border-l-2 border-primary dark:border-slate-600">
                    {selectedControl.company_control}
                  </p>
                </div>
              )}

              {/* Evidence Required */}
              {selectedControl.evidence_required && (
                <div>
                  <span className="text-body-xs font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider block mb-1">
                    {t("controls.modal.evidenceRequired")}
                  </span>
                  <p className="text-body-sm text-secondary dark:text-slate-400">
                    {selectedControl.evidence_required}
                  </p>
                </div>
              )}

              {/* List of Evidence */}
              <div className="border-t border-surface-border dark:border-slate-800 pt-4">
                <span className="text-body-xs font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider block mb-3">
                  {t("controls.modal.uploadedEvidence")}
                </span>

                {isEvidenceLoading ? (
                  <div className="py-4 text-center">
                    <div className="w-5 h-5 border-2 border-primary dark:border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : evidence.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {evidence.map((item) => (
                      <div
                        key={item.evidence_id}
                        className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 border border-surface-border dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-body-sm font-semibold truncate text-primary dark:text-slate-200" title={item.file_name}>
                              {item.file_name}
                            </p>
                            <p className="text-[10px] text-secondary dark:text-slate-400">
                              By {item.uploaded_by} on {new Date(item.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Download className="w-3.5 h-3.5" />}
                          onClick={() => handleDownload(item)}
                        >
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-body-sm text-secondary dark:text-slate-500 py-3 text-center border border-dashed border-surface-border dark:border-slate-800 rounded">
                    {t("controls.modal.noEvidence")}
                  </p>
                )}
              </div>

              {/* Upload Dropzone */}
              <div className="border-t border-surface-border dark:border-slate-800 pt-4">
                <span className="text-body-xs font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider block mb-3">
                  {t("controls.modal.uploadTitle")}
                </span>

                {isReadOnly ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-warning-amber dark:text-amber-400 p-3 rounded text-body-sm flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    {t("controls.modal.viewerWarning")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-2",
                        dragActive
                          ? "border-primary dark:border-white bg-slate-50 dark:bg-slate-800/40"
                          : "border-surface-border dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                      )}
                    >
                      <UploadCloud className="w-8 h-8 text-slate-450" />
                      <p className="text-body-sm text-secondary dark:text-slate-300 font-medium">
                        {t("controls.modal.uploadText")}
                      </p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.csv"
                      />
                    </div>

                    {uploadError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-danger-rose dark:text-rose-400 p-3 rounded text-body-sm">
                        {uploadError}
                      </div>
                    )}

                    {uploadSuccess && (
                      <div className="bg-emerald-550/10 border border-emerald-500/20 text-success-emerald p-3 rounded text-body-sm font-semibold">
                        {t("controls.modal.uploadSuccess")}
                      </div>
                    )}

                    {isUploading && (
                      <div className="flex items-center justify-center gap-2 text-body-sm text-secondary dark:text-slate-400 py-2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Uploading file...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-surface-border dark:border-slate-800 flex items-center justify-end bg-slate-50 dark:bg-slate-900/60">
              <Button onClick={() => setSelectedControl(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
