
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { StorageService } from '../services/storage';
import { ScheduleItem, ActiveMaintenance } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  PlayCircle, Clock, Maximize2, Trash2, Cloud, X, 
  ShieldAlert, ChevronLeft, ChevronRight, Activity, CalendarCheck, Search
} from 'lucide-react';
import { TVSchedule } from './TVSchedule';
import { BackButton } from '../components/BackButton';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const Schedule: React.FC = () => {
  const navigate = useNavigate();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  // Usando Set para lookup O(1) de itens ativos - Performance Crítica
  const [activeFrotaOmSet, setActiveFrotaOmSet] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const loadData = useCallback(() => {
      // Pequeno delay para garantir que o LoadingSpinner apareça antes do processamento pesado
      setTimeout(() => {
          const sch = StorageService.getSchedule();
          const active = StorageService.getActiveMaintenances();
          
          // Cria um Set com as chaves compostas ou simples para verificação rápida
          const activeSet = new Set<string>();
          active.forEach(t => {
              activeSet.add(t.header.om); // Verifica por OM
              activeSet.add(t.header.tag); // Verifica por TAG
              // Adiciona combinações comuns se necessário
          });

          setScheduleItems(sch);
          setActiveFrotaOmSet(activeSet);
          setIsLoading(false);
      }, 50);
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('safemaint_storage_update', loadData);
    return () => {
        window.removeEventListener('safemaint_storage_update', loadData);
    };
  }, [loadData]);

  // Verificação Otimizada (O(1))
  const isItemActive = (frotaOm: string) => {
      // Divide a string frotaOm (ex: "TAG123 / OM999") para verificar partes individuais
      const parts = frotaOm.split(/[\/\n\s]+/).map(p => p.trim());
      for (const part of parts) {
          if (part && activeFrotaOmSet.has(part)) return true;
      }
      return false;
  };

  const handleStartMaintenance = (item: ScheduleItem) => {
      if(isItemActive(item.frotaOm)) {
          alert("ESTA ATIVIDADE JÁ ESTÁ EM EXECUÇÃO NO PAINEL!");
          return;
      }
      let om = item.frotaOm;
      let tag = item.frotaOm;
      if (item.frotaOm.includes('\n')) {
          const parts = item.frotaOm.split('\n');
          tag = parts[0].trim();
          if (parts.length > 1) om = parts[1].trim();
      } else if (item.frotaOm.includes('/')) {
          const parts = item.frotaOm.split('/');
          tag = parts[0].trim();
          om = parts.length > 1 ? parts[1].trim() : parts[0].trim();
      }
      const params = new URLSearchParams();
      params.append('om', om);
      params.append('tag', tag);
      params.append('desc', item.description || 'Manutenção Programada');
      params.append('scheduleId', item.id);
      navigate(`/art-atividade?${params.toString()}`);
  };

  const handleClearAll = () => {
      if(scheduleItems.length === 0) return;
      if (window.confirm("ATENÇÃO: DESEJA LIMPAR TODA A PROGRAMAÇÃO?")) {
          setIsLoading(true);
          StorageService.archiveAndClearSchedule().then(() => {
              setScheduleItems([]);
              setActiveFrotaOmSet(new Set());
              setIsLoading(false);
              setCurrentPage(1);
          });
      }
  };

  const handleDeleteItem = (id: string) => {
      if(window.confirm("Remover este item da programação?")) {
          setScheduleItems(prev => prev.filter(item => item.id !== id));
          StorageService.deleteScheduleItem(id);
      }
  };

  const filteredAndPaginatedItems = useMemo(() => {
    // 1. Filtragem Inicial (Itens não ativos e busca)
    let list = [];
    const q = searchQuery.toUpperCase();
    
    // Loop único para filtrar por busca E atividade simultaneamente
    for (const item of scheduleItems) {
        if (isItemActive(item.frotaOm)) continue; // Pula se ativo
        
        if (q) {
            if (item.frotaOm.includes(q) || item.description.includes(q)) {
                list.push(item);
            }
        } else {
            list.push(item);
        }
    }

    // 2. Paginação
    const start = (currentPage - 1) * itemsPerPage;
    return {
        data: list.slice(start, start + itemsPerPage),
        totalItems: list.length
    };
  }, [scheduleItems, activeFrotaOmSet, currentPage, searchQuery]);

  const totalPages = Math.ceil(filteredAndPaginatedItems.totalItems / itemsPerPage);

  const goToNextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));
  const goToPrevPage = () => setCurrentPage(p => Math.max(p - 1, 1));

  if (isLoading) return <LoadingSpinner text="Processando Dados..." fullScreen />;

  return (
    <>
        <div className="max-w-[99%] mx-auto pb-10 animate-fadeIn">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-6 border-b-4 border-vale-green pb-4 gap-4">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <div className="bg-vale-dark p-3 rounded-xl text-white shadow-lg">
                        <CalendarCheck size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-vale-darkgray uppercase tracking-tight">
                        Programação Semanal
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-black text-gray-400 bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1.5 border border-gray-200">
                                <Cloud size={10} className="text-blue-500" />
                                {scheduleItems.length} ITENS SINCRONIZADOS
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 lg:min-w-[300px]">
                        <Search className="absolute left-3 top-3 text-gray-400" size={16}/>
                        <input 
                            type="text" 
                            placeholder="FILTRAR OM, TAG OU ATIVIDADE..." 
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-white border border-gray-300 pl-10 pr-4 py-2.5 rounded-xl text-xs font-bold uppercase outline-none focus:border-vale-green focus:ring-1 focus:ring-vale-green shadow-sm transition-all"
                        />
                    </div>
                    <button onClick={handleClearAll} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-xl font-black shadow-sm flex items-center gap-2 transition-all active:scale-95 text-[10px] uppercase tracking-widest">
                        <ShieldAlert size={16} />
                        <span className="hidden sm:inline">LIMPAR TUDO</span>
                    </button>
                    <button onClick={() => setIsFullscreen(true)} className="bg-vale-dark text-white px-4 py-2 rounded-xl font-black shadow-lg flex items-center gap-2 transition-all active:scale-95 text-[10px] uppercase tracking-widest border-b-4 border-black hover:border-gray-800">
                        <Maximize2 size={16} />
                        <span className="hidden sm:inline">MONITOR TV</span>
                    </button>
                </div>
            </div>

            <div className="bg-white shadow-2xl rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-2 border-gray-100 min-h-[500px] flex flex-col">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-300 text-[10px]">
                        <thead className="bg-gray-100 text-gray-700 border-b-2 border-gray-300 sticky top-0 z-10">
                            <tr>
                                <th className="px-2 py-3 text-center font-bold uppercase border-r border-gray-300 w-16 bg-white shadow-sm sticky left-0 z-20">AÇÃO</th>
                                <th className="px-2 py-3 text-left font-bold uppercase border-r border-gray-300 min-w-[100px]">FROTA/OM</th>
                                <th className="px-2 py-3 text-left font-bold uppercase border-r border-gray-300 min-w-[250px]">DESCRIÇÃO DA ATIVIDADE</th>
                                <th className="px-2 py-3 text-center font-bold uppercase border-r border-gray-300 w-20">DATA MIN</th>
                                <th className="px-2 py-3 text-center font-bold uppercase border-r border-gray-300 w-20">DATA MAX</th>
                                <th className="px-2 py-3 text-center font-bold uppercase border-r border-gray-300 w-20">PRIORIDADE</th>
                                <th className="px-2 py-3 text-center font-bold uppercase border-r border-gray-300 w-12">N DE PESSOAS</th>
                                <th className="px-2 py-3 text-center font-bold uppercase border-r border-gray-300 w-12">H</th>
                                <th className="px-2 py-3 text-center font-bold uppercase border-r border-gray-300 w-20">DATA INICIO</th>
                                <th className="px-2 py-3 text-center font-bold uppercase border-r border-gray-300 w-20">DATA FIM</th>
                                <th className="px-2 py-3 text-center font-bold uppercase border-r border-gray-300 w-24">CENTRO DE TRABALHO</th>
                                <th className="px-2 py-3 text-center font-bold uppercase border-r border-gray-300 w-16">HORA INICIO</th>
                                <th className="px-2 py-3 text-center font-bold uppercase border-r border-gray-300 w-16">HORA FIM</th>
                                <th className="px-2 py-3 text-center font-bold uppercase min-w-[100px] border-r border-gray-300">RECURSOS</th>
                                <th className="px-2 py-3 text-center font-bold uppercase min-w-[100px]">RECURSOS 2</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100 font-bold">
                            {filteredAndPaginatedItems.data.length === 0 ? (
                                <tr>
                                    <td colSpan={15} className="px-3 py-24 text-center text-gray-300 font-black uppercase tracking-[0.2em]">
                                        {searchQuery ? "NENHUM RESULTADO PARA O FILTRO." : "NENHUMA PROGRAMAÇÃO PENDENTE."}
                                    </td>
                                </tr>
                            ) : (
                                filteredAndPaginatedItems.data.map(item => (
                                    <tr key={item.id} className="transition-colors border-b border-gray-200 hover:bg-blue-50/50 group">
                                        <td className="px-1 py-1 text-center border-r border-gray-200 align-middle bg-white group-hover:bg-blue-50/50 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                            <div className="flex flex-col gap-1 items-center justify-center">
                                                <button onClick={() => handleStartMaintenance(item)} className="text-vale-green hover:scale-110 transition-transform p-1" title="Iniciar">
                                                    <PlayCircle size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1" title="Remover">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-2 py-1 whitespace-pre-wrap font-black text-gray-800 border-r border-gray-200 align-middle text-[10px]">{item.frotaOm}</td>
                                        <td className="px-2 py-1 text-gray-700 border-r border-gray-200 align-middle uppercase text-[9px] truncate max-w-[300px]" title={item.description}>{item.description}</td>
                                        <td className="px-2 py-1 text-center border-r border-gray-200 align-middle text-[9px] text-gray-500">{item.dateMin}</td>
                                        <td className="px-2 py-1 text-center border-r border-gray-200 align-middle text-[9px] text-gray-500">{item.dateMax}</td>
                                        <td className="px-2 py-1 text-center border-r border-gray-200 align-middle text-[9px]">{item.priority}</td>
                                        <td className="px-2 py-1 text-center border-r border-gray-200 align-middle text-[9px]">{item.peopleCount}</td>
                                        <td className="px-2 py-1 text-center border-r border-gray-200 align-middle text-[9px]">{item.hours}</td>
                                        <td className="px-2 py-1 text-center border-r border-gray-200 align-middle font-bold text-[9px] text-blue-700">{item.dateStart}</td>
                                        <td className="px-2 py-1 text-center border-r border-gray-200 align-middle text-[9px]">{item.dateEnd}</td>
                                        <td className="px-2 py-1 text-center border-r border-gray-200 align-middle text-[9px]">{item.workCenter}</td>
                                        <td className="px-2 py-1 text-center border-r border-gray-200 align-middle text-[9px]">{item.timeStart}</td>
                                        <td className="px-2 py-1 text-center border-r border-gray-200 align-middle text-[9px]">{item.timeEnd}</td>
                                        <td className="px-2 py-1 text-center align-middle text-[8px] truncate max-w-[100px] border-r border-gray-200" title={item.resources}>{item.resources}</td>
                                        <td className="px-2 py-1 text-center align-middle text-[8px] truncate max-w-[100px]" title={item.resources2}>{item.resources2}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {filteredAndPaginatedItems.totalItems > 0 && totalPages > 0 && (
                    <div className="bg-gray-50 border-t border-gray-200 p-3 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        <div>Exibindo {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredAndPaginatedItems.totalItems)} de {filteredAndPaginatedItems.totalItems} registros</div>
                        <div className="flex items-center gap-4">
                            <button onClick={goToPrevPage} disabled={currentPage === 1} className={`p-2 rounded-xl border transition-all ${currentPage === 1 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-vale-green border-gray-300 hover:border-vale-green hover:shadow-md active:scale-95'}`}><ChevronLeft size={20} /></button>
                            <span className="text-vale-darkgray">Página {currentPage} de {totalPages}</span>
                            <button onClick={goToNextPage} disabled={currentPage === totalPages} className={`p-2 rounded-xl border transition-all ${currentPage === totalPages ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-vale-green border-gray-300 hover:border-vale-green hover:shadow-md active:scale-95'}`}><ChevronRight size={20} /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {isFullscreen && (
            <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col animate-fadeIn">
                <div className="absolute top-4 right-8 z-50">
                     <button onClick={() => setIsFullscreen(false)} className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-8 py-3 rounded-full font-black text-[10px] shadow-2xl border-2 border-white/20 uppercase tracking-[0.2em] transition-all active:scale-95">
                        X Fechar Monitor
                    </button>
                </div>
                <TVSchedule />
            </div>
        )}
    </>
  );
};
