
import React, { useState, useEffect } from 'react';
import { CommonHeader } from '../components/CommonHeader';
import { SignatureSection } from '../components/SignatureSection';
import { StorageService } from '../services/storage';
import { HeaderData, DocumentRecord, RegisteredART, SignatureRecord, ActiveMaintenance } from '../types';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { FileText, Eye, CheckCircle, X, ShieldCheck, Save, Download, ShieldAlert } from 'lucide-react';
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
    
    navigate('/dashboard');
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 px-4 relative animate-fadeIn">
      {/* ... Header ... */}
      <div className="flex items-center gap-4 mb-10 border-b-2 border-gray-100 pb-8 pt-6 bg-white p-6 rounded-[2.5rem] shadow-sm">
        <BackButton />
        <div className="bg-[#007e7a]/10 p-3 rounded-2xl">
            <FileText className="text-[#007e7a]" size={32} />
        </div>
        <div>
            <h2 className="text-3xl font-black text-vale-darkgray uppercase tracking-tighter leading-none">
                ART da Atividade
            </h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em] mt-2">Segurança em Atividades de Rotina</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
              <CommonHeader data={header} onChange={setHeader} />

              <section className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-[12px] h-full bg-[#007e7a]"></div>
                   <div className="bg-gray-50 px-10 py-6 border-b border-gray-200">
                      <h3 className="font-black text-gray-800 uppercase text-sm tracking-widest flex items-center gap-3">
                          <ShieldAlert size={18} className="text-[#007e7a]"/> Vincular Procedimento Oficial
                      </h3>
                  </div>
                  
                  <div className="p-10">
                      <div className="mb-8">
                          <label className="block text-[11px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-2">Escolha a ART do Manual:</label>
                          <select 
                            className="w-full border-2 border-gray-200 p-5 rounded-[1.5rem] bg-gray-50 font-black text-gray-800 outline-none uppercase focus:border-[#007e7a] focus:bg-white transition-all shadow-inner text-sm" 
                            onChange={handleARTSelect} 
                            value={selectedART?.id || ''}
                          >
                              <option value="">-- SELECIONE O PROCEDIMENTO --</option>
                              {registeredARTs.map(art => <option key={art.id} value={art.id}>ART {art.code} - {art.taskName}</option>)}
                          </select>
                      </div>

                      {selectedART && (
                          <div className="flex flex-col md:flex-row gap-6 items-center bg-blue-50 p-8 rounded-[2rem] border-2 border-blue-100 animate-fadeIn">
                              <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                      <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">OFICIAL</span>
                                      <h4 className="font-black text-blue-900 text-xs uppercase tracking-widest">CÓDIGO: {selectedART.code}</h4>
                                  </div>
                                  <p className="text-xl font-black text-gray-800 uppercase leading-tight">{selectedART.taskName}</p>
                              </div>
                              <button 
                                onClick={() => setShowPreviewModal(true)} 
                                className={`px-10 py-5 rounded-2xl font-black shadow-2xl flex items-center justify-center gap-4 transition-all transform active:scale-95 uppercase text-xs tracking-widest ${isConfirmed ? 'bg-green-600 text-white border-b-4 border-green-800' : 'bg-gray-900 text-white hover:bg-black border-b-4 border-gray-700'}`}
                              >
                                  {isConfirmed ? <><ShieldCheck size={20}/> LEITURA VALIDADA</> : <><Eye size={20}/> ABRIR PDF ORIGINAL</>}
                              </button>
                          </div>
                      )}
                  </div>
              </section>

              {isConfirmed && (
                <section className="animate-fadeIn">
                    <SignatureSection signatures={signatures} onUpdate={setSignatures} />
                </section>
              )}
          </div>

          <div className="lg:col-span-1">
              <div className="sticky top-6">
                  <div className="bg-vale-dark text-white rounded-[3rem] shadow-2xl p-10 border-b-[16px] border-[#007e7a]">
                      <h3 className="font-black text-xl mb-8 flex items-center gap-3 tracking-tighter uppercase">
                          <ShieldCheck className="text-[#007e7a]" size={24} /> Progresso ART
                      </h3>
                      <div className="space-y-8">
                          <div className={`flex items-center gap-5 p-6 rounded-[1.5rem] border transition-all ${header.om && header.tag ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                              <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black">{header.om && header.tag ? <CheckCircle size={20}/> : '1'}</div>
                              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Cabeçalho Técnico</span>
                          </div>
                          <div className={`flex items-center gap-5 p-6 rounded-[1.5rem] border transition-all ${isConfirmed ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                              <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black">{isConfirmed ? <CheckCircle size={20}/> : '2'}</div>
                              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Validação do PDF</span>
                          </div>
                          <div className={`flex items-center gap-5 p-6 rounded-[1.5rem] border transition-all ${signatures.length > 0 ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                              <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black">{signatures.length > 0 ? <CheckCircle size={20}/> : '3'}</div>
                              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Assinaturas Digitais</span>
                          </div>
                      </div>

                      <div className="mt-12 p-6 bg-gray-800/50 rounded-[1.5rem] border border-gray-700/50">
                          <p className="text-[10px] font-bold text-gray-500 leading-relaxed uppercase tracking-widest">A VIDA EM PRIMEIRO LUGAR.<br/>A LIBERAÇÃO SÓ É PERMITIDA APÓS A LEITURA DO DOCUMENTO ORIGINAL.</p>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Botão de Finalização Principal */}
      <div className="fixed bottom-10 right-10 z-50">
        <button 
            onClick={handleSave} 
            disabled={!isConfirmed || signatures.length === 0} 
            className={`px-12 py-6 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] font-black text-lg flex items-center gap-4 border-4 border-white transition-all transform active:scale-90 uppercase tracking-widest ${isConfirmed && signatures.length > 0 ? 'bg-[#007e7a] text-white hover:bg-[#00605d]' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
        >
            <Save size={28} /> Gravar e Iniciar Atividade
        </button>
      </div>

      {/* MODAL DO PDF ORIGINAL - OBRIGATÓRIO PARA CONFIRMAÇÃO */}
      {showPreviewModal && selectedART && (
          <div className="fixed inset-0 bg-vale-dark/95 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn">
              <div className="bg-white rounded-[3rem] w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border-b-[16px] border-blue-600">
                  <div className="bg-gray-900 p-8 flex justify-between items-center text-white shrink-0">
                      <div>
                          <h3 className="font-black text-2xl tracking-tighter uppercase">Visualização do Documento Original</h3>
                          <p className="text-[11px] font-bold text-blue-400 uppercase mt-2 tracking-[0.4em]">ART: {selectedART.code} - {selectedART.taskName}</p>
                      </div>
                      <div className="flex gap-3">
                          {pdfBlobUrl && (
                            <a href={pdfBlobUrl} download className="hidden md:flex px-4 py-2 bg-gray-700 text-white font-bold rounded-lg text-[10px] uppercase hover:bg-gray-600 transition-all items-center gap-2">
                                <Download size={14}/> Baixar
                            </a>
                          )}
                          <button onClick={() => setShowPreviewModal(false)} className="bg-white/10 p-3 rounded-full hover:bg-red-600 transition-all active:scale-90"><X size={32} /></button>
                      </div>
                  </div>
                  
                  <div className="flex-1 bg-gray-200 relative overflow-hidden flex items-center justify-center">
                      {pdfBlobUrl ? (
                          <iframe 
                            src={pdfBlobUrl}
                            className="w-full h-full border-none shadow-inner"
                            title="Visualizador Oficial"
                          />
                      ) : (
                          <div className="text-center p-20">
                              <ShieldAlert size={80} className="text-gray-400 mx-auto mb-6" />
                              <h4 className="text-2xl font-black text-gray-500 uppercase tracking-widest">Nenhum PDF cadastrado para este manual.</h4>
                              <p className="text-gray-400 font-bold mt-2">Utilize apenas o resumo de riscos abaixo ou atualize o cadastro no menu administrativo.</p>
                          </div>
                      )}
                  </div>

                  <div className="p-10 bg-white border-t flex flex-col md:flex-row justify-between items-center gap-6 shrink-0">
                      <div className="flex items-center gap-4 text-blue-900">
                          <Download size={32} className="animate-pulse" />
                          <div>
                              <p className="text-[11px] font-black uppercase tracking-widest leading-none">Confirmação de Segurança</p>
                              <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">AO CONFIRMAR, VOCÊ DECLARA QUE LEU E COMPREENDEU OS RISCOS OFICIAIS.</p>
                          </div>
                      </div>
                      <div className="flex gap-4 w-full md:w-auto">
                          <button onClick={() => setShowPreviewModal(false)} className="flex-1 md:flex-none px-10 py-5 font-black text-gray-400 uppercase text-xs tracking-widest hover:bg-gray-100 rounded-2xl transition-all">Cancelar</button>
                          <button onClick={handleConfirmOriginal} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-16 py-5 rounded-2xl font-black shadow-2xl uppercase tracking-widest active:scale-95 transition-all border-b-4 border-blue-900">Validar Leitura Oficial</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
