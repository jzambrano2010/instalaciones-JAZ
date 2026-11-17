'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, KeyRound, Sparkles, CreditCard, Database, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { safeFetchJson } from '@/lib/safe-json';

export default function LicenseTab() {
  const [role, setRole] = useState<'profesional' | 'administrador'>('profesional');
  const [userIdentifier, setUserIdentifier] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('electroplan_user_identifier') || '';
    }
    return '';
  });

  const [licenseActive, setLicenseActive] = useState<boolean>(false);
  const [licenseDaysLeft, setLicenseDaysLeft] = useState<number>(60);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(15);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [dbConfigured, setDbConfigured] = useState<boolean>(false);
  const [remoteMessage, setRemoteMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const [inputCode, setInputCode] = useState<string>('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Function to verify license/trial status with remote server API
  const verifyRemoteLicense = React.useCallback(async (codeToActivate?: string) => {
    setIsVerifying(true);
    setRemoteMessage(null);
    try {
      const result = await safeFetchJson('/api/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIdentifier: userIdentifier || 'instalador_default',
          licenseCode: codeToActivate || inputCode || undefined,
          action: codeToActivate ? 'activate' : 'verify',
        }),
      });

      const data = result.data;
      if (result.ok && data?.success) {
        setLicenseActive(data.licenseActive);
        setLicenseDaysLeft(data.licenseDaysLeft);
        setTrialDaysLeft(data.trialDaysLeft);
        setIsExpired(data.isExpired);
        setDbConfigured(data.databaseConfigured);
        setRemoteMessage(data.message);
      } else if (result.isHtml) {
        setRemoteMessage('Validación en modo local activa (sin respuesta JSON del proxy remoto).');
      } else {
        setRemoteMessage('❌ Error de verificación: ' + (result.error || data?.error || 'No se pudo contactar al servidor.'));
      }
    } catch (err: any) {
      setRemoteMessage('❌ Error al conectar con el servidor remoto: ' + (err?.message || 'Error desconocido'));
    } finally {
      setIsVerifying(false);
    }
  }, [userIdentifier, inputCode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      verifyRemoteLicense();
    }, 0);
    return () => clearTimeout(timer);
  }, [verifyRemoteLicense]);

  const saveUserIdentifier = () => {
    const trimmed = userIdentifier.trim();
    if (typeof window !== 'undefined') {
      localStorage.setItem('electroplan_user_identifier', trimmed);
    }
    verifyRemoteLicense();
  };

  const applyLicense = () => {
    const trimmed = inputCode.trim();
    if (trimmed.startsWith('LIC-PRO-')) {
      verifyRemoteLicense(trimmed);
      alert('¡Código de Licencia enviado para activación en el servidor remoto!');
    } else {
      alert('Código de licencia no válido. Verificá el formato provisto por el Administrador (Ej: LIC-PRO-XXXXXX-2026).');
    }
  };

  const generateAdminCode = () => {
    const code =
      'LIC-PRO-' +
      Math.random().toString(36).substring(2, 8).toUpperCase() +
      '-2026';
    setGeneratedCode(code);
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
      alert('Ingresá una clave API Key válida (ej: AIzaSy...).');
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
      alert('Ingresá o guardá primero tu clave API Key para realizar la prueba.');
      return;
    }

    setIsTestingKey(true);
    setKeyMessage(null);

    try {
      const customApiKey = trimmed || (typeof window !== 'undefined' ? localStorage.getItem('electroplan_custom_api_key') : '');
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

  return (
    <div className="space-y-6 text-slate-900">
      {/* License Status Overview Card */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-purple-100 text-purple-900 border border-purple-300 rounded-md text-xs font-semibold uppercase tracking-wider">
                Estado de la Suscripción
              </span>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                dbConfigured ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-blue-100 text-blue-900 border-blue-300'
              }`}>
                <Database className="w-3 h-3" />
                {dbConfigured ? 'Validación Remota en BD Supabase Activa' : 'Validación Remota Servidor Activa'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#0f2b48] mt-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-800" />
              {licenseActive
                ? 'Licencia Comercial Habilitada (60 Días)'
                : isExpired
                ? 'Período Gratuito Expirado'
                : 'Período de Evaluación Gratuito (15 Días)'}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Validación calculada de forma inalterable desde el servidor remoto para evitar reseteos locales.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-right font-mono">
              <span className="text-xs text-slate-500 block font-medium">Días restantes de validez</span>
              <span className={`text-2xl font-black ${isExpired ? 'text-red-600' : 'text-emerald-800'}`}>
                {licenseActive ? `${licenseDaysLeft} días` : `${trialDaysLeft} días`}
              </span>
            </div>
          </div>
        </div>

        {/* User CUIT / Identifier verification input */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex-1 min-w-[280px]">
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Identificador Único del Usuario / CUIT / Matrícula
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={userIdentifier}
                onChange={(e) => setUserIdentifier(e.target.value)}
                placeholder="Ej: CUIT 20-28491023-4 o email@profesional.com"
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-600 font-bold"
              />
              <button
                onClick={saveUserIdentifier}
                disabled={isVerifying}
                className="px-3 py-1.5 bg-[#0f2b48] hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                Verificar Servidor
              </button>
            </div>
          </div>

          {remoteMessage && (
            <div className="w-full text-xs font-semibold text-slate-800 bg-white p-2 rounded border border-slate-300">
              {remoteMessage}
            </div>
          )}
        </div>
      </div>

      {/* Database Connection Instructions Card */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-extrabold text-[#0f2b48] flex items-center gap-2 border-b border-slate-200 pb-2">
          <Database className="w-4 h-4 text-blue-700" />
          ¿Cómo conectar tu Base de Datos Remota (ej. Supabase) en Producción?
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Para conectar tu propia base de datos remota de <strong>Supabase</strong> (o PostgreSQL), simplemente configurá las variables de entorno en tu servidor de alojamiento (Vercel, Netlify o Cloud Run):
        </p>
        <div className="bg-slate-900 text-slate-100 font-mono text-xs p-3 rounded-lg space-y-1">
          <div><span className="text-amber-400">SUPABASE_URL</span>=https://xyz.supabase.co</div>
          <div><span className="text-amber-400">SUPABASE_ANON_KEY</span>=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</div>
        </div>
        <p className="text-[11px] text-slate-500 italic">
          * Si estas variables no se configuran, la aplicación utilizará automáticamente la validación por Servidor Backend Seguro sin requerir configuración adicional.
        </p>
      </div>

      {/* Gemini API Key Setup Card for Standalone Distribution */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-extrabold text-[#0f2b48] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-700" />
            Clave API Key Personal de Google Gemini (Requisito de Propiedad del Cliente)
          </h3>
          <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
            apiKeySaved ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
          }`}>
            {apiKeySaved ? 'Clave Personal Configurada' : 'Sin Clave Personal (Requerida)'}
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Cada cliente / usuario debe utilizar su <strong>propia clave API Key personal de Google Gemini</strong> para realizar el análisis de planos por visión de IA y la búsqueda de precios web. La clave se guarda de forma privada en tu navegador.
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

      {/* Role Switcher & Activation Panel */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-700 font-bold block mb-1">
              Seleccionar Rol de Usuario
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-purple-600 font-medium"
            >
              <option value="profesional">Profesional (Instalador / Proyectista)</option>
              <option value="administrador">Administrador del Sistema</option>
            </select>
          </div>

          {role === 'administrador' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-2">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-700" />
                Herramientas de Administrador
              </h4>
              <p className="text-xs text-slate-600">
                Generá nuevos códigos de activación comercial de 60 días para instaladores.
              </p>
              <button
                onClick={generateAdminCode}
                className="px-4 py-2 bg-purple-800 hover:bg-purple-900 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
              >
                Generar Código Licencia Paga (60 Días)
              </button>

              {generatedCode && (
                <div className="mt-2 p-2.5 bg-white border border-purple-300 rounded-lg text-xs font-mono text-purple-900 font-bold select-all">
                  Código generado: <strong>{generatedCode}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Commercial Activation info */}
        {role === 'profesional' && (
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-300 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-800" />
              Activar Licencia Comercial (60 Días - $ 20.000.- ARS)
            </h4>
            <div className="text-xs text-slate-700 leading-relaxed space-y-1">
              <p>
                Para renovar o ampliar la licencia comercial por 60 días, podés abonar mediante
                transferencia electrónica a la cuenta oficial de soporte:
              </p>
              <p className="bg-white p-2.5 rounded border border-slate-300 text-slate-900 font-medium">
                Titular: <strong>Jimena Zambrano</strong> | Alias MP: <strong>jime.z.mp</strong> |
                WhatsApp Soporte: <strong>+54 9 3525 50-9715</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Ingresá el código de licencia provisto (Ej: LIC-PRO-...)"
                className="flex-1 min-w-[240px] px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-600"
              />
              <button
                onClick={applyLicense}
                className="px-5 py-2 bg-purple-800 hover:bg-purple-900 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
              >
                Aplicar Licencia
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
