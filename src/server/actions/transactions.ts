"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { authedAction, revalidateLedger, UserError, type ActionResult } from "../action";
import { expenseSchema, incomeSchema, type ExpenseInput, type IncomeInput } from "@/lib/validation";
import { centsToDecimalString, parseAmountToCents } from "@/lib/money";
import { parseIsoDate, todayIso } from "@/lib/dates";

/** Validates input and checks that referenced category/member belong to this household. */
async function buildExpenseData(householdId: string, raw: ExpenseInput) {
  const input = expenseSchema.parse(raw);
  const cents = parseAmountToCents(input.amount)!;

  let homeCategoryId: string | null = null;
  let shoppingMemberId: string | null = null;
  let description = input.description?.trim() ?? "";

  if (input.type === "HOME") {
    const category = await prisma.homeCategory.findFirst({
      where: { id: input.homeCategoryId!, householdId },
      select: { id: true, name: true },
    });
    if (!category) throw new UserError("That Home category no longer exists. Please choose another.");
    homeCategoryId = category.id;
    if (!description) description = category.name;
  }
  if (input.type === "SHOPPING") {
    const member = await prisma.shoppingMember.findFirst({
      where: { id: input.shoppingMemberId!, householdId },
      select: { id: true },
    });
    if (!member) throw new UserError("That shopping member no longer exists. Please choose another.");
    shoppingMemberId = member.id;
  }
  const place = input.type === "OUTING" ? input.place?.trim() || null : null;
  if (input.type === "OUTING" && !description) description = place ?? "Outing";

  return {
    type: input.type,
    amount: centsToDecimalString(cents),
    date: parseIsoDate(input.date)!,
    description,
    notes: input.notes?.trim() || null,
    homeCategoryId,
    shoppingMemberId,
    place,
    numberOfPeople: input.type === "OUTING" && input.numberOfPeople ? Number(input.numberOfPeople) : null,
    paymentMethod: input.type === "OUTING" ? input.paymentMethod?.trim() || null : null,
  };
}

function isUniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

async function insertExpense(householdId: string, raw: ExpenseInput) {
  const data = await buildExpenseData(householdId, raw);
  const clientId = raw.clientId || null;
  if (clientId) {
    const existing = await prisma.expense.findUnique({
      where: { householdId_clientId: { householdId, clientId } },
      select: { id: true },
    });
    if (existing) return existing.id; // already synced — never duplicate
  }
  try {
    const created = await prisma.expense.create({ data: { ...data, householdId, clientId }, select: { id: true } });
    return created.id;
  } catch (err) {
    if (clientId && isUniqueViolation(err)) {
      const existing = await prisma.expense.findUniqueOrThrow({
        where: { householdId_clientId: { householdId, clientId } },
        select: { id: true },
      });
      return existing.id;
    }
    throw err;
  }
}

async function insertIncome(householdId: string, raw: IncomeInput) {
  const input = incomeSchema.parse(raw);
  const clientId = raw.clientId || null;
  if (clientId) {
    const existing = await prisma.income.findUnique({
      where: { householdId_clientId: { householdId, clientId } },
      select: { id: true },
    });
    if (existing) return existing.id;
  }
  const data = {
    amount: centsToDecimalString(parseAmountToCents(input.amount)!),
    date: parseIsoDate(input.date)!,
    description: input.description?.trim() || input.source?.trim() || "Money received",
    source: input.source?.trim() || null,
  };
  try {
    const created = await prisma.income.create({ data: { ...data, householdId, clientId }, select: { id: true } });
    return created.id;
  } catch (err) {
    if (clientId && isUniqueViolation(err)) {
      const existing = await prisma.income.findUniqueOrThrow({
        where: { householdId_clientId: { householdId, clientId } },
        select: { id: true },
      });
      return existing.id;
    }
    throw err;
  }
}

export async function createExpense(input: ExpenseInput): Promise<ActionResult<{ id: string }>> {
  return authedAction("Could not save the expense. Please try again.", async ({ householdId }) => {
    const id = await insertExpense(householdId, input);
    revalidateLedger();
    return { id };
  });
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<ActionResult> {
  return authedAction("Could not update the expense. Please try again.", async ({ householdId }) => {
    const data = await buildExpenseData(householdId, input);
    const result = await prisma.expense.updateMany({ where: { id, householdId }, data });
    if (result.count === 0) throw new UserError("This expense no longer exists.");
    revalidateLedger();
    return null;
  });
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  return authedAction("Could not delete the transaction. Please try again.", async ({ householdId }) => {
    const result = await prisma.expense.deleteMany({ where: { id, householdId } });
    if (result.count === 0) throw new UserError("This transaction was already deleted.");
    revalidateLedger();
    return null;
  });
}

/** Copies an expense to a new date (default: today) — "Duplicate for this month". */
export async function duplicateExpense(id: string, date?: string): Promise<ActionResult<{ id: string }>> {
  return authedAction("Could not duplicate the expense. Please try again.", async ({ householdId }) => {
    const [source, household] = await Promise.all([
      prisma.expense.findFirst({ where: { id, householdId } }),
      prisma.household.findUniqueOrThrow({ where: { id: householdId }, select: { timezone: true } }),
    ]);
    if (!source) throw new UserError("This expense no longer exists.");
    const targetDate = date && parseIsoDate(date) ? date : todayIso(household.timezone);
    const created = await prisma.expense.create({
      data: {
        householdId,
        type: source.type,
        amount: source.amount,
        date: parseIsoDate(targetDate)!,
        description: source.description,
        notes: source.notes,
        homeCategoryId: source.homeCategoryId,
        shoppingMemberId: source.shoppingMemberId,
        place: source.place,
        numberOfPeople: source.numberOfPeople,
        paymentMethod: source.paymentMethod,
      },
      select: { id: true },
    });
    revalidateLedger();
    return { id: created.id };
  });
}

export async function createIncome(input: IncomeInput): Promise<ActionResult<{ id: string }>> {
  return authedAction("Could not save the money received. Please try again.", async ({ householdId }) => {
    const id = await insertIncome(householdId, input);
    revalidateLedger();
    return { id };
  });
}

export async function updateIncome(id: string, raw: IncomeInput): Promise<ActionResult> {
  return authedAction("Could not update the record. Please try again.", async ({ householdId }) => {
    const input = incomeSchema.parse(raw);
    const result = await prisma.income.updateMany({
      where: { id, householdId },
      data: {
        amount: centsToDecimalString(parseAmountToCents(input.amount)!),
        date: parseIsoDate(input.date)!,
        description: input.description?.trim() || input.source?.trim() || "Money received",
        source: input.source?.trim() || null,
      },
    });
    if (result.count === 0) throw new UserError("This record no longer exists.");
    revalidateLedger();
    return null;
  });
}

export async function deleteIncome(id: string): Promise<ActionResult> {
  return authedAction("Could not delete the transaction. Please try again.", async ({ householdId }) => {
    const result = await prisma.income.deleteMany({ where: { id, householdId } });
    if (result.count === 0) throw new UserError("This transaction was already deleted.");
    revalidateLedger();
    return null;
  });
}

export type QueuedRecord =
  | { kind: "expense"; clientId: string; payload: ExpenseInput }
  | { kind: "income"; clientId: string; payload: IncomeInput };

/**
 * Syncs records saved while offline. Each carries a client-generated ID, so
 * retrying a sync (or a sync racing a normal save) never creates duplicates.
 * Returns the client IDs that are now safely stored and those rejected as invalid.
 */
export async function syncOfflineRecords(
  records: QueuedRecord[],
): Promise<ActionResult<{ synced: string[]; rejected: { clientId: string; error: string }[] }>> {
  return authedAction("Could not sync offline records. They are kept and will retry.", async ({ householdId }) => {
    const synced: string[] = [];
    const rejected: { clientId: string; error: string }[] = [];
    for (const record of records.slice(0, 200)) {
      try {
        if (record.kind === "expense") await insertExpense(householdId, { ...record.payload, clientId: record.clientId });
        else await insertIncome(householdId, { ...record.payload, clientId: record.clientId });
        synced.push(record.clientId);
      } catch (err) {
        if (err instanceof UserError || (err instanceof Error && err.name === "ZodError")) {
          rejected.push({ clientId: record.clientId, error: err instanceof UserError ? err.message : "Invalid record" });
        } else {
          throw err; // transient (e.g. database down): keep everything queued
        }
      }
    }
    if (synced.length) revalidateLedger();
    return { synced, rejected };
  });
}
