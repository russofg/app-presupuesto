/**
 * Write operations for the assistant, mirroring the app's own service layer so
 * agent-created data is indistinguishable from data the user enters by hand.
 *
 * createTransactionForOwner replicates src/lib/services/firestore.ts →
 * createTransaction: it writes the transaction doc and bumps settings.totalXP by
 * XP_VALUES.transaction in a single atomic commit, and validates with the app's
 * own Zod schema (createTransactionSchema) as the source of truth.
 */

import { createTransactionSchema, paymentMethodsByType, type Category, type PaymentMethod } from "@/types";
import { listCollection, commitBatch, newDocId } from "@/lib/agent/firestore-rest";
import { dateOnlyUtc } from "@/lib/agent/time";
import { XP_VALUES } from "@/lib/gamification";

export class AgentRequestError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = "AgentRequestError";
  }
}

export interface CreatedTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  categoryId: string;
  category: string;
  date: string;
  tags: string[];
  paymentMethod?: PaymentMethod;
  notes?: string;
}

/**
 * Resolves a category from the request: prefer an explicit categoryId, otherwise
 * match by name (exact, then unique partial), always constrained to the same
 * type as the transaction — the app never lets an income use an expense category.
 */
function resolveCategory(
  categories: Category[],
  body: Record<string, unknown>,
  type: "income" | "expense"
): Category {
  const ofType = categories.filter((c) => c.type === type);
  const optionsMsg = `Opciones de ${type}: ${ofType.map((c) => c.name).join(", ") || "(ninguna)"}`;

  if (typeof body.categoryId === "string" && body.categoryId) {
    const c = categories.find((cat) => cat.id === body.categoryId);
    if (!c) throw new AgentRequestError(`categoryId no existe. ${optionsMsg}`);
    if (c.type !== type) {
      throw new AgentRequestError(`La categoría '${c.name}' es de tipo ${c.type}, no ${type}.`);
    }
    return c;
  }

  const raw = typeof body.category === "string" ? body.category.trim() : "";
  if (!raw) throw new AgentRequestError(`Falta la categoría. ${optionsMsg}`);

  const name = raw.toLowerCase();
  const exact = ofType.filter((c) => c.name.toLowerCase() === name);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) throw new AgentRequestError(`Categoría ambigua '${raw}'. ${optionsMsg}`);

  const partial = ofType.filter((c) => c.name.toLowerCase().includes(name));
  if (partial.length === 1) return partial[0];

  throw new AgentRequestError(`No encontré la categoría '${raw}'. ${optionsMsg}`);
}

export async function createTransactionForOwner(
  ownerUid: string,
  body: Record<string, unknown>
): Promise<CreatedTransaction> {
  const type = body.type;
  if (type !== "income" && type !== "expense") {
    throw new AgentRequestError("type debe ser 'income' o 'expense'.");
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AgentRequestError("amount debe ser un número positivo.");
  }

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) throw new AgentRequestError("description es obligatoria.");

  const categories = (await listCollection("categories", {
    filters: [{ field: "userId", op: "EQUAL", value: ownerUid }],
    orderBy: null,
  })) as unknown as Category[];
  const category = resolveCategory(categories, body, type);

  const date = dateOnlyUtc(typeof body.date === "string" ? body.date : null);

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string").slice(0, 10)
    : [];

  let paymentMethod: PaymentMethod | undefined;
  if (body.paymentMethod !== undefined && body.paymentMethod !== null) {
    const pm = body.paymentMethod as PaymentMethod;
    if (!paymentMethodsByType[type].includes(pm)) {
      throw new AgentRequestError(
        `paymentMethod inválido para ${type}. Opciones: ${paymentMethodsByType[type].join(", ")}.`
      );
    }
    paymentMethod = pm;
  }

  const notes = typeof body.notes === "string" ? body.notes.slice(0, 500) : undefined;

  // Validate with the app's own schema as the source of truth.
  const parsed = createTransactionSchema.safeParse({
    type,
    amount,
    description,
    categoryId: category.id,
    date,
    paymentMethod,
    tags,
    isRecurring: false,
    notes,
  });
  if (!parsed.success) {
    throw new AgentRequestError("Datos inválidos: " + parsed.error.issues.map((i) => i.message).join("; "));
  }

  // Build the document exactly like the app's createTransaction (cleanData drops
  // undefined), then write it and bump XP atomically.
  const now = new Date();
  const id = newDocId();
  const data: Record<string, unknown> = {
    type,
    amount,
    description,
    categoryId: category.id,
    date,
    tags,
    isRecurring: false,
    userId: ownerUid,
    createdAt: now,
    updatedAt: now,
  };
  if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
  if (notes !== undefined) data.notes = notes;

  await commitBatch([
    { kind: "set", path: `transactions/${id}`, data },
    { kind: "increment", path: `settings/${ownerUid}`, field: "totalXP", by: XP_VALUES.transaction },
  ]);

  return {
    id,
    type,
    amount,
    description,
    categoryId: category.id,
    category: category.name,
    date: date.toISOString(),
    tags,
    paymentMethod,
    notes,
  };
}
