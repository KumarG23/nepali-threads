import React from "react";

function cx(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(" ");
}

export interface BadgeProps extends React.ComponentPropsWithoutRef<"span"> {
  variant?: "neutral" | "primary" | "accent" | "muted";
  size?: "sm" | "md";
  ref?: React.Ref<HTMLSpanElement>;
}

export function Badge({
  variant = "neutral",
  size = "sm",
  className,
  children,
  ref,
  ...rest
}: BadgeProps) {
  const variantClasses = {
    neutral: "bg-neutral-ink/10 text-neutral-ink",
    primary: "bg-brand-red-600 text-neutral-cream",
    accent: "bg-brand-gold-600 text-neutral-ink",
    muted: "border border-neutral-ink/20 text-neutral-ink/60",
  }[variant];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[0.6875rem]",
    md: "px-2.5 py-1 text-small",
  }[size];

  return (
    <span
      ref={ref}
      className={cx(
        "inline-flex items-center rounded-full font-sans font-medium leading-none",
        variantClasses,
        sizeClasses,
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export default Badge;
