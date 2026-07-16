/**
 * GET /api/agent/summary?month=&year=
 *
 * The "as if it were me" dashboard for the assistant. Computes the same numbers
 * the app shows — income/expenses/savings, top categories, budget status, goals,
 * level, health score and insights — by REUSING the app's own pure analytics
 * (gamification + insights), so Maria never drifts from what's on screen.
 *
 * Defaults to the current Argentina month when month/year are omitted.
 */

import { NextResponse } from "next/server";
import { requireAgentAuth, AgentAuthError } from "@/lib/agent/auth";
import { getDocument, listCollection } from "@/lib/agent/firestore-rest";
import { monthRange, resolveMonthYear } from "@/lib/agent/time";
import { getLevel, calculateHealthScore, getScoreLabel } from "@/lib/gamification";
import { generateInsights } from "@/lib/insights";
import type { Transaction, Category, SavingsGoal, Currency } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RawTx {
  type: "income" | "expense";
  amount: number;
  categoryId: string;
}

function sumByType(txs: RawTx[], type: "income" | "expense"): number {
  return txs.filter((t) => t.type === type).reduce((s, t) => s + (t.amount ?? 0), 0);
}

export async function GET(request: Request) {
  let ownerUid: string;
  try {
    ownerUid = requireAgentAuth(request);
  } catch (err) {
    if (err instanceof AgentAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[agent] summary auth/config error:", err);
    return NextResponse.json({ error: "Configuración de agente incompleta" }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const { month, year } = resolveMonthYear(searchParams);
    const { start, end } = monthRange(year, month);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevRange = monthRange(prevYear, prevMonth);

    const userFilter = { field: "userId", op: "EQUAL" as const, value: ownerUid };

    const [txDocs, prevTxDocs, categoryDocs, budgetDocs, goalDocs, settings] = await Promise.all([
      listCollection("transactions", {
        filters: [
          userFilter,
          { field: "date", op: "GREATER_THAN_OR_EQUAL", value: start },
          { field: "date", op: "LESS_THAN", value: end },
        ],
        orderBy: { field: "date", direction: "DESCENDING" },
      }),
      listCollection("transactions", {
        filters: [
          userFilter,
          { field: "date", op: "GREATER_THAN_OR_EQUAL", value: prevRange.start },
          { field: "date", op: "LESS_THAN", value: prevRange.end },
        ],
        orderBy: { field: "date", direction: "DESCENDING" },
      }),
      listCollection("categories", {
        filters: [userFilter],
        orderBy: { field: "order", direction: "ASCENDING" },
      }),
      listCollection("budgets", {
        filters: [
          userFilter,
          { field: "month", op: "EQUAL", value: month },
          { field: "year", op: "EQUAL", value: year },
        ],
        orderBy: null,
      }),
      listCollection("savingsGoals", {
        filters: [userFilter],
        orderBy: { field: "createdAt", direction: "DESCENDING" },
      }),
      getDocument("settings", ownerUid),
    ]);

    const txs = txDocs as unknown as RawTx[];
    const prevTxs = prevTxDocs as unknown as RawTx[];
    const categories = categoryDocs as unknown as Category[];
    const goals = goalDocs as unknown as SavingsGoal[];

    const currency: Currency = (settings?.currency as Currency) ?? "ARS";
    const totalXP = Number(settings?.totalXP ?? 0);
    const streakDays = Number(settings?.streakCount ?? 0);
    const displayName = (settings?.displayName as string) ?? "";

    const income = sumByType(txs, "income");
    const expenses = sumByType(txs, "expense");
    const net = income - expenses;
    const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

    // Spent per category (current month expenses) — the app derives this, it isn't stored.
    const spentByCat = new Map<string, number>();
    for (const t of txs) {
      if (t.type === "expense") {
        spentByCat.set(t.categoryId, (spentByCat.get(t.categoryId) ?? 0) + (t.amount ?? 0));
      }
    }
    const catName = new Map(categories.map((c) => [c.id, c.name]));

    const topCategories = [...spentByCat.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([categoryId, amount]) => ({
        categoryId,
        name: catName.get(categoryId) ?? "Sin categoría",
        amount,
        percentage: expenses > 0 ? Math.round((amount / expenses) * 100) : 0,
      }));

    const budgets = budgetDocs.map((b) => {
      const amount = Number(b.amount ?? 0);
      const spent = spentByCat.get(b.categoryId as string) ?? 0;
      return {
        id: b.id,
        categoryId: b.categoryId as string,
        name: catName.get(b.categoryId as string) ?? "Sin categoría",
        amount,
        spent,
        percentage: amount > 0 ? Math.round((spent / amount) * 100) : 0,
      };
    });

    const goalsProgress = goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      percentage: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0,
    }));

    const level = getLevel(totalXP);
    const health = calculateHealthScore({
      income,
      expenses,
      budgets: budgets.map((b) => ({ amount: b.amount, spent: b.spent })),
      goals,
    });

    const insights = generateInsights({
      transactions: txs as unknown as Transaction[],
      prevTransactions: prevTxs as unknown as Transaction[],
      categories,
      currency,
      budgets: budgets.map((b) => ({ categoryId: b.categoryId, amount: b.amount, spent: b.spent })),
      goals: goals.map((g) => ({ targetAmount: g.targetAmount, currentAmount: g.currentAmount })),
      streakDays,
    });

    return NextResponse.json({
      period: { month, year },
      currency,
      user: { displayName },
      totals: {
        income,
        expenses,
        net,
        savingsRate,
        transactionCount: txs.length,
      },
      topCategories,
      budgets,
      goals: goalsProgress,
      gamification: {
        totalXP,
        level: { name: level.name, index: level.index, progress: Math.round(level.progress), xpToNext: level.xpToNext },
        streakDays,
      },
      health: { score: health.score, label: getScoreLabel(health.score), breakdown: health.breakdown },
      insights,
    });
  } catch (err) {
    console.error("[agent] summary error:", err);
    return NextResponse.json({ error: "No se pudo generar el resumen" }, { status: 502 });
  }
}
