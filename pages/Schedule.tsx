
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { StorageService } from '../services/storage';
import { ScheduleItem, DocumentRecord } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  PlayCircle, Maximize2, Trash2, Cloud, 
  ShieldAlert, ChevronLeft, ChevronRight, CalendarCheck, Search, Lock, Printer, Save, FileText, Filter, X
} from 'lucide-react';
import { TVSchedule } from './TVSchedule';
import { BackButton } from '../components/BackButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { FeedbackModal } from '../components/FeedbackModal';

export const Schedule: React.FC = () => {
  const navigate = useNavigate();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [activeScheduleIds, setActiveScheduleIds] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  
  // Feedback
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Ref para rastrear se é o primeiro carregamento e evitar piscadas
  const isInitialLoad = useRef(true);

  const loadData = useCallback(async (showLoader = false) => {
      if (showLoader) setIsLoading(true);
      try {
          const sch = StorageService.getSchedule();
          const active = StorageService.getActiveMaintenances();
          const activeIds = new Set<string>();
          active.forEach(task => { if (task.scheduleId) activeIds.add(task.scheduleId); });
          
          setScheduleItems(sch);
          setActiveScheduleIds(activeIds);
      } catch (error) {
          console.error("Erro ao carregar dados da agenda:", error);
      } finally {
          if (showLoader) setIsLoading(false);
          isInitialLoad.current = false;
      }
  }, []);

  useEffect(() => {
    loadData(true);
    const handleSilentUpdate = () => loadData(false);
    window.addEventListener('safemaint_storage_update', handleSilentUpdate);
    return () => window.removeEventListener('safemaint_storage_update', handleSilentUpdate);
  }, [loadData]);

  const handleStartMaintenance = (item: ScheduleItem) => {
      if(activeScheduleIds.has(item.id)) { alert("ESTA ATIVIDADE JÁ ESTÁ EM EXECUÇÃO!"); return; }
      let omNumber = ''; let tag = '';
      const fullText = (item.frotaOm || '').toUpperCase();
      
      const omMatch = fullText.match(/(\d{8,12})/);
      if (omMatch) omNumber = omMatch[1];
      else if (fullText.includes('/')) omNumber = fullText.split('/')[1].trim();
      else omNumber = fullText;
      
      const tagMatch = fullText.match(/([A-Z]{2,4}-?\d+)/);
      if (tagMatch) tag = tagMatch[1];
      else tag = fullText.split('/')[0].trim();
      
      const params = new URLSearchParams();
      params.append('om', omNumber); 
      params.append('tag', tag); 
      params.append('desc', item.description || ''); 
      params.append('scheduleId', item.id);
      
      navigate(`/art-atividade?${params.toString()}`);
  };

  const handleClearAll = () => {
      if(!scheduleItems.length || !window.confirm("CONFIRMA A LIMPEZA DE TODA A PROGRAMAÇÃO?")) return;
      setIsLoading(true);
      StorageService.archiveAndClearSchedule().then(() => {
          setScheduleItems([]); 
          setActiveScheduleIds(new Set()); 
          setIsLoading(false); 
          setCurrentPage(1);
      });
  };

  const handleArchiveWeek = async () => {
      if(scheduleItems.length === 0) return;
      const weekNum = scheduleItems[0]?.weekNumber || 'ATUAL';
      
      if(!window.confirm(`Deseja salvar a programação da SEMANA ${weekNum} como PDF no arquivo?`)) return;

      setIsProcessing(true);
      await new Promise(r => setTimeout(r, 1000));

      const now = new Date();
      // Salva snapshot como DocumentRecord
      const doc: DocumentRecord = {
          id: crypto.randomUUID(),
          type: 'CRONOGRAMA',
          header: {
              om: `SEM-${weekNum}`,
              tag: 'GERAL',
              date: now.toISOString().split('T')[0],
              time: now.toLocaleTimeString().slice(0,5),
              type: 'OUTROS',
              description: `CRONOGRAMA SEMANAL ${weekNum} - ${scheduleItems.length} ITENS`
          },
          createdAt: now.toISOString(),
          status: 'ARQUIVADO',
          content: {
              weekNumber: weekNum,
              items: scheduleItems
          },
          signatures: []
      };

      await StorageService.saveDocument(doc);
      
      setIsProcessing(false);
      setIsSuccess(true);
      
      // Trigger Print
      setTimeout(() => {
          setIsSuccess(false);
          window.print();
      }, 1000);
  };

  const filteredAndPaginatedItems = useMemo(() => {
    // Na visualização normal, esconde itens ativos. Na impressão, mostra TUDO.
    const visibleItems = scheduleItems; 
    let list = visibleItems;
    
    // Filtro por Data
    if (selectedDateFilter) {
        // Converte YYYY-MM-DD para DD/MM/YYYY
        const [y, m, d] = selectedDateFilter.split('-');
        const filterStr = `${d}/${m}/${y}`;
        list = list.filter(i => i.dateStart === filterStr);
    }

    // Filtro por Texto
    const q = searchQuery.toUpperCase().trim();
    if (q) {
        list = list.filter(i => 
            (i.frotaOm && i.frotaOm.includes(q)) || 
            (i.description && i.description.includes(q))
        );
    }
    
    const totalItems = list.length;
    const start = (currentPage - 1) * itemsPerPage;
    return { data: list.slice(start, start + itemsPerPage), totalItems, allData: list };
  }, [scheduleItems, currentPage, searchQuery, selectedDateFilter]);

  const totalPages = Math.ceil(filteredAndPaginatedItems.totalItems / itemsPerPage);

  if (isLoading && isInitialLoad.current) {
      return <LoadingSpinner text="Carregando Agenda..." fullScreen />;
  }

  // --- PRINT MODE LOGIC ---
  // We render a specific clean table for printing that overrides the main UI via CSS
  return (
    <>
        <style>{`
            @media print {
                @page { size: landscape; margin: 5mm; }
                body * { visibility: hidden; }
                .print-container, .print-container * { visibility: visible; }
                .print-container { position: absolute; left: 0; top: 0; width: 100%; }
                .no-print { display: none !important; }
            }
        `}</style>

        <FeedbackModal isOpen={isProcessing || isSuccess} isSuccess={isSuccess} loadingText="ARQUIVANDO SEMANA..." successText="PROGRAMAÇÃO SALVA!" />

        {/* --- MAIN UI (SCREEN) --- */}
        <div className="max-w-[99%] mx-auto pb-10 animate-fadeIn h-full flex flex-col no-print">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-6 border-b-4 border-vale-green pb-4 gap-4 bg-white md:bg-transparent p-4 md:p-0 rounded-2xl shadow-sm md:shadow-none">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <div className="bg-vale-dark p-3 rounded-2xl text-white shadow-xl"><CalendarCheck size={32} /></div>
                    <div>
                        <h2 className="text-2xl font-black text-vale-darkgray uppercase tracking-tighter">Programação Semanal</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-black text-gray-400 bg-gray-100 px-3 py-1 rounded-full border border-gray-200 uppercase tracking-widest">
                                SEMANA {scheduleItems[0]?.weekNumber || '??'} | {scheduleItems.length} Itens
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full lg:w-auto items-end">
                    
                    {/* FILTRO DE DATA */}
                    <div className="relative">
                        <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-1">Filtrar Dia</label>
                        <div className="relative">
                            <Filter className="absolute left-3 top-2.5 text-gray-400" size={14}/>
                            <input 
                                type="date" 
                                value={selectedDateFilter} 
                                onChange={(e) => { setSelectedDateFilter(e.target.value); setCurrentPage(1); }} 
                                className="pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-700 uppercase outline-none focus:border-vale-green shadow-sm transition-all h-[42px]" 
                            />
                            {selectedDateFilter && (
                                <button onClick={() => setSelectedDateFilter('')} className="absolute right-2 top-2.5 text-gray-400 hover:text-red-500"><X size={14}/></button>
                            )}
                        </div>
                    </div>

                    <div className="relative flex-1 lg:min-w-[250px]">
                        <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-1">Buscar Texto</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={16}/>
                            <input type="text" placeholder="OM, TAG, DESC..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full bg-white border-2 border-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-bold uppercase outline-none focus:border-vale-green shadow-sm transition-all h-[42px]" />
                        </div>
                    </div>
                    
                    <button onClick={handleArchiveWeek} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2 shadow-lg h-[42px]">
                        <FileText size={16}/> SALVAR PDF
                    </button>
                    <button onClick={handleClearAll} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors h-[42px]">LIMPAR</button>
                    <button onClick={() => setIsFullscreen(true)} className="bg-vale-dark text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest border-b-4 border-black active:translate-y-0.5 transition-all h-[42px]">TV MODE</button>
                </div>
            </div>

            <div className="bg-white shadow-2xl rounded-[2rem] overflow-hidden border-2 border-gray-100 flex-1 flex flex-col min-h-[500px]">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-200 text-[10px]">
                        <thead className="bg-gray-50 text-gray-500 border-b-2 border-gray-200 sticky top-0 z-10 font-black uppercase">
                            <tr>
                                <th className="p-4 text-center border-r border-gray-200 w-20 bg-gray-100 sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">AÇÃO</th>
                                <th className="p-4 text-left border-r border-gray-200 min-w-[120px]">EQUIPAMENTO / OM</th>
                                <th className="p-4 text-left border-r border-gray-200 min-w-[300px]">DESCRIÇÃO DA ATIVIDADE</th>
                                <th className="p-4 text-center border-r border-gray-200 w-28">DATA INÍCIO</th>
                                <th className="p-4 text-center border-r border-gray-200 w-28">LOCAL / CT</th>
                                <th className="p-4 text-center w-24">HORÁRIO</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100 font-bold text-gray-700">
                            {filteredAndPaginatedItems.data.length === 0 ? (
                                <tr><td colSpan={6} className="p-32 text-center text-gray-300 font-black uppercase tracking-[0.3em] italic">Nenhum item encontrado para o filtro atual...</td></tr>
                            ) : (
                                filteredAndPaginatedItems.data.map(item => {
                                    const isActive = activeScheduleIds.has(item.id);
                                    return (
                                        <tr key={item.id} className={`transition-colors border-b border-gray-50 group hover:bg-teal-50/30 ${isActive ? 'bg-green-50 opacity-60 grayscale' : ''}`}>
                                            <td className="p-2 text-center border-r border-gray-100 sticky left-0 z-10 bg-white group-hover:bg-teal-50/50 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                                <div className="flex gap-2 justify-center">
                                                    {!isActive && (
                                                        <button onClick={() => handleStartMaintenance(item)} className="text-vale-green p-2 hover:scale-125 transition-transform bg-teal-50 rounded-lg" title="Iniciar Manutenção"><PlayCircle size={20} /></button>
                                                    )}
                                                    <button onClick={() => { if(window.confirm("REMOVER ITEM?")) StorageService.deleteScheduleItem(item.id).then(() => loadData(false)) }} className="text-gray-200 hover:text-red-500 p-2 transition-colors"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                            <td className="p-4 font-black text-gray-900 border-r border-gray-50 text-[11px] uppercase">{item.frotaOm}</td>
                                            <td className="p-4 text-gray-600 border-r border-gray-50 text-[10px] uppercase font-bold leading-relaxed">{item.description}</td>
                                            <td className="p-4 text-center border-r border-gray-50 font-black text-[10px] text-blue-700 bg-blue-50/30">{item.dateStart}</td>
                                            <td className="p-4 text-center border-r border-gray-50 text-[10px] uppercase">{item.workCenter}</td>
                                            <td className="p-4 text-center text-[10px] font-mono">{item.timeStart}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                
                {totalPages > 0 && (
                    <div className="bg-gray-50 border-t-2 border-gray-100 p-4 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <div>Exibindo {filteredAndPaginatedItems.data.length} itens</div>
                        <div className="flex items-center gap-6">
                            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-2.5 bg-white border-2 border-gray-200 rounded-xl disabled:opacity-30 hover:border-vale-green transition-all shadow-sm"><ChevronLeft size={20}/></button>
                            <span className="text-gray-700 bg-white px-4 py-2 rounded-lg border border-gray-200">Página {currentPage} de {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-2.5 bg-white border-2 border-gray-200 rounded-xl disabled:opacity-30 hover:border-vale-green transition-all shadow-sm"><ChevronRight size={20}/></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        {/* --- PRINT CONTAINER (VISIBLE ONLY ON PRINT) --- */}
        <div className="print-container hidden">
            <div className="mb-4 border-b-4 border-black pb-2 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black uppercase">SAFEMAINT - CRONOGRAMA SEMANAL</h1>
                    <p className="text-sm font-bold uppercase">SEMANA: {scheduleItems[0]?.weekNumber || '---'} | EMISSÃO: {new Date().toLocaleDateString()}</p>
                </div>
                <div className="text-right text-xs font-bold uppercase">
                    TOTAL ITENS: {scheduleItems.length}
                </div>
            </div>
            <table className="w-full text-left border-collapse text-[9px] font-mono">
                <thead>
                    <tr className="border-b-2 border-black">
                        <th className="py-2 px-1">DATA</th>
                        <th className="py-2 px-1">HORA</th>
                        <th className="py-2 px-1">EQUIPAMENTO / OM</th>
                        <th className="py-2 px-1">DESCRIÇÃO DA ATIVIDADE</th>
                        <th className="py-2 px-1">CT</th>
                        <th className="py-2 px-1">RESPONSÁVEL</th>
                    </tr>
                </thead>
                <tbody>
                    {/* PRINT ALL ITEMS, NOT PAGINATED */}
                    {scheduleItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-300">
                            <td className="py-1 px-1 font-bold">{item.dateStart}</td>
                            <td className="py-1 px-1">{item.timeStart} - {item.timeEnd}</td>
                            <td className="py-1 px-1 font-black">{item.frotaOm}</td>
                            <td className="py-1 px-1">{item.description}</td>
                            <td className="py-1 px-1">{item.workCenter}</td>
                            <td className="py-1 px-1">{item.resources}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* MODAL MONITOR TV (AGENDA DINÂMICA) */}
        {isFullscreen && (
            <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col animate-fadeIn no-print">
                <button 
                    onClick={() => setIsFullscreen(false)} 
                    className="absolute top-4 right-8 z-[110] bg-white/5 hover:bg-red-600 text-white px-10 py-4 rounded-full font-black text-xs uppercase border-2 border-white/20 transition-all shadow-2xl backdrop-blur-md"
                >
                    &times; FECHAR MONITOR
                </button>
                <TVSchedule />
            </div>
        )}
    </>
  );
};
