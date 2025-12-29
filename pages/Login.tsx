
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, User, Settings, Shield, Heart, Activity, Box, Zap } from 'lucide-react';
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
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setShowSplash(false), 1000);
    }, 4000);

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
          setError('ACESSO NEGADO: CREDENCIAIS INCORRETAS');
          setIsLoading(false);
        }
    } catch(e) {
        setError('ERRO DE COMUNICAÇÃO COM O SERVIDOR');
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05080a] flex items-center justify-center relative overflow-hidden font-sans perspective-[1200px]">
      
      {/* --- BACKGROUND 3D: PERSPECTIVE GRID --- */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {/* Animated Grid Floor */}
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[150%] opacity-20"
            style={{
                background: 'linear-gradient(transparent 0%, #007e7a 100%), repeating-linear-gradient(0deg, #007e7a 0px, #007e7a 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #007e7a 0px, #007e7a 1px, transparent 1px, transparent 40px)',
                transform: 'rotateX(60deg) translateY(50%)',
                transformOrigin: 'center bottom',
                animation: 'gridMove 20s linear infinite'
            }}
          ></div>
          
          {/* Glowing Ambient Orbs */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-vale-green/10 blur-[120px] rounded-full animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-vale-blue/10 blur-[120px] rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* --- SPLASH SCREEN 3D --- */}
      {showSplash && (
        <div className={`fixed inset-0 z-[100] bg-[#05080a] flex flex-col items-center justify-center transition-all duration-1000 ${fadeOut ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100'}`}>
            <div className="relative z-10 flex flex-col items-center transform-gpu scale-100 translate-z-0">
                <div className="relative mb-12 group">
                    {/* Glow Backlight */}
                    <div className="absolute inset-[-40px] bg-vale-green blur-[60px] opacity-20 rounded-full group-hover:opacity-40 transition-opacity animate-pulse"></div>
                    
                    {/* 3D FLOATING HEART ICON */}
                    <div className="relative flex items-center justify-center animate-float-3d">
                        <Heart 
                            size={160} 
                            className="text-white fill-vale-green/10 drop-shadow-[0_0_35px_rgba(0,126,122,0.8)]" 
                            strokeWidth={1} 
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Activity 
                                size={80} 
                                className="text-vale-green animate-heartbeat drop-shadow-[0_0_15px_rgba(22,163,74,1)]" 
                                strokeWidth={3} 
                            />
                        </div>
                        {/* Scanning Bar Effect */}
                        <div className="absolute inset-x-0 h-1 bg-vale-green/50 shadow-[0_0_15px_rgba(0,126,122,1)] animate-scan-y top-0"></div>
                    </div>
                </div>
                
                <div className="text-center space-y-2 translate-y-4 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                    <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-[-0.05em] leading-none">
                        A VIDA EM PRIMEIRO
                    </h1>
                    <h2 className="text-2xl md:text-4xl font-black text-vale-green uppercase tracking-[0.4em] bg-clip-text text-transparent bg-gradient-to-r from-vale-green via-white to-vale-green animate-shimmer bg-[length:200%_100%]">
                        LUGAR
                    </h2>
                </div>

                <div className="flex flex-col items-center gap-3 mt-16 opacity-0 animate-fade-in" style={{ animationDelay: '1.2s' }}>
                    <div className="flex items-center gap-2 text-vale-green text-[10px] font-mono font-black tracking-[0.3em]">
                        <div className="w-1 h-1 bg-vale-green rounded-full animate-ping"></div>
                        AMBIENTE SEGURO ATIVO
                    </div>
                    <div className="w-48 h-[2px] bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-vale-green animate-progress-full shadow-[0_0_10px_rgba(0,126,122,1)]"></div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- MAIN LOGIN HUD (3D CARD) --- */}
      <div className="relative z-10 w-full max-w-sm mx-4 transform-gpu transition-all duration-700 animate-tilt-in">
          <div className="bg-gray-900/60 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8),inset_0_0_1px_1px_rgba(255,255,255,0.1)] relative overflow-hidden group">
            
            {/* Glossy Reflection Overlay */}
            <div className="absolute top-[-100%] left-[-100%] w-[300%] h-[300%] bg-gradient-to-br from-white/10 via-transparent to-transparent rotate-45 pointer-events-none transition-transform duration-1000 group-hover:translate-x-10 group-hover:translate-y-10"></div>
            
            <div className="text-center mb-8 flex flex-col items-center relative z-10">
                <div className="mb-6 relative">
                    {/* Animated Industrial Gears */}
                    <div className="relative w-28 h-28 flex items-center justify-center">
                        <Settings 
                            className="text-[#007e7a] w-full h-full animate-[spin_10s_linear_infinite] opacity-50" 
                            strokeWidth={1} 
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                             <Settings 
                                size={56}
                                className="text-[#edb111] animate-[spin_6s_linear_infinite_reverse]" 
                                strokeWidth={2} 
                            />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                             <Box 
                                size={24}
                                className="text-white animate-pulse" 
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    <Logo size="md" showText={false} />
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mt-4">
                        SAFE<span className="text-vale-green">MAINT</span>
                    </h1>
                    <div className="mt-2 flex items-center gap-2">
                        <div className="h-[1px] w-4 bg-vale-green/50"></div>
                        <p className="text-[10px] text-gray-400 font-black tracking-[0.3em] uppercase">Módulo de Gestão</p>
                        <div className="h-[1px] w-4 bg-vale-green/50"></div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5 relative z-10">
                <div className="space-y-2">
                    <label className="block text-[9px] font-black text-gray-500 uppercase ml-4 tracking-[0.2em]">Identificação</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <User className="text-gray-500 group-focus-within:text-vale-green transition-colors" size={18} />
                        </div>
                        <input 
                            type="text" 
                            value={user}
                            onChange={(e) => setUser(e.target.value)}
                            className="block w-full pl-12 pr-4 py-4 bg-black/40 border border-white/5 rounded-2xl text-white text-sm font-bold placeholder-gray-600 focus:outline-none focus:border-vale-green focus:ring-1 focus:ring-vale-green transition-all uppercase shadow-inner"
                            placeholder="MATRÍCULA"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-[9px] font-black text-gray-500 uppercase ml-4 tracking-[0.2em]">Credencial de Segurança</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Lock className="text-gray-500 group-focus-within:text-vale-green transition-colors" size={18} />
                        </div>
                        <input 
                            type="password" 
                            value={pass}
                            onChange={(e) => setPass(e.target.value)}
                            className="block w-full pl-12 pr-4 py-4 bg-black/40 border border-white/5 rounded-2xl text-white text-sm font-bold placeholder-gray-600 focus:outline-none focus:border-vale-green focus:ring-1 focus:ring-vale-green transition-all uppercase shadow-inner"
                            placeholder="••••••"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-vale-cherry/10 border border-vale-cherry/30 text-vale-cherry px-4 py-3 rounded-2xl font-black text-[10px] text-center flex items-center justify-center gap-2 animate-bounce-in">
                        <Shield size={14} /> {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full group/btn relative overflow-hidden bg-gradient-to-r from-vale-green to-teal-600 hover:to-vale-green text-white font-black py-4 rounded-2xl shadow-[0_10px_20px_rgba(0,126,122,0.3)] transition-all transform active:scale-95 flex items-center justify-center gap-3 text-sm uppercase mt-4"
                >
                    {/* Button Glow Effect */}
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                    <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover/btn:animate-shimmer"></div>
                    
                    {isLoading ? (
                        <>
                            <Activity className="animate-spin" size={18} />
                            <span className="tracking-widest">Sincronizando...</span>
                        </>
                    ) : (
                        <>
                            Entrar no Sistema 
                            <ArrowRight size={18} strokeWidth={3} className="group-hover/btn:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-10 pt-6 border-t border-white/5 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-2">
                    <Zap size={14} className="text-vale-yellow" />
                    <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest leading-none">High Reliability<br/>v3.4.0-Stable</p>
                </div>
                <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5">
                    <p className="text-[8px] text-vale-green font-black uppercase tracking-tighter">Secure Link</p>
                </div>
            </div>
          </div>
          
          {/* Decorative 3D elements behind the card */}
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-vale-blue/20 blur-2xl rounded-full -z-10 animate-pulse-slow"></div>
          <div className="absolute -top-4 -left-4 w-24 h-24 bg-vale-green/20 blur-2xl rounded-full -z-10 animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <style>{`
        @keyframes gridMove {
            0% { background-position: 0 0; }
            100% { background-position: 0 400px; }
        }
        @keyframes float-3d {
            0%, 100% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); }
            50% { transform: translateY(-20px) rotateX(5deg) rotateY(5deg); }
        }
        @keyframes heartbeat {
            0%, 100% { transform: scale(1); opacity: 1; }
            15% { transform: scale(1.15); opacity: 0.8; }
            30% { transform: scale(1.05); opacity: 0.9; }
            45% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes scan-y {
            0% { top: 0%; opacity: 0; }
            50% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        @keyframes tilt-in {
            from { opacity: 0; transform: rotateX(20deg) translateY(40px) scale(0.9); }
            to { opacity: 1; transform: rotateX(0deg) translateY(0) scale(1); }
        }
        @keyframes progress-full {
            0% { width: 0%; }
            100% { width: 100%; }
        }
        .animate-float-3d {
            animation: float-3d 6s ease-in-out infinite;
        }
        .animate-heartbeat {
            animation: heartbeat 2s ease-in-out infinite;
        }
        .animate-scan-y {
            animation: scan-y 3s linear infinite;
        }
        .animate-tilt-in {
            animation: tilt-in 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .animate-progress-full {
            animation: progress-full 3s ease-in-out forwards;
        }
        .animate-pulse-slow {
            animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};
