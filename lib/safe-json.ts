export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('<')) return fallback;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

export function extractJsonFromModelText<T = Record<string, unknown>>(
  raw: string | null | undefined,
  fallback: T
): T {
  if (!raw || typeof raw !== 'string') return fallback;
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

export interface SafeFetchJsonResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  isHtml: boolean;
  error: string | null;
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<SafeFetchJsonResult<T>> {
  try {
    const res = await fetch(input, init);
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const rawText = await res.text();
    const trimmed = rawText.trim();
    const looksLikeHtml =
      trimmed.startsWith('<!') ||
      trimmed.startsWith('<html') ||
      trimmed.startsWith('<HTML') ||
      contentType.includes('text/html');

    if (looksLikeHtml) {
      return {
        ok: false,
        status: res.status,
        data: null,
        isHtml: true,
        error: `El servidor respondió con una página HTML (HTTP ${res.status}). Si abriste un enlace de desarrollo o expirado, utilizá el enlace compartido actualizado o recargá la página.`,
      };
    }

    if (!trimmed) {
      return {
        ok: res.ok,
        status: res.status,
        data: null,
        isHtml: false,
        error: res.ok ? null : `Respuesta vacía del servidor (HTTP ${res.status}).`,
      };
    }

    try {
      const parsed = JSON.parse(trimmed) as T;
      const errMsg =
        parsed && typeof parsed === 'object' && 'error' in parsed && typeof (parsed as any).error === 'string'
          ? (parsed as any).error
          : null;
      return {
        ok: res.ok,
        status: res.status,
        data: parsed,
        isHtml: false,
        error: res.ok ? errMsg : errMsg || `Error del servidor (HTTP ${res.status}).`,
      };
    } catch {
      return {
        ok: false,
        status: res.status,
        data: null,
        isHtml: false,
        error: `La respuesta del servidor no tiene formato JSON válido (HTTP ${res.status}).`,
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      isHtml: false,
      error: err?.message || 'Error de red al intentar contactar con el servidor.',
    };
  }
}
