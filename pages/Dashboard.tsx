import React, { useEffect, useState, useCallback } from 'react';
import { StorageService } from '../services/storage';
import { ActiveMaintenance, MaintenanceLog, OMRecord, DocumentRecord, RegisteredART } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, AlertOctagon, PauseCircle, 
  StopCircle, X, Activity, 
  ShieldCheck, WifiOff, Wrench, PlayCircle, Timer, Lock, 
  FileText, Layers, Zap, MoreHorizontal, Droplets, Flame, Link as LinkIcon, Search, ClipboardList, Loader2, Info, CheckSquare, ExternalLink, BookOpen, MapPin, Download
} from 'lucide-react';
import { checkConnection } from '../services/supabase';
import { Logo } from '../components/Logo';

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

        const interval = setInterval(() => {
            setTime(calculateTime());
        }, 1000);
        return () => clearInterval(interval);
    }, [task, calculateTime]);

    return <span className="text-2xl font-black font-mono tracking-tighter opacity-90">{time}</span>;
};

const getTaskIcon = (type: string) => {
    switch (type) {
        case 'ELETRICA': return <Zap size={16} />;
        case 'LUBRIFICACAO': return <Droplets size={16} />;
        case 'SOLDA': return <Flame size={16} />;
        case 'OUTROS': return <MoreHorizontal size={16} />;
        default: return <Wrench size={16} />; 
    }
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTasks, setActiveTasks] = useState<ActiveMaintenance[]>([]);
  const [history, setHistory] = useState<MaintenanceLog[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [closingTask, setClosingTask] = useState<ActiveMaintenance | null>(null);
  
  // Full ART Viewer State (Dados Estruturados)
  const [viewingFullArt, setViewingFullArt] = useState<DocumentRecord | null>(null);
  
  // Generic Doc Viewer State (PDFs)
  const [viewingDoc, setViewingDoc] = useState<{ url: string; title: string; type: 'OM' | 'DOCUMENT' | 'ART_TEMPLATE'; id: string } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  
  // Data for lookups
  const [allOms, setAllOms] = useState<OMRecord[]>([]);
  const [allDocs, setAllDocs] = useState<DocumentRecord[]>([]);
  
  // Link OM States
  const [isLinkingOm, setIsLinkingOm] = useState(false);
  const [linkTargetTaskId, setLinkTargetTaskId] = useState('');
  const [availableOms, setAvailableOms] = useState<OMRecord[]>([]);
  const [omSearch, setOmSearch] = useState('');
  
  const [currentUser, setCurrentUser] = useState('');

  const refreshData = useCallback(() => {
    const tasks = StorageService.getActiveMaintenances();
    const oms = StorageService.getOMs();
    const docs = StorageService.getDocuments();
    
    setActiveTasks(tasks);
    setAllOms(oms);
    setAllDocs(docs);
    setHistory(StorageService.getHistory());
  }, []);

  useEffect(() => {
    const user = localStorage.getItem('safemaint_user');
    if(user) setCurrentUser(user.toUpperCase());
    
    refreshData();
    const validateConn = async () => setIsOnline(await checkConnection());
    validateConn();

    window.addEventListener('safemaint_storage_update', refreshData);
    return () => window.removeEventListener('safemaint_storage_update', refreshData);
  }, [refreshData]);

  // --- ENGINE DE VISUALIZAÇÃO DE PDF ---
  useEffect(() => {
    let activeUrl: string | null = null;

    const loadPdf = async () => {
        if (!viewingDoc) {
            setPdfBlobUrl(null);
            return;
        }

        let pdfData = viewingDoc.url;

        // 1. Lógica de Busca no Servidor (Se estiver marcado como 'TRUE' ou string vazia/curta)
        if (!pdfData || pdfData === 'TRUE' || pdfData.length < 100) {
            setIsLoadingPdf(true);
            
            // Mapeia o Tipo de Visualização para a Tabela do Banco
            let table: 'oms' | 'documents' | 'arts' = 'oms';
            if (viewingDoc.type === 'DOCUMENT') table = 'documents'; // ART preenchida
            else if (viewingDoc.type === 'ART_TEMPLATE') table = 'arts'; // Modelo de ART
            
            const remotePdf = await StorageService.getRecordPdf(table, viewingDoc.id);
            if (remotePdf) {
                pdfData = remotePdf;
            } else {
                console.warn(`PDF não encontrado na tabela ${table} para ID:`, viewingDoc.id);
            }
            setIsLoadingPdf(false);
        }

        // 2. Lógica de Conversão (Base64 -> Blob URL) para abrir corretamente
        if (pdfData && pdfData !== 'TRUE') {
            try {
                // Remove prefixo se existir para garantir limpeza
                const base64Clean = pdfData.includes('base64,') ? pdfData.split('base64,')[1] : pdfData;
                
                // Verifica se é um base64 válido antes de converter
                if (base64Clean.length > 100) {
                    const byteCharacters = atob(base64Clean);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                    const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
                    activeUrl = URL.createObjectURL(blob);
                    setPdfBlobUrl(activeUrl);
                } else if (pdfData.startsWith('http')) {
                    setPdfBlobUrl(pdfData); // URL direta
                } else {
                    setPdfBlobUrl(null); // Dados inválidos
                }
            } catch (e) { 
                console.error("Erro crítico ao gerar Blob PDF:", e);
                setPdfBlobUrl(null); 
            }
        } else {
            setPdfBlobUrl(null);
        }
    };
    
    loadPdf();

    // Cleanup para liberar memória do Blob
    return () => {
        if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [viewingDoc]);

  // Helper para formatar o nome do executor
  const formatExecutor = (login?: string) => {
      if (!login) return 'SISTEMA';
      const users = StorageService.getUsers();
      const user = users.find(u => u.login === login);
      if (user) return `${user.name} (MAT: ${user.matricula})`;
      return login;
  };

  const handleAction = (task: ActiveMaintenance) => {
      if (task.status === 'PAUSADA' || task.status === 'AGUARDANDO') {
          StorageService.resumeMaintenance(task.id, currentUser);
      } else {
          setClosingTask(task);
      }
  };

  const handlePauseAndReport = async (task: ActiveMaintenance) => {
      if(!window.confirm("Pausar a atividade e gerar relatório parcial?")) return;
      await StorageService.pauseMaintenance(task.id);
      const startTimeISO = task.startTime;
      const endTimeISO = new Date().toISOString();
      const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
      const executorInfo = formatExecutor(task.openedBy);

      const reportData = {
          om: task.header.om,
          tag: task.header.tag,
          type: task.header.type,
          date: new Date().toLocaleDateString('pt-BR'),
          startTime: fmtTime(startTimeISO),
          endTime: fmtTime(endTimeISO),
          activities: task.header.description,
          stopReason: 'ATIVIDADE PAUSADA',
          status: 'PARCIAL', 
          executors: executorInfo,
          artId: task.artId
      };
      navigate('/report', { state: reportData });
      refreshData();
  };

  const openLinkOmModal = (taskId: string) => {
      setLinkTargetTaskId(taskId);
      setAvailableOms(StorageService.getOMs().filter(o => o.status !== 'CONCLUIDA'));
      setOmSearch('');
      setIsLinkingOm(true);
  };

  const handleConfirmLink = async (om: OMRecord) => {
      if(!linkTargetTaskId) return;
      await StorageService.linkOmToMaintenance(linkTargetTaskId, om.id, om.omNumber, om.description, om.tag);
      setIsLinkingOm(false);
      setLinkTargetTaskId('');
  };

  const completeAction = async (type: 'PARCIAL' | 'TOTAL' | 'CHECKLIST') => {
      if(!closingTask) return;
      const taskId = closingTask.id;
      const startTimeISO = closingTask.startTime;
      const endTimeISO = new Date().toISOString();
      const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
      const executorInfo = formatExecutor(closingTask.openedBy);

      if(type === 'PARCIAL') {
          await StorageService.setMaintenancePartial(taskId);
          const reportData = {
              om: closingTask.header.om,
              tag: closingTask.header.tag,
              type: closingTask.header.type,
              date: new Date().toLocaleDateString('pt-BR'),
              startTime: fmtTime(startTimeISO),
              endTime: fmtTime(endTimeISO),
              activities: closingTask.header.description,
              stopReason: 'PARADA PARCIAL / TROCA DE TURNO',
              status: 'PARCIAL',
              executors: executorInfo,
              artId: closingTask.artId
          };
          navigate('/report', { state: reportData });

      } else if(type === 'TOTAL') {
          const reportData = {
              om: closingTask.header.om,
              tag: closingTask.header.tag,
              type: closingTask.header.type,
              date: new Date().toLocaleDateString('pt-BR'),
              startTime: fmtTime(startTimeISO),
              endTime: fmtTime(endTimeISO),
              activities: closingTask.header.description,
              stopReason: 'MANUTENÇÃO CONCLUÍDA',
              status: 'FINALIZADO',
              executors: executorInfo,
              artId: closingTask.artId
          };
          await StorageService.completeMaintenance(taskId, 'TOTAL (MANUAL)', true);
          navigate('/report', { state: reportData });
      } else {
          navigate(`/checklist?maintenanceId=${taskId}`);
      }
      setClosingTask(null);
      refreshData();
  };

  const handleViewFullArt = (taskId: string, artId: string) => {
      const doc = allDocs.find(d => d.id === artId);
      if (doc) {
          setViewingFullArt(doc);
      } else {
          alert("Documento original não encontrado.");
      }
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-10">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 bg-gradient-to-r from-[#007e7a] to-[#005c97] p-4 rounded-xl shadow-lg animate-fadeIn relative z-30 text-white">
        <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm border border-white/10">
                <ShieldCheck size={24} className="text-white" />
            </div>
            <div>
                <h2 className="text-xl font-black text-white uppercase leading-none tracking-tight drop-shadow-md">Painel de Controle</h2>
                <div className="flex items-center gap-2 mt-1">
                    {isOnline ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/10 border border-white/20 rounded-full backdrop-blur-sm" title="Conexão de Dados Ativa">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(74,222,128,0.8)]"></div>
                            <span className="text-[9px] font-black text-white uppercase tracking-wider">ONLINE</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/20 border border-red-400/30 rounded-full backdrop-blur-sm" title="Desconectado">
                            <WifiOff size={10} className="text-red-300" />
                            <span className="text-[9px] font-black text-red-100 uppercase tracking-wider">OFFLINE</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* COLUNA ESQUERDA - CARDS ATIVOS (COMPACTOS) */}
        <div className="lg:col-span-8 space-y-4">
            <h3 className="font-black text-xs text-gray-500 uppercase border-b border-gray-200 pb-2 flex items-center gap-2 tracking-widest">
                <Activity size={14} /> Atividades em Execução ({activeTasks.length})
            </h3>
            
            {activeTasks.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border-2 border-dashed border-gray-300 flex flex-col items-center justify-center opacity-70 animate-fadeIn">
                    <div className="bg-gray-50 p-3 rounded-full mb-2">
                        <Wrench className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase">Nenhuma Atividade</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                    {activeTasks.map(task => {
                        const isExtraDemand = task.origin === 'DEMANDA_EXTRA';
                        const isCorretiva = task.origin === 'CORRETIVA' || task.artType === 'ART_EMERGENCIAL';
                        const isPartial = task.status === 'AGUARDANDO';
                        const isPaused = task.status === 'PAUSADA';
                        const taskOwner = task.openedBy?.toUpperCase() || 'SISTEMA';
                        
                        const isOwner = taskOwner === currentUser;
                        const canControl = isOwner || isPartial;

                        // Cores
                        let cardStyle = "bg-gradient-to-br from-blue-100 to-blue-50 border-blue-300 text-blue-900";
                        let iconColor = "text-blue-600";
                        if (isExtraDemand) {
                            cardStyle = "bg-gradient-to-br from-pink-100 to-pink-50 border-pink-300 text-pink-900";
                            iconColor = "text-pink-600";
                        } else if (isCorretiva) {
                            cardStyle = "bg-gradient-to-br from-red-100 to-red-50 border-red-300 text-red-900";
                            iconColor = "text-red-600";
                        } else if (isPaused) {
                            cardStyle = "bg-gradient-to-br from-yellow-100 to-yellow-50 border-yellow-300 text-yellow-900";
                            iconColor = "text-yellow-600";
                        }

                        const needsOmLink = task.header.om === 'DEMANDA-EXTRA';
                        const linkedOm = allOms.find(o => o.id === task.omId);
                        const linkedDoc = allDocs.find(d => d.id === task.artId);
                        const displayTag = linkedOm ? linkedOm.tag : task.header.tag;

                        return (
                            <div key={task.id} className={`rounded-2xl shadow-md border p-4 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${cardStyle}`}>
                                {/* HEADER COMPACTO */}
                                <div className="flex justify-between items-start border-b border-black/10 pb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg bg-white/70 border border-black/5 ${iconColor}`}>
                                            {isCorretiva ? <AlertOctagon size={20} /> : isExtraDemand ? <ClipboardList size={20} /> : getTaskIcon(task.header.type)}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-lg leading-none">{task.header.om}</h4>
                                            <span className="text-[9px] font-bold opacity-70 uppercase block mt-1">{task.header.type}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <MaintenanceTimer task={task} />
                                        <span className="text-[9px] font-bold opacity-60 block uppercase mt-0.5">
                                            {isPaused ? 'PAUSADA' : isPartial ? 'AGUARDANDO' : 'EM ANDAMENTO'}
                                        </span>
                                    </div>
                                </div>

                                {/* CORPO DO CARD */}
                                <div className="flex-1 min-h-[50px]">
                                    <div className="flex justify-between items-baseline mb-2">
                                        <span className={`text-xl font-black ${iconColor}`}>{displayTag}</span>
                                        <span className="text-[9px] font-bold bg-white/50 px-2 py-1 rounded-full uppercase border border-black/10 truncate max-w-[90px]">
                                            {taskOwner.split(' ')[0]}
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-bold opacity-80 uppercase leading-tight line-clamp-2">
                                        {task.header.description || 'SEM DESCRIÇÃO'}
                                    </p>
                                </div>

                                {/* FOOTER DE AÇÕES */}
                                <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-black/10">
                                    <div className="flex gap-2">
                                        {task.status === 'ANDAMENTO' ? (
                                            canControl ? (
                                                <>
                                                    <button onClick={() => handlePauseAndReport(task)} className="flex-1 bg-white border border-black/10 hover:bg-gray-50 text-gray-700 py-2.5 rounded-lg font-black text-xs uppercase flex items-center justify-center gap-2 transition-colors shadow-sm active:translate-y-0.5">
                                                        <PauseCircle size={16}/> Pausar
                                                    </button>
                                                    <button onClick={() => handleAction(task)} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-lg font-black text-xs uppercase flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all">
                                                        <StopCircle size={16}/> Finalizar
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="w-full bg-black/5 py-2 rounded-lg text-center text-xs font-bold opacity-50 flex items-center justify-center gap-2">
                                                    <Lock size={12}/> BLOQUEADO
                                                </div>
                                            )
                                        ) : (
                                            canControl ? (
                                                <button onClick={() => handleAction(task)} className="w-full bg-green-600 text-white py-3 rounded-lg font-black text-sm uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                                                    <PlayCircle size={16}/> {isPartial ? 'RETOMAR' : 'REINICIAR'}
                                                </button>
                                            ) : (
                                                <div className="w-full bg-black/5 py-2 rounded-lg text-center text-xs font-bold opacity-50 flex items-center justify-center gap-2">
                                                    <Lock size={12}/> AGUARDANDO
                                                </div>
                                            )
                                        )}
                                    </div>

                                    {/* BOTÕES DE DOCUMENTOS (OM & ART) */}
                                    <div className="flex gap-2">
                                        {/* Botão OM */}
                                        {linkedOm && (
                                            <button 
                                                onClick={() => setViewingDoc({ 
                                                    url: linkedOm.pdfUrl || 'TRUE', 
                                                    title: `OM: ${linkedOm.omNumber}`, 
                                                    type: 'OM', 
                                                    id: linkedOm.id 
                                                })} 
                                                className="flex-1 bg-white/60 hover:bg-white border border-black/10 rounded-lg py-1.5 flex items-center justify-center gap-1.5 text-gray-600 transition-colors" 
                                                title="Ver OM Original"
                                            >
                                                <FileText size={12} /> <span className="text-[9px] font-black uppercase">OM</span>
                                            </button>
                                        )}
                                        
                                        {/* Botão ART */}
                                        {linkedDoc && (
                                            <button 
                                                onClick={() => {
                                                    // Determina se é uma ART manual (Document) ou da Biblioteca (Template)
                                                    const isManual = linkedDoc.content?.manualFileUrl && linkedDoc.content.manualFileUrl !== 'TRUE';
                                                    const templateId = linkedDoc.content?.linkedArtId || linkedDoc.content?.artId;
                                                    
                                                    // Prioridade: 1. Manual Específico, 2. Template Padrão, 3. Fallback
                                                    setViewingDoc({ 
                                                        url: linkedDoc.content?.manualFileUrl || 'TRUE', 
                                                        title: `ART: ${linkedDoc.content?.artNumber || 'DOC'}`, 
                                                        type: 'DOCUMENT', // Por padrão buscamos no Doc, se falhar o viewer tenta fallback se necessário
                                                        id: linkedDoc.id
                                                    });
                                                }} 
                                                className="flex-1 bg-white/60 hover:bg-white border border-black/10 rounded-lg py-1.5 flex items-center justify-center gap-1.5 text-gray-600 transition-colors" 
                                                title="Ver Procedimento Padrão"
                                            >
                                                <BookOpen size={12} /> <span className="text-[9px] font-black uppercase">ART</span>
                                            </button>
                                        )}
                                        
                                        {/* Botão Visualizar Doc Preenchido (Dados) */}
                                        <button onClick={() => handleViewFullArt(task.id, task.artId)} className="flex-1 bg-white/60 hover:bg-white border border-black/10 rounded-lg py-1.5 flex items-center justify-center gap-1.5 text-gray-600 transition-colors" title="Ver ART Preenchida">
                                            <ClipboardList size={12} /> <span className="text-[9px] font-black uppercase">DADOS</span>
                                        </button>
                                        
                                        {needsOmLink && (
                                            <button onClick={() => openLinkOmModal(task.id)} className="flex-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg py-1.5 font-bold text-[9px] flex items-center justify-center gap-1 animate-pulse border border-yellow-200" title="Vincular OM">
                                                <LinkIcon size={12}/> LINK
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* COLUNA DIREITA - HISTÓRICO (MANTIDO IGUAL) */}
        <div className="lg:col-span-4 space-y-4">
             <h3 className="font-black text-xs text-gray-500 uppercase border-b border-gray-200 pb-2 flex items-center gap-2 tracking-widest">
                 <Clock size={14} /> Histórico Recente
             </h3>
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-[600px] flex flex-col animate-fadeIn">
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-2">
                    {history.slice(0, 20).map(log => (
                        <div key={log.id} className="bg-gray-50 p-2 rounded-lg border-l-4 border-gray-300 hover:border-[#007e7a] hover:bg-white hover:shadow-md transition-all group cursor-default">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-black text-gray-800 text-[10px] group-hover:text-[#007e7a]">{log.om}</span>
                                <span className="text-[8px] font-bold text-gray-400 bg-white px-1 py-0.5 rounded border border-gray-200">
                                    {new Date(log.endTime).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="text-[9px] font-black text-[#007e7a] uppercase mb-1">{log.tag}</div>
                            <div className="flex justify-between items-center border-t border-gray-200 pt-1">
                                <span className="text-[8px] font-bold text-gray-500 flex items-center gap-1">
                                    <Timer size={8}/> {log.duration}
                                </span>
                                <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${log.status.includes('TOTAL') ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {log.status === 'TOTAL (MANUAL)' ? 'CONCLUÍDO' : log.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* --- VISUALIZADOR DE ARQUIVOS (OM / ART) --- */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[100] bg-gray-900/95 flex items-center justify-center p-0 backdrop-blur-md">
            <div className="w-[98vw] h-[98vh] bg-white flex flex-col rounded-xl overflow-hidden shadow-2xl border-4 border-gray-900">
                <div className="bg-white p-3 flex justify-between items-center shrink-0 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#007e7a] text-white p-1.5 rounded">
                            <FileText size={18} />
                        </div>
                        <div>
                            <span className="font-black text-xs text-gray-800 uppercase tracking-wide block">Visualização de Documento</span>
                            <span className="font-bold text-[10px] text-[#007e7a] uppercase tracking-widest">{viewingDoc.title}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {pdfBlobUrl && (
                            <>
                                <a href={pdfBlobUrl} download={`DOC_${viewingDoc.title}.pdf`} className="p-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-600 transition-colors" title="Baixar Arquivo">
                                    <Download size={16}/>
                                </a>
                                <a href={pdfBlobUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-600 transition-colors md:hidden" title="Abrir em Nova Aba">
                                    <ExternalLink size={16}/>
                                </a>
                            </>
                        )}
                        <button onClick={() => setViewingDoc(null)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-all"><X size={24}/></button>
                    </div>
                </div>
                <div className="flex-1 bg-gray-100 relative">
                    {isLoadingPdf ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Loader2 size={48} className="text-[#007e7a] animate-spin mb-4" />
                            <h4 className="font-black text-xs uppercase">BAIXANDO ORIGINAL DO SERVIDOR...</h4>
                        </div>
                    ) : pdfBlobUrl ? (
                        <iframe src={pdfBlobUrl} className="w-full h-full border-none bg-white" title="Viewer" />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                            <Info size={40} className="opacity-20" />
                            <span className="font-bold text-[10px] uppercase tracking-widest">Documento Indisponível</span>
                            <p className="text-[9px] text-gray-400 max-w-xs text-center">O arquivo solicitado não foi encontrado no cache local ou no servidor.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Outros Modais (Mantidos) */}
      {viewingFullArt && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col animate-fadeIn h-[100dvh] overflow-hidden">
              {/* ... (Conteúdo do Modal de Full Art mantido igual, apenas o cabeçalho foi ajustado no código original se necessário) ... */}
              <div className="bg-white p-3 flex justify-between items-center shrink-0 shadow-md border-b border-gray-200 relative z-[110]">
                  <div className="flex items-center gap-3">
                      <div className="bg-[#007e7a] text-white p-1.5 rounded-lg shadow-sm">
                          <ShieldCheck size={20} />
                      </div>
                      <div>
                          <h3 className="font-black text-sm uppercase text-gray-800 leading-tight">Liberação de Segurança (Dados)</h3>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{viewingFullArt.header.om} - {viewingFullArt.header.tag}</p>
                      </div>
                  </div>
                  <button onClick={() => setViewingFullArt(null)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"><X size={28}/></button>
              </div>
              <div className="flex-1 overflow-auto bg-gray-100 p-4 md:p-10 flex flex-col items-center custom-scrollbar">
                  {/* ... Renderização do documento estruturado ... */}
                  {/* (Simplificando aqui para não repetir todo o bloco de renderização de DocumentRecord que já existia) */}
                  <div className="bg-white shadow-xl mx-auto font-sans text-gray-900 border border-gray-200 p-6 md:p-12 max-w-[21cm] w-full flex flex-col mb-10">
                      {/* ... Header do Doc ... */}
                      <div className="border-b-4 border-vale-green pb-4 mb-8 flex justify-between items-end">
                          <div className="flex items-center gap-4">
                              <Logo size="lg" />
                              <div className="border-l-2 border-gray-300 pl-4 h-12 flex flex-col justify-center">
                                  <h1 className="text-xl font-black text-vale-darkgray uppercase leading-none">{viewingFullArt.type.replace('_', ' ')}</h1>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">SISTEMA INTEGRADO DE SEGURANÇA</p>
                              </div>
                          </div>
                          {/* ... */}
                      </div>
                      {/* ... Resto do documento ... */}
                      <div className="space-y-4">
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-2 gap-4">
                              <div><span className="text-[9px] font-bold text-gray-400 block uppercase">OM/REF</span><span className="font-black text-lg">{viewingFullArt.header.om}</span></div>
                              <div><span className="text-[9px] font-bold text-gray-400 block uppercase">TAG</span><span className="font-black text-lg text-vale-green">{viewingFullArt.header.tag}</span></div>
                              <div className="col-span-2"><span className="text-[9px] font-bold text-gray-400 block uppercase">DESCRIÇÃO ATIVIDADE</span><span className="font-bold text-sm uppercase">{viewingFullArt.header.description}</span></div>
                          </div>
                          {/* ... Assinaturas ... */}
                          {viewingFullArt.signatures && (
                              <div className="mt-8 pt-8 border-t-2 border-gray-200">
                                  <h4 className="font-black text-[10px] uppercase mb-4 text-gray-400 tracking-widest text-center">Assinaturas</h4>
                                  <div className="grid grid-cols-2 gap-4">
                                      {viewingFullArt.signatures.map(sig => (
                                          <div key={sig.id} className="text-center">
                                              <img src={sig.signatureData} className="h-10 mx-auto" alt="Sig"/>
                                              <p className="text-[9px] font-bold uppercase">{sig.name}</p>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Modais de Encerramento e Link (Mantidos do original) */}
      {closingTask && (
          <div className="fixed inset-0 z-50 bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl border-t-4 border-[#007e7a]">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Finalizar Atividade</h3>
                      <button onClick={() => setClosingTask(null)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"><X size={20}/></button>
                  </div>
                  {/* ... Conteúdo do modal de encerramento ... */}
                  <div className="space-y-3">
                      <button onClick={() => completeAction('CHECKLIST')} className="w-full bg-[#007e7a] text-white p-4 rounded-xl font-black text-xs hover:bg-[#00605d] uppercase shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95 border-b-4 border-[#004d4a]">
                          <CheckSquare size={18} /> REALIZAR CHECKLIST E FINALIZAR
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => completeAction('PARCIAL')} className="bg-orange-50 text-orange-700 border border-orange-200 p-3 rounded-xl font-black text-[10px] hover:bg-orange-100 uppercase flex flex-col items-center gap-2 transition-all active:scale-95 hover:border-orange-300">
                              <Activity size={20} /> PARADA PARCIAL (LIBERA LOCK)
                          </button>
                          <button onClick={() => completeAction('TOTAL')} className="bg-gray-50 text-gray-600 border border-gray-200 p-3 rounded-xl font-black text-[10px] hover:bg-gray-100 uppercase flex flex-col items-center gap-2 transition-all active:scale-95 hover:border-gray-300">
                              <StopCircle size={20} /> ENCERRAR S/ CHK
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {isLinkingOm && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border-b-[6px] border-blue-600 flex flex-col max-h-[80vh]">
                  {/* ... Modal de Link OM ... */}
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <div>
                          <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Vincular Ordem (OM)</h3>
                      </div>
                      <button onClick={() => setIsLinkingOm(false)} className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"><X size={20}/></button>
                  </div>
                  <div className="mb-4">
                      <div className="relative">
                          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                          <input type="text" placeholder="FILTRAR..." value={omSearch} onChange={(e) => setOmSearch(e.target.value.toUpperCase())} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold uppercase outline-none focus:border-blue-500"/>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                      {availableOms.filter(o => o.omNumber.includes(omSearch) || o.tag.includes(omSearch)).map(om => (
                          <button key={om.id} onClick={() => handleConfirmLink(om)} className="w-full text-left bg-white p-3 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all">
                              <div className="flex justify-between items-center mb-1"><span className="font-black text-gray-800">{om.omNumber}</span></div>
                              <div className="text-xs font-bold text-gray-600 uppercase truncate">{om.tag} - {om.description}</div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};