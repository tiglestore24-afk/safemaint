import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, User, ShieldCheck } from 'lucide-react';
import { StorageService } from '../services/storage';

interface LoginProps {
  onLogin: () => void;
}

// LOGO TEXTO VALE
const SafeMaintLogoFull = () => (
    <div className="flex items-center justify-center w-full h-full">
        <h1 className="font-black tracking-tighter" style={{ color: '#007e7a', fontSize: '4.5rem', lineHeight: '1' }}>VALE</h1>
    </div>
);

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
          setError('USUÁRIO OU SENHA INCORRETOS');
          setIsLoading(false);
        }
    } catch(e) {
        setError('ERRO DE CONEXÃO');
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center relative overflow-hidden">
      {/* Background Industrial Elements Animados */}
      <div className="absolute inset-0 z-0 opacity-10 animate-slide-diagonal" 
           style={{
             backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 10px, #10b981 10px, #10b981 20px)',
             backgroundSize: '40px 40px'
           }}>
      </div>
      
      {/* Overlay Radial para foco */}
      <div className="absolute inset-0 z-0 bg-radial-gradient from-transparent to-gray-900 pointer-events-none"></div>
      
      <div className="bg-gray-800 p-1 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 w-full max-w-md border-b-8 border-[#10b981] mx-4 animate-fade-in-up transform transition-transform hover:scale-[1.01] duration-500">
        <div className="bg-gray-900 rounded-xl p-8 border border-gray-700 relative overflow-hidden">
            
            {/* Efeito de brilho no topo */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#10b981] to-transparent opacity-50"></div>

            <div className="text-center mb-10 mt-6 flex flex-col items-center">
                <div className="inline-flex items-center justify-center w-36 h-36 bg-white rounded-full mb-4 shadow-[0_0_20px_rgba(16,185,129,0.3)] border-4 border-[#10b981] p-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <div className="animate-pulse">
                        <SafeMaintLogoFull />
                    </div>
                </div>
                
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none mt-2 animate-slide-in-right" style={{ animationDelay: '200ms' }}>
                    SAFEMAINT
                </h1>
                
                <div className="mt-2 mb-2 animate-slide-in-right" style={{ animationDelay: '300ms' }}>
                     <p className="text-[#fbbf24] font-black text-xs tracking-widest uppercase animate-pulse">
                        "A VIDA EM PRIMEIRO LUGAR"
                     </p>
                </div>
                
                <div className="inline-block bg-[#10b981]/10 px-4 py-2 rounded-full border border-[#10b981]/30 mt-3 shadow-inner animate-slide-in-right" style={{ animationDelay: '400ms' }}>
                    <p className="text-[10px] text-[#10b981] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                        <ShieldCheck size={12} /> GESTÃO À VISTA ONLINE
                    </p>
                </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="animate-slide-in-right" style={{ animationDelay: '500ms' }}>
                    <label className="block text-xs font-black text-[#10b981] uppercase mb-2 pl-1">Identificação / Login</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="text-gray-500 group-focus-within:text-[#10b981] transition-colors" size={20} />
                        </div>
                        <input 
                            type="text" 
                            value={user}
                            onChange={(e) => setUser(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white font-bold placeholder-gray-600 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all uppercase hover:bg-gray-750"
                            placeholder="USUÁRIO"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="animate-slide-in-right" style={{ animationDelay: '600ms' }}>
                    <label className="block text-xs font-black text-[#10b981] uppercase mb-2 pl-1">Senha de Acesso</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="text-gray-500 group-focus-within:text-[#10b981] transition-colors" size={20} />
                        </div>
                        <input 
                            type="password" 
                            value={pass}
                            onChange={(e) => setPass(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white font-bold placeholder-gray-600 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all uppercase hover:bg-gray-750"
                            placeholder="••••••"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-2 rounded font-bold text-xs text-center animate-pulse animate-slide-in-right">
                        {error}
                    </div>
                )}

                <div className="animate-slide-in-right" style={{ animationDelay: '700ms' }}>
                    <button 
                        type="submit"
                        disabled={isLoading}
                        className={`w-full bg-[#10b981] hover:bg-[#059669] text-white font-black py-4 rounded-lg shadow-lg hover:shadow-[#10b981]/40 transition-all transform active:scale-95 flex items-center justify-center gap-2 text-lg uppercase group relative overflow-hidden ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                    >
                        {/* Efeito de brilho no botão */}
                        <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1s_infinite]"></div>
                        
                        {isLoading ? (
                            <span className="flex items-center gap-2">ACESSANDO...</span>
                        ) : (
                            <>ACESSAR SISTEMA <ArrowRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" /></>
                        )}
                    </button>
                </div>
            </form>

            <div className="mt-8 text-center animate-slide-in-right" style={{ animationDelay: '800ms' }}>
                <p className="text-[10px] text-gray-500 font-bold uppercase">
                    Gestão Inteligente de Manutenção
                    <br/>
                    Segurança e Confiabilidade
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};