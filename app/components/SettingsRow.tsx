import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import Icon from "@/app/components/ui/Icon";

type Props = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  href?: string;
  soon?: boolean;
  danger?: boolean;
};

export default function SettingsRow({ icon, title, subtitle, href, soon = false, danger = false }: Props) {
  const inner = (
    <div className={`flex items-center gap-3.5 px-4 py-3.5 ${href && !soon ? "active:bg-gray-50 dark:active:bg-gray-700/50" : ""}`}>
      <span className={`w-8 flex items-center justify-center flex-shrink-0 ${danger ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
        <Icon icon={icon} size={20} />
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? "text-red-500" : "text-gray-800 dark:text-gray-100"}`}>
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {soon ? (
        <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">
          Pronto
        </span>
      ) : (
        <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );

  if (!href || soon) return <div className={soon ? "opacity-60" : ""}>{inner}</div>;

  return <Link href={href}>{inner}</Link>;
}
