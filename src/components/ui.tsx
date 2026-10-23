import type { ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

export function SectionHeading({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
          {icon && (
            <span className="grid size-9 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <Icon name={icon} className="size-5" />
            </span>
          )}
          {title}
        </h2>
        {subtitle && <p className="mt-1.5 text-sm text-ink-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = "brand",
}: {
  children: ReactNode;
  tone?: "brand" | "amber" | "emerald" | "rose" | "slate";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700 border-brand-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    slate: "bg-ink-50 text-ink-600 border-ink-100",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon = "search",
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon?: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="card-surface flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-50 to-accent-400/20 text-brand-500">
        <Icon name={icon} className="size-8" />
      </span>
      <h3 className="text-lg font-bold text-ink-900">{title}</h3>
      <p className="max-w-sm text-sm leading-6 text-ink-400">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-2 rounded-2xl bg-gradient-to-l from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children: ReactNode;
}) {
  const tones = {
    error: "bg-rose-50 text-rose-700 border-rose-100",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    info: "bg-brand-50 text-brand-700 border-brand-100",
  } as const;
  const icons: Record<string, IconName> = {
    error: "x",
    success: "check",
    info: "sparkles",
  };
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-2xl border px-3.5 py-3 text-[13px] font-medium leading-6 ${tones[tone]}`}
    >
      <Icon name={icons[tone]} className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold text-ink-800">{label}</span>
        {hint && <span className="text-[11px] text-ink-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function StatTile({
  icon,
  label,
  value,
  tone = "brand",
}: {
  icon: IconName;
  label: string;
  value: string;
  tone?: "brand" | "amber" | "emerald" | "rose";
}) {
  const tones = {
    brand: "from-brand-500/12 to-brand-500/0 text-brand-600",
    amber: "from-amber-400/16 to-amber-400/0 text-amber-600",
    emerald: "from-emerald-400/14 to-emerald-400/0 text-emerald-600",
    rose: "from-accent-500/14 to-accent-500/0 text-accent-600",
  } as const;
  return (
    <div className="card-surface relative overflow-hidden p-4">
      <div
        className={`absolute inset-0 bg-gradient-to-bl ${tones[tone]} opacity-80`}
        aria-hidden
      />
      <div className="relative flex items-center gap-3">
        <span className={`grid size-11 place-items-center rounded-2xl bg-white/80 ${tones[tone].split(" ").pop()}`}>
          <Icon name={icon} className="size-5" />
        </span>
        <div>
          <p className="text-xl font-extrabold text-ink-900">{value}</p>
          <p className="text-[11.5px] font-medium text-ink-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
