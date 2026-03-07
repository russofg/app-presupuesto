"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { useAuth } from "@/hooks/use-auth";
import { useBudgets, useCreateBudget, useDeleteBudget } from "@/hooks/use-budgets";
import { useCategories } from "@/hooks/use-categories";
import { useTransactions } from "@/hooks/use-transactions";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { MonthPicker } from "@/components/month-picker";
import { CategoryIcon } from "@/components/category-icon";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, PiggyBank, Trash2, Loader2, Copy } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";

export default function BudgetsPage() {
  const { settings } = useAuth();
  const currency = settings?.currency ?? "ARS";
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: budgets, isLoading } = useBudgets(month, year);
  const { data: categories } = useCategories();
  const { data: transactions } = useTransactions({ month, year });
  const createMutation = useCreateBudget();
  const deleteMutation = useDeleteBudget();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const { data: prevBudgets } = useBudgets(prevMonth, prevYear);

  const budgetsWithSpent = useMemo(() => {
    if (!budgets || !transactions) return [];
    return budgets.map((budget) => {
      const spent = transactions
        .filter((t) => t.type === "expense" && t.categoryId === budget.categoryId)
        .reduce((s, t) => s + t.amount, 0);
      return { ...budget, spent };
    });
  }, [budgets, transactions]);

  const totalBudget = budgetsWithSpent.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgetsWithSpent.reduce((s, b) => s + b.spent, 0);
  const totalPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const expenseCategories = categories?.filter((c) => c.type === "expense") ?? [];
  const usedCategoryIds = new Set(budgets?.map((b) => b.categoryId) ?? []);
  const availableCategories = expenseCategories.filter((c) => !usedCategoryIds.has(c.id));

  const handleCreate = async () => {
    if (!selectedCategory || !budgetAmount) return;
    await createMutation.mutateAsync({
      categoryId: selectedCategory,
      amount: parseFloat(budgetAmount),
      month,
      year,
    });
    setDialogOpen(false);
    setSelectedCategory("");
    setBudgetAmount("");
  };

  const handleCopyPrevious = async () => {
    if (!prevBudgets || prevBudgets.length === 0) return;
    setCopying(true);
    try {
      for (const b of prevBudgets) {
        if (!usedCategoryIds.has(b.categoryId)) {
          await createMutation.mutateAsync({
            categoryId: b.categoryId,
            amount: b.amount,
            month,
            year,
          });
        }
      }
    } finally {
      setCopying(false);
    }
  };

  const canCopyPrevious = prevBudgets && prevBudgets.length > 0 && budgetsWithSpent.length === 0;

  if (isLoading) return <PageSkeleton />;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 space-y-4"
    >
      <PageHeader title="Presupuestos" description="Establecé límites y controlá tus gastos">
        <Button onClick={() => setDialogOpen(true)} className="rounded-xl gap-2" disabled={availableCategories.length === 0}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Agregar presupuesto</span>
          <span className="sm:hidden">Agregar</span>
        </Button>
      </PageHeader>

      {/* Month Navigation */}
      <motion.div variants={fadeInUp}>
        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
      </motion.div>

      {/* Total Overview */}
      {budgetsWithSpent.length > 0 && (
        <motion.div variants={fadeInUp} className="rounded-xl border border-border/50 bg-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total del mes</h3>
              <p className="text-xl sm:text-2xl font-bold tabular-nums mt-1">
                {formatCurrency(totalSpent, currency)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  de {formatCurrency(totalBudget, currency)}
                </span>
              </p>
            </div>
            <div
              className={cn(
                "text-xl sm:text-2xl font-bold tabular-nums",
                totalPercentage > 100 ? "text-destructive" : totalPercentage > 80 ? "text-warning" : "text-success"
              )}
            >
              {formatPercentage(totalPercentage)}
            </div>
          </div>
          <Progress
            value={Math.min(totalPercentage, 100)}
            className={cn(
              "h-2",
              totalPercentage > 100 ? "[&>div]:bg-destructive" : totalPercentage > 80 ? "[&>div]:bg-warning" : "[&>div]:bg-success"
            )}
          />
        </motion.div>
      )}

      {/* Budgets Grid */}
      {budgetsWithSpent.length === 0 ? (
        <>
          <EmptyState
            icon={PiggyBank}
            title="Todavía no hay presupuestos"
            description="Creá tu primer presupuesto para empezar a controlar tus gastos por categoría."
            action={{ label: "Crear presupuesto", onClick: () => setDialogOpen(true) }}
          />
          {canCopyPrevious && (
            <motion.div variants={fadeInUp} className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleCopyPrevious}
                disabled={copying}
                className="rounded-xl gap-2"
              >
                {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                Copiar presupuestos del mes anterior
              </Button>
            </motion.div>
          )}
        </>
      ) : (
        <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {budgetsWithSpent.map((budget) => {
            const cat = categories?.find((c) => c.id === budget.categoryId);
            const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
            const remaining = budget.amount - budget.spent;
            const isOver = percentage > 100;
            const isWarning = percentage > 80;

            return (
              <motion.div
                key={budget.id}
                layout
                className="rounded-xl border border-border/50 bg-card p-4 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <CategoryIcon icon={cat?.icon || "Circle"} color={cat?.color || "#94a3b8"} />
                    <div>
                      <h4 className="text-sm font-semibold">{cat?.name || "Desconocido"}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatCurrency(budget.spent, currency)} de {formatCurrency(budget.amount, currency)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(budget.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <Progress
                  value={Math.min(percentage, 100)}
                  className={cn("h-2 mb-2", isOver ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-warning" : "")}
                />

                <div className="flex items-center justify-between text-xs">
                  <span className={cn("font-medium", isOver ? "text-destructive" : isWarning ? "text-warning" : "text-muted-foreground")}>
                    {isOver
                      ? `${formatCurrency(Math.abs(remaining), currency)} por encima`
                      : `${formatCurrency(remaining, currency)} restante`}
                  </span>
                  <span className="font-semibold tabular-nums">{formatPercentage(percentage)}</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo presupuesto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Elegí una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Límite mensual</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                className="h-11 rounded-xl tabular-nums"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!selectedCategory || !budgetAmount || createMutation.isPending}
                className="flex-1 rounded-xl"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Eliminar presupuesto"
        description="¿Estás seguro de que querés eliminar este presupuesto?"
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId);
            setDeleteId(null);
          }
        }}
      />
    </motion.div>
  );
}
