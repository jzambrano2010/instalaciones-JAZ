import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { extractJsonFromModelText } from '@/lib/safe-json';

export const maxDuration = 60;

function isAuthKeyError(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  const status = err?.status ?? err?.code;
  return (
    status === 401 ||
    status === 403 ||
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('permission_denied') ||
    msg.includes('unauthenticated')
  );
}

function formatGeminiError(err: any): { status: number; message: string } {
  const raw = String(err?.message || err || '');
  const lower = raw.toLowerCase();
  const code = Number(err?.status || err?.code || 0);

  if (isAuthKeyError(err)) {
    return {
      status: 401,
      message:
        'Clave API de Google Gemini inválida o sin permisos. Si cargaste una clave personal en la Pestaña 6, borrala o actualizala; si ejecutás fuera de AI Studio, verificá GEMINI_API_KEY en las variables de entorno del servidor.',
    };
  }
  if (code === 429 || lower.includes('quota') || lower.includes('resource_exhausted') || lower.includes('rate limit')) {
    return {
      status: 429,
      message:
        'Se alcanzó el límite temporal de consultas (cuota) de Google Gemini. Esperá unos segundos y volvé a intentarlo.',
    };
  }
  if (code === 404 || lower.includes('not_found') || lower.includes('is not found for api version')) {
    return {
      status: 400,
      message:
        'El modelo de Gemini configurado no está habilitado para la API Key utilizada. Verificá los permisos de tu clave de Google AI Studio.',
    };
  }
  return {
    status: 500,
    message: raw || 'Error analizando planos con IA',
  };
}

export async function POST(req: NextRequest) {
  try {
    const customApiKey = (req.headers.get('x-gemini-api-key') || '').trim();
    const serverApiKey = (process.env.GEMINI_API_KEY || '').trim();
    const apiKeyToUse = customApiKey || serverApiKey;

    if (!apiKeyToUse) {
      return NextResponse.json(
        {
          error:
            'No hay ninguna clave GEMINI_API_KEY configurada en el servidor ni en el navegador. Si desplegaste la app fuera de AI Studio (por ej. Vercel), configurá la variable de entorno GEMINI_API_KEY o ingresá tu clave personal en la Pestaña 6.',
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { images, hint, pixelsPerMeter } = (body || {}) as {
      images?: string[];
      hint?: string;
      pixelsPerMeter?: number;
    };

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No se enviaron imágenes del plano' }, { status: 400 });
    }

    // Limit to max 4 images to prevent payload issues
    const selectedImages = images
      .slice(0, 4)
      .filter((b64) => typeof b64 === 'string' && b64.trim().length > 0);

    if (selectedImages.length === 0) {
      return NextResponse.json({ error: 'Las imágenes del plano están vacías o corruptas.' }, { status: 400 });
    }

    const imageParts = selectedImages.map((b64: string) => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: b64,
      },
    }));

    const promptText = `Sos un Ingeniero Electricista especializado en las normas AEA 90364-7-770, Ley Provincial de Seguridad Eléctrica de Córdoba N° 10281 y Reglamentaciones de EPEC (Córdoba).
Analizá minuciosamente la(s) imagen(es) provista(s) del plano arquitectónico y eléctrico de la vivienda.

Información adicional de escala:
${pixelsPerMeter ? `Escala calibrada en el visor: ${pixelsPerMeter.toFixed(2)} píxeles por metro.` : 'Escala no calibrada manualmente, estimar dimensiones estándar en base a cotas o aperturas (puertas ~0.8m - 0.9m).'}
Indicaciones del usuario: ${hint || 'Ninguna'}.

Tu objetivo es identificar de manera precisa por cada planta, sector o Tablero Seccional (TS1, TS2, TS3, TS4, etc. alimentados desde un Tablero Central TCE):
1. Nombre del sector o planta (ej. "Planta Baja - TS1", "Planta Alta - TS2", "Quincho - TS3", "Sector 4 - TS4").
2. Código del Tablero Seccional si figura en el plano ("TS1", "TS2", "TS3", "TS4", etc.). Si no figura, asignar correlativamente "TS1", "TS2", etc.
3. Color identificador en el plano (colorTag) si el plano diferencia cada tablero seccional, ambiente o tendido mediante colores (ej. "Rojo", "Azul", "Verde", "Amarillo", "Naranja", "Violeta", "Celeste"). Buscá referencias/leyendas de colores o trazos de colores en el dibujo para agrupar exactamente las bocas de cada TS según su color.
4. Distancia estimada en metros desde el Tablero Central (TCE) hasta dicho Tablero Seccional (ej. 12, 18, 25).
5. Cantidad de bocas de luz en techo (centros IUG) pertenecientes a ese tablero/color - Mínimo 1 si hay ambientes dibujados.
6. Cantidad de bocas de luz en pared (apliques IUG) pertenecientes a ese tablero/color.
7. Cantidad de tomacorrientes generales (TUG - cajas rectangulares 10x5) pertenecientes a ese tablero/color.
8. Cantidad de tomas de uso especial para Aire Acondicionado (AAc) pertenecientes a ese tablero/color.
9. Cantidad de tomas para Lavarropas / Lavadero (LAV) pertenecientes a ese tablero/color.
10. Otras cargas especiales (TUE, termoeléctrico, bomba de agua, etc.) y su potencia en W.
11. Cantidad de módulos de llaves de punto.
12. Cantidad de módulos de tomacorrientes.
13. Cantidad de tapas para cajas rectangulares y octogonales.
14. Cantidad de cajas octogonales de derivación y paso.
15. Superficie cubierta en m² para esa planta/sector (Estimación realista en m², ej: 65.5).
16. Largo estimado de cañerías en metros para esa planta/sector.
17. Una breve nota técnica con observaciones del plano (incluyendo qué color corresponde a cada tablero).

IMPORTANTE: Si el plano distingue múltiples tableros seccionales (TS1, TS2, TS3, TS4) por zonas o POR COLORES alimentados desde un TCE, devolvé un objeto separado en 'floors' para cada TS respetando exactamente las bocas de su color, su código 'boardCode' y su 'colorTag'. Estimá valores mayores a 0 para bocas de luz (techo), tomacorrientes y superficie medida m².

Devolvé la respuesta estrictamente en formato JSON que cumpla con el esquema.`;

    const executeAnalysis = async (key: string) => {
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
        contents: {
          parts: [{ text: promptText }, ...imageParts],
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              floors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    boardCode: { type: Type.STRING },
                    colorTag: { type: Type.STRING },
                    feederLengthM: { type: Type.NUMBER },
                    techo: { type: Type.INTEGER },
                    pared: { type: Type.INTEGER },
                    tomas: { type: Type.INTEGER },
                    aa: { type: Type.INTEGER },
                    lav: { type: Type.INTEGER },
                    otros: { type: Type.INTEGER },
                    otrosW: { type: Type.INTEGER },
                    modPuntos: { type: Type.INTEGER },
                    modTomas: { type: Type.INTEGER },
                    tapas: { type: Type.INTEGER },
                    cajasOct: { type: Type.INTEGER },
                    measuredAreaM2: { type: Type.NUMBER },
                    estimatedConduitMeters: { type: Type.NUMBER },
                    nota: { type: Type.STRING },
                  },
                  required: ['name', 'techo', 'pared', 'tomas', 'aa', 'lav'],
                },
              },
              detectedComponentsSummary: {
                type: Type.STRING,
                description: 'Resumen ejecutivo de componentes eléctricos detectados',
              },
              recommendationAEA: {
                type: Type.STRING,
                description: 'Recomendación de grado de electrificación y tableros bajo norma AEA 770',
              },
            },
            required: ['floors'],
          },
        },
      });
    };

    let response;
    try {
      response = await executeAnalysis(apiKeyToUse);
    } catch (primaryErr: any) {
      if (customApiKey && serverApiKey && customApiKey !== serverApiKey && isAuthKeyError(primaryErr)) {
        console.warn('Custom Gemini API key rejected in analyze-blueprint, falling back to server GEMINI_API_KEY.');
        response = await executeAnalysis(serverApiKey);
      } else {
        throw primaryErr;
      }
    }

    const data = extractJsonFromModelText<{
      floors?: any[];
      detectedComponentsSummary?: string;
      recommendationAEA?: string;
    }>(response.text, { floors: [] });

    if (!data || !Array.isArray(data.floors) || data.floors.length === 0) {
      const detail = data?.detectedComponentsSummary
        ? ` Detalle detectado: ${data.detectedComponentsSummary}`
        : '';
      return NextResponse.json(
        {
          error: `No se pudieron identificar ambientes ni bocas eléctricas en la imagen cargada.${detail} Verificá que el archivo sea un plano arquitectónico/eléctrico legible.`,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error in analyze-blueprint API:', err);
    const formatted = formatGeminiError(err);
    return NextResponse.json({ error: formatted.message }, { status: formatted.status });
  }
}


