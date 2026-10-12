"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { completeOnboarding } from "@/server/actions/auth";
import { onboardingSchema, firstIssue } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";

const SUGGESTED_CATEGORIES = [
  "Food",
  "Groceries",
  "Internet",
  "Cable",
  "Electricity",
  "Gas",
  "Masi",
  "Madrasa",
  "Madrasa Van",
  "Quran",
  "Qumail Van",
  "Taha Van",
  "Mehran Petrol",
  "Petrol Freed",
  "Chokidar",
  "KC",
  "Pocket Money",
];

const SUGGESTED_MEMBERS: [string, string][] = [
  ["Sarah", "35000"],
  ["Qumail", "35000"],
  ["Taha", "35000"],
  ["Farida", "35000"],
  ["Others", "100000"],
];

const CURRENCIES = [
  ["PKR", "Rs."],
  ["AED", "AED"],
  ["SAR", "SAR"],
  ["USD", "$"],
  ["GBP", "£"],
  ["EUR", "€"],
];

interface Row {
  name: string;
  amount: string;
  selected: boolean;
  /** Home categories: budget field opened (budgets are optional). */
  budgetOpen?: boolean;
}

const STEPS = ["Household", "Currency", "Home categories", "Shopping members", "Yearly budgets"];

export function OnboardingWizard({ defaultName, userName, year }: { defaultName: string; userName: string; year: number }) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState(defaultName);
  const [currency, setCurrency] = React.useState("PKR");
  const [symbol, setSymbol] = React.useState("Rs.");
  const [startingBalance, setStartingBalance] = React.useState("");
  const [categories, setCategories] = React.useState<Row[]>(SUGGESTED_CATEGORIES.map((n) => ({ name: n, amount: "", selected: true })));
  const [members, setMembers] = React.useState<Row[]>(SUGGESTED_MEMBERS.map(([n, a]) => ({ name: n, amount: a, selected: true })));
  const [newCategory, setNewCategory] = React.useState("");
  const [newMember, setNewMember] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const payload = () => ({
    householdName: name,
    currency,
    currencySymbol: symbol,
    startingBalance,
    categories: categories.filter((c) => c.selected && c.name.trim()).map((c) => ({ name: c.name.trim(), expectedMonthlyAmount: c.amount })),
    members: members.filter((m) => m.selected && m.name.trim()).map((m) => ({ name: m.name.trim(), yearlyBudget: m.amount })),
  });

  function next() {
    if (step === 0 && !name.trim()) return toast.error("Enter a household name.");
    if (step === STEPS.length - 1) return finish();
    setStep((s) => s + 1);
  }

  async function finish() {
    const data = payload();
    const check = onboardingSchema.safeParse(data);
    if (!check.success) return toast.error(firstIssue(check.error));
    setSaving(true);
    const res = await completeOnboarding(data, year).catch(() => null);
    if (!res?.ok) {
      setSaving(false);
      return toast.error(res && !res.ok ? res.error : "Could not finish setup. Please try again.");
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Welcome, {userName.split(" ")[0]}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Let&apos;s set up your household</h1>
        <ol className="mt-5 flex gap-1.5" aria-label="Setup progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <span className={cn("block h-1.5 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
              <span className="sr-only">
                Step {i + 1}: {s}
                {i < step ? " (done)" : i === step ? " (current)" : ""}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 sm:p-6">
          {step === 0 && (
            <Field label="Household name" htmlFor="ob-name" hint="Shown in the app and on exports.">
              <Input id="ob-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && next()} />
            </Field>
          )}

          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Currency" htmlFor="ob-currency">
                  <NativeSelect
                    id="ob-currency"
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value);
                      setSymbol(CURRENCIES.find((c) => c[0] === e.target.value)?.[1] ?? e.target.value);
                    }}
                  >
                    {CURRENCIES.map(([c]) => (
                      <option key={c}>{c}</option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Symbol" htmlFor="ob-symbol">
                  <Input id="ob-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
                </Field>
              </div>
              <Field
                label="Money you have right now"
                htmlFor="ob-balance"
                optional
                hint="Your starting balance. From here on, the balance updates itself as you add money received and expenses."
              >
                <Input id="ob-balance" inputMode="decimal" placeholder="e.g. 60950" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value.replace(/[^\d.,-]/g, ""))} />
              </Field>
            </>
          )}

          {step === 2 && (
            <RowsEditor
              intro="These are your Home expense categories. Remove any you don’t need, add your own, and optionally set a monthly budget for some. You can change all of this later in Settings."
              amountLabel="monthly budget"
              symbol={symbol}
              rows={categories}
              setRows={setCategories}
              newValue={newCategory}
              setNewValue={setNewCategory}
              addLabel="Add category"
            />
          )}

          {step === 3 && (
            <RowsEditor
              intro="Who has their own shopping budget? Keep “Others” for things like medicine, books or car accessories."
              symbol={symbol}
              rows={members}
              setRows={setMembers}
              newValue={newMember}
              setNewValue={setNewMember}
              addLabel="Add person"
              hideAmounts
            />
          )}

          {step === 4 && (
            <>
              <p className="text-sm text-muted-foreground">Set each person&apos;s shopping budget for {year}. Next year can have different amounts.</p>
              <ul className="grid gap-2">
                {members
                  .filter((m) => m.selected && m.name.trim())
                  .map((m) => (
                    <li key={m.name} className="flex items-center gap-3">
                      <label htmlFor={`ob-b-${m.name}`} className="flex-1 text-sm font-medium">
                        {m.name}
                      </label>
                      <div className="relative w-44">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{symbol}</span>
                        <Input
                          id={`ob-b-${m.name}`}
                          inputMode="decimal"
                          className="pl-11 text-right"
                          value={m.amount}
                          onChange={(e) => setMembers((rows) => rows.map((r) => (r.name === m.name ? { ...r, amount: e.target.value.replace(/[^\d.,]/g, "") } : r)))}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={saving}>
            Back
          </Button>
        )}
        <Button size="lg" className="ml-auto min-w-40" onClick={next} disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          {step === STEPS.length - 1 ? "Go to Dashboard" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function RowsEditor({
  intro,
  amountLabel,
  symbol,
  rows,
  setRows,
  newValue,
  setNewValue,
  addLabel,
  hideAmounts,
}: {
  intro: string;
  amountLabel?: string;
  symbol: string;
  rows: Row[];
  setRows: React.Dispatch<React.SetStateAction<Row[]>>;
  newValue: string;
  setNewValue: (v: string) => void;
  addLabel: string;
  hideAmounts?: boolean;
}) {
  const add = () => {
    const v = newValue.trim();
    if (!v || rows.some((r) => r.name.toLowerCase() === v.toLowerCase())) return;
    setRows((r) => [...r, { name: v, amount: "", selected: true }]);
    setNewValue("");
  };
  return (
    <>
      <p className="text-sm text-muted-foreground">{intro}</p>
      <ul className="grid gap-1.5">
        {rows.map((r, i) => {
          const update = (patch: Partial<Row>) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
          return (
            <li key={`${r.name}-${i}`} className="flex min-h-10 items-center gap-2 rounded-xl border bg-card px-3 py-1.5">
              <span className="flex-1 truncate text-sm font-medium">{r.name}</span>
              {!hideAmounts &&
                (r.budgetOpen ? (
                  <div className="relative w-36">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{symbol}</span>
                    <Input
                      aria-label={`${r.name} ${amountLabel ?? "budget"}`}
                      inputMode="decimal"
                      autoFocus
                      className="h-8 pl-10 text-right text-sm"
                      value={r.amount}
                      placeholder="Budget"
                      onChange={(e) => update({ amount: e.target.value.replace(/[^d.,]/g, "") })}
                      onBlur={() => !r.amount && update({ budgetOpen: false })}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => update({ budgetOpen: true })}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    + Budget
                  </button>
                ))}
              <button
                type="button"
                aria-label={`Remove ${r.name}`}
                onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <Input
          aria-label={addLabel}
          placeholder={addLabel}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="outline" onClick={add} aria-label={addLabel}>
          <Plus />
        </Button>
      </div>
    </>
  );
}
