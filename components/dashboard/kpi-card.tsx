import { cn } from "@/lib/utils";

export type KpiVariant = "indigo" | "amber" | "green" | "blue" | "rose" | "violet";

const variantStyles: Record<KpiVariant, {
  bg: string;
  border: string;
  icon: string;
  badge: string;
  glow: string;
}> = {
  indigo: {
    bg: "bg-indigo-500/8 dark:bg-indigo-500/10",
    border: "border-indigo-500/20",
    icon: "bg-indigo-500/15 text-indigo-400 dark:text-indigo-400",
    badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    glow: "shadow-indigo-500/10",
  },
  amber: {
    bg: "bg-amber-500/8 dark:bg-amber-500/10",
    border: "border-amber-500/20",
    icon: "bg-amber-500/15 text-amber-500 dark:text-amber-400",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    glow: "shadow-amber-500/10",
  },
  green: {
    bg: "bg-emerald-500/8 dark:bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    glow: "shadow-emerald-500/10",
  },
  blue: {
    bg: "bg-blue-500/8 dark:bg-blue-500/10",
    border: "border-blue-500/20",
    icon: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    glow: "shadow-blue-500/10",
  },
  rose: {
    bg: "bg-rose-500/8 dark:bg-rose-500/10",
    border: "border-rose-500/20",
    icon: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    glow: "shadow-rose-500/10",
  },
  violet: {
    bg: "bg-violet-500/8 dark:bg-violet-500/10",
    border: "border-violet-500/20",
    icon: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    glow: "shadow-violet-500/10",
  },
};

interface KpiCardProps {
  id: string;
  label: string;
  sublabel?: string;
  count: number;
  icon: React.ReactNode;
  variant?: KpiVariant;
  badge?: string;
}

export function KpiCard({
  id,
  label,
  sublabel,
  count,
  icon,
  variant = "indigo",
  badge,
}: KpiCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      id={id}
      className={cn(
        "group relative rounded-2xl border p-5 transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-0.5",
        styles.bg,
        styles.border,
        styles.glow
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex items-center justify-center size-10 rounded-xl transition-transform duration-200 group-hover:scale-105",
            styles.icon
          )}
        >
          {icon}
        </div>

        {/* Badge */}
        {badge && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              styles.badge
            )}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="mt-4">
        {/* Count */}
        <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
          {count.toLocaleString("en-IN")}
        </div>

        {/* Label */}
        <div className="mt-1 text-sm font-medium text-foreground/80">{label}</div>
        {sublabel && (
          <div className="mt-0.5 text-xs text-muted-foreground">{sublabel}</div>
        )}
      </div>
    </div>
  );
}
