'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Session } from '@supabase/supabase-js';
import {
  LogIn,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  LogOut,
  Zap,
} from 'lucide-react';
import AuthPanel from '@/components/AuthPanel';
import { getSupabaseBrowserClient } from '@/lib/supabase';

interface LandingGateProps {
  session: Session | null;
  onEnterApp: () => void;
}

export default function LandingGate({ session, onEnterApp }: LandingGateProps) {
  const [authHighlight, setAuthHighlight] = useState(false);
  const authCardRef = useRef<HTMLDivElement>(null);

  const handleIngresarClick = () => {
    if (session?.user) {
      onEnterApp();
      return;
    }
    setAuthHighlight(true);
    authCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const firstInput = authCardRef.current?.querySelector('input');
    if (firstInput instanceof HTMLInputElement) {
      setTimeout(() => firstInput.focus(), 200);
    }
    setTimeout(() => setAuthHighlight(false), 1800);
  };

  const handleSignOut = async () => {
    await getSupabaseBrowserClient().auth.signOut();
  };

  const objectivePhrase =
    'Objetivo de ElectroPlan AR: Diseñar, calcular y certificar instalaciones eléctricas seguras bajo normas AEA 90364-7-770 y Ley Provincial N° 10.281 (ERSeP) con precisión profesional.';

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-between bg-white text-slate-900">
      {/* Wide sky-blue & white slow-moving bands background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="landing-celeste-bands absolute -inset-[45%] opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-white/35 to-sky-50/65" />
      </div>

      {/* Top minimal identity bar */}
      <header className="relative z-10 w-full border-b border-sky-200/80 bg-white/85 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#0f2b48] text-amber-400 flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <span className="text-base font-black tracking-tight text-[#0f2b48] whitespace-nowrap">
              ElectroPlan AR
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600 font-semibold">
            <span className="hidden sm:inline whitespace-nowrap">
              AEA 90364-7-770 · Ley 10.281 · ERSeP / EPEC
            </span>
            <button
              type="button"
              onClick={handleIngresarClick}
              className="px-4 py-2 bg-[#0f2b48] hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              Ingresar
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center py-8 sm:py-12 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Slow-moving Attached Logo + Wide Celeste/White Frame + Ingresar CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 space-y-6"
          >
            {/* Animated Logo Showcase Card with wide celeste & white borders */}
            <div className="landing-logo-float relative rounded-2xl p-2.5 bg-gradient-to-r from-sky-400 via-white to-sky-400 shadow-2xl border-2 border-[#0f2b48]">
              <div className="bg-white rounded-xl overflow-hidden border border-sky-200">
                <Image
                  src="/assets/aistudio/Dise_o_sin_t_tulo_1824e482.jpg"
                  alt="Soluciones de Ingeniería - Ing. Julio Zambrano MP 4097"
                  width={1280}
                  height={720}
                  priority
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-contain block"
                />
              </div>
            </div>

            <div className="bg-white/92 backdrop-blur-sm border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-sky-800 flex items-center gap-2">
                  <span>Plataforma Profesional de Ingeniería Eléctrica</span>
                  <span aria-hidden="true">·</span>
                  <span>Córdoba, Argentina</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#0f2b48] tracking-tight text-balance">
                  Cálculo Eléctrico, Planos e Informe Técnico ERSeP
                </h1>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Lectura inteligente de planos, dimensionamiento de circuitos y tableros seccionales, diagramas unifilares y multifilares, cómputo de materiales y carpeta técnica Ley 10.281.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={handleIngresarClick}
                  className="px-7 py-3 bg-[#0f2b48] hover:bg-slate-800 text-white text-sm font-black rounded-xl transition-all flex items-center gap-2 shadow-md cursor-pointer whitespace-nowrap"
                >
                  <span>{session?.user ? 'Ingresar a la Aplicación' : 'Ingresar'}</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </button>

                <span className="text-xs text-slate-600 font-medium">
                  {session?.user
                    ? `Sesión activa: ${session.user.email}`
                    : 'Completá tu registro o iniciá sesión antes de ingresar.'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Registration / Login Gate before showing the app */}
          <motion.div
            ref={authCardRef}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5"
          >
            <div
              className={`bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl border-2 transition-all duration-300 space-y-4 ${
                authHighlight
                  ? 'border-sky-500 ring-4 ring-sky-300/60'
                  : 'border-[#0f2b48]'
              }`}
            >
              <div className="border-b border-slate-200 pb-3 space-y-1">
                <div className="flex items-center gap-2 text-[#0f2b48] font-black text-base">
                  <ShieldCheck className="w-5 h-5 text-sky-700 shrink-0" />
                  <span>
                    {session?.user
                      ? 'Cuenta Profesional Verificada'
                      : 'Completar Registro / Acceso'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {session?.user
                    ? 'Tu cuenta está lista. Presioná el botón Ingresar para acceder al entorno completo.'
                    : 'Registrate con tus datos profesionales o iniciá sesión para habilitar el acceso a ElectroPlan AR.'}
                </p>
              </div>

              {session?.user ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                      <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        {session.user.user_metadata?.full_name || 'Profesional Registrado'}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-emerald-800 break-all">
                      {session.user.email}
                    </div>
                    {session.user.user_metadata?.matricula && (
                      <div className="text-xs text-emerald-700 font-semibold">
                        Matrícula: {session.user.user_metadata.matricula}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      onClick={onEnterApp}
                      className="flex-1 px-5 py-3 bg-[#0f2b48] hover:bg-slate-800 text-white text-sm font-black rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <span>Ingresar</span>
                      <ArrowRight className="w-4 h-4 text-amber-400" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="px-4 py-3 bg-white hover:bg-red-50 border border-red-300 text-red-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Salir
                    </button>
                  </div>
                </div>
              ) : (
                <AuthPanel
                  compact
                  defaultMode="register"
                  onAuthSuccess={() => {
                    setTimeout(() => onEnterApp(), 450);
                  }}
                />
              )}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Bottom Repeating Right-to-Left Scrolling Objective Banner (14pt Arial) */}
      <footer className="relative z-10 w-full bg-[#0f2b48] text-white border-t-4 border-sky-400 py-2.5 overflow-hidden">
        <div className="landing-marquee-track items-center whitespace-nowrap">
          <span className="marquee-arial-14pt font-bold tracking-normal px-12 text-white">
            {objectivePhrase}
          </span>
          <span
            aria-hidden="true"
            className="marquee-arial-14pt font-bold tracking-normal px-12 text-sky-200"
          >
            {objectivePhrase}
          </span>
          <span
            aria-hidden="true"
            className="marquee-arial-14pt font-bold tracking-normal px-12 text-white"
          >
            {objectivePhrase}
          </span>
          <span
            aria-hidden="true"
            className="marquee-arial-14pt font-bold tracking-normal px-12 text-sky-200"
          >
            {objectivePhrase}
          </span>
        </div>
      </footer>
    </div>
  );
}
