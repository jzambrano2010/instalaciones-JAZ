'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Compass,
  Building2,
  FileSpreadsheet,
  ShoppingCart,
  FileCheck,
  ShieldCheck,
  HelpCircle,
  BookOpen,
  X,
  Award,
  Sliders,
  Ruler,
  Maximize,
  Sparkles,
  Download,
  FileText,
  ShieldAlert,
  KeyRound,
  RotateCcw,
  Eye,
  LogIn,
  Cloud,
  CloudOff,
  Save,
  Trash2,
  FolderOpen,
  UserCheck,
  LogOut,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import Link from 'next/link';
import { Session } from '@supabase/supabase-js';

import { FloorData, TechnicalParams } from '@/lib/types';
import { safeJsonParse } from '@/lib/safe-json';
import {
  getSupabaseBrowserClient,
  CloudProjectRecord,
  isSchemaMissingError,
} from '@/lib/supabase';
import BlueprintViewer from '@/components/BlueprintViewer';
import ProjectData from '@/components/ProjectData';
import UnifilarDiagram from '@/components/UnifilarDiagram';
import BudgetTab from '@/components/BudgetTab';
import LoadReport from '@/components/LoadReport';
import LicenseTab from '@/components/LicenseTab';
import PrintHeader from '@/components/PrintHeader';
import AIConsultant from '@/components/AIConsultant';
import AuthPanel from '@/components/AuthPanel';
import LandingGate from '@/components/LandingGate';

const DEFAULT_FLOORS: FloorData[] = [
  {
    id: 'f1',
    name: 'Planta Única',
    techo: 15,
    pared: 0,
    tomas: 12,
    aa: 2,
    lav: 1,
    otros: 0,
    otrosW: 0,
    modPuntos: 15,
    modTomas: 12,
    tapas: 27,
    cajasOct: 18,
  },
];

const DEFAULT_PARAMS: TechnicalParams = {
  area: 115,
  V: 220,
  L: 6,
  wl: 15,
  aaW: 1400,
  lavW: 750,
  sumType: 'Monofásico (Hasta 5kW - EPEC ET 21)',
  epecFeat: 'Factibilidad Solicitada',
  pillarLoc: 'Línea Municipal (Con retiro reglamentario)',
  distPillar: 12,
  soilRes: 50,
  // Obra / Propiedad
  streetAndNum: 'Av. Colón 3450',
  city: 'Córdoba Capital',
  propertyAddress: 'Av. Colón 3450, Córdoba Capital',
  // Comitente / Propietario
  ownerName: 'Familia Rossi',
  ownerDni: '28.491.023 / CUIT 20-28491023-4',
  // Profesional / Instalador
  installerName: 'Ing. Carlos E. Zambrano',
  installerCat: 'Categoría I - Proyectista (Ingenieros/Especialistas)',
  installerMatricula: 'ERSeP Matrícula N° 48291',
};

const SAMPLE_FLOORS: FloorData[] = [
  {
    id: 'f1',
    name: 'Planta Baja',
    techo: 12,
    pared: 2,
    tomas: 14,
    aa: 2,
    lav: 1,
    otros: 0,
    otrosW: 0,
    modPuntos: 14,
    modTomas: 14,
    tapas: 25,
    cajasOct: 15,
    measuredAreaM2: 75,
  },
  {
    id: 'f2',
    name: 'Planta Alta',
    techo: 10,
    pared: 0,
    tomas: 10,
    aa: 2,
    lav: 0,
    otros: 0,
    otrosW: 0,
    modPuntos: 10,
    modTomas: 10,
    tapas: 20,
    cajasOct: 12,
    measuredAreaM2: 50,
  },
];

const SAMPLE_PARAMS: TechnicalParams = {
  area: 125,
  V: 220,
  L: 8,
  wl: 15,
  aaW: 1400,
  lavW: 750,
  sumType: 'Monofásico (Hasta 5kW - EPEC ET 21)',
  epecFeat: 'Factibilidad Solicitada',
  pillarLoc: 'Línea Municipal (Con retiro reglamentario)',
  distPillar: 12,
  soilRes: 45,
  streetAndNum: 'Av. Colón 3450, B° Alberdi',
  city: 'Córdoba Capital',
  propertyAddress: 'Av. Colón 3450, B° Alberdi, Córdoba',
  ownerName: 'Familia Rossi',
  ownerDni: '28.491.023 / CUIT 20-28491023-4',
  installerName: 'Ing. Carlos E. Zambrano',
  installerCat: 'Categoría I - Proyectista (Ingenieros/Especialistas)',
  installerMatricula: 'ERSeP Matrícula N° 48291',
};

const EMPTY_FLOORS: FloorData[] = [
  {
    id: 'f1',
    name: 'Planta Única',
    techo: 0,
    pared: 0,
    tomas: 0,
    aa: 0,
    lav: 0,
    otros: 0,
    otrosW: 0,
    modPuntos: 0,
    modTomas: 0,
    tapas: 0,
    cajasOct: 0,
  },
];

const EMPTY_PARAMS: TechnicalParams = {
  area: 0,
  V: 220,
  L: 6,
  wl: 15,
  aaW: 1400,
  lavW: 750,
  sumType: 'Monofásico (Hasta 5kW - EPEC ET 21)',
  epecFeat: 'Factibilidad Solicitada',
  pillarLoc: 'Línea Municipal (Con retiro reglamentario)',
  distPillar: 10,
  soilRes: 50,
  streetAndNum: '',
  city: 'Córdoba Capital',
  propertyAddress: '',
  ownerName: '',
  ownerDni: '',
  installerName: '',
  installerCat: 'Categoría I - Proyectista (Ingenieros/Especialistas)',
  installerMatricula: '',
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('a');
  const [floors, setFloors] = useState<FloorData[]>(DEFAULT_FLOORS);
  const [params, setParams] = useState<TechnicalParams>(DEFAULT_PARAMS);
  const [mounted, setMounted] = useState<boolean>(false);
  const [resetKey, setResetKey] = useState<number>(0);

  const [showUsageModal, setShowUsageModal] = useState<boolean>(false);
  const [showNormativeModal, setShowNormativeModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showPasswordRecoveryModal, setShowPasswordRecoveryModal] = useState<boolean>(false);
  const [newRecoveryPassword, setNewRecoveryPassword] = useState<string>('');
  const [confirmRecoveryPassword, setConfirmRecoveryPassword] = useState<string>('');
  const [recoveryLoading, setRecoveryLoading] = useState<boolean>(false);
  const [recoveryFeedback, setRecoveryFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [activePrintTab, setActivePrintTab] = useState<string | null>(null);
  const [hasEnteredApp, setHasEnteredApp] = useState<boolean>(false);

  // Supabase Auth & Cloud Projects State
  const [session, setSession] = useState<Session | null>(null);
  const [cloudProjects, setCloudProjects] = useState<CloudProjectRecord[]>([]);
  const [activeCloudProjectId, setActiveCloudProjectId] = useState<string | null>(null);
  const [cloudProjectName, setCloudProjectName] = useState<string>('Proyecto Principal');
  const [cloudSyncStatus, setCloudSyncStatus] = useState<string | null>(null);
  const [cloudSchemaReady, setCloudSchemaReady] = useState<boolean>(true);
  const [isSavingCloud, setIsSavingCloud] = useState<boolean>(false);

  // Reset / Start fresh project state
  const handleConfirmReset = () => {
    setFloors(EMPTY_FLOORS);
    setParams(EMPTY_PARAMS);
    setResetKey((prev) => prev + 1);
    setActiveTab('a');
    try {
      localStorage.setItem('electroplan_floors', JSON.stringify(EMPTY_FLOORS));
      localStorage.setItem('electroplan_params', JSON.stringify(EMPTY_PARAMS));
      localStorage.removeItem('electroplan_budget_overrides');
    } catch (e) {
      console.error('Error resetting localStorage:', e);
    }
    setShowResetModal(false);
  };

  // Load sample project data
  const handleLoadExample = () => {
    setFloors(SAMPLE_FLOORS);
    setParams(SAMPLE_PARAMS);
    setResetKey((prev) => prev + 1);
    try {
      localStorage.setItem('electroplan_floors', JSON.stringify(SAMPLE_FLOORS));
      localStorage.setItem('electroplan_params', JSON.stringify(SAMPLE_PARAMS));
      localStorage.removeItem('electroplan_budget_overrides');
    } catch (e) {
      console.error('Error setting sample data:', e);
    }
  };

  // Load from LocalStorage once on mount to prevent SSR hydration mismatch
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedFloors = localStorage.getItem('electroplan_floors');
        const savedParams = localStorage.getItem('electroplan_params');
        const parsedFloors = safeJsonParse<FloorData[] | null>(savedFloors, null);
        const parsedParams = safeJsonParse<TechnicalParams | null>(savedParams, null);
        if (Array.isArray(parsedFloors) && parsedFloors.length > 0) setFloors(parsedFloors);
        if (parsedParams && typeof parsedParams === 'object') setParams(parsedParams);
      } catch {
        // Ignore corrupted localStorage values
      }
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Save to LocalStorage on updates after initial mount
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem('electroplan_floors', JSON.stringify(floors));
      localStorage.setItem('electroplan_params', JSON.stringify(params));
    } catch (e) {
      console.error('Error saving state to localStorage:', e);
    }
  }, [floors, params, mounted]);

  // Listen to Supabase Auth session & PASSWORD_RECOVERY redirect event
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const hasRecoveryInUrl =
      typeof window !== 'undefined' &&
      (window.location.hash.includes('type=recovery') ||
        window.location.search.includes('type=recovery'));

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      if (hasRecoveryInUrl && data.session) {
        setHasEnteredApp(true);
        setShowPasswordRecoveryModal(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setHasEnteredApp(true);
        setRecoveryFeedback(null);
        setNewRecoveryPassword('');
        setConfirmRecoveryPassword('');
        setShowPasswordRecoveryModal(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleUpdateRecoveredPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryFeedback(null);

    if (newRecoveryPassword.length < 6) {
      setRecoveryFeedback({
        type: 'error',
        text: 'La nueva contraseña debe tener al menos 6 caracteres.',
      });
      return;
    }
    if (newRecoveryPassword !== confirmRecoveryPassword) {
      setRecoveryFeedback({
        type: 'error',
        text: 'Las contraseñas no coinciden. Verificá ambos campos.',
      });
      return;
    }

    setRecoveryLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: newRecoveryPassword });
      if (error) {
        setRecoveryFeedback({
          type: 'error',
          text: error.message || 'No se pudo actualizar la contraseña.',
        });
        return;
      }
      setRecoveryFeedback({
        type: 'success',
        text: '¡Contraseña actualizada correctamente! Ya podés seguir usando tu cuenta.',
      });
      if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      setTimeout(() => {
        setShowPasswordRecoveryModal(false);
        setNewRecoveryPassword('');
        setConfirmRecoveryPassword('');
        setRecoveryFeedback(null);
      }, 1400);
    } catch (err: any) {
      setRecoveryFeedback({
        type: 'error',
        text: err?.message || 'Error inesperado al cambiar la contraseña.',
      });
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Load saved cloud projects when user signs in
  const loadCloudProjects = React.useCallback(async (userId: string, autoLoadLatest = false) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      if (isSchemaMissingError(error)) {
        setCloudSchemaReady(false);
      }
      return;
    }

    setCloudSchemaReady(true);
    const list = (data || []) as CloudProjectRecord[];
    setCloudProjects(list);

    if (autoLoadLatest && list.length > 0) {
      const latest = list[0];
      setActiveCloudProjectId(latest.id);
      setCloudProjectName(latest.name || 'Proyecto Principal');
      if (Array.isArray(latest.floors) && latest.floors.length > 0) {
        setFloors(latest.floors);
      }
      if (latest.params && typeof latest.params === 'object') {
        setParams(latest.params);
      }
      setResetKey((prev) => prev + 1);
      setCloudSyncStatus(`Proyecto "${latest.name}" cargado desde Supabase.`);
    }
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      const timer = setTimeout(() => {
        setCloudProjects([]);
        setActiveCloudProjectId(null);
      }, 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      loadCloudProjects(userId, true);
    }, 0);
    return () => clearTimeout(timer);
  }, [session?.user?.id, loadCloudProjects]);

  // Save current project to Supabase DB
  const handleSaveToCloud = async (asNew = false) => {
    const user = session?.user;
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setIsSavingCloud(true);
    setCloudSyncStatus(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const budgetRaw =
        typeof window !== 'undefined' ? localStorage.getItem('electroplan_budget_overrides') : null;
      const budgetOverrides = safeJsonParse<Record<string, unknown>>(budgetRaw, {});
      const projectTitle =
        cloudProjectName.trim() ||
        (params.ownerName ? `Obra ${params.ownerName}` : 'Proyecto Eléctrico');
      const nowIso = new Date().toISOString();

      if (!asNew && activeCloudProjectId) {
        const { error } = await supabase
          .from('projects')
          .update({
            name: projectTitle,
            params,
            floors,
            budget_overrides: budgetOverrides,
            updated_at: nowIso,
          })
          .eq('id', activeCloudProjectId)
          .eq('user_id', user.id);

        if (error) {
          if (isSchemaMissingError(error)) {
            setCloudSchemaReady(false);
            setCloudSyncStatus('Falta crear las tablas SQL en Supabase (ver Pestaña 6 · Licencias).');
          } else {
            setCloudSyncStatus('❌ Error guardando: ' + error.message);
          }
          return;
        }
        setCloudSyncStatus(`✅ Proyecto "${projectTitle}" actualizado en Supabase.`);
      } else {
        const { data: inserted, error } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: projectTitle,
            params,
            floors,
            budget_overrides: budgetOverrides,
            updated_at: nowIso,
          })
          .select('*')
          .single();

        if (error) {
          if (isSchemaMissingError(error)) {
            setCloudSchemaReady(false);
            setCloudSyncStatus('Falta crear las tablas SQL en Supabase (ver Pestaña 6 · Licencias).');
          } else {
            setCloudSyncStatus('❌ Error guardando: ' + error.message);
          }
          return;
        }
        if (inserted) {
          setActiveCloudProjectId(inserted.id);
          setCloudSyncStatus(`✅ Nuevo proyecto "${projectTitle}" guardado en Supabase.`);
        }
      }

      await loadCloudProjects(user.id, false);
    } finally {
      setIsSavingCloud(false);
    }
  };

  // Auto-sync active cloud project changes (debounced 2s)
  useEffect(() => {
    if (!mounted || !session?.user?.id || !activeCloudProjectId || !cloudSchemaReady) return;
    const userId = session.user.id;
    const timer = setTimeout(async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const budgetRaw =
          typeof window !== 'undefined' ? localStorage.getItem('electroplan_budget_overrides') : null;
        const budgetOverrides = safeJsonParse<Record<string, unknown>>(budgetRaw, {});
        await supabase
          .from('projects')
          .update({
            params,
            floors,
            budget_overrides: budgetOverrides,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeCloudProjectId)
          .eq('user_id', userId);
      } catch {
        // Silent background sync
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [floors, params, mounted, session?.user?.id, activeCloudProjectId, cloudSchemaReady]);

  const handleLoadCloudProject = (proj: CloudProjectRecord) => {
    setActiveCloudProjectId(proj.id);
    setCloudProjectName(proj.name || 'Proyecto Principal');
    if (Array.isArray(proj.floors) && proj.floors.length > 0) setFloors(proj.floors);
    if (proj.params && typeof proj.params === 'object') setParams(proj.params);
    if (proj.budget_overrides && typeof window !== 'undefined') {
      try {
        localStorage.setItem('electroplan_budget_overrides', JSON.stringify(proj.budget_overrides));
      } catch {
        // ignore
      }
    }
    setResetKey((prev) => prev + 1);
    setCloudSyncStatus(`✅ Proyecto "${proj.name}" cargado en pantalla.`);
  };

  const handleDeleteCloudProject = async (projectId: string) => {
    if (!session?.user?.id) return;
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', session.user.id);
    if (!error) {
      if (activeCloudProjectId === projectId) setActiveCloudProjectId(null);
      await loadCloudProjects(session.user.id, false);
      setCloudSyncStatus('Proyecto eliminado de Supabase.');
    }
  };

  // Handle Tab Printing in A4
  const handlePrintTab = (tabId: string) => {
    setActivePrintTab(tabId);
    setTimeout(() => {
      window.print();
      setActivePrintTab(null);
    }, 150);
  };

  if (!hasEnteredApp) {
    return (
      <LandingGate
        session={session}
        onEnterApp={() => setHasEnteredApp(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* 1. Top Bar Contract (Brand, Nav links, Action buttons) */}
      <header className="border-b-2 border-[#0f2b48] bg-slate-100 text-slate-900 sticky top-0 z-40 no-print shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          {/* Zone 1: Single element brand wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-md">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <Link
                href="/"
                className="text-lg font-black tracking-tight text-[#0f2b48] whitespace-nowrap shrink-0 block"
              >
                ElectroPlan AR
              </Link>
              <span className="text-[11px] text-blue-900 font-bold block leading-tight">
                Ley 10281 & AEA 90364-7-770 (Córdoba)
              </span>
            </div>
          </div>

          {/* Zone 2: Single-line tab navigation */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-200/80 p-1 border border-slate-300 rounded-xl">
            {[
              { id: 'a', label: '1 · Planos e IA', icon: Compass },
              { id: 'b', label: '2 · Datos y Parámetros', icon: Building2 },
              { id: 'c', label: '3 · Cuadro y Unifilar', icon: FileSpreadsheet },
              { id: 'd', label: '4 · Presupuesto', icon: ShoppingCart },
              { id: 'e', label: '5 · Informe Carga', icon: FileCheck },
              { id: 'f', label: '6 · Licencias', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-[#0f2b48] text-white shadow-sm'
                      : 'text-slate-800 hover:text-[#0f2b48] hover:bg-slate-300/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Action buttons (Guía, Normas & Cuenta Supabase) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowUsageModal(true)}
              title="Guía de Uso"
              className="px-2.5 py-1.5 bg-white hover:bg-slate-200 border border-[#0f2b48] text-[#0f2b48] text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
            >
              <HelpCircle className="w-4 h-4 text-blue-700" />
              <span className="hidden xl:inline">Guía de Uso</span>
            </button>

            <button
              onClick={() => setShowNormativeModal(true)}
              title="Normas Contempladas"
              className="px-2.5 py-1.5 bg-white hover:bg-slate-200 border border-[#0f2b48] text-[#0f2b48] text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
            >
              <BookOpen className="w-4 h-4 text-amber-700" />
              <span className="hidden xl:inline">Normas</span>
            </button>

            <button
              onClick={() => setShowAuthModal(true)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs ${
                session?.user
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-[#0f2b48] hover:bg-slate-800 text-white'
              }`}
            >
              {session?.user ? (
                <>
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Cuenta</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Ingresar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Tab Strip Selector */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 border-t border-slate-300 bg-slate-200">
          {[
            { id: 'a', label: '1. Planos' },
            { id: 'b', label: '2. Parámetros' },
            { id: 'c', label: '3. Unifilar' },
            { id: 'd', label: '4. Cómputo' },
            { id: 'e', label: '5. Informe' },
            { id: 'f', label: '6. Licencias' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap shrink-0 ${
                activeTab === tab.id ? 'bg-[#0f2b48] text-white' : 'bg-white text-slate-800 border border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* 2. Main Workspace Viewport */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-4">
        {/* TAB 1: Planos e IA */}
        <div
          className={`${
            activeTab === 'a' || activePrintTab === 'a' ? 'block' : 'hidden'
          } ${activePrintTab === 'a' ? 'print-page-target' : ''}`}
        >
          <PrintHeader
            title="Pestaña 1 · Visor de Planos e IA"
            tabId="a"
            onPrintTab={handlePrintTab}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowResetModal(true)}
                title="Borrar datos actuales y comenzar un nuevo proyecto desde cero"
                className="px-3 py-1 bg-red-50 hover:bg-red-100 border border-red-300 text-red-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                Nuevo Proyecto
              </button>

              <button
                onClick={handleLoadExample}
                title="Cargar proyecto de ejemplo precargado con datos y mediciones completas"
                className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-700" />
                Ver Ejemplo
              </button>
            </div>
          </PrintHeader>
          <div className="mt-3">
            <BlueprintViewer
              key={resetKey}
              floors={floors}
              onUpdateFloors={setFloors}
              onAIAnalysisComplete={(results) => {
                if (results.floors && Array.isArray(results.floors)) {
                  const totalArea = results.floors.reduce(
                    (acc: number, f: any) => acc + (f.measuredAreaM2 || 0),
                    0
                  );
                  const totalBocas = results.floors.reduce(
                    (acc: number, f: any) =>
                      acc + (f.techo || 0) + (f.pared || 0) + (f.tomas || 0) + (f.aa || 0) + (f.lav || 0),
                    0
                  );
                  const finalArea = totalArea > 0 ? Math.round(totalArea) : Math.max(50, Math.round(totalBocas * 3.5));
                  setParams((prev) => ({ ...prev, area: finalArea }));
                  setActiveTab('b'); // Direct flow: once AI analysis completes, switch to Tab 2 to review & populate tabs 3, 4, 5
                }
              }}
            />
          </div>
        </div>

        {/* TAB 2: Datos y Parámetros */}
        <div
          className={`${
            activeTab === 'b' || activePrintTab === 'b' ? 'block' : 'hidden'
          } ${activePrintTab === 'b' ? 'print-page-target' : ''}`}
        >
          <PrintHeader
            title="Pestaña 2 · Datos Generales y Criterios EPEC / Ley 10281"
            tabId="b"
            onPrintTab={handlePrintTab}
          />
          <div className="mt-3">
            <ProjectData
              key={resetKey}
              params={params}
              floors={floors}
              onUpdateParams={setParams}
              onUpdateFloors={setFloors}
            />
          </div>
        </div>

        {/* TAB 3: Cuadro y Unifilar */}
        <div
          className={`${
            activeTab === 'c' || activePrintTab === 'c' ? 'block' : 'hidden'
          } ${activePrintTab === 'c' ? 'print-page-target' : ''}`}
        >
          <PrintHeader
            title="Pestaña 3 · Esquema Unifilar y Cuadro de Circuitos (IRAM/IEC)"
            tabId="c"
            onPrintTab={handlePrintTab}
          />
          <div className="mt-3">
            <UnifilarDiagram
              key={resetKey}
              params={params}
              floors={floors}
              onUpdateParams={setParams}
            />
          </div>
        </div>

        {/* TAB 4: Cómputo y Presupuesto */}
        <div
          className={`${
            activeTab === 'd' || activePrintTab === 'd' ? 'block' : 'hidden'
          } ${activePrintTab === 'd' ? 'print-page-target' : ''}`}
        >
          <PrintHeader
            title="Pestaña 4 · Cómputo Comercial de Materiales y Presupuesto Mano de Obra"
            tabId="d"
            onPrintTab={handlePrintTab}
          />
          <div className="mt-3">
            <BudgetTab
              key={resetKey}
              params={params}
              floors={floors}
              onImportProject={(newParams, newFloors) => {
                setParams(newParams);
                setFloors(newFloors);
              }}
            />
          </div>
        </div>

        {/* TAB 5: Informe de Carga Ley 10281 */}
        <div
          className={`${
            activeTab === 'e' || activePrintTab === 'e' ? 'block' : 'hidden'
          } ${activePrintTab === 'e' ? 'print-page-target' : ''}`}
        >
          <PrintHeader
            title="Pestaña 5 · Informe Detallado de Carga y Certificación de Aptitud Ley 10281"
            tabId="e"
            onPrintTab={handlePrintTab}
          />
          <div className="mt-3">
            <LoadReport key={resetKey} params={params} floors={floors} />
          </div>
        </div>

        {/* TAB 6: Licencias y Administración */}
        <div
          className={`${
            activeTab === 'f' || activePrintTab === 'f' ? 'block' : 'hidden'
          } ${activePrintTab === 'f' ? 'print-page-target' : ''}`}
        >
          <PrintHeader
            title="Pestaña 6 · Gestión de Licencias y Roles del Sistema"
            tabId="f"
            onPrintTab={handlePrintTab}
          />
          <div className="mt-3">
            <LicenseTab
              key={resetKey}
              session={session}
              onUserUpdated={() => {
                if (session?.user?.id) loadCloudProjects(session.user.id, false);
              }}
            />
          </div>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="border-t border-slate-300 bg-white py-4 text-xs text-slate-600 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">ElectroPlan AR © {new Date().getFullYear()}</span>
            <span>·</span>
            <span>Reglamentación AEA 90364-7-770</span>
            <span>·</span>
            <span>Ley Provincial Córdoba N° 10281</span>
          </div>
          <div>
            <span>Certificaciones de Seguridad Eléctrica ERSeP / EPEC</span>
          </div>
        </div>
      </footer>

      {/* 4. MODAL 1: GUÍA DE FUNCIONAMIENTO Y USO */}
      {showUsageModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-extrabold text-[#0f2b48] flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-800" />
                Guía de Funcionamiento y Uso de la Plataforma
              </h3>
              <button
                onClick={() => setShowUsageModal(false)}
                className="p-1 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <strong className="text-blue-900 text-sm block font-black flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-blue-700" /> 1. Carga de Planos y Herramientas del Visor
                </strong>
                <p className="text-slate-600">
                  Podés subir planos en archivos <strong>PDF (monopágina o multipágina)</strong>, PNG
                  o JPG. Utilizá los controles del visor:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 font-medium">
                  <li>
                    <strong>Desplazar (Pan):</strong> Rueda de mouse o arrastrar para navegar el plano.
                  </li>
                  <li>
                    <strong>Zoom Ventana:</strong> Arrastrá un recuadro sobre cualquier zona del plano para ampliarla inmediatamente.
                  </li>
                  <li>
                    <strong>Zoom Extend:</strong> Un clic para encuadrar y centrar automáticamente todo el plano.
                  </li>
                  <li>
                    <strong>Calibrar (2 Pts):</strong> Marcá 2 puntos sobre una dimensión conocida (ej. 5.0m) e ingresá los metros reales para calibrar la escala px/m.
                  </li>
                  <li>
                    <strong>Medir Distancias / Áreas:</strong> Medí largos de cañerías en metros y superficies en m².
                  </li>
                  <li>
                    <strong>Análisis IA:</strong> Gemini Vision procesa el plano calibrado para contabilizar bocas, módulos y estimar cañerías por planta.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <strong className="text-emerald-900 text-sm block font-black flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-700" /> 2. Carga de Datos, Parámetros y Equipos Especiales
                </strong>
                <p className="text-slate-600">
                  En la pestaña <strong>2 · Datos y Parámetros</strong> completá la ubicación de la obra, los datos del Comitente y del Instalador Habilitado ERSeP. Podés adicionar cargas de uso específico con el botón <strong>&quot;+ Adicionar Equipo Especial&quot;</strong> (Cargadores EV, Termotanques 3kW, Bombas, Anafes Eléctricos) indicando potencia, tensión monofásica/trifásica y tablero destino (TP pilar o TS vivienda).
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <strong className="text-purple-900 text-sm block font-black flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-purple-700" /> 3. Esquema Unifilar, Multifilar y Balance de Fases
                </strong>
                <p className="text-slate-600">
                  En la pestaña <strong>3 · Cuadro y Unifilar</strong> alterná entre el <strong>Esquema Unifilar General</strong> y el <strong>Diagrama Multifilar con Balance de Fases L1, L2, L3</strong> (para suministros trifásicos 380V), verificando que el desequilibrio de cargas sea menor al 15% según AEA 90364.
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <strong className="text-amber-900 text-sm block font-black flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-700" /> 4. Presupuesto, Clave API Gemini y Exportación JSON
                </strong>
                <p className="text-slate-600">
                  Descargá copias de respaldo JSON o importá proyectos previos. Cargá tu API Key de Gemini en la <strong>Pestaña 6 · Licencias</strong> para activar la búsqueda automática de precios web y el análisis de planos con IA.
                </p>
              </div>
            </div>

            <div className="text-right pt-2 border-t border-slate-200">
              <button
                onClick={() => setShowUsageModal(false)}
                className="px-5 py-2 bg-[#0f2b48] hover:bg-slate-900 text-white font-bold text-xs rounded-lg shadow-sm"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL 2: NORMAS CONTEMPLADAS */}
      {showNormativeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-extrabold text-[#0f2b48] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-700" />
                Marco Normativo Contemplado en la Aplicación
              </h3>
              <button
                onClick={() => setShowNormativeModal(false)}
                className="p-1 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <strong className="text-amber-900 text-sm block font-black flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-700" /> 1. AEA 90364-7-770 & AEA 90364-4-43
                </strong>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 font-medium">
                  <li>
                    <strong>Intensidad Admisible (Tabla 770.12.I):</strong> Cálculo de ampacidad $I_z$ a 40 °C temperatura ambiente para conductores de cobre IRAM NM 247-3 en cañería embutida.
                  </li>
                  <li>
                    <strong>Coordinación de Protección (AEA 4-43):</strong> Condición estricta $I_b \le I_n \le I_z$ donde la térmico-magnética $I_n$ no supera la capacidad nominal $I_z$ del conductor.
                  </li>
                  <li>
                    <strong>Dimensionamiento de Tableros (AEA 771):</strong> Capacidad de módulos DIN en gabinetes con 20% de reserva de espacio útil.
                  </li>
                  <li>
                    <strong>Balance de Fases (Suministros Trifásicos):</strong> Reparto simétrico entre L1, L2 y L3 con desequilibrio mácimo admisible $\le 15\%$.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <strong className="text-emerald-900 text-sm block font-black flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-emerald-700" /> 2. Ley Provincial de Seguridad Eléctrica N° 10.281 (Córdoba)
                </strong>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 font-medium">
                  <li>
                    <strong>Certificado de Instalación Eléctrica Apta (CIE):</strong> Emisión de carpeta técnica oficial para solicitar conexión ante EPEC o Cooperativas de Servicios Públicos.
                  </li>
                  <li>
                    <strong>Sistema Puesta a Tierra PAT:</strong> Jabalina Copperweld IRAM 2309 (≥ 1.5m), conductor principal de 10 mm² entubado y resistencia de puesta a tierra R_PAT ≤ 10 Ω.
                  </li>
                  <li>
                    <strong>Protección Diferencial:</strong> Interruptor diferencial IRAM 2301 / IEC 61008-1 de 30 mA instantáneo.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <strong className="text-purple-900 text-sm block font-black flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-purple-700" /> 3. Especificaciones EPEC (ET 21 / ET 22)
                </strong>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 font-medium">
                  <li>
                    <strong>Caja de Medidor:</strong> Sintética IP43 / IK10 autoextinguible (Resolución General 11/2018 ERSeP).
                  </li>
                  <li>
                    <strong>Ubicación del Pilar:</strong> Línea Municipal (LM) con interruptor principal a menos de 2 metros del medidor.
                  </li>
                  <li>
                    <strong>Alimentador Principal:</strong> Sección mínima 6 mm² Cobre entubado (y 10 mm² Cu para térmicas de 32A/40A a 40°C).
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-right pt-2 border-t border-slate-200">
              <button
                onClick={() => setShowNormativeModal(false)}
                className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-lg shadow-sm"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL 3: CONFIRMACIÓN DE NUEVO PROYECTO (RESET) */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white border-2 border-red-500 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <div className="p-2.5 bg-red-100 text-red-700 rounded-full shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0f2b48]">
                  ¿Iniciar un Nuevo Proyecto?
                </h3>
                <span className="text-xs text-red-600 font-bold">
                  Acción de borrado y reinicio de datos
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
              <p>
                Se borrarán todos los datos actuales, planos cargados, mediciones, parámetros y cómputos para comenzar un proyecto totalmente desde cero.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-amber-900 text-[11px] font-medium">
                <strong>Nota:</strong> Si tenés datos valiosos, podés exportarlos primero en la Pestaña 4 con el botón &quot;Descargar JSON&quot; antes de reiniciar.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Sí, Reiniciar Proyecto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL 4: CUENTA SUPABASE Y PROYECTOS EN LA NUBE */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white border-2 border-[#0f2b48] rounded-xl p-6 max-w-xl w-full shadow-2xl max-h-[88vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-[#0f2b48] flex items-center gap-2">
                {session?.user ? (
                  <UserCheck className="w-5 h-5 text-emerald-700" />
                ) : (
                  <LogIn className="w-5 h-5 text-blue-800" />
                )}
                {session?.user
                  ? 'Mi Cuenta y Proyectos en Supabase'
                  : 'Registro e Inicio de Sesión (Supabase Auth)'}
              </h3>
              <button
                onClick={() => setShowAuthModal(false)}
                className="p-1 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!session?.user ? (
              <AuthPanel
                compact
                onAuthSuccess={() => {
                  setTimeout(() => setShowAuthModal(false), 700);
                }}
              />
            ) : (
              <div className="space-y-4 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-emerald-950">
                      {session.user.user_metadata?.full_name || session.user.email}
                    </div>
                    <div className="text-[11px] text-emerald-800 font-mono">
                      {session.user.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowAuthModal(false);
                        setActiveTab('f');
                      }}
                      className="px-3 py-1.5 bg-purple-800 hover:bg-purple-900 text-white font-bold rounded-lg"
                    >
                      Ver Licencia
                    </button>
                    <button
                      onClick={() => {
                        setShowAuthModal(false);
                        setRecoveryFeedback(null);
                        setNewRecoveryPassword('');
                        setConfirmRecoveryPassword('');
                        setShowPasswordRecoveryModal(true);
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 font-bold rounded-lg flex items-center gap-1"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Cambiar Clave
                    </button>
                    <button
                      onClick={async () => {
                        await getSupabaseBrowserClient().auth.signOut();
                        setShowAuthModal(false);
                        setHasEnteredApp(false);
                      }}
                      className="px-3 py-1.5 bg-white border border-red-300 text-red-700 hover:bg-red-50 font-bold rounded-lg flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Salir
                    </button>
                  </div>
                </div>

                {!cloudSchemaReady && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-amber-950 flex items-start gap-2">
                    <CloudOff className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                    <div>
                      <p className="font-bold">Tablas SQL pendientes en Supabase</p>
                      <p className="text-[11px] mt-0.5">
                        Andá a la pestaña <strong>6 · Licencias</strong> y copiá el script SQL para habilitar el guardado de proyectos en la base de datos.
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
                  <label className="font-bold text-slate-800 block">
                    Guardar Proyecto Actual en Supabase
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={cloudProjectName}
                      onChange={(e) => setCloudProjectName(e.target.value)}
                      placeholder="Nombre del proyecto / obra"
                      className="flex-1 min-w-[200px] px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                    <button
                      onClick={() => handleSaveToCloud(false)}
                      disabled={isSavingCloud}
                      className="px-3.5 py-1.5 bg-[#0f2b48] hover:bg-slate-800 text-white font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {activeCloudProjectId ? 'Actualizar Nube' : 'Guardar en Nube'}
                    </button>
                    {activeCloudProjectId && (
                      <button
                        onClick={() => handleSaveToCloud(true)}
                        disabled={isSavingCloud}
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-lg"
                      >
                        Guardar como Nuevo
                      </button>
                    )}
                  </div>
                  {cloudSyncStatus && (
                    <div className="text-[11px] font-semibold text-slate-800 bg-white border border-slate-200 rounded px-2.5 py-1.5">
                      {cloudSyncStatus}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-slate-800">
                    Mis Proyectos Guardados ({cloudProjects.length})
                  </div>
                  {cloudProjects.length === 0 ? (
                    <p className="text-slate-500 text-[11px]">
                      Todavía no tenés proyectos guardados en la nube. Guardá el actual arriba.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {cloudProjects.map((proj) => (
                        <div
                          key={proj.id}
                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                            activeCloudProjectId === proj.id
                              ? 'bg-blue-50 border-blue-400'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-slate-900">{proj.name}</div>
                            <div className="text-[10px] text-slate-500">
                              Actualizado: {new Date(proj.updated_at).toLocaleString('es-AR')}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleLoadCloudProject(proj)}
                              className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded text-[11px] flex items-center gap-1"
                            >
                              <FolderOpen className="w-3 h-3" />
                              Abrir
                            </button>
                            <button
                              onClick={() => handleDeleteCloudProject(proj.id)}
                              title="Eliminar proyecto"
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. MODAL 5: RESTABLECER / NUEVA CONTRASEÑA (PASSWORD_RECOVERY) */}
      {showPasswordRecoveryModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white border-2 border-[#0f2b48] rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0f2b48]">
                    Definir Nueva Contraseña
                  </h3>
                  <span className="text-[11px] text-slate-600 font-medium">
                    Recuperación de acceso en Supabase Auth
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordRecoveryModal(false)}
                className="p-1 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {recoveryFeedback && (
              <div
                className={`p-3 rounded-lg border text-xs font-semibold flex items-start gap-2 ${
                  recoveryFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}
              >
                {recoveryFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
                )}
                <span>{recoveryFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateRecoveredPassword} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nueva Contraseña (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newRecoveryPassword}
                    onChange={(e) => setNewRecoveryPassword(e.target.value)}
                    placeholder="Ingresá tu nueva contraseña"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmRecoveryPassword}
                    onChange={(e) => setConfirmRecoveryPassword(e.target.value)}
                    placeholder="Repetí tu nueva contraseña"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPasswordRecoveryModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={recoveryLoading}
                  className="px-4 py-2 bg-[#0f2b48] hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-sm disabled:opacity-50"
                >
                  {recoveryLoading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Technical Consultant Assistant */}
      <AIConsultant />
    </div>
  );
}
