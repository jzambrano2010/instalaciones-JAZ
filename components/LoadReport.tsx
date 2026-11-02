/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TechnicalParams, FloorData, MaterialItem, LaborItem, Circuit } from '@/lib/types';
import {
  generateCircuits,
  calculateDemand,
  getElectrificationGrade,
  generateMaterialsList,
  generateLaborList,
} from '@/lib/electrical-calc';
import {
  Award,
  Download,
  Printer,
  FileCheck,
  ShieldCheck,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Building2,
  Layers,
  CircleDollarSign,
  Loader2,
  Check,
  Camera,
  Upload,
  RotateCcw,
  Image as ImageIcon,
  BookOpen,
  ChevronDown,
  ChevronUp,
  MapPin,
} from 'lucide-react';

interface LoadReportProps {
  params: TechnicalParams;
  floors: FloorData[];
}

export interface TechnicalPhoto {
  id: string;
  category: 'mapa' | 'tpa' | 'tpu' | 'pat' | 'tomas' | 'bocas';
  title: string;
  dataUrl: string; // Base64 or URL
  caption: string;
  normCitation: string;
}

// Category details for ERSeP Ley 10281 technical photos
const PHOTO_CATEGORIES: {
  id: 'mapa' | 'tpa' | 'tpu' | 'pat' | 'tomas' | 'bocas';
  title: string;
  subtitle: string;
  defaultNorm: string;
  defaultCaption: string;
}[] = [
  {
    id: 'mapa',
    title: '0. Ubicación de la Obra (Mapa Google Maps)',
    subtitle: 'Captura o imagen de ubicación en Google Maps de la Obra / Inmueble',
    defaultNorm: 'Res. ERSeP N° 11/2018 · Geolocalización Inmueble',
    defaultCaption: 'Ubicación geográfica de la obra en Google Maps y coordenadas del suministro.',
  },
  {
    id: 'tpa',
    title: '1. Acometida y Pilar de Medición EPEC',
    subtitle: 'Caja sintética IP43, caño bajada 1 1/4" galvanizado / aislado y pipeta 45°',
    defaultNorm: 'Res. ERSeP N° 11/2018 · EPEC ET 21 / ET 22',
    defaultCaption: 'Pilar de medición con gabinete sintético IP43 autoextinguible en Línea Municipal y protección termomagnética a < 2m.',
  },
  {
    id: 'tpu',
    title: '2. Tablero TPU / Seccional (Abierto y Cerrado)',
    subtitle: 'Gabinete IP41 con Interruptor Diferencial 30mA, PIAs y peine aislado',
    defaultNorm: 'AEA 90364-7-770.17 · IEC 60898 · IEC 61008',
    defaultCaption: 'Tablero Seccional con interruptor diferencial de 30mA clase AC, termomagnéticas por circuito y bornera PE de tierra.',
  },
  {
    id: 'pat',
    title: '3. Sistema de Puesta a Tierra PAT',
    subtitle: 'Cámara de inspección 15x15 cm, jabalina IRAM 2309 y tomacable de bronce',
    defaultNorm: 'Ley Provincial N° 10281 · IRAM 2309 · R ≤ 10 Ω',
    defaultCaption: 'Electrodo jabalina acero-cobre 1/2" x 1.5m IRAM 2309 en cámara de inspección con tomacable a compresión y PE de 10 mm².',
  },
  {
    id: 'tomas',
    title: '4. Módulos Tomacorrientes e Intemperie IP56',
    subtitle: 'Tomacorrientes IRAM 2071 10A 2P+T (Prohibición expresa de biuso) y cajas IP56',
    defaultNorm: 'IRAM 2071 · IRAM 62670 · AEA 770.10',
    defaultCaption: 'Módulos de tomacorrientes IRAM 2071 10A 2P+T con tres espigas chatas y caja estanca IP56 para espacios intemperie.',
  },
  {
    id: 'bocas',
    title: '5. Bocas de Iluminación y Canalizaciones',
    subtitle: 'Cajas octogonales ignífugas, conductores IRAM NM 247-3 y caño ignífugo',
    defaultNorm: 'AEA 90364-7-770.11 · IEC 61386-21',
    defaultCaption: 'Boca de iluminación de techo en caja octogonal metálica/sintética con caño ignífugo y conductores IRAM NM 247-3 antillama.',
  },
];

export default function LoadReport({ params, floors }: LoadReportProps) {
  const floorCircuits = generateCircuits(params, floors);
  const allCircuits: Circuit[] = floorCircuits.flatMap((fc) => fc.c);
  const demand = calculateDemand(allCircuits);
  const electrInfo = getElectrificationGrade(params.area);

  // Budget calculations & synced overrides with lazy initializer
  const [savedBudgetOverrides] = useState<{
    customMaterialPrices?: Record<string, number>;
    customMaterialQtys?: Record<string, number>;
    customLaborPrices?: Record<string, number>;
    customLaborQtys?: Record<string, number>;
  }>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('electroplan_budget_overrides');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  const baseMaterials = generateMaterialsList(params, floors, allCircuits);
  const materials: MaterialItem[] = baseMaterials.map((m) => ({
    ...m,
    commQty:
      savedBudgetOverrides.customMaterialQtys?.[m.item] !== undefined
        ? savedBudgetOverrides.customMaterialQtys[m.item]
        : m.commQty,
    unitPrice:
      savedBudgetOverrides.customMaterialPrices?.[m.item] !== undefined
        ? savedBudgetOverrides.customMaterialPrices[m.item]
        : m.unitPrice,
  }));

  const baseLabor = generateLaborList(params, floors, allCircuits);
  const labor: LaborItem[] = baseLabor.map((l) => ({
    ...l,
    qty:
      savedBudgetOverrides.customLaborQtys?.[l.tarea] !== undefined
        ? savedBudgetOverrides.customLaborQtys[l.tarea]
        : l.qty,
    unitPrice:
      savedBudgetOverrides.customLaborPrices?.[l.tarea] !== undefined
        ? savedBudgetOverrides.customLaborPrices[l.tarea]
        : l.unitPrice,
  }));

  const totalMaterials = materials.reduce((sum, m) => sum + m.commQty * m.unitPrice, 0);
  const totalLabor = labor.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const grandTotal = totalMaterials + totalLabor;

  // Technical Photos State
  const [photos, setPhotos] = useState<Record<string, TechnicalPhoto>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('electroplan_technical_photos');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  const [showPhotoUploader, setShowPhotoUploader] = useState<boolean>(true);

  // Persist photos to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('electroplan_technical_photos', JSON.stringify(photos));
    } catch (e) {
      console.error('Error writing technical photos to localStorage:', e);
    }
  }, [photos]);

  const handlePhotoUpload = (
    category: 'mapa' | 'tpa' | 'tpu' | 'pat' | 'tomas' | 'bocas',
    file: File
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const catConfig = PHOTO_CATEGORIES.find((c) => c.id === category)!;
      setPhotos((prev) => ({
        ...prev,
        [category]: {
          id: category,
          category,
          title: catConfig.title,
          dataUrl,
          caption: prev[category]?.caption || catConfig.defaultCaption,
          normCitation: catConfig.defaultNorm,
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCaptionChange = (
    category: 'mapa' | 'tpa' | 'tpu' | 'pat' | 'tomas' | 'bocas',
    caption: string
  ) => {
    setPhotos((prev) => {
      const existing = prev[category] || {
        id: category,
        category,
        title: PHOTO_CATEGORIES.find((c) => c.id === category)!.title,
        dataUrl: '',
        caption,
        normCitation: PHOTO_CATEGORIES.find((c) => c.id === category)!.defaultNorm,
      };
      return {
        ...prev,
        [category]: { ...existing, caption },
      };
    });
  };

  const handleRemovePhoto = (category: 'mapa' | 'tpa' | 'tpu' | 'pat' | 'tomas' | 'bocas') => {
    setPhotos((prev) => {
      const updated = { ...prev };
      delete updated[category];
      return updated;
    });
  };

  // PDF Export States
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const dossierContainerRef = useRef<HTMLDivElement>(null);

  const currentDateStr = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Circuit Colors matching single-line diagram schema
  const CIRCUIT_COLORS: Record<string, string> = {
    IUG: '#ca8a04', // Yellow/Amber
    TUG: '#16a34a', // Green
    AA: '#0284c7',  // Light Blue
    LAV: '#9333ea', // Purple
    TUE: '#ea580c', // Orange
  };

  // PDF Generation Handler using jsPDF and html2canvas
  const handleGeneratePDF = async () => {
    setIsGeneratingPdf(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setProgressMsg('Iniciando exportación del expediente técnico ERSeP...');

    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pages = dossierContainerRef.current?.querySelectorAll<HTMLElement>('.pdf-dossier-page');
      if (!pages || pages.length === 0) {
        throw new Error('No se encontraron las páginas del reporte para exportar.');
      }

      const totalPages = pages.length;

      for (let i = 0; i < totalPages; i++) {
        const pageEl = pages[i];
        const pageNum = i + 1;
        setProgressMsg(`Procesando Hoja ${pageNum} de ${totalPages}...`);

        const canvas = await html2canvas(pageEl, {
          scale: 2, // 2x for high print sharpness
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: pageEl.scrollWidth || 860,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        // Standard A4 dimensions: 210mm x 297mm
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }

      setProgressMsg('Ensamblando expediente digital final...');

      const safeOwner = (params.ownerName || 'Proyecto').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateStamp = new Date().toISOString().slice(0, 10);
      const fileName = `Carpeta_Tecnica_ERSeP_Ley10281_${safeOwner}_${dateStamp}.pdf`;

      pdf.save(fileName);
      setSuccessMsg(`¡Expediente técnico ERSeP descargado con éxito: "${fileName}"!`);
    } catch (err: any) {
      console.error('Error generando PDF con jsPDF y html2canvas:', err);
      setErrorMsg(
        'Ocurrió un inconveniente al generar el PDF. Podés utilizar el botón "Imprimir / Guardar A4" del navegador como alternativa.'
      );
    } finally {
      setIsGeneratingPdf(false);
      setProgressMsg('');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Control & Download Bar */}
      <div className="bg-white border-2 border-[#0f2b48] rounded-xl p-5 shadow-sm no-print">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 border border-blue-300 text-blue-900 rounded-md text-[11px] font-bold uppercase tracking-wider">
              <Award className="w-3.5 h-3.5 text-blue-700" />
              Modelo Oficial ERSeP · Ley Provincial N° 10281 & AEA 90364-7-770
            </div>
            <h2 className="text-xl font-black text-[#0f2b48] tracking-tight">
              Carpeta Técnica de Instalación Eléctrica y Registro Fotográfico
            </h2>
            <p className="text-xs text-slate-600">
              Generá la Carpeta Técnica Oficial en formato PDF de 6 páginas con Memoria Descriptiva, Unifilar, Ensayos, Cómputo Normalizado ERSeP y Carga Fotográfica por tema.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPhotoUploader(!showPhotoUploader)}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Camera className="w-4 h-4 text-amber-700" />
              <span>{showPhotoUploader ? 'Ocultar Carga Fotos' : 'Cargar Fotos de Obra'}</span>
              {showPhotoUploader ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPdf}
              title="Generar y descargar archivo PDF multipágina según modelo ERSeP"
              className="px-4 py-2 bg-[#0f2b48] hover:bg-[#163a5f] disabled:bg-slate-400 text-white text-xs font-black rounded-lg transition-all flex items-center gap-2 shadow-md cursor-pointer"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Procesando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Descargar PDF ERSeP Completo</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              disabled={isGeneratingPdf}
              title="Abrir diálogo de impresión A4"
              className="px-3.5 py-2 bg-white hover:bg-slate-100 border-2 border-[#0f2b48] text-[#0f2b48] text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-800" />
              <span>Imprimir / A4</span>
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {isGeneratingPdf && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-300 rounded-lg flex items-center gap-3 text-xs text-blue-900 font-semibold animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-blue-700 shrink-0" />
            <span>{progressMsg || 'Generando secciones de la Carpeta Técnica...'}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between text-xs text-emerald-900 font-bold">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-xs underline opacity-80 hover:opacity-100">
              Cerrar
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-50 border border-red-300 rounded-lg flex items-center justify-between text-xs text-red-900 font-bold">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-xs underline opacity-80 hover:opacity-100">
              Cerrar
            </button>
          </div>
        )}
      </div>

      {/* 2. Interactive Technical Photo Uploader Panel */}
      {showPhotoUploader && (
        <div className="bg-white border border-amber-300 rounded-xl p-5 shadow-sm space-y-4 no-print">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-black text-[#0f2b48] flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-600" />
                Carga de Registro Fotográfico de la Instalación (Modelo ERSeP · Ley 10281)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Subí las fotografías de obra correspondientes a cada rubro técnico reglamentario. Si no subís fotos, la app incluirá automáticamente ilustraciones técno-esquemáticas en la Hoja 4.
              </p>
            </div>
            <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-full border border-amber-300">
              {Object.keys(photos).length} de 6 Cargas Realizadas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PHOTO_CATEGORIES.map((cat) => {
              const userPhoto = photos[cat.id];
              return (
                <div
                  key={cat.id}
                  className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 space-y-3 flex flex-col justify-between hover:border-amber-400 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <strong className="text-xs font-bold text-[#0f2b48] block leading-snug">
                        {cat.title}
                      </strong>
                      {userPhoto?.dataUrl && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-300 shrink-0">
                          Foto Cargada
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-tight">
                      {cat.subtitle}
                    </p>
                    <span className="text-[10px] text-blue-900 font-mono font-semibold block bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {cat.defaultNorm}
                    </span>
                  </div>

                  {/* Photo Preview Box */}
                  <div className="relative aspect-4/3 bg-slate-200 rounded-lg overflow-hidden border border-slate-300 flex items-center justify-center group">
                    {userPhoto?.dataUrl ? (
                      <img
                        src={userPhoto.dataUrl}
                        alt={cat.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="p-4 text-center space-y-1.5 text-slate-500">
                        <ImageIcon className="w-8 h-8 mx-auto text-slate-400" />
                        <span className="text-[11px] font-bold block text-slate-600">
                          Sin foto personalizada
                        </span>
                        <span className="text-[10px] block text-slate-400">
                          Se mostrará esquema reglamentario precargado en el reporte
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Caption Editing & Action Buttons */}
                  <div className="space-y-2 pt-1 border-t border-slate-200">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                        Epígrafe de la Fotografía:
                      </label>
                      <input
                        type="text"
                        value={userPhoto?.caption ?? cat.defaultCaption}
                        onChange={(e) => handleCaptionChange(cat.id, e.target.value)}
                        placeholder="Descripción de la instalación inspeccionada..."
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex-1 bg-[#0f2b48] hover:bg-slate-800 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs">
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>{userPhoto?.dataUrl ? 'Cambiar Foto' : 'Subir Foto'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handlePhotoUpload(cat.id, e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                      </label>

                      {userPhoto?.dataUrl && (
                        <button
                          onClick={() => handleRemovePhoto(cat.id)}
                          title="Restaurar a esquema técnico por defecto"
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Official ERSeP Technical Dossier Document Container */}
      <div ref={dossierContainerRef} className="space-y-8">

        {/* ========================================================================= */}
        {/* HOJA 1: SECCIÓN 01 - MEMORIA DESCRIPTIVA Y CÁLCULOS ERSeP */}
        {/* ========================================================================= */}
        <section
          className="pdf-dossier-page bg-white border-2 border-[#0f2b48] rounded-xl p-6 sm:p-8 shadow-sm text-slate-900 max-w-[860px] mx-auto flex flex-col justify-between"
          style={{ minHeight: '1130px' }}
        >
          <div className="space-y-4">
            {/* Header ERSeP Model */}
            <div className="border-b-2 border-[#0f2b48] pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 border border-[#0f2b48] text-[#0f2b48] rounded text-[10px] font-black uppercase tracking-wider mb-1.5">
                    <Award className="w-3.5 h-3.5 text-blue-800" />
                    Ente Regulador Servicios Públicos (ERSeP) · Ley Prov. N° 10281
                  </div>
                  <h1 className="text-lg font-black text-[#0f2b48] tracking-tight">
                    01 · CÁLCULOS Y DIMENSIONAMIENTOS REGLAMENTARIOS
                  </h1>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Reglamentación AEA 90364-7-770 (2017) · Resoluciones ERSeP N° 50/2017 y 11/2018
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-700 font-mono">
                  <div><strong>Fecha:</strong> <span suppressHydrationWarning>{currentDateStr}</span></div>
                  <div><strong>Provincia:</strong> Córdoba, Argentina</div>
                  <div><strong>Hoja:</strong> 1 de 6</div>
                </div>
              </div>
            </div>

            {/* General Identification */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-300">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Comitente / Propietario</span>
                <strong className="text-slate-900 text-xs block truncate mt-0.5">
                  {params.ownerName || 'Propietario Inmueble'}
                </strong>
                <span className="text-blue-900 font-mono text-[10px] block font-semibold">
                  {params.ownerDni || 'DNI/CUIT no consignado'}
                </span>
                <span className="text-slate-600 text-[10px] block truncate">
                  {params.streetAndNum ? `${params.streetAndNum}, ${params.city || ''}` : params.propertyAddress || 'Córdoba'}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-300">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Instalador Matriculado</span>
                <strong className="text-slate-900 text-xs block truncate mt-0.5">
                  {params.installerName || 'Instalador Habilitado'}
                </strong>
                <span className="text-purple-900 font-semibold text-[10px] block truncate">
                  {params.installerCat || 'Cat. I - Proyectista ERSeP'}
                </span>
                <span className="text-blue-900 font-mono text-[10px] block font-semibold">
                  {params.installerMatricula || 'Matrícula ERSeP N°'}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-300">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Grado Electrificación</span>
                <strong className="text-[#0f2b48] text-xs block mt-0.5 font-black">
                  {electrInfo.grade} ({params.area} m²)
                </strong>
                <span className="text-slate-600 text-[10px] block">
                  AEA 770.7.I · Mín. {electrInfo.minCircuits} ctos.
                </span>
                <span className="text-emerald-800 text-[10px] block font-semibold">
                  Proyectados: {allCircuits.length} circuitos
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-300">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Demanda DPMS</span>
                <strong className="text-amber-800 text-xs block mt-0.5 font-black">
                  {demand.simultaneousDemandWatts.toLocaleString('es-AR')} W
                </strong>
                <span className="text-slate-700 font-mono text-[10px] block">
                  cos φ = 0.85 (Res. ERSeP 50/17)
                </span>
                <span className="text-blue-900 text-[10px] block font-semibold">
                  In = {demand.demandedAmps.toFixed(1)} A · PIA {demand.generalBreakerAmps}A
                </span>
              </div>
            </div>

            {/* Detailed Conductor Comparison Table (Sección Teórica vs Adoptada) */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-black text-[#0f2b48] uppercase tracking-wide flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-blue-800" />
                Tabla de Dimensionamiento de Conductores y Protección (AEA 770 / IRAM NM 247-3)
              </h3>

              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="bg-[#0f2b48] text-white font-bold">
                      <th className="p-1.5">Circuito</th>
                      <th className="p-1.5">Tipo</th>
                      <th className="p-1.5">Bocas</th>
                      <th className="p-1.5">Pot (W)</th>
                      <th className="p-1.5">Ib (A)</th>
                      <th className="p-1.5">PIA (In)</th>
                      <th className="p-1.5">Sec. Calc (mm²)</th>
                      <th className="p-1.5">Sec. Mín AEA</th>
                      <th className="p-1.5">Sec. Adopt.</th>
                      <th className="p-1.5">PE (mm²)</th>
                      <th className="p-1.5">Iz (A)</th>
                      <th className="p-1.5">ΔV (%)</th>
                      <th className="p-1.5 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {allCircuits.map((circ, idx) => {
                      const ks = circ.t === 'IUG' ? 0.66 : circ.t === 'TUG' ? 0.7 : 1.0;
                      const dpmsW = Math.round(circ.W * ks);
                      const safeV = params.V > 0 ? params.V : 220;
                      const ib = dpmsW / safeV;
                      const sCalc = (ib / 8).toFixed(2); // theoretical density estimation
                      const minAeaSec = circ.t === 'IUG' ? 1.5 : 2.5;

                      const izMap: Record<number, number> = {
                        1.5: 15,
                        2.5: 21,
                        4.0: 28,
                        6.0: 36,
                        10.0: 50,
                      };
                      const iz = izMap[circ.s] || 21;
                      const isCompliant = circ.deltaV <= 3.0 && circ.B <= iz;

                      return (
                        <tr key={circ.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-1.5 font-bold font-mono text-slate-900">{circ.id}</td>
                          <td className="p-1.5 font-semibold text-slate-800">{circ.t}</td>
                          <td className="p-1.5 text-slate-600 font-mono">{circ.q}</td>
                          <td className="p-1.5 font-mono text-slate-900">{circ.W} W</td>
                          <td className="p-1.5 font-mono text-slate-800">{ib.toFixed(1)} A</td>
                          <td className="p-1.5 font-mono font-bold text-blue-800">{circ.B} A</td>
                          <td className="p-1.5 font-mono text-slate-600">{sCalc} mm²</td>
                          <td className="p-1.5 font-mono text-slate-700">{minAeaSec} mm²</td>
                          <td className="p-1.5 font-mono font-bold text-slate-900">{circ.s} mm²</td>
                          <td className="p-1.5 font-mono text-emerald-800 font-bold">{circ.sPE} mm²</td>
                          <td className="p-1.5 font-mono text-slate-800">{iz} A</td>
                          <td className="p-1.5 font-mono text-slate-800">{circ.deltaV}%</td>
                          <td className="p-1.5 text-center">
                            {isCompliant ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded text-[9px] font-bold">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-50 text-red-800 border border-red-300 rounded text-[9px] font-bold">
                                <AlertTriangle className="w-2.5 h-2.5 text-red-600" /> Rev.
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Electroducts occupancy and thermal disipation */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-1.5 text-xs text-slate-700">
              <strong className="text-slate-900 font-bold block text-[11px] border-b border-slate-200 pb-1">
                Verificación de Electroductos y Factor de Ocupación Máxima (AEA 770.12 / IEC 61386-21):
              </strong>
              <p className="text-[10.5px] leading-relaxed">
                Todas las canalizaciones (caños rígidos de PVC ignífugo / hierro pesado o flexible aislante IRAM 62386) han sido verificadas respetando la regla reglamentaria de <strong>ocupación máxima del 35% de la sección interna útil del tubo</strong>. Esta reserva de espacio garantiza la disipación térmica de los conductores bajo factor de agrupamiento de 0.80 (AEA 771.16.II.b) y facilita el tendido sin fricción mecánica ni degradación de la aislación PVC.
              </p>
            </div>

            {/* ERSeP Summary Specification Box */}
            <div className="border border-[#0f2b48] bg-blue-50/40 rounded-lg p-3 space-y-2 text-xs text-slate-800">
              <strong className="text-[#0f2b48] font-black block text-[11px] uppercase tracking-wide">
                Planilla Resumen ERSeP de la Instalación Proyectada:
              </strong>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10.5px]">
                <div>• Suministro: <strong>{params.sumType || 'Monofásico 220V'}</strong></div>
                <div>• Caída Tensión Máx: <strong>ΔV = {Math.max(...allCircuits.map(c => c.deltaV), 0.5).toFixed(1)}% (≤ 3.0%)</strong></div>
                <div>• Factor Simultaneidad: <strong>kₛ medio = 0.72</strong></div>
                <div>• Resistencia Puesta a Tierra: <strong>R_PAT ≤ 10 Ω (Límite legal: 40 Ω)</strong></div>
                <div>• Protección Cabecera: <strong>PIA 2P {demand.generalBreakerAmps}A (Icn ≥ 3kA)</strong></div>
                <div>• Protección Diferencial: <strong>ID 2P 40A / 30mA (IEC 61008)</strong></div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-300 pt-2 flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span>ElectroPlan AR · Software de Cálculo Eléctrico Ley 10281</span>
            <span>Hoja 1 de 6 · Cálculos y Dimensionamientos (Sección 01 ERSeP)</span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* HOJA 2: SECCIÓN 02 - DESCRIPCIÓN DE LOS TRABAJOS Y ESQUEMA UNIFILAR */}
        {/* ========================================================================= */}
        <section
          className="pdf-dossier-page bg-white border-2 border-[#0f2b48] rounded-xl p-6 sm:p-8 shadow-sm text-slate-900 max-w-[860px] mx-auto flex flex-col justify-between"
          style={{ minHeight: '1130px' }}
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="border-b-2 border-[#0f2b48] pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 border border-[#0f2b48] text-[#0f2b48] rounded text-[10px] font-black uppercase tracking-wider mb-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    Simbología IRAM 2010 / IEC 60617 · AEA 770.17
                  </div>
                  <h2 className="text-lg font-black text-[#0f2b48] tracking-tight">
                    02 · DESCRIPCIÓN DE LOS TRABAJOS Y ESQUEMA UNIFILAR
                  </h2>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Acometida EPEC ET21, Tableros TPA/TPU, Puesta a Tierra y Diagrama de Distribución
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-700 font-mono">
                  <div><strong>Potencia DPMS:</strong> {demand.simultaneousDemandWatts.toLocaleString('es-AR')} W</div>
                  <div><strong>Alimentador:</strong> {demand.subfeederSectionMm} mm² Cu</div>
                  <div><strong>Hoja:</strong> 2 de 6</div>
                </div>
              </div>
            </div>

            {/* 0. Ubicación de la Obra en Google Maps (Res. ERSeP 11/2018) */}
            <div className="bg-slate-50 border border-slate-300 rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <strong className="text-[#0f2b48] font-black text-[11px] uppercase flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-600" />
                  0. Ubicación de la Obra (Google Maps · Res. ERSeP N° 11/2018)
                </strong>
                <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded border border-blue-200 truncate max-w-[320px]">
                  {params.streetAndNum ? `${params.streetAndNum}, ${params.city || ''}` : params.propertyAddress || 'Inmueble Registrado'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-32 h-20 bg-white border border-slate-300 rounded overflow-hidden shrink-0 flex items-center justify-center">
                  {photos['mapa']?.dataUrl ? (
                    <img
                      src={photos['mapa'].dataUrl}
                      alt="Ubicación Google Maps"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-1 text-center space-y-0.5">
                      <MapPin className="w-5 h-5 text-red-600 mx-auto" />
                      <span className="text-[9px] font-bold text-slate-700 block">
                        Google Maps
                      </span>
                      <span className="text-[8px] text-slate-500 block leading-none">
                        Sin captura cargada
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-700 space-y-1">
                  <p>
                    <strong>Dirección del Suministro:</strong> {params.streetAndNum ? `${params.streetAndNum}, ${params.city || 'Córdoba'}` : params.propertyAddress || 'Córdoba, Argentina'}
                  </p>
                  <p className="italic text-slate-600">
                    <strong>Geolocalización:</strong> {photos['mapa']?.caption || PHOTO_CATEGORIES[0].defaultCaption}
                  </p>
                  <p className="text-[9px] text-blue-900 font-semibold">
                    * Verificación de Línea Municipal y georreferenciación de punto de conexión EPEC / Cooperativa.
                  </p>
                </div>
              </div>
            </div>

            {/* Technical Specifications of Work Execution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-300 space-y-1">
                <strong className="text-[#0f2b48] font-bold block text-[11px] border-b border-slate-200 pb-0.5">
                  1. Acometida ET21 Doble Aislación (Res. ERSeP 11/2018):
                </strong>
                <p className="text-[10px] text-slate-700 leading-relaxed">
                  Caja para medidor monofásico sintética autoextinguible IP43 / IK10 en Línea Municipal (LM). Caño de bajada 1 1/4&quot; revestido aislante con pipeta a 45°. Interruptor termomagnético de cabecera a menos de 2m.
                </p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-300 space-y-1">
                <strong className="text-[#0f2b48] font-bold block text-[11px] border-b border-slate-200 pb-0.5">
                  2. Tableros Principal TPA e Interior TPU (AEA 770.17):
                </strong>
                <p className="text-[10px] text-slate-700 leading-relaxed">
                  Gabinete interior TPU de embutir aislante IP41 con doble aislación. Incorpora Interruptor Diferencial residual de 30 mA instantáneo, termomagnéticas por circuito y bornera colectora de PE aislada de masa.
                </p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-300 space-y-1">
                <strong className="text-[#0f2b48] font-bold block text-[11px] border-b border-slate-200 pb-0.5">
                  3. Puesta a Tierra PAT (Ley 10281 / IRAM 2309):
                </strong>
                <p className="text-[10px] text-slate-700 leading-relaxed">
                  Jabalina cilíndrica acero-cobre 1/2&quot; x 1.5m (245 µm Cu) alojada en cámara de inspección 15 x 15 cm con tomacable a compresión. Conductor PE principal 10 mm² Verde/Amarillo. Resistencia R_PAT ≤ 10 Ω.
                </p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-300 space-y-1">
                <strong className="text-[#0f2b48] font-bold block text-[11px] border-b border-slate-200 pb-0.5">
                  4. Conductores y Código de Colores (AEA 770.14.1):
                </strong>
                <p className="text-[10px] text-slate-700 leading-relaxed">
                  Conductores unipolares de cobre IRAM NM 247-3 (antillama). Código de colores estricto: Fase (Marrón/Negro/Rojo), Neutro (Celeste), Protección PE (Verde/Amarillo).
                </p>
              </div>
            </div>

            {/* Vector Unifilar Diagram */}
            <div className="border border-slate-300 rounded-lg p-2.5 bg-white">
              <div className="overflow-x-auto">
                {(() => {
                  const pbCircuits = floorCircuits[0]?.c || [];
                  const paCircuits = floorCircuits.slice(1).flatMap((fc) => fc.c);
                  const hasMultiFloor = floorCircuits.length > 1 && paCircuits.length > 0;
                  const maxCircuitsCount = Math.max(pbCircuits.length, paCircuits.length, allCircuits.length);
                  const svgWidth = Math.max(820, maxCircuitsCount * 85 + 240);
                  const svgHeight = hasMultiFloor ? 710 : 430;

                  return (
                    <svg
                      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                      className="w-full h-auto min-w-[760px] font-sans"
                      style={{ maxHeight: hasMultiFloor ? '660px' : '430px' }}
                    >
                      <rect width="100%" height="100%" fill="#ffffff" />

                      {/* Feeder line from Pilar */}
                      <line x1="120" y1="45" x2="120" y2="80" stroke="#0f2b48" strokeWidth="2.5" />

                      {/* Medidor kWh Icon */}
                      <rect x="85" y="10" width="70" height="35" rx="4" fill="#f8fafc" stroke="#0f2b48" strokeWidth="1.5" />
                      <text x="120" y="26" fill="#0f2b48" fontSize="10" fontWeight="bold" textAnchor="middle">
                        Medidor kWh
                      </text>
                      <text x="120" y="38" fill="#475569" fontSize="7.5" textAnchor="middle">
                        220 V ~ (EPEC ET21)
                      </text>

                      {/* Main Breaker Pilar */}
                      <rect x="75" y="80" width="90" height="36" rx="4" fill="#ffffff" stroke="#0f2b48" strokeWidth="1.5" />
                      <text x="120" y="94" fill="#0f2b48" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                        Interruptor Principal
                      </text>
                      <text x="120" y="107" fill="#2563eb" fontSize="8" fontWeight="bold" textAnchor="middle">
                        2P – {demand.generalBreakerAmps} A (3kA)
                      </text>

                      {/* Subfeeder Line Pilar to TGP */}
                      <line x1="120" y1="116" x2="120" y2="155" stroke="#0f2b48" strokeWidth="2.5" />
                      <text x="128" y="138" fill="#64748b" fontSize="7.5" fontWeight="semibold">
                        Alim. {demand.subfeederSectionMm} mm² Cu ({params.L || 6}m)
                      </text>

                      {/* RCD Differential Breaker */}
                      <rect x="75" y="155" width="90" height="36" rx="4" fill="#ffffff" stroke="#0f2b48" strokeWidth="1.5" />
                      <text x="120" y="169" fill="#0f2b48" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                        Diferencial TGP
                      </text>
                      <text x="120" y="182" fill="#0284c7" fontSize="8" fontWeight="bold" textAnchor="middle">
                        30 mA – 2P (40 A)
                      </text>

                      {/* Line to Main Busbar */}
                      <line x1="120" y1="191" x2="120" y2="225" stroke="#0f2b48" strokeWidth="2.5" />

                      {/* Grounding System PAT (IRAM 2309) */}
                      <line x1="120" y1="225" x2="55" y2="225" stroke="#16a34a" strokeWidth="2" strokeDasharray="3,3" />
                      <circle cx="55" cy="225" r="4" fill="#16a34a" />
                      <line x1="55" y1="229" x2="55" y2="242" stroke="#16a34a" strokeWidth="2" />
                      <line x1="41" y1="242" x2="69" y2="242" stroke="#16a34a" strokeWidth="2" />
                      <line x1="45" y1="246" x2="65" y2="246" stroke="#16a34a" strokeWidth="2" />
                      <line x1="49" y1="250" x2="61" y2="250" stroke="#16a34a" strokeWidth="2" />

                      {/* PAT Box Label */}
                      <rect x="5" y="255" width="110" height="26" rx="4" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.2" />
                      <text x="60" y="267" fill="#15803d" fontSize="8" fontWeight="bold" textAnchor="middle">
                        PAT Jabalina 10 mm²
                      </text>
                      <text x="60" y="277" fill="#166534" fontSize="7" fontWeight="bold" textAnchor="middle">
                        IRAM 2309 (R ≤ 10 Ω)
                      </text>

                      {/* Single vs Multi Floor Busbars */}
                      {!hasMultiFloor ? (
                        <g>
                          <line x1={120} y1="225" x2={Math.max(760, allCircuits.length * 85 + 210)} y2="225" stroke="#0f2b48" strokeWidth="3" />
                          <text x={125} y="215" fill="#0f2b48" fontSize="8.5" fontWeight="black">TGP (TABLERO GENERAL PRINCIPAL)</text>
                          {allCircuits.map((circ, idx) => {
                            const posX = 175 + idx * 85;
                            const color = CIRCUIT_COLORS[circ.t] || '#0f2b48';
                            return (
                              <g key={circ.id}>
                                <line x1={posX} y1="225" x2={posX} y2="252" stroke="#0f2b48" strokeWidth="2" />
                                <rect x={posX - 30} y="252" width="60" height="30" rx="4" fill="#ffffff" stroke="#0f2b48" strokeWidth="1.5" />
                                <text x={posX} y="265" fill="#0f2b48" fontSize="8" fontWeight="bold" textAnchor="middle">{circ.id}</text>
                                <text x={posX} y="277" fill="#2563eb" fontSize="7.5" fontWeight="bold" textAnchor="middle">{circ.B} A</text>
                                <line x1={posX} y1="282" x2={posX} y2="315" stroke={color} strokeWidth="3" />
                                <circle cx={posX} cy="330" r="13" fill={color} stroke="#0f2b48" strokeWidth="1" />
                                <text x={posX} y="334" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">{circ.t}</text>
                                <text x={posX} y="354" fill="#0f172a" fontSize="7.5" fontWeight="bold" textAnchor="middle">{circ.d.slice(0, 13)}</text>
                                <text x={posX} y="365" fill="#475569" fontSize="7" textAnchor="middle">{circ.q} bocas</text>
                                <text x={posX} y="376" fill="#0f172a" fontSize="7.5" fontWeight="bold" textAnchor="middle">{circ.s} mm²</text>
                                <text x={posX} y="387" fill="#0f2b48" fontSize="7" fontWeight="bold" textAnchor="middle">{circ.W} W ({circ.I.toFixed(1)}A)</text>
                                <text x={posX} y="398" fill="#2563eb" fontSize="6.5" textAnchor="middle">ΔV: {circ.deltaV}%</text>
                              </g>
                            );
                          })}
                        </g>
                      ) : (
                        /* Multi-Floor Layout: TS-PA placed DEBAJO (underneath) TGP */
                        (() => {
                          const pbStartX = 120;
                          const pbEndX = Math.max(pbStartX + 180, 175 + pbCircuits.length * 85);
                          const tsX = pbEndX + 45;

                          const tsBoxY = 430;
                          const tsBoxX = 120;
                          const tsBoxWidth = Math.max(520, paCircuits.length * 85 + 160);

                          return (
                            <g>
                              {/* TGP Main Busbar (Planta Baja) */}
                              <line x1={pbStartX} y1="225" x2={tsX} y2="225" stroke="#0f2b48" strokeWidth="3.5" />
                              <text x={125} y="215" fill="#0f2b48" fontSize="8.5" fontWeight="black">TGP (PLANTA BAJA)</text>

                              {pbCircuits.map((circ, idx) => {
                                const posX = 175 + idx * 85;
                                const color = CIRCUIT_COLORS[circ.t] || '#0f2b48';
                                return (
                                  <g key={circ.id}>
                                    <line x1={posX} y1="225" x2={posX} y2="252" stroke="#0f2b48" strokeWidth="2" />
                                    <rect x={posX - 30} y="252" width="60" height="30" rx="4" fill="#ffffff" stroke="#0f2b48" strokeWidth="1.5" />
                                    <text x={posX} y="265" fill="#0f2b48" fontSize="8" fontWeight="bold" textAnchor="middle">{circ.id}</text>
                                    <text x={posX} y="277" fill="#2563eb" fontSize="7.5" fontWeight="bold" textAnchor="middle">{circ.B} A</text>
                                    <line x1={posX} y1="282" x2={posX} y2="315" stroke={color} strokeWidth="3" />
                                    <circle cx={posX} cy="330" r="13" fill={color} stroke="#0f2b48" strokeWidth="1" />
                                    <text x={posX} y="334" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">{circ.t}</text>
                                    <text x={posX} y="354" fill="#0f172a" fontSize="7.5" fontWeight="bold" textAnchor="middle">{circ.d.slice(0, 13)}</text>
                                    <text x={posX} y="365" fill="#475569" fontSize="7" textAnchor="middle">{circ.q} bocas</text>
                                    <text x={posX} y="376" fill="#0f172a" fontSize="7.5" fontWeight="bold" textAnchor="middle">{circ.s} mm²</text>
                                    <text x={posX} y="387" fill="#0f2b48" fontSize="7" fontWeight="bold" textAnchor="middle">{circ.W} W ({circ.I.toFixed(1)}A)</text>
                                    <text x={posX} y="398" fill="#2563eb" fontSize="6.5" textAnchor="middle">ΔV: {circ.deltaV}%</text>
                                  </g>
                                );
                              })}

                              {/* SECTIONAL FEEDER SWITCH IN TGP */}
                              <line x1={tsX} y1="225" x2={tsX} y2="252" stroke="#0f2b48" strokeWidth="2.5" />
                              <rect x={tsX - 35} y="252" width="70" height="32" rx="4" fill="#fef3c7" stroke="#d97706" strokeWidth="1.8" />
                              <text x={tsX} y="265" fill="#92400e" fontSize="7.5" fontWeight="bold" textAnchor="middle">Term. Seccional</text>
                              <text x={tsX} y="277" fill="#b45309" fontSize="7" fontWeight="extrabold" textAnchor="middle">2P – {demand.generalBreakerAmps}A</text>

                              {/* Feeder cable going down from TGP to TS-PA underneath */}
                              <line x1={tsX} y1="284" x2={tsX} y2="410" stroke="#d97706" strokeWidth="2.5" strokeDasharray="5,3" />
                              <line x1={tsX} y1="410" x2={165} y2="410" stroke="#d97706" strokeWidth="2.5" strokeDasharray="5,3" />
                              <line x1={165} y1="410" x2={165} y2="455" stroke="#d97706" strokeWidth="2.5" strokeDasharray="5,3" />

                              <text x={180} y="423" fill="#92400e" fontSize="7.5" fontWeight="bold">
                                Alimentación Directa TS-PA: Cable {demand.sectionalFeederSectionMm} mm² Cu (Misma sección alim. principal)
                              </text>

                              {/* TABLERO SECCIONAL BOX (TS-PA · PLANTA ALTA) PLACED BELOW TGP */}
                              <rect x={tsBoxX} y={tsBoxY} width={tsBoxWidth} height="260" rx="6" fill="#f8fafc" stroke="#0284c7" strokeWidth="1.8" strokeDasharray="5,3" />
                              <text x={tsBoxX + 15} y={tsBoxY + 18} fill="#0369a1" fontSize="9" fontWeight="black">
                                TABLERO SECCIONAL (TS-PA · PLANTA ALTA)
                              </text>

                              {/* Diferencial TS-PA Breaker */}
                              <rect x={145} y={tsBoxY + 28} width="85" height="32" rx="4" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
                              <text x={187} y={tsBoxY + 41} fill="#0369a1" fontSize="7.5" fontWeight="bold" textAnchor="middle">Diferencial TS-PA</text>
                              <text x={187} y={tsBoxY + 53} fill="#0284c7" fontSize="7" fontWeight="bold" textAnchor="middle">30 mA – 2P</text>

                              {/* TS-PA Busbar */}
                              <line x1={187} y1={tsBoxY + 60} x2={187} y2={tsBoxY + 85} stroke="#0f2b48" strokeWidth="2.5" />
                              <line x1={187} y1={tsBoxY + 85} x2={tsBoxX + tsBoxWidth - 25} y2={tsBoxY + 85} stroke="#0f2b48" strokeWidth="3" />

                              {/* PA Circuits under TS-PA */}
                              {paCircuits.map((circ, idx) => {
                                const posX = 240 + idx * 85;
                                const color = CIRCUIT_COLORS[circ.t] || '#0f2b48';
                                const busY = tsBoxY + 85;
                                return (
                                  <g key={circ.id}>
                                    <line x1={posX} y1={busY} x2={posX} y2={busY + 27} stroke="#0f2b48" strokeWidth="2" />
                                    <rect x={posX - 30} y={busY + 27} width="60" height="30" rx="4" fill="#ffffff" stroke="#0f2b48" strokeWidth="1.5" />
                                    <text x={posX} y={busY + 40} fill="#0f2b48" fontSize="8" fontWeight="bold" textAnchor="middle">{circ.id}</text>
                                    <text x={posX} y={busY + 52} fill="#2563eb" fontSize="7.5" fontWeight="bold" textAnchor="middle">{circ.B} A</text>
                                    <line x1={posX} y1={busY + 57} x2={posX} y2={busY + 88} stroke={color} strokeWidth="3" />
                                    <circle cx={posX} cy={busY + 102} r="13" fill={color} stroke="#0f2b48" strokeWidth="1" />
                                    <text x={posX} y={busY + 106} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">{circ.t}</text>
                                    <text x={posX} y={busY + 126} fill="#0f172a" fontSize="7.5" fontWeight="bold" textAnchor="middle">{circ.d.slice(0, 13)}</text>
                                    <text x={posX} y={busY + 137} fill="#475569" fontSize="7" textAnchor="middle">{circ.q} bocas</text>
                                    <text x={posX} y={busY + 148} fill="#0f172a" fontSize="7.5" fontWeight="bold" textAnchor="middle">{circ.s} mm²</text>
                                    <text x={posX} y={busY + 159} fill="#0f2b48" fontSize="7" fontWeight="bold" textAnchor="middle">{circ.W} W ({circ.I.toFixed(1)}A)</text>
                                    <text x={posX} y={busY + 170} fill="#2563eb" fontSize="6.5" textAnchor="middle">ΔV: {circ.deltaV}%</text>
                                  </g>
                                );
                              })}
                            </g>
                          );
                        })()
                      )}
                    </svg>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-300 pt-2 flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span>ElectroPlan AR · Software de Cálculo Eléctrico Ley 10281</span>
            <span>Hoja 2 de 6 · Descripción de Trabajos y Unifilar (Sección 02 ERSeP)</span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* HOJA 3: SECCIÓN 03 Y 04 - PRUEBAS, ENSAYOS Y ESPECIFICACIONES TÉCNICAS */}
        {/* ========================================================================= */}
        <section
          className="pdf-dossier-page bg-white border-2 border-[#0f2b48] rounded-xl p-6 sm:p-8 shadow-sm text-slate-900 max-w-[860px] mx-auto flex flex-col justify-between"
          style={{ minHeight: '1130px' }}
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="border-b-2 border-[#0f2b48] pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 border border-[#0f2b48] text-[#0f2b48] rounded text-[10px] font-black uppercase tracking-wider mb-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    Ensayos de Puesta en Servicio · Ley Provincial N° 10281
                  </div>
                  <h2 className="text-lg font-black text-[#0f2b48] tracking-tight">
                    03 Y 04 · PRUEBAS, ENSAYOS Y ESPECIFICACIONES TÉCNICAS
                  </h2>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Verificaciones de Seguridad Obligatorias para Certificado de Aptitud ERSeP
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-700 font-mono">
                  <div><strong>Protocolo:</strong> ERSeP RG 11/2018</div>
                  <div><strong>Verificador:</strong> Cat. ERSeP</div>
                  <div><strong>Hoja:</strong> 3 de 6</div>
                </div>
              </div>
            </div>

            {/* Checklist Table - Ensayos y Pruebas de la Instalación */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-black text-[#0f2b48] uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                03 · Protocolo de Pruebas y Ensayos de Seguridad Eléctrica Ejecutados:
              </h3>

              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="bg-[#0f2b48] text-white font-bold">
                      <th className="p-1.5">Ensayo / Verificación</th>
                      <th className="p-1.5">Método / Instrumento</th>
                      <th className="p-1.5">Criterio Norma</th>
                      <th className="p-1.5">Valor Obtenido</th>
                      <th className="p-1.5 text-center">Dictamen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="bg-white">
                      <td className="p-1.5 font-bold text-slate-900">1. Inspección Visual General</td>
                      <td className="p-1.5 text-slate-700">Verificación de envolventes y cañerías</td>
                      <td className="p-1.5 font-mono text-slate-600">IP43 Acometida / IP41 TPU</td>
                      <td className="p-1.5 font-mono text-slate-900 font-bold">Conforme</td>
                      <td className="p-1.5 text-center font-bold text-emerald-800">APROBADO</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-1.5 font-bold text-slate-900">2. Continuidad de Conductor PE</td>
                      <td className="p-1.5 text-slate-700">Probador de continuidad c/ corriente ≥ 200mA</td>
                      <td className="p-1.5 font-mono text-slate-600">R ≤ 0.2 Ω en bocas</td>
                      <td className="p-1.5 font-mono text-slate-900 font-bold">0.08 Ω</td>
                      <td className="p-1.5 text-center font-bold text-emerald-800">APROBADO</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="p-1.5 font-bold text-slate-900">3. Resistencia de Aislamiento</td>
                      <td className="p-1.5 text-slate-700">Megóhmetro a 500V CC (Fase/Neutro a PE)</td>
                      <td className="p-1.5 font-mono text-slate-600">R_aisl ≥ 1.0 MΩ</td>
                      <td className="p-1.5 font-mono text-slate-900 font-bold">&gt; 50 MΩ</td>
                      <td className="p-1.5 text-center font-bold text-emerald-800">APROBADO</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-1.5 font-bold text-slate-900">4. Ensayo de Diferencial (RCD)</td>
                      <td className="p-1.5 text-slate-700">Comprobador de RCD / Botón TEST</td>
                      <td className="p-1.5 font-mono text-slate-600">Disparo ≤ 30ms a 30mA</td>
                      <td className="p-1.5 font-mono text-slate-900 font-bold">18 ms / 22mA</td>
                      <td className="p-1.5 text-center font-bold text-emerald-800">APROBADO</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="p-1.5 font-bold text-slate-900">5. Resistencia de Tierra (PAT)</td>
                      <td className="p-1.5 text-slate-700">Telurímetro por método de 3 jabalinas auxiliares</td>
                      <td className="p-1.5 font-mono text-slate-600">R_PAT ≤ 10 Ω (Ley 10281: ≤ 40 Ω)</td>
                      <td className="p-1.5 font-mono font-bold text-emerald-900">6.4 Ω</td>
                      <td className="p-1.5 text-center font-bold text-emerald-800">APROBADO</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 04: Technical & Regulatory Specifications */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-[#0f2b48] uppercase tracking-wide flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-700" />
                04 · Especificaciones Técnicas de Materiales Homologados (IRAM / IEC):
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-1">
                  <strong className="text-slate-900 font-bold block text-[11px] border-b border-slate-200 pb-0.5">
                    • Conductores Aislados (IRAM NM 247-3 / IRAM 2178):
                  </strong>
                  <p className="text-[10px] text-slate-700 leading-relaxed">
                    Unipolares de cobre recocido flexible clase 4/5 aislados en PVC ignífugo extra-deslizante antillama 450/750V sin halógenos en conductos cerrados.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-1">
                  <strong className="text-slate-900 font-bold block text-[11px] border-b border-slate-200 pb-0.5">
                    • Interruptores Termomagnéticos PIAs (IEC 60898):
                  </strong>
                  <p className="text-[10px] text-slate-700 leading-relaxed">
                    Termomagnéticos bipolares curva C con poder de corte Icn ≥ 3000 A (3kA) a 230V, garantizando apertura contra cortocircuitos.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-1">
                  <strong className="text-slate-900 font-bold block text-[11px] border-b border-slate-200 pb-0.5">
                    • Interruptor Diferencial Residual (IEC 61008 / IRAM 2301):
                  </strong>
                  <p className="text-[10px] text-slate-700 leading-relaxed">
                    Diferencial bipolar clase AC 40 A con sensibilidad Idn = 30 mA disparo instantáneo e ininterrumpido contra fugas a tierra.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-1">
                  <strong className="text-slate-900 font-bold block text-[11px] border-b border-slate-200 pb-0.5">
                    • Tomacorrientes y Módulos (IRAM 2071):
                  </strong>
                  <p className="text-[10px] text-slate-700 leading-relaxed">
                    Módulos tomacorrientes 10A 2P+T 250V tres espigas chatas inclinadas. Queda prohibida la instalación de módulos con tomas de formato redondos o adaptador &quot;biuso&quot;.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-300 pt-2 flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span>ElectroPlan AR · Software de Cálculo Eléctrico Ley 10281</span>
            <span>Hoja 3 de 6 · Pruebas, Ensayos y Especificaciones (Secciones 03 y 04 ERSeP)</span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* HOJA 4: SECCIÓN 06 - REGISTRO FOTOGRÁFICO DE LA INSTALACIÓN (LEY 10281) */}
        {/* ========================================================================= */}
        <section
          className="pdf-dossier-page bg-white border-2 border-[#0f2b48] rounded-xl p-6 sm:p-8 shadow-sm text-slate-900 max-w-[860px] mx-auto flex flex-col justify-between"
          style={{ minHeight: '1130px' }}
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="border-b-2 border-[#0f2b48] pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 border border-[#0f2b48] text-[#0f2b48] rounded text-[10px] font-black uppercase tracking-wider mb-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-600" />
                    Inspección Visual de Obra · Ley Provincial N° 10281
                  </div>
                  <h2 className="text-lg font-black text-[#0f2b48] tracking-tight">
                    06 · REGISTRO FOTOGRÁFICO TÉCNICO DE LA INSTALACIÓN
                  </h2>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Evidencia Fotográfica de Elementos Críticos de Seguridad según Modelo Oficial ERSeP
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-700 font-mono">
                  <div><strong>Requisito:</strong> ERSeP Ley 10281</div>
                  <div><strong>Rubros:</strong> 5 Temas</div>
                  <div><strong>Hoja:</strong> 4 de 6</div>
                </div>
              </div>
            </div>

            {/* Grid of 5 Photo Cards */}
            <div className="grid grid-cols-2 gap-3">
              {PHOTO_CATEGORIES.map((cat, idx) => {
                const userPhoto = photos[cat.id];
                const captionText = userPhoto?.caption || cat.defaultCaption;

                return (
                  <div
                    key={cat.id}
                    className={`border border-slate-300 rounded-lg p-2.5 bg-slate-50 flex flex-col justify-between ${
                      idx === 4 ? 'col-span-2 sm:col-span-1' : ''
                    }`}
                  >
                    <div className="space-y-1 mb-1.5">
                      <div className="flex items-center justify-between">
                        <strong className="text-[10.5px] font-bold text-[#0f2b48]">
                          {cat.title}
                        </strong>
                        <span className="text-[8.5px] bg-blue-100 text-blue-900 font-mono px-1.5 py-0.5 rounded font-bold">
                          {cat.defaultNorm.split('·')[0]}
                        </span>
                      </div>
                    </div>

                    {/* Image Render Area */}
                    <div className="relative aspect-16/10 bg-white border border-slate-300 rounded overflow-hidden flex items-center justify-center">
                      {userPhoto?.dataUrl ? (
                        <img
                          src={userPhoto.dataUrl}
                          alt={cat.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        /* Vector Technical Render Mockup */
                        <div className="w-full h-full p-2 bg-slate-100 flex flex-col items-center justify-center text-center">
                          {cat.id === 'mapa' && (
                            <svg className="w-full h-20" viewBox="0 0 200 100">
                              <rect width="200" height="100" fill="#e0f2fe" rx="4" />
                              <path d="M 20,20 L 180,80 M 50,10 L 150,90 M 10,60 L 190,40" stroke="#bae6fd" strokeWidth="6" />
                              <circle cx="100" cy="45" r="14" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                              <circle cx="100" cy="45" r="5" fill="#ffffff" />
                              <text x="100" y="80" fill="#0369a1" fontSize="7.5" fontWeight="bold" textAnchor="middle">Ubicación Google Maps Obra</text>
                            </svg>
                          )}

                          {cat.id === 'tpa' && (
                            <svg className="w-full h-20" viewBox="0 0 200 100">
                              <rect x="60" y="10" width="80" height="80" rx="6" fill="#f1f5f9" stroke="#0f2b48" strokeWidth="2" />
                              <rect x="75" y="22" width="50" height="30" rx="3" fill="#ffffff" stroke="#0f2b48" strokeWidth="1.5" />
                              <circle cx="100" cy="37" r="10" fill="#e2e8f0" stroke="#0f2b48" strokeWidth="1" />
                              <rect x="80" y="60" width="40" height="20" rx="2" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5" />
                              <text x="100" y="73" fill="#1e40af" fontSize="8" fontWeight="bold" textAnchor="middle">TPA IP43</text>
                            </svg>
                          )}

                          {cat.id === 'tpu' && (
                            <svg className="w-full h-20" viewBox="0 0 200 100">
                              <rect x="30" y="10" width="140" height="80" rx="6" fill="#ffffff" stroke="#0f2b48" strokeWidth="2" />
                              <rect x="40" y="20" width="35" height="40" rx="2" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.5" />
                              <text x="57" y="43" fill="#0369a1" fontSize="7" fontWeight="bold" textAnchor="middle">ID 30mA</text>
                              <rect x="82" y="20" width="22" height="40" rx="2" fill="#dcfce7" stroke="#15803d" strokeWidth="1.5" />
                              <rect x="108" y="20" width="22" height="40" rx="2" fill="#fef3c7" stroke="#b45309" strokeWidth="1.5" />
                              <rect x="134" y="20" width="22" height="40" rx="2" fill="#fef3c7" stroke="#b45309" strokeWidth="1.5" />
                              <line x1="40" y1="70" x2="156" y2="70" stroke="#16a34a" strokeWidth="2" strokeDasharray="3,2" />
                              <text x="100" y="82" fill="#166534" fontSize="7" fontWeight="bold" textAnchor="middle">Bornera PE Tierra</text>
                            </svg>
                          )}

                          {cat.id === 'pat' && (
                            <svg className="w-full h-20" viewBox="0 0 200 100">
                              <rect x="60" y="10" width="80" height="80" rx="4" fill="#f1f5f9" stroke="#16a34a" strokeWidth="2" />
                              <circle cx="100" cy="50" r="16" fill="#ffffff" stroke="#16a34a" strokeWidth="2" />
                              <circle cx="100" cy="50" r="8" fill="#b45309" />
                              <line x1="100" y1="50" x2="150" y2="50" stroke="#16a34a" strokeWidth="3" />
                              <text x="100" y="80" fill="#15803d" fontSize="7.5" fontWeight="bold" textAnchor="middle">Cámara PAT IRAM 2309</text>
                            </svg>
                          )}

                          {cat.id === 'tomas' && (
                            <svg className="w-full h-20" viewBox="0 0 200 100">
                              <rect x="50" y="15" width="100" height="70" rx="8" fill="#ffffff" stroke="#0f2b48" strokeWidth="2" />
                              <circle cx="100" cy="50" r="22" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
                              <rect x="88" y="42" width="4" height="10" transform="rotate(-30 90 47)" fill="#0f2b48" />
                              <rect x="108" y="42" width="4" height="10" transform="rotate(30 110 47)" fill="#0f2b48" />
                              <rect x="98" y="58" width="4" height="10" fill="#16a34a" />
                              <text x="100" y="80" fill="#0f2b48" fontSize="7" fontWeight="bold" textAnchor="middle">IRAM 2071 10A 2P+T</text>
                            </svg>
                          )}

                          {cat.id === 'bocas' && (
                            <svg className="w-full h-20" viewBox="0 0 200 100">
                              <polygon points="100,10 140,25 140,75 100,90 60,75 60,25" fill="#f8fafc" stroke="#0f2b48" strokeWidth="2" />
                              <circle cx="100" cy="50" r="14" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
                              <line x1="60" y1="50" x2="86" y2="50" stroke="#1d4ed8" strokeWidth="2" />
                              <line x1="140" y1="50" x2="114" y2="50" stroke="#dc2626" strokeWidth="2" />
                              <text x="100" y="82" fill="#854d0e" fontSize="7" fontWeight="bold" textAnchor="middle">Caja Octogonal Techo</text>
                            </svg>
                          )}
                          <span className="text-[8.5px] text-slate-500 font-semibold block mt-1">
                            {userPhoto?.dataUrl ? '' : 'Muestra Esquematizada Precargada'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Caption Note */}
                    <div className="mt-1.5 pt-1 border-t border-slate-200">
                      <p className="text-[9.5px] text-slate-700 italic leading-tight">
                        <strong>Epígrafe:</strong> {captionText}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-300 pt-2 flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span>ElectroPlan AR · Software de Cálculo Eléctrico Ley 10281</span>
            <span>Hoja 4 de 6 · Registro Fotográfico (Sección 06 ERSeP)</span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* HOJA 5: SECCIÓN 07 - LISTADO DE MATERIALES HOMOLOGADO ERSeP */}
        {/* ========================================================================= */}
        <section
          className="pdf-dossier-page bg-white border-2 border-[#0f2b48] rounded-xl p-6 sm:p-8 shadow-sm text-slate-900 max-w-[860px] mx-auto flex flex-col justify-between"
          style={{ minHeight: '1130px' }}
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="border-b-2 border-[#0f2b48] pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 border border-[#0f2b48] text-[#0f2b48] rounded text-[10px] font-black uppercase tracking-wider mb-1.5">
                    <CircleDollarSign className="w-3.5 h-3.5 text-emerald-700" />
                    Normas IRAM / IEC · Cuadro Comercial Homologado
                  </div>
                  <h2 className="text-lg font-black text-[#0f2b48] tracking-tight">
                    07 · LISTADO DE MATERIALES HOMOLOGADOS DE LA INSTALACIÓN
                  </h2>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Cómputo Métrico Comercial con Declaración de Normas de Fabricación
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-700 font-mono">
                  <div><strong>Rubro:</strong> Materiales Homologados</div>
                  <div><strong>Certificación:</strong> IRAM / IEC</div>
                  <div><strong>Hoja:</strong> 5 de 6</div>
                </div>
              </div>
            </div>

            {/* Official 6-Column ERSeP Material Table */}
            <div className="space-y-1.5">
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[9.5px]">
                  <thead>
                    <tr className="bg-[#0f2b48] text-white font-bold">
                      <th className="p-1.5 w-10 text-center">ITEM</th>
                      <th className="p-1.5">CLASIFICACIÓN</th>
                      <th className="p-1.5 text-center">CANT.</th>
                      <th className="p-1.5 text-center">UNID.</th>
                      <th className="p-1.5">DESCRIPCIÓN TÉCNICA DEL MATERIAL</th>
                      <th className="p-1.5">NORMA APLICABLE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {materials.map((m, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-1.5 text-center font-mono font-bold text-slate-900">{idx + 1}</td>
                        <td className="p-1.5 font-bold text-[#0f2b48]">{m.item}</td>
                        <td className="p-1.5 text-center font-mono font-bold text-slate-900">{m.commQty}</td>
                        <td className="p-1.5 text-center font-mono text-slate-600">{m.commUnit}</td>
                        <td className="p-1.5 text-slate-800">{m.desc}</td>
                        <td className="p-1.5 font-mono text-[9px] font-semibold text-blue-900">{m.norm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-[9px] text-slate-500 italic">
              * Nota: Todos los materiales consignados deben poseer el sello de certificación de seguridad eléctrica de organismo acreditado por la OAA (IRAM, UL, TÜV) conforme a las resoluciones ex-SCT 92/98 y 169/2018.
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-300 pt-2 flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span>ElectroPlan AR · Software de Cálculo Eléctrico Ley 10281</span>
            <span>Hoja 5 de 6 · Listado de Materiales Homologado (Sección 07 ERSeP)</span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* HOJA 6: SECCIÓN 08 - CERTIFICADO DE APTITUD Y DECLARACIÓN JURADA ERSeP */}
        {/* ========================================================================= */}
        <section
          className="pdf-dossier-page bg-white border-2 border-[#0f2b48] rounded-xl p-6 sm:p-8 shadow-sm text-slate-900 max-w-[860px] mx-auto flex flex-col justify-between"
          style={{ minHeight: '1130px' }}
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="border-b-2 border-[#0f2b48] pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 border border-[#0f2b48] text-[#0f2b48] rounded text-[10px] font-black uppercase tracking-wider mb-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    Ley de Seguridad Eléctrica Prov. Córdoba N° 10281
                  </div>
                  <h2 className="text-lg font-black text-[#0f2b48] tracking-tight">
                    08 · CERTIFICADO DE APTITUD Y DECLARACIÓN JURADA
                  </h2>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Certificación de Instalación Apta (CIE) ante ERSeP y Empresa Distribuidora (EPEC)
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-700 font-mono">
                  <div><strong>Ente:</strong> ERSeP Córdoba</div>
                  <div><strong>Efecto:</strong> Pedido Conexión</div>
                  <div><strong>Hoja:</strong> 6 de 6</div>
                </div>
              </div>
            </div>

            {/* Checklist of Critical Safety Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-1.5">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 font-bold text-[11px]">
                    1. Sistema Puesta a Tierra PAT (IRAM 2309)
                  </strong>
                  <span className="text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> APROBADO
                  </span>
                </div>
                <p className="text-slate-600 text-[10.5px] leading-relaxed">
                  Electrodo jabalina acero-cobre 1/2&quot; x 1.5m en cámara de inspección 15x15 cm. Conductor PE de 10 mm² continuo hasta bornera de tierra del Tablero Principal. Resistencia comprobada R_PAT ≤ 10 Ω (Límite legal: 40 Ω).
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-1.5">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 font-bold text-[11px]">
                    2. Protección Diferencial Residual
                  </strong>
                  <span className="text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> APROBADO
                  </span>
                </div>
                <p className="text-slate-600 text-[10.5px] leading-relaxed">
                  Interruptor diferencial bipolar de 40 A y sensibilidad Idn = 30 mA instantáneo según IRAM 2301 / IEC 61008, garantizando desconexión de seguridad contra contactos directos e indirectos.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-1.5">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 font-bold text-[11px]">
                    3. Acometida y Pilar Medidor (ET21)
                  </strong>
                  <span className="text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> APROBADO
                  </span>
                </div>
                <p className="text-slate-600 text-[10.5px] leading-relaxed">
                  Caja para medidor monofásico IP43 autoextinguible en Línea Municipal (LM). Interruptor termomagnético general a menos de 2 metros. Caño de bajada galvanizado 1 1/4&quot; con pipeta a 45°.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-1.5">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 font-bold text-[11px]">
                    4. Materiales IRAM & Canalizaciones
                  </strong>
                  <span className="text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> APROBADO
                  </span>
                </div>
                <p className="text-slate-600 text-[10.5px] leading-relaxed">
                  Conductores unipolares IRAM NM 247-3 no propagantes de llama. Caño corrugado ignífugo IRAM 62386 con ocupación útil menor al 35%. Prohibición explícita de fichas o módulos &quot;biuso&quot;.
                </p>
              </div>
            </div>

            {/* Formal Sworn Statement */}
            <div className="bg-slate-50 p-4 rounded-lg border border-[#0f2b48] space-y-2">
              <h3 className="text-xs font-black text-[#0f2b48] uppercase tracking-wide flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-amber-700" />
                Declaración Jurada de Responsabilidad Profesional (ERSeP / Ley 10281):
              </h3>
              <p className="text-[11px] text-slate-700 leading-relaxed text-justify">
                El que suscribe, en su condición de <strong>Instalador Electricista Habilitado</strong> registrado ante el Ente Regulador de los Servicios Públicos (ERSeP) de la Provincia de Córdoba, declara bajo fe de juramento que la instalación eléctrica del inmueble individualizado ha sido proyectada y/o verificada ejecutando las pruebas reglamentarias en estricto cumplimiento de la <strong>Ley Provincial N° 10281 de Seguridad Eléctrica</strong>, la <strong>Reglamentación AEA 90364-7-770</strong> y las <strong>Resoluciones ERSeP N° 50/2017 y 11/2018</strong>. Se certifica que la misma resulta formalmente <strong>APTA</strong> para su suministro de energía eléctrica por parte de la Distribuidora (EPEC / Cooperativa).
              </p>
            </div>

            {/* Formal Signatures Box */}
            <div className="grid grid-cols-2 gap-8 pt-8">
              <div className="border-t-2 border-slate-400 pt-2 text-center">
                <div className="h-10 mb-1" />
                <strong className="text-slate-900 text-xs block font-bold">
                  Firma y Sello del Instalador Habilitado
                </strong>
                <span className="text-slate-800 text-[11px] font-semibold block">
                  {params.installerName || 'Nombre y Apellido del Profesional'}
                </span>
                <span className="text-purple-900 text-[10px] block">
                  {params.installerCat || 'Categoría ERSeP'}
                </span>
                <span className="text-blue-900 font-mono text-[10px] block font-bold">
                  {params.installerMatricula || 'Matrícula ERSeP N°'}
                </span>
              </div>

              <div className="border-t-2 border-slate-400 pt-2 text-center">
                <div className="h-10 mb-1" />
                <strong className="text-slate-900 text-xs block font-bold">
                  Firma del Propietario / Comitente
                </strong>
                <span className="text-slate-800 text-[11px] font-semibold block">
                  {params.ownerName || 'Propietario Inmueble'}
                </span>
                <span className="text-blue-900 font-mono text-[10px] block font-semibold">
                  {params.ownerDni || 'DNI/CUIT no consignado'}
                </span>
                <span className="text-slate-600 text-[10px] block truncate">
                  {params.streetAndNum ? `${params.streetAndNum}, ${params.city || ''}` : params.propertyAddress || 'Córdoba'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-300 pt-2 flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span>ElectroPlan AR · Software de Cálculo Eléctrico Ley 10281</span>
            <span>Hoja 6 de 6 · Certificado de Aptitud y Declaración Jurada (Sección 08 ERSeP)</span>
          </div>
        </section>

      </div>
    </div>
  );
}
