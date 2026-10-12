"use client";

import * as React from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { parseAmountToCents, centsToInput } from "@/lib/money";
import { copyBudgets, setYearlyBudget } from "@/server/actions/settings";
import type { SettingsMember } from "@/server/queries/settings";
import { useApp } from "@/components/app/app-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AmountInput } from "@/components/ledger/amount-input";
import { MonthSelector } from "@/components/ledger/month-selector";

/**
 * Yearly shopping budgets, one row per member per year. Changing next year's
 * budget never touches past years, so historical records keep the right limit.
 */
export function BudgetsManager({ members, year, currentYear }: { members: SettingsMember[]; year: number; currentYear: number }) {
  const { money, prefs } = useApp();
  const toast = useToast();
  const [copying, setCopying] = React.useState(false);
  const years = Array.from(new Set(members.flatMap((m) => m.budgets.map((b) => b.year)))).sort((a, b) => b - a);
  const hasPrev = members.some((m) => m.budgets.some((b) => b.year === year - 1));
  const missing = members.filter((m) => m.isActive && !m.budgets.some((b) => b.year === year)).length;

  return (
    <>
      <Card>
        <CardHeader className="flex-col sm:flex-row">
          <div>
            <CardTitle>Shopping budgets for {year}</CardTitle>
            <CardDescription>Set each person&apos;s yearly limit. Press Enter or leave the field to save.</CardDescription>
          </div>
          <MonthSelector year={year} month={1} mode="year" />
        </CardHeader>
        <CardContent className="grid gap-1 pt-2">
          {members.length === 0 && <p className="py-4 text-sm text-muted-foreground">Add shopping members first.</p>}
          {members.map((m) => (
            <BudgetRow key={`${m.id}-${year}`} member={m} year={year} symbol={prefs.currencySymbol} />
          ))}
          {hasPrev && missing > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-muted px-3 py-2.5 text-sm">
              <span className="flex-1">
                {missing} member{missing === 1 ? " has" : "s have"} no {year} budget yet.
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={copying}
                onClick={async () => {
                  setCopying(true);
                  const res = await copyBudgets(year - 1, year).catch(() => null);
                  setCopying(false);
                  if (res?.ok) toast.success(`Copied ${res.data.copied} budget${res.data.copied === 1 ? "" : "s"} from ${year - 1}`);
                  else toast.error("Could not copy budgets.");
                }}
              >
                {copying ? <Loader2 className="animate-spin" /> : <Copy />} Copy from {year - 1}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {years.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Budget history</CardTitle>
              <CardDescription>Previous and upcoming years</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto pt-2">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th scope="col" className="pb-2 font-medium">Person</th>
                  {years.map((y) => (
                    <th key={y} scope="col" className={`pb-2 text-right font-medium ${y === currentYear ? "text-foreground" : ""}`}>
                      {y}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {members.map((m) => (
                  <tr key={m.id}>
                    <th scope="row" className="py-2 text-left font-normal">{m.name}</th>
                    {years.map((y) => {
                      const b = m.budgets.find((x) => x.year === y);
                      return (
                        <td key={y} className="tabular py-2 text-right">
                          {b ? money(b.cents) : <span className="text-muted-foreground">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function BudgetRow({ member, year, symbol }: { member: SettingsMember; year: number; symbol: string }) {
  const toast = useToast();
  const current = member.budgets.find((b) => b.year === year);
  const [value, setValue] = React.useState(current ? centsToInput(current.cents) : "");
  const [state, setState] = React.useState<"idle" | "saving" | "saved">("idle");
  const savedValue = current ? centsToInput(current.cents) : "";

  async function save() {
    if (value === savedValue || (value === "" && !current)) return;
    if (parseAmountToCents(value || "0") === null) {
      toast.error("Enter a valid amount.");
      return;
    }
    setState("saving");
    const res = await setYearlyBudget({ memberId: member.id, year, amount: value || "0" }).catch(() => null);
    if (res?.ok) {
      setState("saved");
      toast.success("Budget updated");
      setTimeout(() => setState("idle"), 1500);
    } else {
      setState("idle");
      toast.error(res && !res.ok ? res.error : "Could not update the budget.");
    }
  }

  return (
    <div className="flex items-center gap-3 py-1.5">
      <label htmlFor={`budget-${member.id}`} className="min-w-0 flex-1 truncate text-sm font-medium">
        {member.name}
        {!member.isActive && <span className="ml-2 text-xs font-normal text-muted-foreground">Disabled</span>}
      </label>
      <div className="w-44 sm:w-52">
        <AmountInput
          id={`budget-${member.id}`}
          size="default"
          symbol={symbol}
          value={value}
          placeholder="Not set"
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            }
          }}
        />
      </div>
      <span className="flex w-5 justify-center" aria-live="polite">
        {state === "saving" && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Saving" />}
        {state === "saved" && <Check className="size-4 text-positive" aria-label="Saved" />}
      </span>
    </div>
  );
}
