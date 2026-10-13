"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { MONTH_NAMES, shiftMonth } from "@/lib/dates";
import { percentChange } from "@/lib/calculations";
import { SummaryCard } from "@/components/ledger/display";
import { TYPE_META } from "@/components/ledger/type-meta";

interface StatCard {
  label: string;
  cents: number;
  hint: React.ReactNode;
}

/** "Available balance" card for a money pot. */
export function PotBalanceCard({ type, balanceCents }: { type: "HOME" | "OUTING" | "SHOPPING"; balanceCents: number }) {
  const meta = TYPE_META[type];
  return (
    <SummaryCard
      label="Available balance"
      cents={balanceCents}
      tone={balanceCents < 0 ? "danger" : "positive"}
      icon={Wallet}
      iconClass={cn(meta.soft, meta.text)}
      hint={balanceCents < 0 ? "Spent more than was added" : `Left in the ${meta.label} pot`}
    />
  );
}

/**
 * Summary cards for a money pot page (Home, Outing): available balance and
 * this month's total are always shown; the two page-specific cards collapse
 * on phones so transactions are reachable with less scroll.
 */
export function PotStats({
  type,
  balanceCents,
  monthCents,
  monthCount,
  previousMonthCents,
  countNoun,
  month,
  year,
  extra,
}: {
  type: "HOME" | "OUTING";
  balanceCents: number;
  monthCents: number;
  monthCount: number;
  previousMonthCents: number;
  /** Singular noun for the month count, e.g. "outing". */
  countNoun: string;
  year: number;
  month: number;
  extra: [StatCard, StatCard];
}) {
  const [expanded, setExpanded] = React.useState(
    () => typeof window === "undefined" || !window.matchMedia("(max-width: 639px)").matches,
  );
  const prev = MONTH_NAMES[shiftMonth(year, month, -1).month - 1];
  const change = percentChange(monthCents, previousMonthCents);
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PotBalanceCard type={type} balanceCents={balanceCents} />
        <SummaryCard
          label={`Total in ${MONTH_NAMES[month - 1]}`}
          cents={monthCents}
          hint={
            <span className="inline-flex flex-wrap items-center gap-1">
              {monthCount} {countNoun}
              {monthCount === 1 ? "" : "s"}
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
        {extra.map((card) => (
          <SummaryCard
            key={card.label}
            label={card.label}
            cents={card.cents}
            hint={card.hint}
            className={cn(!expanded && "hidden sm:block")}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="inline-flex min-h-11 items-center justify-center gap-1 justify-self-center text-sm font-medium text-muted-foreground sm:hidden"
      >
        {expanded ? "Show less" : "More stats"}
        <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} aria-hidden />
      </button>
    </div>
  );
}
