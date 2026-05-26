const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchJson(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || "An error occurred");
  }

  return response.json();
}

export const authService = {
  async register(payload: any) {
    return fetchJson("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async mfaEnable(payload: { email: string; code: string }) {
    return fetchJson("/api/auth/mfa/enable", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async login(payload: any) {
    return fetchJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async loginVerify(payload: { temp_token: string; code: string }) {
    return fetchJson("/api/auth/login/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async refresh(refreshToken: string) {
    return fetchJson("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },

  async logout(refreshToken: string) {
    try {
      await fetchJson("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Logout request failed:", e);
    }
  },

  async passwordResetRequest(payload: { email: string; redirect_uri?: string }) {
    return fetchJson("/api/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async passwordResetConfirm(payload: any) {
    return fetchJson("/api/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
