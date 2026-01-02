
import React, { useEffect, useState, useRef } from 'react';
import { StorageService } from '../services/storage';
import { Clock } from 'lucide-react';

interface TVItem {
    id: string;
    frotaOm: string;
    description: string;
    dateMin: string;
    dateMax: string;
    priority: string;
    peopleCount: string | number;
    hours: string | number;
    dateStart: string;
    dateEnd: string;
    workCenter: string;
    timeStart: string;
    timeEnd: string;
    resources: string;
    resources2: string; // 22
    statusColor: 'EMERGENCY' | 'RUNNING' | 'PLANNED' | 'PAUSED';
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
    const todayStr = new Date().toLocaleDateString('pt-BR');

    // 1. CARDS EM EXECUÇÃO (Prioridade Máxima)
    activeTasks.forEach(task => {
        let statusColor: 'EMERGENCY' | 'RUNNING' | 'PAUSED' = 'RUNNING';
        if (task.origin === 'CORRETIVA' || task.artType === 'ART_EMERGENCIAL') statusColor = 'EMERGENCY';
        else if (task.status === 'PAUSADA') statusColor = 'PAUSED';

        const startDate = new Date(task.startTime);
        
        tvItems.push({
            id: task.id,
            frotaOm: `${task.header.tag} / ${task.header.om}`,
            description: task.header.description,
            dateMin: startDate.toLocaleDateString(),
            dateMax: startDate.toLocaleDateString(),
            priority: task.origin,
            peopleCount: 1,
            hours: "EXEC",
            dateStart: startDate.toLocaleDateString(),
            dateEnd: "---",
            workCenter: "MANUTENÇÃO",
            timeStart: startDate.toLocaleTimeString().slice(0,5),
            timeEnd: "---",
            resources: task.openedBy || "EQUIPE",
            resources2: task.header.type,
            statusColor: statusColor
        });
    });

    // 2. PROGRAMAÇÃO DO DIA (Filtrado estritamente pela Coluna 8 = dateStart)
    // O usuário especificou que a Coluna 8 (dateStart) é a referência para "Manutenção do Dia"
    const todaysSchedule = schedule.filter(item => item.dateStart === todayStr);

    todaysSchedule.forEach(item => {
        let om = item.frotaOm;
        if (item.frotaOm.includes('\n')) {
            om = item.frotaOm.replace('\n', ' / ');
        }

        // Avoid duplicates if already in active list (simple check by description or Tag)
        // If needed, can be refined. For now, showing both helps tracking planned vs actual.

        tvItems.push({
            id: item.id,
            frotaOm: om,
            description: item.description,
            dateMin: item.dateMin,
            dateMax: item.dateMax,
            priority: item.priority,
            peopleCount: item.peopleCount,
            hours: item.hours,
            dateStart: item.dateStart,
            dateEnd: item.dateEnd,
            workCenter: item.workCenter,
            timeStart: item.timeStart,
            timeEnd: item.timeEnd,
            resources: item.resources,
            resources2: item.resources2,
            statusColor: 'PLANNED'
        });
    });

    // Sort: Emergency -> Running -> Paused -> Planned
    tvItems.sort((a, b) => {
        const score = (s: string) => s === 'EMERGENCY' ? 0 : s === 'RUNNING' ? 1 : s === 'PAUSED' ? 2 : 3;
        return score(a.statusColor) - score(b.statusColor);
    });
    setItems(tvItems);
  };

  // Define column widths - MUST sum to near 100% or use flex
  const colWidths = {
      om: '8%',
      desc: '20%',
      dMin: '6%',
      dMax: '6%',
      prio: '6%',
      people: '4%',
      h: '3%',
      dIni: '6%',
      dFim: '6%',
      center: '8%',
      hIni: '5%',
      hFim: '5%',
      res: '10%',
      res2: '7%'
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
                    <p className="text-[#10b981] font-bold text-[8px] tracking-[0.3em]">PROGRAMAÇÃO DO DIA ({now.toLocaleDateString()})</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                 <div className="flex gap-2">
                     <div className="flex flex-col items-center bg-red-900/30 px-2 py-0.5 rounded border border-red-700 min-w-[50px]">
                        <span className="text-xs font-black text-red-500 leading-none">{items.filter(i => i.statusColor === 'EMERGENCY').length}</span>
                        <span className="text-[7px] font-bold text-red-400">EMERG.</span>
                     </div>
                     <div className="flex flex-col items-center bg-green-900/30 px-2 py-0.5 rounded border border-green-700 min-w-[50px]">
                        <span className="text-xs font-black text-green-500 leading-none">{items.filter(i => i.statusColor === 'RUNNING').length}</span>
                        <span className="text-[7px] font-bold text-green-400">ANDAM.</span>
                     </div>
                     <div className="flex flex-col items-center bg-gray-800/50 px-2 py-0.5 rounded border border-gray-600 min-w-[50px]">
                        <span className="text-xs font-black text-gray-400 leading-none">{items.filter(i => i.statusColor === 'PLANNED').length}</span>
                        <span className="text-[7px] font-bold text-gray-500">PLAN.</span>
                     </div>
                </div>
                <div className="text-right leading-none border-l border-gray-700 pl-3">
                    <span className="font-mono font-black text-xl block text-white drop-shadow-lg">{now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span className="text-[8px] font-bold text-[#10b981] uppercase block mt-0.5">{now.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                </div>
            </div>
        </div>

        {/* CONTAINER PRINCIPAL */}
        <div className="flex-1 overflow-hidden bg-gray-950 relative w-full max-w-full">
            <div className="w-full h-full relative bg-gray-900/20 shadow-2xl flex flex-col">
                
                {/* HEADER ROW */}
                <div className="flex bg-gray-900 text-gray-400 text-[8px] md:text-[9px] font-black py-1 border-b border-gray-700 shadow-md z-10 uppercase tracking-wider w-full shrink-0">
                    <div style={{width: colWidths.om}} className="px-1 text-left border-r border-gray-800">FROTA/OM</div>
                    <div style={{width: colWidths.desc}} className="px-1 text-left border-r border-gray-800">DESCRIÇÃO DA ATIVIDADE</div>
                    <div style={{width: colWidths.dMin}} className="px-1 text-center border-r border-gray-800">DATA MIN</div>
                    <div style={{width: colWidths.dMax}} className="px-1 text-center border-r border-gray-800">DATA MAX</div>
                    <div style={{width: colWidths.prio}} className="px-1 text-center border-r border-gray-800">PRIORIDADE</div>
                    <div style={{width: colWidths.people}} className="px-1 text-center border-r border-gray-800">N PES.</div>
                    <div style={{width: colWidths.h}} className="px-1 text-center border-r border-gray-800">H</div>
                    <div style={{width: colWidths.dIni}} className="px-1 text-center border-r border-gray-800 bg-blue-900/20 text-[#10b981]">DATA INI</div>
                    <div style={{width: colWidths.dFim}} className="px-1 text-center border-r border-gray-800">DATA FIM</div>
                    <div style={{width: colWidths.center}} className="px-1 text-left border-r border-gray-800">CENTRO</div>
                    <div style={{width: colWidths.hIni}} className="px-1 text-center border-r border-gray-800">HR INI</div>
                    <div style={{width: colWidths.hFim}} className="px-1 text-center border-r border-gray-800">HR FIM</div>
                    <div style={{width: colWidths.res}} className="px-1 text-left border-r border-gray-800">RECURSOS</div>
                    <div style={{width: colWidths.res2}} className="px-1 text-center">22</div>
                </div>

                {/* DATA ROWS */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar w-full">
                    {items.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center opacity-50">
                                <Clock size={48} className="mx-auto mb-2 text-gray-600"/>
                                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Sem programação para hoje</p>
                            </div>
                        </div>
                    ) : (
                        items.map((item, index) => (
                            <div 
                                key={item.id} 
                                className={`
                                    flex py-1.5 border-b border-gray-800 text-[9px] md:text-[10px] font-bold uppercase tracking-tight
                                    ${index % 2 === 0 ? 'bg-transparent' : 'bg-gray-900/30'}
                                    ${item.statusColor === 'EMERGENCY' ? 'text-red-400 bg-red-900/10 border-red-900/30' : ''}
                                    ${item.statusColor === 'RUNNING' ? 'text-green-400 bg-green-900/10 border-green-900/30' : ''}
                                `}
                            >
                                <div style={{width: colWidths.om}} className="px-1 text-left border-r border-gray-800/50 truncate font-black text-white">{item.frotaOm}</div>
                                <div style={{width: colWidths.desc}} className="px-1 text-left border-r border-gray-800/50 truncate">{item.description}</div>
                                <div style={{width: colWidths.dMin}} className="px-1 text-center border-r border-gray-800/50 text-gray-400">{item.dateMin}</div>
                                <div style={{width: colWidths.dMax}} className="px-1 text-center border-r border-gray-800/50 text-gray-400">{item.dateMax}</div>
                                <div style={{width: colWidths.prio}} className="px-1 text-center border-r border-gray-800/50">{item.priority}</div>
                                <div style={{width: colWidths.people}} className="px-1 text-center border-r border-gray-800/50 text-blue-300">{item.peopleCount}</div>
                                <div style={{width: colWidths.h}} className="px-1 text-center border-r border-gray-800/50 text-yellow-500">{item.hours}</div>
                                <div style={{width: colWidths.dIni}} className="px-1 text-center border-r border-gray-800/50 font-black text-white bg-blue-500/10">{item.dateStart}</div>
                                <div style={{width: colWidths.dFim}} className="px-1 text-center border-r border-gray-800/50 text-gray-400">{item.dateEnd}</div>
                                <div style={{width: colWidths.center}} className="px-1 text-left border-r border-gray-800/50 truncate text-gray-300">{item.workCenter}</div>
                                <div style={{width: colWidths.hIni}} className="px-1 text-center border-r border-gray-800/50 text-green-300">{item.timeStart}</div>
                                <div style={{width: colWidths.hFim}} className="px-1 text-center border-r border-gray-800/50 text-red-300">{item.timeEnd}</div>
                                <div style={{width: colWidths.res}} className="px-1 text-left border-r border-gray-800/50 truncate text-blue-200">{item.resources}</div>
                                <div style={{width: colWidths.res2}} className="px-1 text-center text-gray-500">{item.resources2}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
