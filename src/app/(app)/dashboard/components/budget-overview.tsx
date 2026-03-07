"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { CategoryIcon } from "@/components/category-icon";
import { EmptyState } from "@/components/empty-state";
import { Progress } from "@/components/ui/progress";
import type { Budget, Category, Transaction, Currency } from "@/types";
import { PiggyBank, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BudgetOverviewProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  currency: Currency;
}

export function BudgetOverview({ budgets, categories, transactions, currency }: BudgetOverviewProps) {
  const getCat = (id: string) => categories.find((c) => c.id === id);

  const budgetsWithSpent = useMemo(() => {
    return budgets.map((budget) => {
      const spent = transactions
        .filter((t) => t.type === "expense" && t.categoryId === budget.categoryId)
        .reduce((s, t) => s + t.amount, 0);
      return { ...budget, spent };
    });
  }, [budgets, transactions]);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Estado del presupuesto</h3>
        <Link
          href="/budgets"
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          Gestionar
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {budgetsWithSpent.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Sin presupuestos"
          description="Creá presupuestos para controlar tus límites de gasto."
          className="py-6"
        />
      ) : (
        <div className="space-y-4">
          {budgetsWithSpent.slice(0, 4).map((budget) => {
            const cat = getCat(budget.categoryId);
            const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
            const isOver = percentage > 100;
            const isWarning = percentage > 80;

            return (
              <div key={budget.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CategoryIcon
                      icon={cat?.icon || "Circle"}
                      color={cat?.color || "#94a3b8"}
                      size="sm"
                    />
                    <span className="text-sm font-medium">{cat?.name || "Desconocido"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatCurrency(budget.spent, currency)} / {formatCurrency(budget.amount, currency)}
                  </span>
                </div>
                <div className="relative">
                  <Progress
                    value={Math.min(percentage, 100)}
                    className={cn(
                      "h-1.5",
                      isOver ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-warning" : ""
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
