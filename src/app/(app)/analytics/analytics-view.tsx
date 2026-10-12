"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CircleAlert, Trophy } from "lucide-react";
import { MONTH_NAMES } from "@/lib/dates";
import { useApp } from "@/components/app/app-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form-controls";
import { Segmented } from "@/components/ui/misc";
import { BudgetStatusLabel, PageHeader, ProgressBar, SummaryCard } from "@/components/ledger/display";
import { TYPE_META, primaryLabel } from "@/components/ledger/type-meta";
import { BreakdownDonut, MonthlyLineChart, RankedBarChart, SpendingTrendChart } from "@/components/charts/charts";
import { budgetStatus } from "@/lib/calculations";
import { percentUsed } from "@/lib/money";
import type { AnalyticsData, YearSummary } from "@/server/queries/summary";
import type { BudgetLine } from "@/types";

export type RangeKey = "3m" | "6m" | "year" | "prev-year" | "custom";

export function AnalyticsView({
  rangeKey,
  analytics: a,
  shopping,
  shoppingYear,
  yearSummary,
}: {
  rangeKey: RangeKey;
  analytics: AnalyticsData;
  shopping: { lines: BudgetLine[]; totals: { budgetCents: number; spentCents: number; remainingCents: number } };
  shoppingYear: number;
  yearSummary: YearSummary;
}) {
  const { money, date } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const setParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const noData = a.totals.spentCents === 0 && a.totals.receivedCents === 0;
  const topHome = a.homeCategories[0];
  const exceeding = a.homeCategories.filter((c) => c.monthsOver > 0);
  const near = shopping.lines.filter((l) => l.status === "near");
  const over = shopping.lines.filter((l) => l.status === "over");
  const topSpender = [...shopping.lines].sort((x, y) => y.spentCents - x.spentCents)[0];

  return (
    <>
      <PageHeader title="Analytics" description={`${date(a.from)} – ${date(a.to)}`} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="-mx-1 max-w-full overflow-x-auto px-1">
          <Segmented
            label="Time range"
            value={rangeKey}
            onChange={(v) => setParams({ range: v, ...(v !== "custom" ? { from: null, to: null } : {}) })}
            options={[
              { value: "3m", label: "Last 3 months" },
              { value: "6m", label: "Last 6 months" },
              { value: "year", label: "This year" },
              { value: "prev-year", label: "Previous year" },
              { value: "custom", label: "Custom" },
            ]}
          />
        </div>
        {rangeKey === "custom" && (
          <div className="flex items-center gap-2">
            <Input type="date" aria-label="From" className="h-10 w-auto" defaultValue={a.from} onChange={(e) => e.target.value && setParams({ from: e.target.value })} />
            <span className="text-muted-foreground">–</span>
            <Input type="date" aria-label="To" className="h-10 w-auto" defaultValue={a.to} onChange={(e) => e.target.value && setParams({ to: e.target.value })} />
          </div>
        )}
      </div>

      {noData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">Add some expenses to start seeing your spending trends.</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different time range, or record today&apos;s spending.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section aria-label="Headline numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard label="Total spending" cents={a.totals.spentCents} hint={`Received ${money(a.totals.receivedCents)}`} />
            <SummaryCard label="Average per month" cents={a.averageMonthlyCents} hint={`Over months with spending`} />
            <SummaryCard label="Highest month" cents={a.highestMonth?.cents ?? 0} hint={a.highestMonth?.label ?? "—"} />
            <SummaryCard
              label="Largest expense"
              cents={a.largestExpense?.amountCents ?? 0}
              hint={a.largestExpense ? `${primaryLabel(a.largestExpense)} · ${date(a.largestExpense.date)}` : "—"}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-5">
            <MonthlyLineChart title="Monthly spending" description="Total expenses per month" data={a.series} pick={(m) => m.spentCents} className="lg:col-span-3" />
            <BreakdownDonut
              homeCents={a.totals.homeCents}
              shoppingCents={a.totals.shoppingCents}
              outingCents={a.totals.outingCents}
              title="Category breakdown"
              description="Home · Shopping · Outing"
              className="lg:col-span-2"
            />
          </div>
          <SpendingTrendChart data={a.series} title="Monthly spending by type" />

          {/* Home analytics */}
          <h2 className="pt-2 text-lg font-semibold">Home</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <RankedBarChart
              title="Where Home money goes"
              description={topHome ? `Most expensive: ${topHome.name}` : undefined}
              items={a.homeCategories.map((c) => ({ name: c.name, cents: c.spentCents }))}
              color="var(--home)"
              emptyText="No Home expenses in this period."
            />
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Budget vs actual</CardTitle>
                  <CardDescription>
                    Expected monthly amount × {a.months} month{a.months === 1 ? "" : "s"}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto pt-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th scope="col" className="pb-2 font-medium">Category</th>
                      <th scope="col" className="pb-2 text-right font-medium">Expected</th>
                      <th scope="col" className="pb-2 text-right font-medium">Actual</th>
                      <th scope="col" className="pb-2 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {a.homeCategories.map((c) => {
                      const status = budgetStatus(c.spentCents, c.expectedCents);
                      return (
                        <tr key={c.id}>
                          <th scope="row" className="py-2 text-left font-normal">
                            {c.name}
                            {c.monthsOver > 0 && (
                              <span className="block text-xs text-muted-foreground">
                                Over in {c.monthsOver} month{c.monthsOver === 1 ? "" : "s"}
                              </span>
                            )}
                          </th>
                          <td className="tabular py-2 text-right text-muted-foreground">{c.expectedCents ? money(c.expectedCents) : "—"}</td>
                          <td className="tabular py-2 text-right font-medium">{money(c.spentCents)}</td>
                          <td className="py-2 text-right">
                            <BudgetStatusLabel status={status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {exceeding.length > 0 && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                    Exceeded the expected amount: {exceeding.map((c) => c.name).join(", ")}.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Shopping analytics */}
      <h2 className="pt-2 text-lg font-semibold">Shopping · {shoppingYear}</h2>
      <section aria-label="Shopping summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Total family shopping" cents={shopping.totals.spentCents} hint={`of ${money(shopping.totals.budgetCents)} budget`} />
        <SummaryCard label="Remaining combined" cents={shopping.totals.remainingCents} tone={shopping.totals.remainingCents < 0 ? "danger" : "default"} />
        <SummaryCard label="Highest spender" cents={topSpender?.spentCents ?? 0} icon={Trophy} hint={topSpender?.name ?? "—"} />
        <div className="rounded-2xl border border-border/70 bg-card p-4 text-sm">
          <p className="text-[13px] font-medium text-muted-foreground">Limits</p>
          <p className="mt-2 flex items-center gap-1.5">
            <AlertTriangle className="size-4 text-warning" aria-hidden />
            Close to limit: {near.length ? near.map((l) => l.name).join(", ") : "nobody"}
          </p>
          <p className="mt-1 flex items-center gap-1.5">
            <CircleAlert className="size-4 text-danger" aria-hidden />
            Over limit: {over.length ? over.map((l) => l.name).join(", ") : "nobody"}
          </p>
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <RankedBarChart
          title="Spending by family member"
          description="Spent this year"
          items={shopping.lines.map((l) => ({
            name: l.name,
            cents: l.spentCents,
            extra: l.budgetCents ? `${l.percent}% of ${money(l.budgetCents)}` : "No budget set",
          }))}
          color="var(--shopping)"
          emptyText="No shopping recorded this year."
        />
        <Card>
          <CardHeader>
            <CardTitle>Spent / budget</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-3">
            {shopping.lines.map((l) => (
              <div key={l.id} className="grid gap-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{l.name}</span>
                  <span className="tabular">
                    {money(l.spentCents)} / {money(l.budgetCents)}
                    <span className="ml-2 text-muted-foreground">{l.budgetCents ? `${percentUsed(l.spentCents, l.budgetCents)}% used` : ""}</span>
                  </span>
                </div>
                <ProgressBar percent={l.percent} status={l.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Outing analytics */}
      {!noData && (
        <>
          <h2 className="pt-2 text-lg font-semibold">Outing</h2>
          <section aria-label="Outing summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard label="Total on outings" cents={a.outing.totalCents} hint={`${a.outing.count} outings`} />
            <SummaryCard label="Average outing" cents={a.outing.averageCents} />
            <SummaryCard
              label="Most expensive outing"
              cents={a.outing.largest?.amountCents ?? 0}
              hint={a.outing.largest ? `${a.outing.largest.place} · ${date(a.outing.largest.date)}` : "—"}
              className="col-span-2"
            />
          </section>
          <MonthlyLineChart
            title="Monthly outing spending"
            description="With the number of outings per month"
            data={a.series}
            pick={(m) => m.outingCents}
            color="var(--outing)"
            seriesLabel="Outing"
            countLabel={(m) => String(m.outingCount)}
          />
        </>
      )}

      <YearSummaryCard summary={yearSummary} onYear={(y) => setParams({ sy: String(y) })} />
    </>
  );
}

function YearSummaryCard({ summary, onYear }: { summary: YearSummary; onYear: (y: number) => void }) {
  const { money } = useApp();
  const t = summary.totals;
  return (
    <Card>
      <CardHeader className="flex-col sm:flex-row">
        <div>
          <CardTitle>Yearly summary · {summary.year}</CardTitle>
          <CardDescription>January to December</CardDescription>
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded-lg px-2 py-1 text-sm hover:bg-accent" onClick={() => onYear(summary.year - 1)} aria-label="Previous year">
            ‹ {summary.year - 1}
          </button>
          <button className="rounded-lg px-2 py-1 text-sm hover:bg-accent" onClick={() => onYear(summary.year + 1)} aria-label="Next year">
            {summary.year + 1} ›
          </button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 pt-3">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Total received", t.receivedCents],
            ["Total expenses", t.spentCents],
            ["Home", t.homeCents],
            ["Shopping", t.shoppingCents],
            ["Outing", t.outingCents],
            ["Avg. monthly spend", summary.averageMonthlyCents],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded-xl bg-muted/60 px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="tabular font-semibold">{money(v as number)}</dd>
            </div>
          ))}
        </dl>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="pb-2 font-medium">Month</th>
                <th scope="col" className="pb-2 text-right font-medium">Received</th>
                {(["HOME", "SHOPPING", "OUTING"] as const).map((k) => (
                  <th key={k} scope="col" className="pb-2 text-right font-medium">{TYPE_META[k].label}</th>
                ))}
                <th scope="col" className="pb-2 text-right font-medium">Total spent</th>
                <th scope="col" className="pb-2 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {summary.series.map((m) => (
                <tr key={m.month}>
                  <th scope="row" className="py-2 text-left font-normal">{MONTH_NAMES[m.month - 1]}</th>
                  <td className="tabular py-2 text-right text-positive">{m.receivedCents ? money(m.receivedCents) : "—"}</td>
                  <td className="tabular py-2 text-right">{m.homeCents ? money(m.homeCents) : "—"}</td>
                  <td className="tabular py-2 text-right">{m.shoppingCents ? money(m.shoppingCents) : "—"}</td>
                  <td className="tabular py-2 text-right">{m.outingCents ? money(m.outingCents) : "—"}</td>
                  <td className="tabular py-2 text-right font-medium">{m.spentCents ? money(m.spentCents) : "—"}</td>
                  <td className={`tabular py-2 text-right ${m.receivedCents - m.spentCents < 0 ? "text-danger" : ""}`}>
                    {m.receivedCents || m.spentCents ? money(m.receivedCents - m.spentCents, { signed: true }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
