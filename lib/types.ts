export interface FloorData {
  id: string;
  name: string;
  boardCode?: string; // e.g., 'TS1', 'TS2', 'TS3', 'TS4'
  colorTag?: string; // Color identificador en el plano (ej. 'Rojo', 'Azul', 'Verde', 'Amarillo')
  feederLengthM?: number; // Distancia desde TCE hasta este Tablero Seccional (m)
  feederPhases?: 'auto' | '1F' | '3F'; // Alimentación del seccional desde TCE
  techo: number;
  pared: number;
  tomas: number;
  aa: number;
  lav: number;
  otros: number;
  otrosW: number;
  modPuntos: number;
  modTomas: number;
  tapas: number;
  cajasOct: number;
  nota?: string;
  // Spatial measurements
  measuredAreaM2?: number;
  estimatedConduitMeters?: number;
}

export interface SpecialEquipment {
  id: string;
  name: string;
  powerW: number;
  boardTarget: 'TP' | 'TS' | 'TS1' | 'TS2' | 'TS3' | 'TS4' | string; // TCE (TP) o Tablero Seccional específico (TS1..TS4)
  voltagePhase: 'Monofásico 220V' | 'Trifásico 380V';
  circuitType?: 'CUE' | 'TUE' | 'ACU' | 'APU';
  description?: string;
}

export interface TechnicalParams {
  area: number;
  V: number;
  L: number; // Alimentador length (m)
  wl: number; // Watts per lighting point (15W LED)
  aaW: number; // Watts per AC unit (1400W)
  lavW: number; // Watts per washing machine (750W)
  sumType: string; // Monofásico / Trifásico
  epecFeat: string; // Estado de solicitud EPEC
  pillarLoc: string; // Ubicación del pilar
  distPillar: number; // Distancia pilar a tablero principal (m)
  soilRes: number; // Resistividad suelo (ohm.m)
  specialEquipments?: SpecialEquipment[];
  // Obra / Propiedad
  streetAndNum: string; // Calle y N°
  city: string; // Localidad / Ciudad
  propertyAddress?: string; // Direccion completa opcional
  // Comitente / Propietario
  ownerName: string; // Nombre y Apellido
  ownerDni: string; // DNI / CUIT
  // Profesional / Instalador
  installerName: string; // Nombre y Apellido
  installerCat: string; // Categoria (Cat I, II, III ERSeP)
  installerMatricula: string; // Matricula Profesional ERSeP
}

export interface Circuit {
  id: string;
  t: 'IUG' | 'TUG' | 'AA' | 'LAV' | 'TUE' | 'CUE';
  d: string;
  q: string | number;
  W: number;
  I: number;
  B: number; // Breaker rating A
  s: number; // Cable mm2
  sPE: number; // Ground cable mm2
  conduitMm: number; // Caño diametro mm
  estimatedWireLengthM: number; // Cable total length (m)
  estimatedConduitLengthM: number; // Caño total length (m)
  deltaV: number; // % Caída de tensión
  boardTarget?: string;
  boardCode?: string; // 'TCE', 'TS1', 'TS2', 'TS3', 'TS4', etc.
  isThreePhase?: boolean;
  poles?: '2P' | '4P';
}

export interface FloorCircuits {
  f: FloorData;
  boardCode: string;
  c: Circuit[];
}

export interface SectionalInternalPhaseBalance {
  wattsL1: number;
  wattsL2: number;
  wattsL3: number;
  ampsL1: number;
  ampsL2: number;
  ampsL3: number;
  unbalancePercent: number;
  isBalanced: boolean;
  circuitPhases: Record<string, 'L1' | 'L2' | 'L3' | '3F'>;
}

export interface SectionalBoardAnalysis {
  boardCode: string;
  boardName: string;
  colorTag?: string;
  floorId: string;
  circuits: Circuit[];
  installedWatts: number;
  simultaneousWatts: number;
  simultaneityFactor: number;
  isThreePhase: boolean;
  voltage: number;
  designCurrentIb: number;
  tceBreakerIn: number;
  cableSectionMm: number;
  cableCapacityIz: number;
  peSectionMm: number;
  conduitMm: number;
  feederLengthM: number;
  feederDeltaVPercent: number;
  maxCircuitDeltaVPercent: number;
  totalDeltaVPercent: number;
  rcdAmps: number;
  rcdPoles: '2P' | '4P';
  dinModulesRequired: number;
  recommendedDinBox: number;
  conductorSpec: string;
  assignedPhase: 'L1' | 'L2' | 'L3' | '3F (R-S-T)';
  internalPhaseBalance: SectionalInternalPhaseBalance;
  isCompliant: boolean;
}

export interface ComponentMarker {
  id: string;
  x: number; // pixel X on original image
  y: number; // pixel Y on original image
  type: 'techo' | 'pared' | 'tomas' | 'aa' | 'lav' | 'tablero' | 'jabalina';
  label: string;
  floorIndex: number;
  boardCode?: string;
}

export interface CalibrationData {
  pointA: { x: number; y: number } | null;
  pointB: { x: number; y: number } | null;
  realDistanceMeters: number;
  pixelsPerMeter: number;
  isCalibrated: boolean;
}

export interface MeasurementLine {
  id: string;
  points: { x: number; y: number }[];
  distanceMeters: number;
  color: string;
  label: string;
}

export interface MeasurementPolygon {
  id: string;
  points: { x: number; y: number }[];
  areaM2: number;
  color: string;
  label: string;
}

export interface MaterialItem {
  item: string;
  desc: string;
  norm: string;
  commUnit: string;
  commQty: number;
  unitPrice: number;
}

export interface LaborItem {
  tarea: string;
  unidad: string;
  qty: number;
  unitPrice: number;
}
