"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Home,
  ShoppingBag,
  Coffee,
  Plus,
  Loader2,
  Calendar,
  Layers,
  FileText,
  Users,
  CreditCard,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { toCalendarDateString } from "@/lib/date";
import { createExpenseAction } from "@/app/actions";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: { id: string; name: string; expected: number }[];
  members: { id: string; name: string; yearlyBudget: number }[];
  currencySymbol?: string;
  defaultType?: "HOME" | "SHOPPING" | "OUTING";
  onSuccess?: () => void;
}

export function AddExpenseModal({
  isOpen,
  onClose,
  categories,
  members,
  currencySymbol = "Rs.",
  defaultType = "HOME",
  onSuccess,
}: AddExpenseModalProps) {
  const { success, error } = useToast();
  const [type, setType] = useState<"HOME" | "SHOPPING" | "OUTING">(defaultType);
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(toCalendarDateString(new Date()));
  const [description, setDescription] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  
  // Type-specific state
  const [homeCategoryId, setHomeCategoryId] = useState<string>("");
  const [shoppingMemberId, setShoppingMemberId] = useState<string>("");
  const [place, setPlace] = useState<string>("");
  const [numberOfPeople, setNumberOfPeople] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      if (categories.length > 0 && !homeCategoryId) {
        setHomeCategoryId(categories[0].id);
      }
      if (members.length > 0 && !shoppingMemberId) {
        setShoppingMemberId(members[0].id);
      }
      // Auto-focus amount field
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, defaultType, categories, members]);

  if (!isOpen) return null;

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setNotes("");
    setPlace("");
    setNumberOfPeople("");
    setTimeout(() => {
      amountInputRef.current?.focus();
    }, 50);
  };

  const handleSave = async (addAnother = false) => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      error("Please enter a valid amount greater than zero.");
      amountInputRef.current?.focus();
      return;
    }

    if (!description.trim() && type !== "OUTING") {
      error("Please enter a description for the expense.");
      return;
    }

    if (type === "OUTING" && !place.trim()) {
      error("Please enter a restaurant or place name.");
      return;
    }

    setIsLoading(true);
    try {
      await createExpenseAction({
        type,
        amount: parsedAmount,
        date,
        description: type === "OUTING" && !description.trim() ? `Outing at ${place.trim()}` : description.trim(),
        notes: notes.trim() || undefined,
        homeCategoryId: type === "HOME" ? homeCategoryId : undefined,
        shoppingMemberId: type === "SHOPPING" ? shoppingMemberId : undefined,
        place: type === "OUTING" ? place.trim() : undefined,
        numberOfPeople: type === "OUTING" && numberOfPeople ? parseInt(numberOfPeople, 10) : undefined,
        paymentMethod: type === "OUTING" ? paymentMethod : undefined,
      });

      success("Expense added successfully!");
      if (onSuccess) onSuccess();

      if (addAnother) {
        resetForm();
      } else {
        onClose();
        resetForm();
      }
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : "Failed to record expense.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all scale-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              +
            </div>
            <h2 className="font-semibold text-lg text-slate-900 dark:text-white">
              Add Expense
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Expense Type Selector Tabs (Section 13) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setType("HOME")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium text-xs sm:text-sm transition-all ${
                type === "HOME"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => setType("SHOPPING")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium text-xs sm:text-sm transition-all ${
                type === "SHOPPING"
                  ? "bg-purple-600 text-white shadow-sm shadow-purple-500/25"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Shopping</span>
            </button>

            <button
              type="button"
              onClick={() => setType("OUTING")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium text-xs sm:text-sm transition-all ${
                type === "OUTING"
                  ? "bg-amber-600 text-white shadow-sm shadow-amber-500/25"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Coffee className="w-4 h-4" />
              <span>Outing</span>
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Prominent Amount Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Amount ({currencySymbol}) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-lg">
                {currencySymbol}
              </span>
              <input
                ref={amountInputRef}
                type="number"
                step="any"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-14 pr-4 py-3 text-2xl font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
              />
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Date *
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Type-Specific Selection */}
          {type === "HOME" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select
                value={homeCategoryId}
                onChange={(e) => setHomeCategoryId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.expected > 0 ? `(Budget: ${currencySymbol} ${c.expected.toLocaleString()})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === "SHOPPING" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Family Member / Person *
              </label>
              <select
                value={shoppingMemberId}
                onChange={(e) => setShoppingMemberId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.yearlyBudget > 0 ? `(Yearly Limit: ${currencySymbol} ${m.yearlyBudget.toLocaleString()})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === "OUTING" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Restaurant / Place *
                </label>
                <input
                  type="text"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder="e.g. Kolachi, KFC, Cafe XYZ"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    No. of People (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={numberOfPeople}
                    onChange={(e) => setNumberOfPeople(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Easypaisa / Nayapay">Easypaisa / Nayapay</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Description {type === "OUTING" ? "(Optional)" : "*"}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === "HOME"
                  ? "e.g. October internet bill, Monthly grocery"
                  : type === "SHOPPING"
                  ? "e.g. Shopping shirts, Eye glasses, Medicine"
                  : "e.g. Family weekend dinner"
              }
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra details..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Modal Actions (Save & Save and Add Another) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-sm transition-colors flex items-center justify-center gap-1.5"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Save & Add Another</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>Save Expense</span>
          </button>
        </div>
      </div>
    </div>
  );
}
