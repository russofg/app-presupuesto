import { NextResponse } from "next/server";

const MP_API_BASE = "https://api.mercadopago.com";

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
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  // Current month date range
  const now = new Date();
  const beginOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const headers = { Authorization: `Bearer ${accessToken}` };

  try {
    // Get current user ID
    const meRes = await fetch(`${MP_API_BASE}/users/me`, { headers });
    if (!meRes.ok) {
      const err = await meRes.text();
      return NextResponse.json({ error: `Error al obtener usuario MP: ${err}` }, { status: meRes.status });
    }
    const me = await meRes.json();
    const myUserId = String(me.id);

    // Fetch current-month payments
    const paymentsUrl = `${MP_API_BASE}/v1/payments/search?sort=date_created&criteria=desc&limit=${limit}&begin_date=${beginOfMonth}&end_date=${endOfMonth}`;
    const paymentsRes = await fetch(paymentsUrl, { headers });

    if (!paymentsRes.ok) {
      const err = await paymentsRes.text();
      return NextResponse.json({ error: `Error MP: ${err}` }, { status: paymentsRes.status });
    }

    const data = await paymentsRes.json();
    const results = data.results ?? [];

    const movements = results
      .filter((p: any) => p.status === "approved")
      .map((p: any) => {
        const collectorId = String(p.collector_id ?? p.collector?.id ?? "");
        const isIncome = collectorId === myUserId;
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
        };
      });

    const month = now.toLocaleString("es-AR", { month: "long", year: "numeric" });

    return NextResponse.json({
      movements,
      total: data.paging?.total ?? movements.length,
      month,
    });
  } catch (error) {
    console.error("MercadoPago API Error:", error);
    return NextResponse.json(
      { error: "Error al conectar con MercadoPago." },
      { status: 500 }
    );
  }
}
