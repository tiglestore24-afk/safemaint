
import React, { useEffect, useState, useRef } from 'react';
import { StorageService } from '../services/storage';
import { Clock, X, AlertTriangle, ClipboardList, Wrench, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
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
  
  // Estado para a data selecionada na visualização (padrão: hoje)
  const [viewDate, setViewDate] = useState(new Date());
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    const dataInterval = setInterval(refreshData, 5000); // Atualiza dados a cada 5s
    
    window.addEventListener('safemaint_storage_update', refreshData);
    refreshData();

    return () => { 
        clearInterval(clockInterval); 
        clearInterval(dataInterval);
        window.removeEventListener('safemaint_storage_update', refreshData);
    };
  }, [viewDate]); // Recarrega se a data de visualização mudar

  // Auto-scroll logic
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    // Reseta o scroll quando os itens mudam (nova data)
    scrollContainer.scrollTop = 0;

    let scrollAmount = 0;
    const speed = 0.5; // Velocidade lenta constante
    let direction = 1;
    let pauseCounter = 0;

    const scrollInterval = setInterval(() => {
        if (!scrollContainer) return;
        // Se não tem scroll, não faz nada
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
    
    // Data formatada da visualização selecionada
    const viewDateStr = viewDate.toLocaleDateString('pt-BR');
    const isToday = viewDate.toDateString() === new Date().toDateString();

    // 1. CARDS EM EXECUÇÃO (Prioridade Máxima - Apenas se estiver vendo HOJE)
    if (isToday) {
        activeTasks.forEach(task => {
            let statusColor: 'CORRETIVA' | 'PREVENTIVA' | 'DEMANDA' | 'PAUSED' = 'PREVENTIVA'; 

            if (task.status === 'PAUSADA') {
                statusColor = 'PAUSED';
            } else if (task.origin === 'CORRETIVA' || task.artType === 'ART_EMERGENCIAL') {
                statusColor = 'CORRETIVA';
            } else if (task.origin === 'DEMANDA_EXTRA') {
                statusColor = 'DEMANDA';
            } else {
                statusColor = 'PREVENTIVA';
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
    }

    // 2. PROGRAMAÇÃO DO DIA SELECIONADO
    const selectedSchedule = schedule.filter(item => item.dateStart === viewDateStr);

    selectedSchedule.forEach(item => {
        let om = item.frotaOm;
        if (item.frotaOm.includes('\n')) {
            om = item.frotaOm.replace('\n', ' / ');
        }

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

  const changeDate = (days: number) => {
      const newDate = new Date(viewDate);
      newDate.setDate(newDate.getDate() + days);
      setViewDate(newDate);
  };

  const goToToday = () => {
      setViewDate(new Date());
  };

  // Define column widths
  const colWidths = {
      om: '12%',
      desc: '25%',
      dMin: '0%', 
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
      res2: '7%'
  };

  return (
    <div className="bg-slate-900 h-screen w-full overflow-hidden flex flex-col font-sans text-white select-none group">
        <div className="flex justify-between items-center bg-slate-800 border-b-2 border-[#007e7a] px-6 py-2 shadow-2xl shrink-0 h-16 z-20 w-full relative">
            <div className="flex items-center gap-4">
                <div className="bg-white p-1 rounded w-10 h-10 flex items-center justify-center shadow border border-gray-400">
                    <h1 className="font-black tracking-tighter" style={{ color: '#007e7a', fontSize: '1.2rem', lineHeight: '1' }}>VALE</h1>
                </div>
                <div>
                    <h1 className="font-black text-white text-xl tracking-widest uppercase mb-0 drop-shadow-md leading-none">SAFEMAINT TV</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-[#10b981] font-bold text-[10px] tracking-[0.2em]">
                            EXIBINDO: {viewDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                        </p>
                        {viewDate.toDateString() !== new Date().toDateString() && (
                            <span className="bg-yellow-500 text-black text-[8px] font-black px-1.5 rounded uppercase blink">Não é hoje</span>
                        )}
                    </div>
                </div>
            </div>
            
            {/* CONTROLES DE DATA (CENTRAL) */}
            <div className="flex items-center gap-2 bg-black/30 p-1 rounded-lg border border-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white/10 rounded text-slate-300 hover:text-white"><ChevronLeft size={24}/></button>
                <button onClick={goToToday} className="flex items-center gap-1 px-3 py-1.5 bg-[#007e7a] hover:bg-[#00605d] rounded text-[10px] font-black uppercase"><Calendar size={12}/> Hoje</button>
                <button onClick={() => changeDate(1)} className="p-2 hover:bg-white/10 rounded text-slate-300 hover:text-white"><ChevronRight size={24}/></button>
            </div>

            <div className="flex items-center gap-4">
                 {/* ALERTAS LEGENDA */}
                 <div className="flex gap-3 bg-black/40 p-2 rounded-lg border border-slate-600">
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

                <div className="text-right leading-none border-l border-slate-600 pl-4 mr-4">
                    <span className="font-mono font-black text-2xl block text-white drop-shadow-lg">
                        {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className="text-[10px] font-bold text-[#10b981] uppercase block mt-0.5">{now.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                </div>
            </div>

            <button 
                onClick={() => navigate(-1)} 
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-full"
                title="Fechar Monitor"
            >
                <X size={24} />
            </button>
        </div>

        {/* CONTAINER PRINCIPAL */}
        <div className="flex-1 overflow-hidden bg-slate-900 relative w-full max-w-full">
            <div className="w-full h-full relative flex flex-col">
                
                {/* HEADER ROW */}
                <div className="flex bg-slate-800 text-slate-300 text-[11px] font-black py-2 border-b border-slate-600 shadow-md z-10 uppercase tracking-wider w-full shrink-0">
                    <div style={{width: colWidths.om}} className="px-2 text-left border-r border-slate-700">FROTA/OM</div>
                    <div style={{width: colWidths.desc}} className="px-2 text-left border-r border-slate-700">ATIVIDADE</div>
                    <div style={{width: colWidths.prio}} className="px-2 text-center border-r border-slate-700">TIPO</div>
                    <div style={{width: colWidths.people}} className="px-2 text-center border-r border-slate-700">EXEC</div>
                    <div style={{width: colWidths.h}} className="px-2 text-center border-r border-slate-700">H</div>
                    <div style={{width: colWidths.dIni}} className="px-2 text-center border-r border-slate-700 bg-blue-900/30 text-[#10b981]">DATA</div>
                    <div style={{width: colWidths.center}} className="px-2 text-left border-r border-slate-700">LOCAL</div>
                    <div style={{width: colWidths.hIni}} className="px-2 text-center border-r border-slate-700">INI</div>
                    <div style={{width: colWidths.hFim}} className="px-2 text-center border-r border-slate-700">FIM</div>
                    <div style={{width: colWidths.res}} className="px-2 text-left border-r border-slate-700">RESPONSÁVEL</div>
                    <div style={{width: colWidths.res2}} className="px-2 text-center">REC. AUX</div>
                </div>

                {/* DATA ROWS */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar w-full">
                    {items.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center opacity-50">
                                <Clock size={64} className="mx-auto mb-4 text-slate-500"/>
                                <p className="text-slate-400 font-bold uppercase text-lg tracking-widest">Sem programação para {viewDate.toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>
                    ) : (
                        items.map((item, index) => (
                            <div 
                                key={item.id} 
                                className={`
                                    flex py-1.5 border-b border-white/10 text-[12px] font-black uppercase tracking-tight
                                    ${item.statusColor === 'CORRETIVA' ? 'bg-red-600 text-white animate-pulse-slow' : 
                                      item.statusColor === 'DEMANDA' ? 'bg-pink-600 text-white' : 
                                      item.statusColor === 'PREVENTIVA' ? 'bg-blue-600 text-white' : 
                                      item.statusColor === 'PAUSED' ? 'bg-yellow-500 text-black' : 
                                      index % 2 === 0 ? 'bg-slate-800 text-white' : 'bg-slate-900 text-slate-200'}
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
