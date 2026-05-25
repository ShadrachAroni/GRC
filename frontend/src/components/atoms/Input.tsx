import React, { forwardRef, useId } from "react";
import { cn } from "@/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      label,
      helperText,
      error,
      id,
      disabled,
      name,
      value,
      defaultValue,
      placeholder,
      required,
      readOnly,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      onKeyUp,
      onClick,
      autoComplete,
      maxLength,
      minLength,
      pattern,
      min,
      max,
      step,
      tabIndex,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
    },
    ref
  ) => {
    const fallbackId = useId();
    const inputId = id || fallbackId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const inputClass = cn(
      "w-full px-3 py-1.5 h-10 rounded-md bg-white dark:bg-slate-900 border text-body-md text-primary dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors duration-150 ease-in-out focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed select-text",
      error
        ? "border-danger-rose focus:border-danger-rose focus:ring-danger-rose"
        : "border-surface-border dark:border-slate-800 focus:border-primary focus:ring-primary",
      className
    );

    return (
      <div className="flex flex-col gap-1.5 w-full text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-body-sm font-semibold text-secondary dark:text-slate-300 select-none"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {error ? (
            <input
              id={inputId}
              type={type}
              ref={ref}
              disabled={disabled}
              name={name}
              value={value}
              defaultValue={defaultValue}
              placeholder={placeholder}
              required={required}
              readOnly={readOnly}
              onChange={onChange}
              onFocus={onFocus}
              onBlur={onBlur}
              onKeyDown={onKeyDown}
              onKeyUp={onKeyUp}
              onClick={onClick}
              autoComplete={autoComplete}
              maxLength={maxLength}
              minLength={minLength}
              pattern={pattern}
              min={min}
              max={max}
              step={step}
              tabIndex={tabIndex}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledBy}
              aria-invalid="true"
              aria-describedby={errorId}
              className={inputClass}
            />
          ) : (
            <input
              id={inputId}
              type={type}
              ref={ref}
              disabled={disabled}
              name={name}
              value={value}
              defaultValue={defaultValue}
              placeholder={placeholder}
              required={required}
              readOnly={readOnly}
              onChange={onChange}
              onFocus={onFocus}
              onBlur={onBlur}
              onKeyDown={onKeyDown}
              onKeyUp={onKeyUp}
              onClick={onClick}
              autoComplete={autoComplete}
              maxLength={maxLength}
              minLength={minLength}
              pattern={pattern}
              min={min}
              max={max}
              step={step}
              tabIndex={tabIndex}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledBy}
              aria-invalid="false"
              aria-describedby={helperText ? helperId : undefined}
              className={inputClass}
            />
          )}
        </div>
        {error && (
          <p
            id={errorId}
            className="text-body-sm font-medium text-danger-rose dark:text-rose-400"
          >
            {error}
          </p>
        )}
        {!error && helperText && (
          <p
            id={helperId}
            className="text-body-sm text-secondary dark:text-slate-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
