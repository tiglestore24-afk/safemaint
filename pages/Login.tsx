
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, User, Activity, Settings, Cog, Wifi, WifiOff, Database, UserPlus, CheckCircle, ArrowLeft } from 'lucide-react';
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

  // Avatar Logic
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
    setSuccessMsg('');
    
    // Simula um delay mínimo para feedback visual
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
          login: newMatricula.toUpperCase(), // Login padrão é a matrícula
          password: newPass,
          role: 'OPERADOR' // Default role para novos cadastros
      };

      try {
          const result = await StorageService.registerUser(newUser);
          if (result.success) {
              setSuccessMsg('Usuário cadastrado no banco de autenticação!');
              // Auto-fill login para facilitar
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
      // Limpa campos de cadastro ao trocar
      if (!isRegistering) {
          setNewName('');
          setNewMatricula('');
          setNewPass('');
          setConfirmPass('');
      }
  };

  return (
    <div className="min-h-screen bg-vale-dark flex items-center justify-center font-sans overflow-hidden relative">
      
      {/* --- BACKGROUND ANIMADO DE ENGRENAGENS --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 opacity-[0.03] text-white animate-spin-slow">
              <Settings size={400} strokeWidth={0.5} />
          </div>
          <div className="absolute -bottom-32 -right-32 opacity-[0.03] text-vale-yellow animate-spin-reverse-slow">
              <Cog size={500} strokeWidth={0.5} />
          </div>
          <div className="absolute top-1/4 left-10 w-2 h-2 bg-vale-green rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute bottom-1/3 right-20 w-3 h-3 bg-vale-yellow rounded-full opacity-20 animate-pulse delay-75"></div>
      </div>

      <div className="w-full max-w-sm p-6 relative z-10">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8 border-t-8 border-vale-green relative overflow-hidden transition-all duration-500 ease-in-out">
            
            {/* Faixa decorativa topo */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-vale-green via-vale-yellow to-vale-green"></div>

            {/* Status Connection Badge */}
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

            <div className="text-center mb-6">
                <div className="flex justify-center mb-4 h-24 items-center">
                    {displayChar ? (
                        <div className="relative animate-fadeIn">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#007e7a] to-[#005c97] flex items-center justify-center shadow-xl border-4 border-white ring-4 ring-[#007e7a]/10 transition-all duration-500 transform hover:scale-105">
                                <span className="text-5xl font-black text-white drop-shadow-md select-none">
                                    {displayChar}
                                </span>
                            </div>
                            <div className="absolute bottom-1 right-1 w-6 h-6 bg-[#edb111] rounded-full border-2 border-white shadow-sm flex items-center justify-center animate-bounce">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                        </div>
                    ) : (
                        <div className="scale-90 animate-fadeIn">
                            <Logo size="md" showText={false} />
                        </div>
                    )}
                </div>
                <div className="relative inline-block">
                    <h1 className="text-xl font-black text-gray-800 uppercase tracking-tighter relative z-10">
                        {isRegistering ? 'Novo Cadastro' : 'SafeMaint'}
                    </h1>
                    <div className="absolute -bottom-1 left-0 w-full h-2 bg-vale-yellow/30 -skew-x-12 z-0"></div>
                </div>
                <p className="text-[9px] font-bold text-gray-400 uppercase mt-2 tracking-[0.2em]">
                    {isRegistering ? 'Registro no Banco de Autenticação' : 'Gestão de Manutenção'}
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
                                className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-xs font-black text-gray-700 uppercase focus:border-vale-green focus:bg-white focus:ring-0 outline-none transition-all placeholder:text-gray-300"
                                placeholder=""
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-1 group">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wide group-focus-within:text-vale-green transition-colors">
                        {isRegistering ? 'Matrícula (Será seu Login)' : 'Matrícula / ID'}
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-300 group-focus-within:text-vale-green transition-colors">
                            <User size={18} strokeWidth={2.5} />
                        </div>
                        <input 
                            type="text" 
                            value={isRegistering ? newMatricula : user}
                            onChange={(e) => isRegistering ? setNewMatricula(e.target.value) : setUser(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-xs font-black text-gray-700 uppercase focus:border-vale-green focus:bg-white focus:ring-0 outline-none transition-all placeholder:text-gray-300"
                            placeholder=""
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="space-y-1 group">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wide group-focus-within:text-vale-green transition-colors">
                        {isRegistering ? 'Criar Senha' : 'Senha de Acesso'}
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-300 group-focus-within:text-vale-green transition-colors">
                            <Lock size={18} strokeWidth={2.5} />
                        </div>
                        <input 
                            type="password" 
                            value={isRegistering ? newPass : pass}
                            onChange={(e) => isRegistering ? setNewPass(e.target.value) : setPass(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-xs font-black text-gray-700 uppercase focus:border-vale-green focus:bg-white focus:ring-0 outline-none transition-all placeholder:text-gray-300"
                            placeholder=""
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
                                className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-xs font-black text-gray-700 uppercase focus:border-vale-green focus:bg-white focus:ring-0 outline-none transition-all placeholder:text-gray-300"
                                placeholder=""
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
                        w-full font-black py-3.5 rounded-xl uppercase text-xs flex items-center justify-center gap-3 transition-all duration-300 shadow-lg transform mt-2
                        ${isLoading ? 'bg-gray-100 text-gray-400 cursor-wait' : 'bg-vale-green hover:bg-[#00605d] text-white hover:scale-[1.02] active:scale-95 hover:shadow-vale-green/30'}
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
                    className="text-[10px] font-bold text-gray-500 hover:text-vale-green uppercase tracking-wide underline decoration-gray-300 hover:decoration-vale-green transition-all flex items-center justify-center gap-2 mx-auto"
                >
                    {isRegistering ? <><ArrowLeft size={10}/> Voltar para Login</> : 'Não tem conta? Cadastrar Novo Acesso'}
                </button>
            </div>
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
