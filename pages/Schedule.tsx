
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { StorageService } from '../services/storage';
import { ScheduleItem } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  PlayCircle, Maximize2, Trash2, Cloud, 
  ShieldAlert, ChevronLeft, ChevronRight, CalendarCheck, Search, Lock
} from 'lucide-react';
import { TVSchedule } from './TVSchedule';
import { BackButton } from '../components/BackButton';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const Schedule: React.FC = () => {
  const navigate = useNavigate();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  
  // OTIMIZAÇÃO: Armazena IDs dos itens que já estão em execução (ActiveMaintenance)
  const [activeScheduleIds, setActiveScheduleIds] = useState<Set<string>>(new Set());
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const loadData = useCallback(() => {
      setIsLoading(true);
      
      setTimeout(() => {
          try {
              const sch = StorageService.getSchedule();
              const active = StorageService.getActiveMaintenances();
              
              // 1. Mapeia IDs de agenda que já estão vinculados a tarefas ativas
              // Isso garante que o item suma da lista ou fique bloqueado se já estiver no Painel
              const activeIds = new Set<string>();
              active.forEach(task => {
                  if (task.scheduleId) {
                      activeIds.add(task.scheduleId);
                  }
              });

              setScheduleItems(sch);
              setActiveScheduleIds(activeIds);
          } catch (error) {
              console.error("Erro ao processar agendamento:", error);
          } finally {
              setIsLoading(false);
          }
      }, 50);
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('safemaint_storage_update', loadData);
    return () => {
        window.removeEventListener('safemaint_storage_update', loadData);
    };
  }, [loadData]);

  const handleStartMaintenance = (item: ScheduleItem) => {
      if(activeScheduleIds.has(item.id)) {
          alert("ESTA ATIVIDADE JÁ ESTÁ EM EXECUÇÃO NO PAINEL!");
          return;
      }

      // Lógica de Extração (Defensive Coding)
      let omNumber = '';
      let tag = '';
      const fullText = (item.frotaOm || '').toUpperCase();

      // Tenta extrair TAG e OM via Regex ou Split
      // Ex: "CA5302 / 12345678" ou "12345678"
      const omMatch = fullText.match(/(\d{8,12})/); // Procura sequência de 8 a 12 dígitos
      if (omMatch) {
          omNumber = omMatch[1];
      } else if (fullText.includes('/')) {
          const parts = fullText.split('/');
          omNumber = parts.length > 1 ? parts[1].trim() : parts[0].trim();
      } else {
          omNumber = fullText;
      }

      // Tenta extrair TAG (Geralmente começa com CA, TR, PP ou 3 letras)
      const tagMatch = fullText.match(/([A-Z]{2,4}-?\d+)/);
      if (tagMatch) {
          tag = tagMatch[1];
      } else {
          tag = fullText.split('/')[0].trim();
      }

      // NAVEGA PARA ART COM DADOS BRUTOS
      // A tela de ART fará a validação obrigatória de vínculo (Search & Link)
      const params = new URLSearchParams();
      params.append('om', omNumber);
      params.append('tag', tag);
      params.append('desc', item.description || 'Manutenção Programada');
      params.append('scheduleId', item.id); // VÍNCULO CRUCIAL PARA SUMIR DA AGENDA APÓS INÍCIO
      
      navigate(`/art-atividade?${params.toString()}`);
  };

  const handleClearAll = () => {
      if(scheduleItems.length === 0) return;
      if (window.confirm("ATENÇÃO: DESEJA LIMPAR TODA A PROGRAMAÇÃO?")) {
          setIsLoading(true);
          setTimeout(() => {
              StorageService.archiveAndClearSchedule().then(() => {
                  setScheduleItems([]);
                  setActiveScheduleIds(new Set());
                  setIsLoading(false);
                  setCurrentPage(1);
              });
          }, 200);
      }
  };

  const handleDeleteItem = (id: string) => {
      if(window.confirm("Remover este item da programação?")) {
          setScheduleItems(prev => prev.filter(item => item.id !== id));
          if (activeScheduleIds.has(id)) {
              const newSet = new Set(activeScheduleIds);
              newSet.delete(id);
              setActiveScheduleIds(newSet);
          }
          StorageService.deleteScheduleItem(id);
      }
  };

  const filteredAndPaginatedItems = useMemo(() => {
    // Filtragem para remover itens que já estão em execução (Visualmente somem da lista disponível)
    const visibleItems = scheduleItems.filter(item => !activeScheduleIds.has(item.id));

    let list = [];
    const q = searchQuery.toUpperCase().trim();
    
    if (!q) {
        list = visibleItems;
    } else {
        for (let i = 0; i < visibleItems.length; i++) {
            const item = visibleItems[i];
            if ((item.frotaOm && item.frotaOm.includes(q)) || (item.description && item.description.includes(q))) {
                list.push(item);
            }
        }
    }

    const totalItems = list.length;
    const start = (currentPage - 1) * itemsPerPage;
    const data = list.slice(start, start + itemsPerPage);

    return { data, totalItems };
  }, [scheduleItems, activeScheduleIds, currentPage, searchQuery]);

  const totalPages = Math.ceil(filteredAndPaginatedItems.totalItems / itemsPerPage);

  const goToNextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));
  const goToPrevPage = () => setCurrentPage(p => Math.max(p - 1, 1));

  if (isLoading) return <LoadingSpinner text="Carregando Agenda..." fullScreen />;

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
                            placeholder="FILTRAR..." 
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
                                        {searchQuery ? "NENHUM RESULTADO PARA O FILTRO." : "TODAS AS ATIVIDADES EM EXECUÇÃO OU CONCLUÍDAS."}
                                    </td>
                                </tr>
                            ) : (
                                filteredAndPaginatedItems.data.map(item => {
                                    return (
                                        <tr key={item.id} className="transition-colors border-b border-gray-200 group hover:bg-blue-50/50">
                                            <td className="px-1 py-1 text-center border-r border-gray-200 align-middle sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] bg-white group-hover:bg-blue-50/50">
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
                                    );
                                })
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
