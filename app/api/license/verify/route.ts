import { NextRequest, NextResponse } from 'next/server';

// Server-side in-memory cache for standalone deployments without external DB configured
const serverRegistrationStore: Record<string, { trialStartDate: string; activeLicenseCode?: string; licenseDaysLeft?: number }> = {};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userIdentifier, licenseCode, action } = (body || {}) as {
      userIdentifier?: string;
      licenseCode?: string;
      action?: string;
    };

    const cleanIdentifier = (userIdentifier || 'default_user').trim().toLowerCase();
    const now = new Date();

    // Check if Supabase or external database is configured in environment
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let trialStartDate = new Date();
    let activeLicenseCode = licenseCode?.trim() || undefined;

    // If Supabase API key is configured, perform remote query
    if (supabaseUrl && supabaseKey) {
      try {
        const supaRes = await fetch(`${supabaseUrl}/rest/v1/licenses?user_id=eq.${encodeURIComponent(cleanIdentifier)}`, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });
        if (supaRes.ok) {
          const supaText = await supaRes.text();
          let rows: any[] = [];
          try {
            const parsed = supaText ? JSON.parse(supaText) : [];
            if (Array.isArray(parsed)) rows = parsed;
          } catch {
            rows = [];
          }
          if (rows && rows.length > 0) {
            trialStartDate = new Date(rows[0].created_at);
            if (rows[0].active_license) {
              activeLicenseCode = rows[0].active_license;
            }
          } else {
            // Register new user in Supabase
            await fetch(`${supabaseUrl}/rest/v1/licenses`, {
              method: 'POST',
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({
                user_id: cleanIdentifier,
                created_at: now.toISOString(),
              }),
            });
          }
        }
      } catch (err) {
        console.warn('Supabase remote query failed, falling back to server verification logic:', err);
      }
    } else {
      // In-Memory / Local Server Fallback Store
      if (!serverRegistrationStore[cleanIdentifier]) {
        serverRegistrationStore[cleanIdentifier] = {
          trialStartDate: now.toISOString(),
        };
      }
      trialStartDate = new Date(serverRegistrationStore[cleanIdentifier].trialStartDate);
      if (serverRegistrationStore[cleanIdentifier].activeLicenseCode) {
        activeLicenseCode = serverRegistrationStore[cleanIdentifier].activeLicenseCode;
      }
    }

    // Process License Code activation if provided
    let licenseActive = false;
    let licenseDaysLeft = 0;

    if (activeLicenseCode && activeLicenseCode.startsWith('LIC-PRO-')) {
      licenseActive = true;
      licenseDaysLeft = 60;

      // Update server store
      if (serverRegistrationStore[cleanIdentifier]) {
        serverRegistrationStore[cleanIdentifier].activeLicenseCode = activeLicenseCode;
      }

      // If Supabase is configured, update license record remotely
      if (supabaseUrl && supabaseKey && action === 'activate') {
        try {
          await fetch(`${supabaseUrl}/rest/v1/licenses?user_id=eq.${encodeURIComponent(cleanIdentifier)}`, {
            method: 'PATCH',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              active_license: activeLicenseCode,
              license_updated_at: now.toISOString(),
            }),
          });
        } catch (e) {
          console.error('Error updating Supabase license record:', e);
        }
      }
    }

    // Calculate trial days passed from server timestamp
    const diffMs = now.getTime() - trialStartDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const trialDaysMax = 15;
    const trialDaysLeft = Math.max(0, trialDaysMax - diffDays);
    const isExpired = !licenseActive && trialDaysLeft <= 0;

    return NextResponse.json({
      success: true,
      userIdentifier: cleanIdentifier,
      trialStartDate: trialStartDate.toISOString(),
      licenseActive,
      licenseDaysLeft: licenseActive ? licenseDaysLeft : 0,
      trialDaysLeft,
      isExpired,
      databaseConfigured: !!(supabaseUrl && supabaseKey),
      message: licenseActive
        ? 'Licencia Comercial de 60 Días verificada exitosamente en el servidor remoto.'
        : isExpired
        ? 'El Período de Evaluación Gratuito de 15 días ha expirado en el servidor remoto.'
        : `Período de prueba activo: restan ${trialDaysLeft} día(s) calculados desde el servidor.`,
    });
  } catch (err: any) {
    console.error('Error verifying remote license:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Error al validar la licencia con el servidor remoto.',
      },
      { status: 500 }
    );
  }
}
