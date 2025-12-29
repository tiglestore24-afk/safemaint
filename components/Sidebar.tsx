
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  AlertTriangle, FileText, CheckSquare, Calendar, Archive, Clipboard, 
  Settings, Menu, X, LayoutDashboard, ChevronLeft, ChevronRight,
  MonitorPlay, LogOut, MessageSquare, FileInput, BarChart2
} from 'lucide-react';
import { Logo } from './Logo';
import { StorageService } from '../services/storage';

export const Sidebar: React.FC<{ isOpen: boolean; toggle: () => void; onLogout?: () => void; }> = ({ isOpen, toggle, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [sync, setSync] = useState(0);

  useEffect(() => {
    const hOnline = () => setIsOnline(true);
    const hOffline = () => setIsOnline(false);
    const check = () => setSync(StorageService.getPendingSyncCount());
    window.addEventListener('online', hOnline); window.addEventListener('offline', hOffline);
    window.addEventListener('safemaint_storage_update', check);
    return () => { window.removeEventListener('online', hOnline); window.removeEventListener('offline', hOffline); };
  }, []);
  
  const sections = [
    { title: "MONITOR", items: [
      { path: '/dashboard', label: 'Painel', icon: <LayoutDashboard size={18} /> },
      { path: '/chat', label: 'Chat', icon: <MessageSquare size={18} /> },
    ]},
    { title: "OPERACIONAL", items: [
      { path: '/om-management', label: 'Ordens (OM)', icon: <FileInput size={18} /> },
      { path: '/schedule', label: 'Agenda', icon: <Calendar size={18} /> },
      { path: '/availability', label: 'Histórico', icon: <BarChart2 size={18} /> },
      { path: '/art-emergencial', label: 'ART Emerg.', icon: <AlertTriangle size={18} /> },
      { path: '/art-atividade', label: 'ART Ativ.', icon: <FileText size={18} /> },
      { path: '/checklist', label: 'Checklist', icon: <CheckSquare size={18} /> },
    ]},
    { title: "SISTEMA", items: [
      { path: '/archive', label: 'Arquivo', icon: <Archive size={18} /> },
      { path: '/settings', label: 'Config', icon: <Settings size={18} /> },
    ]}
  ];

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 p-3 z-50">
        <button onClick={toggle} className="p-2 bg-vale-dark text-vale-green rounded-lg border border-vale-green"><Menu size={20}/></button>
      </div>

      <div className={`fixed inset-y-0 left-0 bg-vale-dark text-white transform transition-all duration-300 z-40 flex flex-col h-full border-r border-vale-green ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static ${isCollapsed ? 'w-14' : 'w-48'}`}>
        <div className="p-3 flex flex-col items-center bg-gray-950 border-b border-gray-800">
          <Logo size="sm" showText={!isCollapsed} light />
          {!isCollapsed && (
            <div className="mt-1 flex items-center gap-1.5 opacity-50">
                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-vale-green' : 'bg-red-500'}`}></div>
                <span className="text-[7px] font-black uppercase tracking-widest">{isOnline ? 'ON' : 'OFF'}</span>
                {sync > 0 && <span className="bg-vale-yellow text-black px-1 rounded-[2px] text-[6px] font-black">{sync} SYNC</span>}
            </div>
          )}
        </div>
        
        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-3">
          {sections.map((s, idx) => (
            <div key={idx}>
              {!isCollapsed && <h3 className="text-[7px] font-black text-gray-700 mb-1 px-2 uppercase">{s.title}</h3>}
              <div className="space-y-0.5">
                {s.items.map((i) => (
                  <NavLink key={i.path} to={i.path} className={({ isActive }) => `flex items-center gap-2.5 px-2 py-2 rounded-md transition-all ${isActive ? 'bg-vale-green text-white' : 'text-gray-500 hover:bg-white/5'} ${isCollapsed ? 'justify-center' : ''}`}>
                    <div>{i.icon}</div>
                    {!isCollapsed && <span className="text-[9px] font-black uppercase truncate">{i.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-2 border-t border-gray-900 bg-gray-950">
            <button onClick={onLogout} className="w-full flex items-center gap-2 p-2 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                <LogOut size={14} />
                {!isCollapsed && <span className="text-[8px] font-black uppercase">Sair</span>}
            </button>
        </div>

        <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-8 bg-vale-green text-white p-0.5 rounded-full hidden md:block">
            {isCollapsed ? <ChevronRight size={10} /> : <ChevronLeft size={10} />}
        </button>
      </div>
    </>
  );
};
