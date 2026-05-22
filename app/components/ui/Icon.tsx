import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  size?: number;
  className?: string;
  "aria-label"?: string;
};

export default function Icon({ icon: LucideComponent, size = 20, className, ...rest }: Props) {
  const hasLabel = Boolean(rest["aria-label"]);
  return (
    <LucideComponent
      size={size}
      strokeWidth={1.5}
      className={className}
      aria-hidden={!hasLabel || undefined}
      {...rest}
    />
  );
}
