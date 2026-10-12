/**
 * Money helpers. All arithmetic happens on integer paisa ("cents") so totals
 * are exact. Values only become rupee numbers at the display boundary.
 */

export type Cents = number;

/** Accepts a Prisma Decimal, numeric string, or number and returns integer cents. */
export function toCents(value: { toString(): string } | string | number | null | undefined): Cents {
  if (value === null || value === undefined) return 0;
  const str = typeof value === "number" ? value.toFixed(2) : value.toString();
  const parsed = parseAmountToCents(str);
  return parsed ?? 0;
}

/**
 * Parses user input such as "1,400", "1400.5" or "Rs. 2,000" into cents.
 * Returns null for anything that is not a plain non-negative money value.
 */
export function parseAmountToCents(input: string): Cents | null {
  const cleaned = input.replace(/rs\.?|pkr|,|\s/gi, "");
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) {
    // Also accept long decimals produced by spreadsheets, e.g. "1400.000001"
    const loose = /^(-)?(\d+)\.(\d+)$/.exec(cleaned);
    if (!loose) return null;
    const rounded = Math.round(Number(`${loose[2]}.${loose[3]}`) * 100);
    return loose[1] ? -rounded : rounded;
  }
  const [, sign, whole, frac = ""] = match;
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return null;
  return sign ? -cents : cents;
}

/** Converts cents to the string Prisma expects for a Decimal column. */
export function centsToDecimalString(cents: Cents): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Converts cents to a rupee number for display / charts only. */
export function centsToAmount(cents: Cents): number {
  return cents / 100;
}

export function sumCents(values: Cents[]): Cents {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/** Cents -> editable input text: 140000 -> "1400", 140050 -> "1400.50". */
export function centsToInput(cents: Cents): string {
  return centsToDecimalString(cents).replace(/\.00$/, "");
}

/** Formats cents as "Rs. 170,000" or "Rs. 1,400.50". */
export function formatMoney(cents: Cents, symbol = "Rs.", opts: { signed?: boolean } = {}): string {
  if (!Number.isFinite(cents)) cents = 0;
  cents = Math.round(cents);
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = abs % 100;
  const body = `${symbol} ${whole}${frac ? `.${String(frac).padStart(2, "0")}` : ""}`;
  if (negative) return `-${body}`;
  if (opts.signed && cents > 0) return `+${body}`;
  return body;
}

/** Short form for chart axes (input in cents): Rs. 12k, Rs. 1.5 Lac. */
export function formatMoneyCompact(cents: Cents, symbol = "Rs."): string {
  const amount = cents / 100;
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 10_000_000) return `${sign}${symbol} ${trim(abs / 10_000_000)} Cr`;
  if (abs >= 100_000) return `${sign}${symbol} ${trim(abs / 100_000)} Lac`;
  if (abs >= 1_000) return `${sign}${symbol} ${trim(abs / 1_000)}k`;
  return formatMoney(cents, symbol);
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}

/** Whole-number percentage of used / budget, or 0 when there is no budget. */
export function percentUsed(usedCents: Cents, budgetCents: Cents): number {
  if (budgetCents <= 0) return 0;
  return Math.round((usedCents * 100) / budgetCents);
}
