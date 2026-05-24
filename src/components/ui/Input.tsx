"use client";

import React from "react";

function cx(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(" ");
}

export interface InputProps extends React.ComponentPropsWithoutRef<"input"> {
  label?: string;
  hint?: string;
  error?: string;
  inputSize?: "sm" | "md" | "lg";
  ref?: React.Ref<HTMLInputElement>;
}

export function Input({
  label,
  hint,
  error,
  inputSize = "md",
  id,
  required,
  disabled,
  className,
  ref,
  ...rest
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = errorId ?? hintId;

  const sizeClasses = {
    sm: "px-3 py-1.5 text-small min-h-[32px]",
    md: "px-4 py-2 text-body min-h-[40px]",
    lg: "px-6 py-3 text-body min-h-[48px]",
  }[inputSize];

  const baseClasses =
    "w-full rounded border bg-neutral-cream text-neutral-ink placeholder:text-neutral-ink/40 transition-colors focus:border-brand-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2";

  const stateClasses = error
    ? "border-brand-red-700"
    : "border-neutral-ink/15";

  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <div className={cx("w-full", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className={cx(
            "mb-1.5 block font-sans text-small font-medium",
            error ? "text-brand-red-700" : "text-neutral-ink"
          )}
        >
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-brand-red-600">
              *
            </span>
          )}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        required={required}
        disabled={disabled}
        className={cx(baseClasses, sizeClasses, stateClasses, disabledClasses)}
        {...rest}
      />
      {error ? (
        <p
          id={errorId}
          className="mt-1.5 font-sans text-small text-brand-red-700"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={hintId}
          className="mt-1.5 font-sans text-small text-neutral-ink/60"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default Input;
