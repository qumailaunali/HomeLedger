"use client";

import { useApp } from "@/components/app/app-context";
import { PotStats } from "@/components/ledger/pot-stats";
import type { getHomeStats } from "@/server/queries/summary";

/** Home cards: available balance, this month's total, monthly average, largest. */
export function HomeStats({
  stats,
  balanceCents,
  year,
  month,
}: {
  stats: Awaited<ReturnType<typeof getHomeStats>>;
  balanceCents: number;
  year: number;
  month: number;
}) {
  const { date } = useApp();
  return (
    <PotStats
      type="HOME"
      balanceCents={balanceCents}
      monthCents={stats.monthCents}
      monthCount={stats.monthCount}
      previousMonthCents={stats.previousMonthCents}
      countNoun="expense"
      year={year}
      month={month}
      extra={[
        {
          label: "Monthly average",
          cents: stats.monthlyAverageCents,
          hint: `${stats.activeMonths} month${stats.activeMonths === 1 ? "" : "s"} with spending in ${year}`,
        },
        {
          label: "Largest expense",
          cents: stats.largest?.amountCents ?? 0,
          hint: stats.largest ? `${stats.largest.label} · ${date(stats.largest.date)}` : "None recorded yet",
        },
      ]}
    />
  );
}
