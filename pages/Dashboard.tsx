
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StorageService, NotificationItem } from '../services/storage';
import { ActiveMaintenance, MaintenanceLog, OMRecord, DocumentRecord, RegisteredART } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, AlertOctagon, PauseCircle, 
  StopCircle, Bell, X, Activity, 
  ShieldCheck, WifiOff, Database, Wrench, PlayCircle, Timer, Lock, 
  Volume2, VolumeX, Eye, Info, CheckSquare, CloudLightning, FileText, Box, Layers, UserCheck, Zap, MoreHorizontal, Droplets, Flame, Calendar, Link as LinkIcon, Search, ClipboardList, Loader2
} from 'lucide-react';
import { checkConnection } from '../services/supabase';

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

    // Cores vibrantes baseadas no status
    let colorClass = 'text-gray-800';
    if (task.status === 'ANDAMENTO') colorClass = 'text-[#007e7a]'; // Vale Green
    if (task.status === 'PAUSADA') colorClass = 'text-yellow-500'; // Vibrant Yellow
    if (task.status === 'AGUARDANDO') colorClass = 'text-orange-500'; // Vibrant Orange

    return <span className={`text-3xl font-black font-mono tracking-tighter ${colorClass}`}>{time}</span>;
};

// Ícone baseado no tipo de manutenção
const getTaskIcon = (type: string) => {
    switch (type) {
        case 'ELETRICA': return <Zap size={18} className="text-yellow-600" />;
        case 'LUBRIFICACAO': return <Droplets size={18} className="text-blue-600" />;
        case 'SOLDA': return <Flame size={18} className="text-orange-600" />;
        case 'OUTROS': return <MoreHorizontal size={18} className="text-gray-600" />;
        default: return <Wrench size={18} className="text-gray-600" />; // MECANICA default
    }
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTasks, setActiveTasks] = useState<ActiveMaintenance[]>([]);
  const [history, setHistory] = useState<MaintenanceLog[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [closingTask, setClosingTask] = useState<ActiveMaintenance | null>(null);
  
  // Viewer State (Generic for OM or ART)
  const [viewingDoc, setViewingDoc] = useState<{ url: string; title: string; type: string; id: string } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  
  // Data for lookups
  const [allOms, setAllOms] = useState<OMRecord[]>([]);
  const [allDocs, setAllDocs] = useState<DocumentRecord[]>([]);
  const [allArts, setAllArts] = useState<RegisteredART[]>([]);

  // Link OM States
  const [isLinkingOm, setIsLinkingOm] = useState(false);
  const [linkTargetTaskId, setLinkTargetTaskId] = useState('');
  const [availableOms, setAvailableOms] = useState<OMRecord[]>([]);
  const [omSearch, setOmSearch] = useState('');
  
  const [currentUser, setCurrentUser] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('safemaint_sound_muted') === 'true');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const refreshData = useCallback(() => {
    const tasks = StorageService.getActiveMaintenances();
    const oms = StorageService.getOMs();
    const docs = StorageService.getDocuments();
    const arts = StorageService.getARTs();
    
    setActiveTasks(tasks);
    setAllOms(oms);
    setAllDocs(docs);
    setAllArts(arts);
    setHistory(StorageService.getHistory());
    setNotifications(StorageService.getNotifications());
  }, []);

  useEffect(() => {
    const user = localStorage.getItem('safemaint_user');
    const role = localStorage.getItem('safemaint_role');
    if(user) setCurrentUser(user.toUpperCase());
    if(role) setCurrentRole(role.toUpperCase());
    
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

    refreshData();
    const validateConn = async () => setIsOnline(await checkConnection());
    validateConn();

    window.addEventListener('safemaint_storage_update', refreshData);
    return () => window.removeEventListener('safemaint_storage_update', refreshData);
  }, [refreshData]);

  // FETCH PDF SOB DEMANDA SE NÃO EXISTIR NA MEMÓRIA OU FOR MARCADOR 'TRUE'
  useEffect(() => {
    const loadPdf = async () => {
        if (!viewingDoc) {
            setPdfBlobUrl(null);
            return;
        }

        let pdfData = viewingDoc.url;
        let activeUrl: string | null = null;

        if (!pdfData || pdfData === 'TRUE') {
            setIsLoadingPdf(true);
            const table = viewingDoc.type === 'PROCEDIMENTO' ? 'arts' : 'oms'; // Mapeia 'OM'->oms e 'PROCEDIMENTO'->arts
            const remotePdf = await StorageService.getRecordPdf(table as any, viewingDoc.id);
            if (remotePdf) pdfData = remotePdf;
            setIsLoadingPdf(false);
        }

        if (pdfData && pdfData !== 'TRUE') {
            try {
                if (pdfData.startsWith('data:application/pdf;base64,')) {
                    const parts = pdfData.split(',');
                    if (parts.length > 1) {
                        const byteCharacters = atob(parts[1]);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                        const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
                        activeUrl = URL.createObjectURL(blob);
                        setPdfBlobUrl(activeUrl);
                        return () => URL.revokeObjectURL(activeUrl!);
                    }
                } else setPdfBlobUrl(pdfData);
            } catch (e) { setPdfBlobUrl(pdfData); }
        } else {
            setPdfBlobUrl(null);
        }
    };
    
    loadPdf();
  }, [viewingDoc]);

  const toggleMute = () => {
      const newState = !isMuted;
      setIsMuted(newState);
      localStorage.setItem('safemaint_sound_muted', String(newState));
  };

  const handleAction = (task: ActiveMaintenance) => {
      // Retomar para status 'ANDAMENTO'
      if (task.status === 'PAUSADA' || task.status === 'AGUARDANDO') {
          // Passamos o currentUser para que a posse da atividade seja transferida para quem está retomando
          StorageService.resumeMaintenance(task.id, currentUser);
      } else {
          setClosingTask(task);
      }
  };

  const openLinkOmModal = (taskId: string) => {
      setLinkTargetTaskId(taskId);
      setAvailableOms(StorageService.getOMs().filter(o => o.status !== 'CONCLUIDA'));
      setOmSearch('');
      setIsLinkingOm(true);
  };

  const handleConfirmLink = async (om: OMRecord) => {
      if(!linkTargetTaskId) return;
      await StorageService.linkOmToMaintenance(linkTargetTaskId, om.id, om.omNumber, om.description);
      setIsLinkingOm(false);
      setLinkTargetTaskId('');
  };

  const completeAction = async (type: 'PARCIAL' | 'TOTAL' | 'CHECKLIST') => {
      if(!closingTask) return;
      const taskId = closingTask.id;
      const header = { ...closingTask.header };
      const startTime = closingTask.startTime;

      if(type === 'PARCIAL') {
          // Parada Parcial libera o LOCK
          await StorageService.setMaintenancePartial(taskId);
      } else if(type === 'TOTAL') {
          await StorageService.completeMaintenance(taskId, 'TOTAL (MANUAL)', true);
          navigate('/report', { state: { ...header, status: 'FINALIZADO', startTime } });
      } else {
          navigate(`/checklist?maintenanceId=${taskId}`);
      }
      setClosingTask(null);
      refreshData();
  };

  const handleNotificationClick = (n: NotificationItem) => {
      if (n.source === 'DEMAND') {
          navigate('/extra-demands');
          setShowNotifications(false);
          return;
      }
      
      const omsList = StorageService.getOMs();
      const om = omsList.find(o => o.id === n.id);
      if (om && om.pdfUrl) {
          setViewingDoc({ url: om.pdfUrl, title: om.omNumber, type: 'OM', id: om.id });
          setShowNotifications(false);
      }
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-10">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 animate-fadeIn relative z-30">
        <div className="flex items-center gap-4">
            <div className="bg-[#007e7a]/10 p-2 rounded-lg">
                <ShieldCheck size={24} className="text-[#007e7a]" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-gray-800 uppercase leading-none tracking-tight">Painel de Controle</h2>
                <div className="flex items-center gap-2 mt-1">
                    {/* Visual Connection Indicator */}
                    {isOnline ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full" title="Conexão de Dados Ativa">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.6)]"></div>
                            <span className="text-[9px] font-black text-green-700 uppercase">ONLINE</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 border border-red-200 rounded-full" title="Desconectado">
                            <WifiOff size={10} className="text-red-600" />
                            <span className="text-[9px] font-black text-red-700 uppercase">OFFLINE</span>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="flex gap-3 items-center">
            <button onClick={toggleMute} className={`p-2.5 rounded-lg border transition-all ${isMuted ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-[#007e7a] border-[#007e7a]/30 shadow-sm'}`}>
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2.5 bg-white rounded-lg border border-gray-200 relative hover:bg-gray-50 transition-colors shadow-sm">
                    <Bell size={18} className="text-gray-600" />
                    {notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce">{notifications.length}</span>}
                </button>
                {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-[9999] overflow-hidden ring-1 ring-black/5 animate-fadeIn">
                        <div className="bg-gray-50 p-3 flex justify-between items-center border-b">
                            <span className="font-black text-[10px] uppercase text-gray-500 tracking-wider">Notificações ({notifications.length})</span>
                            <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
                        </div>
                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? <div className="p-6 text-center text-gray-400 text-[10px] font-bold uppercase">Sem alertas pendentes</div> : notifications.map(n => (
                                <div key={n.id} onClick={() => handleNotificationClick(n)} className="p-3 border-b border-gray-50 cursor-pointer hover:bg-blue-50 transition-colors group">
                                    <div className="flex justify-between mb-1">
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${n.type === 'URGENT' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{n.type}</span>
                                        <span className="text-[9px] text-gray-400">{n.date}</span>
                                    </div>
                                    <p className="text-xs font-black text-gray-800 truncate group-hover:text-blue-700">{n.title}</p>
                                    <p className="text-[10px] font-bold text-gray-500 line-clamp-2 leading-tight mt-0.5 group-hover:text-gray-600 uppercase">{n.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* COLUNA ESQUERDA - CARDS ATIVOS */}
        <div className="lg:col-span-8 space-y-6">
            <h3 className="font-black text-sm text-gray-500 uppercase border-b border-gray-200 pb-2 flex items-center gap-2">
                <Activity size={16} /> Atividades em Execução
            </h3>
            
            {activeTasks.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300 flex flex-col items-center justify-center opacity-70 animate-fadeIn">
                    <div className="bg-gray-50 p-4 rounded-full mb-3">
                        <Wrench className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase">Nenhuma Atividade Iniciada</h3>
                    <p className="text-[10px] text-gray-400 uppercase mt-1">Utilize a Agenda ou Cadastro de OM para iniciar</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 animate-fadeIn">
                    {activeTasks.map(task => {
                        const isExtraDemand = task.origin === 'DEMANDA_EXTRA';
                        const isCorretiva = task.origin === 'CORRETIVA' || task.artType === 'ART_EMERGENCIAL';
                        const isPartial = task.status === 'AGUARDANDO';
                        const isPaused = task.status === 'PAUSADA';
                        const taskOwner = task.openedBy?.toUpperCase() || 'SISTEMA';
                        
                        // --- LÓGICA DE BLOQUEIO (LOCK) ---
                        const isOwner = taskOwner === currentUser;
                        const canControl = isOwner || isPartial;

                        // Cores
                        let statusColor = 'bg-[#007e7a]'; 
                        let statusText = 'PREVENTIVA';
                        
                        if (isExtraDemand) {
                            statusColor = 'bg-pink-600';
                            statusText = 'DEMANDA EXTRA';
                        } else if (isCorretiva) {
                            statusColor = 'bg-red-600';
                            statusText = 'CORRETIVA';
                        } else {
                            statusColor = 'bg-blue-600';
                            statusText = 'PREVENTIVA';
                        }

                        if (isPaused) statusText += ' (PAUSADA)';
                        else if (isPartial) statusText += ' (AGUARDANDO)';
                        else statusText += ' (EM EXECUÇÃO)';

                        const needsOmLink = task.header.om === 'DEMANDA-EXTRA';

                        // --- LÓGICA ROBUSTA PARA PDF ---
                        // 1. Tenta pegar da OM Vinculada
                        const linkedOm = allOms.find(o => o.id === task.omId);
                        let pdfUrl = linkedOm?.pdfUrl;
                        let pdfTitle = linkedOm?.omNumber || 'DOCUMENTO ORIGINAL';
                        let pdfType = 'OM';
                        let docId = linkedOm?.id || '';

                        // 2. Se não achou na OM, tenta pegar da ART Vinculada (Procedimento Padrão)
                        if (!pdfUrl && task.artId) {
                            const linkedDoc = allDocs.find(d => d.id === task.artId);
                            if (linkedDoc?.content?.artId) {
                                const linkedArt = allArts.find(a => a.id === linkedDoc.content.artId);
                                if (linkedArt?.pdfUrl) {
                                    pdfUrl = linkedArt.pdfUrl;
                                    pdfTitle = linkedArt.taskName;
                                    pdfType = 'PROCEDIMENTO';
                                    docId = linkedArt.id;
                                }
                            }
                        }

                        // Has PDF = either has URL locally OR has an ID to fetch from server
                        const hasPdf = !!pdfUrl || !!docId;

                        return (
                            <div key={task.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden flex flex-col md:flex-row">
                                {/* Lateral Colorida Status */}
                                <div className={`w-full md:w-3 ${statusColor} shrink-0`}></div>
                                
                                <div className="flex-1 p-5 flex flex-col gap-4">
                                    {/* Linha 1: Header */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isCorretiva ? 'bg-red-50 text-red-600' : isExtraDemand ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {isCorretiva ? <AlertOctagon size={20} /> : isExtraDemand ? <ClipboardList size={20} /> : getTaskIcon(task.header.type)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-black text-xl text-gray-800 leading-none">{task.header.om}</h4>
                                                    <span className={`text-[9px] font-black text-white px-2 py-0.5 rounded-full uppercase ${statusColor}`}>
                                                        {statusText}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs font-bold text-gray-400 uppercase">{task.header.type}</span>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="text-xs font-bold text-gray-400 uppercase">{new Date(task.startTime).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            {/* Botão Ver PDF - INDISPENSÁVEL E VISÍVEL */}
                                            {hasPdf && (
                                                <button 
                                                    onClick={() => setViewingDoc({ url: pdfUrl!, title: pdfTitle, type: pdfType, id: docId })}
                                                    className={`
                                                        px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all shadow-sm
                                                        ${pdfType === 'OM' ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'}
                                                    `}
                                                    title={`Visualizar ${pdfType}`}
                                                >
                                                    <FileText size={12} /> {pdfType === 'OM' ? 'PDF ORIGINAL (OM)' : 'PDF ORIGINAL (ART)'}
                                                </button>
                                            )}

                                            {/* Botão Vincular OM */}
                                            {needsOmLink && (
                                                <button 
                                                    onClick={() => openLinkOmModal(task.id)}
                                                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-colors"
                                                >
                                                    <LinkIcon size={12} /> Vincular OM
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Linha 2: Timer e Info Principal */}
                                    <div className="flex flex-col md:flex-row gap-6 items-center bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <div className="text-center md:text-left min-w-[140px]">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">TEMPO DECORRIDO</p>
                                            <MaintenanceTimer task={task} />
                                        </div>
                                        
                                        <div className="w-px h-10 bg-gray-200 hidden md:block"></div>
                                        
                                        <div className="flex-1 text-center md:text-left w-full">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">EQUIPAMENTO & DESCRIÇÃO</p>
                                            <p className="text-base font-black text-[#007e7a] uppercase leading-none mb-1">{task.header.tag}</p>
                                            <p className="text-xs font-medium text-gray-600 uppercase truncate whitespace-pre-wrap">{task.header.description || 'Sem descrição'}</p>
                                        </div>
                                    </div>

                                    {/* Linha 3: Footer e Ações */}
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2">
                                        <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-full shadow-sm ${!canControl ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                                            <div className="bg-gray-100 p-1 rounded-full"><UserCheck size={14} className="text-gray-500"/></div>
                                            <span className={`text-[10px] font-bold uppercase ${!canControl ? 'text-red-600' : 'text-gray-600'}`}>
                                                {!canControl ? `BLOQUEADO POR ${taskOwner}` : `RESP: ${taskOwner}`}
                                            </span>
                                        </div>

                                        <div className="flex gap-2 w-full md:w-auto">
                                            {task.status === 'ANDAMENTO' ? (
                                                canControl ? (
                                                    <>
                                                        <button 
                                                            onClick={() => StorageService.pauseMaintenance(task.id)} 
                                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-yellow-50 text-yellow-700 font-bold text-xs uppercase hover:bg-yellow-100 transition-colors border border-yellow-200"
                                                        >
                                                            <PauseCircle size={18} /> Pausar
                                                        </button>
                                                        <button 
                                                            onClick={() => handleAction(task)} 
                                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white font-black text-xs uppercase hover:bg-red-700 shadow-md hover:shadow-lg transition-all active:scale-95"
                                                        >
                                                            <StopCircle size={18} /> Encerrar
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="px-6 py-3 bg-gray-100 text-gray-400 rounded-xl text-xs font-bold uppercase flex items-center gap-2 cursor-not-allowed border border-gray-200 w-full justify-center">
                                                        <Lock size={16} /> Somente {taskOwner} pode mexer
                                                    </div>
                                                )
                                            ) : (
                                                canControl ? (
                                                    <button 
                                                        onClick={() => handleAction(task)} 
                                                        className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[#007e7a] text-white font-black text-xs uppercase hover:bg-[#00605d] shadow-md hover:shadow-lg transition-all active:scale-95"
                                                    >
                                                        <PlayCircle size={18} /> {isPartial ? 'Assumir e Retomar' : 'Retomar Atividade'}
                                                    </button>
                                                ) : (
                                                    <div className="px-6 py-3 bg-gray-100 text-gray-400 rounded-xl text-xs font-bold uppercase flex items-center gap-2 cursor-not-allowed border border-gray-200 w-full justify-center">
                                                        <Lock size={16} /> Retomada Bloqueada
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* COLUNA DIREITA - HISTÓRICO */}
        <div className="lg:col-span-4 space-y-4">
             <h3 className="font-black text-sm text-gray-500 uppercase border-b border-gray-200 pb-2 flex items-center gap-2">
                 <Clock size={16} /> Histórico Recente
             </h3>
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-[600px] flex flex-col animate-fadeIn">
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-2">
                    {history.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300">
                            <Layers size={32} className="opacity-20 mb-2" />
                            <span className="text-[10px] font-bold uppercase">Nenhum registro</span>
                        </div>
                    )}
                    {history.slice(0, 20).map(log => (
                        <div key={log.id} className="bg-gray-50 p-3 rounded-lg border-l-4 border-gray-300 hover:border-[#007e7a] hover:bg-white hover:shadow-sm transition-all group cursor-default">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-black text-gray-800 text-xs group-hover:text-[#007e7a]">{log.om}</span>
                                <span className="text-[9px] font-bold text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                    {new Date(log.endTime).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="text-[10px] font-black text-[#007e7a] uppercase mb-1.5">{log.tag}</div>
                            
                            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                <span className="text-[9px] font-bold text-gray-500 flex items-center gap-1">
                                    <Timer size={10}/> {log.duration}
                                </span>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${log.status.includes('TOTAL') ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {log.status === 'TOTAL (MANUAL)' ? 'CONCLUÍDO' : log.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* MODAL DE ENCERRAMENTO */}
      {closingTask && (
          <div className="fixed inset-0 z-50 bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl border-t-4 border-[#007e7a]">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Finalizar Atividade</h3>
                      <button onClick={() => setClosingTask(null)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"><X size={20}/></button>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-200">
                      <div className="flex justify-between items-end mb-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">OM</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TAG</p>
                      </div>
                      <div className="flex justify-between items-end">
                          <p className="text-lg font-black text-gray-800 uppercase leading-none">{closingTask.header.om}</p>
                          <p className="text-lg font-black text-[#007e7a] uppercase leading-none">{closingTask.header.tag}</p>
                      </div>
                  </div>

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

      {/* MODAL LINK OM */}
      {isLinkingOm && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border-b-[6px] border-blue-600 flex flex-col max-h-[80vh]">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <div>
                          <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Vincular Ordem (OM)</h3>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Selecione uma OM pendente para esta demanda</p>
                      </div>
                      <button onClick={() => setIsLinkingOm(false)} className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"><X size={20}/></button>
                  </div>

                  <div className="mb-4">
                      <div className="relative">
                          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                          <input 
                              type="text" 
                              placeholder="FILTRAR POR OM OU TAG..." 
                              value={omSearch}
                              onChange={(e) => setOmSearch(e.target.value.toUpperCase())}
                              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold uppercase outline-none focus:border-blue-500"
                              autoFocus
                          />
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                      {availableOms.filter(o => o.omNumber.includes(omSearch) || o.tag.includes(omSearch)).length === 0 ? (
                          <div className="text-center py-10 text-gray-400">
                              <Info size={32} className="mx-auto mb-2 opacity-50"/>
                              <p className="text-xs font-bold uppercase">Nenhuma OM encontrada</p>
                          </div>
                      ) : (
                          availableOms.filter(o => o.omNumber.includes(omSearch) || o.tag.includes(omSearch)).map(om => (
                              <button 
                                  key={om.id} 
                                  onClick={() => handleConfirmLink(om)}
                                  className="w-full text-left bg-white p-3 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                              >
                                  <div className="flex justify-between items-center mb-1">
                                      <span className="font-black text-gray-800">{om.omNumber}</span>
                                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${om.type === 'CORRETIVA' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{om.type}</span>
                                  </div>
                                  <div className="text-xs font-bold text-gray-600 uppercase truncate">{om.tag} - {om.description}</div>
                              </button>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* PDF VIEWER OVERLAY (GENERIC - MAXIMIZED FOR SAFETY) */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-fadeIn overflow-hidden">
            <div className="bg-gray-900 px-4 py-2 flex justify-between items-center text-white shrink-0 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <FileText size={18} className="text-[#007e7a]"/>
                    <div>
                        <h3 className="font-black text-sm tracking-tighter uppercase">Visualizador de Documento</h3>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{viewingDoc.title}</p>
                    </div>
                </div>
                <button onClick={() => setViewingDoc(null)} className="p-2 bg-white/10 rounded hover:bg-red-600 transition-colors"><X size={16}/></button>
            </div>
            
            <div className="flex-1 bg-black relative">
                {isLoadingPdf ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Loader2 size={48} className="text-[#007e7a] animate-spin mb-4" />
                        <h4 className="font-black text-xs uppercase">BAIXANDO ORIGINAL DO SERVIDOR...</h4>
                    </div>
                ) : pdfBlobUrl ? (
                    <iframe src={pdfBlobUrl} className="w-full h-full border-none" title="Viewer" />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Info size={48} className="mx-auto mb-2 opacity-30" />
                        <h4 className="font-black text-xs uppercase">PDF Indisponível</h4>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};
