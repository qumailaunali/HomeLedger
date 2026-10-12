"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { percentChange } from "@/lib/calculations";
import { useApp } from "@/components/app/app-context";
import { Card, CardContent } from "@/components/ui/card";
import type { BudgetLine, MonthTotals } from "@/types";

const KEY = (slot: number) => `homeledger.category-watch.${slot}`;
const EVENT = "homeledger:category-watch";

/** The chosen category for a card, remembered on this device. */
function useSavedCategory(slot: number) {
  const value = React.useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(EVENT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => {
      try {
        return window.localStorage.getItem(KEY(slot));
      } catch {
        return null;
      }
    },
    () => null,
  );
  const set = React.useCallback(
    (id: string) => {
      try {
        window.localStorage.setItem(KEY(slot), id);
      } catch {
        // storage blocked — selection just won't persist
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [slot],
  );
  return [value, set] as const;
}

/** Two cards, each tracking one Home category of your choice (e.g. Petrol Freed). */
export function CategoryWatch({
  categories,
  monthly,
  trend,
  homeTotalCents,
}: {
  categories: BudgetLine[];
  monthly: { categoryId: string; year: number; month: number; cents: number }[];
  trend: MonthTotals[];
  homeTotalCents: number;
}) {
  if (categories.length === 0) return null;
  const guess = (pattern: RegExp, fallback: number) =>
    (categories.find((c) => pattern.test(c.name)) ?? categories[Math.min(fallback, categories.length - 1)]).id;
  const defaults = [guess(/freed/i, 0), guess(/food|grocer|internet/i, 1)];

  return (
    <section aria-label="Category watch" className="grid gap-4 sm:grid-cols-2">
      {[0, 1].map((slot) => (
        <WatchCard
          key={slot}
          slot={slot}
          defaultId={defaults[slot]}
          categories={categories}
          monthly={monthly}
          trend={trend}
          homeTotalCents={homeTotalCents}
        />
      ))}
    </section>
  );
}

function WatchCard({
  slot,
  defaultId,
  categories,
  monthly,
  trend,
  homeTotalCents,
}: {
  slot: number;
  defaultId: string;
  categories: BudgetLine[];
  monthly: { categoryId: string; year: number; month: number; cents: number }[];
  trend: MonthTotals[];
  homeTotalCents: number;
}) {
  const { money } = useApp();
  const [saved, setSaved] = useSavedCategory(slot);
  const category = categories.find((c) => c.id === saved) ?? categories.find((c) => c.id === defaultId) ?? categories[0];

  const series = trend.map((m) => ({
    label: m.label,
    year: m.year,
    month: m.month,
    cents: monthly.find((r) => r.categoryId === category.id && r.year === m.year && r.month === m.month)?.cents ?? 0,
  }));
  const current = series[series.length - 1];
  const previous = series[series.length - 2];
  const spent = category.spentCents;
  const change = percentChange(spent, previous?.cents ?? 0);
  const share = homeTotalCents > 0 ? Math.round((spent * 100) / homeTotalCents) : 0;
  const max = Math.max(...series.map((s) => s.cents), 1);
  const selectId = `watch-${slot}`;

  return (
    <Card>
      <CardContent className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={selectId} className="sr-only">
            Category to track
          </label>
          <select
            id={selectId}
            value={category.id}
            onChange={(e) => setSaved(e.target.value)}
            className="max-w-[70%] truncate rounded-lg bg-transparent py-1 pr-1 text-[15px] font-semibold outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Link
            href={`/home?year=${current.year}&month=${current.month}&category=${category.id}`}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            View records
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <ShareRing percent={share} />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Spent this month</p>
            <p className="tabular text-2xl font-semibold tracking-tight">{money(spent)}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
              {change === null ? (
                <span>Nothing last month</span>
              ) : (
                <>
                  {change > 0 ? (
                    <ArrowUpRight className="size-3.5 text-danger" aria-hidden />
                  ) : (
                    <ArrowDownRight className="size-3.5 text-positive" aria-hidden />
                  )}
                  <span>
                    {Math.abs(change)}% {change > 0 ? "more" : "less"} than last month
                  </span>
                </>
              )}
              {category.budgetCents > 0 && <span>· budget {money(category.budgetCents)}</span>}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs text-muted-foreground">Last 6 months</p>
          <ol className="flex h-24 items-end gap-2" aria-label={`${category.name}, last 6 months`}>
            {series.map((s, i) => {
              const last = i === series.length - 1;
              return (
                <li key={`${s.year}-${s.month}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="sr-only">
                    {s.label} {s.year}: {money(s.cents)}
                  </span>
                  <div
                    aria-hidden
                    title={`${s.label} ${s.year}: ${money(s.cents)}`}
                    className={cn(
                      "w-full max-w-7 rounded-t-[4px] transition-[height] duration-500",
                      last ? "bg-home" : "bg-home/35",
                    )}
                    style={{ height: s.cents ? `${Math.max((s.cents / max) * 100, 4)}%` : "2px" }}
                  />
                  <span aria-hidden className={cn("text-[11px]", last ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {s.label.split(" ")[0]}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

/** Ring showing the category's share of this month's Home spending. */
function ShareRing({ percent }: { percent: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(percent, 0), 100);
  return (
    <div className="relative size-16 shrink-0" role="img" aria-label={`${p}% of Home spending this month`}>
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--muted)" strokeWidth="7" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--home)"
          strokeWidth="7"
          strokeLinecap={p ? "round" : "butt"}
          strokeDasharray={`${(p / 100) * c} ${c}`}
          className="transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <span className="tabular absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-semibold">{p}%</span>
        <span className="mt-0.5 text-[9px] text-muted-foreground">of Home</span>
      </span>
    </div>
  );
}
