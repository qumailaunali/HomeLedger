"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Trash2,
  Edit2,
  Copy,
  PlusCircle,
  ArrowDownLeft,
  Calendar,
} from "lucide-react";
import { TransactionItem } from "@/types";
import { formatDisplayDate } from "@/lib/date";
import { useToast } from "@/components/ui/toast";
import { deleteExpenseAction, deleteIncomeAction, createExpenseAction } from "@/app/actions";
import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";
import { EditExpenseModal } from "@/components/modals/edit-expense-modal";

interface RecordsClientProps {
  initialTransactions: TransactionItem[];
  categories: { id: string; name: string; expected: number }[];
  members: { id: string; name: string; yearlyBudget: number }[];
  currencySymbol?: string;
  onRefresh?: () => void;
}

export function RecordsClient({
  initialTransactions,
  categories,
  members,
  currencySymbol = "Rs.",
  onRefresh,
}: RecordsClientProps) {
  const { success, error } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortAsc, setSortAsc] = useState(false);

  const [selectedTxForDelete, setSelectedTxForDelete] = useState<TransactionItem | null>(null);
  const [selectedTxForEdit, setSelectedTxForEdit] = useState<TransactionItem | null>(null);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    return initialTransactions
      .filter((tx) => {
        if (typeFilter !== "ALL" && tx.type !== typeFilter) {
          return false;
        }
        if (!search.trim()) return true;

        const q = search.toLowerCase().trim();
        const desc = (tx.description || "").toLowerCase();
        const cat = (tx.homeCategory?.name || "").toLowerCase();
        const mem = (tx.shoppingMember?.name || "").toLowerCase();
        const place = (tx.place || "").toLowerCase();
        const src = (tx.source || "").toLowerCase();
        const amt = String(tx.amount);

        return (
          desc.includes(q) ||
          cat.includes(q) ||
          mem.includes(q) ||
          place.includes(q) ||
          src.includes(q) ||
          amt.includes(q)
        );
      })
      .sort((a, b) => {
        if (sortField === "date") {
          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();
          return sortAsc ? timeA - timeB : timeB - timeA;
        } else {
          return sortAsc ? a.amount - b.amount : b.amount - a.amount;
        }
      });
  }, [initialTransactions, search, typeFilter, sortField, sortAsc]);

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
    if (tx.type === "RECEIVED") return;
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

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions, categories, members, places, amounts..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "HOME", "SHOPPING", "OUTING", "RECEIVED"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                typeFilter === t
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {t === "ALL" ? "All Records" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Spreadsheet Style Table Container (Section 15 & 51) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[750px]">
            {/* Sticky Table Header */}
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
                <th
                  onClick={() => {
                    if (sortField === "date") setSortAsc(!sortAsc);
                    else {
                      setSortField("date");
                      setSortAsc(false);
                    }
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category / Person</th>
                <th className="py-3 px-4">Description</th>
                <th
                  onClick={() => {
                    if (sortField === "amount") setSortAsc(!sortAsc);
                    else {
                      setSortField("amount");
                      setSortAsc(false);
                    }
                  }}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Spent</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Received</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4 text-center w-24">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No matching transactions found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => {
                  const isReceived = tx.type === "RECEIVED";
                  const entityName =
                    tx.type === "HOME"
                      ? tx.homeCategory?.name || "General"
                      : tx.type === "SHOPPING"
                      ? tx.shoppingMember?.name || "Personal"
                      : tx.type === "OUTING"
                      ? tx.place || "Restaurant"
                      : tx.source || "Income";

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        idx % 2 === 1 ? "bg-slate-50/40 dark:bg-slate-950/20" : ""
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono text-xs">
                        {formatDisplayDate(tx.date)}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            tx.type === "HOME"
                              ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300"
                              : tx.type === "SHOPPING"
                              ? "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300"
                              : tx.type === "OUTING"
                              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300"
                              : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>

                      {/* Category / Member */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900 dark:text-slate-200">
                        {entityName}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                        <span>{tx.description}</span>
                        {tx.notes && (
                          <span className="text-xs text-slate-400 block truncate">
                            {tx.notes}
                          </span>
                        )}
                      </td>

                      {/* Spent Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {!isReceived ? `${currencySymbol} ${tx.amount.toLocaleString()}` : "—"}
                      </td>

                      {/* Received Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {isReceived ? `+${currencySymbol} ${tx.amount.toLocaleString()}` : "—"}
                      </td>

                      {/* Running Balance */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {tx.balanceAfter !== undefined
                          ? `${currencySymbol} ${tx.balanceAfter.toLocaleString()}`
                          : "—"}
                      </td>

                      {/* Row Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {!isReceived && (
                            <button
                              onClick={() => handleDuplicate(tx)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              title="Duplicate"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!isReceived && (
                            <button
                              onClick={() => setSelectedTxForEdit(tx)}
                              className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedTxForDelete(tx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Count */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Showing {filteredTransactions.length} records</span>
          <span className="font-mono">Spreadsheet View Active</span>
        </div>
      </div>

      {/* Delete and Edit Modals */}
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
