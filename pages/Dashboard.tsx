
import React, { useEffect, useState, useCallback } from 'react';
import { StorageService, NotificationItem } from '../services/storage.ts';
import { ActiveMaintenance, MaintenanceLog } from '../types.ts';
import { useNavigate } from 'react-router-dom';
import { 
  CheckSquare, Clock, AlertOctagon, PauseCircle, 
  StopCircle, Bell, X, Activity, 
  ShieldCheck, Wifi, WifiOff, Database, Settings, Wrench, PlayCircle, Timer
} from 'lucide-react';
import { checkConnection } from '../services/supabase.ts';
import { Logo } from '../components/Logo.tsx';
import { BackButton } from '../components/BackButton.tsx';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTasks, setActiveTasks] = useState<ActiveMaintenance[]>([]);
  const [history, setHistory] = useState<MaintenanceLog[]>([]);
  const [now, setNow] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [closingTask, setClosingTask] = useState<ActiveMaintenance | null>(null);

  const refreshData = useCallback(() => {
    setActiveTasks(StorageService.getActiveMaintenances());
    setHistory(StorageService.getHistory());
    setNotifications(StorageService.getNotifications());
  }, []);

  useEffect(() => {
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
      if (task.status === 'PAUSADA') {
          StorageService.resumeMaintenance(task.id);
      } else {
          setClosingTask(task);
      }
  };

  const completeAction = (type: 'PARCIAL' | 'TOTAL' | 'CHECKLIST') => {
      if(!closingTask) return;
      if(type === 'PARCIAL') {
          StorageService.pauseMaintenance(closingTask.id);
          navigate('/report', { state: { ...closingTask.header, status: 'PARCIAL', startTime: closingTask.startTime } });
      } else if(type === 'TOTAL') {
          StorageService.completeMaintenance(closingTask.id);
          navigate('/report', { state: { ...closingTask.header, status: 'FINALIZADO', startTime: closingTask.startTime } });
      } else {
          navigate(`/checklist?maintenanceId=${closingTask.id}`);
      }
      setClosingTask(null);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-fadeIn pb-20">
      
      {/* PROFESSIONAL MISSION CONTROL HEADER */}
      <div className="bg-vale-dark border-b-4 border-vale-green rounded-[2rem] text-white shadow-2xl relative">
          <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
             <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-vale-green/10 to-transparent"></div>
             <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-vale-green/5 rounded-full blur-3xl"></div>
          </div>
          
          <div className="p-5 flex flex-col xl:flex-row justify-between items-center gap-6 relative z-10">
              <div className="flex flex-col md:flex-row items-center gap-6">
                  <BackButton className="mr-2 border-white/20 text-vale-green hover:bg-white/10" />
                  <Logo size="md" light />
                  <div className="flex gap-3 md:border-l border-white/10 md:pl-6">
                      <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest transition-all ${isOnline ? 'bg-vale-green/20 text-vale-green border-vale-green/30' : 'bg-vale-cherry/20 text-vale-cherry border-vale-cherry/30 animate-pulse'}`}>
                          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                          {isOnline ? 'Online' : 'Offline'}
                      </div>
                      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black bg-white/5 text-gray-400 border border-white/5 uppercase tracking-widest">
                          <Database size={14} /> Sync
                      </div>
                  </div>
              </div>

              <div className="flex items-center gap-8">
                  <div className="text-right hidden xl:block border-r border-white/10 pr-8">
                      <span className="text-[9px] font-black text-vale-green uppercase tracking-[0.3em] block mb-1 opacity-70">Hora Local</span>
                      <div className="text-4xl font-mono font-black text-white leading-none shadow-black drop-shadow-lg">{now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}</div>
                  </div>

                  {/* Notification System */}
                  <div className="relative">
                      <button onClick={() => setShowNotifications(!showNotifications)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-vale-green transition-all border border-white/10 shadow-lg relative group/btn">
                          <Bell size={24} className="group-hover/btn:scale-110 transition-transform" />
                          {notifications.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-vale-cherry w-5 h-5 rounded-full border-2 border-vale-dark flex items-center justify-center animate-bounce">
                              <span className="text-[9px] font-black text-white">{notifications.length}</span>
                            </span>
                          )}
                      </button>
                      
                      {showNotifications && (
                          <div className="absolute top-full mt-4 right-0 w-80 bg-vale-gray rounded-2xl shadow-2xl border border-white/10 overflow-hidden z-[100] animate-fade-in-up ring-4 ring-black/20">
                              <div className="bg-vale-dark p-4 text-white font-black text-xs uppercase flex justify-between border-b border-white/5">
                                <span>Painel de Alertas</span> 
                                <button onClick={() => setShowNotifications(false)} className="hover:text-vale-cherry"><X size={16}/></button>
                              </div>
                              <div className="max-h-80 overflow-y-auto p-3 custom-scrollbar bg-gray-900">
                                  {notifications.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 font-black text-[10px] uppercase">Nenhum alerta crítico</div>
                                  ) : notifications.map(n => (
                                      <div key={n.id} className="p-4 bg-white/5 border-l-4 border-vale-green mb-2 rounded-xl hover:bg-white/10 transition-all cursor-pointer">
                                          <h4 className="font-black text-[10px] text-white uppercase tracking-tight">{n.title}</h4>
                                          <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">{n.message}</p>
                                          <span className="text-[8px] text-vale-green font-black mt-1 block">{n.date}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* OPERATIONS HUD - MAIN FEED */}
          <div className="xl:col-span-8 space-y-6">
              <div className="flex items-center justify-between border-b-4 border-gray-200 pb-3">
                  <h2 className="text-2xl font-black text-vale-dark flex items-center gap-3 uppercase tracking-tighter">
                      <div className="p-3 bg-vale-green rounded-xl text-white shadow-lg"><Activity size={24} /></div>
                      Atividades em Andamento
                      <div className="bg-vale-dark text-white text-[9px] px-3 py-1 rounded-full font-black ml-2 shadow-lg tracking-widest">{activeTasks.length} Ativas</div>
                  </h2>
              </div>

              {activeTasks.length === 0 ? (
                  <div className="bg-vale-dark rounded-[3rem] p-16 border-4 border-vale-green/30 relative overflow-hidden group min-h-[400px] flex items-center justify-center shadow-2xl">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-vale-green/10 via-transparent to-transparent opacity-50 animate-pulse"></div>
                      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#007e7a 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.1 }}></div>

                      <div className="relative z-10 flex flex-col items-center">
                          <div className="relative w-48 h-48 mb-8">
                              <div className="absolute inset-0 border-4 border-dashed border-vale-green/30 rounded-full animate-[spin_20s_linear_infinite]"></div>
                              <div className="absolute inset-4 text-vale-green animate-[spin_10s_linear_infinite]">
                                  <Settings size={160} strokeWidth={1} />
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-vale-dark p-4 rounded-full border-2 border-vale-green shadow-[0_0_30px_rgba(0,126,122,0.4)] animate-bounce">
                                      <Wrench size={32} className="text-white" />
                                  </div>
                              </div>
                          </div>

                          <h3 className="text-3xl font-black text-white uppercase tracking-[0.2em] mb-2 text-center drop-shadow-lg">
                              Sistema em Espera
                          </h3>
                          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-6">Aguardando início de ordem de manutenção</p>
                          
                          <div className="flex items-center gap-2 bg-vale-green/10 px-6 py-3 rounded-full border border-vale-green/20 backdrop-blur-sm">
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-vale-green opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-vale-green"></span>
                              </span>
                              <span className="text-[10px] font-black text-vale-green uppercase tracking-widest">Monitoramento Ativo</span>
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {activeTasks.map(task => {
                          const isUrgent = task.origin === 'CORRETIVA';
                          const isPaused = task.status === 'PAUSADA';
                          const isRunning = task.status === 'ANDAMENTO';
                          
                          return (
                              <div key={task.id} className={`bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all border border-gray-100 overflow-hidden flex flex-col ${isRunning ? 'ring-2 ring-vale-green/50' : ''}`}>
                                  
                                  {/* Card Header */}
                                  <div className={`p-4 flex justify-between items-center text-white ${isUrgent ? 'bg-vale-cherry' : 'bg-vale-green'}`}>
                                      <div className="flex items-center gap-2">
                                          {isUrgent ? <AlertOctagon size={20} /> : <Wrench size={20} />}
                                          <span className="font-black text-xs uppercase tracking-widest">{task.origin}</span>
                                      </div>
                                      <div className="px-3 py-1 bg-black/20 rounded-lg text-[10px] font-mono font-bold">
                                          OM: {task.header.om}
                                      </div>
                                  </div>

                                  {/* Card Body */}
                                  <div className="p-6 flex-1 flex flex-col relative bg-gray-50/50">
                                      {isRunning && (
                                          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200 shadow-sm animate-pulse">
                                              <div className="w-2 h-2 rounded-full bg-green-600"></div>
                                              <span className="text-[9px] font-black uppercase tracking-wider">Executando</span>
                                          </div>
                                      )}
                                      
                                      <div className="mb-4 pr-16">
                                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">TAG / EQUIPAMENTO</span>
                                          <h3 className="text-xl font-black text-vale-dark leading-tight">{task.header.tag}</h3>
                                      </div>

                                      <div className="bg-white border border-gray-200 p-4 rounded-xl mb-4 shadow-sm flex-1">
                                          <p className="text-xs text-gray-600 font-bold leading-relaxed line-clamp-3">
                                              {task.header.description}
                                          </p>
                                      </div>

                                      {/* Timer Big */}
                                      <div className="flex items-center justify-center gap-3 py-2">
                                          <Timer size={20} className={isUrgent ? 'text-vale-cherry' : 'text-vale-green'} />
                                          <span className="text-4xl font-mono font-black text-vale-dark tracking-tighter">
                                              {getElapsedTime(task)}
                                          </span>
                                      </div>
                                  </div>

                                  {/* Card Footer Actions */}
                                  <div className="p-4 bg-gray-100 border-t border-gray-200 grid grid-cols-2 gap-3">
                                       <button 
                                          onClick={() => handleAction(task)}
                                          className={`py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 border-b-4 ${isPaused ? 'bg-vale-green text-white border-green-800 hover:bg-green-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                      >
                                          {isPaused ? <><PlayCircle size={16}/> RETOMAR</> : <><PauseCircle size={16}/> PAUSAR/ENCERRAR</>}
                                      </button>
                                      <button 
                                          onClick={() => { setClosingTask(task); completeAction('CHECKLIST'); }}
                                          className="bg-vale-blue text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 border-b-4 border-blue-800 hover:bg-blue-700"
                                      >
                                          <CheckSquare size={16} /> CHECKLIST
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              )}
          </div>

          {/* SIDEBAR - MISSION LOGS */}
          <div className="xl:col-span-4 space-y-6">
              <h2 className="text-2xl font-black text-vale-dark flex items-center gap-3 uppercase tracking-tighter border-b-4 border-gray-200 pb-3">
                  <div className="p-3 bg-vale-blue rounded-xl text-white shadow-xl"><CheckSquare size={24} /></div>
                  Histórico Recente
              </h2>
              <div className="bg-vale-dark rounded-[2.5rem] shadow-2xl border border-white/5 h-[600px] overflow-hidden flex flex-col relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-vale-green/10 blur-3xl"></div>
                  
                  <div className="p-6 bg-white/5 border-b border-white/5 flex justify-between items-center text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">
                      <span className="flex items-center gap-2"><Clock size={14} className="text-vale-green" /> Últimas 24h</span>
                      <Database size={14} />
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                      {history.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
                            <Database size={40} className="text-white mb-4" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white">Vazio</span>
                        </div>
                      ) : history.map(log => (
                          <div key={log.id} className="p-5 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 hover:border-vale-green/30 transition-all border-l-4 border-vale-green group/log">
                              <div className="flex justify-between items-start mb-2">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-vale-green uppercase tracking-[0.2em] mb-1">OM {log.om}</span>
                                    <span className="font-black text-lg text-white uppercase tracking-tight group-hover/log:text-vale-green transition-colors truncate max-w-[150px]">{log.tag}</span>
                                  </div>
                                  <div className="bg-vale-green/20 p-1.5 rounded-lg"><ShieldCheck size={16} className="text-vale-green" /></div>
                              </div>
                              <p className="text-[9px] font-bold text-gray-500 uppercase line-clamp-1 mb-3">{log.description}</p>
                              <div className="flex justify-between items-center border-t border-white/5 pt-3 text-[10px] font-black text-gray-600">
                                  <span className="flex items-center gap-1 text-gray-400"><Clock size={12} className="text-vale-blue"/> {new Date(log.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                  <span className="text-vale-blue bg-vale-blue/10 px-3 py-1 rounded-lg uppercase tracking-widest shadow-inner">{log.duration}</span>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      {/* MODAL DE CONCLUSÃO INDUSTRIAL */}
      {closingTask && (
          <div className="fixed inset-0 bg-vale-dark/95 z-[300] flex items-center justify-center p-4 backdrop-blur-xl animate-fadeIn">
              <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden animate-fade-in-up border-b-[8px] border-vale-cherry shadow-[0_0_60px_rgba(229,62,62,0.3)]">
                  <div className="bg-vale-dark p-8 text-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-vale-green/10 to-transparent"></div>
                      <AlertOctagon size={64} className="mx-auto text-vale-cherry mb-4 drop-shadow-2xl" />
                      <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Encerrar Atividade</h2>
                      <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">OM: {closingTask.header.om} | {closingTask.header.tag}</p>
                  </div>
                  <div className="p-8 grid grid-cols-1 gap-4 bg-gray-50">
                      <button onClick={() => completeAction('PARCIAL')} className="p-5 bg-white hover:bg-vale-green hover:text-white rounded-[2rem] font-black text-left flex justify-between items-center transition-all group/opt shadow-md border border-gray-100 hover:scale-[1.02]">
                          <div>
                              <span className="block text-xl uppercase tracking-tighter mb-0.5">Pausa (Parcial)</span>
                              <span className="text-[9px] opacity-60 uppercase tracking-widest font-black">Interrupção para troca de turno</span>
                          </div>
                          <PauseCircle size={32} className="group-hover/opt:scale-110 transition-transform" />
                      </button>
                      <button onClick={() => completeAction('TOTAL')} className="p-5 bg-white hover:bg-vale-cherry hover:text-white rounded-[2rem] font-black text-left flex justify-between items-center transition-all group/opt shadow-md border border-gray-100 hover:scale-[1.02]">
                          <div>
                              <span className="block text-xl uppercase tracking-tighter mb-0.5">Encerrar Ordem</span>
                              <span className="text-[9px] opacity-60 uppercase tracking-widest font-black">Finalização total da manutenção</span>
                          </div>
                          <StopCircle size={32} className="group-hover/opt:scale-110 transition-transform" />
                      </button>
                      <button onClick={() => completeAction('CHECKLIST')} className="p-5 bg-white hover:bg-vale-blue hover:text-white rounded-[2rem] font-black text-left flex justify-between items-center transition-all group/opt shadow-md border border-gray-100 hover:scale-[1.02]">
                          <div>
                              <span className="block text-xl uppercase tracking-tighter mb-0.5">Ficha de Inspeção</span>
                              <span className="text-[9px] opacity-60 uppercase tracking-widest font-black">Checklist técnico de liberação</span>
                          </div>
                          <CheckSquare size={32} className="group-hover/opt:scale-110 transition-transform" />
                      </button>
                      <button onClick={() => setClosingTask(null)} className="mt-4 text-xs font-black text-gray-400 uppercase tracking-[0.4em] hover:text-vale-dark transition-colors text-center underline underline-offset-4">Abortar Ação</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
