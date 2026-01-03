
import React, { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/storage';
import { OMRecord, DocumentRecord, ScheduleItem, ActiveMaintenance } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  FileInput, PlayCircle, Trash2, Search, CalendarDays, User,
  Wrench, AlertOctagon, Clock, CheckCircle2, Eye, X, Info, FileText,
  StopCircle, Filter, SortDesc, SortAsc, XCircle, ListFilter, Plus, Save, Sparkles, Loader2, FileSearch, ArrowRight, Download, Link, LayoutGrid, List as ListIcon, Lock, ClipboardList
} from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { FeedbackModal } from '../components/FeedbackModal'; // Importado
import * as pdfjsLib from 'pdfjs-dist';

// Fix for "Cannot set properties of undefined (setting 'workerSrc')"
const pdfjs = (pdfjsLib as any).default || pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

export const OMManagement: React.FC = () => {
  const navigate = useNavigate();
  const [oms, setOms] = useState<OMRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'PENDENTE' | 'CONCLUIDA'>('PENDENTE');
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [activeTasks, setActiveTasks] = useState<ActiveMaintenance[]>([]);
  
  // --- FEEDBACK STATES ---
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [processText, setProcessText] = useState('');

  // --- STATE DOS FILTROS & VIEW ---
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CORRETIVA' | 'PREVENTIVA' | 'DEMANDA'>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  
  // --- VIEW & MODAL STATE ---
  const [viewingOM, setViewingOM] = useState<OMRecord | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // --- NEW OM FORM STATE ---
  const [newOmNumber, setNewOmNumber] = useState('');
  const [newOmTag, setNewOmTag] = useState('');
  const [newOmDesc, setNewOmDesc] = useState('');
  const [newOmType, setNewOmType] = useState<'PREVENTIVA' | 'CORRETIVA' | 'DEMANDA'>('PREVENTIVA');
  const [newOmPdf, setNewOmPdf] = useState<string>('');
  const [linkedScheduleOm, setLinkedScheduleOm] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  
  const [currentUser, setCurrentUser] = useState('');

  const refreshData = useCallback(() => {
    const allOms = StorageService.getOMs();
    setOms(allOms);
    setScheduleItems(StorageService.getSchedule());
    setActiveTasks(StorageService.getActiveMaintenances());
  }, []);

  useEffect(() => {
    setCurrentUser(localStorage.getItem('safemaint_user')?.toUpperCase() || '');
    refreshData();
    window.addEventListener('safemaint_storage_update', refreshData);
    return () => window.removeEventListener('safemaint_storage_update', refreshData);
  }, [refreshData]);

  // CORREÇÃO VISUALIZADOR PDF
  useEffect(() => {
    let activeUrl: string | null = null;

    if (viewingOM?.pdfUrl) {
        try {
            // Verifica se é Base64 com cabeçalho
            if (viewingOM.pdfUrl.startsWith('data:application/pdf;base64,')) {
                const parts = viewingOM.pdfUrl.split(',');
                if (parts.length > 1) {
                    const base64Data = parts[1].replace(/\s/g, ''); // Remove quebras de linha/espaços
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    activeUrl = URL.createObjectURL(blob);
                    setPdfBlobUrl(activeUrl);
                }
            } else {
                // Caso seja URL direta ou blob anterior
                setPdfBlobUrl(viewingOM.pdfUrl);
            }
        } catch (e) {
            console.error("Erro ao processar PDF:", e);
            setPdfBlobUrl(null); // Em caso de erro, limpa para mostrar fallback
        }
    } else {
        setPdfBlobUrl(null);
    }

    // Cleanup function
    return () => {
        if (activeUrl) {
            URL.revokeObjectURL(activeUrl);
        }
    };
  }, [viewingOM]);

  const handleExecute = (om: OMRecord) => {
    if (om.status === 'CONCLUIDA') return;
    const route = om.type === 'CORRETIVA' ? '/art-emergencial' : '/art-atividade';
    navigate(route, { state: { omId: om.id, om: om.omNumber, tag: om.tag, description: om.description, type: om.type } });
  };

  const extractDataFromPdf = async (file: File) => {
    setIsExtracting(true);
    setProcessText('LENDO PDF...');
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument(arrayBuffer).promise;
        let foundOm = ''; let foundDesc = ''; let foundTag = '';
        let fullText = '';
        const pagesToRead = Math.min(pdf.numPages, 3); // Read 3 pages to be safe
        
        for (let i = 1; i <= pagesToRead; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += ' ' + pageText;
        }

        const omMatch = fullText.match(/(?:OM|ORDEM|N[º°])[:\s]*(\d{8,12})/i);
        if (omMatch) foundOm = omMatch[1];
        else { const fallbackOm = fullText.match(/(\d{12})/); if (fallbackOm) foundOm = fallbackOm[1]; }

        const descMatch = fullText.match(/(?:DESCRIÇÃO|TEXTO BREVE)[:\s]*(.*?)(?:OBSERVAÇÕES|PERMISSÕES|NOTA|LOCAL|$)/i);
        if (descMatch) foundDesc = descMatch[1].trim().replace(/_+/g, ' ');

        // --- TAG EXTRACTION LOGIC UPDATE (FIXED FOR LOCAL DE INSTALAÇÃO) ---
        // 1. Try finding "Local de Instalação" followed closely by a TAG pattern
        const localInstRegex = /(?:LOCAL DE INSTALAÇÃO|LOCAL INSTALAÇÃO)(?:[\s\S]{0,100}?)([A-Z]{3,4}-?[A-Z0-9]{2,}-?[A-Z0-9-]{3,})/i;
        
        // 2. Try explicit tags
        const labeledTagRegex = /(?:TAG|EQUIPAMENTO|ITEM TÉCNICO)[:.\s]*([A-Z0-9-]{5,})/i;
        
        // 3. Fallback generic tag
        const genericTagRegex = /([A-Z]{3,4}-?[A-Z0-9]{2,}-?[A-Z0-9-]{3,})/i;

        const localMatch = fullText.match(localInstRegex);
        const labeledMatch = fullText.match(labeledTagRegex);
        const genericMatch = fullText.match(genericTagRegex);

        if (localMatch) foundTag = localMatch[1];
        else if (labeledMatch) foundTag = labeledMatch[1];
        else if (genericMatch) foundTag = genericMatch[1];

        if (foundOm) setNewOmNumber(foundOm);
        if (foundTag) setNewOmTag(foundTag);
        if (foundDesc) setNewOmDesc(foundDesc);

        const upperDesc = foundDesc.toUpperCase();
        if (upperDesc.includes('PREVENTIVA') || upperDesc.includes('REVISÃO') || upperDesc.includes('PLANO')) {
            setNewOmType('PREVENTIVA');
        } else if (upperDesc.includes('CORRETIVA') || upperDesc.includes('FALHA') || upperDesc.includes('QUEBRA')) {
            setNewOmType('CORRETIVA');
        }
    } catch (error) {
        console.error("Erro na extração de dados:", error);
        alert("Não foi possível realizar a leitura automática deste PDF. Por favor, preencha manualmente.");
    } finally {
        setIsExtracting(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => { setNewOmPdf(reader.result as string); };
    reader.readAsDataURL(file);
    await extractDataFromPdf(file);
  };

  const handleSaveNewOM = async () => {
    if(!newOmNumber || !newOmTag) { alert("Preencha Número e Tag"); return; }
    
    // START PROCESSING
    setProcessText('SALVANDO ORDEM...');
    setIsProcessing(true);
    
    try {
        // Artificial delay for UX
        await new Promise(r => setTimeout(r, 1000));

        const now = new Date().toISOString();
        const user = localStorage.getItem('safemaint_user') || 'ADMIN';

        const om: OMRecord = {
            id: crypto.randomUUID(),
            omNumber: newOmNumber,
            tag: newOmTag.toUpperCase(),
            description: newOmDesc.toUpperCase() || 'MANUTENÇÃO',
            type: newOmType,
            status: 'PENDENTE',
            createdAt: now,
            pdfUrl: newOmPdf,
            createdBy: user,
            linkedScheduleOm: linkedScheduleOm || undefined
        };
        
        await StorageService.saveOM(om);

        if (newOmPdf) {
            const docRecord: DocumentRecord = {
                id: crypto.randomUUID(),
                type: 'RELATORIO',
                header: {
                    om: newOmNumber,
                    tag: newOmTag.toUpperCase(),
                    date: now.split('T')[0],
                    time: now.split('T')[1].slice(0,5),
                    type: 'OUTROS',
                    description: `CADASTRO INICIAL DE OM - ${newOmDesc.toUpperCase()}`
                },
                createdAt: now,
                status: 'ATIVO',
                content: {
                    rawText: `REGISTRO DE ABERTURA DE OM.\nOM: ${newOmNumber}\nTAG: ${newOmTag}\nTIPO: ${newOmType}\nRESPONSÁVEL: ${user}\nVÍNCULO PROGRAMAÇÃO: ${linkedScheduleOm || 'NÃO'}`,
                    manualFileUrl: newOmPdf,
                    isManualUpload: true
                },
                signatures: []
            };
            await StorageService.saveDocument(docRecord);
        }
        
        // SHOW SUCCESS
        setIsProcessing(false);
        setIsSuccess(true);

        setTimeout(() => {
            setIsSuccess(false);
            setNewOmNumber(''); setNewOmTag(''); setNewOmDesc(''); setNewOmPdf(''); setLinkedScheduleOm('');
            setIsAddModalOpen(false);
            refreshData();
        }, 1500);

    } catch (e) {
        setIsProcessing(false);
        alert("Erro ao salvar OM.");
    }
  };

  const clearFilters = () => {
      setSearchQuery(''); setTypeFilter('ALL'); setDateFilter(''); setSortOrder('DESC');
  };

  const filteredOms = oms
    .filter(o => {
        const isCompleted = o.status === 'CONCLUIDA';
        if (activeTab === 'PENDENTE' && isCompleted) return false;
        if (activeTab === 'CONCLUIDA' && !isCompleted) return false;

        if (searchQuery) {
            const query = searchQuery.toUpperCase();
            const match = o.omNumber.includes(query) || o.tag.includes(query) || (o.description && o.description.includes(query));
            if (!match) return false;
        }
        if (typeFilter !== 'ALL' && o.type !== typeFilter) return false;
        if (dateFilter) {
            const omDate = o.createdAt.split('T')[0];
            if (omDate !== dateFilter) return false;
        }
        return true;
    })
    .sort((a, b) => {
        if (activeTab === 'PENDENTE') {
            const aActive = a.status === 'EM_ANDAMENTO';
            const bActive = b.status === 'EM_ANDAMENTO';
            if (aActive && !bActive) return -1;
            if (!aActive && bActive) return 1;
        }
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'DESC' ? dateB - dateA : dateA - dateB;
    });

  const hasActiveFilters = searchQuery !== '' || typeFilter !== 'ALL' || dateFilter !== '';

  return (
    <div className="max-w-[1600px] mx-auto pb-20 px-4">
      
      {/* GLOBAL FEEDBACK MODAL */}
      <FeedbackModal 
        isOpen={isProcessing || isSuccess} 
        isSuccess={isSuccess} 
        loadingText={processText || "PROCESSANDO..."}
        successText="ORDEM CADASTRADA NA CARTEIRA!"
      />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center py-4 mb-4 gap-4">
          <div className="flex items-center gap-3">
              <BackButton />
              <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 uppercase">
                      Gestão de Ordens
                  </h2>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Carteira de Serviços</p>
              </div>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#007e7a] hover:bg-[#00605d] text-white px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 shadow-sm transition-all"
          >
              <Plus size={16} /> Nova OM
          </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col gap-3">
          {/* LINHA 1: Abas e Busca */}
          <div className="flex flex-col lg:flex-row gap-3 justify-between items-center w-full">
              <div className="flex bg-gray-100 p-1 rounded-lg w-full lg:w-auto gap-1">
                  <button onClick={() => setActiveTab('PENDENTE')} className={`flex-1 lg:flex-none px-6 py-2 rounded-lg font-bold text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'PENDENTE' ? 'bg-[#007e7a] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    Carteira Ativa
                    <span className="bg-white/20 px-1.5 rounded text-[9px] ml-1">{oms.filter(o => o.status !== 'CONCLUIDA').length}</span>
                  </button>
                  <button onClick={() => setActiveTab('CONCLUIDA')} className={`flex-1 lg:flex-none px-6 py-2 rounded-lg font-bold text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'CONCLUIDA' ? 'bg-[#007e7a] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    Histórico
                  </button>
              </div>
              
              <div className="relative w-full lg:flex-1 lg:max-w-md">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                  <input type="text" placeholder="FILTRAR..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value.toUpperCase())} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs font-bold uppercase outline-none focus:border-[#007e7a] focus:ring-1 focus:ring-[#007e7a]/20" />
              </div>
          </div>

          {/* LINHA 2: Filtros Avançados */}
          <div className="flex flex-col md:flex-row gap-2 items-center w-full border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2 text-gray-400 mr-2 shrink-0">
                  <ListFilter size={14} /> <span className="text-[10px] font-bold uppercase hidden md:inline">Filtros:</span>
              </div>
              <div className="grid grid-cols-2 md:flex md:flex-row gap-2 w-full items-center">
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="bg-gray-50 border border-gray-200 text-gray-600 font-bold text-[10px] rounded p-2 outline-none uppercase hover:bg-gray-100">
                      <option value="ALL">Todos Tipos</option>
                      <option value="CORRETIVA">Corretiva (Vermelho)</option>
                      <option value="PREVENTIVA">Preventiva (Azul)</option>
                      <option value="DEMANDA">Demanda Extra (Rosa)</option>
                  </select>
                  <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-600 font-bold text-[10px] rounded p-2 outline-none uppercase hover:bg-gray-100" />
                  <button onClick={() => setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')} className="bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded px-3 py-2 flex items-center justify-center gap-2">
                      {sortOrder === 'DESC' ? <SortDesc size={12}/> : <SortAsc size={12}/>}
                  </button>
                  {hasActiveFilters && (
                      <button onClick={clearFilters} className="bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 rounded px-3 py-2 flex items-center justify-center gap-1">
                          <XCircle size={12}/> <span className="text-[10px] font-bold uppercase">Limpar</span>
                      </button>
                  )}
                  
                  {/* VIEW TOGGLE */}
                  <div className="flex bg-gray-100 p-1 rounded-lg gap-1 md:ml-auto">
                        <button 
                            onClick={() => setViewMode('GRID')} 
                            className={`p-1.5 rounded transition-colors ${viewMode === 'GRID' ? 'bg-white shadow-sm text-[#007e7a]' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Visualização em Cards"
                        >
                            <LayoutGrid size={14}/>
                        </button>
                        <button 
                            onClick={() => setViewMode('LIST')} 
                            className={`p-1.5 rounded transition-colors ${viewMode === 'LIST' ? 'bg-white shadow-sm text-[#007e7a]' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Visualização em Lista"
                        >
                            <ListIcon size={14}/>
                        </button>
                  </div>
              </div>
          </div>
      </div>

      {/* CONTENT AREA */}
      {filteredOms.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-xl border border-gray-200 shadow-sm">
              <Info size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold uppercase text-sm tracking-widest">Nenhuma ordem encontrada</p>
          </div>
      ) : (
          viewMode === 'GRID' ? (
            /* --- GRID VIEW (CARDS) --- */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredOms.map((om) => {
                    const isCorretiva = om.type === 'CORRETIVA';
                    const isDemanda = om.type === 'DEMANDA';
                    const isPreventiva = om.type === 'PREVENTIVA';
                    const isStarted = om.status === 'EM_ANDAMENTO';
                    
                    // --- LOGIC FOR LOCKING (OWNERSHIP CHECK) ---
                    const activeTask = activeTasks.find(t => t.omId === om.id);
                    const taskOwner = activeTask?.openedBy || 'SISTEMA';
                    const isMyTask = taskOwner === currentUser;
                    const isPartial = activeTask?.status === 'AGUARDANDO';
                    
                    // Locked if: Started AND Not My Task AND Not in Partial Stop
                    const isLocked = isStarted && !isMyTask && !isPartial;

                    // COLOR LOGIC
                    let borderColor = 'border-gray-200';
                    let badgeColor = 'bg-blue-50 text-blue-600 border-blue-100';
                    
                    if (isCorretiva) {
                        borderColor = 'border-red-500';
                        badgeColor = 'bg-red-50 text-red-600 border-red-100';
                    } else if (isDemanda) {
                        borderColor = 'border-pink-500';
                        badgeColor = 'bg-pink-50 text-pink-600 border-pink-100';
                    } else if (isPreventiva) {
                        borderColor = 'border-blue-500';
                        badgeColor = 'bg-blue-50 text-blue-600 border-blue-100';
                    }

                    return (
                        <div key={om.id} className={`group bg-white rounded-xl shadow-sm border hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${borderColor}`}>
                            
                            {/* Barra de Progresso (Se iniciada) */}
                            {isStarted && <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500 animate-pulse"></div>}
                            
                            {/* Header do Card */}
                            <div className="p-4 pb-2">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1.5 border ${badgeColor}`}>
                                        {isCorretiva ? <AlertOctagon size={10}/> : isDemanda ? <ClipboardList size={10}/> : <Wrench size={10}/>}
                                        {om.type}
                                    </span>
                                    {om.pdfUrl && (
                                        <button onClick={() => setViewingOM(om)} className="text-gray-400 hover:text-[#007e7a] transition-colors" title="Ver PDF Original">
                                            <FileText size={16}/>
                                        </button>
                                    )}
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-gray-800 leading-none tracking-tight">{om.omNumber}</h3>
                                    {isStarted && <span className="text-[8px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 animate-pulse">EM EXECUÇÃO</span>}
                                </div>
                                <p className="text-xs font-bold text-[#007e7a] uppercase mt-1 tracking-wide">{om.tag}</p>
                                
                                {om.linkedScheduleOm && (
                                    <div className="mt-2 text-[8px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded inline-flex items-center gap-1 font-bold">
                                        <Link size={8} /> VINC: {om.linkedScheduleOm.slice(0, 15)}...
                                    </div>
                                )}
                            </div>

                            {/* Descrição */}
                            <div className="px-4 py-2 flex-1">
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 h-full">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase line-clamp-3 leading-relaxed">
                                        {om.description || "SEM DESCRIÇÃO DETALHADA."}
                                    </p>
                                </div>
                            </div>

                            {/* Footer / Actions */}
                            <div className="p-4 pt-3 border-t border-gray-100 bg-gray-50/50">
                                <div className="flex justify-between text-[9px] font-bold text-gray-400 mb-3 uppercase tracking-wider">
                                    <span className="flex items-center gap-1"><CalendarDays size={10}/> {new Date(om.createdAt).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1"><User size={10}/> {om.createdBy?.split(' ')[0] || 'SISTEMA'}</span>
                                </div>
                                
                                <div className="flex gap-2 items-center">
                                    {om.status === 'CONCLUIDA' ? (
                                        <div className="w-full py-2.5 rounded-lg bg-green-100 text-green-700 border border-green-200 text-[10px] font-black uppercase text-center flex items-center justify-center gap-2">
                                            <CheckCircle2 size={14}/> Encerrada
                                        </div>
                                    ) : (
                                        isLocked ? (
                                            <div className="flex-1 py-2.5 rounded-lg bg-gray-200 text-gray-400 border border-gray-300 text-[10px] font-black uppercase flex items-center justify-center gap-2 cursor-not-allowed" title={`Bloqueado por ${taskOwner}`}>
                                                <Lock size={14}/> Bloqueado ({taskOwner})
                                            </div>
                                        ) : isDemanda ? (
                                            <div className="flex-1 py-2.5 rounded-lg bg-pink-50 text-pink-600 border border-pink-200 text-[9px] font-black uppercase text-center flex flex-col leading-none justify-center gap-1 cursor-default" title="Use a página Demandas Extras para iniciar">
                                                <span>VIA DEMANDAS EXTRAS</span>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => handleExecute(om)} 
                                                className={`flex-1 py-2.5 rounded-lg text-white text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all ${isCorretiva ? 'bg-red-600 hover:bg-red-700' : 'bg-[#007e7a] hover:bg-[#00605d]'}`}
                                            >
                                                {isStarted ? <><StopCircle size={14}/> Continuar</> : <><PlayCircle size={14}/> Iniciar Atividade <ArrowRight size={12}/></>}
                                            </button>
                                        )
                                    )}
                                    <button 
                                        onClick={() => { if(window.confirm('Excluir esta ordem?')) StorageService.deleteOM(om.id).then(refreshData) }} 
                                        className="p-2.5 border border-gray-200 bg-white rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                                        title="Excluir"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
          ) : (
            /* --- LIST VIEW (TABLE) --- */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fadeIn">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase font-black tracking-wider">
                                <th className="p-4 w-32">Número OM</th>
                                <th className="p-4 w-32">Tag</th>
                                <th className="p-4">Descrição</th>
                                <th className="p-4 w-32 text-center">Tipo</th>
                                <th className="p-4 w-32 text-center">Data</th>
                                <th className="p-4 w-32 text-center">Status</th>
                                <th className="p-4 w-40 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs font-bold divide-y divide-gray-100">
                            {filteredOms.map((om, idx) => {
                                const isCorretiva = om.type === 'CORRETIVA';
                                const isDemanda = om.type === 'DEMANDA';
                                const isPreventiva = om.type === 'PREVENTIVA';
                                const isStarted = om.status === 'EM_ANDAMENTO';
                                
                                // --- LOCK LOGIC FOR LIST VIEW TOO ---
                                const activeTask = activeTasks.find(t => t.omId === om.id);
                                const taskOwner = activeTask?.openedBy || 'SISTEMA';
                                const isMyTask = taskOwner === currentUser;
                                const isPartial = activeTask?.status === 'AGUARDANDO';
                                const isLocked = isStarted && !isMyTask && !isPartial;

                                // COLOR LOGIC
                                let badgeColor = 'bg-blue-50 text-blue-600 border-blue-100';
                                if (isCorretiva) badgeColor = 'bg-red-50 text-red-600 border-red-100';
                                else if (isDemanda) badgeColor = 'bg-pink-50 text-pink-600 border-pink-100';
                                
                                return (
                                    <tr key={om.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="p-4 font-black text-gray-800">{om.omNumber}</td>
                                        <td className="p-4 text-[#007e7a]">{om.tag}</td>
                                        <td className="p-4 text-gray-600 truncate max-w-xs" title={om.description}>{om.description}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[9px] font-black border ${badgeColor}`}>
                                                {om.type.substring(0,4)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-gray-500">{new Date(om.createdAt).toLocaleDateString()}</td>
                                        <td className="p-4 text-center">
                                            {isStarted ? (
                                                <span className="text-orange-500 flex items-center justify-center gap-1"><Loader2 size={12} className="animate-spin"/> EXEC</span>
                                            ) : om.status === 'CONCLUIDA' ? (
                                                <span className="text-green-600 flex items-center justify-center gap-1"><CheckCircle2 size={12}/> FIM</span>
                                            ) : (
                                                <span className="text-gray-400">PENDENTE</span>
                                            )}
                                        </td>
                                        <td className="p-4 flex items-center justify-center gap-2">
                                            {om.pdfUrl && (
                                                <button onClick={() => setViewingOM(om)} className="p-1.5 text-gray-400 hover:text-[#007e7a] hover:bg-gray-100 rounded" title="Ver PDF">
                                                    <FileText size={14}/>
                                                </button>
                                            )}
                                            
                                            {om.status !== 'CONCLUIDA' && (
                                                isLocked ? (
                                                    <div className="p-1.5 text-gray-400 bg-gray-100 rounded cursor-not-allowed" title={`Bloqueado por ${taskOwner}`}>
                                                        <Lock size={14}/>
                                                    </div>
                                                ) : isDemanda ? (
                                                    <div className="p-1.5 text-purple-400 bg-purple-50 rounded cursor-default" title="Via Demandas Extras">
                                                        <ClipboardList size={14}/>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleExecute(om)}
                                                        className={`p-1.5 rounded text-white ${isStarted ? 'bg-orange-500 hover:bg-orange-600' : isCorretiva ? 'bg-red-600 hover:bg-red-700' : 'bg-[#007e7a] hover:bg-[#00605d]'}`}
                                                        title={isStarted ? "Continuar" : "Iniciar"}
                                                    >
                                                        {isStarted ? <StopCircle size={14}/> : <PlayCircle size={14}/>}
                                                    </button>
                                                )
                                            )}
                                            
                                            <button 
                                                onClick={() => { if(window.confirm('Excluir?')) StorageService.deleteOM(om.id).then(refreshData) }} 
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
          )
      )}

      {/* MODAL CADASTRAR OM */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 border-b-[6px] border-[#007e7a]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Nova Ordem (OM)</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Cadastro Manual ou via PDF</p>
                    </div>
                    <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"><X size={20}/></button>
                </div>
                
                <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 relative transition-all group">
                        <input type="file" accept=".pdf" onChange={handlePdfUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        {isExtracting ? (
                            <div className="flex flex-col items-center animate-pulse">
                                <Loader2 size={32} className="text-[#007e7a] animate-spin mb-2" />
                                <span className="text-[10px] font-bold text-[#007e7a] uppercase">Analisando Documento...</span>
                            </div>
                        ) : newOmPdf ? (
                            <div className="flex flex-col items-center">
                                <CheckCircle2 size={32} className="text-green-500 mb-2" />
                                <span className="text-xs font-black text-green-600 uppercase">PDF Processado</span>
                                <span className="text-[9px] text-gray-400 uppercase mt-1">Clique para alterar</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <FileSearch size={28} className="text-gray-400 mb-2 group-hover:text-[#007e7a] transition-colors" />
                                <span className="text-xs font-black text-gray-600 uppercase group-hover:text-[#007e7a]">Anexar PDF da Ordem</span>
                                <span className="text-[9px] text-gray-400 uppercase mt-1">Extração automática de dados</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase">Número OM</label>
                                {newOmNumber && !isExtracting && <Sparkles size={10} className="text-yellow-500 animate-pulse" />}
                            </div>
                            <input value={newOmNumber} onChange={e => setNewOmNumber(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm font-black uppercase outline-none focus:border-[#007e7a] focus:ring-1 focus:ring-[#007e7a] transition-all" placeholder="" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Tag Equipamento</label>
                            <input 
                                value={newOmTag} 
                                onChange={e => setNewOmTag(e.target.value.toUpperCase().replace(/^([0-9])/, 'CA$1'))} 
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm font-black uppercase outline-none focus:border-[#007e7a] focus:ring-1 focus:ring-[#007e7a] text-[#007e7a] transition-all" 
                                placeholder="" 
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Classificação</label>
                        <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
                            <button onClick={() => setNewOmType('PREVENTIVA')} className={`flex-1 py-2 text-[10px] font-black rounded-md uppercase transition-all ${newOmType === 'PREVENTIVA' ? 'bg-white shadow text-[#007e7a]' : 'text-gray-400 hover:text-gray-600'}`}>Preventiva</button>
                            <button onClick={() => setNewOmType('CORRETIVA')} className={`flex-1 py-2 text-[10px] font-black rounded-md uppercase transition-all ${newOmType === 'CORRETIVA' ? 'bg-white shadow text-red-600' : 'text-gray-400 hover:text-gray-600'}`}>Corretiva</button>
                            <button onClick={() => setNewOmType('DEMANDA')} className={`flex-1 py-2 text-[10px] font-black rounded-md uppercase transition-all ${newOmType === 'DEMANDA' ? 'bg-white shadow text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}>Demanda</button>
                        </div>
                    </div>

                    {newOmType === 'PREVENTIVA' && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <label className="text-[9px] font-black text-blue-800 uppercase mb-1 block flex items-center gap-1"><Link size={10}/> Vincular OM da Programação</label>
                            <select 
                                value={linkedScheduleOm} 
                                onChange={(e) => setLinkedScheduleOm(e.target.value)} 
                                className="w-full bg-white border border-blue-200 rounded p-2 text-[10px] font-bold uppercase outline-none text-gray-700 focus:border-blue-400"
                            >
                                <option value="">-- SELECIONAR VÍNCULO --</option>
                                {scheduleItems.map(item => (
                                    <option key={item.id} value={item.frotaOm}>
                                        {item.frotaOm} - {item.description?.slice(0, 30)}...
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Descrição</label>
                        <textarea value={newOmDesc} onChange={e => setNewOmDesc(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-bold uppercase outline-none h-24 resize-none focus:border-[#007e7a]" placeholder="" />
                    </div>
                    
                    <button onClick={handleSaveNewOM} disabled={isExtracting} className="w-full bg-[#007e7a] hover:bg-[#00605d] disabled:bg-gray-300 text-white py-3.5 rounded-xl font-black text-xs uppercase mt-2 flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                        <Save size={16}/> Salvar & Arquivar
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* PDF VIEWER MODAL */}
      {viewingOM && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="w-full h-[95vh] max-w-[95vw] bg-white flex flex-col rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-gray-900 text-white p-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <FileText className="text-[#007e7a]" />
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-wider">Visualizador de Documento</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">OM: {viewingOM.omNumber}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {pdfBlobUrl && (
                            <a 
                                href={pdfBlobUrl} 
                                download={`OM-${viewingOM.omNumber}.pdf`}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                                title="Baixar"
                            >
                                <Download size={20}/>
                            </a>
                        )}
                        <button onClick={() => setViewingOM(null)} className="p-2 bg-white/10 hover:bg-red-600 rounded-full transition-all"><X size={20}/></button>
                    </div>
                </div>
                <div className="flex-1 bg-gray-100 relative flex items-center justify-center">
                    {pdfBlobUrl ? (
                        <iframe src={pdfBlobUrl} className="w-full h-full border-none bg-white shadow-inner" title="Viewer" />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
                            <Info size={48} className="opacity-20" />
                            <span className="font-black text-xs uppercase tracking-widest">Carregando ou Documento não disponível</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
