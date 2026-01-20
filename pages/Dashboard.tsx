
import React, { useEffect, useState, useCallback } from 'react';
import { StorageService } from '../services/storage';
import { ActiveMaintenance, MaintenanceLog, OMRecord, DocumentRecord, RegisteredART } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, AlertOctagon, PauseCircle, 
  StopCircle, X, Activity, 
  ShieldCheck, WifiOff, Wrench, PlayCircle, Timer, Lock, 
  FileText, Zap, MoreHorizontal, Droplets, Flame, Search, CheckSquare, ExternalLink, BookOpen, Loader2, Info, Download, PenTool, Users, MapPin, AlertCircle, FileCheck, ShieldAlert, ClipboardList
} from 'lucide-react';
import { checkConnection } from '../services/supabase';

const RISK_LIST = [
    "CONTATO COM SUPERFÍCIES CORTANTES/PERFURANTE", "PRENSAMENTO DE DEDOS OU MÃOS", "QUEDA DE PEÇAS/ESTRUTURAS/EQUIPAMENTOS",
    "PRENSAMENTO OU AGARRAMENTO DO CORPO", "ATROPELAMENTO/ESMAGAMENTO POR VEÍCULOS", "QUEDA, TROPEÇO OU ESCORREGÃO",
    "ANIMAIS PEÇONHENTOS/INSETOS", "DESMORONAMENTOS DE PILHAS", "QUEDA DE PLATAFORMA OU ESCADAS", "ARCO E/OU CHOQUE ELÉTRICO",
    "FONTES DE ENERGIA (HIDRÁULICA, PNEUMÁTICA)", "EXPOSIÇÃO A VAPORES, CONDENSADOS OU QUENTES", "GASES, VAPORES, POEIRAS OU FUMOS",
    "PRODUTOS QUÍMICOS OU QUEIMADURAS", "PROJEÇÃO DE MATERIAIS NA FACE/OLHOS", "CONDIÇÕES CLIMÁTICAS ADVERSAS",
    "QUEDA DE HOMEM AO MAR/AFOGAMENTO", "INTERFERÊNCIA ENTRE EQUIPES", "EXCESSO OU DEFICIÊNCIA DE ILUMINAÇÃO", "OUTRAS SITUAÇÕES DE RISCO"
];

const MaintenanceTimer: React.FC<{ task: ActiveMaintenance }> = ({ task }) => {
    const [time, setTime] = useState('00:00:00');

    const calculateTime = useCallback(() => {
        const now = new Date();
        let totalMs = task.accumulatedTime || 0;
        if (task.status === 'ANDAMENTO' && task.currentSessionStart) {
            totalMs += (now.getTime() - new Date(task.currentSessionStart).getTime());
        }
        const h = Math.floor(totalMs / 3600000);
        const m = Math.floor((totalMs % 3600000) / 60000);
        const s = Math.floor((totalMs % 60000) / 1000);
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }, [task]);

    useEffect(() => {
        setTime(calculateTime());
        if (task.status !== 'ANDAMENTO') return;
        const interval = setInterval(() => setTime(calculateTime()), 1000);
        return () => clearInterval(interval);
    }, [task, calculateTime]);

    return <span className="text-2xl font-black font-mono tracking-tighter opacity-90">{time}</span>;
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTasks, setActiveTasks] = useState<ActiveMaintenance[]>([]);
  const [history, setHistory] = useState<MaintenanceLog[]>([]);
  const [allOms, setAllOms] = useState<OMRecord[]>([]);
  const [allArts, setAllArts] = useState<RegisteredART[]>([]);
  const [allDocs, setAllDocs] = useState<DocumentRecord[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentUser, setCurrentUser] = useState('');
  
  const [closingTask, setClosingTask] = useState<ActiveMaintenance | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ url: string; title: string; type: 'OM' | 'DOCUMENT' | 'ART_PROCEDURE'; id: string; signatures?: any[]; content?: any } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    const user = localStorage.getItem('safemaint_user');
    if(user) setCurrentUser(user.toUpperCase());
    refreshData();
    const validateConn = async () => setIsOnline(await checkConnection());
    validateConn();
    window.addEventListener('safemaint_storage_update', refreshData);
    return () => window.removeEventListener('safemaint_storage_update', refreshData);
  }, []);

  const refreshData = () => {
    setActiveTasks(StorageService.getActiveMaintenances());
    setAllOms(StorageService.getOMs());
    setAllArts(StorageService.getARTs());
    setAllDocs(StorageService.getDocuments());
    setHistory(StorageService.getHistory());
  };

  useEffect(() => {
    let activeUrl: string | null = null;
    const loadPdf = async () => {
        if (!viewingDoc) { 
            setPdfBlobUrl(null); 
            setPdfError(null);
            return; 
        }
        
        setIsLoadingPdf(true);
        setPdfError(null);
        
        let pdfData = viewingDoc.url;
        
        if (!pdfData || pdfData === 'TRUE' || pdfData.length < 50) {
            let table: 'oms' | 'documents' | 'arts' = viewingDoc.type === 'DOCUMENT' ? 'documents' : (viewingDoc.type === 'ART_PROCEDURE' ? 'arts' : 'oms');
            try {
                const remotePdf = await StorageService.getRecordPdf(table, viewingDoc.id);
                if (remotePdf) {
                    pdfData = remotePdf;
                } else if (viewingDoc.type !== 'DOCUMENT') {
                    setPdfError("O arquivo PDF não foi localizado no servidor.");
                    setIsLoadingPdf(false);
                    return;
                }
            } catch (err) {
                setPdfError("Erro de conexão ao tentar baixar o documento.");
                setIsLoadingPdf(false);
                return;
            }
        }
        
        if (pdfData && pdfData !== 'TRUE') {
            try {
                const base64Clean = pdfData.includes('base64,') 
                    ? pdfData.split('base64,')[1].replace(/\s/g, '') 
                    : pdfData.replace(/\s/g, '');
                
                const byteCharacters = atob(base64Clean);
                const byteNumbers = new Uint8Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                
                const blob = new Blob([byteNumbers], { type: 'application/pdf' });
                activeUrl = URL.createObjectURL(blob);
                setPdfBlobUrl(activeUrl);
            } catch (e) {
                console.error("Erro PDF:", e);
                setPdfError("Falha na decodificação do arquivo digital.");
            }
        }
        setIsLoadingPdf(false);
    };

    loadPdf();
    
    return () => { 
        if (activeUrl) URL.revokeObjectURL(activeUrl); 
    };
  }, [viewingDoc]);

  const handleAction = (task: ActiveMaintenance) => {
      if (task.status === 'PAUSADA' || task.status === 'AGUARDANDO') StorageService.resumeMaintenance(task.id, currentUser);
      else setClosingTask(task);
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-10">
      <div className="flex justify-between items-center mb-6 bg-gradient-to-r from-[#007e7a] to-[#005c97] p-4 rounded-xl shadow-lg animate-fadeIn relative z-30 text-white">
        <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm border border-white/10"><ShieldCheck size={24}/></div>
            <div>
                <h2 className="text-xl font-black text-white uppercase leading-none tracking-tight">Painel de Manutenções Ativas</h2>
                <div className="flex items-center gap-2 mt-1">
                    {isOnline ? (<div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/10 border border-white/20 rounded-full"><div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(74,222,128,0.8)]"></div><span className="text-[9px] font-black uppercase">Sincronizado</span></div>) : (<div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/20 border border-red-400/30 rounded-full"><WifiOff size={10} className="text-red-300" /><span className="text-[9px] font-black uppercase">Offline</span></div>)}
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12 space-y-4">
            {activeTasks.length === 0 ? (
                <div className="bg-white rounded-2xl p-20 text-center border-2 border-dashed border-gray-200 flex flex-col items-center">
                    <Activity size={48} className="text-gray-100 mb-4" />
                    <p className="font-black text-gray-400 uppercase tracking-[0.2em]">Pátio Limpo - Sem Atividades</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {activeTasks.map(task => {
                        const isCorretiva = task.origin === 'CORRETIVA' || task.artType === 'ART_EMERGENCIAL';
                        const linkedOm = allOms.find(o => o.id === task.omId || o.omNumber === task.header.om);
                        const linkedDoc = allDocs.find(d => d.id === task.artId);
                        
                        // Encontra a ART Procedimento (Template) vinculada
                        const procedureId = linkedDoc?.content?.linkedArtId || linkedDoc?.content?.artId;
                        const linkedProcedure = allArts.find(a => a.id === procedureId);
                        
                        return (
                            <div key={task.id} className={`rounded-[2rem] shadow-xl border p-6 flex flex-col gap-4 transition-all relative overflow-hidden group ${isCorretiva ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                                <div className={`absolute top-0 right-0 p-4 ${isCorretiva ? 'text-red-100' : 'text-gray-50'}`}><Activity size={100}/></div>
                                
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Ordem / Identificador</span>
                                        <h4 className="text-2xl font-black text-gray-800 leading-none">{task.header.om}</h4>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <MaintenanceTimer task={task} />
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full mt-1 border ${task.status === 'ANDAMENTO' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                                            {task.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="relative z-10 border-y border-gray-100 py-4 my-2">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className={`text-3xl font-black ${isCorretiva ? 'text-red-600' : 'text-[#007e7a]'}`}>{task.header.tag}</span>
                                        <span className="text-[9px] font-black bg-gray-100 px-3 py-1 rounded-lg uppercase border border-gray-200 flex items-center gap-1.5">
                                            <Users size={12}/> {task.openedBy?.split(' ')[0]}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-gray-500 uppercase line-clamp-2 leading-relaxed">{task.header.description}</p>
                                </div>

                                <div className="flex flex-col gap-3 relative z-10">
                                    {/* GRID DE DOCUMENTOS EXIGIDOS */}
                                    <div className="grid grid-cols-1 gap-2">
                                        {/* DOCUMENTO ASSINADO (APR/ART DIGITAL) */}
                                        {linkedDoc && (
                                            <button onClick={() => setViewingDoc({ 
                                                url: linkedDoc.content?.manualFileUrl || 'TRUE', 
                                                title: `ASSINADA: ${linkedDoc.header.om}`, 
                                                type: 'DOCUMENT', 
                                                id: linkedDoc.id,
                                                signatures: linkedDoc.signatures,
                                                content: linkedDoc.content
                                            })} className="w-full bg-blue-600 text-white p-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1">
                                                <ShieldCheck size={18} className="text-blue-200"/> DOCUMENTO COM ASSINATURA (ART)
                                            </button>
                                        )}

                                        <div className="grid grid-cols-2 gap-2">
                                            {/* ORDEM EM PDF */}
                                            {linkedOm ? (
                                                <button onClick={() => setViewingDoc({ url: linkedOm.pdfUrl || 'TRUE', title: `ORDEM: ${linkedOm.omNumber}`, type: 'OM', id: linkedOm.id })} className="bg-white border-2 border-gray-100 p-2.5 rounded-xl flex items-center justify-center gap-2 hover:border-red-200 text-gray-600 transition-all shadow-sm group/btn">
                                                    <FileText size={16} className="text-red-500 group-hover/btn:scale-110 transition-transform"/> <span className="text-[9px] font-black uppercase">ORDEM EM PDF</span>
                                                </button>
                                            ) : (
                                                <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-2.5 rounded-xl flex items-center justify-center gap-2 text-gray-300">
                                                    <X size={14}/> <span className="text-[9px] font-black uppercase">SEM PDF OM</span>
                                                </div>
                                            )}

                                            {/* ART EM PDF (PROCEDIMENTO) */}
                                            {linkedProcedure ? (
                                                <button onClick={() => setViewingDoc({ url: linkedProcedure.pdfUrl || 'TRUE', title: `PROCEDIMENTO: ${linkedProcedure.code}`, type: 'ART_PROCEDURE', id: linkedProcedure.id })} className="bg-white border-2 border-gray-100 p-2.5 rounded-xl flex items-center justify-center gap-2 hover:border-blue-200 text-gray-600 transition-all shadow-sm group/btn">
                                                    <BookOpen size={16} className="text-blue-500 group-hover/btn:scale-110 transition-transform"/> <span className="text-[9px] font-black uppercase">ART EM PDF</span>
                                                </button>
                                            ) : (
                                                <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-2.5 rounded-xl flex items-center justify-center gap-2 text-gray-300">
                                                    <X size={14}/> <span className="text-[9px] font-black uppercase">SEM PDF ART</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* CONTROLE DE EXECUÇÃO */}
                                    <button onClick={() => handleAction(task)} className={`w-full py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 border-b-4 ${task.status === 'ANDAMENTO' ? 'bg-red-600 text-white hover:bg-red-700 border-red-800' : 'bg-green-600 text-white hover:bg-green-700 border-green-800'}`}>
                                        {task.status === 'ANDAMENTO' ? <><StopCircle size={20}/> Encerrar Atividade</> : <><PlayCircle size={20}/> Retomar Manutenção</>}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      </div>

      {/* MODAL PDF / ART VIEWER - OTIMIZADO */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col animate-fadeIn overflow-hidden h-[100dvh]">
            <div className="bg-white p-3 flex justify-between items-center shrink-0 border-b border-gray-200 shadow-xl z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-[#007e7a] text-white p-2 rounded-lg shadow-sm"><FileText size={20} /></div>
                    <div>
                        <span className="font-black text-xs text-gray-800 uppercase block leading-none">Visualização de Segurança</span>
                        <span className="font-bold text-[10px] text-[#007e7a] uppercase tracking-widest">{viewingDoc.title}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    {pdfBlobUrl && (
                        <a 
                            href={pdfBlobUrl} 
                            download={`${viewingDoc.title.replace(/\s/g, '_')}.pdf`}
                            className="p-2.5 bg-gray-100 rounded-xl text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                            <Download size={18}/>
                            <span className="hidden md:inline font-black text-[10px] uppercase">Baixar</span>
                        </a>
                    )}
                    <button onClick={() => setViewingDoc(null)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all border border-red-100"><X size={20}/></button>
                </div>
            </div>
            
            <div className="flex-1 bg-gray-100 relative overflow-y-auto custom-scrollbar p-4 md:p-8 flex flex-col items-center">
                {isLoadingPdf ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20">
                        <Loader2 size={56} className="text-[#007e7a] animate-spin mb-4" />
                        <h4 className="font-black text-xs uppercase tracking-[0.2em] animate-pulse">Processando Documento...</h4>
                    </div>
                ) : (
                    <div className="w-full max-w-[21.5cm] flex flex-col gap-6 animate-fadeIn">
                        
                        {/* Seção Digital (Assinaturas e Riscos) - Apenas para documentos gerados pelo App */}
                        {viewingDoc.type === 'DOCUMENT' && (
                            <div className="bg-white p-8 shadow-2xl border border-gray-200 space-y-10 rounded-sm">
                                <div className="border-b-4 border-vale-green pb-4 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Dados da Liberação Digital</h2>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">SafeMaint Digital Audit</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black px-3 py-1 bg-blue-100 text-blue-800 rounded-full uppercase border border-blue-200">SINCRONIZADO</span>
                                        <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase">ID: {viewingDoc.id.substring(0,8)}</span>
                                    </div>
                                </div>

                                {/* Mapa de Risco se for Emergencial */}
                                {viewingDoc.content?.quadrantRisks && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 border-l-4 border-red-600 pl-4">
                                            <MapPin size={24} className="text-red-600"/>
                                            <h4 className="text-sm font-black text-gray-800 uppercase tracking-tight">Mapa de Risco da APR</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {Object.entries(viewingDoc.content.checklistRisks || {}).filter(([,v]:any) => v.checked).map(([id, v]:any) => (
                                                <div key={id} className="text-[10px] border-2 border-red-50 p-3 rounded-lg bg-red-50/20">
                                                    <p className="font-black text-red-700 uppercase">
                                                        <span className="bg-red-100 px-1.5 rounded mr-2">#{id}</span>
                                                        {RISK_LIST[parseInt(id)-1]}
                                                    </p>
                                                    {v.control && (
                                                        <div className="mt-2 bg-white p-2 rounded border border-red-100">
                                                            <p className="text-gray-400 font-black text-[8px] uppercase">Controle:</p>
                                                            <p className="text-gray-700 font-bold uppercase">{v.control}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Assinaturas Coletadas */}
                                {viewingDoc.signatures && viewingDoc.signatures.length > 0 && (
                                    <div className="space-y-6 pt-6 border-t-2 border-gray-100">
                                        <div className="flex items-center gap-3 border-l-4 border-[#007e7a] pl-4">
                                            <Users size={24} className="text-vale-green"/>
                                            <h4 className="text-sm font-black text-gray-800 uppercase tracking-tight">Responsabilidade Técnica e Execução</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {viewingDoc.signatures.map(sig => (
                                                <div key={sig.id} className="bg-gray-50/50 p-4 rounded-xl border border-gray-200 flex flex-col gap-3 shadow-sm">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-xs font-black text-gray-800 uppercase leading-none">{sig.name}</p>
                                                            <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">{sig.matricula} • {sig.function}</p>
                                                        </div>
                                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase ${sig.role === 'RESPONSAVEL' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                            {sig.role}
                                                        </span>
                                                    </div>
                                                    <div className="bg-white p-2 border rounded flex items-center justify-center h-20 overflow-hidden shadow-inner">
                                                        <img src={sig.signatureData} alt="Assinatura" className="h-full object-contain mix-blend-multiply" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Visualizador de PDF (Original da OM ou Procedimento) */}
                        {pdfBlobUrl ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-t-lg font-black text-xs uppercase tracking-widest shadow-lg">
                                    <FileCheck size={16}/> Documento Original Vinculado (Anexo)
                                </div>
                                <div className="w-full h-[85vh] shadow-2xl border-2 border-gray-300 bg-white rounded-b-lg overflow-hidden relative">
                                    <iframe 
                                        src={`${pdfBlobUrl}#toolbar=1&navpanes=0&scrollbar=1`} 
                                        className="w-full h-full border-none" 
                                        title="Visualizador de PDF" 
                                    />
                                </div>
                            </div>
                        ) : pdfError ? (
                            <div className="flex flex-col items-center justify-center py-20 text-red-500 gap-4 bg-red-50 rounded-2xl border border-red-100">
                                <AlertCircle size={56} className="opacity-40" />
                                <div className="text-center">
                                    <h4 className="font-black text-sm uppercase tracking-tight">PDF Indisponível</h4>
                                    <p className="text-xs font-bold uppercase opacity-70 mt-1">{pdfError}</p>
                                </div>
                            </div>
                        ) : viewingDoc.type !== 'DOCUMENT' && (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                                <Info size={40} className="opacity-20" />
                                <span className="font-black text-[10px] uppercase">Arquivo PDF não localizado para este item.</span>
                            </div>
                        )}
                    </div>
                )}
                <div className="h-10 shrink-0"></div>
            </div>
        </div>
      )}

      {/* MODAL DE ENCERRAMENTO */}
      {closingTask && (
          <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl border-t-4 border-[#007e7a]">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Finalizar Atividade</h3>
                      <button onClick={() => setClosingTask(null)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400"><X size={20}/></button>
                  </div>
                  <div className="space-y-3">
                      <button onClick={() => navigate(`/checklist?maintenanceId=${closingTask.id}`)} className="w-full bg-[#007e7a] text-white p-4 rounded-xl font-black text-xs hover:bg-[#00605d] uppercase shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95 border-b-4 border-[#004d4a]">
                          <CheckSquare size={18} /> REALIZAR CHECKLIST E FINALIZAR
                      </button>
                      <button onClick={() => setClosingTask(null)} className="w-full bg-gray-100 text-gray-500 p-4 rounded-xl font-black text-xs uppercase hover:bg-gray-200 transition-all">Cancelar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
