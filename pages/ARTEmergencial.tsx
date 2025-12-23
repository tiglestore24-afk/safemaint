
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { HeaderData, DocumentRecord, SignatureRecord } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { CommonHeader } from '../components/CommonHeader';
import { SignatureSection } from '../components/SignatureSection';
import { 
  ArrowLeft, CheckCircle, MousePointer2, Hammer, Hand, AlertCircle, Activity, 
  Footprints, Skull, Zap, Thermometer, Wind, Droplets, EyeOff, Waves, Eye, Plus
} from 'lucide-react';

const RISKS_MASTER = [
  { id: 1, label: "CONTATO COM SUPERFÍCIES CORTANTES/ PERFURANTE.", icon: <Hammer size={16}/> },
  { id: 2, label: "PRENSAMENTO DE DEDOS OU MÃOS.", icon: <Hand size={16}/> },
  { id: 3, label: "QUEDA DE PEÇAS/ ESTRUTURAS/ EQUIPAMENTOS.", icon: <AlertCircle size={16}/> },
  { id: 4, label: "PRENSAMENTO OU AGARRAMENTO DO CORPO.", icon: <Activity size={16}/> },
  { id: 5, label: "ATROPELAMENTO/ ESMAGAMENTO POR VEÍCULOS.", icon: <Footprints size={16}/> },
  { id: 6, label: "QUEDA, TROPEÇO OU ESCORREGÃO NO ACESSO.", icon: <Footprints size={16}/> },
  { id: 7, label: "ANIMAIS PEÇONHENTOS/ INSETOS/ SELVAGEM.", icon: <Skull size={16}/> },
  { id: 8, label: "DESMORONAMENTOS DE PILHAS/MATERIAIS.", icon: <AlertCircle size={16}/> },
  { id: 9, label: "QUEDA DE PLATAFORMA OU DE ESCADAS.", icon: <AlertCircle size={16}/> },
  { id: 10, label: "ARCO E/OU CHOQUE ELÉTRICO.", icon: <Zap size={16}/> },
  { id: 11, label: "FONTES DE ENERGIA (HIDRÁULICA, ETC).", icon: <Zap size={16}/> },
  { id: 12, label: "EXPOSIÇÃO A VAPORES/SUPERFÍCIES QUENTES.", icon: <Thermometer size={16}/> },
  { id: 13, label: "GASES, VAPORES, POEIRAS OU FUMOS.", icon: <Wind size={16}/> },
  { id: 14, label: "PRODUTOS QUÍMICOS OU QUEIMADURAS.", icon: <Droplets size={16}/> },
  { id: 15, label: "PROJEÇÃO DE MATERIAIS FACE/OLHOS.", icon: <EyeOff size={16}/> },
  { id: 16, label: "CONDIÇÕES CLIMÁTICAS ADVERSAS.", icon: <Wind size={16}/> },
  { id: 17, label: "QUEDA DE HOMEM AO MAR/AFOGAMENTO.", icon: <Waves size={16}/> },
  { id: 18, label: "INTERFERÊNCIA ENTRE EQUIPES.", icon: <AlertCircle size={16}/> },
  { id: 19, label: "EXCESSO OU DEFICIÊNCIA DE ILUMINAÇÃO.", icon: <Eye size={16}/> },
  { id: 20, label: "OUTRAS SITUAÇÕES DE RISCO:", icon: <Plus size={16}/>, isOther: true },
  { id: 21, label: "OUTRAS SITUAÇÕES DE RISCO:", icon: <Plus size={16}/>, isOther: true },
  { id: 22, label: "OUTRAS SITUAÇÕES DE RISCO:", icon: <Plus size={16}/>, isOther: true },
  { id: 23, label: "OUTRAS SITUAÇÕES DE RISCO:", icon: <Plus size={16}/>, isOther: true },
];

const RadarMap = ({ title, quadrants, onQuadrantClick, selectedRisk }: any) => (
  <div className="flex flex-col items-center border-2 border-gray-100 p-4 rounded-3xl bg-gray-50 shadow-inner">
    <h4 className="text-[10px] font-black text-vale-darkgray mb-3 uppercase border-b-2 border-vale-blue w-full text-center pb-1">{title}</h4>
    <div className="relative w-44 h-44 rounded-full border-4 border-white bg-white overflow-hidden shadow-2xl">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full h-[1px] bg-gray-200"></div>
        <div className="h-full w-[1px] bg-gray-200 absolute"></div>
      </div>
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
        {['ATRÁS/ACIMA', 'DIREITA', 'ESQUERDA', 'FRENTE/ABAIXO'].map((q) => (
          <div 
            key={q}
            onClick={() => onQuadrantClick(q)}
            className={`flex flex-wrap items-center justify-center p-2 relative transition-all cursor-pointer ${selectedRisk !== null ? 'hover:bg-vale-blue/20 bg-vale-blue/10 animate-pulse' : 'hover:bg-gray-50'}`}
          >
            <span className="absolute text-[6px] font-black text-gray-300 uppercase select-none">{q}</span>
            <div className="flex flex-wrap gap-1 justify-center relative z-10">
              {quadrants[q]?.map((riskId: number) => (
                <span key={riskId} className="w-5 h-5 bg-vale-cherry text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md border-2 border-white">
                  {riskId}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-vale-darkgray rounded-full p-2 border-2 border-white z-20 shadow-lg"></div>
    </div>
  </div>
);

export const ARTEmergencial: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [header, setHeader] = useState<HeaderData>({
    om: '', date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0,5), 
    tag: '', type: 'MECANICA', description: ''
  });
  const [selectedRiskId, setSelectedRiskId] = useState<number | null>(null);
  const [activeRisks, setActiveRisks] = useState<Record<number, { checked: boolean, control: string, otherText?: string }>>({});
  const [diagQuadrants, setDiagQuadrants] = useState<Record<string, number[]>>({ 'ATRÁS/ACIMA': [], 'DIREITA': [], 'ESQUERDA': [], 'FRENTE/ABAIXO': [] });
  const [execQuadrants, setExecQuadrants] = useState<Record<string, number[]>>({ 'ATRÁS/ACIMA': [], 'DIREITA': [], 'ESQUERDA': [], 'FRENTE/ABAIXO': [] });
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);

  useEffect(() => {
    if (location.state) setHeader(prev => ({ ...prev, ...location.state }));
  }, [location]);

  const handleRiskToggle = (id: number, checked: boolean) => {
    setActiveRisks(prev => ({ ...prev, [id]: { ...prev[id], checked, control: prev[id]?.control || '' } }));
    if (checked) setSelectedRiskId(id);
    else {
      const removeFromRadar = (radar: Record<string, number[]>) => {
        const next = { ...radar };
        Object.keys(next).forEach(k => next[k] = next[k].filter(r => r !== id));
        return next;
      };
      setDiagQuadrants(removeFromRadar(diagQuadrants));
      setExecQuadrants(removeFromRadar(execQuadrants));
      if(selectedRiskId === id) setSelectedRiskId(null);
    }
  };

  const handleQuadrantClick = (radarType: 'DIAG' | 'EXEC', quadrant: string) => {
    if (selectedRiskId === null) return;
    const setter = radarType === 'DIAG' ? setDiagQuadrants : setExecQuadrants;
    setter(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => next[k] = next[k].filter(r => r !== selectedRiskId));
      next[quadrant] = [...next[quadrant], selectedRiskId!];
      return next;
    });
    setSelectedRiskId(null);
  };

  const handleSave = async () => {
    if(!header.om) return alert("CABECALHO: PREENCHA A ORDEM DE MANUTENÇÃO.");
    if(signatures.length === 0) return alert("RODAPÉ: É OBRIGATÓRIA A ASSINATURA DA EQUIPE.");

    const artId = crypto.randomUUID();
    const doc: DocumentRecord = {
      id: artId, type: 'ART_EMERGENCIAL', header, createdAt: new Date().toISOString(), status: 'ATIVO',
      content: { risks: activeRisks, diag_map: diagQuadrants, exec_map: execQuadrants }, signatures
    };

    await StorageService.saveDocument(doc);
    await StorageService.startMaintenance({
        id: crypto.randomUUID(), header, startTime: new Date().toISOString(),
        artId, artType: 'ART_EMERGENCIAL', origin: 'CORRETIVA', status: 'ANDAMENTO'
    });

    alert('ART EMERGENCIAL REGISTRADA!');
    navigate('/dashboard');
  };

  return (
    <div className="max-w-5xl mx-auto pb-24 px-4 animate-fadeIn">
      <div className="flex items-center justify-between mb-6 border-b-8 border-vale-cherry pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-3 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all shadow-md">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-black text-vale-darkgray uppercase">ART EMERGENCIAL (CORRETIVA)</h2>
        </div>
        <div className="bg-vale-cherry px-5 py-2 rounded-2xl text-white text-[10px] font-black uppercase shadow-xl">FADE Rev.01</div>
      </div>

      <CommonHeader data={header} onChange={setHeader} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="space-y-6">
          <div className="bg-white border-2 border-gray-100 rounded-[2.5rem] shadow-2xl p-8">
            <h3 className="text-xs font-black text-vale-darkgray mb-6 uppercase flex items-center gap-2 border-b-2 border-vale-blue pb-3">
              <MousePointer2 size={18} className="text-vale-blue" /> ANÁLISE RADAR 360º
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <RadarMap title="ETAPA DIAGNÓSTICO" quadrants={diagQuadrants} onQuadrantClick={(q: any) => handleQuadrantClick('DIAG', q)} selectedRisk={selectedRiskId} />
              <RadarMap title="ETAPA EXECUÇÃO" quadrants={execQuadrants} onQuadrantClick={(q: any) => handleQuadrantClick('EXEC', q)} selectedRisk={selectedRiskId} />
            </div>
            {selectedRiskId && (
              <div className="mt-8 bg-vale-blue/10 p-4 rounded-2xl border-2 border-vale-blue/20 text-xs font-black text-vale-blue animate-pulse text-center uppercase tracking-widest">
                CLIQUE NOS RADARS PARA POSICIONAR O RISCO {selectedRiskId}
              </div>
            )}
          </div>

          <div className="bg-vale-yellow/10 p-6 rounded-[2rem] border-2 border-vale-yellow/30 shadow-lg text-[11px] font-black text-vale-darkgray leading-relaxed uppercase">
            <div className="flex items-center gap-2 text-vale-yellow mb-2"><AlertCircle size={24}/> IMPORTANTE</div>
            <p className="mb-2">REALIZE A ANÁLISE 360º IDENTIFICANDO A DIREÇÃO DE CADA SITUAÇÃO DE RISCO.</p>
            <p className="opacity-60 italic">VALIDADE MÁXIMA DE 24 HORAS PARA ATIVIDADES CORRETIVAS.</p>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-100 rounded-[2.5rem] shadow-2xl flex flex-col h-[650px] overflow-hidden">
          <h3 className="text-xs font-black text-white bg-vale-darkgray p-6 uppercase flex items-center justify-between shrink-0 shadow-md">
            <span>CHECKLIST DE RISCOS (FADEL)</span>
            <span className="text-[10px] text-gray-400 font-mono">1 - 23</span>
          </h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 bg-gray-50">
            {RISKS_MASTER.map((risk) => (
              <div key={risk.id} className={`p-4 mb-3 rounded-2xl border-2 transition-all shadow-sm ${selectedRiskId === risk.id ? 'bg-white border-vale-blue scale-[1.02] shadow-xl z-10' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                <div className="flex gap-4 items-start">
                  <input type="checkbox" className="w-7 h-7 mt-1 rounded-xl accent-vale-cherry shrink-0 shadow-sm" checked={activeRisks[risk.id]?.checked || false} onChange={(e) => handleRiskToggle(risk.id, e.target.checked)} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-black text-vale-cherry">{risk.id}.</span>
                      <label className="text-[11px] font-black text-vale-darkgray uppercase leading-tight">{risk.label}</label>
                    </div>
                    {activeRisks[risk.id]?.checked && (
                      <div className="space-y-3 mt-3 animate-slide-in-right">
                        {risk.isOther && (
                          <input type="text" placeholder="ESPECIFIQUE O RISCO EXTRA..." className="w-full text-[10px] p-3 bg-yellow-50 border-b-4 border-vale-yellow font-black uppercase outline-none shadow-inner" onChange={(e) => setActiveRisks(prev => ({...prev, [risk.id]: {...prev[risk.id], otherText: e.target.value}}))} />
                        )}
                        <input type="text" placeholder="DEFINA A MEDIDA DE CONTROLE PARA ESTE RISCO..." className="w-full text-[10px] p-4 bg-gray-100 border-2 border-gray-200 rounded-2xl font-black uppercase outline-none focus:border-vale-cherry focus:bg-white transition-all shadow-inner" value={activeRisks[risk.id]?.control || ''} onChange={(e) => setActiveRisks(prev => ({...prev, [risk.id]: {...prev[risk.id], control: e.target.value}}))} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SignatureSection signatures={signatures} onUpdate={setSignatures} />

      <div className="fixed bottom-8 right-8 z-50">
        <button onClick={handleSave} className="bg-vale-cherry hover:bg-vale-cherry/90 text-white px-12 py-7 rounded-[2rem] shadow-[0_20px_50px_rgba(192,48,89,0.4)] font-black text-2xl flex items-center gap-4 transition-all hover:scale-110 border-4 border-white active:scale-95">
          <CheckCircle size={32} /> SALVAR ART E INICIAR
        </button>
      </div>
    </div>
  );
};
