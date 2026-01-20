
import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../services/storage';
import { supabase, checkConnection } from '../services/supabase';
import { Employee, User, OMRecord, RegisteredART, ScheduleItem, DocumentRecord, ChecklistTemplateItem } from '../types';
import { 
  Save, Database, Users, Shield, 
  Trash2, Eye, X, FileText, Cloud, 
  Edit2, Calendar, Eraser, CheckCircle2, 
  Loader2, Plus, Search, Terminal, 
  ClipboardList, UploadCloud, BookOpen, 
  // Fix: Added RefreshCw to imports
  Wrench, AlertTriangle, UserPlus, Fingerprint, Settings as SettingsIcon, Layers, ChevronRight, Upload, RefreshCw
} from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { FeedbackModal } from '../components/FeedbackModal';
// Fix: Import useNavigate from react-router-dom
import { useNavigate } from 'react-router-dom';

const GENERATED_SQL = `
-- SCRIPT DE CONFIGURAÇÃO TOTAL SAFEMAINT V5
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, name text, matricula text, login text, password text, role text);
CREATE TABLE IF NOT EXISTS employees (id text PRIMARY KEY, name text, matricula text, function text, status text);
CREATE TABLE IF NOT EXISTS oms (id text PRIMARY KEY, "omNumber" text, tag text, description text, type text, status text, "createdAt" text, "pdfUrl" text);
CREATE TABLE IF NOT EXISTS arts (id text PRIMARY KEY, code text, company text, "taskName" text, area text, "controlMeasures" text, "pdfUrl" text);
CREATE TABLE IF NOT EXISTS documents (id text PRIMARY KEY, type text, "createdAt" text, status text, header jsonb, content jsonb, signatures jsonb);
CREATE TABLE IF NOT EXISTS schedule (id text PRIMARY KEY, "frotaOm" text, description text, resources text, "resources2" text, "dateMin" text, "dateMax" text, priority text, "peopleCount" numeric, hours numeric, "dateStart" text, "dateEnd" text, "workCenter" text, "timeStart" text, "timeEnd" text, status text, "weekNumber" text);
CREATE TABLE IF NOT EXISTS active_maintenance (id text PRIMARY KEY, "omId" text, "scheduleId" text, header jsonb, "startTime" text, "artId" text, "artType" text, origin text, status text, "currentSessionStart" text, "accumulatedTime" numeric, "openedBy" text);
`;

export const Settings: React.FC = () => {
  // Fix: Initialize navigate using useNavigate hook
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'OMS' | 'PROCEDURES' | 'SCHEDULE' | 'EMPLOYEES' | 'USERS'>('OMS');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [oms, setOms] = useState<OMRecord[]>([]);
  const [arts, setArts] = useState<RegisteredART[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    checkConn();
    loadData();
    window.addEventListener('safemaint_storage_update', loadData);
    return () => window.removeEventListener('safemaint_storage_update', loadData);
  }, []);

  const checkConn = async () => setIsConnected(await checkConnection());

  const loadData = () => {
    setOms(StorageService.getOMs());
    setArts(StorageService.getARTs());
    setEmployees(StorageService.getEmployees());
    setUsers(StorageService.getUsers());
    setSchedule(StorageService.getSchedule());
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'OM' | 'ART') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const id = crypto.randomUUID();
      
      if (type === 'OM') {
        const omNumber = prompt("Número da Ordem (OM):") || "S/N";
        const tag = prompt("Tag do Equipamento (Ex: CA-001):") || "S/T";
        const desc = prompt("Breve descrição da manutenção:") || "";
        const omType = (prompt("Tipo (CORRETIVA/PREVENTIVA/DEMANDA):") || "PREVENTIVA").toUpperCase() as any;
        
        const newOm: OMRecord = {
          id,
          omNumber,
          tag: tag.toUpperCase(),
          description: desc.toUpperCase(),
          type: omType,
          status: 'PENDENTE',
          createdAt: new Date().toISOString(),
          pdfUrl: base64,
          createdBy: 'SISTEMA'
        };
        await StorageService.saveOM(newOm);
      } else {
        const code = prompt("Código do Procedimento (Ex: ART-MEC-01):") || "S/C";
        const taskName = prompt("Nome completo da atividade:") || "";
        
        const newArt: RegisteredART = {
          id,
          code: code.toUpperCase(),
          company: 'VALE',
          taskName: taskName.toUpperCase(),
          area: 'MANUTENÇÃO',
          controlMeasures: 'VERIFICAR PDF ANEXO',
          pdfUrl: base64
        };
        await StorageService.saveART(newArt);
      }
      
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 1500);
    };
    reader.readAsDataURL(file);
  };

  const filteredData = useMemo(() => {
    const q = searchQuery.toUpperCase();
    if (activeTab === 'OMS') return oms.filter(o => o.omNumber.includes(q) || o.tag.includes(q) || o.description?.includes(q));
    if (activeTab === 'PROCEDURES') return arts.filter(a => a.code.includes(q) || a.taskName.includes(q));
    if (activeTab === 'EMPLOYEES') return employees.filter(e => e.name.includes(q) || e.matricula.includes(q));
    if (activeTab === 'USERS') return users.filter(u => u.name.includes(q) || u.login.includes(q));
    if (activeTab === 'SCHEDULE') return schedule.filter(s => s.frotaOm?.includes(q) || s.description?.includes(q));
    return [];
  }, [activeTab, searchQuery, oms, arts, employees, users, schedule]);

  return (
    <div className="max-w-[1600px] mx-auto pb-10 px-4">
      <FeedbackModal isOpen={isProcessing || isSuccess} isSuccess={isSuccess} />

      <header className="flex flex-col lg:flex-row items-center justify-between py-8 mb-8 bg-white px-8 rounded-[2rem] shadow-sm border border-gray-100 gap-6">
          <div className="flex items-center gap-4">
              <BackButton />
              <div className="bg-[#007e7a]/10 p-4 rounded-2xl text-[#007e7a] shadow-inner"><SettingsIcon size={32} /></div>
              <div>
                <h2 className="text-3xl font-black uppercase text-gray-800 tracking-tighter leading-none">Configurações Gerais</h2>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Status: {isConnected ? 'Sincronizado Cloud' : 'Operando Local (Cache)'}
                  </span>
                </div>
              </div>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button onClick={() => setShowSqlModal(true)} className="flex-1 lg:flex-none bg-gray-900 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95">
                <Terminal size={18}/> Script SQL
            </button>
            <button onClick={() => StorageService.initialSync().then(() => alert("Sincronização forçada concluída!"))} className="flex-1 lg:flex-none bg-vale-green text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-[#00605d] transition-all shadow-lg active:scale-95">
                <RefreshCw size={18}/> Sincronizar Agora
            </button>
          </div>
      </header>

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar Nav */}
        <div className="lg:col-span-3 space-y-2">
            {[
                { id: 'OMS', label: 'Backlog de Ordens', icon: <Wrench size={20}/>, count: oms.length },
                { id: 'PROCEDURES', label: 'Modelos de ART', icon: <BookOpen size={20}/>, count: arts.length },
                { id: 'SCHEDULE', label: 'Agenda Semanal', icon: <Calendar size={20}/>, count: schedule.length },
                { id: 'EMPLOYEES', label: 'Equipe Campo', icon: <Users size={20}/>, count: employees.length },
                { id: 'USERS', label: 'Acessos App', icon: <Fingerprint size={20}/>, count: users.length },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as any); setSearchQuery(''); }}
                    className={`w-full flex items-center justify-between p-5 rounded-2xl font-black text-xs uppercase transition-all border ${activeTab === tab.id ? 'bg-[#007e7a] text-white border-[#007e7a] shadow-xl translate-x-2' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50 hover:text-gray-600'}`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`${activeTab === tab.id ? 'text-white' : 'text-gray-300'}`}>{tab.icon}</div>
                        <span>{tab.label}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'}`}>{tab.count}</span>
                </button>
            ))}

            <div className="mt-8 bg-amber-50 border border-amber-200 p-5 rounded-2xl">
                <h4 className="font-black text-xs text-amber-700 uppercase flex items-center gap-2 mb-2"><AlertTriangle size={16}/> Atenção</h4>
                <p className="text-[10px] font-bold text-amber-600 leading-relaxed uppercase">Todas as alterações manuais são sincronizadas com a nuvem em tempo real se houver conexão.</p>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-9 flex flex-col gap-6">
            
            {/* Toolbar */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-3.5 text-gray-300" size={20} />
                    <input 
                        type="text" 
                        placeholder={`PESQUISAR EM ${activeTab}...`}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-bold uppercase outline-none focus:border-[#007e7a] focus:bg-white transition-all shadow-inner"
                    />
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    {activeTab === 'OMS' && (
                        <label className="flex-1 md:flex-none cursor-pointer bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg active:scale-95">
                            <Upload size={18}/> Importar PDF OM
                            <input type="file" className="hidden" accept=".pdf" onChange={e => handleFileUpload(e, 'OM')} />
                        </label>
                    )}
                    {activeTab === 'PROCEDURES' && (
                        <label className="flex-1 md:flex-none cursor-pointer bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg active:scale-95">
                            <BookOpen size={18}/> Novo Modelo ART
                            <input type="file" className="hidden" accept=".pdf" onChange={e => handleFileUpload(e, 'ART')} />
                        </label>
                    )}
                    {(activeTab === 'EMPLOYEES' || activeTab === 'USERS') && (
                        <button 
                            onClick={() => {
                                if (activeTab === 'EMPLOYEES') {
                                    const name = prompt("NOME COMPLETO:");
                                    const mat = prompt("MATRÍCULA:");
                                    const func = prompt("FUNÇÃO (MECÂNICO/ELETRICISTA...):");
                                    if(name && mat) StorageService.saveEmployee({ id: crypto.randomUUID(), name: name.toUpperCase(), matricula: mat, function: (func || 'EXECUTANTE').toUpperCase() });
                                } else {
                                    const name = prompt("NOME DE EXIBIÇÃO:");
                                    const login = prompt("MATRÍCULA (LOGIN):");
                                    const pass = prompt("SENHA DE ACESSO:");
                                    if(name && login && pass) StorageService.registerUser({ id: crypto.randomUUID(), name: name.toUpperCase(), matricula: login, login, password: pass, role: 'OPERADOR' });
                                }
                            }}
                            className="flex-1 md:flex-none bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                        >
                            <Plus size={18}/> {activeTab === 'EMPLOYEES' ? 'Novo Funcionário' : 'Novo Usuário'}
                        </button>
                    )}
                    {activeTab === 'SCHEDULE' && (
                        <button onClick={() => navigate('/schedule')} className="flex-1 md:flex-none bg-gray-800 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg">
                            <Eye size={18}/> Ir para Agenda
                        </button>
                    )}
                </div>
            </div>

            {/* Content List */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden flex-1 min-h-[400px]">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-6 font-black text-[10px] text-gray-400 uppercase tracking-widest">Identificação / Tag</th>
                                <th className="p-6 font-black text-[10px] text-gray-400 uppercase tracking-widest">Descrição / Conteúdo</th>
                                <th className="p-6 font-black text-[10px] text-gray-400 uppercase tracking-widest text-center">Status / Rol</th>
                                <th className="p-6 font-black text-[10px] text-gray-400 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-32 text-center text-gray-300 font-black uppercase italic tracking-[0.2em]">
                                        <div className="flex flex-col items-center gap-4">
                                            <Layers size={48} className="opacity-10" />
                                            Nenhum dado localizado nesta categoria
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-gray-800 text-sm tracking-tight leading-none mb-1">
                                                    {item.omNumber || item.code || item.matricula || item.login || '---'}
                                                </span>
                                                <span className={`text-[10px] font-black uppercase ${item.tag ? 'text-[#007e7a]' : 'text-gray-400'}`}>
                                                    {item.tag || item.company || (activeTab === 'USERS' ? 'ACESSO APP' : 'CADASTRO')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <p className="text-[11px] font-bold text-gray-500 uppercase line-clamp-2 max-w-sm leading-relaxed">
                                                {item.description || item.taskName || item.name || item.frotaOm || 'Sem detalhes'}
                                            </p>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                                                item.status === 'PENDENTE' || item.status === 'ACTIVE' 
                                                ? 'bg-green-100 text-green-700 border-green-200' 
                                                : 'bg-gray-100 text-gray-500 border-gray-200'
                                            }`}>
                                                {item.status || item.role || item.type || 'CONFORMADO'}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                {(item.pdfUrl || item.manualFileUrl) && (
                                                    <button className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Ver PDF"><Eye size={20}/></button>
                                                )}
                                                <button 
                                                    onClick={() => {
                                                        if(confirm(`⚠️ ATENÇÃO: Deseja realmente excluir permanentemente este registro?\nEsta ação não pode ser desfeita.`)) {
                                                            if(activeTab === 'OMS') StorageService.deleteOM(item.id);
                                                            else if(activeTab === 'PROCEDURES') StorageService.deleteART(item.id);
                                                            else if(activeTab === 'EMPLOYEES') StorageService.deleteEmployee(item.id);
                                                            else if(activeTab === 'USERS') StorageService.deleteUser(item.id);
                                                            else if(activeTab === 'SCHEDULE') StorageService.deleteScheduleItem(item.id);
                                                        }
                                                    }}
                                                    className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={20}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>

      {/* SQL Script Modal */}
      {showSqlModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border-t-[12px] border-gray-900">
                  <div className="bg-gray-50 p-8 border-b flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="text-2xl font-black text-gray-800 uppercase flex items-center gap-3 tracking-tight"><Terminal size={32} className="text-[#007e7a]"/> Script de Sincronização</h3>
                          <p className="text-xs font-bold text-gray-400 uppercase mt-1">Execute este código no painel de comando do servidor.</p>
                      </div>
                      <button onClick={() => setShowSqlModal(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"><X size={32}/></button>
                  </div>
                  <div className="flex-1 relative bg-gray-950 overflow-hidden">
                      <textarea readOnly className="w-full h-full bg-transparent text-teal-400 font-mono text-xs p-8 outline-none resize-none custom-scrollbar" value={GENERATED_SQL} />
                      <div className="absolute bottom-8 right-8">
                        <button onClick={() => { navigator.clipboard.writeText(GENERATED_SQL); alert("SQL Copiado para Área de Transferência!"); }} className="bg-teal-500 hover:bg-teal-600 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase shadow-2xl transition-all flex items-center gap-3 active:scale-95">
                            <Layers size={20}/> Copiar Script Completo
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
