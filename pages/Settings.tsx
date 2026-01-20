
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
  Wrench, AlertTriangle
} from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { FeedbackModal } from '../components/FeedbackModal';

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
        const omNumber = prompt("Número da OM:") || "S/N";
        const tag = prompt("Tag do Equipamento:") || "S/T";
        const desc = prompt("Descrição da Atividade:") || "";
        const omType = (prompt("Tipo (CORRETIVA/PREVENTIVA):") || "PREVENTIVA").toUpperCase() as any;
        
        const newOm: OMRecord = {
          id,
          omNumber,
          tag: tag.toUpperCase(),
          description: desc.toUpperCase(),
          type: omType,
          status: 'PENDENTE',
          createdAt: new Date().toISOString(),
          pdfUrl: base64,
          createdBy: 'ADMIN'
        };
        await StorageService.saveOM(newOm);
      } else {
        const code = prompt("Código da ART:") || "S/C";
        const taskName = prompt("Nome da Atividade:") || "";
        
        const newArt: RegisteredART = {
          id,
          code: code.toUpperCase(),
          company: 'VALE',
          taskName: taskName.toUpperCase(),
          area: 'OPERACIONAL',
          controlMeasures: '',
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
    if (activeTab === 'OMS') return oms.filter(o => o.omNumber.includes(q) || o.tag.includes(q));
    if (activeTab === 'PROCEDURES') return arts.filter(a => a.code.includes(q) || a.taskName.includes(q));
    if (activeTab === 'EMPLOYEES') return employees.filter(e => e.name.includes(q) || e.matricula.includes(q));
    if (activeTab === 'USERS') return users.filter(u => u.name.includes(q) || u.login.includes(q));
    return schedule;
  }, [activeTab, searchQuery, oms, arts, employees, users, schedule]);

  return (
    <div className="max-w-7xl mx-auto pb-10 px-4">
      <FeedbackModal isOpen={isProcessing || isSuccess} isSuccess={isSuccess} />

      <header className="flex flex-col md:flex-row items-center justify-between py-6 mb-8 bg-white px-6 rounded-2xl shadow-sm border border-gray-200 gap-4">
          <div className="flex items-center gap-4">
              <BackButton />
              <div>
                <h2 className="text-2xl font-black uppercase text-gray-800 flex items-center gap-2 tracking-tighter">
                  <Settings size={24} className="text-[#007e7a]"/> Configurações do Sistema
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {isConnected ? 'Sincronizado com Nuvem' : 'Modo Offline Local'}
                  </span>
                </div>
              </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSqlModal(true)} className="bg-gray-800 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-black transition-all">
                <Terminal size={16}/> Script SQL
            </button>
          </div>
      </header>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 mb-6 no-scrollbar">
        {[
          { id: 'OMS', label: 'Ordens (OM)', icon: <Wrench size={16}/> },
          { id: 'PROCEDURES', label: 'Modelos ART', icon: <BookOpen size={16}/> },
          { id: 'SCHEDULE', label: 'Agenda Semanal', icon: <Calendar size={16}/> },
          { id: 'EMPLOYEES', label: 'Funcionários', icon: <Users size={16}/> },
          { id: 'USERS', label: 'Usuários App', icon: <Shield size={16}/> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[#007e7a] text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden min-h-[500px] flex flex-col">
        {/* Tab Toolbar */}
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-3 text-gray-300" size={18} />
            <input 
              type="text" 
              placeholder="PESQUISAR..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-[#007e7a] transition-all"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {activeTab === 'OMS' && (
              <label className="flex-1 md:flex-none cursor-pointer bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md">
                <UploadCloud size={16}/> Importar PDF OM
                <input type="file" className="hidden" accept=".pdf" onChange={e => handleFileUpload(e, 'OM')} />
              </label>
            )}
            {activeTab === 'PROCEDURES' && (
              <label className="flex-1 md:flex-none cursor-pointer bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md">
                <Plus size={16}/> Cadastrar ART
                <input type="file" className="hidden" accept=".pdf" onChange={e => handleFileUpload(e, 'ART')} />
              </label>
            )}
            {activeTab === 'EMPLOYEES' && (
              <button 
                onClick={() => {
                  const name = prompt("Nome:");
                  const mat = prompt("Matrícula:");
                  const func = prompt("Função:");
                  if(name && mat) StorageService.saveEmployee({ id: crypto.randomUUID(), name, matricula: mat, function: func || 'EXECUTANTE' });
                }}
                className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md"
              >
                <Plus size={16}/> Novo Funcionário
              </button>
            )}
             {activeTab === 'USERS' && (
              <button 
                onClick={() => {
                  const name = prompt("Nome:");
                  const login = prompt("Login/Matrícula:");
                  const pass = prompt("Senha:");
                  if(name && login && pass) StorageService.registerUser({ id: crypto.randomUUID(), name, matricula: login, login, password: pass, role: 'OPERADOR' });
                }}
                className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md"
              >
                <Plus size={16}/> Novo Usuário
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-left border-collapse">
            <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
              <tr>
                <th className="pb-4 px-2">Identificador</th>
                <th className="pb-4 px-2">Detalhes</th>
                <th className="pb-4 px-2">Status / Info</th>
                <th className="pb-4 px-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-gray-300 font-bold uppercase italic tracking-widest">
                    Nenhum registro localizado...
                  </td>
                </tr>
              ) : (
                filteredData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="py-4 px-2">
                      <div className="flex flex-col">
                        <span className="font-black text-gray-800 text-xs">
                          {item.omNumber || item.code || item.matricula || item.login || 'N/A'}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">
                          {item.tag || item.company || 'CADASTRO APP'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <p className="text-[10px] font-bold text-gray-600 uppercase line-clamp-1 max-w-xs">
                        {item.description || item.taskName || item.name || '---'}
                      </p>
                    </td>
                    <td className="py-4 px-2">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${item.status === 'ACTIVE' || item.status === 'PENDENTE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {item.status || item.role || item.type || 'ATIVO'}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            if(confirm("Confirma a exclusão permanente?")) {
                              if(activeTab === 'OMS') StorageService.deleteOM(item.id);
                              else if(activeTab === 'PROCEDURES') StorageService.deleteART(item.id);
                              else if(activeTab === 'EMPLOYEES') StorageService.deleteEmployee(item.id);
                              else if(activeTab === 'USERS') StorageService.deleteUser(item.id);
                            }
                          }}
                          className="p-2 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 size={16}/>
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

      {showSqlModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border-t-8 border-[#007e7a]">
                  <div className="bg-gray-50 p-6 border-b flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="text-xl font-black text-gray-800 uppercase flex items-center gap-2"><Terminal size={24} className="text-[#007e7a]"/> Script SQL SAFEMAINT</h3>
                          <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Execute este código no SQL Editor do seu projeto Supabase.</p>
                      </div>
                      <button onClick={() => setShowSqlModal(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"><X size={24}/></button>
                  </div>
                  <div className="flex-1 relative bg-gray-900 overflow-hidden">
                      <textarea readOnly className="w-full h-full bg-gray-900 text-green-400 font-mono text-[11px] p-6 outline-none resize-none custom-scrollbar" value={GENERATED_SQL} />
                      <button onClick={() => { navigator.clipboard.writeText(GENERATED_SQL); alert("SQL Copiado!"); }} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase backdrop-blur-md border border-white/20 transition-all">Copiar Código</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
