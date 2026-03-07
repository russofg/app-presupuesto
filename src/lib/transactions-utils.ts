import type { Transaction } from "@/types";

/**
 * Transacciones creadas por "Cubrir déficit con ahorros" no son ingresos reales:
 * son movimientos internos (retiro de meta → cubrir gastos). No deben sumar a ingresos.
 */
const DEFICIT_COVER_PREFIX = "Cubrir déficit con ";

export function isRealTransaction(t: Transaction): boolean {
  return !t.description.startsWith(DEFICIT_COVER_PREFIX);
}

export function filterRealTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.filter(isRealTransaction);
}
