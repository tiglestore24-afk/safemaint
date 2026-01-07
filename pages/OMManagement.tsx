
import React, { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/storage';
import { OMRecord } from '../types';
import { 
  FileText, Plus, Search, Trash2, Edit2, 
  Save, X, CheckCircle2, Loader2, FileInput, 
  AlertTriangle, Filter, Database, Calendar, PlayCircle
} from 'lucide-react';
import { FeedbackModal } from '../components/FeedbackModal';
import { BackButton } from '../components/BackButton';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do PDF.js Worker
const pdfjs = (pdfjsLib as any).default || pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

export const OMManagement: React.FC = () => {
  const navigate = useNavigate();
  
  // Data States
  const [oms, setOms] = useState<OMRecord[]>([]);
  const [filteredOms, setFilteredOms] = useState<OMRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form Fields
  const [omNumber, setOmNumber] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'PREVENTIVA' | 'CORRETIVA' | 'DEMANDA'>('PREVENTIVA');
  const [pdfUrl, setPdfUrl] = useState('');
  const [launchDate, setLaunchDate] = useState(''); // Visual apenas, o save usa new Date()

  // Process States
  const [isExtracting, setIsExtracting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    loadData();
    window.addEventListener('safemaint_storage_update', loadData);
    return () => window.removeEventListener('safemaint_storage_update', loadData);
  }, []);

  useEffect(() => {
    const q = searchQuery.toUpperCase();
    setFilteredOms(oms.filter(o => 
      o.omNumber.includes(q) || 
      o.tag.includes(q) || 
      o.description.includes(q)
    ));
  }, [searchQuery, oms]);

  const loadData = () => {
    // Carrega OMs e remove as que já estão CONCLUIDAS
    const data = StorageService.getOMs().filter(o => o.status !== 'CONCLUIDA');
    // Ordena por data de criação (mais recente primeiro)
    data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setOms(data);
  };

  const resetForm = () => {
    setEditingId(null);
    setOmNumber('');
    setTag('');
    setDescription('');
    setType('PREVENTIVA');
    setPdfUrl('');
    setLaunchDate(new Date().toLocaleDateString('pt-BR'));
  };

  const handleOpenModal = (om?: OMRecord) => {
    if (om) {
      setEditingId(om.id);
      setOmNumber(om.omNumber);
      setTag(om.tag);
      setDescription(om.description);
      setType(om.type);
      setPdfUrl(om.pdfUrl || '');
      setLaunchDate(new Date(om.createdAt).toLocaleDateString('pt-BR'));
      setIsModalOpen(true);
    } else {
      resetForm();
      setIsModalOpen(true);
    }
  };

  const handleStartActivity = (om: OMRecord) => {
      if (om.type === 'PREVENTIVA') {
          // FLUXO DE ART ATIVIDADE (PADRÃO)
          const params = new URLSearchParams();
          params.append('om', om.omNumber);
          params.append('tag', om.tag);
          params.append('desc', om.description);
          params.append('omId', om.id);
          
          navigate(`/art-atividade?${params.toString()}`);
      } else {
          // FLUXO DE ART EMERGENCIAL (CORRETIVA / DEMANDA)
          navigate('/art-emergencial', {
              state: {
                  omId: om.id,
                  om: om.omNumber,
                  tag: om.tag,
                  description: om.description,
                  type: 'MECANICA', // Default, ajustável na tela
                  origin: om.type === 'DEMANDA' ? 'DEMANDA_EXTRA' : 'CORRETIVA'
              }
          });
      }
  };

  // --- LÓGICA INTELIGENTE DE LEITURA DE PDF ---
  const extractDataFromPdf = async (file: File) => {
    setIsExtracting(true);
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument(arrayBuffer).promise;
        let foundOm = ''; 
        let foundDesc = ''; 
        let foundTag = '';
        
        let fullText = '';
        const maxPages = Math.min(pdf.numPages, 3); // Lê apenas as 3 primeiras páginas para performance
        
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += ' ' + pageText;
        }
        
        // 1. EXTRAÇÃO DO NÚMERO DA OM
        const omRegex = /(?:OM|ORDEM|Nº|NUMERO)[:.\s]*(\d{8,12})/i;
        const omMatch = fullText.match(omRegex);
        if (omMatch) foundOm = omMatch[1];
        else { 
            const fallbackOm = fullText.match(/(\d{12})/); 
            if (fallbackOm) foundOm = fallbackOm[1]; 
        }
        
        // 2. EXTRAÇÃO DA DESCRIÇÃO
        const descRegex = /(?:DESCRIÇÃO|TEXTO BREVE)[:.\s]*(.*?)(?:OBSERVAÇÕES|NOTA|EQUIPAMENTO|LOCAL|PERMISSÕES|$)/i;
        const descMatch = fullText.match(descRegex);
        if (descMatch) foundDesc = descMatch[1].trim().replace(/_+/g, ' '); 

        // 3. EXTRAÇÃO DO TAG (PRIORIDADE: LOCAL DE INSTALAÇÃO + CA + 6 DÍGITOS)
        // Regex para encontrar "Local de Instalação" e capturar CA... (ex: CA123456)
        // O pattern \s\S abrange quebras de linha no contexto
        const localInstRegex = /(?:LOCAL DE INSTALAÇÃO|LOCAL INSTALAÇÃO|LOCAL)(?:[\s\S]{0,400}?)\b(CA-?\d{6})\b/i;
        const localMatch = fullText.match(localInstRegex);

        if (localMatch) {
            // Se encontrar no contexto do Local de Instalação, usa este com prioridade máxima
            foundTag = localMatch[1].toUpperCase().replace('-', ''); 
        } else {
            // Fallback 1: Tenta encontrar qualquer CA+6 dígitos no texto, mesmo sem contexto
            const genericCa6Regex = /\b(CA-?\d{6})\b/i;
            const genericMatch = fullText.match(genericCa6Regex);

            if (genericMatch) {
                foundTag = genericMatch[1].toUpperCase().replace('-', '');
            } else {
                // Fallback 2: Lógica antiga para CA5 ou outros formatos
                const ca5Regex = /\b(CA-?5\d{2,})\b/i;
                const ca5Match = fullText.match(ca5Regex);

                if (ca5Match) {
                    foundTag = ca5Match[1].toUpperCase().replace('-', '');
                } else {
                    // Último recurso: Tags genéricos
                    const labeledTagRegex = /(?:TAG|EQUIPAMENTO|ITEM TÉCNICO)[:.\s]*([A-Z0-9-]{5,})/i;
                    const genericTagRegex = /([A-Z]{3,4}-?[A-Z0-9]{2,}-?[A-Z0-9-]{3,})/i;

                    const labeledMatch = fullText.match(labeledTagRegex);
                    const genericMatch = fullText.match(genericTagRegex);

                    if (labeledMatch) foundTag = labeledMatch[1];
                    else if (genericMatch) foundTag = genericMatch[1];
                }
            }
        }

        // Aplica os valores encontrados
        if (foundOm) setOmNumber(foundOm);
        if (foundTag) setTag(foundTag);
        if (foundDesc) {
            setDescription(foundDesc);
            // Auto-detect type
            if (foundDesc.toUpperCase().includes('PREVENTIVA') || foundDesc.toUpperCase().includes('SISTEMÁTICA')) { 
                setType('PREVENTIVA'); 
            } else if (foundDesc.toUpperCase().includes('CORRETIVA') || foundDesc.toUpperCase().includes('FALHA')) { 
                setType('CORRETIVA'); 
            }
        }

    } catch (error) { 
        console.error("Erro no parser de PDF:", error); 
        alert("Erro ao ler o PDF. Tente preencher manualmente.");
    } finally { 
        setIsExtracting(false); 
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
        setPdfUrl(reader.result as string);
        await extractDataFromPdf(file);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!omNumber || !tag) {
        alert("Campos Obrigatórios: Número da OM e Tag.");
        return;
    }

    setFeedbackText(editingId ? "ATUALIZANDO ORDEM..." : "LANÇANDO NOVA ORDEM...");
    setIsProcessing(true);

    try {
        await new Promise(resolve => setTimeout(resolve, 800)); // UI Delay

        const record: OMRecord = {
            id: editingId || crypto.randomUUID(),
            omNumber,
            tag: tag.toUpperCase(),
            description: description.toUpperCase() || 'MANUTENÇÃO',
            type,
            status: editingId ? (oms.find(o => o.id === editingId)?.status || 'PENDENTE') : 'PENDENTE',
            // DATA DE LANÇAMENTO: Sempre a data atual se for novo, ou mantém a original se edição
            createdAt: editingId ? (oms.find(o => o.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
            pdfUrl,
            createdBy: localStorage.getItem('safemaint_user') || 'ADMIN'
        };

        await StorageService.saveOM(record);
        
        setIsProcessing(false);
        setIsSuccess(true);
        setTimeout(() => {
            setIsSuccess(false);
            setIsModalOpen(false);
            resetForm();
        }, 1500);

    } catch (error) {
        setIsProcessing(false);
        alert("Erro ao salvar ordem.");
    }
  };

  const handleDelete = async (id: string) => {
      if (confirm("Tem certeza que deseja excluir esta Ordem?")) {
          await StorageService.deleteOM(id);
      }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 animate-fadeIn">
      <FeedbackModal 
        isOpen={isProcessing || isSuccess} 
        isSuccess={isSuccess} 
        loadingText={feedbackText} 
        successText="OPERAÇÃO CONCLUÍDA!"
      />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-200 gap-4">
          <div className="flex items-center gap-3">
              <BackButton />
              <div className="bg-[#007e7a]/10 p-2 rounded-xl">
                  <FileInput size={28} className="text-[#007e7a]" />
              </div>
              <div>
                  <h2 className="text-2xl font-black text-gray-800 uppercase leading-none tracking-tighter">Gestão de Ordens</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Biblioteca de OMs & Planejamento</p>
              </div>
          </div>
          
          <button 
            onClick={() => handleOpenModal()} 
            className="flex items-center gap-2 bg-[#007e7a] hover:bg-[#00605d] text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 w-full md:w-auto justify-center"
          >
              <Plus size={16} /> NOVA ORDEM
          </button>
      </div>

      {/* SEARCH BAR */}
      <div className="relative mb-6">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="PESQUISAR POR NÚMERO, TAG OU DESCRIÇÃO..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl font-bold uppercase text-sm focus:border-[#007e7a] outline-none shadow-sm"
          />
      </div>

      {/* LISTA DE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOms.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                  <Database size={48} className="opacity-20 mb-3" />
                  <p className="font-bold text-sm uppercase">Nenhuma Ordem Pendente Encontrada</p>
              </div>
          ) : (
              filteredOms.map(om => (
                  <div key={om.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all group relative overflow-hidden flex flex-col">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${om.type === 'CORRETIVA' ? 'bg-red-500' : om.type === 'DEMANDA' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                      
                      <div className="flex justify-between items-start mb-2 pl-2">
                          <div>
                              <span className="text-[10px] font-black text-gray-400 uppercase block tracking-widest mb-0.5">NÚMERO OM</span>
                              <h3 className="text-lg font-black text-gray-800 leading-none">{om.omNumber}</h3>
                          </div>
                          <div className={`px-2 py-1 rounded text-[9px] font-black uppercase ${om.status === 'CONCLUIDA' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {om.status}
                          </div>
                      </div>

                      <div className="pl-2 mb-3 flex-1">
                          <span className="text-xl font-black text-[#007e7a] block">{om.tag}</span>
                          <p className="text-[10px] font-bold text-gray-500 uppercase line-clamp-2 mt-1 min-h-[30px]">{om.description}</p>
                      </div>

                      <div className="pl-2 mt-2 space-y-3">
                          <button 
                            onClick={() => handleStartActivity(om)}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-black text-[10px] uppercase transition-all shadow-sm active:scale-95 border ${om.type === 'PREVENTIVA' ? 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200' : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'}`}
                          >
                              {om.type === 'PREVENTIVA' ? <FileText size={14} /> : <AlertTriangle size={14} />} 
                              {om.type === 'PREVENTIVA' ? 'INICIAR ART ATIVIDADE' : 'INICIAR ART EMERGENCIAL'}
                          </button>

                          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                              <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400">
                                  <Calendar size={12}/> {new Date(om.createdAt).toLocaleDateString()}
                              </div>
                              <div className="flex gap-1">
                                  <button onClick={() => handleOpenModal(om)} className="p-2 hover:bg-orange-50 text-gray-400 hover:text-orange-500 rounded-lg transition-colors"><Edit2 size={16}/></button>
                                  <button onClick={() => handleDelete(om.id)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={16}/></button>
                              </div>
                          </div>
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* MODAL DE EDIÇÃO / CRIAÇÃO */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="text-lg font-black text-gray-800 uppercase flex items-center gap-2">
                              {editingId ? <Edit2 size={18}/> : <Plus size={18}/>}
                              {editingId ? 'Editar Ordem' : 'Nova Ordem de Manutenção'}
                          </h3>
                          <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Preenchimento automático via PDF disponível</p>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors border border-gray-200"><X size={20}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                      
                      {/* ÁREA DE UPLOAD */}
                      <div className="border-2 border-dashed border-[#007e7a] bg-teal-50/30 rounded-xl p-6 text-center relative group hover:bg-teal-50 transition-colors">
                          <input 
                              type="file" 
                              accept=".pdf" 
                              onChange={handlePdfUpload} 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          {isExtracting ? (
                              <div className="flex flex-col items-center animate-pulse">
                                  <Loader2 size={32} className="text-[#007e7a] animate-spin mb-2" />
                                  <span className="font-black text-xs text-[#007e7a] uppercase">PROCESSANDO DOCUMENTO...</span>
                              </div>
                          ) : pdfUrl ? (
                              <div className="flex flex-col items-center">
                                  <CheckCircle2 size={32} className="text-green-600 mb-2" />
                                  <span className="font-black text-xs text-green-700 uppercase">PDF ANEXADO E PROCESSADO</span>
                                  <span className="text-[9px] font-bold text-gray-400 mt-1">Clique para substituir</span>
                              </div>
                          ) : (
                              <div className="flex flex-col items-center text-[#007e7a]">
                                  <FileText size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                                  <span className="font-black text-xs uppercase">CLIQUE OU ARRASTE O PDF AQUI</span>
                                  <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Prioridade: Tags CA com 6 dígitos (Local de Instalação)</span>
                              </div>
                          )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Número OM</label>
                              <input 
                                  value={omNumber} 
                                  onChange={e => setOmNumber(e.target.value)} 
                                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 font-black text-sm uppercase focus:border-[#007e7a] outline-none"
                                  placeholder="00000000"
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Tag Equipamento</label>
                              <div className="relative">
                                  <input 
                                      value={tag} 
                                      onChange={e => setTag(e.target.value.toUpperCase())} 
                                      className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 font-black text-sm uppercase text-[#007e7a] focus:border-[#007e7a] outline-none"
                                      placeholder="CA..."
                                  />
                                  {tag.startsWith('CA') && <CheckCircle2 size={16} className="absolute right-3 top-3.5 text-green-500" />}
                              </div>
                          </div>
                      </div>

                      <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Tipo de Manutenção</label>
                          <div className="flex gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                              {['PREVENTIVA', 'CORRETIVA', 'DEMANDA'].map(t => (
                                  <button 
                                      key={t}
                                      onClick={() => setType(t as any)}
                                      className={`flex-1 py-2 rounded-md text-[10px] font-black uppercase transition-all ${type === t ? 'bg-white shadow text-[#007e7a]' : 'text-gray-400 hover:text-gray-600'}`}
                                  >
                                      {t}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Descrição do Serviço</label>
                          <textarea 
                              value={description} 
                              onChange={e => setDescription(e.target.value.toUpperCase())} 
                              className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 font-bold text-xs uppercase h-24 resize-none focus:border-[#007e7a] outline-none"
                              placeholder="DESCRIÇÃO DETALHADA..."
                          />
                      </div>
                  </div>

                  <div className="p-4 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
                      <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-xs uppercase text-gray-500 hover:bg-gray-200 transition-colors">Cancelar</button>
                      <button onClick={handleSave} className="px-8 py-3 rounded-xl font-black text-xs uppercase bg-[#007e7a] text-white hover:bg-[#00605d] shadow-lg flex items-center gap-2 active:scale-95 transition-all">
                          <Save size={16}/> {editingId ? 'Atualizar Dados' : 'Lançar Ordem'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
