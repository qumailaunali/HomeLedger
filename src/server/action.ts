import "server-only";
import { updateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "./auth";
import { ledgerTag, settingsTag } from "./cache";
import { firstIssue } from "@/lib/validation";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** An error whose message is safe and friendly enough to show the user. */
export class UserError extends Error {}

export interface ActionContext {
  userId: string;
  householdId: string;
}

/**
 * Wraps every server action: requires a signed-in user, scopes work to their
 * household, and converts failures into friendly messages. Database errors
 * and stack traces are logged on the server, never sent to the browser.
 */
export async function authedAction<T>(
  fallbackMessage: string,
  fn: (ctx: ActionContext) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Your session has ended. Please sign in again." };
    const data = await fn({ userId: user.id, householdId: user.householdId });
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof UserError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of err.issues) {
        const key = issue.path.join(".");
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { ok: false, error: firstIssue(err), fieldErrors };
    }
    console.error(`[action] ${fallbackMessage}`, err);
    return { ok: false, error: fallbackMessage };
  }
}

/**
 * Refreshes cached data after a change to the ledger (income/expense writes).
 * Uses targeted cache tags instead of revalidating the whole app subtree.
 */
export function revalidateLedger(householdId: string) {
  updateTag(ledgerTag(householdId));
}

/** Refreshes cached data after a settings change (categories, members, budgets). */
export function revalidateSettings(householdId: string) {
  updateTag(settingsTag(householdId));
  // Settings changes can affect budget displays derived from the ledger too.
  updateTag(ledgerTag(householdId));
}
