"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency, formatCompactCurrency } from "@/lib/format";
import type { Currency } from "@/types";
import { EmptyState } from "@/components/empty-state";
import { BarChart3 } from "lucide-react";

interface CashflowChartProps {
  data: { date: string; income: number; expense: number }[];
  currency: Currency;
}

export function CashflowChart({ data, currency }: CashflowChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    balance: d.income - d.expense,
  }));
  const hasData = chartData.some((d) => d.income > 0 || d.expense > 0);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold">Flujo de caja</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ingresos y Gastos diarios
          </p>
        </div>
      </div>

      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="Sin datos todavía"
          description="Empezá a agregar movimientos para ver tu flujo de caja."
          className="py-10"
        />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={20}
              tickFormatter={(v) => {
                const parts = String(v).split("-");
                return parts[2] ? String(parseInt(parts[2], 10)) : v;
              }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCompactCurrency(Math.abs(v), currency)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                fontSize: "12px",
              }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0]?.payload as { income: number; expense: number; balance: number; date: string };
                const parts = String(label ?? p?.date ?? "").split("-");
                const dayLabel = parts.length === 3
                  ? `Día ${parseInt(parts[2], 10)}`
                  : String(label ?? "");
                return (
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">{dayLabel}</div>
                    <div className="font-medium">
                      Balance neto: {formatCurrency(p.balance, currency)}
                    </div>
                    <div className="text-success text-xs">
                      Ingresos: {formatCurrency(p.income, currency)}
                    </div>
                    <div className="text-destructive text-xs">
                      Gastos: {formatCurrency(p.expense, currency)}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="income" fill="var(--success)" radius={[4, 4, 0, 0]} name="Ingresos" />
            <Bar dataKey="expense" fill="var(--destructive)" radius={[4, 4, 0, 0]} name="Gastos" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
