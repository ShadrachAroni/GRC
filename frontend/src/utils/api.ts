import { useAuthStore } from "@/context/AuthStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiRequest(endpoint: string, options: RequestOptions = {}) {
  const { skipAuth, ...fetchOptions } = options;
  const store = useAuthStore.getState();
  
  const headers = new Headers(fetchOptions.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Inject active access token if available and auth isn't skipped
  if (!skipAuth && store.accessToken) {
    headers.set("Authorization", `Bearer ${store.accessToken}`);
  }

  fetchOptions.headers = headers;
  const url = `${API_URL}${endpoint}`;

  let response = await fetch(url, fetchOptions);

  // If unauthorized, attempt to rotate refresh token and retry
  if (response.status === 401 && !skipAuth) {
    // eslint-disable-next-line no-console
    console.info("Access token expired, attempting background session refresh...");
    const refreshed = await store.refreshSession();
    
    if (refreshed) {
      const newToken = useAuthStore.getState().accessToken;
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        fetchOptions.headers = headers;
        response = await fetch(url, fetchOptions);
      }
    } else {
      // eslint-disable-next-line no-console
      console.warn("Session refresh failed or expired. Logging out.");
      await store.logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || "An error occurred");
  }

  return response.json();
}
