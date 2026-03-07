"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { useAuth } from "@/hooks/use-auth";
import { useTransactions } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { useRecurring } from "@/hooks/use-recurring";
import { formatCurrency } from "@/lib/format";
import { CategoryIcon } from "@/components/category-icon";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Transaction, RecurringTransaction } from "@/types";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function CalendarPage() {
  const { settings } = useAuth();
  const currency = settings?.currency ?? "ARS";
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());

  const { data: transactions } = useTransactions({ month, year });
  const { data: categories } = useCategories();
  const { data: recurring } = useRecurring();

  const prev = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
    setSelectedDay(null);
  };
  const next = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
    setSelectedDay(null);
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7;

  const txByDay = useMemo(() => {
    const map: Record<number, Transaction[]> = {};
    (transactions ?? []).forEach((t) => {
      const d = new Date(t.date).getDate();
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return map;
  }, [transactions]);

  const dayTotals = useMemo(() => {
    const map: Record<number, { income: number; expense: number }> = {};
    for (const [day, txs] of Object.entries(txByDay)) {
      const d = Number(day);
      map[d] = {
        income: txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
        expense: txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      };
    }
    return map;
  }, [txByDay]);

  // Upcoming recurring transactions for this month
  const upcomingRecurring = useMemo(() => {
    if (!recurring) return new Set<number>();
    const days = new Set<number>();
    recurring.forEach((r: RecurringTransaction) => {
      if (!r.isActive) return;
      const nd = new Date(r.nextDate);
      if (nd.getMonth() + 1 === month && nd.getFullYear() === year) {
        days.add(nd.getDate());
      }
    });
    return days;
  }, [recurring, month, year]);

  const selectedTxs = selectedDay ? (txByDay[selectedDay] ?? []) : [];
  const selectedTotals = selectedDay ? (dayTotals[selectedDay] ?? { income: 0, expense: 0 }) : { income: 0, expense: 0 };
  const getCat = (id: string) => categories?.find((c) => c.id === id);

  const isToday = (day: number) =>
    day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();

  const monthTotal = useMemo(() => {
    const txs = transactions ?? [];
    return {
      income: txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
      expense: txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    };
  }, [transactions]);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto"
    >
      <PageHeader
        title="Calendario"
        description="Visualizá tus movimientos día a día"
      />

      {/* Month navigation - premium card */}
      <motion.div
        variants={fadeInUp}
        className="flex items-center justify-between rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-sm"
      >
        <Button variant="ghost" size="icon" onClick={prev} className="rounded-xl hover:bg-primary/10 h-10 w-10">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <div className="flex items-center justify-center gap-6 mt-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(monthTotal.income, currency)}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-sm font-medium text-rose-600 dark:text-rose-400">
              −{formatCurrency(monthTotal.expense, currency)}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={next} className="rounded-xl hover:bg-primary/10 h-10 w-10">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Calendar grid - larger, centered */}
      <motion.div
        variants={fadeInUp}
        className="flex justify-center"
      >
        <div className="w-full max-w-5xl rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
          {/* Day names header */}
          <div className="grid grid-cols-7 border-b border-border/50 bg-muted/30">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 [&>*:nth-child(7n)]:border-r-0">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[4.5rem] sm:min-h-[5.5rem] lg:min-h-[6rem] border-b border-r border-border/30 bg-muted/10" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const totals = dayTotals[day];
              const hasRecurring = upcomingRecurring.has(day);
              const isSelected = selectedDay === day;
              const today = isToday(day);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={cn(
                    "min-h-[4.5rem] sm:min-h-[5.5rem] lg:min-h-[6rem] border-b border-r border-border/30 p-2 sm:p-3 flex flex-col items-start relative transition-all duration-200",
                    isSelected
                      ? "bg-primary/15 ring-2 ring-primary ring-inset z-10 shadow-inner"
                      : "hover:bg-muted/40 active:bg-muted/50",
                    today && !isSelected && "bg-primary/5"
                  )}
                >
                  <span className={cn(
                    "text-sm font-semibold w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full shrink-0 transition-colors",
                    today ? "bg-primary text-primary-foreground" : "text-foreground"
                  )}>
                    {day}
                  </span>

                  <div className="flex flex-col gap-1 mt-auto w-full px-0.5">
                    {totals?.income ? (
                      <div className="h-1.5 rounded-full bg-emerald-500/70 w-full min-w-[20px]" />
                    ) : null}
                    {totals?.expense ? (
                      <div className="h-1.5 rounded-full bg-rose-500/70 w-full min-w-[20px]" />
                    ) : null}
                  </div>

                  {hasRecurring && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 rounded-full bg-violet-500" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Legend */}
      <motion.div variants={fadeInUp} className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1.5 rounded-full bg-emerald-500/70" />
          Ingresos
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1.5 rounded-full bg-rose-500/70" />
          Gastos
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          Recurrente próximo
        </div>
      </motion.div>

      {/* Selected day detail */}
      <AnimatePresence mode="wait">
        {selectedDay !== null && (
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-auto max-w-4xl rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm"
          >
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {selectedDay} de {MONTH_NAMES[month - 1]}
              </h3>
              <div className="flex items-center gap-3">
                {selectedTotals.income > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                    <TrendingUp className="w-3 h-3" />
                    +{formatCurrency(selectedTotals.income, currency)}
                  </span>
                )}
                {selectedTotals.expense > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium text-rose-500">
                    <TrendingDown className="w-3 h-3" />
                    -{formatCurrency(selectedTotals.expense, currency)}
                  </span>
                )}
              </div>
            </div>

            {selectedTxs.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Sin movimientos este día.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {selectedTxs.map((tx) => {
                  const cat = getCat(tx.categoryId);
                  return (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                      <CategoryIcon
                        icon={cat?.icon || "Circle"}
                        color={cat?.color || "#94a3b8"}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {cat?.name ?? "Sin categoría"}
                          {tx.isRecurring && (
                            <span className="inline-flex items-center gap-0.5 ml-1.5 text-violet-500">
                              <Repeat className="w-2.5 h-2.5" /> Recurrente
                            </span>
                          )}
                        </p>
                      </div>
                      <span className={cn(
                        "text-sm font-semibold tabular-nums whitespace-nowrap",
                        tx.type === "income" ? "text-emerald-500" : "text-foreground"
                      )}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount, currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
