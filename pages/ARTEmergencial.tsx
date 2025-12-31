
import React, { useState, useEffect } from 'react';
import { CommonHeader } from '../components/CommonHeader';
import { SignatureSection } from '../components/SignatureSection';
import { StorageService } from '../services/storage';
import { HeaderData, DocumentRecord, ActiveMaintenance, SignatureRecord } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, CheckCircle, AlertTriangle, MapPin, List, ArrowRight } from 'lucide-react';
import { BackButton } from '../components/BackButton';

export const ARTEmergencial: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [header, setHeader] = useState<HeaderData>({
    om: '', tag: '', date: new Date().toISOString().split('T')[0], time: '', type: 'MECANICA', description: ''
  });
  
  const [omId, setOmId] = useState<string | undefined>(undefined);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);

  const [selectedRiskId, setSelectedRiskId] = useState<number | null>(null);
  const [quadrantRisks, setQuadrantRisks] = useState<Record<string, number[]>>({
      'FRENTE': [], 'TRAS': [], 'ESQUERDA': [], 'DIREITA': []
  });

  const [checklistRisks, setChecklistRisks] = useState<Record<number, { checked: boolean; control: string }>>({});

  useEffect(() => {
    if (location.state) {
        const stateData = location.state as any;
        setHeader(prev => ({ ...prev, ...stateData }));
        if (stateData.omId) setOmId(stateData.omId);
    } else {
        const now = new Date();
        setHeader(prev => ({ ...prev, time: now.toTimeString().slice(0,5) }));
    }
  }, [location]);

  const handleRiskChange = (id: number, checked: boolean) => {
    setChecklistRisks(prev => ({
        ...prev,
        [id]: { ...(prev[id] || { control: '' }), checked }
    }));
    
    if(checked) {
        setSelectedRiskId(id);
    } else {
        const newQuad = { ...quadrantRisks };
        Object.keys(newQuad).forEach(key => {
            newQuad[key] = newQuad[key].filter(rId => rId !== id);
        });
        setQuadrantRisks(newQuad);
        if(selectedRiskId === id) setSelectedRiskId(null);
    }
  };

  const handleControlChange = (id: number, control: string) => {
    setChecklistRisks(prev => ({
        ...prev,
        [id]: { ...(prev[id] || { checked: false }), control }
    }));
  };

  const handleQuadrantClick = (quadrant: string) => {
    if (selectedRiskId !== null) {
        const newQuad = { ...quadrantRisks };
        Object.keys(newQuad).forEach(key => {
            newQuad[key] = newQuad[key].filter(rId => rId !== selectedRiskId);
        });
        newQuad[quadrant].push(selectedRiskId);
        setQuadrantRisks(newQuad);
        setSelectedRiskId(null);
    }
  };

  const handleSave = () => {
    if(!header.om || !header.tag) { alert("PREENCHA OM E TAG."); return; }
    if(signatures.length === 0) { alert("ASSINATURA OBRIGATÓRIA."); return; }

    const artId = crypto.randomUUID();
    const doc: DocumentRecord = {
      id: artId,
      type: 'ART_EMERGENCIAL',
      header,
      createdAt: new Date().toISOString(),
      status: 'RASCUNHO',
      content: { quadrantRisks, checklistRisks },
      signatures
    };
    
    StorageService.saveDocument(doc);
    
    const nowIso = new Date().toISOString();
    const currentUser = localStorage.getItem('safemaint_user') || 'ADMIN';

    const activeTask: ActiveMaintenance = {
        id: crypto.randomUUID(),
        omId: omId,
        header,
        startTime: nowIso,
        artId: artId,
        artType: 'ART_EMERGENCIAL',
        origin: 'CORRETIVA',
        status: 'ANDAMENTO',
        currentSessionStart: nowIso,
        openedBy: currentUser
    };
    StorageService.startMaintenance(activeTask);

    alert('ART SALVA E MANUTENÇÃO CORRETIVA INICIADA!');
    navigate('/dashboard');
  };

  const riskList = [
    "CONTATO COM SUPERFÍCIES CORTANTES/PERFURANTE", "PRENSAMENTO DE DEDOS OU MÃOS", "QUEDA DE PEÇAS/ESTRUTURAS/EQUIPAMENTOS",
    "PRENSAMENTO OU AGARRAMENTO DO CORPO", "ATROPELAMENTO/ESMAGAMENTO POR VEÍCULOS", "QUEDA, TROPEÇO OU ESCORREGÃO",
    "ANIMAIS PEÇONHENTOS/INSETOS", "DESMORONAMENTOS DE PILHAS", "QUEDA DE PLATAFORMA OU ESCADAS", "ARCO E/OU CHOQUE ELÉTRICO",
    "FONTES DE ENERGIA (HIDRÁULICA, PNEUMÁTICA)", "EXPOSIÇÃO A VAPORES, CONDENSADOS OU QUENTES", "GASES, VAPORES, POEIRAS OU FUMOS",
    "PRODUTOS QUÍMICOS OU QUEIMADURAS", "PROJEÇÃO DE MATERIAIS NA FACE/OLHOS", "CONDIÇÕES CLIMÁTICAS ADVERSAS",
    "QUEDA DE HOMEM AO MAR/AFOGAMENTO", "INTERFERÊNCIA ENTRE EQUIPES", "EXCESSO OU DEFICIÊNCIA DE ILUMINAÇÃO", "OUTRAS SITUAÇÕES DE RISCO"
  ];

  const hasHeader = !!(header.om && header.tag);
  const hasRisks = Object.values(checklistRisks).some((r: any) => r.checked);
  const hasSignatures = signatures.length > 0;

  return (
    <div className="max-w-7xl mx-auto pb-32 px-4 relative">
      {/* Title Header */}
      <div className="flex items-center gap-4 mb-8 border-b border-gray-200 pb-6 pt-6">
        <BackButton />
        <div className="bg-red-600/10 p-2 rounded-xl">
            <AlertTriangle className="text-red-600" size={28} />
        </div>
        <div>
            <h2 className="text-2xl font-black text-vale-darkgray uppercase tracking-tighter leading-none">ART Emergencial</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Análise Preliminar de Risco (APR) - Corretiva</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* LEFT CONTENT */}
          <div className="xl:col-span-8 space-y-8">
              <CommonHeader data={header} onChange={setHeader} title="Identificação do Equipamento" />

              {/* UNIFIED RISK COCKPIT */}
              <section className="bg-white rounded-[2rem] shadow-lg border border-gray-100 overflow-hidden flex flex-col">
                  {/* Cockpit Header */}
                  <div className="bg-gray-50 p-6 border-b flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="bg-vale-dark text-white w-6 h-6 rounded-full flex items-center justify-center font-black text-xs">2</div>
                          <h3 className="font-black text-gray-700 uppercase tracking-tight">Mapeamento de Riscos e Ambiente</h3>
                      </div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase hidden sm:block tracking-wider">
                          Selecione o risco &rarr; Posicione no Mapa
                      </div>
                  </div>

                  <div className="flex flex-col lg:flex-row h-[650px]">
                      {/* Left: Scrollable List */}
                      <div className="flex-1 border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col h-full">
                          <div className="p-3 bg-gray-50/50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
                              <List size={14}/> Lista de Verificação Padrão
                          </div>
                          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                              {riskList.map((risk, idx) => {
                                  const index = idx + 1;
                                  const isChecked = checklistRisks[index]?.checked || false;
                                  const isActive = selectedRiskId === index;
                                  
                                  return (
                                    <div 
                                        key={index} 
                                        className={`
                                            border rounded-xl p-3 transition-all duration-200 cursor-pointer
                                            ${isActive ? 'ring-2 ring-blue-400 border-blue-400 bg-blue-50 shadow-md transform scale-[1.02]' : isChecked ? 'bg-red-50 border-red-200' : 'hover:bg-gray-50 border-gray-200'}
                                        `}
                                        onClick={(e) => {
                                            // Click anywhere on card to toggle if not input
                                            if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                                                if(!isChecked) handleRiskChange(index, true);
                                                else setSelectedRiskId(index);
                                            }
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input 
                                                type="checkbox" 
                                                checked={isChecked}
                                                onChange={(e) => handleRiskChange(index, e.target.checked)}
                                                className="mt-1 h-5 w-5 text-red-600 rounded border-gray-300 focus:ring-red-500 shrink-0"
                                            />
                                            <div className="flex-1">
                                                <span className={`text-xs font-black uppercase leading-tight block ${isActive ? 'text-blue-800' : 'text-gray-700'}`}>
                                                    <span className="text-gray-400 mr-2">#{index}</span>{risk}
                                                </span>
                                                
                                                {isChecked && (
                                                    <div className="mt-3 animate-fadeIn">
                                                        <textarea 
                                                            className="w-full text-[10px] p-2 border border-red-200 rounded bg-white focus:ring-1 focus:ring-red-500 outline-none uppercase font-bold"
                                                            placeholder="MEDIDA DE CONTROLE..."
                                                            rows={2}
                                                            value={checklistRisks[index]?.control || ''}
                                                            onChange={(e) => handleControlChange(index, e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            {isActive && <div className="text-blue-500 animate-pulse"><MapPin size={18} fill="currentColor"/></div>}
                                        </div>
                                    </div>
                                  );
                              })}
                          </div>
                      </div>

                      {/* Right: 360 Map */}
                      <div className="lg:w-[45%] bg-gray-50/30 flex flex-col relative">
                           <div className="p-3 bg-gray-50/50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
                              <MapPin size={14}/> Radar 360º (Entorno)
                          </div>
                          
                          <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                                {selectedRiskId && (
                                    <div className="absolute top-4 left-0 right-0 px-4 z-20">
                                        <div className="bg-blue-600 text-white p-3 rounded-xl shadow-lg flex items-center justify-center gap-3 animate-bounce">
                                            <span className="font-black text-xs uppercase">Risco #{selectedRiskId} Selecionado</span>
                                            <ArrowRight size={16} />
                                            <span className="font-bold text-[10px] uppercase">Clique no Quadrante</span>
                                        </div>
                                    </div>
                                )}

                                <div className="relative w-full max-w-[320px] aspect-square">
                                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
                                        {/* Base */}
                                        <circle cx="50" cy="50" r="48" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                                        <line x1="50" y1="2" x2="50" y2="98" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2" />
                                        <line x1="2" y1="50" x2="98" y2="50" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2" />
                                        
                                        {/* Quadrants - Interactive */}
                                        <path d="M50 50 L15 15 A 49 49 0 0 1 85 15 Z" fill={selectedRiskId ? "rgba(59, 130, 246, 0.1)" : "transparent"} className="cursor-pointer hover:fill-blue-200 transition-colors" onClick={() => handleQuadrantClick('FRENTE')} />
                                        <path d="M50 50 L85 15 A 49 49 0 0 1 85 85 Z" fill={selectedRiskId ? "rgba(59, 130, 246, 0.1)" : "transparent"} className="cursor-pointer hover:fill-blue-200 transition-colors" onClick={() => handleQuadrantClick('DIREITA')} />
                                        <path d="M50 50 L85 85 A 49 49 0 0 1 15 85 Z" fill={selectedRiskId ? "rgba(59, 130, 246, 0.1)" : "transparent"} className="cursor-pointer hover:fill-blue-200 transition-colors" onClick={() => handleQuadrantClick('TRAS')} />
                                        <path d="M50 50 L15 85 A 49 49 0 0 1 15 15 Z" fill={selectedRiskId ? "rgba(59, 130, 246, 0.1)" : "transparent"} className="cursor-pointer hover:fill-blue-200 transition-colors" onClick={() => handleQuadrantClick('ESQUERDA')} />
                                        
                                        {/* Labels */}
                                        <text x="50" y="10" textAnchor="middle" fontSize="4" fontWeight="900" fill="#94a3b8">FRENTE</text>
                                        <text x="94" y="52" textAnchor="middle" fontSize="4" fontWeight="900" fill="#94a3b8">DIR</text>
                                        <text x="50" y="95" textAnchor="middle" fontSize="4" fontWeight="900" fill="#94a3b8">TRÁS</text>
                                        <text x="6" y="52" textAnchor="middle" fontSize="4" fontWeight="900" fill="#94a3b8">ESQ</text>

                                        {/* User Center */}
                                        <circle cx="50" cy="50" r="5" fill="#1e293b" stroke="white" strokeWidth="2" />
                                    </svg>

                                    {/* Risk Bubbles Overlay */}
                                    <div className="absolute inset-0 pointer-events-none">
                                         <div className="absolute top-6 left-0 right-0 flex justify-center gap-1 flex-wrap px-10">{quadrantRisks['FRENTE'].map(r => <span key={r} className="w-5 h-5 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center shadow border border-white">{r}</span>)}</div>
                                         <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1 flex-wrap px-10">{quadrantRisks['TRAS'].map(r => <span key={r} className="w-5 h-5 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center shadow border border-white">{r}</span>)}</div>
                                         <div className="absolute top-0 bottom-0 right-2 flex flex-col justify-center gap-1 py-10 w-6 items-center">{quadrantRisks['DIREITA'].map(r => <span key={r} className="w-5 h-5 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center shadow border border-white">{r}</span>)}</div>
                                         <div className="absolute top-0 bottom-0 left-2 flex flex-col justify-center gap-1 py-10 w-6 items-center">{quadrantRisks['ESQUERDA'].map(r => <span key={r} className="w-5 h-5 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center shadow border border-white">{r}</span>)}</div>
                                    </div>
                                </div>

                                <div className="mt-8 bg-white p-4 rounded-xl border border-gray-200 text-center w-full max-w-xs shadow-sm">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase">
                                        <span className="text-red-600">{Object.values(quadrantRisks).flat().length}</span> Riscos Posicionados
                                    </p>
                                </div>
                          </div>
                      </div>
                  </div>
              </section>

              <SignatureSection signatures={signatures} onUpdate={setSignatures} />
          </div>

          {/* RIGHT COLUMN - STATUS */}
          <div className="xl:col-span-4">
              <div className="sticky top-6">
                  <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-gray-100 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 to-red-600"></div>
                      <h3 className="font-black text-lg text-gray-800 mb-6 flex items-center gap-2 uppercase">
                          <ShieldCheck className="text-red-600" /> Status da APR
                      </h3>
                      
                      <div className="space-y-4">
                          <div className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${hasHeader ? 'border-green-100 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                              {hasHeader ? <CheckCircle size={20} className="fill-green-200 text-green-600"/> : <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>}
                              <div className="font-black text-xs uppercase">1. Identificação</div>
                          </div>
                          
                          <div className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${hasRisks ? 'border-green-100 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                              {hasRisks ? <CheckCircle size={20} className="fill-green-200 text-green-600"/> : <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>}
                              <div className="font-black text-xs uppercase">2. Seleção de Riscos</div>
                          </div>

                          <div className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${hasSignatures ? 'border-green-100 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                              {hasSignatures ? <CheckCircle size={20} className="fill-green-200 text-green-600"/> : <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>}
                              <div className="font-black text-xs uppercase">3. Assinaturas</div>
                          </div>
                      </div>

                      <div className="mt-8">
                          <button 
                            onClick={handleSave}
                            disabled={!hasSignatures}
                            className={`
                                w-full py-4 rounded-xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-3 shadow-lg transition-all
                                ${hasSignatures ? 'bg-red-600 text-white hover:bg-red-700 hover:scale-105' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                            `}
                        >
                            <AlertTriangle size={18} fill="currentColor" className="text-white/20" />
                            Liberar Emergência
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
