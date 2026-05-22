import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  className?: string;
};

export default function SectionHeader({
  title,
  subtitle,
  trailing,
  className = "",
}: Props) {
  return (
    <div className={`flex items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h1 className="font-serif text-[40px] leading-[1.1] tracking-[-0.02em] text-text-primary">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-text-secondary mt-2">{subtitle}</p>
        )}
      </div>
      {trailing && <div className="flex-shrink-0">{trailing}</div>}
    </div>
  );
}
