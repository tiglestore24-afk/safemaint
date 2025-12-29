
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StorageService, NotificationItem } from '../services/storage';
import { ActiveMaintenance, MaintenanceLog, OMRecord } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  CheckSquare, Clock, AlertOctagon, PauseCircle, 
  StopCircle, Bell, X, Activity, 
  ShieldCheck, Wifi, WifiOff, Database, Wrench, PlayCircle, Timer, User, Lock, 
  Volume2, VolumeX, BarChart3, Eye, Calendar, Info, FileText, Download
} from 'lucide-react';
import { checkConnection } from '../services/supabase';
import { BackButton } from '../components/BackButton';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTasks, setActiveTasks] = useState<ActiveMaintenance[]>([]);
  const [history, setHistory] = useState<MaintenanceLog[]>([]);
  const [now, setNow] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [closingTask, setClosingTask] = useState<ActiveMaintenance | null>(null);
  const [viewingOM, setViewingOM] = useState<OMRecord | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState('');
  
  const [downtimeStats, setDowntimeStats] = useState<{tag: string, totalMinutes: number, formatted: string, percentage: number}[]>([]);
  
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('safemaint_sound_muted') === 'true');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevNotificationCount = useRef(0);

  const refreshData = useCallback(() => {
    setActiveTasks(StorageService.getActiveMaintenances());
    const hist = StorageService.getHistory();
    setHistory(hist);
    setNotifications(StorageService.getNotifications());
    calculateDowntimeStats(hist);
  }, []);

  useEffect(() => {
    const user = localStorage.getItem('safemaint_user');
    if(user) setCurrentUser(user);
    
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

    refreshData();
    const validateConn = async () => setIsOnline(await checkConnection());
    validateConn();

    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    window.addEventListener('safemaint_storage_update', refreshData);
    
    return () => { 
        clearInterval(clockInterval); 
        window.removeEventListener('safemaint_storage_update', refreshData);
    };
  }, [refreshData]);

  // PDF BLOB HANDLING
  useEffect(() => {
    if (viewingOM?.pdfUrl) {
        try {
            if (viewingOM.pdfUrl.startsWith('data:application/pdf;base64,')) {
                const byteCharacters = atob(viewingOM.pdfUrl.split(',')[1]);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                setPdfBlobUrl(url);
                return () => URL.revokeObjectURL(url);
            } else {
                setPdfBlobUrl(viewingOM.pdfUrl);
            }
        } catch (e) {
            console.error("Erro ao converter PDF:", e);
            setPdfBlobUrl(viewingOM.pdfUrl); // Fallback
        }
    } else {
        setPdfBlobUrl(null);
    }
  }, [viewingOM]);

  const toggleMute = () => {
      const newState = !isMuted;
      setIsMuted(newState);
      localStorage.setItem('safemaint_sound_muted', String(newState));
  };

  useEffect(() => {
      const urgentCount = notifications.filter(n => n.type === 'URGENT').length;
      if (urgentCount > prevNotificationCount.current) {
          if (audioRef.current && !isMuted) {
              audioRef.current.play().catch(e => console.log('Audio Blocked:', e));
          }
          if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
          }
      }
      prevNotificationCount.current = urgentCount;
  }, [notifications, isMuted]);

  const calculateDowntimeStats = (logs: MaintenanceLog[]) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentLogs = logs.filter(log => new Date(log.endTime) >= thirtyDaysAgo);
      const tagMap: Record<string, number> = {};

      recentLogs.forEach(log => {
          if (!log.duration || log.duration.includes('PARCIAL')) return;
          const parts = log.duration.match(/(\d+)h\s*(\d+)m/);
          let minutes = 0;
          if (parts) minutes = (parseInt(parts[1]) * 60) + parseInt(parts[2]);
          if (minutes > 0) tagMap[log.tag] = (tagMap[log.tag] || 0) + minutes;
      });

      const sortedTags = Object.entries(tagMap).sort(([, a], [, b]) => b - a).slice(0, 6);
      const maxMinutes = sortedTags.length > 0 ? sortedTags[0][1] : 1; 

      const stats = sortedTags.map(([tag, minutes]) => {
          const h = Math.floor(minutes / 60);
          const m = minutes % 60;
          return { tag, totalMinutes: minutes, formatted: `${h}h ${m}m`, percentage: (minutes / maxMinutes) * 100 };
      });
      setDowntimeStats(stats);
  };

  const getElapsedTime = (task: ActiveMaintenance) => {
    let totalMs = task.accumulatedTime || 0;
    if (task.status === 'ANDAMENTO' && task.currentSessionStart) {
        totalMs += (now.getTime() - new Date(task.currentSessionStart).getTime());
    }
    const h = Math.floor(totalMs / 3600000);
    const m = Math.floor((totalMs % 3600000) / 60000);
    const s = Math.floor((totalMs % 60000) / 1000);
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };

  const handleAction = (task: ActiveMaintenance) => {
      if (task.status === 'PAUSADA' || task.status === 'AGUARDANDO') {
          StorageService.resumeMaintenance(task.id);
      } else {
          setClosingTask(task);
      }
  };

  const completeAction = async (type: 'PARCIAL' | 'TOTAL' | 'CHECKLIST') => {
      if(!closingTask) return;
      if(type === 'PARCIAL') {
          StorageService.setMaintenancePartial(closingTask.id);
      } else if(type === 'TOTAL') {
          await StorageService.completeMaintenance(closingTask.id, 'TOTAL (MANUAL)', true);
          navigate('/report', { state: { ...closingTask.header, status: 'FINALIZADO', startTime: closingTask.startTime } });
      } else {
          navigate(`/checklist?maintenanceId=${closingTask.id}`);
      }
      setClosingTask(null);
  };

  const handleNotificationClick = (notification: NotificationItem) => {
      const oms = StorageService.getOMs();
      const om = oms.find(o => o.id === notification.id);
      if (om) {
          setViewingOM(om);
      }
  };

  const handleStartOMFromNotification = (om: OMRecord) => {
      setShowNotifications(false);
      setViewingOM(null);
      const route = om.type === 'CORRETIVA' ? '/art-emergencial' : '/art-atividade';
      navigate(route, { state: { omId: om.id, om: om.omNumber, tag: om.tag, description: om.description, type: om.type } });
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-20 relative px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-xl shadow-md border border-gray-200">
        <div className="flex items-center gap-3">
            <div className="bg-vale-green p-2.5 rounded-lg shadow-md">
                <ShieldCheck size={24} className="text-white" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-vale-darkgray uppercase tracking-tighter leading-none">Central de Controle</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-gray-200">
                        {isOnline ? <Wifi size={10} className="text-green-500" /> : <WifiOff size={10} className="text-red-500" />}
                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                    <span className="text-[9px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-gray-200">
                        <Database size={10} className="text-blue-500" />
                        SYNC
                    </span>
                </div>
            </div>
        </div>

        <div className="flex gap-3 items-center">
            <button 
                onClick={toggleMute}
                className={`p-3 rounded-xl shadow-sm transition-all ${isMuted ? 'bg-gray-100 text-gray-400' : 'bg-white text-vale-green border border-vale-green hover:bg-vale-green hover:text-white'}`}
                title={isMuted ? "Ativar Sons" : "Silenciar Alertas"}
            >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            <div className="relative">
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 relative group active:scale-95"
                >
                    <Bell size={20} className="text-vale-darkgray group-hover:text-vale-green transition-colors" />
                    {notifications.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg ring-2 ring-white animate-bounce">
                            {notifications.length}
                        </span>
                    )}
                </button>

                {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in-up">
                        <div className="bg-vale-dark p-3 flex justify-between items-center text-white">
                            <span className="font-black text-[10px] uppercase tracking-widest">Notificações</span>
                            <button onClick={() => setShowNotifications(false)} className="hover:text-red-400"><X size={16}/></button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center text-gray-300 text-[10px] font-black uppercase tracking-widest">Sem alertas</div>
                            ) : (
                                notifications.map(n => (
                                    <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors group ${n.type === 'URGENT' ? 'bg-red-50/20' : ''}`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded border ${n.type === 'URGENT' ? 'bg-red-600 text-white border-red-700' : 'bg-blue-600 text-white border-blue-700'}`}>{n.type}</span>
                                            <span className="text-[8px] text-gray-400 font-mono font-bold">{n.date}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-[11px] font-black text-gray-800 group-hover:text-vale-green transition-colors">{n.title}</p>
                                                <p className="text-[9px] text-gray-500 mt-0.5 font-bold line-clamp-1">{n.message}</p>
                                            </div>
                                            <Eye size={14} className="text-gray-300 group-hover:text-vale-green" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center gap-2 ml-1">
                <div className="w-1.5 h-5 bg-vale-green rounded-full"></div>
                <h3 className="font-black text-lg text-vale-darkgray uppercase tracking-tighter">Execução em Tempo Real</h3>
            </div>

            {activeTasks.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center shadow-lg border-2 border-dashed border-gray-200 group">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500">
                        <Wrench className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-black text-gray-300 uppercase tracking-widest">Nenhuma Atividade</h3>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">Inicie uma OM para visualizar aqui.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {activeTasks.map(task => {
                        const isRed = task.origin === 'CORRETIVA' || task.artType === 'ART_EMERGENCIAL';
                        const isPaused = task.status === 'PAUSADA';
                        const isWaiting = task.status === 'AGUARDANDO';
                        const isMine = task.openedBy === currentUser;

                        let cardBorder = isRed ? 'border-red-600' : 'border-vale-green';
                        let iconBg = isRed ? 'bg-red-50' : 'bg-green-50';
                        let badgeBg = isRed ? 'bg-red-600' : 'bg-vale-green';
                        
                        if (isPaused) { cardBorder = 'border-yellow-500'; badgeBg = 'bg-yellow-500'; }
                        else if (isWaiting) { cardBorder = 'border-blue-500'; badgeBg = 'bg-blue-500'; }

                        return (
                            <div key={task.id} className={`bg-white rounded-xl p-5 shadow-lg border-l-[6px] ${cardBorder} relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-vale-green/10`}>
                                <div className={`absolute top-0 right-0 ${badgeBg} text-white text-[9px] font-black px-4 py-1 rounded-bl-xl shadow-sm uppercase tracking-widest`}>
                                    {isPaused ? 'Em Pausa' : isWaiting ? 'Aguardando' : isRed ? 'Corretiva' : 'Preventiva'}
                                </div>
                                
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${iconBg} shadow-inner border border-white/50`}>
                                            {isRed ? <AlertOctagon size={24} className="text-red-600 animate-pulse"/> : <Wrench size={24} className="text-vale-green"/>}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-2xl text-vale-darkgray tracking-tight leading-none">{task.header.om}</h4>
                                            <p className={`text-sm font-black uppercase mt-0.5 ${isRed ? 'text-red-600' : 'text-vale-green'}`}>{task.header.tag}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-900 px-4 py-2 rounded-xl border-b-2 border-vale-green shadow-md min-w-[140px] text-center">
                                        <p className="text-[8px] font-black text-vale-green uppercase mb-0.5 tracking-widest flex items-center justify-center gap-1">
                                            <Timer size={10}/> Tempo
                                        </p>
                                        <p className="text-2xl font-mono font-black text-white leading-none">
                                            {getElapsedTime(task)}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg mb-4">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Atividade</p>
                                    <p className="text-xs font-bold text-gray-700 uppercase leading-snug line-clamp-2">
                                        {task.header.description}
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-white shadow-sm overflow-hidden">
                                            <User className="text-gray-400" size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Responsável</p>
                                            <p className="text-[10px] font-black text-gray-800 uppercase">{task.openedBy || 'SISTEMA'}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 w-full sm:w-auto">
                                        {task.status === 'ANDAMENTO' ? (
                                            isMine ? (
                                                <>
                                                    <button onClick={() => StorageService.pauseMaintenance(task.id)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-gray-100 text-gray-600 px-4 py-2.5 rounded-lg font-black text-[9px] hover:bg-gray-200 transition-all active:scale-95 uppercase tracking-wide"><PauseCircle size={14} /> Pausar</button>
                                                    <button onClick={() => handleAction(task)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-red-600 text-white px-5 py-2.5 rounded-lg font-black text-[9px] hover:bg-red-700 transition-all shadow-md active:scale-95 uppercase tracking-wide border-b-2 border-red-800"><StopCircle size={14} /> Finalizar</button>
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-wide"><Lock size={12} /> Bloqueado</div>
                                            )
                                        ) : (
                                            <button onClick={() => handleAction(task)} className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-vale-green text-white px-6 py-2.5 rounded-lg font-black text-[9px] hover:bg-emerald-600 transition-all shadow-md active:scale-95 uppercase tracking-wide border-b-2 border-[#00605d]"><PlayCircle size={14} /> Retomar</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-100 animate-fadeIn">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-50 p-2 rounded-lg">
                            <BarChart3 size={20} className="text-orange-600" />
                        </div>
                        <div>
                            <h3 className="font-black text-lg text-vale-darkgray uppercase tracking-tighter leading-none">Indisponibilidade</h3>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Top Vilões (30 Dias)</p>
                        </div>
                    </div>
                </div>
                
                <div className="space-y-4">
                    {downtimeStats.length === 0 ? (
                        <div className="py-6 text-center text-gray-300 font-black uppercase text-[10px]">Sem dados.</div>
                    ) : (
                        downtimeStats.map((stat, idx) => (
                            <div key={stat.tag} className="group animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="font-black text-[11px] text-gray-800 uppercase flex items-center gap-2">
                                        <span className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-black ${idx === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</span>
                                        {stat.tag}
                                    </span>
                                    <span className="font-black text-[9px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded shadow-sm">{stat.formatted}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200">
                                    <div 
                                        className="bg-gradient-to-r from-orange-600 to-vale-yellow h-full rounded-full transition-all duration-1000 group-hover:brightness-110 shadow-sm" 
                                        style={{ width: `${stat.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[8px] font-black text-gray-400 uppercase">
                        <Calendar size={10}/> 30 Dias
                    </div>
                    <button onClick={() => navigate('/availability')} className="text-[9px] font-black text-vale-green hover:underline uppercase tracking-widest">Ver Completo</button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col h-[400px]">
                <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-black text-lg text-vale-darkgray flex items-center gap-2 uppercase tracking-tighter">
                        <Clock className="text-gray-400" size={20} />
                        Últimos Registros
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                    {history.length === 0 && <div className="flex flex-col items-center justify-center h-full text-gray-300 font-black uppercase text-[10px] tracking-widest">Sem registros recentes</div>}
                    {history.slice(0, 10).map(log => (
                        <div key={log.id} className="bg-gray-50/50 p-3 rounded-lg border-l-2 border-gray-200 hover:border-vale-green transition-all group cursor-default">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-black text-gray-800 text-xs tracking-tight">{log.om}</span>
                                <span className="text-[8px] font-black text-gray-400 uppercase">{new Date(log.endTime).toLocaleDateString()}</span>
                            </div>
                            <div className="text-[10px] font-black text-vale-green uppercase mb-2">{log.tag}</div>
                            <div className="flex justify-between items-center gap-2">
                                <div className="flex items-center gap-1 text-[8px] font-black text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-100"><Timer size={10}/> {log.duration}</div>
                                <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded transition-colors ${log.status === 'TOTAL (MANUAL)' ? 'bg-vale-green text-white' : 'bg-gray-900 text-white'}`}>
                                    {log.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Modal de Encerramento (Reduzido) */}
      {closingTask && (
          <div className="fixed inset-0 z-50 bg-vale-dark/90 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn">
              <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative border-b-[8px] border-vale-green">
                  <button onClick={() => setClosingTask(null)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"><X size={20}/></button>
                  
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner border border-red-100">
                          <StopCircle size={32} className="text-red-600" />
                      </div>
                      <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter leading-none">Encerrar Atividade</h3>
                      <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-widest">
                         OM: {closingTask.header.om}
                      </p>
                  </div>

                  <div className="space-y-3">
                      <button onClick={() => completeAction('CHECKLIST')} className="w-full bg-vale-green text-white p-3 rounded-xl font-black text-xs hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 uppercase tracking-wide border-b-2 border-[#00605d]"><CheckSquare size={16} /> Checklist & Finalizar</button>
                      <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => completeAction('PARCIAL')} className="bg-blue-50 text-blue-700 border border-blue-100 p-3 rounded-xl font-black text-[10px] hover:bg-blue-100 transition-colors flex flex-col items-center gap-1 uppercase tracking-wider"><Activity size={18} /> Parada Parcial</button>
                          <button onClick={() => completeAction('TOTAL')} className="bg-gray-50 text-gray-700 border border-gray-200 p-3 rounded-xl font-black text-[10px] hover:bg-gray-100 transition-colors flex flex-col items-center gap-1 uppercase tracking-wider"><StopCircle size={18} /> Encerramento</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {viewingOM && (
        <div className="fixed inset-0 z-[100] bg-[#000000]/95 flex items-center justify-center p-0 backdrop-blur-xl animate-fadeIn">
            <div className="w-full h-full flex flex-col relative">
                <div className="bg-gray-900 text-white p-3 flex justify-between items-center shadow-2xl border-b border-gray-800 shrink-0 z-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-vale-green p-1.5 rounded"><FileText size={18}/></div>
                        <div>
                            <h3 className="font-black text-sm tracking-tight uppercase text-gray-100">Visualização de Documento</h3>
                            <p className="text-[9px] font-bold text-vale-green tracking-widest uppercase">OM: {viewingOM.omNumber}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {pdfBlobUrl && (
                            <a 
                                href={pdfBlobUrl} 
                                download={`${viewingOM.omNumber}_${viewingOM.tag}.pdf`}
                                className="hidden md:flex px-3 py-1.5 bg-gray-700 text-white font-bold rounded-lg text-[9px] uppercase hover:bg-gray-600 transition-all items-center gap-1"
                            >
                                <Download size={12}/> Baixar
                            </a>
                        )}
                        <button onClick={() => handleStartOMFromNotification(viewingOM)} className="hidden md:flex px-4 py-2 bg-vale-green text-white font-black rounded-lg text-[9px] uppercase shadow-lg hover:bg-emerald-600 transition-all items-center gap-2">
                            <PlayCircle size={14}/> Iniciar
                        </button>
                        <button onClick={() => setViewingOM(null)} className="p-2 bg-gray-800 hover:bg-red-600 text-white rounded-full transition-all shadow-inner"><X size={18}/></button>
                    </div>
                </div>

                <div className="flex-1 bg-[#1a1a1a] relative overflow-hidden flex items-center justify-center p-0">
                    {pdfBlobUrl ? (
                        <div className="w-full h-full bg-white relative">
                             <iframe
                                src={pdfBlobUrl}
                                className="w-full h-full border-none"
                                title="Visualizador Profissional"
                            />
                        </div>
                    ) : (
                        <div className="text-center p-10 max-w-lg">
                            <Info size={48} className="text-gray-600 mx-auto mb-4" />
                            <h4 className="text-xl font-black text-gray-400 uppercase tracking-widest">Documento Digital Não Disponível</h4>
                            <p className="text-gray-500 font-bold mt-2 text-xs">Apenas o resumo da atividade foi registrado.</p>
                            <div className="mt-6 bg-gray-800 p-4 rounded-xl border border-gray-700">
                                <p className="text-xs text-gray-300 font-mono uppercase text-left">{viewingOM.description}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
