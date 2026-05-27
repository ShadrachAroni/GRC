import { apiRequest } from "@/utils/api";
import { useAuthStore } from "@/context/AuthStore";

export interface Control {
  control_id: string;
  tenant_id: string;
  framework: string;
  description: string;
  company_control?: string;
  status: string;
  owner?: string;
  evidence_required?: string;
  last_reviewed?: string;
  created_at: string;
}

export interface ControlUpdatePayload {
  framework?: string;
  description?: string;
  company_control?: string;
  status?: string;
  owner?: string;
  evidence_required?: string;
  last_reviewed?: string;
}

export interface Evidence {
  evidence_id: string;
  tenant_id: string;
  control_id: string;
  file_name: string;
  file_path: string;
  uploaded_by: string;
  uploaded_at: string;
}

export const controlsService = {
  async getControls(): Promise<Control[]> {
    return apiRequest("/api/controls/");
  },

  async updateControl(controlId: string, payload: ControlUpdatePayload): Promise<Control> {
    return apiRequest(`/api/controls/${controlId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async uploadEvidence(controlId: string, file: File): Promise<Evidence> {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest(`/api/controls/${controlId}/evidence`, {
      method: "POST",
      body: formData,
    });
  },

  async getEvidence(controlId: string): Promise<Evidence[]> {
    return apiRequest(`/api/controls/${controlId}/evidence`);
  },

  async downloadEvidence(controlId: string, evidenceId: string, filename: string): Promise<void> {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const store = useAuthStore.getState();
    const headers = new Headers();
    if (store.accessToken) {
      headers.set("Authorization", `Bearer ${store.accessToken}`);
    }
    const response = await fetch(`${API_URL}/api/controls/${controlId}/evidence/${evidenceId}/download`, {
      headers,
    });
    if (!response.ok) {
      throw new Error("Failed to download evidence file");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
