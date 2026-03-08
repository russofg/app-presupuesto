"use client";

import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { formatCurrency, formatCompactCurrency } from "@/lib/format";
import type { Transaction, Category, Currency } from "@/types";
import { cn } from "@/lib/utils";

interface CategoryTrendsProps {
  transactions: Transaction[];
  categories: Category[];
  currency: Currency;
}

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const CHART_COLORS = [
  "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316",
];

export function CategoryTrends({ transactions, categories, currency }: CategoryTrendsProps) {
  const [selectedType, setSelectedType] = useState<"expense" | "income">("expense");

  const { data, topCats } = useMemo(() => {
    const filtered = transactions.filter((t) => t.type === selectedType);

    // Group by month and category
    const byMonthCat: Record<string, Record<string, number>> = {};
    filtered.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonthCat[key]) byMonthCat[key] = {};
      byMonthCat[key][t.categoryId] = (byMonthCat[key][t.categoryId] || 0) + t.amount;
    });

    // Find top categories by total
    const catTotals: Record<string, number> = {};
    Object.values(byMonthCat).forEach((cats) => {
      Object.entries(cats).forEach(([catId, amt]) => {
        catTotals[catId] = (catTotals[catId] || 0) + amt;
      });
    });
    const topCatIds = Object.entries(catTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([id]) => id);

    const topCats = topCatIds.map((id) => {
      const cat = categories.find((c) => c.id === id);
      return { id, name: cat?.name ?? "Sin categoría", color: cat?.color ?? "#94a3b8" };
    });

    // Build chart data (last 6 months)
    const months = Object.keys(byMonthCat).sort().slice(-6);
    const data = months.map((m) => {
      const [y, mo] = m.split("-");
      const entry: Record<string, unknown> = { month: `${MONTH_SHORT[parseInt(mo) - 1]} ${y.slice(2)}` };
      topCatIds.forEach((catId) => {
        entry[catId] = byMonthCat[m]?.[catId] ?? 0;
      });
      return entry;
    });

    return { data, topCats };
  }, [transactions, categories, selectedType]);

  if (data.length < 2) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Tendencia por categoría</h3>
        <div className="flex rounded-lg bg-muted p-0.5 gap-0.5">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                selectedType === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "expense" ? "Gastos" : "Ingresos"}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full h-[280px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => formatCompactCurrency(v, currency)}
              width={65}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                fontSize: "12px",
              }}
              formatter={(value?: number, name?: string) => {
                if (value == null) return ["", ""];
                const cat = topCats.find((c) => c.id === name);
                return [formatCurrency(value, currency), cat?.name ?? ""];
              }}
            />
            <Legend
              formatter={(value) => {
                const cat = topCats.find((c) => c.id === value);
                return <span className="text-[11px]">{cat?.name ?? ""}</span>;
              }}
            />
            {topCats.map((cat, i) => (
              <Line
                key={cat.id}
                type="monotone"
                dataKey={cat.id}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS[i % CHART_COLORS.length] }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
