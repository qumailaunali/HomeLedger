"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  descriptionText?: string;
  itemDetails?: {
    label: string;
    amount?: string;
    date?: string;
  };
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  title = "Delete transaction?",
  descriptionText = "This action cannot be undone and will update balances and budgets.",
  itemDetails,
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Handled by parent toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
            {title}
          </h3>
        </div>

        {itemDetails && (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/60 dark:border-slate-800 text-sm space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">
              {itemDetails.label}
            </p>
            {itemDetails.amount && (
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {itemDetails.amount}
              </p>
            )}
            {itemDetails.date && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {itemDetails.date}
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400">
          {descriptionText}
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-semibold text-sm shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
