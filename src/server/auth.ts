import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession, verifySession } from "@/lib/session-token";
import { toCents } from "@/lib/money";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function checkPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function startSession(userId: string, householdId: string) {
  const token = await signSession({ userId, householdId });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * The signed-in user, verified against the database once per request.
 * Household access always comes from here — never from client-supplied IDs.
 */
export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, username: true, email: true, role: true, householdId: true },
  });
  if (!user || user.householdId !== session.householdId) return null;
  return user;
});

export type HouseholdContext = Awaited<ReturnType<typeof loadHousehold>>;

async function loadHousehold(householdId: string) {
  const h = await prisma.household.findUniqueOrThrow({ where: { id: householdId } });
  return {
    id: h.id,
    name: h.name,
    currency: h.currency,
    currencySymbol: h.currencySymbol,
    startingBalanceCents: toCents(h.startingBalance),
    dateFormat: h.dateFormat,
    timezone: h.timezone,
    onboarded: h.onboardedAt !== null,
  };
}

export const getHousehold = cache(loadHousehold);

/** For pages: redirects to /login or /onboarding when needed. */
export async function requireHousehold() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const household = await getHousehold(user.householdId);
  if (!household.onboarded) redirect("/onboarding");
  return { user, household };
}

/** For pages that run before onboarding is finished. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const household = await getHousehold(user.householdId);
  return { user, household };
}
