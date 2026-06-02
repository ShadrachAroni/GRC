"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageLayout } from "@/components/templates/PageLayout";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { Input } from "@/components/atoms/Input";
import { RiskHeatMap } from "@/components/molecules/RiskHeatMap";
import { risksService, Risk, RiskCreatePayload } from "@/services/risks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/context/AuthStore";
import { useNotification } from "@/context/NotificationContext";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle,
  X,
  FileText,
  User as UserIcon,
  Calendar,
  Building,
} from "lucide-react";
import { z } from "zod";

// Zod validation schemas matching backend bounds
const riskCreateSchema = z.object({
  risk_id: z.string().min(1, "Risk ID is required").regex(/^R-\d+$/, "Risk ID must be in format R-NUMBER (e.g. R-101)"),
  asset: z.string().min(1, "Asset is required"),
  threat: z.string().min(1, "Threat is required"),
  likelihood: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
  mitigation: z.string().optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
  owner: z.string().optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
  review_date: z.string().optional().or(z.literal("")),
});

const riskUpdateSchema = z.object({
  asset: z.string().min(1, "Asset is required"),
  threat: z.string().min(1, "Threat is required"),
  likelihood: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
  mitigation: z.string().optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
  owner: z.string().optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
  review_date: z.string().optional().or(z.literal("")),
});

// Known form field names – used to guard bracket-notation access
const FORM_FIELD_KEYS = new Set([
  "risk_id", "asset", "threat", "likelihood", "impact",
  "mitigation", "status", "owner", "department", "review_date",
]);

const LIKELIHOOD_LABELS: Record<number, string> = {
  1: "Rare", 2: "Unlikely", 3: "Possible", 4: "Likely", 5: "Almost Certain",
};

const IMPACT_LABELS: Record<number, string> = {
  1: "Negligible", 2: "Minor", 3: "Moderate", 4: "Major", 5: "Critical",
};

export default function RisksPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { showToast } = useNotification();
  const isReadOnly = user?.role === "Viewer";

  // Filter States
  const [selectedCell, setSelectedCell] = useState<{ likelihood: number; impact: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);

  // Form Field States
  const [formFields, setFormFields] = useState({
    risk_id: "",
    asset: "",
    threat: "",
    likelihood: 3,
    impact: 3,
    mitigation: "",
    status: "Open",
    owner: "",
    department: "",
    review_date: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // 1. Fetch Risks
  const { data: risks = [], isLoading } = useQuery<Risk[]>({
    queryKey: ["risks"],
    queryFn: () => risksService.getRisks(),
  });

  // 2. Create Risk Mutation
  const createMutation = useMutation({
    mutationFn: (payload: RiskCreatePayload) => risksService.createRisk(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risks"] });
      showToast("Risk created successfully", "success");
      closeModal();
    },
    onError: (err: any) => {
      setApiError(err.message || "Failed to create risk");
      showToast(err.message || "Failed to create risk", "error");
    },
  });

  // 3. Update Risk Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      risksService.updateRisk(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risks"] });
      showToast("Risk updated successfully", "success");
      closeModal();
    },
    onError: (err: any) => {
      setApiError(err.message || "Failed to update risk");
      showToast(err.message || "Failed to update risk", "error");
    },
  });

  // 4. Delete Risk Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => risksService.deleteRisk(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risks"] });
      showToast("Risk deleted successfully", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to delete risk", "error");
    },
  });

  // Handlers
  const openCreateModal = () => {
    setFormFields({
      risk_id: "",
      asset: "",
      threat: "",
      likelihood: 3,
      impact: 3,
      mitigation: "",
      status: "Open",
      owner: "",
      department: "",
      review_date: "",
    });
    setFormErrors({});
    setApiError(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (risk: Risk) => {
    setFormFields({
      risk_id: risk.risk_id,
      asset: risk.asset,
      threat: risk.threat,
      likelihood: risk.likelihood,
      impact: risk.impact,
      mitigation: risk.mitigation || "",
      status: risk.status,
      owner: risk.owner || "",
      department: risk.department || "",
      review_date: risk.review_date || "",
    });
    setFormErrors({});
    setApiError(null);
    setEditingRisk(risk);
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setEditingRisk(null);
  };

  const handleFieldChange = (
    key: string,
    value: string | number
  ) => {
    if (!FORM_FIELD_KEYS.has(key)) return; // guard against unexpected keys
    setFormFields((prev) => ({ ...prev, [key]: value }));
    // Clear validation error dynamically
    if (Object.hasOwn(formErrors, key) && formErrors[key]) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    const isEdit = !!editingRisk;
    const schema = isEdit ? riskUpdateSchema : riskCreateSchema;

    const result = schema.safeParse(formFields);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        const fieldName = err.path[0]?.toString();
        if (fieldName && FORM_FIELD_KEYS.has(fieldName)) {
          fieldErrors[fieldName] = err.message;
        }
      });
      setFormErrors(fieldErrors);
      return;
    }

    const payload = result.data;
    if (isEdit && editingRisk) {
      updateMutation.mutate({ id: editingRisk.risk_id, payload });
    } else {
      createMutation.mutate(payload as RiskCreatePayload);
    }
  };

  const handleDelete = (riskId: string) => {
    if (window.confirm(`Are you sure you want to delete risk '${riskId}'? This action will register in the audit logs.`)) {
      deleteMutation.mutate(riskId);
    }
  };

  // Derived Stats
  const totalRisks = risks.length;
  const criticalCount = risks.filter((r) => r.severity === "Critical").length;
  const highCount = risks.filter((r) => r.severity === "High").length;
  const averageScore =
    totalRisks > 0
      ? (risks.reduce((sum, r) => sum + r.risk_score, 0) / totalRisks).toFixed(1)
      : "0.0";

  // Filtered Risks
  const filteredRisks = risks.filter((r) => {
    const matchesSearch =
      r.risk_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.threat.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.owner && r.owner.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.department && r.department.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCell =
      !selectedCell ||
      (r.likelihood === selectedCell.likelihood && r.impact === selectedCell.impact);

    return matchesSearch && matchesCell;
  });

  const breadcrumbs = [{ label: "Risks", href: "/risks" }, { label: "Register" }];

  return (
    <PageLayout breadcrumbs={breadcrumbs} title="Risk Register">
      <div className="space-y-6">
        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm text-left">
            <p className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">{t('risks.stats.totalRisks')}</p>
            <p className="text-display-lg font-bold mt-1 text-primary dark:text-slate-100">{totalRisks}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm text-left">
            <p className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">{t('risks.stats.criticalRisks')}</p>
            <p className="text-display-lg font-bold mt-1 text-danger-rose flex items-center gap-2">
              {criticalCount}
              {criticalCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-danger-rose animate-ping" />}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm text-left">
            <p className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">{t('risks.stats.highRisks')}</p>
            <p className="text-display-lg font-bold mt-1 text-warning-amber">{highCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm text-left">
            <p className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">{t('risks.stats.averageRiskScore')}</p>
            <p className="text-display-lg font-bold mt-1 text-primary dark:text-slate-100">{averageScore}</p>
          </div>
        </div>

        {/* 5x5 Heat Map */}
        <div className="w-full">
          <RiskHeatMap
            risks={risks}
            selectedCell={selectedCell}
            onCellClick={setSelectedCell}
          />
        </div>

        {/* Risks List & Actions */}
        <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
          {/* Header Actions */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-surface-border dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('risks.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-1.5 h-9 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>

            {!isReadOnly && (
              <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                {t('risks.addRisk')}
              </Button>
            )}
          </div>

          {/* Table Container */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-primary dark:border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-body-sm text-secondary dark:text-slate-400">{t('risks.loading')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto table-scroll">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-surface-border dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-label-caps text-secondary dark:text-slate-400">
                    <th className="py-2.5 px-4">{t('risks.table.riskId')}</th>
                    <th className="py-2.5 px-4">{t('risks.table.asset')}</th>
                    <th className="py-2.5 px-4">{t('risks.table.threat')}</th>
                    <th className="py-2.5 px-4 text-center">{t('risks.table.lxi')}</th>
                    <th className="py-2.5 px-4 text-center">{t('risks.table.score')}</th>
                    <th className="py-2.5 px-4">{t('risks.table.severity')}</th>
                    <th className="py-2.5 px-4">{t('risks.table.owner')}</th>
                    <th className="py-2.5 px-4">{t('risks.table.status')}</th>
                    <th className="py-2.5 px-4 text-right">{t('risks.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border dark:divide-slate-800 text-body-sm text-primary dark:text-slate-200">
                  {filteredRisks.length > 0 ? (
                    filteredRisks.map((risk) => (
                      <tr key={risk.risk_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-data-mono">{risk.risk_id}</td>
                        <td className="py-3 px-4 font-medium">{risk.asset}</td>
                        <td className="py-3 px-4 text-secondary dark:text-slate-400 max-w-xs truncate" title={risk.threat}>
                          {risk.threat}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-data-mono">
                          {risk.likelihood} × {risk.impact}
                        </td>
                        <td className="py-3 px-4 text-center font-bold font-mono text-data-mono">{risk.risk_score}</td>
                        <td className="py-3 px-4">
                          <Badge variant={risk.severity.toLowerCase() as any} size="sm">
                            {risk.severity}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-secondary dark:text-slate-400 truncate max-w-[120px]" title={risk.owner || ""}>
                          {risk.owner || t('risks.table.unassigned')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-semibold capitalize",
                            risk.status === "Open" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                          )}>
                            {risk.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                              onClick={() => openEditModal(risk)}
                              disabled={isReadOnly || (deleteMutation.isPending && deleteMutation.variables === risk.risk_id)}
                            >
                              {t('risks.table.edit')}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-rose-500 border-rose-100 hover:bg-rose-50 dark:border-rose-950/40 dark:hover:bg-rose-950/20"
                              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                              onClick={() => handleDelete(risk.risk_id)}
                              disabled={isReadOnly || (deleteMutation.isPending && deleteMutation.variables === risk.risk_id)}
                              isLoading={deleteMutation.isPending && deleteMutation.variables === risk.risk_id}
                            >
                              {t('risks.table.delete')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-secondary dark:text-slate-400">
                        {totalRisks === 0 ? t('risks.table.noRisks') : t('risks.table.noMatch')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>      {/* CREATE & EDIT MODAL */}
      <AnimatePresence>
        {(isCreateModalOpen || editingRisk) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-surface-border dark:border-slate-800 flex items-center justify-between">
                <h4 className="text-headline-sm font-bold text-primary dark:text-slate-100 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning-amber" />
                  {editingRisk ? t('risks.modal.editTitle', { riskId: editingRisk.risk_id }) : t('risks.modal.createTitle')}
                </h4>
                <button
                  onClick={closeModal}
                  className="p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"
                  title="Close"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                {apiError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-danger-rose dark:text-rose-400 p-3 rounded text-body-sm">
                    {apiError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Risk ID"
                    placeholder="e.g. R-101"
                    value={formFields.risk_id}
                    onChange={(e) => handleFieldChange("risk_id", e.target.value)}
                    error={formErrors.risk_id}
                    disabled={!!editingRisk}
                    helperText="Unique ID format: R-NUMBER"
                    required
                  />

                  <Input
                    label="Compliance Asset"
                    placeholder="e.g. Core Database Server"
                    value={formFields.asset}
                    onChange={(e) => handleFieldChange("asset", e.target.value)}
                    error={formErrors.asset}
                    required
                  />
                </div>

                <Input
                  label="Threat Description"
                  placeholder="Describe the threat (e.g. Unauthorized read access via SQLi)"
                  value={formFields.threat}
                  onChange={(e) => handleFieldChange("threat", e.target.value)}
                  error={formErrors.threat}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  {/* Likelihood Select */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <label
                      htmlFor="likelihood-select"
                      className="text-body-sm font-semibold text-secondary dark:text-slate-300"
                    >
                      {t('risks.form.likelihoodLabel')}
                    </label>
                    <select
                      id="likelihood-select"
                      value={formFields.likelihood}
                      onChange={(e) => handleFieldChange("likelihood", parseInt(e.target.value))}
                      className="w-full px-3 py-1.5 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-md text-body-md text-primary dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {[1, 2, 3, 4, 5].map((val) => (
                        <option key={val} value={val}>
                          {val} - {LIKELIHOOD_LABELS[val]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Impact Select */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <label
                      htmlFor="impact-select"
                      className="text-body-sm font-semibold text-secondary dark:text-slate-300"
                    >
                      {t('risks.form.impactLabel')}
                    </label>
                    <select
                      id="impact-select"
                      value={formFields.impact}
                      onChange={(e) => handleFieldChange("impact", parseInt(e.target.value))}
                      className="w-full px-3 py-1.5 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-md text-body-md text-primary dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {[1, 2, 3, 4, 5].map((val) => (
                        <option key={val} value={val}>
                          {val} - {IMPACT_LABELS[val]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mitigation Textarea */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label
                    htmlFor="mitigation-textarea"
                    className="text-body-sm font-semibold text-secondary dark:text-slate-300"
                  >
                    {t('risks.form.mitigationLabel')}
                  </label>
                  <textarea
                    id="mitigation-textarea"
                    value={formFields.mitigation}
                    onChange={(e) => handleFieldChange("mitigation", e.target.value)}
                    placeholder={t('risks.form.mitigationPlaceholder')}
                    rows={3}
                    className="w-full p-3 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-md text-body-md text-primary dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Risk Owner"
                    placeholder="e.g. Alice Carter"
                    value={formFields.owner}
                    onChange={(e) => handleFieldChange("owner", e.target.value)}
                    leftIcon={<UserIcon className="w-4 h-4" />}
                  />
                  <Input
                    label="Department"
                    placeholder="e.g. Security"
                    value={formFields.department}
                    onChange={(e) => handleFieldChange("department", e.target.value)}
                    leftIcon={<Building className="w-4 h-4" />}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="date"
                    label="Next Review Date"
                    value={formFields.review_date}
                    onChange={(e) => handleFieldChange("review_date", e.target.value)}
                    leftIcon={<Calendar className="w-4 h-4" />}
                  />

                  <div className="flex flex-col gap-1.5 text-left">
                    <label
                      htmlFor="status-select"
                      className="text-body-sm font-semibold text-secondary dark:text-slate-300"
                    >
                      {t('risks.form.statusLabel')}
                    </label>
                    <select
                      id="status-select"
                      value={formFields.status}
                      onChange={(e) => handleFieldChange("status", e.target.value)}
                      className="w-full px-3 py-1.5 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-md text-body-md text-primary dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Open">{t('risks.form.statusOpen')}</option>
                      <option value="Mitigated">{t('risks.form.statusMitigated')}</option>
                    </select>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-surface-border dark:border-slate-800 flex items-center justify-end gap-3 bg-white dark:bg-slate-900">
                  <Button variant="secondary" onClick={closeModal}>
                    {t('risks.modal.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    isLoading={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingRisk ? t('risks.modal.saveChanges') : t('risks.modal.createRisk')}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
