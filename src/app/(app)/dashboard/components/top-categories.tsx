"use client";

import { formatCurrency, formatPercentage } from "@/lib/format";
import { CategoryIcon } from "@/components/category-icon";
import { EmptyState } from "@/components/empty-state";
import { Progress } from "@/components/ui/progress";
import type { Category, Currency } from "@/types";
import { Tags } from "lucide-react";

interface TopCategoriesProps {
  categories: {
    categoryId: string;
    amount: number;
    percentage: number;
    category?: Category;
  }[];
  currency: Currency;
}

export function TopCategories({ categories, currency }: TopCategoriesProps) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 h-full">
      <h3 className="text-sm font-semibold mb-4">Mayor gasto</h3>

      {categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Sin gastos todavía"
          description="Acá van a aparecer las categorías donde más gastás."
          className="py-6"
        />
      ) : (
        <div className="space-y-4">
          {categories.map((item) => (
            <div key={item.categoryId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CategoryIcon
                    icon={item.category?.icon || "Circle"}
                    color={item.category?.color || "#94a3b8"}
                    size="sm"
                  />
                  <span className="text-sm font-medium">{item.category?.name || "Desconocido"}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(item.amount, currency)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1.5">
                    {formatPercentage(item.percentage)}
                  </span>
                </div>
              </div>
              <Progress
                value={item.percentage}
                className="h-1.5"
                style={{ ["--progress-color" as string]: item.category?.color || "#94a3b8" }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
