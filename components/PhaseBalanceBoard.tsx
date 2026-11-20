'use client';

import React, { useState } from 'react';
import {
  Circuit,
  SectionalBoardAnalysis,
} from '@/lib/types';
import { PhaseBalanceResult } from '@/lib/electrical-calc';
import {
  GripVertical,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowLeftRight,
  Info,
} from 'lucide-react';

export type PhaseKey = 'L1' | 'L2' | 'L3';

interface PhaseBalanceBoardProps {
  circuits: Circuit[];
  sectionalBoards: SectionalBoardAnalysis[];
  activeBalance: PhaseBalanceResult;
  isThreePhaseSupply: boolean;
  hasManualOverrides: boolean;
  circuitColors: Record<string, string>;
  onAssignCircuitPhase: (circuit: Circuit, targetPhase: PhaseKey) => void;
  onResetAutoBalance: () => void;
  onSwitchToThreePhase?: () => void;
}

const PHASE_COLUMNS: {
  key: PhaseKey;
  title: string;
  subtitle: string;
  accentHex: string;
  headerBg: string;
  dropRing: string;
  barFill: string;
  btnActive: string;
}[] = [
  {
    key: 'L1',
    title: 'Fase L1 (R)',
    subtitle: 'Conductor Marrón · 220 V',
    accentHex: '#92400e',
    headerBg: 'bg-amber-50 border-amber-300 text-amber-950',
    dropRing: 'ring-2 ring-amber-600 bg-amber-50/70 border-amber-500',
    barFill: 'bg-amber-700',
    btnActive: 'bg-amber-800 text-white',
  },
  {
    key: 'L2',
    title: 'Fase L2 (S)',
    subtitle: 'Conductor Negro · 220 V',
    accentHex: '#1e293b',
    headerBg: 'bg-slate-100 border-slate-400 text-slate-950',
    dropRing: 'ring-2 ring-slate-700 bg-slate-100/80 border-slate-600',
    barFill: 'bg-slate-800',
    btnActive: 'bg-slate-900 text-white',
  },
  {
    key: 'L3',
    title: 'Fase L3 (T)',
    subtitle: 'Conductor Violeta/Rojo · 220 V',
    accentHex: '#6b21a8',
    headerBg: 'bg-purple-50 border-purple-300 text-purple-950',
    dropRing: 'ring-2 ring-purple-600 bg-purple-50/70 border-purple-500',
    barFill: 'bg-purple-800',
    btnActive: 'bg-purple-800 text-white',
  },
];

export default function PhaseBalanceBoard({
  circuits,
  sectionalBoards,
  activeBalance,
  isThreePhaseSupply,
  hasManualOverrides,
  circuitColors,
  onAssignCircuitPhase,
  onResetAutoBalance,
  onSwitchToThreePhase,
}: PhaseBalanceBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverPhase, setDragOverPhase] = useState<PhaseKey | null>(null);

  // Map boardCode -> SectionalBoardAnalysis for 1F vs 3F TS awareness
  const boardMap = new Map<string, SectionalBoardAnalysis>();
  sectionalBoards.forEach((sb) => boardMap.set(sb.boardCode, sb));

  const singlePhaseCircuits: Record<PhaseKey, Circuit[]> = {
    L1: [],
    L2: [],
    L3: [],
  };
  const threePhaseCircuits: Circuit[] = [];

  circuits.forEach((circ) => {
    const assigned = activeBalance.circuitPhases[circ.id] || 'L1';
    const is3F =
      assigned === '3F' ||
      Boolean(circ.isThreePhase) ||
      circ.d.includes('380V') ||
      circ.d.includes('Trifásico');
    if (is3F) {
      threePhaseCircuits.push(circ);
    } else if (assigned === 'L2') {
      singlePhaseCircuits.L2.push(circ);
    } else if (assigned === 'L3') {
      singlePhaseCircuits.L3.push(circ);
    } else {
      singlePhaseCircuits.L1.push(circ);
    }
  });

  const totalWatts = activeBalance.wattsL1 + activeBalance.wattsL2 + activeBalance.wattsL3;
  const avgWatts = activeBalance.avgWatts;
  const phaseTotals: Record<PhaseKey, { watts: number; amps: number; sharePct: number }> = {
    L1: {
      watts: activeBalance.wattsL1,
      amps: activeBalance.ampsL1,
      sharePct: totalWatts > 0 ? Math.round((activeBalance.wattsL1 / totalWatts) * 100) : 0,
    },
    L2: {
      watts: activeBalance.wattsL2,
      amps: activeBalance.ampsL2,
      sharePct: totalWatts > 0 ? Math.round((activeBalance.wattsL2 / totalWatts) * 100) : 0,
    },
    L3: {
      watts: activeBalance.wattsL3,
      amps: activeBalance.ampsL3,
      sharePct: totalWatts > 0 ? Math.round((activeBalance.wattsL3 / totalWatts) * 100) : 0,
    },
  };

  // Visual gauge scale: 0% to 30% (15% AEA limit sits right in the middle at 50%)
  const unbalanceGaugeWidth = Math.min(100, (activeBalance.unbalancePercent / 30) * 100);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, circuitId: string) => {
    setDraggingId(circuitId);
    e.dataTransfer.setData('text/plain', circuitId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, phase: PhaseKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPhase !== phase) {
      setDragOverPhase(phase);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetPhase: PhaseKey) => {
    e.preventDefault();
    const circuitId = e.dataTransfer.getData('text/plain') || draggingId;
    setDraggingId(null);
    setDragOverPhase(null);
    if (!circuitId) return;

    const circ = circuits.find((c) => c.id === circuitId);
    if (!circ) return;
    onAssignCircuitPhase(circ, targetPhase);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverPhase(null);
  };

  return (
    <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-4 no-print">
      {/* Header Bar */}
      <div className="bg-[#0f2b48] text-white px-4 py-3 rounded-lg flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-extrabold uppercase tracking-wide flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-amber-400" />
            Tablero Interactivo de Carga por Fase (L1 · L2 · L3)
          </h3>
          <p className="text-[11px] text-slate-200">
            Arrastrá cada tarjeta de circuito hacia otra fase (o usá los botones L1/L2/L3) para equilibrar las cargas en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isThreePhaseSupply && onSwitchToThreePhase && (
            <button
              type="button"
              onClick={onSwitchToThreePhase}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-md transition-colors flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              Activar Suministro Trifásico 380V
            </button>
          )}

          <button
            type="button"
            onClick={onResetAutoBalance}
            disabled={!hasManualOverrides}
            title="Restaurar reparto automático óptimo según AEA 90364"
            className={`px-3 py-1.5 text-xs font-bold rounded-md border transition-colors flex items-center gap-1.5 ${
              hasManualOverrides
                ? 'bg-white text-[#0f2b48] border-white hover:bg-slate-100'
                : 'bg-slate-800/60 text-slate-400 border-slate-600 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Auto-balancear (Óptimo AEA)
          </button>
        </div>
      </div>

      {/* Monophasic Simulation Notice */}
      {!isThreePhaseSupply && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3.5 py-2.5 text-xs text-blue-950 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Modo Simulación Trifásica:</strong> el proyecto actual está configurado como{' '}
            <strong>Monofásico 220 V</strong> (todos los circuitos del Multifilar operan en L1). Podés arrastrar tarjetas aquí para simular el reparto en 3 fases, o pulsar{' '}
            <strong>“Activar Suministro Trifásico 380V”</strong> para aplicarlo directamente al diagrama Multifilar y al informe.
          </div>
        </div>
      )}

      {/* Live Unbalance Meter */}
      <div
        className={`rounded-lg border-2 p-3.5 transition-colors ${
          activeBalance.isBalanced
            ? 'bg-emerald-50/70 border-emerald-400'
            : 'bg-red-50/80 border-red-400'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold">
            {activeBalance.isBalanced ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
            )}
            <span className={activeBalance.isBalanced ? 'text-emerald-950' : 'text-red-950'}>
              Desequilibrio en tiempo real:{' '}
              <span className="font-mono text-base">{activeBalance.unbalancePercent}%</span>
            </span>
            <span className="text-slate-400" aria-hidden="true">
              ·
            </span>
            <span
              className={`text-xs font-bold ${
                activeBalance.isBalanced ? 'text-emerald-800' : 'text-red-800'
              }`}
            >
              {activeBalance.isBalanced
                ? 'Cumple AEA 90364 (≤ 15%)'
                : 'Supera el 15% reglamentario — redistribuí circuitos'}
            </span>
          </div>

          <div className="text-xs text-slate-700 font-mono tabular-nums">
            Total: <strong>{totalWatts.toLocaleString('es-AR')} W</strong>
            <span className="mx-1.5 text-slate-400">·</span>
            Promedio ideal/fase: <strong>{avgWatts.toLocaleString('es-AR')} W</strong>
            {hasManualOverrides && (
              <>
                <span className="mx-1.5 text-slate-400">·</span>
                <span className="font-sans font-semibold text-blue-800">Ajuste manual activo</span>
              </>
            )}
          </div>
        </div>

        {/* Scale Bar with 15% AEA Threshold */}
        <div className="relative h-2.5 w-full bg-white border border-slate-300 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${
              activeBalance.isBalanced ? 'bg-emerald-600' : 'bg-red-600'
            }`}
            style={{ width: `${unbalanceGaugeWidth}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-900"
            style={{ left: '50%' }}
            title="Límite máximo AEA 90364: 15%"
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-slate-600 mt-1">
          <span>0% (Equilibrio perfecto)</span>
          <span className="font-bold text-slate-900">15% Límite AEA</span>
          <span>≥ 30%</span>
        </div>
      </div>

      {/* 3 Drag & Drop Phase Columns */}
      {circuits.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-600 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
          No hay circuitos generados aún. Cargá bocas o equipos en la Pestaña 1 o Pestaña 2 para balancear fases.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {PHASE_COLUMNS.map((col) => {
            const colCircuits = singlePhaseCircuits[col.key];
            const stats = phaseTotals[col.key];
            const deltaW = stats.watts - avgWatts;
            const isOver = dragOverPhase === col.key;
            const barWidth = Math.min(100, stats.sharePct);

            return (
              <div
                key={col.key}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setDragOverPhase(null);
                  }
                }}
                onDrop={(e) => handleDrop(e, col.key)}
                className={`rounded-xl border-2 flex flex-col min-h-[260px] transition-all ${
                  isOver
                    ? col.dropRing
                    : 'bg-slate-50/70 border-slate-300'
                }`}
              >
                {/* Column Header */}
                <div className={`p-3 rounded-t-[10px] border-b ${col.headerBg}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-white/80 shadow-sm"
                        style={{ backgroundColor: col.accentHex }}
                      />
                      <div>
                        <div className="text-sm font-black leading-tight">{col.title}</div>
                        <div className="text-[10px] opacity-80 font-medium">{col.subtitle}</div>
                      </div>
                    </div>

                    <div className="text-right font-mono tabular-nums">
                      <div className="text-sm font-black leading-tight">
                        {stats.watts.toLocaleString('es-AR')} W
                      </div>
                      <div className="text-[11px] font-bold opacity-85">
                        {stats.amps} A · {stats.sharePct}%
                      </div>
                    </div>
                  </div>

                  {/* Phase Share Bar vs 33.3% ideal mark */}
                  <div className="mt-2.5 space-y-1">
                    <div className="relative h-2 w-full bg-white/90 border border-slate-300/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 ${col.barFill}`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-900/70"
                        style={{ left: '33.33%' }}
                        title="Reparto ideal: 33.3%"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-700">
                      <span>{colCircuits.length} {colCircuits.length === 1 ? 'circuito' : 'circuitos'}</span>
                      <span>
                        {deltaW === 0
                          ? 'En promedio'
                          : `${deltaW > 0 ? '+' : ''}${deltaW.toLocaleString('es-AR')} W vs prom.`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Drop Zone Body */}
                <div className="p-2.5 space-y-2 flex-1">
                  {colCircuits.length === 0 ? (
                    <div className="h-full min-h-[120px] flex items-center justify-center text-center px-3 py-6 rounded-lg border-2 border-dashed border-slate-300 text-xs text-slate-500">
                      {isOver
                        ? `Soltá aquí para asignar a ${col.title}`
                        : `Sin circuitos monofásicos en ${col.key}. Arrastrá una tarjeta aquí.`}
                    </div>
                  ) : (
                    colCircuits.map((circ) => {
                      const bCode = circ.boardCode || 'TS1';
                      const sb = boardMap.get(bCode);
                      const isLockedMonoTs =
                        isThreePhaseSupply && Boolean(sb) && !sb!.isThreePhase;
                      const isDraggingThis = draggingId === circ.id;
                      const typeColor = circuitColors[circ.t] || '#0f2b48';

                      return (
                        <div
                          key={circ.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, circ.id)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white border rounded-lg p-2.5 shadow-xs cursor-grab active:cursor-grabbing transition-all select-none ${
                            isDraggingThis
                              ? 'opacity-45 scale-[0.98] border-blue-500 ring-2 ring-blue-300'
                              : 'border-slate-300 hover:border-[#0f2b48] hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <GripVertical className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: typeColor }}
                                  />
                                  <span className="font-mono">{circ.id}</span>
                                  <span className="text-slate-400" aria-hidden="true">·</span>
                                  <span className="font-mono text-[#0f2b48]">{bCode}</span>
                                  <span className="text-slate-400" aria-hidden="true">·</span>
                                  <span className="text-slate-600 font-bold">{circ.t}</span>
                                </div>
                                <div
                                  className="text-[11px] text-slate-700 font-medium truncate mt-0.5"
                                  title={circ.d}
                                >
                                  {circ.d}
                                </div>
                                <div className="text-[10.5px] text-slate-500 font-mono mt-0.5 tabular-nums">
                                  2P {circ.B}A · {circ.s}mm² · {circ.q}
                                </div>
                                {isLockedMonoTs && (
                                  <div className="text-[10px] text-amber-800 font-semibold mt-0.5">
                                    Seccional 1F — mueve bloque {bCode} completo
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="text-right font-mono tabular-nums shrink-0">
                              <div className="text-xs font-black text-[#0f2b48]">
                                {circ.W.toLocaleString('es-AR')} W
                              </div>
                              <div className="text-[10.5px] font-semibold text-slate-600">
                                {circ.I.toFixed(1)} A
                              </div>
                            </div>
                          </div>

                          {/* Accessible 1-click phase selector buttons (touch & keyboard friendly) */}
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-500 font-medium">
                              Mover a fase:
                            </span>
                            <div className="flex items-center gap-1">
                              {PHASE_COLUMNS.map((targetCol) => {
                                const isCurrent = targetCol.key === col.key;
                                return (
                                  <button
                                    key={targetCol.key}
                                    type="button"
                                    onClick={() => {
                                      if (!isCurrent) onAssignCircuitPhase(circ, targetCol.key);
                                    }}
                                    disabled={isCurrent}
                                    className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-bold transition-colors ${
                                      isCurrent
                                        ? targetCol.btnActive
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                    }`}
                                  >
                                    {targetCol.key}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {isOver && colCircuits.length > 0 && (
                    <div className="p-2 text-center text-[11px] font-bold text-slate-800 border-2 border-dashed border-slate-500 rounded-lg bg-white/80">
                      Soltar aquí → asignar a {col.title}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Optional Fixed 3-Phase Loads Strip */}
      {threePhaseCircuits.length > 0 && (
        <div className="bg-red-50/70 border border-red-200 rounded-lg p-3 space-y-1.5">
          <div className="text-xs font-extrabold text-red-950 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-red-700" />
            Cargas Trifásicas Equilibradas (380 V · 3F R-S-T) — reparto fijo P/3 por fase
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-red-900">
            {threePhaseCircuits.map((c) => (
              <div key={c.id} className="font-mono bg-white border border-red-200 rounded px-2.5 py-1">
                <strong>{c.id}</strong> ({c.boardCode || 'TCE'}) · {c.d} ·{' '}
                <strong>{c.W.toLocaleString('es-AR')} W</strong> ({Math.round(c.W / 3)} W/fase)
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
