import "server-only";
import * as XLSX from "xlsx";
import type { HouseholdContext } from "./auth";
import { getLedgerRows } from "./queries/ledger";
import { getPeriodTotals, getShoppingBudget, getBalanceCents } from "./queries/summary";
import { isoParts, isoRange, formatDate, type IsoDate } from "@/lib/dates";

import type { TransactionRow, TransactionType } from "@/types";

export interface ExportRequest {
  from: IsoDate | null; // null = from the first record
  to: IsoDate | null;
  type: TransactionType | "ALL";
  label: string;
}

const TYPE_LABEL: Record<TransactionType, string> = {
  HOME: "Home",
  SHOPPING: "Shopping",
  OUTING: "Outing",
  RECEIVED: "Received",
};

function targetOf(r: TransactionRow) {
  if (r.type === "HOME") return r.categoryName ?? "";
  if (r.type === "SHOPPING") return r.memberName ?? "";
  if (r.type === "OUTING") return r.place ?? "";
  return r.source ?? "Income";
}

// ---------- Excel ----------

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

/** Excel serial date computed from the calendar date itself — no timezone shifts. */
function excelDate(iso: IsoDate) {
  const { year, month, day } = isoParts(iso);
  return (Date.UTC(year, month - 1, day) - EXCEL_EPOCH) / 86_400_000;
}

type Cell = string | number | null | { money: number } | { date: IsoDate };

function sheet(header: string[], rows: Cell[][], widths: number[], currencyFormat: string) {
  const aoa = [header, ...rows.map((r) => r.map((c) => (c && typeof c === "object" ? ("money" in c ? c.money / 100 : excelDate(c.date)) : c)))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  rows.forEach((r, ri) => {
    r.forEach((c, ci) => {
      if (!c || typeof c !== "object") return;
      const cell = ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })];
      if (!cell) return;
      cell.t = "n";
      cell.z = "money" in c ? currencyFormat : "dd mmm yyyy";
    });
  });
  ws["!cols"] = widths.map((wch) => ({ wch }));
  if (rows.length) ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: header.length - 1 } }) };
  return ws;
}

export async function buildWorkbook(household: HouseholdContext, req: ExportRequest): Promise<Buffer> {
  const rows = await getLedgerRows(household, { from: req.from ?? undefined, to: req.to ?? undefined, type: req.type });
  const symbol = household.currencySymbol.replace(/"/g, "");
  const currencyFormat = `"${symbol}" #,##0.00;[Red]-"${symbol}" #,##0.00`;
  const m = (cents: number) => ({ money: cents });
  const d = (iso: IsoDate) => ({ date: iso });

  const wb = XLSX.utils.book_new();

  // Summary
  const firstDate = rows[0]?.date;
  const lastDate = rows[rows.length - 1]?.date;
  const range = req.from && req.to ? isoRange(req.from, req.to) : null;
  const totals = range
    ? await getPeriodTotals(household.id, range)
    : await getPeriodTotals(household.id, { gte: new Date(Date.UTC(1900, 0, 1)), lt: new Date(Date.UTC(3000, 0, 1)) });
  const summaryYear = req.to ? isoParts(req.to).year : lastDate ? isoParts(lastDate).year : new Date().getFullYear();
  const [shopping, balance] = await Promise.all([getShoppingBudget(household.id, summaryYear), getBalanceCents(household)]);

  const summaryRows: Cell[][] = [
    ["Household", household.name],
    ["Period", req.label],
    ["Records", rows.length],
    ["First record", firstDate ? d(firstDate) : "—"],
    ["Last record", lastDate ? d(lastDate) : "—"],
    [null, null],
    ["Money received", m(totals.receivedCents)],
    ["Home expenses", m(totals.homeCents)],
    ["Shopping expenses", m(totals.shoppingCents)],
    ["Outing expenses", m(totals.outingCents)],
    ["Total expenses", m(totals.spentCents)],
    ["Net change", m(totals.netCents)],
    ["Current balance (today)", m(balance)],
    [null, null],
    [`Shopping budgets ${summaryYear}`, "Budget", "Spent", "Remaining", "Used %"],
    ...shopping.lines.map<Cell[]>((l) => [l.name, m(l.budgetCents), m(l.spentCents), m(l.remainingCents), l.budgetCents ? `${l.percent}%` : "—"]),
  ];
  XLSX.utils.book_append_sheet(wb, sheet(["Summary", ""], summaryRows, [28, 18, 16, 16, 10], currencyFormat), "Summary");

  const of = (t: TransactionType) => rows.filter((r) => r.type === t);
  const include = (t: TransactionType) => req.type === "ALL" || req.type === t;

  if (include("HOME")) {
    XLSX.utils.book_append_sheet(
      wb,
      sheet(
        ["Date", "Category", "Description", "Notes", "Amount", "Balance"],
        of("HOME").map((r) => [d(r.date), r.categoryName ?? "", r.description, r.notes ?? "", m(r.amountCents), m(r.balanceCents)]),
        [13, 18, 34, 24, 15, 16],
        currencyFormat,
      ),
      "Home",
    );
  }
  if (include("SHOPPING")) {
    XLSX.utils.book_append_sheet(
      wb,
      sheet(
        ["Date", "Person", "Description", "Amount", "Budget Remaining"],
        of("SHOPPING").map((r) => [d(r.date), r.memberName ?? "", r.description, m(r.amountCents), r.budgetRemainingCents === null ? null : m(r.budgetRemainingCents)]),
        [13, 16, 36, 15, 18],
        currencyFormat,
      ),
      "Shopping",
    );
  }
  if (include("OUTING")) {
    XLSX.utils.book_append_sheet(
      wb,
      sheet(
        ["Date", "Restaurant / Place", "Notes", "Amount", "People", "Payment Method", "Balance"],
        of("OUTING").map((r) => [
          d(r.date),
          r.place ?? "",
          [r.description !== r.place ? r.description : "", r.notes ?? ""].filter(Boolean).join(" — "),
          m(r.amountCents),
          r.numberOfPeople,
          r.paymentMethod ?? "",
          m(r.balanceCents),
        ]),
        [13, 22, 32, 15, 8, 16, 16],
        currencyFormat,
      ),
      "Outing",
    );
  }
  if (include("RECEIVED")) {
    XLSX.utils.book_append_sheet(
      wb,
      sheet(
        ["Date", "Added to", "Source", "Description", "Amount", "Balance"],
        of("RECEIVED").map((r) => [d(r.date), r.pot ? TYPE_LABEL[r.pot] : "General", r.source ?? "", r.description, m(r.amountCents), m(r.balanceCents)]),
        [13, 12, 18, 34, 15, 16],
        currencyFormat,
      ),
      "Received Money",
    );
  }
  if (req.type === "ALL") {
    XLSX.utils.book_append_sheet(
      wb,
      sheet(
        ["Date", "Type", "Category / Person", "Description", "Amount", "Received", "Balance"],
        rows.map((r) => [
          d(r.date),
          TYPE_LABEL[r.type],
          targetOf(r),
          r.description,
          r.kind === "EXPENSE" ? m(r.amountCents) : null,
          r.kind === "INCOME" ? m(r.amountCents) : null,
          m(r.balanceCents),
        ]),
        [13, 11, 20, 36, 15, 15, 16],
        currencyFormat,
      ),
      "All Records",
    );
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true }) as Buffer;
}

// ---------- CSV ----------

function csvCell(value: string | number | null) {
  if (value === null) return "";
  const s = String(value);
  // Quote when needed; prefix formula-like text so spreadsheets don't execute it.
  const safe = /^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function buildCsv(household: HouseholdContext, req: ExportRequest): Promise<string> {
  const rows = await getLedgerRows(household, { from: req.from ?? undefined, to: req.to ?? undefined, type: req.type });
  const amount = (cents: number) => (cents / 100).toFixed(2);
  const lines = [
    ["Date", "Type", "Category / Person / Place", "Description", "Notes", "Amount", "Received", "Balance", "Shopping Budget Remaining"],
    ...rows.map((r) => [
      r.date,
      TYPE_LABEL[r.type],
      targetOf(r),
      r.description,
      r.notes ?? "",
      r.kind === "EXPENSE" ? amount(r.amountCents) : "",
      r.kind === "INCOME" ? amount(r.amountCents) : "",
      amount(r.balanceCents),
      r.budgetRemainingCents === null ? "" : amount(r.budgetRemainingCents),
    ]),
  ];
  // BOM so Excel opens UTF-8 correctly
  return "﻿" + lines.map((l) => l.map(csvCell).join(",")).join("\r\n");
}

export function describePeriod(req: { from: IsoDate | null; to: IsoDate | null }, format: string) {
  if (!req.from && !req.to) return "All records";
  return `${req.from ? formatDate(req.from, format) : "Start"} – ${req.to ? formatDate(req.to, format) : "Today"}`;
}

