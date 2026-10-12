import { z } from "zod";
import { parseAmountToCents } from "./money";
import { parseIsoDate } from "./dates";

/** JSON backup format. Amounts are decimal strings ("1400.00"), dates are "YYYY-MM-DD". */

const money = z.string().refine((v) => parseAmountToCents(v) !== null, "Invalid amount");
const date = z.string().refine((v) => parseIsoDate(v) !== null, "Invalid date");

export const backupSchema = z.object({
  app: z.literal("HomeLedger"),
  version: z.literal(2),
  exportedAt: z.string(),
  household: z.object({
    name: z.string().min(1).max(60),
    currency: z.string().regex(/^[A-Z]{3}$/),
    currencySymbol: z.string().min(1).max(6),
    startingBalance: money,
    dateFormat: z.string().max(20),
    timezone: z.string().max(60),
  }),
  homeCategories: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(60),
      expectedMonthlyAmount: money,
      isActive: z.boolean(),
      sortOrder: z.number().int(),
    }),
  ),
  shoppingMembers: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(60),
      isActive: z.boolean(),
      sortOrder: z.number().int(),
      budgets: z.array(z.object({ year: z.number().int().min(2000).max(2100), budgetAmount: money })),
    }),
  ),
  incomes: z.array(
    z.object({
      date,
      amount: money,
      description: z.string().max(200),
      source: z.string().max(60).nullable(),
      pot: z.enum(["HOME", "SHOPPING", "OUTING"]).nullable().optional(),
    }),
  ),
  expenses: z.array(
    z.object({
      type: z.enum(["HOME", "SHOPPING", "OUTING"]),
      date,
      amount: money,
      description: z.string().max(200),
      notes: z.string().max(500).nullable(),
      homeCategoryId: z.string().nullable(),
      shoppingMemberId: z.string().nullable(),
      place: z.string().max(120).nullable(),
      numberOfPeople: z.number().int().nullable(),
      paymentMethod: z.string().max(40).nullable(),
    }),
  ),
});

export type Backup = z.infer<typeof backupSchema>;
