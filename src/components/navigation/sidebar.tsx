"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Home,
  ShoppingBag,
  Coffee,
  TableProperties,
  BarChart3,
  Download,
  Settings,
  Wallet,
  ArrowDownLeft,
} from "lucide-react";

interface SidebarProps {
  onOpenAddExpense: () => void;
  onOpenReceiveMoney: () => void;
}

export function Sidebar({ onOpenAddExpense, onOpenReceiveMoney }: SidebarProps) {
  const pathname = usePathname();

  const navSections = [
    {
      title: "OVERVIEW",
      items: [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "TRANSACTIONS",
      items: [
        { href: "/home", label: "Home", icon: Home },
        { href: "/shopping", label: "Shopping", icon: ShoppingBag },
        { href: "/outing", label: "Outing", icon: Coffee },
        { href: "/records", label: "All Records", icon: TableProperties },
      ],
    },
    {
      title: "INSIGHTS",
      items: [
        { href: "/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/export", label: "Export & Backup", icon: Download },
      ],
    },
    {
      title: "SYSTEM",
      items: [
        { href: "/settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  return (
    <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/80 z-30 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight text-slate-900 dark:text-white leading-none">
            HomeLedger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Household Finances
          </p>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="p-4 space-y-2 border-b border-slate-100 dark:border-slate-800/60">
        <button
          onClick={onOpenAddExpense}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-medium text-sm shadow-sm shadow-blue-500/25 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Expense</span>
        </button>

        <button
          onClick={onOpenReceiveMoney}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-medium text-xs border border-emerald-200 dark:border-emerald-800/60 transition-all"
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>Receive Money</span>
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 uppercase">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "opacity-70"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-400 dark:text-slate-500 text-center">
        HomeLedger • Offline PWA Ready
      </div>
    </aside>
  );
}
