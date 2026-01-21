
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, User, Activity, WifiOff, Database, UserPlus, CheckCircle, ArrowLeft } from 'lucide-react';
import { StorageService } from '../services/storage';
import { checkConnection } from '../services/supabase';
import { Logo } from '../components/Logo';
import { User as UserType } from '../types';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  // Login States
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  
  // Register States
  const [isRegistering, setIsRegistering] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMatricula, setNewMatricula] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // UI States
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
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
    setSuccessMsg('');
    
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
        } catch(e: any) {
            if (e.message === "ALREADY_LOGGED_IN") {
                setError('USUÁRIO JÁ LOGADO NO SISTEMA');
            } else {
                setError('Erro de conexão ou dados incorretos');
            }
            setIsLoading(false);
        }
    }, 800);
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
          setError('A senha deve ter no mínimo 3 caracteres.');
          return;
      }
      if (!newMatricula || !newName) {
          setError('Preencha todos os campos.');
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
              setSuccessMsg('Usuário cadastrado no banco de autenticação!');
              setUser(newUser.matricula);
              setPass('');
              setTimeout(() => {
                  setIsRegistering(false);
                  setIsLoading(false);
                  setSuccessMsg('');
              }, 2000);
          } else {
              setError(result.message);
              setIsLoading(false);
          }
      } catch (e) {
          setError('Erro ao cadastrar. Tente novamente.');
          setIsLoading(false);
      }
  };

  const toggleMode = () => {
      setIsRegistering(!isRegistering);
      setError('');
      setSuccessMsg('');
      if (!isRegistering) {
          setNewName('');
          setNewMatricula('');
          setNewPass('');
          setConfirmPass('');
      }
  };

  return (
    <div className="min-h-screen bg-[#111827] flex items-center justify-center font-sans overflow-hidden relative">
      
      {/* --- BACKGROUND LIMPO COM GRADIENTE SUTIL --- */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#111827] via-[#0f2530] to-[#003836]"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>

      <div className="w-full max-w-sm p-6 relative z-10">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border-t-8 border-[#007e7a] relative overflow-hidden transition-all duration-500 ease-in-out">
            
            <div className="absolute top-4 right-4">
                {isConnected === null ? (
                    <div className="animate-pulse bg-gray-100 p-1.5 rounded-full"><Activity size={12} className="text-gray-400"/></div>
                ) : isConnected ? (
                    <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full border border-green-200 shadow-sm" title="Conectado ao Banco de Dados">
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

            <div className="text-center mb-8 mt-2">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-gray-50 rounded-full shadow-inner border border-gray-200">
                        <Logo size="lg" />
                    </div>
                </div>
                <h1 className="text-xl font-black text-gray-800 uppercase tracking-tighter">
                    {isRegistering ? 'Novo Cadastro' : 'Acesso ao Sistema'}
                </h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-[0.2em]">
                    Gestão de Manutenção e Segurança
                </p>
            </div>

            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
                
                {isRegistering && (
                    <div className="space-y-1 group animate-fadeIn">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wide">Nome Completo</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-300">
                                <User size={18} strokeWidth={2.5} />
                            </div>
                            <input 
                                type="text" 
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-xs font-black text-gray-700 uppercase focus:border-[#007e7a] focus:bg-white focus:ring-0 outline-none transition-all placeholder:text-gray-300"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-1 group">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wide group-focus-within:text-[#007e7a] transition-colors">
                        {isRegistering ? 'Matrícula (Será seu Login)' : 'Matrícula / ID'}
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-300 group-focus-within:text-[#007e7a] transition-colors">
                            <User size={18} strokeWidth={2.5} />
                        </div>
                        <input 
                            type="text" 
                            value={isRegistering ? newMatricula : user}
                            onChange={(e) => isRegistering ? setNewMatricula(e.target.value) : setUser(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-xs font-black text-gray-700 uppercase focus:border-[#007e7a] focus:bg-white focus:ring-0 outline-none transition-all placeholder:text-gray-300"
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="space-y-1 group">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wide group-focus-within:text-[#007e7a] transition-colors">
                        {isRegistering ? 'Criar Senha' : 'Senha de Acesso'}
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-300 group-focus-within:text-[#007e7a] transition-colors">
                            <Lock size={18} strokeWidth={2.5} />
                        </div>
                        <input 
                            type="password" 
                            value={isRegistering ? newPass : pass}
                            onChange={(e) => isRegistering ? setNewPass(e.target.value) : setPass(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-xs font-black text-gray-700 uppercase focus:border-[#007e7a] focus:bg-white focus:ring-0 outline-none transition-all placeholder:text-gray-300"
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {isRegistering && (
                    <div className="space-y-1 group animate-fadeIn">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wide">Confirmar Senha</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-300">
                                <Lock size={18} strokeWidth={2.5} />
                            </div>
                            <input 
                                type="password" 
                                value={confirmPass}
                                onChange={(e) => setConfirmPass(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-xs font-black text-gray-700 uppercase focus:border-[#007e7a] focus:bg-white focus:ring-0 outline-none transition-all placeholder:text-gray-300"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[9px] font-black text-center border-l-4 border-red-500 uppercase flex items-center justify-center gap-2 animate-pulse">
                        <Activity size={12} /> {error}
                    </div>
                )}

                {successMsg && (
                    <div className="bg-green-50 text-green-600 px-4 py-2 rounded-xl text-[9px] font-black text-center border-l-4 border-green-500 uppercase flex items-center justify-center gap-2 animate-fadeIn">
                        <CheckCircle size={12} /> {successMsg}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isLoading}
                    className={`
                        w-full font-black py-3.5 rounded-xl uppercase text-xs flex items-center justify-center gap-3 transition-all duration-300 shadow-lg transform mt-4
                        ${isLoading ? 'bg-gray-100 text-gray-400 cursor-wait' : 'bg-[#007e7a] hover:bg-[#00605d] text-white hover:scale-[1.02] active:scale-95 hover:shadow-teal-500/30'}
                    `}
                >
                    {isLoading ? (
                        <>
                            <Database className="animate-pulse" size={16} />
                            <span>PROCESSANDO...</span>
                        </>
                    ) : isRegistering ? (
                        <>
                            <UserPlus size={16} strokeWidth={3} /> FINALIZAR CADASTRO
                        </>
                    ) : (
                        <>
                            ACESSAR SISTEMA <ArrowRight size={16} strokeWidth={3} />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <button 
                    onClick={toggleMode}
                    className="text-[10px] font-bold text-gray-500 hover:text-[#007e7a] uppercase tracking-wide underline decoration-gray-300 hover:decoration-[#007e7a] transition-all flex items-center justify-center gap-2 mx-auto"
                >
                    {isRegistering ? <><ArrowLeft size={10}/> Voltar para Login</> : 'Não tem conta? Cadastrar Novo Acesso'}
                </button>
            </div>
          </div>
          
          <div className="text-center mt-8 space-y-1">
             <div className="flex items-center justify-center gap-2 text-gray-500 opacity-60">
                 <Lock size={10} />
                 <p className="text-[9px] font-black uppercase tracking-widest">Conexão Segura SSL</p>
             </div>
             <p className="text-[9px] font-bold text-gray-600 uppercase opacity-40">Vale S.A &copy; 2024</p>
          </div>
      </div>
    </div>
  );
};
