"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-context";
import { useToast } from "@/components/ui/toast";
import { buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/misc";
import { deleteExpense, deleteIncome, duplicateExpense } from "@/server/actions/transactions";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import { TypeBadge, primaryLabel, targetLabel } from "./type-meta";
import type { LedgerPage, TransactionRow } from "@/types";

export type LedgerVariant = "ALL" | "HOME" | "SHOPPING" | "OUTING";

type Align = "left" | "right";
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TFeatures, TData, TValue> {
    align?: Align;
    sortKey?: "date" | "amount";
    sticky?: boolean;
    className?: string;
  }
}

const features = tableFeatures({});
const col = createColumnHelper<typeof features, TransactionRow>();

/**
 * Spreadsheet-style ledger: sticky header, sticky date column, zebra rows,
 * server-side sorting and pagination through the URL. Clicking a row opens it.
 */
export function LedgerTable({ page, variant, sort, dir }: { page: LedgerPage; variant: LedgerVariant; sort: string; dir: string }) {
  const { money, date, openTransaction } = useApp();
  const toast = useToast();
  const [deleting, setDeleting] = React.useState<TransactionRow | null>(null);

  const columns = React.useMemo(() => {
    const d = col.accessor("date", {
      header: "Date",
      cell: (c) => date(c.getValue()),
      meta: { sortKey: "date", sticky: true, className: "whitespace-nowrap" },
    });
    const amount = col.accessor("amountCents", {
      id: "amount",
      header: variant === "ALL" ? "Amount" : "Amount",
      cell: (c) => (c.row.original.kind === "EXPENSE" ? money(c.getValue()) : ""),
      meta: { align: "right", sortKey: "amount", className: "font-medium" },
    });
    const received = col.display({
      id: "received",
      header: "Received",
      cell: (c) => (c.row.original.kind === "INCOME" ? <span className="text-positive">+{money(c.row.original.amountCents)}</span> : ""),
      meta: { align: "right", className: "font-medium" },
    });
    const balance = col.accessor("balanceCents", {
      header: "Balance",
      cell: (c) => <span className={c.getValue() < 0 ? "text-danger" : undefined}>{money(c.getValue())}</span>,
      meta: { align: "right", className: "text-muted-foreground" },
    });
    const description = col.accessor("description", {
      header: variant === "OUTING" ? "Notes" : "Description",
      cell: (c) => {
        const r = c.row.original;
        const text = variant === "OUTING" ? [r.description !== r.place ? r.description : "", r.notes].filter(Boolean).join(" — ") : r.description;
        return <span className="block max-w-[22rem] truncate">{text || "—"}</span>;
      },
      meta: { className: "min-w-48" },
    });
    const target = (header: string) =>
      col.display({ id: "target", header, cell: (c) => <span className="font-medium">{targetLabel(c.row.original)}</span>, meta: { className: "whitespace-nowrap" } });

    const actions = col.display({
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: (c) => <RowActions row={c.row.original} onDelete={setDeleting} />,
      meta: { align: "right", className: "w-10" },
    });

    switch (variant) {
      case "HOME":
        return col.columns([d, target("Category"), amount, description, balance, actions]);
      case "SHOPPING":
        return col.columns([
          d,
          target("Person"),
          amount,
          description,
          col.accessor("budgetRemainingCents", {
            header: "Yearly Budget Remaining",
            cell: (c) => {
              const v = c.getValue();
              if (v === null) return "—";
              return v < 0 ? <span className="text-danger">Over {money(-v)}</span> : money(v);
            },
            meta: { align: "right" },
          }),
          actions,
        ]);
      case "OUTING":
        return col.columns([d, target("Restaurant / Place"), amount, description, balance, actions]);
      default:
        return col.columns([d, col.display({ id: "type", header: "Type", cell: (c) => <TypeBadge type={c.row.original.type} /> }), target("Category / Person"), description, amount, received, balance, actions]);
    }
  }, [variant, money, date]);

  const table = useTable({ features, columns, data: page.rows, getRowId: (r) => `${r.kind}-${r.id}` });

  return (
    <div>
      <div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-border/70 bg-card">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const meta = h.column.columnDef.meta;
                  return (
                    <th
                      key={h.id}
                      scope="col"
                      aria-sort={meta?.sortKey === sort ? (dir === "asc" ? "ascending" : "descending") : undefined}
                      className={cn(
                        "sticky top-0 z-10 border-b bg-muted/95 px-3 py-2.5 text-[11px] font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase backdrop-blur",
                        meta?.align === "right" ? "text-right" : "text-left",
                        meta?.sticky && "left-0 z-20",
                      )}
                    >
                      {meta?.sortKey ? (
                        <SortLink sortKey={meta.sortKey} current={sort} dir={dir} align={meta.align}>
                          <table.FlexRender header={h} />
                        </SortLink>
                      ) : (
                        <table.FlexRender header={h} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                tabIndex={0}
                onClick={() => openTransaction(row.original)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target === e.currentTarget) openTransaction(row.original);
                }}
                className={cn(
                  "group cursor-pointer outline-none focus-visible:bg-accent",
                  i % 2 === 1 ? "bg-muted/35" : "bg-card",
                  row.original.kind === "INCOME" && "bg-received-soft/50",
                )}
              >
                {row.getAllCells().map((cell) => {
                  const meta = cell.column.columnDef.meta;
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        "tabular border-b border-border/50 px-3 py-2.5 group-last:border-b-0 group-hover:bg-accent/70",
                        meta?.align === "right" && "text-right whitespace-nowrap",
                        meta?.sticky && "sticky left-0 z-[1] bg-inherit",
                        meta?.className,
                      )}
                    >
                      <table.FlexRender cell={cell} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} />

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        details={deleting ? { label: primaryLabel(deleting), amount: money(deleting.amountCents), date: date(deleting.date) } : null}
        onConfirm={async () => {
          if (!deleting) return true;
          const res = await (deleting.kind === "INCOME" ? deleteIncome(deleting.id) : deleteExpense(deleting.id)).catch(() => null);
          if (res?.ok) {
            toast.success("Transaction deleted");
            return true;
          }
          toast.error(res && !res.ok ? res.error : "Could not delete. Please try again.");
          return false;
        }}
      />
    </div>
  );
}

function RowActions({ row, onDelete }: { row: TransactionRow; onDelete: (row: TransactionRow) => void }) {
  const { openExpense, openIncome } = useApp();
  const toast = useToast();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label={`Actions for ${primaryLabel(row)}`}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => (row.kind === "INCOME" ? openIncome(row) : openExpense({ edit: row }))}>
          <Pencil /> Edit
        </DropdownMenuItem>
        {row.kind === "EXPENSE" && (
          <DropdownMenuItem
            onSelect={async () => {
              const res = await duplicateExpense(row.id).catch(() => null);
              if (res?.ok) toast.success("Duplicated for today");
              else toast.error(res && !res.ok ? res.error : "Could not duplicate. Please try again.");
            }}
          >
            <Copy /> Duplicate for today
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => onDelete(row)}>
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


function useHref() {
  const pathname = usePathname();
  const params = useSearchParams();
  return (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
}

function SortLink({
  sortKey,
  current,
  dir,
  align,
  children,
}: {
  sortKey: string;
  current: string;
  dir: string;
  align?: Align;
  children: React.ReactNode;
}) {
  const href = useHref();
  const active = current === sortKey;
  const nextDir = active && dir === "desc" ? "asc" : "desc";
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <Link
      href={href({ sort: sortKey, dir: nextDir, page: null })}
      scroll={false}
      className={cn("inline-flex items-center gap-1 hover:text-foreground", align === "right" && "flex-row-reverse", active && "text-foreground")}
    >
      {children}
      <Icon className="size-3" aria-hidden />
    </Link>
  );
}

function Pagination({ page }: { page: LedgerPage }) {
  const href = useHref();
  const pages = Math.max(1, Math.ceil(page.total / page.pageSize));
  const start = page.total === 0 ? 0 : (page.page - 1) * page.pageSize + 1;
  const end = Math.min(page.page * page.pageSize, page.total);
  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-3 text-sm text-muted-foreground">
      <span className="tabular">
        {start}–{end} of {page.total}
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-1.5">
          <Link
            aria-disabled={page.page <= 1}
            href={href({ page: String(page.page - 1) })}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), page.page <= 1 && "pointer-events-none opacity-50")}
            scroll={false}
          >
            <ChevronLeft /> Previous
          </Link>
          <span className="tabular px-1">
            {page.page} / {pages}
          </span>
          <Link
            aria-disabled={page.page >= pages}
            href={href({ page: String(page.page + 1) })}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), page.page >= pages && "pointer-events-none opacity-50")}
            scroll={false}
          >
            Next <ChevronRight />
          </Link>
        </div>
      )}
    </div>
  );
}
