/**
 * Suma `n` meses a una fecha sin el bug de overflow de `Date.setMonth`.
 * Ej: 31 de enero + 1 mes → 28/29 de febrero (no 3 de marzo). Si el día no
 * existe en el mes destino, se recorta al último día de ese mes.
 */
export function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1); // evita el overflow al cambiar de mes
  d.setMonth(d.getMonth() + n);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}
