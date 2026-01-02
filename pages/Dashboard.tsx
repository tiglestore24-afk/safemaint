
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StorageService, NotificationItem } from '../services/storage';
import { ActiveMaintenance, MaintenanceLog, OMRecord } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, AlertOctagon, PauseCircle, 
  StopCircle, Bell, X, Activity, 
  ShieldCheck, WifiOff, Database, Wrench, PlayCircle, Timer, Lock, 
  Volume2, VolumeX, Eye, Info, CheckSquare, CloudLightning, FileText, Box, Layers, UserCheck, Zap, MoreHorizontal, Droplets, Flame
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

    return <span className="text-lg font-mono font-bold text-gray-800 tracking-wider">{time}</span>;
};

// Ícone baseado no tipo de manutenção
const getTaskIcon = (type: string) => {
    switch (type) {
        case 'ELETRICA': return <Zap size={20} className="text-yellow-600" />;
        case 'LUBRIFICACAO': return <Droplets size={20} className="text-blue-600" />;
        case 'SOLDA': return <Flame size={20} className="text-orange-600" />;
        case 'OUTROS': return <MoreHorizontal size={20} className="text-gray-600" />;
        default: return <Wrench size={20} className="text-gray-600" />; // MECANICA default
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
  const [viewingOM, setViewingOM] = useState<OMRecord | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  
  const [currentUser, setCurrentUser] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('safemaint_sound_muted') === 'true');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const refreshData = useCallback(() => {
    const tasks = StorageService.getActiveMaintenances();
    setActiveTasks(tasks);
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

  useEffect(() => {
    if (viewingOM?.pdfUrl) {
        try {
            if (viewingOM.pdfUrl.startsWith('data:application/pdf;base64,')) {
                const parts = viewingOM.pdfUrl.split(',');
                if (parts.length > 1) {
                    const byteCharacters = atob(parts[1]);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                    const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    setPdfBlobUrl(url);
                    return () => URL.revokeObjectURL(url);
                }
            } else setPdfBlobUrl(viewingOM.pdfUrl);
        } catch (e) { setPdfBlobUrl(viewingOM.pdfUrl); }
    } else setPdfBlobUrl(null);
  }, [viewingOM]);

  const toggleMute = () => {
      const newState = !isMuted;
      setIsMuted(newState);
      localStorage.setItem('safemaint_sound_muted', String(newState));
  };

  const handleAction = (task: ActiveMaintenance) => {
      // Retomar para status 'ANDAMENTO'
      if (task.status === 'PAUSADA' || task.status === 'AGUARDANDO') {
          StorageService.resumeMaintenance(task.id);
      } else {
          setClosingTask(task);
      }
  };

  const completeAction = async (type: 'PARCIAL' | 'TOTAL' | 'CHECKLIST') => {
      if(!closingTask) return;
      const taskId = closingTask.id;
      const header = { ...closingTask.header };
      const startTime = closingTask.startTime;

      if(type === 'PARCIAL') {
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
      const omsList = StorageService.getOMs();
      const om = omsList.find(o => o.id === n.id);
      if (om) setViewingOM(om);
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-10">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 animate-fadeIn">
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
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden ring-1 ring-black/5 animate-fadeIn">
                        <div className="bg-gray-50 p-3 flex justify-between items-center border-b">
                            <span className="font-black text-[10px] uppercase text-gray-500 tracking-wider">Notificações</span>
                            <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? <div className="p-6 text-center text-gray-400 text-[10px] font-bold uppercase">Sem alertas pendentes</div> : notifications.map(n => (
                                <div key={n.id} onClick={() => handleNotificationClick(n)} className="p-3 border-b border-gray-50 cursor-pointer hover:bg-blue-50 transition-colors group">
                                    <div className="flex justify-between mb-1">
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${n.type === 'URGENT' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{n.type}</span>
                                        <span className="text-[9px] text-gray-400">{n.date}</span>
                                    </div>
                                    <p className="text-xs font-bold text-gray-700 truncate group-hover:text-blue-700">{n.title}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA - CARDS ATIVOS */}
        <div className="lg:col-span-8 space-y-4">
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
                <div className="space-y-4 animate-fadeIn">
                    {activeTasks.map(task => {
                        const isRed = task.origin === 'CORRETIVA' || task.artType === 'ART_EMERGENCIAL';
                        const isPartial = task.status === 'AGUARDANDO';
                        const isPaused = task.status === 'PAUSADA';
                        const taskOwner = task.openedBy?.toUpperCase() || 'SISTEMA';
                        
                        // VERIFICAÇÃO DE PROPRIEDADE RESTRITA
                        const isOwner = taskOwner === currentUser;
                        const canControl = isOwner; 

                        // Definição de Cores Flat e Profissionais
                        let borderClass = 'border-l-[#007e7a]'; // Verde Vale Padrão
                        let bgBadge = 'bg-green-100 text-green-800';
                        
                        if (isPaused) {
                            borderClass = 'border-l-yellow-500';
                            bgBadge = 'bg-yellow-100 text-yellow-800';
                        } else if (isPartial) {
                            borderClass = 'border-l-orange-500';
                            bgBadge = 'bg-orange-100 text-orange-800';
                        } else if (isRed) {
                            borderClass = 'border-l-red-600';
                            bgBadge = 'bg-red-100 text-red-800';
                        }

                        return (
                            <div key={task.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-[6px] ${borderClass} p-5 hover:shadow-md transition-shadow relative overflow-hidden`}>
                                
                                {/* Header do Card */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-lg ${isRed ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                                            {isRed ? <AlertOctagon size={24} /> : getTaskIcon(task.header.type)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-black text-xl text-gray-800 leading-none">{task.header.om}</h4>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${bgBadge}`}>
                                                    {task.status === 'AGUARDANDO' ? 'PARCIAL' : task.status}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-[#007e7a] uppercase tracking-wide">{task.header.tag}</p>
                                        </div>
                                    </div>

                                    {/* Timer e Responsável */}
                                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end bg-gray-50 p-2 rounded-lg border border-gray-100">
                                        <div className="text-right px-2">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">TEMPO DECORRIDO</p>
                                            <MaintenanceTimer task={task} />
                                        </div>
                                        <div className="w-px h-8 bg-gray-200"></div>
                                        <div className="px-2">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">RESPONSÁVEL</p>
                                            <div className="flex items-center gap-1">
                                                <UserCheck size={12} className="text-blue-500"/>
                                                <span className="text-xs font-bold text-gray-700 truncate max-w-[100px]">{taskOwner.split(' ')[0]}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Descrição Breve */}
                                <div className="mb-5 px-1">
                                    <p className="text-[11px] font-medium text-gray-500 uppercase line-clamp-1">{task.header.description || 'Sem descrição detalhada.'}</p>
                                </div>

                                {/* Ações */}
                                <div className="flex flex-wrap gap-2 justify-end border-t border-gray-100 pt-4">
                                    {task.status === 'ANDAMENTO' ? (
                                        canControl ? (
                                            <>
                                                <button 
                                                    onClick={() => StorageService.pauseMaintenance(task.id)} 
                                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-50 text-yellow-700 font-bold text-xs uppercase hover:bg-yellow-100 transition-colors"
                                                >
                                                    <PauseCircle size={16} /> Pausar
                                                </button>
                                                <button 
                                                    onClick={() => handleAction(task)} 
                                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-red-600 text-white font-black text-xs uppercase hover:bg-red-700 shadow-sm transition-all active:scale-95"
                                                >
                                                    <StopCircle size={16} /> Encerrar
                                                </button>
                                            </>
                                        ) : (
                                            <div className="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-xs font-bold uppercase flex items-center gap-2 cursor-not-allowed border border-gray-200">
                                                <Lock size={14} /> Controle Bloqueado
                                            </div>
                                        )
                                    ) : (
                                        canControl ? (
                                            <button 
                                                onClick={() => handleAction(task)} 
                                                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-[#007e7a] text-white font-black text-xs uppercase hover:bg-[#00605d] shadow-sm transition-all active:scale-95"
                                            >
                                                <PlayCircle size={16} /> Retomar Atividade
                                            </button>
                                        ) : (
                                            <div className="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-xs font-bold uppercase flex items-center gap-2 cursor-not-allowed border border-gray-200">
                                                <Lock size={14} /> Retomada Bloqueada
                                            </div>
                                        )
                                    )}
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
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-[500px] flex flex-col animate-fadeIn">
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
              <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border-t-4 border-[#007e7a]">
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
                              <Activity size={20} /> PARADA PARCIAL
                          </button>
                          <button onClick={() => completeAction('TOTAL')} className="bg-gray-50 text-gray-600 border border-gray-200 p-3 rounded-xl font-black text-[10px] hover:bg-gray-100 uppercase flex flex-col items-center gap-2 transition-all active:scale-95 hover:border-gray-300">
                              <StopCircle size={20} /> ENCERRAR S/ CHK
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* PDF VIEWER OVERLAY */}
      {viewingOM && (
        <div className="fixed inset-0 z-[100] bg-gray-900/95 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="w-full h-full max-w-5xl bg-white flex flex-col rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-white p-3 flex justify-between items-center shrink-0 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#007e7a] text-white p-1.5 rounded">
                            <FileText size={18} />
                        </div>
                        <div>
                            <span className="font-black text-xs text-gray-800 uppercase tracking-wide block">Visualização de Documento</span>
                            <span className="font-bold text-[10px] text-[#007e7a] uppercase tracking-widest">{viewingOM.omNumber}</span>
                        </div>
                    </div>
                    <button onClick={() => setViewingOM(null)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-all"><X size={20}/></button>
                </div>
                <div className="flex-1 bg-gray-100 relative">
                    {pdfBlobUrl ? (
                        <iframe src={pdfBlobUrl} className="w-full h-full border-none bg-white" title="Viewer" />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                            <Info size={40} className="opacity-20" />
                            <span className="font-bold text-[10px] uppercase tracking-widest">Documento não carregado</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
