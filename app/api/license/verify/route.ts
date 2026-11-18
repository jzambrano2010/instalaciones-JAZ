import { NextRequest, NextResponse } from 'next/server';
import {
  createSupabaseServerClient,
  computeLicenseSummary,
  isSchemaMissingError,
  OWNER_ADMIN_EMAIL,
} from '@/lib/supabase';

const serverRegistrationStore: Record<
  string,
  { trialStartDate: string; activeLicenseCode?: string; licenseExpiresAt?: string }
> = {};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userIdentifier, licenseCode, action } = (body || {}) as {
      userIdentifier?: string;
      licenseCode?: string;
      action?: string;
    };

    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';

    const supabase = createSupabaseServerClient(bearerToken || undefined);
    const now = new Date();
    const nowIso = now.toISOString();

    // If user is authenticated via Supabase Auth JWT
    if (bearerToken) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(bearerToken);

      if (!userError && user) {
        let profileRow: any = null;
        let schemaReady = true;

        const { data: existingProfile, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profErr) {
          if (isSchemaMissingError(profErr)) {
            schemaReady = false;
          }
        } else if (existingProfile) {
          profileRow = existingProfile;
        } else {
          // Insert initial profile row for authenticated user
          const cleanEmail = (user.email || '').toLowerCase();
          const role = cleanEmail === OWNER_ADMIN_EMAIL ? 'administrador' : 'profesional';
          const { data: inserted, error: insErr } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || '',
              matricula: user.user_metadata?.matricula || '',
              role,
              trial_started_at: user.user_metadata?.trial_started_at || user.created_at || nowIso,
              license_status: 'trial',
            })
            .select('*')
            .single();

          if (!insErr && inserted) {
            profileRow = inserted;
          } else if (isSchemaMissingError(insErr)) {
            schemaReady = false;
          }
        }

        const trimmedCode = (licenseCode || '').trim();
        if (action === 'activate' && trimmedCode.startsWith('LIC-PRO-')) {
          const expiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

          if (schemaReady) {
            // Optional check against license_codes table if populated
            const { data: codeRecord, error: codeErr } = await supabase
              .from('license_codes')
              .select('code, duration_days, redeemed_by, is_active')
              .eq('code', trimmedCode)
              .maybeSingle();

            let durationDays = 60;
            if (!codeErr && codeRecord) {
              if (!codeRecord.is_active || (codeRecord.redeemed_by && codeRecord.redeemed_by !== user.id)) {
                return NextResponse.json(
                  {
                    success: false,
                    error: 'Este código de licencia ya fue utilizado o está inactivo.',
                  },
                  { status: 400 }
                );
              }
              durationDays = codeRecord.duration_days || 60;
              await supabase
                .from('license_codes')
                .update({ redeemed_by: user.id, redeemed_at: nowIso, is_active: false })
                .eq('code', trimmedCode);
            }

            const calcExpiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
            const { data: updatedProf, error: updErr } = await supabase
              .from('profiles')
              .update({
                license_status: 'active',
                license_code: trimmedCode,
                license_activated_at: nowIso,
                license_expires_at: calcExpiresAt,
                updated_at: nowIso,
              })
              .eq('id', user.id)
              .select('*')
              .single();

            if (!updErr && updatedProf) {
              profileRow = updatedProf;
            }
          } else {
            profileRow = {
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || '',
              matricula: user.user_metadata?.matricula || '',
              role:
                (user.email || '').toLowerCase() === OWNER_ADMIN_EMAIL
                  ? 'administrador'
                  : 'profesional',
              trial_started_at: user.user_metadata?.trial_started_at || user.created_at || nowIso,
              license_status: 'active',
              license_code: trimmedCode,
              license_activated_at: nowIso,
              license_expires_at: expiresAt,
            };
          }
        }

        const summary = computeLicenseSummary(profileRow, user);
        return NextResponse.json({
          success: true,
          authenticated: true,
          userId: user.id,
          userIdentifier: user.email || user.id,
          role: summary.role,
          trialStartDate: summary.trialStartDate,
          licenseActive: summary.licenseActive,
          licenseDaysLeft: summary.licenseDaysLeft,
          trialDaysLeft: summary.trialDaysLeft,
          isExpired: summary.isExpired,
          licenseCode: summary.licenseCode,
          licenseExpiresAt: summary.licenseExpiresAt,
          databaseConfigured: true,
          schemaReady,
          message: summary.licenseActive
            ? `Licencia Comercial activa (${summary.licenseDaysLeft} días restantes) sincronizada en Supabase.`
            : summary.isExpired
            ? 'Tu período de evaluación gratuito de 15 días ha finalizado. Activá una licencia comercial.'
            : `Cuenta verificada en Supabase · Período de prueba activo: restan ${summary.trialDaysLeft} día(s).`,
        });
      }
    }

    // Anonymous / pre-login fallback
    const cleanIdentifier = (userIdentifier || 'invitado').trim().toLowerCase();
    if (!serverRegistrationStore[cleanIdentifier]) {
      serverRegistrationStore[cleanIdentifier] = { trialStartDate: nowIso };
    }
    const record = serverRegistrationStore[cleanIdentifier];

    const trimmedCode = (licenseCode || '').trim();
    if (action === 'activate' && trimmedCode.startsWith('LIC-PRO-')) {
      record.activeLicenseCode = trimmedCode;
      record.licenseExpiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
    }

    const trialMs = now.getTime() - new Date(record.trialStartDate).getTime();
    const diffDays = Math.floor(trialMs / (1000 * 60 * 60 * 24));
    const trialDaysLeft = Math.max(0, 15 - diffDays);
    const licenseActive = !!record.activeLicenseCode;

    return NextResponse.json({
      success: true,
      authenticated: false,
      userIdentifier: cleanIdentifier,
      role: 'profesional',
      trialStartDate: record.trialStartDate,
      licenseActive,
      licenseDaysLeft: licenseActive ? 60 : 0,
      trialDaysLeft,
      isExpired: !licenseActive && trialDaysLeft <= 0,
      databaseConfigured: true,
      schemaReady: true,
      message: licenseActive
        ? 'Licencia activada localmente. Iniciá sesión con tu cuenta para guardarla en Supabase.'
        : `Modo invitado (${trialDaysLeft} días de evaluación). Iniciá sesión o registrate para sincronizar con Supabase.`,
    });
  } catch (err: any) {
    console.error('Error verifying remote license:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Error al validar la licencia con el servidor remoto.',
      },
      { status: 500 }
    );
  }
}
