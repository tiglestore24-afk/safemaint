
import React, { useEffect, useState, useCallback } from 'react';
import { StorageService } from '../services/storage';
import { ActiveMaintenance, MaintenanceLog, OMRecord, DocumentRecord } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, AlertOctagon, PauseCircle, 
  StopCircle, X, Activity, 
  ShieldCheck, WifiOff, Wrench, PlayCircle, Timer, Lock, 
  FileText, Layers, Zap, MoreHorizontal, Droplets, Flame, Link as LinkIcon, Search, ClipboardList, CheckSquare, BookOpen, UserCheck, File
} from 'lucide-react';
import { checkConnection } from '../services/supabase';
import { PDFViewerModal } from '../components/PDFViewerModal'; // Importado

const MaintenanceTimer: React.FC<{ task: ActiveMaintenance }> = ({ task }) => {
    const [time, setTime] = useState('00:00:00');

    const calculateTime = useCallback(() => {
        const now = new Date();
        let totalMs = task.accumulatedTime || 0;
        
        // Garante que currentSessionStart é válido antes de usar
        if (task.status === 'ANDAMENTO' && task.currentSessionStart) {
            const startDate = new Date(task.currentSessionStart);
            if (!isNaN(startDate.getTime())) {
                totalMs += (now.getTime() - startDate.getTime());
            }
        }
        
        // Evita tempos negativos
        if (totalMs < 0) totalMs = 0;

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
  
  // Viewer State (New)
  const [viewerState, setViewerState] = useState<{ isOpen: boolean; url?: string; title: string; id?: string; table?: 'oms' | 'documents' }>({
      isOpen: false, title: ''
  });
  
  // Data for lookups
  const [allOms, setAllOms] = useState<OMRecord[]>([]);
  const [allDocs, setAllDocs] = useState<DocumentRecord[]>([]);
  
  // Link OM States
  const [isLinkingOm, setIsLinkingOm] = useState(false);
  const [linkTargetTaskId, setLinkTargetTaskId] = useState('');
  const [availableOms, setAvailableOms] = useState<OMRecord[]>([]);
  const [omSearch, setOmSearch] = useState('');
  
  const [currentUser, setCurrentUser] = useState('');
  const [userRole, setUserRole] = useState('OPERADOR');

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
    const role = localStorage.getItem('safemaint_role');
    if(user) setCurrentUser(user.toUpperCase());
    if(role) setUserRole(role);
    
    refreshData();
    const validateConn = async () => setIsOnline(await checkConnection());
    validateConn();

    window.addEventListener('safemaint_storage_update', refreshData);
    return () => window.removeEventListener('safemaint_storage_update', refreshData);
  }, [refreshData]);

  const handleAction = (task: ActiveMaintenance) => {
      if (task.status === 'PAUSADA' || task.status === 'AGUARDANDO') {
          StorageService.resumeMaintenance(task.id, currentUser);
      } else {
          setClosingTask(task);
      }
  };

  const handleAssumeActivity = (task: ActiveMaintenance) => {
      navigate('/art-emergencial', {
          state: {
              om: task.header.om,
              tag: task.header.tag,
              description: task.header.description,
              type: task.header.type,
              maintenanceId: task.id, 
              isResuming: true,
              omId: task.omId,
              origin: task.origin
          }
      });
  };

  const handlePauseAndReport = async (task: ActiveMaintenance) => {
      if(!window.confirm("Pausar a atividade e gerar relatório parcial?")) return;

      await StorageService.pauseMaintenance(task.id);

      const startTimeISO = task.startTime;
      const endTimeISO = new Date().toISOString();
      const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
      const executorInfo = StorageService.resolveUserName(task.openedBy || '');

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
      const executorInfo = StorageService.resolveUserName(closingTask.openedBy || '');

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

  return (
    <div className="max-w-[1600px] mx-auto pb-10">
      
      {/* NOVO VIEWER */}
      <PDFViewerModal 
        isOpen={viewerState.isOpen}
        onClose={() => setViewerState(prev => ({ ...prev, isOpen: false }))}
        title={viewerState.title}
        fileUrl={viewerState.url}
        recordId={viewerState.id}
        table={viewerState.table || 'oms'}
      />

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
                        const isWaitingHandover = task.status === 'AGUARDANDO';
                        const isPaused = task.status === 'PAUSADA';
                        const taskOwnerLogin = task.openedBy || '';
                        const taskOwnerName = StorageService.resolveUserName(taskOwnerLogin);
                        
                        const isMyTask = taskOwnerLogin.toUpperCase() === currentUser;
                        const isLocked = !isMyTask && !isWaitingHandover && !isPaused;

                        let cardStyle = "bg-gradient-to-br from-blue-100 to-blue-50 border-blue-300 text-blue-900";
                        let iconColor = "text-blue-600";
                        let buttonColor = "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 border-b-4 border-blue-800 active:border-b-0 active:translate-y-0.5";
                        let cardAnimation = "";
                        let statusLabel = isCorretiva ? "CORRETIVA" : isExtraDemand ? "DEMANDA EXTRA" : "PREVENTIVA";
                        let statusLabelBg = isCorretiva ? "bg-red-200 text-red-800" : isExtraDemand ? "bg-pink-200 text-pink-800" : "bg-blue-200 text-blue-800";
                        
                        if (isWaitingHandover) {
                            cardStyle = "bg-gradient-to-br from-orange-100 to-yellow-50 border-orange-300 text-orange-900";
                            iconColor = "text-orange-600";
                            buttonColor = "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 border-b-4 border-orange-700 active:border-b-0 active:translate-y-0.5";
                        } else if (isExtraDemand) {
                            cardStyle = "bg-gradient-to-br from-pink-100 to-pink-50 border-pink-300 text-pink-900";
                            iconColor = "text-pink-600";
                            buttonColor = "bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 border-b-4 border-pink-800 active:border-b-0 active:translate-y-0.5";
                        } else if (isCorretiva) {
                            cardStyle = "bg-gradient-to-br from-red-100 to-red-50 border-red-300 text-red-900";
                            iconColor = "text-red-600";
                            buttonColor = "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 border-b-4 border-red-800 active:border-b-0 active:translate-y-0.5";
                            cardAnimation = "animate-pulse-slow shadow-lg shadow-red-500/20";
                        } else if (isPaused) {
                            cardStyle = "bg-gradient-to-br from-yellow-100 to-yellow-50 border-yellow-300 text-yellow-900";
                            iconColor = "text-yellow-600";
                            buttonColor = "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 border-b-4 border-yellow-700 active:border-b-0 active:translate-y-0.5";
                        }
                        
                        if (isLocked) {
                            cardStyle = "bg-gray-100 border-gray-300 text-gray-500 grayscale opacity-80";
                            iconColor = "text-gray-400";
                            buttonColor = "bg-gray-400 cursor-not-allowed";
                        }

                        const needsOmLink = task.header.om === 'DEMANDA-EXTRA';

                        const linkedOm = allOms.find(o => o.id === task.omId);
                        const linkedDoc = allDocs.find(d => d.id === task.artId);
                        const displayTag = linkedOm ? linkedOm.tag : task.header.tag;

                        const hasOmPdf = linkedOm && (linkedOm.pdfUrl === 'TRUE' || (linkedOm.pdfUrl && linkedOm.pdfUrl.length > 5));
                        const hasArtPdf = linkedDoc && linkedDoc.content && (linkedDoc.content.manualFileUrl === 'TRUE' || (linkedDoc.content.manualFileUrl && linkedDoc.content.manualFileUrl.length > 5));

                        return (
                            <div key={task.id} className={`rounded-2xl shadow-md border p-4 flex flex-col gap-3 transition-all duration-300 hover:shadow-xl ${cardStyle} ${cardAnimation}`}>
                                <div className="flex justify-between items-start border-b border-black/10 pb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg bg-white/70 border border-black/5 ${iconColor}`}>
                                            {isCorretiva ? <AlertOctagon size={20} /> : isExtraDemand ? <ClipboardList size={20} /> : getTaskIcon(task.header.type)}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-lg leading-none">{task.header.om}</h4>
                                            <span className={`text-[8px] font-black uppercase mt-1 px-1.5 py-0.5 rounded inline-block ${statusLabelBg}`}>
                                                {statusLabel}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {isWaitingHandover ? (
                                            <span className="text-sm font-black text-orange-600 block bg-orange-100 px-2 py-1 rounded">AGUARDANDO</span>
                                        ) : (
                                            <MaintenanceTimer task={task} />
                                        )}
                                        <span className="text-[9px] font-bold opacity-60 block uppercase mt-0.5">
                                            {isPaused ? 'PAUSADA' : isWaitingHandover ? 'TROCA DE TURNO' : 'EM ANDAMENTO'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-1 min-h-[50px]">
                                    <div className="flex justify-between items-baseline mb-2">
                                        <span className={`text-xl font-black ${iconColor}`}>{displayTag}</span>
                                        <span className="text-[9px] font-bold bg-white/50 px-2 py-1 rounded-full uppercase border border-black/10 truncate max-w-[120px] flex items-center gap-1" title={taskOwnerLogin}>
                                            {isLocked ? <Lock size={8}/> : <UserCheck size={8}/>} 
                                            {taskOwnerName.split(' ')[0]}
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-bold opacity-80 uppercase leading-tight line-clamp-2">
                                        {task.header.description || 'SEM DESCRIÇÃO'}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-black/10">
                                    
                                    {isLocked && (
                                        <div className="bg-gray-200 text-gray-600 p-2 rounded-lg text-center font-bold text-[10px] uppercase flex items-center justify-center gap-2">
                                            <Lock size={12}/> EM USO POR {taskOwnerName}
                                        </div>
                                    )}

                                    {/* AÇÕES (ESCONDIDAS PARA OPERADOR) */}
                                    {!isLocked && userRole === 'ADMIN' && (
                                        <div className="flex gap-2 mb-1">
                                            {isWaitingHandover ? (
                                                <button onClick={() => handleAssumeActivity(task)} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-black text-sm uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all border-b-4 border-orange-700 active:border-b-0 active:translate-y-1">
                                                    <UserCheck size={18}/> ASSUMIR MANUTENÇÃO (REINICIAR ART)
                                                </button>
                                            ) : task.status === 'ANDAMENTO' ? (
                                                <>
                                                    <button onClick={() => handlePauseAndReport(task)} className="flex-1 bg-white border border-black/10 hover:bg-gray-50 text-gray-700 py-2.5 rounded-lg font-black text-xs uppercase flex items-center justify-center gap-2 transition-colors shadow-sm active:translate-y-0.5">
                                                        <PauseCircle size={16}/> Pausar
                                                    </button>
                                                    <button onClick={() => handleAction(task)} className={`flex-1 text-white py-2.5 rounded-lg font-black text-xs uppercase flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all ${buttonColor}`}>
                                                        <StopCircle size={16}/> Finalizar
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => handleAction(task)} className={`w-full text-white py-3 rounded-lg font-black text-sm uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all ${buttonColor}`}>
                                                    <PlayCircle size={16}/> REINICIAR
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2">
                                        {hasOmPdf ? (
                                            <button 
                                                onClick={() => setViewerState({ isOpen: true, url: linkedOm?.pdfUrl!, title: `OM: ${linkedOm?.omNumber}`, table: 'oms', id: linkedOm?.id! })} 
                                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 flex items-center justify-center gap-2 shadow-sm transition-colors group"
                                                title="Ver OM Original"
                                            >
                                                <div className="bg-white/20 p-1 rounded-md"><FileText size={12} className="text-white"/></div>
                                                <span className="text-[9px] font-black uppercase">OM PDF</span>
                                            </button>
                                        ) : (
                                            <div className="bg-black/5 border border-black/5 rounded-lg py-2 flex items-center justify-center gap-1 opacity-40 cursor-not-allowed">
                                                <File size={12}/> <span className="text-[8px] font-black uppercase">SEM OM</span>
                                            </div>
                                        )}

                                        {hasArtPdf ? (
                                            <button 
                                                onClick={() => setViewerState({ isOpen: true, url: linkedDoc?.content.manualFileUrl, title: `ART PADRÃO: ${linkedDoc?.content.artNumber || 'DOC'}`, table: 'documents', id: linkedDoc?.id! })} 
                                                className="bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 flex items-center justify-center gap-2 shadow-sm transition-colors group"
                                                title="Ver Procedimento Padrão"
                                            >
                                                <div className="bg-white/20 p-1 rounded-md"><BookOpen size={12} className="text-white"/></div>
                                                <span className="text-[9px] font-black uppercase">ART PDF</span>
                                            </button>
                                        ) : (
                                            <div className="bg-black/5 border border-black/5 rounded-lg py-2 flex items-center justify-center gap-1 opacity-40 cursor-not-allowed">
                                                <File size={12}/> <span className="text-[8px] font-black uppercase">SEM ART</span>
                                            </div>
                                        )}
                                    </div>

                                    {needsOmLink && !isLocked && userRole === 'ADMIN' && (
                                        <button onClick={() => openLinkOmModal(task.id)} className="w-full mt-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg py-2 font-bold text-[9px] flex items-center justify-center gap-1 animate-pulse border border-yellow-200 uppercase" title="Vincular OM">
                                            <LinkIcon size={12}/> VINCULAR ORDEM (OM) AGORA
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        <div className="lg:col-span-4 space-y-4">
             <h3 className="font-black text-xs text-gray-500 uppercase border-b border-gray-200 pb-2 flex items-center gap-2 tracking-widest">
                 <Clock size={14} /> Histórico Recente
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
                          <button onClick={() => completeAction('PARCIAL')} className="bg-orange-50 text-orange-700 border border-orange-200 p-3 rounded-xl font-black text-[10px] hover:bg-orange-100 uppercase flex flex-col items-center gap-2 transition-all active:scale-95 hover:border-orange-300 text-center leading-tight">
                              <Activity size={20} /> PARADA PARCIAL<br/>(LIBERA P/ OUTRO)
                          </button>
                          <button onClick={() => completeAction('TOTAL')} className="bg-gray-50 text-gray-600 border border-gray-200 p-3 rounded-xl font-black text-[10px] hover:bg-gray-100 uppercase flex flex-col items-center gap-2 transition-all active:scale-95 hover:border-gray-300 text-center leading-tight">
                              <StopCircle size={20} /> ENCERRAR<br/>SEM CHECKLIST
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
