'use client';

import React, { useState } from 'react';
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User as UserIcon,
  Award,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient, isSchemaMissingError, OWNER_ADMIN_EMAIL } from '@/lib/supabase';

interface AuthPanelProps {
  onAuthSuccess?: (user: User) => void;
  compact?: boolean;
}

export default function AuthPanel({ onAuthSuccess, compact = false }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [matricula, setMatricula] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const ensureProfileRow = async (user: User, fallbackName?: string, fallbackMatricula?: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: existing, error: selErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (selErr) {
        if (!isSchemaMissingError(selErr)) {
          console.warn('No se pudo consultar profiles:', selErr.message);
        }
        return;
      }

      if (!existing) {
        const cleanEmail = (user.email || '').toLowerCase();
        const role = cleanEmail === OWNER_ADMIN_EMAIL ? 'administrador' : 'profesional';
        const { error: insErr } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email || '',
          full_name: fallbackName || user.user_metadata?.full_name || '',
          matricula: fallbackMatricula || user.user_metadata?.matricula || '',
          role,
          trial_started_at: user.user_metadata?.trial_started_at || user.created_at || new Date().toISOString(),
          license_status: 'trial',
        });
        if (insErr && !isSchemaMissingError(insErr)) {
          console.warn('No se pudo crear perfil inicial:', insErr.message);
        }
      }
    } catch {
      // Ignore gracefully if schema is not initialized yet
    }
  };

  const translateAuthError = (msg: string): string => {
    const lower = (msg || '').toLowerCase();
    if (lower.includes('invalid login credentials')) return 'Correo electrónico o contraseña incorrectos.';
    if (lower.includes('email not confirmed'))
      return 'Tu correo aún no fue confirmado. Revisá tu bandeja de entrada o spam y hacé clic en el enlace de confirmación.';
    if (lower.includes('user already registered'))
      return 'Este correo ya está registrado. Probá iniciar sesión o recuperar tu contraseña.';
    if (lower.includes('password should be at least'))
      return 'La contraseña debe tener al menos 6 caracteres.';
    if (lower.includes('unable to validate email address'))
      return 'El formato del correo electrónico no es válido.';
    if (lower.includes('rate limit') || lower.includes('too many requests'))
      return 'Demasiados intentos seguidos. Esperá un momento antes de volver a intentar.';
    return msg || 'Ocurrió un error al autenticar con Supabase.';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setPendingConfirmationEmail(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setFeedback({ type: 'error', text: 'Completá tu correo electrónico y contraseña.' });
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setPendingConfirmationEmail(trimmedEmail);
        }
        setFeedback({ type: 'error', text: translateAuthError(error.message) });
        return;
      }

      if (data.user) {
        await ensureProfileRow(data.user);
        setFeedback({ type: 'success', text: '¡Sesión iniciada correctamente!' });
        if (onAuthSuccess) onAuthSuccess(data.user);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: translateAuthError(err?.message) });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setPendingConfirmationEmail(null);

    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();
    const trimmedMat = matricula.trim();

    if (!trimmedName || !trimmedEmail || password.length < 6) {
      setFeedback({
        type: 'error',
        text: 'Ingresá tu nombre completo, un email válido y una contraseña de al menos 6 caracteres.',
      });
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      const nowIso = new Date().toISOString();

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: trimmedName,
            matricula: trimmedMat,
            trial_started_at: nowIso,
            license_status: 'trial',
            role: trimmedEmail.toLowerCase() === OWNER_ADMIN_EMAIL ? 'administrador' : 'profesional',
          },
        },
      });

      if (error) {
        setFeedback({ type: 'error', text: translateAuthError(error.message) });
        return;
      }

      if (data.session && data.user) {
        await ensureProfileRow(data.user, trimmedName, trimmedMat);
        setFeedback({
          type: 'success',
          text: '¡Cuenta creada e iniciada con 15 días de evaluación gratuita!',
        });
        if (onAuthSuccess) onAuthSuccess(data.user);
      } else if (data.user) {
        setPendingConfirmationEmail(trimmedEmail);
        setFeedback({
          type: 'info',
          text: `¡Registro exitoso! Te enviamos un correo de confirmación a ${trimmedEmail}. Confirmá tu email para iniciar sesión y activar tus 15 días de prueba.`,
        });
        setMode('login');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: translateAuthError(err?.message) });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFeedback({ type: 'error', text: 'Ingresá tu correo electrónico para recuperar la contraseña.' });
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo });
      if (error) {
        setFeedback({ type: 'error', text: translateAuthError(error.message) });
        return;
      }
      setFeedback({
        type: 'success',
        text: `Enviamos un enlace de recuperación a ${trimmedEmail}. Revisá tu correo.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: translateAuthError(err?.message) });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!pendingConfirmationEmail) return;
    setResending(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingConfirmationEmail,
      });
      if (error) {
        setFeedback({ type: 'error', text: translateAuthError(error.message) });
      } else {
        setFeedback({
          type: 'success',
          text: `Reenviamos el correo de verificación a ${pendingConfirmationEmail}.`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: translateAuthError(err?.message) });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={compact ? 'space-y-3' : 'bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-4'}>
      {/* Mode Switcher */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setFeedback(null);
          }}
          className={`flex-1 py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
            mode === 'login' ? 'bg-[#0f2b48] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          Iniciar Sesión
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setFeedback(null);
          }}
          className={`flex-1 py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
            mode === 'register' ? 'bg-[#0f2b48] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Crear Cuenta Pública
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg border text-xs font-medium flex items-start gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : feedback.type === 'info'
              ? 'bg-blue-50 border-blue-300 text-blue-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 space-y-1.5">
            <p>{feedback.text}</p>
            {pendingConfirmationEmail && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resending}
                className="inline-flex items-center gap-1 text-[11px] font-bold underline hover:no-underline disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'Reenviando...' : 'Reenviar correo de confirmación'}
              </button>
            )}
          </div>
        </div>
      )}

      {mode === 'login' && (
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="profesional@estudio.com"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setMode('reset');
                setFeedback(null);
              }}
              className="text-[11px] font-semibold text-blue-800 hover:underline flex items-center gap-1"
            >
              <KeyRound className="w-3 h-3" />
              ¿Olvidaste tu contraseña?
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#0f2b48] hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>
      )}

      {mode === 'register' && (
        <form onSubmit={handleRegister} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nombre y Apellido</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej: Ing. Juan Pérez"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Matrícula ERSeP / CUIT (opcional)</label>
              <div className="relative">
                <Award className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  placeholder="Ej: ERSeP N° 48291"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.correo@ejemplo.com"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Contraseña (mínimo 6 caracteres)</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Creá una contraseña segura"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-[11px] text-emerald-900 font-medium">
            Al registrarte, tus proyectos se guardarán en tu cuenta en la nube y contarás con <strong>15 días de evaluación gratuita</strong>.
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              {loading ? 'Creando cuenta...' : 'Registrarme Gratis'}
            </button>
          </div>
        </form>
      )}

      {mode === 'reset' && (
        <form onSubmit={handleResetPassword} className="space-y-3">
          <p className="text-xs text-slate-600">
            Ingresá el correo de tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
          </p>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.correo@ejemplo.com"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setFeedback(null);
              }}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              ← Volver a Iniciar Sesión
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#0f2b48] hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Enviar enlace
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
