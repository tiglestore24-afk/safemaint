
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { OMRecord, ActiveMaintenance, DocumentRecord, PendingExtraDemand } from '../types';
import { ClipboardList, PlayCircle, Search, AlertOctagon, Link as LinkIcon, Info, Trash2 } from 'lucide-react';
import { FeedbackModal } from '../components/FeedbackModal';

export const ExtraDemands: React.FC = () => {
  const navigate = useNavigate();
  
  // Data State
  const [pendingDemands, setPendingDemands] = useState<PendingExtraDemand[]>([]);
  const [availableOms, setAvailableOms] = useState<OMRecord[]>([]);
  
  // Selection State
  const [selectedDemand, setSelectedDemand] = useState<PendingExtraDemand | null>(null);
  const [selectedOmId, setSelectedOmId] = useState('');
  
  // Feedback
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    loadData();
    window.addEventListener('safemaint_storage_update', loadData);
    return () => window.removeEventListener('safemaint_storage_update', loadData);
  }, []);

  const loadData = () => {
      setPendingDemands(StorageService.getPendingExtraDemands());
      // FILTRO RIGOROSO: Apenas OMs do tipo 'DEMANDA' e não concluídas podem ser vinculadas
      setAvailableOms(StorageService.getOMs().filter(o => o.status !== 'CONCLUIDA' && o.type === 'DEMANDA'));
  };

  const handleDeleteDemand = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(window.confirm('Excluir esta demanda pendente?')) {
          StorageService.deletePendingExtraDemand(id);
      }
  };

  const handleStartDemand = async () => {
    if (!selectedDemand) return;

    // Se uma OM for selecionada, usamos os dados dela. Se não, usamos o card de Demanda.
    const selectedOM = availableOms.find(o => o.id === selectedOmId);
    
    // REDIRECIONAMENTO PARA ART EMERGENCIAL
    // O tempo só começa a contar na tela de ART
    navigate('/art-emergencial', { 
        state: { 
            omId: selectedOmId || undefined,
            om: selectedOM ? selectedOM.omNumber : 'DEMANDA-EXTRA',
            tag: selectedOM ? selectedOM.tag : selectedDemand.tag, // Tag da OM tem prioridade se selecionada
            description: selectedDemand.description,
            type: 'MECANICA', // Default, ajustável na ART
            origin: 'DEMANDA_EXTRA', // Flag para lógica de cor/tipo
            demandId: selectedDemand.id // Passamos o ID para excluir a pendência ao iniciar
        } 
    });
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 animate-fadeIn">
      <FeedbackModal 
        isOpen={isProcessing || isSuccess} 
        isSuccess={isSuccess} 
        loadingText="PREPARANDO AMBIENTE..." 
        successText="REDIRECIONANDO..." 
      />

      <div className="flex items-center gap-4 mb-8 border-b border-gray-200 pb-6 pt-6">
        <div className="bg-pink-100 p-3 rounded-xl text-pink-600 border border-pink-200 shadow-sm">
            <ClipboardList size={32} />
        </div>
        <div>
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-none">
                Demandas Extras
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Atividades não planejadas aguardando execução
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingDemands.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                  <ClipboardList size={48} className="mx-auto mb-2 opacity-30"/>
                  <p className="font-bold text-sm uppercase">Nenhuma demanda registrada</p>
                  <p className="text-[10px] mt-1">Cadastre novas demandas em Configurações &gt; Cadastro Demandas</p>
              </div>
          ) : (
              pendingDemands.map(demand => (
                  <div key={demand.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group relative">
                      <div className="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
                      <div className="p-5">
                          <div className="flex justify-between items-start mb-2">
                              <h3 className="font-black text-lg text-gray-800 uppercase">{demand.tag}</h3>
                              <button onClick={(e) => handleDeleteDemand(e, demand.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button>
                          </div>
                          
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4 h-32 overflow-y-auto custom-scrollbar">
                              <pre className="text-[10px] font-bold text-gray-600 whitespace-pre-wrap font-sans uppercase">{demand.description}</pre>
                          </div>

                          <button 
                            onClick={() => setSelectedDemand(demand)}
                            className="w-full py-3 bg-pink-600 text-white font-black text-xs uppercase rounded-lg hover:bg-pink-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                          >
                              <PlayCircle size={16}/> SELECIONAR PARA INÍCIO
                          </button>
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* MODAL LINK OM & START */}
      {selectedDemand && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border-b-[6px] border-pink-500">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                      <div>
                          <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Iniciar Demanda Extra</h3>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Vincule uma OM para começar a contagem de tempo</p>
                      </div>
                      <button onClick={() => setSelectedDemand(null)} className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"><Search size={20} className="rotate-45"/></button>
                  </div>

                  <div className="mb-6 bg-pink-50 border border-pink-100 p-4 rounded-xl">
                      <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">TAG</span>
                          <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">DATA REGISTRO</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-xl font-black text-gray-800 uppercase">{selectedDemand.tag}</span>
                          <span className="text-xs font-bold text-gray-500">{new Date(selectedDemand.createdAt).toLocaleDateString()}</span>
                      </div>
                  </div>

                  <div className="mb-6">
                      <label className="block text-xs font-black text-gray-500 uppercase mb-2 flex items-center gap-1">
                          <LinkIcon size={14}/> Selecionar Ordem (OM - TIPO DEMANDA)
                      </label>
                      <select 
                          value={selectedOmId}
                          onChange={e => setSelectedOmId(e.target.value)}
                          className="w-full p-4 rounded-xl border-2 bg-gray-50 border-gray-200 text-sm font-bold text-gray-700 outline-none focus:border-pink-500 appearance-none uppercase transition-all"
                      >
                          <option value="">-- SEM OM (AVULSO) --</option>
                          {availableOms.map(om => (
                              <option key={om.id} value={om.id}>
                                  {om.omNumber} - {om.tag}
                              </option>
                          ))}
                      </select>
                      <p className="text-[9px] text-gray-400 mt-2 flex items-center gap-1">
                          <Info size={10}/> Apenas OMs cadastradas como "DEMANDA" aparecem aqui.
                      </p>
                  </div>

                  <button 
                      onClick={handleStartDemand}
                      className="w-full bg-pink-600 hover:bg-pink-700 text-white py-4 rounded-xl font-black text-sm uppercase shadow-lg hover:shadow-pink-200 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                      <PlayCircle size={20} />
                      IR PARA ART EMERGENCIAL
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
