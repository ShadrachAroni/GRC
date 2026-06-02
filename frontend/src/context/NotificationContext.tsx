"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/utils/cn";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface NotificationContextProps {
  showToast: (message: string, type: ToastType, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType, duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  // Map of icons for each toast type
  const icons = {
    success: <ShieldCheck className="w-5 h-5 text-success-emerald" />,
    error: <AlertCircle className="w-5 h-5 text-danger-rose" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning-amber" />,
    info: <Info className="w-5 h-5 text-slate-500 dark:text-slate-400" />,
  };

  // Map of border and text colors for toast styling
  const styles = {
    success: "border-success-emerald/30 border-l-4 border-l-success-emerald",
    error: "border-danger-rose/30 border-l-4 border-l-danger-rose",
    warning: "border-warning-amber/30 border-l-4 border-l-warning-amber",
    info: "border-slate-200 dark:border-slate-700/50 border-l-4 border-l-slate-400 dark:border-l-slate-500",
  };

  const progressBg = {
    success: "bg-success-emerald",
    error: "bg-danger-rose",
    warning: "bg-warning-amber",
    info: "bg-slate-400 dark:bg-slate-500",
  };

  return (
    <NotificationContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Overlay Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full p-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } }}
              className={cn(
                "relative flex items-start gap-3 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md",
                "rounded shadow-lg border border-surface-border dark:border-slate-800 pointer-events-auto overflow-hidden",
                styles[toast.type]
              )}
            >
              {/* Type Icon */}
              <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
              
              {/* Message Content */}
              <div className="flex-1 text-body-sm font-medium text-slate-800 dark:text-slate-200 pr-4">
                {toast.message}
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Progress Bar (Timer) */}
              {toast.duration && toast.duration > 0 && (
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: toast.duration / 1000, ease: "linear" }}
                  className={cn("absolute bottom-0 left-0 h-[3px]", progressBg[toast.type])}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};
