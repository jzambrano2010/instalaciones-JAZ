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
} from 'lucide-react';

import Link from 'next/link';

import { FloorData, TechnicalParams } from '@/lib/types';
import BlueprintViewer from '@/components/BlueprintViewer';
import ProjectData from '@/components/ProjectData';
import UnifilarDiagram from '@/components/UnifilarDiagram';
import BudgetTab from '@/components/BudgetTab';
import LoadReport from '@/components/LoadReport';
import LicenseTab from '@/components/LicenseTab';
import PrintHeader from '@/components/PrintHeader';

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
  const [activePrintTab, setActivePrintTab] = useState<string | null>(null);

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
        if (savedFloors) setFloors(JSON.parse(savedFloors));
        if (savedParams) setParams(JSON.parse(savedParams));
      } catch (e) {
        console.error('Error reading from localStorage:', e);
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

  // Handle Tab Printing in A4
  const handlePrintTab = (tabId: string) => {
    setActivePrintTab(tabId);
    setTimeout(() => {
      window.print();
      setActivePrintTab(null);
    }, 150);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* 1. Top Bar Contract (Brand, Nav links, Action buttons) */}
      <header className="border-b-2 border-[#0f2b48] bg-slate-100 text-slate-900 sticky top-0 z-40 no-print shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-8">
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
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
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

          {/* Zone 3: Separated Action buttons (Guía de Uso, Normas Contempladas & Nuevo Proyecto) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowResetModal(true)}
              title="Borrar datos actuales y comenzar un nuevo proyecto desde cero"
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-300 text-red-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-600" />
              Nuevo Proyecto
            </button>

            <button
              onClick={() => setShowUsageModal(true)}
              className="px-3 py-1.5 bg-white hover:bg-slate-200 border border-[#0f2b48] text-[#0f2b48] text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
            >
              <HelpCircle className="w-4 h-4 text-blue-700" />
              Guía de Uso
            </button>

            <button
              onClick={() => setShowNormativeModal(true)}
              className="px-3 py-1.5 bg-white hover:bg-slate-200 border border-[#0f2b48] text-[#0f2b48] text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
            >
              <BookOpen className="w-4 h-4 text-amber-700" />
              Normas Contempladas
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
            <UnifilarDiagram key={resetKey} params={params} floors={floors} />
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
            <LicenseTab key={resetKey} />
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
                  <Building2 className="w-4 h-4 text-emerald-700" /> 2. Carga de Datos de Obra, Comitente y Profesional
                </strong>
                <p className="text-slate-600">
                  En la pestaña <strong>2 · Datos y Parámetros</strong> completá la ubicación de la obra (Calle, N° y Ciudad), los datos del Comitente (Nombre y DNI) y los del Instalador Electricista Habilitado (Categoría y Matrícula ERSeP).
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <strong className="text-purple-900 text-sm block font-black flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-purple-700" /> 3. Presupuesto, Exportación JSON e Impresión A4
                </strong>
                <p className="text-slate-600">
                  Descargá una copia de respaldo en JSON con el botón <strong>&quot;Descargar JSON&quot;</strong> o cargá un proyecto previo con <strong>&quot;Cargar JSON&quot;</strong>. Imprimí cada pestaña de manera individual con escala A4 mediante el botón <strong>&quot;Imprimir Pestaña (A4)&quot;</strong>.
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <strong className="text-amber-900 text-sm block font-black flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-700" /> 4. Clave API Key de Gemini (Procesamiento IA en Distribución)
                </strong>
                <p className="text-slate-600">
                  Para que la función de análisis automático de planos con IA funcione al distribuir o alojar esta app fuera del entorno de desarrollo:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 font-medium">
                  <li>
                    <strong>Cómo obtenerla:</strong> Ingresá a Google AI Studio en <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-800 underline font-bold">aistudio.google.com/app/apikey</a> con tu cuenta Google y hacé clic en &quot;Create API Key&quot;.
                  </li>
                  <li>
                    <strong>Dónde cargarla:</strong> Ve a la <strong>Pestaña 6 · Licencias</strong>, en la sección <strong>&quot;Configuración de Clave API Key de Gemini&quot;</strong>, pegá tu clave (ej: <code>AIzaSy...</code>) y presioná <strong>&quot;Guardar API Key&quot;</strong>.
                  </li>
                </ul>
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
                  <Award className="w-4 h-4 text-amber-700" /> 1. Reglamentación AEA 90364-7-770 (Viviendas Unifamiliares)
                </strong>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 font-medium">
                  <li>
                    <strong>Grado de Electrificación:</strong> Mínimo (hasta 60 m²), Medio (61 a 130 m²), Elevado (131 a 200 m²), Superior (más de 200 m²).
                  </li>
                  <li>
                    <strong>Límite de Bocas:</strong> Máximo 15 bocas por circuito de IUG y TUG.
                  </li>
                  <li>
                    <strong>Factores de Simultaneidad (ks):</strong> IUG (0.66), TUG (0.70), AAc y cargas fijas (1.00).
                  </li>
                  <li>
                    <strong>Caída de Tensión:</strong> Máximo 3% en puntos de utilización y 1% en alimentadores.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <strong className="text-emerald-900 text-sm block font-black flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-emerald-700" /> 2. Ley Provincial de Seguridad Eléctrica N° 10.281 (Córdoba)
                </strong>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 font-medium">
                  <li>
                    <strong>Certificado de Instalación Eléctrica Apta (CIE):</strong> Obligatoriedad de certificación firmada por Instalador Habilitado en ERSeP (Categorías I, II y III) para solicitar conexión de suministro.
                  </li>
                  <li>
                    <strong>Sistema Puesta a Tierra PAT:</strong> Jabalina Copperweld IRAM 2309 (≥ 1.5m), conductor principal de 10 mm² entubado y resistencia objetivo R ≤ 10 Ω (máx. 40 Ω).
                  </li>
                  <li>
                    <strong>Protección Diferencial:</strong> Interruptor diferencial IRAM 2301 de 30 mA instantáneo.
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
                    <strong>Ubicación del Pilar / Monolito:</strong> Línea Municipal (LM) con interruptor principal a menos de 2 metros del medidor.
                  </li>
                  <li>
                    <strong>Alimentador Principal:</strong> Sección mínima 6 mm² Cobre entubado.
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
    </div>
  );
}
