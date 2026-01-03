
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { OMRecord, ActiveMaintenance, DocumentRecord, PendingExtraDemand } from '../types';
import { ClipboardList, PlayCircle, Search, AlertOctagon, Link as LinkIcon, Info, Trash2, FileText, X, Loader2 } from 'lucide-react';
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

  // Viewer State
  const [viewingDoc, setViewingDoc] = useState<{ url: string; title: string; id: string } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  useEffect(() => {
    loadData();
    window.addEventListener('safemaint_storage_update', loadData);
    return () => window.removeEventListener('safemaint_storage_update', loadData);
  }, []);

  // PDF Blob Logic (With On-Demand Fetch)
  useEffect(() => {
    const loadPdf = async () => {
        if (!viewingDoc) {
            setPdfBlobUrl(null);
            return;
        }

        let pdfData = viewingDoc.url;
        let activeUrl: string | null = null;

        if (!pdfData || pdfData === 'TRUE') {
            setIsLoadingPdf(true);
            const remotePdf = await StorageService.getRecordPdf('oms', viewingDoc.id);
            if (remotePdf) pdfData = remotePdf;
            setIsLoadingPdf(false);
        }

        if (pdfData && pdfData !== 'TRUE') {
            try {
                if (pdfData.startsWith('data:application/pdf;base64,')) {
                    const parts = pdfData.split(',');
                    if (parts.length > 1) {
                        const byteCharacters = atob(parts[1]);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                        const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
                        activeUrl = URL.createObjectURL(blob);
                        setPdfBlobUrl(activeUrl);
                        return () => URL.revokeObjectURL(activeUrl!);
                    }
                } else setPdfBlobUrl(pdfData);
            } catch (e) { setPdfBlobUrl(pdfData); }
        } else setPdfBlobUrl(null);
    };
    
    loadPdf();
  }, [viewingDoc]);

  const loadData = () => {
      setPendingDemands(StorageService.getPendingExtraDemands());
      // FILTRO RIGOROSO: Apenas OMs com status 'PENDENTE' podem ser vinculadas.
      setAvailableOms(StorageService.getOMs().filter(o => o.status === 'PENDENTE'));
  };

  const handleDeleteDemand = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(window.confirm('Excluir esta demanda pendente?')) {
          StorageService.deletePendingExtraDemand(id);
      }
  };

  const handleStartDemand = async () => {
    if (!selectedDemand) return;

    const selectedOM = availableOms.find(o => o.id === selectedOmId);
    
    if (selectedOM && selectedOM.tag !== selectedDemand.tag) {
        alert("ERRO DE SEGURANÇA: O TAG da OM não corresponde ao TAG da Demanda.");
        return;
    }
    
    navigate('/art-emergencial', { 
        state: { 
            omId: selectedOmId || undefined,
            om: selectedOM ? selectedOM.omNumber : 'DEMANDA-EXTRA',
            tag: selectedOM ? selectedOM.tag : selectedDemand.tag, 
            description: selectedDemand.description,
            type: 'MECANICA', 
            origin: 'DEMANDA_EXTRA', 
            demandId: selectedDemand.id 
        } 
    });
  };

  const matchingOms = selectedDemand 
    ? availableOms.filter(om => om.tag === selectedDemand.tag) 
    : [];

  const selectedOMRecord = availableOms.find(o => o.id === selectedOmId);

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
                            onClick={() => { setSelectedDemand(demand); setSelectedOmId(''); }}
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
                          <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">TAG SELECIONADO</span>
                          <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">DATA REGISTRO</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-xl font-black text-gray-800 uppercase">{selectedDemand.tag}</span>
                          <span className="text-xs font-bold text-gray-500">{new Date(selectedDemand.createdAt).toLocaleDateString()}</span>
                      </div>
                  </div>

                  <div className="mb-6">
                      <label className="block text-xs font-black text-gray-500 uppercase mb-2 flex items-center gap-1">
                          <LinkIcon size={14}/> Vincular Ordem (OM)
                      </label>
                      
                      {matchingOms.length > 0 ? (
                          <div className="space-y-3">
                              <select 
                                  value={selectedOmId}
                                  onChange={e => setSelectedOmId(e.target.value)}
                                  className="w-full p-4 rounded-xl border-2 bg-white border-green-200 text-sm font-bold text-gray-700 outline-none focus:border-green-500 appearance-none uppercase transition-all shadow-sm"
                              >
                                  <option value="">-- SEM OM (EXECUTAR AVULSO) --</option>
                                  {matchingOms.map(om => (
                                      <option key={om.id} value={om.id}>
                                          [{om.type.substring(0,4)}] OM: {om.omNumber}
                                      </option>
                                  ))}
                              </select>
                              
                              {/* VIEW PDF BUTTON */}
                              {selectedOMRecord && (selectedOMRecord.pdfUrl || true) && (
                                  <button 
                                      onClick={() => setViewingDoc({ url: selectedOMRecord.pdfUrl || '', title: selectedOMRecord.omNumber, id: selectedOMRecord.id })}
                                      className="w-full py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors animate-fadeIn"
                                  >
                                      <FileText size={14} /> VISUALIZAR PDF ORIGINAL (IMPORTANTE)
                                  </button>
                              )}

                              <p className="text-[9px] text-green-600 font-bold flex items-center gap-1 bg-green-50 p-2 rounded-lg border border-green-100">
                                  <Info size={10}/> {matchingOms.length} OM(s) encontradas com o TAG {selectedDemand.tag}.
                              </p>
                          </div>
                      ) : (
                          <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl">
                              <p className="text-[10px] text-orange-600 font-bold flex items-center gap-1 mb-1">
                                  <AlertOctagon size={12}/> NENHUMA OM COMPATÍVEL ENCONTRADA
                              </p>
                              <p className="text-[9px] text-gray-500">
                                  Não existem OMs pendentes com o TAG <strong>{selectedDemand.tag}</strong>. Você pode iniciar sem vincular OM.
                              </p>
                          </div>
                      )}
                  </div>

                  <button 
                      onClick={handleStartDemand}
                      className="w-full bg-pink-600 hover:bg-pink-700 text-white py-4 rounded-xl font-black text-sm uppercase shadow-lg hover:shadow-pink-200 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                      <PlayCircle size={20} />
                      {selectedOmId ? 'VINCULAR OM E INICIAR ART' : 'INICIAR ART SEM OM'}
                  </button>
              </div>
          </div>
      )}

      {/* PDF VIEWER OVERLAY */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[100] bg-gray-900/95 flex items-center justify-center p-0 backdrop-blur-md">
            <div className="w-[98vw] h-[98vh] bg-white flex flex-col rounded-xl overflow-hidden shadow-2xl border-4 border-gray-900">
                <div className="bg-white p-3 flex justify-between items-center shrink-0 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#007e7a] text-white p-1.5 rounded">
                            <FileText size={18} />
                        </div>
                        <div>
                            <span className="font-black text-xs text-gray-800 uppercase tracking-wide block">Visualização de Documento (Segurança)</span>
                            <span className="font-bold text-[10px] text-[#007e7a] uppercase tracking-widest">{viewingDoc.title}</span>
                        </div>
                    </div>
                    <button onClick={() => setViewingDoc(null)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-all"><X size={24}/></button>
                </div>
                <div className="flex-1 bg-gray-100 relative">
                    {isLoadingPdf ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Loader2 size={48} className="text-[#007e7a] animate-spin mb-4" />
                            <h4 className="font-black text-xs uppercase">BAIXANDO ORIGINAL DO SERVIDOR...</h4>
                        </div>
                    ) : pdfBlobUrl ? (
                        <iframe src={pdfBlobUrl} className="w-full h-full border-none bg-white" title="Viewer" />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                            <Info size={40} className="opacity-20" />
                            <span className="font-bold text-[10px] uppercase tracking-widest">Carregando Documento...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
