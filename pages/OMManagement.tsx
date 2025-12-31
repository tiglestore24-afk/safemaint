
import React, { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/storage';
import { OMRecord, DocumentRecord } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  FileInput, PlayCircle, Trash2, Search, CalendarDays, User,
  Wrench, AlertOctagon, Clock, CheckCircle2, Eye, X, Info, FileText,
  StopCircle, Filter, SortDesc, SortAsc, XCircle, ListFilter, Plus, Save, Sparkles, Loader2, FileSearch, ArrowRight, Download
} from 'lucide-react';
import { BackButton } from '../components/BackButton';
import * as pdfjsLib from 'pdfjs-dist';

// Fix for "Cannot set properties of undefined (setting 'workerSrc')"
const pdfjs = (pdfjsLib as any).default || pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

export const OMManagement: React.FC = () => {
  const navigate = useNavigate();
  const [oms, setOms] = useState<OMRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'PENDENTE' | 'CONCLUIDA'>('PENDENTE');
  
  // --- STATE DOS FILTROS ---
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CORRETIVA' | 'PREVENTIVA'>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  
  // --- VIEW & MODAL STATE ---
  const [viewingOM, setViewingOM] = useState<OMRecord | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // --- NEW OM FORM STATE ---
  const [newOmNumber, setNewOmNumber] = useState('');
  const [newOmTag, setNewOmTag] = useState('');
  const [newOmDesc, setNewOmDesc] = useState('');
  const [newOmType, setNewOmType] = useState<'PREVENTIVA' | 'CORRETIVA'>('PREVENTIVA');
  const [newOmPdf, setNewOmPdf] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  
  const refreshData = useCallback(() => {
    const allOms = StorageService.getOMs();
    setOms(allOms);
  }, []);

  useEffect(() => {
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
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument(arrayBuffer).promise;
        let foundOm = ''; let foundDesc = ''; let foundTag = '';
        let fullText = '';
        const pagesToRead = Math.min(pdf.numPages, 2);
        
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

        const labeledTag = fullText.match(/(?:TAG|EQUIPAMENTO|ITEM TÉCNICO)[:\s]*([A-Z0-9-]{5,})/i);
        if (labeledTag) foundTag = labeledTag[1];
        else { const genericTag = fullText.match(/([A-Z]{3,4}-[A-Z0-9]{2,}-[A-Z0-9-]{3,})/i); if (genericTag) foundTag = genericTag[1]; }

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
        createdBy: user
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
                rawText: `REGISTRO DE ABERTURA DE OM.\nOM: ${newOmNumber}\nTAG: ${newOmTag}\nTIPO: ${newOmType}\nRESPONSÁVEL: ${user}`,
                manualFileUrl: newOmPdf,
                isManualUpload: true
            },
            signatures: []
        };
        await StorageService.saveDocument(docRecord);
    }
    
    setNewOmNumber(''); setNewOmTag(''); setNewOmDesc(''); setNewOmPdf(''); setIsAddModalOpen(false);
    refreshData();
    alert("OM Cadastrada e salva na Biblioteca!");
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

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col gap-3">
          {/* LINHA 1: Abas e Busca */}
          <div className="flex flex-col lg:flex-row gap-3 justify-between items-center w-full">
              <div className="flex bg-gray-100 p-1 rounded-lg w-full lg:w-auto gap-1">
                  <button onClick={() => setActiveTab('PENDENTE')} className={`flex-1 lg:flex-none px-6 py-2 rounded-lg font-bold text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'PENDENTE' ? 'bg-[#007e7a] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                    Carteira Ativa
                    <span className="bg-white/20 px-1.5 rounded text-[9px] ml-1">{oms.filter(o => o.status !== 'CONCLUIDA').length}</span>
                  </button>
                  <button onClick={() => setActiveTab('CONCLUIDA')} className={`flex-1 lg:flex-none px-6 py-2 rounded-lg font-bold text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'CONCLUIDA' ? 'bg-[#007e7a] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                    Histórico
                  </button>
              </div>
              
              <div className="relative w-full lg:flex-1 lg:max-w-md">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                  <input type="text" placeholder="BUSCAR OM, TAG..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value.toUpperCase())} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs font-bold uppercase outline-none focus:border-[#007e7a]" />
              </div>
          </div>

          {/* LINHA 2: Filtros Avançados */}
          <div className="flex flex-col md:flex-row gap-2 items-center w-full border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2 text-gray-400 mr-2 shrink-0">
                  <ListFilter size={14} /> <span className="text-[10px] font-bold uppercase hidden md:inline">Filtros:</span>
              </div>
              <div className="grid grid-cols-2 md:flex md:flex-row gap-2 w-full">
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="bg-gray-50 border border-gray-300 text-gray-600 font-bold text-[10px] rounded p-2 outline-none uppercase">
                      <option value="ALL">Todos Tipos</option>
                      <option value="CORRETIVA">Corretiva</option>
                      <option value="PREVENTIVA">Preventiva</option>
                  </select>
                  <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-600 font-bold text-[10px] rounded p-2 outline-none uppercase" />
                  <button onClick={() => setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')} className="bg-gray-50 border border-gray-300 text-gray-600 hover:bg-gray-100 rounded px-3 py-2 flex items-center justify-center gap-2 md:ml-auto">
                      {sortOrder === 'DESC' ? <SortDesc size={12}/> : <SortAsc size={12}/>}
                  </button>
                  {hasActiveFilters && (
                      <button onClick={clearFilters} className="bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 rounded px-3 py-2 flex items-center justify-center gap-1">
                          <XCircle size={12}/> <span className="text-[10px] font-bold uppercase">Limpar</span>
                      </button>
                  )}
              </div>
          </div>
      </div>

      {/* CARDS GRID (VISUAL MELHORADO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredOms.length === 0 && (
              <div className="col-span-full py-16 text-center text-gray-400">
                  <Info size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold uppercase text-sm tracking-widest">Nenhuma ordem encontrada</p>
              </div>
          )}

          {filteredOms.map((om) => {
            const isCritical = om.type === 'CORRETIVA';
            const isStarted = om.status === 'EM_ANDAMENTO';
            
            return (
                <div key={om.id} className={`group bg-white rounded-2xl shadow-sm border hover:shadow-lg transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${isCritical ? 'border-red-100' : 'border-gray-200'}`}>
                    
                    {/* Barra de Progresso (Se iniciada) */}
                    {isStarted && <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500 animate-pulse"></div>}
                    
                    {/* Header do Card */}
                    <div className="p-5 pb-3">
                        <div className="flex justify-between items-start mb-3">
                            <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1.5 ${isCritical ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                {isCritical ? <AlertOctagon size={10}/> : <Wrench size={10}/>}
                                {om.type}
                            </span>
                            {om.pdfUrl && (
                                <button onClick={() => setViewingOM(om)} className="text-gray-400 hover:text-vale-green transition-colors" title="Ver PDF Original">
                                    <FileText size={18}/>
                                </button>
                            )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-black text-gray-800 leading-none tracking-tight">{om.omNumber}</h3>
                            {isStarted && <span className="text-[9px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 animate-pulse">EM EXECUÇÃO</span>}
                        </div>
                        <p className="text-xs font-bold text-vale-green uppercase mt-1 tracking-wide">{om.tag}</p>
                    </div>

                    {/* Descrição */}
                    <div className="px-5 py-2 flex-1">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 h-full">
                            <p className="text-[10px] font-bold text-gray-500 uppercase line-clamp-3 leading-relaxed">
                                {om.description || "SEM DESCRIÇÃO DETALHADA."}
                            </p>
                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="p-5 pt-3 border-t border-gray-100 bg-gray-50/50">
                        <div className="flex justify-between text-[9px] font-bold text-gray-400 mb-3 uppercase tracking-wider">
                            <span className="flex items-center gap-1"><CalendarDays size={10}/> {new Date(om.createdAt).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><User size={10}/> {om.createdBy?.split(' ')[0] || 'SISTEMA'}</span>
                        </div>
                        
                        <div className="flex gap-2 items-center">
                            {om.status === 'CONCLUIDA' ? (
                                <div className="w-full py-3 rounded-xl bg-green-100 text-green-700 border border-green-200 text-[10px] font-black uppercase text-center flex items-center justify-center gap-2">
                                    <CheckCircle2 size={14}/> Encerrada
                                </div>
                            ) : (
                                <button 
                                    onClick={() => handleExecute(om)} 
                                    className={`flex-1 py-3 rounded-xl text-white text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all ${isCritical ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-[#007e7a] hover:bg-[#00605d] shadow-teal-200'}`}
                                >
                                    {isStarted ? <><StopCircle size={14}/> Continuar</> : <><PlayCircle size={14}/> Iniciar Atividade <ArrowRight size={12}/></>}
                                </button>
                            )}
                            <button 
                                onClick={() => { if(window.confirm('Excluir esta ordem?')) StorageService.deleteOM(om.id).then(refreshData) }} 
                                className="p-3 border border-gray-200 bg-white rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                                title="Excluir"
                            >
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    </div>
                </div>
            );
          })}
      </div>

      {/* MODAL CADASTRAR OM */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border-b-[6px] border-[#007e7a]">
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
                            <input value={newOmNumber} onChange={e => setNewOmNumber(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm font-black uppercase outline-none focus:border-[#007e7a] focus:ring-1 focus:ring-[#007e7a] transition-all" placeholder="000000" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Tag Equipamento</label>
                            <input value={newOmTag} onChange={e => setNewOmTag(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm font-black uppercase outline-none focus:border-[#007e7a] focus:ring-1 focus:ring-[#007e7a] text-[#007e7a] transition-all" placeholder="TAG-01" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Classificação</label>
                        <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
                            <button onClick={() => setNewOmType('PREVENTIVA')} className={`flex-1 py-2 text-[10px] font-black rounded-md uppercase transition-all ${newOmType === 'PREVENTIVA' ? 'bg-white shadow text-[#007e7a]' : 'text-gray-400 hover:text-gray-600'}`}>Preventiva</button>
                            <button onClick={() => setNewOmType('CORRETIVA')} className={`flex-1 py-2 text-[10px] font-black rounded-md uppercase transition-all ${newOmType === 'CORRETIVA' ? 'bg-white shadow text-red-600' : 'text-gray-400 hover:text-gray-600'}`}>Corretiva</button>
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Descrição</label>
                        <textarea value={newOmDesc} onChange={e => setNewOmDesc(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-bold uppercase outline-none h-24 resize-none focus:border-[#007e7a]" placeholder="DETALHES DA ATIVIDADE..." />
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
            <div className="w-full h-full max-w-5xl bg-white flex flex-col rounded-2xl overflow-hidden shadow-2xl">
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
