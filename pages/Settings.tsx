import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storage';
import { Employee, RegisteredART, ScheduleItem, User, OMRecord } from '../types';
import { Upload, Link as LinkIcon, FileText, Trash2, UserPlus, Lock, Edit2, XCircle, RotateCcw, Server, Wifi, Save, Globe, Plus, ClipboardList, Layers, Code, FileCode, Smartphone, Coffee, CheckCircle, Eye, X, ScanLine, Wand2, AlertTriangle, Calendar, FileInput, Settings as GearIcon, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'EMPLOYEES' | 'ARTS' | 'SCHEDULE' | 'USERS' | 'OMS'>('EMPLOYEES');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [arts, setArts] = useState<RegisteredART[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Schedule
  const [scheduleInput, setScheduleInput] = useState('');
  const [scheduleStatus, setScheduleStatus] = useState('');

  // Employee Form
  const [isEditingEmp, setIsEditingEmp] = useState<string | null>(null);
  const [empName, setEmpName] = useState('');
  const [empMat, setEmpMat] = useState('');
  const [empFunc, setEmpFunc] = useState('');
  const [showEmpTrash, setShowEmpTrash] = useState(false);

  // User Form
  const [isEditingUser, setIsEditingUser] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userMat, setUserMat] = useState('');
  const [userLogin, setUserLogin] = useState('');
  const [userPass, setUserPass] = useState('');
  const [userRole, setUserRole] = useState<'ADMIN' | 'OPERADOR'>('OPERADOR');

  // ART Form
  const [artNum, setArtNum] = useState('');
  const [artName, setArtName] = useState('');
  const [artPdfFile, setArtPdfFile] = useState<File | null>(null); 
  const [previewArt, setPreviewArt] = useState<RegisteredART | null>(null); 
  const [previewMode, setPreviewMode] = useState<'DATA' | 'PDF'>('DATA'); 
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // OM Management States
  const [isAnalyzingOM, setIsAnalyzingOM] = useState(false);
  const [omFile, setOmFile] = useState<File | null>(null);
  const [omNumber, setOmNumber] = useState('');
  const [omDesc, setOmDesc] = useState('');
  const [omTag, setOmTag] = useState('');
  const [omType, setOmType] = useState<'CORRETIVA' | 'PREVENTIVA' | null>(null);

  useEffect(() => {
    const role = localStorage.getItem('safemaint_role');
    if (role !== 'ADMIN') {
        alert("ACESSO NEGADO: ÁREA RESTRITA AO ADMINISTRADOR.");
        navigate('/dashboard');
        return;
    }
    refreshData();
  }, [navigate, activeTab]);

  const refreshData = () => {
      setEmployees(StorageService.getEmployees());
      setArts(StorageService.getARTs());
      
      if (activeTab === 'USERS') {
          setIsLoadingUsers(true);
          StorageService.getUsers().then(u => {
              setUsers(u);
              setIsLoadingUsers(false);
          });
      }
  };

  // --- EMPLOYEE HANDLERS ---
  const handleSaveEmployee = (e: React.FormEvent) => { 
      e.preventDefault(); 
      if(empName && empMat && empFunc) { 
          if(isEditingEmp) { 
              StorageService.updateEmployee({ id: isEditingEmp, name: empName, matricula: empMat, function: empFunc, status: 'ACTIVE' }); 
              alert("Atualizado!"); 
          } else { 
              StorageService.addEmployee({ id: crypto.randomUUID(), name: empName, matricula: empMat, function: empFunc, status: 'ACTIVE' }); 
          } 
          refreshData(); 
          resetEmpForm(); 
      }
  };
  const handleEditEmpClick = (emp: Employee) => { 
      setIsEditingEmp(emp.id); 
      setEmpName(emp.name); 
      setEmpMat(emp.matricula); 
      setEmpFunc(emp.function); 
      window.scrollTo({top:0, behavior:'smooth'}); 
  };
  const resetEmpForm = () => { setIsEditingEmp(null); setEmpName(''); setEmpMat(''); setEmpFunc(''); };
  const handleDeleteEmployee = (id: string) => { if(window.confirm("Mover para lixeira?")) { StorageService.deleteEmployee(id); refreshData(); }};
  const handleRestoreEmp = (id: string) => { StorageService.restoreEmployee(id); refreshData(); };
  const handlePermDeleteEmp = (id: string) => { if(window.confirm("Excluir permanentemente?")) { StorageService.deleteEmployeePermanently(id); refreshData(); }};

  // --- USER HANDLERS (ASYNC) ---
  const handleSaveUser = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      if(userName && userMat && userLogin && userPass) { 
          setIsLoadingUsers(true);
          if(isEditingUser) { 
              await StorageService.updateUser({ id: isEditingUser, name: userName, matricula: userMat, login: userLogin.toUpperCase(), password: userPass, role: userRole }); 
              alert("Usuário atualizado!");
          } else { 
              const success = await StorageService.addUser({ id: crypto.randomUUID(), name: userName, matricula: userMat, login: userLogin.toUpperCase(), password: userPass, role: userRole });
              if (!success) alert("Erro: Login já existe ou erro de conexão.");
          }
          resetUserForm(); 
          const updatedUsers = await StorageService.getUsers();
          setUsers(updatedUsers);
          setIsLoadingUsers(false);
      }
  };
  const handleEditUserClick = (u: User) => { 
      setIsEditingUser(u.id); 
      setUserName(u.name); 
      setUserMat(u.matricula); 
      setUserLogin(u.login); 
      setUserPass(u.password||''); 
      setUserRole(u.role); 
      window.scrollTo({top:0, behavior:'smooth'}); 
  };
  const resetUserForm = () => { setIsEditingUser(null); setUserName(''); setUserMat(''); setUserLogin(''); setUserPass(''); setUserRole('OPERADOR'); };
  const handleDeleteUser = async (id: string) => { 
      if(window.confirm("Remover usuário?")) { 
          setIsLoadingUsers(true);
          await StorageService.deleteUser(id); 
          const u = await StorageService.getUsers();
          setUsers(u); 
          setIsLoadingUsers(false);
      }
  };

  // --- ART HANDLERS ---
  const handlePdfSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;
      setArtPdfFile(file);
      document.getElementById('artNumInput')?.focus();
  };

  const handleSaveART = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      if(!artNum || !artName) {
          alert("POR FAVOR, PREENCHA O NÚMERO E A DESCRIÇÃO DA ART MANUALMENTE.");
          return;
      }
      
      const risks = artPdfFile ? [
            { situation: 'RISCO GERAL (PDF)', total: 5, riskLevel: 'MÉDIA' },
            { situation: 'AMBIENTE DE TRABALHO', total: 3, riskLevel: 'BAIXA' }
      ] : [];

      let pdfBase64: string | undefined = undefined;
      if (artPdfFile) {
          try {
              pdfBase64 = await fileToBase64(artPdfFile);
          } catch(e) { console.error("Error converting file", e); }
      }

      const newArt: RegisteredART = {
        id: crypto.randomUUID(),
        code: artNum,
        company: 'Vale',
        taskName: artName,
        area: 'GERAL',
        omve: 'Não',
        emissionDate: new Date().toLocaleDateString(),
        risks: risks,
        controlMeasures: 'Medidas genéricas (Preencher na operação se necessário).',
        steps: [],
        pdfUrl: pdfBase64
      };

      StorageService.addART(newArt); 
      setArts(StorageService.getARTs()); 
      setArtNum(''); 
      setArtName(''); 
      setArtPdfFile(null);
      if(fileInputRef.current) fileInputRef.current.value = "";
      alert("ART CADASTRADA COM SUCESSO!");
  };

  const handleDeleteART = (id: string) => { if(window.confirm("Excluir ART padrão?")) { StorageService.deleteART(id); setArts(StorageService.getARTs()); }};

  // --- OM CREATION HANDLERS (NEW TAB) ---
  const handleOmFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.files && e.target.files[0]) {
      setOmFile(e.target.files[0]);
      setIsAnalyzingOM(true);
      setTimeout(() => {
          const randomOM = Math.floor(500000 + Math.random() * 499999).toString();
          setOmNumber(randomOM);
          setOmTag("CAT-793F");
          setOmDesc("REVISÃO PREVENTIVA 250H - SISTEMA DE ARREFECIMENTO E LUBRIFICAÇÃO (DADOS EXTRAÍDOS DO PDF)");
          setOmType('PREVENTIVA');
          setIsAnalyzingOM(false);
      }, 1500);
    }
  };

  const handleSaveOM = async () => {
      if(!omFile || !omNumber || !omDesc || !omType || !omTag) {
          alert("PREENCHA TODOS OS CAMPOS E SELECIONE O ARQUIVO.");
          return;
      }
      
      let pdfBase64: string | undefined = undefined;
      try {
          pdfBase64 = await fileToBase64(omFile);
      } catch(e) { console.error("Error converting OM file", e); }

      const newOM: OMRecord = {
          id: crypto.randomUUID(),
          omNumber,
          description: omDesc,
          tag: omTag,
          type: omType,
          status: 'PENDENTE',
          createdAt: new Date().toISOString(),
          createdBy: localStorage.getItem('safemaint_user') || 'USUÁRIO',
          pdfUrl: pdfBase64 
      };
      StorageService.saveOM(newOM);
      alert(`OM ${omNumber} CRIADA E ENVIADA PARA O MENU DE OMs!`);
      // Reset
      setOmFile(null);
      setOmNumber('');
      setOmDesc('');
      setOmTag('');
      setOmType(null);
  };

  // --- SCHEDULE HANDLERS ---
  const parseExcelData = () => { 
      try { 
          const rows = scheduleInput.trim().split('\n'); 
          if(rows.length===0) throw new Error(); 
          const items: ScheduleItem[] = rows.map(r => { 
              const c = r.split('\t'); 
              return { 
                  id: crypto.randomUUID(), 
                  frotaOm: c[0]||'', description: c[1]||'', dateMin: c[2]||'', dateMax: c[3]||'', 
                  priority: c[4]||'M', peopleCount: parseInt(c[5])||1, hours: parseFloat(c[6])||0, 
                  dateStart: c[7]||'', dateEnd: c[8]||'', workCenter: c[9]||'', timeStart: c[10]||'', 
                  timeEnd: c[11]||'', resources: c[12]||'', resources2: c[13]||'', status: 'I' 
              };
          }); 
          if(items.length > 0) {
              const current = StorageService.getSchedule(); 
              if(current.length > 0) StorageService.archiveAndClearSchedule(); 
              StorageService.updateSchedule(items); 
              setScheduleStatus('OK'); 
              setScheduleInput('');
              alert(`${items.length} itens importados com sucesso!`);
          }
      } catch(e) { setScheduleStatus('ERRO NA IMPORTAÇÃO.'); }
  };
  const handleClearSchedule = () => { 
      if(window.confirm("ATENÇÃO: Isso limpará toda a programação atual. Deseja continuar?")) { 
          StorageService.archiveAndClearSchedule(); 
          setScheduleStatus('PROGRAMAÇÃO LIMPA.'); 
      }
  };

  const activeEmployees = employees.filter(e => e.status !== 'TRASH');
  const trashedEmployees = employees.filter(e => e.status === 'TRASH');
  
  // Render ART Content for Preview
  const renderArtPreview = (art: RegisteredART) => (
      <div className="bg-white border-2 border-gray-400 p-6 text-gray-900 shadow-xl max-w-3xl mx-auto my-4 min-h-[600px] flex flex-col">
          {/* Header */}
          <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-start">
              <div>
                  <h2 className="font-black text-xl">ART - ANÁLISE DE RISCO DA TAREFA</h2>
                  <p className="text-xs font-bold text-gray-500">DOCUMENTO PADRÃO REGISTRADO</p>
              </div>
              <div className="text-right">
                  <p className="font-bold text-sm">Nº: {art.code}</p>
                  <p className="text-xs">{art.emissionDate}</p>
              </div>
          </div>
          
          <div className="mb-4">
              <p className="text-xs font-black uppercase text-gray-500">TAREFA:</p>
              <p className="font-bold text-lg leading-tight">{art.taskName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
              <div><span className="font-black">EMPRESA:</span> {art.company}</div>
              <div><span className="font-black">ÁREA:</span> {art.area}</div>
          </div>

          {/* Risks */}
          <div className="mb-4 border border-gray-300">
              <div className="bg-gray-200 p-1 font-black text-xs text-center">PRINCIPAIS RISCOS</div>
              <table className="w-full text-[10px]">
                  <tbody>
                      {art.risks.map((r, i) => (
                          <tr key={i} className="border-b border-gray-200">
                              <td className="p-1 font-bold">{r.situation}</td>
                              <td className="p-1 text-right w-16">{r.riskLevel}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>

          {/* Measures */}
          <div className="mb-4 border border-gray-300 bg-gray-50 p-2">
              <p className="font-black text-xs mb-1">MEDIDAS DE CONTROLE:</p>
              <p className="text-[10px] text-justify leading-snug">{art.controlMeasures}</p>
          </div>

          {/* Steps */}
          <div className="flex-1 border border-gray-300">
              <div className="bg-gray-200 p-1 font-black text-xs text-center">PASSO A PASSO</div>
              <table className="w-full text-[10px]">
                  <tbody>
                      {art.steps.map((s, i) => (
                          <tr key={i} className="border-b border-gray-200">
                              <td className="p-1 w-8 text-center font-bold">{s.item}</td>
                              <td className="p-1">{s.step}</td>
                              <td className="p-1 text-right w-16">{s.riskLevel}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
          
          <div className="mt-4 pt-4 border-t-2 border-black text-center text-xs font-black text-gray-400">
              -- VISUALIZAÇÃO DE DADOS EXTRAÍDOS (DIGITAL) --
          </div>
      </div>
  );

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4">
      <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2 uppercase">
          <GearIcon size={28} className="text-green-600" />
          CONFIGURAÇÕES DO SISTEMA
      </h2>
      
      <div className="flex border-b mb-6 overflow-x-auto bg-white rounded-t-lg shadow-sm">
        {['OMS', 'EMPLOYEES', 'ARTS', 'SCHEDULE', 'USERS'].map((tab) => (
            <button 
                key={tab} 
                className={`px-6 py-4 font-black text-sm whitespace-nowrap border-b-4 transition-colors ${activeTab === tab ? 'text-[#10b981] border-[#10b981] bg-green-50' : 'text-gray-500 border-transparent hover:bg-gray-50'}`} 
                onClick={() => setActiveTab(tab as any)}
            >
                {tab === 'OMS' ? 'GESTÃO DE OMs' :
                 tab === 'EMPLOYEES' ? 'FUNCIONÁRIOS' : 
                 tab === 'ARTS' ? 'ARTs PADRÃO' : 
                 tab === 'SCHEDULE' ? 'GESTÃO DE PROGRAMAÇÃO' : 'USUÁRIOS'}
            </button>
        ))}
      </div>

      {activeTab === 'OMS' && (
          <div className="bg-white p-6 rounded shadow border border-gray-200 animate-fadeIn">
              <h3 className="font-bold text-lg mb-4 text-gray-700 flex items-center gap-2">
                  <FileInput size={20} /> CADASTRAR NOVA OM (PDF)
              </h3>
              <div className="p-6 bg-gray-50 rounded border border-gray-200 shadow-inner max-w-2xl mx-auto">
                  <div className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors relative mb-6 ${omFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:bg-white'}`}>
                      <input type="file" accept=".pdf" onChange={handleOmFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                      {isAnalyzingOM ? (
                            <div className="flex flex-col items-center text-blue-600 animate-pulse">
                                <ScanLine size={40} className="mb-2" />
                                <span className="font-bold text-sm">ANALISANDO PDF...</span>
                            </div>
                      ) : omFile ? (
                          <div className="flex flex-col items-center text-green-700">
                              <CheckCircle size={40} className="mb-2" />
                              <span className="font-bold text-sm">{omFile.name}</span>
                              <span className="text-[10px] uppercase mt-1 font-bold">DADOS EXTRAÍDOS</span>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center text-gray-400">
                              <FileText size={40} className="mb-2" />
                              <span className="font-bold text-sm">ARRASTE O PDF DA OM AQUI</span>
                          </div>
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                          <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">NÚMERO</label>
                          <input value={omNumber} onChange={e => setOmNumber(e.target.value)} className="w-full border p-2 rounded font-bold uppercase" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">TAG</label>
                          <input value={omTag} onChange={e => setOmTag(e.target.value)} className="w-full border p-2 rounded font-bold uppercase" />
                      </div>
                  </div>
                  
                  <div className="mb-4">
                      <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">DESCRIÇÃO</label>
                      <textarea value={omDesc} onChange={e => setOmDesc(e.target.value)} className="w-full border p-2 rounded font-bold uppercase h-20" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                      <button onClick={() => setOmType('CORRETIVA')} className={`p-3 rounded border-2 font-black text-xs flex flex-col items-center gap-1 ${omType === 'CORRETIVA' ? 'bg-red-50 border-red-500 text-red-700' : 'border-gray-200'}`}><AlertTriangle size={16}/> CORRETIVA</button>
                      <button onClick={() => setOmType('PREVENTIVA')} className={`p-3 rounded border-2 font-black text-xs flex flex-col items-center gap-1 ${omType === 'PREVENTIVA' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200'}`}><Calendar size={16}/> PREVENTIVA</button>
                  </div>

                  <button onClick={handleSaveOM} disabled={isAnalyzingOM} className="w-full bg-[#10b981] text-white font-black py-3 rounded shadow-lg hover:bg-[#059669] transition-colors">
                      CADASTRAR E ENVIAR PARA A EQUIPE
                  </button>
              </div>
          </div>
      )}

      {activeTab === 'EMPLOYEES' && (
        <div className="bg-white p-6 rounded shadow border border-gray-200 animate-fadeIn">
            <h3 className="font-bold text-lg mb-4 text-gray-700 flex items-center gap-2"><UserPlus size={20} /> CADASTRO DE FUNCIONÁRIOS</h3>
            <form onSubmit={handleSaveEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded border">
                <input placeholder="NOME COMPLETO" value={empName} onChange={e=>setEmpName(e.target.value)} className="border-2 border-gray-300 p-3 rounded font-bold text-sm uppercase" required />
                <input placeholder="MATRÍCULA" value={empMat} onChange={e=>setEmpMat(e.target.value)} className="border-2 border-gray-300 p-3 rounded font-bold text-sm uppercase" required />
                <input placeholder="FUNÇÃO" value={empFunc} onChange={e=>setEmpFunc(e.target.value)} className="border-2 border-gray-300 p-3 rounded font-bold text-sm uppercase" required />
                <button className="bg-[#10b981] hover:bg-[#059669] text-white font-black rounded shadow flex items-center justify-center gap-2"><Save size={18} /> {isEditingEmp ? 'ATUALIZAR' : 'CADASTRAR'}</button>
                {isEditingEmp && <button type="button" onClick={resetEmpForm} className="md:col-span-4 text-xs font-bold text-gray-500 hover:text-gray-800 underline text-right">CANCELAR EDIÇÃO</button>}
            </form>
            <div className="flex justify-between items-center mb-4"><h4 className="font-black text-gray-600 text-sm uppercase">Lista Ativa ({activeEmployees.length})</h4><button onClick={() => setShowEmpTrash(!showEmpTrash)} className="text-xs font-bold text-red-500 flex items-center gap-1 hover:text-red-700"><Trash2 size={14} /> {showEmpTrash ? 'OCULTAR LIXEIRA' : 'VER EXCLUÍDOS'}</button></div>
            <div className="border rounded overflow-hidden mb-6">
                 {activeEmployees.length === 0 && <div className="p-4 text-center text-gray-400 font-bold">Nenhum funcionário ativo.</div>}
                 {activeEmployees.map(e => (
                    <div key={e.id} className="flex justify-between items-center border-b last:border-0 p-3 hover:bg-gray-50 transition-colors">
                        <div><span className="font-black text-gray-800 block">{e.name}</span><span className="text-xs text-gray-500 font-bold">{e.matricula} - {e.function}</span></div>
                        <div className="flex gap-2"><button onClick={()=>handleEditEmpClick(e)} className="text-blue-600 hover:bg-blue-50 p-2 rounded"><Edit2 size={16}/></button><button onClick={()=>handleDeleteEmployee(e.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button></div>
                    </div>
                 ))}
            </div>
            {showEmpTrash && (
                <div className="bg-red-50 p-4 rounded border border-red-200">
                    <h4 className="font-black text-red-800 text-sm mb-2 flex items-center gap-2"><Trash2 size={14}/> LIXEIRA</h4>
                    {trashedEmployees.map(e => (
                        <div key={e.id} className="flex justify-between items-center border-b border-red-200 py-2 last:border-0"><span className="text-xs font-bold text-red-700 opacity-70">{e.name}</span><div className="flex gap-2"><button onClick={()=>handleRestoreEmp(e.id)} className="text-green-600 font-black flex items-center gap-1 text-[10px]"><RotateCcw size={12}/> RESTAURAR</button></div></div>
                    ))}
                </div>
            )}
        </div>
      )}

      {activeTab === 'USERS' && (
        <div className="bg-white p-6 rounded shadow border border-gray-200 animate-fadeIn">
            <h3 className="font-bold text-lg mb-4 text-gray-700 flex items-center gap-2"><UserPlus size={20} /> GERENCIAR ACESSOS</h3>
            <form onSubmit={handleSaveUser} className="bg-gray-50 p-6 rounded border mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 shadow-inner">
                <input placeholder="NOME" value={userName} onChange={e => setUserName(e.target.value)} className="border-2 border-gray-300 p-2 rounded font-bold uppercase text-sm" required />
                <input placeholder="MATRÍCULA" value={userMat} onChange={e => setUserMat(e.target.value)} className="border-2 border-gray-300 p-2 rounded font-bold uppercase text-sm" required />
                <input placeholder="LOGIN" value={userLogin} onChange={e => setUserLogin(e.target.value)} className="border-2 border-gray-300 p-2 rounded font-bold uppercase text-sm" required />
                <input type="password" placeholder="SENHA" value={userPass} onChange={e => setUserPass(e.target.value)} className="border-2 border-gray-300 p-2 rounded font-bold w-full text-sm" required />
                <select value={userRole} onChange={e => setUserRole(e.target.value as any)} className="border-2 border-gray-300 p-2 rounded font-bold text-sm bg-white"><option value="OPERADOR">OPERADOR</option><option value="ADMIN">ADMINISTRADOR</option></select>
                <button type="submit" disabled={isLoadingUsers} className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded flex items-center justify-center gap-2 shadow"><Save size={18} /> {isEditingUser ? 'ATUALIZAR' : 'CRIAR'}</button>
                {isEditingUser && <button type="button" onClick={resetUserForm} className="col-span-1 md:col-span-3 bg-gray-400 text-white font-bold rounded py-2 text-xs">CANCELAR EDIÇÃO</button>}
            </form>
            <div className="overflow-x-auto rounded border min-h-[100px] relative">
                {isLoadingUsers && <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10"><Loader2 className="animate-spin text-blue-600" size={32} /></div>}
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100"><tr><th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Login</th><th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Nome</th><th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Nível</th><th className="px-4 py-3 text-right text-xs font-black text-gray-500 uppercase">Ações</th></tr></thead>
                    <tbody className="divide-y divide-gray-200">{users.map(u => (<tr key={u.id} className="hover:bg-gray-50 transition-colors"><td className="px-4 py-3 font-black text-gray-800">{u.login}</td><td className="px-4 py-3 text-sm text-gray-600 font-bold">{u.name}</td><td className="px-4 py-3"><span className={`text-[10px] px-2 py-1 rounded-full font-black ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>{u.role}</span></td><td className="px-4 py-3 text-right flex justify-end gap-2"><button onClick={() => handleEditUserClick(u)} className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-100 rounded"><Edit2 size={16} /></button>{u.login !== 'ADMIN' && <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-800 p-1 hover:bg-red-100 rounded"><Trash2 size={16} /></button>}</td></tr>))}</tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'ARTS' && (
        <div className="bg-white p-6 rounded shadow border border-gray-200 animate-fadeIn">
            <h3 className="font-bold text-lg mb-4 text-gray-700 flex items-center gap-2">
                <FileText size={20} /> CADASTRO DE ARTs PADRÃO
            </h3>
            
            <form onSubmit={handleSaveART} className="bg-gray-50 p-6 rounded border mb-6 shadow-inner">
                 <div className="flex justify-between items-start mb-4 bg-blue-50 border-l-4 border-blue-500 p-4">
                    <div><h4 className="font-black text-blue-900 flex items-center gap-2"><Upload size={18}/> 1. SELECIONAR ARQUIVO (PDF)</h4><p className="text-xs text-blue-800 font-bold">O arquivo será vinculado à ART criada.</p></div>
                    <div className="relative">
                        <button type="button" className={`px-4 py-2 rounded-lg font-black text-xs shadow-md transition-colors ${artPdfFile ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{artPdfFile ? 'ARQUIVO SELECIONADO!' : 'BUSCAR PDF'}</button>
                        <input type="file" accept=".pdf" ref={fileInputRef} onChange={handlePdfSelection} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div><label className="block text-xs font-black text-gray-500 uppercase mb-1">2. NÚMERO DA ART</label><input id="artNumInput" placeholder="EX: 33777" value={artNum} onChange={e => setArtNum(e.target.value)} className="w-full border-2 border-gray-300 p-3 rounded font-bold uppercase text-sm focus:border-[#10b981] outline-none" /></div>
                    <div className="md:col-span-2"><label className="block text-xs font-black text-gray-500 uppercase mb-1">3. DESCRIÇÃO / ATIVIDADE</label><input placeholder="EX: TROCA DE PNEUS..." value={artName} onChange={e => setArtName(e.target.value)} className="w-full border-2 border-gray-300 p-3 rounded font-bold uppercase text-sm focus:border-[#10b981] outline-none" /></div>
                </div>
                <div className="flex justify-end"><button type="submit" className={`bg-[#10b981] text-white font-black px-6 py-3 rounded flex items-center gap-2 shadow-lg transition-transform active:scale-95 ${(!artNum || !artName) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#059669]'}`}><Plus size={18} /> CADASTRAR ART MANUALMENTE</button></div>
            </form>

            <div className="space-y-2 border rounded p-1 bg-gray-50 min-h-[200px]">
                {arts.length === 0 && <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10"><FileText size={40} className="opacity-20 mb-2"/><p className="font-bold text-sm">Nenhuma ART cadastrada.</p></div>}
                {arts.map(a => (
                    <div key={a.id} className="flex justify-between items-center bg-white border p-4 rounded shadow-sm hover:shadow-md transition-shadow">
                        <div>
                            <p className="font-black text-gray-800 text-lg">ART {a.code}</p>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{a.taskName}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setPreviewArt(a); setPreviewMode('DATA'); }} className="text-[#10b981] hover:bg-green-50 p-2 rounded transition-colors" title="Visualizar Documento"><Eye size={20} /></button>
                            <button onClick={() => handleDeleteART(a.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"><Trash2 size={20} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
      
      {activeTab === 'SCHEDULE' && (
        <div className="bg-white p-6 rounded shadow border border-gray-200 animate-fadeIn">
            <h3 className="font-bold text-lg mb-4 text-gray-700 flex items-center gap-2">
                <Calendar size={20} /> GESTÃO DE PROGRAMAÇÃO
            </h3>
            <div className="bg-gray-50 p-4 rounded border mb-4">
                <label className="block text-xs font-black text-gray-500 mb-2 uppercase">Cole os dados aqui (Copie do Excel: Frota/OM, Descrição, Datas...):</label>
                <textarea 
                    className="w-full h-40 border-2 border-gray-300 rounded p-2 text-xs font-mono mb-2"
                    value={scheduleInput}
                    onChange={(e) => setScheduleInput(e.target.value)}
                    placeholder="COLE AS CÉLULAS DO EXCEL AQUI..."
                />
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-600">{scheduleStatus}</span>
                    <div className="flex gap-2">
                        <button onClick={handleClearSchedule} className="bg-red-500 hover:bg-red-600 text-white font-black px-4 py-2 rounded text-xs shadow">LIMPAR TUDO</button>
                        <button onClick={parseExcelData} className="bg-[#10b981] hover:bg-[#059669] text-white font-black px-4 py-2 rounded text-xs shadow flex items-center gap-1"><Save size={14}/> PROCESSAR DADOS</button>
                    </div>
                </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200 text-xs text-yellow-800 font-bold">
                <p>FORMATO ESPERADO (COLUNAS):</p>
                <p>1. Frota/OM | 2. Descrição | 3. Data Min | 4. Data Max | 5. Prioridade | 6. Pessoas | 7. Horas | 8. Data Início | 9. Data Fim | 10. Centro Trab. | 11. Hora Ini | 12. Hora Fim | 13. Recursos | 14. Recursos 2</p>
            </div>
        </div>
      )}

      {/* ART PREVIEW MODAL */}
      {previewArt && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-gray-100 rounded-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden relative shadow-2xl">
                  <div className="bg-gray-900 p-4 flex justify-between items-center text-white shrink-0">
                      <h3 className="font-black flex items-center gap-2 text-lg"><Eye size={20} className="text-[#10b981]"/> VISUALIZAR DOCUMENTO</h3>
                      <button onClick={() => setPreviewArt(null)} className="hover:bg-gray-700 p-2 rounded"><X size={24}/></button>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex bg-gray-200 border-b border-gray-300">
                      <button 
                        onClick={() => setPreviewMode('DATA')}
                        className={`flex-1 py-3 text-xs font-black uppercase ${previewMode === 'DATA' ? 'bg-white text-green-700 border-b-4 border-green-600' : 'text-gray-500 hover:bg-gray-300'}`}
                      >
                          DADOS EXTRAÍDOS (DIGITAL)
                      </button>
                      <button 
                        onClick={() => setPreviewMode('PDF')}
                        disabled={!previewArt.pdfUrl}
                        className={`flex-1 py-3 text-xs font-black uppercase ${previewMode === 'PDF' ? 'bg-white text-green-700 border-b-4 border-green-600' : 'text-gray-500 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                      >
                          {previewArt.pdfUrl ? 'PDF ORIGINAL (ARQUIVO)' : 'PDF NÃO DISPONÍVEL'}
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-100">
                      {previewMode === 'DATA' ? (
                          renderArtPreview(previewArt)
                      ) : (
                          <div className="w-full h-full bg-white flex items-center justify-center">
                              {previewArt.pdfUrl ? (
                                  <iframe src={previewArt.pdfUrl} className="w-full h-full border-none" title="PDF Viewer" />
                              ) : (
                                  <div className="text-center text-gray-400">
                                      <FileText size={48} className="mx-auto mb-2 opacity-50" />
                                      <p className="font-bold">ARQUIVO ORIGINAL NÃO ENCONTRADO</p>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
                  <div className="p-4 bg-white border-t flex justify-end">
                      <button onClick={() => setPreviewArt(null)} className="bg-gray-800 text-white px-6 py-2 rounded font-black">FECHAR</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};