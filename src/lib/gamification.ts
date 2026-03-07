import type { Transaction, Budget, SavingsGoal } from "@/types";

// ─── Levels ──────────────────────────────────────────────────────────────────

export interface LevelDef {
  name: string;
  minXP: number;
  icon: string;
  color: string;
}

export const LEVELS: LevelDef[] = [
  { name: "Principiante", minXP: 0, icon: "🌱", color: "#94a3b8" },
  { name: "Aprendiz", minXP: 100, icon: "🌿", color: "#10b981" },
  { name: "Intermedio", minXP: 350, icon: "⚡", color: "#3b82f6" },
  { name: "Avanzado", minXP: 750, icon: "🔥", color: "#f97316" },
  { name: "Experto", minXP: 1500, icon: "💎", color: "#8b5cf6" },
  { name: "Maestro", minXP: 3000, icon: "👑", color: "#eab308" },
  { name: "Leyenda", minXP: 5000, icon: "🏆", color: "#ec4899" },
];

export function getLevel(xp: number) {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXP) level = l;
    else break;
  }
  const idx = LEVELS.indexOf(level);
  const nextLevel = LEVELS[idx + 1];
  const currentMin = level.minXP;
  const nextMin = nextLevel?.minXP ?? level.minXP;
  const progress = nextLevel
    ? ((xp - currentMin) / (nextMin - currentMin)) * 100
    : 100;

  return {
    ...level,
    index: idx,
    xp,
    progress: Math.min(progress, 100),
    nextLevel: nextLevel ?? null,
    xpToNext: nextLevel ? nextMin - xp : 0,
  };
}

// ─── XP Calculation ──────────────────────────────────────────────────────────

export const XP_VALUES = {
  transaction: 5,
  budget: 15,
  goal: 20,
  goalCompleted: 100,
  streakDay: 3,
};

// Keeping for retroactive migrations, but runtime uses incremental tracking
export function calculateTotalXP(data: {
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  streakDays: number;
}): number {
  let xp = 0;

  xp += data.transactions.length * XP_VALUES.transaction;
  xp += data.budgets.length * XP_VALUES.budget;
  xp += data.goals.length * XP_VALUES.goal;

  const completedGoals = data.goals.filter(
    (g) => g.currentAmount >= g.targetAmount
  );
  xp += completedGoals.length * XP_VALUES.goalCompleted;

  xp += Math.min(data.streakDays, 365) * XP_VALUES.streakDay;

  return xp;
}

// ─── Streak ──────────────────────────────────────────────────────────────────

export function calculateStreak(lastActiveDate: string | null): {
  isActiveToday: boolean;
  shouldIncrement: boolean;
  shouldReset: boolean;
} {
  if (!lastActiveDate) {
    return { isActiveToday: false, shouldIncrement: true, shouldReset: false };
  }

  const today = new Date();
  const todayStr = formatDateKey(today);
  const last = new Date(lastActiveDate + "T12:00:00");
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateKey(yesterday);

  if (lastActiveDate === todayStr) {
    return { isActiveToday: true, shouldIncrement: false, shouldReset: false };
  }

  if (lastActiveDate === yesterdayStr) {
    return { isActiveToday: false, shouldIncrement: true, shouldReset: false };
  }

  return { isActiveToday: false, shouldIncrement: false, shouldReset: true };
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getTodayKey(): string {
  return formatDateKey(new Date());
}

// ─── Financial Health Score (0-100) ──────────────────────────────────────────

export function calculateHealthScore(data: {
  income: number;
  expenses: number;
  budgets: { amount: number; spent: number }[];
  goals: SavingsGoal[];
}): { score: number; breakdown: HealthBreakdown } {
  const savingsScore = calculateSavingsScore(data.income, data.expenses);
  const budgetScore = calculateBudgetScore(data.budgets);
  const goalsScore = calculateGoalsScore(data.goals);

  const score = Math.round(
    savingsScore * 0.45 +
    budgetScore * 0.30 +
    goalsScore * 0.25
  );

  const savingsRate = data.income > 0 ? ((data.income - data.expenses) / data.income) * 100 : 0;

  return {
    score: Math.min(Math.max(score, 0), 100),
    breakdown: {
      savings: {
        score: savingsScore,
        weight: 45,
        label: "Ahorro",
        detail: `${Math.round(savingsRate)}% de ingresos`,
      },
      budget: {
        score: budgetScore,
        weight: 30,
        label: "Presupuesto",
        detail: data.budgets.length === 0 ? "Sin presupuestos" : undefined,
      },
      goals: {
        score: goalsScore,
        weight: 25,
        label: "Metas",
        detail: data.goals.length === 0 ? "Sin metas" : `${data.goals.length} metas`,
      },
    },
  };
}

interface HealthBreakdownItem {
  score: number;
  weight: number;
  label: string;
  detail?: string;
}

export interface HealthBreakdown {
  savings: HealthBreakdownItem;
  budget: HealthBreakdownItem;
  goals: HealthBreakdownItem;
}

function calculateSavingsScore(income: number, expenses: number): number {
  if (income <= 0) return 0;
  const savingsRate = (income - expenses) / income;
  if (savingsRate >= 0.3) return 100;
  if (savingsRate >= 0.2) return 85;
  if (savingsRate >= 0.1) return 70;
  if (savingsRate >= 0.05) return 50;
  if (savingsRate >= 0) return 30;
  return 10;
}

function calculateBudgetScore(budgets: { amount: number; spent: number }[]): number {
  if (budgets.length === 0) return 0;
  const underBudget = budgets.filter((b) => b.spent <= b.amount).length;
  return Math.round((underBudget / budgets.length) * 100);
}

function calculateGoalsScore(goals: SavingsGoal[]): number {
  if (goals.length === 0) return 0;
  const avgProgress =
    goals.reduce((sum, g) => {
      const pct = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0;
      return sum + Math.min(pct, 1);
    }, 0) / goals.length;
  return Math.round(avgProgress * 100);
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return "Excelente";
  if (score >= 75) return "Muy bien";
  if (score >= 60) return "Bien";
  if (score >= 40) return "Regular";
  if (score >= 20) return "Mejorable";
  return "Crítico";
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#3b82f6";
  if (score >= 40) return "#eab308";
  if (score >= 20) return "#f97316";
  return "#ef4444";
}

// ─── Achievements ────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "tracking" | "savings" | "goals" | "streak" | "level";
  unlocked: boolean;
}

export const ACHIEVEMENTS_LIST: Omit<Achievement, "unlocked">[] = [
  { id: "first-tx", name: "Primer paso", description: "Registraste tu primer movimiento", icon: "✏️", category: "tracking" },
  { id: "tx-10", name: "En marcha", description: "10 movimientos registrados", icon: "📊", category: "tracking" },
  { id: "tx-50", name: "Consistente", description: "50 movimientos registrados", icon: "📈", category: "tracking" },
  { id: "tx-100", name: "Máquina de datos", description: "100 movimientos registrados", icon: "🤖", category: "tracking" },
  { id: "saver-10", name: "Ahorrista", description: "Tasa de ahorro mayor al 10%", icon: "🐷", category: "savings" },
  { id: "saver-20", name: "Ahorrador pro", description: "Tasa de ahorro mayor al 20%", icon: "💰", category: "savings" },
  { id: "saver-30", name: "Millonario en camino", description: "Tasa de ahorro mayor al 30%", icon: "🏦", category: "savings" },
  { id: "under-budget", name: "Bajo control", description: "Todos los presupuestos bajo el límite", icon: "🎯", category: "savings" },
  { id: "first-goal", name: "Soñador", description: "Creaste tu primera meta de ahorro", icon: "⭐", category: "goals" },
  { id: "goal-complete", name: "Misión cumplida", description: "Completaste una meta de ahorro", icon: "🏆", category: "goals" },
  { id: "goal-3-complete", name: "Imparable", description: "Completaste 3 metas de ahorro", icon: "🚀", category: "goals" },
  { id: "streak-7", name: "Racha semanal", description: "7 días consecutivos usando Financia", icon: "🔥", category: "streak" },
  { id: "streak-30", name: "Hábito financiero", description: "30 días de racha consecutiva", icon: "💪", category: "streak" },
  { id: "streak-100", name: "Centurión", description: "100 días de racha consecutiva", icon: "🏅", category: "streak" },
  { id: "level-3", name: "Subiendo de nivel", description: "Alcanzaste nivel Intermedio", icon: "⚡", category: "level" },
  { id: "level-5", name: "Experto financiero", description: "Alcanzaste nivel Experto", icon: "💎", category: "level" },
];

export function getAchievementsState(unlockedIds: string[]): Achievement[] {
  return ACHIEVEMENTS_LIST.map((a) => ({
    ...a,
    unlocked: unlockedIds.includes(a.id),
  }));
}

// Keeping this purely for the migration script
export function calculateAchievements(data: {
  transactions: Transaction[];
  budgets: { amount: number; spent: number }[];
  goals: SavingsGoal[];
  streakDays: number;
  longestStreak: number;
  income: number;
  expenses: number;
  totalXP: number;
}): Achievement[] {
  const txCount = data.transactions.length;
  const completedGoals = data.goals.filter(g => g.currentAmount >= g.targetAmount).length;
  const savingsRate = data.income > 0 ? (data.income - data.expenses) / data.income : 0;
  const allUnderBudget = data.budgets.length > 0 && data.budgets.every(b => b.spent <= b.amount);

  const unlocked = new Set<string>();
  if (txCount >= 1) unlocked.add("first-tx");
  if (txCount >= 10) unlocked.add("tx-10");
  if (txCount >= 50) unlocked.add("tx-50");
  if (txCount >= 100) unlocked.add("tx-100");
  if (savingsRate >= 0.1) unlocked.add("saver-10");
  if (savingsRate >= 0.2) unlocked.add("saver-20");
  if (savingsRate >= 0.3) unlocked.add("saver-30");
  if (allUnderBudget) unlocked.add("under-budget");
  if (data.goals.length >= 1) unlocked.add("first-goal");
  if (completedGoals >= 1) unlocked.add("goal-complete");
  if (completedGoals >= 3) unlocked.add("goal-3-complete");
  if (data.longestStreak >= 7) unlocked.add("streak-7");
  if (data.longestStreak >= 30) unlocked.add("streak-30");
  if (data.longestStreak >= 100) unlocked.add("streak-100");
  if (data.totalXP >= 350) unlocked.add("level-3");
  if (data.totalXP >= 1500) unlocked.add("level-5");

  return getAchievementsState(Array.from(unlocked));
}
