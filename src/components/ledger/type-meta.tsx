import { ArrowDownLeft, Home, ShoppingBag, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransactionRow, TransactionType } from "@/types";

/** Each type has its own quiet identity: icon + accent, used consistently everywhere. */
export const TYPE_META: Record<TransactionType, { label: string; icon: LucideIcon; text: string; soft: string; bar: string }> = {
  HOME: { label: "Home", icon: Home, text: "text-home", soft: "bg-home-soft", bar: "bg-home" },
  SHOPPING: { label: "Shopping", icon: ShoppingBag, text: "text-shopping", soft: "bg-shopping-soft", bar: "bg-shopping" },
  OUTING: { label: "Outing", icon: UtensilsCrossed, text: "text-outing", soft: "bg-outing-soft", bar: "bg-outing" },
  RECEIVED: { label: "Received", icon: ArrowDownLeft, text: "text-received", soft: "bg-received-soft", bar: "bg-received" },
};

/** Chart colours read from CSS variables so they follow light/dark mode. */
export const TYPE_CHART_COLOR: Record<TransactionType, string> = {
  HOME: "var(--home)",
  SHOPPING: "var(--shopping)",
  OUTING: "var(--outing)",
  RECEIVED: "var(--received)",
};

export function TypeIcon({ type, className, size = "md" }: { type: TransactionType; className?: string; size?: "sm" | "md" | "lg" }) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        meta.soft,
        meta.text,
        size === "sm" && "size-7 rounded-lg [&_svg]:size-3.5",
        size === "md" && "size-9 rounded-xl [&_svg]:size-4",
        size === "lg" && "size-11 rounded-2xl [&_svg]:size-5",
        className,
      )}
    >
      <Icon />
    </span>
  );
}

export function TypeBadge({ type }: { type: TransactionType }) {
  const meta = TYPE_META[type];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-foreground/80", meta.soft)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", meta.bar)} />
      {meta.label}
    </span>
  );
}

/** The "Category / Person" column: Home category, shopping member, outing place, or income source. */
export function targetLabel(row: TransactionRow): string {
  if (row.type === "HOME") return row.categoryName ?? "Uncategorised";
  if (row.type === "SHOPPING") return row.memberName ?? "—";
  if (row.type === "OUTING") return row.place ?? "Outing";
  if (row.pot) return `${TYPE_META[row.pot].label} · ${row.source ?? "Received"}`;
  return row.source ?? "Money received";
}

/** Main line shown in lists. */
export function primaryLabel(row: TransactionRow): string {
  if (row.type === "OUTING") return row.place ?? row.description;
  return row.description || targetLabel(row);
}
