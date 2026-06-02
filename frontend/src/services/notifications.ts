import { apiRequest } from "@/utils/api";

export interface Notification {
  id: number;
  tenant_id: string;
  title: string;
  message: string;
  severity: "Info" | "Medium" | "High" | "Critical";
  type: "risk" | "compliance" | "incident" | "audit" | "system";
  is_read: boolean;
  channels: string;
  created_at: string;
}

export const notificationsService = {
  async getNotifications(): Promise<Notification[]> {
    return apiRequest("/api/notifications/");
  },
  
  async markAsRead(id: number): Promise<Notification> {
    return apiRequest(`/api/notifications/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_read: true }),
    });
  },
  
  async markAllAsRead(): Promise<{ message: string }> {
    return apiRequest("/api/notifications/mark-all-read", {
      method: "POST",
    });
  },
};
