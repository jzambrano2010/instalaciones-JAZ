'use client';

import React, { useState } from 'react';
import { ShieldCheck, UserCheck, KeyRound, Sparkles, MessageSquare, CreditCard } from 'lucide-react';

export default function LicenseTab() {
  const [role, setRole] = useState<'profesional' | 'administrador'>('profesional');
  const [licenseActive, setLicenseActive] = useState<boolean>(false);
  const [licenseDaysLeft, setLicenseDaysLeft] = useState<number>(60);
  const [trialDaysLeft] = useState<number>(30);
  const [inputCode, setInputCode] = useState<string>('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const applyLicense = () => {
    const trimmed = inputCode.trim();
    if (trimmed.startsWith('LIC-PRO-')) {
      setLicenseActive(true);
      setLicenseDaysLeft(60);
      alert('¡Licencia Comercial de 60 Días Activada con Éxito!');
    } else {
      alert('Código de licencia no válido. Verificá el formato enviado por el Administrador.');
    }
  };

  const generateAdminCode = () => {
    const code =
      'LIC-PRO-' +
      Math.random().toString(36).substring(2, 8).toUpperCase() +
      '-2026';
    setGeneratedCode(code);
  };

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
      const response = await fetch('/api/gemini/verify-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': customApiKey || '',
        },
        body: JSON.stringify({ apiKey: customApiKey }),
      });

      const data = await response.json();
      if (data.success) {
        setKeyMessage('✅ ' + data.message);
      } else {
        setKeyMessage('❌ Error: ' + (data.error || 'Clave inválida.'));
      }
    } catch (err: any) {
      setKeyMessage('❌ Error al conectar con el servidor: ' + err.message);
    } finally {
      setIsTestingKey(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* License Status Overview Card */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 bg-purple-100 text-purple-900 border border-purple-300 rounded-md text-xs font-semibold uppercase tracking-wider">
              Estado de la Suscripción
            </span>
            <h2 className="text-xl font-bold text-[#0f2b48] mt-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-800" />
              {licenseActive ? 'Licencia Comercial Habilitada' : 'Período de Evaluación Gratuito'}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Plataforma habilitada para emisión de documentación técnica y carpetas ERSeP / Ley 10281.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-right font-mono">
            <span className="text-xs text-slate-500 block font-medium">Días restantes de validez</span>
            <span className="text-2xl font-black text-emerald-800">
              {licenseActive ? `${licenseDaysLeft} días` : `${trialDaysLeft} días`}
            </span>
          </div>
        </div>
      </div>

      {/* NEW: Gemini API Key Setup Card for Standalone Distribution */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-extrabold text-[#0f2b48] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-700" />
            Configuración de Clave API Key de Gemini (Procesamiento IA)
          </h3>
          <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
            apiKeySaved ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-slate-100 text-slate-700 border border-slate-300'
          }`}>
            {apiKeySaved ? 'Clave Personal Activa' : 'Utilizando Clave Servidor'}
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Para que las funciones de <strong>Análisis con Inteligencia Artificial</strong> de planos y la <strong>Búsqueda de Precios Web</strong> funcionen al distribuir la app o usarla fuera del entorno de desarrollo, cargá tu clave API Key de Google Gemini.
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

          <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-200">
            <strong className="text-slate-800 font-bold block">¿Cómo obtener tu clave API Key gratuita?</strong>
            <ol className="list-decimal pl-5 space-y-0.5">
              <li>
                Ingresá a Google AI Studio: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-800 underline font-bold">aistudio.google.com/app/apikey</a>
              </li>
              <li>Iniciá sesión con tu cuenta de Google.</li>
              <li>Hacé clic en el botón azul <strong>&quot;Create API Key&quot;</strong> y copiá la clave generada.</li>
              <li>Pegala en el campo superior y hacé clic en <strong>&quot;Guardar API Key&quot;</strong>.</li>
            </ol>
          </div>
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
