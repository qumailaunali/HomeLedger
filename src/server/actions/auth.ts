"use server";

import { redirect } from "next/navigation";
import { prisma } from "../db";
import { checkPassword, endSession, getCurrentUser, hashPassword, startSession } from "../auth";
import { authedAction, type ActionResult } from "../action";
import { loginSchema, onboardingSchema, signupSchema, firstIssue, type OnboardingInput } from "@/lib/validation";
import { centsToDecimalString, parseAmountToCents } from "@/lib/money";

export interface AuthFormState {
  error?: string;
  username?: string;
  email?: string;
}

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = "$2b$12$Zgcm1YATfErTNRw/S5EgTuegwtOLtu1veKs0pD24Spnon4fjQuqa6";

function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({ username: formData.get("username"), password: formData.get("password") });
  const username = String(formData.get("username") ?? "");
  if (!parsed.success) return { error: firstIssue(parsed.error), username };

  let user: { id: string; householdId: string; passwordHash: string } | null;
  try {
    user = await prisma.user.findUnique({
      where: { username: parsed.data.username },
      select: { id: true, householdId: true, passwordHash: true },
    });
  } catch (err) {
    console.error("[login]", err);
    return { error: "Could not sign in right now. Please try again.", username };
  }
  const valid = await checkPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return { error: "That username and password don't match.", username };

  await startSession(user.id, user.householdId);
  redirect(safeNext(formData.get("next")));
}

export async function signupAllowed() {
  if (process.env.SIGNUP_ENABLED === "true") return true;
  return (await prisma.user.count()) === 0;
}

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const username = String(formData.get("username") ?? "");
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    email: formData.get("email") ?? "",
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error), email, username };

  try {
    if (!(await signupAllowed())) {
      return { error: "New sign-ups are closed. Ask the household owner for access.", email, username };
    }
    if (await prisma.user.findUnique({ where: { username: parsed.data.username }, select: { id: true } })) {
      return { error: "That username is taken. Please choose another.", email, username };
    }
    const emailValue = parsed.data.email || null;
    if (emailValue && (await prisma.user.findUnique({ where: { email: emailValue }, select: { id: true } }))) {
      return { error: "An account with this email already exists. Try signing in.", email, username };
    }
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.$transaction(async (tx) => {
      const household = await tx.household.create({ data: { name: `${parsed.data.name.split(" ")[0]}'s Household` } });
      return tx.user.create({
        data: {
          name: parsed.data.name,
          username: parsed.data.username,
          email: emailValue,
          passwordHash,
          householdId: household.id,
          role: "OWNER",
        },
        select: { id: true, householdId: true },
      });
    });
    await startSession(user.id, user.householdId);
  } catch (err) {
    console.error("[signup]", err);
    return { error: "Could not create your account. Please try again.", email, username };
  }
  redirect("/onboarding");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

/** First-run setup: household, currency, Home categories, shopping members and this year's budgets. */
export async function completeOnboarding(raw: OnboardingInput, year: number): Promise<ActionResult> {
  return authedAction("Could not finish setup. Please try again.", async ({ householdId }) => {
    const input = onboardingSchema.parse(raw);
    const user = await getCurrentUser();
    if (!user) return null;
    const money = (v: string) => centsToDecimalString(parseAmountToCents(v) ?? 0);

    await prisma.$transaction(async (tx) => {
      await tx.household.update({
        where: { id: householdId },
        data: {
          name: input.householdName,
          currency: input.currency,
          currencySymbol: input.currencySymbol,
          startingBalance: money(input.startingBalance),
          onboardedAt: new Date(),
        },
      });
      const existingCats = await tx.homeCategory.count({ where: { householdId } });
      if (existingCats === 0 && input.categories.length) {
        await tx.homeCategory.createMany({
          data: dedupe(input.categories).map((c, i) => ({
            householdId,
            name: c.name,
            expectedMonthlyAmount: money(c.expectedMonthlyAmount),
            sortOrder: i + 1,
          })),
        });
      }
      const existingMembers = await tx.shoppingMember.count({ where: { householdId } });
      if (existingMembers === 0) {
        for (const [i, m] of dedupe(input.members).entries()) {
          await tx.shoppingMember.create({
            data: {
              householdId,
              name: m.name,
              sortOrder: i + 1,
              budgets: { create: { year, budgetAmount: money(m.yearlyBudget) } },
            },
          });
        }
      }
    });
    return null;
  });
}

function dedupe<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const key = i.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
