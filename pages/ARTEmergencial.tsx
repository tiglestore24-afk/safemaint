import React, { useState, useEffect } from 'react';
import { CommonHeader } from '../components/CommonHeader';
import { SignatureSection } from '../components/SignatureSection';
import { StorageService } from '../services/storage';
import { HeaderData, DocumentRecord, ActiveMaintenance, SignatureRecord } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, CheckCircle } from 'lucide-react';
import { BackButton } from '../components/BackButton';

export const ARTEmergencial: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [header, setHeader] = useState<HeaderData>({
    om: '', tag: '', date: new Date().toISOString().split('T')[0], time: '', type: 'MECANICA', description: ''
  });
  
  // Guardar ID da OM vindo da Gestão de OM
  const [omId, setOmId] = useState<string | undefined>(undefined);

  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);

  // 360 Visual State
  const [selectedRiskId, setSelectedRiskId] = useState<number | null>(null);
  const [quadrantRisks, setQuadrantRisks] = useState<Record<string, number[]>>({
      'FRENTE': [],
      'TRAS': [],
      'ESQUERDA': [],
      'DIREITA': []
  });

  // Standard Risks List from PDF
  const [checklistRisks, setChecklistRisks] = useState<Record<number, { checked: boolean; control: string }>>({});

  useEffect(() => {
    // Check for state passed from Dashboard (Resume functionality)
    if (location.state) {
        const stateData = location.state as any;
        setHeader(prev => ({
            ...prev,
            ...stateData
        }));
        if (stateData.omId) setOmId(stateData.omId);
    } else {
        const now = new Date();
        setHeader(prev => ({ ...prev, time: now.toTimeString().slice(0,5) }));
    }
  }, [location]);

  const handleRiskChange = (id: number, checked: boolean) => {
    setChecklistRisks(prev => {
        const current = prev[id] || { checked: false, control: '' };
        return {
            ...prev,
            [id]: { ...current, checked }
        };
    });
    
    // Auto-select for placement if checked
    if(checked) {
        setSelectedRiskId(id);
    } else {
        // Remove from quadrants if unchecked
        const newQuad = { ...quadrantRisks };
        Object.keys(newQuad).forEach(key => {
            newQuad[key] = newQuad[key].filter(rId => rId !== id);
        });
        setQuadrantRisks(newQuad);
        if(selectedRiskId === id) setSelectedRiskId(null);
    }
  };

  const handleControlChange = (id: number, control: string) => {
    setChecklistRisks(prev => {
        const current = prev[id] || { checked: false, control: '' };
        return {
            ...prev,
            [id]: { ...current, control }
        };
    });
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
    // Basic validation fields
    if(!header.om || !header.tag) {
        alert("PREENCHA OM E TAG.");
        return;
    }

    if(signatures.length === 0) {
        alert("ASSINATURA OBRIGATÓRIA PARA INICIAR.");
        return;
    }

    const artId = crypto.randomUUID();
    const doc: DocumentRecord = {
      id: artId,
      type: 'ART_EMERGENCIAL',
      header,
      createdAt: new Date().toISOString(),
      status: 'ATIVO',
      content: { quadrantRisks, checklistRisks },
      signatures
    };
    
    StorageService.saveDocument(doc);
    
    // START CORRECTIVE MAINTENANCE (RED)
    const nowIso = new Date().toISOString();
    const activeTask: ActiveMaintenance = {
        id: crypto.randomUUID(),
        omId: omId,
        header,
        startTime: nowIso,
        artId: artId,
        artType: 'ART_EMERGENCIAL',
        origin: 'CORRETIVA', // RED CARD
        status: 'ANDAMENTO',
        currentSessionStart: nowIso // INICIA CONTADOR IMEDIATAMENTE
    };
    // ATUALIZA STATUS NO SUPABASE
    StorageService.startMaintenance(activeTask);

    alert('ART SALVA E MANUTENÇÃO CORRETIVA INICIADA!');
    navigate('/dashboard'); // Always go to Dashboard
  };

  const riskList = [
    "CONTATO COM SUPERFÍCIES CORTANTES/PERFURANTE",
    "PRENSAMENTO DE DEDOS OU MÃOS",
    "QUEDA DE PEÇAS/ESTRUTURAS/EQUIPAMENTOS",
    "PRENSAMENTO OU AGARRAMENTO DO CORPO",
    "ATROPELAMENTO/ESMAGAMENTO POR VEÍCULOS",
    "QUEDA, TROPEÇO OU ESCORREGÃO",
    "ANIMAIS PEÇONHENTOS/INSETOS",
    "DESMORONAMENTOS DE PILHAS",
    "QUEDA DE PLATAFORMA OU ESCADAS",
    "ARCO E/OU CHOQUE ELÉTRICO",
    "FONTES DE ENERGIA (HIDRÁULICA, PNEUMÁTICA, ETC)",
    "EXPOSIÇÃO A VAPORES, CONDENSADOS OU QUENTES",
    "GASES, VAPORES, POEIRAS OU FUMOS",
    "PRODUTOS QUÍMICOS OU QUEIMADURAS",
    "PROJEÇÃO DE MATERIAIS NA FACE/OLHOS",
    "CONDIÇÕES CLIMÁTICAS ADVERSAS",
    "QUEDA DE HOMEM AO MAR/AFOGAMENTO",
    "INTERFERÊNCIA ENTRE EQUIPES",
    "EXCESSO OU DEFICIÊNCIA DE ILUMINAÇÃO",
    "OUTRAS SITUAÇÕES DE RISCO"
  ];

  // Helper Check for Status
  const hasHeader = !!(header.om && header.tag);
  const hasRisks = Object.values(checklistRisks).some(r => r.checked);
  const hasSignatures = signatures.length > 0;

  return (
    <div className="max-w-7xl mx-auto pb-24 px-4 md:px-6 relative">
      <div className="flex items-center gap-3 mb-6 border-b pb-4 pt-4">
        <BackButton className="mr-2" />
        <div className="bg-red-600 p-2 rounded-lg text-white shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div>
            <h2 className="text-2xl font-black text-vale-darkgray uppercase tracking-tight">
                ART EMERGENCIAL
            </h2>
            <p className="text-xs font-bold text-gray-400">ANÁLISE DE RISCO - MANUTENÇÃO CORRETIVA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* COLUNA ESQUERDA: CONTEÚDO PRINCIPAL */}
          <div className="lg:col-span-2 space-y-6">
              
              <CommonHeader data={header} onChange={setHeader} />

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Checklist Grid */}
                  <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-100">
                    <h3 className="text-lg font-black mb-4 text-gray-700 flex items-center gap-2">
                        <span className="bg-vale-dark text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                        SELECIONE OS RISCOS E MEDIDAS
                    </h3>
                    <p className="text-xs text-gray-500 mb-2 italic">AO MARCAR UM RISCO, DESCREVA A MEDIDA DE CONTROLE.</p>
                    
                    <div className="space-y-4 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {riskList.map((risk, idx) => {
                        const index = idx + 1;
                        const isSelectedForPlacement = selectedRiskId === index;
                        const isChecked = checklistRisks[index]?.checked || false;

                        return (
                          <div key={index} className={`border border-gray-200 rounded-lg p-3 transition-colors ${isChecked ? 'bg-red-50 border-red-300' : 'hover:bg-gray-50'}`}>
                            <div className="flex items-start gap-3">
                              <input 
                                type="checkbox" 
                                id={`risk-${index}`}
                                className="mt-1 h-5 w-5 text-red-600 rounded focus:ring-red-500"
                                checked={isChecked}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleRiskChange(index, e.currentTarget.checked)}
                              />
                              <div className="flex-1">
                                <label 
                                    htmlFor={`risk-${index}`}
                                    className={`block text-sm font-black mb-1 cursor-pointer ${isSelectedForPlacement ? 'text-vale-blue' : 'text-gray-700'}`}
                                    onClick={(e) => {
                                        // Prevent double triggering if clicking label vs box
                                        if(!isChecked) return;
                                        setSelectedRiskId(index);
                                    }}
                                >
                                  <span className="font-bold mr-1 text-gray-400">#{index}</span> {risk}
                                </label>
                                
                                {/* Inline Control Measure Input */}
                                {isChecked && (
                                    <div className="mt-2 animate-fadeIn">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">MEDIDA DE CONTROLE:</label>
                                        <textarea
                                            rows={2}
                                            placeholder="DESCREVA COMO CONTROLAR..."
                                            className="w-full border-red-300 rounded text-sm p-2 focus:ring-red-500 focus:border-red-500 shadow-sm border font-bold"
                                            value={checklistRisks[index]?.control || ''}
                                            onChange={(e) => handleControlChange(index, e.target.value)}
                                            autoFocus // Focus automatically when opened
                                        />
                                        <div className="mt-1 flex justify-end">
                                             <button 
                                                onClick={() => setSelectedRiskId(index)} 
                                                className="text-[10px] bg-blue-100 text-vale-blue px-2 py-1 rounded hover:bg-blue-200 font-bold"
                                             >
                                                 POSICIONAR NO MAPA 360º
                                             </button>
                                        </div>
                                    </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 360 Analysis Section */}
                  <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-100 flex flex-col items-center">
                    <h3 className="text-lg font-black mb-4 text-gray-700 flex items-center gap-2 w-full">
                         <span className="bg-vale-dark text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                         ANÁLISE 360º (QUADRANTES)
                    </h3>
                    
                    {selectedRiskId ? (
                        <div className="mb-4 px-4 py-2 bg-blue-100 text-vale-blue rounded-full font-bold text-sm animate-pulse shadow-sm text-center">
                            ONDE ESTÁ O RISCO #{selectedRiskId}?<br/>CLIQUE NO QUADRANTE.
                        </div>
                    ) : (
                        <div className="mb-4 h-12 flex items-center justify-center text-xs text-gray-400 font-bold">
                            SELECIONE UM RISCO NA LISTA.
                        </div>
                    )}

                    <div className="relative w-full max-w-sm aspect-square my-4">
                        {/* SVG Visual Radar */}
                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
                            <circle cx="50" cy="50" r="48" fill="#f8fafc" stroke="#334155" strokeWidth="0.5" />
                            <line x1="50" y1="2" x2="50" y2="98" stroke="#cbd5e1" strokeWidth="0.5" />
                            <line x1="2" y1="50" x2="98" y2="50" stroke="#cbd5e1" strokeWidth="0.5" />
                            
                            {/* Zones - FRENTE */}
                            <path 
                                d="M50 50 L15 15 A 49 49 0 0 1 85 15 Z" 
                                fill={selectedRiskId ? "rgba(59, 130, 246, 0.05)" : "transparent"}
                                className="cursor-pointer hover:fill-blue-200 transition-colors"
                                onClick={() => handleQuadrantClick('FRENTE')}
                            />
                            <text x="50" y="12" textAnchor="middle" fontSize="5" fontWeight="black" fill="#64748b">FRENTE</text>
                            
                            {/* Zones - DIREITA */}
                            <path 
                                d="M50 50 L85 15 A 49 49 0 0 1 85 85 Z" 
                                fill={selectedRiskId ? "rgba(59, 130, 246, 0.05)" : "transparent"}
                                className="cursor-pointer hover:fill-blue-200 transition-colors"
                                onClick={() => handleQuadrantClick('DIREITA')}
                            />
                            <text x="92" y="52" textAnchor="middle" fontSize="5" fontWeight="black" fill="#64748b">DIREITA</text>

                            {/* Zones - TRAS */}
                            <path 
                                d="M50 50 L85 85 A 49 49 0 0 1 15 85 Z" 
                                fill={selectedRiskId ? "rgba(59, 130, 246, 0.05)" : "transparent"}
                                className="cursor-pointer hover:fill-blue-200 transition-colors"
                                onClick={() => handleQuadrantClick('TRAS')}
                            />
                            <text x="50" y="93" textAnchor="middle" fontSize="5" fontWeight="black" fill="#64748b">TRÁS</text>

                            {/* Zones - ESQUERDA */}
                            <path 
                                d="M50 50 L15 85 A 49 49 0 0 1 15 15 Z" 
                                fill={selectedRiskId ? "rgba(59, 130, 246, 0.05)" : "transparent"}
                                className="cursor-pointer hover:fill-blue-200 transition-colors"
                                onClick={() => handleQuadrantClick('ESQUERDA')}
                            />
                             <text x="8" y="52" textAnchor="middle" fontSize="5" fontWeight="black" fill="#64748b">ESQUERDA</text>
                             
                             {/* Center User */}
                             <circle cx="50" cy="50" r="4" fill="#3b82f6" stroke="white" strokeWidth="1" />
                        </svg>

                        {/* Risk Numbers Overlay */}
                        <div className="absolute top-8 left-0 right-0 text-center flex justify-center flex-wrap gap-1 px-12 pointer-events-none">
                            {quadrantRisks['FRENTE'].map(r => <span key={r} className="bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-white font-bold">{r}</span>)}
                        </div>
                         <div className="absolute top-0 bottom-0 right-4 flex flex-col justify-center gap-1 w-10 pointer-events-none">
                            {quadrantRisks['DIREITA'].map(r => <span key={r} className="bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-white font-bold">{r}</span>)}
                        </div>
                         <div className="absolute bottom-8 left-0 right-0 text-center flex justify-center flex-wrap gap-1 px-12 pointer-events-none">
                            {quadrantRisks['TRAS'].map(r => <span key={r} className="bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-white font-bold">{r}</span>)}
                        </div>
                         <div className="absolute top-0 bottom-0 left-4 flex flex-col justify-center gap-1 w-10 pointer-events-none">
                            {quadrantRisks['ESQUERDA'].map(r => <span key={r} className="bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-white font-bold">{r}</span>)}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded text-xs text-gray-500 w-full mt-4 font-bold border">
                        <strong>DICA:</strong> MARQUE O RISCO, DIGITE A MEDIDA E CLIQUE NO QUADRANTE.
                    </div>
                  </div>
              </div>

              <SignatureSection signatures={signatures} onUpdate={setSignatures} />
          </div>

          {/* COLUNA DIREITA: STATUS & RESUMO */}
          <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-4">
                  <div className="bg-vale-dark text-white rounded-xl shadow-lg p-6 border-b-4 border-vale-green">
                      <h3 className="font-black text-lg mb-4 flex items-center gap-2">
                          <ShieldCheck className="text-vale-green" /> STATUS
                      </h3>
                      
                      <div className="space-y-4">
                          <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${hasHeader ? 'bg-green-900/30 border-green-700/50 text-green-100' : 'bg-gray-700 border-gray-600 text-gray-400'}`}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${hasHeader ? 'border-green-400 bg-vale-green text-white' : 'border-gray-500'}`}>
                                  {hasHeader ? <CheckCircle size={14} /> : '1'}
                              </div>
                              <div className="text-xs font-bold">CABEÇALHO PREENCHIDO</div>
                          </div>

                          <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${hasRisks ? 'bg-green-900/30 border-green-700/50 text-green-100' : 'bg-gray-700 border-gray-600 text-gray-400'}`}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${hasRisks ? 'border-green-400 bg-vale-green text-white' : 'border-gray-500'}`}>
                                  {hasRisks ? <CheckCircle size={14} /> : '2'}
                              </div>
                              <div className="text-xs font-bold">RISCOS IDENTIFICADOS</div>
                          </div>

                          <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${hasSignatures ? 'bg-green-900/30 border-green-700/50 text-green-100' : 'bg-gray-700 border-gray-600 text-gray-400'}`}>
                               <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${hasSignatures ? 'border-green-400 bg-vale-green text-white' : 'border-gray-500'}`}>
                                  {hasSignatures ? <CheckCircle size={14} /> : '3'}
                              </div>
                              <div className="text-xs font-bold">ASSINATURAS COLETADAS</div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <button 
            onClick={handleSave}
            className={`px-8 py-4 rounded-full shadow-xl font-black text-lg flex items-center justify-center gap-3 transform transition hover:scale-105 border-4 border-white ${hasSignatures ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            SALVAR / INICIAR
        </button>
      </div>
    </div>
  );
};