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
            'No se encontró clave GEMINI_API_KEY. Ingresá tu clave en la Pestaña 6 (Licencias y Configuración) o configurá tu clave API.',
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

    const { images, hint, pixelsPerMeter } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No se enviaron imágenes del plano' }, { status: 400 });
    }

    // Limit to max 4 images to prevent payload issues
    const selectedImages = images.slice(0, 4);

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

Tu objetivo es identificar de manera precisa por cada planta/piso (Planta Baja, Planta Alta, Quincho, etc.):
1. Nombre de la planta ("Planta Baja", "Planta Alta", etc.)
2. Cantidad de bocas de luz en techo (centros IUG) - Mínimo 1 si hay ambientes dibujados.
3. Cantidad de bocas de luz en pared (apliques IUG)
4. Cantidad de tomacorrientes generales (TUG - cajas rectangulares 10x5) - Mínimo estimar según ambientes.
5. Cantidad de tomas de uso especial para Aire Acondicionado (AAc)
6. Cantidad de tomas para Lavarropas / Lavadero (LAV)
7. Otras cargas especiales (TUE, termoeléctrico, bomba de agua, etc.) y su potencia en W.
8. Cantidad de módulos de llaves de punto
9. Cantidad de módulos de tomacorrientes
10. Cantidad de tapas para cajas rectangulares y octogonales
11. Cantidad de cajas octogonales de derivación y paso
12. Superficie cubierta en m² para esa planta (Estimación realista en m², ej: 65.5).
13. Largo estimado de cañerías en metros para esa planta.
14. Una breve nota técnica con observaciones del plano.

IMPORTANTE: Estimá valores mayores a 0 para bocas de luz (techo), tomacorrientes y superficie medida m², basados en la distribución visible del plano.

Devolvé la respuesta estrictamente en formato JSON que cumpla con el esquema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          parts: [
            { text: promptText },
            ...imageParts,
          ],
        },
      ],
      config: {
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

    const jsonStr = (response.text || '{}').trim();
    const data = JSON.parse(jsonStr);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error in analyze-blueprint API:', err);
    return NextResponse.json(
      { error: err.message || 'Error analizando planos con IA' },
      { status: 500 }
    );
  }
}

