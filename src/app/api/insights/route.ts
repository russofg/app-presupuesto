import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// Initialize the Gemini SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
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
