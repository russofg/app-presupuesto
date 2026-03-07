import type { Transaction, RecurringTransaction, Category } from "@/types";

export interface DetectedSubscription {
  name: string;
  amount: number;
  frequency: "monthly" | "yearly" | "unknown";
  categoryId: string;
  lastDate: Date;
  occurrences: number;
  source: "recurring" | "detected";
  recurringId?: string;
}

/**
 * Detects subscriptions from two sources:
 * 1. Explicit recurring transactions
 * 2. Pattern detection: expenses with the same description appearing 2+ months
 */
export function detectSubscriptions(
  transactions: Transaction[],
  recurring: RecurringTransaction[],
): DetectedSubscription[] {
  const subs: DetectedSubscription[] = [];
  const seenNames = new Set<string>();

  // Source 1: Explicit recurring rules (marked by the user)
  for (const r of recurring) {
    if (r.type !== "expense" || !r.isActive) continue;
    const key = r.description.toLowerCase().trim();
    seenNames.add(key);
    subs.push({
      name: r.description,
      amount: r.amount,
      frequency: r.frequency === "yearly" ? "yearly" : "monthly",
      categoryId: r.categoryId,
      lastDate: new Date(r.nextDate),
      occurrences: 0,
      source: "recurring",
      recurringId: r.id,
    });
  }

  // Source 2: Auto-detect from transaction history
  const expenses = transactions.filter((t) => t.type === "expense");
  const grouped: Record<string, { amounts: number[]; dates: Date[]; categoryId: string; description: string }> = {};

  for (const t of expenses) {
    const key = t.description.toLowerCase().trim();
    if (seenNames.has(key)) continue;
    if (!grouped[key]) {
      grouped[key] = { amounts: [], dates: [], categoryId: t.categoryId, description: t.description };
    }
    grouped[key].amounts.push(t.amount);
    grouped[key].dates.push(new Date(t.date));
  }

  for (const [key, data] of Object.entries(grouped)) {
    if (data.dates.length < 2) continue;

    // Check if amounts are roughly consistent (within 20%)
    const avgAmount = data.amounts.reduce((s, a) => s + a, 0) / data.amounts.length;
    const consistent = data.amounts.every((a) => Math.abs(a - avgAmount) / avgAmount < 0.2);
    if (!consistent) continue;

    // Check if dates span multiple months
    const months = new Set(data.dates.map((d) => `${d.getFullYear()}-${d.getMonth()}`));
    if (months.size < 2) continue;

    const sortedDates = data.dates.sort((a, b) => b.getTime() - a.getTime());
    const lastDate = sortedDates[0];

    // Estimate frequency
    const avgDaysBetween = sortedDates.length >= 2
      ? (sortedDates[0].getTime() - sortedDates[sortedDates.length - 1].getTime()) /
        (1000 * 60 * 60 * 24 * (sortedDates.length - 1))
      : 30;

    const frequency = avgDaysBetween > 300 ? "yearly" : avgDaysBetween > 15 ? "monthly" : "unknown";
    if (frequency === "unknown") continue;

    seenNames.add(key);
    subs.push({
      name: data.description,
      amount: Math.round(avgAmount * 100) / 100,
      frequency,
      categoryId: data.categoryId,
      lastDate,
      occurrences: data.dates.length,
      source: "detected",
    });
  }

  return subs.sort((a, b) => b.amount - a.amount);
}

export function calculateMonthlyTotal(subs: DetectedSubscription[]): number {
  return subs.reduce((total, s) => {
    if (s.frequency === "yearly") return total + s.amount / 12;
    return total + s.amount;
  }, 0);
}

export function calculateYearlyTotal(subs: DetectedSubscription[]): number {
  return subs.reduce((total, s) => {
    if (s.frequency === "yearly") return total + s.amount;
    return total + s.amount * 12;
  }, 0);
}
