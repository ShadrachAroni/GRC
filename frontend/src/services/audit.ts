import { apiRequest } from "@/utils/api";

export interface AuditLog {
  id: number;
  tenant_id: string;
  user_email: string;
  action: string;
  ip_address?: string;
  timestamp: string;
  details?: string;
}

export const auditService = {
  async getAuditLogs(): Promise<AuditLog[]> {
    return apiRequest("/api/audit/logs");
  },
};
