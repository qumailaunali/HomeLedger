"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowDownLeft,
  BarChart3,
  Download,
  Home,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Sun,
  TableProperties,
  UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { logout } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/misc";
import { ExpenseForm } from "@/components/forms/expense-form";
import { IncomeForm } from "@/components/forms/income-form";
import { TransactionDetail } from "@/components/ledger/transaction-detail";
import { OfflineSync } from "./offline-sync";
import { AppContext, useFormatters, type ExpenseDialogOptions } from "./app-context";
import type { CategoryOption, HouseholdPrefs, MemberOption, TransactionRow } from "@/types";

const NAV = [
  { section: null, items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "Transactions",
    items: [
      { href: "/home", label: "Home", icon: Home },
      { href: "/outing", label: "Outing", icon: UtensilsCrossed },
      { href: "/shopping", label: "Shopping", icon: ShoppingBag },
      { href: "/records", label: "All Records", icon: TableProperties },
    ],
  },
  {
    section: "Insights",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/export", label: "Export", icon: Download },
    ],
  },
  { section: "System", items: [{ href: "/settings", label: "Settings", icon: Settings }] },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  prefs,
  categories,
  members,
  balanceCents,
  user,
  children,
}: {
  prefs: HouseholdPrefs;
  categories: CategoryOption[];
  members: MemberOption[];
  balanceCents: number;
  user: { name: string; username: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const fmt = useFormatters(prefs);
  const [expense, setExpense] = React.useState<(ExpenseDialogOptions & { key: number }) | null>(null);
  const [income, setIncome] = React.useState<{ edit?: TransactionRow; key: number } | null>(null);
  const [detail, setDetail] = React.useState<TransactionRow | null>(null);

  const ctx = React.useMemo(
    () => ({
      prefs,
      categories,
      members,
      balanceCents,
      ...fmt,
      openExpense: (opts?: ExpenseDialogOptions) => {
        setDetail(null);
        setExpense({ ...opts, key: Date.now() });
      },
      openIncome: (edit?: TransactionRow) => {
        setDetail(null);
        setIncome({ edit, key: Date.now() });
      },
      openTransaction: (row: TransactionRow) => setDetail(row),
    }),
    [prefs, categories, members, balanceCents, fmt],
  );

  // Keyboard shortcut: "n" opens Add Expense (ignored while typing).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable], [role=dialog]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n") {
        e.preventDefault();
        ctx.openExpense();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ctx]);

  return (
    <AppContext.Provider value={ctx}>
      <div className="min-h-dvh">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/70 bg-card lg:flex">
          <div className="flex items-center gap-3 px-5 pt-6 pb-5">
            <Image src="/icons/icon-192.png" alt="" width={96} height={96} className="size-10 rounded-xl border border-border/60" loading="eager" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-tight">Home Expense Tracker</p>
              <p className="truncate text-xs text-muted-foreground">{prefs.name}</p>
            </div>
          </div>
          <div className="px-4 pb-4">
            <Button className="w-full" size="lg" onClick={() => ctx.openExpense()}>
              <Plus /> Add Expense
            </Button>
          </div>
          <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
            {NAV.map((group, i) => (
              <div key={i}>
                {group.section && (
                  <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
                    {group.section}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                            active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="border-t border-border/70 p-4">
            <p className="text-xs text-muted-foreground">Current balance</p>
            <p className={cn("tabular text-lg font-semibold", balanceCents < 0 ? "text-danger" : "text-positive")}>
              {fmt.money(balanceCents)}
            </p>
          </div>
        </aside>

        <div className="lg:pl-64">
          <TopBar user={user} onReceive={() => ctx.openIncome()} onAdd={() => ctx.openExpense()} />
          <OfflineSync />
          <main id="main" className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-4 mb-nav sm:px-6 lg:px-8 lg:pt-6">
            {children}
          </main>
        </div>

        <BottomNav onAdd={() => ctx.openExpense()} />
      </div>

      {/* Global dialogs */}
      <Dialog open={!!expense} onOpenChange={(o) => !o && setExpense(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{expense?.edit ? "Edit expense" : "Add expense"}</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-4">
            {expense && (
              <ExpenseForm
                key={expense.key}
                type={expense.type}
                categoryId={expense.categoryId}
                memberId={expense.memberId}
                edit={expense.edit}
                onDone={() => setExpense(null)}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={!!income} onOpenChange={(o) => !o && setIncome(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{income?.edit ? "Edit money received" : "Receive money"}</DialogTitle>
            <DialogDescription>Money added to the household balance.</DialogDescription>
          </DialogHeader>
          <DialogBody className="pb-5">
            {income && <IncomeForm key={income.key} edit={income.edit} onDone={() => setIncome(null)} />}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent aria-describedby={undefined}>
          {detail && <TransactionDetail row={detail} onClose={() => setDetail(null)} />}
        </DialogContent>
      </Dialog>
    </AppContext.Provider>
  );
}

function TopBar({ user, onReceive, onAdd }: { user: { name: string; username: string }; onReceive: () => void; onAdd: () => void }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 pt-safe backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold lg:hidden">
          <Image src="/icons/icon-192.png" alt="" width={96} height={96} className="size-8 rounded-lg border border-border/60" loading="eager" />
          <span className="text-[15px]">Expenses</span>
        </Link>

        <form
          role="search"
          className="ml-auto hidden max-w-sm flex-1 sm:block lg:ml-0"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/records?search=${encodeURIComponent(query.trim())}`);
          }}
        >
          <label className="relative block">
            <span className="sr-only">Search all transactions</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search: petrol, Qumail, 5000…"
              className="h-9 w-full rounded-xl border bg-card pr-3 pl-9 text-base sm:text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href="/records?focus=search"
            className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent sm:hidden"
            aria-label="Search transactions"
          >
            <Search className="size-4.5" />
          </Link>
          <Button variant="positive" size="sm" className="hidden h-9 sm:inline-flex" onClick={onReceive}>
            <ArrowDownLeft /> Receive Money
          </Button>
          <Button size="sm" className="hidden h-9 sm:inline-flex lg:hidden" onClick={onAdd}>
            <Plus /> Add
          </Button>
          <ThemeMenu />
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-semibold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              aria-label="Account menu"
            >
              {user.name.charAt(0).toUpperCase()}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2.5 py-2">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onReceive} className="sm:hidden">
                <ArrowDownLeft /> Receive Money
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/export">
                  <Download /> Export
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_CACHE" });
                  void logout();
                }}
              >
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label="Change theme"
      >
        <Sun className="size-4.5 dark:hidden" />
        <Moon className="hidden size-4.5 dark:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {options.map((o) => (
          <DropdownMenuItem key={o.value} onSelect={() => setTheme(o.value)} aria-checked={theme === o.value} role="menuitemradio">
            <o.icon /> {o.label}
            {theme === o.value && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BottomNav({ onAdd }: { onAdd: () => void }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/records", label: "Records", icon: TableProperties },
    null,
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/90 pb-safe backdrop-blur-lg lg:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-md items-stretch">
        {items.map((item) =>
          item ? (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  isActive(pathname, item.href) ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          ) : (
            <li key="add" className="flex flex-1 items-center justify-center">
              <button
                onClick={onAdd}
                aria-label="Add expense"
                className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-ring/60"
              >
                <Plus className="size-6" strokeWidth={2.5} />
              </button>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
