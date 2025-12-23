
import React, { useEffect, useState, useCallback } from 'react';
import { StorageService, NotificationItem } from '../services/storage';
import { ActiveMaintenance, MaintenanceLog } from '../types';
import { useNavigate } from 'react-router-dom';
import { Timer, CheckSquare, Clock, AlertOctagon, PauseCircle, PlayCircle, StopCircle, Bell, BellRing, X, Database, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { checkConnection, supabase } from '../services/supabase';

const SafeMaintLogoSmall = () => (
    <div className="flex items-center justify-center w-24 h-14 bg-white rounded p-1">
        <h1 className="font-black tracking-tighter" style={{ color: '#007e7a', fontSize: '2.2rem', lineHeight: '1' }}>VALE</h1>
    </div>
);

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTasks, setActiveTasks] = useState<ActiveMaintenance[]>([]);
  const [history, setHistory] = useState<MaintenanceLog[]>([]);
  const [now, setNow] = useState(new Date());
  const [dbStatus, setDbStatus] = useState<{success: boolean, message: string} | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [closingTask, setClosingTask] = useState<ActiveMaintenance | null>(null);
  const [dismissedNotifs, setDismissedNotifs] = useState<string[]>([]);

  const refreshData = useCallback(async () => {
    const active = await StorageService.getActiveMaintenances();
    const hist = await StorageService.getHistory();
    setActiveTasks(active);
    setHistory(hist);
    setNotifications(StorageService.getNotifications());
  }, []);

  useEffect(() => {
    refreshData();
    
    const validate = async () => {
        const status = await checkConnection();
        setDbStatus(status);
        setIsOnline(status.success);
    };
    validate();

    // Inscrição Realtime para Painel Geral
    const channel = supabase
      .channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_maintenance' }, refreshData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'history' }, refreshData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat' }, () => {
          // Pequeno efeito visual ou som para novas mensagens se necessário
      })
      .subscribe();

    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    const syncInterval = setInterval(validate, 10000);
    
    window.addEventListener('safemaint_storage_update', refreshData);
    
    return () => { 
        clearInterval(clockInterval); 
        clearInterval(syncInterval);
        supabase.removeChannel(channel);
        window.removeEventListener('safemaint_storage_update', refreshData);
    };
  }, [refreshData]);

  const handleDismissNotification = (id: string) => {
      setDismissedNotifs(prev => [...prev, id]);
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

  const handleActionClick = (task: ActiveMaintenance) => {
      if (task.status === 'PAUSADA') {
          StorageService.resumeMaintenance(task.id);
          if (task.origin === 'CORRETIVA' || task.artType === 'ART_EMERGENCIAL') navigate('/art-emergencial', { state: task.header });
          else navigate('/art-atividade', { state: task.header });
      } else {
          setClosingTask(task);
      }
  };

  const handleParcial = () => { if(closingTask){ StorageService.pauseMaintenance(closingTask.id); navigate('/report', { state: { ...closingTask.header, status: 'PARCIAL', isPartial: true } }); setClosingTask(null); }};
  const handleTotal = () => { if(closingTask && window.confirm("ENCERRAR OM?")){ StorageService.completeMaintenance(closingTask.id); navigate('/report', { state: { ...closingTask.header, status: 'FINALIZADO', isPartial: false } }); setClosingTask(null); }};
  const handleChecklist = () => { if(closingTask){ navigate(`/checklist?maintenanceId=${closingTask.id}`); setClosingTask(null); }};

  const visibleNotifications = notifications.filter(n => !dismissedNotifs.includes(n.id));

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative">
      
      {/* Barra de Status de Conexão */}
      {!isOnline && (
          <div className="bg-vale-cherry text-white px-6 py-2 rounded-xl flex items-center justify-between animate-pulse shadow-lg border-2 border-white/20">
              <div className="flex items-center gap-2 font-black text-[10px] uppercase">
                  <WifiOff size={16} /> MODO OFFLINE: OS DADOS SERÃO SINCRONIZADOS AO VOLTAR A REDE
              </div>
              <Database size={16} />
          </div>
      )}

      {dbStatus && !dbStatus.success && isOnline && (
          <div className="bg-vale-yellow/20 border-2 border-vale-yellow text-vale-darkgray p-4 rounded-xl flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-3">
                  <AlertTriangle size={24} className="text-vale-yellow" />
                  <div>
                    <p className="font-black text-xs uppercase">Conexão Supabase: {dbStatus.message}</p>
                    <p className="text-[10px] font-bold opacity-60">Verifique as políticas de Realtime e RLS no painel.</p>
                  </div>
              </div>
              <button onClick={() => navigate('/settings')} className="bg-vale-yellow text-white px-4 py-2 rounded-lg text-[10px] font-black hover:scale-105 transition-transform">CONFIGURAR</button>
          </div>
      )}

      <div className="bg-gradient-to-br from-vale-darkgray to-[#222] rounded-[2.5rem] shadow-2xl p-8 md:p-12 text-white flex flex-col md:flex-row justify-between items-center relative overflow-hidden border-b-8 border-vale-green">
          <div className="absolute top-0 right-0 w-64 h-64 bg-vale-green opacity-10 rounded-full blur-[100px]"></div>
          
          <div className="z-10 flex items-center gap-8">
              <div className="bg-white p-3 rounded-2xl shadow-xl transform -rotate-3 hover:rotate-0 transition-transform">
                <SafeMaintLogoSmall />
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tighter mb-1 font-sans italic">SAFEMAINT</h1>
                <p className="text-vale-green font-black uppercase tracking-[0.4em] text-[10px] flex items-center gap-2">
                    <Wifi size={14} className="animate-pulse" /> MONITORAMENTO LIVE
                </p>
              </div>
          </div>

          <div className="flex gap-10 items-center mt-8 md:mt-0 z-10">
              <div className="relative group">
                  <button onClick={() => setShowNotifications(!showNotifications)} className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl text-vale-green transition-all shadow-inner border border-white/5 relative">
                      <Bell size={28} />
                      {visibleNotifications.length > 0 && (
                          <span className="absolute -top-2 -right-2 bg-vale-cherry text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-vale-darkgray animate-bounce">
                              {visibleNotifications.length}
                          </span>
                      )}
                  </button>
                  {showNotifications && (
                      <div className="absolute top-full mt-4 right-0 w-80 bg-white rounded-3xl shadow-2xl border-2 border-gray-100 overflow-hidden z-[100] animate-fade-in-up text-vale-darkgray">
                          <div className="bg-vale-green p-4 text-white font-black flex justify-between items-center">
                              <span className="text-xs uppercase flex items-center gap-2"><BellRing size={16}/> Central de Avisos</span>
                              <button onClick={() => setShowNotifications(false)}><X size={18}/></button>
                          </div>
                          <div className="max-h-64 overflow-y-auto p-2 custom-scrollbar">
                              {visibleNotifications.length === 0 ? <p className="p-8 text-center text-xs font-bold text-gray-300">Sem notificações.</p> : (
                                  visibleNotifications.map(n => (
                                      <div key={n.id} onClick={() => handleDismissNotification(n.id)} className="p-3 mb-1 rounded-xl bg-gray-50 hover:bg-gray-100 border-l-4 border-vale-green cursor-pointer transition-colors">
                                          <h4 className="font-black text-[10px] uppercase text-vale-darkgray">{n.title}</h4>
                                          <p className="text-[9px] font-bold text-gray-400">{n.message}</p>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  )}
              </div>
              
              <div className="h-16 w-px bg-white/10 hidden md:block"></div>
              
              <div className="text-right leading-none hidden md:block">
                  <div className="text-vale-green font-black text-[10px] mb-2 uppercase tracking-widest">HORÁRIO BRASÍLIA</div>
                  <div className="text-4xl font-mono font-black text-white">{now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}</div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between border-b-2 border-gray-100 pb-2">
                <h2 className="text-xl font-black text-vale-darkgray flex items-center gap-3 uppercase">
                    <Timer className="text-vale-green" size={24} /> ATIVIDADES ATIVAS <span className="text-xs bg-gray-200 px-3 py-1 rounded-full">{activeTasks.length}</span>
                </h2>
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-vale-green animate-ping"></div>
                    <div className="w-2 h-2 rounded-full bg-vale-green"></div>
                </div>
            </div>
            
            {activeTasks.length === 0 && (
                <div className="bg-white p-20 rounded-[2.5rem] border-4 border-dashed border-gray-100 text-center flex flex-col items-center justify-center grayscale opacity-50">
                    <Timer size={80} className="text-gray-200 mb-4" />
                    <h3 className="text-lg font-black text-gray-400 uppercase tracking-widest">Nenhuma atividade em campo</h3>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeTasks.map(task => {
                    const isCorrective = task.origin === 'CORRETIVA' || task.artType === 'ART_EMERGENCIAL';
                    const isPaused = task.status === 'PAUSADA';
                    
                    return (
                        <div key={task.id} className={`bg-white rounded-[2rem] shadow-xl border-t-8 transition-all hover:scale-[1.02] relative overflow-hidden ${isPaused ? 'border-vale-darkgray grayscale' : isCorrective ? 'border-vale-cherry' : 'border-vale-green'}`}>
                            {isPaused && <div className="absolute inset-0 bg-white/40 flex items-center justify-center z-10 font-black text-2xl text-vale-darkgray uppercase italic border-2 border-vale-darkgray/20 rounded-[2rem]">ATIVIDADE PAUSADA</div>}
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <span className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${isCorrective ? 'bg-vale-cherry text-white' : 'bg-vale-green text-white'}`}>
                                        {isCorrective ? 'EMERGÊNCIA' : 'PREVENTIVA'}
                                    </span>
                                    <div className="text-vale-darkgray/40 text-[10px] font-black flex items-center gap-1">
                                        <Clock size={14} /> {new Date(task.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </div>
                                </div>
                                <h3 className="text-3xl font-black text-vale-darkgray mb-1 uppercase tracking-tighter">{task.header.om}</h3>
                                <p className="text-[10px] font-black text-vale-green uppercase mb-4">{task.header.tag}</p>
                                
                                <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-100 mb-6 flex justify-center">
                                    <div className={`text-4xl font-mono font-black tracking-widest ${isPaused ? 'text-gray-400' : 'text-vale-darkgray'}`}>
                                        {getElapsedTime(task)}
                                    </div>
                                </div>
                                
                                <button onClick={() => handleActionClick(task)} className={`w-full font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 text-xs uppercase ${isPaused ? 'bg-vale-green text-white hover:bg-vale-green/90' : 'bg-vale-darkgray text-white hover:bg-black'}`}>
                                    {isPaused ? <PlayCircle size={20} /> : <StopCircle size={20} />}
                                    {isPaused ? 'Retomar Trabalho' : 'Finalizar OM'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="flex flex-col gap-6">
            <h2 className="text-xl font-black text-vale-darkgray flex items-center gap-3 uppercase border-b-2 border-gray-100 pb-2">
                <CheckSquare className="text-vale-blue" size={24} /> HISTÓRICO LIVE
            </h2>
            <div className="bg-white rounded-[2rem] shadow-xl border-2 border-gray-100 flex-1 overflow-hidden flex flex-col">
                <div className="p-4 bg-gray-50 border-b-2 border-gray-100 flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Últimas 30 Atividades</span>
                    <Database size={14} className="text-vale-green" />
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                    {history.length === 0 ? <p className="text-center py-10 text-xs font-black text-gray-200">SEM REGISTROS</p> : (
                        history.map(log => (
                            <div key={log.id} className="p-4 rounded-2xl bg-gray-50 border-2 border-gray-100 hover:border-vale-blue/30 transition-all group">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-black text-vale-darkgray text-sm group-hover:text-vale-blue transition-colors">{log.om}</span>
                                    <span className="text-[8px] px-2 py-0.5 rounded-full font-black bg-white border border-gray-200 text-vale-green uppercase">OK</span>
                                </div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase truncate mb-2">{log.tag} | {log.description}</div>
                                <div className="flex justify-between items-center text-[8px] font-black text-gray-300 uppercase">
                                    <span>{new Date(log.endTime).toLocaleDateString()}</span>
                                    <span>{new Date(log.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      </div>

      {closingTask && (
          <div className="fixed inset-0 bg-vale-darkgray/90 flex items-center justify-center z-[200] p-6 backdrop-blur-md animate-fadeIn">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in-up border-b-8 border-vale-green">
                  <div className="bg-vale-darkgray p-10 text-center relative">
                      <button onClick={() => setClosingTask(null)} className="absolute top-6 right-6 text-white/20 hover:text-white"><X size={32}/></button>
                      <AlertOctagon size={64} className="mx-auto text-vale-green mb-4" />
                      <h2 className="text-3xl font-black text-white uppercase tracking-tighter">FINALIZAR OM {closingTask.header.om}</h2>
                      <p className="text-vale-green text-[10px] font-black uppercase mt-2 tracking-widest">O relógio de parada será registrado agora</p>
                  </div>
                  <div className="p-10 grid grid-cols-1 gap-4">
                      <button onClick={handleParcial} className="bg-vale-orange/10 hover:bg-vale-orange text-vale-orange hover:text-white p-6 rounded-[1.5rem] font-black flex items-center justify-between transition-all border-2 border-vale-orange/20 group">
                          <span className="text-lg">PARCIAL (TROCA TURNO)</span>
                          <PauseCircle size={28} className="group-hover:scale-110 transition-transform" />
                      </button>
                      <button onClick={handleTotal} className="bg-vale-cherry/10 hover:bg-vale-cherry text-vale-cherry hover:text-white p-6 rounded-[1.5rem] font-black flex items-center justify-between transition-all border-2 border-vale-cherry/20 group">
                          <span className="text-lg">TOTAL (DIRETO)</span>
                          <StopCircle size={28} className="group-hover:scale-110 transition-transform" />
                      </button>
                      <button onClick={handleChecklist} className="bg-vale-green/10 hover:bg-vale-green text-vale-green hover:text-white p-6 rounded-[1.5rem] font-black flex items-center justify-between transition-all border-2 border-vale-green/20 group">
                          <span className="text-lg">CHECKLIST (PADRÃO)</span>
                          <CheckSquare size={28} className="group-hover:scale-110 transition-transform" />
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
