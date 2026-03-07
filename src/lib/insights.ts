import type { Transaction, Category, Currency } from "@/types";
import { formatCurrency } from "@/lib/format";

export interface Insight {
  id: string;
  type: "positive" | "negative" | "neutral" | "tip";
  icon: string;
  title: string;
  description: string;
  priority: number;
}

interface InsightInput {
  transactions: Transaction[];
  prevTransactions: Transaction[];
  categories: Category[];
  currency: Currency;
  budgets: { categoryId: string; amount: number; spent: number }[];
  goals: { targetAmount: number; currentAmount: number }[];
  streakDays: number;
}

export function generateInsights(data: InsightInput): Insight[] {
  const insights: Insight[] = [];
  const { transactions, prevTransactions, categories, currency, budgets, goals, streakDays } = data;

  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const prevIncome = prevTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const prevExpenses = prevTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  // --- Category spending comparison vs previous month ---
  const currByCat: Record<string, number> = {};
  const prevByCat: Record<string, number> = {};
  transactions.filter((t) => t.type === "expense").forEach((t) => {
    currByCat[t.categoryId] = (currByCat[t.categoryId] || 0) + t.amount;
  });
  prevTransactions.filter((t) => t.type === "expense").forEach((t) => {
    prevByCat[t.categoryId] = (prevByCat[t.categoryId] || 0) + t.amount;
  });

  for (const [catId, curr] of Object.entries(currByCat)) {
    const prev = prevByCat[catId];
    if (!prev || prev === 0) continue;
    const pct = ((curr - prev) / prev) * 100;
    const catName = catMap.get(catId) ?? "categoría";

    if (pct > 25) {
      insights.push({
        id: `cat-up-${catId}`,
        type: "negative",
        icon: "📈",
        title: `${catName} subió un ${Math.round(pct)}%`,
        description: `Gastaste ${formatCurrency(curr, currency)} vs ${formatCurrency(prev, currency)} el mes pasado.`,
        priority: Math.min(pct, 100),
      });
    } else if (pct < -20) {
      insights.push({
        id: `cat-down-${catId}`,
        type: "positive",
        icon: "📉",
        title: `${catName} bajó un ${Math.round(Math.abs(pct))}%`,
        description: `Bien ahí. Gastaste ${formatCurrency(curr, currency)} vs ${formatCurrency(prev, currency)} el mes pasado.`,
        priority: Math.min(Math.abs(pct), 80),
      });
    }
  }

  // --- Overall spending trend ---
  if (prevExpenses > 0 && expenses > 0) {
    const expPct = ((expenses - prevExpenses) / prevExpenses) * 100;
    if (expPct > 15) {
      insights.push({
        id: "total-expenses-up",
        type: "negative",
        icon: "⚠️",
        title: `Tus gastos subieron un ${Math.round(expPct)}%`,
        description: `Este mes llevás ${formatCurrency(expenses, currency)} en gastos vs ${formatCurrency(prevExpenses, currency)} el mes pasado completo.`,
        priority: 90,
      });
    } else if (expPct < -10) {
      insights.push({
        id: "total-expenses-down",
        type: "positive",
        icon: "🎉",
        title: `¡Tus gastos bajaron un ${Math.round(Math.abs(expPct))}%!`,
        description: `Excelente control del gasto este mes.`,
        priority: 85,
      });
    }
  }

  // --- Savings rate ---
  if (income > 0) {
    const savingsRate = ((income - expenses) / income) * 100;
    if (savingsRate >= 30) {
      insights.push({
        id: "savings-rate-great",
        type: "positive",
        icon: "🏆",
        title: `Tasa de ahorro del ${Math.round(savingsRate)}%`,
        description: "Estás ahorrando más del 30% de tus ingresos. ¡Nivel experto!",
        priority: 75,
      });
    } else if (savingsRate >= 10) {
      insights.push({
        id: "savings-rate-ok",
        type: "neutral",
        icon: "💰",
        title: `Tasa de ahorro del ${Math.round(savingsRate)}%`,
        description: "Vas bien. Intentá llegar al 20% para un ahorro más sólido.",
        priority: 50,
      });
    } else if (savingsRate > 0) {
      insights.push({
        id: "savings-rate-low",
        type: "tip",
        icon: "💡",
        title: `Tasa de ahorro del ${Math.round(savingsRate)}%`,
        description: "Está un poco baja. Fijate si podés recortar algún gasto no esencial.",
        priority: 60,
      });
    }
  }

  // --- Budget alerts ---
  for (const b of budgets) {
    const pct = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
    const catName = catMap.get(b.categoryId) ?? "categoría";
    if (pct >= 100) {
      insights.push({
        id: `budget-over-${b.categoryId}`,
        type: "negative",
        icon: "🚨",
        title: `Presupuesto de ${catName} superado`,
        description: `Gastaste ${formatCurrency(b.spent, currency)} de ${formatCurrency(b.amount, currency)} (${Math.round(pct)}%).`,
        priority: 95,
      });
    } else if (pct >= 80) {
      insights.push({
        id: `budget-warn-${b.categoryId}`,
        type: "tip",
        icon: "⚡",
        title: `${catName} al ${Math.round(pct)}% del presupuesto`,
        description: `Te quedan ${formatCurrency(b.amount - b.spent, currency)} para el resto del mes.`,
        priority: 70,
      });
    }
  }

  // --- Top spending category ---
  const sortedCats = Object.entries(currByCat).sort(([, a], [, b]) => b - a);
  if (sortedCats.length >= 2 && expenses > 0) {
    const [topId, topAmount] = sortedCats[0];
    const topPct = (topAmount / expenses) * 100;
    if (topPct > 40) {
      insights.push({
        id: "top-cat-dominant",
        type: "neutral",
        icon: "🎯",
        title: `${catMap.get(topId) ?? "Una categoría"} concentra el ${Math.round(topPct)}% de tus gastos`,
        description: `Diversificar el gasto puede ayudarte a tener más control.`,
        priority: 55,
      });
    }
  }

  // --- Goals progress ---
  const activeGoals = goals.filter((g) => g.currentAmount < g.targetAmount);
  const completedGoals = goals.filter((g) => g.currentAmount >= g.targetAmount);
  if (completedGoals.length > 0) {
    insights.push({
      id: "goals-completed",
      type: "positive",
      icon: "🎯",
      title: `¡${completedGoals.length} meta${completedGoals.length > 1 ? "s" : ""} cumplida${completedGoals.length > 1 ? "s" : ""}!`,
      description: "Seguí así, el ahorro constante da resultados.",
      priority: 80,
    });
  }
  if (activeGoals.length > 0 && income > expenses) {
    const monthlySurplus = income - expenses;
    const totalRemaining = activeGoals.reduce((s, g) => s + (g.targetAmount - g.currentAmount), 0);
    const months = Math.ceil(totalRemaining / monthlySurplus);
    if (months > 0 && months <= 24) {
      insights.push({
        id: "goals-eta",
        type: "neutral",
        icon: "📅",
        title: `Podrías completar tus metas en ~${months} mes${months > 1 ? "es" : ""}`,
        description: `Ahorrando ${formatCurrency(monthlySurplus, currency)}/mes al ritmo actual.`,
        priority: 45,
      });
    }
  }

  // --- Streak motivation ---
  if (streakDays >= 7) {
    insights.push({
      id: "streak-great",
      type: "positive",
      icon: "🔥",
      title: `¡${streakDays} días de racha!`,
      description: "Tu constancia es clave para el éxito financiero.",
      priority: 40,
    });
  }

  // --- Tip for no income yet ---
  if (income === 0 && expenses > 0) {
    insights.push({
      id: "no-income-yet",
      type: "tip",
      icon: "💡",
      title: "Aún no registraste ingresos este mes",
      description: "Cuando cobres, registrá tus ingresos para tener un panorama completo.",
      priority: 30,
    });
  }

  // --- Potential savings suggestion ---
  if (sortedCats.length >= 3 && expenses > 0) {
    const discretionary = sortedCats
      .filter(([id]) => {
        const name = (catMap.get(id) ?? "").toLowerCase();
        return ["delivery", "salidas", "entretenimiento", "compras", "suscripciones", "ropa", "café"].some((k) => name.includes(k));
      })
      .reduce((s, [, amt]) => s + amt, 0);

    if (discretionary > 0) {
      const tenPct = discretionary * 0.1;
      insights.push({
        id: "discretionary-tip",
        type: "tip",
        icon: "✂️",
        title: `Reducí un 10% en gastos no esenciales`,
        description: `Podrías ahorrar ~${formatCurrency(tenPct, currency)} extra por mes.`,
        priority: 65,
      });
    }
  }

  return insights.sort((a, b) => b.priority - a.priority).slice(0, 6);
}
