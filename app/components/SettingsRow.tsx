import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import Icon from "@/app/components/ui/Icon";

type Props = {
  icon: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  href?: string;
  soon?: boolean;
  danger?: boolean;
};

export default function SettingsRow({ icon, title, subtitle, href, soon = false, danger = false }: Props) {
  const inner = (
    <div className={`flex items-center gap-3.5 px-5 py-4 ${href && !soon ? "active:bg-bg-tertiary transition-colors duration-200 ease-[var(--ease-editorial)]" : ""}`}>
      <span className={`w-8 flex items-center justify-center flex-shrink-0 ${danger ? "text-red-600" : "text-text-secondary"}`}>
        <Icon icon={icon} size={20} />
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? "text-red-600" : "text-text-primary"}`}>
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-text-tertiary mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {soon ? (
        <span className="text-[10px] uppercase tracking-[0.08em] font-semibold bg-bg-tertiary text-text-tertiary px-2 py-0.5 rounded-full flex-shrink-0">
          Pronto
        </span>
      ) : (
        <span className="text-text-tertiary flex-shrink-0">
          <Icon icon={ChevronRight} size={18} />
        </span>
      )}
    </div>
  );

  if (!href || soon) return <div className={soon ? "opacity-60" : ""}>{inner}</div>;

  return <Link href={href}>{inner}</Link>;
}
