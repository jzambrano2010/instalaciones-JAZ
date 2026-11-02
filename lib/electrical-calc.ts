import { FloorData, TechnicalParams, Circuit, FloorCircuits, MaterialItem, LaborItem } from './types';

export const STD_BREAKERS = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100];
export const CABLE_AMPACITIES: [number, number][] = [
  [1.5, 15],
  [2.5, 21],
  [4.0, 28],
  [6.0, 36],
  [10.0, 50],
  [16.0, 68],
  [25.0, 89],
  [35.0, 111],
];

export function findBreaker(current: number): number {
  return STD_BREAKERS.find((b) => b >= current) || 100;
}

export function selectCableSection(breakerRating: number): number {
  const match = CABLE_AMPACITIES.find((s) => s[1] >= breakerRating);
  return match ? match[0] : 16.0;
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

  return floors.map((floor) => {
    const circuits: Circuit[] = [];

    const addCircuit = (
      t: Circuit['t'],
      d: string,
      q: string | number,
      W: number,
      B: number,
      s: number,
      horizontalDistM: number = 12
    ) => {
      circuitCounter++;
      const safeV = params.V > 0 ? params.V : 220;
      const current = W / safeV;
      const sPE = s <= 16 ? Math.max(2.5, s) : 16; // Ground conductor rule
      const conduitMm = s <= 2.5 ? 20 : s <= 6 ? 25 : 32;

      // Vertical drop estimation: 2.5m per outlet/switch + horizontal run
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
      // Auto-upsize cable if necessary so it complies:
      while (deltaV > 3.0 && actualS < 35.0) {
        const nextAmp = CABLE_AMPACITIES.find((item) => item[0] > actualS);
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
      });
    };

    // 1. Lighting circuits (IUG - Max 15 outlets per circuit)
    const totalLightingOutlets = (floor.techo || 0) + (floor.pared || 0);
    const iugSplits = splitOutlets(totalLightingOutlets, 15);
    iugSplits.forEach((q, idx) => {
      if (q > 0) {
        addCircuit('IUG', `Iluminación ${floor.name}${iugSplits.length > 1 ? ` (${idx + 1})` : ''}`, `${q} bocas`, q * (params.wl || 15), 10, 1.5, 14);
      }
    });

    // 2. General outlets (TUG - Max 15 outlets per circuit, 2200W max demand per circuit)
    const tugSplits = splitOutlets(floor.tomas || 0, 15);
    tugSplits.forEach((q, idx) => {
      if (q > 0) {
        addCircuit('TUG', `Tomas generales ${floor.name}${tugSplits.length > 1 ? ` (${idx + 1})` : ''}`, `${q} bocas`, 2200, 16, 2.5, 16);
      }
    });

    // 3. Air Conditioners (AAc - 1 circuit per AC unit)
    for (let i = 1; i <= (floor.aa || 0); i++) {
      const aaLoadW = params.aaW || 1400;
      const aaCurrent = aaLoadW / (params.V || 220);
      const aaBreaker = Math.max(16, findBreaker(aaCurrent * 1.25));
      const aaWire = Math.max(2.5, selectCableSection(aaBreaker));
      addCircuit('AA', `Aire acond. ${floor.name} N°${i}`, '1 boca TUE', aaLoadW, aaBreaker, aaWire, 18);
    }

    // 4. Washing Machine / Laundry (LAV)
    for (let i = 0; i < (floor.lav || 0); i++) {
      const lavLoadW = params.lavW || 750;
      const lavCurrent = lavLoadW / (params.V || 220);
      const lavBreaker = Math.max(16, findBreaker(lavCurrent * 1.25));
      const lavWire = Math.max(2.5, selectCableSection(lavBreaker));
      addCircuit('LAV', `Lavarropas / Lavadero ${floor.name}`, '1 boca TUG', lavLoadW, lavBreaker, lavWire, 10);
    }

    // 5. Special use / Other loads (TUE)
    for (let i = 1; i <= (floor.otros || 0); i++) {
      const loadW = floor.otrosW || 3300;
      const calcI = loadW / (params.V || 220);
      const bRating = Math.max(16, findBreaker(calcI * 1.25));
      const wireSection = Math.max(2.5, selectCableSection(bRating));
      addCircuit('TUE', `Cargas Especiales ${floor.name} N°${i}`, '1 boca TUE', loadW, bRating, wireSection, 15);
    }

    return { f: floor, c: circuits };
  });
}

export function calculateDemand(circuits: Circuit[]): {
  totalInstalledWatts: number;
  simultaneousDemandWatts: number;
  demandedAmps: number;
  generalBreakerAmps: number;
  subfeederSectionMm: number;
  subfeederBreakerAmps: number;
  sectionalFeederSectionMm: number;
} {
  let totalInstalledWatts = 0;
  let simultaneousDemandWatts = 0;

  circuits.forEach((c) => {
    totalInstalledWatts += c.W;
    const coeff = c.t === 'IUG' ? 0.66 : c.t === 'TUG' ? 0.7 : 1.0;
    simultaneousDemandWatts += c.W * coeff;
  });

  const demandedAmps = simultaneousDemandWatts / 220; // Monofásico 220V
  const generalBreakerAmps = findBreaker(demandedAmps);

  // Subfeeder cable sizing (Minimum 6mm2 per AEA 770 / EPEC)
  const calculatedSubfeederMm = selectCableSection(generalBreakerAmps);
  const subfeederSectionMm = Math.max(6.0, calculatedSubfeederMm);
  const subfeederBreakerAmps = generalBreakerAmps;
  // Normative rule: Linea Seccional to Tablero Seccional TS-PA must be identical to Main Feeder section (subfeederSectionMm)
  const sectionalFeederSectionMm = subfeederSectionMm;

  return {
    totalInstalledWatts,
    simultaneousDemandWatts: Math.round(simultaneousDemandWatts),
    demandedAmps: parseFloat(demandedAmps.toFixed(1)),
    generalBreakerAmps,
    subfeederSectionMm,
    subfeederBreakerAmps,
    sectionalFeederSectionMm,
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
  let conduit20m = 0;
  let conduit25m = 0;
  let octagonalBoxes = 0;
  let rectangularBoxes = 0;
  let modulePoints = 0;
  let moduleSockets = 0;
  let boxCovers = 0;

  circuits.forEach((c) => {
    if (c.s === 1.5) wire15m += c.estimatedWireLengthM;
    else if (c.s === 2.5) wire25m += c.estimatedWireLengthM;
    else if (c.s === 4.0) wire40m += c.estimatedWireLengthM;
    else if (c.s >= 6.0) wire60m += c.estimatedWireLengthM;

    if (c.conduitMm <= 20) conduit20m += c.estimatedConduitLengthM;
    else conduit25m += c.estimatedConduitLengthM;
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

  // Feeder cable from Pilar to TGP Main Board
  if (hasWork) {
    const feederWireM = Math.round(((params.distPillar || 0) + (params.L || 0)) * 3 * 1.15);
    wire60m += feederWireM;

    // Sectional Feeder Cable (TGP -> TS-PA in Planta Alta): Same 6mm2 section as main feeder
    if (floors.length > 1) {
      const sectionalFeederWireM = Math.round(14 * 3 * 1.15); // ~48m of 6.0 mm2 conductor
      wire60m += sectionalFeederWireM;
      conduit25m += 14;
    }
  }

  floors.forEach((f) => {
    octagonalBoxes += f.cajasOct || f.techo || 0;
    modulePoints += f.modPuntos || (f.techo || 0) + (f.pared || 0);
    moduleSockets += f.modTomas || f.tomas || 0;
    rectangularBoxes += (f.modPuntos || (f.techo || 0) + (f.pared || 0)) + (f.modTomas || f.tomas || 0);
    boxCovers += f.tapas || (f.techo || 0) + (f.tomas || 0);
  });

  return [
    {
      item: 'Cable unipolar Cobre IRAM NM 247-3 (1.5 mm²)',
      desc: 'Circuitos IUG de Iluminación',
      norm: 'IRAM NM 247-3 / IEC 60227',
      commUnit: 'Rollo 100m',
      commQty: wire15m > 0 ? Math.max(1, Math.ceil(wire15m / 100)) : 0,
      unitPrice: 32000,
    },
    {
      item: 'Cable unipolar Cobre IRAM NM 247-3 (2.5 mm²)',
      desc: 'Circuitos TUG Tomas Generales y Lavadero',
      norm: 'IRAM NM 247-3 / IEC 60227',
      commUnit: 'Rollo 100m',
      commQty: wire25m > 0 ? Math.max(1, Math.ceil(wire25m / 100)) : 0,
      unitPrice: 48000,
    },
    {
      item: 'Cable unipolar Cobre IRAM NM 247-3 (4.0 mm²)',
      desc: 'Aires Acondicionados y Cargas Especiales',
      norm: 'IRAM NM 247-3 / IEC 60227',
      commUnit: 'Rollo 100m',
      commQty: wire40m > 0 ? Math.max(1, Math.ceil(wire40m / 100)) : 0,
      unitPrice: 75000,
    },
    {
      item: 'Cable unipolar Cobre IRAM NM 247-3 (6.0 mm²)',
      desc: 'Alim. Principal (Pilar-TGP), Línea Seccional (TGP-TS Planta Alta 6mm²) y PAT 10mm²',
      norm: 'IRAM NM 247-3 / IEC 60227',
      commUnit: 'Rollo 100m',
      commQty: wire60m > 0 ? Math.max(1, Math.ceil(wire60m / 100)) : 0,
      unitPrice: 110000,
    },
    {
      item: 'Caño corrugado ignífugo IRAM 62386 (Ø 20 mm - 3/4")',
      desc: 'Canalización embutida en mampostería',
      norm: 'IRAM 62386-1 / Clasificación 3321',
      commUnit: 'Tira 25m',
      commQty: conduit20m > 0 ? Math.max(1, Math.ceil(conduit20m / 25)) : 0,
      unitPrice: 12000,
    },
    {
      item: 'Caño corrugado ignífugo IRAM 62386 (Ø 25 mm - 7/8")',
      desc: 'Canalización de alimentadores y cargas pesadas',
      norm: 'IRAM 62386-1 / Clasificación 3321',
      commUnit: 'Tira 25m',
      commQty: conduit25m > 0 ? Math.max(1, Math.ceil(conduit25m / 25)) : 0,
      unitPrice: 16500,
    },
    {
      item: 'Cajas octogonales plásticas IRAM (Derivación Techo)',
      desc: 'Bocas de iluminación y cajas de paso',
      norm: 'IRAM 62670',
      commUnit: 'Unidad',
      commQty: hasWork ? octagonalBoxes : 0,
      unitPrice: 1200,
    },
    {
      item: 'Cajas rectangulares plásticas IRAM 10x5 cm',
      desc: 'Montaje de llaves de punto y tomacorrientes',
      norm: 'IRAM 62670',
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
      norm: 'IRAM 2007 / 2071',
      commUnit: 'Unidad',
      commQty: hasWork ? boxCovers : 0,
      unitPrice: 4500,
    },
    {
      item: 'Jabalina Copperweld IRAM 2309 (1/2" x 1.5 m)',
      desc: 'Electrodo dispersor de puesta a tierra PAT',
      norm: 'IRAM 2309 / Espesor Cu >= 254um',
      commUnit: 'Unidad',
      commQty: hasWork ? 1 : 0,
      unitPrice: 28000,
    },
    {
      item: 'Caja de inspección PAT PVC (15x15 cm) con tapa',
      desc: 'Protección y verificación de jabalina de tierra',
      norm: 'ET EPEC / Ley 10281',
      commUnit: 'Unidad',
      commQty: hasWork ? 1 : 0,
      unitPrice: 15000,
    },
    {
      item: 'Caja para Medidor Monofásico IP43 / IK10 autoextinguible',
      desc: 'Gabinete de pilar homologado ERSeP / EPEC',
      norm: 'ET 21 EPEC / RG 11/2018 ERSeP',
      commUnit: 'Unidad',
      commQty: hasWork ? 1 : 0,
      unitPrice: 34000,
    },
    {
      item: 'Caja estanca IP43/IP65 para protección principal en pilar',
      desc: 'Alojamiento de interruptor termomagnético general detrás del medidor EPEC',
      norm: 'ET 21 EPEC / IRAM 62670',
      commUnit: 'Unidad',
      commQty: hasWork ? 1 : 0,
      unitPrice: 18500,
    },
    {
      item: 'Tablero Seccional de embutir IP43 (12/24 Módulos)',
      desc: 'Gabinete para termomagnéticas y diferencial',
      norm: 'IRAM 62670 / IEC 60670',
      commUnit: 'Unidad',
      commQty: hasWork ? Math.max(1, floors.length) : 0,
      unitPrice: 24000,
    },
    {
      item: 'Interruptor Diferencial 2P 40A 30mA IRAM 2301',
      desc: 'Protección personas contra contactos indirectos',
      norm: 'IRAM 2301 / IEC 61008',
      commUnit: 'Unidad',
      commQty: hasWork ? Math.max(1, floors.length) : 0,
      unitPrice: 38000,
    },
  ];
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
