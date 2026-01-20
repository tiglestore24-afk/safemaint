import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { OMRecord } from '../types';
import { FileInput, Search, Plus, Trash2, Edit2, FileText, CheckCircle2, Loader2, Save, X, Calendar, PlayCircle, AlertOctagon, ArrowRight, ExternalLink, Download, Info, Eye, Lock } from 'lucide-react';
import { FeedbackModal } from '../components/FeedbackModal';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do PDF.js Worker
const pdfjs = (pdfjsLib as any).default || pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

export const OMManagement: React.FC = () => {
  const navigate = useNavigate();
  const [oms, setOms] = useState<OMRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form States
  const [currentOm, setCurrentOm] = useState<Partial<OMRecord>>({});
  const [pdfFile, setPdfFile] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);

  // Feedback
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  // PDF Viewer States
  const [viewingDoc, setViewingDoc] = useState<{ url: string; title: string; id: string } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  useEffect(() => {
    loadOms();
    window.addEventListener('safemaint_storage_update', loadOms);
    return () => window.removeEventListener('safemaint_storage_update', loadOms);
  }, []);

  // Lógica de Carregamento de PDF (Blob)
  useEffect(() => {
    const loadPdf = async () => {
        if (!viewingDoc) {
            setPdfBlobUrl(null);
            return;
        }

        let pdfData = viewingDoc.url;
        let activeUrl: string | null = null;

        // Se for marcador TRUE ou vazio, busca no banco
        if (!pdfData || pdfData === 'TRUE') {
            setIsLoadingPdf(true);
            const remotePdf = await StorageService.getRecordPdf('oms', viewingDoc.id);
            if (remotePdf) pdfData = remotePdf;
            setIsLoadingPdf(false);
        }

        if (pdfData && pdfData !== 'TRUE') {
            try {
                // Se for Base64, converte para Blob URL para melhor performance e compatibilidade mobile
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
                } else {
                    setPdfBlobUrl(pdfData);
                }
            } catch (e) { 
                console.error("Erro ao processar PDF", e);
                setPdfBlobUrl(pdfData); 
            }
        } else {
            setPdfBlobUrl(null);
        }
    };
    
    loadPdf();
  }, [viewingDoc]);

  const loadOms = () => {
    setOms(StorageService.getOMs());
  };

  const resetForm = () => {
    setCurrentOm({});
    setPdfFile('');
    setIsExtracting(false);
    setIsEditMode(false);
  };

  const handleOpenModal = (om?: OMRecord) => {
    if (om) {
      setCurrentOm({ ...om });
      setPdfFile(om.pdfUrl || '');
      setIsEditMode(true);
    } else {
      resetForm();
      setIsEditMode(false);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta OM da fila?")) {
      await StorageService.deleteOM(id);
      loadOms();
    }
  };

  const handleStartActivity = (om: OMRecord) => {
      // Redirecionamento Inteligente baseado no Tipo
      if (om.status === 'EM_ANDAMENTO') {
          navigate('/dashboard'); // Se já começou, vai pro Dashboard ver o andamento
          return;
      }

      const params = {
          om: om.omNumber,
          tag: om.tag,
          description: om.description,
          type: om.type,
          omId: om.id
      };

      if (om.type === 'CORRETIVA') {
          navigate('/art-emergencial', { state: params });
      } else {
          // Para Preventiva/Demanda, vai para ART Padrão
          const urlParams = new URLSearchParams();
          urlParams.append('om', om.omNumber);
          urlParams.append('tag', om.tag);
          urlParams.append('desc', om.description);
          urlParams.append('omId', om.id);
          navigate(`/art-atividade?${urlParams.toString()}`);
      }
  };

  const handleSave = async () => {
    if (!currentOm.omNumber || !currentOm.tag) {
      alert("Número da OM e TAG são obrigatórios.");
      return;
    }

    setFeedbackText(isEditMode ? "ATUALIZANDO OM..." : "CADASTRANDO OM NA FILA...");
    setIsProcessing(true);

    try {
      await new Promise(r => setTimeout(r, 800));

      const omRecord: OMRecord = {
        id: currentOm.id || crypto.randomUUID(),
        omNumber: currentOm.omNumber!,
        tag: currentOm.tag!.toUpperCase(),
        description: (currentOm.description || 'MANUTENÇÃO').toUpperCase(),
        type: currentOm.type || 'PREVENTIVA',
        status: currentOm.status || 'PENDENTE',
        createdAt: currentOm.createdAt || new Date().toISOString(),
        pdfUrl: pdfFile,
        createdBy: currentOm.createdBy || localStorage.getItem('safemaint_user') || 'ADMIN',
        installationLocation: currentOm.installationLocation
      };

      await StorageService.saveOM(omRecord);
      
      setIsProcessing(false);
      setIsSuccess(true);
      setFeedbackText(isEditMode ? "OM ATUALIZADA!" : "OM NA FILA!");
      
      setTimeout(() => {
        setIsSuccess(false);
        setIsModalOpen(false);
        resetForm();
        loadOms();
      }, 1000);

    } catch (e) {
      setIsProcessing(false);
      alert("Erro ao salvar OM.");
    }
  };

  const extractDataFromPdf = async (file: File) => {
    setIsExtracting(true);
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument(arrayBuffer).promise;
        let foundOm = ''; let foundDesc = ''; let foundTag = '';
        
        const maxPages = Math.min(pdf.numPages, 3);
        let fullText = '';
        
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += ' ' + pageText;
        }
        
        const omRegex = /(?:OM|ORDEM|Nº|NUMERO)[:.\s]*(\d{8,12})/i;
        const omMatch = fullText.match(omRegex);
        if (omMatch) foundOm = omMatch[1];
        else { const fallbackOm = fullText.match(/(\d{12})/); if (fallbackOm) foundOm = fallbackOm[1]; }
        
        const descRegex = /(?:DESCRIÇÃO|TEXTO BREVE|DESCRIÇÃO OM)[:.\s]*(.*?)(?:OBSERVAÇÕES|NOTA|EQUIPAMENTO|LOCAL|PERMISSÕES|$)/i;
        const descMatch = fullText.match(descRegex);
        if (descMatch) foundDesc = descMatch[1].trim().replace(/_+/g, ' ').replace(/\bCA\d+\b/i, '').trim(); 
        
        const localInstRegex = /(?:LOCAL DE INSTALAÇÃO|LOCAL INST.)[\s\S]*?\b(CA\d+)\b/i;
        let tagMatch = fullText.match(localInstRegex);

        if (!tagMatch) {
            const descOmRegex = /(?:DESCRIÇÃO OM)[\s\S]*?\b(CA\d+)\b/i;
            tagMatch = fullText.match(descOmRegex);
        }

        if (!tagMatch) {
            const genericCaRegex = /\b(CA\d+)\b/i;
            tagMatch = fullText.match(genericCaRegex);
        }

        if (tagMatch && tagMatch[1]) {
            foundTag = tagMatch[1].toUpperCase();
        } else {
            const labeledTagRegex = /(?:TAG|EQUIPAMENTO|ITEM TÉCNICO)[:.\s]*([A-Z0-9-]{5,})/i;
            const genericTagRegex = /([A-Z]{3,4}-?[A-Z0-9]{2,}-?[A-Z0-9-]{3,})/i;
            const labeledMatch = fullText.match(labeledTagRegex);
            const genericMatch = fullText.match(genericTagRegex);
            if (labeledMatch) foundTag = labeledMatch[1];
            else if (genericMatch) foundTag = genericMatch[1];
        }

        setCurrentOm(prev => ({
            ...prev,
            omNumber: foundOm || prev.omNumber,
            tag: foundTag || prev.tag,
            description: foundDesc || prev.description,
            type: (foundDesc.toUpperCase().includes('CORRETIVA') || foundDesc.toUpperCase().includes('FALHA')) ? 'CORRETIVA' : 'PREVENTIVA'
        }));

    } catch (error) {
        console.error("Erro no parser:", error);
    } finally {
        setIsExtracting(false);
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
        setPdfFile(reader.result as string);
        await extractDataFromPdf(file);
    };
    reader.readAsDataURL(file);
  };

  // FILTRO PRINCIPAL: Oculta OMs Concluídas
  const filteredOms = oms.filter(om => 
    om.status !== 'CONCLUIDA' && 
    (om.omNumber.includes(searchQuery.toUpperCase()) || 
    om.tag.includes(searchQuery.toUpperCase()) ||
    om.description.includes(searchQuery.toUpperCase()))
  ).sort((a,b) => {
      // Ordena OMs EM_ANDAMENTO primeiro
      const statusScore = (s: string) => s === 'EM_ANDAMENTO' ? 0 : 1; 
      return statusScore(a.status) - statusScore(b.status) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getTypeColor = (type: string) => {
      switch(type) {
          case 'CORRETIVA': return 'bg-red-500';
          case 'DEMANDA': return 'bg-purple-500';
          default: return 'bg-blue-500';
      }
  };

  const getTypeTextColor = (type: string) => {
      switch(type) {
          case 'CORRETIVA': return 'text-red-600';
          case 'DEMANDA': return 'text-purple-600';
          default: return 'text-blue-600';
      }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 animate-fadeIn">
      <FeedbackModal 
        isOpen={isProcessing || isSuccess} 
        isSuccess={isSuccess} 
        loadingText={feedbackText}
        successText={feedbackText}
      />

      {/* PDF VIEWER OVERLAY */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[100] bg-gray-900/95 flex items-center justify-center p-0 backdrop-blur-md animate-fadeIn">
            <div className="w-[98vw] h-[98vh] bg-white flex flex-col rounded-xl overflow-hidden shadow-2xl border-4 border-gray-900">
                <div className="bg-white p-3 flex justify-between items-center shrink-0 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#007e7a] text-white p-1.5 rounded">
                            <FileText size={18} />
                        </div>
                        <div>
                            <span className="font-black text-xs text-gray-800 uppercase tracking-wide block">Visualização de Documento</span>
                            <span className="font-bold text-[10px] text-[#007e7a] uppercase tracking-widest">{viewingDoc.title}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {pdfBlobUrl && (
                            <a href={pdfBlobUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-600 transition-colors md:hidden" title="Abrir em Nova Aba">
                                <ExternalLink size={16}/>
                            </a>
                        )}
                        <button onClick={() => setViewingDoc(null)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-all"><X size={24}/></button>
                    </div>
                </div>
                <div className="flex-1 bg-gray-100 relative">
                    {isLoadingPdf ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Loader2 size={48} className="text-[#007e7a] animate-spin mb-4" />
                            <h4 className="font-black text-xs uppercase">BAIXANDO DO SERVIDOR...</h4>
                        </div>
                    ) : pdfBlobUrl ? (
                        <iframe src={pdfBlobUrl} className="w-full h-full border-none bg-white" title="Viewer" />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                            <Info size={40} className="opacity-20" />
                            <span className="font-bold text-[10px] uppercase tracking-widest">Documento Indisponível</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-200 gap-4">
        <div className="flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-xl text-blue-600 border border-blue-100 shadow-sm">
                <FileInput size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-none">
                    Fila de Ordens (Backlog)
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Ordens Pendentes e Em Execução
                </p>
            </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="BUSCAR NA FILA..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-blue-500 transition-all"
                />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOms.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center">
                  <CheckCircle2 size={48} className="mb-2 text-green-500 opacity-50"/>
                  <span className="font-bold text-sm uppercase text-gray-600">Fila Zerada!</span>
                  <span className="text-[10px] uppercase mt-1">Nenhuma ordem pendente neste momento.</span>
              </div>
          ) : (
              filteredOms.map(om => {
                  // Verifica se a OM está bloqueada (Em Execução)
                  const isLocked = om.status === 'EM_ANDAMENTO';

                  return (
                    <div key={om.id} className={`rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all group relative flex flex-col ${isLocked ? 'bg-gray-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
                        {/* Faixa lateral colorida por tipo - Se bloqueada fica Amarela */}
                        <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${isLocked ? 'bg-yellow-500' : getTypeColor(om.type)}`}></div>
                        
                        <div className="p-5 pl-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`font-black text-lg tracking-tight ${isLocked ? 'text-gray-500' : 'text-gray-800'}`}>{om.omNumber}</span>
                                <div className="flex gap-1">
                                    {isLocked ? (
                                        <span className="text-[8px] font-black px-2 py-1 rounded border uppercase bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-1 animate-pulse">
                                            <Lock size={8}/> BLOQUEADA
                                        </span>
                                    ) : (
                                        <span className="text-[8px] font-black px-2 py-1 rounded border uppercase bg-gray-100 text-gray-500 border-gray-200">
                                            {om.status.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="mb-4 flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-sm font-black ${isLocked ? 'text-gray-500' : getTypeTextColor(om.type)}`}>{om.tag}</span>
                                    <span className="text-[8px] font-bold text-gray-400 uppercase bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{om.type}</span>
                                </div>
                                <p className={`text-[10px] font-bold uppercase line-clamp-2 leading-relaxed min-h-[2.5em] ${isLocked ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {om.description}
                                </p>
                            </div>

                            {/* BOTÕES DE AÇÃO DO CARD */}
                            <div className="space-y-2 mb-3">
                                {/* Botão de PDF (Documento da OM) */}
                                {om.pdfUrl && (
                                    <button
                                        onClick={() => setViewingDoc({ url: om.pdfUrl || 'TRUE', title: `DOC OM: ${om.omNumber}`, id: om.id })}
                                        className="w-full py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors shadow-sm"
                                    >
                                        <FileText size={14} /> VER DOCUMENTO (OM/ART)
                                    </button>
                                )}

                                {/* Botão Principal de Início / Bloqueio */}
                                <button 
                                    onClick={() => handleStartActivity(om)}
                                    className={`w-full py-2.5 rounded-lg font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 
                                        ${isLocked 
                                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100' 
                                            : om.type === 'CORRETIVA' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    {isLocked ? (
                                        <>
                                            <Lock size={14}/> EM EXECUÇÃO (VER PAINEL)
                                        </>
                                    ) : (
                                        <>
                                            {om.type === 'CORRETIVA' ? <AlertOctagon size={14}/> : <PlayCircle size={14}/>} INICIAR ATIVIDADE
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-auto">
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-bold text-gray-300 flex items-center gap-1">
                                        <Calendar size={10}/> {new Date(om.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                                    <button 
                                        onClick={() => !isLocked && handleOpenModal(om)} 
                                        disabled={isLocked}
                                        className={`p-2 rounded-lg transition-colors ${isLocked ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-50 text-gray-400 hover:text-orange-500 hover:bg-orange-50'}`} 
                                        title={isLocked ? "Bloqueado para edição" : "Editar"}
                                    >
                                        <Edit2 size={14}/>
                                    </button>
                                    <button 
                                        onClick={() => !isLocked && handleDelete(om.id)} 
                                        disabled={isLocked}
                                        className={`p-2 rounded-lg transition-colors ${isLocked ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50'}`} 
                                        title={isLocked ? "Bloqueado para exclusão" : "Excluir"}
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                  );
              })
          )}
      </div>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border-t-8 border-blue-600">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="font-black text-lg text-gray-800 uppercase flex items-center gap-2">
                          {isEditMode ? <Edit2 size={20} className="text-blue-600"/> : <Plus size={20} className="text-blue-600"/>}
                          {isEditMode ? 'Editar Ordem' : 'Nova Ordem Manual'}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-full text-gray-400 hover:text-red-500 shadow-sm transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      {/* Upload Area */}
                      <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-6 text-center relative hover:bg-blue-50 transition-colors group">
                          <input 
                              type="file" 
                              accept=".pdf" 
                              onChange={handlePdfUpload} 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          {isExtracting ? (
                              <div className="flex flex-col items-center animate-pulse">
                                  <Loader2 size={32} className="text-blue-600 animate-spin mb-2" />
                                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Lendo Documento...</span>
                              </div>
                          ) : pdfFile ? (
                              <div className="flex flex-col items-center">
                                  <CheckCircle2 size={32} className="text-green-500 mb-2" />
                                  <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">PDF Processado</span>
                                  <span className="text-[9px] text-gray-400 mt-1">(Clique para alterar)</span>
                              </div>
                          ) : (
                              <div className="flex flex-col items-center text-blue-400 group-hover:text-blue-600 transition-colors">
                                  <FileText size={32} className="mb-2" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Arraste ou Clique para Anexar PDF</span>
                              </div>
                          )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Número OM</label>
                              <input 
                                  type="text" 
                                  value={currentOm.omNumber || ''} 
                                  onChange={e => setCurrentOm({...currentOm, omNumber: e.target.value})}
                                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all uppercase"
                              />
                          </div>
                          <div>
                              <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Tag Equipamento</label>
                              <input 
                                  type="text" 
                                  value={currentOm.tag || ''} 
                                  onChange={e => setCurrentOm({...currentOm, tag: e.target.value.toUpperCase()})}
                                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-blue-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all uppercase"
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Tipo de Manutenção</label>
                          <select 
                              value={currentOm.type || 'PREVENTIVA'} 
                              onChange={e => setCurrentOm({...currentOm, type: e.target.value as any})}
                              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-blue-500 uppercase appearance-none"
                          >
                              <option value="PREVENTIVA">PREVENTIVA</option>
                              <option value="CORRETIVA">CORRETIVA</option>
                              <option value="DEMANDA">DEMANDA</option>
                          </select>
                      </div>

                      <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Descrição da Atividade</label>
                          <textarea 
                              value={currentOm.description || ''} 
                              onChange={e => setCurrentOm({...currentOm, description: e.target.value.toUpperCase()})}
                              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-blue-500 h-24 resize-none uppercase"
                              placeholder="Descreva a atividade..."
                          />
                      </div>

                      <button 
                          onClick={handleSave}
                          disabled={isProcessing || isExtracting}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-xs uppercase shadow-lg hover:shadow-blue-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          {isEditMode ? 'Salvar Alterações' : 'Cadastrar na Fila'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};