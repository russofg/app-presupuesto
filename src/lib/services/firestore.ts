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
  type QueryConstraint,
  writeBatch,
  setDoc,
  limit,
  increment,
  arrayUnion,
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

// ─── MercadoPago imported IDs ────────────────────────────────────────────────

export async function getMpImportedIds(userId: string): Promise<Set<string>> {
  const docRef = doc(db, "settings", userId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return new Set();
  const ids: string[] = snap.data()?.mpImportedIds ?? [];
  return new Set(ids);
}

export async function addMpImportedId(userId: string, mpId: string): Promise<void> {
  const docRef = doc(db, "settings", userId);
  await updateDoc(docRef, { mpImportedIds: arrayUnion(mpId) });
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
  filters?: { month?: number; year?: number; type?: string; categoryId?: string; from?: Date }
): Promise<Transaction[]> {
  const constraints: QueryConstraint[] = [where("userId", "==", userId)];

  if (filters?.type) {
    constraints.push(where("type", "==", filters.type));
  }

  // When a month/year is given, let Firestore filter by date range instead of
  // pulling the whole collection and filtering client-side. `from` bounds an
  // open-ended history window (e.g. last 12 months for reports).
  const month = filters?.month;
  const year = filters?.year;
  const hasMonthRange = month !== undefined && year !== undefined;

  if (hasMonthRange) {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 1, 0, 0, 0, 0); // first day of next month
    constraints.push(where("date", ">=", Timestamp.fromDate(start)));
    constraints.push(where("date", "<", Timestamp.fromDate(end)));
  } else if (filters?.from) {
    constraints.push(where("date", ">=", Timestamp.fromDate(filters.from)));
  }

  constraints.push(orderBy("date", "desc"));

  // Only cap the fully-unbounded query; month range and `from` are already bounded.
  if (!hasMonthRange && !filters?.from) {
    constraints.push(limit(300));
  }

  const q = query(collection(db, "transactions"), ...constraints);
  const snap = await getDocs(q);
  let transactions = snap.docs.map((d) => serializeDoc<Transaction>({ id: d.id, data: () => d.data() }));

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
  batch.set(settingsRef, {
    totalXP: increment(XP_VALUES.transaction)
  }, { merge: true });

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
    batch.set(settingsRef, {
      totalXP: increment(-XP_VALUES.transaction)
    }, { merge: true });
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
  batch.set(settingsRef, {
    totalXP: increment(XP_VALUES.budget)
  }, { merge: true });

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
    batch.set(settingsRef, {
      totalXP: increment(-XP_VALUES.budget)
    }, { merge: true });
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
  batch.set(settingsRef, {
    totalXP: increment(XP_VALUES.goal)
  }, { merge: true });

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
    batch.set(settingsRef, {
      totalXP: increment(-XP_VALUES.goal)
    }, { merge: true });
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

/**
 * Genera la transacción de una ocurrencia recurrente usando un ID determinístico
 * (`reglaId_YYYYMMDD`). Al ser determinístico, dos ejecuciones simultáneas (dos
 * pestañas/dispositivos) o un reintento apuntan al MISMO documento en vez de crear
 * un duplicado. Devuelve true solo si realmente creó una ocurrencia nueva.
 */
async function createRecurringOccurrence(
  userId: string,
  rule: RecurringTransaction,
  date: Date
): Promise<boolean> {
  const dateKey = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const docId = `${rule.id}_${dateKey}`;
  const docRef = doc(db, "transactions", docId);

  // Si ya existe, no reescribimos ni volvemos a sumar XP: es la garantía de idempotencia.
  const existing = await getDoc(docRef);
  if (existing.exists()) return false;

  const batch = writeBatch(db);
  batch.set(docRef, {
    userId,
    type: rule.type,
    amount: rule.amount,
    description: rule.description,
    categoryId: rule.categoryId,
    date: Timestamp.fromDate(date),
    tags: ["recurrente"],
    isRecurring: true,
    recurringId: rule.id,
    notes: "",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  batch.set(doc(db, "settings", userId), {
    totalXP: increment(XP_VALUES.transaction),
  }, { merge: true });
  await batch.commit();
  return true;
}

export async function processRecurringTransactions(userId: string): Promise<number> {
  const recurring = await getRecurringTransactions(userId);
  const now = new Date();
  let created = 0;

  for (const rule of recurring) {
    let nextDate = new Date(rule.nextDate);

    while (nextDate <= now) {
      const wasCreated = await createRecurringOccurrence(userId, rule, nextDate);
      if (wasCreated) created++;
      nextDate = getNextRecurringDate(nextDate, rule.frequency);
    }

    if (nextDate.getTime() !== new Date(rule.nextDate).getTime()) {
      await updateRecurringTransaction(rule.id, { nextDate });
    }
  }

  return created;
}

// ─── Facturas ARCA ────────────────────────────────────────────────────────────

export interface Factura {
  id: string;
  nroFactura: number;
  ptoVenta: number;
  fecha: Date;
  clienteNombre: string;
  clienteDoc: string;
  clienteDocTipo: number; // 80=CUIT, 96=DNI
  condicionIva: number;   // 5=Consumidor Final, etc
  concepto: string;
  conceptoTipo: number;   // 1=Prod, 2=Serv, 3=Ambos
  fchServDesde?: string;
  fchServHasta?: string;
  fchVtoPago?: string;
  importe: number;
  cae: string;
  vencimientoCae: string; // YYYYMMDD
  transactionId?: string;
  createdAt: Date;
}

export type CreateFacturaInput = Omit<Factura, "id" | "createdAt">;

export async function createFactura(userId: string, data: CreateFacturaInput): Promise<string> {
  const ref = collection(db, "facturas", userId, "items");
  const docRef = await addDoc(ref, {
    ...data,
    fecha: Timestamp.fromDate(data.fecha instanceof Date ? data.fecha : new Date(data.fecha)),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getFacturas(userId: string): Promise<Factura[]> {
  const ref = collection(db, "facturas", userId, "items");
  const q = query(ref, orderBy("fecha", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      nroFactura: data.nroFactura,
      ptoVenta: data.ptoVenta,
      fecha: data.fecha instanceof Timestamp ? data.fecha.toDate() : new Date(data.fecha),
      clienteNombre: data.clienteNombre,
      clienteDoc: data.clienteDoc,
      clienteDocTipo: data.clienteDocTipo,
      condicionIva: data.condicionIva ?? 5,
      concepto: data.concepto,
      conceptoTipo: data.conceptoTipo ?? 2,
      fchServDesde: data.fchServDesde,
      fchServHasta: data.fchServHasta,
      fchVtoPago: data.fchVtoPago,
      importe: data.importe,
      cae: data.cae,
      vencimientoCae: data.vencimientoCae,
      transactionId: data.transactionId,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    };
  });
}
