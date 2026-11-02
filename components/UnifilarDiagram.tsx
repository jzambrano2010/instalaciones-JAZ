'use client';

import React from 'react';
import { TechnicalParams, FloorData } from '@/lib/types';
import { generateCircuits, calculateDemand, getElectrificationGrade } from '@/lib/electrical-calc';
import { Zap, ShieldCheck, BookOpen, FileCheck2 } from 'lucide-react';

interface UnifilarDiagramProps {
  params: TechnicalParams;
  floors: FloorData[];
}

export default function UnifilarDiagram({ params, floors }: UnifilarDiagramProps) {
  const floorCircuits = generateCircuits(params, floors);
  const allCircuits = floorCircuits.flatMap((fc) => fc.c);
  const demand = calculateDemand(allCircuits);

  // Circuit Colors matching standard PDF schema
  const CIRCUIT_COLORS: Record<string, string> = {
    IUG: '#eab308', // Yellow
    TUG: '#16a34a', // Green
    AA: '#0284c7',  // Light Blue
    LAV: '#9333ea', // Purple
    TUE: '#ea580c', // Orange
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* 1. Header Summary Card (Estilo PDF - Fondo Gris Claro con Borde Azul Oscuro) */}
      <div className="bg-slate-100 border-2 border-[#0f2b48] rounded-xl p-5 shadow-sm text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-wide uppercase flex items-center gap-2 text-[#0f2b48]">
              <Zap className="w-5 h-5 text-amber-600" />
              ESQUEMA UNIFILAR Y CUADRO DE CIRCUITOS - VIVIENDA ({params.area} m²)
            </h2>
            <p className="text-xs text-slate-700 mt-1">
              Normas AEA 90364-7-770 · Simbología IRAM 2010 / IEC 60617 · Ley Provincial N° 10281 (Córdoba)
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white border border-[#0f2b48] rounded-lg p-3 text-xs font-mono">
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
              <span className="text-slate-600 block font-sans font-semibold">Protección General</span>
              <span className="text-base font-bold text-emerald-800">
                2P - {demand.generalBreakerAmps} A
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SVG Unifilar Schematic Vector Diagram (Fondo Claro Técnico) */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-3 avoid-break">
        <div className="bg-slate-100 border-2 border-[#0f2b48] text-[#0f2b48] px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            ESQUEMA UNIFILAR TÉCNICO REGIONAL (AEA 90364-7-770)
          </span>
          <span className="text-xs font-mono bg-blue-100 text-blue-900 px-2 py-0.5 rounded border border-blue-300">
            Alim. Principal: {demand.subfeederSectionMm} mm² Cu
          </span>
        </div>

        {/* Tablero Seccional Normative Rule Callout */}
        {floorCircuits.length > 1 && (
          <div className="bg-amber-50 border-2 border-amber-400 text-amber-950 p-3 rounded-lg text-xs font-medium space-y-1">
            <strong className="text-amber-900 font-extrabold flex items-center gap-1.5 text-xs">
              <Zap className="w-4 h-4 text-amber-600 fill-current" />
              Especificación de Tablero Seccional (TS-PA):
            </strong>
            <p>
              El <strong>Tablero Seccional de Planta Alta (TS-PA)</strong> se alimenta en forma directa desde el <strong>Tablero General (TGP)</strong> ubicado en Planta Baja, mediante una Línea Seccional ejecutada con conductor unipolar de <strong>{demand.sectionalFeederSectionMm} mm² Cu + PE</strong> (misma sección que el Alimentador Principal desde la calle), garantizando la misma capacidad nominal y mínima caída de tensión según AEA 770.
            </p>
          </div>
        )}

        <div className="overflow-x-auto bg-slate-50 rounded-lg p-4 border border-slate-200">
          {(() => {
            const pbCircuits = floorCircuits[0]?.c || [];
            const paCircuits = floorCircuits.slice(1).flatMap((fc) => fc.c);
            const hasMultiFloor = floorCircuits.length > 1 && paCircuits.length > 0;
            const maxCircuitsCount = Math.max(pbCircuits.length, paCircuits.length, allCircuits.length);
            const svgWidth = Math.max(850, maxCircuitsCount * 90 + 220);
            const svgHeight = hasMultiFloor ? 780 : 520;

            return (
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto min-w-[850px] font-sans"
                style={{ maxHeight: hasMultiFloor ? '740px' : '560px' }}
              >
                {/* Background canvas */}
                <rect width="100%" height="100%" fill="#ffffff" rx="8" />

                {/* Line: Pilar Feeder */}
                <line x1="120" y1="50" x2="120" y2="85" stroke="#0f2b48" strokeWidth="2.5" />

                {/* Medidor kWh Icon */}
                <rect x="90" y="10" width="60" height="40" rx="4" fill="#f8fafc" stroke="#0f2b48" strokeWidth="1.5" />
                <text x="120" y="30" fill="#0f2b48" fontSize="10.5" fontWeight="bold" textAnchor="middle">
                  Medidor
                </text>
                <text x="120" y="42" fill="#475569" fontSize="8" textAnchor="middle">
                  220 V ~ (EPEC)
                </text>

                {/* Main Breaker Pilar */}
                <rect x="75" y="85" width="90" height="38" rx="4" fill="#ffffff" stroke="#0f2b48" strokeWidth="1.5" />
                <text x="120" y="100" fill="#0f2b48" fontSize="9" fontWeight="bold" textAnchor="middle">
                  Interruptor general
                </text>
                <text x="120" y="114" fill="#2563eb" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                  2P – {demand.generalBreakerAmps} A
                </text>

                {/* Line Pilar to TGP */}
                <line x1="120" y1="123" x2="120" y2="165" stroke="#0f2b48" strokeWidth="2.5" />
                <text x="128" y="145" fill="#64748b" fontSize="7.5" fontWeight="bold">
                  Alim. Principal {demand.subfeederSectionMm} mm² Cu
                </text>

                {/* RCD Differential Breaker TGP */}
                <rect x="75" y="165" width="90" height="38" rx="4" fill="#ffffff" stroke="#0f2b48" strokeWidth="1.5" />
                <text x="120" y="180" fill="#0f2b48" fontSize="9" fontWeight="bold" textAnchor="middle">
                  Diferencial TGP
                </text>
                <text x="120" y="194" fill="#0284c7" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                  30 mA – 2P
                </text>

                {/* Line to TGP Main Busbar */}
                <line x1="120" y1="203" x2="120" y2="235" stroke="#0f2b48" strokeWidth="2.5" />

                {/* Grounding Rod symbol PAT */}
                <line x1="120" y1="235" x2="55" y2="235" stroke="#16a34a" strokeWidth="2" strokeDasharray="3,3" />
                <circle cx="55" cy="235" r="4" fill="#16a34a" />
                <line x1="55" y1="239" x2="55" y2="252" stroke="#16a34a" strokeWidth="2" />
                <line x1="41" y1="252" x2="69" y2="252" stroke="#16a34a" strokeWidth="2" />
                <line x1="45" y1="256" x2="65" y2="256" stroke="#16a34a" strokeWidth="2" />
                <line x1="49" y1="260" x2="61" y2="260" stroke="#16a34a" strokeWidth="2" />

                {/* Cartel PAT Destacado y 100% Visible */}
                <rect x="4" y="266" width="112" height="28" rx="5" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.2" />
                <text x="60" y="278" fill="#15803d" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                  PAT Jabalina 10 mm²
                </text>
                <text x="60" y="289" fill="#166534" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                  IRAM 2309 (R ≤ 10 Ω)
                </text>

                {/* Single vs Multi Floor Busbars & Circuit Connections */}
                {!hasMultiFloor ? (
                  <g>
                    <line x1={120} y1="235" x2={Math.max(800, allCircuits.length * 85 + 200)} y2="235" stroke="#0f2b48" strokeWidth="3" />
                    <text x={125} y="225" fill="#0f2b48" fontSize="9" fontWeight="black">TGP (TABLERO GENERAL PRINCIPAL)</text>
                    {allCircuits.map((circ, idx) => {
                      const posX = 180 + idx * 85;
                      const color = CIRCUIT_COLORS[circ.t] || '#0f2b48';
                      return (
                        <g key={circ.id}>
                          <line x1={posX} y1="235" x2={posX} y2="265" stroke="#0f2b48" strokeWidth="2" />
                          <rect x={posX - 30} y="265" width="60" height="34" rx="4" fill="#ffffff" stroke="#0f2b48" strokeWidth="1.5" />
                          <text x={posX} y="280" fill="#0f2b48" fontSize="9" fontWeight="bold" textAnchor="middle">{circ.id}</text>
                          <text x={posX} y="292" fill="#2563eb" fontSize="8.5" fontWeight="bold" textAnchor="middle">{circ.B} A</text>
                          <line x1={posX} y1="299" x2={posX} y2="335" stroke={color} strokeWidth="3" />
                          <circle cx={posX} cy="350" r="14" fill={color} stroke="#0f2b48" strokeWidth="1" />
                          <text x={posX} y="354" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">{circ.t}</text>
                          <text x={posX} y="377" fill="#0f172a" fontSize="8.5" fontWeight="bold" textAnchor="middle">{circ.d.slice(0, 14)}</text>
                          <text x={posX} y="389" fill="#475569" fontSize="8" textAnchor="middle">{circ.q}</text>
                          <text x={posX} y="401" fill="#0f172a" fontSize="8" fontWeight="bold" textAnchor="middle">{circ.s} mm²</text>
                          <text x={posX} y="413" fill="#0f2b48" fontSize="8" fontWeight="bold" textAnchor="middle">{circ.W} W ({circ.I.toFixed(1)}A)</text>
                          <text x={posX} y="425" fill="#2563eb" fontSize="7.5" textAnchor="middle">ΔV: {circ.deltaV}%</text>
                        </g>
                      );
                    })}
                  </g>
                ) : (
                  /* Multi-Floor Layout: TS-PA placed DEBAJO (underneath) TGP */
                  (() => {
                    const pbStartX = 120;
                    const pbEndX = Math.max(pbStartX + 180, 180 + pbCircuits.length * 85);
                    const tsX = pbEndX + 50;

                    const tsBoxY = 470;
                    const tsBoxX = 120;
                    const tsBoxWidth = Math.max(540, paCircuits.length * 85 + 180);

                    return (
                      <g>
                        {/* TGP Busbar (Planta Baja) */}
                        <line x1={pbStartX} y1="235" x2={tsX} y2="235" stroke="#0f2b48" strokeWidth="3.5" />
                        <text x={125} y="225" fill="#0f2b48" fontSize="9" fontWeight="black">
                          TGP (PLANTA BAJA)
                        </text>

                        {/* Render Planta Baja Circuits under TGP */}
                        {pbCircuits.map((circ, idx) => {
                          const posX = 180 + idx * 85;
                          const color = CIRCUIT_COLORS[circ.t] || '#0f2b48';
                          return (
                            <g key={circ.id}>
                              <line x1={posX} y1="235" x2={posX} y2="265" stroke="#0f2b48" strokeWidth="2" />
                              <rect x={posX - 30} y="265" width="60" height="34" rx="4" fill="#ffffff" stroke="#0f2b48" strokeWidth="1.5" />
                              <text x={posX} y="280" fill="#0f2b48" fontSize="9" fontWeight="bold" textAnchor="middle">{circ.id}</text>
                              <text x={posX} y="292" fill="#2563eb" fontSize="8.5" fontWeight="bold" textAnchor="middle">{circ.B} A</text>
                              <line x1={posX} y1="299" x2={posX} y2="335" stroke={color} strokeWidth="3" />
                              <circle cx={posX} cy="350" r="14" fill={color} stroke="#0f2b48" strokeWidth="1" />
                              <text x={posX} y="354" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">{circ.t}</text>
                              <text x={posX} y="377" fill="#0f172a" fontSize="8.5" fontWeight="bold" textAnchor="middle">{circ.d.slice(0, 14)}</text>
                              <text x={posX} y="389" fill="#475569" fontSize="8" textAnchor="middle">{circ.q}</text>
                              <text x={posX} y="401" fill="#0f172a" fontSize="8" fontWeight="bold" textAnchor="middle">{circ.s} mm²</text>
                              <text x={posX} y="413" fill="#0f2b48" fontSize="8" fontWeight="bold" textAnchor="middle">{circ.W} W ({circ.I.toFixed(1)}A)</text>
                              <text x={posX} y="425" fill="#2563eb" fontSize="7.5" textAnchor="middle">ΔV: {circ.deltaV}%</text>
                            </g>
                          );
                        })}

                        {/* SECTIONAL FEEDER SWITCH IN TGP */}
                        <line x1={tsX} y1="235" x2={tsX} y2="265" stroke="#0f2b48" strokeWidth="2.5" />
                        <rect x={tsX - 35} y="265" width="70" height="36" rx="4" fill="#fef3c7" stroke="#d97706" strokeWidth="1.8" />
                        <text x={tsX} y="280" fill="#92400e" fontSize="8.5" fontWeight="bold" textAnchor="middle">Term. Seccional</text>
                        <text x={tsX} y="293" fill="#b45309" fontSize="8" fontWeight="extrabold" textAnchor="middle">2P – {demand.generalBreakerAmps}A</text>

                        {/* LÍNEA SECCIONAL Cable going down from TGP to TS-PA underneath */}
                        <line x1={tsX} y1="301" x2={tsX} y2="445" stroke="#d97706" strokeWidth="3" strokeDasharray="5,3" />
                        <line x1={tsX} y1="445" x2={165} y2="445" stroke="#d97706" strokeWidth="3" strokeDasharray="5,3" />
                        <line x1={165} y1="445" x2={165} y2="495" stroke="#d97706" strokeWidth="3" strokeDasharray="5,3" />

                        <text x={180} y="458" fill="#92400e" fontSize="8" fontWeight="bold">
                          Línea Seccional TGP → TS-PA: Cable {demand.sectionalFeederSectionMm} mm² Cu (Misma sección alimentador principal)
                        </text>

                        {/* TABLERO SECCIONAL (TS-PA - PLANTA ALTA) PLACED BELOW TGP */}
                        <rect x={tsBoxX} y={tsBoxY} width={tsBoxWidth} height="280" rx="8" fill="#f8fafc" stroke="#0284c7" strokeWidth="2" strokeDasharray="6,4" />
                        <text x={tsBoxX + 20} y={tsBoxY + 18} fill="#0369a1" fontSize="10" fontWeight="black">
                          TABLERO SECCIONAL (TS-PA · PLANTA ALTA)
                        </text>

                        {/* Diferencial TS-PA */}
                        <rect x={145} y={tsBoxY + 30} width="85" height="36" rx="4" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
                        <text x={187} y={tsBoxY + 45} fill="#0369a1" fontSize="8.5" fontWeight="bold" textAnchor="middle">Diferencial TS-PA</text>
                        <text x={187} y={tsBoxY + 58} fill="#0284c7" fontSize="8" fontWeight="bold" textAnchor="middle">30 mA – 2P</text>

                        {/* TS-PA Busbar */}
                        <line x1={187} y1={tsBoxY + 66} x2={187} y2={tsBoxY + 95} stroke="#0f2b48" strokeWidth="2.5" />
                        <line x1={187} y1={tsBoxY + 95} x2={tsBoxX + tsBoxWidth - 25} y2={tsBoxY + 95} stroke="#0f2b48" strokeWidth="3" />

                        {/* Render Planta Alta Circuits under TS-PA */}
                        {paCircuits.map((circ, idx) => {
                          const posX = 240 + idx * 85;
                          const color = CIRCUIT_COLORS[circ.t] || '#0f2b48';
                          const busY = tsBoxY + 95;
                          return (
                            <g key={circ.id}>
                              <line x1={posX} y1={busY} x2={posX} y2={busY + 30} stroke="#0f2b48" strokeWidth="2" />
                              <rect x={posX - 30} y={busY + 30} width="60" height="34" rx="4" fill="#ffffff" stroke="#0f2b48" strokeWidth="1.5" />
                              <text x={posX} y={busY + 45} fill="#0f2b48" fontSize="9" fontWeight="bold" textAnchor="middle">{circ.id}</text>
                              <text x={posX} y={busY + 57} fill="#2563eb" fontSize="8.5" fontWeight="bold" textAnchor="middle">{circ.B} A</text>
                              <line x1={posX} y1={busY + 64} x2={posX} y2={busY + 100} stroke={color} strokeWidth="3" />
                              <circle cx={posX} cy={busY + 115} r="14" fill={color} stroke="#0f2b48" strokeWidth="1" />
                              <text x={posX} y={busY + 119} fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">{circ.t}</text>
                              <text x={posX} y={busY + 142} fill="#0f172a" fontSize="8.5" fontWeight="bold" textAnchor="middle">{circ.d.slice(0, 14)}</text>
                              <text x={posX} y={busY + 154} fill="#475569" fontSize="8" textAnchor="middle">{circ.q}</text>
                              <text x={posX} y={busY + 166} fill="#0f172a" fontSize="8" fontWeight="bold" textAnchor="middle">{circ.s} mm²</text>
                              <text x={posX} y={busY + 178} fill="#0f2b48" fontSize="8" fontWeight="bold" textAnchor="middle">{circ.W} W ({circ.I.toFixed(1)}A)</text>
                              <text x={posX} y={busY + 190} fill="#2563eb" fontSize="7.5" textAnchor="middle">ΔV: {circ.deltaV}%</text>
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

      {/* 3. Cuadro de Circuitos y Potencias (Estilo Tabla PDF) */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-3 avoid-break">
        <div className="bg-slate-100 border-2 border-[#0f2b48] text-[#0f2b48] px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-700" />
            CUADRO DE CIRCUITOS Y POTENCIAS (DISTRIBUCIÓN POR TABLEROS)
          </span>
          <span className="text-xs font-mono font-bold text-slate-800">Tensión: {params.V} V~</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-300 border-collapse">
            <thead>
              <tr className="bg-slate-200 border-b-2 border-[#0f2b48] text-slate-900 font-bold">
                <th className="p-2.5 border border-slate-400">N° Circuito</th>
                <th className="p-2.5 border border-slate-400">Descripción</th>
                <th className="p-2.5 border border-slate-400">Cant</th>
                <th className="p-2.5 border border-slate-400">Pot. Unitaria (W)</th>
                <th className="p-2.5 border border-slate-400">Pot. Total (W)</th>
                <th className="p-2.5 border border-slate-400">Corriente (A) = {params.V}V</th>
                <th className="p-2.5 border border-slate-400">Protección</th>
                <th className="p-2.5 border border-slate-400">Conductor</th>
              </tr>
            </thead>
            <tbody>
              {floorCircuits.map((fc, fIdx) => {
                const subtotalW = fc.c.reduce((sum, c) => sum + c.W, 0);
                const subtotalI = fc.c.reduce((sum, c) => sum + c.I, 0);
                const isPlantaAlta = fIdx > 0;

                return (
                  <React.Fragment key={fIdx}>
                    {/* Floor & Board Header Row */}
                    <tr className="bg-slate-200 font-bold text-slate-900 border-t-2 border-slate-400">
                      <td colSpan={8} className="p-2 border border-slate-300 uppercase tracking-wider text-[11px]">
                        <div className="flex items-center justify-between">
                          <span>
                            {fc.f.name.toUpperCase()} — {isPlantaAlta ? `TABLERO SECCIONAL (TS-PA)` : `TABLERO GENERAL PRINCIPAL (TGP)`}
                          </span>
                          {isPlantaAlta && (
                            <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300 font-extrabold normal-case">
                              Línea Seccional: {demand.sectionalFeederSectionMm} mm² Cu (Directo desde TGP)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Circuit Rows */}
                    {fc.c.map((circ, cIdx) => (
                      <tr
                        key={circ.id}
                        className={cIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                      >
                        <td className="p-2 border border-slate-300 font-bold font-mono text-slate-900">
                          {circ.id}
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
                          {circ.B} A
                        </td>
                        <td className="p-2 border border-slate-300 font-mono text-slate-800">
                          {circ.s} mm² + PE
                        </td>
                      </tr>
                    ))}

                    {/* Subtotal Row per Floor */}
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <td colSpan={4} className="p-2 border border-slate-300 text-right">
                        Subtotal {fc.f.name}:
                      </td>
                      <td className="p-2 border border-slate-300 font-mono text-blue-900">
                        {subtotalW.toLocaleString('es-AR')} W
                      </td>
                      <td className="p-2 border border-slate-300 font-mono text-blue-900">
                        {subtotalI.toFixed(1)} A
                      </td>
                      <td colSpan={2} className="p-2 border border-slate-300" />
                    </tr>
                  </React.Fragment>
                );
              })}

              {/* Total Final Row */}
              <tr className="bg-slate-200 border-t-2 border-b-2 border-[#0f2b48] text-slate-900 font-extrabold text-sm">
                <td colSpan={4} className="p-3 border border-slate-400 text-right">
                  TOTAL VIVENDA (Demanda Simultánea Estimada DPMS):
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

      {/* 4. Referencias y Notas Importantes (Estilo PDF en 2 Columnas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 avoid-break">
        {/* Referencias */}
        <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm space-y-3">
          <h4 className="font-bold text-slate-900 text-xs uppercase border-b border-slate-200 pb-2 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Referencias del Unifilar
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border border-slate-900 bg-white inline-block rounded-xs" />
                <span>Medidor 220V</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border border-blue-600 bg-white inline-block rounded-xs" />
                <span>Interruptor general</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border border-cyan-600 bg-white inline-block rounded-xs" />
                <span>Diferencial 30 mA</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border border-amber-600 bg-amber-100 inline-block rounded-xs" />
                <span>Línea Seccional 6 mm²</span>
              </div>
            </div>

            <div className="space-y-1.5 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-4 h-1.5 bg-amber-500 inline-block rounded-full" />
                <span>Iluminación</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1.5 bg-emerald-600 inline-block rounded-full" />
                <span>Tomas generales</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1.5 bg-sky-600 inline-block rounded-full" />
                <span>Aires acondicionados</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1.5 bg-purple-600 inline-block rounded-full" />
                <span>Lavarropas / Lavadero</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notas Importantes */}
        <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm space-y-2">
          <h4 className="font-bold text-slate-900 text-xs uppercase border-b border-slate-200 pb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            Notas Importantes Normativas AEA 770
          </h4>
          <ol className="list-decimal pl-4 text-xs text-slate-700 space-y-1 leading-relaxed">
            <li>
              <strong>Tablero Seccional (TS-PA):</strong> Se alimenta directo desde TGP mediante conductor unipolar de {demand.sectionalFeederSectionMm} mm² Cu (misma sección que el alimentador principal de entrada).
            </li>
            <li>
              La demanda final se calcula según AEA 90364-7-770 (grado de electrificación, coeficientes de simultaneidad, etc.).
            </li>
            <li>
              Se recomienda consultar a la distribuidora EPEC la factibilidad de suministro trifásico para demandas mayores a 5 kW / 32 A en monofásico.
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
