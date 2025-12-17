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
  WifiOff
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
  onLogout?: () => void;
}

// LOGO VALE - High Visibility
const SafeMaintLogo = ({ className }: { className?: string }) => (
    <div className={`flex items-center justify-center ${className}`}>
        <h1 className="font-black tracking-tighter" style={{ color: '#007e7a', fontSize: '3rem', lineHeight: '1' }}>VALE</h1>
    </div>
);

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggle, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userName, setUserName] = useState<string>('USUÁRIO');
  const [userRole, setUserRole] = useState<string>('OPERADOR');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const storedUser = localStorage.getItem('safemaint_user');
    const storedRole = localStorage.getItem('safemaint_role');
    if (storedUser) setUserName(storedUser);
    if (storedRole) setUserRole(storedRole);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
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
        <button onClick={toggle} className="p-3 bg-gray-900 text-[#10b981] rounded-lg shadow-xl border-2 border-[#10b981]">
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className={`
        fixed inset-y-0 left-0 
        bg-[#111827] text-white
        bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]
        transform transition-all duration-300 z-40 flex flex-col h-full shadow-[10px_0_30px_-10px_rgba(0,0,0,0.8)] border-r-4 border-[#10b981]
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static
        ${isCollapsed ? 'w-24' : 'w-80'}
      `}>
        
        <div className="p-6 flex flex-col items-center justify-center bg-gray-900 relative border-b border-gray-800">
          <div className="w-24 h-20 bg-white rounded-lg flex items-center justify-center border-4 border-gray-800 mb-2 p-2 shadow-lg shadow-green-900/20">
             <SafeMaintLogo className="w-full h-full" />
          </div>
          
          <div className={`text-center transition-all duration-300 overflow-hidden ${isCollapsed ? 'opacity-0 h-0 scale-0' : 'opacity-100 h-auto scale-100'}`}>
             <h1 className="text-2xl font-black tracking-tight text-white whitespace-nowrap mt-2">
                SAFEMAINT
            </h1>
             
             <div className="mt-2 mb-3">
                 <p className="text-[#fbbf24] font-black text-[10px] tracking-widest whitespace-nowrap animate-pulse">
                    "A VIDA EM PRIMEIRO LUGAR"
                 </p>
             </div>

             <div className="flex items-center justify-center gap-2 mt-2 bg-gray-800 rounded-full px-3 py-1">
                {isOnline ? (
                    <>
                        <Wifi size={12} className="text-[#10b981] animate-pulse" />
                        <span className="text-[10px] text-[#10b981] uppercase tracking-widest font-bold">ONLINE</span>
                    </>
                ) : (
                    <>
                         <WifiOff size={12} className="text-red-500" />
                         <span className="text-[10px] text-red-500 uppercase tracking-widest font-bold">OFFLINE</span>
                    </>
                )}
            </div>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto custom-scrollbar py-2 px-3 space-y-6 mt-2">
          {sections.map((section, idx) => (
            <div key={idx} className="relative">
              {!isCollapsed && (
                <div className="flex items-center gap-2 mb-2 px-4">
                    <div className="w-1 h-3 bg-[#10b981] rounded-full"></div>
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                        {section.title}
                    </h3>
                </div>
              )}
              {isCollapsed && <div className="h-px bg-gray-800 mx-4 my-2"></div>}
              
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={isCollapsed ? item.label : ''}
                    onClick={() => { if(window.innerWidth < 768) toggle() }}
                    className={({ isActive }) => `
                      flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden
                      ${isActive 
                        ? 'bg-gradient-to-r from-green-900 to-gray-900 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-[#10b981]' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent'}
                      ${isCollapsed ? 'justify-center px-2' : ''}
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        <div className="relative z-10 flex-shrink-0">
                            <span className={`${isActive ? 'text-[#10b981]' : 'text-gray-500 group-hover:text-[#10b981] transition-colors'}`}>
                            {item.icon}
                            </span>
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 flex justify-between items-center z-10">
                                <span className={`text-sm font-black tracking-wide ${isActive ? 'text-white' : ''}`}>{item.label}</span>
                                {isActive && <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 bg-gray-900/80 border-t border-gray-800 backdrop-blur-sm">
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''} mb-3 transition-all`}>
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600 shadow-inner">
                    <UserCircle className="text-gray-400" size={24} />
                </div>
                {!isCollapsed && (
                    <div className="overflow-hidden">
                        <p className="text-sm font-black text-white truncate">{userName}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">{userRole}</p>
                    </div>
                )}
            </div>
            
            <button
                onClick={onLogout}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group 
                  bg-red-900/20 hover:bg-red-600 border border-red-900/50 hover:border-red-500 text-red-400 hover:text-white
                  ${isCollapsed ? 'justify-center' : ''}
                `}
            >
                <LogOut size={20} />
                {!isCollapsed && <span className="text-xs font-black uppercase tracking-wider">ENCERRAR SESSÃO</span>}
            </button>
        </div>

        <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-20 bg-[#10b981] text-white p-1 rounded-full shadow-lg border-2 border-gray-900 hover:scale-110 transition-transform z-50 hidden md:block"
        >
            {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
        </button>
      </div>
    </>
  );
};