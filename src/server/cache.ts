import "server-only";

/**
 * Cache tags for unstable_cache entries. Tags are scoped per household so one
 * household's writes never invalidate another's cached data.
 *
 * - `ledger-{householdId}`: anything derived from Income/Expense rows
 *   (balances, pots, dashboard aggregates, ledger pages, budgets' spent side).
 * - `settings-{householdId}`: household settings (categories, members, budgets,
 *   general settings) — things that change rarely.
 */
export const ledgerTag = (householdId: string) => `ledger-${householdId}`;
export const settingsTag = (householdId: string) => `settings-${householdId}`;
