import React, { forwardRef, useId } from "react";
import { Check } from "lucide-react";
import { cn } from "@/utils/cn";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      error,
      id,
      disabled,
      checked,
      defaultChecked,
      onChange,
      name,
      value,
      required,
      tabIndex,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-describedby": ariaDescribedBy,
    },
    ref
  ) => {
    const fallbackId = useId();
    const checkboxId = id || fallbackId;

    return (
      <div className="flex flex-col gap-1 w-full text-left">
        <label
          htmlFor={checkboxId}
          className={cn(
            "inline-flex items-center gap-2.5 cursor-pointer select-none group text-body-md text-primary dark:text-slate-200",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <div className="relative flex items-center justify-center">
            <input
              id={checkboxId}
              type="checkbox"
              ref={ref}
              disabled={disabled}
              checked={checked}
              defaultChecked={defaultChecked}
              onChange={onChange}
              name={name}
              value={value}
              required={required}
              tabIndex={tabIndex}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledBy}
              aria-describedby={ariaDescribedBy}
              className="sr-only peer"
            />
            {/* Custom styled box */}
            <div
              className={cn(
                "w-4 h-4 rounded border transition-all duration-150 flex items-center justify-center bg-white dark:bg-slate-900 border-surface-border dark:border-slate-800 peer-focus:ring-1 peer-focus:ring-primary peer-focus:border-primary peer-checked:bg-primary peer-checked:border-primary text-transparent peer-checked:text-white dark:peer-checked:bg-slate-100 dark:peer-checked:text-slate-950",
                error && "border-danger-rose peer-focus:ring-danger-rose peer-focus:border-danger-rose",
                disabled && "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              )}
            >
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          </div>
          {label && (
            <span className="text-body-md select-none font-medium text-secondary dark:text-slate-300">
              {label}
            </span>
          )}
        </label>
        {error && (
          <p className="text-body-sm font-medium text-danger-rose dark:text-rose-400 pl-6">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
