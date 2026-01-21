
import React from 'react';
import { TVSchedule } from './TVSchedule';
import { AvailabilityBoard } from './AvailabilityBoard';
import { Monitor, Calendar, Activity } from 'lucide-react';

export const TVSplitView: React.FC<{ onWake?: () => void }> = ({ onWake }) => {
  return (
    <div 
      className="fixed inset-0 z-[300] bg-slate-900 flex flex-col overflow-hidden animate-fadeIn"
      onClick={onWake}
      onTouchStart={onWake}
      onMouseMove={onWake}
      onKeyDown={onWake}
    >
      {/* HEADER UNIFICADO */}
      <div className="flex justify-between items-center bg-slate-800 border-b-4 border-[#007e7a] px-6 py-2 shadow-xl shrink-0 h-16 z-50">
          <div className="flex items-center gap-4">
              <div className="bg-white p-1 rounded w-10 h-10 flex items-center justify-center shadow border border-gray-400">
                  <h1 className="font-black tracking-tighter" style={{ color: '#007e7a', fontSize: '1.2rem', lineHeight: '1' }}>VALE</h1>
              </div>
              <div>
                  <h1 className="font-black text-white text-xl tracking-widest uppercase mb-0 drop-shadow-md leading-none">SAFEMAINT MONITOR</h1>
                  <p className="text-[#10b981] font-bold text-[10px] tracking-[0.2em] animate-pulse">
                      MODO DE ESPERA ATIVO
                  </p>
              </div>
          </div>
          <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-4 py-1 bg-black/30 rounded border border-slate-700">
                  <Activity size={16} className="text-[#007e7a]" />
                  <span className="text-xs font-black text-slate-300">INDICADORES</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-1 bg-black/30 rounded border border-slate-700">
                  <Calendar size={16} className="text-[#007e7a]" />
                  <span className="text-xs font-black text-slate-300">AGENDA</span>
              </div>
          </div>
      </div>

      {/* SPLIT CONTENT */}
      <div className="flex-1 flex overflow-hidden">
          {/* ESQUERDA: INDICADORES */}
          <div className="w-1/2 border-r-4 border-slate-800 relative">
              <AvailabilityBoard variant="SPLIT" />
          </div>

          {/* DIREITA: AGENDA */}
          <div className="w-1/2 relative bg-slate-900">
              <TVSchedule variant="SPLIT" />
          </div>
      </div>
      
      {/* RODAPÉ INFORMATIVO */}
      <div className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase py-1 text-center border-t border-slate-800">
          TOQUE NA TELA OU MOVA O MOUSE PARA RETORNAR AO SISTEMA
      </div>
    </div>
  );
};
