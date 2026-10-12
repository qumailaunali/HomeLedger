import type { Metadata } from "next";
import { Suspense } from "react";
import { requireHousehold } from "@/server/auth";
import { getAnalytics, getShoppingBudget, getYearSummary } from "@/server/queries/summary";
import { isoParam, str, type SearchParams } from "@/server/params";
import { daysInMonth, makeIsoDate, shiftMonth, todayIso } from "@/lib/dates";
import { AnalyticsView, type RangeKey } from "./analytics-view";

export const metadata: Metadata = { title: "Analytics" };

function resolveRange(key: RangeKey, today: string, from?: string, to?: string) {
  const [y, m] = today.split("-").map(Number);
  const monthEnd = makeIsoDate(y, m, daysInMonth(y, m));
  switch (key) {
    case "3m": {
      const s = shiftMonth(y, m, -2);
      return { from: makeIsoDate(s.year, s.month, 1), to: monthEnd };
    }
    case "year":
      return { from: makeIsoDate(y, 1, 1), to: makeIsoDate(y, 12, 31) };
    case "prev-year":
      return { from: makeIsoDate(y - 1, 1, 1), to: makeIsoDate(y - 1, 12, 31) };
    case "custom":
      if (from && to && from <= to) return { from, to };
      return resolveRange("6m", today);
    default: {
      const s = shiftMonth(y, m, -5);
      return { from: makeIsoDate(s.year, s.month, 1), to: monthEnd };
    }
  }
}

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const { household } = await requireHousehold();
  const sp = await searchParams;
  const today = todayIso(household.timezone);
  const raw = str(sp, "range");
  const key: RangeKey = raw === "3m" || raw === "year" || raw === "prev-year" || raw === "custom" ? raw : "6m";
  const range = resolveRange(key, today, isoParam(sp, "from"), isoParam(sp, "to"));
  // Shopping budgets are yearly: use the year the range ends in.
  const shoppingYear = Number(range.to.slice(0, 4));
  const summaryYear = Number(str(sp, "sy")) || Number(today.slice(0, 4));

  const [analytics, shopping, yearSummary] = await Promise.all([
    getAnalytics(household, range.from, range.to),
    getShoppingBudget(household.id, shoppingYear),
    getYearSummary(household.id, summaryYear),
  ]);

  return (
    <Suspense fallback={<div className="animate-pulse rounded-2xl bg-muted/50 h-96" />}>
      <AnalyticsView
        rangeKey={key}
        analytics={analytics}
        shopping={shopping}
        shoppingYear={shoppingYear}
        yearSummary={yearSummary}
      />
    </Suspense>
  );
}
