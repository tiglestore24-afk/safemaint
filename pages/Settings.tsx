
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storage';
import { Employee, RegisteredART, ScheduleItem, User, OMRecord, ARTRiskItem, ARTStep } from '../types';
import { Upload, Link as LinkIcon, FileText, Trash2, UserPlus, Lock, Edit2, XCircle, RotateCcw, Server, Wifi, Save, Globe, Plus, ClipboardList, Layers, Code, FileCode, Smartphone, Coffee, CheckCircle, Eye, X, ScanLine, Wand2, AlertTriangle, Calendar, FileInput, Settings as GearIcon, Loader2, Search, BookOpen, Database, CheckCircle2, Maximize2, UserCheck, Users, Shield, PlusCircle, MinusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../components/BackButton';

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
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  
  // Loading States for Async Operations
  const [isSavingArt, setIsSavingArt] = useState(false);
  const [isSavingOm, setIsSavingOm] = useState(false);
  const [isProcessingSchedule, setIsProcessingSchedule] = useState(false);

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

  // ART Form & Library
  const [isEditingArtId, setIsEditingArtId] = useState<string | null>(null);
  const [artNum, setArtNum] = useState('');
  const [artName, setArtName] = useState('');
  const [artPdfFile, setArtPdfFile] = useState<File | null>(null); 
  const [artSearch, setArtSearch] = useState('');
  const [viewingArt, setViewingArt] = useState<RegisteredART | null>(null); // State para visualizar documento
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // ART Review/Edit State
  const [showArtReview, setShowArtReview] = useState(false);
  const [artRisks, setArtRisks] = useState<ARTRiskItem[]>([]);
  const [artSteps, setArtSteps] = useState<ARTStep[]>([]);
  const [artControlMeasures, setArtControlMeasures] = useState('');

  // OM Management States
  const [isAnalyzingOM, setIsAnalyzingOM] = useState(false);
  const [omFile, setOmFile] = useState<File | null>(null);
  const [omNumber, setOmNumber] = useState('');
  const [omDesc, setOmDesc] = useState('');
  const [omTag, setOmTag] = useState(''); 
  const [omType, setOmType] = useState<'CORRETIVA' | 'PREVENTIVA' | null>(null);
  const [linkedScheduleId, setLinkedScheduleId] = useState('');
  const [showOmReview, setShowOmReview] = useState(false);

  // Toast
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

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
      setScheduleItems(StorageService.getSchedule());
      
      if (activeTab === 'USERS') {
          setIsLoadingUsers(true);
          StorageService.getUsers().then(u => {
              setUsers(u);
              setIsLoadingUsers(false);
          });
      }
  };

  const showFeedback = (msg: string, type: 'success' | 'error') => {
      setShowToast({message: msg, type});
      setTimeout(() => setShowToast(null), 3000);
  };

  // --- EMPLOYEE HANDLERS ---
  const handleSaveEmployee = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      if(empName && empMat && empFunc) { 
          if(isEditingEmp) { 
              await StorageService.updateEmployee({ id: isEditingEmp, name: empName, matricula: empMat, function: empFunc, status: 'ACTIVE' }); 
              showFeedback("Funcionário Atualizado!", 'success');
          } else { 
              await StorageService.addEmployee({ id: crypto.randomUUID(), name: empName, matricula: empMat, function: empFunc, status: 'ACTIVE' }); 
              showFeedback("Funcionário Cadastrado!", 'success');
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
  const handleDeleteEmployee = async (id: string) => { if(window.confirm("Mover para lixeira?")) { await StorageService.deleteEmployee(id); refreshData(); }};
  const handleRestoreEmp = async (id: string) => { await StorageService.restoreEmployee(id); refreshData(); };
  const handlePermDeleteEmp = async (id: string) => { if(window.confirm("Excluir permanentemente?")) { await StorageService.deleteEmployeePermanently(id); refreshData(); }};

  // --- USER HANDLERS ---
  const handleSaveUser = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      if(userName && userMat && userLogin && userPass) { 
          setIsLoadingUsers(true);
          if(isEditingUser) { 
              await StorageService.updateUser({ id: isEditingUser, name: userName, matricula: userMat, login: userLogin.toUpperCase(), password: userPass, role: userRole }); 
              showFeedback("Usuário atualizado!", 'success');
          } else { 
              const success = await StorageService.addUser({ id: crypto.randomUUID(), name: userName, matricula: userMat, login: userLogin.toUpperCase(), password: userPass, role: userRole });
              if (!success) {
                  showFeedback("Erro: Login já existe ou erro de conexão.", 'error');
              } else {
                  showFeedback("Usuário criado!", 'success');
              }
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

  const handleCreateNewART = (e: React.FormEvent) => { 
      e.preventDefault(); 
      if(!artNum || !artName) {
          alert("PREENCHA NÚMERO E NOME DA ART.");
          return;
      }
      // Limpar estados para nova criação
      setIsEditingArtId(null);
      
      // Mock Data inicial
      setArtRisks([
            { situation: 'TRABALHO EM ALTURA', total: 1, riskLevel: 'ALTO' },
            { situation: 'RUÍDO EXCESSIVO', total: 1, riskLevel: 'MÉDIO' }
      ]);
      setArtSteps([
          { item: 1, step: "ISOLAR A ÁREA", riskLevel: "BAIXO" },
          { item: 2, step: "BLOQUEIO LOTO", riskLevel: "ALTO" }
      ]);
      setArtControlMeasures('USO DE EPIs OBRIGATÓRIO.');
      
      setShowArtReview(true);
  };

  const handleEditArtClick = (art: RegisteredART) => {
      setArtNum(art.code);
      setArtName(art.taskName);
      setArtRisks(art.risks || []);
      setArtSteps(art.steps || []);
      setArtControlMeasures(art.controlMeasures || '');
      setIsEditingArtId(art.id);
      setShowArtReview(true);
  };

  // -- ART INTERNAL EDITING --
  const addRisk = () => setArtRisks([...artRisks, { situation: 'NOVO RISCO', total: 1, riskLevel: 'BAIXO' }]);
  const removeRisk = (idx: number) => setArtRisks(artRisks.filter((_, i) => i !== idx));
  const updateRisk = (idx: number, field: keyof ARTRiskItem, val: any) => {
      const updated = [...artRisks];
      updated[idx] = { ...updated[idx], [field]: val };
      setArtRisks(updated);
  };

  const addStep = () => setArtSteps([...artSteps, { item: artSteps.length + 1, step: 'NOVO PASSO', riskLevel: 'BAIXO' }]);
  const removeStep = (idx: number) => setArtSteps(artSteps.filter((_, i) => i !== idx));
  const updateStep = (idx: number, field: keyof ARTStep, val: any) => {
      const updated = [...artSteps];
      updated[idx] = { ...updated[idx], [field]: val };
      setArtSteps(updated);
  };

  const handleConfirmSaveART = async () => {
      setIsSavingArt(true);
      
      let pdfBase64: string | undefined = undefined;
      if (artPdfFile) {
          try { pdfBase64 = await fileToBase64(artPdfFile); } catch(e) {}
      } else if (isEditingArtId) {
          // Manter PDF antigo se não houver novo e for edição
          const existing = arts.find(a => a.id === isEditingArtId);
          pdfBase64 = existing?.pdfUrl;
      }

      const newArt: RegisteredART = {
        id: isEditingArtId || crypto.randomUUID(),
        code: artNum,
        company: 'Vale S.A.',
        taskName: artName,
        area: 'MANUTENÇÃO',
        omve: 'SIM',
        emissionDate: new Date().toLocaleDateString(),
        risks: artRisks,
        controlMeasures: artControlMeasures,
        steps: artSteps,
        pdfUrl: pdfBase64
      };

      await StorageService.addART(newArt); // Lógica de Add lida com Upsert no StorageService
      setArts(StorageService.getARTs()); 
      
      // Reset
      setArtNum(''); 
      setArtName(''); 
      setArtPdfFile(null);
      setIsEditingArtId(null);
      setShowArtReview(false);
      
      if(fileInputRef.current) fileInputRef.current.value = "";
      setIsSavingArt(false);
      showFeedback(isEditingArtId ? "ART ATUALIZADA!" : "NOVA ART CRIADA!", 'success');
  };

  const handleDeleteART = async (id: string) => { if(window.confirm("Excluir ART padrão?")) { await StorageService.deleteART(id); setArts(StorageService.getARTs()); }};

  // --- RENDER STANDARD DOCUMENT (NO SIGNATURES) ---
  const renderStandardDocument = (art: RegisteredART) => (
      <div className="bg-white p-8 md:p-12 shadow-2xl overflow-hidden text-gray-900 border border-gray-300 max-w-4xl mx-auto my-4">
          {/* HEADER */}
          <div className="flex justify-between items-center border-b-4 border-vale-green pb-6 mb-8">
              <div>
                  <h1 className="text-2xl font-black text-vale-darkgray uppercase tracking-tight">ART PADRÃO</h1>
                  <p className="text-xs font-bold text-vale-green tracking-[0.3em] uppercase">PROCEDIMENTO OPERACIONAL PADRÃO</p>
              </div>
              <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase">CÓDIGO ART</p>
                  <p className="text-3xl font-mono font-black text-gray-800">{art.code}</p>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-4 border border-gray-200 rounded">
              <div>
                  <span className="block text-[9px] font-black text-gray-400 uppercase">TAREFA</span>
                  <span className="font-bold text-sm text-gray-800">{art.taskName}</span>
              </div>
              <div>
                  <span className="block text-[9px] font-black text-gray-400 uppercase">ÁREA</span>
                  <span className="font-bold text-sm text-gray-800">{art.area}</span>
              </div>
          </div>

          {/* RISK TABLE */}
          <div className="mb-8">
              <h4 className="font-black text-sm mb-2 bg-vale-dark text-white py-1 px-2 uppercase tracking-wide">1. ANÁLISE DE RISCOS E CLASSIFICAÇÃO</h4>
              <table className="w-full text-[10px] border border-gray-400">
                  <thead className="bg-gray-200">
                      <tr>
                          <th className="border border-gray-400 p-2 text-left w-3/4">SITUAÇÃO DE RISCO</th>
                          <th className="border border-gray-400 p-2 text-center w-1/4">NÍVEL DE RISCO</th>
                      </tr>
                  </thead>
                  <tbody>
                      {art.risks && art.risks.map((r, i) => (
                          <tr key={i}>
                              <td className="border border-gray-400 p-2 font-bold uppercase">{r.situation}</td>
                              <td className="border border-gray-400 p-2 text-center font-bold uppercase">{r.riskLevel}</td>
                          </tr>
                      ))}
                      {(!art.risks || art.risks.length === 0) && (
                          <tr><td colSpan={2} className="p-2 text-center">SEM RISCOS CADASTRADOS</td></tr>
                      )}
                  </tbody>
              </table>
          </div>

          {/* CONTROL MEASURES */}
          <div className="mb-8">
               <h4 className="font-black text-sm mb-2 bg-vale-dark text-white py-1 px-2 uppercase tracking-wide">2. MEDIDAS DE CONTROLE OBRIGATÓRIAS</h4>
               <div className="p-4 border border-gray-400 bg-gray-50 text-xs font-bold text-justify whitespace-pre-line leading-relaxed uppercase">
                   {art.controlMeasures || 'NENHUMA MEDIDA REGISTRADA.'}
               </div>
          </div>

          {/* STEPS TABLE */}
          <div className="mb-8">
              <h4 className="font-black text-sm mb-2 bg-vale-dark text-white py-1 px-2 uppercase tracking-wide">3. PASSO A PASSO DA TAREFA</h4>
              <table className="w-full text-[10px] border border-gray-400">
                  <thead className="bg-gray-200">
                      <tr>
                          <th className="border border-gray-400 p-2 text-center w-12">ITEM</th>
                          <th className="border border-gray-400 p-2 text-left">DESCRIÇÃO DO PASSO</th>
                          <th className="border border-gray-400 p-2 text-center w-20">RISCO</th>
                      </tr>
                  </thead>
                  <tbody>
                      {art.steps && art.steps.map((s, i) => (
                          <tr key={i}>
                              <td className="border border-gray-400 p-2 text-center font-bold">{s.item}</td>
                              <td className="border border-gray-400 p-2 font-bold uppercase">{s.step}</td>
                              <td className="border border-gray-400 p-2 text-center font-bold uppercase">{s.riskLevel}</td>
                          </tr>
                      ))}
                      {(!art.steps || art.steps.length === 0) && (
                          <tr><td colSpan={3} className="p-2 text-center">SEM PASSOS CADASTRADOS</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
          
          <div className="text-center mt-10 p-4 border-t-2 border-dashed border-gray-300">
              <p className="text-[10px] font-bold text-gray-400 uppercase">DOCUMENTO PADRÃO DO SISTEMA - NÃO REQUER ASSINATURA NESTA VISUALIZAÇÃO</p>
          </div>
      </div>
  );

  // --- OM HANDLERS ---
  const handleOmFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.files && e.target.files[0]) {
      setOmFile(e.target.files[0]);
      setIsAnalyzingOM(true);
      setTimeout(() => {
          setOmNumber("202505732960");
          setOmDesc("PERDA DE POTÊNCIA E FUMAÇA ANORMAL");
          setOmTag("CCPX-MIN-TRP-C777G-CA5309"); 
          setOmType('CORRETIVA'); 
          setIsAnalyzingOM(false);
      }, 2000);
    }
  };

  const handleOpenOmReview = () => {
      if(!omNumber && !omTag && !omDesc && !omFile) { alert("PREENCHA OS DADOS."); return; }
      if(!omType) setOmType('PREVENTIVA'); 
      setShowOmReview(true);
  };

  const handleSaveOM = async () => {
      setIsSavingOm(true);
      let pdfBase64: string | undefined = undefined;
      if (omFile) { try { pdfBase64 = await fileToBase64(omFile); } catch(e) {} }

      const newOM: OMRecord = {
          id: crypto.randomUUID(), omNumber, description: omDesc, tag: omTag, type: omType!,
          status: 'PENDENTE', createdAt: new Date().toISOString(), createdBy: localStorage.getItem('safemaint_user') || 'ADMIN',
          pdfUrl: pdfBase64, linkedScheduleId: linkedScheduleId || undefined
      };
      await StorageService.saveOM(newOM);
      showFeedback(`OM CRIADA!`, 'success');
      
      setOmFile(null); setOmNumber(''); setOmDesc(''); setOmTag(''); setOmType(null); setShowOmReview(false);
      setIsSavingOm(false);
  };

  const handleLinkSchedule = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      setLinkedScheduleId(id);
      const item = scheduleItems.find(s => s.id === id);
      if(item) {
          setOmDesc(item.description);
          setOmTag(item.frotaOm.split(/[\n/]/)[0].trim());
      }
  };

  // --- SCHEDULE HANDLERS ---
  const parseExcelData = async () => { 
      try { 
          setIsProcessingSchedule(true);
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
              await StorageService.archiveAndClearSchedule(); 
              await StorageService.updateSchedule(items); 
              setScheduleStatus('OK'); 
              setScheduleInput('');
              showFeedback(`${items.length} itens importados!`, 'success');
          }
      } catch(e) { setScheduleStatus('ERRO.'); }
      finally { setIsProcessingSchedule(false); }
  };
  const handleClearSchedule = async () => { 
      if(window.confirm("Limpar programação?")) { 
          await StorageService.archiveAndClearSchedule(); 
          setScheduleStatus('LIMPA'); 
      }
  };

  const filteredArts = arts.filter(a => a.code.toLowerCase().includes(artSearch.toLowerCase()) || a.taskName.toLowerCase().includes(artSearch.toLowerCase()));

  return (
    <div className="max-w-[1400px] mx-auto pb-20 px-4">
      <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <h2 className="text-2xl font-black text-vale-darkgray flex items-center gap-2 uppercase">
              <GearIcon size={28} className="text-vale-green" />
              CONFIGURAÇÕES DO SISTEMA
          </h2>
      </div>
      
      <div className="flex border-b mb-6 overflow-x-auto bg-white rounded-t-lg shadow-sm">
        {['OMS', 'EMPLOYEES', 'ARTS', 'SCHEDULE', 'USERS'].map((tab) => (
            <button 
                key={tab} 
                className={`px-6 py-4 font-black text-sm whitespace-nowrap border-b-4 transition-colors ${activeTab === tab ? 'text-vale-green border-vale-green bg-green-50' : 'text-gray-500 border-transparent hover:bg-gray-50'}`} 
                onClick={() => setActiveTab(tab as any)}
            >
                {tab === 'OMS' ? 'GESTÃO DE OMs' :
                 tab === 'EMPLOYEES' ? 'FUNCIONÁRIOS' : 
                 tab === 'ARTS' ? 'ARTs PADRÃO' : 
                 tab === 'SCHEDULE' ? 'PROGRAMAÇÃO' : 'USUÁRIOS'}
            </button>
        ))}
      </div>

      {activeTab === 'EMPLOYEES' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
              <div className="lg:col-span-1">
                  <div className="bg-white p-6 rounded shadow border border-gray-200 sticky top-4">
                      <h3 className="font-bold text-lg mb-4 text-vale-darkgray flex items-center gap-2">
                          <UserPlus size={20} className="text-vale-green" />
                          {isEditingEmp ? 'EDITAR FUNCIONÁRIO' : 'NOVO FUNCIONÁRIO'}
                      </h3>
                      <form onSubmit={handleSaveEmployee} className="space-y-4">
                          <div>
                              <label className="block text-xs font-black text-gray-500 mb-1">NOME COMPLETO</label>
                              <input value={empName} onChange={e => setEmpName(e.target.value)} className="w-full border-2 border-gray-300 rounded p-2 font-bold uppercase" required />
                          </div>
                          <div>
                              <label className="block text-xs font-black text-gray-500 mb-1">MATRÍCULA</label>
                              <input value={empMat} onChange={e => setEmpMat(e.target.value)} className="w-full border-2 border-gray-300 rounded p-2 font-bold uppercase" required />
                          </div>
                          <div>
                              <label className="block text-xs font-black text-gray-500 mb-1">FUNÇÃO / CARGO</label>
                              <input value={empFunc} onChange={e => setEmpFunc(e.target.value)} className="w-full border-2 border-gray-300 rounded p-2 font-bold uppercase" required />
                          </div>
                          <div className="flex gap-2 pt-2">
                              {isEditingEmp && (
                                  <button type="button" onClick={resetEmpForm} className="px-4 py-2 bg-gray-200 text-gray-600 font-bold rounded hover:bg-gray-300">
                                      CANCELAR
                                  </button>
                              )}
                              <button type="submit" className="flex-1 bg-vale-green text-white font-black py-2 rounded hover:bg-[#00605d] shadow-lg">
                                  {isEditingEmp ? 'ATUALIZAR' : 'CADASTRAR'}
                              </button>
                          </div>
                      </form>
                  </div>
              </div>

              <div className="lg:col-span-2">
                  <div className="bg-white p-6 rounded shadow border border-gray-200 min-h-[500px]">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-lg text-vale-darkgray flex items-center gap-2">
                              <Users size={20} /> QUADRO DE FUNCIONÁRIOS
                          </h3>
                          <button 
                              onClick={() => setShowEmpTrash(!showEmpTrash)}
                              className={`text-xs font-bold px-3 py-1 rounded border flex items-center gap-1 ${showEmpTrash ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                          >
                              {showEmpTrash ? <RotateCcw size={14}/> : <Trash2 size={14}/>}
                              {showEmpTrash ? 'ATIVOS' : 'LIXEIRA'}
                          </button>
                      </div>

                      <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                              <thead className="bg-gray-50 border-b-2 border-gray-200">
                                  <tr>
                                      <th className="px-4 py-3 text-left font-black text-gray-500">MATRÍCULA</th>
                                      <th className="px-4 py-3 text-left font-black text-gray-500">NOME</th>
                                      <th className="px-4 py-3 text-left font-black text-gray-500">FUNÇÃO</th>
                                      <th className="px-4 py-3 text-right font-black text-gray-500">AÇÕES</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {(showEmpTrash ? employees.filter(e => e.status === 'TRASH') : employees.filter(e => e.status !== 'TRASH')).map(emp => (
                                      <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                          <td className="px-4 py-3 font-mono font-bold text-gray-600">{emp.matricula}</td>
                                          <td className="px-4 py-3 font-bold text-gray-800">{emp.name}</td>
                                          <td className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">{emp.function}</td>
                                          <td className="px-4 py-3 text-right flex justify-end gap-2">
                                              {showEmpTrash ? (
                                                  <>
                                                      <button onClick={() => handleRestoreEmp(emp.id)} className="text-vale-green hover:bg-green-50 p-1.5 rounded"><RotateCcw size={16}/></button>
                                                      <button onClick={() => handlePermDeleteEmp(emp.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><XCircle size={16}/></button>
                                                  </>
                                              ) : (
                                                  <>
                                                      <button onClick={() => handleEditEmpClick(emp)} className="text-vale-blue hover:bg-blue-50 p-1.5 rounded"><Edit2 size={16}/></button>
                                                      <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-400 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                                                  </>
                                              )}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'ARTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-white p-6 rounded shadow border border-gray-200">
                    <h3 className="font-bold text-lg mb-4 text-vale-darkgray flex items-center gap-2">
                        <ScanLine size={20} className="text-vale-green" /> {isEditingArtId ? 'EDITAR ART' : 'NOVA ART PADRÃO'}
                    </h3>
                    
                    <form onSubmit={handleCreateNewART} className="bg-gray-50 p-4 rounded border border-gray-200 shadow-inner">
                        <div className="mb-4">
                            <label className="block text-xs font-black text-gray-500 uppercase mb-2">1. PDF (OPCIONAL)</label>
                            <div className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${artPdfFile ? 'border-vale-green bg-green-50' : 'border-gray-300 hover:border-vale-blue bg-white'}`}>
                                <input type="file" accept=".pdf" ref={fileInputRef} onChange={handlePdfSelection} className="absolute inset-0 opacity-0 cursor-pointer" />
                                <div className="flex flex-col items-center justify-center">
                                    {artPdfFile ? <CheckCircle size={32} className="text-vale-green mb-2"/> : <Upload size={32} className="text-gray-400 mb-2"/>}
                                    <span className="text-xs font-black text-gray-600 uppercase">{artPdfFile ? 'ANEXADO' : 'ANEXAR PDF'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-black text-gray-500 uppercase mb-1">2. CÓDIGO ART</label>
                            <input id="artNumInput" placeholder="EX: 33777" value={artNum} onChange={e => setArtNum(e.target.value)} className="w-full border-2 border-gray-300 p-3 rounded font-bold uppercase text-sm focus:border-vale-green outline-none" />
                        </div>
                        <div className="mb-6">
                            <label className="block text-xs font-black text-gray-500 uppercase mb-1">3. TAREFA / DESCRIÇÃO</label>
                            <input placeholder="EX: TROCA DE PNEUS..." value={artName} onChange={e => setArtName(e.target.value)} className="w-full border-2 border-gray-300 p-3 rounded font-bold uppercase text-sm focus:border-vale-green outline-none" />
                        </div>

                        <button type="submit" disabled={!artNum || !artName} className={`w-full bg-vale-green text-white font-black py-3 rounded flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${(!artNum || !artName) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#00605d]'}`}>
                            <Edit2 size={18} /> 
                            {isEditingArtId ? 'EDITAR DETALHES' : 'DEFINIR RISCOS E PASSOS'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-8">
                <div className="bg-white p-6 rounded shadow border border-gray-200 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                        <h3 className="font-bold text-lg text-vale-darkgray flex items-center gap-2">
                            <BookOpen size={20} className="text-vale-green" /> BIBLIOTECA DE ARTs
                        </h3>
                        <div className="relative w-64">
                            <input type="text" placeholder="BUSCAR ART..." value={artSearch} onChange={(e) => setArtSearch(e.target.value.toUpperCase())} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs font-bold uppercase focus:ring-1 focus:ring-vale-green outline-none"/>
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 max-h-[600px]">
                        {filteredArts.length === 0 && <div className="text-center text-gray-400 py-10 font-bold text-sm">NENHUMA ART ENCONTRADA.</div>}
                        {filteredArts.map(a => (
                            <div key={a.id} className="group flex justify-between items-center bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md hover:border-vale-green transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="bg-gray-100 p-3 rounded-lg text-gray-500 group-hover:bg-green-100 group-hover:text-vale-green transition-colors">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-gray-800 text-lg">ART {a.code}</p>
                                            {a.pdfUrl && <span className="bg-blue-100 text-vale-blue text-[9px] px-2 py-0.5 rounded font-black">PDF</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{a.taskName}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setViewingArt(a)} className="bg-gray-100 text-vale-darkgray hover:bg-gray-200 px-3 py-2 rounded text-xs font-black flex items-center gap-1 transition-colors border border-gray-200">
                                        <Eye size={14} /> VISUALIZAR
                                    </button>
                                    <button onClick={() => handleEditArtClick(a)} className="bg-vale-blue text-white hover:bg-[#004a7c] px-3 py-2 rounded text-xs font-black flex items-center gap-1 transition-colors">
                                        <Edit2 size={14} /> EDITAR
                                    </button>
                                    <button onClick={() => handleDeleteART(a.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}
      
      {/* ART REVIEW/EDIT MODAL */}
      {showArtReview && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[70] p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden relative shadow-2xl">
                <div className="bg-vale-dark p-4 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <Edit2 size={20} className="text-vale-green"/> 
                        <div>
                            <h3 className="font-black text-lg leading-none uppercase">{isEditingArtId ? 'EDITAR ART' : 'NOVA ART'} - {artNum}</h3>
                            <p className="text-[10px] font-bold text-gray-400">{artName}</p>
                        </div>
                    </div>
                    <button onClick={() => setShowArtReview(false)} className="hover:bg-gray-700 p-2 rounded"><X size={24}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-gray-100 space-y-6 custom-scrollbar">
                    {/* RISCOS */}
                    <div className="bg-white p-4 rounded shadow">
                        <div className="flex justify-between items-center mb-2 border-b pb-2">
                            <h4 className="font-black text-vale-darkgray">1. ANÁLISE DE RISCOS</h4>
                            <button onClick={addRisk} className="text-xs bg-green-100 text-vale-green px-2 py-1 rounded font-bold flex items-center gap-1 hover:bg-green-200"><PlusCircle size={14}/> ADICIONAR RISCO</button>
                        </div>
                        <div className="space-y-2">
                            {artRisks.map((r, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-center text-xs">
                                    <input value={r.situation} onChange={e => updateRisk(i, 'situation', e.target.value)} className="col-span-8 border p-2 rounded font-bold uppercase" placeholder="SITUAÇÃO DE RISCO" />
                                    <input value={r.riskLevel} onChange={e => updateRisk(i, 'riskLevel', e.target.value)} className="col-span-3 border p-2 rounded text-center font-bold uppercase" placeholder="NÍVEL" />
                                    <button onClick={() => removeRisk(i)} className="col-span-1 text-red-500 hover:bg-red-50 p-2 rounded flex justify-center"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CONTROL MEASURES */}
                    <div className="bg-white p-4 rounded shadow">
                        <h4 className="font-black text-vale-darkgray mb-2 border-b pb-2">2. MEDIDAS DE CONTROLE (RESUMO)</h4>
                        <textarea value={artControlMeasures} onChange={e => setArtControlMeasures(e.target.value)} className="w-full border p-2 rounded font-bold h-20 text-xs uppercase" placeholder="Descreva as medidas gerais..." />
                    </div>

                    {/* STEPS */}
                    <div className="bg-white p-4 rounded shadow">
                         <div className="flex justify-between items-center mb-2 border-b pb-2">
                            <h4 className="font-black text-vale-darkgray">3. PASSO A PASSO DA TAREFA</h4>
                            <button onClick={addStep} className="text-xs bg-green-100 text-vale-green px-2 py-1 rounded font-bold flex items-center gap-1 hover:bg-green-200"><PlusCircle size={14}/> ADICIONAR PASSO</button>
                        </div>
                        <div className="space-y-2">
                            {artSteps.map((s, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-center text-xs">
                                    <div className="col-span-1 bg-gray-100 text-center py-2 font-black rounded">{i+1}</div>
                                    <input value={s.step} onChange={e => updateStep(i, 'step', e.target.value)} className="col-span-8 border p-2 rounded font-bold uppercase" placeholder="DESCRIÇÃO DO PASSO" />
                                    <input value={s.riskLevel} onChange={e => updateStep(i, 'riskLevel', e.target.value)} className="col-span-2 border p-2 rounded text-center font-bold uppercase" placeholder="RISCO" />
                                    <button onClick={() => removeStep(i)} className="col-span-1 text-red-500 hover:bg-red-50 p-2 rounded flex justify-center"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3 shrink-0">
                    <button onClick={() => setShowArtReview(false)} className="px-6 py-3 rounded-lg font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors uppercase text-xs">CANCELAR</button>
                    <button onClick={handleConfirmSaveART} disabled={isSavingArt} className="bg-vale-green hover:bg-[#00605d] text-white px-8 py-3 rounded-lg font-black shadow-lg flex items-center gap-2 transition-transform active:scale-95 uppercase text-xs">
                        {isSavingArt ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
                        {isSavingArt ? 'SALVANDO...' : 'SALVAR ART NA BIBLIOTECA'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* VIEW ART MODAL (READ ONLY - NO SIGNATURES) */}
      {viewingArt && (
          <div className="fixed inset-0 bg-vale-dark/95 flex items-center justify-center z-[80] p-4 backdrop-blur-md animate-fadeIn">
              <div className="bg-white rounded-xl w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden relative shadow-2xl">
                  {/* Header Modal */}
                  <div className="bg-vale-green text-white p-4 flex justify-between items-center shrink-0 shadow-md">
                      <div className="flex items-center gap-3">
                          <FileText size={24} />
                          <div>
                              <h3 className="font-black text-lg leading-none uppercase tracking-tight">VISUALIZAÇÃO DE ART PADRÃO</h3>
                              <p className="text-[10px] font-bold text-white/70 uppercase mt-1">BIBLIOTECA TÉCNICA</p>
                          </div>
                      </div>
                      <button onClick={() => setViewingArt(null)} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={28}/></button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto bg-gray-200 p-6 custom-scrollbar">
                      {/* Se existir PDF real anexado, mostrar iframe */}
                      {viewingArt.pdfUrl && (
                          <div className="mb-8 border-b-4 border-gray-300 pb-8">
                              <h4 className="font-black text-gray-700 mb-4 flex items-center gap-2"><FileText size={18}/> PDF ANEXADO (ORIGINAL)</h4>
                              <div className="bg-white p-2 border border-gray-300 shadow-md h-[500px]">
                                  <iframe src={viewingArt.pdfUrl} className="w-full h-full border-none" title="PDF Original" />
                              </div>
                          </div>
                      )}

                      {/* Renderização do Documento Digital (Sempre mostrar estrutura) */}
                      {renderStandardDocument(viewingArt)}
                  </div>

                  <div className="p-4 bg-white border-t border-gray-200 flex justify-end shrink-0">
                      <button onClick={() => setViewingArt(null)} className="px-8 py-3 bg-gray-100 text-gray-700 font-black rounded-lg hover:bg-gray-200 transition-colors uppercase text-xs">FECHAR</button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'OMS' && (
          <div className="bg-white p-6 rounded shadow border border-gray-200 animate-fadeIn">
              <h3 className="font-bold text-lg mb-4 text-vale-darkgray flex items-center gap-2">
                  <FileInput size={20} /> CADASTRAR NOVA OM (MANUAL OU PDF)
              </h3>
              <div className="p-6 bg-gray-50 rounded border border-gray-200 shadow-inner max-w-2xl mx-auto">
                  <div className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors relative mb-6 ${omFile ? 'border-vale-green bg-green-50' : 'border-gray-300 hover:bg-white'}`}>
                      <input type="file" accept=".pdf" onChange={handleOmFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                      {isAnalyzingOM ? (
                            <div className="flex flex-col items-center text-vale-blue animate-pulse">
                                <ScanLine size={40} className="mb-2" />
                                <span className="font-bold text-sm">EXTRAINDO DADOS DA OM...</span>
                            </div>
                      ) : omFile ? (
                          <div className="flex flex-col items-center text-green-700">
                              <CheckCircle size={40} className="mb-2" />
                              <span className="font-bold text-sm">{omFile.name}</span>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center text-gray-400">
                              <FileText size={40} className="mb-2" />
                              <span className="font-bold text-sm">ANEXAR PDF DA OM (OBRIGATÓRIO)</span>
                          </div>
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                          <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">NÚMERO DA OM</label>
                          <input placeholder="EX: 202505..." value={omNumber} onChange={e => setOmNumber(e.target.value)} className="w-full border p-2 rounded font-bold uppercase" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">LOCAL DE INSTALAÇÃO (TAG)</label>
                          <input placeholder="EX: CCPX-MIN..." value={omTag} onChange={e => setOmTag(e.target.value)} className="w-full border p-2 rounded font-bold uppercase" />
                      </div>
                  </div>
                  
                  <div className="mb-4">
                      <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">DESCRIÇÃO DA OM</label>
                      <textarea placeholder="DESCRIÇÃO TÉCNICA..." value={omDesc} onChange={e => setOmDesc(e.target.value)} className="w-full border p-2 rounded font-bold uppercase h-20" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                      <button onClick={() => setOmType('CORRETIVA')} className={`p-3 rounded border-2 font-black text-xs flex flex-col items-center gap-1 ${omType === 'CORRETIVA' ? 'bg-red-50 border-red-500 text-red-700' : 'border-gray-200'}`}><AlertTriangle size={16}/> CORRETIVA</button>
                      <button onClick={() => setOmType('PREVENTIVA')} className={`p-3 rounded border-2 font-black text-xs flex flex-col items-center gap-1 ${omType === 'PREVENTIVA' ? 'bg-blue-50 border-vale-blue text-vale-blue' : 'border-gray-200'}`}><Calendar size={16}/> PREVENTIVA</button>
                  </div>
                  
                  {omType === 'PREVENTIVA' && (
                      <div className="mb-6 animate-fadeIn">
                          <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">VINCULAR A ITEM DA PROGRAMAÇÃO (OPCIONAL)</label>
                          <select 
                              value={linkedScheduleId} 
                              onChange={handleLinkSchedule}
                              className="w-full border p-2 rounded font-bold uppercase text-xs"
                          >
                              <option value="">-- SELECIONE SE HOUVER --</option>
                              {scheduleItems.map(s => (
                                  <option key={s.id} value={s.id}>{s.frotaOm} - {s.description.substring(0, 30)}...</option>
                              ))}
                          </select>
                      </div>
                  )}

                  <button onClick={handleOpenOmReview} disabled={isAnalyzingOM} className="w-full bg-vale-green text-white font-black py-3 rounded shadow-lg hover:bg-[#00605d] transition-colors flex items-center justify-center gap-2">
                      <Eye size={20} />
                      PRÉ-VISUALIZAR E CONFIRMAR
                  </button>
              </div>
          </div>
      )}

      {activeTab === 'SCHEDULE' && (
          <div className="bg-white p-6 rounded shadow border border-gray-200 animate-fadeIn">
              <div className="flex justify-between items-start mb-6">
                  <div>
                      <h3 className="font-bold text-lg text-vale-darkgray flex items-center gap-2">
                          <Calendar size={20} className="text-vale-blue" /> IMPORTAR PROGRAMAÇÃO SEMANAL
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">Cole os dados do Excel/Project abaixo (Copiar tabela inteira).</p>
                  </div>
                  <button onClick={handleClearSchedule} className="bg-red-100 text-red-700 px-4 py-2 rounded text-xs font-black flex items-center gap-2 hover:bg-red-200 transition-colors">
                      <Trash2 size={14}/> LIMPAR TUDO
                  </button>
              </div>
              
              <textarea 
                  value={scheduleInput}
                  onChange={e => setScheduleInput(e.target.value)}
                  className="w-full h-64 border-2 border-gray-300 rounded p-4 font-mono text-xs mb-4 focus:border-vale-blue outline-none"
                  placeholder="COLE AS LINHAS DO EXCEL AQUI..."
              />
              
              <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500">{scheduleStatus}</span>
                  <button onClick={parseExcelData} disabled={isProcessingSchedule || !scheduleInput} className="bg-vale-blue text-white px-8 py-3 rounded font-black shadow-lg hover:bg-[#004a7c] disabled:opacity-50 flex items-center gap-2">
                      {isProcessingSchedule ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                      PROCESSAR DADOS
                  </button>
              </div>
          </div>
      )}

      {activeTab === 'USERS' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
              <div className="lg:col-span-1">
                  <div className="bg-white p-6 rounded shadow border border-gray-200 sticky top-4">
                      <h3 className="font-bold text-lg mb-4 text-vale-darkgray flex items-center gap-2">
                          <UserCheck size={20} className="text-vale-green" />
                          {isEditingUser ? 'EDITAR ACESSO' : 'NOVO USUÁRIO'}
                      </h3>
                      <form onSubmit={handleSaveUser} className="space-y-4">
                          <div>
                              <label className="block text-xs font-black text-gray-500 mb-1">LOGIN</label>
                              <input value={userLogin} onChange={e => setUserLogin(e.target.value.toUpperCase())} className="w-full border-2 border-gray-300 rounded p-2 font-bold uppercase" required />
                          </div>
                          <div>
                              <label className="block text-xs font-black text-gray-500 mb-1">SENHA</label>
                              <div className="relative">
                                  <input type="password" value={userPass} onChange={e => setUserPass(e.target.value)} className="w-full border-2 border-gray-300 rounded p-2 font-bold" required={!isEditingUser} placeholder={isEditingUser ? "Preencha para alterar" : ""} />
                                  <Lock size={16} className="absolute right-3 top-3 text-gray-400"/>
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-black text-gray-500 mb-1">NOME</label>
                              <input value={userName} onChange={e => setUserName(e.target.value)} className="w-full border-2 border-gray-300 rounded p-2 font-bold uppercase" required />
                          </div>
                          <div>
                              <label className="block text-xs font-black text-gray-500 mb-1">MATRÍCULA</label>
                              <input value={userMat} onChange={e => setUserMat(e.target.value)} className="w-full border-2 border-gray-300 rounded p-2 font-bold uppercase" required />
                          </div>
                          <div>
                              <label className="block text-xs font-black text-gray-500 mb-1">NÍVEL</label>
                              <select value={userRole} onChange={e => setUserRole(e.target.value as any)} className="w-full border-2 border-gray-300 rounded p-2 font-bold uppercase bg-white">
                                  <option value="OPERADOR">OPERADOR (BÁSICO)</option>
                                  <option value="ADMIN">ADMINISTRADOR (TOTAL)</option>
                              </select>
                          </div>

                          <div className="flex gap-2 pt-2">
                              {isEditingUser && (
                                  <button type="button" onClick={resetUserForm} className="px-4 py-2 bg-gray-200 text-gray-600 font-bold rounded hover:bg-gray-300">
                                      CANCELAR
                                  </button>
                              )}
                              <button type="submit" disabled={isLoadingUsers} className="flex-1 bg-vale-green text-white font-black py-2 rounded hover:bg-[#00605d] shadow-lg flex items-center justify-center gap-2">
                                  {isLoadingUsers ? <Loader2 className="animate-spin" size={16}/> : (isEditingUser ? 'SALVAR' : 'CRIAR')}
                              </button>
                          </div>
                      </form>
                  </div>
              </div>

              <div className="lg:col-span-2">
                  <div className="bg-white p-6 rounded shadow border border-gray-200">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-lg text-vale-darkgray flex items-center gap-2">
                              <Shield size={20} /> CONTROLE DE ACESSO
                          </h3>
                          {isLoadingUsers && <Loader2 className="animate-spin text-vale-green" />}
                      </div>

                      <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                              <thead className="bg-gray-50 border-b-2 border-gray-200">
                                  <tr>
                                      <th className="px-4 py-3 text-left font-black text-gray-500">LOGIN</th>
                                      <th className="px-4 py-3 text-left font-black text-gray-500">NOME</th>
                                      <th className="px-4 py-3 text-left font-black text-gray-500">PERFIL</th>
                                      <th className="px-4 py-3 text-right font-black text-gray-500">AÇÕES</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {users.map(u => (
                                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                          <td className="px-4 py-3 font-mono font-bold text-gray-600">{u.login}</td>
                                          <td className="px-4 py-3 font-bold text-gray-800">{u.name}</td>
                                          <td className="px-4 py-3">
                                              <span className={`text-[10px] px-2 py-1 rounded font-black ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                  {u.role}
                                              </span>
                                          </td>
                                          <td className="px-4 py-3 text-right flex justify-end gap-2">
                                              {u.role !== 'ADMIN' || u.login !== 'ADMIN' ? (
                                                  <>
                                                      <button onClick={() => handleEditUserClick(u)} className="text-vale-blue hover:bg-blue-50 p-1.5 rounded"><Edit2 size={16}/></button>
                                                      <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                                                  </>
                                              ) : <span className="text-[10px] text-gray-400 font-bold italic">SISTEMA</span>}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* OM REVIEW MODAL (SIMPLIFIED FOR BREVITY, USING VALE COLORS) */}
      {showOmReview && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden relative shadow-2xl">
                   <div className="bg-vale-dark p-4 flex justify-between items-center text-white shrink-0">
                      <div className="flex items-center gap-3">
                          <Edit2 size={20} className="text-vale-green"/> 
                          <div><h3 className="font-black text-lg leading-none">REVISÃO DE CADASTRO</h3></div>
                      </div>
                      <button onClick={() => setShowOmReview(false)} className="hover:bg-gray-700 p-2 rounded"><X size={24}/></button>
                  </div>
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gray-100">
                      <div className="w-full md:w-3/5 bg-gray-800 border-r border-gray-700 relative flex flex-col">
                          {omFile ? <iframe src={URL.createObjectURL(omFile)} className="w-full h-full border-none bg-white"/> : <div className="p-10 text-white">SEM PDF</div>}
                      </div>
                      <div className="w-full md:w-2/5 flex flex-col bg-white overflow-y-auto custom-scrollbar p-6 space-y-4">
                           <input value={omNumber} onChange={e => setOmNumber(e.target.value)} className="w-full border-2 border-gray-300 p-3 rounded font-bold uppercase text-lg focus:border-vale-green outline-none" placeholder="OM"/>
                           <input value={omTag} onChange={e => setOmTag(e.target.value)} className="w-full border-2 border-gray-300 p-3 rounded font-bold uppercase text-lg focus:border-vale-green outline-none" placeholder="TAG"/>
                           <textarea value={omDesc} onChange={e => setOmDesc(e.target.value)} className="w-full border-2 border-gray-300 p-3 rounded font-bold uppercase h-32 focus:border-vale-green outline-none" placeholder="DESCRIÇÃO"/>
                           <button onClick={handleSaveOM} disabled={isSavingOm} className="bg-vale-green hover:bg-[#00605d] text-white px-8 py-3 rounded-lg font-black shadow-lg flex items-center gap-2 justify-center">{isSavingOm ? 'SALVANDO...' : 'CONFIRMAR'}</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showToast && (
          <div className={`fixed bottom-10 right-10 px-6 py-4 rounded-xl shadow-2xl text-white font-black uppercase text-xs flex items-center gap-3 animate-fade-in-up z-50 ${showToast.type === 'success' ? 'bg-vale-green' : 'bg-red-500'}`}>
              <CheckCircle2 size={20} /> {showToast.message}
          </div>
      )}
    </div>
  );
};
