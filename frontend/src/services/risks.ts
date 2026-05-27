import { apiRequest } from "@/utils/api";

export interface Risk {
  risk_id: string;
  tenant_id: string;
  asset: string;
  threat: string;
  likelihood: number;
  impact: number;
  risk_score: number;
  severity: string;
  mitigation?: string;
  status: string;
  owner?: string;
  department?: string;
  review_date?: string;
  created_at: string;
  updated_at: string;
}

export interface RiskCreatePayload {
  risk_id: string;
  asset: string;
  threat: string;
  likelihood: number;
  impact: number;
  mitigation?: string;
  status?: string;
  owner?: string;
  department?: string;
  review_date?: string;
}

export interface RiskUpdatePayload {
  asset?: string;
  threat?: string;
  likelihood?: number;
  impact?: number;
  mitigation?: string;
  status?: string;
  owner?: string;
  department?: string;
  review_date?: string;
}

export const risksService = {
  async getRisks(): Promise<Risk[]> {
    return apiRequest("/api/risks/");
  },

  async getRisk(riskId: string): Promise<Risk> {
    return apiRequest(`/api/risks/${riskId}`);
  },

  async createRisk(payload: RiskCreatePayload): Promise<Risk> {
    return apiRequest("/api/risks/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateRisk(riskId: string, payload: RiskUpdatePayload): Promise<Risk> {
    return apiRequest(`/api/risks/${riskId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteRisk(riskId: string): Promise<{ message: string }> {
    return apiRequest(`/api/risks/${riskId}`, {
      method: "DELETE",
    });
  },
};
