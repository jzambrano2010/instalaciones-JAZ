export interface FloorData {
  id: string;
  name: string;
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
  t: 'IUG' | 'TUG' | 'AA' | 'LAV' | 'TUE';
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
}

export interface FloorCircuits {
  f: FloorData;
  c: Circuit[];
}

export interface ComponentMarker {
  id: string;
  x: number; // pixel X on original image
  y: number; // pixel Y on original image
  type: 'techo' | 'pared' | 'tomas' | 'aa' | 'lav' | 'tablero' | 'jabalina';
  label: string;
  floorIndex: number;
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
