
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  AlertTriangle, 
  FileText, 
  CheckSquare, 
  Calendar, 
  Archive, 
  Clipboard, 
  Settings,
  Menu,
  X,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  MonitorPlay,
  LogOut,
  UserCircle,
  MessageSquare,
  FileInput,
  Wifi,
  WifiOff,
  CloudUpload,
  RefreshCw
} from 'lucide-react';
import { Logo } from './Logo';
import { StorageService } from '../services/storage';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggle, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userName, setUserName] = useState<string>('USUÁRIO');
  const [userRole, setUserRole] = useState<string>('OPERADOR');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const storedUser = localStorage.getItem('safemaint_user');
    const storedRole = localStorage.getItem('safemaint_role');
    if (storedUser) setUserName(storedUser);
    if (storedRole) setUserRole(storedRole);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    // Listen for storage updates to check pending sync items
    const checkPending = () => {
        setPendingSync(StorageService.getPendingSyncCount());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('safemaint_storage_update', checkPending);
    
    // Initial check
    checkPending();

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('safemaint_storage_update', checkPending);
    };
  }, []);
  
  const sections = [
    {
      title: "PRINCIPAL",
      items: [
        { path: '/dashboard', label: 'Painel Geral', icon: <LayoutDashboard size={22} /> },
        { path: '/tv-schedule', label: 'TV Ao Vivo', icon: <MonitorPlay size={22} /> },
        { path: '/chat', label: 'Chat / Comunicação', icon: <MessageSquare size={22} /> },
      ]
    },
    {
      title: "OPERAÇÃO",
      items: [
        { path: '/om-management', label: 'Gestão de OMs', icon: <FileInput size={22} /> },
        { path: '/schedule', label: 'Programação', icon: <Calendar size={22} /> },
        { path: '/art-emergencial', label: 'ART Emergencial', icon: <AlertTriangle size={22} /> },
        { path: '/art-atividade', label: 'ART Atividade', icon: <FileText size={22} /> },
        { path: '/checklist', label: 'Check List', icon: <CheckSquare size={22} /> },
        { path: '/report', label: 'Relatório', icon: <Clipboard size={22} /> },
      ]
    },
    {
      title: "SISTEMA",
      items: [
        { path: '/archive', label: 'Arquivo Digital', icon: <Archive size={22} /> },
        ...(userRole === 'ADMIN' ? [{ path: '/settings', label: 'Configurações', icon: <Settings size={22} /> }] : []),
      ]
    }
  ];

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 p-4 z-50">
        <button onClick={toggle} className="p-3 bg-vale-dark text-vale-green rounded-xl shadow-xl border-2 border-vale-green">
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className={`
        fixed inset-y-0 left-0 
        bg-vale-dark text-white
        transform transition-all duration-300 z-40 flex flex-col h-full shadow-2xl border-r-4 border-vale-green
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static
        ${isCollapsed ? 'w-24' : 'w-64'} 
      `}>
        
        <div className="p-8 flex flex-col items-center justify-center bg-gray-900 border-b border-gray-800">
          <Logo size={isCollapsed ? 'sm' : 'md'} showText={!isCollapsed} light />
          
          {!isCollapsed && (
            <div className="mt-6 flex flex-col items-center gap-3 w-full">
              <div className="flex items-center justify-center gap-2 bg-vale-dark/50 rounded-full px-4 py-1.5 border border-white/5 w-fit">
                {isOnline ? (
                    <>
                        <Wifi size={12} className="text-vale-green animate-pulse" />
                        <span className="text-[10px] text-vale-green uppercase tracking-widest font-black">Online</span>
                    </>
                ) : (
                    <>
                         <WifiOff size={12} className="text-vale-cherry" />
                         <span className="text-[10px] text-vale-cherry uppercase tracking-widest font-black">Offline</span>
                    </>
                )}
              </div>
              
              {/* INDICADOR DE SYNC PENDENTE */}
              {pendingSync > 0 && (
                  <div className="flex items-center gap-2 bg-yellow-900/40 border border-yellow-700/50 rounded-full px-3 py-1 animate-pulse">
                      <CloudUpload size={12} className="text-yellow-500" />
                      <span className="text-[9px] text-yellow-500 font-bold uppercase">{pendingSync} PENDENTES</span>
                  </div>
              )}

              <p className="text-vale-yellow font-black text-[9px] tracking-[0.3em] uppercase opacity-80 text-center px-4 mt-2">
                "A Vida em Primeiro Lugar"
              </p>
            </div>
          )}
        </div>
        
        <nav className="flex-1 overflow-y-auto custom-scrollbar py-6 px-4 space-y-8">
          {sections.map((section, idx) => (
            <div key={idx} className="relative">
              {!isCollapsed && (
                <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="w-1.5 h-4 bg-vale-green rounded-full shadow-[0_0_10px_rgba(0,126,122,0.5)]"></div>
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                        {section.title}
                    </h3>
                </div>
              )}
              
              <div className="space-y-1.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={isCollapsed ? item.label : ''}
                    onClick={() => { if(window.innerWidth < 768) toggle() }}
                    className={({ isActive }) => `
                      flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group relative
                      ${isActive 
                        ? 'bg-vale-green text-white shadow-lg shadow-vale-green/20 scale-[1.02]' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'}
                      ${isCollapsed ? 'justify-center px-2' : ''}
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        <div className={`relative z-10 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-vale-green transition-colors'}`}>
                            {item.icon}
                        </div>
                        {!isCollapsed && (
                            <span className="text-sm font-black tracking-wide z-10 flex-1 truncate">{item.label}</span>
                        )}
                        {isActive && !isCollapsed && <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* COMPACT USER FOOTER */}
        <div className="p-3 bg-gray-900 border-t border-gray-800">
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''} mb-3`}>
                <div className="w-8 h-8 rounded-xl bg-vale-dark flex items-center justify-center border-2 border-gray-700 shadow-inner overflow-hidden flex-shrink-0">
                    <UserCircle className="text-gray-500" size={20} />
                </div>
                {!isCollapsed && (
                    <div className="overflow-hidden">
                        <p className="text-xs font-black text-white truncate uppercase tracking-tighter leading-tight">{userName}</p>
                        <p className="text-[9px] text-vale-green font-black uppercase tracking-widest">{userRole}</p>
                    </div>
                )}
            </div>
            
            <button
                onClick={onLogout}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300
                  bg-vale-cherry/10 hover:bg-vale-cherry text-vale-cherry hover:text-white border border-vale-cherry/20
                  ${isCollapsed ? 'justify-center' : ''}
                `}
            >
                <LogOut size={16} />
                {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sair</span>}
            </button>
        </div>

        <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-24 bg-vale-green text-white p-1 rounded-full shadow-xl border-2 border-vale-dark hover:scale-110 transition-transform z-50 hidden md:block"
        >
            {isCollapsed ? <ChevronRight size={16} strokeWidth={3} /> : <ChevronLeft size={16} strokeWidth={3} />}
        </button>
      </div>
    </>
  );
};
