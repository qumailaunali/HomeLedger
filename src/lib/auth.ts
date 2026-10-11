import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "homeledger-default-secure-secret-key-32chars"
);

const SESSION_COOKIE_NAME = "homeledger_session";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  householdId: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Returns current user's household or a fallback default household for seamless experience.
 */
export async function getOrCreateDefaultHousehold() {
  const user = await getSessionUser();
  if (user) {
    const household = await prisma.household.findUnique({
      where: { id: user.householdId },
      include: {
        homeCategories: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
        shoppingMembers: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    if (household) return household;
  }

  // Fallback: check first household in DB or create default
  let household = await prisma.household.findFirst({
    include: {
      homeCategories: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      shoppingMembers: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!household) {
    household = await prisma.household.create({
      data: {
        name: "My Household",
        currency: "PKR",
        currencySymbol: "Rs.",
        startingBalance: 60950,
      },
      include: {
        homeCategories: true,
        shoppingMembers: true,
      },
    });
  }

  return household;
}
