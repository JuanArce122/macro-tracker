"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

type Props = ComponentPropsWithoutRef<"button"> & {
  variant?: Variant;
  size?: Size;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

const variantClass: Record<Variant, string> = {
  primary:
    "bg-text-primary text-bg-primary active:opacity-90",
  secondary:
    "bg-transparent border border-text-primary text-text-primary active:bg-bg-tertiary",
  ghost:
    "bg-transparent text-text-primary active:bg-bg-tertiary",
  destructive:
    "bg-transparent text-red-600 active:bg-red-50",
};

const sizeClass: Record<Size, string> = {
  sm: "px-3 py-2 text-xs gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-6 py-3.5 text-base gap-2",
};

export default function Button({
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  children,
  className = "",
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-xl font-medium transition-colors duration-200 ease-[var(--ease-editorial)] disabled:opacity-50 disabled:pointer-events-none ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...rest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
