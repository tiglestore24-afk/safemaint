
import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../services/storage';
import { OMRecord, ActiveMaintenance } from '../types';
import { FileInput, Search, Trash2, PlayCircle, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { FeedbackModal } from '../components/FeedbackModal';
import { useNavigate } from 'react-router-dom';

export const OMManagement: React.FC = () => {
  const navigate = useNavigate();
  const [oms, setOms] = useState<OMRecord[]>([]);
  const [activeTasks, setActiveTasks] = useState<ActiveMaintenance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    loadData();
    window.addEventListener('safemaint_storage_update', loadData);
    return () => window.removeEventListener('safemaint_storage_update', loadData);
  }, []);

  const loadData = () => {
    setOms(StorageService.getOMs());
    setActiveTasks(StorageService.getActiveMaintenances());
  };

  const handleStartActivity = (om: OMRecord) => {
      // BLOQUEIO CRÍTICO: Verifica se a OM já está no painel de execução
      const isAlreadyActive = activeTasks.some(t => t.header.om === om.omNumber || t.omId === om.id);
      
      if (isAlreadyActive) {
          alert(`⚠️ ATENÇÃO: A OM ${om.omNumber} já está ativa no Painel de Controle.`);
          navigate('/dashboard');
          return;
      }

      const params = { om: om.omNumber, tag: om.tag, description: om.description, type: om.type, omId: om.id };
      if (om.type === 'CORRETIVA') navigate('/art-emergencial', { state: params });
      else {
          const urlParams = new URLSearchParams();
          urlParams.append('om', om.omNumber);
          urlParams.append('tag', om.tag);
          urlParams.append('desc', om.description);
          urlParams.append('omId', om.id);
          navigate(`/art-atividade?${urlParams.toString()}`);
      }
  };

  const filteredOms = useMemo(() => {
    // Pega números e IDs de OMs que estão ativas
    const activeOmNumbers = new Set(activeTasks.map(t => t.header.om));
    const activeOmIds = new Set(activeTasks.map(t => t.omId));

    return oms.filter(om => {
        // Regra 1: Não pode ser uma OM concluída
        if (om.status === 'CONCLUIDA') return false;
        
        // Regra 2: Se estiver em andamento, esconde da fila para evitar re-abertura (ou mostra bloqueada)
        // Por padrão, vamos esconder para manter o backlog limpo, ou exibir com bloqueio visual.
        // Se a OM está ativa, ela NÃO deve estar disponível para novo início.
        if (activeOmNumbers.has(om.omNumber) || activeOmIds.has(om.id)) return false;

        const query = searchQuery.toUpperCase().trim();
        return om.omNumber.includes(query) || om.tag.includes(query);
    });
  }, [oms, activeTasks, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 animate-fadeIn">
      <FeedbackModal isOpen={isProcessing || isSuccess} isSuccess={isSuccess} />

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 gap-4">
        <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-2xl text-blue-600 border border-blue-200 shadow-inner"><FileInput size={28} /></div>
            <div>
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-none">Backlog de Ordens</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Aguardando Início de Execução</p>
            </div>
        </div>
        <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-3.5 text-gray-300" size={18} />
            <input type="text" placeholder="LOCALIZAR POR OM OU TAG..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-bold uppercase outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"/>
        </div>
      </div>

      {filteredOms.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-gray-200 flex flex-col items-center">
              <CheckCircle2 size={64} className="text-gray-100 mb-6" />
              <p className="font-black text-lg text-gray-400 uppercase tracking-[0.2em]">Fila Despachada</p>
              <p className="text-[10px] text-gray-300 mt-2 uppercase font-bold tracking-widest">Todas as OMs cadastradas estão ativas ou finalizadas.</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredOms.map(om => (
                <div key={om.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-xl hover:translate-y-[-4px] relative flex flex-col group border-b-[6px] border-b-blue-500">
                    <div className="p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <span className="font-black text-xl text-gray-800 tracking-tight">{om.omNumber}</span>
                            <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase ${om.type === 'CORRETIVA' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{om.type}</span>
                        </div>
                        <div className="mb-6 flex-1">
                            <span className="text-sm font-black text-[#007e7a] block mb-2">{om.tag}</span>
                            <p className="text-[11px] font-bold text-gray-500 uppercase line-clamp-3 leading-relaxed">{om.description}</p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => handleStartActivity(om)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-black text-[11px] uppercase flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100 active:scale-95"
                            >
                                <PlayCircle size={18}/> Iniciar ART
                            </button>
                            <button onClick={() => { if(confirm('Excluir Ordem?')) StorageService.deleteOM(om.id) }} className="p-3.5 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors border border-red-100" title="Excluir Ordem"><Trash2 size={20}/></button>
                        </div>
                    </div>
                </div>
              ))}
          </div>
      )}
    </div>
  );
};
