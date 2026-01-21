import React, { useState, useEffect } from 'react';
import { CommonHeader } from '../components/CommonHeader';
import { SignatureSection } from '../components/SignatureSection';
import { StorageService } from '../services/storage';
import { HeaderData, DocumentRecord, RegisteredART, SignatureRecord } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, CheckCircle, AlertTriangle, MapPin, List, FileText, Eye, BookOpen, Unlock, Timer, PlayCircle, Loader2 } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { FeedbackModal } from '../components/FeedbackModal';
import { PDFViewerModal } from '../components/PDFViewerModal'; // Importado

export const ARTEmergencial: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [header, setHeader] = useState<HeaderData>({
    om: '', tag: '', date: new Date().toISOString().split('T')[0], time: '', type: 'MECANICA', description: ''
  });
  
  const [registeredARTs, setRegisteredARTs] = useState<RegisteredART[]>([]);
  const [selectedArt, setSelectedArt] = useState<RegisteredART | null>(null);
  const [selectedArtId, setSelectedArtId] = useState<string>('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [omId, setOmId] = useState<string | undefined>(undefined);
  // Atualizado para aceitar PREVENTIVA caso venha forçado para este fluxo
  const [origin, setOrigin] = useState<'CORRETIVA' | 'DEMANDA_EXTRA' | 'PREVENTIVA'>('CORRETIVA');
  const [pendingDemandId, setPendingDemandId] = useState<string | undefined>(undefined);
  const [maintenanceId, setMaintenanceId] = useState<string | undefined>(undefined);
  const [isResuming, setIsResuming] = useState(false);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);

  // Risk Map States
  const [selectedRiskId, setSelectedRiskId] = useState<number | null>(null);
  const [quadrantRisks, setQuadrantRisks] = useState<Record<string, number[]>>({
      'FRENTE': [], 'TRAS': [], 'ESQUERDA': [], 'DIREITA': []
  });
  const [checklistRisks, setChecklistRisks] = useState<Record<number, { checked: boolean; control: string }>>({});

  // PDF Viewer Integration
  const [viewerState, setViewerState] = useState<{ isOpen: boolean; url?: string; title: string; id?: string; table?: 'oms' | 'arts' }>({
      isOpen: false, title: ''
  });

  // Animation States for Status Cards
  const [animStep1, setAnimStep1] = useState(false);
  const [animStep2, setAnimStep2] = useState(false);
  const [animStep3, setAnimStep3] = useState(false);

  // Derived Completion States
  const isStep1Complete = !!(header.om && header.tag);
  const isStep2Complete = Object.values(checklistRisks).some((r: any) => r.checked) || !!selectedArt;
  const isStep3Complete = signatures.length > 0;

  useEffect(() => {
    setRegisteredARTs(StorageService.getARTs());

    if (location.state) {
        const stateData = location.state as any;
        setHeader(prev => ({ ...prev, ...stateData }));
        if (stateData.omId) setOmId(stateData.omId);
        if (stateData.origin) setOrigin(stateData.origin);
        if (stateData.demandId) setPendingDemandId(stateData.demandId);
        if (stateData.maintenanceId) setMaintenanceId(stateData.maintenanceId);
        if (stateData.isResuming) setIsResuming(true);
    } else {
        const now = new Date();
        setHeader(prev => ({ ...prev, time: now.toTimeString().slice(0,5) }));
    }
  }, [location]);

  // Animation Triggers
  useEffect(() => {
      if (isStep1Complete) {
          setAnimStep1(true);
          const t = setTimeout(() => setAnimStep1(false), 1000);
          return () => clearTimeout(t);
      }
  }, [isStep1Complete]);

  useEffect(() => {
      if (isStep2Complete) {
          setAnimStep2(true);
          const t = setTimeout(() => setAnimStep2(false), 1000);
          return () => clearTimeout(t);
      }
  }, [isStep2Complete]);

  useEffect(() => {
      if (isStep3Complete) {
          setAnimStep3(true);
          const t = setTimeout(() => setAnimStep3(false), 1000);
          return () => clearTimeout(t);
      }
  }, [isStep3Complete]);

  useEffect(() => {
    const art = registeredARTs.find(a => a.id === selectedArtId);
    setSelectedArt(art || null);
  }, [selectedArtId, registeredARTs]);

  const handleRiskChange = (id: number, checked: boolean) => {
    setChecklistRisks(prev => ({
        ...prev,
        [id]: { ...(prev[id] || { control: '' }), checked }
    }));
    if(checked) setSelectedRiskId(id);
    else {
        const newQuad = { ...quadrantRisks };
        Object.keys(newQuad).forEach(key => { newQuad[key] = newQuad[key].filter(rId => rId !== id); });
        setQuadrantRisks(newQuad);
        if(selectedRiskId === id) setSelectedRiskId(null);
    }
  };

  const handleControlChange = (id: number, control: string) => {
    setChecklistRisks(prev => ({ ...prev, [id]: { ...(prev[id] || { checked: false }), control } }));
  };

  const handleQuadrantClick = (quadrant: string) => {
    if (selectedRiskId !== null) {
        const newQuad = { ...quadrantRisks };
        Object.keys(newQuad).forEach(key => { newQuad[key] = newQuad[key].filter(rId => rId !== selectedRiskId); });
        newQuad[quadrant].push(selectedRiskId);
        setQuadrantRisks(newQuad);
        setSelectedRiskId(null);
    }
  };

  const handleSave = async () => {
    if(!header.om || !header.tag) { alert("PREENCHA OM E TAG."); return; }
    if(signatures.length === 0) { alert("ASSINATURA OBRIGATÓRIA."); return; }
    const hasRisks = Object.values(checklistRisks).some((r: any) => r.checked);
    if (!hasRisks && !selectedArt) { alert("É NECESSÁRIO MAPEAMENTO DE RISCOS OU VINCULAR UMA ART PADRÃO."); return; }
    
    setIsProcessing(true);
    try {
        await new Promise(r => setTimeout(r, 1000));
        const artId = crypto.randomUUID();
        const doc: DocumentRecord = {
          id: artId, 
          type: 'ART_EMERGENCIAL', 
          header, 
          createdAt: new Date().toISOString(), 
          status: 'ATIVO', 
          content: { 
            quadrantRisks, 
            checklistRisks, 
            manualFileUrl: selectedArt?.pdfUrl, 
            linkedArtId: selectedArtId, 
            linkedArtCode: selectedArt?.code 
          },
          signatures
        };
        await StorageService.saveDocument(doc);
        const nowIso = new Date().toISOString();
        
        await StorageService.startMaintenance({
            id: maintenanceId || crypto.randomUUID(), 
            omId, 
            header, 
            startTime: nowIso, 
            artId, 
            artType: 'ART_EMERGENCIAL', 
            origin, 
            status: 'ANDAMENTO', // GARANTE STATUS EM ANDAMENTO
            currentSessionStart: nowIso, // GARANTE CRONOMETRO INICIANDO
            openedBy: localStorage.getItem('safemaint_user') || 'ADMIN',
            accumulatedTime: 0 
        });
        
        if (pendingDemandId) await StorageService.deletePendingExtraDemand(pendingDemandId);
        
        setIsProcessing(false); 
        setIsSuccess(true);
        setTimeout(() => navigate('/dashboard'), 1500);
    } catch (e) { setIsProcessing(false); alert('Erro ao processar liberação.'); }
  };

  const riskList = [
    "CONTATO COM SUPERFÍCIES CORTANTES/PERFURANTE", "PRENSAMENTO DE DEDOS OU MÃOS", "QUEDA DE PEÇAS/ESTRUTURAS/EQUIPAMENTOS",
    "PRENSAMENTO OU AGARRAMENTO DO CORPO", "ATROPELAMENTO/ESMAGAMENTO POR VEÍCULOS", "QUEDA, TROPEÇO OU ESCORREGÃO",
    "ANIMAIS PEÇONHENTOS/INSETOS", "DESMORONAMENTOS DE PILHAS", "QUEDA DE PLATAFORMA OU ESCADAS", "ARCO E/OU CHOQUE ELÉTRICO",
    "FONTES DE ENERGIA (HIDRÁULICA, PNEUMÁTICA)", "EXPOSIÇÃO A VAPORES, CONDENSADOS OU QUENTES", "GASES, VAPORES, POEIRAS OU FUMOS",
    "PRODUTOS QUÍMICOS OU QUEIMADURAS", "PROJEÇÃO DE MATERIAIS NA FACE/OLHOS", "CONDIÇÕES CLIMÁTICAS ADVERSAS",
    "QUEDA DE HOMEM AO MAR/AFOGAMENTO", "INTERFERÊNCIA ENTRE EQUIPES", "EXCESSO OU DEFICIÊNCIA DE ILUMINAÇÃO", "OUTRAS SITUAÇÕES DE RISCO"
  ];

  return (
    <div className="max-w-[1500px] mx-auto pb-32 px-4 relative animate-fadeIn">
      <FeedbackModal isOpen={isProcessing || isSuccess} isSuccess={isSuccess} loadingText={isResuming ? "ASSUMINDO MANUTENÇÃO..." : "LIBERANDO E INICIANDO CRONÔMETRO..."} successText={isResuming ? "MANUTENÇÃO ASSUMIDA!" : "ATIVIDADE EM EXECUÇÃO!"} />
      
      {/* NOVO VISUALIZADOR DE PDF */}
      <PDFViewerModal 
        isOpen={viewerState.isOpen}
        onClose={() => setViewerState(prev => ({ ...prev, isOpen: false }))}
        title={viewerState.title}
        fileUrl={viewerState.url}
        recordId={viewerState.id}
        table={viewerState.table || 'oms'}
      />

      <div className="flex items-center gap-4 mb-4 border-b border-gray-200 pb-4 pt-4">
        <BackButton />
        <div className="bg-red-600/10 p-2 rounded-xl"><AlertTriangle className="text-red-600" size={24} /></div>
        <div>
            <h2 className="text-xl font-black text-vale-darkgray uppercase tracking-tighter leading-none">
                {isResuming ? 'Assumir ART Emergencial' : 'ART Emergencial'}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Análise Preliminar de Risco (APR) - {origin.replace('_', ' ')}</p>
        </div>
      </div>

      {isResuming && (
          <div className="mb-4 bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
              <div className="bg-amber-100 p-2 rounded-lg text-amber-600"><Unlock size={24}/></div>
              <div>
                  <h4 className="font-black text-xs text-amber-800 uppercase leading-none">Retomada de Atividade</h4>
                  <p className="text-[10px] font-bold text-amber-600 uppercase mt-1">Você está assumindo esta tarefa. Refaça o mapeamento de riscos e colete as assinaturas.</p>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-9 space-y-4">
              <CommonHeader data={header} onChange={setHeader} title="Identificação do Equipamento" readOnly={isResuming} />

              <div className="flex flex-col md:flex-row gap-2 relative z-20">
                  {header.om && header.om !== 'DEMANDA-EXTRA' && (
                      <button 
                        onClick={() => {
                            const oms = StorageService.getOMs();
                            const found = oms.find(o => o.omNumber === header.om);
                            if (found) setViewerState({ isOpen: true, url: found.pdfUrl || 'TRUE', title: `OM: ${found.omNumber}`, id: found.id, table: 'oms' });
                            else alert("OM NÃO ENCONTRADA NO BANCO.");
                        }}
                        className="flex-none md:w-auto bg-white border border-gray-200 px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shadow-sm group h-9"
                      >
                          <div className="bg-red-50 text-red-600 p-1 rounded-md"><FileText size={14}/></div>
                          <span className="text-[9px] font-black uppercase text-gray-600">Visualizar OM</span>
                          <Eye size={14} className="text-gray-300 group-hover:text-red-600"/>
                      </button>
                  )}

                  <div className="flex-1 bg-blue-50/50 border border-blue-100 p-1 rounded-lg flex items-center gap-2 shadow-sm h-9">
                      <select 
                        value={selectedArtId} 
                        onChange={e => setSelectedArtId(e.target.value)} 
                        className="flex-1 bg-white border border-blue-200 text-gray-700 text-[10px] font-black pl-2 pr-4 py-1 rounded-md outline-none focus:ring-1 focus:ring-blue-300 uppercase h-7"
                      >
                          <option value="">-- VINCULAR ART PADRÃO --</option>
                          {registeredARTs.map(art => <option key={art.id} value={art.id}>[{art.code}] {art.taskName}</option>)}
                      </select>
                      {selectedArt && (
                          <button onClick={() => setViewerState({ isOpen: true, url: selectedArt.pdfUrl || 'TRUE', title: `ART: ${selectedArt.code}`, id: selectedArt.id, table: 'arts' })} className="h-7 w-7 flex items-center justify-center bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm transition-colors"><Eye size={14}/></button>
                      )}
                  </div>
              </div>

              {selectedArt && selectedArt.steps && selectedArt.steps.length > 0 && (
                  <section className="bg-white rounded-[1.5rem] shadow-sm border border-blue-100 overflow-hidden animate-fadeIn">
                      <div className="bg-blue-50 p-3 border-b border-blue-100 flex items-center gap-2">
                          <BookOpen size={16} className="text-blue-600"/>
                          <h3 className="font-black text-blue-800 uppercase text-[10px] tracking-widest">Passos do Procedimento Vinculado ({selectedArt.code})</h3>
                      </div>
                      <div className="max-h-48 overflow-y-auto p-4 custom-scrollbar">
                          <div className="space-y-3">
                              {selectedArt.steps.map(step => (
                                  <div key={step.item} className="flex gap-4 items-start border-b border-gray-50 pb-2 last:border-0">
                                      <span className="bg-blue-100 text-blue-800 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shrink-0">{step.item}</span>
                                      <div className="flex-1">
                                          <p className="text-[10px] font-bold text-gray-700 uppercase leading-tight">{step.step}</p>
                                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase mt-1 inline-block ${step.riskLevel === 'ALTO' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>RISCO {step.riskLevel}</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </section>
              )}

              <section className="bg-white rounded-[1.5rem] shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                  <div className="bg-gray-50 p-3 border-b flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="bg-vale-dark text-white w-6 h-6 rounded-full flex items-center justify-center font-black text-xs">2</div>
                          <h3 className="font-black text-gray-700 uppercase tracking-tight text-xs">Mapeamento de Riscos e Ambiente (Entorno)</h3>
                      </div>
                  </div>
                  <div className="flex flex-col lg:flex-row h-[550px]">
                      <div className="flex-1 border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col h-full">
                          <div className="p-2 bg-gray-50/50 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-2"><List size={14}/> Checklist Padrão de Riscos</div>
                          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                              {riskList.map((risk, idx) => {
                                  const id = idx + 1; const isChecked = checklistRisks[id]?.checked || false; const isActive = selectedRiskId === id;
                                  return (
                                    <div key={id} onClick={(e) => { if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') { if(!isChecked) handleRiskChange(id, true); else setSelectedRiskId(id); } }} className={`border rounded-lg p-2.5 transition-all cursor-pointer ${isActive ? 'ring-2 ring-blue-400 border-blue-400 bg-blue-50' : isChecked ? 'bg-red-50 border-red-200' : 'hover:bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-start gap-3">
                                            <input type="checkbox" checked={isChecked} onChange={(e) => handleRiskChange(id, e.target.checked)} className="mt-1 h-4 w-4 text-red-600 rounded border-gray-300" />
                                            <div className="flex-1">
                                                <span className={`text-[10px] font-black uppercase block ${isActive ? 'text-blue-800' : 'text-gray-700'}`}><span className="text-gray-400 mr-2">#{id}</span>{risk}</span>
                                                {isChecked && <div className="mt-2 animate-fadeIn"><textarea className="w-full text-[9px] p-2 border border-red-200 rounded bg-white focus:ring-1 outline-none uppercase font-bold" placeholder="MEDIDA DE CONTROLE..." rows={2} value={checklistRisks[id]?.control || ''} onChange={(e) => handleControlChange(id, e.target.value)} onClick={(e) => e.stopPropagation()} /></div>}
                                            </div>
                                            {isActive && <div className="text-blue-500 animate-pulse"><MapPin size={16} fill="currentColor"/></div>}
                                        </div>
                                    </div>
                                  );
                              })}
                          </div>
                      </div>
                      <div className="lg:w-[40%] bg-gray-50/30 flex flex-col relative">
                          <div className="p-2 bg-gray-50/50 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase flex items-center gap-2"><MapPin size={14}/> Radar 360º</div>
                          <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
                                {selectedRiskId && <div className="absolute top-2 left-0 right-0 px-4 z-20"><div className="bg-blue-600 text-white p-2 rounded-lg shadow-lg flex items-center justify-center gap-2 animate-bounce"><span className="font-black text-[9px] uppercase">Risco #{selectedRiskId} Selecionado &rarr; Clique no Quadrante</span></div></div>}
                                <div className="relative w-full max-w-[240px] aspect-square">
                                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
                                        <circle cx="50" cy="50" r="48" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                                        <line x1="50" y1="2" x2="50" y2="98" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2" />
                                        <line x1="2" y1="50" x2="98" y2="50" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2" />
                                        <path d="M50 50 L15 15 A 49 49 0 0 1 85 15 Z" fill={selectedRiskId ? "rgba(59, 130, 246, 0.1)" : "transparent"} className="cursor-pointer hover:fill-blue-200" onClick={() => handleQuadrantClick('FRENTE')} />
                                        <path d="M50 50 L85 15 A 49 49 0 0 1 85 85 Z" fill={selectedRiskId ? "rgba(59, 130, 246, 0.1)" : "transparent"} className="cursor-pointer hover:fill-blue-200" onClick={() => handleQuadrantClick('DIREITA')} />
                                        <path d="M50 50 L85 85 A 49 49 0 0 1 15 85 Z" fill={selectedRiskId ? "rgba(59, 130, 246, 0.1)" : "transparent"} className="cursor-pointer hover:fill-blue-200" onClick={() => handleQuadrantClick('TRAS')} />
                                        <path d="M50 50 L15 85 A 49 49 0 0 1 15 15 Z" fill={selectedRiskId ? "rgba(59, 130, 246, 0.1)" : "transparent"} className="cursor-pointer hover:fill-blue-200" onClick={() => handleQuadrantClick('ESQUERDA')} />
                                        <text x="50" y="10" textAnchor="middle" fontSize="4" fontWeight="900" fill="#94a3b8">FRENTE</text>
                                        <text x="94" y="52" textAnchor="middle" fontSize="4" fontWeight="900" fill="#94a3b8">DIR</text>
                                        <text x="50" y="95" textAnchor="middle" fontSize="4" fontWeight="900" fill="#94a3b8">TRÁS</text>
                                        <text x="6" y="52" textAnchor="middle" fontSize="4" fontWeight="900" fill="#94a3b8">ESQ</text>
                                        <circle cx="50" cy="50" r="5" fill="#1e293b" stroke="white" strokeWidth="2" />
                                    </svg>
                                    <div className="absolute inset-0 pointer-events-none">
                                        <div className="absolute top-6 left-0 right-0 flex justify-center gap-1 flex-wrap px-10">{quadrantRisks['FRENTE'].map(r => <span key={r} className="w-4 h-4 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center shadow border border-white">{r}</span>)}</div>
                                        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1 flex-wrap px-10">{quadrantRisks['TRAS'].map(r => <span key={r} className="w-4 h-4 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center shadow border border-white">{r}</span>)}</div>
                                        <div className="absolute top-0 bottom-0 right-2 flex flex-col justify-center gap-1 py-10 w-6 items-center">{quadrantRisks['DIREITA'].map(r => <span key={r} className="w-4 h-4 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center shadow border border-white">{r}</span>)}</div>
                                        <div className="absolute top-0 bottom-0 left-2 flex flex-col justify-center gap-1 py-10 w-6 items-center">{quadrantRisks['ESQUERDA'].map(r => <span key={r} className="w-4 h-4 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center shadow border border-white">{r}</span>)}</div>
                                    </div>
                                </div>
                          </div>
                      </div>
                  </div>
              </section>
              <SignatureSection signatures={signatures} onUpdate={setSignatures} />
          </div>

          <div className="xl:col-span-3">
              <div className="sticky top-6">
                  <div className="bg-vale-dark text-white rounded-2xl shadow-xl p-5 border-b-[8px] border-vale-green">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="bg-white/10 p-1.5 rounded-lg"><ShieldCheck className="text-vale-green" size={18} /></div>
                          <h3 className="font-black text-sm uppercase tracking-tight">Status</h3>
                      </div>
                      
                      <div className="space-y-3 relative">
                          <div className="absolute left-[13px] top-3 bottom-3 w-0.5 bg-gray-700 z-0"></div>

                          {/* PASSO 1: IDENTIFICAÇÃO (COM ANIMAÇÃO DE FEEDBACK) */}
                          <div className={`relative z-10 flex items-center gap-3 transition-transform ${animStep1 ? 'scale-105' : ''}`}>
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${isStep1Complete ? 'bg-vale-green border-vale-green text-white' : 'bg-gray-800 border-gray-600 text-gray-500'} ${animStep1 ? 'animate-bounce shadow-[0_0_15px_rgba(0,126,122,0.8)]' : ''}`}>
                                  {isStep1Complete ? <CheckCircle size={14}/> : '1'}
                              </div>
                              <div className={isStep1Complete ? 'opacity-100 text-white' : 'opacity-40'}>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Passo 1</p>
                                  <p className="text-[10px] font-bold uppercase">Preenchimento</p>
                              </div>
                          </div>

                          {/* PASSO 2: PROCEDIMENTO/RISCOS (COM ANIMAÇÃO DE FEEDBACK) */}
                          <div className={`relative z-10 flex items-center gap-3 transition-transform ${animStep2 ? 'scale-105' : ''}`}>
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${isStep2Complete ? 'bg-vale-green border-vale-green text-white' : 'bg-gray-800 border-gray-600 text-gray-500'} ${animStep2 ? 'animate-bounce shadow-[0_0_15px_rgba(0,126,122,0.8)]' : ''}`}>
                                  {isStep2Complete ? <CheckCircle size={14}/> : '2'}
                              </div>
                              <div className={isStep2Complete ? 'opacity-100 text-white' : 'opacity-40'}>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Passo 2</p>
                                  <p className="text-[10px] font-bold uppercase">Procedimento</p>
                              </div>
                          </div>

                          {/* PASSO 3: ASSINATURAS (COM ANIMAÇÃO DE FEEDBACK) */}
                          <div className={`relative z-10 flex items-center gap-3 transition-transform ${animStep3 ? 'scale-105' : ''}`}>
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${isStep3Complete ? 'bg-vale-green border-vale-green text-white' : 'bg-gray-800 border-gray-600 text-gray-500'} ${animStep3 ? 'animate-bounce shadow-[0_0_15px_rgba(0,126,122,0.8)]' : ''}`}>
                                  {isStep3Complete ? <CheckCircle size={14}/> : '3'}
                              </div>
                              <div className={isStep3Complete ? 'opacity-100 text-white' : 'opacity-40'}>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Passo 3</p>
                                  <p className="text-[10px] font-bold uppercase">Assinaturas</p>
                              </div>
                          </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-700/50">
                           <button 
                                onClick={handleSave} 
                                disabled={!isStep3Complete || isProcessing} 
                                className={`w-full py-3 rounded-lg shadow-lg font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${isStep3Complete ? 'bg-vale-green hover:bg-[#00605d] text-white hover:scale-105 hover:shadow-xl' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                            >
                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                                LIBERAR E INICIAR CRONÔMETRO
                            </button>
                            <p className="text-[8px] text-gray-500 font-bold uppercase text-center mt-2">
                                Ao iniciar, a atividade aparecerá no painel e o tempo começará a contar.
                            </p>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};