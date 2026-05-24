import React from "react";

function cx(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(" ");
}

export interface CardProps extends React.ComponentPropsWithoutRef<"div"> {
  variant?: "elevated" | "bordered" | "flat";
  padding?: "none" | "sm" | "md" | "lg";
  ref?: React.Ref<HTMLDivElement>;
}

export function Card({
  variant = "elevated",
  padding = "md",
  className,
  children,
  ref,
  ...rest
}: CardProps) {
  const variantClasses = {
    elevated:
      "bg-neutral-cream shadow-[0_4px_12px_rgba(42,36,32,0.08)]",
    bordered:
      "bg-neutral-cream border border-neutral-ink/15",
    flat: "bg-transparent",
  }[variant];

  const paddingClasses = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  }[padding];

  return (
    <div
      ref={ref}
      className={cx("rounded-lg", variantClasses, paddingClasses, className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Card;
