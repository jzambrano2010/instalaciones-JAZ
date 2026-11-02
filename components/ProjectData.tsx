'use client';

import React from 'react';
import { FloorData, TechnicalParams } from '@/lib/types';
import { getElectrificationGrade, generateCircuits, calculateDemand } from '@/lib/electrical-calc';
import {
  Building2,
  Layers,
  Plus,
  Trash2,
  Cpu,
  MapPin,
  User,
  Award,
  ShieldAlert,
  Zap,
  Activity,
  CheckCircle2,
  Gauge,
  Sliders,
} from 'lucide-react';

interface ProjectDataProps {
  params: TechnicalParams;
  floors: FloorData[];
  onUpdateParams: (newParams: TechnicalParams) => void;
  onUpdateFloors: (newFloors: FloorData[]) => void;
}

export default function ProjectData({
  params,
  floors,
  onUpdateParams,
  onUpdateFloors,
}: ProjectDataProps) {
  const electrificationInfo = getElectrificationGrade(params.area);

  // Dynamic calculations for Project Summary Widget
  const floorCircuits = generateCircuits(params, floors);
  const allCircuits = floorCircuits.flatMap((fc) => fc.c);
  const demand = calculateDemand(allCircuits);

  const totalInstalledKw = (demand.totalInstalledWatts / 1000).toFixed(2);
  const maxDemandKw = (demand.simultaneousDemandWatts / 1000).toFixed(2);
  const totalCircuitsCount = allCircuits.length;
  const isNormativeCompliant = totalCircuitsCount >= electrificationInfo.minCircuits;

  const handleParamChange = (field: keyof TechnicalParams, value: any) => {
    onUpdateParams({ ...params, [field]: value });
  };

  const handleFloorChange = (index: number, field: keyof FloorData, value: any) => {
    const updated = [...floors];
    updated[index] = { ...updated[index], [field]: value };
    onUpdateFloors(updated);
  };

  const addFloor = () => {
    const newFloor: FloorData = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Planta ${floors.length + 1}`,
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
    };
    onUpdateFloors([...floors, newFloor]);
  };

  const removeFloor = (index: number) => {
    if (floors.length <= 1) {
      alert('Debe existir al menos una planta en el proyecto.');
      return;
    }
    const updated = floors.filter((_, i) => i !== index);
    onUpdateFloors(updated);
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* Dynamic Project Summary Widget (Resumen del Proyecto y Carga Estimada) */}
      <div className="bg-white border-2 border-[#0f2b48] rounded-xl shadow-md overflow-hidden">
        {/* Widget Header */}
        <div className="bg-slate-100 border-b-2 border-[#0f2b48] text-slate-900 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-lg border border-amber-300">
              <Zap className="w-6 h-6 fill-amber-500 text-amber-600" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0f2b48] bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
                Resumen del Proyecto • AEA 90364-7-770 & Ley 10281
              </span>
              <h2 className="text-lg font-extrabold text-[#0f2b48] mt-0.5">
                Carga Estimada y Nivel de Electrificación
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isNormativeCompliant ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-400 text-xs font-bold rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                Cumple Mínimo AEA ({totalCircuitsCount}/{electrificationInfo.minCircuits} ctos)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-400 text-xs font-bold rounded-full">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                Req. {electrificationInfo.minCircuits} ctos (Actual: {totalCircuitsCount})
              </span>
            )}
          </div>
        </div>

        {/* Widget Body - KPI Grid */}
        <div className="p-5 bg-slate-50/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tile 1: Potencia Total Instalada */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Potencia Instalada</span>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {totalInstalledKw} <span className="text-sm font-bold text-slate-500">kW</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Sumatoria total: <span className="font-bold text-slate-700">{demand.totalInstalledWatts.toLocaleString()} W</span>
            </div>
          </div>

          {/* Tile 2: Demanda Máxima Simultánea (DPMS) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-amber-400 transition-all">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Demanda Simultánea (DPMS)</span>
              <Gauge className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-600 font-mono tracking-tight">
              {maxDemandKw} <span className="text-sm font-bold text-slate-500">kW</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Factor simultaneidad kₛ = <span className="font-bold text-slate-700">{(demand.totalInstalledWatts > 0 ? demand.simultaneousDemandWatts / demand.totalInstalledWatts : 1).toFixed(2)}</span>
            </div>
          </div>

          {/* Tile 3: Grado de Electrificación */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Grado Electrificación</span>
              <Building2 className="w-4 h-4 text-blue-700" />
            </div>
            <div className="text-xl font-extrabold text-[#0f2b48]">
              {electrificationInfo.grade}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Superficie: <span className="font-bold text-slate-700">{params.area || 0} m²</span> • Mín: {electrificationInfo.minCircuits} ctos
            </div>
          </div>

          {/* Tile 4: Protección y Cable Acometida */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-emerald-400 transition-all">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Protección Principal</span>
              <Sliders className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              PIA {demand.generalBreakerAmps}A <span className="text-xs font-normal text-slate-500">({params.sumType?.toLowerCase().includes('tri') || params.V === 380 ? '3P+N' : '1P+N'})</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Acometida: <span className="font-bold text-emerald-700">{demand.subfeederSectionMm} mm²</span> ({demand.demandedAmps.toFixed(1)} A)
            </div>
          </div>
        </div>
      </div>

      {/* 1. Datos Generales de la Obra, Comitente y Profesional */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-5">
        <div className="bg-slate-100 border-2 border-[#0f2b48] text-[#0f2b48] px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-800" />
          DATOS GENERALES DE LA OBRA, COMITENTE Y PROFESIONAL
        </div>

        {/* Section A: Propiedad / Ubicación Obra */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1">
            <Building2 className="w-3.5 h-3.5 text-blue-700" />
            1. Propiedad / Ubicación de la Obra
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-700 font-semibold block mb-1">
                Domicilio (Calle y N°)
              </label>
              <input
                type="text"
                value={params.streetAndNum || ''}
                onChange={(e) => handleParamChange('streetAndNum', e.target.value)}
                placeholder="Ej: Av. Colón 3450"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="text-xs text-slate-700 font-semibold block mb-1">
                Localidad / Ciudad (Provincia de Córdoba)
              </label>
              <input
                type="text"
                value={params.city || ''}
                onChange={(e) => handleParamChange('city', e.target.value)}
                placeholder="Ej: Córdoba Capital, Villa Carlos Paz, Río Ceballos"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Section B: Comitente / Propietario */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1">
            <User className="w-3.5 h-3.5 text-emerald-700" />
            2. Comitente / Propietario
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-700 font-semibold block mb-1">
                Nombre y Apellido
              </label>
              <input
                type="text"
                value={params.ownerName || ''}
                onChange={(e) => handleParamChange('ownerName', e.target.value)}
                placeholder="Ej: Juan Manuel Rossi"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="text-xs text-slate-700 font-semibold block mb-1">
                DNI / CUIT
              </label>
              <input
                type="text"
                value={params.ownerDni || ''}
                onChange={(e) => handleParamChange('ownerDni', e.target.value)}
                placeholder="Ej: DNI 28.491.023 / CUIT 20-28491023-4"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section C: Profesional / Instalador */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1">
            <Award className="w-3.5 h-3.5 text-purple-700" />
            3. Profesional / Instalador Electricista Habilitado
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-700 font-semibold block mb-1">
                Nombre y Apellido
              </label>
              <input
                type="text"
                value={params.installerName || ''}
                onChange={(e) => handleParamChange('installerName', e.target.value)}
                placeholder="Ej: Ing. Carlos E. Zambrano"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-xs text-slate-700 font-semibold block mb-1">
                Categoría de Instalador (ERSeP)
              </label>
              <select
                value={params.installerCat || 'Categoría I - Proyectista'}
                onChange={(e) => handleParamChange('installerCat', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="Categoría I - Proyectista (Ingenieros/Especialistas)">
                  Categoría I - Proyectista (Ingenieros / Especialistas)
                </option>
                <option value="Categoría II - Técnico (Técnicos Electricistas)">
                  Categoría II - Técnico (Técnicos Electricistas)
                </option>
                <option value="Categoría III - Idóneo Habilitado (ERSeP)">
                  Categoría III - Idóneo Habilitado (ERSeP)
                </option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-700 font-semibold block mb-1">
                Matrícula Profesional ERSeP
              </label>
              <input
                type="text"
                value={params.installerMatricula || ''}
                onChange={(e) => handleParamChange('installerMatricula', e.target.value)}
                placeholder="Ej: ERSeP Matrícula N° 48291"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Parámetros Técnicos de Cargas */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-4">
        <div className="bg-slate-100 border-2 border-[#0f2b48] text-[#0f2b48] px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-700" />
          PARÁMETROS TÉCNICOS DE CARGAS Y ALIMENTADOR
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-700 font-semibold block mb-1">
              Superficie Cubierta / Semicubierta (m²)
            </label>
            <input
              type="number"
              value={params.area}
              onChange={(e) => handleParamChange('area', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-700 font-semibold block mb-1">
              Tensión Nominal de Servicio (V)
            </label>
            <input
              type="number"
              value={params.V}
              onChange={(e) => handleParamChange('V', parseFloat(e.target.value) || 220)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-700 font-semibold block mb-1">
              Largo Alimentador Principal a Tablero Seccional (m)
            </label>
            <input
              type="number"
              value={params.L}
              onChange={(e) => handleParamChange('L', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-700 font-semibold block mb-1">
              Potencia Asignada por Boca de Luz LED (W)
            </label>
            <input
              type="number"
              value={params.wl}
              onChange={(e) => handleParamChange('wl', parseFloat(e.target.value) || 15)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-700 font-semibold block mb-1">
              Potencia Aire Acondicionado Estimada (W)
            </label>
            <input
              type="number"
              value={params.aaW}
              onChange={(e) => handleParamChange('aaW', parseFloat(e.target.value) || 1400)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-700 font-semibold block mb-1">
              Potencia Lavarropas / Lavadero (W)
            </label>
            <input
              type="number"
              value={params.lavW}
              onChange={(e) => handleParamChange('lavW', parseFloat(e.target.value) || 750)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
            />
          </div>
        </div>
      </div>

      {/* 3. Specific EPEC & Ley 10281 Technical Regulations */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-4">
        <div className="bg-slate-100 border-2 border-[#0f2b48] text-[#0f2b48] px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-700" />
          PARÁMETROS ESPECÍFICOS EPEC, PILAR Y PUESTA A TIERRA PAT (LEY 10281)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-700 font-semibold block mb-1">
              Tipo de Suministro Solicitado
            </label>
            <select
              value={params.sumType}
              onChange={(e) => handleParamChange('sumType', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="Monofásico (Hasta 5kW - EPEC ET 21)">
                Monofásico 220V (Hasta 5kW - EPEC ET 21)
              </option>
              <option value="Trifásico T1-G (Más de 5kW - EPEC ET 22)">
                Trifásico 380V (Más de 5kW - EPEC ET 22)
              </option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-700 font-semibold block mb-1">
              Estado Factibilidad EPEC
            </label>
            <input
              type="text"
              value={params.epecFeat}
              onChange={(e) => handleParamChange('epecFeat', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-xs text-slate-700 font-semibold block mb-1">
              Ubicación Pilar de Medición
            </label>
            <input
              type="text"
              value={params.pillarLoc}
              onChange={(e) => handleParamChange('pillarLoc', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-xs text-slate-700 font-semibold block mb-1">
              Distancia Pilar a Tablero Principal (m)
            </label>
            <input
              type="number"
              value={params.distPillar}
              onChange={(e) => handleParamChange('distPillar', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-700 font-semibold block mb-1">
              Resistividad Estimada del Suelo (Ω·m)
            </label>
            <input
              type="number"
              value={params.soilRes}
              onChange={(e) => handleParamChange('soilRes', parseFloat(e.target.value) || 50)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
            />
          </div>
        </div>
      </div>

      {/* 4. Floors Detail Table */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-4">
        <div className="bg-slate-100 border-2 border-[#0f2b48] text-[#0f2b48] px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-700" />
            DETALLE POR PLANTA (CONTEO DE BOCAS Y CAJAS)
          </span>
          <button
            onClick={addFloor}
            className="px-3 py-1 bg-[#0f2b48] hover:bg-blue-900 text-white font-semibold text-xs rounded flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar Planta
          </button>
        </div>

        <div className="space-y-4">
          {floors.map((floor, fIdx) => (
            <div
              key={floor.id || fIdx}
              className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <input
                  type="text"
                  value={floor.name}
                  onChange={(e) => handleFloorChange(fIdx, 'name', e.target.value)}
                  className="px-3 py-1 bg-white border border-slate-300 rounded text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <button
                  onClick={() => removeFloor(fIdx)}
                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Eliminar Planta"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 text-xs">
                <div>
                  <label className="text-slate-700 font-semibold text-[11px] block mb-0.5">Luz Techo</label>
                  <input
                    type="number"
                    min="0"
                    value={floor.techo}
                    onChange={(e) => handleFloorChange(fIdx, 'techo', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold text-[11px] block mb-0.5">Luz Pared</label>
                  <input
                    type="number"
                    min="0"
                    value={floor.pared}
                    onChange={(e) => handleFloorChange(fIdx, 'pared', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold text-[11px] block mb-0.5">Tomas TUG</label>
                  <input
                    type="number"
                    min="0"
                    value={floor.tomas}
                    onChange={(e) => handleFloorChange(fIdx, 'tomas', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold text-[11px] block mb-0.5">Aires Acond.</label>
                  <input
                    type="number"
                    min="0"
                    value={floor.aa}
                    onChange={(e) => handleFloorChange(fIdx, 'aa', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold text-[11px] block mb-0.5">Lavarropas</label>
                  <input
                    type="number"
                    min="0"
                    value={floor.lav}
                    onChange={(e) => handleFloorChange(fIdx, 'lav', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold text-[11px] block mb-0.5">Mód. Puntos</label>
                  <input
                    type="number"
                    min="0"
                    value={floor.modPuntos}
                    onChange={(e) => handleFloorChange(fIdx, 'modPuntos', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold text-[11px] block mb-0.5">Mód. Tomas</label>
                  <input
                    type="number"
                    min="0"
                    value={floor.modTomas}
                    onChange={(e) => handleFloorChange(fIdx, 'modTomas', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold text-[11px] block mb-0.5">Tapas Cajas</label>
                  <input
                    type="number"
                    min="0"
                    value={floor.tapas}
                    onChange={(e) => handleFloorChange(fIdx, 'tapas', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold text-[11px] block mb-0.5">Cajas Octog.</label>
                  <input
                    type="number"
                    min="0"
                    value={floor.cajasOct}
                    onChange={(e) => handleFloorChange(fIdx, 'cajasOct', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono"
                  />
                </div>
              </div>

              {floor.nota && (
                <div className="text-xs text-slate-700 italic bg-white p-2.5 rounded border border-slate-200">
                  IA Note: {floor.nota}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
