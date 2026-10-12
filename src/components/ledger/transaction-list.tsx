"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { relativeDayLabel } from "@/lib/dates";
import { useApp } from "@/components/app/app-context";
import { TYPE_META, TypeIcon, primaryLabel, targetLabel } from "./type-meta";
import type { TransactionRow } from "@/types";

/** Activity list grouped by day: "Today", "Yesterday", "Oct 9, 2026"… */
export function TransactionList({
  rows,
  showBalance,
  secondary,
}: {
  rows: TransactionRow[];
  showBalance?: boolean;
  secondary?: (row: TransactionRow) => React.ReactNode;
}) {
  const { prefs, money, openTransaction } = useApp();
  const groups = React.useMemo(() => {
    const out: { label: string; rows: TransactionRow[] }[] = [];
    for (const r of rows) {
      const label = relativeDayLabel(r.date, prefs.today, prefs.dateFormat);
      const last = out[out.length - 1];
      if (last && last.label === label) last.rows.push(r);
      else out.push({ label, rows: [r] });
    }
    return out;
  }, [rows, prefs.today, prefs.dateFormat]);

  return (
    <div className="grid gap-4">
      {groups.map((g, gi) => (
        <section key={`${g.label}-${gi}`} aria-label={g.label}>
          <h3 className="px-1 pb-1 text-xs font-semibold text-muted-foreground">{g.label}</h3>
          <ul className="divide-y divide-border/60">
            {g.rows.map((r) => {
              const income = r.kind === "INCOME";
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => openTransaction(r)}
                    className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <TypeIcon type={r.type} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{primaryLabel(r)}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {secondary ? secondary(r) : `${TYPE_META[r.type].label}${r.type === "OUTING" ? "" : ` · ${targetLabel(r)}`}`}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className={cn("tabular block text-sm font-semibold", income && "text-positive")}>
                        {income ? "+" : ""}
                        {money(r.amountCents)}
                      </span>
                      {showBalance && <span className="tabular block text-xs text-muted-foreground">Bal. {money(r.balanceCents)}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
