import React, { useState, useEffect } from 'react';
import { CommonHeader } from '../components/CommonHeader';
import { SignatureSection } from '../components/SignatureSection';
import { StorageService } from '../services/storage';
import { HeaderData, DocumentRecord, Employee, ActiveMaintenance, SignatureRecord } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const ARTEmergencial: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [header, setHeader] = useState<HeaderData>({
    om: '', tag: '', date: new Date().toISOString().split('T')[0], time: '', type: 'MECANICA', description: ''
  });

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
        const stateData = location.state as HeaderData;
        setHeader(prev => ({
            ...prev,
            ...stateData
        }));
    } else {
        const now = new Date();
        setHeader(prev => ({ ...prev, time: now.toTimeString().slice(0,5) }));
    }
  }, [location]);

  const handleRiskChange = (id: number, checked: boolean) => {
    setChecklistRisks(prev => ({
      ...prev,
      [id]: { ...prev[id], checked }
    }));
    
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
    setChecklistRisks(prev => ({
      ...prev,
      [id]: { ...prev[id], control }
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
    const activeTask: ActiveMaintenance = {
        id: crypto.randomUUID(),
        header,
        startTime: new Date().toISOString(),
        artId: artId,
        artType: 'ART_EMERGENCIAL',
        origin: 'CORRETIVA' // RED CARD
    };
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

  return (
    <div className="max-w-6xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6 border-b pb-4">
        <button onClick={() => navigate(-1)} className="mr-2 p-2 rounded-full hover:bg-gray-200">
            <ArrowLeft size={24} />
        </button>
        <div className="bg-red-600 p-2 rounded-lg text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <h2 className="text-2xl font-black text-gray-800">
            ART EMERGENCIAL
        </h2>
      </div>

      <CommonHeader data={header} onChange={setHeader} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Checklist Grid */}
          <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-100 mb-6">
            <h3 className="text-lg font-black mb-4 text-gray-700 flex items-center gap-2">
                <span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
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
                        onChange={(e) => handleRiskChange(index, e.target.checked)}
                      />
                      <div className="flex-1">
                        <label 
                            htmlFor={`risk-${index}`}
                            className={`block text-sm font-black mb-1 cursor-pointer ${isSelectedForPlacement ? 'text-blue-800' : 'text-gray-700'}`}
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
                                        className="text-[10px] bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 font-bold"
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
          <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-100 mb-6 flex flex-col items-center">
            <h3 className="text-lg font-black mb-4 text-gray-700 flex items-center gap-2 w-full">
                 <span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                 ANÁLISE 360º (QUADRANTES)
            </h3>
            
            {selectedRiskId ? (
                <div className="mb-4 px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-bold text-sm animate-pulse shadow-sm text-center">
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

      <div className="fixed bottom-6 right-6 z-50">
        <button 
            onClick={handleSave}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full shadow-xl font-black text-lg flex items-center justify-center gap-3 transform transition hover:scale-105 border-4 border-white"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            SALVAR / INICIAR
        </button>
      </div>
    </div>
  );
};