
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, User, Activity, Settings, Cog, Wifi, WifiOff, Database } from 'lucide-react';
import { StorageService } from '../services/storage';
import { checkConnection } from '../services/supabase';
import { Logo } from '../components/Logo';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
      const verify = async () => {
          const online = await checkConnection();
          setIsConnected(online);
      };
      verify();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Pequeno delay para efeito visual da engrenagem rodando e garantir I/O
    setTimeout(async () => {
        try {
            const authenticatedUser = await StorageService.validateUser(user, pass);

            if (authenticatedUser) {
              localStorage.setItem('safemaint_auth', 'true');
              localStorage.setItem('safemaint_user', authenticatedUser.login.toUpperCase());
              localStorage.setItem('safemaint_role', authenticatedUser.role);
              onLogin();
              navigate('/dashboard');
            } else {
              setError('Credenciais inválidas');
              setIsLoading(false);
            }
        } catch(e) {
            setError('Erro de conexão');
            setIsLoading(false);
        }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-vale-dark flex items-center justify-center font-sans overflow-hidden relative">
      
      {/* --- BACKGROUND ANIMADO DE ENGRENAGENS --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Engrenagem Gigante Superior Esquerda */}
          <div className="absolute -top-24 -left-24 opacity-[0.03] text-white animate-spin-slow">
              <Settings size={400} strokeWidth={0.5} />
          </div>
          {/* Engrenagem Gigante Inferior Direita */}
          <div className="absolute -bottom-32 -right-32 opacity-[0.03] text-vale-yellow animate-spin-reverse-slow">
              <Cog size={500} strokeWidth={0.5} />
          </div>
          {/* Detalhes de Fundo */}
          <div className="absolute top-1/4 left-10 w-2 h-2 bg-vale-green rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute bottom-1/3 right-20 w-3 h-3 bg-vale-yellow rounded-full opacity-20 animate-pulse delay-75"></div>
      </div>

      <div className="w-full max-w-sm p-6 relative z-10">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8 border-t-8 border-vale-green relative overflow-hidden">
            
            {/* Faixa decorativa topo */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-vale-green via-vale-yellow to-vale-green"></div>

            {/* Status Connection Badge */}
            <div className="absolute top-4 right-4">
                {isConnected === null ? (
                    <div className="animate-pulse bg-gray-100 p-1.5 rounded-full"><Activity size={12} className="text-gray-400"/></div>
                ) : isConnected ? (
                    <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full border border-green-200 shadow-sm" title="Conectado ao Supabase">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-[8px] font-black text-green-700 uppercase tracking-wider">Online</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-full border border-red-200 shadow-sm" title="Modo Offline">
                        <WifiOff size={10} className="text-red-500"/>
                        <span className="text-[8px] font-black text-red-700 uppercase tracking-wider">Offline</span>
                    </div>
                )}
            </div>

            <div className="text-center mb-8">
                <div className="flex justify-center mb-6 scale-110">
                    <Logo size="md" showText={true} />
                </div>
                <div className="relative inline-block">
                    <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter relative z-10">SafeMaint</h1>
                    <div className="absolute -bottom-1 left-0 w-full h-2 bg-vale-yellow/30 -skew-x-12 z-0"></div>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 tracking-[0.2em]">Gestão de Manutenção Industrial</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1 group">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wide group-focus-within:text-vale-green transition-colors">Matrícula / ID</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-300 group-focus-within:text-vale-green transition-colors">
                            <User size={18} strokeWidth={2.5} />
                        </div>
                        <input 
                            type="text" 
                            value={user}
                            onChange={(e) => setUser(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-black text-gray-700 uppercase focus:border-vale-green focus:bg-white focus:ring-0 outline-none transition-all placeholder:text-gray-300"
                            placeholder="810259XX"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="space-y-1 group">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wide group-focus-within:text-vale-green transition-colors">Senha de Acesso</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-300 group-focus-within:text-vale-green transition-colors">
                            <Lock size={18} strokeWidth={2.5} />
                        </div>
                        <input 
                            type="password" 
                            value={pass}
                            onChange={(e) => setPass(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-black text-gray-700 uppercase focus:border-vale-green focus:bg-white focus:ring-0 outline-none transition-all placeholder:text-gray-300"
                            placeholder="••••••"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-[10px] font-black text-center border-l-4 border-red-500 uppercase flex items-center justify-center gap-2 animate-pulse">
                        <Activity size={14} /> {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isLoading}
                    className={`
                        w-full font-black py-4 rounded-xl uppercase text-xs flex items-center justify-center gap-3 transition-all duration-300 shadow-lg transform
                        ${isLoading ? 'bg-gray-100 text-gray-400 cursor-wait' : 'bg-vale-green hover:bg-[#00605d] text-white hover:scale-[1.02] active:scale-95 hover:shadow-vale-green/30'}
                    `}
                >
                    {isLoading ? (
                        <>
                            <Database className="animate-pulse" size={18} />
                            <span>AUTENTICANDO...</span>
                        </>
                    ) : (
                        <>
                            ACESSAR SISTEMA <ArrowRight size={18} strokeWidth={3} />
                        </>
                    )}
                </button>
            </form>
          </div>
          
          <div className="text-center mt-8 space-y-1">
             <div className="flex items-center justify-center gap-2 text-gray-600 opacity-60">
                 <Lock size={10} />
                 <p className="text-[9px] font-black uppercase tracking-widest">Conexão Segura</p>
             </div>
             <p className="text-[9px] font-bold text-gray-600 uppercase opacity-40">Vale S.A &copy; 2024</p>
          </div>
      </div>
    </div>
  );
};
