
import React, { useEffect, useState, useRef } from 'react';
import { StorageService } from '../services/storage';
import { Clock, X, AlertTriangle, ClipboardList, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    statusColor: 'CORRETIVA' | 'PREVENTIVA' | 'DEMANDA' | 'PLANNED' | 'PAUSED';
}

export const TVSchedule: React.FC = () => {
  const navigate = useNavigate();
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
        let statusColor: 'CORRETIVA' | 'PREVENTIVA' | 'DEMANDA' | 'PAUSED' = 'PREVENTIVA'; // Default Blue

        // Definição Rigorosa de Cores
        if (task.status === 'PAUSADA') {
            statusColor = 'PAUSED';
        } else if (task.origin === 'CORRETIVA' || task.artType === 'ART_EMERGENCIAL') {
            statusColor = 'CORRETIVA'; // RED
        } else if (task.origin === 'DEMANDA_EXTRA') {
            statusColor = 'DEMANDA'; // PINK
        } else {
            statusColor = 'PREVENTIVA'; // BLUE
        }

        const startDate = new Date(task.startTime);
        
        tvItems.push({
            id: task.id,
            frotaOm: `${task.header.tag} / ${task.header.om}`,
            description: task.header.description,
            dateMin: startDate.toLocaleDateString(),
            dateMax: startDate.toLocaleDateString(),
            priority: "EXEC",
            peopleCount: 1,
            hours: "AGORA",
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
    const todaysSchedule = schedule.filter(item => item.dateStart === todayStr);

    todaysSchedule.forEach(item => {
        let om = item.frotaOm;
        if (item.frotaOm.includes('\n')) {
            om = item.frotaOm.replace('\n', ' / ');
        }

        // Se já estiver sendo executado, não duplica na lista (opcional, aqui mantemos para controle)
        // Mas se quiser remover duplicatas visuais, filtraríamos pelo ID ou Frota.

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

    // Sort: Corretiva -> Demanda -> Preventiva -> Paused -> Planned
    tvItems.sort((a, b) => {
        const score = (s: string) => {
            if (s === 'CORRETIVA') return 0;
            if (s === 'DEMANDA') return 1;
            if (s === 'PREVENTIVA') return 2;
            if (s === 'PAUSED') return 3;
            return 4;
        };
        return score(a.statusColor) - score(b.statusColor);
    });
    setItems(tvItems);
  };

  // Define column widths
  const colWidths = {
      om: '10%',
      desc: '22%',
      dMin: '0%', // Hidden on TV to save space if needed, implies display:none in CSS
      dMax: '0%',
      prio: '6%',
      people: '4%',
      h: '4%',
      dIni: '7%',
      dFim: '0%',
      center: '8%',
      hIni: '6%',
      hFim: '6%',
      res: '15%',
      res2: '12%'
  };

  return (
    <div className="bg-gray-950 h-screen w-full overflow-hidden flex flex-col font-sans text-white select-none cursor-none group">
        <div className="flex justify-between items-center bg-gray-900 border-b border-[#10b981] px-6 py-2 shadow-2xl shrink-0 h-16 z-20 w-full relative">
            <div className="flex items-center gap-4">
                <div className="bg-white p-1 rounded w-10 h-10 flex items-center justify-center shadow border border-gray-700">
                    <h1 className="font-black tracking-tighter" style={{ color: '#007e7a', fontSize: '1.2rem', lineHeight: '1' }}>VALE</h1>
                </div>
                <div>
                    <h1 className="font-black text-white text-xl tracking-widest uppercase mb-0 drop-shadow-md leading-none">SAFEMAINT TV</h1>
                    <p className="text-[#10b981] font-bold text-[10px] tracking-[0.3em]">ALERTA DE PROGRAMAÇÃO</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                 {/* ALERTAS LEGENDA */}
                 <div className="flex gap-3 bg-black/40 p-2 rounded-lg border border-gray-700">
                     <div className="flex flex-col items-center bg-red-600 px-3 py-1 rounded shadow-lg shadow-red-900/50 min-w-[80px]">
                        <span className="text-lg font-black text-white leading-none">{items.filter(i => i.statusColor === 'CORRETIVA').length}</span>
                        <div className="flex items-center gap-1">
                            <AlertTriangle size={8} className="text-white"/>
                            <span className="text-[8px] font-black text-white uppercase">CORRETIVA</span>
                        </div>
                     </div>
                     
                     <div className="flex flex-col items-center bg-pink-600 px-3 py-1 rounded shadow-lg shadow-pink-900/50 min-w-[80px]">
                        <span className="text-lg font-black text-white leading-none">{items.filter(i => i.statusColor === 'DEMANDA').length}</span>
                        <div className="flex items-center gap-1">
                            <ClipboardList size={8} className="text-white"/>
                            <span className="text-[8px] font-black text-white uppercase">DEMANDA</span>
                        </div>
                     </div>

                     <div className="flex flex-col items-center bg-blue-600 px-3 py-1 rounded shadow-lg shadow-blue-900/50 min-w-[80px]">
                        <span className="text-lg font-black text-white leading-none">{items.filter(i => i.statusColor === 'PREVENTIVA').length}</span>
                        <div className="flex items-center gap-1">
                            <Wrench size={8} className="text-white"/>
                            <span className="text-[8px] font-black text-white uppercase">PREVENTIVA</span>
                        </div>
                     </div>
                </div>

                <div className="text-right leading-none border-l border-gray-700 pl-4 mr-4">
                    <span className="font-mono font-black text-2xl block text-white drop-shadow-lg">{now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span className="text-[10px] font-bold text-[#10b981] uppercase block mt-0.5">{now.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                </div>
            </div>

            <button 
                onClick={() => navigate(-1)} 
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-full"
                title="Fechar Monitor"
            >
                <X size={24} />
            </button>
        </div>

        {/* CONTAINER PRINCIPAL */}
        <div className="flex-1 overflow-hidden bg-gray-950 relative w-full max-w-full">
            <div className="w-full h-full relative bg-gray-900/20 shadow-2xl flex flex-col">
                
                {/* HEADER ROW */}
                <div className="flex bg-gray-900 text-gray-400 text-[10px] font-black py-2 border-b border-gray-700 shadow-md z-10 uppercase tracking-wider w-full shrink-0">
                    <div style={{width: colWidths.om}} className="px-2 text-left border-r border-gray-800">FROTA/OM</div>
                    <div style={{width: colWidths.desc}} className="px-2 text-left border-r border-gray-800">ATIVIDADE</div>
                    {/* Hidden Cols */}
                    <div style={{width: colWidths.prio}} className="px-2 text-center border-r border-gray-800">TIPO</div>
                    <div style={{width: colWidths.people}} className="px-2 text-center border-r border-gray-800">EXEC</div>
                    <div style={{width: colWidths.h}} className="px-2 text-center border-r border-gray-800">H</div>
                    <div style={{width: colWidths.dIni}} className="px-2 text-center border-r border-gray-800 bg-blue-900/20 text-[#10b981]">DATA</div>
                    <div style={{width: colWidths.center}} className="px-2 text-left border-r border-gray-800">LOCAL</div>
                    <div style={{width: colWidths.hIni}} className="px-2 text-center border-r border-gray-800">INI</div>
                    <div style={{width: colWidths.hFim}} className="px-2 text-center border-r border-gray-800">FIM</div>
                    <div style={{width: colWidths.res}} className="px-2 text-left border-r border-gray-800">RESPONSÁVEL</div>
                    <div style={{width: colWidths.res2}} className="px-2 text-center">REC. AUX</div>
                </div>

                {/* DATA ROWS */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar w-full">
                    {items.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center opacity-50">
                                <Clock size={64} className="mx-auto mb-4 text-gray-600"/>
                                <p className="text-gray-500 font-bold uppercase text-lg tracking-widest">Sem programação ativa</p>
                            </div>
                        </div>
                    ) : (
                        items.map((item, index) => (
                            <div 
                                key={item.id} 
                                className={`
                                    flex py-2 border-b border-black/20 text-[11px] font-bold uppercase tracking-tight
                                    ${item.statusColor === 'CORRETIVA' ? 'bg-red-600 text-white animate-pulse-slow' : 
                                      item.statusColor === 'DEMANDA' ? 'bg-pink-600 text-white' : 
                                      item.statusColor === 'PREVENTIVA' ? 'bg-blue-600 text-white' : 
                                      item.statusColor === 'PAUSED' ? 'bg-yellow-500 text-black' : 
                                      index % 2 === 0 ? 'bg-gray-800/50 text-gray-300' : 'bg-transparent text-gray-400'}
                                `}
                            >
                                <div style={{width: colWidths.om}} className="px-2 text-left border-r border-white/10 truncate font-black">{item.frotaOm}</div>
                                <div style={{width: colWidths.desc}} className="px-2 text-left border-r border-white/10 truncate">{item.description}</div>
                                <div style={{width: colWidths.prio}} className="px-2 text-center border-r border-white/10">{item.statusColor === 'PLANNED' ? item.priority : item.statusColor}</div>
                                <div style={{width: colWidths.people}} className="px-2 text-center border-r border-white/10">{item.peopleCount}</div>
                                <div style={{width: colWidths.h}} className="px-2 text-center border-r border-white/10">{item.hours}</div>
                                <div style={{width: colWidths.dIni}} className="px-2 text-center border-r border-white/10 font-black bg-black/20">{item.dateStart}</div>
                                <div style={{width: colWidths.center}} className="px-2 text-left border-r border-white/10 truncate">{item.workCenter}</div>
                                <div style={{width: colWidths.hIni}} className="px-2 text-center border-r border-white/10">{item.timeStart}</div>
                                <div style={{width: colWidths.hFim}} className="px-2 text-center border-r border-white/10">{item.timeEnd}</div>
                                <div style={{width: colWidths.res}} className="px-2 text-left border-r border-white/10 truncate">{item.resources}</div>
                                <div style={{width: colWidths.res2}} className="px-2 text-center opacity-80">{item.resources2}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
