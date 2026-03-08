"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { useAuth } from "@/hooks/use-auth";
import { useTransactions } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { useBudgets } from "@/hooks/use-budgets";
import { useGoals } from "@/hooks/use-goals";
import { useRecurring } from "@/hooks/use-recurring";
import { updateUserSettings } from "@/lib/services/firestore";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { useDeleteTransaction, useCreateTransaction } from "@/hooks/use-transactions";
import { useUISounds } from "@/hooks/use-ui-sounds";
import type { Transaction } from "@/types";
import {
  calculateHealthScore,
  calculateStreak,
  getTodayKey,
  getLevel,
  getAchievementsState,
} from "@/lib/gamification";
import { fireStreakConfetti } from "@/lib/confetti";
import { DashboardSkeleton } from "@/components/loading-skeleton";
import { MonthPicker } from "@/components/month-picker";
import { HealthScoreRing } from "@/components/health-score-ring";
import { StreakBadge } from "@/components/streak-badge";
import { LevelCard3D } from "@/components/level-card-3d";
import { AchievementsPanel } from "@/components/achievements-panel";
import { MetricCard } from "./components/metric-card";
import { CashflowChart } from "./components/cashflow-chart";
import { RecentTransactions } from "./components/recent-transactions";
import { TopCategories } from "./components/top-categories";
import { BudgetOverview } from "./components/budget-overview";
import { GoalsProgress } from "./components/goals-progress";
import { ProjectionsCard } from "./components/projections-card";
import { QuickAdd } from "./components/quick-add";
import { MonthlyWrap } from "./components/monthly-wrap";
import { TransactionDialog } from "../transactions/components/transaction-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { InsightsCard } from "./components/insights-card";
import { AiCopilot } from "@/components/dashboard/ai-copilot";
import { DollarConverter } from "@/components/dollar-converter";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { generateInsights } from "@/lib/insights";
import { filterRealTransactions } from "@/lib/transactions-utils";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Plus,
  ArrowRight,
  Trophy,
  Sparkles,
} from "lucide-react";
import { Magnetic } from "@/components/magnetic";
import Link from "next/link";
import Image from "next/image";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { user, settings, refreshSettings } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const currency = settings?.currency ?? "ARS";

  const { data: transactions, isLoading: loadingTx } = useTransactions({ month, year });
  const { data: categories, isLoading: loadingCat } = useCategories();
  const { data: budgets, isLoading: loadingBudgets } = useBudgets(month, year);
  const { data: goals, isLoading: loadingGoals } = useGoals();
  useRecurring();

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const { data: prevTransactions } = useTransactions({ month: prevMonth, year: prevYear });

  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [wrapOpen, setWrapOpen] = useState(false);
  
  // Dialogs
  const { playPop, playDelete } = useUISounds();
  const deleteMutation = useDeleteTransaction();
  const createMutation = useCreateTransaction();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const streakUpdated = useRef(false);

  // ─── Streak tracking ────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !settings || streakUpdated.current) return;
    streakUpdated.current = true;

    const lastActive = (settings as Record<string, unknown>).lastActiveDate as string | undefined;
    const currentStreak = (settings as Record<string, unknown>).streakCount as number | undefined ?? 0;
    const longestStreak = (settings as Record<string, unknown>).longestStreak as number | undefined ?? 0;
    const { shouldIncrement, shouldReset, isActiveToday } = calculateStreak(lastActive ?? null);

    if (isActiveToday) return;

    const updates: Record<string, unknown> = { lastActiveDate: getTodayKey() };

    if (shouldReset) {
      updates.streakCount = 1;
    } else if (shouldIncrement) {
      const newStreak = currentStreak + 1;
      updates.streakCount = newStreak;
      if (newStreak > longestStreak) {
        updates.longestStreak = newStreak;
      }
      if (newStreak >= 3) {
        setTimeout(() => fireStreakConfetti(), 1500);
      }
    }

    updateUserSettings(user.uid, updates).then(() => refreshSettings());
  }, [user, settings, refreshSettings]);

  // ─── Metrics ────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (!transactions) return { income: 0, expenses: 0, balance: 0, savings: 0, deficit: 0 };
    const real = filterRealTransactions(transactions);
    const income = real.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = real.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const savings = goals?.reduce((s, g) => s + g.currentAmount, 0) ?? 0;
    const balance = income - expenses;
    const deficit = balance < 0 ? Math.abs(balance) : 0;
    return { income, expenses, balance, savings, deficit };
  }, [transactions, goals]);

  const prevMetrics = useMemo(() => {
    if (!prevTransactions) return { income: 0, expenses: 0, balance: 0, savings: 0 };
    const real = filterRealTransactions(prevTransactions);
    const income = real.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = real.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const balance = income - expenses;
    return { income, expenses, balance, savings: goals?.reduce((s, g) => s + g.currentAmount, 0) ?? 0 };
  }, [prevTransactions, goals]);

  const realTransactions = useMemo(() => filterRealTransactions(transactions ?? []), [transactions]);
  const realPrevTransactions = useMemo(() => filterRealTransactions(prevTransactions ?? []), [prevTransactions]);
  
  const txToDelete = useMemo(() => (deleteId && realTransactions ? realTransactions.find((t) => t.id === deleteId) : null), [deleteId, realTransactions]);

  const handleEdit = (tx: Transaction) => {
    playPop();
    setEditingTx(tx);
    setDialogOpen(true);
  };

  const cashflowData = useMemo(() => {
    if (!transactions) return [];
    const real = filterRealTransactions(transactions);
    const daysInMonth = new Date(year, month, 0).getDate();
    const grouped: Record<string, { income: number; expense: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      grouped[dateKey] = { income: 0, expense: 0 };
    }
    real.forEach((t) => {
      const d = new Date(t.date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!grouped[dateKey]) grouped[dateKey] = { income: 0, expense: 0 };
      if (t.type === "income") grouped[dateKey].income += t.amount;
      else grouped[dateKey].expense += t.amount;
    });
    return Object.entries(grouped)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, month, year]);

  const topCategories = useMemo(() => {
    if (!transactions || !categories) return [];
    const real = filterRealTransactions(transactions);
    const expensesByCategory: Record<string, number> = {};
    real
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        expensesByCategory[t.categoryId] = (expensesByCategory[t.categoryId] || 0) + t.amount;
      });
    const totalExpenses = Object.values(expensesByCategory).reduce((s, v) => s + v, 0);
    return Object.entries(expensesByCategory)
      .map(([categoryId, amount]) => ({
        categoryId,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        category: categories.find((c) => c.id === categoryId),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions, categories]);

  // ─── Gamification data ──────────────────────────────────────────────
  const streakCount = (settings as Record<string, unknown> | null)?.streakCount as number ?? 0;
  const longestStreak = (settings as Record<string, unknown> | null)?.longestStreak as number ?? 0;

  const budgetsWithSpent = useMemo(() => {
    if (!budgets || !transactions) return [];
    return budgets.map((b) => {
      const spent = realTransactions
        .filter((t) => t.type === "expense" && t.categoryId === b.categoryId)
        .reduce((s, t) => s + t.amount, 0);
      return { categoryId: b.categoryId, amount: b.amount, spent };
    });
  }, [budgets, realTransactions]);

  const healthData = useMemo(() => {
    return calculateHealthScore({
      income: metrics.income,
      expenses: metrics.expenses,
      budgets: budgetsWithSpent,
      goals: goals ?? [],
    });
  }, [metrics, budgetsWithSpent, goals]);

  const totalXP = settings?.totalXP ?? 0;
  const level = useMemo(() => getLevel(totalXP), [totalXP]);

  const achievements = useMemo(() => {
    return getAchievementsState(settings?.unlockedAchievements ?? []);
  }, [settings?.unlockedAchievements]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const smartInsights = useMemo(() => {
    return generateInsights({
      transactions: realTransactions,
      prevTransactions: realPrevTransactions,
      categories: categories ?? [],
      currency,
      budgets: budgetsWithSpent,
      goals: goals ?? [],
      streakDays: streakCount,
    });
  }, [realTransactions, realPrevTransactions, categories, currency, budgetsWithSpent, goals, streakCount]);

  const isLoading = loadingTx || loadingCat || loadingBudgets || loadingGoals;

  if (isLoading) return <DashboardSkeleton />;

  const greeting = getGreeting();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    await queryClient.invalidateQueries({ queryKey: ["budgets"] });
    await queryClient.invalidateQueries({ queryKey: ["goals"] });
    await queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 space-y-5"
    >
      {/* Header */}
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex items-center justify-between w-full sm:w-auto h-16">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-muted-foreground">{greeting}</p>
              <StreakBadge count={streakCount} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {settings?.displayName?.split(" ")[0] || "vos"}
            </h1>
          </div>
          {/* Mobile Logo */}
          <div className="lg:hidden absolute right-0 top-1/2 -translate-y-1/2 -mr-4 flex-shrink-0">
            <Image 
              src="/logo.png" 
              alt="Financia Logo" 
              width={110}
              height={110}
              className="object-contain overflow-visible drop-shadow-[0_0_15px_rgba(124,58,237,0.3)]"
              priority
            />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {transactions && transactions.length > 0 && (
            <Magnetic strength={0.3}>
              <button
                onClick={() => setWrapOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/10 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Resumen</span>
              </button>
            </Magnetic>
          )}
          <Magnetic strength={0.2}>
            <button
              onClick={() => setAchievementsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              <Trophy className="w-3.5 h-3.5" />
              {unlockedCount}/{achievements.length}
            </button>
          </Magnetic>
          <Magnetic strength={0.2}>
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors block"
            >
              Ver reportes
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Magnetic>
          <Magnetic strength={0.3}>
            <Link
              href="/transactions"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0 block"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Agregar movimiento</span>
              <span className="sm:hidden">Agregar</span>
            </Link>
          </Magnetic>
        </div>
      </motion.div>

      {/* Gamification Banner */}
      <motion.div variants={fadeInUp} className="w-full">
        <LevelCard3D
          name={level.name}
          icon={level.icon}
          progress={level.progress}
          xpToNext={level.xpToNext}
          totalXP={totalXP}
          streakCount={streakCount}
          color={level.color}
          className="w-full h-[120px] sm:h-[140px]"
        />
      </motion.div>

      {/* AI Copilot */}
      <motion.div variants={fadeInUp}>
        <AiCopilot 
          totalIncome={metrics.income}
          totalExpenses={metrics.expenses}
          username={settings?.displayName?.split(" ")[0] || "Usuario"}
        />
      </motion.div>

      {/* Month Picker */}
      <motion.div variants={fadeInUp}>
        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
      </motion.div>

      {/* Metrics Grid */}
      <motion.div variants={fadeInUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Balance"
          value={metrics.balance}
          previousValue={prevTransactions ? prevMetrics.balance : undefined}
          currency={currency}
          icon={Wallet}
          trend={metrics.balance >= 0 ? "positive" : "negative"}
          subtitle={metrics.balance < 0 ? "Gastaste más de lo que tenías" : undefined}
        />
        <MetricCard
          title="Ingresos"
          value={metrics.income}
          previousValue={prevTransactions ? prevMetrics.income : undefined}
          currency={currency}
          icon={TrendingUp}
          trend="positive"
          color="success"
          subtitle="Total que recibiste"
        />
        <MetricCard
          title="Gastos"
          value={metrics.expenses}
          previousValue={prevTransactions ? prevMetrics.expenses : undefined}
          currency={currency}
          icon={TrendingDown}
          trend="negative"
          color="destructive"
        />
        <MetricCard
          title="En metas"
          value={metrics.savings}
          previousValue={prevTransactions ? prevMetrics.savings : undefined}
          currency={currency}
          icon={PiggyBank}
          trend={metrics.savings >= 0 ? "positive" : "negative"}
          color="primary"
          subtitle="De lo que ingresaste, asignado a metas"
        />
      </motion.div>


      {/* Quick Add */}
      {transactions && transactions.length > 0 && (
        <motion.div variants={fadeInUp}>
          <QuickAdd transactions={transactions} currency={currency} />
        </motion.div>
      )}

      {/* Health Score + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <motion.div variants={fadeInUp} className="lg:col-span-2">
          <CashflowChart data={cashflowData} currency={currency} />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <HealthScoreRing score={healthData.score} breakdown={healthData.breakdown} />
        </motion.div>
      </div>

      {/* Insights */}
      {smartInsights.length > 0 && (
        <motion.div variants={fadeInUp}>
          <InsightsCard insights={smartInsights} />
        </motion.div>
      )}

      {/* Recent + Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <motion.div variants={fadeInUp} className="lg:col-span-2">
          <RecentTransactions
            transactions={realTransactions.slice(0, 6)}
            categories={categories || []}
            currency={currency}
            onEdit={handleEdit}
            onDelete={(tx) => { playPop(); setDeleteId(tx.id); }}
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <TopCategories categories={topCategories} currency={currency} />
        </motion.div>
      </div>

      {/* Dólar (solo ARS) */}
      {currency === "ARS" && (
        <motion.div variants={fadeInUp} className="max-w-md">
          <DollarConverter />
        </motion.div>
      )}

      {/* Projections + Budgets + Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <motion.div variants={fadeInUp}>
          <ProjectionsCard
            income={metrics.income}
            expenses={metrics.expenses}
            prevIncome={prevMetrics.income}
            prevExpenses={prevMetrics.expenses}
            savingsRemaining={goals?.reduce((s, g) => Math.max(0, g.targetAmount - g.currentAmount), 0) ?? 0}
            dayOfMonth={now.getDate()}
            daysInMonth={new Date(year, month, 0).getDate()}
            currency={currency}
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <BudgetOverview budgets={budgets || []} categories={categories || []} transactions={realTransactions} currency={currency} />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <GoalsProgress goals={goals || []} currency={currency} />
        </motion.div>
      </div>

      {/* Achievements Panel */}
      <AchievementsPanel
        achievements={achievements}
        open={achievementsOpen}
        onClose={() => setAchievementsOpen(false)}
      />

      <MonthlyWrap
        open={wrapOpen}
        onClose={() => setWrapOpen(false)}
        month={month}
        year={year}
        transactions={realTransactions}
        prevTransactions={realPrevTransactions}
        categories={categories ?? []}
        currency={currency}
        healthScore={healthData.score}
        level={level}
      />

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transaction={editingTx}
        categories={categories || []}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Eliminar movimiento"
        description="¿Estás seguro de que querés eliminar este movimiento?"
        confirmLabel="Eliminar"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteId || !txToDelete) return;
          deleteMutation.mutate(
            { id: deleteId, tx: txToDelete },
            {
              onSuccess: () => {
                playDelete();
                setDeleteId(null);
                toast.success("Movimiento eliminado", {
                  action: {
                    label: "Deshacer",
                    onClick: () => {
                      createMutation.mutate({
                        type: txToDelete.type,
                        amount: txToDelete.amount,
                        description: txToDelete.description,
                        categoryId: txToDelete.categoryId,
                        date: new Date(txToDelete.date),
                        tags: txToDelete.tags ?? [],
                        isRecurring: txToDelete.isRecurring ?? false,
                        notes: txToDelete.notes ?? "",
                      });
                      toast.success("Movimiento restaurado");
                    },
                  },
                });
              },
            }
          );
        }}
      />
    </motion.div>
    </PullToRefresh>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días,";
  if (hour < 18) return "Buenas tardes,";
  return "Buenas noches,";
}
