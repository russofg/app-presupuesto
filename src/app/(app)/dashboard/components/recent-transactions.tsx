"use client";

import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import { CategoryIcon } from "@/components/category-icon";
import { EmptyState } from "@/components/empty-state";
import type { Transaction, Category, Currency } from "@/types";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentTransactionsProps {
  transactions: Transaction[];
  categories: Category[];
  currency: Currency;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (tx: Transaction) => void;
}

export function RecentTransactions({ transactions, categories, currency, onEdit, onDelete }: RecentTransactionsProps) {
  const getCat = (id: string) => categories.find((c) => c.id === id);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Actividad reciente</h3>
        <Link
          href="/transactions"
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          Ver todo
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Sin movimientos"
          description="Agregá tu primer movimiento para empezar."
          className="py-6 flex-1"
        />
      ) : (
        <div className="space-y-1 flex-1">
          {transactions.map((tx) => {
            const cat = getCat(tx.categoryId);
            return (
              <div
                key={tx.id}
                className="group flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <CategoryIcon
                  icon={cat?.icon || "Circle"}
                  color={cat?.color || "#94a3b8"}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(new Date(tx.date))}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      tx.type === "income" ? "text-success" : "text-foreground"
                    )}
                  >
                    {tx.type === "income" ? "+" : "-"}
                    {formatCurrency(tx.amount, currency)}
                  </span>
                  {(onEdit || onDelete) && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(tx)}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-muted"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 Z"/></svg>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(tx)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-muted"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
