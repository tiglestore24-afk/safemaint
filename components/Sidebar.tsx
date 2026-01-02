
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  AlertTriangle, FileText, CheckSquare, Calendar, Archive,
  Settings, Menu, LayoutDashboard, ChevronLeft, ChevronRight,
  MessageSquare, FileInput, BarChart2, LogOut
} from 'lucide-react';
import { Logo } from './Logo';

export const Sidebar: React.FC<{ isOpen: boolean; toggle: () => void; onLogout?: () => void }> = ({ isOpen, toggle, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
      setUserName(localStorage.getItem('safemaint_user') || 'USUÁRIO');
      setUserRole(localStorage.getItem('safemaint_role') || 'OPERADOR');
  }, []);
  
  const sections = [
    { title: "PRINCIPAL", items: [
      { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { path: '/chat', label: 'Comunicação', icon: <MessageSquare size={20} /> },
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
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button 
            onClick={toggle} 
            className="p-3 bg-gradient-to-br from-gray-800 to-gray-900 text-[#007e7a] rounded-xl border border-gray-700 shadow-xl active:scale-95 transition-transform"
        >
            <Menu size={24}/>
        </button>
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
        <div className="relative h-24 flex items-center justify-center border-b border-gray-800/50 bg-gray-900/30">
            <div className={`transition-all duration-300 ${isCollapsed ? 'scale-75' : 'scale-100'}`}>
                 <Logo size={isCollapsed ? "sm" : "md"} showText={!isCollapsed} light />
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
                onClick={onLogout}
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
    </>
  );
};
