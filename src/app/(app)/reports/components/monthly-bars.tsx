"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency, formatCompactCurrency } from "@/lib/format";
import type { Transaction, Currency } from "@/types";

interface MonthlyBarsProps {
  transactions: Transaction[];
  currency: Currency;
}

const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function MonthlyBars({ transactions, currency }: MonthlyBarsProps) {
  const data = useMemo(() => {
    const grouped: Record<string, { income: number; expense: number }> = {};

    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!grouped[key]) grouped[key] = { income: 0, expense: 0 };
      if (t.type === "income") grouped[key].income += t.amount;
      else grouped[key].expense += t.amount;
    });

    return Object.entries(grouped)
      .map(([key, values]) => {
        const [y, m] = key.split("-");
        return {
          month: `${monthNames[parseInt(m) - 1]} ${y.slice(2)}`,
          sortKey: key,
          ...values,
          net: values.income - values.expense,
        };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(-12);
  }, [transactions]);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <h3 className="text-sm font-semibold mb-1">Comparativa mensual</h3>
        <p className="text-xs text-muted-foreground">Sin datos para mostrar.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold">Comparativa mensual</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Ingresos vs Gastos por mes</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-success" />
            <span className="text-muted-foreground">Ingresos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-destructive" />
            <span className="text-muted-foreground">Gastos</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatCompactCurrency(v, currency)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              fontSize: "12px",
            }}
            formatter={(value?: number) => value != null ? [formatCurrency(value, currency)] : []}
          />
          <Bar dataKey="income" fill="var(--success)" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="expense" fill="var(--destructive)" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
