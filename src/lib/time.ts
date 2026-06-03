import { formatInTimeZone } from "date-fns-tz";
import { APP_TZ, WEEK_START_DAY } from "@/lib/config";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  return { year, month, day };
}

function dateKeyToUtcNoon(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);

  return new Date(Date.UTC(year, month - 1, day, 12));
}

function utcNoonToDateKey(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random()}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function getAppDateKey(date = new Date()) {
  return formatInTimeZone(date, APP_TZ, "yyyy-MM-dd");
}

export function addDays(dateKey: string, days: number) {
  const date = dateKeyToUtcNoon(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return utcNoonToDateKey(date);
}

export function diffDays(startDateKey: string, endDateKey: string) {
  const start = dateKeyToUtcNoon(startDateKey).getTime();
  const end = dateKeyToUtcNoon(endDateKey).getTime();

  return Math.round((end - start) / DAY_MS);
}

export function getWeekStartKey(dateKey: string) {
  const date = dateKeyToUtcNoon(dateKey);
  const day = date.getUTCDay();
  const daysSinceWeekStart = (day - WEEK_START_DAY + 7) % 7;

  return addDays(dateKey, -daysSinceWeekStart);
}

export function getWeekKey(dateKey: string) {
  return getWeekStartKey(dateKey);
}

export function isDateInRange(dateKey: string, startDateKey: string, endDateKey: string) {
  return dateKey >= startDateKey && dateKey <= endDateKey;
}

export function getWeeksRemaining(todayKey: string, endDateKey: string) {
  const todayWeek = getWeekStartKey(todayKey);
  const endWeek = getWeekStartKey(endDateKey);
  const weeks = Math.floor(diffDays(todayWeek, endWeek) / 7) + 1;

  return Math.max(1, weeks);
}

export function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(dateKeyToUtcNoon(dateKey));
}
