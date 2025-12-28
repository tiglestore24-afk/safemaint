
import React, { useState, useEffect } from 'react';
import { CommonHeader } from '../components/CommonHeader';
import { SignatureSection } from '../components/SignatureSection';
import { StorageService } from '../services/storage';
import { HeaderData, DocumentRecord, RegisteredART, SignatureRecord, ActiveMaintenance } from '../types';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText, Eye, CheckCircle, X, AlertCircle, ShieldCheck, ChevronRight, Loader2, Save, CheckCircle2 } from 'lucide-react';
import { BackButton } from '../components/BackButton';

export const ARTAtividade: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const [header, setHeader] = useState<HeaderData>({
    om: '', tag: '', date: new Date().toISOString().split('T')[0], time: '', type: 'MECANICA', description: ''
  });
  
  // Guardar ID da OM vindo da Gestão de OM
  const [omId, setOmId] = useState<string | undefined>(undefined);

  const [registeredARTs, setRegisteredARTs] = useState<RegisteredART[]>([]);
  
  // States para controle de fluxo
  const [selectedART, setSelectedART] = useState<RegisteredART | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false); // Só libera se confirmado no modal
  
  // States de Salvamento com Feedback
  const [isSaving, setIsSaving] = useState(false); 
  const [saveStep, setSaveStep] = useState(''); // Mensagem dinâmica do loading
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);

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

        if(paramOm || paramTag) {
            setHeader(prev => ({
                ...prev,
                om: paramOm || '',
                tag: paramTag || '',
                description: paramDesc || '',
                time: now.toTimeString().slice(0,5)
            }));
        } else {
            setHeader(prev => ({ ...prev, time: now.toTimeString().slice(0,5) }));
        }
    }
  }, [searchParams, location]);

  const handleARTSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const art = registeredARTs.find(a => a.id === e.target.value);
    setSelectedART(art || null);
    setIsConfirmed(false); // Reseta confirmação se trocar a ART
  };

  const handlePreviewClick = () => {
      if (!header.om.trim() || !header.tag.trim() || !header.description.trim()) {
          alert("ATENÇÃO: PREENCHA OS DADOS DO CABEÇALHO (OM, TAG E DESCRIÇÃO) ANTES DE VINCULAR A ART.");
          return;
      }
      setShowPreviewModal(true);
  };

  const handleConfirmLink = () => {
      setIsConfirmed(true);
      setShowPreviewModal(false);
  };

  const handleSave = () => {
    if(!selectedART) { alert("SELECIONE UMA ART PADRÃO."); return; }
    if(!isConfirmed) { alert("É NECESSÁRIO VISUALIZAR A ART ANTES."); return; }
    if(signatures.length === 0) { alert("ASSINATURA OBRIGATÓRIA."); return; }

    // Obter ID da programação (se houver) para remover da lista
    const scheduleId = searchParams.get('scheduleId');

    // Início do processo visual de salvamento
    setIsSaving(true);
    setSaveStep('VALIDANDO DADOS...');

    // Etapa 1: Validação e Preparação (Simulado)
    setTimeout(() => {
        setSaveStep('REGISTRANDO DOCUMENTO DIGITAL...');
        
        // Etapa 2: Gravação no Storage
        setTimeout(() => {
            const artId = crypto.randomUUID();
            const doc: DocumentRecord = {
              id: artId,
              type: 'ART_ATIVIDADE',
              header,
              createdAt: new Date().toISOString(),
              status: 'ATIVO',
              content: { artId: selectedART.id, artNumber: selectedART.code, artName: selectedART.taskName },
              signatures
            };
            StorageService.saveDocument(doc);
            
            setSaveStep('INICIANDO CRONÔMETRO DE ATIVIDADE...');

            // Etapa 3: Iniciar Manutenção e Limpar da Programação
            setTimeout(async () => {
                const nowIso = new Date().toISOString();
                const activeTask: ActiveMaintenance = {
                    id: crypto.randomUUID(),
                    omId: omId, // VÍNCULO COM A OM NO BANCO
                    header,
                    startTime: nowIso,
                    artId: artId,
                    artType: 'ART_ATIVIDADE',
                    origin: 'PREVENTIVA',
                    status: 'ANDAMENTO',
                    currentSessionStart: nowIso // INICIA CONTADOR IMEDIATAMENTE
                };
                
                // CRUCIAL: Aguarda o registro ser confirmado
                await StorageService.startMaintenance(activeTask);

                // SE VEIO DA PROGRAMAÇÃO, REMOVE O ITEM DE LÁ
                if (scheduleId) {
                    await StorageService.deleteScheduleItem(scheduleId);
                }

                // Etapa 4: Feedback Visual (Toast) e Redirecionar
                setIsSaving(false);
                setShowToast({ message: 'ATIVIDADE INICIADA COM SUCESSO!', type: 'success' });
                
                // Força atualização no Dashboard
                window.dispatchEvent(new Event('safemaint_storage_update'));

                // Redireciona para o Painel Inicial (Dashboard) onde o tempo está contando
                setTimeout(() => {
                    navigate('/dashboard');
                }, 1000);

            }, 800);
        }, 800);
    }, 800);
  };

  // Renderização do Conteúdo da ART (Reutilizável)
  const renderARTContent = (art: RegisteredART) => (
      <div className="bg-white border-4 border-gray-800 shadow-2xl overflow-hidden text-gray-900">
          {/* PDF HEADER SIMULATION */}
          <div className="border-b-2 border-gray-800 p-2 bg-gray-100 flex justify-between items-center text-xs font-black text-gray-800">
              <div>ART - ANÁLISE DE RISCO DA TAREFA</div>
              <div>DIRETRIZES DE SEGURANÇA VALE</div>
          </div>

          <div className="grid grid-cols-4 border-b-2 border-gray-800 text-[10px]">
              <div className="p-2 border-r border-gray-800 font-bold">Empresa: {art.company}</div>
              <div className="p-2 border-r border-gray-800 col-span-2 font-bold">Tarefa: {art.taskName}</div>
              <div className="p-2 font-bold">Área: {art.area}</div>
          </div>
          
          <div className="grid grid-cols-4 border-b-2 border-gray-800 text-[10px]">
              <div className="p-2 border-r border-gray-800 font-bold">Código ART: {art.code}</div>
              <div className="p-2 border-r border-gray-800 font-bold">OMVE: {art.omve}</div>
              <div className="p-2 border-r border-gray-800 font-bold">Emissão: {art.emissionDate}</div>
              <div className="p-2 font-bold">Status: APROVADO</div>
          </div>

          {/* RISK TABLE */}
          <div className="p-4 bg-gray-50 border-b-2 border-gray-800">
              <h4 className="font-black text-center text-sm mb-2 bg-gray-800 text-white py-1">PRINCIPAIS SITUAÇÕES DE RISCO</h4>
              <table className="w-full text-[10px] border border-gray-400">
                  <thead className="bg-gray-200">
                      <tr>
                          <th className="border border-gray-400 p-1 text-left">SITUAÇÃO</th>
                          <th className="border border-gray-400 p-1 text-center w-12">TOTAL</th>
                          <th className="border border-gray-400 p-1 text-center w-20">RISCO</th>
                      </tr>
                  </thead>
                  <tbody>
                      {art.risks && art.risks.map((r, i) => (
                          <tr key={i}>
                              <td className="border border-gray-400 p-1 font-bold">{r.situation}</td>
                              <td className="border border-gray-400 p-1 text-center">{r.total}</td>
                              <td className="border border-gray-400 p-1 text-center">{r.riskLevel}</td>
                          </tr>
                      ))}
                      {(!art.risks || art.risks.length === 0) && (
                          <tr><td colSpan={3} className="p-2 text-center">SEM RISCOS CADASTRADOS</td></tr>
                      )}
                  </tbody>
              </table>
          </div>

          {/* CONTROL MEASURES */}
          <div className="p-4 bg-white border-b-2 border-gray-800">
               <h4 className="font-black text-center text-sm mb-2 bg-gray-800 text-white py-1">RESUMO DAS MEDIDAS DE CONTROLE</h4>
               <p className="text-[10px] font-bold text-justify whitespace-pre-line leading-relaxed p-2 border border-gray-400 bg-gray-50">
                   {art.controlMeasures || 'Nenhuma medida registrada.'}
               </p>
          </div>

          {/* STEPS TABLE */}
          <div className="p-4 bg-gray-50">
              <h4 className="font-black text-center text-sm mb-2 bg-gray-800 text-white py-1">PASSO A PASSO DA TAREFA</h4>
              <table className="w-full text-[10px] border border-gray-400">
                  <thead className="bg-gray-200">
                      <tr>
                          <th className="border border-gray-400 p-1 text-center w-10">ITEM</th>
                          <th className="border border-gray-400 p-1 text-left">PASSO DA TAREFA</th>
                          <th className="border border-gray-400 p-1 text-center w-20">RISCO</th>
                      </tr>
                  </thead>
                  <tbody>
                      {art.steps && art.steps.map((s, i) => (
                          <tr key={i}>
                              <td className="border border-gray-400 p-1 text-center font-bold">{s.item}</td>
                              <td className="border border-gray-400 p-1 font-bold">{s.step}</td>
                              <td className="border border-gray-400 p-1 text-center">{s.riskLevel}</td>
                          </tr>
                      ))}
                      {(!art.steps || art.steps.length === 0) && (
                          <tr><td colSpan={3} className="p-2 text-center">SEM PASSOS CADASTRADOS</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-24 px-4 md:px-6 relative">
      <div className="flex items-center gap-3 mb-8 border-b border-gray-200 pb-4 pt-4">
        <BackButton className="mr-2" />
        <div>
            <h2 className="text-2xl font-black text-vale-darkgray uppercase flex items-center gap-2">
                <FileText className="text-vale-green" />
                ART DA ATIVIDADE
            </h2>
            <p className="text-xs font-bold text-gray-400">ANÁLISE DE RISCO - MANUTENÇÃO PREVENTIVA/ROTINA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUNA ESQUERDA: INPUTS */}
          <div className="lg:col-span-2 space-y-8">
              
              {/* PASSO 1: HEADER */}
              <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-vale-blue"></div>
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <div className="bg-vale-blue text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md">1</div>
                          <h3 className="font-bold text-gray-800 uppercase text-sm tracking-wide">DADOS DA MANUTENÇÃO</h3>
                      </div>
                      {header.om && header.tag ? <CheckCircle size={18} className="text-vale-green" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>}
                  </div>
                  <div className="p-6">
                      <CommonHeader data={header} onChange={setHeader} />
                  </div>
              </section>

              {/* PASSO 2: ART SELECTION */}
              <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-vale-green"></div>
                   <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <div className="bg-vale-green text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md">2</div>
                          <h3 className="font-bold text-gray-800 uppercase text-sm tracking-wide">DEFINIÇÃO DE RISCO (ART PADRÃO)</h3>
                      </div>
                      {isConfirmed ? <CheckCircle size={18} className="text-vale-green" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>}
                  </div>
                  
                  <div className="p-6">
                      <div className="mb-4">
                          <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wider">SELECIONE O PROCEDIMENTO PADRÃO:</label>
                          <select 
                              className="w-full border-2 border-gray-300 p-4 rounded-lg bg-gray-50 focus:ring-2 focus:ring-vale-green focus:border-vale-green font-bold text-gray-800 outline-none transition-all" 
                              onChange={handleARTSelect}
                              value={selectedART?.id || ''}
                          >
                              <option value="">-- SELECIONE UMA ART DA LISTA --</option>
                              {registeredARTs.map(art => (
                                  <option key={art.id} value={art.id}>ART {art.code} - {art.taskName}</option>
                              ))}
                          </select>
                      </div>

                      {selectedART && (
                          <div className="animate-fadeIn">
                              <div className="flex flex-col md:flex-row gap-4 items-center bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                                  <div className="flex-1">
                                      <h4 className="font-black text-vale-blue text-sm">VOCÊ SELECIONOU:</h4>
                                      <p className="text-xs font-bold text-blue-800 mt-1">{selectedART.taskName}</p>
                                  </div>
                                  <button 
                                      onClick={handlePreviewClick}
                                      className={`px-6 py-3 rounded-lg font-black shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 border-b-4 w-full md:w-auto ${isConfirmed ? 'bg-green-100 text-green-700 border-green-300' : 'bg-vale-blue text-white border-blue-800 hover:bg-[#004a7c]'}`}
                                  >
                                      {isConfirmed ? (
                                          <><ShieldCheck size={18}/> VALIDADO</>
                                      ) : (
                                          <><Eye size={18}/> LER E VALIDAR</>
                                      )}
                                  </button>
                              </div>
                              {!isConfirmed && (
                                  <p className="text-[10px] text-red-500 font-bold text-center flex items-center justify-center gap-1">
                                      <AlertCircle size={12} />
                                      OBRIGATÓRIO VISUALIZAR PARA PROSSEGUIR
                                  </p>
                              )}
                          </div>
                      )}
                  </div>
              </section>
          </div>

          {/* COLUNA DIREITA: STATUS & RESUMO */}
          <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-4">
                  <div className="bg-vale-dark text-white rounded-xl shadow-lg p-6 border-b-4 border-vale-green">
                      <h3 className="font-black text-lg mb-4 flex items-center gap-2">
                          <ShieldCheck className="text-vale-green" /> STATUS
                      </h3>
                      
                      <div className="space-y-4">
                          <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${header.om && header.tag ? 'bg-green-900/30 border-green-700/50 text-green-100' : 'bg-gray-700 border-gray-600 text-gray-400'}`}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${header.om && header.tag ? 'border-green-400 bg-vale-green text-white' : 'border-gray-500'}`}>
                                  {header.om && header.tag ? <CheckCircle size={14} /> : '1'}
                              </div>
                              <div className="text-xs font-bold">CABEÇALHO PREENCHIDO</div>
                          </div>

                          <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${selectedART ? 'bg-green-900/30 border-green-700/50 text-green-100' : 'bg-gray-700 border-gray-600 text-gray-400'}`}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${selectedART ? 'border-green-400 bg-vale-green text-white' : 'border-gray-500'}`}>
                                  {selectedART ? <CheckCircle size={14} /> : '2'}
                              </div>
                              <div className="text-xs font-bold">ART SELECIONADA</div>
                          </div>

                          <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isConfirmed ? 'bg-green-900/30 border-green-700/50 text-green-100' : 'bg-gray-700 border-gray-600 text-gray-400'}`}>
                               <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${isConfirmed ? 'border-green-400 bg-vale-green text-white' : 'border-gray-500'}`}>
                                  {isConfirmed ? <CheckCircle size={14} /> : '3'}
                              </div>
                              <div className="text-xs font-bold">LEITURA CONFIRMADA</div>
                          </div>

                          <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${signatures.length > 0 ? 'bg-green-900/30 border-green-700/50 text-green-100' : 'bg-gray-700 border-gray-600 text-gray-400'}`}>
                               <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${signatures.length > 0 ? 'border-green-400 bg-vale-green text-white' : 'border-gray-500'}`}>
                                  {signatures.length > 0 ? <CheckCircle size={14} /> : '4'}
                              </div>
                              <div className="text-xs font-bold">ASSINATURAS COLETADAS</div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {isConfirmed && selectedART && (
          <div className="mt-8 animate-fadeIn">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-vale-yellow"></div>
                   <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center gap-3">
                      <div className="bg-vale-yellow text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md">3</div>
                      <h3 className="font-bold text-gray-800 uppercase text-sm tracking-wide">ASSINATURAS E LIBERAÇÃO</h3>
                  </div>
                  <div className="p-6">
                      <SignatureSection signatures={signatures} onUpdate={setSignatures} />
                  </div>
              </div>

              <div className="fixed bottom-6 right-6 z-50">
                <button 
                    onClick={handleSave} 
                    disabled={signatures.length === 0}
                    className={`px-8 py-4 rounded-full shadow-xl font-black text-lg flex items-center justify-center gap-3 transform transition hover:scale-105 border-4 border-white ${signatures.length > 0 ? 'bg-vale-green hover:bg-[#00605d] text-white cursor-pointer' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
                >
                    <Save size={24} /> SALVAR / INICIAR ATIVIDADE 
                </button>
              </div>
          </div>
      )}

      {/* FEEDBACK VISUAL DE SALVAMENTO */}
      {isSaving && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="bg-white p-10 rounded-[2rem] shadow-2xl flex flex-col items-center animate-bounce-in max-w-sm w-full border-b-[10px] border-vale-green">
                  <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-full border-4 border-gray-100"></div>
                      <div className="absolute top-0 left-0 w-20 h-20 rounded-full border-4 border-[#007e7a] border-t-transparent animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                          <Save className="text-vale-green" size={24} />
                      </div>
                  </div>
                  <h3 className="text-2xl font-black text-gray-800 mb-2 uppercase text-center leading-none">PROCESSANDO</h3>
                  <div className="bg-gray-100 px-4 py-2 rounded-lg mt-2">
                    <p className="text-xs font-black text-vale-green text-center uppercase tracking-widest animate-pulse">
                        {saveStep}
                    </p>
                  </div>
              </div>
          </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreviewModal && selectedART && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-2 md:p-6 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-xl w-full max-w-4xl h-full flex flex-col overflow-hidden relative shadow-2xl">
                  {/* Header Modal */}
                  <div className="bg-vale-dark p-4 flex justify-between items-center text-white shrink-0">
                      <h3 className="font-black text-lg flex items-center gap-2">
                          <Eye size={20} className="text-vale-green" /> 
                          VISUALIZAÇÃO DE DOCUMENTO
                      </h3>
                      <button onClick={() => setShowPreviewModal(false)} className="hover:bg-gray-700 p-2 rounded-full transition-colors">
                          <X size={24} />
                      </button>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-4 bg-gray-200 custom-scrollbar">
                      {renderARTContent(selectedART)}
                      
                      <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-600 p-4 text-yellow-900 font-bold text-xs">
                          AO CONFIRMAR ABAIXO, DECLARO QUE LI E COMPREENDI OS RISCOS, MEDIDAS DE CONTROLE E O PASSO A PASSO DESTA TAREFA.
                      </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3 shrink-0">
                      <button 
                        onClick={() => setShowPreviewModal(false)} 
                        className="px-6 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                      >
                          FECHAR (APENAS LER)
                      </button>
                      <button 
                        onClick={handleConfirmLink} 
                        className="bg-vale-green hover:bg-[#00605d] text-white px-6 py-3 rounded-lg font-black shadow-lg flex items-center gap-2 transition-transform active:scale-95"
                      >
                          <CheckCircle size={20} />
                          CONFIRMAR E VINCULAR
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
