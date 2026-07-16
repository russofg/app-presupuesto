/**
 * Month-boundary helpers in Argentina time (UTC-3, no DST), so the ranges the
 * agent queries line up exactly with what the app shows for the owner.
 */

const AR_TIMEZONE = "America/Argentina/Buenos_Aires";
const AR_OFFSET = "-03:00";

const pad = (n: number) => String(n).padStart(2, "0");

/** Returns the [start, end) instant range for a given month, at Argentina local midnight. */
export function monthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(`${year}-${pad(month)}-01T00:00:00${AR_OFFSET}`);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = new Date(`${nextYear}-${pad(nextMonth)}-01T00:00:00${AR_OFFSET}`);
  return { start, end };
}

/** Current month/year as seen in Argentina time. */
export function currentMonthYear(): { month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: AR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  return { month, year };
}

/** Resolves month/year from query params, falling back to the current Argentina month. */
export function resolveMonthYear(searchParams: URLSearchParams): { month: number; year: number } {
  const now = currentMonthYear();
  const monthParamRaw = searchParams.get("month");
  const yearParamRaw = searchParams.get("year");

  const month = monthParamRaw ? Number(monthParamRaw) : now.month;
  const year = yearParamRaw ? Number(yearParamRaw) : now.year;

  const validMonth = Number.isInteger(month) && month >= 1 && month <= 12 ? month : now.month;
  const validYear = Number.isInteger(year) && year >= 2020 && year <= 2100 ? year : now.year;
  return { month: validMonth, year: validYear };
}

/** Today's calendar date (YYYY-MM-DD) as seen in Argentina time. */
export function argentinaToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: AR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

/**
 * Resolves a transaction date to UTC midnight of a calendar day — the exact
 * "date-only" convention the app stores (e.g. 2026-03-12T00:00:00Z). Accepts an
 * ISO/`YYYY-MM-DD` string; falls back to today in Argentina when absent/invalid.
 */
export function dateOnlyUtc(input?: string | null): Date {
  const dateStr = input && /^\d{4}-\d{2}-\d{2}/.test(input) ? input.slice(0, 10) : argentinaToday();
  return new Date(`${dateStr}T00:00:00Z`);
}
