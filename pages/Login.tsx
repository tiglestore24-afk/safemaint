
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, User, Settings, Wrench, Shield, Heart, Activity } from 'lucide-react';
import { StorageService } from '../services/storage';
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
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Timer para remover a Splash Screen
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setShowSplash(false), 800); // Aguarda a animação de fade terminar
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
        const authenticatedUser = await StorageService.validateUser(user, pass);

        if (authenticatedUser) {
          localStorage.setItem('safemaint_auth', 'true');
          localStorage.setItem('safemaint_user', authenticatedUser.login.toUpperCase());
          localStorage.setItem('safemaint_role', authenticatedUser.role);
          onLogin();
          navigate('/dashboard');
        } else {
          setError('CREDENCIAIS INVÁLIDAS');
          setIsLoading(false);
        }
    } catch(e) {
        setError('ERRO DE CONEXÃO');
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vale-dark flex items-center justify-center relative overflow-hidden font-sans">
      
      {/* --- SPLASH SCREEN (CONTRA CAPA) --- */}
      {showSplash && (
        <div className={`fixed inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-center transition-opacity duration-1000 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-vale-green/20 via-gray-900 to-black"></div>
            
            <div className="relative z-10 flex flex-col items-center animate-fade-in-up">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-vale-green blur-3xl opacity-20 rounded-full animate-pulse"></div>
                    
                    {/* CORAÇÃO COM SINAIS VITAIS */}
                    <div className="relative flex items-center justify-center">
                        <Heart 
                            size={120} 
                            className="text-white fill-vale-green/5 drop-shadow-[0_0_20px_rgba(0,126,122,0.6)]" 
                            strokeWidth={1.5} 
                        />
                        <Activity 
                            size={64} 
                            className="absolute text-vale-green animate-pulse" 
                            strokeWidth={3} 
                        />
                    </div>
                </div>
                
                <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-2 text-center drop-shadow-2xl">
                    A VIDA
                </h1>
                <h2 className="text-xl md:text-3xl font-black text-vale-green uppercase tracking-[0.2em] mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-vale-green via-white to-vale-green animate-shimmer bg-[length:200%_100%]">
                    EM PRIMEIRO LUGAR
                </h2>

                <div className="flex items-center gap-2 text-gray-500 text-[10px] font-mono font-bold tracking-widest mt-12">
                    <Activity size={12} className="text-vale-cherry animate-pulse"/>
                    CARREGANDO AMBIENTE SEGURO...
                </div>
            </div>
        </div>
      )}

      {/* --- BACKGROUND ANIMADO DA TELA DE LOGIN --- */}
      <div className="absolute inset-0 z-0 opacity-10" 
           style={{
             backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 10px, #007e7a 10px, #007e7a 20px)',
             backgroundSize: '40px 40px'
           }}>
      </div>
      
      {/* --- CARD DE LOGIN COMPACTO --- */}
      <div className="relative z-10 w-full max-w-sm mx-4">
          <div className="bg-gray-900/90 backdrop-blur-md rounded-2xl p-8 border border-gray-700 border-t-4 border-t-vale-green shadow-[0_0_40px_rgba(0,0,0,0.5)] animate-fade-in-up">
            
            <div className="text-center mb-6 flex flex-col items-center">
                
                {/* ANIMAÇÃO DA ENGRENAGEM (REDUZIDA) */}
                <div className="relative w-20 h-20 mb-4 group">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Settings 
                            className="text-gray-700 w-full h-full animate-[spin_10s_linear_infinite]" 
                            strokeWidth={0.5} 
                        />
                    </div>
                    <div className="absolute inset-3 flex items-center justify-center">
                        <Settings 
                            className="text-vale-green/30 w-full h-full animate-[spin_8s_linear_infinite_reverse]" 
                            strokeWidth={1} 
                        />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-gray-900 p-2 rounded-full border border-vale-green/30 shadow-[0_0_15px_rgba(0,126,122,0.3)] z-10">
                            <Wrench className="text-vale-green w-5 h-5 animate-pulse" strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    <Logo size="md" showText={false} />
                    <h1 className="text-2xl font-black text-white tracking-tight uppercase leading-none mt-2">
                        SAFE<span className="text-vale-green">MAINT</span>
                    </h1>
                    <p className="text-[9px] text-gray-500 font-bold tracking-[0.3em] uppercase mt-1">
                        Acesso Corporativo
                    </p>
                </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-500 uppercase ml-1 tracking-widest">Login</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="text-gray-500 group-focus-within:text-vale-green transition-colors" size={16} />
                        </div>
                        <input 
                            type="text" 
                            value={user}
                            onChange={(e) => setUser(e.target.value)}
                            className="block w-full pl-9 pr-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-bold placeholder-gray-600 focus:outline-none focus:border-vale-green focus:ring-1 focus:ring-vale-green transition-all uppercase"
                            placeholder="MATRÍCULA"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-500 uppercase ml-1 tracking-widest">Senha</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="text-gray-500 group-focus-within:text-vale-green transition-colors" size={16} />
                        </div>
                        <input 
                            type="password" 
                            value={pass}
                            onChange={(e) => setPass(e.target.value)}
                            className="block w-full pl-9 pr-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-bold placeholder-gray-600 focus:outline-none focus:border-vale-green focus:ring-1 focus:ring-vale-green transition-all uppercase"
                            placeholder="••••••"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-vale-cherry/10 border border-vale-cherry/30 text-vale-cherry px-3 py-2 rounded-lg font-bold text-[10px] text-center flex items-center justify-center gap-1 animate-pulse">
                        <Shield size={12} /> {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-vale-green hover:bg-emerald-600 text-white font-black py-3 rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 text-sm uppercase mt-2 group overflow-hidden relative"
                >
                    <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer"></div>
                    {isLoading ? (
                        <>
                            <Activity className="animate-spin" size={16} />
                            <span className="tracking-widest">ENTRANDO...</span>
                        </>
                    ) : (
                        <>
                            ACESSAR SISTEMA 
                            <ArrowRight size={16} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-800 text-center">
                <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest">
                    CONFIABILIDADE & SEGURANÇA
                </p>
            </div>
          </div>
      </div>
    </div>
  );
};
