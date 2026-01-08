import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { OMRecord } from '../types';
import { FileInput, Search, Plus, Trash2, Edit2, FileText, CheckCircle2, Loader2, Save, X } from 'lucide-react';
import { FeedbackModal } from '../components/FeedbackModal';
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do PDF.js Worker (mesma do Settings)
const pdfjs = (pdfjsLib as any).default || pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

export const OMManagement: React.FC = () => {
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

  useEffect(() => {
    loadOms();
    window.addEventListener('safemaint_storage_update', loadOms);
    return () => window.removeEventListener('safemaint_storage_update', loadOms);
  }, []);

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
    if (window.confirm("Tem certeza que deseja excluir esta OM?")) {
      await StorageService.deleteOM(id);
      loadOms();
    }
  };

  const handleSave = async () => {
    if (!currentOm.omNumber || !currentOm.tag) {
      alert("Número da OM e TAG são obrigatórios.");
      return;
    }

    setFeedbackText(isEditMode ? "ATUALIZANDO OM..." : "CADASTRANDO OM...");
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
      setFeedbackText(isEditMode ? "OM ATUALIZADA!" : "OM CADASTRADA!");
      
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

  const filteredOms = oms.filter(om => 
    om.omNumber.includes(searchQuery.toUpperCase()) || 
    om.tag.includes(searchQuery.toUpperCase()) ||
    om.description.includes(searchQuery.toUpperCase())
  );

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 animate-fadeIn">
      <FeedbackModal 
        isOpen={isProcessing || isSuccess} 
        isSuccess={isSuccess} 
        loadingText={feedbackText}
        successText={feedbackText}
      />

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-200 gap-4">
        <div className="flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-xl text-blue-600 border border-blue-100 shadow-sm">
                <FileInput size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-none">
                    Gestão de Ordens (OM)
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Biblioteca de Ordens de Manutenção
                </p>
            </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="BUSCAR OM, TAG..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-blue-500 transition-all"
                />
            </div>
            <button 
                onClick={() => handleOpenModal()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:shadow-blue-200 transition-all active:scale-95"
            >
                <Plus size={16}/> NOVA OM
            </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                          <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-wider">OM / Tipo</th>
                          <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-wider">Equipamento / Descrição</th>
                          <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-wider">Status / PDF</th>
                          <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-wider text-right">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredOms.length === 0 ? (
                          <tr>
                              <td colSpan={4} className="p-8 text-center text-gray-400 font-bold uppercase text-xs">
                                  Nenhuma ordem encontrada
                              </td>
                          </tr>
                      ) : (
                          filteredOms.map(om => (
                              <tr key={om.id} className="hover:bg-blue-50/50 transition-colors group">
                                  <td className="p-4">
                                      <div className="font-black text-sm text-gray-800">{om.omNumber}</div>
                                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase mt-1 inline-block ${om.type === 'CORRETIVA' ? 'bg-red-100 text-red-700' : om.type === 'DEMANDA' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                          {om.type}
                                      </span>
                                  </td>
                                  <td className="p-4">
                                      <div className="font-black text-xs text-blue-600 mb-0.5">{om.tag}</div>
                                      <div className="text-[10px] font-bold text-gray-500 uppercase max-w-md truncate" title={om.description}>
                                          {om.description}
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      <div className="flex flex-col gap-1 items-start">
                                          <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${om.status === 'CONCLUIDA' ? 'bg-green-50 text-green-700 border-green-200' : om.status === 'EM_ANDAMENTO' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                              {om.status.replace('_', ' ')}
                                          </span>
                                          {om.pdfUrl && om.pdfUrl !== 'TRUE' && (
                                              <span className="flex items-center gap-1 text-[9px] font-bold text-gray-400">
                                                  <FileText size={10} /> PDF ANEXADO
                                              </span>
                                          )}
                                      </div>
                                  </td>
                                  <td className="p-4 text-right">
                                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => handleOpenModal(om)} className="p-2 bg-gray-100 hover:bg-orange-100 text-gray-500 hover:text-orange-600 rounded-lg transition-colors">
                                              <Edit2 size={16} />
                                          </button>
                                          <button onClick={() => handleDelete(om.id)} className="p-2 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded-lg transition-colors">
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border-t-8 border-blue-600">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="font-black text-lg text-gray-800 uppercase flex items-center gap-2">
                          {isEditMode ? <Edit2 size={20} className="text-blue-600"/> : <Plus size={20} className="text-blue-600"/>}
                          {isEditMode ? 'Editar Ordem' : 'Nova Ordem'}
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
                          {isEditMode ? 'Salvar Alterações' : 'Cadastrar OM'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
