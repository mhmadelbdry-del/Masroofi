import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Pure helpers for the notification bridge. No I/O, so they can be unit-tested directly. */

export const TOKEN_PREFIX = "mb1_";
export const MAX_BODY_BYTES = 512;
export const MAX_AMOUNT = 1_000_000;
export const LIMIT_PER_HOUR = 30;
export const LIMIT_PER_DAY = 200;
const MAX_AGE_MS = 24 * 3600_000;
const MAX_FUTURE_MS = 5 * 60_000;

export function newToken(): string {
  return TOKEN_PREFIX + randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenFromHeader(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer (mb1_[A-Za-z0-9_-]{43})$/.exec(header.trim());
  return m ? m[1] : null;
}

export function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

/**
 * The macro sends the amount text exactly as extracted on the phone, so it may use Arabic-Indic digits and
 * Arabic separators. Only digits, one decimal separator and valid thousands grouping are accepted; anything else
 * (letters, spaces, "1.234", "12,34") returns NaN instead of being guessed.
 */
export function parseAmountText(text: string): number {
  if (text.length > 20) return NaN;
  let t = "";
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c >= 0x660 && c <= 0x669) t += String(c - 0x660);
    else if (c >= 0x6f0 && c <= 0x6f9) t += String(c - 0x6f0);
    else if (ch === "\u066b") t += ".";
    else if (ch === "\u066c") t += ",";
    else t += ch;
  }
  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/.test(t)) return NaN;
  return Number(t.replace(/,/g, ""));
}

export type BridgeInput = { amount: number; occurredAt: Date };
export type ParseResult = { ok: true; value: BridgeInput } | { ok: false; reason: string };

/**
 * Accepts exactly { amount, occurredAt }. Extra fields are rejected so raw notification text,
 * balances or card digits can never be stored by accident. occurredAt is epoch milliseconds (13 digits).
 */
export function parseBridgeBody(raw: string, now: Date = new Date()): ParseResult {
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return { ok: false, reason: "too_large" };
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return { ok: false, reason: "bad_json" }; }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { ok: false, reason: "bad_shape" };
  const keys = Object.keys(body);
  if (keys.some((k) => k !== "amount" && k !== "occurredAt")) return { ok: false, reason: "unknown_field" };
  const b = body as Record<string, unknown>;
  let amount = b.amount;
  if (typeof amount === "string") amount = parseAmountText(amount);
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) return { ok: false, reason: "bad_amount" };
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) return { ok: false, reason: "bad_amount" };
  // occurredAt is REQUIRED: it is MacroDroid's {not_timestamp} (ms the notification was posted) and doubles as the
  // per-notification event key, so a repeated delivery of one notification dedupes but two purchases never collide.
  const v = b.occurredAt;
  const ms = typeof v === "number" ? v : typeof v === "string" && /^\d{13}$/.test(v) ? Number(v) : NaN;
  if (!Number.isInteger(ms)) return { ok: false, reason: "bad_time" };
  const occurredAt = new Date(ms);
  if (occurredAt.getTime() > now.getTime() + MAX_FUTURE_MS || occurredAt.getTime() < now.getTime() - MAX_AGE_MS) return { ok: false, reason: "bad_time" };
  return { ok: true, value: { amount, occurredAt } };
}

/** Dedupe key: device + cents + exact notification post time (ms). Same notification delivered twice = one expense. */
export function dedupeKey(deviceId: string, amount: number, occurredAt: Date): string {
  return createHash("sha256").update(`bridge:${deviceId}:${Math.round(amount * 100)}:${occurredAt.getTime()}`).digest("hex");
}

export const FAIL_LIMIT = 20;
export const FAIL_WINDOW_MS = 10 * 60_000;
/**
 * Caller address for the failed-token throttle. Only headers that Vercel sets itself (and overwrites if a client
 * sends them) are trusted, and only when running on Vercel. Anywhere else every caller shares one bucket, so a
 * spoofed x-forwarded-for can never create fresh buckets to dodge the throttle.
 */
export function callerAddress(headers: { get(name: string): string | null }, onVercel: boolean): string {
  if (!onVercel) return "unknown";
  const v = headers.get("x-vercel-forwarded-for") ?? headers.get("x-real-ip");
  return (v ?? "").split(",")[0].trim().slice(0, 64) || "unknown";
}

/** Failed-auth throttling keys on a hash of the caller address; the address itself is never stored or logged. */
export function ipKey(address: string | null | undefined): string {
  return createHash("sha256").update("bridge-ip:" + (address ?? "unknown").slice(0, 64)).digest("hex");
}

export function cairoYearMonth(d: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", year: "numeric", month: "numeric" }).formatToParts(d);
  return { year: Number(parts.find((p) => p.type === "year")?.value), month: Number(parts.find((p) => p.type === "month")?.value) };
}
