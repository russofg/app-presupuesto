import { NextResponse } from "next/server";

const MP_API_BASE = "https://api.mercadopago.com";

// Maps MercadoPago operation types to app categories
function mapOperationType(type: string): string {
  const map: Record<string, string> = {
    regular_payment: "Compras",
    money_transfer: "Transferencia",
    pos_payment: "Comercio",
    investment_income: "Inversiones",
    recurring_payment: "Suscripciones",
    mp_express: "MercadoPago",
    account_fund: "Recarga MP",
    checkout_pro: "Compra Online",
  };
  return map[type] ?? "MercadoPago";
}

export async function GET(request: Request) {
  const accessToken = process.env.MP_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json(
      { error: "MP_ACCESS_TOKEN no configurado en .env.local" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "30", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    // First, get the current user's own ID
    const meRes = await fetch(`${MP_API_BASE}/v1/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!meRes.ok) {
      const err = await meRes.text();
      return NextResponse.json({ error: `Error al obtener usuario MP: ${err}` }, { status: meRes.status });
    }

    const me = await meRes.json();
    const myUserId = String(me.id);

    // Fetch recent payments
    const paymentsRes = await fetch(
      `${MP_API_BASE}/v1/payments/search?sort=date_created&criteria=desc&limit=${limit}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!paymentsRes.ok) {
      const err = await paymentsRes.text();
      return NextResponse.json({ error: `Error MP: ${err}` }, { status: paymentsRes.status });
    }

    const data = await paymentsRes.json();
    const results = data.results ?? [];

    const movements = results
      .filter((p: any) => p.status === "approved")
      .map((p: any) => {
        const payerId = String(p.payer?.id ?? "");
        const collectorId = String(p.collector_id ?? p.collector?.id ?? "");
        const isIncome = collectorId === myUserId;
        const isExpense = payerId === myUserId;

        return {
          id: String(p.id),
          date: p.date_approved ?? p.date_created,
          amount: p.transaction_amount,
          currency: p.currency_id ?? "ARS",
          description: p.description || p.payment_method_id || "Movimiento MP",
          type: isIncome ? "income" : "expense",
          operationType: p.operation_type,
          category: mapOperationType(p.operation_type),
          payerName: p.payer?.first_name
            ? `${p.payer.first_name} ${p.payer.last_name ?? ""}`.trim()
            : p.payer?.email ?? "–",
          status: p.status,
          rawIsIncome: isIncome,
          rawIsExpense: isExpense,
        };
      });

    return NextResponse.json({
      movements,
      total: data.paging?.total ?? movements.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("MercadoPago API Error:", error);
    return NextResponse.json(
      { error: "Error al conectar con MercadoPago." },
      { status: 500 }
    );
  }
}
