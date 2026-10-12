"use client";

import * as React from "react";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { useApp } from "@/components/app/app-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteExpense, deleteIncome, duplicateExpense } from "@/server/actions/transactions";
import { formatTimestamp } from "@/lib/dates";
import { TYPE_META, TypeIcon, primaryLabel } from "./type-meta";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import type { TransactionRow } from "@/types";

export function TransactionDetail({ row, onClose }: { row: TransactionRow; onClose: () => void }) {
  const { money, date, prefs, openExpense, openIncome } = useApp();
  const toast = useToast();
  const [confirming, setConfirming] = React.useState(false);
  const [duplicating, setDuplicating] = React.useState(false);
  const isIncome = row.kind === "INCOME";

  const items: [string, React.ReactNode][] = [
    ["Type", TYPE_META[row.type].label],
    ["Date", date(row.date)],
  ];
  if (row.type === "HOME") items.push(["Category", row.categoryName ?? "—"]);
  if (row.type === "SHOPPING") {
    items.push(["Person", row.memberName ?? "—"]);
    if (row.budgetRemainingCents !== null) {
      items.push([
        "Yearly budget left after this",
        <span key="b" className={row.budgetRemainingCents < 0 ? "text-danger" : undefined}>
          {row.budgetRemainingCents < 0 ? `Over by ${money(-row.budgetRemainingCents)}` : money(row.budgetRemainingCents)}
        </span>,
      ]);
    }
  }
  if (row.type === "OUTING") {
    items.push(["Restaurant / Place", row.place ?? "—"]);
    if (row.numberOfPeople) items.push(["People", String(row.numberOfPeople)]);
    if (row.paymentMethod) items.push(["Payment", row.paymentMethod]);
  }
  if (isIncome) items.push(["Source", row.source ?? "—"]);
  items.push(["Description", row.description || "—"]);
  if (row.notes) items.push(["Notes", row.notes]);
  items.push(["Balance after", money(row.balanceCents)]);
  items.push(["Created", formatTimestamp(row.createdAt, prefs.timezone)]);
  if (row.updatedAt !== row.createdAt) items.push(["Last edited", formatTimestamp(row.updatedAt, prefs.timezone)]);

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <TypeIcon type={row.type} size="lg" />
          <div className="min-w-0">
            <DialogTitle className="truncate">{primaryLabel(row)}</DialogTitle>
            <DialogDescription className="mt-0">{date(row.date)}</DialogDescription>
          </div>
        </div>
        <p className={`tabular mt-4 text-3xl font-semibold tracking-tight ${isIncome ? "text-positive" : ""}`}>
          {isIncome ? "+" : ""}
          {money(row.amountCents)}
        </p>
      </DialogHeader>
      <DialogBody>
        <dl className="divide-y divide-border/60">
          {items.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-medium break-words">{v}</dd>
            </div>
          ))}
        </dl>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger sm:mr-auto" onClick={() => setConfirming(true)}>
          <Trash2 /> Delete
        </Button>
        {!isIncome && (
          <Button
            variant="outline"
            disabled={duplicating}
            onClick={async () => {
              setDuplicating(true);
              const res = await duplicateExpense(row.id).catch(() => null);
              setDuplicating(false);
              if (res?.ok) {
                toast.success("Duplicated for today");
                onClose();
              } else toast.error(res && !res.ok ? res.error : "Could not duplicate. Please try again.");
            }}
          >
            <Copy /> Duplicate for today
          </Button>
        )}
        <Button onClick={() => (isIncome ? openIncome(row) : openExpense({ edit: row }))}>
          <Pencil /> Edit
        </Button>
      </DialogFooter>

      <ConfirmDeleteDialog
        open={confirming}
        onOpenChange={setConfirming}
        details={{ label: primaryLabel(row), amount: money(row.amountCents), date: date(row.date) }}
        onConfirm={async () => {
          const res = await (isIncome ? deleteIncome(row.id) : deleteExpense(row.id)).catch(() => null);
          if (res?.ok) {
            toast.success("Transaction deleted");
            onClose();
            return true;
          }
          toast.error(res && !res.ok ? res.error : "Could not delete. Please try again.");
          return false;
        }}
      />
    </>
  );
}
