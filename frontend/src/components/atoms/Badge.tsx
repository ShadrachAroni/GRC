import React from "react";
import { cn } from "@/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "critical" | "high" | "medium" | "low";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "info",
  size = "md",
  children,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-md select-none transition-colors duration-150 uppercase";

  const variants = {
    // Semantic alerts (10% tint background + full-saturation text for >7.0:1 WCAG contrast)
    success: "bg-success-emerald/10 text-success-emerald dark:bg-success-emerald/20 dark:text-emerald-400 border border-success-emerald/20",
    warning: "bg-warning-amber/10 text-warning-amber dark:bg-warning-amber/20 dark:text-amber-400 border border-warning-amber/20",
    danger: "bg-danger-rose/10 text-danger-rose dark:bg-danger-rose/20 dark:text-rose-400 border border-danger-rose/20",
    info: "bg-secondary/10 text-secondary dark:bg-slate-800/60 dark:text-slate-300 border border-secondary/20 dark:border-slate-700",
    
    // Risk Severities
    critical: "bg-risk-critical/10 text-risk-critical dark:bg-risk-critical/20 dark:text-red-400 border border-risk-critical/20",
    high: "bg-risk-high/10 text-risk-high dark:bg-risk-high/20 dark:text-amber-500 border border-risk-high/20",
    medium: "bg-risk-medium/10 text-risk-medium dark:bg-risk-medium/20 dark:text-blue-400 border border-risk-medium/20",
    low: "bg-risk-low/10 text-risk-low dark:bg-risk-low/20 dark:text-green-400 border border-risk-low/20",
  };

  const sizes = {
    sm: "px-1.5 py-0.5 text-[10px] leading-3 h-5 gap-1",
    md: "px-2 py-1 text-label-caps h-6 gap-1.5",
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </span>
  );
};

Badge.displayName = "Badge";
