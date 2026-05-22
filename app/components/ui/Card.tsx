import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Padding = "sm" | "md" | "lg";

type Props = ComponentPropsWithoutRef<"div"> & {
  interactive?: boolean;
  padding?: Padding;
  children: ReactNode;
};

const paddingClass: Record<Padding, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function Card({
  interactive = false,
  padding = "md",
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <div
      className={`bg-bg-secondary border border-border rounded-xl ${paddingClass[padding]} ${interactive ? "transition-colors duration-200 ease-[var(--ease-editorial)] active:bg-bg-tertiary cursor-pointer" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
