"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMonthYear, shiftMonth } from "@/lib/dates";
import { useApp } from "@/components/app/app-context";
import { buttonVariants } from "@/components/ui/button";

/**
 * "< Previous Month · October 2026 · Next Month >" plus "This Month".
 * State lives in the URL (?month=&year=) so it survives reloads and is shareable.
 * With `mode="year"` it steps whole years (shopping budgets are yearly).
 */
export function MonthSelector({
  year,
  month,
  mode = "month",
  className,
}: {
  year: number;
  month: number;
  mode?: "month" | "year";
  className?: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { prefs } = useApp();
  const [ty, tm] = prefs.today.split("-").map(Number);

  const hrefFor = (y: number, m: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("year", String(y));
    if (mode === "month") next.set("month", String(m));
    next.delete("page");
    return `${pathname}?${next.toString()}`;
  };

  const prev = mode === "month" ? shiftMonth(year, month, -1) : { year: year - 1, month };
  const next = mode === "month" ? shiftMonth(year, month, 1) : { year: year + 1, month };
  const isCurrent = mode === "month" ? year === ty && month === tm : year === ty;
  const label = mode === "month" ? formatMonthYear(year, month) : String(year);
  const unit = mode === "month" ? "month" : "year";

  return (
    <nav aria-label={`Choose ${unit}`} className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center rounded-xl border bg-card p-0.5 shadow-xs">
        <Link
          href={hrefFor(prev.year, prev.month)}
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          aria-label={`Previous ${unit}`}
          scroll={false}
        >
          <ChevronLeft />
        </Link>
        <span className="tabular min-w-32 px-1 text-center text-sm font-semibold" aria-live="polite">
          {label}
        </span>
        <Link
          href={hrefFor(next.year, next.month)}
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          aria-label={`Next ${unit}`}
          scroll={false}
        >
          <ChevronRight />
        </Link>
      </div>
      {!isCurrent && (
        <Link href={hrefFor(ty, tm)} className={buttonVariants({ variant: "outline", size: "sm" })} scroll={false}>
          {mode === "month" ? "This Month" : "This Year"}
        </Link>
      )}
    </nav>
  );
}
