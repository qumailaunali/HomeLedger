"use client";

import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
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

/** Outing cards: available balance, this month's total, average, largest. */
export function OutingStats({
  stats,
  balanceCents,
  year,
  month,
}: {
  stats: Stats;
  balanceCents: number;
  year: number;
  month: number;
}) {
  const { date } = useApp();
  const prev = MONTH_NAMES[shiftMonth(year, month, -1).month - 1];
  const change = percentChange(stats.monthCents, stats.previousMonthCents);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <SummaryCard
        label="Available balance"
        cents={balanceCents}
        tone={balanceCents < 0 ? "danger" : "positive"}
        icon={Wallet}
        iconClass="bg-outing-soft text-outing"
        hint={balanceCents < 0 ? "Spent more than was added" : "Left in the Outing pot"}
      />
      <SummaryCard
        label={`Total in ${MONTH_NAMES[month - 1]}`}
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
      <SummaryCard label="Average outing" cents={stats.averageCents} hint={`${stats.yearCount} outing${stats.yearCount === 1 ? "" : "s"} in ${year}`} />
      <SummaryCard
        label="Largest outing"
        cents={stats.largest?.amountCents ?? 0}
        hint={stats.largest ? `${stats.largest.place} · ${date(stats.largest.date)}` : "None recorded yet"}
      />
    </div>
  );
}
