import { z } from "zod/v4";

// ─── Currency ───────────────────────────────────────────────────────────────

export const currencies = ["ARS", "USD", "EUR", "BRL", "MXN", "CLP", "COP", "PEN", "UYU", "GBP"] as const;
export type Currency = (typeof currencies)[number];

export const currencySymbols: Record<Currency, string> = {
  ARS: "$",
  USD: "$",
  EUR: "€",
  BRL: "R$",
  MXN: "$",
  CLP: "$",
  COP: "$",
  PEN: "S/",
  UYU: "$",
  GBP: "£",
};

// ─── Transaction Types ──────────────────────────────────────────────────────

export const transactionTypes = ["income", "expense"] as const;
export type TransactionType = (typeof transactionTypes)[number];

// ─── Category Schema ────────────────────────────────────────────────────────

export const ALLOWED_ICONS = [
  "Home", "Car", "UtensilsCrossed", "ShoppingBag", "Heart", "Briefcase",
  "Laptop", "GraduationCap", "Zap", "Clapperboard", "CreditCard",
  "TrendingUp", "PiggyBank", "Gift", "Plane", "Music", "Dumbbell",
  "Coffee", "Shirt", "Phone", "Plus", "Circle", "MoreHorizontal",
] as const;

export const ALLOWED_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#10b981", "#06b6d4",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
  "#78716c", "#14b8a6", "#7c3aed", "#94a3b8",
] as const;

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

export const categorySchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1).max(50),
  icon: z.string().min(1).max(30),
  color: z.string().regex(hexColorRegex, "Color inválido"),
  type: z.enum(transactionTypes),
  order: z.number().int().min(0),
  isDefault: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Category = z.infer<typeof categorySchema>;

// ─── Transaction Schema ─────────────────────────────────────────────────────

export const transactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(transactionTypes),
  amount: z.number().positive().max(999_999_999_999),
  description: z.string().min(1).max(200),
  categoryId: z.string(),
  date: z.date(),
  tags: z.array(z.string().max(50)).max(10).default([]),
  isRecurring: z.boolean().default(false),
  recurringId: z.string().optional(),
  notes: z.string().max(500).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Transaction = z.infer<typeof transactionSchema>;

// ─── Budget Schema ──────────────────────────────────────────────────────────

export const budgetSchema = z.object({
  id: z.string(),
  userId: z.string(),
  categoryId: z.string(),
  amount: z.number().positive().max(999_999_999_999),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  spent: z.number().min(0).default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Budget = z.infer<typeof budgetSchema>;

// ─── Savings Goal Schema ────────────────────────────────────────────────────

export const savingsGoalSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive().max(999_999_999_999),
  currentAmount: z.number().min(0).default(0),
  icon: z.string().min(1).max(10),
  color: z.string().regex(hexColorRegex, "Color inválido"),
  deadline: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SavingsGoal = z.infer<typeof savingsGoalSchema>;

// ─── Recurring Transaction Schema ───────────────────────────────────────────

export const recurringFrequencies = ["daily", "weekly", "biweekly", "monthly", "yearly"] as const;
export type RecurringFrequency = (typeof recurringFrequencies)[number];

export const recurringTransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(transactionTypes),
  amount: z.number().positive(),
  description: z.string().min(1).max(200),
  categoryId: z.string(),
  frequency: z.enum(recurringFrequencies),
  nextDate: z.date(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RecurringTransaction = z.infer<typeof recurringTransactionSchema>;

// ─── User Settings Schema ───────────────────────────────────────────────────

export const userSettingsSchema = z.object({
  userId: z.string(),
  displayName: z.string().min(1).max(100),
  currency: z.enum(currencies),
  monthlyBudget: z.number().positive().optional(),
  onboardingCompleted: z.boolean().default(false),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  streakCount: z.number().int().min(0).default(0),
  longestStreak: z.number().int().min(0).default(0),
  lastActiveDate: z.string().optional(),
  deficitCoveredByMonth: z.record(z.string(), z.number()).optional(),
  totalXP: z.number().int().min(0).default(0),
  unlockedAchievements: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

// ─── Form Schemas (for creation/editing — no id, userId, timestamps) ────────

export const createTransactionSchema = z.object({
  type: z.enum(transactionTypes),
  amount: z.number().positive("El monto debe ser positivo").max(999_999_999_999, "El monto es demasiado grande"),
  description: z.string().min(1, "La descripción es obligatoria").max(200),
  categoryId: z.string().min(1, "La categoría es obligatoria"),
  date: z.date(),
  tags: z.array(z.string().max(50)).max(10),
  isRecurring: z.boolean(),
  recurringId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const createBudgetSchema = z.object({
  categoryId: z.string().min(1, "La categoría es obligatoria"),
  amount: z.number().positive("El monto debe ser positivo").max(999_999_999_999, "El monto es demasiado grande"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

export const createSavingsGoalSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  targetAmount: z.number().positive("El monto objetivo debe ser positivo").max(999_999_999_999, "El monto es demasiado grande"),
  icon: z.string().min(1).max(10),
  color: z.string().regex(hexColorRegex, "Color inválido"),
  deadline: z.date().optional(),
});

export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>;

export const createCategorySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(50),
  icon: z.string().min(1).max(30),
  color: z.string().regex(hexColorRegex, "Color inválido"),
  type: z.enum(transactionTypes),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const onboardingSchema = z.object({
  displayName: z.string().min(1, "El nombre es obligatorio").max(100),
  currency: z.enum(currencies),
  monthlyBudget: z.number().positive("El presupuesto debe ser positivo").optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

// ─── Dashboard Insights ─────────────────────────────────────────────────────

export interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netSavings: number;
  topCategories: { categoryId: string; amount: number; percentage: number }[];
  recentTransactions: Transaction[];
  budgetSummary: { total: number; spent: number; percentage: number };
  cashflow: { date: string; income: number; expense: number }[];
  goalsProgress: { goalId: string; percentage: number }[];
}

// ─── Default Categories ─────────────────────────────────────────────────────

export const defaultCategories: Omit<Category, "id" | "userId" | "createdAt" | "updatedAt">[] = [
  { name: "Sueldo", icon: "Briefcase", color: "#10b981", type: "income", order: 0, isDefault: true },
  { name: "Freelance", icon: "Laptop", color: "#06b6d4", type: "income", order: 1, isDefault: true },
  { name: "Inversiones", icon: "TrendingUp", color: "#8b5cf6", type: "income", order: 2, isDefault: true },
  { name: "Otros ingresos", icon: "Plus", color: "#6366f1", type: "income", order: 3, isDefault: true },
  { name: "Comida", icon: "UtensilsCrossed", color: "#f97316", type: "expense", order: 0, isDefault: true },
  { name: "Transporte", icon: "Car", color: "#3b82f6", type: "expense", order: 1, isDefault: true },
  { name: "Compras", icon: "ShoppingBag", color: "#ec4899", type: "expense", order: 2, isDefault: true },
  { name: "Entretenimiento", icon: "Clapperboard", color: "#a855f7", type: "expense", order: 3, isDefault: true },
  { name: "Servicios", icon: "Zap", color: "#eab308", type: "expense", order: 4, isDefault: true },
  { name: "Salud", icon: "Heart", color: "#ef4444", type: "expense", order: 5, isDefault: true },
  { name: "Educación", icon: "GraduationCap", color: "#14b8a6", type: "expense", order: 6, isDefault: true },
  { name: "Hogar", icon: "Home", color: "#78716c", type: "expense", order: 7, isDefault: true },
  { name: "Suscripciones", icon: "CreditCard", color: "#7c3aed", type: "expense", order: 8, isDefault: true },
  { name: "Otros", icon: "MoreHorizontal", color: "#94a3b8", type: "expense", order: 9, isDefault: true },
];
