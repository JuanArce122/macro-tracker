"use client";

import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";

type Props = Omit<ComponentPropsWithoutRef<"input">, "size"> & {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

export default function Input({
  leadingIcon,
  trailingIcon,
  className = "",
  ref,
  ...rest
}: Props) {
  return (
    <div className="relative flex items-center">
      {leadingIcon && (
        <span className="absolute left-3 text-text-tertiary pointer-events-none flex items-center">
          {leadingIcon}
        </span>
      )}
      <input
        ref={ref}
        className={`w-full bg-bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-text-primary transition-colors duration-200 ease-[var(--ease-editorial)] ${leadingIcon ? "pl-10" : "pl-4"} ${trailingIcon ? "pr-10" : "pr-4"} py-3 text-sm ${className}`}
        {...rest}
      />
      {trailingIcon && (
        <span className="absolute right-3 text-text-tertiary pointer-events-none flex items-center">
          {trailingIcon}
        </span>
      )}
    </div>
  );
}
