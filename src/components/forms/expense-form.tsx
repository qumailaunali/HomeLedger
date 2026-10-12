"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Loader2 } from "lucide-react";
import { expenseSchema, PAYMENT_METHODS, type ExpenseInput } from "@/lib/validation";
import { createExpense, updateExpense } from "@/server/actions/transactions";
import { centsToInput } from "@/lib/money";
import { todayIso } from "@/lib/dates";
import { cn, newClientId } from "@/lib/utils";
import { enqueue, isNetworkError } from "@/lib/offline-queue";
import { useApp } from "@/components/app/app-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";
import { AmountInput } from "@/components/ledger/amount-input";
import { TYPE_META, TypeIcon } from "@/components/ledger/type-meta";
import type { ExpenseType, TransactionRow } from "@/types";

const TYPES: ExpenseType[] = ["HOME", "SHOPPING", "OUTING"];

function initialValues(
  type: ExpenseType | undefined,
  edit?: TransactionRow,
  preset?: { categoryId?: string; memberId?: string },
): ExpenseInput {
  if (edit && edit.type !== "RECEIVED") {
    return {
      type: edit.type,
      amount: centsToInput(edit.amountCents),
      date: edit.date,
      description: edit.type === "OUTING" && edit.description === edit.place ? "" : edit.description,
      notes: edit.notes ?? "",
      homeCategoryId: edit.homeCategoryId ?? "",
      shoppingMemberId: edit.shoppingMemberId ?? "",
      place: edit.place ?? "",
      numberOfPeople: edit.numberOfPeople ? String(edit.numberOfPeople) : "",
      paymentMethod: edit.paymentMethod ?? "",
    };
  }
  return {
    type: type ?? "HOME",
    amount: "",
    date: todayIso(),
    description: "",
    notes: "",
    homeCategoryId: preset?.categoryId ?? "",
    shoppingMemberId: preset?.memberId ?? "",
    place: "",
    numberOfPeople: "",
    paymentMethod: "",
  };
}

export function ExpenseForm({
  type: initialType,
  categoryId,
  memberId,
  edit,
  onDone,
}: {
  type?: ExpenseType;
  categoryId?: string;
  memberId?: string;
  edit?: TransactionRow;
  onDone: () => void;
}) {
  const { categories, members, prefs, money } = useApp();
  const toast = useToast();
  const [step, setStep] = React.useState<"type" | "details">(initialType || edit ? "details" : "type");
  const [showMore, setShowMore] = React.useState(Boolean(edit?.numberOfPeople || edit?.paymentMethod));
  const [saving, setSaving] = React.useState<false | "save" | "another">(false);
  // Idempotency key for this entry; renewed after each successful save.
  const [clientId, setClientId] = React.useState(newClientId);

  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: initialValues(initialType, edit, { categoryId, memberId }),
    mode: "onSubmit",
  });
  const { register, handleSubmit, setValue, setError, setFocus, reset, formState } = form;
  const errors = formState.errors;
  const type = useWatch({ control: form.control, name: "type" });
  const homeCategoryId = useWatch({ control: form.control, name: "homeCategoryId" });
  const shoppingMemberId = useWatch({ control: form.control, name: "shoppingMemberId" });
  const amount = useWatch({ control: form.control, name: "amount" });

  const focusAmount = React.useCallback(() => {
    requestAnimationFrame(() => setFocus("amount"));
  }, [setFocus]);

  React.useEffect(() => {
    if (step === "details" && (edit || (type === "HOME" && homeCategoryId) || (type === "SHOPPING" && shoppingMemberId))) {
      focusAmount();
    }
    // Only on entering the details step
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const chooseType = (t: ExpenseType) => {
    setValue("type", t);
    setStep("details");
  };

  const selectedCategory = categories.find((c) => c.id === homeCategoryId);
  const selectedMember = members.find((m) => m.id === shoppingMemberId);

  async function save(values: ExpenseInput, mode: "save" | "another") {
    setSaving(mode);
    const payload = { ...values, clientId: edit ? undefined : clientId };
    try {
      const res = edit ? await updateExpense(edit.id, values) : await createExpense(payload);
      if (!res.ok) {
        for (const [key, message] of Object.entries(res.fieldErrors ?? {})) {
          setError(key as keyof ExpenseInput, { message });
        }
        toast.error(res.error);
        return;
      }
      toast.success(edit ? "Expense updated" : "Expense added successfully");
      finish(values, mode);
    } catch (err) {
      if (!edit && isNetworkError(err)) {
        enqueue({
          kind: "expense",
          clientId: clientId,
          payload,
          queuedAt: new Date().toISOString(),
          label: `${TYPE_META[values.type].label} · ${values.amount}`,
        });
        toast.info("You're offline. The expense is saved on this device and will sync automatically.");
        finish(values, mode);
      } else {
        toast.error(edit ? "Could not update the expense. Please try again." : "Could not save the expense. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  function finish(values: ExpenseInput, mode: "save" | "another") {
    setClientId(newClientId());
    if (mode === "another") {
      // Keep type, date and the selected category/person — clear the rest.
      reset({ ...initialValues(values.type), date: values.date, homeCategoryId: values.homeCategoryId, shoppingMemberId: values.shoppingMemberId });
      focusAmount();
    } else {
      onDone();
    }
  }

  if (step === "type") {
    return (
      <div className="grid gap-3 pb-2">
        <p className="text-sm text-muted-foreground">What kind of expense?</p>
        <div className="grid grid-cols-3 gap-2.5">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => chooseType(t)}
              className="flex flex-col items-center gap-2.5 rounded-2xl border bg-card px-2 py-5 text-sm font-medium shadow-xs transition-all hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <TypeIcon type={t} size="lg" />
              {TYPE_META[t].label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form
      id="expense-form"
      noValidate
      onSubmit={handleSubmit((v) => save(v, "save"))}
      className="grid gap-4"
    >
      {/* Type switcher */}
      <div role="radiogroup" aria-label="Expense type" className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted p-1">
        {TYPES.map((t) => {
          const active = type === t;
          const Icon = TYPE_META[t].icon;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setValue("type", t)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4", active && TYPE_META[t].text)} aria-hidden />
              {TYPE_META[t].label}
            </button>
          );
        })}
      </div>

      {type === "HOME" && (
        <ChipField
          label="Category"
          error={errors.homeCategoryId?.message}
          options={categories.map((c) => ({ id: c.id, name: c.name }))}
          value={homeCategoryId ?? ""}
          onChange={(id) => {
            setValue("homeCategoryId", id, { shouldValidate: formState.isSubmitted });
            focusAmount();
          }}
          emptyText="Add Home categories in Settings first."
        />
      )}

      {type === "SHOPPING" && (
        <ChipField
          label="Person"
          error={errors.shoppingMemberId?.message}
          options={members.map((m) => ({ id: m.id, name: m.name }))}
          value={shoppingMemberId ?? ""}
          onChange={(id) => {
            setValue("shoppingMemberId", id, { shouldValidate: formState.isSubmitted });
            focusAmount();
          }}
          emptyText="Add shopping members in Settings first."
        />
      )}

      {type === "OUTING" && (
        <Field label="Restaurant / Place" htmlFor="place" error={errors.place?.message}>
          <Input
            id="place"
            placeholder="e.g. Kolachi, KFC"
            autoComplete="off"
            enterKeyHint="next"
            aria-invalid={!!errors.place}
            {...register("place")}
          />
        </Field>
      )}

      <Field
        label="Amount"
        htmlFor="amount"
        error={errors.amount?.message}
        hint={
          type === "HOME" && selectedCategory && selectedCategory.expectedCents > 0 ? (
            <span className="flex flex-wrap items-center gap-x-2">
              <span>
                {money(selectedCategory.spentCents ?? 0)} of {money(selectedCategory.expectedCents)} spent this month
              </span>
              {!amount && (
                <button
                  type="button"
                  className="font-medium text-foreground underline underline-offset-2"
                  onClick={() => setValue("amount", centsToInput(selectedCategory.expectedCents))}
                >
                  Use {money(selectedCategory.expectedCents)}
                </button>
              )}
            </span>
          ) : type === "SHOPPING" && selectedMember && selectedMember.budgetCents > 0 ? (
            <span>
              {money(selectedMember.budgetCents - (selectedMember.spentCents ?? 0))} left of {money(selectedMember.budgetCents)} this year
            </span>
          ) : undefined
        }
      >
        <AmountInput
          id="amount"
          symbol={prefs.currencySymbol}
          aria-invalid={!!errors.amount}
          aria-describedby={errors.amount ? "amount-error" : undefined}
          {...register("amount")}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[10.5rem_1fr]">
        <Field label="Date" htmlFor="date" error={errors.date?.message}>
          <Input id="date" type="date" aria-invalid={!!errors.date} {...register("date")} />
        </Field>
        {type === "OUTING" ? (
          <Field label="Notes" htmlFor="notes" optional error={errors.notes?.message}>
            <Input id="notes" placeholder="e.g. Family dinner" autoComplete="off" {...register("notes")} />
          </Field>
        ) : (
          <Field
            label="Description"
            htmlFor="description"
            optional={type === "HOME"}
            error={errors.description?.message}
          >
            <Input
              id="description"
              placeholder={type === "SHOPPING" ? "e.g. Shirts, eye glasses" : "e.g. October internet bill"}
              autoComplete="off"
              enterKeyHint="done"
              aria-invalid={!!errors.description}
              {...register("description")}
            />
          </Field>
        )}
      </div>

      {type === "OUTING" && (
        <div>
          <button
            type="button"
            onClick={() => setShowMore((s) => !s)}
            aria-expanded={showMore}
            className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn("size-4 transition-transform", showMore && "rotate-180")} aria-hidden />
            More details
          </button>
          {showMore && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="People" htmlFor="numberOfPeople" optional error={errors.numberOfPeople?.message}>
                <Input id="numberOfPeople" inputMode="numeric" placeholder="4" {...register("numberOfPeople")} />
              </Field>
              <Field label="Payment" htmlFor="paymentMethod" optional>
                <NativeSelect id="paymentMethod" {...register("paymentMethod")}>
                  <option value="">—</option>
                  {PAYMENT_METHODS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          )}
        </div>
      )}

      {type !== "OUTING" && edit?.notes && (
        <Field label="Notes" htmlFor="notes" optional>
          <Input id="notes" {...register("notes")} />
        </Field>
      )}

      <div className="sticky bottom-0 -mx-5 mt-1 grid gap-2 border-t border-border/60 bg-popover px-5 pt-3 pb-1 sm:static sm:mx-0 sm:flex sm:flex-row-reverse sm:border-0 sm:px-0 sm:pt-1">
        <Button type="submit" size="xl" className="w-full sm:w-auto sm:min-w-40" disabled={!!saving}>
          {saving === "save" && <Loader2 className="animate-spin" />}
          {edit ? "Save changes" : "Save expense"}
        </Button>
        {!edit && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
            disabled={!!saving}
            onClick={handleSubmit((v) => save(v, "another"))}
          >
            {saving === "another" && <Loader2 className="animate-spin" />}
            Save &amp; add another
          </Button>
        )}
      </div>
    </form>
  );
}

/** Big tappable choices for categories / people — one tap instead of a dropdown. */
function ChipField({
  label,
  options,
  value,
  onChange,
  error,
  emptyText,
}: {
  label: string;
  options: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
  emptyText: string;
}) {
  const id = React.useId();
  return (
    <div className="grid gap-1.5">
      <span id={id} className="text-[13px] font-medium text-foreground/85">
        {label}
      </span>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div role="radiogroup" aria-labelledby={id} className="flex max-h-44 flex-wrap gap-2 overflow-y-auto p-0.5">
          {options.map((o) => {
            const active = o.id === value;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(o.id)}
                className={cn(
                  "min-h-10 rounded-xl border px-3.5 text-sm font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:bg-accent",
                )}
              >
                {o.name}
              </button>
            );
          })}
        </div>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
