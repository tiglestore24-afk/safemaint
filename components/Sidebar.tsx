
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, FileText, CheckSquare, Calendar, Archive,
  Settings, Menu, LayoutDashboard, ChevronLeft, ChevronRight,
  FileInput, BarChart2, LogOut, ClipboardList, Bell, X
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
      setUserName(localStorage.getItem('safemaint_user') || 'USUÁRIO');
      setUserRole(localStorage.getItem('safemaint_role') || 'OPERADOR');
      
      // Setup Audio (Siren Sound)
      audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/spaceship_alarm.ogg');
      audioRef.current.loop = true;
      audioRef.current.volume = 1.0; // Max volume

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

  const checkNotifications = () => {
      const notifs = StorageService.getNotifications();
      setNotifications(notifs);
      
      const urgent = notifs.some(n => n.type === 'URGENT');
      setHasUrgent(urgent);

      // Trigger Sound if Urgent
      if (urgent && audioRef.current) {
          // Play only if not already playing to avoid overlap
          if (audioRef.current.paused) {
              audioRef.current.play().catch(e => console.log("Audio autoplay blocked by browser", e));
          }
      } else if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
      }
  };

  const handleNotificationClick = (n: NotificationItem) => {
      setShowNotifList(false);
      // Stop sound temporarily or permanently depending on logic. 
      // For now, navigating away might solve it if data updates.
      
      if (n.source === 'DEMAND') {
          navigate('/extra-demands');
      } else {
          // Logic to view OM (Generic redirect to management for now)
          navigate('/om-management');
      }
  };

  const toggleNotifList = () => {
      setShowNotifList(!showNotifList);
      // If opening list, maybe silence alarm? 
      // Let's keep alarm until action is taken, or user can mute via system volume.
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
                            w-10 h-10 rounded-full flex items-center justify-center border-4 border-[#111827] shadow-xl
                            ${hasUrgent ? 'bg-red-600 animate-pulse' : 'bg-blue-600'}
                        `}
                     >
                         <Bell size={18} className="text-white fill-white" />
                         {/* Ripple Effect for Urgent */}
                         {hasUrgent && (
                             <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                         )}
                         <span className="absolute -top-1 -right-1 bg-white text-red-600 text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-gray-200">
                             {notifications.length}
                         </span>
                     </div>
                 )}
            </div>
            
            {/* Collapse Toggle Button (Desktop) */}
            <button 
                onClick={() => setIsCollapsed(!isCollapsed)} 
                className="absolute -right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-6 h-6 bg-[#007e7a] text-white rounded-full shadow-[0_0_10px_#007e7a] hover:scale-110 transition-transform border-2 border-[#111827] z-50"
            >
                {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
            </button>
        </div>
        
        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-8 custom-scrollbar">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-2">
              {!isCollapsed && (
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-4 mb-2 animate-fadeIn">
                    {section.title}
                </h3>
              )}
              
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink 
                    key={item.path} 
                    to={item.path} 
                    className={({ isActive }) => `
                        relative group flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 overflow-hidden
                        ${isCollapsed ? 'justify-center px-2' : ''}
                        ${isActive 
                            ? 'bg-gradient-to-r from-[#007e7a] to-[#00605d] text-white shadow-[0_4px_20px_rgba(0,126,122,0.4)] translate-x-1' 
                            : 'hover:bg-white/5 hover:text-white hover:translate-x-1'
                        }
                    `}
                  >
                    {({ isActive }) => (
                        <>
                            {/* Active Indicator Strip (Left) */}
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#edb111] shadow-[0_0_10px_#edb111]"></div>
                            )}

                            {/* Icon with 3D depth effect */}
                            <div className={`
                                relative z-10 transition-transform duration-300 
                                ${isActive ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110 text-gray-400 group-hover:text-white'}
                            `}>
                                {item.icon}
                            </div>

                            {/* Label */}
                            {!isCollapsed && (
                                <span className={`
                                    text-xs font-bold uppercase tracking-wide truncate relative z-10
                                    ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-100'}
                                `}>
                                    {item.label}
                                </span>
                            )}
                            
                            {/* Hover Gradient Effect (Subtle) */}
                            {!isActive && (
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none"></div>
                            )}
                        </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 bg-black/20 border-t border-gray-800/50 backdrop-blur-sm">
            {/* User Info */}
            {!isCollapsed && (
                <div className="mb-4 px-2">
                    <p className="text-xs font-black text-white truncate">{userName}</p>
                    <p className="text-[10px] font-bold text-[#007e7a] uppercase">{userRole}</p>
                </div>
            )}

            <button 
                onClick={handleLogoutClick}
                className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white transition-all duration-300 group border border-red-900/30
                    ${isCollapsed ? 'justify-center px-2' : ''}
                `}
            >
                <LogOut size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                {!isCollapsed && <span className="font-bold text-xs uppercase">Sair do Sistema</span>}
            </button>
        </div>
      </div>

      {/* --- NOTIFICATION LIST MODAL (ATTACHED TO SIDEBAR) --- */}
      {showNotifList && (
          <div className="fixed inset-0 z-[100] flex animate-fadeIn" onClick={() => setShowNotifList(false)}>
              <div 
                className={`
                    relative bg-white w-80 h-full shadow-2xl border-r border-gray-200 flex flex-col
                    ${isCollapsed ? 'ml-[5.5rem]' : 'ml-72'} 
                    transition-all duration-300
                `}
                onClick={e => e.stopPropagation()}
              >
                  <div className={`p-4 border-b flex justify-between items-center ${hasUrgent ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      <h3 className="font-black text-sm uppercase flex items-center gap-2">
                          <Bell size={16} fill="currentColor"/> Notificações
                      </h3>
                      <button onClick={() => setShowNotifList(false)}><X size={18}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto bg-gray-50 p-2 space-y-2">
                      {notifications.length === 0 ? (
                          <div className="p-8 text-center text-gray-400 font-bold text-xs uppercase">Sem novidades</div>
                      ) : (
                          notifications.map(n => (
                              <div 
                                key={n.id} 
                                onClick={() => handleNotificationClick(n)}
                                className={`
                                    p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all
                                    ${n.type === 'URGENT' ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-white border-gray-200 hover:bg-blue-50'}
                                `}
                              >
                                  <div className="flex justify-between items-start mb-1">
                                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${n.type === 'URGENT' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                                          {n.type === 'URGENT' ? 'URGENTE' : 'INFO'}
                                      </span>
                                      <span className="text-[9px] text-gray-400 font-bold">{n.date}</span>
                                  </div>
                                  <p className="text-xs font-black text-gray-800 uppercase leading-tight mb-1">{n.title}</p>
                                  <p className="text-[10px] text-gray-500 font-bold uppercase">{n.message}</p>
                              </div>
                          ))
                      )}
                  </div>
              </div>
              
              {/* BACKDROP BLUR FOR THE REST OF SCREEN */}
              <div className="flex-1 bg-black/50 backdrop-blur-sm"></div>
          </div>
      )}
    </>
  );
};
