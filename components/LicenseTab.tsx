'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Sparkles,
  CreditCard,
  Database,
  RefreshCw,
  LogOut,
  Users,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  CalendarPlus,
  Ban,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Session, User } from '@supabase/supabase-js';
import { safeFetchJson } from '@/lib/safe-json';
import {
  getSupabaseBrowserClient,
  isSchemaMissingError,
  computeLicenseSummary,
  UserLicenseProfile,
  SUPABASE_SETUP_SQL,
  OWNER_ADMIN_EMAIL,
} from '@/lib/supabase';
import AuthPanel from '@/components/AuthPanel';

interface LicenseTabProps {
  session?: Session | null;
  onUserUpdated?: () => void;
}

export default function LicenseTab({ session: externalSession, onUserUpdated }: LicenseTabProps) {
  const [internalSession, setInternalSession] = useState<Session | null>(externalSession ?? null);
  const session = externalSession !== undefined ? externalSession : internalSession;
  const user: User | null = session?.user ?? null;

  const [role, setRole] = useState<'profesional' | 'administrador'>('profesional');
  const [licenseActive, setLicenseActive] = useState<boolean>(false);
  const [licenseDaysLeft, setLicenseDaysLeft] = useState<number>(0);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(15);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [schemaReady, setSchemaReady] = useState<boolean>(true);
  const [remoteMessage, setRemoteMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const [inputCode, setInputCode] = useState<string>('');
  const [activatingCode, setActivatingCode] = useState<boolean>(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Admin client list state
  const [clients, setClients] = useState<UserLicenseProfile[]>([]);
  const [loadingClients, setLoadingClients] = useState<boolean>(false);
  const [clientFilter, setClientFilter] = useState<string>('');
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);

  // SQL Setup helper state
  const [showSqlHelper, setShowSqlHelper] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Listen to Supabase auth if externalSession wasn't provided
  useEffect(() => {
    if (externalSession !== undefined) return;
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setInternalSession(data.session ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setInternalSession(nextSession ?? null);
    });
    return () => subscription.unsubscribe();
  }, [externalSession]);

  const loadClientsList = useCallback(async () => {
    if (!user) return;
    const isAdminUser =
      role === 'administrador' || (user.email || '').toLowerCase() === OWNER_ADMIN_EMAIL;
    if (!isAdminUser) return;

    setLoadingClients(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (isSchemaMissingError(error)) {
          setSchemaReady(false);
        } else {
          setAdminFeedback('No se pudo cargar la lista de clientes: ' + error.message);
        }
        return;
      }
      setSchemaReady(true);
      setClients((data || []) as UserLicenseProfile[]);
    } finally {
      setLoadingClients(false);
    }
  }, [user, role]);

  // Verify license against server + Supabase
  const verifyRemoteLicense = useCallback(
    async (codeToActivate?: string) => {
      setIsVerifying(true);
      if (codeToActivate) setActivatingCode(true);
      setRemoteMessage(null);

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const result = await safeFetchJson('/api/license/verify', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            userIdentifier: user?.email || 'invitado',
            licenseCode: codeToActivate || undefined,
            action: codeToActivate ? 'activate' : 'verify',
          }),
        });

        const data = result.data;
        if (result.ok && data?.success) {
          setLicenseActive(Boolean(data.licenseActive));
          setLicenseDaysLeft(Number(data.licenseDaysLeft) || 0);
          setTrialDaysLeft(Number(data.trialDaysLeft) ?? 15);
          setIsExpired(Boolean(data.isExpired));
          if (data.role === 'administrador' || data.role === 'profesional') {
            setRole(data.role);
          }
          if (typeof data.schemaReady === 'boolean') {
            setSchemaReady(data.schemaReady);
          }
          setRemoteMessage(data.message);

          // Persist activation backup inside Supabase user_metadata as well
          if (codeToActivate && user) {
            const supabase = getSupabaseBrowserClient();
            const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
            await supabase.auth.updateUser({
              data: {
                license_status: 'active',
                license_code: codeToActivate,
                license_expires_at: expiresAt,
              },
            });
            if (onUserUpdated) onUserUpdated();
          }
        } else if (result.isHtml) {
          const fallback = computeLicenseSummary(null, user);
          setLicenseActive(fallback.licenseActive);
          setLicenseDaysLeft(fallback.licenseDaysLeft);
          setTrialDaysLeft(fallback.trialDaysLeft);
          setIsExpired(fallback.isExpired);
          setRole(fallback.role);
          setRemoteMessage('Validación en modo local activa (sin respuesta JSON del proxy remoto).');
        } else {
          setRemoteMessage(
            '❌ Error de verificación: ' + (result.error || data?.error || 'No se pudo contactar al servidor.')
          );
        }
      } catch (err: any) {
        setRemoteMessage(
          '❌ Error al conectar con el servidor remoto: ' + (err?.message || 'Error desconocido')
        );
      } finally {
        setIsVerifying(false);
        setActivatingCode(false);
      }
    },
    [session, user, onUserUpdated]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      verifyRemoteLicense();
    }, 0);
    return () => clearTimeout(timer);
  }, [verifyRemoteLicense]);

  useEffect(() => {
    if (user && (role === 'administrador' || (user.email || '').toLowerCase() === OWNER_ADMIN_EMAIL)) {
      const timer = setTimeout(() => {
        loadClientsList();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, role, loadClientsList]);

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setClients([]);
    setRemoteMessage('Sesión cerrada correctamente.');
    if (onUserUpdated) onUserUpdated();
  };

  const applyLicense = async () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!user) {
      setRemoteMessage('⚠️ Iniciá sesión o registrate primero para vincular la licencia a tu cuenta.');
      return;
    }
    if (!trimmed.startsWith('LIC-PRO-')) {
      setRemoteMessage(
        '❌ Código de licencia no válido. Verificá el formato provisto por el Administrador (Ej: LIC-PRO-XXXXXX-2026).'
      );
      return;
    }
    await verifyRemoteLicense(trimmed);
    setInputCode('');
  };

  const generateAdminCode = async () => {
    const code =
      'LIC-PRO-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-2026';
    setGeneratedCode(code);
    setAdminFeedback(null);

    if (user && schemaReady) {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('license_codes').insert({
        code,
        duration_days: 60,
        created_by: user.id,
        is_active: true,
      });
      if (error) {
        if (isSchemaMissingError(error)) {
          setSchemaReady(false);
        } else {
          setAdminFeedback('Código generado localmente (no se pudo guardar en tabla license_codes): ' + error.message);
        }
      } else {
        setAdminFeedback(`Código ${code} guardado en Supabase listo para entregar al cliente.`);
      }
    }
  };

  const handleAdminUpdateClientLicense = async (
    client: UserLicenseProfile,
    actionType: 'activate60' | 'revoke'
  ) => {
    setAdminFeedback(null);
    const supabase = getSupabaseBrowserClient();
    const now = new Date();
    const expires60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const updatePayload =
      actionType === 'activate60'
        ? {
            license_status: 'active',
            license_code: client.license_code || `LIC-PRO-ADMIN-${now.getFullYear()}`,
            license_activated_at: now.toISOString(),
            license_expires_at: expires60,
            updated_at: now.toISOString(),
          }
        : {
            license_status: 'expired',
            license_expires_at: now.toISOString(),
            updated_at: now.toISOString(),
          };

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', client.id);

    if (error) {
      setAdminFeedback('❌ Error al actualizar cliente: ' + error.message);
      return;
    }

    setAdminFeedback(
      actionType === 'activate60'
        ? `✅ Licencia de ${client.email} activada por 60 días en Supabase.`
        : `⚠️ Licencia de ${client.email} marcada como expirada.`
    );
    await loadClientsList();
    if (client.id === user?.id) {
      verifyRemoteLicense();
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      // Fallback ignored
    }
  };

  // Gemini API Key state
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('electroplan_custom_api_key') || '';
    }
    return '';
  });
  const [apiKeySaved, setApiKeySaved] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('electroplan_custom_api_key');
    }
    return false;
  });
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);

  const saveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setKeyMessage('⚠️ Ingresá una clave API Key válida (ej: AIzaSy...).');
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('electroplan_custom_api_key', trimmed);
    }
    setApiKeySaved(true);
    setKeyMessage('¡Clave API Key guardada exitosamente en el navegador!');
  };

  const clearApiKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('electroplan_custom_api_key');
    }
    setApiKeyInput('');
    setApiKeySaved(false);
    setKeyMessage('Clave personal eliminada. Se utilizará la clave del servidor si está disponible.');
  };

  const testApiKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed && !apiKeySaved) {
      setKeyMessage('⚠️ Ingresá o guardá primero tu clave API Key para realizar la prueba.');
      return;
    }

    setIsTestingKey(true);
    setKeyMessage(null);

    try {
      const customApiKey =
        trimmed || (typeof window !== 'undefined' ? localStorage.getItem('electroplan_custom_api_key') : '');
      const result = await safeFetchJson('/api/gemini/verify-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': customApiKey || '',
        },
        body: JSON.stringify({ apiKey: customApiKey }),
      });

      const data = result.data;
      if (result.ok && data?.success) {
        setKeyMessage('✅ ' + data.message);
      } else {
        setKeyMessage('❌ Error: ' + (result.error || data?.error || 'Clave inválida.'));
      }
    } catch (err: any) {
      setKeyMessage('❌ Error al conectar con el servidor: ' + (err?.message || 'Error de conexión'));
    } finally {
      setIsTestingKey(false);
    }
  };

  const isAdmin =
    role === 'administrador' || (user?.email || '').toLowerCase() === OWNER_ADMIN_EMAIL;

  const filteredClients = clients.filter((c) => {
    const q = clientFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.email || '').toLowerCase().includes(q) ||
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.matricula || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 text-slate-900">
      {/* 1. Public Authentication / Account Card */}
      {!user ? (
        <div className="bg-white border-2 border-[#0f2b48] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#0f2b48] flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-700" />
                Acceso de Clientes y Registro Público (Supabase Auth)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Creá tu cuenta gratuita o iniciá sesión para guardar tus proyectos en la base de datos y gestionar tu licencia profesional.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded text-[11px] font-bold">
              Supabase Conectado
            </span>
          </div>
          <AuthPanel compact onAuthSuccess={() => verifyRemoteLicense()} />
        </div>
      ) : (
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-purple-100 text-purple-900 border border-purple-300 rounded-md text-xs font-semibold uppercase tracking-wider">
                  Cuenta Autenticada
                </span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold border bg-emerald-100 text-emerald-900 border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Supabase Auth Activo
                </span>
                {isAdmin && (
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold border bg-amber-100 text-amber-900 border-amber-300">
                    Administrador
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold text-[#0f2b48] mt-2 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-800" />
                {licenseActive
                  ? `Licencia Comercial Habilitada (${licenseDaysLeft} días)`
                  : isExpired
                  ? 'Período Gratuito Expirado'
                  : `Período de Evaluación Gratuito (${trialDaysLeft} días restantes)`}
              </h2>
              <p className="text-xs text-slate-700 mt-1 font-medium">
                Usuario: <strong>{user.user_metadata?.full_name || user.email}</strong> ({user.email})
                {user.user_metadata?.matricula ? ` · Matrícula: ${user.user_metadata.matricula}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-right font-mono">
                <span className="text-xs text-slate-500 block font-medium">Validez restante</span>
                <span className={`text-2xl font-black ${isExpired ? 'text-red-600' : 'text-emerald-800'}`}>
                  {licenseActive ? `${licenseDaysLeft} días` : `${trialDaysLeft} días`}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => verifyRemoteLicense()}
                  disabled={isVerifying}
                  className="px-3 py-1.5 bg-[#0f2b48] hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                  Actualizar Estado
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>

          {remoteMessage && (
            <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-300">
              {remoteMessage}
            </div>
          )}
        </div>
      )}

      {/* 2. SQL Schema Notice (only emphasized when tables don't exist yet, or toggleable for Admin) */}
      {(!schemaReady || isAdmin) && (
        <div
          className={`rounded-xl p-4 border shadow-xs space-y-3 ${
            !schemaReady ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-300'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {!schemaReady ? (
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
              ) : (
                <Database className="w-4 h-4 text-blue-700 shrink-0" />
              )}
              <div>
                <h3 className="text-sm font-extrabold text-[#0f2b48]">
                  {!schemaReady
                    ? 'Falta inicializar las tablas SQL en tu proyecto Supabase'
                    : 'Esquema SQL de Supabase (Tablas profiles, projects y license_codes)'}
                </h3>
                <p className="text-xs text-slate-700">
                  {!schemaReady
                    ? 'Auth ya funciona, pero para persistir proyectos y gestionar licencias desde la base de datos ejecutá este script una sola vez en Supabase -> SQL Editor.'
                    : 'Script SQL con tablas y políticas Row Level Security (RLS) configurado para este proyecto.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySql}
                className="px-3 py-1.5 bg-[#0f2b48] hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? '¡SQL Copiado!' : 'Copiar SQL'}
              </button>
              <button
                type="button"
                onClick={() => setShowSqlHelper((prev) => !prev)}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1"
              >
                {showSqlHelper ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showSqlHelper ? 'Ocultar SQL' : 'Ver SQL'}
              </button>
            </div>
          </div>

          {showSqlHelper && (
            <pre className="bg-slate-900 text-slate-100 font-mono text-[11px] p-3 rounded-lg overflow-x-auto max-h-64">
              {SUPABASE_SETUP_SQL}
            </pre>
          )}
        </div>
      )}

      {/* 3. Commercial License Activation (For Professionals / Logged-in Users) */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-extrabold text-[#0f2b48] flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-800" />
          Activar Licencia Comercial (60 Días - $ 20.000.- ARS)
        </h3>
        <div className="text-xs text-slate-700 leading-relaxed space-y-1">
          <p>
            Para renovar o ampliar la licencia comercial por 60 días, podés abonar mediante transferencia electrónica y enviar el comprobante por WhatsApp para recibir tu código:
          </p>
          <p className="bg-slate-50 p-2.5 rounded border border-slate-300 text-slate-900 font-medium">
            Titular: <strong>Jimena Zambrano</strong> | Alias MP: <strong>jime.z.mp</strong> | WhatsApp Soporte:{' '}
            <strong>+54 9 3525 50-9715</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Ingresá el código de licencia provisto (Ej: LIC-PRO-XXXXXX-2026)"
            className="flex-1 min-w-[240px] px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-600"
          />
          <button
            onClick={applyLicense}
            disabled={activatingCode}
            className="px-5 py-2 bg-purple-800 hover:bg-purple-900 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {activatingCode ? 'Activando...' : 'Aplicar Licencia'}
          </button>
        </div>
      </div>

      {/* 4. Admin License Management Dashboard (Visible for Admins) */}
      {isAdmin && (
        <div className="bg-white border-2 border-purple-700 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-[#0f2b48] flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-800" />
                Panel de Administración de Clientes y Licencias
              </h3>
              <p className="text-xs text-slate-600">
                Generá códigos de activación comercial y gestioná directamente el vencimiento de cada cuenta registrada en Supabase.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={generateAdminCode}
                className="px-4 py-2 bg-purple-800 hover:bg-purple-900 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Generar Código (60 Días)
              </button>
              <button
                onClick={loadClientsList}
                disabled={loadingClients}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs rounded-lg flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingClients ? 'animate-spin' : ''}`} />
                Refrescar
              </button>
            </div>
          </div>

          {generatedCode && (
            <div className="p-3 bg-purple-50 border border-purple-300 rounded-lg text-xs font-mono text-purple-900 font-bold select-all flex items-center justify-between">
              <span>
                Código generado (60 días): <strong>{generatedCode}</strong>
              </span>
            </div>
          )}

          {adminFeedback && (
            <div className="p-2.5 rounded-lg text-xs font-semibold bg-slate-50 border border-slate-300 text-slate-800">
              {adminFeedback}
            </div>
          )}

          {schemaReady && (
            <div className="space-y-3">
              <input
                type="text"
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                placeholder="Buscar cliente por email, nombre o matrícula..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#0f2b48] text-white">
                    <tr>
                      <th className="px-3 py-2">Profesional</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Matrícula</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Restante</th>
                      <th className="px-3 py-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                          {loadingClients ? 'Cargando cuentas desde Supabase...' : 'No hay cuentas registradas que coincidan.'}
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map((client) => {
                        const summary = computeLicenseSummary(client, null);
                        return (
                          <tr key={client.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-bold text-slate-900">
                              {client.full_name || 'Sin nombre'}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-700">{client.email}</td>
                            <td className="px-3 py-2 text-slate-700">{client.matricula || '—'}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  summary.licenseActive
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : summary.isExpired
                                    ? 'bg-red-100 text-red-900'
                                    : 'bg-blue-100 text-blue-900'
                                }`}
                              >
                                {summary.licenseActive
                                  ? 'Activa (60d)'
                                  : summary.isExpired
                                  ? 'Expirada'
                                  : 'Prueba (15d)'}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono font-bold">
                              {summary.licenseActive
                                ? `${summary.licenseDaysLeft} d`
                                : `${summary.trialDaysLeft} d`}
                            </td>
                            <td className="px-3 py-2 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => handleAdminUpdateClientLicense(client, 'activate60')}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold inline-flex items-center gap-1"
                              >
                                <CalendarPlus className="w-3 h-3" />
                                +60 Días
                              </button>
                              <button
                                onClick={() => handleAdminUpdateClientLicense(client, 'revoke')}
                                className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-900 border border-red-300 rounded text-[11px] font-bold inline-flex items-center gap-1"
                              >
                                <Ban className="w-3 h-3" />
                                Expirar
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Gemini API Key Setup Card */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-extrabold text-[#0f2b48] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-700" />
            Clave API Key Personal de Google Gemini
          </h3>
          <span
            className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
              apiKeySaved
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}
          >
            {apiKeySaved ? 'Clave Personal Configurada' : 'Opcional / Servidor Activo'}
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Cada usuario puede utilizar su propia clave API Key de Google Gemini para análisis de planos por visión de IA y búsqueda de precios web. La clave se guarda localmente en tu navegador.
        </p>

        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="text-xs text-slate-800 font-bold block mb-1">
              Clave API Key de Google Gemini (Google AI Studio)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Pegá tu API Key de Gemini aquí (Ej: AIzaSy...)"
                className="flex-1 min-w-[260px] px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600 font-medium"
              />

              <button
                onClick={saveApiKey}
                className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                Guardar API Key
              </button>

              <button
                onClick={testApiKey}
                disabled={isTestingKey}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg border border-slate-300 transition-colors disabled:opacity-50"
              >
                {isTestingKey ? 'Probando...' : 'Probar Conexión'}
              </button>

              {apiKeySaved && (
                <button
                  onClick={clearApiKey}
                  className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-900 font-bold text-xs rounded-lg border border-red-300 transition-colors"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>

          {keyMessage && (
            <div className="p-2.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-800">
              {keyMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
