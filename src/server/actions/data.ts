"use server";

import { prisma } from "../db";
import { authedAction, revalidateLedger, UserError, type ActionResult } from "../action";
import { backupSchema, type Backup } from "@/lib/backup";
import { centsToDecimalString, parseAmountToCents } from "@/lib/money";
import { parseFlexibleDate, parseIsoDate } from "@/lib/dates";
import type { ExpenseType } from "@/types";

// ---------- CSV / Excel import ----------

/** One row as mapped by the user in the import screen (raw cell values). */
export interface ImportRowInput {
  date: unknown;
  amount: unknown;
  description?: unknown;
  target?: unknown; // Home category name, shopping member name, or outing place
  notes?: unknown;
}

export interface ImportRowResult {
  index: number;
  valid: boolean;
  errors: string[];
  date: string | null;
  amountCents: number | null;
  description: string;
  targetId: string | null;
  targetName: string;
  notes: string;
}

const MAX_IMPORT_ROWS = 2000;

function text(v: unknown, max: number) {
  if (v === null || v === undefined) return "";
  return String(v).trim().slice(0, max);
}

async function validateRows(householdId: string, type: ExpenseType, rows: ImportRowInput[], defaultTargetId: string | null) {
  if (rows.length > MAX_IMPORT_ROWS) throw new UserError(`Import up to ${MAX_IMPORT_ROWS} rows at a time.`);

  const lookup = new Map<string, { id: string; name: string }>();
  if (type === "HOME") {
    const cats = await prisma.homeCategory.findMany({ where: { householdId }, select: { id: true, name: true } });
    for (const c of cats) lookup.set(c.name.toLowerCase(), c);
  } else if (type === "SHOPPING") {
    const members = await prisma.shoppingMember.findMany({ where: { householdId }, select: { id: true, name: true } });
    for (const m of members) lookup.set(m.name.toLowerCase(), m);
  }
  const fallback = defaultTargetId ? [...lookup.values()].find((t) => t.id === defaultTargetId) ?? null : null;

  return rows.map<ImportRowResult>((row, index) => {
    const errors: string[] = [];
    const date = parseFlexibleDate(row.date);
    if (!date) errors.push(row.date ? `"${text(row.date, 30)}" is not a valid date` : "Missing date");

    const amountRaw = typeof row.amount === "number" ? row.amount.toFixed(2) : text(row.amount, 30);
    const amountCents = amountRaw ? parseAmountToCents(amountRaw) : null;
    if (amountCents === null) errors.push(amountRaw ? `"${amountRaw}" is not a valid amount` : "Missing amount");
    else if (amountCents <= 0) errors.push("Amount must be greater than zero");

    let description = text(row.description, 200);
    const targetText = text(row.target, 120);
    let targetId: string | null = null;
    let targetName = targetText;

    if (type === "OUTING") {
      if (!targetText && !description) errors.push("Missing restaurant / place");
      targetName = targetText || description;
      if (!description) description = targetName;
    } else {
      // Rows with a missing or unrecognised name use the default the user picked, if any.
      const match = targetText ? lookup.get(targetText.toLowerCase()) : undefined;
      const resolved = match ?? fallback ?? undefined;
      const label = type === "HOME" ? "category" : "member";
      if (!resolved) {
        errors.push(targetText ? `Unknown ${label} "${targetText}"` : `Missing ${label}`);
      } else {
        targetId = resolved.id;
        targetName = resolved.name;
      }
      if (!description) {
        if (type === "SHOPPING") errors.push("Missing description");
        else description = targetName;
      }
    }

    return {
      index,
      valid: errors.length === 0,
      errors,
      date,
      amountCents,
      description,
      targetId,
      targetName,
      notes: text(row.notes, 500),
    };
  });
}

/** Step 3 of the import: validate everything, write nothing. */
export async function previewImport(
  type: ExpenseType,
  rows: ImportRowInput[],
  defaultTargetId: string | null,
): Promise<ActionResult<ImportRowResult[]>> {
  return authedAction("Could not read the import file. Please check it and try again.", async ({ householdId }) =>
    validateRows(householdId, type, rows, defaultTargetId),
  );
}

/** Step 5: re-validates on the server and inserts only valid rows, in one transaction. */
export async function commitImport(
  type: ExpenseType,
  rows: ImportRowInput[],
  defaultTargetId: string | null,
): Promise<ActionResult<{ imported: number; skipped: number }>> {
  return authedAction("Import failed — nothing was saved. Please try again.", async ({ householdId }) => {
    const checked = await validateRows(householdId, type, rows, defaultTargetId);
    const valid = checked.filter((r) => r.valid);
    if (!valid.length) throw new UserError("There are no valid rows to import.");
    await prisma.expense.createMany({
      data: valid.map((r) => ({
        householdId,
        type,
        amount: centsToDecimalString(r.amountCents!),
        date: parseIsoDate(r.date!)!,
        description: r.description,
        notes: r.notes || null,
        homeCategoryId: type === "HOME" ? r.targetId : null,
        shoppingMemberId: type === "SHOPPING" ? r.targetId : null,
        place: type === "OUTING" ? r.targetName : null,
      })),
    });
    revalidateLedger();
    return { imported: valid.length, skipped: checked.length - valid.length };
  });
}

// ---------- JSON backup restore ----------

export interface RestorePreview {
  householdName: string;
  exportedAt: string;
  categories: number;
  members: number;
  budgets: number;
  incomes: number;
  expenses: number;
}

function parseBackup(json: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new UserError("This file is not a valid HomeLedger backup.");
  }
  const parsed = backupSchema.safeParse(data);
  if (!parsed.success) throw new UserError("This file is not a valid HomeLedger backup, or it is from a newer version.");
  const b = parsed.data;
  const catIds = new Set(b.homeCategories.map((c) => c.id));
  const memberIds = new Set(b.shoppingMembers.map((m) => m.id));
  for (const e of b.expenses) {
    if (e.homeCategoryId && !catIds.has(e.homeCategoryId)) throw new UserError("The backup is damaged: an expense refers to a missing category.");
    if (e.shoppingMemberId && !memberIds.has(e.shoppingMemberId)) throw new UserError("The backup is damaged: an expense refers to a missing member.");
  }
  return b;
}

export async function previewRestore(json: string): Promise<ActionResult<RestorePreview>> {
  return authedAction("Could not read the backup file.", async () => {
    const b = parseBackup(json);
    return {
      householdName: b.household.name,
      exportedAt: b.exportedAt,
      categories: b.homeCategories.length,
      members: b.shoppingMembers.length,
      budgets: b.shoppingMembers.reduce((s, m) => s + m.budgets.length, 0),
      incomes: b.incomes.length,
      expenses: b.expenses.length,
    };
  });
}

/** Replaces ALL of this household's data with the backup, atomically. */
export async function restoreBackup(json: string): Promise<ActionResult> {
  return authedAction("Restore failed — your existing data was not changed.", async ({ householdId }) => {
    const b = parseBackup(json);
    const money = (v: string) => centsToDecimalString(parseAmountToCents(v)!);

    await prisma.$transaction(
      async (tx) => {
        await tx.expense.deleteMany({ where: { householdId } });
        await tx.income.deleteMany({ where: { householdId } });
        await tx.shoppingMember.deleteMany({ where: { householdId } }); // budgets cascade
        await tx.homeCategory.deleteMany({ where: { householdId } });

        await tx.household.update({
          where: { id: householdId },
          data: {
            name: b.household.name,
            currency: b.household.currency,
            currencySymbol: b.household.currencySymbol,
            startingBalance: money(b.household.startingBalance),
            dateFormat: b.household.dateFormat,
            timezone: b.household.timezone,
          },
        });

        const catMap = new Map<string, string>();
        for (const c of b.homeCategories) {
          const created = await tx.homeCategory.create({
            data: {
              householdId,
              name: c.name,
              expectedMonthlyAmount: money(c.expectedMonthlyAmount),
              isActive: c.isActive,
              sortOrder: c.sortOrder,
            },
          });
          catMap.set(c.id, created.id);
        }
        const memberMap = new Map<string, string>();
        for (const m of b.shoppingMembers) {
          const created = await tx.shoppingMember.create({
            data: {
              householdId,
              name: m.name,
              isActive: m.isActive,
              sortOrder: m.sortOrder,
              budgets: { create: m.budgets.map((x) => ({ year: x.year, budgetAmount: money(x.budgetAmount) })) },
            },
          });
          memberMap.set(m.id, created.id);
        }
        await tx.income.createMany({
          data: b.incomes.map((i) => ({
            householdId,
            date: parseIsoDate(i.date)!,
            amount: money(i.amount),
            description: i.description,
            source: i.source,
            pot: i.pot ?? null,
          })),
        });
        await tx.expense.createMany({
          data: b.expenses.map((e) => ({
            householdId,
            type: e.type,
            date: parseIsoDate(e.date)!,
            amount: money(e.amount),
            description: e.description,
            notes: e.notes,
            homeCategoryId: e.homeCategoryId ? catMap.get(e.homeCategoryId)! : null,
            shoppingMemberId: e.shoppingMemberId ? memberMap.get(e.shoppingMemberId)! : null,
            place: e.place,
            numberOfPeople: e.numberOfPeople,
            paymentMethod: e.paymentMethod,
          })),
        });
      },
      { timeout: 60_000 },
    );
    revalidateLedger();
    return null;
  });
}

