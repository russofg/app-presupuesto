"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { useAuth } from "@/hooks/use-auth";
import { useTransactions } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { useRecurring } from "@/hooks/use-recurring";
import { detectSubscriptions, calculateMonthlyTotal, calculateYearlyTotal } from "@/lib/subscriptions";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { CategoryIcon } from "@/components/category-icon";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Repeat, Sparkles, Calendar, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SubscriptionsPage() {
  const { settings } = useAuth();
  const currency = settings?.currency ?? "ARS";

  const { data: transactions } = useTransactions({});
  const { data: categories } = useCategories();
  const { data: recurring } = useRecurring();

  const subs = useMemo(() => {
    if (!transactions || !recurring) return [];
    return detectSubscriptions(transactions, recurring);
  }, [transactions, recurring]);

  const monthlyTotal = useMemo(() => calculateMonthlyTotal(subs), [subs]);
  const yearlyTotal = useMemo(() => calculateYearlyTotal(subs), [subs]);

  const getCat = (id: string) => categories?.find((c) => c.id === id);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-3xl"
    >
      <PageHeader
        title="Suscripciones"
        description="Tu costo fijo mensual en un solo lugar"
      />

      {/* Summary cards */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border/50 bg-card p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center mx-auto mb-2">
            <TrendingDown className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(monthlyTotal, currency)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">por mes</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
            <Calendar className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(yearlyTotal, currency)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">por año</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto mb-2">
            <CreditCard className="w-5 h-5 text-violet-500" />
          </div>
          <p className="text-xl font-bold tabular-nums">{subs.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">suscripcion{subs.length !== 1 ? "es" : ""} activa{subs.length !== 1 ? "s" : ""}</p>
        </div>
      </motion.div>

      {/* Subscriptions list */}
      {subs.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <EmptyState
            icon={CreditCard}
            title="Sin suscripciones detectadas"
            description="Cuando tengas gastos recurrentes o repetitivos, van a aparecer acá automáticamente."
          />
        </motion.div>
      ) : (
        <motion.div variants={fadeInUp} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="divide-y divide-border/30">
            {subs.map((sub, i) => {
              const cat = getCat(sub.categoryId);
              return (
                <motion.div
                  key={`${sub.name}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <CategoryIcon
                    icon={cat?.icon || "CreditCard"}
                    color={cat?.color || "#94a3b8"}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{sub.name}</p>
                      {sub.source === "detected" && (
                        <Badge variant="secondary" className="text-[9px] gap-0.5 shrink-0">
                          <Sparkles className="w-2.5 h-2.5" />
                          Auto
                        </Badge>
                      )}
                      {sub.source === "recurring" && (
                        <Badge variant="secondary" className="text-[9px] gap-0.5 shrink-0">
                          <Repeat className="w-2.5 h-2.5" />
                          Recurrente
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {cat?.name ?? "Sin categoría"}
                      {sub.frequency === "yearly" ? " · Anual" : " · Mensual"}
                      {sub.occurrences > 0 && ` · ${sub.occurrences} cobros`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-sm font-semibold tabular-nums")}>
                      {formatCurrency(sub.amount, currency)}
                    </p>
                    {sub.frequency === "yearly" && (
                      <p className="text-[10px] text-muted-foreground">
                        ~{formatCurrency(sub.amount / 12, currency)}/mes
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {subs.length > 0 && (
        <motion.div variants={fadeInUp} className="rounded-xl bg-muted/40 p-4">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">💡 Tip:</span>{" "}
            Las suscripciones marcadas como &quot;Auto&quot; fueron detectadas automáticamente analizando patrones en tus movimientos.
            Las marcadas como &quot;Recurrente&quot; son las que configuraste manualmente.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
