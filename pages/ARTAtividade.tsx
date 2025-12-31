
import React, { useState, useEffect } from 'react';
import { CommonHeader } from '../components/CommonHeader';
import { SignatureSection } from '../components/SignatureSection';
import { StorageService } from '../services/storage';
import { HeaderData, DocumentRecord, RegisteredART, SignatureRecord, ActiveMaintenance } from '../types';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { FileText, Eye, CheckCircle, X, ShieldCheck, Save, Download, ShieldAlert, ArrowRight, BookOpen, Loader2 } from 'lucide-react';
import { BackButton } from '../components/BackButton';

export const ARTAtividade: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const [header, setHeader] = useState<HeaderData>({
    om: '', tag: '', date: new Date().toISOString().split('T')[0], time: '', type: 'MECANICA', description: ''
  });
  
  const [omId, setOmId] = useState<string | undefined>(undefined);
  const [registeredARTs, setRegisteredARTs] = useState<RegisteredART[]>([]);
  const [selectedART, setSelectedART] = useState<RegisteredART | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false); 
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  
  // Feedback States
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setRegisteredARTs(StorageService.getARTs());
    
    if (location.state) {
        const stateData = location.state as any;
        setHeader(prev => ({ ...prev, ...stateData }));
        if (stateData.omId) setOmId(stateData.omId);
    } else {
        const paramOm = searchParams.get('om');
        const paramTag = searchParams.get('tag');
        const paramDesc = searchParams.get('desc');
        const now = new Date();
        setHeader(prev => ({
            ...prev,
            om: paramOm || '',
            tag: paramTag || '',
            description: paramDesc || '',
            time: now.toTimeString().slice(0,5)
        }));
    }
  }, [searchParams, location]);

  useEffect(() => {
      if (selectedART?.pdfUrl && showPreviewModal) {
          try {
              if (selectedART.pdfUrl.startsWith('data:application/pdf;base64,')) {
                  const byteCharacters = atob(selectedART.pdfUrl.split(',')[1]);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], { type: 'application/pdf' });
                  const url = URL.createObjectURL(blob);
                  setPdfBlobUrl(url);
                  return () => URL.revokeObjectURL(url);
              } else {
                  setPdfBlobUrl(selectedART.pdfUrl);
              }
          } catch (e) {
              setPdfBlobUrl(selectedART.pdfUrl);
          }
      } else {
          setPdfBlobUrl(null);
      }
  }, [selectedART, showPreviewModal]);

  const handleARTSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const art = registeredARTs.find(a => a.id === e.target.value);
    setSelectedART(art || null);
    setIsConfirmed(false); 
  };

  const handleConfirmOriginal = () => {
      setIsConfirmed(true);
      setShowPreviewModal(false);
  };

  const handleSave = async () => {
    if(!selectedART || !isConfirmed || signatures.length === 0) {
        alert("POR FAVOR, SELECIONE O PROCEDIMENTO, LEIA O PDF ORIGINAL E COLETE AS ASSINATURAS.");
        return;
    }

    setIsSaving(true);

    // Simulate minimal delay for UX
    await new Promise(resolve => setTimeout(resolve, 800));

    const artId = crypto.randomUUID();
    const doc: DocumentRecord = {
      id: artId,
      type: 'ART_ATIVIDADE',
      header,
      createdAt: new Date().toISOString(),
      status: 'RASCUNHO',
      content: { 
          artId: selectedART.id, 
          artNumber: selectedART.code, 
          artName: selectedART.taskName,
          manualFileUrl: selectedART.pdfUrl // CRUCIAL: Salva o PDF Original da ART no Documento
      },
      signatures
    };
    await StorageService.saveDocument(doc);
    
    const nowIso = new Date().toISOString();
    await StorageService.startMaintenance({
        id: crypto.randomUUID(),
        omId: omId,
        header,
        startTime: nowIso,
        artId: artId,
        artType: 'ART_ATIVIDADE',
        origin: 'PREVENTIVA',
        status: 'ANDAMENTO',
        currentSessionStart: nowIso,
        openedBy: localStorage.getItem('safemaint_user') || 'ANONIMO'
    });
    
    setSaveSuccess(true);
    setTimeout(() => {
        navigate('/dashboard');
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto pb-32 px-4 relative animate-fadeIn">
      {/* Title Bar */}
      <div className="flex items-center gap-4 mb-8 border-b border-gray-200 pb-6 pt-6">
        <BackButton />
        <div>
            <h2 className="text-2xl font-black text-vale-darkgray uppercase tracking-tighter leading-none flex items-center gap-2">
                <FileText className="text-vale-blue" size={24} />
                Liberação de Atividade (ART)
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 ml-1">Procedimento Padrão & Permissão de Trabalho</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN - MAIN CONTENT */}
          <div className="xl:col-span-8 space-y-8">
              
              {/* STEP 1: IDENTIFICATION */}
              <section className="relative">
                  <div className="absolute -left-3 top-6 bottom-0 w-0.5 bg-gray-200 hidden md:block"></div>
                  <div className="flex items-center gap-3 mb-4">
                      <div className="bg-vale-dark text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 z-10">1</div>
                      <h3 className="font-black text-gray-700 uppercase tracking-tight">Identificação da Tarefa</h3>
                  </div>
                  <div className="md:pl-8">
                      <CommonHeader data={header} onChange={setHeader} title="Dados da Ordem de Manutenção" />
                  </div>
              </section>

              {/* STEP 2: PROCEDURE SELECTION & VALIDATION */}
              <section className="relative">
                  <div className="absolute -left-3 top-6 bottom-0 w-0.5 bg-gray-200 hidden md:block"></div>
                  <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 z-10 transition-colors ${isConfirmed ? 'bg-green-600 text-white' : 'bg-vale-dark text-white'}`}>2</div>
                      <h3 className="font-black text-gray-700 uppercase tracking-tight">Procedimento & Segurança</h3>
                  </div>
                  
                  <div className="md:pl-8">
                      <div className={`bg-white rounded-[2rem] shadow-lg border-2 overflow-hidden transition-all ${isConfirmed ? 'border-green-500' : 'border-gray-100'}`}>
                          {/* Header do Card */}
                          <div className={`p-6 border-b flex justify-between items-center ${isConfirmed ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                              <div className="flex items-center gap-3">
                                  <BookOpen size={20} className={isConfirmed ? 'text-green-600' : 'text-gray-400'} />
                                  <div>
                                      <h4 className="font-black text-sm uppercase text-gray-700">Biblioteca de ARTs</h4>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase">Selecione o procedimento padrão aplicável</p>
                                  </div>
                              </div>
                              {isConfirmed && <div className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-[10px] font-black uppercase flex items-center gap-1"><CheckCircle size={12}/> Validado</div>}
                          </div>

                          <div className="p-6 md:p-8 space-y-6">
                              {/* Selection Dropdown */}
                              <div>
                                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Pesquisar Procedimento (ART)</label>
                                  <div className="relative">
                                      <select 
                                        className="w-full border-2 border-gray-200 p-4 rounded-xl bg-white font-bold text-gray-800 outline-none uppercase focus:border-vale-blue focus:ring-4 focus:ring-blue-50 transition-all appearance-none text-sm"
                                        onChange={handleARTSelect} 
                                        value={selectedART?.id || ''}
                                        disabled={isConfirmed}
                                      >
                                          <option value="">-- SELECIONE NA LISTA --</option>
                                          {registeredARTs.map(art => <option key={art.id} value={art.id}>[{art.code}] {art.taskName}</option>)}
                                      </select>
                                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                          <ArrowRight size={16} />
                                      </div>
                                  </div>
                              </div>

                              {/* Selected Context */}
                              {selectedART && (
                                  <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 animate-fadeIn">
                                      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                                          <div>
                                              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Procedimento Selecionado</span>
                                              <p className="text-lg font-black text-gray-800 uppercase leading-tight">{selectedART.taskName}</p>
                                              <p className="text-xs font-bold text-gray-500 uppercase mt-1">Código: {selectedART.code}</p>
                                          </div>

                                          <button 
                                            onClick={() => setShowPreviewModal(true)} 
                                            className={`
                                                group relative px-6 py-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-3 transition-all shadow-md active:scale-95 whitespace-nowrap
                                                ${isConfirmed 
                                                    ? 'bg-white border-2 border-green-500 text-green-600 hover:bg-green-50' 
                                                    : 'bg-vale-blue text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200'}
                                            `}
                                          >
                                              {isConfirmed ? (
                                                  <>
                                                    <CheckCircle size={18} />
                                                    Leitura Confirmada
                                                  </>
                                              ) : (
                                                  <>
                                                    <Eye size={18} />
                                                    Ler e Validar PDF
                                                  </>
                                              )}
                                              {!isConfirmed && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>}
                                          </button>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              </section>

              {/* STEP 3: SIGNATURES */}
              {isConfirmed && (
                  <section className="relative animate-fadeIn">
                      <div className="flex items-center gap-3 mb-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 z-10 ${signatures.length > 0 ? 'bg-green-600 text-white' : 'bg-vale-dark text-white'}`}>3</div>
                          <h3 className="font-black text-gray-700 uppercase tracking-tight">Autorização e Assinaturas</h3>
                      </div>
                      <div className="md:pl-8">
                          <SignatureSection signatures={signatures} onUpdate={setSignatures} />
                      </div>
                  </section>
              )}
          </div>

          {/* RIGHT COLUMN - STATUS PANEL */}
          <div className="xl:col-span-4">
              <div className="sticky top-6">
                  <div className="bg-vale-dark text-white rounded-[2rem] shadow-2xl p-8 border-b-[12px] border-vale-green">
                      <div className="flex items-center gap-3 mb-6">
                          <div className="bg-white/10 p-2 rounded-lg"><ShieldCheck className="text-vale-green" size={24} /></div>
                          <h3 className="font-black text-lg uppercase tracking-tight">Progresso da Permissão</h3>
                      </div>
                      
                      <div className="space-y-4 relative">
                          {/* Linha conectora vertical */}
                          <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gray-700 z-0"></div>

                          {/* Item 1 */}
                          <div className="relative z-10 flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${header.om && header.tag ? 'bg-vale-green border-vale-green text-white' : 'bg-gray-800 border-gray-600 text-gray-500'}`}>
                                  {header.om && header.tag ? <CheckCircle size={16}/> : '1'}
                              </div>
                              <div className={header.om && header.tag ? 'opacity-100' : 'opacity-40'}>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Passo 1</p>
                                  <p className="text-xs font-bold uppercase">Preenchimento da OM</p>
                              </div>
                          </div>

                          {/* Item 2 */}
                          <div className="relative z-10 flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${isConfirmed ? 'bg-vale-green border-vale-green text-white' : 'bg-gray-800 border-gray-600 text-gray-500'}`}>
                                  {isConfirmed ? <CheckCircle size={16}/> : '2'}
                              </div>
                              <div className={isConfirmed ? 'opacity-100' : 'opacity-40'}>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Passo 2</p>
                                  <p className="text-xs font-bold uppercase">Leitura do Procedimento</p>
                              </div>
                          </div>

                          {/* Item 3 */}
                          <div className="relative z-10 flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${signatures.length > 0 ? 'bg-vale-green border-vale-green text-white' : 'bg-gray-800 border-gray-600 text-gray-500'}`}>
                                  {signatures.length > 0 ? <CheckCircle size={16}/> : '3'}
                              </div>
                              <div className={signatures.length > 0 ? 'opacity-100' : 'opacity-40'}>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Passo 3</p>
                                  <p className="text-xs font-bold uppercase">Assinaturas da Equipe</p>
                              </div>
                          </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-gray-700/50">
                           <button 
                                onClick={handleSave} 
                                disabled={!isConfirmed || signatures.length === 0 || isSaving} 
                                className={`w-full py-4 rounded-xl shadow-lg font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isConfirmed && signatures.length > 0 ? 'bg-vale-green hover:bg-[#00605d] text-white hover:scale-105' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                            >
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Liberar Atividade
                            </button>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* FEEDBACK OVERLAY */}
      {(isSaving || saveSuccess) && (
          <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
              <div className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center max-w-sm w-full shadow-2xl text-center">
                  {saveSuccess ? (
                      <>
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                              <CheckCircle size={32} className="text-green-600" />
                          </div>
                          <h3 className="text-xl font-black text-gray-800 uppercase mb-1">Atividade Liberada!</h3>
                          <p className="text-xs font-bold text-gray-400 uppercase">Redirecionando para o painel...</p>
                      </>
                  ) : (
                      <>
                          <Loader2 size={48} className="text-vale-green animate-spin mb-4" />
                          <h3 className="text-lg font-black text-gray-800 uppercase mb-1">Processando Liberação...</h3>
                          <p className="text-xs font-bold text-gray-400 uppercase">Arquivando documentos e iniciando cronômetro.</p>
                      </>
                  )}
              </div>
          </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreviewModal && selectedART && (
          <div className="fixed inset-0 bg-vale-dark/95 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn">
              <div className="bg-white rounded-[2rem] w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                  <div className="bg-gray-900 p-6 flex justify-between items-center text-white shrink-0">
                      <div>
                          <h3 className="font-black text-xl tracking-tighter uppercase">Documento Original</h3>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ART: {selectedART.code}</p>
                      </div>
                      <div className="flex gap-2">
                           {pdfBlobUrl && (
                            <a href={pdfBlobUrl} download className="p-3 bg-gray-800 rounded-lg hover:bg-gray-700 text-white transition-colors" title="Baixar">
                                <Download size={20}/>
                            </a>
                           )}
                           <button onClick={() => setShowPreviewModal(false)} className="p-3 bg-white/10 rounded-lg hover:bg-red-600 transition-colors"><X size={20}/></button>
                      </div>
                  </div>
                  
                  <div className="flex-1 bg-gray-200 relative overflow-hidden flex items-center justify-center">
                      {pdfBlobUrl ? (
                          <iframe src={pdfBlobUrl} className="w-full h-full border-none" title="PDF Viewer" />
                      ) : (
                          <div className="text-center p-10">
                              <ShieldAlert size={64} className="text-gray-400 mx-auto mb-4" />
                              <h4 className="text-xl font-black text-gray-500 uppercase">PDF Indisponível</h4>
                          </div>
                      )}
                  </div>

                  <div className="p-6 bg-white border-t flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                      <div className="flex items-center gap-3 text-vale-blue">
                          <ShieldCheck size={32} />
                          <div>
                              <p className="text-xs font-black uppercase">Confirmação de Leitura</p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase">Declaro ter lido e compreendido os riscos.</p>
                          </div>
                      </div>
                      <button onClick={handleConfirmOriginal} className="bg-green-600 hover:bg-green-700 text-white px-12 py-4 rounded-xl font-black shadow-lg uppercase text-xs tracking-widest transition-transform active:scale-95 w-full md:w-auto">
                          Validar e Prosseguir
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
