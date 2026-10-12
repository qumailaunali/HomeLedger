import { z } from "zod";
import { parseAmountToCents } from "./money";
import { DATE_FORMATS, parseIsoDate } from "./dates";

/** Shared between client forms (react-hook-form) and server actions. */

const MAX_CENTS = 100_000_000_000; // Rs. 1 billion — guards against typos

export const amountField = z
  .string({ error: "Enter an amount." })
  .trim()
  .min(1, "Enter an amount.")
  .refine((v) => parseAmountToCents(v) !== null, "Enter a valid amount, like 1400 or 1400.50.")
  .refine((v) => (parseAmountToCents(v) ?? 0) > 0, "Amount must be greater than zero.")
  .refine((v) => (parseAmountToCents(v) ?? 0) <= MAX_CENTS, "That amount looks too large.");

/** Budgets and expected amounts may be zero. */
export const budgetAmountField = z
  .string()
  .trim()
  .transform((v) => (v === "" ? "0" : v))
  .refine((v) => parseAmountToCents(v) !== null, "Enter a valid amount.")
  .refine((v) => (parseAmountToCents(v) ?? -1) >= 0, "Amount cannot be negative.")
  .refine((v) => (parseAmountToCents(v) ?? 0) <= MAX_CENTS, "That amount looks too large.");

export const dateField = z
  .string({ error: "Choose a date." })
  .refine((v) => parseIsoDate(v) !== null, "Choose a valid date.");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .or(z.literal(""));

export const EXPENSE_TYPES = ["HOME", "SHOPPING", "OUTING"] as const;
export const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "Easypaisa / JazzCash", "Other"] as const;
export const INCOME_SOURCES = ["Salary", "House money", "Cash received", "Transfer", "Other"] as const;

export const expenseSchema = z
  .object({
    type: z.enum(EXPENSE_TYPES),
    amount: amountField,
    date: dateField,
    description: optionalText(200),
    notes: optionalText(500),
    homeCategoryId: z.string().optional().or(z.literal("")),
    shoppingMemberId: z.string().optional().or(z.literal("")),
    place: optionalText(120),
    numberOfPeople: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 500), "Enter a number of people from 1 to 500."),
    paymentMethod: optionalText(40),
    clientId: z.string().max(64).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === "HOME" && !val.homeCategoryId) {
      ctx.addIssue({ code: "custom", path: ["homeCategoryId"], message: "Choose a Home category." });
    }
    if (val.type === "SHOPPING") {
      if (!val.shoppingMemberId) {
        ctx.addIssue({ code: "custom", path: ["shoppingMemberId"], message: "Choose who this shopping was for." });
      }
      if (!val.description) {
        ctx.addIssue({ code: "custom", path: ["description"], message: "Add a short description, like \"shirts\"." });
      }
    }
    if (val.type === "OUTING" && !val.place) {
      ctx.addIssue({ code: "custom", path: ["place"], message: "Enter the restaurant or place." });
    }
  });
export type ExpenseInput = z.input<typeof expenseSchema>;

export const incomeSchema = z.object({
  amount: amountField,
  date: dateField,
  description: optionalText(200),
  source: optionalText(60),
  pot: z.enum(EXPENSE_TYPES, { error: "Choose where this money goes: Home, Outing or Shopping." }),
  clientId: z.string().max(64).optional(),
});
export type IncomeInput = z.input<typeof incomeSchema>;

export const nameField = z.string().trim().min(1, "Enter a name.").max(60, "Keep the name under 60 characters.");

export const categorySchema = z.object({
  name: nameField,
  expectedMonthlyAmount: budgetAmountField,
});
export type CategoryInput = z.input<typeof categorySchema>;

export const memberSchema = z.object({
  name: nameField,
});

export const yearField = z.coerce.number().int().min(2000, "Choose a year from 2000.").max(2100, "Choose a year before 2100.");

export const budgetSchema = z.object({
  memberId: z.string().min(1),
  year: yearField,
  amount: budgetAmountField,
});
export type BudgetInput = z.input<typeof budgetSchema>;

function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const generalSettingsSchema = z.object({
  name: nameField,
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, like PKR."),
  currencySymbol: z.string().trim().min(1, "Enter a currency symbol.").max(6, "Keep the symbol short."),
  startingBalance: z
    .string()
    .trim()
    .transform((v) => (v === "" ? "0" : v))
    .refine((v) => parseAmountToCents(v) !== null, "Enter a valid amount."),
  dateFormat: z.enum(DATE_FORMATS),
  timezone: z.string().refine(isValidTimeZone, "Choose a valid timezone."),
});
export type GeneralSettingsInput = z.input<typeof generalSettingsSchema>;

export const emailField = z.string().trim().toLowerCase().email("Enter a valid email address.");

export const usernameField = z
  .string({ error: "Choose a username." })
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters for the username.")
  .max(30, "Keep the username under 30 characters.")
  .regex(/^[a-z0-9._]+$/, "Use only letters, numbers, dots and underscores.");

export const loginSchema = z.object({
  username: z.string({ error: "Enter your username." }).trim().toLowerCase().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
});

export const signupSchema = z.object({
  name: nameField,
  username: usernameField,
  email: emailField.optional().or(z.literal("")),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
});

export const onboardingSchema = z.object({
  householdName: nameField,
  currency: generalSettingsSchema.shape.currency,
  currencySymbol: generalSettingsSchema.shape.currencySymbol,
  startingBalance: generalSettingsSchema.shape.startingBalance,
  categories: z
    .array(z.object({ name: nameField, expectedMonthlyAmount: budgetAmountField }))
    .max(100),
  members: z
    .array(z.object({ name: nameField, yearlyBudget: budgetAmountField }))
    .max(50),
});
export type OnboardingInput = z.input<typeof onboardingSchema>;

/** First human-readable validation message, for toasts. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}
