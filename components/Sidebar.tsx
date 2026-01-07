
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, FileText, CheckSquare, Calendar, Archive,
  Settings, Menu, LayoutDashboard, ChevronLeft, ChevronRight,
  FileInput, BarChart2, LogOut, ClipboardList, Bell, X, Eraser, Volume2, VolumeX, Volume1
} from 'lucide-react';
import { Cube3D } from './Cube3D';
import { StorageService, NotificationItem } from '../services/storage';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggle, onLogout }) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  
  // --- NOTIFICATION & ALERT STATE ---
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifList, setShowNotifList] = useState(false);
  const [hasUrgent, setHasUrgent] = useState(false);
  
  // Volume State (Default 50%)
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
      setUserName(localStorage.getItem('safemaint_user') || 'USUÁRIO');
      setUserRole(localStorage.getItem('safemaint_role') || 'OPERADOR');
      
      // Setup Audio (Siren Sound)
      audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/spaceship_alarm.ogg');
      audioRef.current.loop = true;
      audioRef.current.volume = volume; // Set initial volume

      checkNotifications();
      window.addEventListener('safemaint_storage_update', checkNotifications);
      
      return () => {
          window.removeEventListener('safemaint_storage_update', checkNotifications);
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
          }
      };
  }, []);

  // Update volume dynamically when slider changes
  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.volume = volume;
      }
  }, [volume]);

  const checkNotifications = () => {
      const notifs = StorageService.getNotifications();
      setNotifications(notifs);
      
      const urgent = notifs.some(n => n.type === 'URGENT');
      setHasUrgent(urgent);

      // Trigger Sound if Urgent
      if (urgent && audioRef.current) {
          // Play only if not already playing to avoid overlap
          if (audioRef.current.paused && volume > 0) {
              audioRef.current.play().catch(e => console.log("Audio autoplay blocked by browser", e));
          }
      } else if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
      }
  };

  const handleNotificationClick = (n: NotificationItem) => {
      setShowNotifList(false);
      if (n.source === 'DEMAND') {
          navigate('/extra-demands');
      } else {
          navigate('/om-management');
      }
  };

  const toggleNotifList = () => {
      setShowNotifList(!showNotifList);
  };
  
  const handleLogoutClick = async () => {
      if (audioRef.current) audioRef.current.pause();
      await StorageService.logoutUser(localStorage.getItem('safemaint_user') || '');
      if (onLogout) onLogout();
  };
  
  const sections = [
    { title: "PRINCIPAL", items: [
      { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { path: '/extra-demands', label: 'Demandas Extras', icon: <ClipboardList size={20} /> },
    ]},
    { title: "OPERAÇÃO", items: [
      { path: '/om-management', label: 'Ordens (OM)', icon: <FileInput size={20} /> },
      { path: '/schedule', label: 'Agenda', icon: <Calendar size={20} /> },
      { path: '/availability', label: 'Indicadores', icon: <BarChart2 size={20} /> },
    ]},
    { title: "DOCUMENTOS", items: [
      { path: '/art-emergencial', label: 'ART Emerg.', icon: <AlertTriangle size={20} /> },
      { path: '/art-atividade', label: 'ART Padrão', icon: <FileText size={20} /> },
      { path: '/checklist', label: 'Checklist', icon: <CheckSquare size={20} /> },
      { path: '/archive', label: 'Arquivo', icon: <Archive size={20} /> },
    ]},
    { title: "SISTEMA", items: [
      { path: '/settings', label: 'Configurações', icon: <Settings size={20} /> },
    ]}
  ];

  return (
    <>
      {/* Mobile Trigger Button */}
      <div className="md:hidden fixed top-4 left-4 z-50 flex gap-4">
        <button 
            onClick={toggle} 
            className="p-3 bg-gradient-to-br from-gray-800 to-gray-900 text-[#007e7a] rounded-xl border border-gray-700 shadow-xl active:scale-95 transition-transform"
        >
            <Menu size={24}/>
        </button>
        {/* Mobile Bell Alert */}
        {notifications.length > 0 && (
            <button 
                onClick={toggleNotifList}
                className={`p-3 rounded-xl border shadow-xl transition-all ${hasUrgent ? 'bg-red-600 border-red-500 text-white animate-pulse' : 'bg-gray-800 border-gray-700 text-white'}`}
            >
                <Bell size={24} className={hasUrgent ? 'animate-bounce' : ''}/>
            </button>
        )}
      </div>

      {/* Overlay para Mobile */}
      {isOpen && (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fadeIn" 
            onClick={toggle}
        />
      )}

      {/* Painel de Notificações (Mobile/Desktop Popup) */}
      {showNotifList && (
          <div className="fixed top-20 left-4 right-4 md:left-24 md:w-80 md:right-auto z-[100] bg-white rounded-xl shadow-2xl border-2 border-red-600 animate-fadeIn overflow-hidden">
              {/* Header Notificações */}
              <div className="bg-red-600 text-white p-3 flex justify-between items-center shadow-md">
                  <span className="font-black text-xs uppercase flex items-center gap-2">
                      <AlertTriangle size={14} className="text-white"/> CENTRO DE ALERTA ({notifications.length})
                  </span>
                  <button onClick={() => setShowNotifList(false)} className="bg-white/20 p-1 rounded hover:bg-white/30"><X size={14}/></button>
              </div>

              {/* CONTROLE DE VOLUME DA SIRENE */}
              <div className="bg-gray-50 p-3 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setVolume(v => v === 0 ? 0.5 : 0)} 
                        className="text-gray-500 hover:text-gray-800 transition-colors"
                        title={volume === 0 ? "Ativar Som" : "Silenciar"}
                      >
                          {volume === 0 ? <VolumeX size={18}/> : volume < 0.5 ? <Volume1 size={18}/> : <Volume2 size={18}/>}
                      </button>
                      <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.1" 
                          value={volume}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-red-600 hover:accent-red-700"
                      />
                      <span className="text-[10px] font-black text-gray-500 w-8 text-right">{(volume * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase mt-1 text-center tracking-wider">Volume da Sirene de Emergência</p>
              </div>

              {/* Lista de Itens */}
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 bg-gray-100 space-y-2">
                  {notifications.map(notif => (
                      <div 
                          key={notif.id} 
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3 rounded-lg border-l-4 shadow-sm cursor-pointer hover:bg-white hover:shadow-md transition-all ${notif.type === 'URGENT' ? 'bg-red-50 border-red-500' : 'bg-white border-blue-500'}`}
                      >
                          <div className="flex justify-between items-start mb-1">
                              <span className={`text-[9px] font-black uppercase px-1.5 rounded ${notif.type === 'URGENT' ? 'bg-red-200 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {notif.type === 'URGENT' ? 'URGENTE' : 'INFO'}
                              </span>
                              <span className="text-[8px] font-bold text-gray-400">{notif.date}</span>
                          </div>
                          <h4 className="font-black text-xs text-gray-800 uppercase leading-tight mb-0.5">{notif.title}</h4>
                          <p className="text-[10px] font-bold text-gray-500 uppercase line-clamp-2">{notif.message}</p>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Sidebar Container */}
      <div 
        className={`
            fixed inset-y-0 left-0 z-50 h-full flex flex-col
            bg-gradient-to-b from-[#111827] via-[#0f172a] to-[#0a0f1c]
            text-gray-300 shadow-[10px_0_30px_rgba(0,0,0,0.5)] border-r border-gray-800/50
            transform transition-all duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static
            ${isCollapsed ? 'w-[5.5rem]' : 'w-72'}
        `}
      >
        
        {/* Header / Logo Area */}
        <div className="relative h-32 flex items-center justify-center border-b border-gray-800/50 bg-gray-900/30 overflow-visible group">
            <div className={`transition-all duration-300 ${isCollapsed ? 'scale-75' : 'scale-100'} relative`}>
                 <Cube3D size="sm" />
                 
                 {/* --- ALERT BELL NEXT TO CUBE --- */}
                 {notifications.length > 0 && (
                     <div 
                        onClick={toggleNotifList}
                        className={`
                            absolute -right-8 -top-2 cursor-pointer z-50
                            w-10 h-10 rounded-full flex items-center justify-center border-4 border-[#111827] shadow-xl transition-transform hover:scale-110 active:scale-95
                            ${hasUrgent ? 'bg-red-600 animate-pulse' : 'bg-blue-600'}
                        `}
                        title="Ver Notificações"
                     >
                         <Bell size={18} className="text-white fill-current" />
                         {hasUrgent && <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></span>}
                     </div>
                 )}
            </div>
            
            <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-1/2 -translate-y-1/2 bg-gray-800 text-gray-400 p-1 rounded-full border border-gray-700 hover:text-white hover:bg-[#007e7a] hover:border-[#007e7a] transition-all shadow-lg z-20 hidden md:block"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-6 space-y-6 custom-scrollbar px-3">
            {sections.map((section, idx) => (
                <div key={idx} className="space-y-1">
                    {!isCollapsed && (
                        <h3 className="px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            {section.title}
                            <div className="h-px bg-gray-800 flex-1"></div>
                        </h3>
                    )}
                    
                    {section.items.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => { if(window.innerWidth < 768) toggle(); }} // Close sidebar on mobile nav
                            className={({ isActive }) => `
                                relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                                ${isActive 
                                    ? 'bg-gradient-to-r from-[#007e7a]/20 to-transparent text-[#007e7a]' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'}
                                ${isCollapsed ? 'justify-center' : ''}
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && <div className="absolute left-0 w-1 h-8 bg-[#007e7a] rounded-r-full shadow-[0_0_10px_#007e7a]"></div>}
                                    
                                    <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                        {item.icon}
                                    </div>
                                    
                                    {!isCollapsed && (
                                        <span className="font-bold text-xs uppercase tracking-wide">
                                            {item.label}
                                        </span>
                                    )}

                                    {/* Tooltip for Collapsed Mode */}
                                    {isCollapsed && (
                                        <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-800 text-white text-xs font-bold uppercase rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-gray-700 z-50 pointer-events-none">
                                            {item.label}
                                            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
                                        </div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 bg-gray-900/50 border-t border-gray-800/50">
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#007e7a] to-blue-600 flex items-center justify-center text-white font-black shadow-lg border-2 border-gray-800 shrink-0">
                    {userName.slice(0,2).toUpperCase()}
                </div>
                
                {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white uppercase truncate leading-none">{userName}</p>
                        <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] font-bold text-gray-500 uppercase bg-gray-800 px-1.5 rounded">{userRole}</p>
                            <button 
                                onClick={handleLogoutClick}
                                className="text-gray-500 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-white/5" 
                                title="Sair"
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </>
  );
};
