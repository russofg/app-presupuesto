/**
 * Registry of the resources Maria can read through /api/agent/[resource].
 *
 * Maps a public, agent-friendly name to its Firestore collection and default
 * ordering. This is the single place that says "these are the collections the
 * agent may touch" — anything not listed here is rejected by the route. Writes
 * (create/update/delete) will extend these same entries in a later step.
 */

export interface ResourceConfig {
  collection: string;
  orderBy: { field: string; direction: "ASCENDING" | "DESCENDING" } | null;
  /** Query params (beyond userId) this resource understands, mirroring the app's own queries. */
  supportsMonthRange?: boolean;
  supportsMonthYearFields?: boolean;
  supportsType?: boolean;
}

export const READ_RESOURCES: Record<string, ResourceConfig> = {
  transactions: {
    collection: "transactions",
    orderBy: { field: "date", direction: "DESCENDING" },
    supportsMonthRange: true,
    supportsType: true,
  },
  categories: {
    collection: "categories",
    orderBy: { field: "order", direction: "ASCENDING" },
  },
  budgets: {
    collection: "budgets",
    orderBy: null,
    supportsMonthYearFields: true,
  },
  goals: {
    collection: "savingsGoals",
    orderBy: { field: "createdAt", direction: "DESCENDING" },
  },
  recurring: {
    collection: "recurringTransactions",
    orderBy: null,
  },
};

export function getResource(name: string): ResourceConfig | null {
  return Object.prototype.hasOwnProperty.call(READ_RESOURCES, name) ? READ_RESOURCES[name] : null;
}
