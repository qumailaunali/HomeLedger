"use client";

import React, { useState } from "react";
import { AlertCircle, X, ChevronRight } from "lucide-react";
import Link from "next/link";

interface BudgetWarningsBannerProps {
  warnings: string[];
}

export function BudgetWarningsBanner({ warnings }: BudgetWarningsBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (warnings.length === 0 || isDismissed) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl p-4 shadow-sm animate-in fade-in duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-200">
              Budget Notifications
            </h4>
            <div className="mt-1 space-y-1">
              {warnings.map((warning, idx) => (
                <p key={idx} className="text-xs text-amber-800 dark:text-amber-300">
                  • {warning}
                </p>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-lg text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          aria-label="Dismiss warnings"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
