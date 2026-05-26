import { create } from "zustand";
import { authService } from "@/services/auth";

export interface UserProfile {
  email: string;
  tenant_id: string;
  role: string;
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  tempToken: string | null;
  mfaRequired: boolean;
  isAuthenticated: boolean;
  isInitializing: boolean;
  error: string | null;
  
  initialize: () => Promise<void>;
  setCredentials: (user: UserProfile, accessToken: string, refreshToken: string) => void;
  setMfaPending: (tempToken: string) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  tempToken: null,
  mfaRequired: false,
  isAuthenticated: false,
  isInitializing: true,
  error: null,

  initialize: async () => {
    if (typeof window === "undefined") return;
    
    try {
      const savedUser = localStorage.getItem("grc_user");
      const savedRefreshToken = localStorage.getItem("grc_refresh_token");
      
      if (savedUser && savedRefreshToken) {
        set({ user: JSON.parse(savedUser) });
        const success = await get().refreshSession();
        if (!success) {
          await get().logout();
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to initialize auth session:", e);
    } finally {
      set({ isInitializing: false });
    }
  },

  setCredentials: (user, accessToken, refreshToken) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("grc_user", JSON.stringify(user));
      localStorage.setItem("grc_refresh_token", refreshToken);
    }
    set({
      user,
      accessToken,
      tempToken: null,
      mfaRequired: false,
      isAuthenticated: true,
      error: null,
    });
  },

  setMfaPending: (tempToken) => {
    set({
      tempToken,
      mfaRequired: true,
      isAuthenticated: false,
      error: null,
    });
  },

  logout: async () => {
    if (typeof window !== "undefined") {
      const refreshToken = localStorage.getItem("grc_refresh_token");
      if (refreshToken) {
        try {
          await authService.logout(refreshToken);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("Error logging out from API:", e);
        }
      }
      localStorage.removeItem("grc_user");
      localStorage.removeItem("grc_refresh_token");
    }
    set({
      user: null,
      accessToken: null,
      tempToken: null,
      mfaRequired: false,
      isAuthenticated: false,
      error: null,
    });
  },

  refreshSession: async () => {
    if (typeof window === "undefined") return false;
    
    const refreshToken = localStorage.getItem("grc_refresh_token");
    if (!refreshToken) return false;
    
    try {
      const res = await authService.refresh(refreshToken);
      localStorage.setItem("grc_refresh_token", res.refresh_token);
      
      let currentUser = get().user;
      if (!currentUser) {
        const savedUser = localStorage.getItem("grc_user");
        if (savedUser) {
          currentUser = JSON.parse(savedUser);
        }
      }

      set({
        accessToken: res.access_token,
        isAuthenticated: true,
        user: currentUser,
        error: null,
      });
      return true;
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("Session refresh failed:", e);
      return false;
    }
  },

  setError: (error) => set({ error }),
}));
