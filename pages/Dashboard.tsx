
import React, { useEffect, useState } from 'react';
import { StorageService, NotificationItem } from '../services/storage';
import { ActiveMaintenance, MaintenanceLog } from '../types';
import { useNavigate } from 'react-router-dom';
import { Timer, CheckSquare, Clock, AlertOctagon, PauseCircle, PlayCircle, StopCircle, Bell, BellRing, X, Database, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { checkConnection } from '../services/supabase';

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
  const [dbStatus, setDbStatus] = useState<{success: boolean, message: string, code?: string} | null>(null);
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [closingTask, setClosingTask] = useState<ActiveMaintenance | null>(null);
  const [dismissedNotifs, setDismissedNotifs] = useState<string[]>([]);

  useEffect(() => {
    refreshData();
    validateDB();
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    const dataInterval = setInterval(refreshData, 10000);
    
    window.addEventListener('safemaint_storage_update', refreshData);
    
    return () => { 
        clearInterval(clockInterval); 
        clearInterval(dataInterval);
        window.removeEventListener('safemaint_storage_update', refreshData);
    };
  }, []);

  const validateDB = async () => {
    const status = await checkConnection();
    setDbStatus(status);
  };

  const refreshData = () => {
    setActiveTasks(StorageService.getActiveMaintenances());
    setHistory(StorageService.getHistory());
    setNotifications(StorageService.getNotifications());
  };

  const handleDismissNotification = (id: string) => {
      if(!dismissedNotifs.includes(id)) {
          setDismissedNotifs(prev => [...prev, id]);
      }
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

  const handleParcial = () => { if(closingTask){ StorageService.pauseMaintenance(closingTask.id); navigate('/report', { state: { om: closingTask.header.om, tag: closingTask.header.tag, type: closingTask.header.type, date: new Date().toLocaleDateString('pt-BR'), startTime: new Date(closingTask.startTime).toLocaleTimeString().slice(0,5), endTime: new Date().toLocaleTimeString().slice(0,5), executors: [], activities: closingTask.header.description, status: 'PARCIAL', stopReason: 'INTERRUPÇÃO', pendings: '', isPartial: true } }); setClosingTask(null); refreshData(); }};
  const handleTotal = () => { if(closingTask && window.confirm("ENCERRAR OM?")){ StorageService.completeMaintenance(closingTask.id); navigate('/report', { state: { om: closingTask.header.om, tag: closingTask.header.tag, type: closingTask.header.type, date: new Date().toLocaleDateString('pt-BR'), startTime: new Date(closingTask.startTime).toLocaleTimeString().slice(0,5), endTime: new Date().toLocaleTimeString().slice(0,5), executors: [], activities: closingTask.header.description, status: 'FINALIZADO', stopReason: 'CONCLUÍDO', pendings: '', isPartial: false } }); setClosingTask(null); refreshData(); }};
  const handleChecklist = () => { if(closingTask){ navigate(`/checklist?maintenanceId=${closingTask.id}`); setClosingTask(null); }};

  const visibleNotifications = notifications.filter(n => !dismissedNotifs.includes(n.id));

  const NotificationDropdown = () => (
      <div className="absolute top-20 right-4 md:right-10 z-50 w-80 md:w-96 bg-gray-900 border-2 border-[#10b981] rounded-xl shadow-2xl animate-fadeIn overflow-hidden">
          <div className="bg-[#10b981] p-3 flex justify-between items-center">
              <h3 className="font-black text-white flex items-center gap-2"><BellRing size={20} /> NOTIFICAÇÕES ({visibleNotifications.length})</h3>
              <button onClick={() => setShowNotifications(false)} className="text-white"><X size={20}/></button>
          </div>
          <div className="max-h-80 overflow-y-auto custom-scrollbar p-1">
              {visibleNotifications.length === 0 ? <div className="p-8 text-center text-gray-500 font-bold">Sem notificações novas.</div> : (
                  <div className="space-y-1">
                      {visibleNotifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => handleDismissNotification(n.id)}
                            onMouseLeave={() => handleDismissNotification(n.id)}
                            className="p-3 rounded bg-gray-800 text-white border-l-4 border-[#10b981] cursor-pointer hover:bg-gray-700 transition-colors"
                            title="Clique ou passe o mouse para marcar como lida"
                          >
                              <h4 className="font-bold">{n.title}</h4>
                              <p className="text-xs text-gray-400">{n.message}</p>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      
      {/* STATUS DA NUVEM (SUPABASE) */}
      {dbStatus && !dbStatus.success && (
          <div className={`p-3 rounded-lg flex items-center justify-between border-2 shadow-sm animate-fadeIn ${dbStatus.code === 'MISSING_TABLES' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              <div className="flex items-center gap-3">
                  <AlertTriangle size={20} />
                  <div>
                    <span className="font-black text-xs uppercase">Sincronização em Nuvem:</span>
                    <span className="ml-2 text-xs font-bold">{dbStatus.message}</span>
                  </div>
              </div>
              {dbStatus.code === 'MISSING_TABLES' && (
                  <button onClick={() => navigate('/settings')} className="bg-yellow-600 text-white px-3 py-1 rounded text-[10px] font-black hover:bg-yellow-700">CONFIGURAR AGORA</button>
              )}
          </div>
      )}

      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-6 md:p-10 text-white flex flex-col md:flex-row justify-between items-center relative overflow-hidden border-b-4 border-[#10b981]">
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-[#10b981] opacity-10 rounded-full blur-2xl"></div>
          <div className="z-10 w-full md:w-auto flex items-center gap-6">
              <div className="shadow-lg border border-gray-700 rounded-lg">
                <SafeMaintLogoSmall />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-widest mb-1 flex items-center gap-2 font-sans text-white">SAFEMAINT</h1>
                <p className="text-[#10b981] font-bold uppercase tracking-widest text-xs">GESTÃO À VISTA ONLINE</p>
              </div>
          </div>

          <div className="flex gap-4 md:gap-8 items-center mt-6 md:mt-0 z-10 w-full md:w-auto justify-between md:justify-end">
              <div className="relative">
                  <button onClick={() => setShowNotifications(!showNotifications)} className="p-3 bg-black/20 hover:bg-black/30 rounded-full text-[#10b981] transition-colors relative shadow-lg border border-gray-700">
                      <Bell size={24} />
                      {visibleNotifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-gray-900 animate-bounce">{visibleNotifications.length}</span>}
                  </button>
              </div>
              <div className="h-10 w-px bg-white/10 hidden md:block"></div>
              <div className="text-center hidden md:block">
                  <div className="flex items-center justify-center gap-2 text-[#10b981] mb-1">
                      <Clock size={20} />
                      <span className="text-[10px] font-black uppercase tracking-wider">HORA</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-white shadow-sm">{now.toLocaleTimeString()}</div>
              </div>
          </div>
      </div>

      {showNotifications && <NotificationDropdown />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-black text-gray-800 flex items-center gap-2 border-b-2 border-gray-200 pb-2">
                <Timer className="text-gray-800" /> MANUTENÇÕES EM ANDAMENTO
            </h2>
            
            {activeTasks.length === 0 && (
                <div className="bg-white p-10 rounded-lg shadow border-2 border-dashed border-gray-300 text-center">
                    <Timer size={48} className="mx-auto text-gray-300 mb-2" />
                    <h3 className="text-lg font-bold text-gray-600">NENHUMA ATIVIDADE ATIVA</h3>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeTasks.map(task => {
                    const isCorrective = task.origin === 'CORRETIVA';
                    const isPaused = task.status === 'PAUSADA';
                    let borderColor = isCorrective ? 'border-red-600' : 'border-[#10b981]';
                    let bgColor = isCorrective ? 'bg-red-50' : 'bg-green-50';
                    let badgeColor = isCorrective ? 'bg-red-200 text-red-900' : 'bg-emerald-200 text-emerald-900';
                    
                    if (isPaused) { borderColor = 'border-gray-500'; bgColor = 'bg-gray-100'; badgeColor = 'bg-gray-300 text-gray-700'; }

                    return (
                        <div key={task.id} className={`rounded-xl shadow-lg border-t-8 overflow-hidden relative hover:shadow-2xl transition-all transform hover:-translate-y-1 ${borderColor} ${bgColor}`}>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide flex items-center gap-1 ${badgeColor}`}>
                                        {isPaused ? <PauseCircle size={12}/> : <PlayCircle size={12}/>}
                                        {isPaused ? 'PAUSADA' : (isCorrective ? 'CORRETIVA' : 'PREVENTIVA')}
                                    </span>
                                    <div className="text-gray-500 text-xs font-mono font-bold">{new Date(task.startTime).toLocaleTimeString().slice(0,5)}</div>
                                </div>
                                <h3 className={`text-2xl font-black mb-1 text-gray-900`}>{task.header.om}</h3>
                                <p className="text-sm font-black text-gray-600 mb-2">{task.header.tag}</p>
                                <p className="text-sm text-gray-700 font-bold mb-4 line-clamp-2">{task.header.description}</p>
                                <div className={`flex justify-center border border-gray-200 rounded-lg py-3 mb-4 shadow-inner bg-white`}>
                                    <div className={`text-3xl font-mono font-black tracking-widest text-gray-800`}>{getElapsedTime(task)}</div>
                                </div>
                                <button onClick={() => handleActionClick(task)} className={`w-full font-black py-4 rounded-lg shadow flex items-center justify-center gap-2 transition-transform transform active:scale-95 text-sm ${isPaused ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-800 hover:bg-black text-white'}`}>
                                    {isPaused ? <PlayCircle size={20} /> : <StopCircle size={20} />}
                                    {isPaused ? 'RETOMAR' : 'ENCERRAR'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col h-[600px]">
            <div className="p-4 border-b bg-gray-100 rounded-t-xl flex justify-between items-center">
                <h3 className="font-black text-gray-700 flex items-center gap-2"><CheckSquare size={18} /> HISTÓRICO RECENTE</h3>
                <div className="flex items-center gap-1 text-[10px] font-black text-[#10b981]">
                    <Database size={12} /> SYNC OK
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {history.length === 0 && <div className="text-center py-10 text-gray-400 text-sm font-bold">VAZIO.</div>}
                {history.map(log => (
                    <div key={log.id} className="bg-gray-50 hover:bg-white border hover:border-gray-300 p-3 rounded-lg transition-colors group">
                        <div className="flex justify-between items-start mb-1"><span className="font-black text-gray-800 text-sm">{log.om}</span><span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-200 text-gray-800">{log.status}</span></div>
                        <div className="text-xs text-gray-600 font-bold mb-2 truncate">{log.description}</div>
                        <div className="text-[10px] text-gray-400 text-right mt-1 font-mono">{new Date(log.endTime).toLocaleDateString()}</div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {closingTask && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                  <div className="bg-gray-900 p-6 text-center border-b-4 border-[#10b981]"><AlertOctagon size={48} className="mx-auto text-[#10b981] mb-2" /><h2 className="text-2xl font-black text-white">OPÇÕES</h2></div>
                  <div className="p-6 space-y-3">
                      <button onClick={handleParcial} className="w-full bg-orange-100 text-orange-900 border-2 border-orange-200 p-4 rounded-xl font-black flex items-center gap-3">PARCIAL (TROCA TURNO)</button>
                      <button onClick={handleTotal} className="w-full bg-red-100 text-red-900 border-2 border-red-200 p-4 rounded-xl font-black flex items-center gap-3">TOTAL (FINALIZAR)</button>
                      <button onClick={handleChecklist} className="w-full bg-green-100 text-green-900 border-2 border-green-200 p-4 rounded-xl font-black flex items-center gap-3">CHECKLIST (FINAL)</button>
                      <button onClick={() => setClosingTask(null)} className="w-full bg-gray-200 text-gray-600 p-3 rounded-xl font-bold mt-2">CANCELAR</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
