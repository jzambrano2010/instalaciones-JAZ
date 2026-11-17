'use client';

import React, { useState } from 'react';
import { TechnicalParams, FloorData, Circuit } from '@/lib/types';
import {
  generateCircuits,
  calculateDemand,
  getElectrificationGrade,
  calculatePhaseBalance,
  calculateSectionalBoards,
} from '@/lib/electrical-calc';
import {
  Zap,
  ShieldCheck,
  BookOpen,
  FileCheck2,
  GitCommit,
  CheckCircle2,
  Activity,
  Layers,
  Sliders,
  Printer,
  Cable,
  AlertTriangle,
} from 'lucide-react';

interface UnifilarDiagramProps {
  params: TechnicalParams;
  floors: FloorData[];
}

export default function UnifilarDiagram({ params, floors }: UnifilarDiagramProps) {
  const floorCircuits = generateCircuits(params, floors);
  const allCircuits = floorCircuits.flatMap((fc) => fc.c);
  const demand = calculateDemand(allCircuits, params);
  const sectionalBoards = calculateSectionalBoards(params, floorCircuits, demand.isThreePhase);
  const phaseBalance = calculatePhaseBalance(allCircuits, sectionalBoards, demand.isThreePhase);
  const directTceCircuits = allCircuits.filter(
    (c) => c.boardCode === 'TCE' || c.boardTarget === 'TP'
  );

  // Derived state for the active diagram, allowing manual override
  const [manualDiagram, setManualDiagram] = useState<'unifilar' | 'multifilar' | null>(null);
  const activeDiagram = manualDiagram ?? (demand.isThreePhase ? 'multifilar' : 'unifilar');

  // Circuit Colors matching standard PDF schema
  const CIRCUIT_COLORS: Record<string, string> = {
    IUG: '#eab308', // Yellow
    TUG: '#16a34a', // Green
    AA: '#0284c7',  // Light Blue
    LAV: '#9333ea', // Purple
    TUE: '#ea580c', // Orange
    CUE: '#dc2626', // Red / Carga Uso Específico
  };

  // User adjustable spacing for SVG readability
  const [circuitSpacing, setCircuitSpacing] = useState<number>(130);

  // Authoritative phase lookup from PhaseBalanceResult (covers both TS1..TSN and TCE direct)
  const circuitPhaseLookup = phaseBalance.circuitPhases;

  // Determine phase tap for a circuit in the Multifilar diagram respecting its TS internal balance
  const getCircuitPhase = (
    circ: Circuit
  ): { phaseY: number; phaseName: string; phaseColor: string; isThreePhase: boolean } => {
    const assigned = circuitPhaseLookup[circ.id];
    const is3P =
      assigned === '3F' ||
      Boolean(circ.isThreePhase) ||
      circ.d.includes('380V') ||
      circ.d.includes('Trifásico');

    if (is3P) {
      return { phaseY: 35, phaseName: '3F', phaseColor: '#dc2626', isThreePhase: true };
    }
    if (assigned === 'L1') return { phaseY: 35, phaseName: 'L1', phaseColor: '#92400e', isThreePhase: false };
    if (assigned === 'L2') return { phaseY: 60, phaseName: 'L2', phaseColor: '#1e293b', isThreePhase: false };
    if (assigned === 'L3') return { phaseY: 85, phaseName: 'L3', phaseColor: '#6b21a8', isThreePhase: false };

    const isInL1 = phaseBalance.l1Circuits.some((c) => c.id === circ.id);
    const isInL2 = phaseBalance.l2Circuits.some((c) => c.id === circ.id);
    if (isInL1) return { phaseY: 35, phaseName: 'L1', phaseColor: '#92400e', isThreePhase: false };
    if (isInL2) return { phaseY: 60, phaseName: 'L2', phaseColor: '#1e293b', isThreePhase: false };
    return { phaseY: 85, phaseName: 'L3', phaseColor: '#6b21a8', isThreePhase: false };
  };

  // Order circuits in Multifilar grouped by TCE direct + TS1..TSN
  const orderedMultifilarCircuits: Circuit[] = [
    ...directTceCircuits,
    ...sectionalBoards.flatMap((sb) => sb.circuits),
  ];

  const multifilarBoardGroups: {
    boardCode: string;
    colorTag?: string;
    startIndex: number;
    count: number;
    dpmsWatts: number;
  }[] = [];
  let cursorIdx = 0;
  if (directTceCircuits.length > 0) {
    multifilarBoardGroups.push({
      boardCode: 'TCE Directo',
      startIndex: cursorIdx,
      count: directTceCircuits.length,
      dpmsWatts: directTceCircuits.reduce((s, c) => s + c.W, 0),
    });
    cursorIdx += directTceCircuits.length;
  }
  sectionalBoards.forEach((sb) => {
    if (sb.circuits.length > 0) {
      multifilarBoardGroups.push({
        boardCode: sb.boardCode,
        colorTag: sb.colorTag,
        startIndex: cursorIdx,
        count: sb.circuits.length,
        dpmsWatts: sb.simultaneousWatts,
      });
      cursorIdx += sb.circuits.length;
    }
  });

  return (
    <div className="space-y-6 text-slate-900">
      {/* 1. Header Summary Card */}
      <div className="bg-slate-100 border-2 border-[#0f2b48] rounded-xl p-5 shadow-sm text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-wide uppercase flex items-center gap-2 text-[#0f2b48]">
              <Zap className="w-5 h-5 text-amber-600" />
              {activeDiagram === 'unifilar'
                ? `ESQUEMA UNIFILAR TCE → ${sectionalBoards.map((s) => s.boardCode).join(' / ')} (${params.area} m²)`
                : `DIAGRAMA MULTIFILAR Y BALANCE DE FASES TCE (380V / 220V)`}
            </h2>
            <p className="text-xs text-slate-700 mt-1">
              Normas AEA 90364-7-770 · Tabla 770.12.I (Ib ≤ In ≤ Iz a 40 °C) · Ley Provincial N° 10281 (Córdoba)
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white border border-[#0f2b48] rounded-lg p-2.5 text-xs font-mono">
            <div>
              <span className="text-slate-600 block font-sans font-semibold">Potencia Instalada</span>
              <span className="text-base font-bold text-slate-900">
                {demand.totalInstalledWatts.toLocaleString('es-AR')} W
              </span>
            </div>
            <div className="w-px h-8 bg-slate-300" />
            <div>
              <span className="text-slate-600 block font-sans font-semibold">Demanda Simultánea (DPMS)</span>
              <span className="text-base font-bold text-amber-700">
                {demand.simultaneousDemandWatts.toLocaleString('es-AR')} W ({demand.demandedAmps} A)
              </span>
            </div>
            <div className="w-px h-8 bg-slate-300" />
            <div>
              <span className="text-slate-600 block font-sans font-semibold">Cabecera TCE</span>
              <span className="text-base font-bold text-emerald-800">
                {demand.isThreePhase ? '3P+N' : '2P'} - {demand.generalBreakerAmps} A
              </span>
            </div>
          </div>
        </div>

        {/* View Toggle Bar: Unifilar vs Multifilar */}
        <div className="mt-4 pt-3 border-t border-slate-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-slate-200 p-1 rounded-lg border border-slate-300">
            <button
              onClick={() => setManualDiagram('unifilar')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${
                activeDiagram === 'unifilar'
                  ? 'bg-[#0f2b48] text-white shadow-sm'
                  : 'text-slate-800 hover:text-slate-900 hover:bg-slate-300/80'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5 text-amber-400" />
              1. Esquema Unifilar (TCE → Seccionales)
            </button>

            <button
              onClick={() => setManualDiagram('multifilar')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${
                activeDiagram === 'multifilar'
                  ? 'bg-[#0f2b48] text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/80'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              2. Diagrama Multifilar y Balance de Fases L1, L2, L3
              {demand.isThreePhase && (
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full uppercase">
                  Trifásico
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 font-medium hidden sm:inline">
              Pilar → TCE: <strong className="text-slate-900">{demand.subfeederSectionMm} mm² Cu</strong> (Iz = {demand.cableCapacityIz} A ≥ In = {demand.generalBreakerAmps} A)
            </span>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 text-xs font-bold bg-[#0f2b48] hover:bg-slate-800 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-sm print:hidden"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              Imprimir Esquemas (Ctrl+P)
            </button>
          </div>
        </div>
      </div>

      {/* 2A. MULTIFILAR DIAGRAM VIEW - Only prints if active */}
      <div className={`space-y-4 avoid-break ${activeDiagram === 'multifilar' ? 'block' : 'hidden'}`}>
        {/* Phase Balance Summary Cards */}
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-3">
          <div className="bg-slate-100 border-2 border-[#0f2b48] text-[#0f2b48] px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-700" />
              CUADRO DE BALANCE DE FASES EN TCE Y DESEQUILIBRIO (AEA 90364-7-770)
            </span>
            {phaseBalance.isBalanced ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-400 text-xs font-bold rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                Balance Óptimo ({phaseBalance.unbalancePercent}% ≤ 15%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-400 text-xs font-bold rounded-full">
                <Sliders className="w-3.5 h-3.5 text-amber-700" />
                Desequilibrio: {phaseBalance.unbalancePercent}%
              </span>
            )}
          </div>

          {/* Step 1: Equilibrio de Fases DENTRO de cada Tablero Seccional */}
          <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <span className="font-extrabold text-[#0f2b48] uppercase text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-700" />
                1° Equilibrio Interno por Tablero Seccional ({sectionalBoards.map((s) => s.boardCode).join(', ')})
              </span>
              <span className="text-[11px] text-slate-600 font-medium">
                Cada tablero seccional equilibra primero sus circuitos en L1, L2, L3 antes de consolidar en TCE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {sectionalBoards.map((sb) => {
                const ipb = sb.internalPhaseBalance;
                return (
                  <div
                    key={sb.floorId}
                    className="bg-white border border-slate-300 rounded-lg p-3 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-1 border-b border-slate-200 pb-1.5">
                      <div>
                        <span className="px-2 py-0.5 bg-[#0f2b48] text-amber-300 font-mono font-black text-[11px] rounded">
                          {sb.boardCode}
                        </span>
                        {sb.colorTag && (
                          <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold text-slate-700">
                            {sb.colorTag}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          ipb.isBalanced
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {sb.isThreePhase ? `Deseq: ${ipb.unbalancePercent}%` : `1F: ${sb.assignedPhase}`}
                      </span>
                    </div>

                    <div className="text-[11px] font-bold text-slate-700 truncate" title={sb.boardName}>
                      {sb.boardName}
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-center">
                      <div className="bg-amber-50 border border-amber-200 rounded p-1">
                        <span className="block font-bold text-amber-900">L1</span>
                        <span className="font-black text-slate-900">{ipb.wattsL1}W</span>
                        <span className="block text-[9px] text-amber-800">{ipb.ampsL1}A</span>
                      </div>
                      <div className="bg-slate-100 border border-slate-300 rounded p-1">
                        <span className="block font-bold text-slate-800">L2</span>
                        <span className="font-black text-slate-900">{ipb.wattsL2}W</span>
                        <span className="block text-[9px] text-slate-700">{ipb.ampsL2}A</span>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded p-1">
                        <span className="block font-bold text-purple-900">L3</span>
                        <span className="font-black text-slate-900">{ipb.wattsL3}W</span>
                        <span className="block text-[9px] text-purple-800">{ipb.ampsL3}A</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {sb.circuits.map((c) => {
                        const ph = ipb.circuitPhases[c.id] || 'L1';
                        const badgeCls =
                          ph === 'L1'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : ph === 'L2'
                            ? 'bg-slate-200 text-slate-900 border-slate-400'
                            : ph === 'L3'
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : 'bg-red-100 text-red-900 border-red-300';
                        return (
                          <span
                            key={c.id}
                            className={`px-1.5 py-0.2 rounded border font-mono text-[9.5px] font-bold ${badgeCls}`}
                          >
                            {c.id}:{ph}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Consolidación Global en TCE */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="font-extrabold text-[#0f2b48] uppercase text-xs flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              2° Balance Consolidado en Cabecera TCE (Suma de Seccionales):
            </span>
          </div>

          {/* 3-Phase Cards Grid (L1, L2, L3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Phase L1 (R) */}
            <div className="bg-amber-50/60 border-2 border-amber-600/40 rounded-xl p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <span className="font-extrabold text-xs text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-600 inline-block" />
                  FASE L1 (R) - 220 V~
                </span>
                <span className="text-xs font-mono font-bold text-amber-900">
                  {phaseBalance.ampsL1} A
                </span>
              </div>
              <div className="text-2xl font-black text-amber-900 font-mono tracking-tight">
                {phaseBalance.wattsL1.toLocaleString('es-AR')} <span className="text-xs font-normal text-slate-600">W</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase block">Circuitos Asignados:</span>
                <div className="flex flex-wrap gap-1">
                  {phaseBalance.l1Circuits.map((c) => (
                    <span
                      key={c.id}
                      className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded font-mono text-[10px] font-bold"
                    >
                      [{c.boardCode || 'TCE'}] {c.id} ({c.t})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Phase L2 (S) */}
            <div className="bg-slate-100/80 border-2 border-slate-600/40 rounded-xl p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-300 pb-2">
                <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-slate-800 inline-block" />
                  FASE L2 (S) - 220 V~
                </span>
                <span className="text-xs font-mono font-bold text-slate-900">
                  {phaseBalance.ampsL2} A
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {phaseBalance.wattsL2.toLocaleString('es-AR')} <span className="text-xs font-normal text-slate-600">W</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase block">Circuitos Asignados:</span>
                <div className="flex flex-wrap gap-1">
                  {phaseBalance.l2Circuits.map((c) => (
                    <span
                      key={c.id}
                      className="px-2 py-0.5 bg-slate-200 text-slate-900 border border-slate-400 rounded font-mono text-[10px] font-bold"
                    >
                      [{c.boardCode || 'TCE'}] {c.id} ({c.t})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Phase L3 (T) */}
            <div className="bg-purple-50/60 border-2 border-purple-600/40 rounded-xl p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                <span className="font-extrabold text-xs text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-purple-700 inline-block" />
                  FASE L3 (T) - 220 V~
                </span>
                <span className="text-xs font-mono font-bold text-purple-900">
                  {phaseBalance.ampsL3} A
                </span>
              </div>
              <div className="text-2xl font-black text-purple-900 font-mono tracking-tight">
                {phaseBalance.wattsL3.toLocaleString('es-AR')} <span className="text-xs font-normal text-slate-600">W</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase block">Circuitos Asignados:</span>
                <div className="flex flex-wrap gap-1">
                  {phaseBalance.l3Circuits.map((c) => (
                    <span
                      key={c.id}
                      className="px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-300 rounded font-mono text-[10px] font-bold"
                    >
                      [{c.boardCode || 'TCE'}] {c.id} ({c.t})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SVG Vector Canvas: Diagrama Multifilar (3P + N + PE) */}
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-3">
          <div className="bg-slate-100 border-2 border-[#0f2b48] text-[#0f2b48] px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide flex flex-wrap items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-700" />
              DIAGRAMA MULTIFILAR ESQUEMÁTICO POR TABLEROS (R, S, T, N, PE)
            </span>

            <div className="flex items-center gap-3 bg-white/70 px-3 py-1 rounded-lg border border-[#0f2b48]/20 no-print">
              <Sliders className="w-3.5 h-3.5 text-slate-600" />
              <label className="text-[10px] font-bold text-slate-700 uppercase">Espaciado Horizontal:</label>
              <input
                type="range"
                min="105"
                max="230"
                value={circuitSpacing}
                onChange={(e) => setCircuitSpacing(parseInt(e.target.value))}
                className="w-32 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0f2b48]"
              />
              <span className="text-[10px] font-mono w-10">{circuitSpacing}px</span>
            </div>

            <span className="text-xs font-mono bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded border border-amber-300 font-bold">
              Tensión {demand.isThreePhase ? 'Trifásica 380V / 220V' : 'Monofásica 220V'}
            </span>
          </div>

          <div className="overflow-x-auto print:overflow-visible bg-slate-50 print:bg-white rounded-lg p-4 border border-slate-200 print:border-none">
            {(() => {
              const totalCircuits = orderedMultifilarCircuits.length;
              const startX = 250;
              const svgWidth = Math.max(960, totalCircuits * circuitSpacing + startX + 80);
              const svgHeight = 490;

              return (
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-auto min-w-[900px] font-sans print:min-w-0"
                  style={{ maxHeight: 'none' }}
                >
                  <rect width="100%" height="100%" fill="#ffffff" rx="8" />

                  {/* Busbar Labels Left */}
                  <text x="14" y="39" fill="#92400e" fontSize="12" fontWeight="extrabold">
                    {demand.isThreePhase ? 'L1 (R)' : 'Fase (F)'}
                  </text>
                  <text
                    x="14"
                    y="64"
                    fill={demand.isThreePhase ? '#1e293b' : '#94a3b8'}
                    fontSize={demand.isThreePhase ? '12' : '10'}
                    fontWeight="extrabold"
                  >
                    {demand.isThreePhase ? 'L2 (S)' : 'L2 (Libre)'}
                  </text>
                  <text
                    x="14"
                    y="89"
                    fill={demand.isThreePhase ? '#6b21a8' : '#94a3b8'}
                    fontSize={demand.isThreePhase ? '12' : '10'}
                    fontWeight="extrabold"
                  >
                    {demand.isThreePhase ? 'L3 (T)' : 'L3 (Libre)'}
                  </text>
                  <text x="14" y="114" fill="#0284c7" fontSize="12" fontWeight="extrabold">Neutro (N)</text>
                  <text x="14" y="139" fill="#16a34a" fontSize="12" fontWeight="extrabold">Tierra (PE)</text>

                  {/* 5 Horizontal Busbars */}
                  <line x1="92" y1="35" x2={svgWidth - 25} y2="35" stroke="#92400e" strokeWidth="4" />
                  <line
                    x1="92"
                    y1="60"
                    x2={svgWidth - 25}
                    y2="60"
                    stroke={demand.isThreePhase ? '#1e293b' : '#cbd5e1'}
                    strokeWidth={demand.isThreePhase ? '4' : '2'}
                    strokeDasharray={demand.isThreePhase ? undefined : '5,5'}
                  />
                  <line
                    x1="92"
                    y1="85"
                    x2={svgWidth - 25}
                    y2="85"
                    stroke={demand.isThreePhase ? '#6b21a8' : '#cbd5e1'}
                    strokeWidth={demand.isThreePhase ? '4' : '2'}
                    strokeDasharray={demand.isThreePhase ? undefined : '5,5'}
                  />
                  <line x1="92" y1="110" x2={svgWidth - 25} y2="110" stroke="#0284c7" strokeWidth="4" />
                  <line x1="92" y1="135" x2={svgWidth - 25} y2="135" stroke="#16a34a" strokeWidth="4" strokeDasharray="8,3" />

                  {/* Main TCE Switch Box at left */}
                  <rect x="44" y="156" width="144" height="48" rx="5" fill="#ffffff" stroke="#0f2b48" strokeWidth="2" />
                  <text x="116" y="175" fill="#0f2b48" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                    Cabecera TCE ({demand.isThreePhase ? '3P+N' : '2P'})
                  </text>
                  <text x="116" y="191" fill="#2563eb" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                    PIA {demand.generalBreakerAmps} A · {demand.subfeederSectionMm} mm²
                  </text>

                  {/* Sectional Feeders Badge */}
                  <rect x="44" y="214" width="144" height="46" rx="5" fill="#eff6ff" stroke="#0284c7" strokeWidth="1.8" />
                  <text x="116" y="232" fill="#0369a1" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                    {sectionalBoards.length} Seccionales
                  </text>
                  <text x="116" y="248" fill="#0284c7" fontSize="9" fontWeight="bold" textAnchor="middle">
                    ID 30 mA en c/ TS
                  </text>

                  {/* Grounding Rod Connection (PE) */}
                  <line x1="116" y1="260" x2="116" y2="294" stroke="#16a34a" strokeWidth="2.5" strokeDasharray="3,2" />
                  <rect x="44" y="294" width="144" height="36" rx="5" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.5" />
                  <text x="116" y="309" fill="#15803d" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                    Jabalina PAT 10 mm²
                  </text>
                  <text x="116" y="323" fill="#166534" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                    IRAM 2309 (R ≤ 10 Ω)
                  </text>

                  {/* Tablero Seccional Group Banners */}
                  {multifilarBoardGroups.map((grp) => {
                    const grpX = startX + grp.startIndex * circuitSpacing - 32;
                    const grpW = Math.max(88, (grp.count - 1) * circuitSpacing + 88);
                    const grpLabel = `${grp.boardCode}${grp.colorTag ? ` (${grp.colorTag})` : ''} · ${grp.dpmsWatts.toLocaleString('es-AR')}W`;
                    return (
                      <g key={grp.boardCode + grp.startIndex}>
                        <rect
                          x={grpX}
                          y="150"
                          width={grpW}
                          height="22"
                          rx="4"
                          fill={grp.boardCode === 'TCE Directo' ? '#fef2f2' : '#0f2b48'}
                          stroke={grp.boardCode === 'TCE Directo' ? '#dc2626' : '#0f2b48'}
                          strokeWidth="1.2"
                        />
                        <text
                          x={grpX + grpW / 2}
                          y="165"
                          fill={grp.boardCode === 'TCE Directo' ? '#991b1b' : '#fbbf24'}
                          fontSize="9.5"
                          fontWeight="black"
                          textAnchor="middle"
                        >
                          {grpLabel}
                        </text>
                      </g>
                    );
                  })}

                  {/* Empty state if 0 circuits */}
                  {orderedMultifilarCircuits.length === 0 && (
                    <text x={svgWidth / 2} y="250" fill="#64748b" fontSize="13" fontWeight="bold" textAnchor="middle">
                      Sin cargas colocadas. Agregá bocas en Pestaña 1 o Pestaña 2 para generar el multifilar.
                    </text>
                  )}

                  {/* Render Circuits grouped with clear 1F/3F taps */}
                  {orderedMultifilarCircuits.map((circ, idx) => {
                    const posX = startX + idx * circuitSpacing;
                    const color = CIRCUIT_COLORS[circ.t] || '#0f2b48';
                    const { phaseY, phaseName, phaseColor, isThreePhase } = getCircuitPhase(circ);
                    const bCode = circ.boardCode || 'TS1';
                    const polesLabel = isThreePhase ? '4P' : '2P';

                    return (
                      <g key={circ.id}>
                        {isThreePhase ? (
                          <>
                            {/* 3-Phase Taps L1, L2, L3 */}
                            <line x1={posX - 6} y1="35" x2={posX - 6} y2="196" stroke="#92400e" strokeWidth="2.3" />
                            <circle cx={posX - 6} cy="35" r="4.5" fill="#92400e" stroke="#ffffff" strokeWidth="0.9" />
                            <line x1={posX} y1="60" x2={posX} y2="196" stroke="#1e293b" strokeWidth="2.3" />
                            <circle cx={posX} cy="60" r="4.5" fill="#1e293b" stroke="#ffffff" strokeWidth="0.9" />
                            <line x1={posX + 6} y1="85" x2={posX + 6} y2="196" stroke="#6b21a8" strokeWidth="2.3" />
                            <circle cx={posX + 6} cy="85" r="4.5" fill="#6b21a8" stroke="#ffffff" strokeWidth="0.9" />
                            {/* Neutral + PE */}
                            <line x1={posX + 14} y1="110" x2={posX + 14} y2="196" stroke="#0284c7" strokeWidth="2.3" />
                            <circle cx={posX + 14} cy="110" r="4.2" fill="#0284c7" stroke="#ffffff" strokeWidth="0.9" />
                            <line x1={posX + 22} y1="135" x2={posX + 22} y2="196" stroke="#16a34a" strokeWidth="2" strokeDasharray="4,2" />
                            <circle cx={posX + 22} cy="135" r="4" fill="#16a34a" stroke="#ffffff" strokeWidth="0.9" />
                          </>
                        ) : (
                          <>
                            {/* Single Phase Tap */}
                            <line x1={posX} y1={phaseY} x2={posX} y2="196" stroke={phaseColor} strokeWidth="2.5" />
                            <circle cx={posX} cy={phaseY} r="5" fill={phaseColor} stroke="#ffffff" strokeWidth="1" />
                            {/* Neutral */}
                            <line x1={posX + 12} y1="110" x2={posX + 12} y2="196" stroke="#0284c7" strokeWidth="2.5" />
                            <circle cx={posX + 12} cy="110" r="4.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />
                            {/* PE */}
                            <line x1={posX + 24} y1="135" x2={posX + 24} y2="196" stroke="#16a34a" strokeWidth="2" strokeDasharray="4,2" />
                            <circle cx={posX + 24} cy="135" r="4" fill="#16a34a" stroke="#ffffff" strokeWidth="1" />
                          </>
                        )}

                        {/* Circuit Breaker Box */}
                        <rect
                          x={posX - 20}
                          y="194"
                          width="64"
                          height="58"
                          rx="6"
                          fill="#ffffff"
                          stroke={isThreePhase ? '#dc2626' : '#0f2b48'}
                          strokeWidth="2"
                        />
                        <text x={posX + 12} y="211" fill="#0f2b48" fontSize="10.5" fontWeight="black" textAnchor="middle">
                          {circ.id} · {bCode}
                        </text>
                        <text x={posX + 12} y="227" fill="#2563eb" fontSize="10" fontWeight="bold" textAnchor="middle">
                          {polesLabel} {circ.B}A
                        </text>
                        <text x={posX + 12} y="243" fill={phaseColor} fontSize="9.5" fontWeight="extrabold" textAnchor="middle">
                          {isThreePhase ? '3F R-S-T' : phaseName}
                        </text>

                        {/* Connection line down to Circuit Node */}
                        <line x1={posX + 12} y1="252" x2={posX + 12} y2="292" stroke={color} strokeWidth="4" />
                        <circle cx={posX + 12} cy="308" r="17" fill={color} stroke="#0f2b48" strokeWidth="1.5" />
                        <text x={posX + 12} y="313" fill="#ffffff" fontSize="11.5" fontWeight="black" textAnchor="middle">
                          {circ.t}
                        </text>

                        {/* Circuit Label Details Card (>=9.5pt) */}
                        <g transform={`translate(${posX + 12}, 340)`}>
                          <rect x="-52" y="-5" width="104" height="114" rx="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
                          <text x="0" y="14" fill="#0f172a" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                            {circ.d.length > 15 ? circ.d.slice(0, 14) + '..' : circ.d}
                          </text>
                          <text x="0" y="32" fill="#475569" fontSize="10" textAnchor="middle">
                            {circ.q}
                          </text>
                          <text x="0" y="50" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">
                            {circ.s} mm² Cu
                          </text>
                          <text x="0" y="68" fill="#0f2b48" fontSize="10" fontWeight="black" textAnchor="middle">
                            {circ.W} W ({circ.I.toFixed(1)}A)
                          </text>
                          <text x="0" y="86" fill="#2563eb" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                            ΔV: {circ.deltaV}%
                          </text>
                          <text x="0" y="102" fill="#64748b" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                            Ø{circ.conduitMm}mm · PE {circ.sPE}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
          </div>
        </div>
      </div>

      {/* 2B. UNIFILAR DIAGRAM VIEW - Only prints if active */}
      <div className={`bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-3 avoid-break ${activeDiagram === 'unifilar' ? 'block' : 'hidden'}`}>
        <div className="bg-slate-100 border-2 border-[#0f2b48] text-[#0f2b48] px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            ESQUEMA UNIFILAR RADIAL: PILAR → TCE → {sectionalBoards.map((s) => s.boardCode).join(', ')}
          </span>
          <span className="text-xs font-mono bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded border border-blue-300 font-bold">
            Pilar → TCE: {demand.subfeederSectionMm} mm² Cu ({demand.isThreePhase ? '5 cond.' : '3 cond.'})
          </span>
        </div>

        {/* Radial TCE -> TS Normative Callout */}
        <div className="bg-amber-50 border-2 border-amber-400 text-amber-950 p-3 rounded-lg text-xs font-medium space-y-1">
          <strong className="text-amber-900 font-extrabold flex items-center gap-1.5 text-xs">
            <Zap className="w-4 h-4 text-amber-600 fill-current" />
            Topología Radial Cabecera TCE → Tableros Seccionales ({sectionalBoards.map((s) => s.boardCode).join(', ')}):
          </strong>
          <p>
            El <strong>Tablero Central de Entrada (TCE)</strong> recibe la acometida desde el pilar de medición EPEC y distribuye mediante <strong>{sectionalBoards.length} Interruptores Termomagnéticos Seccionales independientes</strong> hacia cada tablero ({sectionalBoards.map((s) => `${s.boardCode}: ${s.cableSectionMm}mm²`).join(' · ')}), garantizando selectividad, balance térmico (Ib ≤ In ≤ Iz a 40 °C) y caída de tensión reglamentaria (ΔV línea ≤ 1.5%).
          </p>
        </div>

        <div className="overflow-x-auto print:overflow-visible bg-slate-50 print:bg-white rounded-lg p-4 border border-slate-200 print:border-none">
          {(() => {
            const maxCircuitsInAnyTs = sectionalBoards.reduce(
              (max, sb) => Math.max(max, sb.circuits.length),
              1
            );
            const tceFeederCount = sectionalBoards.length + directTceCircuits.length;
            const tsBlockHeight = 282;
            const tsBlockGap = 48;
            const tsStartY = 365;

            const neededWidthForTce = 220 + tceFeederCount * 155 + 60;
            const neededWidthForTs = 300 + maxCircuitsInAnyTs * 116 + 70;
            const svgWidth = Math.max(960, neededWidthForTce, neededWidthForTs);
            const svgHeight =
              tsStartY + Math.max(1, sectionalBoards.length) * (tsBlockHeight + tsBlockGap) + 20;

            return (
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto min-w-[880px] font-sans print:min-w-0"
                style={{ maxHeight: 'none' }}
              >
                <rect width="100%" height="100%" fill="#ffffff" rx="8" />

                {/* Top: Medidor -> Interruptor General TCE */}
                <rect x="135" y="14" width="120" height="44" rx="5" fill="#f8fafc" stroke="#0f2b48" strokeWidth="1.8" />
                <text x="195" y="33" fill="#0f2b48" fontSize="11" fontWeight="bold" textAnchor="middle">
                  Medidor EPEC
                </text>
                <text x="195" y="48" fill="#475569" fontSize="9" textAnchor="middle">
                  {demand.isThreePhase ? '380 V~ (ET 22)' : '220 V~ (ET 21)'}
                </text>

                <line x1="195" y1="58" x2="195" y2="84" stroke="#0f2b48" strokeWidth="3" />

                <rect x="120" y="84" width="150" height="46" rx="5" fill="#ffffff" stroke="#0f2b48" strokeWidth="2" />
                <text x="195" y="103" fill="#0f2b48" fontSize="10" fontWeight="bold" textAnchor="middle">
                  PIA Cabecera TCE
                </text>
                <text x="195" y="120" fill="#2563eb" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                  {demand.isThreePhase ? '3P+N' : '2P'} – {demand.generalBreakerAmps} A
                </text>

                {/* Feeder Pilar -> TCE */}
                <line x1="195" y1="130" x2="195" y2="178" stroke="#0f2b48" strokeWidth="3" />
                <text x="206" y="158" fill="#334155" fontSize="9.5" fontWeight="bold">
                  Línea Principal Pilar → TCE: {demand.subfeederSectionMm} mm² Cu + PE ({(params.distPillar || 0) + (params.L || 6)} m)
                </text>

                {/* PAT Jabalina connected to TCE at right of Medidor/Main */}
                <rect x="330" y="14" width="155" height="52" rx="6" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.6" />
                <text x="407" y="34" fill="#15803d" fontSize="10" fontWeight="bold" textAnchor="middle">
                  PAT Jabalina 10 mm² Cu
                </text>
                <text x="407" y="50" fill="#166534" fontSize="9" fontWeight="bold" textAnchor="middle">
                  IRAM 2309 (R ≤ 10 Ω)
                </text>
                <line x1="330" y1="40" x2="295" y2="40" stroke="#16a34a" strokeWidth="2.5" strokeDasharray="4,3" />
                <line x1="295" y1="40" x2="295" y2="178" stroke="#16a34a" strokeWidth="2.5" strokeDasharray="4,3" />
                <circle cx="295" cy="178" r="4.5" fill="#16a34a" />

                {/* TCE Enclosing Cabinet Box */}
                <rect
                  x="130"
                  y="168"
                  width={svgWidth - 155}
                  height="154"
                  rx="8"
                  fill="#f8fafc"
                  stroke="#0f2b48"
                  strokeWidth="2.2"
                />
                <text x="148" y="190" fill="#0f2b48" fontSize="11" fontWeight="black">
                  TCE — TABLERO CENTRAL DE ENTRADA ({allCircuits.length} circuitos totales · DPMS: {demand.simultaneousDemandWatts.toLocaleString('es-AR')} W)
                </text>

                {/* TCE Main Busbar */}
                <line x1="150" y1="205" x2={svgWidth - 45} y2="205" stroke="#0f2b48" strokeWidth="4" />

                {/* Outgoing Sectional PIAs on TCE Busbar */}
                {sectionalBoards.map((sb, idx) => {
                  const piaX = 225 + idx * 155;
                  const riserX = 24 + idx * 18;
                  const channelY = 330 + idx * 7;
                  const tsBoxY = tsStartY + idx * (tsBlockHeight + tsBlockGap);
                  const tsTapY = tsBoxY + 56;

                  return (
                    <g key={sb.floorId}>
                      {/* Drop from TCE Busbar to PIA Seccional */}
                      <line x1={piaX} y1="205" x2={piaX} y2="225" stroke="#0f2b48" strokeWidth="2.5" />
                      <rect x={piaX - 64} y="225" width="128" height="68" rx="5" fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
                      <text x={piaX} y="242" fill="#92400e" fontSize="10" fontWeight="black" textAnchor="middle">
                        PIA → {sb.boardCode}{sb.colorTag ? ` (${sb.colorTag})` : ''}
                      </text>
                      <text x={piaX} y="257" fill="#b45309" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                        {sb.isThreePhase ? '4P' : '2P'} – {sb.tceBreakerIn} A ({sb.assignedPhase})
                      </text>
                      <text x={piaX} y="272" fill="#78350f" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                        {sb.cableSectionMm} mm² · ΔV {sb.feederDeltaVPercent}%
                      </text>
                      <text x={piaX} y="286" fill="#92400e" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                        {sb.simultaneousWatts} W ({sb.circuits.length} ctos)
                      </text>

                      {/* Radial Feeder Routing through Left Riser Shaft */}
                      <polyline
                        points={`${piaX},293 ${piaX},${channelY} ${riserX},${channelY} ${riserX},${tsTapY} 152,${tsTapY}`}
                        fill="none"
                        stroke="#d97706"
                        strokeWidth="2.8"
                        strokeDasharray="6,3"
                      />
                      <circle cx={152} cy={tsTapY} r="4.5" fill="#d97706" />
                    </g>
                  );
                })}

                {/* Direct TCE CUE circuits if any */}
                {directTceCircuits.map((circ, idx) => {
                  const posX = 225 + (sectionalBoards.length + idx) * 155;
                  const color = CIRCUIT_COLORS[circ.t] || '#dc2626';
                  const { phaseName, isThreePhase } = getCircuitPhase(circ);
                  const polesLabel = isThreePhase ? '4P' : '2P';
                  return (
                    <g key={circ.id}>
                      <line x1={posX} y1="205" x2={posX} y2="225" stroke="#0f2b48" strokeWidth="2.5" />
                      <rect x={posX - 64} y="225" width="128" height="74" rx="5" fill="#fef2f2" stroke={color} strokeWidth="2" />
                      <text x={posX} y="241" fill="#991b1b" fontSize="10" fontWeight="black" textAnchor="middle">
                        {circ.id} (Directo TCE)
                      </text>
                      <text x={posX} y="256" fill="#dc2626" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                        {polesLabel} {circ.B}A · {isThreePhase ? '3F' : phaseName}
                      </text>
                      <text x={posX} y="271" fill="#7f1d1d" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                        {circ.s}mm² Cu · ΔV {circ.deltaV}%
                      </text>
                      <text x={posX} y="286" fill="#0f172a" fontSize="8.5" fontWeight="extrabold" textAnchor="middle">
                        {circ.W} W ({circ.I.toFixed(1)}A)
                      </text>
                    </g>
                  );
                })}

                {/* Individual Tablero Seccional Blocks (TS1, TS2, TS3, TS4...) */}
                {sectionalBoards.map((sb, idx) => {
                  const tsBoxY = tsStartY + idx * (tsBlockHeight + tsBlockGap);
                  const tsBoxX = 135;
                  const tsBoxWidth = svgWidth - 160;
                  const busY = tsBoxY + 95;

                  return (
                    <g key={sb.floorId}>
                      {/* Feeder Line Spec Banner directly above TS Box */}
                      <text x={tsBoxX + 12} y={tsBoxY - 8} fill="#92400e" fontSize="10" fontWeight="bold">
                        Alimentación TCE → {sb.boardCode}: {sb.conductorSpec} · Dist: {sb.feederLengthM} m · Caño Ø{sb.conduitMm} mm · ΔV Lín: {sb.feederDeltaVPercent}% · {sb.assignedPhase}
                      </text>

                      {/* TS Container */}
                      <rect
                        x={tsBoxX}
                        y={tsBoxY}
                        width={tsBoxWidth}
                        height={tsBlockHeight}
                        rx="8"
                        fill="#ffffff"
                        stroke="#0284c7"
                        strokeWidth="2.2"
                        strokeDasharray="7,4"
                      />

                      {/* TS Header */}
                      <text x={tsBoxX + 18} y={tsBoxY + 22} fill="#0369a1" fontSize="11" fontWeight="black">
                        {sb.boardCode}{sb.colorTag ? ` [${sb.colorTag}]` : ''} — {sb.boardName.toUpperCase()} ({sb.circuits.length} circuitos · DPMS: {sb.simultaneousWatts.toLocaleString('es-AR')} W · Ib: {sb.designCurrentIb} A · Gabinete {sb.recommendedDinBox} mód.)
                      </text>

                      {/* Diferencial inside TS */}
                      <rect x={152} y={tsBoxY + 36} width="112" height="44" rx="5" fill="#f0f9ff" stroke="#0284c7" strokeWidth="1.8" />
                      <text x="208" y={tsBoxY + 54} fill="#0369a1" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                        Diferencial {sb.boardCode}
                      </text>
                      <text x="208" y={tsBoxY + 70} fill="#0284c7" fontSize="9" fontWeight="bold" textAnchor="middle">
                        {sb.rcdPoles} {sb.rcdAmps}A – 30 mA
                      </text>

                      {/* TS Busbar */}
                      <line x1="208" y1={tsBoxY + 80} x2="208" y2={busY} stroke="#0f2b48" strokeWidth="2.8" />
                      <line x1="208" y1={busY} x2={tsBoxX + tsBoxWidth - 24} y2={busY} stroke="#0f2b48" strokeWidth="3.2" />

                      {/* Empty TS notice */}
                      {sb.circuits.length === 0 && (
                        <text
                          x={tsBoxX + tsBoxWidth / 2}
                          y={busY + 75}
                          fill="#64748b"
                          fontSize="11"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          Sin bocas o cargas colocadas en {sb.boardCode}. Ingresá cargas en Pestaña 1 o Pestaña 2.
                        </text>
                      )}

                      {/* Terminal Circuits inside this TS */}
                      {sb.circuits.map((circ, cIdx) => {
                        const posX = 320 + cIdx * 116;
                        const color = CIRCUIT_COLORS[circ.t] || '#0f2b48';
                        const { phaseName, phaseColor, isThreePhase } = getCircuitPhase(circ);
                        const polesLabel = isThreePhase ? '4P' : '2P';
                        return (
                          <g key={circ.id}>
                            <line x1={posX} y1={busY} x2={posX} y2={busY + 22} stroke="#0f2b48" strokeWidth="2.2" />
                            <rect
                              x={posX - 42}
                              y={busY + 22}
                              width="84"
                              height="46"
                              rx="4"
                              fill="#ffffff"
                              stroke={isThreePhase ? '#dc2626' : '#0f2b48'}
                              strokeWidth="1.6"
                            />
                            <text x={posX} y={busY + 36} fill="#0f2b48" fontSize="10" fontWeight="black" textAnchor="middle">
                              {circ.id} · {phaseName}
                            </text>
                            <text x={posX} y={busY + 50} fill="#2563eb" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                              {polesLabel} {circ.B} A
                            </text>
                            <text x={posX} y={busY + 62} fill={phaseColor} fontSize="8.5" fontWeight="bold" textAnchor="middle">
                              {isThreePhase ? '380V 3F' : '220V 1F'}
                            </text>

                            <line x1={posX} y1={busY + 68} x2={posX} y2={busY + 90} stroke={color} strokeWidth="3.2" />
                            <circle cx={posX} cy={busY + 104} r="14" fill={color} stroke="#0f2b48" strokeWidth="1.2" />
                            <text x={posX} y={busY + 108} fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
                              {circ.t}
                            </text>

                            <text x={posX} y={busY + 130} fill="#0f172a" fontSize="9" fontWeight="bold" textAnchor="middle">
                              {circ.d.length > 15 ? circ.d.slice(0, 14) + '..' : circ.d}
                            </text>
                            <text x={posX} y={busY + 143} fill="#475569" fontSize="8.5" textAnchor="middle">
                              {circ.q}
                            </text>
                            <text x={posX} y={busY + 157} fill="#0f172a" fontSize="9" fontWeight="bold" textAnchor="middle">
                              {circ.s} mm² · ΔV {circ.deltaV}%
                            </text>
                            <text x={posX} y={busY + 171} fill="#0f2b48" fontSize="9" fontWeight="black" textAnchor="middle">
                              {circ.W} W ({circ.I.toFixed(1)}A)
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            );
          })()}
        </div>
      </div>

      {/* 3. TCE -> TABLEROS SECCIONALES: DISEÑO DE LÍNEAS DE ALIMENTACIÓN */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-3 avoid-break">
        <div className="bg-slate-100 border-2 border-[#0f2b48] text-[#0f2b48] px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Cable className="w-4 h-4 text-amber-700" />
            TCE → TABLEROS SECCIONALES: DISEÑO DE LÍNEAS DE ALIMENTACIÓN (AEA 770.12.I)
          </span>
          <span className="text-xs font-mono font-bold text-slate-800">
            Criterio: Ib ≤ In ≤ Iz (40 °C) y ΔV Seccional ≤ 1.5%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-300 border-collapse">
            <thead>
              <tr className="bg-[#0f2b48] text-white font-bold">
                <th className="p-2 border border-slate-500">Tablero</th>
                <th className="p-2 border border-slate-500">Sector / Planta</th>
                <th className="p-2 border border-slate-500">Dist. (m)</th>
                <th className="p-2 border border-slate-500">Fase TCE</th>
                <th className="p-2 border border-slate-500">DPMS (W)</th>
                <th className="p-2 border border-slate-500">Ib (A)</th>
                <th className="p-2 border border-slate-500">PIA TCE</th>
                <th className="p-2 border border-slate-500">Cable TCE → TS (Cu + PE)</th>
                <th className="p-2 border border-slate-500">Iz (A)</th>
                <th className="p-2 border border-slate-500">Caño</th>
                <th className="p-2 border border-slate-500">ΔV Lín / Tot</th>
                <th className="p-2 border border-slate-500">Diferencial TS</th>
                <th className="p-2 border border-slate-500">Gabinete DIN</th>
                <th className="p-2 border border-slate-500 text-center">Verif.</th>
              </tr>
            </thead>
            <tbody>
              {sectionalBoards.map((sb, idx) => (
                <tr key={sb.floorId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-2 border border-slate-300 font-black font-mono text-[#0f2b48]">
                    {sb.boardCode}
                    {sb.colorTag && (
                      <span className="block text-[9.5px] font-sans font-bold text-slate-500">
                        ({sb.colorTag})
                      </span>
                    )}
                  </td>
                  <td className="p-2 border border-slate-300 font-semibold text-slate-800">
                    {sb.boardName}
                    <span className="block text-[10px] text-slate-500">
                      {sb.circuits.length} ctos · Inst: {sb.installedWatts.toLocaleString('es-AR')} W
                    </span>
                  </td>
                  <td className="p-2 border border-slate-300 font-mono text-slate-800">
                    {sb.feederLengthM} m
                  </td>
                  <td className="p-2 border border-slate-300 font-mono font-bold text-purple-900">
                    {sb.assignedPhase}
                    {sb.isThreePhase && (
                      <span className="block text-[9.5px] text-emerald-800 font-normal">
                        Deseq. int: {sb.internalPhaseBalance.unbalancePercent}%
                      </span>
                    )}
                  </td>
                  <td className="p-2 border border-slate-300 font-mono font-bold text-amber-800">
                    {sb.simultaneousWatts.toLocaleString('es-AR')} W
                  </td>
                  <td className="p-2 border border-slate-300 font-mono text-slate-800">
                    {sb.designCurrentIb} A
                  </td>
                  <td className="p-2 border border-slate-300 font-mono font-bold text-blue-800">
                    {sb.isThreePhase ? '4P' : '2P'} {sb.tceBreakerIn} A
                  </td>
                  <td className="p-2 border border-slate-300 font-mono font-bold text-slate-900">
                    {sb.conductorSpec}
                  </td>
                  <td className="p-2 border border-slate-300 font-mono text-slate-700">
                    {sb.cableCapacityIz} A
                  </td>
                  <td className="p-2 border border-slate-300 font-mono text-slate-800">
                    Ø {sb.conduitMm} mm
                  </td>
                  <td className="p-2 border border-slate-300 font-mono text-slate-800">
                    {sb.feederDeltaVPercent}% / {sb.totalDeltaVPercent}%
                  </td>
                  <td className="p-2 border border-slate-300 font-mono text-cyan-800 font-semibold">
                    {sb.rcdPoles} {sb.rcdAmps}A 30mA
                  </td>
                  <td className="p-2 border border-slate-300 font-mono text-slate-800">
                    {sb.recommendedDinBox} mód. ({sb.dinModulesRequired})
                  </td>
                  <td className="p-2 border border-slate-300 text-center">
                    {sb.isCompliant ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Rev.
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Cuadro de Circuitos y Potencias DIVIDIDO POR TABLERO */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-3 avoid-break">
        <div className="bg-slate-100 border-2 border-[#0f2b48] text-[#0f2b48] px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-700" />
            CUADRO DE CIRCUITOS Y POTENCIAS (ANÁLISIS DIVIDIDO POR TABLERO)
          </span>
          <span className="text-xs font-mono font-bold text-slate-800">
            Cabecera: TCE ({demand.isThreePhase ? '380V~' : '220V~'})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-300 border-collapse">
            <thead>
              <tr className="bg-slate-200 border-b-2 border-[#0f2b48] text-slate-900 font-bold">
                <th className="p-2.5 border border-slate-400">N° Circuito</th>
                <th className="p-2.5 border border-slate-400">Fase</th>
                <th className="p-2.5 border border-slate-400">Descripción</th>
                <th className="p-2.5 border border-slate-400">Cant</th>
                <th className="p-2.5 border border-slate-400">Pot. Unitaria (W)</th>
                <th className="p-2.5 border border-slate-400">Pot. Total (W)</th>
                <th className="p-2.5 border border-slate-400">Corriente (A)</th>
                <th className="p-2.5 border border-slate-400">Protección PIA</th>
                <th className="p-2.5 border border-slate-400">Conductor + ΔV</th>
              </tr>
            </thead>
            <tbody>
              {/* Optional Direct TCE Circuits */}
              {directTceCircuits.length > 0 && (
                <React.Fragment>
                  <tr className="bg-[#0f2b48]/10 font-bold text-[#0f2b48] border-t-2 border-[#0f2b48]">
                    <td colSpan={9} className="p-2 border border-slate-300 uppercase tracking-wider text-[11px]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>TCE — TABLERO CENTRAL DE ENTRADA (SALIDAS DIRECTAS DESDE CABECERA)</span>
                        <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded border border-blue-300 font-extrabold normal-case">
                          Alimentador Principal Pilar → TCE: {demand.subfeederSectionMm} mm² Cu
                        </span>
                      </div>
                    </td>
                  </tr>
                  {directTceCircuits.map((circ, cIdx) => {
                    const { phaseName, isThreePhase } = getCircuitPhase(circ);
                    const polesLabel = isThreePhase ? '4P' : '2P';
                    return (
                      <tr key={circ.id} className={cIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-2 border border-slate-300 font-bold font-mono text-slate-900">{circ.id}</td>
                        <td className="p-2 border border-slate-300 font-mono font-bold text-purple-900">
                          {isThreePhase ? '3F' : phaseName}
                        </td>
                        <td className="p-2 border border-slate-300 text-slate-800 font-medium">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                            style={{ backgroundColor: CIRCUIT_COLORS[circ.t] || '#0f2b48' }}
                          />
                          {circ.d}
                        </td>
                        <td className="p-2 border border-slate-300 text-slate-700">{circ.q}</td>
                        <td className="p-2 border border-slate-300 font-mono text-slate-700">
                          {Math.round(circ.W / (parseInt(String(circ.q)) || 1))} W
                        </td>
                        <td className="p-2 border border-slate-300 font-mono font-bold text-slate-900">
                          {circ.W.toLocaleString('es-AR')} W
                        </td>
                        <td className="p-2 border border-slate-300 font-mono text-slate-800">{circ.I.toFixed(1)} A</td>
                        <td className="p-2 border border-slate-300 font-mono font-bold text-blue-700">
                          {polesLabel} {circ.B} A
                        </td>
                        <td className="p-2 border border-slate-300 font-mono text-slate-800">
                          {circ.s} mm² + PE · ΔV {circ.deltaV}%
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              )}

              {/* Each Individual Tablero Seccional (TS1, TS2, TS3, TS4...) */}
              {sectionalBoards.map((sb) => (
                <React.Fragment key={sb.floorId}>
                  <tr className="bg-slate-200 font-bold text-slate-900 border-t-2 border-slate-400">
                    <td colSpan={9} className="p-2 border border-slate-300 uppercase tracking-wider text-[11px]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {sb.boardCode}{sb.colorTag ? ` (${sb.colorTag})` : ''} — {sb.boardName.toUpperCase()} (TABLERO SECCIONAL)
                        </span>
                        <span className="text-[10px] bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded border border-amber-300 font-extrabold normal-case">
                          Alimentador TCE → {sb.boardCode}: {sb.conductorSpec} · L={sb.feederLengthM}m · PIA TCE {sb.isThreePhase ? '4P' : '2P'} {sb.tceBreakerIn}A · {sb.assignedPhase}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {sb.circuits.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-3 text-center text-slate-500 italic bg-white border border-slate-300">
                        Sin bocas asignadas a {sb.boardCode}. Agregue bocas en Pestaña 1 o Pestaña 2.
                      </td>
                    </tr>
                  ) : (
                    sb.circuits.map((circ, cIdx) => {
                      const { phaseName, isThreePhase } = getCircuitPhase(circ);
                      const polesLabel = isThreePhase ? '4P' : '2P';
                      return (
                        <tr key={circ.id} className={cIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-2 border border-slate-300 font-bold font-mono text-slate-900">
                            {circ.id}
                          </td>
                          <td className="p-2 border border-slate-300 font-mono font-bold text-purple-900">
                            {isThreePhase ? '3F' : phaseName}
                          </td>
                          <td className="p-2 border border-slate-300 text-slate-800 font-medium">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                              style={{ backgroundColor: CIRCUIT_COLORS[circ.t] || '#0f2b48' }}
                            />
                            {circ.d}
                          </td>
                          <td className="p-2 border border-slate-300 text-slate-700">{circ.q}</td>
                          <td className="p-2 border border-slate-300 font-mono text-slate-700">
                            {Math.round(circ.W / (parseInt(String(circ.q)) || 1))} W
                          </td>
                          <td className="p-2 border border-slate-300 font-mono font-bold text-slate-900">
                            {circ.W.toLocaleString('es-AR')} W
                          </td>
                          <td className="p-2 border border-slate-300 font-mono text-slate-800">
                            {circ.I.toFixed(1)} A
                          </td>
                          <td className="p-2 border border-slate-300 font-mono font-bold text-blue-700">
                            {polesLabel} {circ.B} A
                          </td>
                          <td className="p-2 border border-slate-300 font-mono text-slate-800">
                            {circ.s} mm² + PE · ΔV {circ.deltaV}%
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Divided Subtotal Row per TS */}
                  <tr className="bg-blue-50/70 font-bold text-slate-900">
                    <td colSpan={5} className="p-2 border border-slate-300 text-right text-[11px]">
                      Subtotal {sb.boardCode} ({sb.boardName}) — Pot. Inst: {sb.installedWatts.toLocaleString('es-AR')} W · DPMS (ks={sb.simultaneityFactor}):
                    </td>
                    <td className="p-2 border border-slate-300 font-mono text-amber-800">
                      {sb.simultaneousWatts.toLocaleString('es-AR')} W
                    </td>
                    <td className="p-2 border border-slate-300 font-mono text-blue-900">
                      Ib = {sb.designCurrentIb} A
                    </td>
                    <td colSpan={2} className="p-2 border border-slate-300 font-mono text-[10.5px] text-slate-700">
                      Cable: {sb.cableSectionMm} mm² (Ø{sb.conduitMm}mm) · ΔV Lín: {sb.feederDeltaVPercent}%
                    </td>
                  </tr>
                </React.Fragment>
              ))}

              {/* Total Final Row */}
              <tr className="bg-slate-200 border-t-2 border-b-2 border-[#0f2b48] text-slate-900 font-extrabold text-sm">
                <td colSpan={5} className="p-3 border border-slate-400 text-right">
                  TOTAL CONJUNTO EN CABECERA TCE (Demanda Simultánea DPMS):
                </td>
                <td className="p-3 border border-slate-400 font-mono text-amber-800">
                  {demand.simultaneousDemandWatts.toLocaleString('es-AR')} W
                </td>
                <td className="p-3 border border-slate-400 font-mono text-emerald-800">
                  {demand.demandedAmps} A
                </td>
                <td colSpan={2} className="p-3 border border-slate-400 text-xs font-semibold text-slate-900">
                  Grado: {getElectrificationGrade(params.area).grade}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Referencias y Notas Importantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 avoid-break">
        <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm space-y-3">
          <h4 className="font-bold text-slate-900 text-xs uppercase border-b border-slate-200 pb-2 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Referencias del Unifilar y Multifilar
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border border-slate-900 bg-white inline-block rounded-xs" />
                <span>Medidor EPEC ({demand.isThreePhase ? '380V' : '220V'})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border border-blue-600 bg-white inline-block rounded-xs" />
                <span>Cabecera TCE ({demand.generalBreakerAmps} A)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border border-cyan-600 bg-white inline-block rounded-xs" />
                <span>Diferencial 30 mA en c/ TS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border border-amber-600 bg-amber-100 inline-block rounded-xs" />
                <span>Líneas Secc. TCE → TS1..TS{sectionalBoards.length}</span>
              </div>
            </div>

            <div className="space-y-1.5 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-4 h-1.5 bg-amber-500 inline-block rounded-full" />
                <span>Iluminación (IUG)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1.5 bg-emerald-600 inline-block rounded-full" />
                <span>Tomas generales (TUG)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1.5 bg-sky-600 inline-block rounded-full" />
                <span>Aires acondicionados (AA)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1.5 bg-purple-600 inline-block rounded-full" />
                <span>Lavarropas / Cargas Esp.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm space-y-2">
          <h4 className="font-bold text-slate-900 text-xs uppercase border-b border-slate-200 pb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            Notas Importantes Normativas AEA 770
          </h4>
          <ol className="list-decimal pl-4 text-xs text-slate-700 space-y-1 leading-relaxed">
            <li>
              <strong>Distribución Radial TCE → Seccionales ({sectionalBoards.map((s) => s.boardCode).join(', ')}):</strong> El Tablero Central de Entrada (TCE) alimenta en forma independiente cada tablero seccional con su PIA dedicado en TCE y verificación individual de capacidad térmica (Iz a 40 °C) y caída de tensión (ΔV ≤ 1.5%).
            </li>
            <li>
              La demanda final se calcula según AEA 90364-7-770 (grado de electrificación y coeficientes de simultaneidad por tipo de circuito).
            </li>
            <li>
              Se recomienda consultar a EPEC / Cooperativa la factibilidad de suministro trifásico para demandas mayores a 5 kW / 32 A en monofásico.
            </li>
            <li>
              La instalación debe ser ejecutada por un <strong>Instalador Electricista Habilitado</strong> y certificada según la <strong>Ley Provincial 10.281 (ERSeP)</strong>.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
