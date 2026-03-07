"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { fadeInUp } from "@/lib/motion";
import { AnimatedNumber } from "@/components/animated-number";
import { formatCurrency } from "@/lib/format";
import { TrendingUp, TrendingDown, ArrowUpDown, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Transaction, Currency } from "@/types";

interface SummaryCardsProps {
  transactions: Transaction[];
  allTransactions: Transaction[];
  currency: Currency;
  month: number;
  year: number;
}

export function SummaryCards({ transactions, allTransactions, currency, month, year }: SummaryCardsProps) {
  const stats = useMemo(() => {
    const currentMonthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthTx = allTransactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === prevMonth && d.getFullYear() === prevYear;
    });

    const income = currentMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = currentMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const prevIncome = prevMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    const net = income - expenses;
    const txCount = currentMonthTx.length;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    const expenseChange = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;

    return { income, expenses, net, txCount, savingsRate, expenseChange };
  }, [transactions, allTransactions, currency, month, year]);

  const cards = [
    {
      label: "Ingresos",
      value: stats.income,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Gastos",
      value: stats.expenses,
      icon: TrendingDown,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "Neto",
      value: stats.net,
      icon: ArrowUpDown,
      color: stats.net >= 0 ? "text-success" : "text-destructive",
      bgColor: stats.net >= 0 ? "bg-success/10" : "bg-destructive/10",
    },
    {
      label: "Tasa de ahorro",
      value: stats.savingsRate,
      icon: Percent,
      color: stats.savingsRate >= 20 ? "text-success" : stats.savingsRate >= 0 ? "text-warning" : "text-destructive",
      bgColor: stats.savingsRate >= 20 ? "bg-success/10" : stats.savingsRate >= 0 ? "bg-warning/10" : "bg-destructive/10",
      isPercentage: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          variants={fadeInUp}
          initial="hidden"
          animate="show"
          transition={{ delay: i * 0.05 }}
          className="rounded-2xl border border-border/50 bg-card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", card.bgColor)}>
              <card.icon className={cn("w-3.5 h-3.5", card.color)} />
            </div>
          </div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {card.label}
          </p>
          <p className={cn("text-lg font-bold tabular-nums mt-0.5", card.color)}>
            {card.isPercentage ? (
              <><AnimatedNumber value={Math.round(card.value)} />%</>
            ) : (
              <AnimatedNumber value={card.value} formatter={(v) => formatCurrency(v, currency)} />
            )}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
