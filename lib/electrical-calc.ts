import {
  FloorData,
  TechnicalParams,
  Circuit,
  FloorCircuits,
  MaterialItem,
  LaborItem,
  SectionalBoardAnalysis,
} from './types';

export const STD_BREAKERS = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100];

// AEA 90364-7-770 Tabla 770.12.I: Ampacities Iz at 40 °C ambient (conduit B1/B2 embutido)
export const CABLE_AMPACITIES_40C: [number, number, number][] = [
  // [section_mm2, iz_2loaded_40C, iz_3loaded_40C]
  [1.5, 13, 11],
  [2.5, 18, 16],
  [4.0, 24, 21],
  [6.0, 31, 28],
  [10.0, 43, 38],
  [16.0, 59, 52],
  [25.0, 77, 68],
  [35.0, 96, 85],
];

export function getBoardCode(floor: FloorData, index: number): string {
  if (floor.boardCode && floor.boardCode.trim()) {
    return floor.boardCode.trim().toUpperCase();
  }
  const match = (floor.name || '').match(/TS[-\s]?(\d+)/i);
  if (match) {
    return `TS${match[1]}`;
  }
  return `TS${index + 1}`;
}

export function findBreaker(current: number): number {
  return STD_BREAKERS.find((b) => b >= current) || 100;
}

export function selectCableSection(breakerRating: number, isThreePhase: boolean = false): number {
  const colIndex = isThreePhase ? 2 : 1;
  const match = CABLE_AMPACITIES_40C.find((s) => s[colIndex] >= breakerRating);
  return match ? match[0] : 25.0;
}

export function getElectrificationGrade(areaM2: number): {
  grade: 'Mínimo' | 'Medio' | 'Elevado' | 'Superior';
  minCircuits: number;
  description: string;
} {
  if (areaM2 <= 0) {
    return {
      grade: 'Mínimo',
      minCircuits: 0,
      description: 'Superficie inicial 0 m². Ingrese los datos en Pestaña 2 o cargue un plano en Pestaña 1.',
    };
  } else if (areaM2 <= 60) {
    return {
      grade: 'Mínimo',
      minCircuits: 2,
      description: 'Superficie hasta 60 m². Requiere mínimo 2 circuitos (1 IUG + 1 TUG).',
    };
  } else if (areaM2 <= 130) {
    return {
      grade: 'Medio',
      minCircuits: 3,
      description: 'Superficie de 61 a 130 m². Requiere mínimo 3 circuitos (1 IUG + 1 TUG + 1 IUG/TUG/TUE).',
    };
  } else if (areaM2 <= 200) {
    return {
      grade: 'Elevado',
      minCircuits: 5,
      description: 'Superficie de 131 a 200 m². Requiere mínimo 5 circuitos (2 IUG + 2 TUG + 1 TUE).',
    };
  } else {
    return {
      grade: 'Superior',
      minCircuits: 6,
      description: 'Superficie mayor a 200 m². Requiere mínimo 6 circuitos (2 IUG + 3 TUG + 1 TUE).',
    };
  }
}

export function splitOutlets(totalOutlets: number, maxPerCircuit: number = 15): number[] {
  if (totalOutlets <= 0) return [];
  const numCircuits = Math.ceil(totalOutlets / maxPerCircuit);
  const result: number[] = [];
  for (let i = 0; i < numCircuits; i++) {
    result.push(
      Math.floor(totalOutlets / numCircuits) + (i < totalOutlets % numCircuits ? 1 : 0)
    );
  }
  return result;
}

export function generateCircuits(params: TechnicalParams, floors: FloorData[]): FloorCircuits[] {
  let circuitCounter = 0;

  const result: FloorCircuits[] = floors.map((floor, fIdx) => {
    const circuits: Circuit[] = [];
    const boardCode = getBoardCode(floor, fIdx);

    const addCircuit = (
      t: Circuit['t'],
      d: string,
      q: string | number,
      W: number,
      B: number,
      s: number,
      horizontalDistM: number = 12,
      boardTarget: string = boardCode
    ) => {
      circuitCounter++;
      const safeV = params.V > 0 && params.V !== 380 ? params.V : 220;
      const current = W / safeV;
      const sPE = s <= 16 ? Math.max(2.5, s) : 16; // Ground conductor rule
      const conduitMm = s <= 2.5 ? 20 : s <= 6 ? 25 : 32;

      // Vertical drop estimation: 2.2m per outlet/switch + horizontal run
      const outletCount = typeof q === 'number' ? q : parseInt(q) || 1;
      const estimatedConduitLengthM = Math.round((horizontalDistM + outletCount * 2.2) * 1.15);
      // Single phase = 3 wires in conduit (Phase, Neutral, PE)
      const estimatedWireLengthM = Math.round(estimatedConduitLengthM * 3);

      // Voltage drop calculation: deltaV % = (2 * L * I * 0.0225) / (s * V) * 100
      let actualS = s;
      let deltaV = parseFloat(
        ((2 * estimatedConduitLengthM * current * 0.0225) / (actualS * safeV) * 100).toFixed(2)
      );

      // AEA 90364-7-770 requires deltaV <= 3.0% on terminal circuits.
      while (deltaV > 3.0 && actualS < 35.0) {
        const nextAmp = CABLE_AMPACITIES_40C.find((item) => item[0] > actualS);
        if (!nextAmp) break;
        actualS = nextAmp[0];
        deltaV = parseFloat(
          ((2 * estimatedConduitLengthM * current * 0.0225) / (actualS * safeV) * 100).toFixed(2)
        );
      }

      circuits.push({
        id: `C${circuitCounter}`,
        t,
        d,
        q,
        W,
        I: current,
        B,
        s: actualS,
        sPE,
        conduitMm,
        estimatedWireLengthM,
        estimatedConduitLengthM,
        deltaV,
        boardTarget,
        boardCode,
        isThreePhase: false,
        poles: '2P',
      });
    };

    // 1. Lighting circuits (IUG - Max 15 outlets per circuit)
    const totalLightingOutlets = (floor.techo || 0) + (floor.pared || 0);
    const iugSplits = splitOutlets(totalLightingOutlets, 15);
    iugSplits.forEach((q, idx) => {
      if (q > 0) {
        addCircuit('IUG', `Iluminación ${boardCode}${iugSplits.length > 1 ? ` (${idx + 1})` : ''}`, `${q} bocas`, q * (params.wl || 15), 10, 1.5, 14, boardCode);
      }
    });

    // 2. General outlets (TUG - Max 15 outlets per circuit, 2200W max demand per circuit)
    const tugSplits = splitOutlets(floor.tomas || 0, 15);
    tugSplits.forEach((q, idx) => {
      if (q > 0) {
        addCircuit('TUG', `Tomas Gral. ${boardCode}${tugSplits.length > 1 ? ` (${idx + 1})` : ''}`, `${q} bocas`, 2200, 16, 2.5, 16, boardCode);
      }
    });

    // 3. Air Conditioners (AAc - 1 circuit per AC unit)
    for (let i = 1; i <= (floor.aa || 0); i++) {
      const aaLoadW = params.aaW || 1400;
      const aaCurrent = aaLoadW / 220;
      const aaBreaker = Math.max(16, findBreaker(aaCurrent * 1.25));
      const aaWire = Math.max(2.5, selectCableSection(aaBreaker));
      addCircuit('AA', `Aire Acond. ${boardCode} N°${i}`, '1 boca TUE', aaLoadW, aaBreaker, aaWire, 18, boardCode);
    }

    // 4. Washing Machine / Laundry (LAV)
    for (let i = 0; i < (floor.lav || 0); i++) {
      const lavLoadW = params.lavW || 750;
      const lavCurrent = lavLoadW / 220;
      const lavBreaker = Math.max(16, findBreaker(lavCurrent * 1.25));
      const lavWire = Math.max(2.5, selectCableSection(lavBreaker));
      addCircuit('LAV', `Lavarropas ${boardCode}`, '1 boca TUG', lavLoadW, lavBreaker, lavWire, 10, boardCode);
    }

    // 5. Special use / Other loads (TUE)
    for (let i = 1; i <= (floor.otros || 0); i++) {
      const loadW = floor.otrosW || 3300;
      const calcI = loadW / 220;
      const bRating = Math.max(16, findBreaker(calcI * 1.25));
      const wireSection = Math.max(2.5, selectCableSection(bRating));
      addCircuit('TUE', `Carga Esp. ${boardCode} N°${i}`, '1 boca TUE', loadW, bRating, wireSection, 15, boardCode);
    }

    return { f: floor, boardCode, c: circuits };
  });

  // Process custom Special Equipments from TechnicalParams
  if (params.specialEquipments && params.specialEquipments.length > 0 && result.length > 0) {
    params.specialEquipments.forEach((eq, idx) => {
      const is3P = eq.voltagePhase === 'Trifásico 380V';
      const safeV = is3P ? 380 : 220;
      const cosPhi = 0.9;
      const current = is3P
        ? eq.powerW / (Math.sqrt(3) * 380 * cosPhi)
        : eq.powerW / (safeV * cosPhi);

      const bRating = Math.max(16, findBreaker(current * 1.25));
      const wireSection = Math.max(2.5, selectCableSection(bRating, is3P));
      const sPE = wireSection <= 16 ? Math.max(2.5, wireSection) : 16;
      const conduitMm = wireSection <= 2.5 ? 20 : wireSection <= 6 ? 25 : 32;
      const estConduitM = 15;
      const estWireM = estConduitM * (is3P ? 5 : 3);
      const deltaV = parseFloat(
        (((is3P ? Math.sqrt(3) : 2) * estConduitM * current * 0.0225) / (wireSection * safeV) * 100).toFixed(2)
      );

      // Find target floor index for TS1, TS2, TS3, TS4... or fallback to 0
      const targetUpper = (eq.boardTarget || 'TS').toUpperCase();
      let targetFloorIndex = 0;
      if (targetUpper !== 'TP' && targetUpper !== 'TCE' && targetUpper !== 'TS') {
        const matchedIdx = result.findIndex((fc) => fc.boardCode === targetUpper);
        if (matchedIdx >= 0) targetFloorIndex = matchedIdx;
      }

      const assignedBoardCode =
        targetUpper === 'TP' || targetUpper === 'TCE'
          ? 'TCE'
          : result[targetFloorIndex].boardCode;

      circuitCounter++;
      result[targetFloorIndex].c.push({
        id: `CUE${idx + 1}`,
        t: 'CUE',
        d: `${eq.name} (${assignedBoardCode === 'TCE' ? 'Directo TCE' : assignedBoardCode}${is3P ? ' - 380V' : ''})`,
        q: '1 boca CUE',
        W: eq.powerW,
        I: parseFloat(current.toFixed(1)),
        B: bRating,
        s: wireSection,
        sPE,
        conduitMm,
        estimatedWireLengthM: estWireM,
        estimatedConduitLengthM: estConduitM,
        deltaV,
        boardTarget: eq.boardTarget,
        boardCode: assignedBoardCode,
        isThreePhase: is3P,
        poles: is3P ? '4P' : '2P',
      });
    });
  }

  return result;
}

export function isTrifasico(params: TechnicalParams, simultaneousDemandWatts: number): boolean {
  const sumTypeLower = (params.sumType || '').toLowerCase();
  return (
    sumTypeLower.includes('tri') ||
    sumTypeLower.includes('380') ||
    params.V === 380 ||
    simultaneousDemandWatts > 7000
  );
}

export function calculateDemand(
  circuits: Circuit[],
  params?: TechnicalParams
): {
  totalInstalledWatts: number;
  simultaneousDemandWatts: number;
  demandedAmps: number;
  generalBreakerAmps: number;
  subfeederSectionMm: number;
  subfeederBreakerAmps: number;
  sectionalFeederSectionMm: number;
  isThreePhase: boolean;
  voltage: number;
  cableCapacityIz: number;
} {
  let totalInstalledWatts = 0;
  let simultaneousDemandWatts = 0;

  circuits.forEach((c) => {
    totalInstalledWatts += c.W;
    const coeff = c.t === 'IUG' ? 0.66 : c.t === 'TUG' ? 0.7 : 1.0;
    simultaneousDemandWatts += c.W * coeff;
  });

  const roundedSimultaneous = Math.round(simultaneousDemandWatts);

  const is3P = params
    ? isTrifasico(params, roundedSimultaneous)
    : roundedSimultaneous > 7000;
  const voltage = is3P ? 380 : 220;

  const cosPhi = 0.9;
  const demandedAmps = is3P
    ? roundedSimultaneous / (Math.sqrt(3) * 380 * cosPhi)
    : roundedSimultaneous / (220 * cosPhi);

  const generalBreakerAmps = findBreaker(demandedAmps);

  // Main feeder Pilar -> TCE: verify thermal ampacity AND voltage drop over distPillar + L
  let subfeederSectionMm = selectCableSection(generalBreakerAmps, is3P);
  subfeederSectionMm = Math.max(6.0, subfeederSectionMm);

  const mainFeederDistM = Math.max(6, (params?.distPillar || 0) + (params?.L || 6));
  const factor = is3P ? Math.sqrt(3) : 2;
  let mainDeltaV =
    ((factor * mainFeederDistM * demandedAmps * 0.0225) / (subfeederSectionMm * voltage)) * 100;
  while (mainDeltaV > 1.5 && subfeederSectionMm < 35.0) {
    const nextAmp = CABLE_AMPACITIES_40C.find((item) => item[0] > subfeederSectionMm);
    if (!nextAmp) break;
    subfeederSectionMm = nextAmp[0];
    mainDeltaV =
      ((factor * mainFeederDistM * demandedAmps * 0.0225) / (subfeederSectionMm * voltage)) * 100;
  }

  const matchedAmpacity = CABLE_AMPACITIES_40C.find((s) => s[0] === subfeederSectionMm);
  const cableCapacityIz = matchedAmpacity ? (is3P ? matchedAmpacity[2] : matchedAmpacity[1]) : 31;

  const subfeederBreakerAmps = generalBreakerAmps;
  const sectionalFeederSectionMm = subfeederSectionMm;

  return {
    totalInstalledWatts,
    simultaneousDemandWatts: roundedSimultaneous,
    demandedAmps: parseFloat(demandedAmps.toFixed(1)),
    generalBreakerAmps,
    subfeederSectionMm,
    subfeederBreakerAmps,
    sectionalFeederSectionMm,
    isThreePhase: is3P,
    voltage,
    cableCapacityIz,
  };
}

/**
 * Divided engineering analysis & sectional feeder cable design for each Tablero Seccional (TS1, TS2, TS3, TS4...)
 * fed radially from TCE (Tablero Central / Cabecera).
 * Hierarchical phase balancing:
 *  1) Balance phases FIRST inside each multi-circuit Tablero Seccional (L1, L2, L3).
 *  2) Map/rotate each TS's phases (or assign 1F TS) onto TCE to minimize global TCE unbalance.
 */
export function calculateSectionalBoards(
  params: TechnicalParams,
  floorCircuits: FloorCircuits[],
  tceIsThreePhase?: boolean
): SectionalBoardAnalysis[] {
  const allCircuits = floorCircuits.flatMap((fc) => fc.c);
  const tceDemand = calculateDemand(allCircuits, params);
  const mainIs3P = tceIsThreePhase ?? tceDemand.isThreePhase;
  const cosPhi = 0.9;

  // Running phase load at TCE (installed W for phase balance tracking)
  const tcePhaseWatts: Record<'L1' | 'L2' | 'L3', number> = { L1: 0, L2: 0, L3: 0 };

  return floorCircuits.map((fc, idx) => {
    const boardCode = fc.boardCode || getBoardCode(fc.f, idx);
    // Filter out any CUE explicitly assigned directly to TCE ('TP'/'TCE')
    const tsCircuits = fc.c.filter((c) => c.boardCode !== 'TCE' && c.boardTarget !== 'TP');

    let installedWatts = 0;
    let simultaneousWatts = 0;
    let has3PhaseLoad = false;

    tsCircuits.forEach((c) => {
      installedWatts += c.W;
      const coeff = c.t === 'IUG' ? 0.66 : c.t === 'TUG' ? 0.7 : 1.0;
      simultaneousWatts += c.W * coeff;
      if (c.d.includes('380V') || c.d.includes('Trifásico')) {
        has3PhaseLoad = true;
      }
    });

    const roundedSim = Math.round(simultaneousWatts);
    const simultaneityFactor =
      installedWatts > 0 ? parseFloat((roundedSim / installedWatts).toFixed(2)) : 1.0;

    // Determine feeder supply for this TS (1F 220V or 3F 380V)
    // When TCE is 3F and 'auto' is selected, feed TS in 3F whenever it has >= 3 circuits or > 3000W
    // so phases can be balanced FIRST inside each Tablero Seccional.
    const feederPref = fc.f.feederPhases || 'auto';
    let tsIs3P = false;
    if (mainIs3P) {
      if (feederPref === '3F') tsIs3P = true;
      else if (feederPref === '1F') tsIs3P = has3PhaseLoad;
      else tsIs3P = has3PhaseLoad || tsCircuits.length >= 3 || roundedSim > 3000;
    }

    const voltage = tsIs3P ? 380 : 220;

    // --- Step 1: Balance phases FIRST inside this Tablero Seccional ---
    const overrides = params.phaseOverrides || {};
    const circuitPhases: Record<string, 'L1' | 'L2' | 'L3' | '3F'> = {};
    let wattsL1 = 0;
    let wattsL2 = 0;
    let wattsL3 = 0;
    let simL1 = 0;
    let simL2 = 0;
    let simL3 = 0;
    let assignedPhase: SectionalBoardAnalysis['assignedPhase'] = '3F (R-S-T)';

    if (tsIs3P) {
      assignedPhase = '3F (R-S-T)';

      const phaseAssignedW: Record<'L1' | 'L2' | 'L3', number> = { L1: 0, L2: 0, L3: 0 };
      const phaseAssignedSimW: Record<'L1' | 'L2' | 'L3', number> = { L1: 0, L2: 0, L3: 0 };
      const autoCircuits: Circuit[] = [];
      let hasAnyOverrideInTs = false;

      tsCircuits.forEach((c) => {
        const coeff = c.t === 'IUG' ? 0.66 : c.t === 'TUG' ? 0.7 : 1.0;
        const cSimW = c.W * coeff;
        if (c.isThreePhase || c.d.includes('380V') || c.d.includes('Trifásico')) {
          phaseAssignedW.L1 += c.W / 3;
          phaseAssignedW.L2 += c.W / 3;
          phaseAssignedW.L3 += c.W / 3;
          phaseAssignedSimW.L1 += cSimW / 3;
          phaseAssignedSimW.L2 += cSimW / 3;
          phaseAssignedSimW.L3 += cSimW / 3;
          circuitPhases[c.id] = '3F';
        } else if (overrides[c.id]) {
          const forced = overrides[c.id];
          hasAnyOverrideInTs = true;
          circuitPhases[c.id] = forced;
          phaseAssignedW[forced] += c.W;
          phaseAssignedSimW[forced] += cSimW;
        } else {
          autoCircuits.push(c);
        }
      });

      if (autoCircuits.length > 0) {
        if (hasAnyOverrideInTs) {
          // Place any new/un-overridden circuits on the lightest local phase without disturbing manual overrides
          const sortedAuto = [...autoCircuits].sort((a, b) => b.W - a.W);
          sortedAuto.forEach((c) => {
            const coeff = c.t === 'IUG' ? 0.66 : c.t === 'TUG' ? 0.7 : 1.0;
            const cSimW = c.W * coeff;
            let target: 'L1' | 'L2' | 'L3' = 'L1';
            if (phaseAssignedW.L2 < phaseAssignedW[target]) target = 'L2';
            if (phaseAssignedW.L3 < phaseAssignedW[target]) target = 'L3';
            circuitPhases[c.id] = target;
            phaseAssignedW[target] += c.W;
            phaseAssignedSimW[target] += cSimW;
          });
        } else {
          // Full automatic local 3-bucket greedy bin packing inside this TS + rotation against TCE
          const buckets: { watts: number; simWatts: number; circuits: Circuit[] }[] = [
            { watts: 0, simWatts: 0, circuits: [] },
            { watts: 0, simWatts: 0, circuits: [] },
            { watts: 0, simWatts: 0, circuits: [] },
          ];
          const sortedTs = [...autoCircuits].sort((a, b) => b.W - a.W);
          sortedTs.forEach((c) => {
            const coeff = c.t === 'IUG' ? 0.66 : c.t === 'TUG' ? 0.7 : 1.0;
            const cSimW = c.W * coeff;
            let minB = 0;
            if (buckets[1].watts < buckets[minB].watts) minB = 1;
            if (buckets[2].watts < buckets[minB].watts) minB = 2;
            buckets[minB].watts += c.W;
            buckets[minB].simWatts += cSimW;
            buckets[minB].circuits.push(c);
          });

          const bucketsDesc = [...buckets].sort((a, b) => b.watts - a.watts);
          const phasesList: ('L1' | 'L2' | 'L3')[] = ['L1', 'L2', 'L3'];
          const tcePhasesAsc = phasesList.sort(
            (pA, pB) => tcePhaseWatts[pA] - tcePhaseWatts[pB]
          );

          bucketsDesc.forEach((b, i) => {
            const targetPhase = tcePhasesAsc[i];
            phaseAssignedW[targetPhase] += b.watts;
            phaseAssignedSimW[targetPhase] += b.simWatts;
            b.circuits.forEach((c) => {
              circuitPhases[c.id] = targetPhase;
            });
          });
        }
      }

      wattsL1 = Math.round(phaseAssignedW.L1);
      wattsL2 = Math.round(phaseAssignedW.L2);
      wattsL3 = Math.round(phaseAssignedW.L3);
      simL1 = phaseAssignedSimW.L1;
      simL2 = phaseAssignedSimW.L2;
      simL3 = phaseAssignedSimW.L3;

      tcePhaseWatts.L1 += wattsL1;
      tcePhaseWatts.L2 += wattsL2;
      tcePhaseWatts.L3 += wattsL3;
    } else {
      // 1-Phase TS: honor manual phase override (block or circuit) when TCE is 3F, otherwise pick lightest phase
      let targetPhase: 'L1' | 'L2' | 'L3' = 'L1';
      if (mainIs3P) {
        const boardOverride =
          overrides[`__TS__${boardCode}`] ||
          tsCircuits.map((c) => overrides[c.id]).find((p) => Boolean(p));
        if (boardOverride) {
          targetPhase = boardOverride;
        } else if (tcePhaseWatts.L2 < tcePhaseWatts.L1 && tcePhaseWatts.L2 <= tcePhaseWatts.L3) {
          targetPhase = 'L2';
        } else if (tcePhaseWatts.L3 < tcePhaseWatts.L1 && tcePhaseWatts.L3 < tcePhaseWatts.L2) {
          targetPhase = 'L3';
        }
      }
      assignedPhase = targetPhase;
      tsCircuits.forEach((c) => {
        circuitPhases[c.id] = targetPhase;
      });

      if (targetPhase === 'L1') {
        wattsL1 = installedWatts;
        simL1 = simultaneousWatts;
      } else if (targetPhase === 'L2') {
        wattsL2 = installedWatts;
        simL2 = simultaneousWatts;
      } else {
        wattsL3 = installedWatts;
        simL3 = simultaneousWatts;
      }
      tcePhaseWatts[targetPhase] += installedWatts;
    }

    const ampsL1 = parseFloat((wattsL1 / (220 * cosPhi)).toFixed(1));
    const ampsL2 = parseFloat((wattsL2 / (220 * cosPhi)).toFixed(1));
    const ampsL3 = parseFloat((wattsL3 / (220 * cosPhi)).toFixed(1));

    const avgLocalW = (wattsL1 + wattsL2 + wattsL3) / 3;
    let localUnbalance = 0;
    if (avgLocalW > 0 && tsIs3P) {
      const maxDev = Math.max(
        Math.abs(wattsL1 - avgLocalW),
        Math.abs(wattsL2 - avgLocalW),
        Math.abs(wattsL3 - avgLocalW)
      );
      localUnbalance = parseFloat(((maxDev / avgLocalW) * 100).toFixed(1));
    }

    const internalPhaseBalance: SectionalBoardAnalysis['internalPhaseBalance'] = {
      wattsL1,
      wattsL2,
      wattsL3,
      ampsL1,
      ampsL2,
      ampsL3,
      unbalancePercent: localUnbalance,
      isBalanced: tsIs3P ? localUnbalance <= 15.0 : true,
      circuitPhases,
    };

    // Design current Ib: for 3F TS, verify worst simultaneous phase current as well as balanced 3F current
    let designCurrentIb = 0;
    if (roundedSim > 0) {
      if (tsIs3P) {
        const balancedIb = roundedSim / (Math.sqrt(3) * 380 * cosPhi);
        const maxPhaseSimW = Math.max(simL1, simL2, simL3);
        const worstPhaseIb = maxPhaseSimW / (220 * cosPhi);
        designCurrentIb = Math.max(balancedIb, worstPhaseIb);
      } else {
        designCurrentIb = roundedSim / (220 * cosPhi);
      }
    }

    // Breaker in TCE protecting this sectional feeder
    const tceBreakerIn = roundedSim > 0 ? Math.max(16, findBreaker(designCurrentIb)) : 16;

    // Feeder distance TCE -> TSn (default progressive distances if omitted)
    const feederLengthM =
      fc.f.feederLengthM && fc.f.feederLengthM > 0 ? fc.f.feederLengthM : 12 + idx * 6;

    // Thermal ampacity check (minimum 4.0 mm² Cu for sectional feeders per AEA 770/771)
    let cableSectionMm = Math.max(4.0, selectCableSection(tceBreakerIn, tsIs3P));

    // Voltage drop check on sectional line TCE -> TSn (target <= 1.5% so total <= 3.0% / 4.5%)
    const factor = tsIs3P ? Math.sqrt(3) : 2;
    let feederDeltaVPercent =
      designCurrentIb > 0
        ? ((factor * feederLengthM * designCurrentIb * 0.0225) / (cableSectionMm * voltage)) * 100
        : 0;

    while (feederDeltaVPercent > 1.5 && cableSectionMm < 35.0) {
      const nextAmp = CABLE_AMPACITIES_40C.find((item) => item[0] > cableSectionMm);
      if (!nextAmp) break;
      cableSectionMm = nextAmp[0];
      feederDeltaVPercent =
        ((factor * feederLengthM * designCurrentIb * 0.0225) / (cableSectionMm * voltage)) * 100;
    }

    const matchedAmp = CABLE_AMPACITIES_40C.find((item) => item[0] === cableSectionMm);
    const cableCapacityIz = matchedAmp ? (tsIs3P ? matchedAmp[2] : matchedAmp[1]) : 24;
    const peSectionMm = cableSectionMm <= 16 ? Math.max(2.5, cableSectionMm) : 16;

    // Conduit sizing respecting 35% max occupancy (AEA 770.12)
    let conduitMm = 20;
    if (tsIs3P) {
      conduitMm = cableSectionMm <= 4 ? 25 : cableSectionMm <= 10 ? 32 : 40;
    } else {
      conduitMm = cableSectionMm <= 4 ? 20 : cableSectionMm <= 10 ? 25 : 32;
    }

    const maxCircuitDeltaVPercent = tsCircuits.reduce(
      (max, c) => Math.max(max, c.deltaV),
      0
    );
    const roundedFeederDV = parseFloat(feederDeltaVPercent.toFixed(2));
    const totalDeltaVPercent = parseFloat((roundedFeederDV + maxCircuitDeltaVPercent).toFixed(2));

    // RCD inside TS
    const rcdPoles: '2P' | '4P' = tsIs3P ? '4P' : '2P';
    const rcdAmps = tceBreakerIn <= 40 ? 40 : tceBreakerIn <= 63 ? 63 : 80;

    // DIN Modules inside this TS (RCD + branch PIAs + 20% AEA 771 reserve)
    const circuitPoles = tsCircuits.reduce(
      (sum, c) => sum + (c.d.includes('380V') || c.d.includes('Trifásico') ? 4 : 2),
      0
    );
    const basePoles = (tsIs3P ? 4 : 2) + circuitPoles;
    const dinModulesRequired = Math.ceil(basePoles * 1.2);
    let recommendedDinBox = 12;
    if (dinModulesRequired <= 8) recommendedDinBox = 8;
    else if (dinModulesRequired <= 12) recommendedDinBox = 12;
    else if (dinModulesRequired <= 18) recommendedDinBox = 18;
    else if (dinModulesRequired <= 24) recommendedDinBox = 24;
    else if (dinModulesRequired <= 36) recommendedDinBox = 36;
    else recommendedDinBox = 48;

    const conductorSpec = tsIs3P
      ? `4×${cableSectionMm} + PE ${peSectionMm} mm² Cu (380V)`
      : `2×${cableSectionMm} + PE ${peSectionMm} mm² Cu (220V)`;

    const isCompliant =
      designCurrentIb <= tceBreakerIn &&
      tceBreakerIn <= cableCapacityIz &&
      roundedFeederDV <= 2.0 &&
      totalDeltaVPercent <= 5.0;

    return {
      boardCode,
      boardName: fc.f.name || boardCode,
      colorTag: fc.f.colorTag,
      floorId: fc.f.id,
      circuits: tsCircuits,
      installedWatts,
      simultaneousWatts: roundedSim,
      simultaneityFactor,
      isThreePhase: tsIs3P,
      voltage,
      designCurrentIb: parseFloat(designCurrentIb.toFixed(1)),
      tceBreakerIn,
      cableSectionMm,
      cableCapacityIz,
      peSectionMm,
      conduitMm,
      feederLengthM,
      feederDeltaVPercent: roundedFeederDV,
      maxCircuitDeltaVPercent: parseFloat(maxCircuitDeltaVPercent.toFixed(2)),
      totalDeltaVPercent,
      rcdAmps,
      rcdPoles,
      dinModulesRequired,
      recommendedDinBox,
      conductorSpec,
      assignedPhase,
      internalPhaseBalance,
      isCompliant,
    };
  });
}

export interface PhaseBalanceResult {
  l1Circuits: Circuit[];
  l2Circuits: Circuit[];
  l3Circuits: Circuit[];
  wattsL1: number;
  wattsL2: number;
  wattsL3: number;
  ampsL1: number;
  ampsL2: number;
  ampsL3: number;
  avgWatts: number;
  unbalancePercent: number;
  isBalanced: boolean;
  circuitPhases: Record<string, 'L1' | 'L2' | 'L3' | '3F'>;
}

export function calculatePhaseBalance(
  circuits: Circuit[],
  sectionalBoards?: SectionalBoardAnalysis[],
  isThreePhaseSupply?: boolean,
  phaseOverrides?: Record<string, 'L1' | 'L2' | 'L3'>
): PhaseBalanceResult {
  const l1Circuits: Circuit[] = [];
  const l2Circuits: Circuit[] = [];
  const l3Circuits: Circuit[] = [];
  const circuitPhases: Record<string, 'L1' | 'L2' | 'L3' | '3F'> = {};
  let w1 = 0, w2 = 0, w3 = 0;

  const supplyIs3P =
    isThreePhaseSupply ??
    (sectionalBoards && sectionalBoards.length > 0
      ? sectionalBoards.some(
          (sb) => sb.isThreePhase || sb.assignedPhase === 'L2' || sb.assignedPhase === 'L3'
        )
      : true);

  const assignSinglePhase = (c: Circuit, phase: 'L1' | 'L2' | 'L3') => {
    circuitPhases[c.id] = phase;
    if (phase === 'L1') {
      w1 += c.W;
      l1Circuits.push(c);
    } else if (phase === 'L2') {
      w2 += c.W;
      l2Circuits.push(c);
    } else {
      w3 += c.W;
      l3Circuits.push(c);
    }
  };

  const assignThreePhase = (c: Circuit) => {
    const thirdW = c.W / 3;
    w1 += thirdW;
    w2 += thirdW;
    w3 += thirdW;
    l1Circuits.push(c);
    l2Circuits.push(c);
    l3Circuits.push(c);
    circuitPhases[c.id] = '3F';
  };

  const placeListWithOverrides = (list: Circuit[]) => {
    const autoList: Circuit[] = [];
    list.forEach((c) => {
      if (c.isThreePhase || c.d.includes('Trifásico') || c.d.includes('380V') || c.d.includes('380 V')) {
        assignThreePhase(c);
      } else if (supplyIs3P && phaseOverrides?.[c.id]) {
        assignSinglePhase(c, phaseOverrides[c.id]);
      } else {
        autoList.push(c);
      }
    });

    autoList
      .sort((a, b) => b.W - a.W)
      .forEach((c) => {
        if (!supplyIs3P || (w1 <= w2 && w1 <= w3)) {
          assignSinglePhase(c, 'L1');
        } else if (w2 <= w1 && w2 <= w3) {
          assignSinglePhase(c, 'L2');
        } else {
          assignSinglePhase(c, 'L3');
        }
      });
  };

  if (sectionalBoards && sectionalBoards.length > 0) {
    // Hierarchical consolidation: respect the internal phase assignment of each TS first
    const assignedCircuitIds = new Set<string>();
    sectionalBoards.forEach((sb) => {
      sb.circuits.forEach((c) => {
        assignedCircuitIds.add(c.id);
        const phase = sb.internalPhaseBalance.circuitPhases[c.id] || 'L1';
        if (phase === '3F') {
          assignThreePhase(c);
        } else {
          assignSinglePhase(c, phase);
        }
      });
    });

    // Any remaining direct TCE circuits respect phaseOverrides first, then balance onto lightest phase
    const remaining = circuits.filter((c) => !assignedCircuitIds.has(c.id));
    placeListWithOverrides(remaining);
  } else {
    // Standalone / 3F simulation mode: honor phaseOverrides first, then greedy bin-pack remaining
    placeListWithOverrides(circuits);
  }

  const roundW1 = Math.round(w1);
  const roundW2 = Math.round(w2);
  const roundW3 = Math.round(w3);
  const cosPhi = 0.9;

  const ampsL1 = parseFloat((roundW1 / (220 * cosPhi)).toFixed(1));
  const ampsL2 = parseFloat((roundW2 / (220 * cosPhi)).toFixed(1));
  const ampsL3 = parseFloat((roundW3 / (220 * cosPhi)).toFixed(1));

  const avgWatts = (roundW1 + roundW2 + roundW3) / 3;
  let unbalancePercent = 0;
  if (avgWatts > 0) {
    const maxDev = Math.max(
      Math.abs(roundW1 - avgWatts),
      Math.abs(roundW2 - avgWatts),
      Math.abs(roundW3 - avgWatts)
    );
    unbalancePercent = parseFloat(((maxDev / avgWatts) * 100).toFixed(1));
  }

  return {
    l1Circuits,
    l2Circuits,
    l3Circuits,
    wattsL1: roundW1,
    wattsL2: roundW2,
    wattsL3: roundW3,
    ampsL1,
    ampsL2,
    ampsL3,
    avgWatts: Math.round(avgWatts),
    unbalancePercent,
    isBalanced: unbalancePercent <= 15.0,
    circuitPhases,
  };
}

export function generateMaterialsList(
  params: TechnicalParams,
  floors: FloorData[],
  circuits: Circuit[]
): MaterialItem[] {
  let wire15m = 0;
  let wire25m = 0;
  let wire40m = 0;
  let wire60m = 0;
  let wire100m = 0;
  let conduit20m = 0;
  let conduit25m = 0;
  let conduit32m = 0;
  let octagonalBoxes = 0;
  let rectangularBoxes = 0;
  let modulePoints = 0;
  let moduleSockets = 0;
  let boxCovers = 0;

  const addWireBySection = (sectionMm: number, lengthM: number) => {
    if (sectionMm <= 1.5) wire15m += lengthM;
    else if (sectionMm <= 2.5) wire25m += lengthM;
    else if (sectionMm <= 4.0) wire40m += lengthM;
    else if (sectionMm <= 6.0) wire60m += lengthM;
    else wire100m += lengthM;
  };

  circuits.forEach((c) => {
    addWireBySection(c.s, c.estimatedWireLengthM);
    if (c.conduitMm <= 20) conduit20m += c.estimatedConduitLengthM;
    else if (c.conduitMm <= 25) conduit25m += c.estimatedConduitLengthM;
    else conduit32m += c.estimatedConduitLengthM;
  });

  const totalBocas = floors.reduce(
    (sum, f) =>
      sum +
      (f.techo || 0) +
      (f.pared || 0) +
      (f.tomas || 0) +
      (f.aa || 0) +
      (f.lav || 0) +
      (f.otros || 0),
    0
  );

  const hasWork = totalBocas > 0 || circuits.length > 0 || (params.area || 0) > 0;

  const floorCircuits = generateCircuits(params, floors);
  const demand = calculateDemand(circuits, params);
  const sectionalBoards = calculateSectionalBoards(params, floorCircuits, demand.isThreePhase);
  const mainWireCount = demand.isThreePhase ? 5 : 3;

  // Feeder cable from Pilar to TCE + radial sectional cables TCE -> TS1, TS2, TS3, TS4...
  if (hasWork) {
    const mainFeederM = Math.round(((params.distPillar || 0) + (params.L || 0)) * mainWireCount * 1.15);
    addWireBySection(demand.subfeederSectionMm, mainFeederM);

    sectionalBoards.forEach((sb) => {
      const sbWireCount = sb.isThreePhase ? 5 : 3;
      const sbWireM = Math.round(sb.feederLengthM * sbWireCount * 1.15);
      addWireBySection(sb.cableSectionMm, sbWireM);

      if (sb.conduitMm <= 20) conduit20m += sb.feederLengthM;
      else if (sb.conduitMm <= 25) conduit25m += sb.feederLengthM;
      else conduit32m += sb.feederLengthM;
    });
  }

  floors.forEach((f) => {
    octagonalBoxes += f.cajasOct || f.techo || 0;
    modulePoints += f.modPuntos || (f.techo || 0) + (f.pared || 0);
    moduleSockets += f.modTomas || f.tomas || 0;
    rectangularBoxes += (f.modPuntos || (f.techo || 0) + (f.pared || 0)) + (f.modTomas || f.tomas || 0);
    boxCovers += f.tapas || (f.techo || 0) + (f.tomas || 0);
  });

  const boardCount = Math.max(1, sectionalBoards.length);
  const maxDinBox = sectionalBoards.reduce((m, s) => Math.max(m, s.recommendedDinBox), 12);

  const meterBoxDesc = demand.isThreePhase
    ? 'Caja para Medidor Trifásico IP43 / IK10 autoextinguible'
    : 'Caja para Medidor Monofásico IP43 / IK10 autoextinguible';
  const meterNorm = demand.isThreePhase
    ? 'ET 22 EPEC / RG 11/2018 ERSeP'
    : 'ET 21 EPEC / RG 11/2018 ERSeP';

  const items: MaterialItem[] = [
    {
      item: 'Cable unipolar Cobre IRAM NM 247-3 (1.5 mm²)',
      desc: 'Circuitos IUG de Iluminación antillama',
      norm: 'IRAM NM 247-3 / IEC 60227',
      commUnit: 'm',
      commQty: wire15m,
      unitPrice: 320,
    },
    {
      item: 'Cable unipolar Cobre IRAM NM 247-3 (2.5 mm²)',
      desc: 'Circuitos TUG Tomas Generales, Lavadero y CUE',
      norm: 'IRAM NM 247-3 / IEC 60227',
      commUnit: 'm',
      commQty: wire25m,
      unitPrice: 480,
    },
    {
      item: 'Cable unipolar Cobre IRAM NM 247-3 (4.0 mm²)',
      desc: 'Líneas Seccionales desde TCE, Aires Acond. y CUE',
      norm: 'IRAM NM 247-3 / IEC 60227',
      commUnit: 'm',
      commQty: wire40m,
      unitPrice: 750,
    },
    {
      item: 'Cable unipolar Cobre IRAM NM 247-3 (6.0 mm²)',
      desc: `Alim. Principal Pilar→TCE, Líneas Seccionales (${sectionalBoards.map((b) => b.boardCode).join(', ')}) y PAT`,
      norm: 'IRAM NM 247-3 / IEC 60227',
      commUnit: 'm',
      commQty: wire60m,
      unitPrice: 1100,
    },
  ];

  if (wire100m > 0) {
    items.push({
      item: 'Cable unipolar Cobre IRAM NM 247-3 (10.0 mm² / 16.0 mm²)',
      desc: 'Alimentador General TCE y Líneas Seccionales de alta carga / distancia',
      norm: 'IRAM NM 247-3 / IEC 60227',
      commUnit: 'm',
      commQty: wire100m,
      unitPrice: 1850,
    });
  }

  items.push(
    {
      item: 'Caño corrugado ignífugo IRAM 62386 (Ø 20 mm - 3/4")',
      desc: 'Canalización embutida en mampostería (clasificación 3321)',
      norm: 'IRAM 62386-1 / IEC 61386',
      commUnit: 'Tira 25m',
      commQty: conduit20m > 0 ? Math.max(1, Math.ceil(conduit20m / 25)) : 0,
      unitPrice: 12000,
    },
    {
      item: 'Caño corrugado ignífugo IRAM 62386 (Ø 25 mm / Ø 32 mm)',
      desc: 'Canalización de alimentadores TCE → TS1..TS4 y cargas pesadas',
      norm: 'IRAM 62386-1 / IEC 61386',
      commUnit: 'Tira 25m',
      commQty: conduit25m + conduit32m > 0 ? Math.max(1, Math.ceil((conduit25m + conduit32m) / 25)) : 0,
      unitPrice: 16500,
    },
    {
      item: 'Cajas octogonales plásticas ignífugas IRAM (Derivación Techo)',
      desc: 'Bocas de iluminación y cajas de paso embutidas',
      norm: 'IRAM 62670 / IEC 60670',
      commUnit: 'Unidad',
      commQty: hasWork ? octagonalBoxes : 0,
      unitPrice: 1200,
    },
    {
      item: 'Cajas rectangulares plásticas ignífugas IRAM 10x5 cm',
      desc: 'Montaje de llaves de punto y tomacorrientes',
      norm: 'IRAM 62670 / IEC 60670',
      commUnit: 'Unidad',
      commQty: hasWork ? rectangularBoxes : 0,
      unitPrice: 1100,
    },
    {
      item: 'Módulos tomacorriente 2P+T 10A / 20A IRAM 2071',
      desc: 'Módulos con obturador de seguridad para tomas',
      norm: 'IRAM 2071',
      commUnit: 'Unidad',
      commQty: hasWork ? moduleSockets : 0,
      unitPrice: 2400,
    },
    {
      item: 'Módulos interruptores de punto / combinados IRAM 2007',
      desc: 'Llaves de encendido de luces',
      norm: 'IRAM 2007',
      commUnit: 'Unidad',
      commQty: hasWork ? modulePoints : 0,
      unitPrice: 2200,
    },
    {
      item: 'Tapas armadas completas (Bastidor + Módulos + Tapa)',
      desc: 'Terminación de bocas en pared y techo',
      norm: 'IRAM 2007 / IRAM 2071',
      commUnit: 'Unidad',
      commQty: hasWork ? boxCovers : 0,
      unitPrice: 4500,
    },
    {
      item: 'Jabalina Copperweld IRAM 2309 (1/2" x 1.5 m)',
      desc: 'Electrodo dispersor de puesta a tierra PAT (Capa Cu ≥ 254µm)',
      norm: 'IRAM 2309 / AEA 90364',
      commUnit: 'Unidad',
      commQty: hasWork ? 1 : 0,
      unitPrice: 28000,
    },
    {
      item: 'Caja de inspección PAT PVC (15x15 cm) con tapa',
      desc: 'Protección y verificación de jabalina de tierra con tomacable',
      norm: 'IRAM 2315 / Ley 10281',
      commUnit: 'Unidad',
      commQty: hasWork ? 1 : 0,
      unitPrice: 15000,
    },
    {
      item: meterBoxDesc,
      desc: 'Gabinete de pilar homologado ERSeP / EPEC (LM)',
      norm: meterNorm,
      commUnit: 'Unidad',
      commQty: hasWork ? 1 : 0,
      unitPrice: demand.isThreePhase ? 58000 : 34000,
    },
    {
      item: 'Gabinete Tablero Central TCE (Cabecera de Seccionales IP43)',
      desc: `Aloja PIA General + ${boardCount} PIAs Seccionales para ${sectionalBoards.map((b) => b.boardCode).join(', ')}`,
      norm: 'ET 21/22 EPEC / IRAM 62670',
      commUnit: 'Unidad',
      commQty: hasWork ? 1 : 0,
      unitPrice: 28000,
    },
    {
      item: `Gabinetes Tableros Seccionales TS1..TS${boardCount} IP43 (${maxDinBox} Módulos DIN)`,
      desc: `1 gabinete independiente por cada seccional (${sectionalBoards.map((b) => b.boardCode).join(', ')}) con 20% reserva AEA`,
      norm: 'IRAM 62670 / IEC 60670 / IEC 61439',
      commUnit: 'Unidad',
      commQty: hasWork ? boardCount : 0,
      unitPrice: maxDinBox <= 12 ? 24000 : maxDinBox <= 24 ? 36000 : 52000,
    },
    {
      item: demand.isThreePhase
        ? 'Interruptores Diferenciales Residuales 30mA (2P / 4P) IRAM 2301'
        : 'Interruptores Diferenciales Residuales 2P 40A 30mA IRAM 2301',
      desc: `1 diferencial por cada tablero seccional (${sectionalBoards.map((b) => b.boardCode).join(', ')})`,
      norm: 'IRAM 2301 / IEC 61008-1',
      commUnit: 'Unidad',
      commQty: hasWork ? boardCount : 0,
      unitPrice: demand.isThreePhase ? 52000 : 38000,
    },
    {
      item: demand.isThreePhase
        ? 'Interruptores Termomagnéticos (PIA) 2P / 4P IRAM NM 60898'
        : 'Interruptores Termomagnéticos (PIA) Bipolares 2P IRAM NM 60898',
      desc: `1 PIA General TCE + ${boardCount} PIAs Seccionales en TCE + ${circuits.length} PIAs en TS`,
      norm: 'IRAM NM 60898 / IEC 60898',
      commUnit: 'Unidad',
      commQty: hasWork ? circuits.length + boardCount + 1 : 0,
      unitPrice: demand.isThreePhase ? 18500 : 12500,
    }
  );

  return items;
}

export function generateLaborList(
  params: TechnicalParams,
  floors: FloorData[],
  circuits: Circuit[]
): LaborItem[] {
  let totalBocas = 0;
  floors.forEach((f) => {
    totalBocas +=
      (f.techo || 0) +
      (f.pared || 0) +
      (f.tomas || 0) +
      (f.aa || 0) * 2 +
      (f.lav || 0) +
      (f.otros || 0);
  });

  const hasWork = totalBocas > 0 || circuits.length > 0 || (params.area || 0) > 0;

  return [
    {
      tarea: 'Visita de inspección y relevamiento técnico inicial',
      unidad: 'Por visita',
      qty: hasWork ? 1 : 0,
      unitPrice: 48400,
    },
    {
      tarea: 'Armado de pilar de obra Monofásico homologado EPEC',
      unidad: 'Por pilar',
      qty: hasWork ? 1 : 0,
      unitPrice: 212960,
    },
    {
      tarea: 'Canalizado y armado de losa por boca octogonal',
      unidad: 'Por boca',
      qty: hasWork ? floors.reduce((a, b) => a + (b.techo || 0), 0) : 0,
      unitPrice: 36300,
    },
    {
      tarea: 'Cableado y conexionado de bocas (iluminación + tomas)',
      unidad: 'Por boca',
      qty: hasWork ? totalBocas : 0,
      unitPrice: 22385,
    },
    {
      tarea: 'Montaje de artefactos de iluminación (hasta 3 m)',
      unidad: 'Por artefacto',
      qty: hasWork ? floors.reduce((a, b) => a + (b.techo || 0) + (b.pared || 0), 0) : 0,
      unitPrice: 17545,
    },
    {
      tarea: 'Instalación y conexionado de Jabalina PAT + Mediciones',
      unidad: 'Por punto PAT',
      qty: hasWork ? 1 : 0,
      unitPrice: 96800,
    },
    {
      tarea: 'Armado y peinado de Tablero Principal / Seccional',
      unidad: 'Por protección',
      qty: hasWork ? (circuits.length > 0 ? circuits.length + 2 : 2) : 0,
      unitPrice: 61710,
    },
    {
      tarea: 'Certificación y Confección CIE (Ley Provincial 10.281)',
      unidad: 'Carpeta ERSeP',
      qty: hasWork ? 1 : 0,
      unitPrice: 324280,
    },
    {
      tarea: 'Bocas adicionales para certificación (> 20 bocas)',
      unidad: 'Por boca adic.',
      qty: hasWork ? Math.max(0, totalBocas - 20) : 0,
      unitPrice: 14520,
    },
  ];
}
