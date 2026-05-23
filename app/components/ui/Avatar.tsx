type Size = "sm" | "md" | "lg" | "xl";

type Props = {
  name: string | null | undefined;
  size?: Size;
  className?: string;
};

const sizeClass: Record<Size, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name, size = "md", className = "" }: Props) {
  const initials = getInitials(name);
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-bg-tertiary text-text-primary font-display font-medium ${sizeClass[size]} ${className}`}
      aria-label={name ? `Avatar de ${name}` : "Avatar"}
    >
      {initials}
    </div>
  );
}
