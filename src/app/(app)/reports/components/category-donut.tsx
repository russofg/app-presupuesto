"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { CategoryIcon } from "@/components/category-icon";
import type { Transaction, Category, Currency } from "@/types";

interface CategoryDonutProps {
  transactions: Transaction[];
  categories: Category[];
  currency: Currency;
  type: "expense" | "income";
}

export function CategoryDonut({ transactions, categories, currency, type }: CategoryDonutProps) {
  const data = useMemo(() => {
    const filtered = transactions.filter((t) => t.type === type);
    const grouped: Record<string, number> = {};
    filtered.forEach((t) => {
      grouped[t.categoryId] = (grouped[t.categoryId] || 0) + t.amount;
    });
    const total = Object.values(grouped).reduce((s, v) => s + v, 0);
    return Object.entries(grouped)
      .map(([categoryId, amount]) => {
        const cat = categories.find((c) => c.id === categoryId);
        return {
          name: cat?.name || "Otro",
          value: amount,
          percentage: total > 0 ? (amount / total) * 100 : 0,
          color: cat?.color || "#94a3b8",
          icon: cat?.icon || "Circle",
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories, type]);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <h3 className="text-sm font-semibold mb-1">
          {type === "expense" ? "Gastos por categoría" : "Ingresos por categoría"}
        </h3>
        <p className="text-xs text-muted-foreground">Sin datos para este período.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">
          {type === "expense" ? "Gastos por categoría" : "Ingresos por categoría"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Total: {formatCurrency(total, currency)}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-44 h-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
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
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 w-full space-y-2">
          {data.slice(0, 6).map((item) => (
            <div key={item.name} className="flex items-center gap-2.5">
              <CategoryIcon icon={item.icon} color={item.color} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{item.name}</span>
                  <span className="text-xs font-semibold tabular-nums ml-2">
                    {formatCurrency(item.value, currency)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground tabular-nums w-8 text-right">
                {formatPercentage(item.percentage)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
