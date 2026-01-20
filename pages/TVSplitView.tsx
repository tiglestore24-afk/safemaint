
import React, { useState, useEffect } from 'react';
import { TVSchedule } from './TVSchedule';
import { StorageService, NotificationItem } from '../services/storage';
import { Calendar, Bell, AlertTriangle, Info, Activity } from 'lucide-react';

export const TVSplitView: React.FC<{ onWake?: () => void }> = ({ onWake }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
      const load = () => {
          const notifs = StorageService.getNotifications();
          setNotifications(notifs.slice(0, 15)); // Show last 15
      };
      load();
      window.addEventListener('safemaint_storage_update', load);
      return () => window.removeEventListener('safemaint_storage_update', load);
  }, []);

  const getNotifIcon = (type: string) => {
      switch(type) {
          case 'URGENT': return <AlertTriangle size={24} className="text-red-500" />;
          case 'ACTIVE': return <Activity size={24} className="text-blue-500" />;
          default: return <Info size={24} className="text-gray-500" />;
      }
  };

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
                  <Bell size={16} className="text-[#007e7a]" />
                  <span className="text-xs font-black text-slate-300">ALERTAS</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-1 bg-black/30 rounded border border-slate-700">
                  <Calendar size={16} className="text-[#007e7a]" />
                  <span className="text-xs font-black text-slate-300">AGENDA</span>
              </div>
          </div>
      </div>

      {/* SPLIT CONTENT */}
      <div className="flex-1 flex overflow-hidden">
          {/* ESQUERDA: ALERTAS */}
          <div className="w-1/3 border-r-4 border-slate-800 relative bg-slate-900 flex flex-col">
              <div className="p-4 bg-slate-800 border-b border-slate-700">
                  <h2 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">
                      <Bell size={18} className="text-red-500" /> Últimos Alertas
                  </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {notifications.length === 0 ? (
                      <div className="text-center text-slate-600 mt-20">
                          <Info size={48} className="mx-auto mb-2 opacity-20"/>
                          <p className="text-xs font-bold uppercase">Sem alertas recentes</p>
                      </div>
                  ) : (
                      notifications.map(n => (
                          <div key={n.id} className="bg-slate-800 p-4 rounded-xl border-l-4 border-slate-600 hover:bg-slate-700 transition-colors">
                              <div className="flex items-start gap-3">
                                  <div className="mt-1">{getNotifIcon(n.type)}</div>
                                  <div>
                                      <h4 className="text-slate-200 font-black text-xs uppercase">{n.title}</h4>
                                      <p className="text-slate-400 text-[10px] font-bold uppercase mt-1 leading-relaxed">{n.message}</p>
                                      <span className="text-slate-600 text-[9px] font-mono mt-2 block">{n.date}</span>
                                  </div>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>

          {/* DIREITA: AGENDA */}
          <div className="w-2/3 relative bg-slate-900 border-l border-slate-800">
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
