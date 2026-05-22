import type { ComponentPropsWithoutRef } from "react";

type Props = ComponentPropsWithoutRef<"span">;

export default function Label({ className = "", children, ...rest }: Props) {
  return (
    <span
      className={`text-xs uppercase tracking-[0.08em] text-text-tertiary ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
