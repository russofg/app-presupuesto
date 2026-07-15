import { NextResponse } from "next/server";
import { getArcaCredentials } from "@/lib/arca-utils";
import { getWSAAToken } from "@/lib/arca-wsaa";
import { getLastVoucher } from "@/lib/arca-wsfe";

export async function GET() {
  try {
    const { cert, key, cuit, ptoVenta, production } = getArcaCredentials();

    // Step 1: Authenticate with ARCA WSAA (direct, no third party)
    const { token, sign } = await getWSAAToken("wsfe", cert, key, production, cuit);

    // Step 2: Get last issued voucher number (tipo 11 = Factura C)
    const lastVoucher = await getLastVoucher(cuit, ptoVenta, 11, token, sign, production);

    return NextResponse.json({
      ultimoNumero: lastVoucher,
      proximoNumero: lastVoucher + 1,
      ptoVenta,
      production,
    });
  } catch (err: any) {
    console.error("[ARCA ultimo-numero] ERROR:", err?.message);
    if (err?.response?.data) {
      console.error("[ARCA ultimo-numero] ARCA response:", err.response.data);
    }
    return NextResponse.json({ error: err?.message ?? "Error" }, { status: 500 });
  }
}
