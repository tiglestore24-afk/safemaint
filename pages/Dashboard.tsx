
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StorageService, NotificationItem } from '../services/storage';
import { ActiveMaintenance, MaintenanceLog, OMRecord } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, AlertOctagon, PauseCircle, 
  StopCircle, Bell, X, Activity, 
  ShieldCheck, WifiOff, Database, Wrench, PlayCircle, Timer, Lock, 
  Volume2, VolumeX, Eye, Info, CheckSquare, CloudLightning, FileText, Box, Layers, UserCheck
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

    return <span className="text-xl font-mono font-bold text-gray-800 leading-none">{time}</span>;
};

// --- 3D MODAL COMPONENT ---
const Modal3D: React.FC<{ task: ActiveMaintenance; onClose: () => void }> = ({ task, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="relative w-full max-w-lg aspect-square flex items-center justify-center" onClick={e => e.stopPropagation()}>
                {/* HUD CIRCLES */}
                <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-full animate-spin-slow"></div>
                <div className="absolute inset-4 border border-dashed border-cyan-500/20 rounded-full animate-spin-reverse-slow"></div>
                
                {/* 3D CUBE CONTAINER */}
                <div className="relative w-32 h-32 preserve-3d animate-rotate-3d">
                    <div className="absolute inset-0 bg-cyan-500/20 border-2 border-cyan-400/50 translate-z-16 flex items-center justify-center text-cyan-200 font-bold text-xs">FRONT</div>
                    <div className="absolute inset-0 bg-cyan-500/20 border-2 border-cyan-400/50 -translate-z-16 rotate-y-180 flex items-center justify-center text-cyan-200 font-bold text-xs">BACK</div>
                    <div className="absolute inset-0 bg-cyan-500/20 border-2 border-cyan-400/50 -translate-x-16 rotate-y-90 flex items-center justify-center text-cyan-200 font-bold text-xs">LEFT</div>
                    <div className="absolute inset-0 bg-cyan-500/20 border-2 border-cyan-400/50 translate-x-16 -rotate-y-90 flex items-center justify-center text-cyan-200 font-bold text-xs">RIGHT</div>
                    <div className="absolute inset-0 bg-cyan-500/20 border-2 border-cyan-400/50 -translate-y-16 rotate-x-90 flex items-center justify-center text-cyan-200 font-bold text-xs">TOP</div>
                    <div className="absolute inset-0 bg-cyan-500/20 border-2 border-cyan-400/50 translate-y-16 -rotate-x-90 flex items-center justify-center text-cyan-200 font-bold text-xs">BOTTOM</div>
                </div>

                {/* INFO PANELS FLOATING */}
                <div className="absolute top-0 left-0 bg-black/50 border border-cyan-500/50 p-4 rounded-xl backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    <h4 className="text-cyan-400 text-xs font-black uppercase tracking-widest mb-1">EQUIPAMENTO</h4>
                    <p className="text-white text-xl font-black">{task.header.tag}</p>
                </div>

                <div className="absolute bottom-0 right-0 bg-black/50 border border-cyan-500/50 p-4 rounded-xl backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.3)] text-right">
                    <h4 className="text-cyan-400 text-xs font-black uppercase tracking-widest mb-1">STATUS ATUAL</h4>
                    <p className="text-white text-xl font-black animate-pulse">{task.status}</p>
                </div>

                <div className="absolute top-0 right-0 bg-black/50 border border-cyan-500/50 p-4 rounded-xl backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.3)] text-right">
                    <h4 className="text-cyan-400 text-xs font-black uppercase tracking-widest mb-1">TEMPO</h4>
                    <div className="text-white"><MaintenanceTimer task={task} /></div>
                </div>

                <button onClick={onClose} className="absolute -bottom-12 bg-white text-black px-6 py-2 rounded-full font-black uppercase text-xs hover:scale-105 transition-transform">
                    FECHAR VISUALIZAÇÃO 3D
                </button>
            </div>
        </div>
    );
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
  const [active3DTask, setActive3DTask] = useState<ActiveMaintenance | null>(null);
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
    <div className="max-w-[1600px] mx-auto pb-10 px-4">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-[#007e7a]" />
            <div>
                <h2 className="text-lg font-bold text-gray-800 uppercase leading-none">Painel de Controle</h2>
                <div className="flex items-center gap-2 mt-1">
                    {/* Visual Connection Indicator Only - No Text */}
                    {isOnline ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full" title="Conexão de Dados Ativa">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.6)]"></div>
                            <Database size={12} className="text-green-600" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 border border-red-200 rounded-full" title="Desconectado">
                            <WifiOff size={12} className="text-red-600" />
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="flex gap-2 items-center">
            <button onClick={toggleMute} className={`p-2 rounded border transition-all ${isMuted ? 'bg-gray-100 text-gray-400' : 'bg-white text-[#007e7a] border-[#007e7a]'}`}>
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 bg-white rounded border border-gray-200 relative hover:bg-gray-50">
                    <Bell size={16} className="text-gray-600" />
                    {notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{notifications.length}</span>}
                </button>
                {showNotifications && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <div className="bg-gray-100 p-2 flex justify-between items-center border-b">
                            <span className="font-bold text-[10px] uppercase text-gray-600">Notificações</span>
                            <button onClick={() => setShowNotifications(false)}><X size={14}/></button>
                        </div>
                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? <div className="p-3 text-center text-gray-400 text-[10px] font-bold">Sem alertas</div> : notifications.map(n => (
                                <div key={n.id} onClick={() => handleNotificationClick(n)} className="p-2 border-b border-gray-50 cursor-pointer hover:bg-gray-50">
                                    <div className="flex justify-between mb-1"><span className={`text-[8px] font-bold px-1 rounded ${n.type === 'URGENT' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{n.type}</span><span className="text-[8px] text-gray-400">{n.date}</span></div>
                                    <p className="text-[10px] font-bold text-gray-700 truncate">{n.title}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
            <h3 className="font-bold text-sm text-gray-600 uppercase border-b pb-1">Atividades em Execução</h3>
            {activeTasks.length === 0 ? (
                <div className="bg-white rounded-lg p-10 text-center border-2 border-dashed border-gray-200">
                    <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-gray-400 uppercase">Nenhuma Atividade em andamento</h3>
                    <p className="text-[10px] text-gray-400 uppercase mt-1">Inicie um serviço pela Agenda ou Ordens</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* 3D CARDS LAYOUT */}
                    {activeTasks.map(task => {
                        const isRed = task.origin === 'CORRETIVA' || task.artType === 'ART_EMERGENCIAL';
                        const isPartial = task.status === 'AGUARDANDO';
                        const taskOwner = task.openedBy?.toUpperCase() || 'SISTEMA';
                        
                        // VERIFICAÇÃO DE PROPRIEDADE: Apenas quem abriu ou Admin pode encerrar
                        // MAS, se estiver "AGUARDANDO" (Parcial), qualquer um pode assumir (Retomar).
                        const isOwner = taskOwner === currentUser;
                        const isAdmin = currentRole === 'ADMIN';
                        const canControl = isOwner || isAdmin || isPartial;

                        let borderClass = 'border-l-[#007e7a]';
                        if (isPartial) borderClass = 'border-l-orange-500';
                        else if (isRed) borderClass = 'border-l-red-500';

                        let bgClass = 'bg-white';
                        if (isPartial) bgClass = 'bg-orange-50';

                        let statusBadgeClass = 'bg-green-50 text-green-600 border-green-200';
                        if (task.status === 'PAUSADA') statusBadgeClass = 'bg-yellow-100 text-yellow-700 border-yellow-200';
                        if (task.status === 'AGUARDANDO') statusBadgeClass = 'bg-orange-100 text-orange-700 border-orange-200';

                        return (
                            <div key={task.id} className="group perspective-1000">
                                <div className={`
                                    relative rounded-xl p-4 shadow-lg border-l-8 
                                    ${borderClass} ${bgClass}
                                    transition-all duration-500 transform-style-3d 
                                    group-hover:rotate-y-2 group-hover:rotate-x-2 group-hover:shadow-2xl
                                    flex flex-col md:flex-row justify-between items-center gap-4
                                    border border-gray-100
                                `}>
                                    {/* GLOW EFFECT ON HOVER */}
                                    <div className={`absolute -inset-0.5 rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-500 ${isRed ? 'bg-red-500' : isPartial ? 'bg-orange-500' : 'bg-cyan-500'}`}></div>
                                    
                                    <div className="relative rounded-lg p-2 flex-1 w-full md:w-auto z-10 flex flex-col md:flex-row gap-4 items-center">
                                        <div className={`p-3 rounded-full shadow-inner ${isRed ? 'bg-red-50 text-red-500' : isPartial ? 'bg-orange-100 text-orange-500' : 'bg-teal-50 text-[#007e7a]'}`}>
                                            {isRed ? <AlertOctagon size={24}/> : <Box size={24}/>}
                                        </div>
                                        <div className="min-w-0 text-center md:text-left">
                                            <div className="flex items-center justify-center md:justify-start gap-2">
                                                <h4 className="font-black text-xl text-gray-800 leading-none truncate">{task.header.om}</h4>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase border whitespace-nowrap ${statusBadgeClass}`}>
                                                    {task.status === 'AGUARDANDO' ? 'PARCIAL' : task.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 justify-center md:justify-start">
                                                <p className="text-[11px] font-bold text-gray-500 uppercase truncate">
                                                    {task.header.tag}
                                                </p>
                                                <span className="text-gray-300">|</span>
                                                <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                    <UserCheck size={10} className="text-blue-600"/>
                                                    <span className="text-[9px] font-black text-blue-700 uppercase">{taskOwner}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative z-10 flex items-center gap-6 shrink-0 w-full md:w-auto justify-between md:justify-end px-4 md:px-0">
                                         <div className="text-right">
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tempo em Atividade</p>
                                            <div className="bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">
                                                <MaintenanceTimer task={task} />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setActive3DTask(task)} 
                                                className="bg-gray-900 text-white p-2.5 rounded-lg hover:bg-black transition-colors shadow-lg hover:scale-110 active:scale-95" 
                                                title="Modelo 3D"
                                            >
                                                <Box size={18} />
                                            </button>
                                            {task.status === 'ANDAMENTO' ? (
                                                canControl ? (
                                                    <>
                                                        <button onClick={() => StorageService.pauseMaintenance(task.id)} className="bg-gray-100 text-gray-600 p-2.5 rounded-lg hover:bg-gray-200 transition-colors shadow hover:scale-105 active:scale-95" title="Pausar"><PauseCircle size={18} /></button>
                                                        <button onClick={() => handleAction(task)} className="bg-red-600 text-white px-4 py-2.5 rounded-lg font-black text-[10px] hover:bg-red-700 transition-all uppercase flex items-center gap-1.5 shadow-lg hover:shadow-red-500/30 hover:scale-105 active:scale-95"><StopCircle size={14} /> ENCERRAR</button>
                                                    </>
                                                ) : <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded text-[8px] font-bold text-gray-400 uppercase flex flex-col items-center justify-center min-w-[80px]"><Lock size={12} className="mb-1" /> RESP: {taskOwner.split(' ')[0]}</div>
                                            ) : (
                                                canControl ? (
                                                    <button onClick={() => handleAction(task)} className="bg-[#007e7a] text-white px-4 py-2.5 rounded-lg font-black text-[10px] hover:bg-[#00605d] transition-all uppercase flex items-center gap-1.5 shadow-lg hover:shadow-teal-500/30 hover:scale-105 active:scale-95"><PlayCircle size={14} /> RETOMAR</button>
                                                ) : <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded text-[8px] font-bold text-gray-400 uppercase flex flex-col items-center justify-center min-w-[80px]"><Lock size={12} className="mb-1" /> RESP: {taskOwner.split(' ')[0]}</div>
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

        <div className="lg:col-span-4 space-y-4">
             <h3 className="font-bold text-sm text-gray-600 uppercase border-b pb-1">Últimos Concluídos</h3>
             <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-[450px] flex flex-col">
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-2">
                    {history.length === 0 && <div className="text-center text-gray-300 font-bold text-[10px] mt-10 uppercase">Sem registros recentes</div>}
                    {history.slice(0, 15).map(log => (
                        <div key={log.id} className="bg-gray-50 p-2.5 rounded border-l-2 border-gray-300 hover:border-[#007e7a] transition-all group">
                            <div className="flex justify-between items-start">
                                <span className="font-black text-gray-800 text-[11px] group-hover:text-[#007e7a]">{log.om}</span>
                                <span className="text-[8px] font-bold text-gray-400">{new Date(log.endTime).toLocaleDateString()} {new Date(log.endTime).toLocaleTimeString().slice(0,5)}</span>
                            </div>
                            <div className="text-[10px] font-black text-[#007e7a] uppercase mt-0.5">{log.tag}</div>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-[9px] font-bold text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-100 flex items-center gap-1"><Timer size={10}/> {log.duration}</span>
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${log.status.includes('TOTAL') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{log.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {closingTask && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl border-t-4 border-[#007e7a]">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-black text-gray-800 uppercase tracking-tighter">Finalizar Atividade</h3>
                      <button onClick={() => setClosingTask(null)} className="p-1 hover:bg-gray-100 rounded-full"><X size={20} className="text-gray-400"/></button>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg mb-6 border border-gray-200">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">DETALHES DA ORDEM</p>
                      <p className="text-xs font-black text-gray-700 uppercase">OM: {closingTask.header.om} | {closingTask.header.tag}</p>
                  </div>

                  <div className="space-y-3">
                      <button onClick={() => completeAction('CHECKLIST')} className="w-full bg-[#007e7a] text-white p-4 rounded-xl font-black text-[11px] hover:bg-[#00605d] uppercase shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95 border-b-4 border-[#004d4a]">
                          <CheckSquare size={18} /> CHECKLIST E FINALIZAR
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => completeAction('PARCIAL')} className="bg-orange-50 text-orange-700 border border-orange-200 p-3 rounded-xl font-black text-[9px] hover:bg-orange-100 uppercase flex flex-col items-center gap-1.5 transition-all active:scale-95">
                              <Activity size={18} /> PARADA PARCIAL
                          </button>
                          <button onClick={() => completeAction('TOTAL')} className="bg-gray-50 text-gray-600 border border-gray-200 p-3 rounded-xl font-black text-[9px] hover:bg-gray-100 uppercase flex flex-col items-center gap-1.5 transition-all active:scale-95">
                              <StopCircle size={18} /> ENCERRAR S/ CHK
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {active3DTask && (
          <Modal3D task={active3DTask} onClose={() => setActive3DTask(null)} />
      )}

      {viewingOM && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="w-full h-full max-w-4xl bg-white flex flex-col rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-gray-900 text-white p-3 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <FileText size={16} className="text-[#007e7a]" />
                        <span className="font-black text-[10px] uppercase tracking-widest">Documento - {viewingOM.omNumber}</span>
                    </div>
                    <button onClick={() => setViewingOM(null)} className="p-1 hover:bg-red-600 rounded-full transition-all"><X size={20}/></button>
                </div>
                <div className="flex-1 bg-gray-200 relative">
                    {pdfBlobUrl ? (
                        <iframe src={pdfBlobUrl} className="w-full h-full border-none bg-white" title="Viewer" />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                            <Info size={32} className="opacity-20" />
                            <span className="font-bold text-[10px] uppercase tracking-widest">Nenhum PDF Disponível</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

        <style>{`
            .perspective-1000 { perspective: 1000px; }
            .transform-style-3d { transform-style: preserve-3d; }
            .preserve-3d { transform-style: preserve-3d; }
            .translate-z-16 { transform: translateZ(64px); }
            .-translate-z-16 { transform: translateZ(-64px); }
            .translate-x-16 { transform: translateX(64px) rotateY(90deg); }
            .-translate-x-16 { transform: translateX(-64px) rotateY(-90deg); }
            .translate-y-16 { transform: translateY(64px) rotateX(-90deg); }
            .-translate-y-16 { transform: translateY(-64px) rotateX(90deg); }
            
            @keyframes rotate3d {
                0% { transform: rotateX(0) rotateY(0) rotateZ(0); }
                100% { transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg); }
            }
            .animate-rotate-3d { animation: rotate3d 10s linear infinite; }
        `}</style>
    </div>
  );
};
