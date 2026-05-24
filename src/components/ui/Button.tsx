"use client";

import React from "react";

function cx(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(" ");
}

export interface ButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className,
  ref,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const baseClasses =
    "inline-flex items-center justify-center rounded font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2";

  const variantClasses = {
    primary:
      "bg-brand-red-600 text-neutral-cream hover:bg-brand-red-700 active:bg-brand-red-800",
    secondary:
      "border-2 border-brand-red-600 text-brand-red-600 bg-transparent hover:bg-brand-red-600 hover:text-neutral-cream active:bg-brand-red-700 active:border-brand-red-700",
    ghost:
      "bg-transparent text-brand-red-600 hover:bg-brand-red-50 active:bg-brand-red-100",
  }[variant];

  const sizeClasses = {
    sm: "px-3 py-1.5 text-small min-h-[32px]",
    md: "px-4 py-2 text-body min-h-[40px]",
    lg: "px-6 py-3 text-h3 min-h-[48px]",
  }[size];

  const stateClasses = isDisabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cx(
        baseClasses,
        variantClasses,
        sizeClasses,
        stateClasses,
        className
      )}
      {...rest}
    >
      {loading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
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
      <span className={loading ? "opacity-60" : undefined}>{children}</span>
    </button>
  );
}

export default Button;
