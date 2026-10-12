import { SignJWT, jwtVerify } from "jose";

/**
 * Session token signing/verification. Kept free of Prisma and next/headers so
 * it can run inside proxy.ts as well as server components and actions.
 */

export const SESSION_COOKIE = "homeledger_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export interface SessionPayload {
  userId: string;
  householdId: string;
}

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be set to a random string of at least 32 characters.");
    }
    return new TextEncoder().encode("homeledger-insecure-development-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ hid: payload.householdId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.hid !== "string") return null;
    return { userId: payload.sub, householdId: payload.hid };
  } catch {
    return null;
  }
}
