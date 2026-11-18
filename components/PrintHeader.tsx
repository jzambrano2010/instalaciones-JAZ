'use client';

import React from 'react';
import { Printer } from 'lucide-react';

interface PrintHeaderProps {
  title: string;
  tabId: string;
  onPrintTab: (tabId: string) => void;
  children?: React.ReactNode;
}

export default function PrintHeader({ title, tabId, onPrintTab, children }: PrintHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 border-2 border-[#0f2b48] rounded-xl px-5 py-3 shadow-sm no-print text-slate-900">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#0f2b48]">{title}</h3>
        {children}
      </div>
      <button
        onClick={() => onPrintTab(tabId)}
        className="px-3.5 py-1.5 bg-[#0f2b48] hover:bg-blue-900 text-white font-semibold text-xs rounded-lg flex items-center gap-2 transition-colors shadow-sm"
      >
        <Printer className="w-4 h-4 text-amber-400" />
        Imprimir Pestaña (A4)
      </button>
    </div>
  );
}
