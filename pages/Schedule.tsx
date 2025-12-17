
import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storage';
import { ScheduleItem } from '../types';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, Maximize2, Trash2, Cloud, X, ShieldAlert } from 'lucide-react';
import { TVSchedule } from './TVSchedule';

export const Schedule: React.FC = () => {
  const navigate = useNavigate();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const loadSchedule = () => {
      setScheduleItems(StorageService.getSchedule());
  };

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
      params.append('desc', item.description);
      navigate(`/art-atividade?${params.toString()}`);
  };

  const handleClearAll = () => {
      if(scheduleItems.length === 0) return;
      
      if (window.confirm("ATENÇÃO: DESEJA LIMPAR TODA A PROGRAMAÇÃO?\n\nO SISTEMA IRÁ GERAR UM BACKUP AUTOMÁTICO ANTES DE MOVER PARA A LIXEIRA.")) {
          
          // 1. Atualização Otimista
          setScheduleItems([]);
          
          // 2. Persistência (Move para Lixeira do Sistema)
          const success = StorageService.archiveAndClearSchedule();
          if(success) alert("Backup realizado e programação movida para a Lixeira.");
      }
  };

  const handleDeleteItem = (id: string) => {
      if(window.confirm("Remover este item da programação?")) {
          setScheduleItems(prev => prev.filter(item => item.id !== id));
          StorageService.deleteScheduleItem(id);
      }
  };

  const TableContent = () => (
      <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300 text-[10px] md:text-xs">
                <thead className="bg-gray-900 text-white border-b-4 border-green-600">
                    <tr>
                        <th className="px-1 py-2 text-center font-black uppercase tracking-wider border-r border-gray-700 w-16">AÇÃO</th>
                        <th className="px-1 py-2 text-left font-black uppercase tracking-wider border-r border-gray-700 min-w-[80px]">FROTA/OM</th>
                        <th className="px-1 py-2 text-left font-black uppercase tracking-wider border-r border-gray-700 min-w-[150px]">DESCRIÇÃO</th>
                        <th className="px-1 py-2 text-center font-black uppercase tracking-wider border-r border-gray-700 bg-blue-900">DATA MIN</th>
                        <th className="px-1 py-2 text-center font-black uppercase tracking-wider border-r border-gray-700">DATA MAX</th>
                        <th className="px-1 py-2 text-center font-black uppercase tracking-wider border-r border-gray-700">PRIORIDADE</th>
                        <th className="px-1 py-2 text-center font-black uppercase tracking-wider border-r border-gray-700">PESSOAS</th>
                        <th className="px-1 py-2 text-center font-black uppercase tracking-wider border-r border-gray-700">H</th>
                        <th className="px-1 py-2 text-center font-black uppercase tracking-wider border-r border-gray-700">DATA INI</th>
                        <th className="px-1 py-2 text-center font-black uppercase tracking-wider border-r border-gray-700">DATA FIM</th>
                        <th className="px-1 py-2 text-left font-black uppercase tracking-wider border-r border-gray-700">CENTRO TRAB.</th>
                        <th className="px-1 py-2 text-center font-black uppercase tracking-wider border-r border-gray-700">H. INI</th>
                        <th className="px-1 py-2 text-center font-black uppercase tracking-wider border-r border-gray-700">H. FIM</th>
                        <th className="px-1 py-2 text-left font-black uppercase tracking-wider border-r border-gray-700">RECURSOS</th>
                        <th className="px-1 py-2 text-left font-black uppercase tracking-wider border-r border-gray-700">RECURSOS 2</th>
                        <th className="px-1 py-2 text-center font-black uppercase tracking-wider">EXCLUIR</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-300 font-bold">
                    {scheduleItems.length === 0 && (
                        <tr>
                            <td colSpan={16} className="px-3 py-8 text-center text-gray-400 italic font-medium">
                                NENHUMA PROGRAMAÇÃO IMPORTADA.
                            </td>
                        </tr>
                    )}
                    {scheduleItems.map(item => {
                        const isToday = isMaintenanceDay(item.dateStart);
                        return (
                            <tr key={item.id} className="hover:bg-green-50 transition-all duration-300 border-b border-gray-200 group h-8">
                                <td className="px-1 py-1 text-center border-r align-middle">
                                    <button 
                                        onClick={() => handleStartMaintenance(item)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded shadow flex items-center gap-1 mx-auto text-[9px] font-black"
                                    >
                                        <PlayCircle size={10} /> INICIAR
                                    </button>
                                </td>
                                <td className="px-1 py-1 whitespace-pre-wrap font-black text-blue-900 border-r align-middle">
                                    {item.frotaOm}
                                </td>
                                <td className="px-1 py-1 text-gray-800 border-r font-bold align-middle truncate max-w-[200px]" title={item.description}>{item.description}</td>
                                <td className="px-1 py-1 whitespace-nowrap text-center text-white bg-blue-800 border-r font-bold align-middle">{item.dateMin}</td>
                                <td className="px-1 py-1 whitespace-nowrap text-center text-gray-600 border-r align-middle">{item.dateMax}</td>
                                <td className="px-1 py-1 whitespace-nowrap text-center border-r align-middle">
                                    <span className={`px-1 inline-flex leading-none font-black rounded-sm uppercase text-[9px] ${item.priority === 'Alta' ? 'bg-red-200 text-red-900' : 'bg-green-200 text-green-900'}`}>
                                        {item.priority}
                                    </span>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap text-center text-gray-700 border-r align-middle">{item.peopleCount}</td>
                                <td className="px-1 py-1 whitespace-nowrap text-center text-gray-700 border-r align-middle">{item.hours}</td>
                                <td className={`px-1 py-1 whitespace-nowrap text-center border-r align-middle ${isToday ? 'font-black text-red-600' : 'text-gray-600'}`}>{item.dateStart}</td>
                                <td className="px-1 py-1 whitespace-nowrap text-center text-gray-600 border-r align-middle">{item.dateEnd}</td>
                                <td className="px-1 py-1 whitespace-nowrap text-gray-600 border-r align-middle">{item.workCenter}</td>
                                <td className="px-1 py-1 whitespace-nowrap text-center text-gray-600 border-r align-middle">{item.timeStart}</td>
                                <td className="px-1 py-1 whitespace-nowrap text-center text-gray-600 border-r align-middle">{item.timeEnd}</td>
                                <td className="px-1 py-1 whitespace-nowrap text-gray-700 border-r align-middle truncate max-w-[100px]" title={item.resources}>{item.resources}</td>
                                <td className="px-1 py-1 whitespace-nowrap text-gray-700 align-middle border-r truncate max-w-[100px]" title={item.resources2}>{item.resources2}</td>
                                <td className="px-1 py-1 text-center align-middle">
                                    <button 
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                        title="Excluir item"
                                    >
                                        <X size={14} strokeWidth={3} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
  );

  return (
    <>
        <div className="max-w-[99%] mx-auto pb-10">
            <div className="flex justify-between items-end mb-6 border-b-4 border-green-600 pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-green-700 p-3 rounded-lg text-white shadow-lg">
                        <Clock size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tight">
                        Programação Semanal
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded flex items-center gap-1">
                                <Cloud size={12} />
                                ARMAZENAMENTO LOCAL ATIVO
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={handleClearAll}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-black shadow-lg flex items-center gap-2 transition-transform active:scale-95 border-2 border-red-800"
                        title="Limpar e Gerar Backup"
                    >
                        <ShieldAlert size={20} />
                        <span className="hidden md:inline">LIMPAR + BACKUP</span>
                    </button>
                    {/* Botão Exportar REMOVIDO conforme solicitado */}
                    <button 
                        onClick={() => setIsFullscreen(true)}
                        className="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-lg font-black shadow-lg flex items-center gap-2 transition-transform active:scale-95 border-2 border-gray-600"
                        title="Modo Tela Cheia"
                    >
                        <Maximize2 size={20} />
                        <span className="hidden md:inline">TELA CHEIA</span>
                    </button>
                </div>
            </div>

            <div className="bg-white shadow-2xl rounded-lg overflow-hidden border-2 border-gray-300">
                <TableContent />
            </div>
        </div>

        {isFullscreen && (
            <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col animate-fadeIn">
                <div className="absolute top-4 right-4 z-50">
                     <button onClick={() => setIsFullscreen(false)} className="bg-white text-red-600 hover:bg-gray-200 px-6 py-2 rounded-full font-black text-sm shadow-xl border-2 border-red-600">
                        X FECHAR
                    </button>
                </div>
                <TVSchedule />
            </div>
        )}
    </>
  );
};
