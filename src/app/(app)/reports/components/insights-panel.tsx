"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { fadeInUp } from "@/lib/motion";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Flame,
  type LucideIcon,
} from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Transaction, Category, Budget, Currency } from "@/types";

interface InsightsPanelProps {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  currency: Currency;
  month: number;
  year: number;
}

interface Insight {
  icon: LucideIcon;
  title: string;
  description: string;
  type: "positive" | "negative" | "warning" | "info";
}

export function InsightsPanel({ transactions, categories, budgets, currency, month, year }: InsightsPanelProps) {
  const insights = useMemo(() => {
    const result: Insight[] = [];

    const currentMonthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === prevMonth && d.getFullYear() === prevYear;
    });

    const currentIncome = currentMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const currentExpenses = currentMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const prevIncome = prevMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);

    if (currentIncome > currentExpenses) {
      const savingsRate = currentIncome > 0 ? ((currentIncome - currentExpenses) / currentIncome) * 100 : 0;
      result.push({
        icon: CheckCircle2,
        title: "Balance positivo",
        description: `Ahorraste el ${formatPercentage(savingsRate)} de tus ingresos este mes. ¡Excelente!`,
        type: "positive",
      });
    } else if (currentExpenses > currentIncome && currentIncome > 0) {
      result.push({
        icon: AlertTriangle,
        title: "Gastaste más de lo que ganaste",
        description: `Tus gastos superaron tus ingresos por ${formatCurrency(currentExpenses - currentIncome, currency)}.`,
        type: "negative",
      });
    }

    if (prevExpenses > 0 && currentExpenses > 0) {
      const change = ((currentExpenses - prevExpenses) / prevExpenses) * 100;
      if (change > 15) {
        result.push({
          icon: TrendingUp,
          title: "Gastos en aumento",
          description: `Gastaste un ${formatPercentage(Math.abs(change))} más que el mes pasado.`,
          type: "warning",
        });
      } else if (change < -10) {
        result.push({
          icon: TrendingDown,
          title: "Reduciste gastos",
          description: `Gastaste un ${formatPercentage(Math.abs(change))} menos que el mes pasado. ¡Bien!`,
          type: "positive",
        });
      }
    }

    const expensesByCategory: Record<string, number> = {};
    currentMonthTx
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        expensesByCategory[t.categoryId] = (expensesByCategory[t.categoryId] || 0) + t.amount;
      });

    const topCatEntry = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1])[0];
    if (topCatEntry && currentExpenses > 0) {
      const cat = categories.find((c) => c.id === topCatEntry[0]);
      const pct = (topCatEntry[1] / currentExpenses) * 100;
      if (pct > 40) {
        result.push({
          icon: Flame,
          title: `${cat?.name || "Una categoría"} domina tus gastos`,
          description: `Representa el ${formatPercentage(pct)} de tus gastos del mes (${formatCurrency(topCatEntry[1], currency)}).`,
          type: "info",
        });
      }
    }

    const overBudget = budgets.filter((b) => {
      const spent = currentMonthTx
        .filter((t) => t.type === "expense" && t.categoryId === b.categoryId)
        .reduce((s, t) => s + t.amount, 0);
      return spent > b.amount;
    });

    if (overBudget.length > 0) {
      const names = overBudget
        .map((b) => categories.find((c) => c.id === b.categoryId)?.name || "?")
        .join(", ");
      result.push({
        icon: AlertTriangle,
        title: `${overBudget.length} presupuesto${overBudget.length > 1 ? "s" : ""} excedido${overBudget.length > 1 ? "s" : ""}`,
        description: `Superaste el límite en: ${names}.`,
        type: "negative",
      });
    }

    if (currentMonthTx.length === 0) {
      result.push({
        icon: Lightbulb,
        title: "Sin movimientos este mes",
        description: "Agregá tus ingresos y gastos para obtener insights personalizados.",
        type: "info",
      });
    }

    return result;
  }, [transactions, categories, budgets, currency, month, year]);

  if (insights.length === 0) return null;

  const typeStyles: Record<Insight["type"], string> = {
    positive: "bg-success/10 text-success border-success/20",
    negative: "bg-destructive/10 text-destructive border-destructive/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    info: "bg-primary/10 text-primary border-primary/20",
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Insights del mes</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Análisis automático de tus finanzas</p>
      </div>

      <div className="space-y-2.5">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            variants={fadeInUp}
            initial="hidden"
            animate="show"
            transition={{ delay: i * 0.05 }}
            className={cn(
              "flex items-start gap-3 p-3 rounded-xl border",
              typeStyles[insight.type]
            )}
          >
            <insight.icon className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold">{insight.title}</p>
              <p className="text-[11px] opacity-80 mt-0.5">{insight.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
