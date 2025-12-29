
import React, { useEffect, useState, useMemo } from 'react';
import { StorageService } from '../services/storage';
import { ScheduleItem } from '../types';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, Maximize2, Trash2, Cloud, X, ShieldAlert, Loader2, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { TVSchedule } from './TVSchedule';
import { BackButton } from '../components/BackButton';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const Schedule: React.FC = () => {
  const navigate = useNavigate();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const loadSchedule = () => {
      // Simula um pequeno delay para garantir que o Spinner seja visível e a UI não trave
      const data = StorageService.getSchedule();
      setScheduleItems(data);
      setTimeout(() => setIsLoading(false), 300);
  };

  useEffect(() => {
    loadSchedule();

    const intervalId = setInterval(() => {
        setIsFullscreen(true);
        setTimeout(() => setIsFullscreen(false), 20000); 
    }, 180000); 
    
    window.addEventListener('safemaint_storage_update', loadSchedule);

    return () => {
        clearInterval(intervalId);
        window.removeEventListener('safemaint_storage_update', loadSchedule);
    };
  }, []);

  const isMaintenanceDay = (dateStr: string) => {
      if(!dateStr) return false;
      const today = new Date().toLocaleDateString('pt-BR');
      return dateStr.trim() === today || dateStr.trim() === today.substring(0, 5);
  };

  const handleStartMaintenance = (item: ScheduleItem) => {
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

  // Optimization: Memoize paginated items to prevent recalculation on every small state change
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return scheduleItems.slice(start, start + itemsPerPage);
  }, [scheduleItems, currentPage]);

  const totalPages = Math.ceil(scheduleItems.length / itemsPerPage);

  const goToNextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));
  const goToPrevPage = () => setCurrentPage(p => Math.max(p - 1, 1));

  if (isLoading) {
    return <LoadingSpinner text="Processando Programação..." fullScreen />;
  }

  return (
    <>
        <div className="max-w-[99%] mx-auto pb-10 animate-fadeIn">
            <div className="flex justify-between items-end mb-6 border-b-4 border-vale-green pb-4">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <div className="bg-vale-dark p-3 rounded-xl text-white shadow-lg">
                        <Clock size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-vale-darkgray uppercase tracking-tight">
                        Programação Semanal
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1.5 border border-gray-200">
                                <Cloud size={12} className="text-blue-500" />
                                ARMAZENAMENTO LOCAL ATIVO
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={handleClearAll} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-black shadow-lg flex items-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-widest border-b-4 border-red-800">
                        <ShieldAlert size={20} />
                        <span className="hidden md:inline">LIMPAR + BACKUP</span>
                    </button>
                    <button onClick={() => setIsFullscreen(true)} className="bg-vale-dark text-white px-4 py-2 rounded-xl font-black shadow-lg flex items-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-widest border-b-4 border-black">
                        <Maximize2 size={20} />
                        <span className="hidden md:inline">TELA CHEIA</span>
                    </button>
                </div>
            </div>

            <div className="bg-white shadow-2xl rounded-[2rem] overflow-hidden border-2 border-gray-100 min-h-[500px] flex flex-col">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-300 text-[10px] md:text-xs">
                        <thead className="bg-gray-900 text-white border-b-4 border-vale-green sticky top-0 z-10 shadow-md">
                            <tr>
                                <th className="px-2 py-4 text-center font-black uppercase tracking-wider border-r border-gray-700 w-24">AÇÃO</th>
                                <th className="px-2 py-4 text-left font-black uppercase tracking-wider border-r border-gray-700 min-w-[100px]">FROTA/OM</th>
                                <th className="px-2 py-4 text-left font-black uppercase tracking-wider border-r border-gray-700 min-w-[200px]">DESCRIÇÃO</th>
                                <th className="px-2 py-4 text-center font-black uppercase tracking-wider border-r border-gray-700 bg-vale-blue">DATA MIN</th>
                                <th className="px-2 py-4 text-center font-black uppercase tracking-wider border-r border-gray-700">DATA MAX</th>
                                <th className="px-2 py-4 text-center font-black uppercase tracking-wider border-r border-gray-700">PRIORIDADE</th>
                                <th className="px-2 py-4 text-center font-black uppercase tracking-wider border-r border-gray-700">PESSOAS</th>
                                <th className="px-2 py-4 text-center font-black uppercase tracking-wider border-r border-gray-700">DATA INI</th>
                                <th className="px-2 py-4 text-left font-black uppercase tracking-wider border-r border-gray-700">CENTRO TRAB.</th>
                                <th className="px-2 py-4 text-center font-black uppercase tracking-wider border-r border-gray-700">H. INI</th>
                                <th className="px-2 py-4 text-left font-black uppercase tracking-wider border-r border-gray-700">RECURSOS</th>
                                <th className="px-2 py-4 text-center font-black uppercase tracking-wider w-12">REMOVER</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100 font-bold">
                            {scheduleItems.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="px-3 py-24 text-center text-gray-300 font-black uppercase tracking-[0.2em]">
                                        NENHUMA PROGRAMAÇÃO IMPORTADA NO SISTEMA.
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map(item => {
                                    const isToday = isMaintenanceDay(item.dateStart);
                                    return (
                                        <tr key={item.id} className="hover:bg-green-50 transition-colors border-b border-gray-50 group">
                                            <td className="px-2 py-2 text-center border-r align-middle">
                                                <button onClick={() => handleStartMaintenance(item)} className="bg-vale-green hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1 mx-auto text-[9px] font-black transform active:scale-95 transition-all">
                                                    <PlayCircle size={14} /> INICIAR
                                                </button>
                                            </td>
                                            <td className="px-2 py-2 whitespace-pre-wrap font-black text-vale-blue border-r align-middle">{item.frotaOm}</td>
                                            <td className="px-2 py-2 text-gray-700 border-r font-bold align-middle truncate max-w-[250px]" title={item.description}>{item.description}</td>
                                            <td className="px-2 py-2 whitespace-nowrap text-center text-white bg-vale-blue/80 border-r font-black align-middle">{item.dateMin}</td>
                                            <td className="px-2 py-2 whitespace-nowrap text-center text-gray-600 border-r align-middle">{item.dateMax}</td>
                                            <td className="px-2 py-2 whitespace-nowrap text-center border-r align-middle">
                                                <span className={`px-2 py-1 inline-flex leading-none font-black rounded-md uppercase text-[9px] ${item.priority === 'Alta' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                    {item.priority}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap text-center text-gray-700 border-r align-middle">{item.peopleCount}</td>
                                            <td className={`px-2 py-2 whitespace-nowrap text-center border-r align-middle ${isToday ? 'font-black text-vale-cherry' : 'text-gray-600'}`}>{item.dateStart}</td>
                                            <td className="px-2 py-2 whitespace-nowrap text-gray-600 border-r align-middle font-mono">{item.workCenter}</td>
                                            <td className="px-2 py-2 whitespace-nowrap text-center text-gray-800 font-black border-r align-middle">{item.timeStart}</td>
                                            <td className="px-2 py-2 whitespace-nowrap text-gray-500 border-r align-middle truncate max-w-[150px]" title={item.resources}>{item.resources}</td>
                                            <td className="px-2 py-2 text-center align-middle">
                                                <button onClick={() => handleDeleteItem(item.id)} className="text-gray-300 hover:text-vale-cherry transition-colors p-1" title="Excluir item">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                
                {scheduleItems.length > 0 && (
                    <div className="bg-gray-50 border-t border-gray-100 p-4 flex justify-between items-center text-xs font-black text-gray-500 uppercase tracking-widest">
                        <div>Exibindo {Math.min((currentPage - 1) * itemsPerPage + 1, scheduleItems.length)} - {Math.min(currentPage * itemsPerPage, scheduleItems.length)} de {scheduleItems.length} registros</div>
                        <div className="flex items-center gap-4">
                            <button onClick={goToPrevPage} disabled={currentPage === 1} className={`p-2 rounded-xl border-2 transition-all ${currentPage === 1 ? 'text-gray-200 border-gray-100 cursor-not-allowed' : 'bg-white text-vale-green border-gray-200 hover:border-vale-green hover:shadow-md active:scale-95'}`}><ChevronLeft size={20} /></button>
                            <span className="text-vale-darkgray">Página {currentPage} de {totalPages}</span>
                            <button onClick={goToNextPage} disabled={currentPage === totalPages} className={`p-2 rounded-xl border-2 transition-all ${currentPage === totalPages ? 'text-gray-200 border-gray-100 cursor-not-allowed' : 'bg-white text-vale-green border-gray-200 hover:border-vale-green hover:shadow-md active:scale-95'}`}><ChevronRight size={20} /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {isFullscreen && (
            <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col animate-fadeIn">
                <div className="absolute top-4 right-8 z-50">
                     <button onClick={() => setIsFullscreen(false)} className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-8 py-3 rounded-full font-black text-xs shadow-2xl border-2 border-white/20 uppercase tracking-[0.2em] transition-all active:scale-95">
                        X Fechar Monitor
                    </button>
                </div>
                <TVSchedule />
            </div>
        )}
    </>
  );
};
