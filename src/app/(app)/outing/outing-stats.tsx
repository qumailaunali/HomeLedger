"use client";

import { useApp } from "@/components/app/app-context";
import { PotStats } from "@/components/ledger/pot-stats";

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
  return (
    <PotStats
      type="OUTING"
      balanceCents={balanceCents}
      monthCents={stats.monthCents}
      monthCount={stats.monthCount}
      previousMonthCents={stats.previousMonthCents}
      countNoun="outing"
      year={year}
      month={month}
      extra={[
        {
          label: "Average outing",
          cents: stats.averageCents,
          hint: `${stats.yearCount} outing${stats.yearCount === 1 ? "" : "s"} in ${year}`,
        },
        {
          label: "Largest outing",
          cents: stats.largest?.amountCents ?? 0,
          hint: stats.largest ? `${stats.largest.place} · ${date(stats.largest.date)}` : "None recorded yet",
        },
      ]}
    />
  );
}
