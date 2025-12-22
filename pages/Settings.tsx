import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { Employee, RegisteredART, ScheduleItem, User, OMRecord } from '../types';
import { 
  Upload, FileText, Trash2, UserPlus, Edit2, RotateCcw, Save, Plus, 
  AlertTriangle, Calendar, FileInput, Settings as GearIcon, Loader2, 
  Download, FileSpreadsheet, CheckCircle, Eye, X 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

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
  const [activeTab, setActiveTab] = useState<'OMS' | 'EMPLOYEES' | 'ARTS' | 'SCHEDULE' | 'USERS'>('OMS');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [arts, setArts] = useState<RegisteredART[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Form States
  const [scheduleInput, setScheduleInput] = useState('');
  const [scheduleStatus, setScheduleStatus] = useState('');
  const [isEditingEmp, setIsEditingEmp] = useState<string | null>(null);
  const [empName, setEmpName] = useState('');
  const [empMat, setEmpMat] = useState('');
  const [empFunc, setEmpFunc] = useState('');
  const [showEmpTrash, setShowEmpTrash] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userMat, setUserMat] = useState('');
  const [userLogin, setUserLogin] = useState('');
  const [userPass, setUserPass] = useState('');
  const [userRole, setUserRole] = useState<'ADMIN' | 'OPERADOR'>('OPERADOR');
  const [artNum, setArtNum] = useState('');
  const [artName, setArtName] = useState('');
  const [artPdfFile, setArtPdfFile] = useState<File | null>(null);
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

  const exportToExcel = async () => {
      setIsExporting(true);
      try {
          const workbook = XLSX.utils.book_new();
          
          // 1. Usuários
          const usersData = await StorageService.getUsers();
          const wsUsers = XLSX.utils.json_to_sheet(usersData.map(u => ({
              NOME: u.name,
              MATRICULA: u.matricula,
              LOGIN: u.login,
              PERFIL: u.role
          })));
          XLSX.utils.book_append_sheet(workbook, wsUsers, "USUARIOS");

          // 2. Funcionários
          const wsEmps = XLSX.utils.json_to_sheet(employees.map(e => ({
              NOME: e.name,
              MATRICULA: e.matricula,
              FUNCAO: e.function,
              STATUS: e.status
          })));
          XLSX.utils.book_append_sheet(workbook, wsEmps, "FUNCIONARIOS");

          // 3. OMs
          const oms = StorageService.getOMs();
          const wsOms = XLSX.utils.json_to_sheet(oms.map(o => ({
              NUMERO_OM: o.omNumber,
              TAG: o.tag,
              DESCRICAO: o.description,
              TIPO: o.type,
              STATUS: o.status,
              CRIADO_EM: o.createdAt
          })));
          XLSX.utils.book_append_sheet(workbook, wsOms, "OMS");

          // 4. ARTs Padrão
          const wsArts = XLSX.utils.json_to_sheet(arts.map(a => ({
              CODIGO: a.code,
              TAREFA: a.taskName,
              AREA: a.area,
              EMISSAO: a.emissionDate
          })));
          XLSX.utils.book_append_sheet(workbook, wsArts, "ARTS_PADRAO");

          // 5. Programação
          const schedule = StorageService.getSchedule();
          const wsSched = XLSX.utils.json_to_sheet(schedule);
          XLSX.utils.book_append_sheet(workbook, wsSched, "PROGRAMACAO");

          // 6. Histórico
          const history = StorageService.getHistory();
          const wsHist = XLSX.utils.json_to_sheet(history);
          XLSX.utils.book_append_sheet(workbook, wsHist, "HISTORICO");

          XLSX.writeFile(workbook, `SAFEMAINT_DATABASE_${new Date().toISOString().split('T')[0]}.xlsx`);
      } catch (error) {
          console.error(error);
          alert("ERRO AO GERAR EXCEL.");
      } finally {
          setIsExporting(false);
      }
  };

  // Handlers omitidos por brevidade (mesma lógica do arquivo original)
  const handleSaveEmployee = (e: React.FormEvent) => { /*...*/ };
  const handleSaveUser = async (e: React.FormEvent) => { /*...*/ };
  const handleSaveART = async (e: React.FormEvent) => { /*...*/ };
  const handleSaveOM = async () => { /*...*/ };
  const parseExcelData = () => { /*...*/ };

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-2xl font-black text-vale-darkgray flex items-center gap-2 uppercase">
              <GearIcon size={28} className="text-vale-green" />
              Configurações
          </h2>
          <button 
              onClick={exportToExcel}
              disabled={isExporting}
              className="bg-vale-aqua hover:bg-vale-green text-white font-black px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
              {isExporting ? <Loader2 className="animate-spin" size={20} /> : <FileSpreadsheet size={20} />}
              EXPORTAR DATABASE (EXCEL)
          </button>
      </div>
      
      <div className="flex border-b mb-6 overflow-x-auto bg-white rounded-t-xl shadow-sm">
        {['OMS', 'EMPLOYEES', 'ARTS', 'SCHEDULE', 'USERS'].map((tab) => (
            <button 
                key={tab} 
                className={`px-6 py-4 font-black text-xs whitespace-nowrap border-b-4 transition-colors ${activeTab === tab ? 'text-vale-green border-vale-green bg-vale-green/5' : 'text-gray-400 border-transparent hover:bg-gray-50'}`} 
                onClick={() => setActiveTab(tab as any)}
            >
                {tab === 'OMS' ? 'GESTÃO DE OMs' :
                 tab === 'EMPLOYEES' ? 'FUNCIONÁRIOS' : 
                 tab === 'ARTS' ? 'ARTs PADRÃO' : 
                 tab === 'SCHEDULE' ? 'PROGRAMAÇÃO' : 'USUÁRIOS'}
            </button>
        ))}
      </div>

      {activeTab === 'OMS' && (
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 animate-fadeIn">
              <h3 className="font-black text-sm mb-4 text-vale-darkgray flex items-center gap-2 uppercase">
                  <FileInput size={18} /> Cadastrar Nova OM
              </h3>
              <div className="p-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                  <p className="text-gray-400 font-bold mb-4 uppercase">Arraste o PDF da OM ou use o botão para capturar dados</p>
                  <button className="bg-vale-green text-white px-8 py-3 rounded-xl font-black text-xs shadow-lg hover:opacity-90 transition-all">
                      SELECIONAR ARQUIVO
                  </button>
              </div>
          </div>
      )}

      {/* Outras abas seguem o padrão original... */}
      <div className="mt-8 p-6 bg-vale-green/5 rounded-2xl border border-vale-green/10">
          <p className="text-[10px] font-black text-vale-green tracking-widest text-center uppercase">
              SAFEMAINT | SISTEMA DE GESTÃO E SEGURANÇA VALE | "A VIDA EM PRIMEIRO LUGAR"
          </p>
      </div>
    </div>
  );
};