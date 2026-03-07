"use client";

import Link from "next/link";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import type { SavingsGoal, Currency } from "@/types";
import { Target, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalsProgressProps {
  goals: SavingsGoal[];
  currency: Currency;
}

export function GoalsProgress({ goals, currency }: GoalsProgressProps) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Metas de ahorro</h3>
        <Link
          href="/goals"
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          Ver todo
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Sin metas todavía"
          description="Creá metas de ahorro para seguir tu progreso."
          className="py-6"
        />
      ) : (
        <div className="space-y-4">
          {goals.slice(0, 4).map((goal) => {
            const percentage =
              goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            return (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{ backgroundColor: `${goal.color}18`, color: goal.color }}
                    >
                      {goal.icon}
                    </div>
                    <span className="text-sm font-medium">{goal.name}</span>
                  </div>
                  <span className="text-xs font-medium tabular-nums">
                    {formatPercentage(percentage)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: goal.color,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                  <span>{formatCurrency(goal.currentAmount, currency)}</span>
                  <span>{formatCurrency(goal.targetAmount, currency)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
