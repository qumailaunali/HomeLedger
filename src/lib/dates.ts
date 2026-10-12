/**
 * Calendar-date helpers.
 *
 * Transaction dates are plain calendar days ("2026-10-01"), stored in a
 * Postgres DATE column. Inside the app they travel as ISO "YYYY-MM-DD"
 * strings; Date objects only exist at the database boundary and are always
 * UTC midnight. That way an expense entered for October 1 can never show up
 * as September 30, whatever the server or browser timezone is.
 */

export type IsoDate = string; // "YYYY-MM-DD"

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const MONTH_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));

export const DATE_FORMATS = ["MMM D, YYYY", "D MMM YYYY", "DD/MM/YYYY", "YYYY-MM-DD"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Date (UTC midnight from Postgres DATE) -> "YYYY-MM-DD". */
export function toIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" -> Date at UTC midnight, or null if not a real calendar day. */
export function parseIsoDate(value: string): Date | null {
  const m = ISO_RE.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

export function isoParts(iso: IsoDate): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

export function makeIsoDate(year: number, month: number, day: number): IsoDate {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Today's calendar date in the given IANA timezone (server) or the browser's local zone. */
export function todayIso(timeZone?: string): IsoDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Adds months to a (year, month) pair, month 1-12. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Half-open range [from, to) covering a month, as Date objects for Prisma. */
export function monthRange(year: number, month: number): { gte: Date; lt: Date } {
  const next = shiftMonth(year, month, 1);
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(next.year, next.month - 1, 1)),
  };
}

export function yearRange(year: number): { gte: Date; lt: Date } {
  return { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };
}

/** Inclusive ISO range -> half-open Date range. */
export function isoRange(from: IsoDate, to: IsoDate): { gte: Date; lt: Date } | null {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (!start || !end || end < start) return null;
  return { gte: start, lt: new Date(end.getTime() + 86_400_000) };
}

/** Number of calendar months touched by an inclusive ISO range. */
export function monthsBetween(from: IsoDate, to: IsoDate): number {
  const a = isoParts(from);
  const b = isoParts(to);
  return (b.year - a.year) * 12 + (b.month - a.month) + 1;
}

export function formatMonthYear(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function formatDate(iso: IsoDate, format: string = "MMM D, YYYY"): string {
  if (!ISO_RE.test(iso)) return "";
  const { year, month, day } = isoParts(iso);
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  switch (format) {
    case "D MMM YYYY":
      return `${day} ${MONTH_SHORT[month - 1]} ${year}`;
    case "DD/MM/YYYY":
      return `${dd}/${mm}/${year}`;
    case "YYYY-MM-DD":
      return iso;
    default:
      return `${MONTH_SHORT[month - 1]} ${day}, ${year}`;
  }
}

/** "Today", "Yesterday", or the formatted date — used to group recent activity. */
export function relativeDayLabel(iso: IsoDate, today: IsoDate, format?: string): string {
  if (iso === today) return "Today";
  const t = parseIsoDate(today);
  if (t && toIsoDate(new Date(t.getTime() - 86_400_000)) === iso) return "Yesterday";
  return formatDate(iso, format);
}

/** Timestamp (createdAt / updatedAt) formatted in the household timezone. */
export function formatTimestamp(value: string | Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

/**
 * Lenient parser for imported spreadsheets. Accepts ISO dates, DD/MM/YYYY
 * (the common format in Pakistan), "5 Oct 2026", "Oct 5, 2026" and Excel
 * serial day numbers. Returns null when the value is not a real date.
 */
export function parseFlexibleDate(value: unknown): IsoDate | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel serial date (days since 1899-12-30)
    if (value < 1 || value > 100_000) return null;
    const ms = Math.round(value) * 86_400_000 + Date.UTC(1899, 11, 30);
    return toIsoDate(new Date(ms));
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return makeIsoDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  const s = String(value).trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (m) return validIso(+m[1], +m[2], +m[3]);

  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(s);
  if (m) return validIso(normalizeYear(+m[3]), +m[2], +m[1]);

  m = /^(\d{1,2})[\s-]+([A-Za-z]{3,})[\s,-]+(\d{2,4})$/.exec(s);
  if (m) return validIso(normalizeYear(+m[3]), monthFromName(m[2]), +m[1]);

  m = /^([A-Za-z]{3,})[\s-]+(\d{1,2})(?:st|nd|rd|th)?[\s,-]+(\d{2,4})$/.exec(s);
  if (m) return validIso(normalizeYear(+m[3]), monthFromName(m[1]), +m[2]);

  return null;
}

function normalizeYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

function monthFromName(name: string): number {
  const idx = MONTH_SHORT.findIndex((m) => m.toLowerCase() === name.slice(0, 3).toLowerCase());
  return idx + 1;
}

function validIso(y: number, m: number, d: number): IsoDate | null {
  if (!m) return null;
  const iso = makeIsoDate(y, m, d);
  return parseIsoDate(iso) ? iso : null;
}
