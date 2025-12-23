
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  AlertTriangle, FileText, CheckSquare, Calendar, Archive, Settings,
  Menu, X, LayoutDashboard, ChevronLeft, ChevronRight, LogOut,
  MessageSquare, FileInput, Wifi, Database
} from 'lucide-react';
import { checkConnection } from '../services/supabase';

export const Sidebar: React.FC<{ isOpen: boolean; toggle: () => void; onLogout?: () => void }> = ({ isOpen, toggle, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string>('OPERADOR');
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  useEffect(() => {
    setUserRole(localStorage.getItem('safemaint_role') || 'OPERADOR');
    const validate = async () => {
      if (navigator.onLine) {
        const status = await checkConnection();
        setDbConnected(status.success);
      } else setDbConnected(false);
    };
    validate();
    const int = setInterval(validate, 30000);
    return () => clearInterval(int);
  }, []);
  
  const sections = [
    {
      title: "PRINCIPAL",
      items: [
        { path: '/dashboard', label: 'Painel Geral', icon: <LayoutDashboard size={20} /> },
        { path: '/om-management', label: 'Menu de OMs', icon: <FileInput size={20} /> },
        { path: '/chat', label: 'Comunicação / Alerta', icon: <MessageSquare size={20} /> },
      ]
    },
    {
      title: "OPERAÇÃO DE CAMPO",
      items: [
        { path: '/art-emergencial', label: 'ART Emergencial', icon: <AlertTriangle size={20} /> },
        { path: '/art-atividade', label: 'ART da Atividade', icon: <FileText size={20} /> },
        { path: '/checklist', label: 'Checklist de Retorno', icon: <CheckSquare size={20} /> },
      ]
    },
    {
      title: "SISTEMA",
      items: [
        { path: '/archive', label: 'Arquivo Digital', icon: <Archive size={20} /> },
        { path: '/schedule', label: 'Programação', icon: <Calendar size={20} /> },
        ...(userRole === 'ADMIN' ? [{ path: '/settings', label: 'Configurações', icon: <Settings size={20} /> }] : []),
      ]
    }
  ];

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 p-4 z-50">
        <button onClick={toggle} className="p-3 bg-vale-darkgray text-vale-green rounded-xl shadow-2xl border-2 border-vale-green">
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className={`fixed inset-y-0 left-0 bg-vale-darkgray text-white transform transition-all duration-300 z-40 flex flex-col h-full shadow-2xl border-r-4 border-vale-green ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static ${isCollapsed ? 'w-20' : 'w-72'}`}>
        <div className="p-8 flex flex-col items-center justify-center border-b border-white/5">
          <div className="bg-white px-4 py-2 rounded-lg flex items-center justify-center mb-3 shadow-lg group hover:scale-105 transition-transform cursor-pointer">
             <h1 className="font-black text-vale-green text-3xl tracking-tighter">VALE</h1>
          </div>
          {!isCollapsed && <h1 className="text-xl font-black text-white tracking-widest uppercase">SAFEMAINT</h1>}
        </div>
        
        <nav className="flex-1 overflow-y-auto custom-scrollbar py-8 px-4 space-y-8">
          {sections.map((section, idx) => (
            <div key={idx}>
              {!isCollapsed && <h3 className="text-[10px] font-black text-vale-green/50 uppercase tracking-[0.3em] mb-4 px-2">{section.title}</h3>}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink 
                    key={item.path} 
                    to={item.path} 
                    onClick={() => { if(window.innerWidth < 768) toggle() }} 
                    className={({ isActive }) => `flex items-center gap-4 px-4 py-4 rounded-xl transition-all ${isActive ? 'bg-vale-green text-white shadow-[0_10px_20px_-5px_rgba(0,126,122,0.4)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'} ${isCollapsed ? 'justify-center' : ''}`}
                  >
                    <span className={`${isCollapsed ? '' : 'shrink-0'}`}>{item.icon}</span>
                    {!isCollapsed && <span className="text-[11px] font-black uppercase tracking-wider">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-6 bg-black/20 border-t border-white/5 space-y-4">
            <div className={`flex items-center gap-4 ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="flex flex-col gap-1">
                    <Wifi size={14} className={dbConnected ? "text-vale-green" : "text-vale-cherry animate-pulse"} />
                    <Database size={14} className={dbConnected ? "text-vale-green" : "text-vale-cherry"} />
                </div>
                {!isCollapsed && <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">CLOUD: {dbConnected ? 'ATIVO' : 'OFFLINE'}</div>}
            </div>
            <button onClick={onLogout} className={`w-full flex items-center gap-4 p-4 rounded-xl bg-vale-cherry/10 text-vale-cherry hover:bg-vale-cherry hover:text-white transition-all ${isCollapsed ? 'justify-center' : ''}`}>
                <LogOut size={18} />
                {!isCollapsed && <span className="text-[11px] font-black uppercase tracking-widest">SAIR</span>}
            </button>
        </div>

        <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-24 bg-vale-green text-white p-1 rounded-full shadow-lg border-2 border-vale-darkgray hidden md:block z-50 hover:scale-110 transition-transform">
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </>
  );
};
