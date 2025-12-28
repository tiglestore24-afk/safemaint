
import React, { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/storage';
import { OMRecord, ScheduleItem } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  FileInput, PlayCircle, Trash2, 
  Loader2, Search, CalendarDays, PlusCircle, User,
  Wrench, AlertOctagon, CheckCircle2, Edit2, FileText, X,
  Activity, Lock, Filter, Link as LinkIcon, MapPin, History, ChevronDown, ChevronUp,
  Sparkles, ClipboardPaste, Clock
} from 'lucide-react';
import { BackButton } from '../components/BackButton';

// --- LOGIC FOR SMART EXTRACTION (AGRESSIVE CLEANUP) ---
const extractSmartData = (input: string) => {
    let text = input.toUpperCase().replace(/[\t\r\n]/g, ' ').trim();
    
    // 1. Detectar OM (Prioridade para padrões Vale: iniciados em 20... com 10-12 dígitos, ou genérico 8-12 dígitos)
    const omRegex = /\b(20\d{8,10})\b|\b(\d{8,12})\b/;
    const omMatch = text.match(omRegex);
    const extractedOm = omMatch ? omMatch[0] : '';

    // 2. Detectar TAG (Padrão: 2-3 Letras + 4-5 Números, ex: CA5309, TRP-1234)
    // Ignora palavras comuns como "DATA", "HORA", "PARA", "NOTA" para não confundir
    const tagRegex = /\b(?!DATA|HORA|PARA|ITEM|NOTA|DESC)([A-Z]{2,3}\s?-?\s?\d{4,5}[A-Z]?)\b/;
    const tagMatch = text.match(tagRegex);
    let extractedTag = tagMatch ? tagMatch[0].replace(/\s/g, '').replace(/-/g, '') : '';

    // 3. Detectar Descrição (LIMPEZA TOTAL DE OM E TAG)
    let description = text;

    // Remove o número da OM encontrado
    if (extractedOm) {
        description = description.replace(extractedOm, '');
    }

    // Remove o TAG encontrado (usa o match original para garantir remoção correta com espaços/hífens)
    if (tagMatch) {
        description = description.replace(tagMatch[0], '');
    }
    
    // Limpeza profunda de Labels e Caracteres soltos
    description = description
        .replace(/\bOM[:.]?\b/g, '')           // Remove "OM" ou "OM:"
        .replace(/\bNOTA[:.]?\b/g, '')         // Remove "NOTA"
        .replace(/\bTAG[:.]?\b/g, '')          // Remove "TAG"
        .replace(/\bEQUIPAMENTO[:.]?\b/g, '')  // Remove "EQUIPAMENTO"
        .replace(/\bDESCRIÇ[ÃA]O[:.]?\b/g, '') // Remove "DESCRIÇÃO"
        .replace(/\bDESC[:.]?\b/g, '')         // Remove "DESC"
        .replace(/[;|_]/g, ' ')                // Remove separadores pipe, ponto e virgula, underscore
        .replace(/\s\s+/g, ' ')                // Remove espaços duplos
        .trim();

    // Remove caracteres especiais ou numéricos soltos no início da frase (ex: "- Troc...", ": Troc...", "1. Troc...")
    description = description.replace(/^[^A-Z]+/, '');

    // Se a descrição ficou muito curta ou vazia (ex: só tinha OM e TAG), tenta fallback
    if (description.length < 3 && text.length > 20) {
        description = "MANUTENÇÃO GERAL (DADOS INSUFICIENTES)";
    }

    return { om: extractedOm, tag: extractedTag, desc: description.trim() };
};

export const OMManagement: React.FC = () => {
  const navigate = useNavigate();
  const [oms, setOms] = useState<OMRecord[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [activeTab, setActiveTab] = useState<'PENDENTE' | 'CONCLUIDA' | 'TODAS'>('PENDENTE');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CORRETIVA' | 'PREVENTIVA'>('ALL');
  const [dateFilter, setDateFilter] = useState(''); 
  
  // States para Edição
  const [editingOM, setEditingOM] = useState<OMRecord | null>(null);
  const [editTag, setEditTag] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editType, setEditType] = useState<'CORRETIVA' | 'PREVENTIVA'>('PREVENTIVA');

  // States para Criação
  const [isCreating, setIsCreating] = useState(false);
  const [newOmNumber, setNewOmNumber] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'CORRETIVA' | 'PREVENTIVA'>('PREVENTIVA');
  const [linkedScheduleId, setLinkedScheduleId] = useState('');
  const [omFile, setOmFile] = useState<File | null>(null);
  const [smartInput, setSmartInput] = useState(''); // Campo para colar texto inteligente
  
  // Controle de Visualização do Histórico
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  // Feedback
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const refreshData = useCallback(() => {
    setIsSyncing(true);
    const allOms = StorageService.getOMs();
    setOms(allOms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setScheduleItems(StorageService.getSchedule());
    setIsSyncing(false);
  }, []);

  useEffect(() => {
    refreshData();
    window.addEventListener('safemaint_storage_update', refreshData);
    return () => window.removeEventListener('safemaint_storage_update', refreshData);
  }, [refreshData]);

  const handleExecute = (om: OMRecord) => {
    if (om.status === 'CONCLUIDA') return;
    
    if (om.status === 'EM_ANDAMENTO') {
        navigate('/dashboard');
        return;
    }

    const route = om.type === 'CORRETIVA' ? '/art-emergencial' : '/art-atividade';
    navigate(route, { state: { omId: om.id, om: om.omNumber, tag: om.tag, description: om.description, type: om.type } });
  };

  const handleViewPDF = (pdfUrl: string) => {
    if(!pdfUrl) return;
    const win = window.open();
    if(win) {
        win.document.write(`<iframe src="${pdfUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
    }
  };

  const openEditModal = (om: OMRecord) => {
      if(om.status === 'CONCLUIDA') return;
      setEditingOM(om);
      setEditTag(om.tag);
      setEditDesc(om.description);
      setEditType(om.type);
  };

  const handleSaveEdit = async () => {
      if(!editingOM) return;
      
      if (!editTag.trim().toUpperCase().startsWith('CA')) {
          alert("ERRO: O TAG DO EQUIPAMENTO DEVE COMEÇAR COM 'CA'.");
          return;
      }

      const updatedOM = { ...editingOM, tag: editTag.toUpperCase(), description: editDesc, type: editType };
      await StorageService.saveOM(updatedOM); 
      
      setEditingOM(null);
      showFeedback('OM Atualizada com Sucesso!', 'success');
      refreshData();
  };

  // --- SMART EXTRACTION HANDLERS ---

  const handleSmartPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setSmartInput(text);
      if (!text) return;

      const extracted = extractSmartData(text);
      
      if (extracted.om) setNewOmNumber(extracted.om);
      if (extracted.tag) setNewTag(extracted.tag);
      if (extracted.desc) setNewDesc(extracted.desc);
      
      // Auto-detect type based on keywords
      if (text.toUpperCase().includes('CORRETIVA') || text.toUpperCase().includes('QUEBRA') || text.toUpperCase().includes('PARADA')) {
          setNewType('CORRETIVA');
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setOmFile(file);
          
          // Smart extract from Filename
          const extracted = extractSmartData(file.name);
          if (extracted.om) setNewOmNumber(extracted.om);
          if (extracted.tag) setNewTag(extracted.tag);
          // If filename doesn't have good desc, keep existing or filename without extension
          // Removing .PDF extension
          const cleanDesc = extracted.desc.replace('.PDF', '').trim();
          if (cleanDesc.length > 3) setNewDesc(cleanDesc);
          
          showFeedback('Dados extraídos do nome do arquivo!', 'success');
      }
  };

  const handleLinkSchedule = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      setLinkedScheduleId(id);
      
      if (!id) return;

      const item = scheduleItems.find(s => s.id === id);
      if (item) {
          // Use smart extraction on schedule text too
          const extracted = extractSmartData(item.frotaOm + ' ' + item.description);
          if (extracted.tag) setNewTag(extracted.tag);
          if (extracted.om) setNewOmNumber(extracted.om);
          // For schedule linking, we usually prefer the schedule's description as is, 
          // or we can clean it. Let's clean it to be consistent.
          if (extracted.desc) setNewDesc(extracted.desc);
          else setNewDesc(item.description || '');
      }
  };

  const handleCreateOM = async () => {
      if (!newOmNumber || !newTag || !newDesc) {
          alert("PREENCHA TODOS OS CAMPOS OBRIGATÓRIOS.");
          return;
      }

      if (!newTag.trim().toUpperCase().startsWith('CA')) {
          alert("ERRO: O TAG DO EQUIPAMENTO DEVE COMEÇAR COM 'CA'.");
          return;
      }

      let pdfBase64: string | undefined = undefined;
      if (omFile) {
          try {
              const reader = new FileReader();
              reader.readAsDataURL(omFile);
              await new Promise(resolve => reader.onload = resolve);
              pdfBase64 = reader.result as string;
          } catch(e) {}
      }

      const newOM: OMRecord = {
          id: crypto.randomUUID(),
          omNumber: newOmNumber,
          tag: newTag.toUpperCase(),
          description: newDesc,
          type: newType,
          status: 'PENDENTE',
          createdAt: new Date().toISOString(),
          createdBy: localStorage.getItem('safemaint_user') || 'ADMIN',
          linkedScheduleId: linkedScheduleId || undefined,
          pdfUrl: pdfBase64
      };

      await StorageService.saveOM(newOM);
      
      setIsCreating(false);
      resetCreateForm();
      showFeedback('OM Criada com Sucesso!', 'success');
      refreshData();
  };

  const resetCreateForm = () => {
      setNewOmNumber('');
      setNewTag('');
      setNewDesc('');
      setNewType('PREVENTIVA');
      setLinkedScheduleId('');
      setOmFile(null);
      setSmartInput('');
  };

  const showFeedback = (msg: string, type: 'success' | 'error') => {
      setShowToast({message: msg, type});
      setTimeout(() => setShowToast(null), 3000);
  };

  const toggleHistory = (omId: string) => {
      if (expandedHistory === omId) {
          setExpandedHistory(null);
      } else {
          setExpandedHistory(omId);
      }
  };

  const filteredOms = oms.filter(o => {
      // Filtros existentes
      let tabMatch = true;
      if (activeTab === 'PENDENTE') tabMatch = o.status !== 'CONCLUIDA';
      if (activeTab === 'CONCLUIDA') tabMatch = o.status === 'CONCLUIDA';
      const searchMatch = searchQuery === '' || o.omNumber.includes(searchQuery) || o.tag.includes(searchQuery.toUpperCase());
      const typeMatch = typeFilter === 'ALL' || o.type === typeFilter;
      const dateMatch = dateFilter === '' || o.createdAt.startsWith(dateFilter);
      return tabMatch && searchMatch && typeMatch && dateMatch;
  });

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-fadeIn pb-20 relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-vale-green pb-6">
        <div className="flex items-center gap-4">
            <BackButton />
            <div>
                <h2 className="text-3xl font-black text-vale-darkgray flex items-center gap-3 uppercase tracking-tighter">
                    <div className="bg-vale-green text-white p-2 rounded-xl shadow-lg">
                        <FileInput size={32} />
                    </div>
                    Gestão de Ordens
                </h2>
                <div className="flex items-center gap-3 mt-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Fila de execução e priorização técnica</p>
                    {isSyncing && <Loader2 size={16} className="animate-spin text-vale-green" />}
                </div>
            </div>
        </div>
        <button onClick={() => setIsCreating(true)} className="bg-vale-darkgray text-white px-6 py-4 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-vale-black transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 uppercase tracking-widest border border-gray-600">
            <PlusCircle size={18} /> Cadastrar Nova OM
        </button>
      </div>

      {/* CONTROLS & FILTERS */}
      <div className="bg-white p-4 rounded-3xl shadow-lg border border-gray-100 flex flex-col xl:flex-row gap-4 justify-between items-center sticky top-4 z-30">
          
          {/* Tabs de Status */}
          <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full xl:w-auto overflow-x-auto">
              <button 
                onClick={() => setActiveTab('PENDENTE')} 
                className={`flex-1 xl:flex-none px-6 py-3 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'PENDENTE' ? 'bg-vale-green text-white shadow-md' : 'text-gray-500 hover:text-vale-darkgray hover:bg-gray-200'}`}
              >
                  <Clock size={16} /> Ativas ({oms.filter(o => o.status !== 'CONCLUIDA').length})
              </button>
              <button 
                onClick={() => setActiveTab('CONCLUIDA')} 
                className={`flex-1 xl:flex-none px-6 py-3 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'CONCLUIDA' ? 'bg-vale-green text-white shadow-md' : 'text-gray-500 hover:text-vale-darkgray hover:bg-gray-200'}`}
              >
                  <CheckCircle2 size={16} /> Finalizadas
              </button>
              <button 
                onClick={() => setActiveTab('TODAS')} 
                className={`flex-1 xl:flex-none px-6 py-3 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'TODAS' ? 'bg-vale-green text-white shadow-md' : 'text-gray-500 hover:text-vale-darkgray hover:bg-gray-200'}`}
              >
                  <FileText size={16} /> Todas
              </button>
          </div>

          {/* Filtros Dinâmicos */}
          <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
              <div className="flex-1 relative group min-w-[250px]">
                  <Search className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-vale-green transition-colors" size={20} />
                  <input 
                      type="text" 
                      placeholder="BUSCAR OM / TAG..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-vale-green rounded-2xl text-sm font-bold uppercase outline-none transition-all"
                  />
              </div>

              <div className="flex gap-3">
                  <div className="relative">
                      <select 
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value as any)}
                          className="h-full bg-gray-50 border-2 border-transparent pl-4 pr-10 py-3.5 rounded-2xl text-xs font-black uppercase outline-none focus:border-vale-green focus:bg-white cursor-pointer appearance-none min-w-[140px]"
                      >
                          <option value="ALL">TODOS TIPOS</option>
                          <option value="CORRETIVA">🚨 CORRETIVA</option>
                          <option value="PREVENTIVA">📅 PREVENTIVA</option>
                      </select>
                      <Filter size={14} className="absolute right-3 top-4 text-gray-400 pointer-events-none" />
                  </div>

                  <div className="relative">
                      <input 
                          type="date"
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value)}
                          className="h-full bg-gray-50 border-2 border-transparent px-4 py-3.5 rounded-2xl text-xs font-black uppercase outline-none focus:border-vale-green focus:bg-white cursor-pointer"
                      />
                  </div>
              </div>
          </div>
      </div>

      {/* CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredOms.length === 0 && (
              <div className="col-span-full py-32 text-center bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-200 flex flex-col items-center justify-center opacity-60">
                  <Search size={64} className="mb-6 text-gray-300" />
                  <h3 className="text-2xl font-black text-gray-400 uppercase tracking-widest">Nenhuma Ordem Encontrada</h3>
                  <p className="text-gray-400 font-bold mt-2">Tente ajustar os filtros de busca ou data</p>
              </div>
          )}

          {filteredOms.map((om) => {
              const isUrgent = om.type === 'CORRETIVA';
              const isRunning = om.status === 'EM_ANDAMENTO';
              const isFinished = om.status === 'CONCLUIDA';
              const hasHistory = om.maintenanceHistory && om.maintenanceHistory.length > 0;
              const isHistoryOpen = expandedHistory === om.id;

              let cardBorderClass = isUrgent ? 'border-l-red-500' : 'border-l-vale-blue';
              let cardBgClass = 'bg-white';
              let badgeClass = isUrgent ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100';
              let statusBadge = null;

              if (isRunning) {
                  cardBorderClass = 'border-l-green-500 ring-4 ring-green-50';
                  cardBgClass = 'bg-green-50/50';
                  statusBadge = (
                      <span className="absolute -top-3 right-6 bg-green-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                          <Activity size={12} /> EM ANDAMENTO
                      </span>
                  );
              } else if (isFinished) {
                  cardBorderClass = 'border-l-gray-400 opacity-80 grayscale-[0.8] hover:grayscale-0';
                  cardBgClass = 'bg-gray-100';
                  statusBadge = (
                      <span className="absolute -top-3 right-6 bg-gray-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                          <Lock size={12} /> FINALIZADA
                      </span>
                  );
              }

              return (
                <div 
                    key={om.id} 
                    className={`
                        relative rounded-[2rem] p-6 shadow-xl border-2 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group
                        border-gray-100 border-l-[12px]
                        ${cardBorderClass} ${cardBgClass}
                    `}
                >
                    {statusBadge}

                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border mb-3 ${badgeClass}`}>
                                {isUrgent ? <AlertOctagon size={12}/> : <Wrench size={12}/>}
                                {om.type}
                            </span>
                            <div className="flex items-center gap-2">
                                <h3 className="text-3xl font-black text-vale-blue leading-none tracking-tight">
                                    {om.omNumber}
                                </h3>
                                {!isFinished && (
                                    <button onClick={() => openEditModal(om)} className="text-gray-300 hover:text-blue-500 transition-colors p-1"><Edit2 size={16}/></button>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 mt-4">
                            <div className="bg-white/80 px-4 py-2 rounded-xl text-center min-w-[80px] shadow-sm border border-gray-100">
                                <span className="block text-[9px] font-bold text-gray-400 uppercase">Tag</span>
                                <span className="block text-xl font-black text-vale-green uppercase">{om.tag}</span>
                            </div>
                            {om.pdfUrl && (
                                <button onClick={() => handleViewPDF(om.pdfUrl!)} className="bg-white text-red-600 px-3 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 hover:bg-red-50 border border-red-100 shadow-sm">
                                    <FileText size={12}/> PDF
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-white/60 rounded-2xl p-5 mb-4 min-h-[80px] border border-gray-100/50 shadow-inner">
                        <p className="text-xs font-bold text-gray-600 uppercase leading-relaxed line-clamp-3">
                            {om.description}
                        </p>
                    </div>

                    {om.installationLocation && (
                        <div className="flex items-start gap-2 mb-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-gray-600">
                            <MapPin size={16} className="mt-0.5 shrink-0 text-vale-blue" />
                            <div>
                                <span className="block text-[9px] font-black text-blue-400 uppercase mb-0.5">LOCAL DE INSTALAÇÃO</span>
                                <p className="text-[10px] font-bold uppercase leading-tight line-clamp-2" title={om.installationLocation}>
                                    {om.installationLocation}
                                </p>
                            </div>
                        </div>
                    )}

                    {hasHistory && (
                        <div className="mb-4 bg-white/80 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                            <button 
                                onClick={() => toggleHistory(om.id)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-[10px] font-black text-gray-500 uppercase transition-colors border-b border-gray-100"
                            >
                                <span className="flex items-center gap-2 text-vale-darkgray"><History size={14} className="text-vale-green"/> Histórico de Manutenção ({om.maintenanceHistory?.length})</span>
                                {isHistoryOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                            </button>
                            
                            {isHistoryOpen && (
                                <div className="max-h-48 overflow-y-auto custom-scrollbar bg-white p-2">
                                    <table className="w-full text-[9px]">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-2 py-2 text-left font-black text-gray-400 border-b border-gray-200">DATA</th>
                                                <th className="px-2 py-2 text-left font-black text-gray-400 border-b border-gray-200">TIPO</th>
                                                <th className="px-2 py-2 text-left font-black text-gray-400 border-b border-gray-200">DESCRIÇÃO</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {om.maintenanceHistory?.map((h, i) => (
                                                <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                                                    <td className="px-2 py-2 font-mono font-bold text-gray-500 whitespace-nowrap align-top">{h.date}</td>
                                                    <td className="px-2 py-2 font-bold text-blue-600 align-top">{h.type}</td>
                                                    <td className="px-2 py-2 font-bold text-gray-700 align-top" title={h.description}>{h.description}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase mb-6 pl-1">
                        <span className="flex items-center gap-1.5"><CalendarDays size={14}/> {new Date(om.createdAt).toLocaleDateString()}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span className="flex items-center gap-1.5"><User size={14}/> {om.createdBy}</span>
                    </div>

                    <div className="flex gap-3">
                        {isFinished ? (
                            <button disabled className="flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 bg-gray-300 text-gray-500 cursor-not-allowed border-2 border-gray-300">
                                <Lock size={18} /> ENCERRADA
                            </button>
                        ) : isRunning ? (
                            <button onClick={() => handleExecute(om)} className="flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 bg-green-100 text-green-700 hover:bg-green-200 border-2 border-green-300 shadow-sm transition-all">
                                <Activity size={18} className="animate-pulse"/> VER NO PAINEL
                            </button>
                        ) : (
                            <button onClick={() => handleExecute(om)} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 border-b-4 ${isUrgent ? 'bg-red-600 text-white hover:bg-red-700 border-red-800' : 'bg-vale-green text-white hover:bg-vale-green/90 border-[#00605d]'}`}>
                                <PlayCircle size={18} /> INICIAR
                            </button>
                        )}
                        {!isFinished && (
                            <button onClick={() => { if(window.confirm('Excluir OM?')) { StorageService.deleteOM(om.id); refreshData(); } }} className="px-4 rounded-xl border-2 border-gray-200 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-all" title="Excluir">
                                <Trash2 size={20} />
                            </button>
                        )}
                    </div>
                </div>
              );
          })}
      </div>

      {/* MODAL DE CRIAÇÃO OTIMIZADO */}
      {isCreating && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-2xl w-full max-w-2xl p-0 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-gray-100 p-4 flex justify-between items-center border-b border-gray-200">
                      <h3 className="font-black text-lg text-gray-800 flex items-center gap-2">
                          <PlusCircle size={20} className="text-vale-green"/> CADASTRAR NOVA OM
                      </h3>
                      <button onClick={() => {setIsCreating(false); resetCreateForm();}}><X size={24} className="text-gray-400 hover:text-red-500"/></button>
                  </div>
                  
                  <div className="overflow-y-auto p-6 space-y-6">
                      
                      {/* ÁREA DE EXTRAÇÃO INTELIGENTE */}
                      <div className="bg-blue-50 border-2 border-blue-200 border-dashed rounded-xl p-6 relative group transition-all hover:bg-blue-100/50">
                          <div className="flex flex-col items-center text-center gap-2 mb-4">
                              <Sparkles size={32} className="text-blue-500 animate-pulse" />
                              <h4 className="font-black text-blue-800 text-sm uppercase">Extração Inteligente</h4>
                              <p className="text-[10px] font-bold text-blue-600 uppercase max-w-xs">
                                  Arraste um PDF ou Cole (Ctrl+V) o texto do SAP/E-mail aqui para preencher automaticamente.
                              </p>
                          </div>
                          
                          <div className="relative">
                              <textarea 
                                  value={smartInput}
                                  onChange={handleSmartPaste}
                                  placeholder="COLE O TEXTO AQUI..."
                                  className="w-full bg-white border-2 border-blue-200 rounded-lg p-3 text-xs font-bold text-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none h-20 resize-none uppercase"
                              />
                              <div className="absolute bottom-3 right-3 text-blue-300 pointer-events-none">
                                  <ClipboardPaste size={16} />
                              </div>
                          </div>

                          <div className="mt-4 flex items-center justify-center">
                              <label className="cursor-pointer bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg font-black text-[10px] hover:bg-blue-50 flex items-center gap-2 shadow-sm transition-all uppercase">
                                  <FileText size={14} /> 
                                  {omFile ? 'ARQUIVO SELECIONADO!' : 'SELECIONAR PDF (LÊ NOME)'}
                                  <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
                              </label>
                          </div>
                      </div>

                      <div className="border-t border-gray-200 pt-4">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">NÚMERO DA OM</label>
                                  <input value={newOmNumber} onChange={e => setNewOmNumber(e.target.value.toUpperCase())} className="w-full border-2 border-gray-300 rounded-lg p-3 font-black text-lg uppercase focus:border-vale-green outline-none" placeholder="000000" />
                              </div>
                              <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">TAG / EQUIPAMENTO</label>
                                  <input value={newTag} onChange={e => setNewTag(e.target.value.toUpperCase())} className="w-full border-2 border-gray-300 rounded-lg p-3 font-black text-lg uppercase focus:border-vale-green outline-none" placeholder="CA..." />
                              </div>
                          </div>

                          <div className="mb-4">
                              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">DESCRIÇÃO TÉCNICA</label>
                              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value.toUpperCase())} className="w-full border-2 border-gray-300 rounded-lg p-3 font-bold text-sm uppercase h-24 focus:border-vale-green outline-none" placeholder="DESCREVA O SERVIÇO..."/>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">TIPO</label>
                                  <select value={newType} onChange={e => setNewType(e.target.value as any)} className="w-full border-2 border-gray-300 rounded-lg p-3 font-bold text-xs uppercase">
                                      <option value="PREVENTIVA">PREVENTIVA</option>
                                      <option value="CORRETIVA">CORRETIVA</option>
                                  </select>
                              </div>
                              
                              {newType === 'PREVENTIVA' && (
                                  <div>
                                      <label className="text-[10px] font-black text-blue-400 uppercase mb-1 block flex items-center gap-1"><LinkIcon size={10}/> VINCULAR PROGRAMAÇÃO</label>
                                      <select value={linkedScheduleId} onChange={handleLinkSchedule} className="w-full border-2 border-blue-200 rounded-lg p-3 font-bold text-xs uppercase bg-blue-50 text-blue-900 focus:outline-none">
                                          <option value="">-- SELECIONAR --</option>
                                          {scheduleItems.map(s => (
                                              <option key={s.id} value={s.id}>{s.frotaOm.split('\n')[0]} - {s.description.substring(0, 20)}...</option>
                                          ))}
                                      </select>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-200">
                      <button onClick={handleCreateOM} className="w-full bg-vale-green text-white font-black py-4 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg flex items-center justify-center gap-2">
                          <CheckCircle2 size={20}/> CONFIRMAR CADASTRO
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {editingOM && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-lg text-gray-800">EDITAR OM {editingOM.omNumber}</h3>
                      <button onClick={() => setEditingOM(null)}><X size={24} className="text-gray-400 hover:text-red-500"/></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-black text-gray-500 uppercase">TAG / EQUIPAMENTO</label>
                          <input value={editTag} onChange={e => setEditTag(e.target.value)} className="w-full border-2 border-gray-300 rounded p-3 font-bold uppercase"/>
                      </div>
                      <div>
                          <label className="text-xs font-black text-gray-500 uppercase">DESCRIÇÃO</label>
                          <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full border-2 border-gray-300 rounded p-3 font-bold uppercase h-24"/>
                      </div>
                      <div>
                          <label className="text-xs font-black text-gray-500 uppercase">TIPO</label>
                          <select value={editType} onChange={e => setEditType(e.target.value as any)} className="w-full border-2 border-gray-300 rounded p-3 font-bold uppercase">
                              <option value="PREVENTIVA">PREVENTIVA</option>
                              <option value="CORRETIVA">CORRETIVA</option>
                          </select>
                      </div>
                      <button onClick={handleSaveEdit} className="w-full bg-vale-green text-white font-black py-4 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg mt-4">
                          SALVAR ALTERAÇÕES
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* TOAST FEEDBACK */}
      {showToast && (
          <div className={`fixed bottom-10 right-10 px-6 py-4 rounded-xl shadow-2xl text-white font-black uppercase text-xs flex items-center gap-3 animate-fade-in-up z-50 ${showToast.type === 'success' ? 'bg-vale-green' : 'bg-red-500'}`}>
              <CheckCircle2 size={20} /> {showToast.message}
          </div>
      )}
    </div>
  );
};
