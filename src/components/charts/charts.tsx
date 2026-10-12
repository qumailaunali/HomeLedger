"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Table2 } from "lucide-react";
import { formatMoneyCompact } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ledger/display";
import { TYPE_CHART_COLOR, TYPE_META } from "@/components/ledger/type-meta";
import type { MonthTotals } from "@/types";

const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" };
const EXPENSE_KEYS = [
  { key: "homeCents", type: "HOME" },
  { key: "shoppingCents", type: "SHOPPING" },
  { key: "outingCents", type: "OUTING" },
] as const;

/** Card with a chart/table switch, so every chart also has an accessible table view. */
export function ChartCard({
  title,
  description,
  empty,
  emptyText = "Add some expenses to start seeing your spending trends.",
  table,
  legend,
  children,
  className,
}: {
  title: string;
  description?: string;
  empty?: boolean;
  emptyText?: string;
  table: React.ReactNode;
  legend?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [view, setView] = React.useState<"chart" | "table">("chart");
  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {!empty && (
          <button
            type="button"
            onClick={() => setView(view === "chart" ? "table" : "chart")}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-pressed={view === "table"}
          >
            {view === "chart" ? <Table2 className="size-3.5" aria-hidden /> : <BarChart3 className="size-3.5" aria-hidden />}
            {view === "chart" ? "Table" : "Chart"}
          </button>
        )}
      </CardHeader>
      <CardContent className="pt-3">
        {empty ? (
          <EmptyState icon={BarChart3} title="Nothing to chart yet" description={emptyText} className="py-6" />
        ) : view === "chart" ? (
          <>
            {legend}
            {children}
          </>
        ) : (
          <div className="max-h-80 overflow-auto">{table}</div>
        )}
      </CardContent>
    </Card>
  );
}

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="min-w-40 rounded-xl border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-lg">
      <p className="mb-1.5 font-semibold">{title}</p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} aria-hidden />}
            {r.label}
          </span>
          <span className="tabular font-medium">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} aria-hidden />
          <span className="text-muted-foreground">{i.label}</span>
          {i.value && <span className="tabular font-medium">{i.value}</span>}
        </li>
      ))}
    </ul>
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          {head.map((h, i) => (
            <th key={h} className={cn("py-2 font-medium", i > 0 && "text-right")} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/60">
        {rows.map((r, ri) => (
          <tr key={ri}>
            {r.map((c, ci) => (
              <td key={ci} className={cn("tabular py-2", ci > 0 && "text-right")}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Monthly spending, stacked by Home / Shopping / Outing. */
export function SpendingTrendChart({
  data,
  title = "Monthly spending",
  description,
  height = 240,
  className,
}: {
  data: MonthTotals[];
  title?: string;
  description?: string;
  height?: number;
  className?: string;
}) {
  const { money, prefs } = useApp();
  const empty = data.every((d) => d.spentCents === 0);
  const rows = data.map((d) => ({ ...d, homeCents: d.homeCents / 100, shoppingCents: d.shoppingCents / 100, outingCents: d.outingCents / 100 }));
  return (
    <ChartCard
      title={title}
      description={description}
      className={className}
      empty={empty}
      legend={<Legend items={EXPENSE_KEYS.map((k) => ({ label: TYPE_META[k.type].label, color: TYPE_CHART_COLOR[k.type] }))} />}
      table={
        <SimpleTable
          head={["Month", "Home", "Shopping", "Outing", "Total"]}
          rows={data.map((d) => [`${d.label} ${d.year}`, money(d.homeCents), money(d.shoppingCents), money(d.outingCents), money(d.spentCents)])}
        />
      }
    >
      <div style={{ height }} className="-ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis
              tick={AXIS}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v: number) => formatMoneyCompact(v * 100, prefs.currencySymbol)}
            />
            <Tooltip
              cursor={{ fill: "var(--accent)", opacity: 0.6 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as MonthTotals & { year: number };
                const src = data.find((x) => x.year === d.year && x.month === d.month)!;
                return (
                  <TooltipBox
                    title={`${src.label} ${src.year}`}
                    rows={[
                      ...EXPENSE_KEYS.map((k) => ({ label: TYPE_META[k.type].label, value: money(src[k.key]), color: TYPE_CHART_COLOR[k.type] })),
                      { label: "Total", value: money(src.spentCents) },
                    ]}
                  />
                );
              }}
            />
            {EXPENSE_KEYS.map((k, i) => (
              <Bar
                key={k.key}
                dataKey={k.key}
                stackId="spend"
                fill={TYPE_CHART_COLOR[k.type]}
                stroke="var(--card)"
                strokeWidth={2}
                radius={i === EXPENSE_KEYS.length - 1 ? [4, 4, 0, 0] : 0}
                maxBarSize={36}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/** Home vs Shopping vs Outing share — donut with values in the legend. */
export function BreakdownDonut({
  homeCents,
  shoppingCents,
  outingCents,
  title = "Where the money went",
  description,
  className,
}: {
  homeCents: number;
  shoppingCents: number;
  outingCents: number;
  title?: string;
  description?: string;
  className?: string;
}) {
  const { money } = useApp();
  const total = homeCents + shoppingCents + outingCents;
  const slices = [
    { type: "HOME" as const, cents: homeCents },
    { type: "SHOPPING" as const, cents: shoppingCents },
    { type: "OUTING" as const, cents: outingCents },
  ].map((s) => ({ ...s, label: TYPE_META[s.type].label, percent: total ? Math.round((s.cents * 100) / total) : 0 }));

  return (
    <ChartCard
      title={title}
      description={description}
      className={className}
      empty={total === 0}
      emptyText="No expenses in this period yet."
      table={<SimpleTable head={["Type", "Amount", "Share"]} rows={slices.map((s) => [s.label, money(s.cents), `${s.percent}%`])} />}
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative size-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices.filter((s) => s.cents > 0)}
                dataKey="cents"
                nameKey="label"
                innerRadius="68%"
                outerRadius="100%"
                paddingAngle={2}
                cornerRadius={4}
                stroke="var(--card)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {slices
                  .filter((s) => s.cents > 0)
                  .map((s) => (
                    <Cell key={s.type} fill={TYPE_CHART_COLOR[s.type]} />
                  ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const s = payload[0].payload as (typeof slices)[number];
                  return <TooltipBox title={s.label} rows={[{ label: "Spent", value: money(s.cents) }, { label: "Share", value: `${s.percent}%` }]} />;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="tabular text-sm font-semibold">{money(total)}</span>
          </div>
        </div>
        <ul className="grid w-full gap-2.5">
          {slices.map((s) => (
            <li key={s.type} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-[3px]" style={{ background: TYPE_CHART_COLOR[s.type] }} aria-hidden />
                {s.label}
              </span>
              <span className="tabular">
                <span className="font-medium">{money(s.cents)}</span>
                <span className="ml-2 inline-block w-9 text-right text-muted-foreground">{s.percent}%</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}

/** Ranked horizontal bars (one series, one hue) with value labels. */
export function RankedBarChart({
  title,
  description,
  items,
  color,
  emptyText,
  valueLabel = "Spent",
}: {
  title: string;
  description?: string;
  items: { name: string; cents: number; extra?: string }[];
  color: string;
  emptyText?: string;
  valueLabel?: string;
}) {
  const { money, prefs } = useApp();
  const data = items.filter((i) => i.cents > 0).slice(0, 12);
  const total = data.reduce((s, i) => s + i.cents, 0);
  return (
    <ChartCard
      title={title}
      description={description}
      empty={data.length === 0}
      emptyText={emptyText}
      table={
        <SimpleTable
          head={["Name", valueLabel, "Share"]}
          rows={data.map((i) => [i.name, money(i.cents), `${total ? Math.round((i.cents * 100) / total) : 0}%`])}
        />
      }
    >
      <div style={{ height: Math.max(data.length * 38, 80) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.map((d) => ({ ...d, value: d.cents / 100 }))} layout="vertical" margin={{ right: 88 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={104} />
            <Tooltip
              cursor={{ fill: "var(--accent)", opacity: 0.6 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof data)[number];
                return (
                  <TooltipBox
                    title={d.name}
                    rows={[
                      { label: valueLabel, value: money(d.cents) },
                      { label: "Share", value: `${total ? Math.round((d.cents * 100) / total) : 0}%` },
                      ...(d.extra ? [{ label: "", value: d.extra }] : []),
                    ]}
                  />
                );
              }}
            />
            <Bar
              dataKey="value"
              fill={color}
              radius={[0, 4, 4, 0]}
              maxBarSize={18}
              isAnimationActive={false}
              label={{
                position: "right",
                fontSize: 12,
                fill: "var(--foreground)",
                formatter: (v: unknown) => formatMoneyCompact(Number(v) * 100, prefs.currencySymbol),
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/** Single-series line over months (e.g. total spending or outing spending). */
export function MonthlyLineChart({
  title,
  description,
  data,
  pick,
  color = "var(--foreground)",
  seriesLabel = "Spent",
  countLabel,
  className,
}: {
  className?: string;
  title: string;
  description?: string;
  data: MonthTotals[];
  pick: (m: MonthTotals) => number;
  color?: string;
  seriesLabel?: string;
  countLabel?: (m: MonthTotals) => string | null;
}) {
  const { money, prefs } = useApp();
  const rows = data.map((m) => ({ label: m.label, value: pick(m) / 100, src: m }));
  const empty = rows.every((r) => r.value === 0);
  return (
    <ChartCard
      title={title}
      description={description}
      className={className}
      empty={empty}
      table={
        <SimpleTable
          head={["Month", seriesLabel, ...(countLabel ? ["Count"] : [])]}
          rows={data.map((m) => [`${m.label} ${m.year}`, money(pick(m)), ...(countLabel ? [countLabel(m) ?? "—"] : [])])}
        />
      }
    >
      <div className="-ml-2 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis
              tick={AXIS}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v: number) => formatMoneyCompact(v * 100, prefs.currencySymbol)}
            />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const r = payload[0].payload as (typeof rows)[number];
                const count = countLabel?.(r.src);
                return (
                  <TooltipBox
                    title={`${r.src.label} ${r.src.year}`}
                    rows={[{ label: seriesLabel, value: money(pick(r.src)) }, ...(count ? [{ label: "Count", value: count }] : [])]}
                  />
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: color }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
