"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleAlert, MinusCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-context";
import type { BudgetLine } from "@/types";
import type { BudgetStatus } from "@/lib/calculations";

/** CurrencyDisplay: consistent "Rs. 170,000" formatting with optional meaning colour. */
export function Money({
  cents,
  tone = "default",
  signed,
  className,
}: {
  cents: number;
  tone?: "default" | "auto" | "positive" | "danger" | "muted";
  signed?: boolean;
  className?: string;
}) {
  const { money } = useApp();
  const resolved = tone === "auto" ? (cents < 0 ? "danger" : "positive") : tone;
  return (
    <span
      className={cn(
        "tabular whitespace-nowrap",
        resolved === "positive" && "text-positive",
        resolved === "danger" && "text-danger",
        resolved === "muted" && "text-muted-foreground",
        className,
      )}
    >
      {money(cents, { signed })}
    </span>
  );
}

const STATUS: Record<BudgetStatus, { label: string; icon: LucideIcon; text: string; bar: string }> = {
  none: { label: "No budget set", icon: MinusCircle, text: "text-muted-foreground", bar: "bg-muted-foreground/40" },
  within: { label: "Within budget", icon: CheckCircle2, text: "text-positive", bar: "bg-positive" },
  near: { label: "Near budget", icon: AlertTriangle, text: "text-warning", bar: "bg-warning" },
  over: { label: "Over budget", icon: CircleAlert, text: "text-danger", bar: "bg-danger" },
};

/** Status is always shown as icon + text, never by colour alone. */
export function BudgetStatusLabel({ status, className }: { status: BudgetStatus; className?: string }) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", s.text, className)}>
      <Icon className="size-3.5" aria-hidden />
      {s.label}
    </span>
  );
}

export function ProgressBar({ percent, status, className }: { percent: number; status: BudgetStatus; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(percent, 100)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", STATUS[status].bar)}
        style={{ width: `${Math.min(Math.max(percent, status === "none" ? 0 : 2), 100)}%` }}
      />
    </div>
  );
}

/** BudgetProgress: spent / budget, bar, and remaining or over-budget amount. */
export function BudgetProgress({ line, period, compact }: { line: BudgetLine; period?: string; compact?: boolean }) {
  const { money } = useApp();
  return (
    <div className={cn("grid gap-2", compact ? "py-2" : "py-3")}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-medium">{line.name}</span>
        <span className="tabular text-sm">
          <span className="font-semibold">{money(line.spentCents)}</span>
          {line.budgetCents > 0 && <span className="text-muted-foreground"> / {money(line.budgetCents)}</span>}
        </span>
      </div>
      <ProgressBar percent={line.percent} status={line.status} />
      <div className="flex items-center justify-between gap-3">
        <BudgetStatusLabel status={line.status} />
        <span className="tabular text-xs text-muted-foreground">
          {line.budgetCents <= 0 ? (
            period ? `No ${period} budget` : "—"
          ) : line.status === "over" ? (
            <span className="font-medium text-danger">Over by {money(line.overCents)}</span>
          ) : (
            <>
              {money(line.remainingCents)} left · {line.percent}% used
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SummaryCard({
  label,
  cents,
  tone,
  icon: Icon,
  iconClass,
  hint,
  href,
  className,
}: {
  label: string;
  cents: number;
  tone?: "default" | "auto" | "positive" | "danger";
  icon?: LucideIcon;
  iconClass?: string;
  hint?: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <span className={cn("flex size-8 items-center justify-center rounded-xl bg-muted [&_svg]:size-4", iconClass)} aria-hidden>
            <Icon />
          </span>
        )}
      </div>
      <Money cents={cents} tone={tone} className="mt-2 block text-[22px] font-semibold tracking-tight sm:text-2xl" />
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </>
  );
  const cls = cn(
    "rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-shadow",
    href && "hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
    className,
  );
  return href ? (
    <Link href={href} className={cn(cls, "block")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
