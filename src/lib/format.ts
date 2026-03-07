import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import type { Currency } from "@/types";
import { currencySymbols } from "@/types";

export function formatCurrency(amount: number, currency: Currency = "ARS"): string {
  const symbol = currencySymbols[currency];
  const formatted = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  return `${amount < 0 ? "-" : ""}${symbol}${formatted}`;
}

export function formatCompactCurrency(amount: number, currency: Currency = "ARS"): string {
  const symbol = currencySymbols[currency];
  if (Math.abs(amount) >= 1_000_000) {
    return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${symbol}${(amount / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(amount, currency);
}

export function formatDate(date: Date): string {
  if (isToday(date)) return "Hoy";
  if (isYesterday(date)) return "Ayer";
  return format(date, "d MMM yyyy", { locale: es });
}

export function formatRelativeDate(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatMonth(month: number, year: number): string {
  return format(new Date(year, month - 1), "MMMM yyyy", { locale: es });
}
