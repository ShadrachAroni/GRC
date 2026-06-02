import React, { forwardRef } from "react";
import { cn } from "@/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      type = "button",
      onClick,
      onFocus,
      onBlur,
      onKeyDown,
      onKeyUp,
      name,
      value,
      tabIndex,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-describedby": ariaDescribedBy,
    },
    ref
  ) => {
    // Define base classes
    const baseStyles = "inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed select-none";

    // Switch statements to avoid gitlab eslint.detect-object-injection rules
    const getVariantStyles = (v: typeof variant) => {
      switch (v) {
        case "primary":
          return "bg-primary text-white hover:bg-secondary border border-transparent dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200";
        case "secondary":
          return "bg-white text-primary border border-surface-border hover:bg-background dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800/80";
        case "tertiary":
          return "bg-transparent text-primary hover:bg-background border border-transparent dark:text-slate-350 dark:hover:bg-slate-800/65";
        default:
          return "bg-primary text-white hover:bg-secondary border border-transparent dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200";
      }
    };

    const getSizeStyles = (s: typeof size) => {
      switch (s) {
        case "sm":
          return "px-3 py-1.5 text-body-sm gap-1.5 h-8";
        case "md":
          return "px-4 py-2 text-body-md gap-2 h-10";
        case "lg":
          return "px-5 py-2.5 text-body-lg gap-2.5 h-12";
        default:
          return "px-4 py-2 text-body-md gap-2 h-10";
      }
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        onClick={onClick}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        name={name}
        value={value}
        tabIndex={tabIndex}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        className={cn(baseStyles, getVariantStyles(variant), getSizeStyles(size), className)}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
            data-testid="loading-spinner"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
