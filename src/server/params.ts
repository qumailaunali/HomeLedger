import "server-only";
import { parseIsoDate, type IsoDate } from "@/lib/dates";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function str(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

/** month/year from the URL, defaulting to "today" in the household timezone. */
export function monthFromParams(sp: Record<string, string | string[] | undefined>, today: IsoDate) {
  const [ty, tm] = today.split("-").map(Number);
  const year = Number(str(sp, "year"));
  const month = Number(str(sp, "month"));
  return {
    year: Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : ty,
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : tm,
  };
}

export function isoParam(sp: Record<string, string | string[] | undefined>, key: string): IsoDate | undefined {
  const v = str(sp, key);
  return v && parseIsoDate(v) ? v : undefined;
}
