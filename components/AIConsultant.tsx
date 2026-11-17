'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  BookOpen, 
  Zap, 
  ShieldCheck,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { safeFetchJson } from '@/lib/safe-json';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export default function AIConsultant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Get custom API key if exists
    const customApiKey = typeof window !== 'undefined' ? localStorage.getItem('electroplan_custom_api_key') : null;

    try {
      const result = await safeFetchJson('/api/gemini/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history,
          customApiKey,
        }),
      });

      if (!result.ok || result.error || !result.data?.history) {
        throw new Error(result.error || 'No se pudo obtener respuesta válida del asistente.');
      }

      setHistory(result.data.history);
    } catch (error: any) {
      console.warn('Error al consultar IA:', error?.message || error);
      setHistory(prev => [
        ...prev,
        { role: 'user', parts: [{ text: userMessage }] },
        { role: 'model', parts: [{ text: `❌ Error: ${error?.message || 'No se pudo conectar con el asistente.'}` }] }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "¿Cuántos circuitos necesito para 120 m2?",
    "Sección mínima de cable para TUG",
    "¿Cómo calculo la DPMS según AEA 770?",
    "Requisitos de EPEC para pilar ET21"
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#0f2b48] hover:bg-slate-800 text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform hover:scale-110 active:scale-95 no-print"
      >
        <div className="relative">
          <MessageSquare className="w-6 h-6" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-[#0f2b48]" />
        </div>
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-full max-w-[400px] bg-white border border-slate-300 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden no-print"
            style={{ height: 'calc(100vh - 120px)', maxHeight: '600px' }}
          >
            {/* Header */}
            <div className="bg-[#0f2b48] p-4 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900 shadow-sm">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight flex items-center gap-1.5">
                    Asistente Técnico IA
                    <Sparkles className="w-3 h-3 text-amber-300 fill-current" />
                  </h3>
                  <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">
                    Experto en AEA 770 / Ley 10281
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
            >
              {history.length === 0 && (
                <div className="space-y-4 py-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center space-y-2">
                    <BookOpen className="w-8 h-8 text-blue-600 mx-auto" />
                    <p className="text-xs text-slate-700 font-medium">
                      ¡Hola! Soy tu asistente técnico. Puedo ayudarte con dudas sobre la **AEA 770**, la **Ley 10281** o requisitos de **ERSeP**.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase px-1">Consultas Sugeridas:</span>
                    <div className="grid grid-cols-1 gap-2">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInput(s);
                            // Optional: auto-send if desired
                          }}
                          className="text-left px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 hover:border-blue-500 hover:bg-blue-50 transition-all font-medium"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {history.map((msg, i) => (
                <div 
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                      msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-[#0f2b48] text-white rounded-tr-none' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                    }`}>
                      <div className="whitespace-pre-wrap">
                        {msg.parts[0].text}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                    <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribí tu consulta técnica..."
                  className="flex-1 bg-slate-100 border border-slate-300 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 bg-[#0f2b48] hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl flex items-center justify-center transition-colors shadow-md"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <p className="text-[9px] text-center text-slate-400 mt-2 font-medium">
                ElectroPlan AR IA puede cometer errores. Verificá siempre con la normativa física.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
