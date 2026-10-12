"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { incomeSchema, INCOME_SOURCES, type IncomeInput } from "@/lib/validation";
import { createIncome, updateIncome } from "@/server/actions/transactions";
import { centsToInput } from "@/lib/money";
import { todayIso } from "@/lib/dates";
import { cn, newClientId } from "@/lib/utils";
import { enqueue, isNetworkError } from "@/lib/offline-queue";
import { useApp } from "@/components/app/app-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { AmountInput } from "@/components/ledger/amount-input";
import { TYPE_META } from "@/components/ledger/type-meta";
import type { ExpenseType, TransactionRow } from "@/types";

const POTS: ExpenseType[] = ["HOME", "OUTING", "SHOPPING"];

export function IncomeForm({
  edit,
  defaultPot = "HOME",
  onDone,
}: {
  edit?: TransactionRow;
  defaultPot?: ExpenseType;
  onDone: () => void;
}) {
  const { prefs } = useApp();
  const toast = useToast();
  const [saving, setSaving] = React.useState(false);
  // Idempotency key for this entry; renewed after each successful save.
  const [clientId, setClientId] = React.useState(newClientId);

  const form = useForm<IncomeInput>({
    resolver: zodResolver(incomeSchema),
    defaultValues: edit
      ? {
          amount: centsToInput(edit.amountCents),
          date: edit.date,
          description: edit.description === edit.source ? "" : edit.description,
          source: edit.source ?? "",
          pot: edit.pot ?? undefined,
        }
      : { amount: "", date: todayIso(), description: "", source: "House money", pot: defaultPot },
  });
  const { register, handleSubmit, setValue, setError, formState } = form;
  const source = useWatch({ control: form.control, name: "source" });
  const pot = useWatch({ control: form.control, name: "pot" });
  const errors = formState.errors;

  async function save(values: IncomeInput) {
    setSaving(true);
    const payload = { ...values, clientId: edit ? undefined : clientId };
    try {
      const res = edit ? await updateIncome(edit.id, values) : await createIncome(payload);
      if (!res.ok) {
        for (const [key, message] of Object.entries(res.fieldErrors ?? {})) setError(key as keyof IncomeInput, { message });
        toast.error(res.error);
        return;
      }
      toast.success(edit ? "Record updated" : "Money received added");
      setClientId(newClientId());
      onDone();
    } catch (err) {
      if (!edit && isNetworkError(err)) {
        enqueue({ kind: "income", clientId: clientId, payload, queuedAt: new Date().toISOString(), label: `Received · ${values.amount}` });
        toast.info("You're offline. This is saved on this device and will sync automatically.");
        onDone();
      } else {
        toast.error("Could not save. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(save)} className="grid gap-4">
      <Field label="Amount received" htmlFor="income-amount" error={errors.amount?.message}>
        <AmountInput
          id="income-amount"
          symbol={prefs.currencySymbol}
          autoFocus
          aria-invalid={!!errors.amount}
          className="text-positive"
          {...register("amount")}
        />
      </Field>

      <div className="grid gap-1.5">
        <span className="text-[13px] font-medium text-foreground/85" id="pot-label">
          Add to
        </span>
        <div role="radiogroup" aria-labelledby="pot-label" className="grid grid-cols-3 gap-2">
          {POTS.map((p) => {
            const Icon = TYPE_META[p].icon;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={pot === p}
                onClick={() => setValue("pot", p, { shouldValidate: formState.isSubmitted })}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  pot === p ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:bg-accent",
                )}
              >
                <Icon className={cn("size-4", pot !== p && TYPE_META[p].text)} aria-hidden />
                {TYPE_META[p].label}
              </button>
            );
          })}
        </div>
        {errors.pot && (
          <p role="alert" className="text-[13px] text-danger">
            {errors.pot.message}
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <span className="text-[13px] font-medium text-foreground/85" id="source-label">
          Source <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <div role="radiogroup" aria-labelledby="source-label" className="flex flex-wrap gap-2">
          {INCOME_SOURCES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={source === s}
              onClick={() => setValue("source", source === s ? "" : s)}
              className={cn(
                "min-h-9 rounded-xl border px-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                source === s ? "border-positive bg-positive-soft text-positive" : "bg-card hover:bg-accent",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[10.5rem_1fr]">
        <Field label="Date" htmlFor="income-date" error={errors.date?.message}>
          <Input id="income-date" type="date" {...register("date")} />
        </Field>
        <Field label="Description / Note" htmlFor="income-desc" optional error={errors.description?.message}>
          <Input id="income-desc" placeholder="e.g. October house money" autoComplete="off" {...register("description")} />
        </Field>
      </div>

      <Button type="submit" size="xl" className="mt-1 w-full bg-positive text-white hover:bg-positive/90 sm:ml-auto sm:w-auto sm:min-w-40" disabled={saving}>
        {saving && <Loader2 className="animate-spin" />}
        {edit ? "Save changes" : "Add money received"}
      </Button>
    </form>
  );
}
