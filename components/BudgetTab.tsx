'use client';

import React, { useState, useEffect } from 'react';
import { TechnicalParams, FloorData, MaterialItem, LaborItem } from '@/lib/types';
import { generateCircuits, generateMaterialsList, generateLaborList } from '@/lib/electrical-calc';
import {
  ShoppingCart,
  Search,
  Calculator,
  ShieldCheck,
  Download,
  FileUp,
  RefreshCw,
  RotateCcw,
  Info,
} from 'lucide-react';

interface BudgetTabProps {
  params: TechnicalParams;
  floors: FloorData[];
  onImportProject?: (newParams: TechnicalParams, newFloors: FloorData[]) => void;
}

export default function BudgetTab({ params, floors, onImportProject }: BudgetTabProps) {
  const circuits = generateCircuits(params, floors).flatMap((fc) => fc.c);

  // Custom user overrides for prices and quantities with lazy localStorage initialization
  const [customMaterialPrices, setCustomMaterialPrices] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('electroplan_budget_overrides');
      if (saved) return JSON.parse(saved).customMaterialPrices || {};
    } catch {
      // ignore
    }
    return {};
  });

  const [customMaterialQtys, setCustomMaterialQtys] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('electroplan_budget_overrides');
      if (saved) return JSON.parse(saved).customMaterialQtys || {};
    } catch {
      // ignore
    }
    return {};
  });

  const [customLaborPrices, setCustomLaborPrices] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('electroplan_budget_overrides');
      if (saved) return JSON.parse(saved).customLaborPrices || {};
    } catch {
      // ignore
    }
    return {};
  });

  const [customLaborQtys, setCustomLaborQtys] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('electroplan_budget_overrides');
      if (saved) return JSON.parse(saved).customLaborQtys || {};
    } catch {
      // ignore
    }
    return {};
  });

  const [isSearchingPrices, setIsSearchingPrices] = useState<boolean>(false);

  // Save overrides to localStorage when updated
  useEffect(() => {
    try {
      localStorage.setItem(
        'electroplan_budget_overrides',
        JSON.stringify({
          customMaterialPrices,
          customMaterialQtys,
          customLaborPrices,
          customLaborQtys,
        })
      );
    } catch (e) {
      console.error('Error saving budget overrides:', e);
    }
  }, [customMaterialPrices, customMaterialQtys, customLaborPrices, customLaborQtys]);

  // Dynamically generated base items based on current params & floors
  const baseMaterials = generateMaterialsList(params, floors, circuits);
  const materials = baseMaterials.map((m) => ({
    ...m,
    commQty: customMaterialQtys[m.item] !== undefined ? customMaterialQtys[m.item] : m.commQty,
    unitPrice: customMaterialPrices[m.item] !== undefined ? customMaterialPrices[m.item] : m.unitPrice,
  }));

  const baseLabor = generateLaborList(params, floors, circuits);
  const labor = baseLabor.map((l) => ({
    ...l,
    qty: customLaborQtys[l.tarea] !== undefined ? customLaborQtys[l.tarea] : l.qty,
    unitPrice: customLaborPrices[l.tarea] !== undefined ? customLaborPrices[l.tarea] : l.unitPrice,
  }));

  // Force re-calculation with default baseline quantities and prices
  const handleRecalculateDefault = () => {
    setCustomMaterialPrices({});
    setCustomMaterialQtys({});
    setCustomLaborPrices({});
    setCustomLaborQtys({});
    try {
      localStorage.removeItem('electroplan_budget_overrides');
    } catch (e) {
      console.error('Error clearing budget overrides:', e);
    }
    setStatusMsg({ text: 'Cómputo recalculado con los valores y bocas actuales del proyecto.', type: 'success' });
  };

  // Explicitly set all material and labor quantities to zero
  const handleResetToZero = () => {
    const zeroMatQtys: Record<string, number> = {};
    baseMaterials.forEach((m) => {
      zeroMatQtys[m.item] = 0;
    });
    const zeroLabQtys: Record<string, number> = {};
    baseLabor.forEach((l) => {
      zeroLabQtys[l.tarea] = 0;
    });
    setCustomMaterialQtys(zeroMatQtys);
    setCustomLaborQtys(zeroLabQtys);
    setStatusMsg({ text: 'Cómputo y presupuesto fijados a $0 correctamente.', type: 'success' });
  };

  const handleMaterialQtyChange = (itemKey: string, val: number) => {
    setCustomMaterialQtys((prev) => ({ ...prev, [itemKey]: Math.max(0, val) }));
  };

  const handleMaterialPriceChange = (itemKey: string, val: number) => {
    setCustomMaterialPrices((prev) => ({ ...prev, [itemKey]: Math.max(0, val) }));
  };

  const handleLaborQtyChange = (tareaKey: string, val: number) => {
    setCustomLaborQtys((prev) => ({ ...prev, [tareaKey]: Math.max(0, val) }));
  };

  const handleLaborPriceChange = (tareaKey: string, val: number) => {
    setCustomLaborPrices((prev) => ({ ...prev, [tareaKey]: Math.max(0, val) }));
  };

  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Web Price Search via Gemini API
  const fetchWebPrices = async () => {
    setIsSearchingPrices(true);
    setStatusMsg(null);
    try {
      const customApiKey =
        typeof window !== 'undefined' ? localStorage.getItem('electroplan_custom_api_key') : null;
      const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) reqHeaders['x-gemini-api-key'] = customApiKey;

      const response = await fetch('/api/gemini/search-prices', {
        method: 'POST',
        headers: reqHeaders,
      });
      const data = await response.json();

      if (data) {
        const updatedPrices: Record<string, number> = {};
        if (data.cable15 && baseMaterials[0]) updatedPrices[baseMaterials[0].item] = data.cable15;
        if (data.cable25 && baseMaterials[1]) updatedPrices[baseMaterials[1].item] = data.cable25;
        if (data.cable40 && baseMaterials[2]) updatedPrices[baseMaterials[2].item] = data.cable40;
        if (data.cable60 && baseMaterials[3]) updatedPrices[baseMaterials[3].item] = data.cable60;
        if (data.jabalina && baseMaterials[11]) updatedPrices[baseMaterials[11].item] = data.jabalina;
        if (data.diferencial && baseMaterials[15]) updatedPrices[baseMaterials[15].item] = data.diferencial;
        if (data.cano20 && baseMaterials[4]) updatedPrices[baseMaterials[4].item] = data.cano20;

        setCustomMaterialPrices((prev) => ({ ...prev, ...updatedPrices }));
        setStatusMsg({ text: '¡Precios actualizados exitosamente con valores de referencia de Argentina!', type: 'success' });
      }
    } catch (err: any) {
      console.error('Error fetching web prices:', err);
      setStatusMsg({ text: 'No se pudieron obtener precios automáticos. Se conservan los valores locales editables.', type: 'error' });
    } finally {
      setIsSearchingPrices(false);
    }
  };

  // Export JSON Feature
  const handleDownloadJSON = () => {
    const totalMat = materials.reduce((sum, m) => sum + m.commQty * m.unitPrice, 0);
    const totalLab = labor.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
    const gTotal = totalMat + totalLab;

    const exportData = {
      appName: 'ElectroPlan AR',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      params,
      floors,
      circuits,
      materials,
      labor,
      totals: {
        materials: totalMat,
        labor: totalLab,
        grandTotal: gTotal,
      },
    };

    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    const fileName = `Proyecto_Electrico_${(params.ownerName || 'Vivienda').replace(
      /\s+/g,
      '_'
    )}_${new Date().toISOString().slice(0, 10)}.json`;
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setStatusMsg({ text: 'Copia de respaldo JSON descargada correctamente.', type: 'success' });
  };

  // Import JSON Feature
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.params && parsed.floors) {
          if (onImportProject) {
            onImportProject(parsed.params, parsed.floors);
          }

          if (parsed.materials && Array.isArray(parsed.materials)) {
            const importedQtys: Record<string, number> = {};
            const importedPrices: Record<string, number> = {};
            parsed.materials.forEach((m: MaterialItem) => {
              if (m.item) {
                importedQtys[m.item] = m.commQty;
                importedPrices[m.item] = m.unitPrice;
              }
            });
            setCustomMaterialQtys(importedQtys);
            setCustomMaterialPrices(importedPrices);
          }

          if (parsed.labor && Array.isArray(parsed.labor)) {
            const importedQtys: Record<string, number> = {};
            const importedPrices: Record<string, number> = {};
            parsed.labor.forEach((l: LaborItem) => {
              if (l.tarea) {
                importedQtys[l.tarea] = l.qty;
                importedPrices[l.tarea] = l.unitPrice;
              }
            });
            setCustomLaborQtys(importedQtys);
            setCustomLaborPrices(importedPrices);
          }

          setStatusMsg({ text: '¡Proyecto y parámetros cargados exitosamente desde el archivo JSON!', type: 'success' });
        } else {
          setStatusMsg({ text: 'El archivo JSON no tiene una estructura de proyecto válida.', type: 'error' });
        }
      } catch (err: any) {
        setStatusMsg({ text: `Error al leer el archivo JSON: ${err.message}`, type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  // Calculations
  const totalMaterials = materials.reduce((sum, m) => sum + m.commQty * m.unitPrice, 0);
  const totalLabor = labor.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const grandTotal = totalMaterials + totalLabor;

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div
          className={`p-3 rounded-lg border text-xs font-bold flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-xs underline ml-2 opacity-80 hover:opacity-100"
          >
            Cerrar
          </button>
        </div>
      )}

      {grandTotal === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 font-medium flex items-center gap-2.5">
          <Info className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>Proyecto en Blanco ($0):</strong> El cómputo y presupuesto se encuentran actualmente en cero. Cargá bocas en la <strong>Pestaña 2</strong> o analizá un plano en la <strong>Pestaña 1</strong> para computar automáticamente los materiales y la mano de obra.
          </span>
        </div>
      )}

      {/* Header Control Card */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-[#0f2b48] flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-700" />
              Cómputo Comercial de Materiales y Baremo de Mano de Obra
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Normas IRAM · Tarifario Oficial Electro Instalador Córdoba (IVA 21% Incluido) · Precios
              editables
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleResetToZero}
              title="Fijar todas las cantidades de materiales y mano de obra a 0"
              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-800 font-semibold text-xs rounded-lg border border-red-300 flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-700" />
              Poner a $0
            </button>

            <button
              onClick={handleRecalculateDefault}
              title="Restablecer cantidades y precios de materiales/mano de obra a valores base según bocas del proyecto"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-700" />
              Recalcular Cómputo Base
            </button>

            <button
              onClick={handleDownloadJSON}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar JSON
            </button>

            <label className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs rounded-lg flex items-center gap-2 transition-colors">
              <FileUp className="w-4 h-4 text-purple-700" />
              Cargar JSON
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportJSON}
              />
            </label>

            <button
              onClick={fetchWebPrices}
              disabled={isSearchingPrices}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg border border-slate-300 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Search className="w-4 h-4 text-blue-700" />
              {isSearchingPrices ? 'Buscando Precios Web...' : 'Buscar Precios Web (IA)'}
            </button>
          </div>
        </div>
      </div>

      {/* Materials Table Section */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-800" />
            A) Listado Comercial de Materiales Homologados (Normas IRAM)
          </h3>
          <span className="text-xs font-mono font-bold text-blue-900">
            Subtotal: $ {totalMaterials.toLocaleString('es-AR')}.-
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-300 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-200 border-b-2 border-[#0f2b48] text-slate-900 font-bold">
                <th className="p-2.5">Material / Norma IRAM</th>
                <th className="p-2.5">Descripción Aplicación</th>
                <th className="p-2.5">Unidad</th>
                <th className="p-2.5">Cantidad</th>
                <th className="p-2.5">Precio Unit. ($)</th>
                <th className="p-2.5 text-right">Subtotal ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {materials.map((mat, idx) => {
                const sub = mat.commQty * mat.unitPrice;
                return (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-2.5 font-bold text-slate-900">
                      {mat.item}
                      <span className="block text-[10px] text-slate-600 font-normal">
                        Norma: {mat.norm}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-800">{mat.desc}</td>
                    <td className="p-2.5 text-slate-600 font-medium">{mat.commUnit}</td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="0"
                        value={mat.commQty}
                        onChange={(e) =>
                          handleMaterialQtyChange(mat.item, parseInt(e.target.value) || 0)
                        }
                        className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="0"
                        value={mat.unitPrice}
                        onChange={(e) =>
                          handleMaterialPriceChange(mat.item, parseFloat(e.target.value) || 0)
                        }
                        className="w-28 px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600"
                      />
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      $ {sub.toLocaleString('es-AR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Labor Table Section */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-700" />
            B) Baremo Mano de Obra (Electro Instalador Córdoba con IVA)
          </h3>
          <span className="text-xs font-mono font-bold text-emerald-800">
            Subtotal: $ {totalLabor.toLocaleString('es-AR')}.-
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-300 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-200 border-b-2 border-[#0f2b48] text-slate-900 font-bold">
                <th className="p-2.5">Tarea / Servicio Especializado</th>
                <th className="p-2.5">Unidad</th>
                <th className="p-2.5">Cantidad</th>
                <th className="p-2.5">Precio Unit. c/IVA ($)</th>
                <th className="p-2.5 text-right">Subtotal ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {labor.map((lab, idx) => {
                const sub = lab.qty * lab.unitPrice;
                return (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-2.5 font-bold text-slate-900">{lab.tarea}</td>
                    <td className="p-2.5 text-slate-600">{lab.unidad}</td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="0"
                        value={lab.qty}
                        onChange={(e) => handleLaborQtyChange(lab.tarea, parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min="0"
                        value={lab.unitPrice}
                        onChange={(e) =>
                          handleLaborPriceChange(lab.tarea, parseFloat(e.target.value) || 0)
                        }
                        className="w-28 px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600"
                      />
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      $ {sub.toLocaleString('es-AR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total Summary Card */}
      <div className="bg-emerald-50 border-2 border-emerald-600/40 rounded-xl p-6 shadow-sm text-right space-y-1">
        <span className="text-xs text-emerald-900 uppercase tracking-widest font-extrabold block">
          PRESUPUESTO GENERAL ESTIMADO DEL PROYECTO
        </span>
        <div className="text-3xl font-black text-emerald-900 font-mono">
          $ {grandTotal.toLocaleString('es-AR')}.- ARS
        </div>
        <p className="text-xs text-slate-700 font-medium">
          Incluye cómputo total de materiales IRAM y mano de obra homologada con IVA (21%).
        </p>
      </div>
    </div>
  );
}
