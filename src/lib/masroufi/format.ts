const MONEY = new Intl.NumberFormat("ar-EG", {
  numberingSystem: "latn",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const MONEY_FIXED = new Intl.NumberFormat("ar-EG", {
  numberingSystem: "latn",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CAIRO = "Africa/Cairo";

export function formatMoney(value: number, opts?: { fixed?: boolean }): string {
  if (!Number.isFinite(value)) return "0";
  return (opts?.fixed ? MONEY_FIXED : MONEY).format(value);
}

export function cairoParts(date = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAIRO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return { year: pick("year"), month: pick("month"), day: pick("day") };
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

export function cairoLocalToDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const date = new Date(guess);
  return new Date(guess - tzOffsetMs(date, CAIRO));
}

export function formatMonthTitle(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("ar-EG", {
    month: "long",
    year: "numeric",
    numberingSystem: "latn",
    timeZone: "UTC",
  }).format(d);
}

export function formatExpenseWhen(iso: string): { date: string; time: string } {
  const d = new Date(iso);
    const date = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      timeZone: CAIRO,
    }).format(d);
  const time = new Intl.DateTimeFormat("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    numberingSystem: "latn",
    timeZone: CAIRO,
  }).format(d);
  return { date, time };
}

export function daysLeftInMonth(year: number, month: number): number {
  const { year: cy, month: cm, day } = cairoParts();
  const last = new Date(year, month, 0).getDate();
  if (year === cy && month === cm) return Math.max(0, last - day);
  if (year > cy || (year === cy && month > cm)) return last;
  return 0;
}

export function monthBoundsIso(year: number, month: number): { start: string; end: string } {
  const start = cairoLocalToDate(year, month, 1, 0, 0);
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = cairoLocalToDate(endYear, endMonth, 1, 0, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function usageTone(spent: number, limit: number): "ok" | "warn" | "over" {
  if (limit <= 0) return spent > 0 ? "over" : "ok";
  const ratio = spent / limit;
  if (ratio >= 1) return "over";
  if (ratio >= 0.85) return "warn";
  return "ok";
}

export function usagePct(spent: number, limit: number): number {
  if (limit <= 0) return spent > 0 ? 100 : 0;
  return Math.min(100, Math.round((spent / limit) * 100));
}
