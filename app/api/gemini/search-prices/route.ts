import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { extractJsonFromModelText } from '@/lib/safe-json';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const customApiKey = (req.headers.get('x-gemini-api-key') || '').trim();
    const serverApiKey = (process.env.GEMINI_API_KEY || '').trim();
    const apiKeyToUse = customApiKey || serverApiKey;

    if (!apiKeyToUse) {
      return NextResponse.json(
        {
          error:
            'No hay clave GEMINI_API_KEY configurada en el servidor ni en el navegador. Configurá GEMINI_API_KEY en tu hosting o ingresá tu clave personal en la Pestaña 6.',
        },
        { status: 400 }
      );
    }

    const promptText = `Buscá estimaciones de precios de mercado actuales en Argentina (Mercado Libre Argentina / Easy / Distribuidores eléctricos) expresados en pesos argentinos ($ ARS) para los siguientes materiales de electricidad:
- Rollo de 100m Cable unipolar IRAM 1.5mm2
- Rollo de 100m Cable unipolar IRAM 2.5mm2
- Rollo de 100m Cable unipolar IRAM 4mm2
- Rollo de 100m Cable unipolar IRAM 6mm2
- Jabalina Puesta a Tierra Copperweld 1/2 x 1.5m con tomacable
- Interruptor Diferencial 2P 40A 30mA IRAM 2301
- Tira 25m Caño Corrugado Ignífugo 20mm (3/4")

Devolvé únicamente un objeto JSON con el valor numérico exacto aproximado para cada ítem.`;

    const runQuery = async (key: string) => {
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      return ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: promptText,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
    };

    let response;
    try {
      response = await runQuery(apiKeyToUse);
    } catch (primaryErr: any) {
      const msg = String(primaryErr?.message || '').toLowerCase();
      if (
        customApiKey &&
        serverApiKey &&
        customApiKey !== serverApiKey &&
        (msg.includes('api_key_invalid') || msg.includes('api key not valid') || msg.includes('permission_denied'))
      ) {
        response = await runQuery(serverApiKey);
      } else {
        throw primaryErr;
      }
    }

    const data = extractJsonFromModelText(response.text, {});

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error in search-prices API:', err);
    return NextResponse.json(
      { error: err.message || 'Error buscando precios web' },
      { status: 500 }
    );
  }
}

