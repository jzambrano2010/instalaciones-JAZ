import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const customApiKey = req.headers.get('x-gemini-api-key');
    const { apiKey } = await req.json().catch(() => ({ apiKey: null }));
    const keyToTest = apiKey || customApiKey || process.env.GEMINI_API_KEY;

    if (!keyToTest) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó ninguna clave API Key para verificar.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: keyToTest,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Simple test call with flash model
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Respond ok',
    });

    if (response && response.text) {
      return NextResponse.json({
        success: true,
        message: 'Clave API Key válida y conectada con éxito a Gemini AI.',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'La API respondió sin contenido.' },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error('Error verifying Gemini API key:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Error al validar la clave API Key con los servidores de Google.',
      },
      { status: 400 }
    );
  }
}
