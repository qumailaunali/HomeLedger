import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { toCents } from "@/lib/money";
import { parseIsoDate, toIsoDate } from "@/lib/dates";
import type { LedgerFilters, LedgerPage, TransactionRow, TransactionType } from "@/types";

/**
 * The household ledger: every expense and every money-received record in one
 * chronological stream, with the running balance and the shopping budget
 * remaining computed by Postgres window functions. Balances are always
 * derived from the transactions — nothing is stored — so edits and deletes
 * are reflected everywhere immediately.
 *
 * Ordering inside a day follows entry order (createdAt), like rows in a sheet.
 */

interface RawLedgerRow {
  id: string;
  kind: "EXPENSE" | "INCOME";
  type: TransactionType;
  amount: Prisma.Decimal;
  date: Date;
  description: string;
  notes: string | null;
  place: string | null;
  numberOfPeople: number | null;
  paymentMethod: string | null;
  source: string | null;
  pot: string | null;
  homeCategoryId: string | null;
  categoryName: string | null;
  shoppingMemberId: string | null;
  memberName: string | null;
  balance: Prisma.Decimal;
  budgetRemaining: Prisma.Decimal | null;
  createdAt: Date;
  updatedAt: Date;
  total_count: bigint;
  filtered_spent: Prisma.Decimal | null;
  filtered_received: Prisma.Decimal | null;
}

function ledgerCte(householdId: string, startingBalanceCents: number) {
  const starting = new Prisma.Decimal(startingBalanceCents).div(100);
  return Prisma.sql`
    WITH ledger AS (
      SELECT e.id, 'EXPENSE'::text AS kind, e.type::text AS type, e.amount, e.date,
             e.description, e.notes, e.place, e."numberOfPeople", e."paymentMethod", NULL::text AS source, NULL::text AS pot,
             e."homeCategoryId", hc.name AS "categoryName", e."shoppingMemberId", sm.name AS "memberName",
             -e.amount AS delta, e."createdAt", e."updatedAt"
        FROM "Expense" e
        LEFT JOIN "HomeCategory" hc ON hc.id = e."homeCategoryId"
        LEFT JOIN "ShoppingMember" sm ON sm.id = e."shoppingMemberId"
       WHERE e."householdId" = ${householdId}
      UNION ALL
      SELECT i.id, 'INCOME'::text, 'RECEIVED'::text, i.amount, i.date,
             i.description, NULL, NULL, NULL, NULL, i.source, i.pot::text,
             NULL, NULL, NULL, NULL,
             i.amount, i."createdAt", i."updatedAt"
        FROM "Income" i
       WHERE i."householdId" = ${householdId}
    ),
    running AS (
      SELECT l.*,
             ${starting}::numeric + SUM(l.delta) OVER (
               ORDER BY l.date, l."createdAt", l.id ROWS UNBOUNDED PRECEDING
             ) AS balance,
             CASE WHEN l.type = 'SHOPPING' THEN
               COALESCE(sb."budgetAmount", 0) - SUM(l.amount) OVER (
                 PARTITION BY l.type, l."shoppingMemberId", EXTRACT(YEAR FROM l.date)
                 ORDER BY l.date, l."createdAt", l.id ROWS UNBOUNDED PRECEDING
               )
             END AS "budgetRemaining"
        FROM ledger l
        LEFT JOIN "ShoppingBudget" sb
          ON l.type = 'SHOPPING'
         AND sb."memberId" = l."shoppingMemberId"
         AND sb.year = EXTRACT(YEAR FROM l.date)::int
    )`;
}

function whereClause(filters: LedgerFilters) {
  const parts: Prisma.Sql[] = [];
  if (filters.from && parseIsoDate(filters.from)) parts.push(Prisma.sql`date >= ${filters.from}::date`);
  if (filters.to && parseIsoDate(filters.to)) parts.push(Prisma.sql`date <= ${filters.to}::date`);
  if (filters.type === "EXPENSES") parts.push(Prisma.sql`kind = 'EXPENSE'`);
  else if (filters.type && filters.type !== "ALL") parts.push(Prisma.sql`type = ${filters.type}`);
  if (filters.categoryId) parts.push(Prisma.sql`"homeCategoryId" = ${filters.categoryId}`);
  if (filters.memberId) parts.push(Prisma.sql`"shoppingMemberId" = ${filters.memberId}`);

  const search = filters.search?.trim();
  if (search) {
    const like = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const numeric = search.replace(/[,\s]|rs\.?/gi, "");
    const amountMatch = /^\d+(\.\d+)?$/.test(numeric)
      ? Prisma.sql`OR amount::text LIKE ${`${numeric}%`}`
      : Prisma.empty;
    parts.push(Prisma.sql`(
      description ILIKE ${like} OR notes ILIKE ${like} OR place ILIKE ${like}
      OR "categoryName" ILIKE ${like} OR "memberName" ILIKE ${like} OR source ILIKE ${like}
      ${amountMatch}
    )`);
  }
  return parts.length ? Prisma.sql`WHERE ${Prisma.join(parts, " AND ")}` : Prisma.empty;
}

function orderClause(filters: LedgerFilters) {
  const dir = filters.dir === "asc" ? Prisma.raw("ASC") : Prisma.raw("DESC");
  if (filters.sort === "amount") return Prisma.sql`ORDER BY amount ${dir}, date DESC, "createdAt" DESC`;
  return Prisma.sql`ORDER BY date ${dir}, "createdAt" ${dir}, id ${dir}`;
}

function mapRow(r: RawLedgerRow): TransactionRow {
  return {
    id: r.id,
    kind: r.kind,
    type: r.type,
    amountCents: toCents(r.amount),
    date: toIsoDate(r.date),
    description: r.description,
    notes: r.notes,
    place: r.place,
    numberOfPeople: r.numberOfPeople,
    paymentMethod: r.paymentMethod,
    source: r.source,
    pot: (r.pot as TransactionRow["pot"]) ?? null,
    homeCategoryId: r.homeCategoryId,
    categoryName: r.categoryName,
    shoppingMemberId: r.shoppingMemberId,
    memberName: r.memberName,
    balanceCents: toCents(r.balance),
    budgetRemainingCents: r.budgetRemaining === null ? null : toCents(r.budgetRemaining),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export const DEFAULT_PAGE_SIZE = 50;

export async function getLedgerPage(
  household: { id: string; startingBalanceCents: number },
  filters: LedgerFilters,
): Promise<LedgerPage> {
  const pageSize = Math.min(Math.max(filters.pageSize ?? DEFAULT_PAGE_SIZE, 1), 200);
  const page = Math.max(filters.page ?? 1, 1);
  const rows = await prisma.$queryRaw<RawLedgerRow[]>`
    ${ledgerCte(household.id, household.startingBalanceCents)}
    SELECT *,
           COUNT(*) OVER () AS total_count,
           SUM(CASE WHEN kind = 'EXPENSE' THEN amount ELSE 0 END) OVER () AS filtered_spent,
           SUM(CASE WHEN kind = 'INCOME' THEN amount ELSE 0 END) OVER () AS filtered_received
      FROM running
      ${whereClause(filters)}
      ${orderClause(filters)}
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;

  if (rows.length === 0 && page > 1) {
    // Page past the end (e.g. after deleting the last row): fall back to page 1.
    return getLedgerPage(household, { ...filters, page: 1 });
  }

  const first = rows[0];
  return {
    rows: rows.map(mapRow),
    total: first ? Number(first.total_count) : 0,
    page,
    pageSize,
    spentCents: first ? toCents(first.filtered_spent) : 0,
    receivedCents: first ? toCents(first.filtered_received) : 0,
  };
}

/** Every matching row, oldest first — for exports. */
export async function getLedgerRows(
  household: { id: string; startingBalanceCents: number },
  filters: LedgerFilters,
): Promise<TransactionRow[]> {
  const rows = await prisma.$queryRaw<RawLedgerRow[]>`
    ${ledgerCte(household.id, household.startingBalanceCents)}
    SELECT *, 0::bigint AS total_count, NULL::numeric AS filtered_spent, NULL::numeric AS filtered_received
      FROM running
      ${whereClause(filters)}
     ORDER BY date ASC, "createdAt" ASC, id ASC`;
  return rows.map(mapRow);
}

/** Most recent transactions for the dashboard. */
export async function getRecentTransactions(
  household: { id: string; startingBalanceCents: number },
  limit = 8,
): Promise<TransactionRow[]> {
  const page = await getLedgerPage(household, { sort: "date", dir: "desc", pageSize: limit });
  return page.rows;
}
