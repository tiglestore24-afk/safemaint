
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, FileText, CheckSquare, Calendar, Archive,
  Settings, Menu, LayoutDashboard, ChevronLeft, ChevronRight,
  FileInput, LogOut, ClipboardList, Bell, X, Eraser, CheckCircle, Activity, Calendar as CalIcon, Info, Trash2, RefreshCw, BarChart2
} from 'lucide-react';
import { Cube3D } from './Cube3D';
import { StorageService, NotificationItem } from '../services/storage';
import { checkConnection } from '../services/supabase';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
  onLogout?: () => void;
}

const SidebarLink: React.FC<{
  to: string;
  label: string;
  icon: React.ReactNode;
  isCollapsed: boolean;
  onClick: () => void;
}> = ({ to, label, icon, isCollapsed, onClick }) => {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `
        relative flex items-center gap-4 h-12 px-4 rounded-lg
        transition-all duration-200 ease-in-out group font-bold
        focus:outline-none focus:ring-2 focus:ring-[#007e7a]/50
        ${isActive 
          ? 'bg-[#007e7a] text-white shadow-md' 
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
        ${isCollapsed ? 'justify-center' : ''}
      `}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/20 rounded-r-full" />
          )}
          <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
            {icon}
          </div>
          {!isCollapsed && (
            <span className="text-xs uppercase tracking-wider animate-fadeIn">
              {label}
            </span>
          )}
          {isCollapsed && (
            <div className="absolute left-full ml-4 px-3 py-2 bg-[#111827] text-white text-xs font-bold uppercase rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap shadow-xl border border-gray-700 z-50 pointer-events-none">
              {label}
              <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#111827] transform rotate-45 border-l border-b border-gray-700" />
            </div>
          )}
        </>
      )}
    </NavLink>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggle, onLogout }) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [displayInitial, setDisplayInitial] = useState('');
  const [userRole, setUserRole] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifList, setShowNotifList] = useState(false);
  const [hasUrgent, setHasUrgent] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const storedLogin = localStorage.getItem('safemaint_user') || '';
    const storedRole = localStorage.getItem('safemaint_role') || 'OPERADOR';
    const users = StorageService.getUsers();
    const foundUser = users.find(u => u.login === storedLogin);
    const finalName = foundUser ? foundUser.name : storedLogin;
    
    setDisplayName(finalName || 'USUÁRIO');
    setDisplayInitial(finalName ? finalName.charAt(0).toUpperCase() : '?');
    setUserRole(storedRole);
      
    checkNotifications();
    window.addEventListener('safemaint_storage_update', checkNotifications);
    
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setShowNotifList(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        window.removeEventListener('safemaint_storage_update', checkNotifications);
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const checkNotifications = () => {
      const notifs = StorageService.getNotifications();
      setNotifications(notifs);
      setHasUrgent(notifs.some(n => n.type === 'URGENT'));
  };

  const handleNotificationClick = (n: NotificationItem) => {
      setShowNotifList(false);
      if (n.link) navigate(n.link);
  };
  
  const getNotifIcon = (type: string) => {
      switch(type) {
          case 'URGENT': return <AlertTriangle size={14} className="text-red-500" />;
          case 'ACTIVE': return <Activity size={14} className="text-blue-500" />;
          case 'SCHEDULE': return <CalIcon size={14} className="text-purple-500" />;
          case 'SYSTEM': return <Info size={14} className="text-green-500" />;
          default: return <Info size={14} className="text-gray-500" />;
      }
  };

  const handleLogoutClick = async () => {
      await StorageService.logoutUser();
      if (onLogout) onLogout();
  };
  
  const handleManualSync = async () => {
      if (isSyncing) return;
      setIsSyncing(true);
      await StorageService.initialSync();
      await checkConnection();
      setTimeout(() => setIsSyncing(false), 1500);
  };

  const handleClearCache = async () => {
    if (window.confirm("⚠️ ATENÇÃO: Isso irá apagar todos os dados locais e deslogar.\n\nDeseja continuar?")) {
        localStorage.clear();
        window.location.href = '/';
    }
  };

  const sections = [
    { title: "OPERAÇÕES", items: [
      { path: '/dashboard', label: 'Painel', icon: <LayoutDashboard size={20} /> },
      { path: '/indicators', label: 'Indicadores', icon: <BarChart2 size={20} /> },
    ]},
    { title: "PLANEJAMENTO", items: [
      { path: '/schedule', label: 'Agenda', icon: <Calendar size={20} /> },
      { path: '/om-management', label: 'Ordens (OM)', icon: <FileInput size={20} /> },
      { path: '/extra-demands', label: 'Demandas Extras', icon: <ClipboardList size={20} /> },
    ]},
    { title: "EXECUÇÃO", items: [
      { path: '/art-emergencial', label: 'ART Emerg.', icon: <AlertTriangle size={20} /> },
      { path: '/art-atividade', label: 'ART Padrão', icon: <FileText size={20} /> },
      { path: '/checklist', label: 'Checklist', icon: <CheckSquare size={20} /> },
    ]},
    { title: "SISTEMA", items: [
      { path: '/archive', label: 'Arquivo', icon: <Archive size={20} /> },
      { path: '/trash', label: 'Lixeira', icon: <Trash2 size={20} /> },
      { path: '/settings', label: 'Configurações', icon: <Settings size={20} /> },
    ]}
  ];

  return (
    <>
      <div className="md:hidden fixed top-4 left-4 z-50 flex gap-4">
        <button onClick={toggle} className="p-3 bg-[#111827] text-[#007e7a] rounded-xl border border-gray-700 shadow-xl active:scale-95 transition-transform">
            <Menu size={24}/>
        </button>
      </div>
      {isOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fadeIn" onClick={toggle} />}
      <div className={`fixed inset-y-0 left-0 z-50 h-full flex flex-col bg-[#111827] text-gray-300 shadow-2xl border-r border-gray-800 transform transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static ${isCollapsed ? 'w-[5.5rem]' : 'w-72'}`}>
        <div className="h-28 flex items-center justify-center p-3 border-b border-gray-800 relative shrink-0">
            <div className="absolute top-2 left-2 z-50" ref={dropdownRef}>
                <button onClick={() => setShowNotifList(!showNotifList)} className={`relative p-2 rounded-full transition-all hover:bg-gray-800 ${showNotifList ? 'text-[#007e7a] bg-gray-800' : 'text-gray-400'}`} title="Notificações">
                    <Bell size={28} className={hasUrgent ? 'animate-swing text-red-500' : ''} />
                    {notifications.length > 0 && (
                        <span className={`absolute top-0 right-0 w-4 h-4 text-[9px] font-black flex items-center justify-center rounded-full border-2 border-[#111827] ${hasUrgent ? 'bg-red-600 text-white' : 'bg-[#007e7a] text-white'}`}>
                            {notifications.length > 9 ? '9+' : notifications.length}
                        </span>
                    )}
                </button>
                {showNotifList && (
                    <div className="absolute top-12 left-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fadeIn z-[60]">
                        <div className="bg-gray-100 p-3 border-b border-gray-200 flex justify-between items-center text-gray-800">
                            <span className="font-black text-xs uppercase flex items-center gap-2">Central de Alertas</span>
                            <button onClick={() => setShowNotifList(false)}><X size={14} className="hover:text-red-500"/></button>
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar bg-gray-50">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center text-gray-400">
                                    <CheckCircle size={24} className="mx-auto mb-2 opacity-20"/>
                                    <span className="text-[10px] font-bold uppercase">Sem notificações</span>
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div key={notif.id} onClick={() => handleNotificationClick(notif)} className={`p-3 border-b border-gray-100 hover:bg-white cursor-pointer transition-colors group ${notif.type === 'URGENT' ? 'bg-red-50/50' : ''}`}>
                                        <div className="flex items-start gap-2">
                                            <div className="mt-0.5">{getNotifIcon(notif.type)}</div>
                                            <div className="flex-1 min-w-0">
                                                <span className={`text-[10px] font-black uppercase truncate block ${notif.type === 'URGENT' ? 'text-red-700' : 'text-gray-800'}`}>{notif.title}</span>
                                                <p className="text-[9px] text-gray-500 font-bold uppercase leading-tight mt-0.5 line-clamp-2">{notif.message}</p>
                                                <span className="text-[8px] font-bold text-gray-400 block mt-1">{notif.date}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
            <div className={`transition-all duration-500 ${isCollapsed ? 'scale-75' : 'scale-100'}`}><Cube3D size="sm" /></div>
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-1/2 -translate-y-1/2 bg-[#111827] text-gray-400 p-1.5 rounded-full border border-gray-700 hover:text-white hover:bg-[#007e7a] hover:border-[#007e7a] transition-all shadow-lg z-20 hidden md:flex items-center justify-center">
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 space-y-2 custom-scrollbar px-3">
            {sections.map((section) => (
                <div key={section.title} className="space-y-1">
                    {!isCollapsed && <h3 className="px-4 text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 mt-4 animate-fadeIn">{section.title}</h3>}
                    {section.items.map((item) => (
                        <SidebarLink key={item.path} to={item.path} label={item.label} icon={item.icon} isCollapsed={isCollapsed} onClick={() => { if(window.innerWidth < 768) toggle(); }} />
                    ))}
                </div>
            ))}
        </nav>
        <div className="p-4 bg-gray-900 border-t border-gray-800 shrink-0 space-y-3">
            <div className={`flex gap-2 ${isCollapsed ? 'flex-col items-center' : 'flex-row'}`}>
                <button 
                    onClick={handleManualSync} 
                    disabled={isSyncing} 
                    className={`flex items-center justify-center gap-2 p-2 rounded-lg bg-gray-800 hover:bg-[#007e7a] text-gray-400 hover:text-white transition-all shadow-sm flex-1 ${isCollapsed ? 'w-10 h-10' : ''}`}
                    title="Sincronizar"
                >
                    <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                    {!isCollapsed && <span className="text-[10px] font-bold uppercase">Sync</span>}
                </button>
                <button 
                    onClick={handleClearCache} 
                    className={`flex items-center justify-center gap-2 p-2 rounded-lg bg-gray-800 hover:bg-red-600 text-gray-400 hover:text-white transition-all shadow-sm flex-1 ${isCollapsed ? 'w-10 h-10' : ''}`}
                    title="Limpar Cache"
                >
                    <Eraser size={16} />
                    {!isCollapsed && <span className="text-[10px] font-bold uppercase">Limpar</span>}
                </button>
            </div>
            
            <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="relative group cursor-default">
                    <div className="absolute inset-0 bg-[#007e7a] rounded-full blur opacity-40 group-hover:opacity-70 transition-opacity animate-pulse"></div>
                    <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-[#007e7a] to-[#005c97] flex items-center justify-center text-white font-black shadow-xl border-2 border-[#1f2937] ring-2 ring-[#007e7a] ring-offset-2 ring-offset-[#111827] transition-transform group-hover:scale-105">
                        <span className="text-lg drop-shadow-md select-none">{displayInitial}</span>
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#edb111] rounded-full border-2 border-[#111827] shadow-sm animate-bounce"></div>
                </div>
                {!isCollapsed && (
                    <div className="flex-1 min-w-0 animate-fadeIn">
                        <p className="text-sm font-black text-white uppercase truncate leading-tight tracking-wide">{displayName}</p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">{userRole}</p>
                    </div>
                )}
                <button onClick={handleLogoutClick} className="text-gray-500 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-white/5"><LogOut size={18} /></button>
            </div>
        </div>
      </div>
    </>
  );
};
