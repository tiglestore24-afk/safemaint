
import React, { useEffect, useState, useRef } from 'react';
import { StorageService } from '../services/storage';
import { ActiveMaintenance, ScheduleItem } from '../types';
import { Clock } from 'lucide-react';

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
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    const dataInterval = setInterval(refreshData, 5000);
    window.addEventListener('safemaint_storage_update', refreshData);
    refreshData();

    return () => { 
        clearInterval(clockInterval); 
        clearInterval(dataInterval);
        window.removeEventListener('safemaint_storage_update', refreshData);
    };
  }, []);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let scrollAmount = 0;
    const speed = 0.5; // Velocidade lenta constante
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
            pauseCounter = 200; // Pausa no final
        } else if (scrollAmount <= 0) {
            direction = 1;
            pauseCounter = 200; // Pausa no topo
        }
    }, 30);

    return () => clearInterval(scrollInterval);
  }, [items]);

  const refreshData = () => {
    const activeTasks = StorageService.getActiveMaintenances();
    const schedule = StorageService.getSchedule();
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
            responsible: 'MANUTENÇÃO',
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
    <div className="bg-gray-950 h-screen w-full overflow-hidden flex flex-col font-sans text-white select-none cursor-none">
        <div className="flex justify-between items-center bg-gray-900 border-b border-[#10b981] px-4 py-1 shadow-2xl shrink-0 h-12 z-20 w-full">
            <div className="flex items-center gap-3">
                <div className="bg-white p-0.5 rounded w-8 h-8 flex items-center justify-center shadow border border-gray-700">
                    <h1 className="font-black tracking-tighter" style={{ color: '#007e7a', fontSize: '1rem', lineHeight: '1' }}>VALE</h1>
                </div>
                <div>
                    <h1 className="font-black text-white text-lg tracking-widest uppercase mb-0 drop-shadow-md leading-none">SAFEMAINT TV</h1>
                    <p className="text-[#10b981] font-bold text-[8px] tracking-[0.3em]">MONITORAMENTO EM TEMPO REAL</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                 <div className="flex gap-2">
                     <div className="flex flex-col items-center bg-red-900/30 px-2 py-0.5 rounded border border-red-700 min-w-[50px]">
                        <span className="text-xs font-black text-red-500 leading-none">{items.filter(i => i.status === 'EMERGÊNCIA').length}</span>
                        <span className="text-[7px] font-bold text-red-400">EMERG.</span>
                     </div>
                     <div className="flex flex-col items-center bg-green-900/30 px-2 py-0.5 rounded border border-green-700 min-w-[50px]">
                        <span className="text-xs font-black text-green-500 leading-none">{items.filter(i => i.status === 'ANDAMENTO').length}</span>
                        <span className="text-[7px] font-bold text-green-400">ANDAM.</span>
                     </div>
                     <div className="flex flex-col items-center bg-gray-800/50 px-2 py-0.5 rounded border border-gray-600 min-w-[50px]">
                        <span className="text-xs font-black text-gray-400 leading-none">{items.filter(i => i.status === 'PLANEJADO').length}</span>
                        <span className="text-[7px] font-bold text-gray-500">PLAN.</span>
                     </div>
                </div>
                <div className="text-right leading-none border-l border-gray-700 pl-3">
                    <span className="font-mono font-black text-xl block text-white drop-shadow-lg">{now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span className="text-[8px] font-bold text-[#10b981] uppercase block mt-0.5">{now.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                </div>
            </div>
        </div>

        {/* CONTAINER PRINCIPAL: w-full e overflow-x-hidden para garantir que não haja rolagem horizontal */}
        <div className="flex-1 overflow-hidden bg-gray-950 relative w-full max-w-full">
            <div className="w-full h-full relative bg-gray-900/20 shadow-2xl flex flex-col">
                <div className="grid grid-cols-12 gap-0 bg-gray-900 text-gray-400 text-[9px] font-black py-1 border-b border-gray-700 shadow-md z-10 uppercase tracking-wider w-full shrink-0">
                    <div className="col-span-2 text-center">STATUS</div>
                    <div className="col-span-1 text-center">INÍCIO</div>
                    <div className="col-span-2 pl-2">TAG / OM</div>
                    <div className="col-span-4">DESCRIÇÃO DA ATIVIDADE</div>
                    <div className="col-span-2 text-center">TIPO</div>
                    <div className="col-span-1 text-right pr-2">EXEC.</div>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar w-full">
                    {items.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                            <Clock size={60} className="mb-4" />
                            <span className="text-xl font-black">AGUARDANDO PROGRAMAÇÃO</span>
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
                            <div key={item.id} className={`grid grid-cols-12 gap-0 items-center py-0.5 min-h-[28px] w-full ${rowClass} transition-all`}>
                                <div className="col-span-2 text-center flex justify-center">
                                    <span className={`px-1 py-0.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest w-[90%] ${statusBadge}`}>
                                        {item.status}
                                    </span>
                                </div>
                                <div className="col-span-1 text-center font-mono font-bold text-[9px] opacity-90 text-white shadow-black drop-shadow-sm">
                                    {item.startTime}
                                </div>
                                <div className="col-span-2 pl-2 leading-none overflow-hidden">
                                    <div className={`font-black text-[9px] ${tagColor} truncate`}>{item.tag}</div>
                                    <div className="text-[7px] opacity-60 font-mono truncate">{item.om}</div>
                                </div>
                                <div className={`col-span-4 text-[8px] font-bold uppercase pr-2 leading-tight break-words whitespace-normal ${descColor}`}>
                                    {item.description}
                                </div>
                                <div className="col-span-2 text-center text-[8px] font-bold opacity-70 border border-gray-700 rounded mx-4 py-0.5 truncate">
                                    {item.type}
                                </div>
                                <div className="col-span-1 text-right pr-2 font-bold text-[8px] truncate opacity-70">
                                    {item.responsible}
                                </div>
                            </div>
                        );
                    })}
                    <div className="h-10"></div>
                </div>
            </div>
        </div>
        
        <div className="bg-[#10b981] h-1 w-full shadow-[0_-4px_20px_rgba(16,185,129,0.5)]"></div>
        
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
