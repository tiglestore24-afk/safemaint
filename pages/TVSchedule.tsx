
import React, { useEffect, useState, useRef } from 'react';
import { StorageService } from '../services/storage';
import { ActiveMaintenance, ScheduleItem } from '../types';
import { Clock, Wifi } from 'lucide-react';
import { supabase } from '../services/supabase';

interface TVItem {
    id: string;
    om: string;
    tag: string;
    description: string;
    status: 'EMERGÊNCIA' | 'ANDAMENTO' | 'PLANEJADO' | 'PAUSADA';
    startTime: string; 
    endTime: string;   
    responsible: string;
    type: string; 
}

export const TVSchedule: React.FC = () => {
  const [items, setItems] = useState<TVItem[]>([]);
  const [now, setNow] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshData();

    // Assinatura em Tempo Real para TV Live
    const tvChannel = supabase
      .channel('tv-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_maintenance' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule' }, () => refreshData())
      .subscribe();

    // Relógio
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    
    window.addEventListener('safemaint_storage_update', refreshData);

    return () => { 
        clearInterval(clockInterval); 
        supabase.removeChannel(tvChannel);
        window.removeEventListener('safemaint_storage_update', refreshData);
    };
  }, []);

  // Lógica de Auto-Scroll para TV
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let scrollAmount = 0;
    const speed = 1; 
    let direction = 1;
    let pauseCounter = 0;

    const scrollInterval = setInterval(() => {
        if (!scrollContainer) return;
        if (scrollContainer.scrollHeight <= scrollContainer.clientHeight) return;

        if (pauseCounter > 0) {
            pauseCounter--;
            return;
        }

        scrollAmount += speed * direction;
        scrollContainer.scrollTop = scrollAmount;

        if (scrollAmount >= (scrollContainer.scrollHeight - scrollContainer.clientHeight)) {
            direction = -1; 
            pauseCounter = 100; 
        } 
        else if (scrollAmount <= 0) {
            direction = 1;
            pauseCounter = 100;
        }
    }, 20);

    return () => clearInterval(scrollInterval);
  }, [items]);

  const refreshData = async () => {
    const activeTasks = await StorageService.getActiveMaintenances();
    const schedule = await StorageService.getSchedule();
    const tvItems: TVItem[] = [];

    activeTasks.forEach(task => {
        let status: 'EMERGÊNCIA' | 'ANDAMENTO' | 'PAUSADA' = 'ANDAMENTO';
        if (task.origin === 'CORRETIVA' || task.artType === 'ART_EMERGENCIAL') status = 'EMERGÊNCIA';
        else if (task.status === 'PAUSADA') status = 'PAUSADA';

        tvItems.push({
            id: task.id,
            om: task.header.om,
            tag: task.header.tag,
            description: task.header.description,
            status: status,
            startTime: new Date(task.startTime).toLocaleTimeString().slice(0,5),
            endTime: 'EXEC',
            responsible: 'EQUIPE CAMPO',
            type: task.header.type
        });
    });

    schedule.forEach(item => {
        let om = item.frotaOm;
        let tag = item.frotaOm;
        if (item.frotaOm.includes('\n')) {
            const parts = item.frotaOm.split('\n'); tag = parts[0].trim(); if(parts.length > 1) om = parts[1].trim();
        } else if (item.frotaOm.includes('/')) {
            const parts = item.frotaOm.split('/'); tag = parts[0].trim(); om = parts.length > 1 ? parts[1].trim() : parts[0].trim();
        }

        const isAlreadyActive = activeTasks.some(t => t.header.om === om);
        if (!isAlreadyActive) {
            tvItems.push({
                id: item.id, om, tag, description: item.description, status: 'PLANEJADO',
                startTime: item.timeStart, endTime: item.timeEnd, responsible: item.resources, type: item.resources2 || 'GERAL'
            });
        }
    });

    tvItems.sort((a, b) => {
        const score = (s: string) => s === 'EMERGÊNCIA' ? 0 : s === 'ANDAMENTO' ? 1 : s === 'PAUSADA' ? 2 : 3;
        return score(a.status) - score(b.status);
    });
    setItems(tvItems);
  };

  return (
    <div className="bg-gray-950 h-screen w-screen overflow-hidden flex flex-col font-sans text-white select-none cursor-none">
        {/* Header Gigante */}
        <div className="flex justify-between items-center bg-gray-900 border-b-4 border-[#10b981] px-8 py-4 shadow-2xl shrink-0 h-32 z-20">
            <div className="flex items-center gap-6">
                <div className="bg-white p-2 rounded-lg w-20 h-20 flex items-center justify-center shadow-lg border border-gray-700">
                    <h1 className="font-black tracking-tighter" style={{ color: '#007e7a', fontSize: '3rem', lineHeight: '1' }}>VALE</h1>
                </div>
                <div>
                    <h1 className="font-black text-white text-5xl tracking-widest uppercase mb-1 drop-shadow-md">SAFEMAINT TV</h1>
                    <p className="text-[#10b981] font-bold text-xl tracking-[0.3em] flex items-center gap-3 uppercase">
                        Monitoramento em Tempo Real <Wifi size={24} className="animate-pulse" />
                    </p>
                </div>
            </div>
            
            <div className="flex items-center gap-12">
                 <div className="flex gap-4">
                     <div className="flex flex-col items-center bg-red-900/30 px-6 py-2 rounded border border-red-700">
                        <span className="text-4xl font-black text-red-500">{items.filter(i => i.status === 'EMERGÊNCIA').length}</span>
                        <span className="text-[10px] font-black text-red-400 uppercase">EMERGÊNCIA</span>
                     </div>
                     <div className="flex flex-col items-center bg-green-900/30 px-6 py-2 rounded border border-green-700">
                        <span className="text-4xl font-black text-green-500">{items.filter(i => i.status === 'ANDAMENTO').length}</span>
                        <span className="text-[10px] font-black text-green-400 uppercase">EM EXECUÇÃO</span>
                     </div>
                     <div className="flex flex-col items-center bg-gray-800/50 px-6 py-2 rounded border border-gray-600">
                        <span className="text-4xl font-black text-gray-400">{items.filter(i => i.status === 'PLANEJADO').length}</span>
                        <span className="text-[10px] font-black text-gray-500 uppercase">PLANEJADO</span>
                     </div>
                </div>
                <div className="text-right leading-none border-l border-gray-700 pl-8">
                    <span className="font-mono font-black text-6xl block text-white drop-shadow-lg">{now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span className="text-xl font-bold text-[#10b981] uppercase block mt-1">{now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
            </div>
        </div>

        {/* Tabela Gigante */}
        <div className="flex-1 overflow-hidden bg-gray-950 relative">
            <div className="grid grid-cols-12 gap-0 bg-gray-900 text-gray-400 text-xl font-black py-4 border-b border-gray-700 shadow-md sticky top-0 z-10 uppercase tracking-wider">
                <div className="col-span-2 text-center">STATUS</div>
                <div className="col-span-1 text-center">INÍCIO</div>
                <div className="col-span-2 pl-4">TAG / OM</div>
                <div className="col-span-4">DESCRIÇÃO DA ATIVIDADE</div>
                <div className="col-span-2 text-center">TIPO</div>
                <div className="col-span-1 text-right pr-8">EXEC.</div>
            </div>

            <div ref={scrollRef} className="absolute inset-0 top-[60px] overflow-y-auto no-scrollbar">
                {items.length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                        <Clock size={120} className="mb-8" />
                        <span className="text-5xl font-black uppercase">Aguardando dados da programação</span>
                     </div>
                )}
                
                {items.map((item, idx) => {
                    let rowClass = "bg-gray-900 border-b border-gray-800 text-gray-300";
                    let statusBadge = "bg-gray-700 text-gray-300";
                    let tagColor = "text-gray-100";
                    let descColor = "text-gray-400";

                    if (idx % 2 === 1) rowClass = "bg-[#1f2937]/50 border-b border-gray-800 text-gray-300";

                    if (item.status === 'EMERGÊNCIA') {
                        rowClass = "bg-red-900/20 border-b border-red-900/50 text-white animate-pulse-slow";
                        statusBadge = "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]";
                        tagColor = "text-red-200";
                        descColor = "text-white";
                    } else if (item.status === 'ANDAMENTO') {
                        rowClass = "bg-green-900/10 border-b border-green-900/30 text-green-50";
                        statusBadge = "bg-green-600 text-white shadow-[0_0_10px_rgba(22,163,74,0.4)]";
                        tagColor = "text-green-200";
                        descColor = "text-green-100";
                    } else if (item.status === 'PAUSADA') {
                         rowClass = "bg-yellow-900/10 border-b border-yellow-900/30 text-yellow-50";
                         statusBadge = "bg-yellow-600 text-white";
                         tagColor = "text-yellow-200";
                    }

                    return (
                        <div key={item.id} className={`grid grid-cols-12 gap-0 items-center py-5 ${rowClass} transition-all`}>
                            <div className="col-span-2 text-center flex justify-center">
                                <span className={`px-6 py-2 rounded-md text-2xl font-black uppercase tracking-widest w-[80%] ${statusBadge}`}>
                                    {item.status}
                                </span>
                            </div>
                            <div className="col-span-1 text-center font-mono font-bold text-3xl opacity-90 text-white shadow-black drop-shadow-sm">
                                {item.startTime}
                            </div>
                            <div className="col-span-2 pl-4 leading-tight">
                                <div className={`font-black text-3xl uppercase ${tagColor}`}>{item.tag}</div>
                                <div className="text-lg opacity-60 font-mono mt-1 uppercase">{item.om}</div>
                            </div>
                            <div className={`col-span-4 text-2xl font-bold uppercase truncate pr-4 ${descColor}`}>
                                {item.description}
                            </div>
                            <div className="col-span-2 text-center text-xl font-bold opacity-70 border-2 border-gray-700 rounded mx-4 py-1 uppercase">
                                {item.type}
                            </div>
                            <div className="col-span-1 text-right pr-8 font-bold text-xl truncate opacity-70 uppercase">
                                {item.responsible}
                            </div>
                        </div>
                    );
                })}
                <div className="h-40"></div>
            </div>
        </div>
        
        <div className="bg-[#10b981] h-2 w-full shadow-[0_-4px_20px_rgba(16,185,129,0.5)]"></div>
        
        <style>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          @keyframes pulse-slow {
            0%, 100% { background-color: rgba(127, 29, 29, 0.2); }
            50% { background-color: rgba(127, 29, 29, 0.4); }
          }
          .animate-pulse-slow {
            animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}</style>
    </div>
  );
};
