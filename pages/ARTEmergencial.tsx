
import React, { useState, useEffect } from 'react';
import { CommonHeader } from '../components/CommonHeader';
import { SignatureSection } from '../components/SignatureSection';
import { StorageService } from '../services/storage';
import { HeaderData, DocumentRecord, ActiveMaintenance, SignatureRecord, RegisteredART, OMRecord } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, CheckCircle, AlertTriangle, MapPin, List, ArrowRight, FileText, X, Eye, ExternalLink, Info, BookOpen } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { FeedbackModal } from '../components/FeedbackModal';

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
  const [origin, setOrigin] = useState<'CORRETIVA' | 'DEMANDA_EXTRA'>('CORRETIVA');
  const [pendingDemandId, setPendingDemandId] = useState<string | undefined>(undefined);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);

  // Risk Map States
  const [selectedRiskId, setSelectedRiskId] = useState<number | null>(null);
  const [quadrantRisks, setQuadrantRisks] = useState<Record<string, number[]>>({
      'FRENTE': [], 'TRAS': [], 'ESQUERDA': [], 'DIREITA': []
  });
  const [checklistRisks, setChecklistRisks] = useState<Record<number, { checked: boolean; control: string }>>({});

  // PDF Viewer States
  const [viewingPdf, setViewingPdf] = useState<{ url: string, title: string, id?: string } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  useEffect(() => {
    setRegisteredARTs(StorageService.getARTs());

    if (location.state) {
        const stateData = location.state as any;
        setHeader(prev => ({ ...prev, ...stateData }));
        if (stateData.omId) setOmId(stateData.omId);
        if (stateData.origin) setOrigin(stateData.origin);
        if (stateData.demandId) setPendingDemandId(stateData.demandId);
    } else {
        const now = new Date();
        setHeader(prev => ({ ...prev, time: now.toTimeString().slice(0,5) }));
    }
  }, [location]);

  // Sincroniza ART selecionada para mostrar os passos
  useEffect(() => {
    const art = registeredARTs.find(a => a.id === selectedArtId);
    setSelectedArt(art || null);
  }, [selectedArtId, registeredARTs]);

  // Gerenciador de PDF Blobs (Evita memory leaks e corrige visualização mobile)
  useEffect(() => {
      let activeUrl: string | null = null;
      const loadPdf = async () => {
          if (!viewingPdf) { setPdfBlobUrl(null); return; }
          let pdfData = viewingPdf.url;
          
          if (!pdfData || pdfData === 'TRUE') {
              setIsLoadingPdf(true);
              const table = viewingPdf.title.includes('OM') ? 'oms' : 'arts';
              const remote = await StorageService.getRecordPdf(table as any, viewingPdf.id!);
              if (remote) pdfData = remote;
              setIsLoadingPdf(false);
          }
          
          if (pdfData && pdfData !== 'TRUE') {
              try {
                  if (pdfData.startsWith('data:application/pdf;base64,')) {
                      const byteCharacters = atob(pdfData.split(',')[1]);
                      const byteNumbers = new Array(byteCharacters.length);
                      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                      const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
                      activeUrl = URL.createObjectURL(blob);
                      setPdfBlobUrl(activeUrl);
                  } else {
                      setPdfBlobUrl(pdfData);
                  }
              } catch (e) { setPdfBlobUrl(pdfData); }
          }
      };
      loadPdf();
      return () => { if (activeUrl) URL.revokeObjectURL(activeUrl); };
  }, [viewingPdf]);

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
          status: 'RASCUNHO',
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
            id: crypto.randomUUID(), omId, header, startTime: nowIso, artId, artType: 'ART_EMERGENCIAL', origin, status: 'ANDAMENTO', currentSessionStart: nowIso, openedBy: localStorage.getItem('safemaint_user') || 'ADMIN'
        });
        if (pendingDemandId) await StorageService.deletePendingExtraDemand(pendingDemandId);
        setIsProcessing(false); setIsSuccess(true);
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
      <FeedbackModal isOpen={isProcessing || isSuccess} isSuccess={isSuccess} loadingText="LIBERANDO ATIVIDADE..." successText="EMERGÊNCIA LIBERADA!" />

      <div className="flex items-center gap-4 mb-4 border-b border-gray-200 pb-4 pt-4">
        <BackButton />
        <div className="bg-red-600/10 p-2 rounded-xl"><AlertTriangle className="text-red-600" size={24} /></div>
        <div>
            <h2 className="text-xl font-black text-vale-darkgray uppercase tracking-tighter leading-none">ART Emergencial</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Análise Preliminar de Risco (APR) - {origin.replace('_', ' ')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-9 space-y-4">
              <CommonHeader data={header} onChange={setHeader} title="Identificação do Equipamento" />

              {/* CONTROLES DE DOCUMENTOS (OM & ART) - COMPACTO */}
              <div className="flex flex-col md:flex-row gap-2 relative z-20">
                  {/* BOTÃO PDF DA OM */}
                  {header.om && header.om !== 'DEMANDA-EXTRA' && (
                      <button 
                        onClick={() => {
                            const oms = StorageService.getOMs();
                            const found = oms.find(o => o.omNumber === header.om);
                            if (found) setViewingPdf({ url: found.pdfUrl || 'TRUE', title: `OM: ${found.omNumber}`, id: found.id });
                            else alert("OM NÃO ENCONTRADA NO BANCO.");
                        }}
                        className="flex-none md:w-auto bg-white border border-gray-200 px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shadow-sm group h-9"
                      >
                          <div className="bg-red-50 text-red-600 p-1 rounded-md"><FileText size={14}/></div>
                          <span className="text-[9px] font-black uppercase text-gray-600">Visualizar OM</span>
                          <Eye size={14} className="text-gray-300 group-hover:text-red-600"/>
                      </button>
                  )}

                  {/* SELETOR E PDF DA ART PADRÃO - COMPACTO */}
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
                          <button onClick={() => setViewingPdf({ url: selectedArt.pdfUrl || 'TRUE', title: `ART: ${selectedArt.code}`, id: selectedArt.id })} className="h-7 w-7 flex items-center justify-center bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm transition-colors"><Eye size={14}/></button>
                      )}
                  </div>
              </div>

              {/* PASSOS DA ART (VISUALIZAÇÃO DE INSPEÇÃO) */}
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

              {/* MAPEAMENTO DE RISCOS */}
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
                  <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-200 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600"></div>
                      <h3 className="font-black text-sm text-gray-800 mb-4 flex items-center gap-2 uppercase"><ShieldCheck className="text-red-600" size={18} /> Status APR</h3>
                      <div className="space-y-3">
                          <div className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${header.om && header.tag ? 'border-green-100 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                              {header.om && header.tag ? <CheckCircle size={16} className="text-green-600"/> : <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>}
                              <div className="font-black text-[10px] uppercase">1. Identificação</div>
                          </div>
                          <div className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${Object.values(checklistRisks).some((r: any) => r.checked) || selectedArt ? 'border-green-100 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                              {Object.values(checklistRisks).some((r: any) => r.checked) || selectedArt ? <CheckCircle size={16} className="text-green-600"/> : <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>}
                              <div className="font-black text-[10px] uppercase">2. Riscos {selectedArt && '(ART VINC)'}</div>
                          </div>
                          <div className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${signatures.length > 0 ? 'border-green-100 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                              {signatures.length > 0 ? <CheckCircle size={16} className="text-green-600"/> : <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>}
                              <div className="font-black text-[10px] uppercase">3. Assinaturas</div>
                          </div>
                      </div>
                      <div className="mt-6"><button onClick={handleSave} disabled={!signatures.length || isProcessing} className={`w-full py-3 rounded-lg font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-md transition-all ${signatures.length ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-400'}`}><AlertTriangle size={16} /> Liberar</button></div>
                  </div>
              </div>
          </div>
      </div>

      {/* MODAL PDF VIEWER - OTIMIZADO PARA MOBILE 100DVH */}
      {viewingPdf && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-fadeIn overflow-hidden h-[100dvh]">
              <div className="bg-gray-900 px-4 py-2 flex justify-between items-center text-white shrink-0 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                      <FileText size={18} className="text-vale-green"/>
                      <div><h3 className="font-black text-sm uppercase tracking-tighter">{viewingPdf.title}</h3></div>
                  </div>
                  <div className="flex gap-2">
                    {pdfBlobUrl && <a href={pdfBlobUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 rounded hover:bg-gray-700 md:hidden"><ExternalLink size={16}/></a>}
                    <button onClick={() => setViewingPdf(null)} className="p-2 bg-white/10 rounded hover:bg-red-600"><X size={16}/></button>
                  </div>
              </div>
              <div className="flex-1 bg-black relative w-full h-full overflow-hidden">
                  {isLoadingPdf ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                          <Info size={48} className="animate-spin mb-2 opacity-30" />
                          <h4 className="font-black text-xs uppercase">BAIXANDO DOCUMENTO...</h4>
                      </div>
                  ) : pdfBlobUrl ? (
                      <iframe src={pdfBlobUrl} className="w-full h-full border-none" title="Viewer" />
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500"><AlertTriangle size={48} className="mb-2 opacity-30" /><h4 className="font-black text-xs uppercase">PDF INDISPONÍVEL</h4></div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
