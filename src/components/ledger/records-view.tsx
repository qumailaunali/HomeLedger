"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Rows3, Search, SearchX, Sheet, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMonthYear } from "@/lib/dates";
import { useApp } from "@/components/app/app-context";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/form-controls";
import { Segmented } from "@/components/ui/misc";
import { EmptyState, Money, PageHeader } from "./display";
import { LedgerTable, type LedgerVariant } from "./ledger-table";
import { MonthSelector } from "./month-selector";
import { TransactionList } from "./transaction-list";
import { TypeTabs } from "./type-tabs";
import { TYPE_META, TypeIcon, targetLabel } from "./type-meta";
import type { LedgerQuery } from "@/server/ledger-params";
import type { CategoryOption, ExpenseType, LedgerPage, MemberOption } from "@/types";

function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = React.useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      next.delete("page");
      next.delete("focus");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );
  return { params, set };
}

export function RecordsView({
  title,
  description,
  icon,
  variant,
  page,
  query,
  categories,
  members,
  autoFocusSearch,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  variant: LedgerVariant;
  page: LedgerPage;
  query: LedgerQuery;
  categories: CategoryOption[];
  members: MemberOption[];
  autoFocusSearch?: boolean;
  children?: React.ReactNode;
}) {
  const { openExpense } = useApp();
  const { params, set } = useUrlState();
  const [search, setSearch] = React.useState(query.filters.search ?? "");
  const [view, setView] = React.useState<"sheet" | "list">(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches ? "list" : "sheet",
  );
  const type = query.filters.type ?? "ALL";
  const periodLabel =
    query.period === "month"
      ? formatMonthYear(query.year, query.month)
      : query.period === "year"
        ? String(query.year)
        : query.period === "range"
          ? "selected dates"
          : "all time";

  // Debounced search → URL (server does the filtering)
  React.useEffect(() => {
    const current = params.get("search") ?? "";
    if (search.trim() === current) return;
    const t = setTimeout(() => set({ search: search.trim() || null }), 300);
    return () => clearTimeout(t);
  }, [search, params, set]);

  const showCategory = variant === "HOME" || (variant === "ALL" && type === "HOME");
  const showMember = variant === "SHOPPING" || (variant === "ALL" && type === "SHOPPING");
  const hasFilters = Boolean(query.filters.search || query.filters.categoryId || query.filters.memberId || (variant === "ALL" && type !== "ALL"));
  const addType: ExpenseType | undefined = variant === "ALL" ? undefined : variant;

  return (
    <>
      {variant !== "ALL" && <TypeTabs />}

      <PageHeader
        title={title}
        description={description}
        icon={icon}
        actions={
          <Button onClick={() => openExpense({ type: addType })}>
            <Plus /> Add {addType ? TYPE_META[addType].label : "Expense"}
          </Button>
        }
      />

      {children}

      <section aria-label="Filters" className="grid gap-3 rounded-2xl border border-border/70 bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search transactions</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={search}
              autoFocus={autoFocusSearch}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, category, person, place or amount"
              className="pl-9"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              aria-label="Period"
              value={query.period}
              onChange={(e) => set({ period: e.target.value, from: null, to: null })}
              className="h-10 w-auto"
            >
              <option value="month">Month</option>
              <option value="year">Year</option>
              <option value="all">All time</option>
              <option value="range">Date range</option>
            </NativeSelect>
            {query.period === "month" && <MonthSelector year={query.year} month={query.month} />}
            {query.period === "year" && <MonthSelector year={query.year} month={query.month} mode="year" />}
            {query.period === "range" && (
              <div className="flex items-center gap-2">
                <Input type="date" aria-label="From date" className="h-10 w-auto" defaultValue={query.from} onChange={(e) => set({ from: e.target.value })} />
                <span className="text-muted-foreground">–</span>
                <Input type="date" aria-label="To date" className="h-10 w-auto" defaultValue={query.to} onChange={(e) => set({ to: e.target.value })} />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {variant === "ALL" && (
            <div className="-mx-1 max-w-full overflow-x-auto px-1">
              <Segmented
                label="Type"
                size="lg"
                value={type as string}
                onChange={(v) => set({ type: v === "ALL" ? null : v, category: null, member: null })}
                options={[
                  { value: "ALL", label: "All" },
                  { value: "HOME", label: "Home" },
                  { value: "SHOPPING", label: "Shopping" },
                  { value: "OUTING", label: "Outing" },
                  { value: "RECEIVED", label: "Received" },
                ]}
              />
            </div>
          )}
          {showCategory && (
            <NativeSelect aria-label="Category" value={query.filters.categoryId ?? ""} onChange={(e) => set({ category: e.target.value })} className="h-11 w-auto text-sm">
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          )}
          {showMember && (
            <div role="radiogroup" aria-label="Person" className="-mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 pb-0.5">
              {[{ id: "", name: "Everyone" }, ...members].map((m) => {
                const active = (query.filters.memberId ?? "") === m.id;
                return (
                  <button
                    key={m.id || "all"}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => set({ member: m.id || null })}
                    className={cn(
                      "h-11 shrink-0 rounded-xl border px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:bg-accent",
                    )}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          )}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                set({ search: null, type: null, category: null, member: null });
              }}
            >
              <X /> Clear filters
            </Button>
          )}
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              Spent <Money cents={page.spentCents} className="font-semibold text-foreground" />
            </span>
            {(variant === "ALL" || type === "RECEIVED") && page.receivedCents > 0 && (
              <span className="text-muted-foreground">
                Received <Money cents={page.receivedCents} tone="positive" className="font-semibold" />
              </span>
            )}
            <Segmented
              label="View"
              size="lg"
              className="sm:hidden"
              value={view}
              onChange={setView}
              options={[
                { value: "sheet", label: <span className="flex items-center gap-1.5"><Sheet className="size-4" /> Table</span> },
                { value: "list", label: <span className="flex items-center gap-1.5"><Rows3 className="size-4" /> Cards</span> },
              ]}
            />
          </div>
        </div>
      </section>

      {page.total === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card">
          {hasFilters ? (
            <EmptyState icon={SearchX} title="No matching transactions" description={`Nothing matches these filters for ${periodLabel}.`} />
          ) : (
            <EmptyState
              icon={addType ? TYPE_META[addType].icon : Rows3}
              title={`No ${addType ? `${TYPE_META[addType].label} expenses` : "records"} for ${periodLabel} yet.`}
              action={
                <Button onClick={() => openExpense({ type: addType })}>
                  <Plus /> Add your first expense
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <>
          <div className={cn(view === "list" && "hidden sm:block")}>
            <LedgerTable page={page} variant={variant} sort={query.filters.sort ?? "date"} dir={query.filters.dir ?? "desc"} />
          </div>
          {view === "list" && (
            <div className="rounded-2xl border border-border/70 bg-card p-3 sm:hidden">
              <TransactionList
                rows={page.rows}
                showBalance={variant !== "SHOPPING"}
                secondary={(r) =>
                  r.type === "SHOPPING" && r.budgetRemainingCents !== null
                    ? `${targetLabel(r)} · ${r.budgetRemainingCents < 0 ? "over budget" : "budget left"}`
                    : `${TYPE_META[r.type].label} · ${targetLabel(r)}`
                }
              />
            </div>
          )}
        </>
      )}
    </>
  );
}

export function TypePageIcon({ type }: { type: ExpenseType }) {
  return <TypeIcon type={type} size="lg" />;
}
