
import React, { useState, useEffect } from 'react';
import { CommonHeader } from '../components/CommonHeader';
import { SignatureSection } from '../components/SignatureSection';
import { StorageService } from '../services/storage';
import { HeaderData, DocumentRecord, RegisteredART, SignatureRecord } from '../types';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
// Fixed missing AlertCircle import from lucide-react
import { ArrowLeft, FileText, Eye, CheckCircle, X, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

export const ARTAtividade: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const [header, setHeader] = useState<HeaderData>({
    om: '', tag: '', date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0,5), type: 'MECANICA', description: ''
  });

  const [registeredARTs, setRegisteredARTs] = useState<RegisteredART[]>([]);
  const [selectedART, setSelectedART] = useState<RegisteredART | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);

  useEffect(() => {
    setRegisteredARTs(StorageService.getARTs());
    
    if (location.state) {
        setHeader(prev => ({ ...prev, ...location.state }));
    } else {
        const paramOm = searchParams.get('om');
        const paramTag = searchParams.get('tag');
        const paramDesc = searchParams.get('desc');
        if(paramOm || paramTag) {
            setHeader(prev => ({ ...prev, om: paramOm || '', tag: paramTag || '', description: paramDesc || '' }));
        }
    }
  }, [searchParams, location]);

  const handleARTSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const art = registeredARTs.find(a => a.id === e.target.value);
    setSelectedART(art || null);
    setIsConfirmed(false);
  };

  const handleSave = async () => {
    if(!selectedART) return alert("SELECIONE UM PROCEDIMENTO PADRÃO.");
    if(!isConfirmed) return alert("VOCÊ PRECISA VALIDAR A ART ANTES DE SALVAR.");
    if(signatures.length === 0) return alert("ASSINATURAS OBRIGATÓRIAS NO RODAPÉ.");

    setIsSaving(true);
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
    
    await StorageService.saveDocument(doc);
    await StorageService.startMaintenance({
        id: crypto.randomUUID(), header, startTime: new Date().toISOString(),
        artId: artId, artType: 'ART_ATIVIDADE', origin: 'PREVENTIVA'
    });

    navigate('/dashboard');
  };

  return (
    <div className="max-w-5xl mx-auto pb-24 px-4 animate-fadeIn">
      <div className="flex items-center gap-3 mb-6 border-b-4 border-vale-green pb-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><ArrowLeft size={24} /></button>
        <h2 className="text-2xl font-black text-vale-darkgray uppercase flex items-center gap-2">
            <FileText className="text-vale-green" /> ART DA ATIVIDADE (PROCEDIMENTO)
        </h2>
      </div>

      <div className="space-y-8">
          <CommonHeader data={header} onChange={setHeader} />

          <section className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-vale-green px-6 py-4 font-black text-xs uppercase text-white shadow-md">VINCULAR PROCEDIMENTO TÉCNICO (PRO)</div>
              <div className="p-8">
                  <select 
                      className="w-full border-2 border-gray-100 p-5 rounded-2xl bg-gray-50 font-black text-vale-darkgray outline-none focus:border-vale-green transition-all" 
                      onChange={handleARTSelect}
                      value={selectedART?.id || ''}
                  >
                      <option value="">-- SELECIONE A ART/PRO DA LISTA --</option>
                      {registeredARTs.map(art => <option key={art.id} value={art.id}>ART {art.code} - {art.taskName}</option>)}
                  </select>

                  {selectedART && (
                      <div className="mt-6 flex flex-col md:flex-row gap-6 items-center bg-vale-blue/10 p-6 rounded-2xl border-2 border-vale-blue/20">
                          <div className="flex-1">
                            <h4 className="font-black text-xs text-vale-blue uppercase mb-1">DOCUMENTO SELECIONADO</h4>
                            <p className="text-sm font-black text-vale-darkgray">ART {selectedART.code} - {selectedART.taskName}</p>
                          </div>
                          <button 
                              onClick={() => setShowPreviewModal(true)}
                              className={`px-10 py-4 rounded-xl font-black shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 ${isConfirmed ? 'bg-vale-green text-white' : 'bg-vale-blue text-white'}`}
                          >
                              {isConfirmed ? <><ShieldCheck size={20}/> VALIDADO</> : <><Eye size={20}/> LER E VALIDAR</>}
                          </button>
                      </div>
                  )}
              </div>
          </section>

          {isConfirmed && (
              <div className="animate-fade-in-up">
                  <SignatureSection signatures={signatures} onUpdate={setSignatures} />
              </div>
          )}
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <button 
            onClick={handleSave} 
            disabled={!isConfirmed || signatures.length === 0 || isSaving}
            className={`px-10 py-6 rounded-3xl shadow-2xl font-black text-xl flex items-center gap-3 transition-all border-4 border-white ${!isConfirmed || signatures.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-vale-green hover:bg-vale-green/90 text-white hover:scale-105'}`}
        >
            {isSaving ? <Loader2 className="animate-spin" /> : <><CheckCircle size={28} /> INICIAR ATIVIDADE</>}
        </button>
      </div>

      {showPreviewModal && selectedART && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn">
              <div className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border-b-8 border-vale-green">
                  <div className="bg-vale-darkgray p-6 flex justify-between items-center text-white">
                      <h3 className="font-black text-sm uppercase tracking-widest">Procedimento Técnico de Segurança</h3>
                      <button onClick={() => setShowPreviewModal(false)} className="p-1 hover:bg-white/10 rounded-full"><X size={28} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-10 bg-gray-50 custom-scrollbar">
                      <div className="bg-white border-2 border-gray-200 shadow-sm p-8 rounded-2xl">
                          <h4 className="text-vale-green font-black text-center mb-6 border-b pb-2">ANÁLISE DE RISCO DA TAREFA</h4>
                          <div className="grid grid-cols-2 gap-4 text-xs mb-8">
                              <div className="p-3 bg-gray-50 rounded border font-black">CÓDIGO: {selectedART.code}</div>
                              <div className="p-3 bg-gray-50 rounded border font-black uppercase">TAREFA: {selectedART.taskName}</div>
                          </div>
                          <div className="mb-8">
                              <h5 className="font-black text-xs uppercase mb-3 text-vale-cherry flex items-center gap-2"><AlertCircle size={16}/> Situações de Risco Identificadas:</h5>
                              <ul className="space-y-2">
                                  {selectedART.risks?.map((r, i) => (
                                      <li key={i} className="text-xs font-bold p-3 bg-red-50 rounded border-l-4 border-vale-cherry">{r.situation}</li>
                                  ))}
                              </ul>
                          </div>
                          <div>
                              <h5 className="font-black text-xs uppercase mb-3 text-vale-green flex items-center gap-2"><ShieldCheck size={16}/> Medidas de Controle Obrigatórias:</h5>
                              <div className="text-xs font-bold leading-relaxed text-justify bg-green-50 p-4 rounded border-l-4 border-vale-green whitespace-pre-line">
                                  {selectedART.controlMeasures}
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="p-6 bg-white border-t flex justify-end gap-4 shadow-inner">
                      <button onClick={() => setShowPreviewModal(false)} className="px-8 py-3 font-black text-xs text-gray-400 uppercase">VOLTAR</button>
                      <button onClick={() => { setIsConfirmed(true); setShowPreviewModal(false); }} className="bg-vale-green text-white px-12 py-3 rounded-xl font-black shadow-lg hover:bg-vale-green/90 transition-all text-sm">VALIDAR E PROSSEGUIR</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
