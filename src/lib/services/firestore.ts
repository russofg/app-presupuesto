import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  getDocFromServer,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  setDoc,
  limit,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { XP_VALUES } from "@/lib/gamification";
import type {
  Transaction,
  Category,
  Budget,
  SavingsGoal,
  RecurringTransaction,
  UserSettings,
  CreateTransactionInput,
  CreateBudgetInput,
  CreateSavingsGoalInput,
  CreateCategoryInput,
  RecurringFrequency,
} from "@/types";
import { defaultCategories } from "@/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function toDate(timestamp: unknown): Date {
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  return new Date(timestamp as string);
}

function serializeDoc<T>(doc: { id: string; data: () => Record<string, unknown> }): T {
  const data = doc.data();
  const result: Record<string, unknown> = { id: doc.id };
  for (const [key, value] of Object.entries(data)) {
    result[key] = value instanceof Timestamp ? value.toDate() : value;
  }
  return result as T;
}

// ─── User Settings ──────────────────────────────────────────────────────────

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const docRef = doc(db, "settings", userId);
  const snap = await getDocFromServer(docRef);
  if (!snap.exists()) return null;
  return serializeDoc<UserSettings>({ id: snap.id, data: () => snap.data() });
}

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype", "__defineGetter__", "__defineSetter__"]);

function cleanData(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (typeof value === "number" && isNaN(value)) continue;
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (typeof key !== "string" || key.startsWith("$")) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

export async function createUserSettings(userId: string, settings: Record<string, unknown>): Promise<void> {
  const docRef = doc(db, "settings", userId);
  const data = cleanData({
    userId,
    ...settings,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  await setDoc(docRef, data);
}

export async function updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
  const docRef = doc(db, "settings", userId);
  await updateDoc(docRef, { ...settings, updatedAt: Timestamp.now() });
}

export async function addDeficitCovered(userId: string, month: number, year: number, amount: number): Promise<void> {
  const settings = await getUserSettings(userId);
  const key = `${year}-${month}`;
  const current = (settings as { deficitCoveredByMonth?: Record<string, number> })?.deficitCoveredByMonth ?? {};
  const prev = current[key] ?? 0;
  await updateUserSettings(userId, {
    deficitCoveredByMonth: { ...current, [key]: prev + amount },
  } as Partial<UserSettings>);
}

export async function setDeficitCovered(userId: string, month: number, year: number, amount: number): Promise<void> {
  const settings = await getUserSettings(userId);
  const key = `${year}-${month}`;
  const current = (settings as { deficitCoveredByMonth?: Record<string, number> })?.deficitCoveredByMonth ?? {};
  await updateUserSettings(userId, {
    deficitCoveredByMonth: { ...current, [key]: amount },
  } as Partial<UserSettings>);
}

// ─── Categories ─────────────────────────────────────────────────────────────

export async function getCategories(userId: string): Promise<Category[]> {
  const q = query(collection(db, "categories"), where("userId", "==", userId), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => serializeDoc<Category>({ id: d.id, data: () => d.data() }));
}

export async function createCategory(userId: string, input: CreateCategoryInput): Promise<string> {
  const existing = await getCategories(userId);
  const docRef = await addDoc(collection(db, "categories"), {
    ...input,
    userId,
    order: existing.length,
    isDefault: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateCategory(id: string, data: Partial<Category>): Promise<void> {
  await updateDoc(doc(db, "categories", id), { ...data, updatedAt: Timestamp.now() });
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, "categories", id));
}

const categoryTranslations: Record<string, string> = {
  "Salary": "Sueldo",
  "Freelance": "Freelance",
  "Investments": "Inversiones",
  "Other Income": "Otros ingresos",
  "Food & Dining": "Comida",
  "Transport": "Transporte",
  "Shopping": "Compras",
  "Entertainment": "Entretenimiento",
  "Bills & Utilities": "Servicios",
  "Health": "Salud",
  "Education": "Educación",
  "Home": "Hogar",
  "Subscriptions": "Suscripciones",
  "Other": "Otros",
  "Ahorro": "Ahorro",
};

export async function translateCategoriesToSpanish(userId: string): Promise<number> {
  const categories = await getCategories(userId);
  const batch = writeBatch(db);
  let count = 0;

  for (const cat of categories) {
    const spanishName = categoryTranslations[cat.name];
    if (spanishName && spanishName !== cat.name) {
      batch.update(doc(db, "categories", cat.id), {
        name: spanishName,
        updatedAt: Timestamp.now(),
      });
      count++;
    }
  }

  if (count > 0) await batch.commit();
  return count;
}

export async function initializeDefaultCategories(userId: string): Promise<void> {
  const batch = writeBatch(db);
  for (const cat of defaultCategories) {
    const ref = doc(collection(db, "categories"));
    batch.set(ref, {
      ...cat,
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }
  await batch.commit();
}

// ─── Transactions ───────────────────────────────────────────────────────────

export async function getTransactions(
  userId: string,
  filters?: { month?: number; year?: number; type?: string; categoryId?: string }
): Promise<Transaction[]> {
  let q = query(collection(db, "transactions"), where("userId", "==", userId), orderBy("date", "desc"));

  if (filters?.type) {
    q = query(collection(db, "transactions"), where("userId", "==", userId), where("type", "==", filters.type), orderBy("date", "desc"));
  }

  if (filters?.month === undefined || filters?.year === undefined) {
    q = query(q, limit(300));
  }

  const snap = await getDocs(q);
  let transactions = snap.docs.map((d) => serializeDoc<Transaction>({ id: d.id, data: () => d.data() }));

  if (filters?.month !== undefined && filters?.year !== undefined) {
    transactions = transactions.filter((t) => {
      const d = toDate(t.date);
      return d.getMonth() + 1 === filters.month && d.getFullYear() === filters.year;
    });
  }

  if (filters?.categoryId) {
    transactions = transactions.filter((t) => t.categoryId === filters.categoryId);
  }

  return transactions;
}

export async function createTransaction(userId: string, input: CreateTransactionInput): Promise<string> {
  const batch = writeBatch(db);
  const docRef = doc(collection(db, "transactions"));
  
  batch.set(docRef, {
    ...input,
    userId,
    date: Timestamp.fromDate(input.date),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  const settingsRef = doc(db, "settings", userId);
  batch.update(settingsRef, {
    totalXP: increment(XP_VALUES.transaction)
  });

  await batch.commit();
  return docRef.id;
}

export async function updateTransaction(id: string, data: Partial<CreateTransactionInput>): Promise<void> {
  const updateData: Record<string, unknown> = { ...data, updatedAt: Timestamp.now() };
  if (data.date) updateData.date = Timestamp.fromDate(data.date);
  await updateDoc(doc(db, "transactions", id), updateData);
}

export async function deleteTransaction(id: string, userId?: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "transactions", id));
  
  if (userId) {
    const settingsRef = doc(db, "settings", userId);
    batch.update(settingsRef, {
      totalXP: increment(-XP_VALUES.transaction)
    });
  }
  
  await batch.commit();
}

// ─── Budgets ────────────────────────────────────────────────────────────────

export async function getBudgets(userId: string, month: number, year: number): Promise<Budget[]> {
  const q = query(
    collection(db, "budgets"),
    where("userId", "==", userId),
    where("month", "==", month),
    where("year", "==", year)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => serializeDoc<Budget>({ id: d.id, data: () => d.data() }));
}

export async function createBudget(userId: string, input: CreateBudgetInput): Promise<string> {
  const batch = writeBatch(db);
  const docRef = doc(collection(db, "budgets"));
  
  batch.set(docRef, {
    ...input,
    userId,
    spent: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  const settingsRef = doc(db, "settings", userId);
  batch.update(settingsRef, {
    totalXP: increment(XP_VALUES.budget)
  });

  await batch.commit();
  return docRef.id;
}

export async function updateBudget(id: string, data: Partial<Budget>): Promise<void> {
  await updateDoc(doc(db, "budgets", id), { ...data, updatedAt: Timestamp.now() });
}

export async function deleteBudget(id: string, userId?: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "budgets", id));

  if (userId) {
    const settingsRef = doc(db, "settings", userId);
    batch.update(settingsRef, {
      totalXP: increment(-XP_VALUES.budget)
    });
  }

  await batch.commit();
}

// ─── Savings Goals ──────────────────────────────────────────────────────────

export async function getSavingsGoals(userId: string): Promise<SavingsGoal[]> {
  const q = query(collection(db, "savingsGoals"), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => serializeDoc<SavingsGoal>({ id: d.id, data: () => d.data() }));
}

export async function createSavingsGoal(userId: string, input: CreateSavingsGoalInput): Promise<string> {
  const batch = writeBatch(db);
  const docRef = doc(collection(db, "savingsGoals"));
  
  batch.set(docRef, {
    ...input,
    userId,
    currentAmount: 0,
    deadline: input.deadline ? Timestamp.fromDate(input.deadline) : null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  const settingsRef = doc(db, "settings", userId);
  batch.update(settingsRef, {
    totalXP: increment(XP_VALUES.goal)
  });

  await batch.commit();
  return docRef.id;
}

export async function updateSavingsGoal(id: string, data: Partial<SavingsGoal>): Promise<void> {
  const updateData: Record<string, unknown> = { ...data, updatedAt: Timestamp.now() };
  if (data.deadline) updateData.deadline = Timestamp.fromDate(data.deadline);
  await updateDoc(doc(db, "savingsGoals", id), updateData);
}

export async function deleteSavingsGoal(id: string, userId?: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "savingsGoals", id));

  if (userId) {
    const settingsRef = doc(db, "settings", userId);
    batch.update(settingsRef, {
      totalXP: increment(-XP_VALUES.goal)
    });
  }

  await batch.commit();
}

// ─── Recurring Transactions ─────────────────────────────────────────────────

export async function getRecurringTransactions(userId: string): Promise<RecurringTransaction[]> {
  const q = query(
    collection(db, "recurringTransactions"),
    where("userId", "==", userId),
    where("isActive", "==", true)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => serializeDoc<RecurringTransaction>({ id: d.id, data: () => d.data() }));
}

export async function createRecurringTransaction(
  userId: string,
  input: Omit<RecurringTransaction, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, "recurringTransactions"), {
    ...input,
    userId,
    nextDate: Timestamp.fromDate(input.nextDate),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateRecurringTransaction(id: string, data: Partial<RecurringTransaction>): Promise<void> {
  const updateData: Record<string, unknown> = { ...data, updatedAt: Timestamp.now() };
  if (data.nextDate) updateData.nextDate = Timestamp.fromDate(data.nextDate);
  await updateDoc(doc(db, "recurringTransactions", id), updateData);
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  await deleteDoc(doc(db, "recurringTransactions", id));
}

function getNextRecurringDate(current: Date, frequency: string): Date {
  const next = new Date(current);
  switch (frequency) {
    case "daily": next.setDate(next.getDate() + 1); break;
    case "weekly": next.setDate(next.getDate() + 7); break;
    case "biweekly": next.setDate(next.getDate() + 14); break;
    case "monthly": next.setMonth(next.getMonth() + 1); break;
    case "yearly": next.setFullYear(next.getFullYear() + 1); break;
  }
  return next;
}

export async function processRecurringTransactions(userId: string): Promise<number> {
  const recurring = await getRecurringTransactions(userId);
  const now = new Date();
  let created = 0;

  for (const rule of recurring) {
    let nextDate = new Date(rule.nextDate);

    while (nextDate <= now) {
      await createTransaction(userId, {
        type: rule.type,
        amount: rule.amount,
        description: rule.description,
        categoryId: rule.categoryId,
        date: nextDate,
        tags: ["recurrente"],
        isRecurring: true,
        recurringId: rule.id,
      });
      created++;
      nextDate = getNextRecurringDate(nextDate, rule.frequency);
    }

    if (nextDate.getTime() !== new Date(rule.nextDate).getTime()) {
      await updateRecurringTransaction(rule.id, { nextDate });
    }
  }

  return created;
}
