"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Save } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { toCalendarDateString } from "@/lib/date";
import { updateExpenseAction } from "@/app/actions";
import { TransactionItem } from "@/types";

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionItem | null;
  categories: { id: string; name: string; expected: number }[];
  members: { id: string; name: string; yearlyBudget: number }[];
  currencySymbol?: string;
  onSuccess?: () => void;
}

export function EditExpenseModal({
  isOpen,
  onClose,
  transaction,
  categories,
  members,
  currencySymbol = "Rs.",
  onSuccess,
}: EditExpenseModalProps) {
  const { success, error } = useToast();
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [homeCategoryId, setHomeCategoryId] = useState<string>("");
  const [shoppingMemberId, setShoppingMemberId] = useState<string>("");
  const [place, setPlace] = useState<string>("");
  const [numberOfPeople, setNumberOfPeople] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (transaction) {
      setAmount(String(transaction.amount));
      setDate(toCalendarDateString(new Date(transaction.date)));
      setDescription(transaction.description || "");
      setNotes(transaction.notes || "");
      setHomeCategoryId(transaction.homeCategory?.id || categories[0]?.id || "");
      setShoppingMemberId(transaction.shoppingMember?.id || members[0]?.id || "");
      setPlace(transaction.place || "");
      setNumberOfPeople(transaction.numberOfPeople ? String(transaction.numberOfPeople) : "");
      setPaymentMethod(transaction.paymentMethod || "Cash");
    }
  }, [transaction, categories, members]);

  if (!isOpen || !transaction) return null;

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      error("Please enter a valid amount greater than zero.");
      return;
    }
    if (!description.trim()) {
      error("Description is required.");
      return;
    }

    setIsLoading(true);
    try {
      await updateExpenseAction(transaction.id, {
        amount: parsedAmount,
        date,
        description: description.trim(),
        notes: notes.trim() || undefined,
        homeCategoryId: transaction.type === "HOME" ? homeCategoryId : undefined,
        shoppingMemberId: transaction.type === "SHOPPING" ? shoppingMemberId : undefined,
        place: transaction.type === "OUTING" ? place.trim() : undefined,
        numberOfPeople: transaction.type === "OUTING" && numberOfPeople ? parseInt(numberOfPeople, 10) : undefined,
        paymentMethod: transaction.type === "OUTING" ? paymentMethod : undefined,
      });

      success("Transaction updated successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : "Failed to update transaction.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-lg text-slate-900 dark:text-white">
            Edit {transaction.type} Transaction
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Amount ({currencySymbol}) *
            </label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {transaction.type === "HOME" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={homeCategoryId}
                onChange={(e) => setHomeCategoryId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {transaction.type === "SHOPPING" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Family Member
              </label>
              <select
                value={shoppingMemberId}
                onChange={(e) => setShoppingMemberId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {transaction.type === "OUTING" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Restaurant / Place
              </label>
              <input
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Description *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
