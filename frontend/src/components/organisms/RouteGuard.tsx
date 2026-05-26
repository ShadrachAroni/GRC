"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/context/AuthStore";

const publicPaths = ["/login", "/register", "/password-reset"];

export const RouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitializing, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isInitializing) return;

    const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

    if (!isAuthenticated && !isPublicPath) {
      router.push("/login");
    } else if (isAuthenticated && isPublicPath) {
      router.push("/");
    }
  }, [isAuthenticated, isInitializing, pathname, router]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-slate-950 text-primary dark:text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-body-sm font-medium text-slate-500 dark:text-slate-400">Initializing GRC Sentinel...</p>
        </div>
      </div>
    );
  }

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  
  // Prevent flashing of protected pages before redirect takes place
  if (!isAuthenticated && !isPublicPath) {
    return null;
  }
  if (isAuthenticated && isPublicPath) {
    return null;
  }

  return <>{children}</>;
};
