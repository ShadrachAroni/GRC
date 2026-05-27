"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PageLayout } from "@/components/templates/PageLayout";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { Input } from "@/components/atoms/Input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/context/AuthStore";
import { cn } from "@/utils/cn";
import { incidentsService, Incident, IncidentCreatePayload, IncidentUpdatePayload } from "@/services/incidents";
import {
  AlertOctagon,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle,
  X,
  User as UserIcon,
  Calendar,
  Clock,
  ChevronRight,
  MoveRight,
  ShieldAlert,
  ArrowRightLeft,
} from "lucide-react";
import { z } from "zod";

const SLA_LIMITS_MINUTES = {
  Critical: 120, // 2h
  High: 240,     // 4h
  Medium: 480,   // 8h
  Low: 1440,    // 24h
};

// Zod schemas matching backend validations
const incidentCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  severity: z.enum(["Critical", "High", "Medium", "Low"]),
  status: z.enum(["Open", "Contained", "Resolved", "Closed"]).optional(),
  detected_at: z.string().optional().or(z.literal("")),
  resolved_at: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  assigned_to: z.string().optional().or(z.literal("")),
});

const incidentUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  severity: z.enum(["Critical", "High", "Medium", "Low"]).optional(),
  status: z.enum(["Open", "Contained", "Resolved", "Closed"]).optional(),
  detected_at: z.string().optional().or(z.literal("")),
  resolved_at: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  assigned_to: z.string().optional().or(z.literal("")),
});

// Known field names for bracket safety
const INCIDENT_FIELD_KEYS = new Set([
  "title", "severity", "status", "detected_at", "resolved_at", "description", "assigned_to",
]);

const STATUS_LANES: ("Open" | "Contained" | "Resolved" | "Closed")[] = [
  "Open",
  "Contained",
  "Resolved",
  "Closed",
];

const SEVERITY_COLORS = {
  Critical: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50",
  High: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50",
  Medium: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50",
  Low: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-400 border border-slate-200 dark:border-slate-800",
};

// Local datetime conversion helpers
const toDatetimeLocal = (isoStr?: string) => {
  if (!isoStr) return "";
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return "";
  const pad = (num: number) => num.toString().padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const fromDatetimeLocal = (localStr?: string) => {
  if (!localStr) return undefined;
  const date = new Date(localStr);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

export default function IncidentsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const isReadOnly = user?.role === "Viewer";

  const [searchTerm, setSearchTerm] = useState("");
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Drag and drop local states
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);

  // Form States
  const [formFields, setFormFields] = useState({
    title: "",
    severity: "Medium" as "Critical" | "High" | "Medium" | "Low",
    status: "Open" as "Open" | "Contained" | "Resolved" | "Closed",
    detected_at: "",
    resolved_at: "",
    description: "",
    assigned_to: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // SLA clock updates dynamically every 15s to keep warning colors accurate
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  // 1. Query fetch
  const { data: incidents = [], isLoading } = useQuery<Incident[]>({
    queryKey: ["incidents"],
    queryFn: () => incidentsService.getIncidents(),
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: (payload: IncidentCreatePayload) => incidentsService.createIncident(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      closeModal();
    },
    onError: (err: any) => {
      setApiError(err.message || "Failed to register incident");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: IncidentUpdatePayload }) =>
      incidentsService.updateIncident(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      closeModal();
    },
    onError: (err: any) => {
      setApiError(err.message || "Failed to update incident");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => incidentsService.deleteIncident(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to delete incident");
    },
  });

  // Form Handlers
  const openCreateModal = () => {
    setFormFields({
      title: "",
      severity: "Medium",
      status: "Open",
      detected_at: toDatetimeLocal(new Date().toISOString()),
      resolved_at: "",
      description: "",
      assigned_to: "",
    });
    setFormErrors({});
    setApiError(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (inc: Incident) => {
    setFormFields({
      title: inc.title,
      severity: inc.severity,
      status: inc.status,
      detected_at: toDatetimeLocal(inc.detected_at),
      resolved_at: inc.resolved_at ? toDatetimeLocal(inc.resolved_at) : "",
      description: inc.description || "",
      assigned_to: inc.assigned_to || "",
    });
    setFormErrors({});
    setApiError(null);
    setEditingIncident(inc);
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setEditingIncident(null);
  };

  const handleFieldChange = (key: string, value: string) => {
    if (!INCIDENT_FIELD_KEYS.has(key)) return;
    setFormFields((prev) => ({ ...prev, [key]: value }));
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

    const isEdit = !!editingIncident;
    const schema = isEdit ? incidentUpdateSchema : incidentCreateSchema;

    const result = schema.safeParse(formFields);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        const fieldName = err.path[0]?.toString();
        if (fieldName && INCIDENT_FIELD_KEYS.has(fieldName)) {
          fieldErrors[fieldName] = err.message;
        }
      });
      setFormErrors(fieldErrors);
      return;
    }

    const data = result.data;
    const payload: IncidentCreatePayload = {
      title: data.title || "",
      severity: data.severity as any,
      status: data.status as any,
      detected_at: fromDatetimeLocal(data.detected_at),
      resolved_at: data.status === "Resolved" || data.status === "Closed" 
        ? fromDatetimeLocal(data.resolved_at) || new Date().toISOString() 
        : undefined,
      description: data.description || undefined,
      assigned_to: data.assigned_to || undefined,
    };

    if (isEdit && editingIncident) {
      updateMutation.mutate({ id: editingIncident.incident_id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this incident? This action will register in the audit logs.")) {
      deleteMutation.mutate(id);
    }
  };

  // Drag-and-Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: number) => {
    if (isReadOnly) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", id.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    if (isReadOnly) return;
    setDragOverColumn(column);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, column: "Open" | "Contained" | "Resolved" | "Closed") => {
    e.preventDefault();
    setDragOverColumn(null);
    if (isReadOnly) return;
    
    const idStr = e.dataTransfer.getData("text/plain");
    if (!idStr) return;
    const id = parseInt(idStr, 10);
    const inc = incidents.find((i) => i.incident_id === id);
    if (inc && inc.status !== column) {
      updateMutation.mutate({ id, payload: { status: column } });
    }
  };

  // Keyboard accessibility lane-shifting helper
  const handleKeyboardMove = (id: number, targetStatus: "Open" | "Contained" | "Resolved" | "Closed") => {
    updateMutation.mutate({ id, payload: { status: targetStatus } });
  };

  // Helper to determine SLA flag states
  const getSlaStatus = (inc: Incident) => {
    const limit = SLA_LIMITS_MINUTES[inc.severity];
    let elapsedMinutes = 0;
    
    if (inc.status === "Resolved" || inc.status === "Closed") {
      if (inc.mttr_minutes !== undefined && inc.mttr_minutes !== null) {
        elapsedMinutes = inc.mttr_minutes;
      } else if (inc.resolved_at) {
        const resolved = new Date(inc.resolved_at);
        const detected = new Date(inc.detected_at);
        elapsedMinutes = Math.floor((resolved.getTime() - detected.getTime()) / 60000);
      }
    } else {
      const detected = new Date(inc.detected_at);
      elapsedMinutes = Math.floor((currentTime.getTime() - detected.getTime()) / 60000);
    }
    
    const percentage = (elapsedMinutes / limit) * 100;
    if (percentage >= 100) {
      return { 
        type: "breached", 
        text: "SLA Breached", 
        style: "bg-red-500 text-white border-red-600 dark:bg-rose-950/80 dark:text-rose-400 dark:border-rose-800",
        borderStyle: "border-l-4 border-l-red-500 border-red-200 dark:border-red-950/60 dark:border-l-rose-500",
        elapsedMinutes 
      };
    } else if (percentage >= 80) {
      return { 
        type: "warning", 
        text: "SLA Warning", 
        style: "bg-amber-500 text-white border-amber-600 dark:bg-amber-950/80 dark:text-amber-400 dark:border-amber-800",
        borderStyle: "border-l-4 border-l-amber-500 border-amber-200 dark:border-amber-950/60 dark:border-l-amber-500",
        elapsedMinutes 
      };
    } else {
      return { 
        type: "ok", 
        text: "SLA Compliant", 
        style: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
        borderStyle: "border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-800 dark:border-l-emerald-500",
        elapsedMinutes 
      };
    }
  };

  // Mean Metrics Calculators
  const resolvedIncidents = incidents.filter(
    (i) => (i.status === "Resolved" || i.status === "Closed") && i.mttd_minutes !== null && i.mttd_minutes !== undefined
  );
  const totalMttd = resolvedIncidents.reduce((acc, i) => acc + (i.mttd_minutes || 0), 0);
  const meanMttd = resolvedIncidents.length > 0 ? (totalMttd / resolvedIncidents.length).toFixed(1) : "0.0";

  const resolvedMttrIncidents = incidents.filter(
    (i) => (i.status === "Resolved" || i.status === "Closed") && i.mttr_minutes !== null && i.mttr_minutes !== undefined
  );
  const totalMttr = resolvedMttrIncidents.reduce((acc, i) => acc + (i.mttr_minutes || 0), 0);
  const meanMttr = resolvedMttrIncidents.length > 0 ? (totalMttr / resolvedMttrIncidents.length).toFixed(1) : "0.0";

  const activeIncidentsCount = incidents.filter((i) => i.status === "Open" || i.status === "Contained").length;

  // Filter list by search criteria
  const filteredIncidents = incidents.filter((inc) => {
    const term = searchTerm.toLowerCase();
    return (
      inc.title.toLowerCase().includes(term) ||
      (inc.description && inc.description.toLowerCase().includes(term)) ||
      (inc.assigned_to && inc.assigned_to.toLowerCase().includes(term)) ||
      inc.severity.toLowerCase().includes(term)
    );
  });

  const breadcrumbs = [{ label: "Incidents", href: "/incidents" }, { label: "Kanban Board" }];

  return (
    <PageLayout breadcrumbs={breadcrumbs} title="Incident Manager">
      <div className="space-y-6">
        
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm text-left relative overflow-hidden">
            <p className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">
              {t("incidents.stats.total")}
            </p>
            <p className="text-display-lg font-bold mt-1 text-primary dark:text-slate-100">{incidents.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm text-left relative overflow-hidden">
            <p className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">
              {t("incidents.stats.active")}
            </p>
            <p className="text-display-lg font-bold mt-1 text-warning-amber flex items-center gap-2">
              {activeIncidentsCount}
              {activeIncidentsCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-warning-amber animate-ping" />}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm text-left relative overflow-hidden">
            <p className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">
              {t("incidents.stats.mttd")}
            </p>
            <p className="text-display-lg font-bold mt-1 text-primary dark:text-slate-100 font-mono text-data-mono">
              {meanMttd} <span className="text-body-sm font-normal text-secondary dark:text-slate-400">mins</span>
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-5 shadow-sm text-left relative overflow-hidden">
            <p className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">
              {t("incidents.stats.mttr")}
            </p>
            <p className="text-display-lg font-bold mt-1 text-primary dark:text-slate-100 font-mono text-data-mono">
              {meanMttr} <span className="text-body-sm font-normal text-secondary dark:text-slate-400">mins</span>
            </p>
          </div>
        </div>

        {/* Filter bar & Actions */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("incidents.searchPlaceholder")}
              className="w-full pl-9 pr-3 py-1.5 h-9 bg-slate-50 dark:bg-slate-800 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-400"
            />
          </div>

          {!isReadOnly && (
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
              {t("incidents.addIncident")}
            </Button>
          )}
        </div>

        {/* Kanban Board Layout */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-primary dark:border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-body-sm text-secondary dark:text-slate-400">{t("incidents.loading")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-start">
            {STATUS_LANES.map((colStatus) => {
              const laneIncidents = filteredIncidents.filter((i) => i.status === colStatus);
              const isOver = dragOverColumn === colStatus;
              
              return (
                <div
                  key={colStatus}
                  onDragOver={(e) => handleDragOver(e, colStatus)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, colStatus)}
                  className="flex flex-col rounded-lg overflow-hidden border border-surface-border dark:border-slate-800 shadow-sm"
                >
                  {/* Column Header */}
                  <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/60 border-b border-surface-border dark:border-slate-800 flex items-center justify-between">
                    <span className="font-semibold text-body-md text-primary dark:text-slate-200 capitalize">
                      {colStatus}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-200 dark:bg-slate-700 text-secondary dark:text-slate-300">
                      {laneIncidents.length}
                    </span>
                  </div>

                  {/* Drop Lane Container */}
                  <div
                    className={cn(
                      "flex flex-col gap-3 p-3 min-h-[550px] transition-all duration-200",
                      isOver 
                        ? "bg-slate-100/50 dark:bg-slate-800/30 border-2 border-dashed border-primary dark:border-slate-400" 
                        : "bg-slate-50/40 dark:bg-slate-950/20 border-2 border-transparent"
                    )}
                  >
                    {laneIncidents.length > 0 ? (
                      laneIncidents.map((incident) => {
                        const sla = getSlaStatus(incident);
                        return (
                          <div
                            key={incident.incident_id}
                            draggable={!isReadOnly}
                            onDragStart={(e) => handleDragStart(e, incident.incident_id)}
                            className={cn(
                              "bg-white dark:bg-slate-900 p-4 rounded border transition-all duration-150 relative shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md",
                              sla.borderStyle
                            )}
                          >
                            {/* Card Header info */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-mono text-data-mono text-secondary dark:text-slate-400">
                                #{incident.incident_id}
                              </span>
                              
                              <Badge className={cn("text-[10px] px-1.5 py-0.2 capitalize", SEVERITY_COLORS[incident.severity] || "")}>
                                {incident.severity}
                              </Badge>
                            </div>

                            {/* Card Title */}
                            <h5 className="font-bold text-body-md text-primary dark:text-slate-200 text-left line-clamp-2" title={incident.title}>
                              {incident.title}
                            </h5>

                            {/* Card Description */}
                            {incident.description && (
                              <p className="text-body-sm text-secondary dark:text-slate-400 mt-1 line-clamp-2 text-left">
                                {incident.description}
                              </p>
                            )}

                            {/* Assignee / Time */}
                            <div className="flex items-center justify-between text-[11px] text-secondary dark:text-slate-500 mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
                              <div className="flex items-center gap-1">
                                <UserIcon className="w-3 h-3" />
                                <span className="truncate max-w-[90px]">{incident.assigned_to || "Unassigned"}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(incident.detected_at).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* SLA Tag Indicator */}
                            <div className="mt-3 flex items-center justify-between gap-1.5">
                              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded border capitalize", sla.style)}>
                                {sla.text}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {sla.elapsedMinutes}m elapsed
                              </span>
                            </div>

                            {/* Keyboard accessibility lane shifter & Card operations */}
                            <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between">
                              {/* Status Shifter for Keyboard users */}
                              <div className="flex items-center gap-1">
                                <label htmlFor={`move-${incident.incident_id}`} className="sr-only">Move Status</label>
                                <select
                                  id={`move-${incident.incident_id}`}
                                  value={incident.status}
                                  disabled={isReadOnly}
                                  onChange={(e) => handleKeyboardMove(incident.incident_id, e.target.value as any)}
                                  className="text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-secondary dark:text-slate-300"
                                >
                                  {STATUS_LANES.map((lane) => (
                                    <option key={lane} value={lane}>Move to {lane}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Edit & Delete Buttons */}
                              {!isReadOnly && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => openEditModal(incident)}
                                    className="p-1 rounded text-slate-400 hover:text-primary dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Edit"
                                    aria-label="Edit"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(incident.incident_id)}
                                    className="p-1 rounded text-rose-400 hover:text-danger-rose hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                                    title="Delete"
                                    aria-label="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex-1 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded p-6">
                        <span className="text-body-sm text-slate-400 dark:text-slate-600">No items</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE & EDIT DIALOG MODAL */}
      {(isCreateModalOpen || editingIncident) && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 border-b border-surface-border dark:border-slate-800 flex items-center justify-between">
              <h4 className="text-headline-sm font-bold text-primary dark:text-slate-100 flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-warning-amber" />
                {editingIncident 
                  ? t("incidents.modal.editTitle", { incidentId: editingIncident.incident_id }) 
                  : t("incidents.modal.createTitle")}
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

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {apiError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-danger-rose dark:text-rose-400 p-3 rounded text-body-sm">
                  {apiError}
                </div>
              )}

              <Input
                label={t("incidents.form.title")}
                placeholder="e.g. DDOS attacks target gateway"
                value={formFields.title}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                error={formErrors.title}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Severity select */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label htmlFor="severity-select" className="text-body-sm font-semibold text-secondary dark:text-slate-300">
                    {t("incidents.form.severity")}
                  </label>
                  <select
                    id="severity-select"
                    value={formFields.severity}
                    onChange={(e) => handleFieldChange("severity", e.target.value)}
                    className="w-full px-3 py-1.5 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-md text-body-md text-primary dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Critical">Critical (SLA: 2 Hours)</option>
                    <option value="High">High (SLA: 4 Hours)</option>
                    <option value="Medium">Medium (SLA: 8 Hours)</option>
                    <option value="Low">Low (SLA: 24 Hours)</option>
                  </select>
                </div>

                {/* Status select */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label htmlFor="status-select" className="text-body-sm font-semibold text-secondary dark:text-slate-300">
                    {t("incidents.form.status")}
                  </label>
                  <select
                    id="status-select"
                    value={formFields.status}
                    onChange={(e) => handleFieldChange("status", e.target.value)}
                    className="w-full px-3 py-1.5 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-md text-body-md text-primary dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Open">Open</option>
                    <option value="Contained">Contained</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Detected At */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label htmlFor="detected-time" className="text-body-sm font-semibold text-secondary dark:text-slate-300">
                    {t("incidents.form.detectedAt")}
                  </label>
                  <input
                    type="datetime-local"
                    id="detected-time"
                    value={formFields.detected_at}
                    onChange={(e) => handleFieldChange("detected_at", e.target.value)}
                    className="w-full px-3 py-1.5 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-md text-body-md text-primary dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Resolved At */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label htmlFor="resolved-time" className="text-body-sm font-semibold text-secondary dark:text-slate-300">
                    {t("incidents.form.resolvedAt")}
                  </label>
                  <input
                    type="datetime-local"
                    id="resolved-time"
                    disabled={formFields.status !== "Resolved" && formFields.status !== "Closed"}
                    value={formFields.resolved_at}
                    onChange={(e) => handleFieldChange("resolved_at", e.target.value)}
                    className="w-full px-3 py-1.5 h-10 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-md text-body-md text-primary dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <Input
                label={t("incidents.form.assignedTo")}
                placeholder="e.g. Alice Analyst"
                value={formFields.assigned_to}
                onChange={(e) => handleFieldChange("assigned_to", e.target.value)}
                error={formErrors.assigned_to}
                leftIcon={<UserIcon className="w-4 h-4" />}
              />

              {/* Description */}
              <div className="flex flex-col gap-1.5 text-left">
                <label htmlFor="desc-textarea" className="text-body-sm font-semibold text-secondary dark:text-slate-300">
                  {t("incidents.form.description")}
                </label>
                <textarea
                  id="desc-textarea"
                  value={formFields.description}
                  onChange={(e) => handleFieldChange("description", e.target.value)}
                  placeholder="Provide incident logs, target asset names, or remediation details..."
                  rows={4}
                  className="w-full p-3 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-md text-body-md text-primary dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-surface-border dark:border-slate-800 flex items-center justify-end gap-3 bg-white dark:bg-slate-900">
                <Button variant="secondary" onClick={closeModal}>
                  {t("incidents.modal.cancel")}
                </Button>
                <Button
                  type="submit"
                  isLoading={createMutation.isPending || updateMutation.isPending}
                >
                  {editingIncident ? t("incidents.modal.saveChanges") : t("incidents.modal.create")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
