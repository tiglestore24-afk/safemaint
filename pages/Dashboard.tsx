
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StorageService, NotificationItem } from '../services/storage';
import { ActiveMaintenance, MaintenanceLog } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  CheckSquare, Clock, AlertOctagon, PauseCircle, 
  StopCircle, Bell, X, Activity, 
  ShieldCheck, Wifi, WifiOff, Database, Settings, Wrench, PlayCircle, Timer, User, Lock, ArrowRightCircle, Users,
  Volume2, VolumeX, BarChart3, TrendingUp, AlertTriangle
} from 'lucide-react';
import { checkConnection } from '../services/supabase';
import { Logo } from '../components/Logo';
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
  const [currentUser, setCurrentUser] = useState('');
  
  // Analytics State
  const [downtimeStats, setDowntimeStats] = useState<{tag: string, totalMinutes: number, formatted: string, percentage: number}[]>([]);
  
  // Audio & Settings State
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
    
    // Initialize Alert Sound (Generic Beep)
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

  // Toggle Sound Preference
  const toggleMute = () => {
      const newState = !isMuted;
      setIsMuted(newState);
      localStorage.setItem('safemaint_sound_muted', String(newState));
  };

  // ALERTS: Sound & Vibration on NEW Urgent Notifications
  useEffect(() => {
      const urgentCount = notifications.filter(n => n.type === 'URGENT').length;
      
      if (urgentCount > prevNotificationCount.current) {
          // Play Sound ONLY if not muted
          if (audioRef.current && !isMuted) {
              audioRef.current.play().catch(e => console.log('Audio Blocked:', e));
          }
          // Vibrate Device (Pattern: 200ms vibe, 100ms pause, 200ms vibe) - Always Vibrate if possible
          if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
          }
      }
      prevNotificationCount.current = urgentCount;
  }, [notifications, isMuted]);

  // --- ANALYTICS LOGIC ---
  const calculateDowntimeStats = (logs: MaintenanceLog[]) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentLogs = logs.filter(log => new Date(log.endTime) >= thirtyDaysAgo);
      const tagMap: Record<string, number> = {};

      recentLogs.forEach(log => {
          if (!log.duration || log.duration.includes('PARCIAL')) return;
          // Parse "Xh Ym"
          const parts = log.duration.match(/(\d+)h\s*(\d+)m/);
          let minutes = 0;
          if (parts) {
              minutes = (parseInt(parts[1]) * 60) + parseInt(parts[2]);
          } else {
              // Fallback simple heuristics or 0
              minutes = 0; 
          }
          
          if (minutes > 0) {
              tagMap[log.tag] = (tagMap[log.tag] || 0) + minutes;
          }
      });

      // Sort and Take Top 5
      const sortedTags = Object.entries(tagMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5);

      const maxMinutes = sortedTags.length > 0 ? sortedTags[0][1] : 1; 

      const stats = sortedTags.map(([tag, minutes]) => {
          const h = Math.floor(minutes / 60);
          const m = minutes % 60;
          return {
              tag,
              totalMinutes: minutes,
              formatted: `${h}h ${m}m`,
              percentage: (minutes / maxMinutes) * 100
          };
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
          // Parcial: Mantém na tela (status AGUARDANDO - card AZUL), libera ownership
          StorageService.setMaintenancePartial(closingTask.id);
      } else if(type === 'TOTAL') {
          // Total: Encerra tarefa, joga pro histórico como TOTAL, FECHA a OM (Concluída)
          await StorageService.completeMaintenance(closingTask.id, 'TOTAL (MANUAL)', true);
          navigate('/report', { state: { ...closingTask.header, status: 'FINALIZADO', startTime: closingTask.startTime } });
      } else {
          // Checklist: Redireciona para Checklist, lá ele chamará o completeMaintenance
          navigate(`/checklist?maintenanceId=${closingTask.id}`);
      }
      setClosingTask(null);
  };

  const handleNotificationClick = (notification: NotificationItem) => {
      const oms = StorageService.getOMs();
      const om = oms.find(o => o.id === notification.id);
      
      if (om) {
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
          setShowNotifications(false);
          
          // DIRECCIONAMENTO INTELIGENTE
          if (om.type === 'CORRETIVA') {
              // OM Corretiva -> ART Emergencial
              navigate('/art-emergencial', { 
                  state: { 
                      omId: om.id, 
                      om: om.omNumber,
                      tag: om.tag,
                      description: om.description,
                      type: om.type
                  } 
              });
          } else {
              // OM Preventiva -> ART Atividade
              navigate('/art-atividade', { 
                  state: { 
                      omId: om.id, 
                      om: om.omNumber, 
                      tag: om.tag, 
                      description: om.description 
                  } 
              });
          }
      } else {
          // Fallback if OM not found (deleted?)
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-20 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
            <div className="bg-vale-green p-2 rounded-lg">
                <ShieldCheck size={32} className="text-white" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-vale-darkgray uppercase tracking-tighter">Central de Controle</h2>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1">
                        {isOnline ? <Wifi size={10} className="text-green-500" /> : <WifiOff size={10} className="text-red-500" />}
                        {isOnline ? 'CONECTADO' : 'OFFLINE MODE'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1">
                        <Database size={10} className="text-blue-500" />
                        SYNC ATIVO
                    </span>
                </div>
            </div>
        </div>

        <div className="flex gap-4 items-center">
            {/* ALERT SOUND TOGGLE */}
            <button 
                onClick={toggleMute}
                className={`p-3 rounded-full shadow-md transition-all ${isMuted ? 'bg-gray-200 text-gray-500' : 'bg-white text-vale-green border-2 border-vale-green'}`}
                title={isMuted ? "Ativar Sons" : "Silenciar Alertas"}
            >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            {/* NOTIFICATION BELL */}
            <div className="relative">
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-3 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors border-2 border-gray-100 relative"
                >
                    <Bell size={24} className="text-vale-darkgray" />
                    {notifications.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                            {notifications.length}
                        </span>
                    )}
                </button>

                {/* DROPDOWN NOTIFICATIONS */}
                {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in-up">
                        <div className="bg-vale-dark p-3 flex justify-between items-center text-white">
                            <span className="font-bold text-xs uppercase">Notificações Pendentes</span>
                            <button onClick={() => setShowNotifications(false)}><X size={16}/></button>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center text-gray-400 text-xs font-bold">NENHUMA NOTIFICAÇÃO</div>
                            ) : (
                                notifications.map(n => (
                                    <div 
                                        key={n.id} 
                                        onClick={() => handleNotificationClick(n)}
                                        className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${n.type === 'URGENT' ? 'bg-red-50/50' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${n.type === 'URGENT' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                                                {n.type}
                                            </span>
                                            <span className="text-[9px] text-gray-400 font-mono">{n.date}</span>
                                        </div>
                                        <p className="text-xs font-bold text-gray-800 line-clamp-2">{n.title}</p>
                                        <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{n.message}</p>
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
        
        {/* LEFT COLUMN: ACTIVE TASKS */}
        <div className="lg:col-span-8 space-y-6">
            <h3 className="font-black text-xl text-vale-darkgray flex items-center gap-2">
                <Activity className="text-vale-green" />
                EXECUÇÃO EM TEMPO REAL
            </h3>

            {activeTasks.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-lg border-2 border-dashed border-gray-200">
                    <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-gray-400 uppercase">Nenhuma Manutenção Ativa</h3>
                    <p className="text-sm text-gray-400 mt-2">Inicie uma atividade via ART ou Programação.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {activeTasks.map(task => {
                        const isRed = task.origin === 'CORRETIVA' || task.artType === 'ART_EMERGENCIAL';
                        const isPaused = task.status === 'PAUSADA';
                        const isWaiting = task.status === 'AGUARDANDO';
                        const isMine = task.openedBy === currentUser;

                        let cardBg = 'bg-white';
                        let cardBorder = isRed ? 'border-red-500' : 'border-vale-green';
                        let iconColor = isRed ? 'text-red-500' : 'text-vale-green';
                        
                        if (isPaused) {
                            cardBg = 'bg-yellow-50';
                            cardBorder = 'border-yellow-500';
                            iconColor = 'text-yellow-600';
                        } else if (isWaiting) {
                            cardBg = 'bg-blue-50'; // STATUS AZUL PARA AGUARDANDO
                            cardBorder = 'border-blue-500';
                            iconColor = 'text-blue-600';
                        }

                        return (
                            <div key={task.id} className={`rounded-2xl p-6 shadow-lg border-l-8 ${cardBorder} ${cardBg} relative overflow-hidden transition-all hover:scale-[1.01]`}>
                                {isPaused && <div className="absolute top-0 right-0 bg-yellow-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl">PAUSADA</div>}
                                {isWaiting && <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl">AGUARDANDO TÉCNICO</div>}
                                
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-full bg-white shadow-sm border ${isRed ? 'border-red-100' : 'border-green-100'}`}>
                                            {isRed ? <AlertOctagon size={24} className="text-red-600 animate-pulse"/> : <Wrench size={24} className="text-vale-green"/>}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-2xl text-gray-800 leading-none">{task.header.om}</h4>
                                            <p className={`text-sm font-bold uppercase ${isRed ? 'text-red-600' : 'text-vale-green'}`}>{task.header.tag}</p>
                                        </div>
                                    </div>
                                    <div className="text-right bg-black/5 px-4 py-2 rounded-lg">
                                        <p className="text-[10px] font-black text-gray-500 uppercase mb-1 flex items-center justify-end gap-1">
                                            <Timer size={12}/> TEMPO DECORRIDO
                                        </p>
                                        <p className="text-3xl font-mono font-black text-gray-800 leading-none">
                                            {getElapsedTime(task)}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-black/5 p-3 rounded-lg mb-4">
                                    <p className="text-xs font-bold text-gray-600 line-clamp-2 uppercase">
                                        {task.header.description}
                                    </p>
                                </div>

                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-black/5">
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                        <User size={14} />
                                        <span className="uppercase">{task.openedBy || 'AGUARDANDO'}</span>
                                        {!isMine && task.status === 'ANDAMENTO' && (
                                            <span className="text-[9px] bg-gray-200 px-2 py-0.5 rounded text-gray-600 ml-1">EM USO</span>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        {/* AÇÕES DISPONÍVEIS */}
                                        {task.status === 'ANDAMENTO' ? (
                                            <>
                                                {isMine ? (
                                                    // Se for dono, pode pausar ou parar
                                                    <>
                                                        <button 
                                                            onClick={() => StorageService.pauseMaintenance(task.id)}
                                                            className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg font-black text-xs hover:bg-yellow-200 transition-colors"
                                                        >
                                                            <PauseCircle size={16} /> PAUSAR
                                                        </button>
                                                        <button 
                                                            onClick={() => handleAction(task)}
                                                            className="flex items-center gap-1 bg-red-600 text-white px-6 py-2 rounded-lg font-black text-xs hover:bg-red-700 transition-colors shadow-lg animate-pulse"
                                                        >
                                                            <StopCircle size={16} /> PARAR / FINALIZAR
                                                        </button>
                                                    </>
                                                ) : (
                                                    // Se não for dono, não pode mexer (apenas visualizar)
                                                    <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-3 py-1 rounded flex items-center gap-1">
                                                        <Lock size={12}/> BLOQUEADO POR {task.openedBy}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            // Se pausada ou aguardando, qualquer um pode assumir
                                            <button 
                                                onClick={() => handleAction(task)}
                                                className="flex items-center gap-1 bg-green-600 text-white px-6 py-2 rounded-lg font-black text-xs hover:bg-green-700 transition-colors shadow-lg"
                                            >
                                                <PlayCircle size={16} /> RETOMAR ATIVIDADE
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

        {/* RIGHT COLUMN: ANALYTICS & HISTORY */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* STATS PANEL - TOP 5 DOWNTIME */}
            {downtimeStats.length > 0 && (
                <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 mb-6 animate-fadeIn">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-red-100 p-2 rounded-xl text-red-600">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-lg text-gray-800 uppercase tracking-tight">Top 5 - Indisponibilidade (30 Dias)</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase">Equipamentos com maior tempo de parada</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {downtimeStats.map((stat, idx) => (
                            <div key={stat.tag} className="relative">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="font-black text-xs text-gray-700 uppercase flex items-center gap-2">
                                        <span className="bg-gray-800 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px]">{idx + 1}</span>
                                        {stat.tag}
                                    </span>
                                    <span className="font-bold text-xs text-red-600">{stat.formatted}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div 
                                        className="bg-gradient-to-r from-red-500 to-orange-500 h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${stat.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* HISTORY LIST */}
            <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 h-[500px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-lg text-vale-darkgray flex items-center gap-2">
                        <Clock className="text-gray-400" />
                        HISTÓRICO RECENTE
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    {history.length === 0 && <p className="text-gray-400 text-center text-xs py-10 font-bold">SEM REGISTROS AINDA.</p>}
                    {history.map(log => (
                        <div key={log.id} className="border-l-4 border-gray-300 pl-4 py-1 hover:border-vale-green transition-colors group">
                            <div className="flex justify-between items-start">
                                <span className="font-black text-gray-800 text-sm">{log.om}</span>
                                <span className="text-[10px] font-mono text-gray-400">{new Date(log.endTime).toLocaleDateString()}</span>
                            </div>
                            <div className="text-xs font-bold text-vale-green mb-1">{log.tag}</div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-gray-500">
                                <span>{log.duration}</span>
                                <span className="uppercase bg-gray-100 px-2 py-0.5 rounded group-hover:bg-green-100 group-hover:text-green-800 transition-colors">{log.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* STOP TASK MODAL */}
      {closingTask && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl relative">
                  <button onClick={() => setClosingTask(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-800"><X size={24}/></button>
                  
                  <div className="text-center mb-8">
                      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <StopCircle size={40} className="text-red-600" />
                      </div>
                      <h3 className="text-2xl font-black text-gray-800 uppercase leading-none">Finalizar Atividade</h3>
                      <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-widest">
                          {closingTask.header.om} - {closingTask.header.tag}
                      </p>
                  </div>

                  <div className="space-y-3">
                      <button 
                          onClick={() => completeAction('CHECKLIST')}
                          className="w-full bg-vale-green text-white p-4 rounded-xl font-black text-sm hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95"
                      >
                          <CheckSquare size={20} />
                          CHECKLIST & ENCERRAR (PADRÃO)
                      </button>
                      
                      <div className="grid grid-cols-2 gap-3">
                          <button 
                              onClick={() => completeAction('PARCIAL')}
                              className="bg-blue-50 text-blue-700 border-2 border-blue-100 p-4 rounded-xl font-black text-xs hover:bg-blue-100 transition-colors flex flex-col items-center gap-1"
                          >
                              <Users size={20} />
                              PARADA PARCIAL / TROCA
                          </button>
                          <button 
                              onClick={() => completeAction('TOTAL')}
                              className="bg-gray-50 text-gray-700 border-2 border-gray-200 p-4 rounded-xl font-black text-xs hover:bg-gray-100 transition-colors flex flex-col items-center gap-1"
                          >
                              <StopCircle size={20} />
                              ENCERRAR MANUALMENTE
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
