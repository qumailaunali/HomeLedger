"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { MONTH_NAMES, shiftMonth } from "@/lib/dates";
import { percentChange } from "@/lib/calculations";
import { useApp } from "@/components/app/app-context";
import { SummaryCard } from "@/components/ledger/display";

interface Stats {
  monthCents: number;
  monthCount: number;
  previousMonthCents: number;
  previousMonthCount: number;
  yearCents: number;
  yearCount: number;
  averageCents: number;
  largest: { place: string; amountCents: number; date: string } | null;
}

export function OutingStats({ stats, year, month }: { stats: Stats; year: number; month: number }) {
  const { money, date } = useApp();
  const prev = MONTH_NAMES[shiftMonth(year, month, -1).month - 1];
  const change = percentChange(stats.monthCents, stats.previousMonthCents);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <SummaryCard
        label={`${MONTH_NAMES[month - 1]} outings`}
        cents={stats.monthCents}
        hint={
          <span className="inline-flex flex-wrap items-center gap-1">
            {stats.monthCount} outing{stats.monthCount === 1 ? "" : "s"}
            {change !== null && (
              <>
                {" · "}
                {change > 0 ? <ArrowUpRight className="size-3.5 text-danger" aria-hidden /> : <ArrowDownRight className="size-3.5 text-positive" aria-hidden />}
                {Math.abs(change)}% vs {prev}
              </>
            )}
          </span>
        }
      />
      <SummaryCard label={`${year} total`} cents={stats.yearCents} hint={`${stats.yearCount} outing${stats.yearCount === 1 ? "" : "s"} this year`} />
      <SummaryCard label="Average outing" cents={stats.averageCents} hint={`Across ${year}`} />
      <SummaryCard
        label="Largest outing"
        cents={stats.largest?.amountCents ?? 0}
        hint={stats.largest ? `${stats.largest.place} · ${date(stats.largest.date)}` : "None recorded yet"}
      />
      <p className="col-span-2 text-xs text-muted-foreground lg:col-span-4">
        {prev}: {money(stats.previousMonthCents)} across {stats.previousMonthCount} outing{stats.previousMonthCount === 1 ? "" : "s"}.
      </p>
    </div>
  );
}
