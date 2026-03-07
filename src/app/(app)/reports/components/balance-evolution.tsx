"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatCompactCurrency } from "@/lib/format";
import type { Transaction, Currency } from "@/types";

interface BalanceEvolutionProps {
  transactions: Transaction[];
  currency: Currency;
}

const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function BalanceEvolution({ transactions, currency }: BalanceEvolutionProps) {
  const data = useMemo(() => {
    const monthly: Record<string, number> = {};

    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sorted.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthly[key]) monthly[key] = 0;
      monthly[key] += t.type === "income" ? t.amount : -t.amount;
    });

    let runningBalance = 0;
    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, net]) => {
        runningBalance += net;
        const [y, m] = key.split("-");
        return {
          month: `${monthNames[parseInt(m) - 1]} ${y.slice(2)}`,
          balance: runningBalance,
          net,
        };
      })
      .slice(-12);
  }, [transactions]);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <h3 className="text-sm font-semibold mb-1">Evolución del balance</h3>
        <p className="text-xs text-muted-foreground">Sin datos para mostrar.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5">
      <div className="mb-6">
        <h3 className="text-sm font-semibold">Evolución del balance</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Balance acumulado mes a mes</p>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--primary)"
            strokeWidth={2.5}
            fill="url(#balanceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
