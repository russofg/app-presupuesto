import type { Transaction } from "@/types";

/**
 * Cubrir/devolver déficit ya NO crea transacciones (ajusta la meta + settings
 * dentro de una transacción de Firestore), así que no hay movimientos internos
 * que excluir. Estas funciones quedan como passthrough para no filtrar por error
 * una transacción real del usuario cuya descripción arranque con cierto texto.
 */
export function isRealTransaction(_t: Transaction): boolean {
  return true;
}

export function filterRealTransactions(transactions: Transaction[]): Transaction[] {
  return transactions;
}
