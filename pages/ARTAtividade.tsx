
import React, { useState, useEffect } from 'react';
import { CommonHeader } from '../components/CommonHeader';
import { SignatureSection } from '../components/SignatureSection';
import { StorageService } from '../services/storage';
import { HeaderData, DocumentRecord, RegisteredART, SignatureRecord, ActiveMaintenance, OMRecord } from '../types';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { FileText, Eye, CheckCircle, X, ShieldCheck, Save, Download, ShieldAlert, ArrowRight, BookOpen, Loader2, Link as LinkIcon, Search, Database, Lock, ExternalLink } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { FeedbackModal } from '../components/FeedbackModal'; // Importado

export const ARTAtividade: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const [header, setHeader] = useState<HeaderData>({
    om: '', tag: '', date: new Date().toISOString().split('T')[0], time: '', type: 'MECANICA', description: ''
  });
  
  const [omId, setOmId] = useState<string | undefined>(undefined);
  const [scheduleId, setScheduleId] = useState<string | undefined>(undefined); 
  const [registeredARTs, setRegisteredARTs] = useState<RegisteredART[]>([]);
  const [selectedART, setSelectedART] = useState<RegisteredART | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false); 
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  
  // SCHEDULE LINKING STATES
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [matchingOms, setMatchingOms] = useState<OMRecord[]>([]);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  
  // Feedback States 
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setRegisteredARTs(StorageService.getARTs());
    
    // Check params for schedule data
    const paramOm = searchParams.get('om');
    const paramTag = searchParams.get('tag');
    const paramDesc = searchParams.get('desc');
    const paramScheduleId = searchParams.get('scheduleId');
    const paramOmId = searchParams.get('omId');

    if (paramScheduleId) {
        setScheduleId(paramScheduleId);
        // SE VIER DA AGENDA E AINDA NÃO TIVER OM VINCULADA, ABRE O MODAL
        if (!paramOmId) {
            setShowLinkModal(true);
            // Pre-fill search with OM number from Schedule
            if (paramOm) {
                setLinkSearchQuery(paramOm);
                // Perform Auto-Search
                const allOms = StorageService.getOMs();
                // Match criteria: OM Number OR Tag matches
                const matches = allOms.filter(o => 
                    o.omNumber.includes(paramOm) || 
                    (paramTag && o.tag.includes(paramTag))
                );
                setMatchingOms(matches);
            }
        } else {
            setOmId(paramOmId);
        }
    } else if (paramOmId) {
        setOmId(paramOmId);
    }

    if (paramOm || paramTag) {
        const now = new Date();
        setHeader(prev => ({
            ...prev,
            om: paramOm || prev.om,
            tag: paramTag || prev.tag,
            description: paramDesc || prev.description,
            time: now.toTimeString().slice(0,5)
        }));
    }
  }, [searchParams]);

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

  const handleLinkOm = (om: OMRecord) => {
      // --- VALIDAÇÃO RIGOROSA: OM AGENDA vs OM BANCO ---
      if (scheduleId) {
          // Limpa strings para comparar apenas números (remove espaços, traços, etc)
          const scheduleOmClean = header.om ? header.om.trim().replace(/\D/g, '') : '';
          const selectedOmClean = om.omNumber.trim().replace(/\D/g, '');

          // Lógica: Se a agenda tem um número definido (mais de 5 dígitos), TEM QUE BATER.
          if (scheduleOmClean.length >= 5 && scheduleOmClean !== selectedOmClean) {
              alert(`⛔ BLOQUEIO DE SEGURANÇA\n\nA OM selecionada (${om.omNumber}) não é a mesma programada na Agenda (${header.om}).\n\nRegra: O número da OM deve ser idêntico para prosseguir.`);
              return;
          }
      }
      // -------------------------------------------------

      setOmId(om.id);
      setHeader(prev => ({
          ...prev,
          om: om.omNumber,
          tag: om.tag,
          description: om.description || prev.description,
          type: om.type === 'CORRETIVA' ? 'MECANICA' : prev.type // Simple logic for now
      }));
      setShowLinkModal(false);
  };

  const handleLinkSearch = (val: string) => {
      setLinkSearchQuery(val);
      const allOms = StorageService.getOMs();
      const q = val.toUpperCase();
      setMatchingOms(allOms.filter(o => o.omNumber.includes(q) || o.tag.includes(q)));
  };

  const handleSave = async () => {
    if(!selectedART || !isConfirmed || signatures.length === 0) {
        alert("POR FAVOR, SELECIONE O PROCEDIMENTO, LEIA O PDF ORIGINAL E COLETE AS ASSINATURAS.");
        return;
    }

    setIsProcessing(true);

    try {
        // Simulate minimal delay for UX
        await new Promise(resolve => setTimeout(resolve, 1000));

        const artId = crypto.randomUUID();
        const doc: DocumentRecord = {
          id: artId,
          type: 'ART_ATIVIDADE',
          header,
          createdAt: new Date().toISOString(),
          status: 'ATIVO', // MUDANÇA: ATIVO para aparecer no Arquivo imediatamente
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
        
        // START MAINTENANCE - THIS WILL CONSUME THE SCHEDULE ID
        await StorageService.startMaintenance({
            id: crypto.randomUUID(),
            omId: omId,
            scheduleId: scheduleId, // Passa o ID da agenda se existir (isso faz sumir da agenda)
            header,
            startTime: nowIso,
            artId: artId,
            artType: 'ART_ATIVIDADE',
            origin: 'PREVENTIVA',
            status: 'ANDAMENTO',
            currentSessionStart: nowIso,
            openedBy: localStorage.getItem('safemaint_user') || 'ANONIMO'
        });
        
        setIsProcessing(false);
        setIsSuccess(true);
        setTimeout(() => {
            navigate('/dashboard');
        }, 1500);
    } catch (e) {
        setIsProcessing(false);
        alert("Erro ao salvar.");
    }
  };

  return (
    <div className="max-w-[1500px] mx-auto pb-32 px-4 relative animate-fadeIn">
      <FeedbackModal 
        isOpen={isProcessing || isSuccess} 
        isSuccess={isSuccess} 
        loadingText="PROCESSANDO LIBERAÇÃO..." 
        successText="ATIVIDADE LIBERADA!"
      />

      {/* Title Bar */}
      <div className="flex items-center gap-4 mb-4 border-b border-gray-200 pb-4 pt-4">
        <BackButton />
        <div>
            <h2 className="text-xl font-black text-vale-darkgray uppercase tracking-tighter leading-none flex items-center gap-2">
                <FileText className="text-vale-blue" size={20} />
                Liberação de Atividade (ART)
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 ml-1">Procedimento Padrão & Permissão de Trabalho</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN - MAIN CONTENT - 9/12 (75%) */}
          <div className="xl:col-span-9 space-y-6">
              
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
                      <div className={`bg-white rounded-[1.5rem] shadow-sm border overflow-hidden transition-all ${isConfirmed ? 'border-green-500' : 'border-gray-200'}`}>
                          {/* Header do Card */}
                          <div className={`p-4 border-b flex justify-between items-center ${isConfirmed ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                              <div className="flex items-center gap-3">
                                  <BookOpen size={18} className={isConfirmed ? 'text-green-600' : 'text-gray-400'} />
                                  <div>
                                      <h4 className="font-black text-xs uppercase text-gray-700">Biblioteca de ARTs</h4>
                                      <p className="text-[9px] font-bold text-gray-400 uppercase">Selecione o procedimento padrão aplicável</p>
                                  </div>
                              </div>
                              {isConfirmed && <div className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-[9px] font-black uppercase flex items-center gap-1"><CheckCircle size={12}/> Validado</div>}
                          </div>

                          <div className="p-6 space-y-4">
                              {/* Selection Dropdown */}
                              <div>
                                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-2 ml-1">Pesquisar Procedimento (ART)</label>
                                  <div className="relative">
                                      <select 
                                        className="w-full border border-gray-200 p-3 rounded-lg bg-white font-bold text-gray-800 outline-none uppercase focus:border-vale-blue focus:ring-4 focus:ring-blue-50 transition-all appearance-none text-xs"
                                        onChange={handleARTSelect} 
                                        value={selectedART?.id || ''}
                                        disabled={isConfirmed}
                                      >
                                          <option value="">-- SELECIONE NA LISTA --</option>
                                          {registeredARTs.map(art => <option key={art.id} value={art.id}>[{art.code}] {art.taskName}</option>)}
                                      </select>
                                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                          <ArrowRight size={14} />
                                      </div>
                                  </div>
                              </div>

                              {/* Selected Context */}
                              {selectedART && (
                                  <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 animate-fadeIn">
                                      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                          <div>
                                              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-1">Procedimento Selecionado</span>
                                              <p className="text-sm font-black text-gray-800 uppercase leading-tight">{selectedART.taskName}</p>
                                              <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Código: {selectedART.code}</p>
                                          </div>

                                          <button 
                                            onClick={() => setShowPreviewModal(true)} 
                                            className={`
                                                group relative px-5 py-3 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm active:scale-95 whitespace-nowrap
                                                ${isConfirmed 
                                                    ? 'bg-white border-2 border-green-500 text-green-600 hover:bg-green-50' 
                                                    : 'bg-vale-blue text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200'}
                                            `}
                                          >
                                              {isConfirmed ? (
                                                  <>
                                                    <CheckCircle size={14} />
                                                    Leitura Confirmada
                                                  </>
                                              ) : (
                                                  <>
                                                    <Eye size={14} />
                                                    Ler e Validar PDF
                                                  </>
                                              )}
                                              {!isConfirmed && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>}
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

          {/* RIGHT COLUMN - STATUS PANEL - 3/12 (25%) */}
          <div className="xl:col-span-3">
              <div className="sticky top-6">
                  <div className="bg-vale-dark text-white rounded-2xl shadow-xl p-5 border-b-[8px] border-vale-green">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="bg-white/10 p-1.5 rounded-lg"><ShieldCheck className="text-vale-green" size={18} /></div>
                          <h3 className="font-black text-sm uppercase tracking-tight">Status</h3>
                      </div>
                      
                      <div className="space-y-3 relative">
                          {/* Linha conectora vertical */}
                          <div className="absolute left-[13px] top-3 bottom-3 w-0.5 bg-gray-700 z-0"></div>

                          {/* Item 1 */}
                          <div className="relative z-10 flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${header.om && header.tag ? 'bg-vale-green border-vale-green text-white' : 'bg-gray-800 border-gray-600 text-gray-500'}`}>
                                  {header.om && header.tag ? <CheckCircle size={14}/> : '1'}
                              </div>
                              <div className={header.om && header.tag ? 'opacity-100' : 'opacity-40'}>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Passo 1</p>
                                  <p className="text-[10px] font-bold uppercase">Preenchimento</p>
                              </div>
                          </div>

                          {/* Item 2 */}
                          <div className="relative z-10 flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${isConfirmed ? 'bg-vale-green border-vale-green text-white' : 'bg-gray-800 border-gray-600 text-gray-500'}`}>
                                  {isConfirmed ? <CheckCircle size={14}/> : '2'}
                              </div>
                              <div className={isConfirmed ? 'opacity-100' : 'opacity-40'}>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Passo 2</p>
                                  <p className="text-[10px] font-bold uppercase">Procedimento</p>
                              </div>
                          </div>

                          {/* Item 3 */}
                          <div className="relative z-10 flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${signatures.length > 0 ? 'bg-vale-green border-vale-green text-white' : 'bg-gray-800 border-gray-600 text-gray-500'}`}>
                                  {signatures.length > 0 ? <CheckCircle size={14}/> : '3'}
                              </div>
                              <div className={signatures.length > 0 ? 'opacity-100' : 'opacity-40'}>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Passo 3</p>
                                  <p className="text-[10px] font-bold uppercase">Assinaturas</p>
                              </div>
                          </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-700/50">
                           <button 
                                onClick={handleSave} 
                                disabled={!isConfirmed || signatures.length === 0 || isProcessing} 
                                className={`w-full py-3 rounded-lg shadow-lg font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isConfirmed && signatures.length > 0 ? 'bg-vale-green hover:bg-[#00605d] text-white hover:scale-105' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                            >
                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Liberar
                            </button>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* SCHEDULE LINK MODAL - MOBILE OPTIMIZED (FULL SCREEN ON SMALL DEVICES) */}
      {showLinkModal && (
          <div className="fixed inset-0 z-[100] bg-gray-900/90 flex items-end md:items-center justify-center md:p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white w-full md:max-w-2xl h-[100dvh] md:h-auto md:max-h-[85vh] md:rounded-2xl p-6 shadow-2xl border-t-8 border-blue-600 flex flex-col">
                  <div className="border-b pb-4 mb-4 shrink-0">
                      <div className="flex justify-between items-start">
                          <div>
                              <h3 className="text-xl font-black text-gray-800 uppercase flex items-center gap-2">
                                  <LinkIcon className="text-blue-600" />
                                  Vinculação de Ordem (Agenda)
                              </h3>
                              <p className="text-xs font-bold text-gray-500 mt-1 uppercase">
                                  Para iniciar, confirme a OM correspondente no banco de dados.
                              </p>
                          </div>
                          <button onClick={() => setShowLinkModal(false)} className="md:hidden p-2 text-gray-400 hover:text-red-500"><X size={24}/></button>
                      </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 shrink-0">
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                          <Lock size={10} /> DADOS DA AGENDA (BLOQUEIO ATIVO)
                      </p>
                      <div className="flex gap-4">
                          <div>
                              <span className="block text-[10px] font-bold text-gray-500 uppercase">OM PREVISTA</span>
                              <span className="block text-lg font-black text-gray-800 uppercase">{header.om || '---'}</span>
                          </div>
                          <div>
                              <span className="block text-[10px] font-bold text-gray-500 uppercase">TAG</span>
                              <span className="block text-lg font-black text-blue-600 uppercase">{header.tag}</span>
                          </div>
                      </div>
                  </div>

                  <div className="mb-4 shrink-0">
                      <div className="relative">
                          <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                          <input 
                              type="text" 
                              value={linkSearchQuery}
                              onChange={e => handleLinkSearch(e.target.value)}
                              placeholder="Pesquisar OM no Banco..."
                              className="w-full bg-gray-50 border-2 border-gray-200 pl-10 pr-4 py-3 rounded-xl font-bold uppercase text-sm focus:border-blue-500 outline-none"
                              autoFocus
                          />
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 border rounded-xl p-2 bg-gray-50 min-h-[150px]">
                      {matchingOms.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400">
                              <Database size={24} className="mb-2 opacity-30"/>
                              <p className="text-xs font-bold uppercase">Nenhuma OM encontrada</p>
                          </div>
                      ) : (
                          matchingOms.map(om => (
                              <button 
                                  key={om.id}
                                  onClick={() => handleLinkOm(om)}
                                  className="w-full text-left bg-white p-4 rounded-xl border border-gray-200 hover:border-green-500 hover:shadow-md transition-all group flex justify-between items-center"
                              >
                                  <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                          <span className="font-black text-gray-800 text-sm">{om.omNumber}</span>
                                          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${om.type === 'CORRETIVA' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{om.type}</span>
                                      </div>
                                      <div className="text-xs font-bold text-gray-500 uppercase truncate max-w-[200px] md:max-w-[300px]">{om.tag} - {om.description}</div>
                                  </div>
                                  <div className="bg-green-50 text-green-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                                      <CheckCircle size={12}/> Confirmar
                                  </div>
                              </button>
                          ))
                      )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center shrink-0">
                      <button 
                          onClick={() => setShowLinkModal(false)}
                          className="text-gray-400 hover:text-gray-600 font-bold text-xs uppercase"
                      >
                          Voltar (Cancelar)
                      </button>
                      <div className="text-[9px] font-bold text-gray-400 uppercase italic">
                          O número da OM deve ser idêntico.
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* PREVIEW MODAL - MOBILE OPTIMIZED (100dvh + EXTERNAL LINK) */}
      {showPreviewModal && selectedART && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-fadeIn overflow-hidden h-[100dvh]">
              <div className="bg-gray-900 px-4 py-2 flex justify-between items-center text-white shrink-0 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                      <FileText size={18} className="text-vale-green"/>
                      <div>
                          <h3 className="font-black text-sm tracking-tighter uppercase">Visualização de Segurança</h3>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{selectedART.code}</p>
                      </div>
                  </div>
                  <div className="flex gap-2">
                       {pdfBlobUrl && (
                        <>
                            <a href={pdfBlobUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 rounded hover:bg-gray-700 text-white transition-colors md:hidden" title="Abrir em Nova Aba (Melhor para Mobile)">
                                <ExternalLink size={16}/>
                            </a>
                            <a href={pdfBlobUrl} download className="p-2 bg-gray-800 rounded hover:bg-gray-700 text-white transition-colors hidden md:block" title="Baixar">
                                <Download size={16}/>
                            </a>
                        </>
                       )}
                       <button onClick={() => setShowPreviewModal(false)} className="p-2 bg-white/10 rounded hover:bg-red-600 transition-colors"><X size={16}/></button>
                  </div>
              </div>
              
              <div className="flex-1 bg-black relative w-full h-full overflow-hidden">
                  {pdfBlobUrl ? (
                      <iframe src={pdfBlobUrl} className="w-full h-full border-none" title="PDF Viewer" />
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                          <ShieldAlert size={48} className="mx-auto mb-2 opacity-30" />
                          <h4 className="font-black text-xs uppercase">PDF Indisponível</h4>
                      </div>
                  )}
              </div>

              <div className="p-3 bg-gray-900 border-t border-gray-800 flex justify-between items-center shrink-0 safe-area-bottom">
                  <div className="text-[10px] font-bold text-gray-400 uppercase hidden md:block">
                      Confirme a leitura e compreensão dos riscos.
                  </div>
                  <button onClick={handleConfirmOriginal} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-black shadow-lg uppercase text-xs tracking-widest transition-transform active:scale-95 w-full md:w-auto">
                      Li e Concordo (Validar)
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
