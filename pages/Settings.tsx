
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { Employee, RegisteredART, ScheduleItem, User } from '../types';
import { 
  Upload, Trash2, UserPlus, Edit2, RotateCcw, Plus, 
  Calendar, Settings as GearIcon, Loader2, FileSpreadsheet, 
  Database, ShieldCheck, UserCheck, X, AlertTriangle, CheckCircle, Copy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { checkConnection } from '../services/supabase';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'SYSTEM' | 'EMPLOYEES' | 'ARTS' | 'SCHEDULE' | 'USERS'>('SYSTEM');
  
  // Data States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [arts, setArts] = useState<RegisteredART[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  
  // UI States
  const [isTestingDB, setIsTestingDB] = useState(false);
  const [dbStatus, setDbStatus] = useState<{success: boolean, message: string, code?: string} | null>(null);
  const [showSqlWizard, setShowSqlWizard] = useState(false);

  // Form States
  const [empName, setEmpName] = useState('');
  const [empMat, setEmpMat] = useState('');
  const [empFunc, setEmpFunc] = useState('');
  const [artCode, setArtCode] = useState('');
  const [artTask, setArtTask] = useState('');
  const [userName, setUserName] = useState('');
  const [userLogin, setUserLogin] = useState('');
  const [userPass, setUserPass] = useState('');
  const [userRole, setUserRole] = useState<'ADMIN' | 'OPERADOR'>('OPERADOR');
  const [scheduleInput, setScheduleInput] = useState('');

  useEffect(() => {
    const role = localStorage.getItem('safemaint_role');
    if (role !== 'ADMIN') {
        navigate('/dashboard');
        return;
    }
    refreshData();
  }, [navigate, activeTab]);

  const refreshData = () => {
      setEmployees(StorageService.getEmployees());
      setArts(StorageService.getARTs());
      setSchedule(StorageService.getSchedule());
      StorageService.getUsers().then(setUsers);
  };

  const testDB = async () => {
      setIsTestingDB(true);
      const res = await checkConnection();
      setDbStatus(res);
      setIsTestingDB(false);
  };

  const sqlScript = `-- SCRIPT DE INICIALIZAÇÃO SAFEMAINT
create table if not exists users (id uuid primary key, name text, matricula text, login text unique, password text, role text);
create table if not exists employees (id uuid primary key, name text, matricula text, function text, status text);
create table if not exists documents (id uuid primary key, type text, header jsonb, content jsonb, signatures jsonb, status text, "createdAt" timestamp with time zone default now());
create table if not exists schedule (id uuid primary key, "frotaOm" text, description text, resources text, resources2 text, "dateMin" text, "dateMax" text, priority text, "peopleCount" integer, hours float, "dateStart" text, "dateEnd" text, "workCenter" text, "timeStart" text, "timeEnd" text, status text);
create table if not exists arts (id uuid primary key, code text, company text, "taskName" text, area text, risks jsonb, "controlMeasures" text, steps jsonb);
create table if not exists history (id uuid primary key, om text, tag text, description text, "startTime" text, "endTime" text, duration text, responsible text, status text);
create table if not exists chat (id uuid primary key, sender text, role text, text text, timestamp timestamp with time zone default now());`;

  const copySql = () => {
      navigator.clipboard.writeText(sqlScript);
      alert("Script copiado! Cole no SQL Editor do Supabase.");
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empMat) return;
    StorageService.addEmployee({ id: crypto.randomUUID(), name: empName.toUpperCase(), matricula: empMat, function: empFunc.toUpperCase() });
    setEmpName(''); setEmpMat(''); setEmpFunc('');
    refreshData();
  };

  const handleSaveART = (e: React.FormEvent) => {
    e.preventDefault();
    if (!artCode || !artTask) return;
    StorageService.addART({ 
        id: crypto.randomUUID(), code: artCode, company: 'VALE', taskName: artTask.toUpperCase(), 
        area: 'MANUTENÇÃO', risks: [], steps: [], controlMeasures: '' 
    });
    setArtCode(''); setArtTask('');
    refreshData();
  };

  const handleImportSchedule = () => {
    if (!scheduleInput.trim()) return;
    try {
        const rows = scheduleInput.split('\n');
        const items: ScheduleItem[] = rows.map(row => {
            const cols = row.split('\t');
            return {
                id: crypto.randomUUID(), frotaOm: cols[0] || '', description: cols[1] || '',
                resources: cols[2] || '', resources2: cols[3] || '', dateMin: cols[4] || '',
                dateMax: cols[5] || '', priority: cols[6] || '', peopleCount: parseInt(cols[7]) || 0,
                hours: parseFloat(cols[8]) || 0, dateStart: cols[9] || '', dateEnd: cols[10] || '',
                workCenter: cols[11] || '', timeStart: cols[12] || '', timeEnd: cols[13] || '', status: 'PLANEJADO'
            };
        }).filter(i => i.frotaOm);
        StorageService.updateSchedule(items);
        setScheduleInput('');
        refreshData();
        alert("Programação Importada!");
    } catch (e) { alert("Erro no formato."); }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userLogin || !userPass) return;
      const success = await StorageService.addUser({ 
          id: crypto.randomUUID(), name: userName.toUpperCase(), matricula: 'N/D', 
          login: userLogin.toUpperCase(), password: userPass, role: userRole 
      });
      if (success) { setUserName(''); setUserLogin(''); setUserPass(''); refreshData(); }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h2 className="text-2xl font-black text-vale-darkgray flex items-center gap-2 uppercase">
              <GearIcon size={28} className="text-vale-green" /> Painel de Gestão
          </h2>
          <button onClick={() => navigate('/dashboard')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X size={20}/></button>
      </div>
      
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 custom-scrollbar">
        {[
            { id: 'SYSTEM', label: 'STATUS SYNC', icon: <Database size={16}/> },
            { id: 'EMPLOYEES', label: 'FUNCIONÁRIOS', icon: <UserPlus size={16}/> },
            { id: 'ARTS', label: 'ARTs PADRÃO', icon: <ShieldCheck size={16}/> },
            { id: 'SCHEDULE', label: 'PROGRAMAÇÃO', icon: <Calendar size={16}/> },
            { id: 'USERS', label: 'ACESSO USUÁRIOS', icon: <UserCheck size={16}/> }
        ].map((tab) => (
            <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`px-6 py-3 rounded-xl font-black text-[10px] whitespace-nowrap transition-all flex items-center gap-2 border-2 ${activeTab === tab.id ? 'bg-vale-green text-white border-vale-green shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
            >
                {tab.icon} {tab.label}
            </button>
        ))}
      </div>

      {activeTab === 'SYSTEM' && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 animate-fadeIn">
              <div className="max-w-md mx-auto text-center">
                  <div className="bg-vale-green/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Database size={40} className="text-vale-green" />
                  </div>
                  <h3 className="font-black text-lg mb-2 uppercase tracking-tighter">Sincronização Supabase</h3>
                  <p className="text-[10px] font-bold text-gray-400 mb-8 uppercase tracking-widest italic">Integração em Nuvem para Monitoramento em Tempo Real</p>
                  
                  {dbStatus && (
                      <div className={`mb-8 p-5 rounded-2xl border-2 font-bold text-xs flex flex-col gap-3 text-left ${dbStatus.success ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          <div className="flex items-center gap-3">
                            {dbStatus.success ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                            <p>{dbStatus.message}</p>
                          </div>
                          
                          {dbStatus.code === 'MISSING_TABLES' && (
                              <button 
                                onClick={() => setShowSqlWizard(true)}
                                className="mt-2 w-full bg-yellow-600 text-white py-2 rounded-lg text-[10px] font-black hover:bg-yellow-700"
                              >
                                VER SCRIPT SQL NECESSÁRIO
                              </button>
                          )}
                      </div>
                  )}

                  <button 
                    onClick={testDB} 
                    disabled={isTestingDB} 
                    className="w-full bg-vale-green hover:bg-vale-green/90 text-white font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                  >
                      {isTestingDB ? <Loader2 className="animate-spin" /> : <RotateCcw size={20} />} 
                      TESTAR CONEXÃO AGORA
                  </button>
              </div>
          </div>
      )}

      {/* MODAL SQL WIZARD */}
      {showSqlWizard && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
              <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                      <h3 className="font-black text-vale-darkgray uppercase flex items-center gap-2">
                          <Database size={20} className="text-vale-green" /> Inicialização do Banco
                      </h3>
                      <button onClick={() => setShowSqlWizard(false)} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1">
                      <p className="text-xs font-bold text-gray-500 mb-4 leading-relaxed">
                          Siga estes passos para configurar seu Supabase:<br/>
                          1. Entre no seu painel do Supabase.<br/>
                          2. Vá no menu **SQL Editor** no lado esquerdo.<br/>
                          3. Clique em **New Query**.<br/>
                          4. Cole o código abaixo e clique em **Run**.
                      </p>
                      <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-[10px] relative">
                          <button 
                            onClick={copySql}
                            className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded border border-gray-700"
                          >
                            <Copy size={16}/>
                          </button>
                          <pre className="whitespace-pre-wrap">{sqlScript}</pre>
                      </div>
                  </div>
                  <div className="p-4 border-t bg-gray-50 text-right">
                      <button onClick={() => setShowSqlWizard(false)} className="bg-vale-darkgray text-white px-6 py-2 rounded-lg font-black text-xs">ENTENDI</button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'EMPLOYEES' && (
          <div className="space-y-6 animate-fadeIn">
              <form onSubmit={handleSaveEmployee} className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-1">
                      <label className="text-[10px] font-black text-gray-400 block mb-1 uppercase">NOME COMPLETO</label>
                      <input type="text" value={empName} onChange={e => setEmpName(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-vale-green outline-none" placeholder="EX: JOÃO DA SILVA" />
                  </div>
                  <div>
                      <label className="text-[10px] font-black text-gray-400 block mb-1 uppercase">MATRÍCULA</label>
                      <input type="text" value={empMat} onChange={e => setEmpMat(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-vale-green outline-none" placeholder="000000" />
                  </div>
                  <div>
                      <label className="text-[10px] font-black text-gray-400 block mb-1 uppercase">FUNÇÃO</label>
                      <input type="text" value={empFunc} onChange={e => setEmpFunc(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-vale-green outline-none" placeholder="EX: MECÂNICO" />
                  </div>
                  <button type="submit" className="bg-vale-green text-white p-3.5 rounded-lg font-black text-xs flex items-center justify-center gap-2 shadow-md hover:bg-vale-green/90"><Plus size={18}/> ADICIONAR</button>
              </form>
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-xs">
                      <thead className="bg-gray-50 font-black text-gray-400 uppercase">
                          <tr><th className="p-4 text-left">NOME</th><th className="p-4 text-left">MATRÍCULA</th><th className="p-4 text-left">FUNÇÃO</th><th className="p-4 text-right">AÇÕES</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {employees.map(e => (
                              <tr key={e.id} className="hover:bg-gray-50 font-bold text-vale-darkgray">
                                  <td className="p-4">{e.name}</td><td className="p-4">{e.matricula}</td><td className="p-4">{e.function}</td>
                                  <td className="p-4 text-right">
                                    <button onClick={() => { if(window.confirm('Excluir?')) StorageService.deleteEmployee(e.id); refreshData(); }} className="text-vale-cherry p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeTab === 'ARTS' && (
          <div className="space-y-6 animate-fadeIn">
              <form onSubmit={handleSaveART} className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                      <label className="text-[10px] font-black text-gray-400 block mb-1 uppercase">CÓDIGO DA ART</label>
                      <input type="text" value={artCode} onChange={e => setArtCode(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-vale-green outline-none" placeholder="EX: 33777" />
                  </div>
                  <div>
                      <label className="text-[10px] font-black text-gray-400 block mb-1 uppercase">NOME DA TAREFA</label>
                      <input type="text" value={artTask} onChange={e => setArtTask(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-vale-green outline-none" placeholder="EX: MANUTENÇÃO DE MOTOR" />
                  </div>
                  <button type="submit" className="bg-vale-green text-white p-3.5 rounded-lg font-black text-xs flex items-center justify-center gap-2 shadow-md hover:bg-vale-green/90"><Plus size={18}/> CADASTRAR ART</button>
              </form>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {arts.map(art => (
                      <div key={art.id} className="bg-white p-5 rounded-xl shadow-md border-l-4 border-vale-green flex justify-between items-center group">
                          <div>
                              <span className="text-[10px] font-black text-vale-green uppercase">CÓD {art.code}</span>
                              <h4 className="font-black text-vale-darkgray text-xs mt-1 uppercase">{art.taskName}</h4>
                          </div>
                          <button onClick={() => { if(window.confirm('Excluir ART?')) StorageService.deleteART(art.id); refreshData(); }} className="text-gray-300 group-hover:text-vale-cherry transition-colors"><Trash2 size={18}/></button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'SCHEDULE' && (
          <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                  <h3 className="font-black text-sm mb-4 flex items-center gap-2 uppercase">
                      <Upload size={18} className="text-vale-blue" /> Importar Programação Semanal
                  </h3>
                  <textarea 
                    value={scheduleInput}
                    onChange={e => setScheduleInput(e.target.value)}
                    className="w-full h-48 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-4 font-mono text-[10px] focus:ring-2 focus:ring-vale-blue outline-none"
                    placeholder="COLE AS COLUNAS DO EXCEL AQUI (FROTA/OM, DESCRIÇÃO, RECURSOS...)"
                  />
                  <div className="mt-4 flex justify-between items-center">
                      <p className="text-[10px] font-bold text-gray-400 italic">Dica: Selecione as colunas na planilha e use CTRL+C / CTRL+V.</p>
                      <button onClick={handleImportSchedule} className="bg-vale-blue hover:bg-vale-blue/90 text-white px-8 py-3 rounded-xl font-black text-xs shadow-lg transition-all active:scale-95 uppercase">
                          PROCESSAR E IMPORTAR
                      </button>
                  </div>
              </div>
              <div className="bg-gray-100 p-8 rounded-2xl border-2 border-dashed border-gray-300 text-center">
                   <p className="text-gray-400 font-black text-xs uppercase tracking-[0.2em]">{schedule.length} ITENS NO CRONOGRAMA ATUAL</p>
              </div>
          </div>
      )}

      {activeTab === 'USERS' && (
          <div className="space-y-6 animate-fadeIn">
              <form onSubmit={handleSaveUser} className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                      <label className="text-[10px] font-black text-gray-400 block mb-1 uppercase">LOGIN</label>
                      <input type="text" value={userLogin} onChange={e => setUserLogin(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg font-bold text-xs" />
                  </div>
                  <div>
                      <label className="text-[10px] font-black text-gray-400 block mb-1 uppercase">SENHA</label>
                      <input type="password" value={userPass} onChange={e => setUserPass(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg font-bold text-xs" />
                  </div>
                  <div>
                      <label className="text-[10px] font-black text-gray-400 block mb-1 uppercase">PERFIL</label>
                      <select value={userRole} onChange={e => setUserRole(e.target.value as any)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg font-bold text-xs">
                          <option value="OPERADOR">OPERADOR</option>
                          <option value="ADMIN">ADMINISTRADOR</option>
                      </select>
                  </div>
                  <button type="submit" className="bg-vale-green text-white p-3.5 rounded-lg font-black text-xs flex items-center justify-center gap-2 shadow-md"><UserCheck size={18}/> CRIAR ACESSO</button>
              </form>
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                  <table className="w-full text-xs">
                      <thead className="bg-gray-50 font-black text-gray-400 uppercase">
                          <tr><th className="p-4 text-left">LOGIN</th><th className="p-4 text-left">PERFIL</th><th className="p-4 text-right">AÇÕES</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {users.map(u => (
                              <tr key={u.id} className="hover:bg-gray-50 font-bold">
                                  <td className="p-4">{u.login}</td>
                                  <td className="p-4">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${u.role === 'ADMIN' ? 'bg-vale-green text-white' : 'bg-gray-200 text-gray-600'}`}>{u.role}</span>
                                  </td>
                                  <td className="p-4 text-right">
                                    {u.login !== 'ADMIN' && <button className="text-vale-cherry p-2"><Trash2 size={16}/></button>}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
};
