import { apiRequest } from "@/utils/api";
import { useAuthStore } from "@/context/AuthStore";

export interface AuditLog {
  id: number;
  tenant_id: string;
  user_email: string;
  action: string;
  ip_address?: string;
  timestamp: string;
  details?: string;
}

export interface AuditFinding {
  finding_id: string;
  tenant_id: string;
  title: string;
  severity: string; // Critical, High, Medium, Low
  control_id?: string;
  recommendation?: string;
  status: string; // Open, Closed, etc.
  detected_at: string;
  created_at: string;
}

export interface Capa {
  capa_id: string;
  tenant_id: string;
  finding_id: string;
  title: string;
  root_cause?: string;
  action: string;
  owner?: string;
  due_date?: string; // YYYY-MM-DD
  status: string; // Open, Closed, etc.
  created_at: string;
}

export const auditService = {
  async getAuditLogs(): Promise<AuditLog[]> {
    return apiRequest("/api/audit/logs");
  },

  async downloadAuditLogsCsv(): Promise<Blob> {
    const store = useAuthStore.getState();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const headers = new Headers();
    if (store.accessToken) {
      headers.set("Authorization", `Bearer ${store.accessToken}`);
    }
    const res = await fetch(`${API_URL}/api/audit/logs/download`, { headers });
    if (!res.ok) throw new Error("Failed to download CSV");
    return res.blob();
  },

  // Findings
  async getFindings(): Promise<AuditFinding[]> {
    return apiRequest("/api/audit/findings");
  },

  async createFinding(data: Partial<AuditFinding>): Promise<AuditFinding> {
    return apiRequest("/api/audit/findings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateFinding(findingId: string, data: Partial<AuditFinding>): Promise<AuditFinding> {
    return apiRequest(`/api/audit/findings/${findingId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteFinding(findingId: string): Promise<{ message: string }> {
    return apiRequest(`/api/audit/findings/${findingId}`, {
      method: "DELETE",
    });
  },

  // CAPA
  async getCapas(): Promise<Capa[]> {
    return apiRequest("/api/audit/capas");
  },

  async createCapa(data: Partial<Capa>): Promise<Capa> {
    return apiRequest("/api/audit/capas", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateCapa(capaId: string, data: Partial<Capa>): Promise<Capa> {
    return apiRequest(`/api/audit/capas/${capaId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteCapa(capaId: string): Promise<{ message: string }> {
    return apiRequest(`/api/audit/capas/${capaId}`, {
      method: "DELETE",
    });
  },
};
