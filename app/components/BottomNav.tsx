"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Home, ClipboardList, Settings } from "lucide-react";
import Icon from "@/app/components/ui/Icon";

type Tab = {
  label: string;
  href: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  {
    label: "Hoy",
    href: "",
    icon: Home,
    match: (p) => p.startsWith("/day") || p === "/",
  },
  {
    label: "Historial",
    href: "/history",
    icon: ClipboardList,
    match: (p) => p.startsWith("/history"),
  },
  {
    label: "Ajustes",
    href: "/settings",
    icon: Settings,
    match: (p) => p.startsWith("/settings"),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky bottom-0 bg-bg-primary border-t border-border flex items-center justify-around z-10"
      style={{
        height: "calc(4rem + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {TABS.map(({ label, href, icon, match }) => {
        const active = match(pathname);
        const targetHref = href || "/";
        return (
          <Link
            key={label}
            href={targetHref}
            className={`flex flex-col items-center gap-0.5 text-xs px-6 py-2 transition-colors duration-200 ease-[var(--ease-editorial)] ${
              active ? "text-text-primary" : "text-text-tertiary"
            }`}
          >
            <Icon icon={icon} size={22} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
