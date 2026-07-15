import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { verifyRequestAuth, AuthError } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    await verifyRequestAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "No autorizado" }, { status: err.status });
    }
    console.error("[insights] auth/init error:", err);
    return NextResponse.json(
      { error: "Auth no configurada", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY no configurada" }, { status: 500 });
    }
    const ai = new GoogleGenAI({ apiKey });

    const body = await request.json();
    const { totalIncome, totalExpenses, username } = body;

    const prompt = `
      Eres el asistente inteligente ("Copiloto Financiero") de una app premium llamada Financia.
      Tu objetivo es darle a ${username || 'el usuario'} un (1) solo consejo, comentario o advertencia muy breve (máximo 2 oraciones breves) sobre sus finanzas actuales.
      El tono debe ser elegante, hiper-profesional, sutil y vanguardista (estilo Apple/Awwwards).
      No uses saludos aburridos como "¡Hola!". Sé directo y astuto.

      Contexto financiero del mes:
      - Ingresó: $${totalIncome}
      - Gastó: $${totalExpenses}
      
      Analiza rápido la proporción de gasto vs ingreso y dale el insight (por ejemplo, si gastó más de lo que ingresó adviértele suavemente, si gastó poco felicítalo por su alta tasa de ahorro).

      Insight:
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return NextResponse.json({ insight: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "El motor de inteligencia artificial no está disponible." },
      { status: 500 }
    );
  }
}
