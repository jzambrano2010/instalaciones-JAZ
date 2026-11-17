import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { message, history, customApiKey } = (body || {}) as {
      message?: string;
      history?: any[];
      customApiKey?: string;
    };
    if (!message || !String(message).trim()) {
      return NextResponse.json({ error: "La consulta no puede estar vacía." }, { status: 400 });
    }

    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "No se encontró una clave API válida." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const systemInstruction = `
      Eres el Asistente Técnico Experto de ElectroPlan AR. Tu misión es asesorar a profesionales sobre la Reglamentación AEA 90364-7-770 (Viviendas), la Ley de Seguridad Eléctrica N° 10281 (Córdoba) y normativas de EPEC.
      
      Debes responder consultas sobre:
      1. Aspectos Generales: Grados de electrificación, DPMS, cantidad de circuitos, ubicación de tableros.
      2. Detalles de Instalación: Tipos de canalizaciones (PVC, Hierro, Flexible), ocupación de bocas, distancias de seguridad entre tomas y fuentes de agua/gas.
      3. Dimensionamiento: Sección de cables según Iz/Ib, caída de tensión (ΔV), selección de térmicas y diferenciales.
      4. Puesta a Tierra: Jabalinas, cámaras de inspección, sección de conductor PE, valores de resistencia permitidos.
      5. Trámites ERSeP: Requisitos para el Certificado de Aptitud Eléctrica (CIE).

      Instrucciones de Respuesta:
      - Sé extremadamente preciso. Cita artículos específicos si es posible (ej: AEA 770.10.3).
      - Si el usuario plantea un escenario (ej: "tengo un living de 30m2"), haz el cálculo rápido y dile cuántas bocas de IUG y TUG necesita.
      - Usa formato Markdown para que la respuesta sea legible (listas, negritas).
      - Tu tono es de un colega ingeniero senior: profesional, directo y servicial.
    `;

    const chat = ai.chats.create({
      model: "gemini-4-hydrogen",
      config: {
        systemInstruction,
      },
      history: history || [],
    });

    const result = await chat.sendMessage({
      message: message,
    });

    return NextResponse.json({
      text: result.text,
      history: [
        ...(history || []),
        { role: "user", parts: [{ text: message }] },
        { role: "model", parts: [{ text: result.text }] },
      ],
    });
  } catch (error: any) {
    console.error("Error en el consultor IA:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
