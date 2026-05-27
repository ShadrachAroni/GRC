import { apiRequest } from "@/utils/api";

export interface Incident {
  incident_id: number;
  tenant_id: string;
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  status: "Open" | "Contained" | "Resolved" | "Closed";
  detected_at: string;
  resolved_at?: string;
  mttd_minutes?: number;
  mttr_minutes?: number;
  description?: string;
  assigned_to?: string;
  created_at: string;
}

export interface IncidentCreatePayload {
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  status?: "Open" | "Contained" | "Resolved" | "Closed";
  detected_at?: string;
  resolved_at?: string;
  description?: string;
  assigned_to?: string;
}

export interface IncidentUpdatePayload {
  title?: string;
  severity?: "Critical" | "High" | "Medium" | "Low";
  status?: "Open" | "Contained" | "Resolved" | "Closed";
  detected_at?: string;
  resolved_at?: string;
  description?: string;
  assigned_to?: string;
}

export const incidentsService = {
  async getIncidents(): Promise<Incident[]> {
    return apiRequest("/api/incidents/");
  },

  async getIncident(incidentId: number): Promise<Incident> {
    return apiRequest(`/api/incidents/${incidentId}`);
  },

  async createIncident(payload: IncidentCreatePayload): Promise<Incident> {
    return apiRequest("/api/incidents/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateIncident(incidentId: number, payload: IncidentUpdatePayload): Promise<Incident> {
    return apiRequest(`/api/incidents/${incidentId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteIncident(incidentId: number): Promise<{ message: string }> {
    return apiRequest(`/api/incidents/${incidentId}`, {
      method: "DELETE",
    });
  },
};
