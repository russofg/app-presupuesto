export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: "income" | "expense";
  original: Record<string, string>;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  format: "mercadopago" | "generic";
  errors: string[];
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export function parseCSV(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { transactions: [], format: "generic", errors: ["El archivo está vacío o no tiene datos."] };
  }

  const separator = detectSeparator(lines[0]);
  const headers = parseLine(lines[0], separator).map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line, separator);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i]?.trim() ?? "";
    });
    return row;
  });

  if (isMercadoPagoFormat(headers)) {
    return parseMercadoPago(rows);
  }

  return parseGeneric(rows, headers);
}

// ─── Mercado Pago ────────────────────────────────────────────────────────────

const MP_DATE_KEYS = ["fecha", "date", "fecha de creación", "fecha_creacion"];
const MP_DESC_KEYS = ["descripción", "descripcion", "description", "detalle", "concepto", "motivo"];
const MP_AMOUNT_KEYS = ["monto", "amount", "importe", "valor"];
const MP_STATUS_KEYS = ["estado", "status"];

function isMercadoPagoFormat(headers: string[]): boolean {
  const joined = headers.join(" ");
  return (
    (joined.includes("monto") || joined.includes("importe")) &&
    (joined.includes("fecha") || joined.includes("date")) &&
    (joined.includes("descripci") || joined.includes("detalle") || joined.includes("concepto"))
  );
}

function parseMercadoPago(rows: Record<string, string>[]): ParseResult {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const status = findValue(row, MP_STATUS_KEYS);
    if (status && !["aprobado", "approved", "acreditado", "completed", ""].includes(status.toLowerCase())) {
      continue;
    }

    const dateStr = findValue(row, MP_DATE_KEYS);
    const desc = findValue(row, MP_DESC_KEYS);
    const amountStr = findValue(row, MP_AMOUNT_KEYS);

    if (!dateStr || !amountStr) {
      errors.push(`Fila ${i + 2}: faltan datos obligatorios (fecha o monto)`);
      continue;
    }

    const date = parseDate(dateStr);
    if (!date) {
      errors.push(`Fila ${i + 2}: fecha no reconocida "${dateStr}"`);
      continue;
    }

    const amount = parseAmount(amountStr);
    if (amount === null || amount === 0) continue;

    transactions.push({
      date,
      description: desc || "Movimiento Mercado Pago",
      amount: Math.abs(amount),
      type: amount > 0 ? "income" : "expense",
      original: row,
    });
  }

  return { transactions, format: "mercadopago", errors };
}

// ─── Generic CSV ─────────────────────────────────────────────────────────────

const GENERIC_DATE_KEYS = ["fecha", "date", "dia", "day", "fecha operación", "fecha_operacion"];
const GENERIC_DESC_KEYS = ["descripción", "descripcion", "description", "concepto", "detalle", "referencia", "memo", "nota"];
const GENERIC_AMOUNT_KEYS = ["monto", "amount", "importe", "valor", "total", "débito", "crédito"];
const GENERIC_TYPE_KEYS = ["tipo", "type", "movimiento"];

function parseGeneric(rows: Record<string, string>[], headers: string[]): ParseResult {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  const hasDebitCredit = headers.some((h) => h.includes("débit") || h.includes("debit")) &&
                         headers.some((h) => h.includes("crédit") || h.includes("credit"));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const dateStr = findValue(row, GENERIC_DATE_KEYS);
    const desc = findValue(row, GENERIC_DESC_KEYS);
    let amountStr = findValue(row, GENERIC_AMOUNT_KEYS);
    const typeStr = findValue(row, GENERIC_TYPE_KEYS);

    if (!dateStr) {
      errors.push(`Fila ${i + 2}: falta la fecha`);
      continue;
    }

    const date = parseDate(dateStr);
    if (!date) {
      errors.push(`Fila ${i + 2}: fecha no reconocida "${dateStr}"`);
      continue;
    }

    let type: "income" | "expense" = "expense";

    if (hasDebitCredit) {
      const debitKey = headers.find((h) => h.includes("débit") || h.includes("debit")) ?? "";
      const creditKey = headers.find((h) => h.includes("crédit") || h.includes("credit")) ?? "";
      const debit = parseAmount(row[debitKey] ?? "");
      const credit = parseAmount(row[creditKey] ?? "");

      if (credit && credit > 0) {
        amountStr = String(credit);
        type = "income";
      } else if (debit && debit > 0) {
        amountStr = String(debit);
        type = "expense";
      }
    }

    if (!amountStr) {
      errors.push(`Fila ${i + 2}: falta el monto`);
      continue;
    }

    const amount = parseAmount(amountStr);
    if (amount === null || amount === 0) continue;

    if (!hasDebitCredit) {
      if (typeStr) {
        const t = typeStr.toLowerCase();
        type = (t.includes("ingreso") || t.includes("income") || t.includes("crédit") || t.includes("credit"))
          ? "income" : "expense";
      } else {
        type = amount > 0 ? "income" : "expense";
      }
    }

    transactions.push({
      date,
      description: desc || `Movimiento fila ${i + 2}`,
      amount: Math.abs(amount),
      type,
      original: row,
    });
  }

  return { transactions, format: "generic", errors };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findValue(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    for (const [k, v] of Object.entries(row)) {
      if (k.includes(key) || key.includes(k)) return v;
    }
  }
  return "";
}

function detectSeparator(header: string): string {
  const commas = (header.match(/,/g) ?? []).length;
  const semicolons = (header.match(/;/g) ?? []).length;
  const tabs = (header.match(/\t/g) ?? []).length;
  if (tabs >= commas && tabs >= semicolons) return "\t";
  if (semicolons > commas) return ";";
  return ",";
}

function parseLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((v) => v.replace(/^"|"$/g, "").trim());
}

function parseDate(str: string): Date | null {
  const cleaned = str.replace(/"/g, "").trim();

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
    const date = new Date(year, parseInt(m) - 1, parseInt(d));
    if (!isNaN(date.getTime())) return date;
  }

  // YYYY-MM-DD
  const ymdMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    if (!isNaN(date.getTime())) return date;
  }

  // ISO string or any parseable format
  const fallback = new Date(cleaned);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

function parseAmount(str: string): number | null {
  if (!str) return null;
  let cleaned = str.replace(/"/g, "").trim();
  cleaned = cleaned.replace(/[$€£R\$S\/]/g, "");
  cleaned = cleaned.replace(/\s/g, "");

  // Handle 1.234,56 format (Argentine/European)
  if (/^\-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }
  // Handle 1,234.56 format (US)
  else if (/^\-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, "");
  }
  // Handle simple comma decimal: 1234,56
  else {
    cleaned = cleaned.replace(",", ".");
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// ─── Auto-categorization ────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Comida": ["restaurant", "comida", "pizza", "burger", "café", "cafe", "delivery", "rappi", "pedidosya", "mcdonalds", "starbucks", "almuerzo", "cena", "supermercado", "mercado", "carrefour", "coto", "jumbo", "dia", "chino"],
  "Transporte": ["uber", "cabify", "nafta", "combustible", "estacionamiento", "peaje", "sube", "subte", "taxi", "didi", "gnc", "ypf", "shell", "axion"],
  "Compras": ["mercadolibre", "amazon", "tienda", "shop", "store", "compra", "falabella", "garbarino", "fravega", "musimundo"],
  "Entretenimiento": ["netflix", "spotify", "disney", "hbo", "youtube", "prime video", "cine", "teatro", "steam", "playstation", "xbox", "twitch"],
  "Servicios": ["edenor", "edesur", "metrogas", "telecom", "personal", "claro", "movistar", "fibertel", "cablevision", "flow", "internet", "luz", "gas", "agua", "aysa", "absa"],
  "Salud": ["farmacia", "farmacity", "medic", "doctor", "hospital", "osde", "swiss", "galeno", "prepaga", "salud"],
  "Educación": ["universidad", "escuela", "curso", "udemy", "coursera", "platzi", "libro", "educacion"],
  "Suscripciones": ["suscripcion", "subscription", "mensual", "plan", "premium", "pro"],
  "Sueldo": ["sueldo", "salario", "haberes", "aguinaldo", "bono", "premio"],
  "Freelance": ["freelance", "honorarios", "factura", "cobro", "transferencia recibida"],
};

export function suggestCategory(description: string, categories: { id: string; name: string }[]): string | null {
  const lower = description.toLowerCase();

  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      const match = categories.find((c) => c.name === catName);
      if (match) return match.id;
    }
  }

  return null;
}
