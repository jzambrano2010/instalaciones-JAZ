'use client';

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { Circuit, SectionalBoardAnalysis } from '@/lib/types';

interface CircuitPowerChartProps {
  circuits: Circuit[];
  sectionalBoards: SectionalBoardAnalysis[];
}

interface ChartCircuitPoint {
  id: string;
  label: string;
  description: string;
  boardCode: string;
  type: Circuit['t'];
  installedW: number;
  demandedW: number;
  limitW: number;
  utilizationPct: number;
  deltaV: number;
  breakerA: number;
  izA: number;
  status: 'ok' | 'warning' | 'over';
  statusReason: string;
}

const IZ_1F_40C: Record<number, number> = {
  1.5: 13,
  2.5: 18,
  4.0: 24,
  6.0: 31,
  10.0: 43,
  16.0: 59,
  25.0: 77,
  35.0: 96,
};

const IZ_3F_40C: Record<number, number> = {
  1.5: 11,
  2.5: 16,
  4.0: 21,
  6.0: 28,
  10.0: 38,
  16.0: 52,
  25.0: 68,
  35.0: 85,
};

const emptySubscribe = () => () => {};

function getCircuitRegulatoryLimit(circ: Circuit): {
  demandedW: number;
  limitW: number;
  izA: number;
  status: 'ok' | 'warning' | 'over';
  statusReason: string;
} {
  const is3P = Boolean(circ.isThreePhase) || circ.d.includes('380V') || circ.d.includes('Trifásico');
  const izA = (is3P ? IZ_3F_40C : IZ_1F_40C)[circ.s] || 24;
  const ks = circ.t === 'IUG' ? 0.66 : circ.t === 'TUG' ? 0.7 : 1.0;
  const demandedW = Math.round(circ.W * ks);

  // Regulatory power ceiling per AEA 90364-7-770 & conductor/breaker coordination
  let limitW: number;
  if (circ.t === 'IUG') {
    // IUG 10A @ 220V nominal (AEA 770.8)
    limitW = 2200;
  } else if (circ.t === 'TUG') {
    // TUG max simultaneous demand 2200 VA per circuit (AEA 770.8)
    limitW = 2200;
  } else {
    // Dedicated/Special circuits (AA, LAV, TUE, CUE): limited by min(Iz, In) at nominal voltage
    const voltage = is3P ? Math.sqrt(3) * 380 : 220;
    const governingAmps = Math.min(izA, circ.B);
    limitW = Math.round(voltage * governingAmps * 0.9);
  }

  const reasons: string[] = [];
  if (demandedW > limitW) {
    reasons.push(`Demanda (${demandedW} W) supera límite (${limitW} W)`);
  }
  if (circ.t === 'TUG' && circ.W > 2200) {
    reasons.push(`Potencia TUG (${circ.W} W) > 2.200 W`);
  }
  if (circ.deltaV > 3.0) {
    reasons.push(`Caída ΔV (${circ.deltaV}%) > 3,0% AEA 770`);
  }
  if (circ.B > izA) {
    reasons.push(`PIA ${circ.B}A > Iz cable (${izA}A)`);
  }

  const utilizationPct = limitW > 0 ? Math.round((demandedW / limitW) * 100) : 0;

  if (reasons.length > 0) {
    return {
      demandedW,
      limitW,
      izA,
      status: 'over',
      statusReason: reasons.join(' · '),
    };
  }

  if (utilizationPct >= 85) {
    return {
      demandedW,
      limitW,
      izA,
      status: 'warning',
      statusReason: `Carga al ${utilizationPct}% del límite admisible`,
    };
  }

  return {
    demandedW,
    limitW,
    izA,
    status: 'ok',
    statusReason: 'Dentro de parámetros AEA 90364-7-770',
  };
}

function CustomPowerTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartCircuitPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;

  return (
    <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-lg text-xs text-slate-900 min-w-[230px] space-y-1.5">
      <div className="border-b border-slate-200 pb-1.5">
        <div className="font-black text-[#0f2b48]">
          {item.label} · {item.type}
        </div>
        <div className="text-[11px] text-slate-600 truncate max-w-[240px]">
          {item.description}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 tabular-nums text-[11px]">
        <span className="text-slate-600">Sector / Tablero:</span>
        <span className="font-bold text-right text-slate-900">{item.boardCode}</span>

        <span className="text-slate-600">Potencia Demandada:</span>
        <span className="font-black text-right text-[#0f2b48]">
          {item.demandedW.toLocaleString('es-AR')} W
        </span>

        <span className="text-slate-600">Potencia Instalada:</span>
        <span className="font-semibold text-right text-slate-800">
          {item.installedW.toLocaleString('es-AR')} W
        </span>

        <span className="text-slate-600">Límite Reglamentario:</span>
        <span className="font-bold text-right text-slate-800">
          {item.limitW.toLocaleString('es-AR')} W
        </span>

        <span className="text-slate-600">Uso vs Límite:</span>
        <span
          className={`font-black text-right ${
            item.status === 'over'
              ? 'text-red-700'
              : item.status === 'warning'
              ? 'text-amber-700'
              : 'text-emerald-700'
          }`}
        >
          {item.utilizationPct}%
        </span>

        <span className="text-slate-600">Protección / ΔV:</span>
        <span className="font-mono text-right text-slate-800">
          {item.breakerA}A · {item.deltaV}%
        </span>
      </div>

      <div
        className={`pt-1.5 border-t border-slate-200 text-[11px] font-bold ${
          item.status === 'over'
            ? 'text-red-700'
            : item.status === 'warning'
            ? 'text-amber-700'
            : 'text-emerald-700'
        }`}
      >
        {item.status === 'over' ? 'Supera límite: ' : 'Estado: '}
        {item.statusReason}
      </div>
    </div>
  );
}

export default function CircuitPowerChart({
  circuits,
  sectionalBoards,
}: CircuitPowerChartProps) {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [selectedBoard, setSelectedBoard] = useState<string>('ALL');

  const boardOptions = useMemo(() => {
    const codes = new Set<string>();
    circuits.forEach((c) => codes.add(c.boardCode || 'TS1'));
    sectionalBoards.forEach((sb) => {
      if (sb.circuits.length > 0) codes.add(sb.boardCode);
    });
    return ['ALL', ...Array.from(codes)];
  }, [circuits, sectionalBoards]);

  const activeFilter = boardOptions.includes(selectedBoard) ? selectedBoard : 'ALL';

  const chartData = useMemo<ChartCircuitPoint[]>(() => {
    return circuits
      .filter((c) => activeFilter === 'ALL' || (c.boardCode || 'TS1') === activeFilter)
      .map((c) => {
        const check = getCircuitRegulatoryLimit(c);
        const utilizationPct =
          check.limitW > 0 ? Math.round((check.demandedW / check.limitW) * 100) : 0;
        const boardCode = c.boardCode || 'TS1';
        return {
          id: c.id,
          label: `${c.id} · ${boardCode}`,
          description: c.d,
          boardCode,
          type: c.t,
          installedW: c.W,
          demandedW: check.demandedW,
          limitW: check.limitW,
          utilizationPct,
          deltaV: c.deltaV,
          breakerA: c.B,
          izA: check.izA,
          status: check.status,
          statusReason: check.statusReason,
        };
      });
  }, [circuits, activeFilter]);

  const overLimitCircuits = chartData.filter((d) => d.status === 'over');
  const warningCircuits = chartData.filter((d) => d.status === 'warning');
  const totalDemandedW = chartData.reduce((sum, d) => sum + d.demandedW, 0);
  const peakCircuit = chartData.reduce<ChartCircuitPoint | null>(
    (max, item) => (!max || item.demandedW > max.demandedW ? item : max),
    null
  );

  const getBarColor = (status: ChartCircuitPoint['status']) => {
    if (status === 'over') return '#dc2626';
    if (status === 'warning') return '#d97706';
    return '#0f2b48';
  };

  return (
    <section className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-4 no-print">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="space-y-1">
          <h3 className="text-base font-black text-[#0f2b48] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-800" />
            Distribución de Potencia Demandada por Circuito (AEA 90364-7-770)
          </h3>
          <p className="text-xs text-slate-600">
            Comparativa de potencia demandada simultánea (DPMS) frente al límite reglamentario de cada circuito y tablero seccional.
          </p>
        </div>

        {boardOptions.length > 2 && (
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            {boardOptions.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setSelectedBoard(code)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeFilter === code
                    ? 'bg-[#0f2b48] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                {code === 'ALL' ? 'Todos los Sectores' : code}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <span className="text-slate-600 font-semibold block">
            Potencia Demandada Analizada
          </span>
          <strong className="text-base font-black text-[#0f2b48] tabular-nums mt-0.5 block">
            {totalDemandedW.toLocaleString('es-AR')} W ({chartData.length}{' '}
            {chartData.length === 1 ? 'circuito' : 'circuitos'})
          </strong>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <span className="text-slate-600 font-semibold block">
            Circuito de Mayor Demanda
          </span>
          <strong className="text-base font-black text-slate-900 tabular-nums mt-0.5 block truncate">
            {peakCircuit
              ? `${peakCircuit.label} · ${peakCircuit.demandedW.toLocaleString('es-AR')} W`
              : 'Sin circuitos'}
          </strong>
        </div>

        <div
          className={`border rounded-lg p-3 flex items-start gap-2.5 ${
            overLimitCircuits.length > 0
              ? 'bg-red-50 border-red-300 text-red-900'
              : warningCircuits.length > 0
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          {overLimitCircuits.length > 0 ? (
            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          ) : overLimitCircuits.length === 0 && warningCircuits.length > 0 ? (
            <Zap className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-semibold block">Verificación Reglamentaria</span>
            <strong className="text-xs font-black block mt-0.5">
              {overLimitCircuits.length > 0
                ? `${overLimitCircuits.length} circuito(s) superan el límite (${overLimitCircuits
                    .map((c) => c.id)
                    .join(', ')})`
                : warningCircuits.length > 0
                ? `${warningCircuits.length} circuito(s) ≥ 85% de capacidad (${warningCircuits
                    .map((c) => c.id)
                    .join(', ')})`
                : 'Todos los sectores dentro de límites AEA 770'}
            </strong>
          </div>
        </div>
      </div>

      {/* Bar Chart Viewport */}
      {chartData.length === 0 ? (
        <div className="h-[240px] bg-slate-50 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-center p-6 text-xs text-slate-600 space-y-1">
          <BarChart3 className="w-7 h-7 text-slate-400" />
          <p className="font-bold text-slate-800">
            No hay circuitos cargados en este sector para graficar.
          </p>
          <p>
            Agregá bocas o equipos en Pestaña 1 o Pestaña 2 para visualizar la distribución de potencia.
          </p>
        </div>
      ) : (
        <div className="w-full min-w-0">
          <div className="h-[340px] w-full min-w-0">
            {isClient ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 18, right: 20, left: 6, bottom: 14 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    interval={0}
                    angle={chartData.length > 8 ? -20 : 0}
                    textAnchor={chartData.length > 8 ? 'end' : 'middle'}
                    height={chartData.length > 8 ? 50 : 32}
                  />
                  <YAxis
                    tick={{ fill: '#475569', fontSize: 11 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    tickFormatter={(val: number) => `${val} W`}
                    width={64}
                  />
                  <Tooltip
                    content={<CustomPowerTooltip />}
                    cursor={{ fill: 'rgba(226, 232, 240, 0.45)' }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={32}
                    wrapperStyle={{ fontSize: '12px', fontWeight: 700 }}
                  />
                  <ReferenceLine
                    y={2200}
                    stroke="#dc2626"
                    strokeDasharray="5 4"
                    strokeWidth={1.5}
                    label={{
                      value: 'Límite IUG/TUG (2.200 W)',
                      position: 'insideTopRight',
                      fill: '#b91c1c',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  />
                  <Bar
                    dataKey="demandedW"
                    name="Potencia Demandada (W)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={44}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.id} fill={getBarColor(entry.status)} />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="limitW"
                    name="Límite Admisible Circuito (W)"
                    fill="#cbd5e1"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center text-xs text-slate-500">
                Cargando gráfico de potencia por circuito...
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-5 pt-2 border-t border-slate-200 text-xs text-slate-700">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <span className="w-3 h-3 rounded-xs bg-[#0f2b48] inline-block" />
              Conforme (&lt; 85% límite)
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <span className="w-3 h-3 rounded-xs bg-[#d97706] inline-block" />
              Precaución (85% – 100%)
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <span className="w-3 h-3 rounded-xs bg-[#dc2626] inline-block" />
              Supera Límite Reglamentario / ΔV &gt; 3%
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <span className="w-3 h-3 rounded-xs bg-[#cbd5e1] inline-block" />
              Tope Admisible por Circuito
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
