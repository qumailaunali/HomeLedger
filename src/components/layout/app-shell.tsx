"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/navigation/sidebar";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { TopBar } from "@/components/navigation/top-bar";
import { AddExpenseModal } from "@/components/modals/add-expense-modal";
import { ReceiveMoneyModal } from "@/components/modals/receive-money-modal";

interface AppShellProps {
  children: React.ReactNode;
  currentMonth: number;
  currentYear: number;
  householdName: string;
  currencySymbol: string;
  currentBalance: number;
  categories: { id: string; name: string; expected: number }[];
  members: { id: string; name: string; yearlyBudget: number }[];
}

export function AppShell({
  children,
  currentMonth,
  currentYear,
  householdName,
  currencySymbol,
  currentBalance,
  categories,
  members,
}: AppShellProps) {
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isReceiveMoneyOpen, setIsReceiveMoneyOpen] = useState(false);
  const [expenseDefaultType, setExpenseDefaultType] = useState<"HOME" | "SHOPPING" | "OUTING">("HOME");

  const openAddExpense = (type: "HOME" | "SHOPPING" | "OUTING" = "HOME") => {
    setExpenseDefaultType(type);
    setIsAddExpenseOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Desktop Sidebar */}
      <Sidebar
        onOpenAddExpense={() => openAddExpense("HOME")}
        onOpenReceiveMoney={() => setIsReceiveMoneyOpen(true)}
      />

      {/* Main Container */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        <TopBar
          currentMonth={currentMonth}
          currentYear={currentYear}
          householdName={householdName}
          currencySymbol={currencySymbol}
          currentBalance={currentBalance}
          onOpenAddExpense={() => openAddExpense("HOME")}
          onOpenReceiveMoney={() => setIsReceiveMoneyOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav onOpenAddExpense={() => openAddExpense("HOME")} />

      {/* Global Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        categories={categories}
        members={members}
        currencySymbol={currencySymbol}
        defaultType={expenseDefaultType}
      />

      <ReceiveMoneyModal
        isOpen={isReceiveMoneyOpen}
        onClose={() => setIsReceiveMoneyOpen(false)}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}
