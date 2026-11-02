import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const customApiKey = req.headers.get('x-gemini-api-key');
    const apiKeyToUse = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKeyToUse) {
      return NextResponse.json(
        {
          error:
            'No se encontró clave GEMINI_API_KEY. Ingresá tu clave en la Pestaña 6 (Licencias y Configuración).',
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: apiKeyToUse,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const promptText = `Buscá estimaciones de precios de mercado actuales en Argentina (Mercado Libre Argentina / Easy / Distribuidores eléctricos) expresados en pesos argentinos ($ ARS) para los siguientes materiales de electricidad:
- Rollo de 100m Cable unipolar IRAM 1.5mm2
- Rollo de 100m Cable unipolar IRAM 2.5mm2
- Rollo de 100m Cable unipolar IRAM 4mm2
- Rollo de 100m Cable unipolar IRAM 6mm2
- Jabalina Puesta a Tierra Copperweld 1/2 x 1.5m con tomacable
- Interruptor Diferencial 2P 40A 30mA IRAM 2301
- Tira 25m Caño Corrugado Ignífugo 20mm (3/4")

Devolvé únicamente un objeto JSON con el valor numérico exacto aproximado para cada ítem.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cable15: { type: Type.INTEGER },
            cable25: { type: Type.INTEGER },
            cable40: { type: Type.INTEGER },
            cable60: { type: Type.INTEGER },
            jabalina: { type: Type.INTEGER },
            diferencial: { type: Type.INTEGER },
            cano20: { type: Type.INTEGER },
          },
        },
      },
    });

    const jsonStr = (response.text || '{}').trim();
    const data = JSON.parse(jsonStr);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error in search-prices API:', err);
    return NextResponse.json(
      { error: err.message || 'Error buscando precios web' },
      { status: 500 }
    );
  }
}
