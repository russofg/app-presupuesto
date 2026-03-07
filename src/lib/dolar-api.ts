const API_URL = "https://dolarapi.com/v1/dolares";

export interface DolarRate {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
  variacion?: number;
}

export async function fetchDolarRates(): Promise<DolarRate[]> {
  const res = await fetch(API_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Error al obtener cotizaciones");
  return res.json();
}

export function getRateByCasa(rates: DolarRate[], casa: string): DolarRate | undefined {
  return rates.find((r) => r.casa === casa);
}
