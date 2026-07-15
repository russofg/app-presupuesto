"use client";

import { motion } from "motion/react";
import { TrendingUp, Calendar, Target, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Currency } from "@/types";
import { cn } from "@/lib/utils";

interface ProjectionsCardProps {
  income: number;
  expenses: number;
  prevIncome: number;
  prevExpenses: number;
  savingsRemaining: number;
  dayOfMonth: number;
  daysInMonth: number;
  currency: Currency;
  // Proyectar solo tiene sentido para el mes en curso. Para un mes ya cerrado
  // mostramos los valores reales, no una extrapolación (que inflaría el gasto).
  isCurrentMonth: boolean;
}

export function ProjectionsCard({
  income,
  expenses,
  prevIncome,
  prevExpenses,
  savingsRemaining,
  dayOfMonth,
  daysInMonth,
  currency,
  isCurrentMonth,
}: ProjectionsCardProps) {
  const progress = dayOfMonth / daysInMonth;
  const displayProgress = isCurrentMonth ? progress : 1;

  // Income: use previous month as reference (salary is stable),
  // unless current month already exceeds it. Past months use their real income.
  const expectedIncome = isCurrentMonth
    ? (prevIncome > 0 ? Math.max(prevIncome, income) : income)
    : income;

  // Expenses: linear projection for the current month; real total for past months.
  const projectedExpenses = isCurrentMonth
    ? (progress > 0.05 ? expenses / progress : (prevExpenses > 0 ? prevExpenses : expenses))
    : expenses;

  const projectedSavings = expectedIncome - projectedExpenses;
  const monthsToGoal = projectedSavings > 0 && savingsRemaining > 0
    ? Math.ceil(savingsRemaining / projectedSavings)
    : null;

  const projections = [
    {
      label: isCurrentMonth ? "Ingreso esperado" : "Ingreso del mes",
      value: expectedIncome,
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      detail: isCurrentMonth && prevIncome > 0 ? "basado en mes anterior" : null,
    },
    {
      label: isCurrentMonth ? "Gasto proyectado" : "Gasto del mes",
      value: projectedExpenses,
      icon: Calendar,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
      detail: isCurrentMonth
        ? (progress > 0.05 ? "al ritmo actual" : (prevExpenses > 0 ? "basado en mes anterior" : null))
        : null,
    },
    {
      label: isCurrentMonth ? "Saldo estimado" : "Saldo del mes",
      value: projectedSavings,
      icon: Target,
      color: projectedSavings >= 0 ? "text-violet-500" : "text-rose-500",
      bgColor: projectedSavings >= 0 ? "bg-violet-500/10" : "bg-rose-500/10",
      detail: null,
    },
  ];

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          {isCurrentMonth ? "Proyecciones del mes" : "Resumen del mes"}
        </h3>
        <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
          {isCurrentMonth ? `Día ${dayOfMonth} de ${daysInMonth}` : "Mes completo"}
        </span>
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-linear-to-r from-primary/70 to-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${displayProgress * 100}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>

      <div className="space-y-3">
        {projections.map((p) => (
          <div key={p.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", p.bgColor)}>
                <p.icon className={cn("w-3.5 h-3.5", p.color)} />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{p.label}</span>
                {p.detail && (
                  <p className="text-[9px] text-muted-foreground/60">{p.detail}</p>
                )}
              </div>
            </div>
            <span className={cn("text-sm font-semibold tabular-nums", p.color)}>
              {formatCurrency(p.value, currency)}
            </span>
          </div>
        ))}
      </div>

      {isCurrentMonth && monthsToGoal !== null && monthsToGoal > 0 && monthsToGoal < 120 && (
        <div className="pt-3 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">💡 Insight:</span>{" "}
            Al ritmo actual, alcanzarías tus metas de ahorro restantes en{" "}
            <span className="font-semibold text-foreground">
              {monthsToGoal === 1 ? "1 mes" : `${monthsToGoal} meses`}
            </span>.
          </p>
        </div>
      )}

      {projectedSavings < 0 && (
        <div className="pt-3 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="text-rose-500 font-medium">⚠️ Atención:</span>{" "}
            {isCurrentMonth ? "Al ritmo actual, este mes terminarías con un déficit de" : "Este mes cerró con un déficit de"}{" "}
            <span className="font-semibold text-rose-500">
              {formatCurrency(Math.abs(projectedSavings), currency)}
            </span>.
          </p>
        </div>
      )}
    </div>
  );
}
