
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, User, Activity, Settings, Cog, Wifi, WifiOff, Database, UserPlus, CheckCircle, ArrowLeft } from 'lucide-react';
import { StorageService } from '../services/storage';
import { checkConnection } from '../services/supabase';
import { Cube3D } from '../components/Cube3D';
import { User as UserType } from '../types';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  // CRÍTICO: Recupera o último login salvo para não ter que digitar toda hora
  const [user, setUser] = useState(() => localStorage.getItem('safemaint_last_login') || '');
  const [pass, setPass] = useState('');
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMatricula, setNewMatricula] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const displayChar = isRegistering 
    ? (newName.trim() ? newName.trim().charAt(0).toUpperCase() : '') 
    : (user.trim() ? user.trim().charAt(0).toUpperCase() : '');

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
    
    setTimeout(async () => {
        try {
            const authenticatedUser = await StorageService.validateUser(user, pass);

            if (authenticatedUser) {
              // Salva a matrícula para o próximo acesso (Auto-fill)
              localStorage.setItem('safemaint_last_login', authenticatedUser.login.toUpperCase());
              
              localStorage.setItem('safemaint_auth', 'true');
              localStorage.setItem('safemaint_user', authenticatedUser.login.toUpperCase());
              localStorage.setItem('safemaint_role', authenticatedUser.role);
              onLogin();
              navigate('/dashboard');
            } else {
              setError('Credenciais inválidas');
              setIsLoading(false);
            }
        } catch(e: any) {
            setError('Erro de conexão ou dados incorretos');
            setIsLoading(false);
        }
    }, 600);
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setSuccessMsg('');

      if (newPass !== confirmPass) {
          setError('As senhas não conferem.');
          return;
      }
      if (newPass.length < 3) {
          setError('Mínimo 3 caracteres.');
          return;
      }

      setIsLoading(true);

      const newUser: UserType = {
          id: crypto.randomUUID(),
          name: newName.toUpperCase(),
          matricula: newMatricula.toUpperCase(),
          login: newMatricula.toUpperCase(),
          password: newPass,
          role: 'OPERADOR'
      };

      try {
          const result = await StorageService.registerUser(newUser);
          if (result.success) {
              setSuccessMsg('Usuário cadastrado com sucesso!');
              setUser(newUser.matricula);
              setTimeout(() => {
                  setIsRegistering(false);
                  setIsLoading(false);
              }, 1500);
          } else {
              setError(result.message);
              setIsLoading(false);
          }
      } catch (e) {
          setError('Erro ao cadastrar.');
          setIsLoading(false);
      }
  };

  const toggleMode = () => {
      setIsRegistering(!isRegistering);
      setError('');
      setSuccessMsg('');
  };

  return (
    <div className="min-h-screen bg-vale-dark flex items-center justify-center font-sans overflow-hidden relative">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 opacity-[0.03] text-white animate-spin-slow">
              <Settings size={400} strokeWidth={0.5} />
          </div>
          <div className="absolute -bottom-32 -right-32 opacity-[0.03] text-vale-yellow animate-spin-reverse-slow">
              <Cog size={500} strokeWidth={0.5} />
          </div>
      </div>

      <div className="w-full max-w-sm p-6 relative z-10">
          <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-10 border-t-8 border-vale-green relative overflow-hidden transition-all">
            
            <div className="absolute top-4 right-4">
                {isConnected === null ? (
                    <div className="animate-pulse bg-gray-100 p-1.5 rounded-full"><Activity size={12} className="text-gray-400"/></div>
                ) : isConnected ? (
                    <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full border border-green-200" title="Banco Online">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-[8px] font-black text-green-700 uppercase">Online</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-full border border-red-200" title="Banco Offline">
                        <WifiOff size={10} className="text-red-500"/>
                        <span className="text-[8px] font-black text-red-700 uppercase">Offline</span>
                    </div>
                )}
            </div>

            <div className="text-center mb-8">
                <div className="flex justify-center mb-6 h-24 items-center">
                    {displayChar ? (
                        <div className="relative animate-fadeIn">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#007e7a] to-[#005c97] flex items-center justify-center shadow-2xl border-4 border-white">
                                <span className="text-5xl font-black text-white select-none">{displayChar}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="scale-90 animate-fadeIn"><Cube3D size="md" /></div>
                    )}
                </div>
                <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">
                    {isRegistering ? 'Novo Registro' : 'Acesso SafeMaint'}
                </h1>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gestão de Manutenção de Ativos</p>
            </div>

            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
                {isRegistering && (
                    <div className="space-y-1">
                        <label className="block text-[9px] font-black text-gray-400 uppercase ml-1">Nome Completo</label>
                        <input 
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="block w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black text-gray-700 uppercase focus:border-vale-green outline-none transition-all"
                            required
                        />
                    </div>
                )}

                <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase ml-1">Matrícula (Login)</label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input 
                            type="text" 
                            value={isRegistering ? newMatricula : user}
                            onChange={(e) => isRegistering ? setNewMatricula(e.target.value) : setUser(e.target.value)}
                            className="block w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black text-gray-700 uppercase focus:border-vale-green outline-none transition-all"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase ml-1">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input 
                            type="password" 
                            value={isRegistering ? newPass : pass}
                            onChange={(e) => isRegistering ? setNewPass(e.target.value) : setPass(e.target.value)}
                            className="block w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black text-gray-700 uppercase focus:border-vale-green outline-none transition-all"
                            required
                        />
                    </div>
                </div>

                {isRegistering && (
                    <div className="space-y-1">
                        <label className="block text-[9px] font-black text-gray-400 uppercase ml-1">Confirmar Senha</label>
                        <input 
                            type="password" 
                            value={confirmPass}
                            onChange={(e) => setConfirmPass(e.target.value)}
                            className="block w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black text-gray-700 uppercase focus:border-vale-green outline-none transition-all"
                            required
                        />
                    </div>
                )}

                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[9px] font-black text-center border-l-4 border-red-500 uppercase">{error}</div>}
                {successMsg && <div className="bg-green-50 text-green-600 px-4 py-2 rounded-xl text-[9px] font-black text-center border-l-4 border-green-500 uppercase">{successMsg}</div>}

                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full font-black py-4 bg-vale-green hover:bg-[#00605d] text-white rounded-2xl uppercase text-xs flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 disabled:bg-gray-200"
                >
                    {isLoading ? 'AGUARDE...' : isRegistering ? 'CADASTRAR' : 'ENTRAR NO SISTEMA'}
                </button>
            </form>

            <button 
                onClick={toggleMode}
                className="w-full mt-6 text-[10px] font-bold text-gray-400 hover:text-vale-green uppercase tracking-widest underline underline-offset-4"
            >
                {isRegistering ? 'Voltar ao Login' : 'Novo por aqui? Criar Acesso'}
            </button>
          </div>
          <p className="text-center mt-8 text-[8px] font-black text-gray-600 uppercase tracking-[0.3em] opacity-40">Vale S.A &copy; 2024</p>
      </div>
    </div>
  );
};
