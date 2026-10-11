"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ChevronRight, ShoppingBag } from "lucide-react";

interface ShoppingProgressCardsProps {
  shoppingBudgetsProgress: {
    memberId: string;
    name: string;
    yearlyBudget: number;
    spentYear: number;
    remainingBudget: number;
    percentage: number;
    isOverBudget: boolean;
    overAmount: number;
  }[];
  currencySymbol?: string;
  year?: number;
}

export function ShoppingProgressCards({
  shoppingBudgetsProgress,
  currencySymbol = "Rs.",
  year = 2026,
}: ShoppingProgressCardsProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">
              Family Shopping Budgets
            </h3>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
              {year} Limits
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tracked separately for each family member
          </p>
        </div>

        <Link
          href="/shopping"
          className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 flex items-center gap-0.5 transition-colors"
        >
          <span>View Details</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {shoppingBudgetsProgress.map((member) => {
          const isOver = member.isOverBudget;
          const isNear = member.percentage >= 80 && !isOver;

          return (
            <div
              key={member.memberId}
              className={`p-4 rounded-xl border transition-all ${
                isOver
                  ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60"
                  : isNear
                  ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60"
                  : "bg-slate-50/70 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {member.name}
                </span>
                {isOver ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                    <AlertCircle className="w-3 h-3" />
                    OVER
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {member.percentage}% used
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-2.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOver
                      ? "bg-rose-500"
                      : isNear
                      ? "bg-amber-500"
                      : "bg-purple-600"
                  }`}
                  style={{ width: `${Math.min(member.percentage, 100)}%` }}
                />
              </div>

              {/* Financial Numbers */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Spent:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {currencySymbol} {member.spentYear.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Yearly Limit:</span>
                  <span>
                    {currencySymbol} {member.yearlyBudget.toLocaleString()}
                  </span>
                </div>

                <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800 flex justify-between font-semibold">
                  {isOver ? (
                    <>
                      <span className="text-rose-600 dark:text-rose-400">Over Budget:</span>
                      <span className="text-rose-600 dark:text-rose-400">
                        +{currencySymbol} {member.overAmount.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-emerald-600 dark:text-emerald-400">Remaining:</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {currencySymbol} {member.remainingBudget.toLocaleString()}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
