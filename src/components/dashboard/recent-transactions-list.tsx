"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Home,
  ShoppingBag,
  Coffee,
  ArrowDownLeft,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  ChevronRight,
} from "lucide-react";
import { TransactionItem } from "@/types";
import { formatDisplayDate } from "@/lib/date";
import { deleteExpenseAction, deleteIncomeAction, createExpenseAction } from "@/app/actions";
import { useToast } from "@/components/ui/toast";
import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";
import { EditExpenseModal } from "@/components/modals/edit-expense-modal";

interface RecentTransactionsListProps {
  transactions: TransactionItem[];
  categories: { id: string; name: string; expected: number }[];
  members: { id: string; name: string; yearlyBudget: number }[];
  currencySymbol?: string;
  onRefresh?: () => void;
}

export function RecentTransactionsList({
  transactions,
  categories,
  members,
  currencySymbol = "Rs.",
  onRefresh,
}: RecentTransactionsListProps) {
  const { success, error } = useToast();
  const [selectedTxForDelete, setSelectedTxForDelete] = useState<TransactionItem | null>(null);
  const [selectedTxForEdit, setSelectedTxForEdit] = useState<TransactionItem | null>(null);

  const handleDelete = async () => {
    if (!selectedTxForDelete) return;
    try {
      if (selectedTxForDelete.type === "RECEIVED") {
        await deleteIncomeAction(selectedTxForDelete.id);
      } else {
        await deleteExpenseAction(selectedTxForDelete.id);
      }
      success("Transaction deleted successfully.");
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : "Failed to delete transaction.");
    }
  };

  const handleDuplicate = async (tx: TransactionItem) => {
    if (tx.type === "RECEIVED") {
      error("Duplication is currently supported for expenses.");
      return;
    }
    try {
      await createExpenseAction({
        type: tx.type,
        amount: tx.amount,
        date: new Date().toISOString().split("T")[0],
        description: `${tx.description} (Copy)`,
        notes: tx.notes || undefined,
        homeCategoryId: tx.homeCategory?.id,
        shoppingMemberId: tx.shoppingMember?.id,
        place: tx.place || undefined,
        numberOfPeople: tx.numberOfPeople || undefined,
        paymentMethod: tx.paymentMethod || undefined,
      });
      success(`Duplicated "${tx.description}" for today!`);
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : "Failed to duplicate expense.");
    }
  };

  const getTypeBadge = (type: TransactionItem["type"]) => {
    switch (type) {
      case "HOME":
        return {
          icon: Home,
          label: "Home",
          bg: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        };
      case "SHOPPING":
        return {
          icon: ShoppingBag,
          label: "Shopping",
          bg: "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
        };
      case "OUTING":
        return {
          icon: Coffee,
          label: "Outing",
          bg: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        };
      case "RECEIVED":
        return {
          icon: ArrowDownLeft,
          label: "Received",
          bg: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        };
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">
            Recent Transactions
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Latest household entries
          </p>
        </div>

        <Link
          href="/records"
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
        >
          <span>All Records</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
          No transactions recorded for this period yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {transactions.map((tx) => {
            const badge = getTypeBadge(tx.type);
            const Icon = badge.icon;
            const subtitle =
              tx.type === "HOME"
                ? tx.homeCategory?.name || "Household"
                : tx.type === "SHOPPING"
                ? tx.shoppingMember?.name || "Shopping"
                : tx.type === "OUTING"
                ? tx.place || "Restaurant"
                : tx.source || "Income";

            return (
              <div
                key={tx.id}
                className="py-3 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-xl px-2.5 -mx-2.5 transition-colors group"
              >
                {/* Left: Icon & Description */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${badge.bg}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {tx.description}
                      </p>
                      <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {subtitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      <span>{formatDisplayDate(tx.date)}</span>
                      <span className="sm:hidden">• {subtitle}</span>
                      {tx.notes && <span className="hidden md:inline">• {tx.notes}</span>}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-sm sm:text-base font-bold ${
                        tx.type === "RECEIVED"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {tx.type === "RECEIVED" ? "+" : "-"}
                      {currencySymbol} {tx.amount.toLocaleString()}
                    </div>
                  </div>

                  {/* Actions Dropdown / buttons */}
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    {tx.type !== "RECEIVED" && (
                      <button
                        onClick={() => handleDuplicate(tx)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                        title="Duplicate for today"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {tx.type !== "RECEIVED" && (
                      <button
                        onClick={() => setSelectedTxForEdit(tx)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                        title="Edit transaction"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedTxForDelete(tx)}
                      className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation & Edit Modals */}
      <ConfirmDeleteModal
        isOpen={!!selectedTxForDelete}
        itemDetails={
          selectedTxForDelete
            ? {
                label: selectedTxForDelete.description,
                amount: `${currencySymbol} ${selectedTxForDelete.amount.toLocaleString()}`,
                date: formatDisplayDate(selectedTxForDelete.date),
              }
            : undefined
        }
        onConfirm={handleDelete}
        onClose={() => setSelectedTxForDelete(null)}
      />

      <EditExpenseModal
        isOpen={!!selectedTxForEdit}
        transaction={selectedTxForEdit}
        categories={categories}
        members={members}
        currencySymbol={currencySymbol}
        onSuccess={onRefresh}
        onClose={() => setSelectedTxForEdit(null)}
      />
    </div>
  );
}
