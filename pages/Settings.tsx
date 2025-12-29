
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { Employee, User, OMRecord, ScheduleItem, RegisteredART } from '../types';
import { 
  Save, Loader2, Database, Users, Shield, 
  BrainCircuit, Trash2, Plus, FileText,
  UserPlus, UserCheck, ShieldCheck, FileInput, FileSearch, Eye, Download, X, Info, FileSpreadsheet, Upload, CheckCircle,
  Sparkles, Bot, FileUp, Edit, Search, AlertTriangle, Briefcase, Key
} from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { GoogleGenAI, Type } from "@google/genai";

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OMS' | 'SCHEDULE' | 'EMPLOYEES' | 'USERS' | 'PROCEDURES'>('OMS');
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewingART, setViewingART] = useState<RegisteredART | null>(null);
  const [viewingOM, setViewingOM] = useState<OMRecord | null>(null);
  const [omBlobUrl, setOmBlobUrl] = useState<string | null>(null);
  const [artBlobUrl, setArtBlobUrl] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [oms, setOms] = useState<OMRecord[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [arts, setArts] = useState<RegisteredART[]>([]);

  // --- STATES DE FORMULÁRIOS ---

  // OM
  const [newOmNumber, setNewOmNumber] = useState('');
  const [newOmTag, setNewOmTag] = useState('');
  const [newOmDesc, setNewOmDesc] = useState('');
  const [newOmPdf, setNewOmPdf] = useState<string>('');
  
  // ART
  const [artCode, setArtCode] = useState('');
  const [artTask, setArtTask] = useState('');
  const [artRisks, setArtRisks] = useState('');
  const [artPdfBase64, setArtPdfBase64] = useState<string>('');

  // EMPLOYEES
  const [empName, setEmpName] = useState('');
  const [empMatricula, setEmpMatricula] = useState('');
  const [empFunction, setEmpFunction] = useState('');

  // USERS
  const [userName, setUserName] = useState('');
  const [userLogin, setUserLogin] = useState('');
  const [userPass, setUserPass] = useState('');
  const [userRole, setUserRole] = useState<'ADMIN' | 'OPERADOR'>('OPERADOR');

  // AI & UTIL
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiStatusText, setAiStatusText] = useState('');
  const [excelText, setExcelText] = useState('');
  const [searchLibrary, setSearchLibrary] = useState('');

  useEffect(() => {
    refresh();
    window.addEventListener('safemaint_storage_update', refresh);
    return () => window.removeEventListener('safemaint_storage_update', refresh);
  }, []);

  // Conversor genérico Base64 -> Blob URL
  const convertToBlob = (base64Data: string) => {
      try {
          if (!base64Data) return null;
          if (base64Data.startsWith('data:application/pdf;base64,')) {
              const byteCharacters = atob(base64Data.split(',')[1]);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'application/pdf' });
              return URL.createObjectURL(blob);
          }
          return base64Data;
      } catch (e) {
          return base64Data;
      }
  };

  useEffect(() => {
      if (viewingOM?.pdfUrl) {
          const url = convertToBlob(viewingOM.pdfUrl);
          setOmBlobUrl(url);
          return () => { if (url && url.startsWith('blob:')) URL.revokeObjectURL(url); };
      }
      setOmBlobUrl(null);
  }, [viewingOM]);

  useEffect(() => {
      if (viewingART?.pdfUrl) {
          const url = convertToBlob(viewingART.pdfUrl);
          setArtBlobUrl(url);
          return () => { if (url && url.startsWith('blob:')) URL.revokeObjectURL(url); };
      }
      setArtBlobUrl(null);
  }, [viewingART]);

  const refresh = () => {
      setUsers(StorageService.getUsers());
      setEmployees(StorageService.getEmployees());
      setOms(StorageService.getOMs());
      setSchedule(StorageService.getSchedule());
      setArts(StorageService.getARTs());
  };

  // ... (código existente da IA e Handlers de Upload) ...
  const extractArtDataWithAI = async (base64Data: string) => {
    setIsProcessingAI(true);
    setAiStatusText("Analisando Documento ART...");
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const base64Content = base64Data.split(',')[1] || base64Data;
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{
                parts: [
                    { inlineData: { mimeType: "application/pdf", data: base64Content } },
                    { text: "Analise este documento de Análise de Risco (ART). Extraia o código da ART (um número), o nome da tarefa e um breve resumo dos riscos ou medidas de controle. Retorne um objeto JSON com as chaves 'artCode', 'taskName', e 'controlMeasures'." }
                ]
            }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        artCode: { type: Type.STRING },
                        taskName: { type: Type.STRING },
                        controlMeasures: { type: Type.STRING }
                    },
                    required: ["artCode", "taskName"]
                }
            }
        });
        const result = JSON.parse(response.text || "{}");
        if (result.artCode) setArtCode(result.artCode.replace(/\D/g, ''));
        if (result.taskName) setArtTask(result.taskName.toUpperCase());
        if (result.controlMeasures) setArtRisks(result.controlMeasures.toUpperCase());
    } catch (error) {
        console.error("Erro na extração IA da ART:", error);
    } finally {
        setIsProcessingAI(false);
        setAiStatusText('');
    }
  };

  const handlePdfUploadForOM = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
        alert("POR FAVOR, SELECIONE APENAS ARQUIVOS PDF.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
        const base64 = reader.result as string;
        setNewOmPdf(base64);

        setIsProcessingAI(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const base64Content = base64.split(',')[1] || base64;
            
            setAiStatusText("Extraindo Número da OM...");
            const omResponse = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: [
                    { parts: [{ text: "Extraia o número da Ordem de Manutenção (OM) deste PDF. É um número de 8 a 10 dígitos. Retorne APENAS o número." }] },
                    { parts: [{ inlineData: { mimeType: "application/pdf", data: base64Content } }] }
                ],
            });

            const extractedOM = omResponse.text?.trim().replace(/\D/g, '');
            if (extractedOM) setNewOmNumber(extractedOM);

            setAiStatusText("Identificando TAG e Atividade...");
            const detailsResponse = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: [
                    { parts: [{ inlineData: { mimeType: "application/pdf", data: base64Content } }] },
                    { parts: [{ text: "Agora, extraia o TAG do equipamento (ex: CA5302) e um resumo da atividade. Retorne JSON com chaves 'tag' e 'summary'." }] }
                ],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            tag: { type: Type.STRING },
                            summary: { type: Type.STRING }
                        },
                    }
                }
            });

            const result = JSON.parse(detailsResponse.text || "{}");
            if (result.tag) setNewOmTag(result.tag.toUpperCase());
            if (result.summary) setNewOmDesc(result.summary.toUpperCase());

        } catch (error) {
            console.error("Erro na extração IA:", error);
        } finally {
            setIsProcessingAI(false);
            setAiStatusText('');
        }
    };
    reader.readAsDataURL(file);
  };
  
  const handlePdfUploadForART = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
        const base64 = reader.result as string;
        setArtPdfBase64(base64);
        await extractArtDataWithAI(base64);
    };
    reader.readAsDataURL(file);
  };

  // --- SAVE HANDLERS ---

  const handleAddOM = async () => {
    if(!newOmNumber || !newOmTag) {
        alert("PREENCHA NÚMERO DA OM E TAG.");
        return;
    }
    if (!newOmPdf) {
        alert("ERRO: O PDF DA ORDEM É OBRIGATÓRIO. POR FAVOR, FAÇA O UPLOAD.");
        return;
    }

    const om: OMRecord = {
        id: crypto.randomUUID(),
        omNumber: newOmNumber,
        tag: newOmTag.toUpperCase(),
        description: newOmDesc.toUpperCase() || 'MANUTENÇÃO INDUSTRIAL',
        type: 'PREVENTIVA',
        status: 'PENDENTE',
        createdAt: new Date().toISOString(),
        pdfUrl: newOmPdf,
        createdBy: localStorage.getItem('safemaint_user') || 'ADMIN'
    };
    await StorageService.saveOM(om);
    setNewOmNumber(''); setNewOmTag(''); setNewOmDesc(''); setNewOmPdf('');
    alert("ORDEM DE MANUTENÇÃO CADASTRADA COM PDF!");
  };

  const handleAddART = async () => {
      if(!artCode || !artTask || !artPdfBase64) {
          alert("PREENCHA O CÓDIGO, NOME E ANEXE O PDF DA ART.");
          return;
      }
      const newART: RegisteredART = { 
          id: crypto.randomUUID(), 
          code: artCode, 
          company: 'VALE', 
          taskName: artTask, 
          area: 'INDUSTRIAL', 
          controlMeasures: artRisks, 
          pdfUrl: artPdfBase64 
      };
      await StorageService.saveART(newART);
      setArtCode(''); setArtTask(''); setArtRisks(''); setArtPdfBase64('');
      alert("ART CADASTRADA NO MANUAL COM SUCESSO!");
  };

  const handleAddEmployee = async () => {
      if(!empName || !empMatricula || !empFunction) {
          alert("PREENCHA TODOS OS CAMPOS DO FUNCIONÁRIO.");
          return;
      }
      await StorageService.saveEmployee({
          id: crypto.randomUUID(),
          name: empName.toUpperCase(),
          matricula: empMatricula.toUpperCase(),
          function: empFunction.toUpperCase(),
          status: 'ACTIVE'
      });
      setEmpName(''); setEmpMatricula(''); setEmpFunction('');
      alert("FUNCIONÁRIO CADASTRADO!");
  };

  const handleAddUser = async () => {
      if(!userName || !userLogin || !userPass) {
          alert("PREENCHA TODOS OS DADOS DE ACESSO.");
          return;
      }
      await StorageService.saveUser({
          id: crypto.randomUUID(),
          name: userName.toUpperCase(),
          matricula: '',
          login: userLogin.toUpperCase(),
          password: userPass,
          role: userRole
      });
      setUserName(''); setUserLogin(''); setUserPass('');
      alert("USUÁRIO CADASTRADO!");
  };

  const handleImportExcel = async () => {
      if(!excelText.trim()) return;
      setIsSyncing(true);
      const lines = excelText.split('\n');
      let count = 0;
      for (const line of lines) {
          if (!line.trim()) continue;
          const parts = line.split('\t'); 
          const item: ScheduleItem = {
              id: crypto.randomUUID(),
              frotaOm: (parts[0] || 'N/D').toUpperCase(),
              description: (parts[1] || 'IMPORTADO VIA EXCEL').toUpperCase(),
              resources: (parts[2] || 'EQUIPE MANUTENÇÃO').toUpperCase(),
              resources2: 'INDUSTRIAL',
              dateMin: parts[3] || new Date().toLocaleDateString('pt-BR'),
              dateMax: parts[3] || '',
              priority: 'MÉDIA',
              peopleCount: 1,
              hours: 8,
              dateStart: parts[3] || new Date().toLocaleDateString('pt-BR'),
              dateEnd: '',
              workCenter: 'OFICINA',
              timeStart: '07:30',
              timeEnd: '16:30',
              status: 'PROGRAMADO'
          };
          await StorageService.saveScheduleItem(item);
          count++;
      }
      setExcelText('');
      setIsSyncing(false);
      alert(`${count} ITENS EXPORTADOS PARA A AGENDA COM SUCESSO!`);
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-20 px-4">
      {/* ... Header e Nav ... */}
      <header className="flex items-center justify-between py-4 border-b-2 border-gray-200 mb-4 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
              <BackButton />
              <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter text-vale-dark flex items-center gap-2">
                    <Database size={24} className="text-[#007e7a]"/> Central de Dados
                  </h2>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em]">Gestão de Segurança e Ativos</p>
              </div>
          </div>
      </header>
      
      <nav className="flex bg-gray-100 p-1 rounded-xl mb-6 shadow-inner overflow-x-auto gap-2">
        {[
          {id: 'OMS', label: 'Cadastro OM', icon: <BrainCircuit size={16}/>},
          {id: 'PROCEDURES', label: 'Manual de ARTs', icon: <FileSearch size={16}/>},
          {id: 'SCHEDULE', label: 'Exportar Excel', icon: <FileSpreadsheet size={16}/>},
          {id: 'EMPLOYEES', label: 'Equipe', icon: <Users size={16}/>},
          {id: 'USERS', label: 'Acessos', icon: <Shield size={16}/>},
        ].map((tab) => (
            <button 
                key={tab.id} 
                className={`flex-1 px-4 py-2 font-black text-[10px] rounded-lg transition-all flex items-center justify-center gap-2 uppercase whitespace-nowrap ${activeTab === tab.id ? 'bg-[#007e7a] text-white shadow-md' : 'text-gray-500 hover:bg-white hover:text-gray-600'}`} 
                onClick={() => setActiveTab(tab.id as any)}
            >
                {tab.icon} {tab.label}
            </button>
        ))}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          
          {/* --- COLUNA ESQUERDA: FORMULÁRIOS (CARD MENOR COMPACTO) --- */}
          <div className="lg:col-span-4 space-y-4">
              
              {/* FORMULÁRIO OM */}
              {activeTab === 'OMS' && (
                  <div className="bg-white rounded-xl p-5 border shadow-lg space-y-4 border-l-[6px] border-[#007e7a] relative">
                      {isProcessingAI && (
                        <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center rounded-xl">
                           <Bot size={40} className="text-[#007e7a] animate-bounce mb-2" />
                           <p className="font-black text-[10px] uppercase tracking-widest animate-pulse">{aiStatusText || 'Processando...'}</p>
                        </div>
                      )}
                      <h3 className="font-black text-vale-dark uppercase text-sm flex items-center gap-2 border-b border-gray-100 pb-2"><Plus size={16} className="text-[#007e7a]" /> Nova Ordem</h3>
                      
                      <div className="bg-teal-50 p-4 rounded-lg border border-teal-100 flex flex-col items-center justify-center relative group cursor-pointer hover:bg-teal-100 transition-colors">
                          <input type="file" accept=".pdf" onChange={handlePdfUploadForOM} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          {newOmPdf ? (
                              <div className="flex items-center gap-2 text-teal-700">
                                  <CheckCircle size={20} /> <span className="text-[10px] font-black">PDF CARREGADO</span>
                              </div>
                          ) : (
                              <>
                                <Upload size={20} className="text-teal-600 mb-1" />
                                <span className="text-[9px] font-black text-teal-700 uppercase">1. Upload PDF (Obrigatório)</span>
                              </>
                          )}
                      </div>

                      <div className="space-y-3">
                          <div>
                              <label className="text-[9px] font-black text-gray-400 ml-1 uppercase">Número da OM</label>
                              <input value={newOmNumber} onChange={e => setNewOmNumber(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-black text-sm text-blue-900 outline-none uppercase focus:border-[#007e7a]" placeholder="Ex: 123456" />
                          </div>
                          <div>
                              <label className="text-[9px] font-black text-gray-400 ml-1 uppercase">Tag / Equipamento</label>
                              <input value={newOmTag} onChange={e => setNewOmTag(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-black text-sm text-[#007e7a] outline-none uppercase focus:border-[#007e7a]" placeholder="Ex: CA5302" />
                          </div>
                          <div>
                              <label className="text-[9px] font-black text-gray-400 ml-1 uppercase">Resumo</label>
                              <textarea value={newOmDesc} onChange={e => setNewOmDesc(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold text-xs outline-none uppercase focus:border-[#007e7a] h-16 resize-none" placeholder="Descrição breve..." />
                          </div>
                      </div>

                      <button onClick={handleAddOM} className="w-full bg-[#007e7a] text-white py-2.5 rounded-lg font-black text-xs uppercase shadow hover:bg-[#00605d] transition-all flex items-center justify-center gap-2 active:scale-95">
                          <Save size={16}/> Salvar Ordem
                      </button>
                  </div>
              )}

              {/* FORMULÁRIO ART */}
              {activeTab === 'PROCEDURES' && (
                  <div className="bg-white rounded-xl p-5 border shadow-lg space-y-4 border-l-[6px] border-orange-500 relative">
                      {isProcessingAI && (
                        <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center rounded-xl">
                           <Bot size={40} className="text-orange-500 animate-bounce mb-2" />
                           <p className="font-black text-[10px] uppercase tracking-widest animate-pulse">{aiStatusText || 'Processando...'}</p>
                        </div>
                      )}
                      <h3 className="font-black text-vale-dark uppercase text-sm flex items-center gap-2 border-b border-gray-100 pb-2"><FileText size={16} className="text-orange-500" /> Nova ART</h3>
                      
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 flex flex-col items-center justify-center relative group cursor-pointer hover:bg-orange-100 transition-colors">
                          <input type="file" accept=".pdf" onChange={handlePdfUploadForART} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          {artPdfBase64 ? (
                              <div className="flex items-center gap-2 text-green-600">
                                  <CheckCircle size={20} /> <span className="text-[10px] font-black">PDF VINCULADO</span>
                              </div>
                          ) : (
                              <>
                                <Upload size={20} className="text-orange-600 mb-1" />
                                <span className="text-[9px] font-black text-orange-700 uppercase">1. Upload PDF (Obrigatório)</span>
                              </>
                          )}
                      </div>

                      <div className="space-y-3">
                          <div>
                              <label className="text-[9px] font-black text-gray-400 ml-1 uppercase">Código ART</label>
                              <input value={artCode} onChange={e => setArtCode(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-black text-sm outline-none uppercase focus:border-orange-500" placeholder="Número..." />
                          </div>
                          <div>
                              <label className="text-[9px] font-black text-gray-400 ml-1 uppercase">Atividade</label>
                              <input value={artTask} onChange={e => setArtTask(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-black text-sm outline-none uppercase focus:border-orange-500" placeholder="Nome da tarefa..." />
                          </div>
                          <div>
                              <label className="text-[9px] font-black text-gray-400 ml-1 uppercase">Riscos (Resumo)</label>
                              <textarea value={artRisks} onChange={e => setArtRisks(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold text-xs outline-none uppercase focus:border-orange-500 h-16 resize-none" placeholder="Riscos principais..." />
                          </div>
                      </div>

                      <button onClick={handleAddART} className="w-full bg-orange-600 text-white py-2.5 rounded-lg font-black text-xs uppercase shadow hover:bg-orange-700 transition-all flex items-center justify-center gap-2 active:scale-95">
                          <Save size={16}/> Salvar Procedimento
                      </button>
                  </div>
              )}

              {/* FORMULÁRIO FUNCIONÁRIOS */}
              {activeTab === 'EMPLOYEES' && (
                  <div className="bg-white rounded-xl p-5 border shadow-lg space-y-4 border-l-[6px] border-blue-600">
                      <h3 className="font-black text-vale-dark uppercase text-sm flex items-center gap-2 border-b border-gray-100 pb-2"><UserPlus size={16} className="text-blue-600" /> Novo Colaborador</h3>
                      <div className="space-y-3">
                          <div>
                              <label className="text-[9px] font-black text-gray-400 ml-1 uppercase">Nome Completo</label>
                              <input value={empName} onChange={e => setEmpName(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold text-sm outline-none uppercase focus:border-blue-600" placeholder="NOME..." />
                          </div>
                          <div>
                              <label className="text-[9px] font-black text-gray-400 ml-1 uppercase">Matrícula</label>
                              <input value={empMatricula} onChange={e => setEmpMatricula(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold text-sm outline-none uppercase focus:border-blue-600" placeholder="000000" />
                          </div>
                          <div>
                              <label className="text-[9px] font-black text-gray-400 ml-1 uppercase">Função</label>
                              <input value={empFunction} onChange={e => setEmpFunction(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold text-sm outline-none uppercase focus:border-blue-600" placeholder="MECÂNICO..." />
                          </div>
                      </div>
                      <button onClick={handleAddEmployee} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-black text-xs uppercase shadow hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95">
                          <Save size={16}/> Salvar Cadastro
                      </button>
                  </div>
              )}

              {/* FORMULÁRIO USUÁRIOS */}
              {activeTab === 'USERS' && (
                  <div className="bg-white rounded-xl p-5 border shadow-lg space-y-4 border-l-[6px] border-purple-600">
                      <h3 className="font-black text-vale-dark uppercase text-sm flex items-center gap-2 border-b border-gray-100 pb-2"><ShieldCheck size={16} className="text-purple-600" /> Novo Acesso</h3>
                      <div className="space-y-3">
                          <div>
                              <label className="text-[9px] font-black text-gray-400 ml-1 uppercase">Nome do Usuário</label>
                              <input value={userName} onChange={e => setUserName(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold text-sm outline-none uppercase focus:border-purple-600" placeholder="NOME..." />
                          </div>
                          <div>
                              <label className="text-[9px] font-black text-gray-400 ml-1 uppercase">Login</label>
                              <input value={userLogin} onChange={e => setUserLogin(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold text-sm outline-none uppercase focus:border-purple-600" placeholder="LOGIN..." />
                          </div>
                          <div>
                              <label className="text-[9px] font-black text-gray-400 ml-1 uppercase">Senha</label>
                              <input type="password" value={userPass} onChange={e => setUserPass(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold text-sm outline-none focus:border-purple-600" placeholder="******" />
                          </div>
                          <div>
                              <label className="text-[9px] font-black text-gray-400 ml-1 uppercase">Permissão</label>
                              <div className="flex bg-gray-100 p-1 rounded-lg">
                                  <button onClick={() => setUserRole('OPERADOR')} className={`flex-1 py-1.5 text-[10px] font-black rounded-md ${userRole === 'OPERADOR' ? 'bg-white shadow text-purple-600' : 'text-gray-400'}`}>OPERADOR</button>
                                  <button onClick={() => setUserRole('ADMIN')} className={`flex-1 py-1.5 text-[10px] font-black rounded-md ${userRole === 'ADMIN' ? 'bg-white shadow text-purple-600' : 'text-gray-400'}`}>ADMIN</button>
                              </div>
                          </div>
                      </div>
                      <button onClick={handleAddUser} className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-black text-xs uppercase shadow hover:bg-purple-700 transition-all flex items-center justify-center gap-2 active:scale-95">
                          <Save size={16}/> Criar Acesso
                      </button>
                  </div>
              )}

              {/* FORMULÁRIO EXCEL */}
              {activeTab === 'SCHEDULE' && (
                  <div className="bg-white rounded-xl p-5 border shadow-lg space-y-4 border-l-[6px] border-blue-500">
                      <h3 className="font-black text-vale-dark uppercase text-sm flex items-center gap-2 border-b border-gray-100 pb-2"><FileSpreadsheet size={16} className="text-blue-500" /> Importar Dados</h3>
                      <textarea 
                        value={excelText} 
                        onChange={e => setExcelText(e.target.value)} 
                        className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-mono text-[10px] h-40 resize-none outline-none focus:border-blue-500" 
                        placeholder="Cole aqui as colunas do Excel..."
                      />
                      <button onClick={handleImportExcel} disabled={isSyncing || !excelText} className="w-full bg-blue-500 text-white py-2.5 rounded-lg font-black text-xs uppercase shadow hover:bg-blue-600 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                          {isSyncing ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>} Processar Importação
                      </button>
                  </div>
              )}
          </div>

          {/* ... (código existente da coluna direita) ... */}
          <div className="lg:col-span-8">
              {/* ... */}
              {/* LISTA DE OMs */}
              {activeTab === 'OMS' && (
                  <div className="bg-white rounded-xl border shadow-lg overflow-hidden flex flex-col h-full min-h-[600px] border-gray-100">
                      {/* ... (tabela OMs existente) ... */}
                      <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-white">
                          <table className="w-full text-left border-collapse">
                              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                  <tr>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">OM</th>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Tag</th>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Status PDF</th>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider text-right">Ações</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {oms.filter(o => o.omNumber.includes(searchLibrary) || o.tag.includes(searchLibrary)).map(om => (
                                      <tr key={om.id} className="hover:bg-gray-50 transition-colors">
                                          <td className="p-3 text-xs font-black text-blue-900">{om.omNumber}</td>
                                          <td className="p-3 text-xs font-bold text-gray-700">{om.tag}</td>
                                          <td className="p-3">
                                              {om.pdfUrl ? (
                                                  <span className="inline-flex items-center gap-1 text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100"><FileText size={12}/> VÁLIDO</span>
                                              ) : (
                                                  <span className="inline-flex items-center gap-1 text-[9px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100"><AlertTriangle size={12}/> PENDENTE</span>
                                              )}
                                          </td>
                                          <td className="p-3 text-right flex justify-end gap-2">
                                              <button onClick={() => setViewingOM(om)} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-600 hover:text-white transition-all"><Eye size={16}/></button>
                                              <button onClick={() => StorageService.deleteOM(om.id)} className="p-1.5 bg-red-50 text-red-400 rounded hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
              {/* ... (outras tabelas) ... */}
              {/* LISTA DE FUNCIONÁRIOS */}
              {activeTab === 'EMPLOYEES' && (
                  <div className="bg-white rounded-xl border shadow-lg overflow-hidden flex flex-col h-full min-h-[600px] border-gray-100">
                        {/* Header da lista */}
                        <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-3 shrink-0">
                            <div>
                                <span className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em]">Base de Dados</span>
                                <h4 className="text-sm font-black text-gray-800 uppercase tracking-tighter mt-0.5">Biblioteca de Registros</h4>
                            </div>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar..." 
                                    value={searchLibrary} 
                                    onChange={e => setSearchLibrary(e.target.value.toUpperCase())}
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold uppercase outline-none focus:border-[#007e7a]"
                                />
                            </div>
                        </div>
                      <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-white">
                          <table className="w-full text-left border-collapse">
                              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                  <tr>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Matrícula</th>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Nome</th>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Função</th>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider text-right">Ações</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {employees.filter(e => e.name.includes(searchLibrary)).map(emp => (
                                      <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                          <td className="p-3 text-xs font-mono font-bold text-gray-500">{emp.matricula}</td>
                                          <td className="p-3 text-xs font-black text-gray-800">{emp.name}</td>
                                          <td className="p-3 text-xs font-bold text-blue-600 bg-blue-50 rounded inline-block my-1 px-2 mx-4">{emp.function}</td>
                                          <td className="p-3 text-right">
                                              <button onClick={() => StorageService.deleteEmployee(emp.id)} className="p-1.5 bg-red-50 text-red-400 rounded hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
              {/* ... (Resto das tabelas) ... */}
              {/* LISTA DE ARTs */}
              {activeTab === 'PROCEDURES' && (
                  <div className="bg-white rounded-xl border shadow-lg overflow-hidden flex flex-col h-full min-h-[600px] border-gray-100">
                      {/* ... header ... */}
                      <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-white">
                          <table className="w-full text-left border-collapse">
                              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                  <tr>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Código</th>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Tarefa</th>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">PDF</th>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider text-right">Ações</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {arts.filter(a => a.code.includes(searchLibrary) || a.taskName.includes(searchLibrary)).map(art => (
                                      <tr key={art.id} className="hover:bg-gray-50 transition-colors">
                                          <td className="p-3 text-xs font-black text-orange-600">{art.code}</td>
                                          <td className="p-3 text-xs font-bold text-gray-700">{art.taskName}</td>
                                          <td className="p-3">
                                              {art.pdfUrl ? (
                                                  <span className="inline-flex items-center gap-1 text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100"><FileText size={12}/> VÁLIDO</span>
                                              ) : (
                                                  <span className="inline-flex items-center gap-1 text-[9px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded">--</span>
                                              )}
                                          </td>
                                          <td className="p-3 text-right flex justify-end gap-2">
                                              <button onClick={() => setViewingART(art)} className="p-1.5 bg-orange-50 text-orange-600 rounded hover:bg-orange-500 hover:text-white transition-all"><Eye size={16}/></button>
                                              <button onClick={() => StorageService.deleteART(art.id)} className="p-1.5 bg-red-50 text-red-400 rounded hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
              {/* LISTA DE USUÁRIOS */}
              {activeTab === 'USERS' && (
                  <div className="bg-white rounded-xl border shadow-lg overflow-hidden flex flex-col h-full min-h-[600px] border-gray-100">
                      {/* ... header ... */}
                      <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-white">
                          <table className="w-full text-left border-collapse">
                              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                  <tr>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Login</th>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Nome</th>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Permissão</th>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider text-right">Ações</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {users.filter(u => u.name.includes(searchLibrary)).map(user => (
                                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                          <td className="p-3 text-xs font-mono font-bold text-gray-500 flex items-center gap-2"><Key size={12}/> {user.login}</td>
                                          <td className="p-3 text-xs font-black text-gray-800">{user.name}</td>
                                          <td className="p-3">
                                              <span className={`text-[9px] font-black px-2 py-0.5 rounded ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{user.role}</span>
                                          </td>
                                          <td className="p-3 text-right">
                                              <button onClick={() => StorageService.deleteUser(user.id)} className="p-1.5 bg-red-50 text-red-400 rounded hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
              {/* LISTA DE AGENDAMENTO (SIMPLES) */}
              {activeTab === 'SCHEDULE' && (
                  <div className="bg-white rounded-xl border shadow-lg overflow-hidden flex flex-col h-full min-h-[600px] border-gray-100">
                      {/* ... header ... */}
                      <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-white">
                          <table className="w-full text-left border-collapse">
                              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                  <tr>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Frota/OM</th>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Data</th>
                                      <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-wider text-right">Ações</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {schedule.slice(0, 50).map(s => (
                                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                          <td className="p-3 text-xs font-black text-gray-800 whitespace-pre-wrap">{s.frotaOm}</td>
                                          <td className="p-3 text-xs font-bold text-gray-500">{s.dateMin}</td>
                                          <td className="p-3 text-right">
                                              <button onClick={() => StorageService.deleteScheduleItem(s.id)} className="p-1.5 bg-red-50 text-red-400 rounded hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
          </div>
      </div>

       {/* VISUALIZADOR DE OM (MODO CINEMA) */}
      {viewingOM && (
        <div className="fixed inset-0 z-[100] bg-[#000000]/95 flex items-center justify-center p-0 backdrop-blur-xl animate-fadeIn">
            <div className="w-full h-full flex flex-col relative">
                {/* Header */}
                <div className="bg-gray-900 text-white p-3 flex justify-between items-center shadow-2xl border-b border-gray-800 shrink-0 z-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-vale-green p-1.5 rounded"><BrainCircuit size={18}/></div>
                        <div>
                            <h3 className="font-black text-sm tracking-tight uppercase text-gray-100">Visualização de OM</h3>
                            <p className="text-[9px] font-bold text-vale-green tracking-widest uppercase">OM: {viewingOM.omNumber} | TAG: {viewingOM.tag}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {omBlobUrl && (
                            <a href={omBlobUrl} download className="hidden md:flex px-3 py-1.5 bg-gray-700 text-white font-bold rounded-lg text-[9px] uppercase hover:bg-gray-600 transition-all items-center gap-1">
                                <Download size={12}/> Baixar
                            </a>
                        )}
                        <button onClick={() => setViewingOM(null)} className="p-2 bg-gray-800 hover:bg-red-600 text-white rounded-full transition-all shadow-inner"><X size={18}/></button>
                    </div>
                </div>

                {/* PDF */}
                <div className="flex-1 bg-[#1a1a1a] relative overflow-hidden flex items-center justify-center p-0">
                    {omBlobUrl ? (
                        <div className="w-full h-full bg-white relative">
                             <iframe
                                src={omBlobUrl}
                                className="w-full h-full border-none"
                                title="Visualizador"
                            />
                        </div>
                    ) : (
                        <div className="text-center p-10 max-w-lg">
                            <Info size={64} className="text-gray-600 mx-auto mb-6" />
                            <h4 className="text-2xl font-black text-gray-400 uppercase tracking-widest">Documento Não Digitalizado</h4>
                            <p className="text-gray-500 font-bold mt-4">Esta ordem foi aberta sem anexo PDF.</p>
                            <div className="mt-8 bg-gray-800 p-6 rounded-2xl border border-gray-700">
                                <p className="text-xs text-gray-300 font-mono uppercase text-left">{viewingOM.description}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* VISUALIZADOR DE ART (MODO CINEMA) */}
      {viewingART && (
        <div className="fixed inset-0 z-[100] bg-[#000000]/95 flex items-center justify-center p-0 backdrop-blur-xl animate-fadeIn">
            <div className="w-full h-full flex flex-col relative">
                {/* Header */}
                <div className="bg-gray-900 text-white p-3 flex justify-between items-center shadow-2xl border-b border-gray-800 shrink-0 z-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-500 p-1.5 rounded"><FileSearch size={18}/></div>
                        <div>
                            <h3 className="font-black text-sm tracking-tight uppercase text-gray-100">Manual de Procedimento</h3>
                            <p className="text-[9px] font-bold text-orange-500 tracking-widest uppercase">ART: {viewingART.code}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {artBlobUrl && (
                            <a href={artBlobUrl} download className="hidden md:flex px-3 py-1.5 bg-gray-700 text-white font-bold rounded-lg text-[9px] uppercase hover:bg-gray-600 transition-all items-center gap-1">
                                <Download size={12}/> Baixar
                            </a>
                        )}
                        <button onClick={() => setViewingART(null)} className="p-2 bg-gray-800 hover:bg-red-600 text-white rounded-full transition-all shadow-inner"><X size={18}/></button>
                    </div>
                </div>

                {/* PDF */}
                <div className="flex-1 bg-[#1a1a1a] relative overflow-hidden flex items-center justify-center p-0">
                    {artBlobUrl ? (
                        <div className="w-full h-full bg-white relative">
                             <iframe
                                src={artBlobUrl}
                                className="w-full h-full border-none"
                                title="Visualizador"
                            />
                        </div>
                    ) : (
                        <div className="bg-white p-20 text-center rounded-3xl">
                            <Info size={48} className="text-orange-500 mx-auto mb-4" />
                            <h4 className="text-xl font-black text-gray-800 uppercase">Resumo Técnico</h4>
                            <p className="mt-4 text-gray-600 font-bold uppercase">{viewingART.controlMeasures}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
