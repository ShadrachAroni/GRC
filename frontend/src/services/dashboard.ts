import { apiRequest } from "@/utils/api";
import { useAuthStore } from "@/context/AuthStore";

export interface DashboardSummary {
  open_risks_count: number;
  total_risks_count: number;
  avg_risk_score: number;
  risks_by_severity: Record<string, number>;
  
  implemented_controls_count: number;
  total_controls_count: number;
  compliance_score: number;
  controls_by_status: Record<string, number>;
  controls_by_framework: Record<string, { total: number; implemented: number; compliance_score: number }>;
  
  open_incidents_count: number;
  active_incidents_count: number;
  total_incidents_count: number;
  avg_mttd_minutes: number;
  avg_mttr_minutes: number;
  incidents_by_severity: Record<string, number>;
  incidents_by_status: Record<string, number>;
  
  open_findings_count: number;
  total_findings_count: number;
  
  open_capas_count: number;
  total_capas_count: number;
}

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    return apiRequest("/api/dashboard/summary");
  },

  async downloadRisksCsv(): Promise<Blob> {
    const store = useAuthStore.getState();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const headers = new Headers();
    if (store.accessToken) {
      headers.set("Authorization", `Bearer ${store.accessToken}`);
    }
    const res = await fetch(`${API_URL}/api/dashboard/export/risks`, { headers });
    if (!res.ok) throw new Error("Failed to download risks CSV");
    return res.blob();
  },

  async downloadCapasCsv(): Promise<Blob> {
    const store = useAuthStore.getState();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const headers = new Headers();
    if (store.accessToken) {
      headers.set("Authorization", `Bearer ${store.accessToken}`);
    }
    const res = await fetch(`${API_URL}/api/dashboard/export/capas`, { headers });
    if (!res.ok) throw new Error("Failed to download CAPAs CSV");
    return res.blob();
  },
};
