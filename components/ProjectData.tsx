'use client';

import React from 'react';
import { FloorData, TechnicalParams, SpecialEquipment } from '@/lib/types';
import {
  getElectrificationGrade,
  generateCircuits,
  calculateDemand,
  calculateSectionalBoards,
  getBoardCode,
} from '@/lib/electrical-calc';
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
  Cable,
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
  const demand = calculateDemand(allCircuits, params);
  const sectionalBoards = calculateSectionalBoards(params, floorCircuits, demand.isThreePhase);

  const totalInstalledKw = (demand.totalInstalledWatts / 1000).toFixed(2);
  const maxDemandKw = (demand.simultaneousDemandWatts / 1000).toFixed(2);
  const totalCircuitsCount = allCircuits.length;
  const isNormativeCompliant = totalCircuitsCount >= electrificationInfo.minCircuits;

  const handleParamChange = (field: keyof TechnicalParams, value: any) => {
    let updated = { ...params, [field]: value };
    if (field === 'sumType') {
      const valStr = String(value).toLowerCase();
      if (valStr.includes('tri') || valStr.includes('380')) {
        updated.V = 380;
      } else {
        updated.V = 220;
      }
    } else if (field === 'V') {
      const vNum = Number(value);
      if (vNum === 380) {
        updated.sumType = 'Trifásico T1-G (Más de 5kW - EPEC ET 22)';
      } else if (vNum === 220) {
        updated.sumType = 'Monofásico (Hasta 5kW - EPEC ET 21)';
      }
    }
    onUpdateParams(updated);
  };

  const handleFloorChange = (index: number, field: keyof FloorData, value: any) => {
    const updated = [...floors];
    updated[index] = { ...updated[index], [field]: value };
    onUpdateFloors(updated);
  };

  const addFloor = () => {
    const nextNum = floors.length + 1;
    const newFloor: FloorData = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Sector ${nextNum}`,
      boardCode: `TS${nextNum}`,
      feederLengthM: 10 + nextNum * 5,
      feederPhases: 'auto',
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

  const setupFourSectionals = () => {
    const updated: FloorData[] = [0, 1, 2, 3].map((idx) => {
      const existing = floors[idx];
      const code = `TS${idx + 1}`;
      if (existing) {
        return {
          ...existing,
          boardCode: existing.boardCode || code,
          feederLengthM: existing.feederLengthM || 10 + (idx + 1) * 6,
          feederPhases: existing.feederPhases || 'auto',
        };
      }
      return {
        id: `ts_${idx + 1}_${Math.random().toString(36).substring(2, 6)}`,
        name: `Tablero Seccional ${idx + 1}`,
        boardCode: code,
        feederLengthM: 10 + (idx + 1) * 6,
        feederPhases: 'auto',
        techo: 6,
        pared: 1,
        tomas: 8,
        aa: 1,
        lav: idx === 0 ? 1 : 0,
        otros: 0,
        otrosW: 0,
        modPuntos: 7,
        modTomas: 8,
        tapas: 15,
        cajasOct: 7,
      };
    });
    if (floors.length > 4) {
      updated.push(...floors.slice(4));
    }
    onUpdateFloors(updated);
  };

  const removeFloor = (index: number) => {
    if (floors.length <= 1) {
      alert('Debe existir al menos una planta o tablero seccional en el proyecto.');
      return;
    }
    const updated = floors.filter((_, i) => i !== index);
    onUpdateFloors(updated);
  };

  const [showSpecialModal, setShowSpecialModal] = React.useState<boolean>(false);
  const [newEqName, setNewEqName] = React.useState<string>('Cargador Vehículo Eléctrico (EV)');
  const [newEqPowerW, setNewEqPowerW] = React.useState<number>(7000);
  const [newEqBoard, setNewEqBoard] = React.useState<string>('TS1');
  const [newEqVoltage, setNewEqVoltage] = React.useState<'Monofásico 220V' | 'Trifásico 380V'>('Trifásico 380V');

  const handleAddSpecialEquipment = () => {
    if (!newEqName.trim() || newEqPowerW <= 0) {
      alert('Ingrese un nombre válido y una potencia mayor a 0 W.');
      return;
    }
    const newEqItem: SpecialEquipment = {
      id: Math.random().toString(36).substring(2, 9),
      name: newEqName.trim(),
      powerW: newEqPowerW,
      boardTarget: newEqBoard,
      voltagePhase: newEqVoltage,
      circuitType: 'CUE',
    };
    const updatedEquipments = [...(params.specialEquipments || []), newEqItem];
    onUpdateParams({ ...params, specialEquipments: updatedEquipments });
    setShowSpecialModal(false);
  };

  const handleRemoveSpecialEquipment = (id: string) => {
    const updatedEquipments = (params.specialEquipments || []).filter((e) => e.id !== id);
    onUpdateParams({ ...params, specialEquipments: updatedEquipments });
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
        <div className="bg-slate-100 border-2 border-[#0f2b48] text-[#0f2b48] px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-700" />
            PARÁMETROS TÉCNICOS DE CARGAS Y ALIMENTADOR
          </span>
          <button
            onClick={() => setShowSpecialModal(true)}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            + Adicionar Equipo Especial
          </button>
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
        </div>

        {/* Special Equipment List Section */}
        {params.specialEquipments && params.specialEquipments.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-[#0f2b48] uppercase tracking-wider flex items-center justify-between">
              <span>Equipos Especiales Registrados (Cargas de Uso Específico CUE)</span>
              <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-mono font-bold">
                {params.specialEquipments.length} Equipo(s)
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {params.specialEquipments.map((eq) => (
                <div
                  key={eq.id}
                  className="bg-slate-50 border border-slate-300 rounded-lg p-3 space-y-1.5 relative group hover:border-emerald-400 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <strong className="text-xs font-extrabold text-slate-900 leading-tight">
                      {eq.name}
                    </strong>
                    <button
                      onClick={() => handleRemoveSpecialEquipment(eq.id)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar equipo especial"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-700 font-mono space-y-0.5">
                    <div>
                      Potencia: <span className="font-bold text-emerald-800">{eq.powerW} W</span> ({(eq.powerW / 1000).toFixed(2)} kW)
                    </div>
                    <div>
                      Alimentación: <span className="font-semibold text-slate-900">{eq.voltagePhase}</span>
                    </div>
                    <div>
                      Tablero Destino:{' '}
                      <span
                        className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                          eq.boardTarget === 'TP' || eq.boardTarget === 'TCE'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}
                      >
                        {eq.boardTarget === 'TP' || eq.boardTarget === 'TCE'
                          ? 'Tablero Central (TCE)'
                          : `Seccional ${eq.boardTarget === 'TS' ? 'TS1' : eq.boardTarget}`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal / Dialog for Adding Special Equipment */}
      {showSpecialModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#0f2b48] rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-[#0f2b48] flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                Adicionar Equipo Especial (Carga CUE)
              </h3>
              <button
                onClick={() => setShowSpecialModal(false)}
                className="p-1 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-800">
              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">
                  Nombre o Descripción del Equipo
                </label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={newEqName}
                    onChange={(e) => setNewEqName(e.target.value)}
                    placeholder="Ej: Cargador Vehículo Eléctrico, Termotanque 3kW, Bomba Pileta..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-600"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Cargador Vehículo Eléctrico (EV)',
                      'Termotanque Eléctrico 3kW',
                      'Bomba de Agua 1.5 HP',
                      'Bomba de Pileta 1 HP',
                      'Anafes / Cocina Eléctrica',
                      'Aire Acondicionado Central',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setNewEqName(preset);
                          if (preset.includes('EV')) {
                            setNewEqPowerW(7000);
                            setNewEqVoltage('Trifásico 380V');
                          } else if (preset.includes('Termotanque')) {
                            setNewEqPowerW(3000);
                            setNewEqVoltage('Monofásico 220V');
                          } else if (preset.includes('Bomba de Agua')) {
                            setNewEqPowerW(1100);
                            setNewEqVoltage('Monofásico 220V');
                          } else if (preset.includes('Bomba de Pileta')) {
                            setNewEqPowerW(750);
                            setNewEqVoltage('Monofásico 220V');
                          } else if (preset.includes('Cocina')) {
                            setNewEqPowerW(6000);
                            setNewEqVoltage('Trifásico 380V');
                          } else if (preset.includes('Central')) {
                            setNewEqPowerW(4500);
                            setNewEqVoltage('Trifásico 380V');
                          }
                        }}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-[10px] font-semibold text-slate-700 transition-colors"
                      >
                        + {preset.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">
                    Potencia Estimada (Watts)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="100"
                    value={newEqPowerW}
                    onChange={(e) => setNewEqPowerW(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-600"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                    = {(newEqPowerW / 1000).toFixed(2)} kW
                  </span>
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">
                    Tensión y Fases
                  </label>
                  <select
                    value={newEqVoltage}
                    onChange={(e) => setNewEqVoltage(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
                  >
                    <option value="Monofásico 220V">Monofásico 220 V~</option>
                    <option value="Trifásico 380V">Trifásico 380 V~</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">
                  Ubicación de Conexión (TCE o Tablero Seccional TS1..TS4)
                </label>
                <select
                  value={newEqBoard}
                  onChange={(e) => setNewEqBoard(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="TP">TCE — Tablero Central de Entrada (Directo)</option>
                  {floors.map((f, idx) => {
                    const code = getBoardCode(f, idx);
                    return (
                      <option key={f.id || idx} value={code}>
                        {code} — {f.name} (Alimentado desde TCE)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowSpecialModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddSpecialEquipment}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                Guardar Equipo Especial
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* 4. Floors / Tableros Seccionales Detail Table */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-4">
        <div className="bg-slate-100 border-2 border-[#0f2b48] text-[#0f2b48] px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-700" />
            ARQUITECTURA TCE → TABLEROS SECCIONALES (TS1, TS2, TS3, TS4...)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={setupFourSectionals}
              className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs rounded flex items-center gap-1 transition-colors shadow-xs"
            >
              <Cable className="w-3.5 h-3.5" />
              Estructurar TS1 a TS4 (desde TCE)
            </button>
            <button
              onClick={addFloor}
              className="px-3 py-1 bg-[#0f2b48] hover:bg-blue-900 text-white font-semibold text-xs rounded flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar Tablero TS
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-950 flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong>Topología Radial:</strong> El <strong>Tablero Central (TCE)</strong> recibe la acometida general ({demand.subfeederSectionMm} mm² Cu, PIA {demand.generalBreakerAmps}A) y alimenta de forma independiente cada Tablero Seccional (<strong>{sectionalBoards.map((s) => s.boardCode).join(', ')}</strong>).
          </span>
          <span className="font-mono font-bold text-[11px] bg-white px-2.5 py-0.5 rounded border border-blue-300">
            {sectionalBoards.length} Seccional(es) Activo(s)
          </span>
        </div>

        <div className="space-y-4">
          {floors.map((floor, fIdx) => {
            const sb = sectionalBoards[fIdx];
            const boardCode = getBoardCode(floor, fIdx);
            const feederDist = floor.feederLengthM || sb?.feederLengthM || 12 + fIdx * 6;

            return (
              <div
                key={floor.id || fIdx}
                className="bg-slate-50 border-2 border-slate-300 rounded-xl p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 bg-[#0f2b48] text-white font-mono font-black text-xs rounded-md">
                      {boardCode}
                    </span>
                    <input
                      type="text"
                      value={floor.boardCode ?? boardCode}
                      onChange={(e) => handleFloorChange(fIdx, 'boardCode', e.target.value.toUpperCase())}
                      placeholder="TS1"
                      title="Código del Tablero Seccional"
                      className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-[#0f2b48] uppercase focus:outline-none focus:border-blue-600"
                    />
                    <input
                      type="text"
                      value={floor.name}
                      onChange={(e) => handleFloorChange(fIdx, 'name', e.target.value)}
                      placeholder="Nombre Sector / Planta"
                      className="px-3 py-1 bg-white border border-slate-300 rounded text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-300">
                      <span className="text-[11px] font-bold text-slate-600">Color plano:</span>
                      <input
                        type="text"
                        value={floor.colorTag || ''}
                        onChange={(e) => handleFloorChange(fIdx, 'colorTag', e.target.value)}
                        placeholder="Ej. Azul"
                        className="w-20 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-900"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded border border-slate-300">
                      <span className="text-[11px] font-bold text-slate-600">Dist. desde TCE (m):</span>
                      <input
                        type="number"
                        min="1"
                        value={feederDist}
                        onChange={(e) => handleFloorChange(fIdx, 'feederLengthM', parseFloat(e.target.value) || 1)}
                        className="w-16 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900 text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded border border-slate-300">
                      <span className="text-[11px] font-bold text-slate-600">Alim.:</span>
                      <select
                        value={floor.feederPhases || 'auto'}
                        onChange={(e) => handleFloorChange(fIdx, 'feederPhases', e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-900"
                      >
                        <option value="auto">Auto (equilibra c/TS)</option>
                        <option value="1F">Monofásica 220V</option>
                        <option value="3F">Trifásica 380V</option>
                      </select>
                    </div>

                    <button
                      onClick={() => removeFloor(fIdx)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar Tablero Seccional"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Live Divided Engineering Strip for TCE -> TSn */}
                {sb && (
                  <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="font-sans font-bold text-[#0f2b48]">
                      Alimentador TCE → {sb.boardCode}: <span className="text-blue-700 font-mono">{sb.conductorSpec}</span> (Caño Ø{sb.conduitMm}mm)
                    </span>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span>DPMS: <strong>{sb.simultaneousWatts} W</strong></span>
                      <span>Ib: <strong>{sb.designCurrentIb} A</strong></span>
                      <span className="text-blue-800">PIA TCE: <strong>{sb.tceBreakerIn} A</strong></span>
                      <span className={sb.feederDeltaVPercent <= 2.0 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                        ΔV línea: {sb.feederDeltaVPercent}%
                      </span>
                      {sb.isThreePhase ? (
                        <span className={`px-2 py-0.5 rounded font-bold border ${sb.internalPhaseBalance.isBalanced ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-amber-50 text-amber-900 border-amber-300'}`}>
                          Eq. Interno: L1 {sb.internalPhaseBalance.wattsL1}W / L2 {sb.internalPhaseBalance.wattsL2}W / L3 {sb.internalPhaseBalance.wattsL3}W ({sb.internalPhaseBalance.unbalancePercent}%)
                        </span>
                      ) : (
                        <span className="bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded font-bold">
                          Fase 1F: {sb.assignedPhase}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-11 gap-2 text-xs">
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
                  <label className="text-slate-700 font-semibold text-[11px] block mb-0.5">Cargas TUE</label>
                  <input
                    type="number"
                    min="0"
                    value={floor.otros}
                    onChange={(e) => handleFloorChange(fIdx, 'otros', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold text-[11px] block mb-0.5">Pot. TUE (W)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={floor.otrosW}
                    onChange={(e) => handleFloorChange(fIdx, 'otrosW', parseFloat(e.target.value) || 0)}
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

              {/* Generated circuits live summary for this TS */}
              {sb && sb.circuits.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono">
                  <span className="font-sans font-bold text-slate-600 uppercase">Circuitos {sb.boardCode}:</span>
                  {sb.circuits.map((c) => {
                    const ph = sb.internalPhaseBalance.circuitPhases[c.id] || 'L1';
                    return (
                      <span
                        key={c.id}
                        className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800 font-semibold"
                      >
                        {c.id} ({c.t}) · {c.W}W · {c.poles || (c.isThreePhase ? '4P' : '2P')} {c.B}A · {ph}
                      </span>
                    );
                  })}
                </div>
              )}

              {floor.nota && (
                <div className="text-xs text-slate-700 italic bg-white p-2.5 rounded border border-slate-200">
                  IA Note: {floor.nota}
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
