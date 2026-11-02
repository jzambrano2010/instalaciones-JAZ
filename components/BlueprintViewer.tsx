'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crop,
  Ruler,
  Maximize,
  Sliders,
  Sparkles,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  Plus,
  Compass,
  MapPin,
  Layers,
} from 'lucide-react';
import {
  CalibrationData,
  MeasurementLine,
  MeasurementPolygon,
  ComponentMarker,
  FloorData,
} from '@/lib/types';

interface BlueprintViewerProps {
  floors: FloorData[];
  onUpdateFloors: (newFloors: FloorData[]) => void;
  onAIAnalysisComplete?: (results: any) => void;
}

export default function BlueprintViewer({
  floors,
  onUpdateFloors,
  onAIAnalysisComplete,
}: BlueprintViewerProps) {
  // Files and Canvas states
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; dataUrl: string }[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisStatusText, setAnalysisStatusText] = useState<string>('');
  const [userHint, setUserHint] = useState<string>('');

  // Active Tool state
  // 'pan' | 'calibrate' | 'measure-dist' | 'measure-area' | 'add-component' | 'zoom-window'
  const [activeTool, setActiveTool] = useState<
    'pan' | 'calibrate' | 'measure-dist' | 'measure-area' | 'add-component' | 'zoom-window'
  >('pan');

  // Selected Component Type to add
  const [selectedCompType, setSelectedCompType] = useState<ComponentMarker['type']>('techo');

  // Zoom and Pan Transform
  const [transform, setTransform] = useState<{ x: number; y: number; scale: number }>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Zoom Window rectangle state
  const [zoomWinStart, setZoomWinStart] = useState<{ x: number; y: number } | null>(null);
  const [zoomWinCurrent, setZoomWinCurrent] = useState<{ x: number; y: number } | null>(null);

  // Calibration state
  const [calibration, setCalibration] = useState<CalibrationData>({
    pointA: null,
    pointB: null,
    realDistanceMeters: 5.0,
    pixelsPerMeter: 0,
    isCalibrated: false,
  });
  const [calibrationInputMeters, setCalibrationInputMeters] = useState<string>('5.0');
  const [showCalibModal, setShowCalibModal] = useState<boolean>(false);

  // Measurement lines and polygons
  const [measurementLines, setMeasurementLines] = useState<MeasurementLine[]>([]);
  const [currentLinePoints, setCurrentLinePoints] = useState<{ x: number; y: number }[]>([]);
  const [measurementPolygons, setMeasurementPolygons] = useState<MeasurementPolygon[]>([]);
  const [currentPolyPoints, setCurrentPolyPoints] = useState<{ x: number; y: number }[]>([]);

  // Electrical Components markers
  const [markers, setMarkers] = useState<ComponentMarker[]>([]);

  // Canvas Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Zoom Extents (Reset zoom and center image in viewport)
  const handleZoomExtents = useCallback(() => {
    if (!containerRef.current || !imageRef.current) return;
    const cWidth = containerRef.current.clientWidth;
    const cHeight = containerRef.current.clientHeight;
    const iWidth = imageRef.current.width;
    const iHeight = imageRef.current.height;

    if (iWidth === 0 || iHeight === 0) return;

    const scaleX = cWidth / iWidth;
    const scaleY = cHeight / iHeight;
    const scale = Math.min(scaleX, scaleY) * 0.95;

    const x = (cWidth - iWidth * scale) / 2;
    const y = (cHeight - iHeight * scale) / 2;

    setTransform({ x, y, scale });
  }, []);

  // Load image when page changes
  useEffect(() => {
    if (uploadedFiles.length === 0) return;
    const activeFile = uploadedFiles[activePageIndex];
    if (!activeFile) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeFile.dataUrl;
    img.onload = () => {
      imageRef.current = img;
      handleZoomExtents();
    };
  }, [uploadedFiles, activePageIndex, handleZoomExtents]);

  // Helper to ensure pdf.js is loaded
  const ensurePdfJsLoaded = async (): Promise<any> => {
    if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
      return (window as any).pdfjsLib;
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
          resolve((window as any).pdfjsLib);
        } else {
          reject(new Error('No se pudo inicializar la librería PDF.js'));
        }
      };
      script.onerror = () => reject(new Error('Error al descargar la librería PDF.js'));
      document.head.appendChild(script);
    });
  };

  // Handle file uploads (Images & PDFs via pdf.js CDN if PDF, or FileReader)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const loaded: { name: string; dataUrl: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const pdfjs = await ensurePdfJsLoaded();
          pdfjs.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

          for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 10); pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport0 = page.getViewport({ scale: 1.0 });
            const scale = 1800 / Math.max(viewport0.width, viewport0.height);
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');

            if (ctx) {
              await page.render({ canvasContext: ctx, viewport }).promise;
              loaded.push({
                name: `${file.name} (Pág. ${pageNum})`,
                dataUrl: canvas.toDataURL('image/jpeg', 0.92),
              });
            }
          }
        } catch (err: any) {
          console.error('Error rendering PDF:', err);
          alert(`Error procesando archivo PDF: ${err.message}. Verificá que el archivo no esté protegido con contraseña.`);
        }
      } else {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        loaded.push({ name: file.name, dataUrl });
      }
    }

    if (loaded.length > 0) {
      setUploadedFiles((prev) => [...prev, ...loaded]);
      setActivePageIndex(0);
    }
  };

  // Main Canvas Rendering Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to parent container
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Clear background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Save context transform
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // 1. Draw Blueprint Image
    if (imageRef.current) {
      ctx.drawImage(imageRef.current, 0, 0);
    }

    const pxPerMeter = calibration.pixelsPerMeter;

    // 2. Draw Measurement Polygons (Areas)
    measurementPolygons.forEach((poly) => {
      if (poly.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(poly.points[0].x, poly.points[0].y);
      for (let i = 1; i < poly.points.length; i++) {
        ctx.lineTo(poly.points[i].x, poly.points[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(110, 162, 255, 0.2)';
      ctx.fill();
      ctx.strokeStyle = poly.color || '#6ea2ff';
      ctx.lineWidth = 2 / transform.scale;
      ctx.stroke();

      // Label at center
      const centerX = poly.points.reduce((a, b) => a + b.x, 0) / poly.points.length;
      const centerY = poly.points.reduce((a, b) => a + b.y, 0) / poly.points.length;

      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(12, 14 / transform.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${poly.label}: ${poly.areaM2.toFixed(2)} m²`, centerX, centerY);
    });

    // Active Polygon creation drawing
    if (currentPolyPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentPolyPoints[0].x, currentPolyPoints[0].y);
      for (let i = 1; i < currentPolyPoints.length; i++) {
        ctx.lineTo(currentPolyPoints[i].x, currentPolyPoints[i].y);
      }
      ctx.strokeStyle = '#e0a800';
      ctx.lineWidth = 2 / transform.scale;
      ctx.setLineDash([6 / transform.scale, 4 / transform.scale]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Draw Measurement Lines (Distances)
    measurementLines.forEach((line) => {
      if (line.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x, line.points[i].y);
      }
      ctx.strokeStyle = line.color || '#1e9e5a';
      ctx.lineWidth = 2.5 / transform.scale;
      ctx.stroke();

      // End text label
      const lastPt = line.points[line.points.length - 1];
      ctx.fillStyle = '#1e9e5a';
      ctx.font = `bold ${Math.max(12, 13 / transform.scale)}px sans-serif`;
      ctx.fillText(`${line.label}: ${line.distanceMeters.toFixed(2)} m`, lastPt.x + 8, lastPt.y - 8);
    });

    // Active Line creation drawing
    if (currentLinePoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentLinePoints[0].x, currentLinePoints[0].y);
      for (let i = 1; i < currentLinePoints.length; i++) {
        ctx.lineTo(currentLinePoints[i].x, currentLinePoints[i].y);
      }
      ctx.strokeStyle = '#1e9e5a';
      ctx.lineWidth = 2 / transform.scale;
      ctx.setLineDash([4 / transform.scale, 4 / transform.scale]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Draw Calibration Line
    if (calibration.pointA) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(calibration.pointA.x, calibration.pointA.y, 6 / transform.scale, 0, Math.PI * 2);
      ctx.fill();

      if (calibration.pointB) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(calibration.pointB.x, calibration.pointB.y, 6 / transform.scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(calibration.pointA.x, calibration.pointA.y);
        ctx.lineTo(calibration.pointB.x, calibration.pointB.y);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3 / transform.scale;
        ctx.stroke();

        const midX = (calibration.pointA.x + calibration.pointB.x) / 2;
        const midY = (calibration.pointA.y + calibration.pointB.y) / 2;
        ctx.fillStyle = '#ef4444';
        ctx.font = `bold ${Math.max(13, 15 / transform.scale)}px sans-serif`;
        ctx.fillText(
          `Calibración: ${calibration.realDistanceMeters} m`,
          midX,
          midY - 10
        );
      }
    }

    // 5. Draw Electrical Component Markers
    markers.forEach((m) => {
      const colors: Record<string, string> = {
        techo: '#e0a800',
        pared: '#1e9e5a',
        tomas: '#6ea2ff',
        aa: '#1d8fd1',
        lav: '#8a4fd0',
        tablero: '#ef4444',
        jabalina: '#d1531d',
      };
      const radius = 9 / transform.scale;

      ctx.fillStyle = colors[m.type] || '#ffffff';
      ctx.beginPath();
      ctx.arc(m.x, m.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 / transform.scale;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(10, 11 / transform.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(m.label, m.x, m.y + 4 / transform.scale);
    });

    ctx.restore();

    // 6. Draw Zoom Window Drag Box (Screen Space)
    if (activeTool === 'zoom-window' && zoomWinStart && zoomWinCurrent) {
      const rectX = Math.min(zoomWinStart.x, zoomWinCurrent.x);
      const rectY = Math.min(zoomWinStart.y, zoomWinCurrent.y);
      const rectW = Math.abs(zoomWinCurrent.x - zoomWinStart.x);
      const rectH = Math.abs(zoomWinCurrent.y - zoomWinStart.y);

      ctx.fillStyle = 'rgba(110, 162, 255, 0.25)';
      ctx.fillRect(rectX, rectY, rectW, rectH);
      ctx.strokeStyle = '#6ea2ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rectX, rectY, rectW, rectH);
      ctx.setLineDash([]);
    }
  }, [
    transform,
    measurementPolygons,
    currentPolyPoints,
    measurementLines,
    currentLinePoints,
    calibration,
    markers,
    activeTool,
    zoomWinStart,
    zoomWinCurrent,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Convert Screen coordinates to Image Space coordinates
  const screenToImageCoords = (screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = screenX - rect.left;
    const mouseY = screenY - rect.top;

    const imgX = (mouseX - transform.x) / transform.scale;
    const imgY = (mouseY - transform.y) / transform.scale;
    return { x: imgX, y: imgY };
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = Math.min(Math.max(0.1, transform.scale * zoomFactor), 25);

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
    const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);

    setTransform({ x: newX, y: newY, scale: newScale });
  };

  // Canvas Mouse Down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Only left click

    const screenPos = { x: e.clientX, y: e.clientY };
    const imgPos = screenToImageCoords(e.clientX, e.clientY);

    if (activeTool === 'pan') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    } else if (activeTool === 'zoom-window') {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      setZoomWinStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setZoomWinCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else if (activeTool === 'calibrate') {
      if (!calibration.pointA) {
        setCalibration((prev) => ({ ...prev, pointA: imgPos, pointB: null, isCalibrated: false }));
      } else if (!calibration.pointB) {
        setCalibration((prev) => ({ ...prev, pointB: imgPos }));
        setShowCalibModal(true);
      } else {
        // Reset calibration points
        setCalibration((prev) => ({ ...prev, pointA: imgPos, pointB: null, isCalibrated: false }));
      }
    } else if (activeTool === 'measure-dist') {
      setCurrentLinePoints((prev) => [...prev, imgPos]);
    } else if (activeTool === 'measure-area') {
      setCurrentPolyPoints((prev) => [...prev, imgPos]);
    } else if (activeTool === 'add-component') {
      const labels: Record<string, string> = {
        techo: 'Luz Techo',
        pared: 'Aplique',
        tomas: 'TUG',
        aa: 'AAc',
        lav: 'Lavarropas',
        tablero: 'TG/TS',
        jabalina: 'PAT',
      };
      const newMarker: ComponentMarker = {
        id: Math.random().toString(36).substring(2, 9),
        x: imgPos.x,
        y: imgPos.y,
        type: selectedCompType,
        label: labels[selectedCompType] || 'Boca',
        floorIndex: activePageIndex,
      };
      setMarkers((prev) => [...prev, newMarker]);
    }
  };

  // Canvas Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'pan' && isDragging) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    } else if (activeTool === 'zoom-window' && zoomWinStart) {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      setZoomWinCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  // Canvas Mouse Up
  const handleMouseUp = () => {
    if (activeTool === 'pan') {
      setIsDragging(false);
    } else if (activeTool === 'zoom-window' && zoomWinStart && zoomWinCurrent && containerRef.current) {
      const rectX = Math.min(zoomWinStart.x, zoomWinCurrent.x);
      const rectY = Math.min(zoomWinStart.y, zoomWinCurrent.y);
      const rectW = Math.abs(zoomWinCurrent.x - zoomWinStart.x);
      const rectH = Math.abs(zoomWinCurrent.y - zoomWinStart.y);

      if (rectW > 15 && rectH > 15) {
        const cWidth = containerRef.current.clientWidth;
        const cHeight = containerRef.current.clientHeight;

        const scaleX = cWidth / rectW;
        const scaleY = cHeight / rectH;
        const newScale = Math.min(scaleX, scaleY) * transform.scale;

        const newX = (transform.x - rectX) * (newScale / transform.scale);
        const newY = (transform.y - rectY) * (newScale / transform.scale);

        setTransform({ x: newX, y: newY, scale: newScale });
      }

      setZoomWinStart(null);
      setZoomWinCurrent(null);
      setActiveTool('pan');
    }
  };

  // Finish current distance measurement line
  const finishLineMeasurement = () => {
    if (currentLinePoints.length < 2) {
      setCurrentLinePoints([]);
      return;
    }

    let totalPx = 0;
    for (let i = 0; i < currentLinePoints.length - 1; i++) {
      const dx = currentLinePoints[i + 1].x - currentLinePoints[i].x;
      const dy = currentLinePoints[i + 1].y - currentLinePoints[i].y;
      totalPx += Math.sqrt(dx * dx + dy * dy);
    }

    const scale = calibration.pixelsPerMeter || 80; // Default fallback scale 80px = 1m
    const distMeters = totalPx / scale;

    const newLine: MeasurementLine = {
      id: Math.random().toString(36).substring(2, 9),
      points: currentLinePoints,
      distanceMeters: distMeters,
      color: '#1e9e5a',
      label: `Medida ${measurementLines.length + 1}`,
    };

    setMeasurementLines((prev) => [...prev, newLine]);
    setCurrentLinePoints([]);
  };

  // Finish current area measurement polygon
  const finishAreaMeasurement = () => {
    if (currentPolyPoints.length < 3) {
      setCurrentPolyPoints([]);
      return;
    }

    // Shoelace formula for polygon area in pixels squared
    let pxArea = 0;
    const n = currentPolyPoints.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      pxArea += currentPolyPoints[i].x * currentPolyPoints[j].y;
      pxArea -= currentPolyPoints[j].x * currentPolyPoints[i].y;
    }
    pxArea = Math.abs(pxArea) / 2;

    const scale = calibration.pixelsPerMeter || 80;
    const areaM2 = pxArea / (scale * scale);

    const newPoly: MeasurementPolygon = {
      id: Math.random().toString(36).substring(2, 9),
      points: currentPolyPoints,
      areaM2,
      color: '#6ea2ff',
      label: `Área ${measurementPolygons.length + 1}`,
    };

    setMeasurementPolygons((prev) => [...prev, newPoly]);
    setCurrentPolyPoints([]);
  };

  // Apply Calibration Modal input
  const applyCalibration = () => {
    const distanceM = parseFloat(calibrationInputMeters);
    if (isNaN(distanceM) || distanceM <= 0 || !calibration.pointA || !calibration.pointB) {
      alert('Ingresá una distancia válida mayor a 0 metros.');
      return;
    }

    const dx = calibration.pointB.x - calibration.pointA.x;
    const dy = calibration.pointB.y - calibration.pointA.y;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);

    const pxPerMeter = pixelDist / distanceM;

    setCalibration((prev) => ({
      ...prev,
      realDistanceMeters: distanceM,
      pixelsPerMeter: pxPerMeter,
      isCalibrated: true,
    }));

    setShowCalibModal(false);
    setActiveTool('pan');
  };

  // Trigger Gemini AI Blueprint Analysis
  const runAIAnalysis = async () => {
    if (uploadedFiles.length === 0) {
      alert('Subí un plano en formato PDF, JPG o PNG antes de ejecutar el análisis IA.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(15);
    setAnalysisStatusText('Preparando plano y datos de escala calibrada...');

    try {
      // Get base64 string without data header
      const imagesBase64 = uploadedFiles.map((f) => f.dataUrl.split(',')[1]);

      setAnalysisProgress(45);
      setAnalysisStatusText('Enviando imagen a Gemini 3.8 Flash para visión y medición...');

      const customApiKey = typeof window !== 'undefined' ? localStorage.getItem('electroplan_custom_api_key') : null;
      const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) reqHeaders['x-gemini-api-key'] = customApiKey;

      const response = await fetch('/api/gemini/analyze-blueprint', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          images: imagesBase64,
          hint: userHint,
          pixelsPerMeter: calibration.pixelsPerMeter,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || `Error del servidor (${response.status})`);
      }

      setAnalysisProgress(80);
      setAnalysisStatusText('Interpretando bocas, cajas octogonales y largo de cañerías...');

      if (data && data.floors && Array.isArray(data.floors)) {
        // Sanitize and ensure each floor has valid id and numeric types
        const sanitizedFloors: FloorData[] = data.floors.map((f: any, idx: number) => ({
          id: f.id || `f_ai_${idx + 1}_${Math.random().toString(36).substring(2, 7)}`,
          name: f.name || `Planta ${idx + 1}`,
          techo: Number(f.techo) || 0,
          pared: Number(f.pared) || 0,
          tomas: Number(f.tomas) || 0,
          aa: Number(f.aa) || 0,
          lav: Number(f.lav) || 0,
          otros: Number(f.otros) || 0,
          otrosW: Number(f.otrosW) || 0,
          modPuntos: Number(f.modPuntos) || (Number(f.techo) || 0) + (Number(f.pared) || 0),
          modTomas: Number(f.modTomas) || (Number(f.tomas) || 0),
          tapas: Number(f.tapas) || (Number(f.techo) || 0) + (Number(f.tomas) || 0),
          cajasOct: Number(f.cajasOct) || (Number(f.techo) || 0),
          measuredAreaM2: Number(f.measuredAreaM2) || 0,
          estimatedConduitMeters: Number(f.estimatedConduitMeters) || 0,
          nota: f.nota || '',
        }));

        setAnalysisProgress(100);
        setAnalysisStatusText('¡Análisis completado exitosamente!');

        onUpdateFloors(sanitizedFloors);
        if (onAIAnalysisComplete) onAIAnalysisComplete({ ...data, floors: sanitizedFloors });
      } else {
        throw new Error('La IA no devolvió un formato válido de plantas/floors.');
      }
    } catch (err: any) {
      console.error('AI Analysis failed:', err);
      setAnalysisProgress(0);
      setAnalysisStatusText('Error en el proceso de análisis.');
      alert(`Error en análisis de IA: ${err.message || 'Verifique la clave API o la imagen del plano cargada.'}`);
    } finally {
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 600);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Control Panel */}
      <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#0f2b48] flex items-center gap-2">
              <Compass className="w-5 h-5 text-blue-800" />
              Visor de Planos interactivo con Calibración de Escala
            </h2>
            <p className="text-xs text-slate-600">
              Subí planos en PDF o imagen. Medí distancias y superficies, calibrá a 2 puntos y
              contabilizá elementos con IA.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="cursor-pointer px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white font-semibold text-xs rounded-lg flex items-center gap-2 transition-colors shadow-sm">
              <Upload className="w-4 h-4" />
              Subir Plano (PDF / Imagen)
              <input
                type="file"
                accept="application/pdf,image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        {/* Uploaded File selector tabs */}
        {uploadedFiles.length > 0 && (
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-slate-600 shrink-0">Planos cargados:</span>
            {uploadedFiles.map((file, idx) => (
              <button
                key={idx}
                onClick={() => setActivePageIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                  activePageIndex === idx
                    ? 'bg-[#0f2b48] text-white shadow-sm font-bold'
                    : 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                {file.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Interactive Canvas Viewport & Toolbar */}
      <div className="bg-slate-900 border border-slate-300 rounded-xl overflow-hidden relative shadow-md">
        {/* Floating Toolbar */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur border border-slate-300 rounded-lg shadow-md no-print">
          <button
            onClick={() => setActiveTool('pan')}
            title="Navegar / Desplazar (Pan)"
            className={`p-2 rounded-md transition-colors text-xs flex items-center gap-1 font-medium ${
              activeTool === 'pan' ? 'bg-[#0f2b48] text-white font-bold' : 'text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="hidden sm:inline">Desplazar</span>
          </button>

          <button
            onClick={() => setActiveTool('zoom-window')}
            title="Zoom Ventana (Seleccionar área en recuadro)"
            className={`p-2 rounded-md transition-colors text-xs flex items-center gap-1 font-medium ${
              activeTool === 'zoom-window'
                ? 'bg-[#0f2b48] text-white font-bold'
                : 'text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Crop className="w-4 h-4" />
            <span className="hidden sm:inline">Zoom Ventana</span>
          </button>

          <button
            onClick={handleZoomExtents}
            title="Zoom Extend (Ajustar plano completo a pantalla)"
            className="p-2 text-slate-800 hover:bg-slate-100 rounded-md transition-colors text-xs flex items-center gap-1 font-medium"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Zoom Extend</span>
          </button>

          <div className="w-px h-5 bg-slate-300 mx-0.5" />

          {/* Calibrate 2 Points */}
          <button
            onClick={() => {
              setActiveTool('calibrate');
              setCalibration((prev) => ({ ...prev, pointA: null, pointB: null }));
            }}
            title="Calibrar Escala con 2 Puntos"
            className={`p-2 rounded-md transition-colors text-xs flex items-center gap-1 font-medium ${
              activeTool === 'calibrate'
                ? 'bg-amber-700 text-white font-bold'
                : 'text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-700" />
            <span className="hidden sm:inline">Calibrar (2 Pts)</span>
          </button>

          {/* Measure Distance */}
          <button
            onClick={() => setActiveTool('measure-dist')}
            title="Medir Distancia / Cañerías (Línea)"
            className={`p-2 rounded-md transition-colors text-xs flex items-center gap-1 font-medium ${
              activeTool === 'measure-dist'
                ? 'bg-emerald-800 text-white font-bold'
                : 'text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Ruler className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">Medir Distancia</span>
          </button>

          {/* Measure Area */}
          <button
            onClick={() => setActiveTool('measure-area')}
            title="Medir Superficie / Área (Polígono)"
            className={`p-2 rounded-md transition-colors text-xs flex items-center gap-1 font-medium ${
              activeTool === 'measure-area'
                ? 'bg-blue-800 text-white font-bold'
                : 'text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Maximize className="w-4 h-4 text-blue-700" />
            <span className="hidden sm:inline">Medir Área</span>
          </button>

          <div className="w-px h-5 bg-slate-300 mx-0.5" />

          {/* Add Component Marker */}
          <button
            onClick={() => setActiveTool('add-component')}
            title="Marcar Componente Eléctrico"
            className={`p-2 rounded-md transition-colors text-xs flex items-center gap-1 font-medium ${
              activeTool === 'add-component'
                ? 'bg-purple-800 text-white font-bold'
                : 'text-slate-800 hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-4 h-4 text-purple-700" />
            <span className="hidden sm:inline">Marcar Componente</span>
          </button>
        </div>

        {/* Sub-toolbar for Component Selector if add-component is active */}
        {activeTool === 'add-component' && (
          <div className="absolute top-16 left-3 z-10 flex items-center gap-1 p-1.5 bg-white/95 backdrop-blur border border-slate-300 rounded-lg shadow-md no-print">
            <span className="text-[11px] font-bold text-slate-700 px-1">Componente:</span>
            {[
              { id: 'techo', label: '💡 Techo' },
              { id: 'pared', label: '🏮 Aplique' },
              { id: 'tomas', label: '🔌 TUG' },
              { id: 'aa', label: '❄️ AAc' },
              { id: 'lav', label: '🧺 Lavarropas' },
              { id: 'tablero', label: '⚡ Tablero' },
              { id: 'jabalina', label: '⏚ PAT' },
            ].map((comp) => (
              <button
                key={comp.id}
                onClick={() => setSelectedCompType(comp.id as any)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  selectedCompType === comp.id
                    ? 'bg-purple-800 text-white font-bold'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                {comp.label}
              </button>
            ))}
          </div>
        )}

        {/* Sub-toolbar for active measurements control */}
        {(currentLinePoints.length > 0 || currentPolyPoints.length > 0) && (
          <div className="absolute top-16 left-3 z-10 flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-300 rounded-lg shadow-md no-print text-xs text-emerald-950 font-medium">
            {currentLinePoints.length > 0 && (
              <>
                <span>Puntos marcados: {currentLinePoints.length}</span>
                <button
                  onClick={finishLineMeasurement}
                  className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded"
                >
                  Finalizar Medición Línea
                </button>
              </>
            )}

            {currentPolyPoints.length > 0 && (
              <>
                <span>Puntos marcados: {currentPolyPoints.length}</span>
                <button
                  onClick={finishAreaMeasurement}
                  className="px-2.5 py-1 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded"
                >
                  Finalizar Área
                </button>
              </>
            )}
          </div>
        )}

        {/* Calibration Badge indicator */}
        <div className="absolute bottom-3 left-3 z-10 px-3 py-1.5 bg-white/95 backdrop-blur border border-slate-300 rounded-lg text-xs font-mono text-slate-800 shadow-md">
          {calibration.isCalibrated ? (
            <span className="text-emerald-800 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              Escala Calibrada: 1 m = {calibration.pixelsPerMeter.toFixed(1)} px
            </span>
          ) : (
            <span className="text-amber-800 font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
              Escala no calibrada (Predeterminada)
            </span>
          )}
        </div>

        {/* Canvas Display Viewport */}
        <div ref={containerRef} className="w-full h-[520px] cursor-crosshair">
          {uploadedFiles.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-900">
              <Compass className="w-12 h-12 text-slate-500 mb-3 animate-pulse" />
              <p className="text-sm font-semibold text-slate-200">
                Ningún plano cargado actualmente
              </p>
              <p className="text-xs text-slate-400 max-w-md mt-1">
                Subí un archivo PDF o imagen JPG/PNG usando el botón superior para habilitar el
                visor interactivo con zoom, calibración a 2 puntos y cálculo de cañerías.
              </p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="w-full h-full touch-none"
            />
          )}
        </div>
      </div>

      {/* 3. AI Analysis Prompting & Progress Panel */}
      <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-700" />
              Análisis IA de Componentes y Cómputo Espacial
            </h3>
            <p className="text-xs text-slate-600">
              Gemini analizará visualmente el plano cargado utilizando la escala calibrada para
              contabilizar bocas y estimar metros de cañerías.
            </p>
          </div>

          <button
            onClick={runAIAnalysis}
            disabled={uploadedFiles.length === 0 || isAnalyzing}
            className="px-5 py-2.5 bg-[#0f2b48] hover:bg-slate-900 text-white font-bold text-xs rounded-lg shadow-sm disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            {isAnalyzing ? 'Procesando con IA...' : 'Analizar Plano con IA'}
          </button>
        </div>

        {/* User extra prompt hints */}
        <div>
          <label className="text-xs text-slate-700 font-bold block mb-1">
            Indicaciones o requerimientos especiales para la IA (opcional)
          </label>
          <input
            type="text"
            value={userHint}
            onChange={(e) => setUserHint(e.target.value)}
            placeholder="Ej: Considerar Dpto 1, aires acondicionados de 3500 frigorías (1600W c/u) y bomba de agua de 1HP."
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
          />
        </div>

        {/* AI Progress Bar */}
        {isAnalyzing && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-blue-900">{analysisStatusText}</span>
              <span className="text-slate-900 font-mono">{analysisProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 border border-slate-300 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#0f2b48] h-full transition-all duration-300 ease-out"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Calibration Modal Dialog */}
      {showCalibModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#0f2b48] flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-700" />
              Calibrar Escala del Plano
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              Ingresá la distancia real en metros entre los 2 puntos seleccionados en el gráfico (por
              ejemplo, el ancho de una habitación o una cota indicada en el plano).
            </p>

            <div>
              <label className="text-xs text-slate-700 font-bold block mb-1">
                Distancia real conocida (metros)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={calibrationInputMeters}
                onChange={(e) => setCalibrationInputMeters(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCalibModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg border border-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={applyCalibration}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Guardar Escala
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
