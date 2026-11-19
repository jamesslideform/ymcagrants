import type { DecimalString, IsoDate } from "./types";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US");

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatMoney(value: DecimalString | null): string {
  if (value === null) {
    return "—";
  }
  const parsed: number = Number(value);
  return Number.isNaN(parsed) ? "—" : moneyFormatter.format(parsed);
}

export function formatNumber(value: number | null): string {
  return value === null ? "—" : numberFormatter.format(value);
}

/**
 * Format a calendar date without letting the local time zone shift it a day —
 * "2026-03-31" must never render as March 30.
 */
export function formatDate(value: IsoDate | null): string {
  if (value === null) {
    return "—";
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return value;
  }
  return dateFormatter.format(new Date(year, month - 1, day));
}
