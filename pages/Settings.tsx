
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { checkConnection, supabase } from '../services/supabase';
import { Employee, User, OMRecord, RegisteredART, ScheduleItem, DocumentRecord } from '../types';
import { 
  Save, Database, Users, Shield, 
  BrainCircuit, Trash2, Plus, 
  Eye, X, Info, FileText, Lock, Upload, RefreshCw, Cloud, Edit2, Calendar, LayoutList, Eraser, CheckCircle2, Sparkles, Loader2, RotateCcw, FileSearch, Terminal, Copy, Zap
} from 'lucide-react';
import { BackButton } from '../components/BackButton';
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do PDF.js Worker
const pdfjs = (pdfjsLib as any).default || pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

// --- SQL GENERATOR CONSTANT (VERSÃO DEFINITIVA E COMPLETA V3) ---
const GENERATED_SQL = `
-- --- SCRIPT SETUP TOTAL SAFEMAINT V3 ---
-- RODE ESTE SCRIPT NO 'SQL EDITOR' DO SUPABASE.

-- 1. CRIAÇÃO DAS TABELAS
CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY, name text, matricula text, login text, password text, role text
);

CREATE TABLE IF NOT EXISTS employees (
    id text PRIMARY KEY, name text, matricula text, function text, status text
);

CREATE TABLE IF NOT EXISTS oms (
    id text PRIMARY KEY, "omNumber" text, tag text, description text, type text, status text, "createdAt" text, "pdfUrl" text, "createdBy" text
);

CREATE TABLE IF NOT EXISTS arts (
    id text PRIMARY KEY, code text, company text, "taskName" text, area text, "controlMeasures" text, "pdfUrl" text
);

CREATE TABLE IF NOT EXISTS documents (
    id text PRIMARY KEY, type text, "createdAt" text, status text, header jsonb, content jsonb, signatures jsonb
);

CREATE TABLE IF NOT EXISTS schedule (
    id text PRIMARY KEY, "frotaOm" text, description text, resources text, "resources2" text, "dateMin" text, "dateMax" text, priority text, "peopleCount" numeric, hours numeric, "dateStart" text, "dateEnd" text, "workCenter" text, "timeStart" text, "timeEnd" text, status text, "weekNumber" text
);

CREATE TABLE IF NOT EXISTS active_maintenance (
    id text PRIMARY KEY, "omId" text, header jsonb, "startTime" text, "artId" text, "artType" text, origin text, status text, "currentSessionStart" text, "accumulatedTime" numeric, "openedBy" text
);

CREATE TABLE IF NOT EXISTS history (
    id text PRIMARY KEY, om text, tag text, description text, "startTime" text, "endTime" text, duration text, responsible text, status text, type text
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id text PRIMARY KEY, sender text, role text, text text, timestamp text, is_system boolean
);

CREATE TABLE IF NOT EXISTS checklist_definitions (
    id text PRIMARY KEY, "legacyId" numeric, section text, description text
);

CREATE TABLE IF NOT EXISTS availability (
    id text PRIMARY KEY, tag text, "statusMap" jsonb
);

-- 2. HABILITAR REALTIME (ATUALIZAÇÃO EM TEMPO REAL)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['users', 'employees', 'oms', 'arts', 'documents', 'schedule', 'active_maintenance', 'history', 'chat_messages', 'checklist_definitions', 'availability'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END LOOP;
END $$;

-- 3. PERMISSÕES DE ACESSO (RLS - POLÍTICA PÚBLICA PARA O APP)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['users', 'employees', 'oms', 'arts', 'documents', 'schedule', 'active_maintenance', 'history', 'chat_messages', 'checklist_definitions', 'availability'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable All Access" ON %I', t);
    EXECUTE format('CREATE POLICY "Enable All Access" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- 4. INSERIR DADOS PADRÃO (CHECKLIST MESTRE E USUÁRIO ADMIN)
INSERT INTO users (id, name, matricula, login, password, role) VALUES
('default-admin', 'ADMINISTRADOR', '81025901', '81025901', '123', 'ADMIN')
ON CONFLICT (id) DO NOTHING;

INSERT INTO checklist_definitions (id, "legacyId", section, description) VALUES
('1', 1, 'MOTOR', 'VAZAMENTO DE ÓLEO EM GERAL E PRÓXIMO A PARTES QUENTES'),
('2', 2, 'MOTOR', 'VAZAMENTO LÍQUIDO DE ARREFECIMENTO'),
('3', 3, 'MOTOR', 'INTERFERÊNCIAS ENTRE TUBOS, MANGUEIRAS E CABOS'),
('4', 4, 'MOTOR', 'NÍVEL DE ÓLEO'),
('5', 5, 'SISTEMA HIDRÁULICO', 'VAZAMENTO DO ÓLEO'),
('6', 6, 'SISTEMA HIDRÁULICO', 'NÍVEL DE ÓLEO'),
('7', 7, 'SISTEMA HIDRÁULICO', 'ABRAÇADEIRAS DE FIXAÇÃO'),
('8', 8, 'SISTEMA HIDRÁULICO', 'INTERFERÊNCIAS ENTRE TUBOS, MANGUEIRAS E CABOS'),
('9', 9, 'TRANSMISSÃO', 'VAZAMENTO DO ÓLEO'),
('10', 10, 'TRANSMISSÃO', 'PARAFUSOS FOLGADOS'),
('11', 11, 'TRANSMISSÃO', 'ABRAÇADEIRAS DE FIXAÇÃO'),
('12', 12, 'TRANSMISSÃO', 'INTERFERÊNCIAS ENTRE TUBOS, MANGUEIRAS E CABOS'),
('13', 13, 'TRANSMISSÃO', 'PROTEÇÃO DO CARDAN'),
('14', 14, 'DIFERENCIAL', 'BUJÃO DE DRENO DO DIFERENCIAL (FIXAÇÃO)'),
('15', 15, 'COMANDO FINAL', 'BUJÃO DE DRENO E INSPEÇÃO COMANDO DIREITO (FIXAÇÃO)'),
('16', 16, 'COMANDO FINAL', 'BUJÃO DE DRENO E INSPEÇÃO COMANDO ESQUERDO (FIXAÇÃO)'),
('17', 17, 'CONVERSOR', 'NÍVEL DE ÓLEO DO CONVERSOR E TRANSMISSÃO'),
('18', 18, 'SISTEMA DE DIREÇÃO', 'VAZAMENTO DE ÓLEO'),
('19', 19, 'SISTEMA DE DIREÇÃO', 'NÍVEL DE ÓLEO'),
('20', 20, 'SISTEMA DE DIREÇÃO', 'PARAFUSOS/PINOS FOLGADOS'),
('21', 21, 'SISTEMA DE DIREÇÃO', 'ABRAÇADEIRAS DE FIXAÇÃO'),
('22', 22, 'SISTEMA DE DIREÇÃO', 'INTERFERÊNCIAS ENTRE TUBOS, MANGUEIRAS E CABOS'),
('23', 23, 'ILUMINAÇÃO, AR CONDICIONADO', 'FAROL DE ALTA E BAIXA'),
('24', 24, 'ILUMINAÇÃO, AR CONDICIONADO', 'SETAS'),
('25', 25, 'ILUMINAÇÃO, AR CONDICIONADO', 'BUZINA'),
('26', 26, 'ILUMINAÇÃO, AR CONDICIONADO', 'AR CONDICIONADO'),
('27', 27, 'ESCADAS, CORRIMÃO, GUARDA CORPO', 'ESCADAS (PRINCIPAL E DE EMERGÊNCIA)'),
('28', 28, 'ESCADAS, CORRIMÃO, GUARDA CORPO', 'GUARDA CORPO (PLATAFORMA)'),
('29', 29, 'ESCADAS, CORRIMÃO, GUARDA CORPO', 'TAGS LATERAIS E TRASEIRO'),
('30', 30, 'ESCADAS, CORRIMÃO, GUARDA CORPO', 'CORRIMÃO DAS ESCADAS'),
('31', 31, 'LIMPEZA E ORGANIZAÇÃO', 'CABINE'),
('32', 32, 'LIMPEZA E ORGANIZAÇÃO', 'PLATAFORMA'),
('33', 33, 'LIMPEZA E ORGANIZAÇÃO', 'ESCADAS E CORRIMÕES'),
('34', 34, 'LIMPEZA E ORGANIZAÇÃO', 'RETROVISORES')
ON CONFLICT (id) DO NOTHING;
`;

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OMS' | 'PROCEDURES' | 'SCHEDULE' | 'EMPLOYEES' | 'USERS' | 'DB_LIVE'>('OMS');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  
  // View States
  const [viewingOM, setViewingOM] = useState<OMRecord | null>(null);
  const [viewingART, setViewingART] = useState<RegisteredART | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  // SQL Modal State
  const [showSqlModal, setShowSqlModal] = useState(false);

  // DB Live State
  const [liveTable, setLiveTable] = useState('active_maintenance');
  const [liveData, setLiveData] = useState<any[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR'>('CLOSED');

  // Edit State (Compartilhado)
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Edit State (OM)
  const [isEditOmModalOpen, setIsEditOmModalOpen] = useState(false);
  const [editingOmData, setEditingOmData] = useState<Partial<OMRecord>>({});

  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [oms, setOms] = useState<OMRecord[]>([]);
  const [arts, setArts] = useState<RegisteredART[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Forms - OM
  const [newOmNumber, setNewOmNumber] = useState('');
  const [newOmTag, setNewOmTag] = useState('');
  const [newOmDesc, setNewOmDesc] = useState('');
  const [newOmType, setNewOmType] = useState<'PREVENTIVA' | 'CORRETIVA'>('PREVENTIVA');
  const [newOmPdf, setNewOmPdf] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  
  // Forms - Schedule (APENAS MASSA AGORA)
  const [scheduleText, setScheduleText] = useState('');
  const [weekNumber, setWeekNumber] = useState('');

  // Forms - Employee
  const [empName, setEmpName] = useState('');
  const [empMatricula, setEmpMatricula] = useState('');
  const [empFunction, setEmpFunction] = useState('');

  // Forms - Users
  const [userName, setUserName] = useState('');
  const [userLogin, setUserLogin] = useState('');
  const [userPass, setUserPass] = useState('');
  const [userRole, setUserRole] = useState<'ADMIN' | 'OPERADOR'>('OPERADOR');

  // Forms - ARTs (Procedures)
  const [artCode, setArtCode] = useState('');
  const [artTask, setArtTask] = useState('');
  const [artPdf, setArtPdf] = useState('');

  useEffect(() => {
    refresh();
    checkConn();
    window.addEventListener('safemaint_storage_update', refresh);
    return () => window.removeEventListener('safemaint_storage_update', refresh);
  }, []);

  // Effect for Live DB Viewer (REALTIME)
  useEffect(() => {
      if (activeTab === 'DB_LIVE' && liveTable) {
          fetchLiveData();
          
          setRealtimeStatus('CONNECTING');
          const channel = supabase
            .channel('table-db-live')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: liveTable },
                (payload) => {
                    console.log('Realtime update:', payload);
                    // Refresh data on any change
                    fetchLiveData();
                }
            )
            .subscribe((status) => {
                setRealtimeStatus(status);
            });

          return () => {
              supabase.removeChannel(channel);
              setRealtimeStatus('CLOSED');
          };
      }
  }, [activeTab, liveTable]);

  useEffect(() => {
    const target = viewingOM || viewingART;
    if (target?.pdfUrl) {
        try {
            if (target.pdfUrl.startsWith('data:application/pdf;base64,')) {
                const parts = target.pdfUrl.split(',');
                if (parts.length > 1) {
                    const byteCharacters = atob(parts[1]);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                    const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    setPdfBlobUrl(url);
                    return () => URL.revokeObjectURL(url);
                }
            } else setPdfBlobUrl(target.pdfUrl);
        } catch (e) { setPdfBlobUrl(target.pdfUrl); }
    } else setPdfBlobUrl(null);
  }, [viewingOM, viewingART]);

  const checkConn = async () => {
      const status = await checkConnection();
      setIsConnected(status);
  };

  const fetchLiveData = async () => {
      setIsLoadingLive(true);
      try {
          const { data, error } = await supabase.from(liveTable).select('*').limit(50).order('id', { ascending: false }); // Show newest first if possible (id might not be sortable if UUID, but tries)
          if (error) throw error;
          setLiveData(data || []);
      } catch (e: any) {
          console.error("Erro ao buscar dados live:", e);
          setLiveData([]);
      } finally {
          setIsLoadingLive(false);
      }
  };

  const handleManualSync = async () => {
      setIsSyncing(true);
      await StorageService.initialSync();
      await checkConn();
      refresh();
      setTimeout(() => setIsSyncing(false), 1000);
  };

  const handleClearCache = () => {
    if (window.confirm("⚠️ ATENÇÃO: Isso irá apagar todos os dados locais salvos (Cache) e você será deslogado. Deseja continuar?")) {
        localStorage.clear();
        window.location.href = '/';
    }
  };

  const refresh = () => {
      setUsers(StorageService.getUsers());
      setEmployees(StorageService.getEmployees());
      setOms(StorageService.getOMs());
      setArts(StorageService.getARTs());
      setScheduleItems(StorageService.getSchedule());
  };

  const extractDataFromPdf = async (file: File, isEditMode = false) => {
    setIsExtracting(true);
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument(arrayBuffer).promise;
        let foundOm = ''; let foundDesc = ''; let foundTag = '';
        const fullTextParts: string[] = [];
        const maxPages = Math.min(pdf.numPages, 3); 
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullTextParts.push(pageText);
        }
        const fullText = fullTextParts.join(' ');
        const omRegex = /(?:OM|ORDEM|Nº|NUMERO)[:.\s]*(\d{8,12})/i;
        const omMatch = fullText.match(omRegex);
        if (omMatch) foundOm = omMatch[1];
        else { const fallbackOm = fullText.match(/(\d{12})/); if (fallbackOm) foundOm = fallbackOm[1]; }
        const descRegex = /(?:DESCRIÇÃO|TEXTO BREVE)[:.\s]*(.*?)(?:OBSERVAÇÕES|NOTA|EQUIPAMENTO|LOCAL|PERMISSÕES|$)/i;
        const descMatch = fullText.match(descRegex);
        if (descMatch) foundDesc = descMatch[1].trim().replace(/_+/g, ' '); 
        const tagRegex = /([A-Z]{3,4}-?[A-Z0-9]{2,}-?[A-Z0-9-]{3,})/i;
        const labeledTagMatch = fullText.match(/(?:TAG|EQUIPAMENTO|ITEM TÉCNICO)[:.\s]*([A-Z0-9-]{5,})/i);
        if (labeledTagMatch) { foundTag = labeledTagMatch[1]; } else { const genericTagMatch = fullText.match(tagRegex); if (genericTagMatch) foundTag = genericTagMatch[1]; }

        if (isEditMode) {
            setEditingOmData(prev => ({ ...prev, omNumber: foundOm || prev.omNumber, tag: foundTag || prev.tag, description: foundDesc || prev.description }));
        } else {
            if (foundOm) setNewOmNumber(foundOm); if (foundTag) setNewOmTag(foundTag); if (foundDesc) setNewOmDesc(foundDesc);
            if (foundDesc.toUpperCase().includes('PREVENTIVA') || foundDesc.toUpperCase().includes('SISTEMÁTICA')) { setNewOmType('PREVENTIVA'); } else if (foundDesc.toUpperCase().includes('CORRETIVA') || foundDesc.toUpperCase().includes('FALHA')) { setNewOmType('CORRETIVA'); }
        }
    } catch (error) { console.error("Erro no parser:", error); } finally { setIsExtracting(false); }
  };

  const extractARTFromPdf = async (file: File) => {
    setIsExtracting(true);
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument(arrayBuffer).promise;
        let foundCode = ''; let foundTask = '';
        if (pdf.numPages >= 1) {
            const page = await pdf.getPage(1);
            const textContent = await page.getTextContent();
            const textItems = textContent.items.map((item: any) => item.str);
            const text = textItems.join(' ');
            const codePatterns = [/(?:ART|PT|PET|PERMISSÃO)[\s.Nnº°]*([0-9A-Z.-]{4,})/i, /(?:DOC|DOCUMENTO)[:\s]*([0-9A-Z.-]+)/i];
            for (const pattern of codePatterns) { const match = text.match(pattern); if (match) { foundCode = match[1]; break; } }
            const taskPatterns = [/(?:ATIVIDADE|TAREFA|DESCRIÇÃO|OBJETIVO)[:\s.]+(.*?)(?:LOCAL|ÁREA|EXECUTANTE|DATA|$)/i, /(?:SERVIÇO A EXECUTAR)[:\s.]+(.*?)(?:$|\.)/i];
            for (const pattern of taskPatterns) { const match = text.match(pattern); if (match) { foundTask = match[1].trim(); foundTask = foundTask.replace(/^[_.-]+/, '').trim(); break; } }
        }
        if (foundCode) setArtCode(foundCode); if (foundTask) setArtTask(foundTask);
    } catch (error) { console.error("Erro na leitura do arquivo:", error); } finally { setIsExtracting(false); }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'OM' | 'ART' | 'EDIT_OM') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
        const base64 = reader.result as string;
        if (type === 'OM') { setNewOmPdf(base64); await extractDataFromPdf(file, false); }
        else if (type === 'EDIT_OM') { setEditingOmData(prev => ({ ...prev, pdfUrl: base64 })); await extractDataFromPdf(file, true); }
        else if (type === 'ART') { setArtPdf(base64); await extractARTFromPdf(file); }
    };
    reader.readAsDataURL(file);
  };

  const resetForms = () => {
      setEditingId(null);
      setNewOmNumber(''); setNewOmTag(''); setNewOmDesc(''); setNewOmPdf('');
      setEmpName(''); setEmpMatricula(''); setEmpFunction('');
      setUserName(''); setUserLogin(''); setUserPass('');
      setArtCode(''); setArtTask(''); setArtPdf('');
      setScheduleText(''); setWeekNumber('');
  };
  
  // --- OM ACTIONS ---
  const handleAddOM = async () => {
    if(!newOmNumber || !newOmTag) { alert("Preencha Número e Tag"); return; }
    const om: OMRecord = {
        id: crypto.randomUUID(),
        omNumber: newOmNumber,
        tag: newOmTag.toUpperCase(),
        description: newOmDesc.toUpperCase() || 'MANUTENÇÃO INDUSTRIAL',
        type: newOmType,
        status: 'PENDENTE',
        createdAt: new Date().toISOString(),
        pdfUrl: newOmPdf,
        createdBy: localStorage.getItem('safemaint_user') || 'ADMIN'
    };
    await StorageService.saveOM(om);
    alert('OM Cadastrada!');
    resetForms();
  };

  const handleOpenEditOM = (om: OMRecord) => {
      setEditingOmData({ ...om });
      setIsEditOmModalOpen(true);
  };

  const handleSaveEditOM = async () => {
      if (!editingOmData.id || !editingOmData.omNumber || !editingOmData.tag) return;
      
      const updatedOM = {
          ...editingOmData,
          omNumber: editingOmData.omNumber,
          tag: editingOmData.tag.toUpperCase(),
          description: editingOmData.description?.toUpperCase() || '',
          type: editingOmData.type || 'PREVENTIVA'
      } as OMRecord;

      await StorageService.saveOM(updatedOM); 
      setIsEditOmModalOpen(false);
      setEditingOmData({});
      refresh();
      alert('OM Atualizada com sucesso!');
  };

  // --- SCHEDULE ACTIONS (SMART IMPORT) ---
  const handleImportSchedule = async () => {
      if (!scheduleText || !weekNumber) {
          alert('Preencha o Número da Semana e cole a tabela.');
          return;
      }
      
      const rows = scheduleText.split('\n');
      let count = 0;
      const importedItems: ScheduleItem[] = [];

      for (const row of rows) {
          if (!row.trim()) continue;
          if (row.toUpperCase().includes('FROTA') && row.toUpperCase().includes('DESCRIÇÃO')) continue; 

          const cols = row.split('\t');
          // Precisamos de pelo menos 2 colunas para fazer sentido
          if (cols.length < 2) continue;
          
          // Mapeamento baseado na imagem fornecida (14 colunas agora)
          // 0: FROTA/OM
          // 1: DESCRIÇÃO DA ATIVIDADE
          // 2: DATA MIN
          // 3: DATA MAX
          // 4: PRIORIDADE
          // 5: N DE PESSOAS
          // 6: H
          // 7: DATA INICIO
          // 8: DATA FIM
          // 9: CENTRO DE TRABALHO
          // 10: HORA INICIO
          // 11: HORA FIM
          // 12: RECURSOS
          // 13: RECURSOS 2

          const frotaOm = cols[0]?.trim().toUpperCase() || 'N/D';
          const description = cols[1]?.trim().toUpperCase() || 'MANUTENÇÃO PROGRAMADA';
          const dateMin = cols[2]?.trim() || '';
          const dateMax = cols[3]?.trim() || '';
          const priority = cols[4]?.trim() || 'NORMAL';
          const peopleCount = parseInt(cols[5]?.trim() || '1');
          const hours = parseFloat(cols[6]?.trim().replace(',','.') || '1');
          const dateStart = cols[7]?.trim() || new Date().toLocaleDateString('pt-BR');
          const dateEnd = cols[8]?.trim() || dateStart;
          const workCenter = cols[9]?.trim().toUpperCase() || 'MANUTENÇÃO';
          const timeStart = cols[10]?.trim() || '07:00';
          const timeEnd = cols[11]?.trim() || '17:00';
          const resources = cols[12]?.trim().toUpperCase() || '';
          const resources2 = cols[13]?.trim().toUpperCase() || '';

          const item: ScheduleItem = {
              id: crypto.randomUUID(),
              frotaOm,
              description,
              dateMin,
              dateMax,
              priority,
              peopleCount,
              hours,
              dateStart,
              dateEnd,
              workCenter,
              timeStart,
              timeEnd,
              resources,
              resources2,
              status: 'PROGRAMADO',
              weekNumber: weekNumber 
          };
          
          await StorageService.saveScheduleItem(item);
          importedItems.push(item);
          count++;
      }

      if (importedItems.length > 0) {
          const now = new Date().toISOString();
          
          // CRIAÇÃO DO DOCUMENTO UNIFICADO DA SEMANA
          const doc: DocumentRecord = {
              id: crypto.randomUUID(),
              type: 'RELATORIO',
              header: {
                  om: `SEM-${weekNumber}`,
                  tag: 'GERAL',
                  date: now.split('T')[0],
                  time: now.split('T')[1].slice(0,5),
                  type: 'OUTROS',
                  description: `PROGRAMAÇÃO SEMANAL - SEMANA ${weekNumber}`
              },
              createdAt: now,
              status: 'ATIVO',
              content: {
                  rawText: "Importação via Sistema",
                  stopReason: 'PLANEJAMENTO SEMANAL',
                  activities: `Importação de ${count} itens para a Semana ${weekNumber}`,
                  startTime: '08:00',
                  endTime: '17:00',
                  weekNumber: weekNumber,
                  scheduleItems: importedItems // Salva todos os itens no conteúdo para gerar a tabela no Arquivo
              },
              signatures: []
          };
          await StorageService.saveDocument(doc);
      }

      alert(`${count} itens importados para a Semana ${weekNumber}!\nUm único documento consolidado foi salvo no Arquivo.`);
      setScheduleText('');
      setWeekNumber('');
  };

  // --- EMPLOYEE ACTIONS (EDIT/SAVE) ---
  const handleEditEmployee = (emp: Employee) => {
      setEditingId(emp.id);
      setEmpName(emp.name);
      setEmpMatricula(emp.matricula);
      setEmpFunction(emp.function);
  };

  const handleAddEmployee = async () => {
      if(!empName || !empMatricula) return;
      const emp: Employee = { 
          id: editingId || crypto.randomUUID(), 
          name: empName.toUpperCase(), 
          matricula: empMatricula.toUpperCase(), 
          function: empFunction.toUpperCase(), 
          status: 'ACTIVE' 
      };
      await StorageService.saveEmployee(emp);
      resetForms();
      alert(editingId ? 'Colaborador Atualizado!' : 'Colaborador Adicionado!');
  };

  // --- USER ACTIONS (EDIT/SAVE) ---
  const handleEditUser = (user: User) => {
      setEditingId(user.id);
      setUserName(user.name);
      setUserLogin(user.login);
      setUserPass(user.password || '');
      setUserRole(user.role);
  };

  const handleAddUser = async () => {
      if(!userLogin || !userPass) return;
      const user: User = { 
          id: editingId || crypto.randomUUID(), 
          name: userName.toUpperCase(), 
          login: userLogin.toUpperCase(), 
          password: userPass, 
          matricula: userLogin.toUpperCase(), 
          role: userRole 
      };
      await StorageService.saveUser(user);
      resetForms();
      alert(editingId ? 'Usuário Atualizado!' : 'Usuário Criado!');
  };

  // --- ART ACTIONS ---
  const handleAddART = async () => {
      if(!artCode || !artTask || !artPdf) return;
      await StorageService.saveART({ 
          id: crypto.randomUUID(), 
          code: artCode, 
          company: 'VALE', 
          taskName: artTask.toUpperCase(), 
          area: 'GERAL', 
          controlMeasures: 'VER PDF', 
          pdfUrl: artPdf 
      });
      resetForms();
      alert('ART Cadastrada na Biblioteca!');
  };

  return (
    <div className="max-w-7xl mx-auto pb-10 px-4">
      <header className="flex flex-col md:flex-row items-center justify-between py-4 mb-4 bg-white px-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
              <BackButton />
              <h2 className="text-lg font-bold uppercase text-gray-800 flex items-center gap-2">
                <Database size={18} className="text-[#007e7a]"/> Central de Dados
              </h2>
          </div>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
              <button 
                onClick={handleClearCache} 
                className="flex items-center gap-2 px-4 py-2 rounded bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold uppercase transition-all border border-red-200"
              >
                  <Eraser size={14} />
                  Limpar Cache
              </button>
              <button 
                onClick={handleManualSync} 
                disabled={isSyncing} 
                className="flex items-center gap-2 px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold uppercase transition-all border border-gray-300"
              >
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
              </button>
          </div>
      </header>
      
      <nav className="flex bg-white p-1 rounded-lg mb-6 shadow-sm border border-gray-200 gap-1 overflow-x-auto">
        {[
          {id: 'OMS', label: 'Cadastro OM', icon: <BrainCircuit size={14}/>},
          {id: 'PROCEDURES', label: 'Manual ARTs', icon: <FileText size={14}/>},
          {id: 'SCHEDULE', label: 'Programação (Massa)', icon: <Calendar size={14}/>},
          {id: 'EMPLOYEES', label: 'Equipe', icon: <Users size={14}/>},
          {id: 'USERS', label: 'Acessos', icon: <Shield size={14}/>},
          {id: 'DB_LIVE', label: 'DB ONLINE (LIVE)', icon: <Terminal size={14}/>}
        ].map((tab) => (
            <button key={tab.id} className={`flex-1 px-4 py-2 font-bold text-xs rounded transition-all flex items-center justify-center gap-2 uppercase whitespace-nowrap ${activeTab === tab.id ? 'bg-[#007e7a] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => { setActiveTab(tab.id as any); setSearchQuery(''); resetForms(); }}> 
              {tab.icon} {tab.label} 
            </button>
        ))}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
                  {/* ... (Existing Tabs Content for OMS, SCHEDULE, PROCEDURES, EMPLOYEES, USERS) ... */}
                  {activeTab === 'OMS' && (
                    <div className="space-y-3 animate-fadeIn">
                        <h3 className="font-bold text-gray-700 uppercase text-xs border-b pb-2">Nova Ordem (OM)</h3>
                        <div className="border border-dashed border-[#007e7a] bg-teal-50/50 rounded p-4 text-center cursor-pointer relative group transition-colors hover:bg-teal-50">
                            <input type="file" accept=".pdf" onChange={(e) => handlePdfUpload(e, 'OM')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            {isExtracting ? (
                                <div className="flex flex-col items-center animate-pulse">
                                    <Loader2 size={24} className="text-[#007e7a] animate-spin mb-2" />
                                    <span className="text-[10px] font-bold text-[#007e7a]">LENDO DOCUMENTO...</span>
                                </div>
                            ) : newOmPdf ? (
                                <div className="flex flex-col items-center">
                                    <CheckCircle2 size={24} className="text-green-600 mb-1" />
                                    <span className="text-[10px] font-bold text-green-600 uppercase">PDF PROCESSADO</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <FileText size={20} className="text-[#007e7a] mb-1 group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-bold text-[#007e7a] uppercase">Anexar PDF da Ordem</span>
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <input value={newOmNumber} onChange={e => setNewOmNumber(e.target.value)} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase focus:border-[#007e7a] outline-none" placeholder="Número OM" />
                            {newOmNumber && !isExtracting && newOmPdf && <Sparkles size={12} className="absolute right-2 top-2.5 text-yellow-500 animate-pulse" />}
                        </div>
                        <input value={newOmTag} onChange={e => setNewOmTag(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase text-[#007e7a] focus:border-[#007e7a] outline-none" placeholder="TAG EQUIPAMENTO" />
                        <select value={newOmType} onChange={e => setNewOmType(e.target.value as any)} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-xs font-bold uppercase focus:border-[#007e7a] outline-none">
                            <option value="PREVENTIVA">PREVENTIVA</option>
                            <option value="CORRETIVA">CORRETIVA</option>
                        </select>
                        <textarea value={newOmDesc} onChange={e => setNewOmDesc(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-xs font-bold h-20 resize-none focus:border-[#007e7a] outline-none" placeholder="DESCRIÇÃO DA ATIVIDADE..." />
                        <button onClick={handleAddOM} disabled={isExtracting} className="w-full bg-[#007e7a] text-white py-3 rounded font-bold text-xs uppercase hover:bg-[#00605d] flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"><Save size={14}/> Salvar na Biblioteca</button>
                    </div>
                  )}

                  {activeTab === 'SCHEDULE' && (
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <h3 className="font-bold text-gray-700 uppercase text-xs border-b pb-2">Importação em Massa (Excel)</h3>
                            <input value={weekNumber} onChange={e => setWeekNumber(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase focus:border-blue-500 outline-none" placeholder="NÚMERO DA SEMANA (EX: 42)" />
                            <div className="bg-blue-50 p-2 rounded text-[9px] text-blue-800">
                                <strong>COLE AS COLUNAS DO EXCEL (14 COLUNAS):</strong><br/>
                                FROTA/OM | DESC | D.MIN | D.MAX | PRIOR | PESSOAS | H | D.INI | D.FIM | CENTRO | H.INI | H.FIM | REC | REC2
                            </div>
                            <textarea value={scheduleText} onChange={e => setScheduleText(e.target.value)} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-xs font-mono h-64 resize-none" placeholder="Cole aqui os dados copiados do Excel..." />
                            <button onClick={handleImportSchedule} className="w-full bg-green-600 text-white py-3 rounded font-bold text-xs uppercase hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg"><Cloud size={14}/> Importar & Arquivar PDF</button>
                        </div>
                    </div>
                  )}

                  {activeTab === 'PROCEDURES' && (
                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-700 uppercase text-xs border-b pb-2">Novo Procedimento ART</h3>
                        <div className="border border-dashed border-blue-300 bg-blue-50/50 rounded p-4 text-center cursor-pointer relative hover:bg-blue-50 transition-colors">
                            <input type="file" accept=".pdf" onChange={(e) => handlePdfUpload(e, 'ART')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            {isExtracting ? <span className="text-[10px] font-bold text-blue-600">ANALISANDO ARQUIVO...</span> : <span className="text-[10px] font-bold text-blue-500 uppercase">Upload PDF ART</span>}
                        </div>
                        <input value={artCode} onChange={e => setArtCode(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase focus:border-blue-500 outline-none" placeholder="Código ART" />
                        <input value={artTask} onChange={e => setArtTask(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase focus:border-blue-500 outline-none" placeholder="Tarefa" />
                        <button onClick={handleAddART} disabled={isExtracting} className="w-full bg-blue-600 text-white py-3 rounded font-bold text-xs uppercase hover:bg-blue-700 flex items-center justify-center gap-2"><Save size={14}/> Cadastrar ART</button>
                    </div>
                  )}

                  {activeTab === 'EMPLOYEES' && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b pb-2"><h3 className="font-bold text-gray-700 uppercase text-xs">{editingId ? 'Editando Colaborador' : 'Novo Colaborador'}</h3></div>
                        <input value={empName} onChange={e => setEmpName(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase" placeholder="Nome" />
                        <input value={empMatricula} onChange={e => setEmpMatricula(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase" placeholder="Matrícula" />
                        <input value={empFunction} onChange={e => setEmpFunction(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase" placeholder="Função" />
                        {editingId ? (<div className="flex gap-2"><button onClick={resetForms} className="flex-1 bg-gray-200 text-gray-600 py-3 rounded font-bold text-xs uppercase">Cancelar</button><button onClick={handleAddEmployee} className="flex-1 bg-orange-500 text-white py-3 rounded font-bold text-xs uppercase">Atualizar</button></div>) : (<button onClick={handleAddEmployee} className="w-full bg-orange-500 text-white py-3 rounded font-bold text-xs uppercase">Salvar</button>)}
                    </div>
                  )}

                  {activeTab === 'USERS' && (
                    <div className="space-y-3">
                         <div className="flex justify-between items-center border-b pb-2"><h3 className="font-bold text-gray-700 uppercase text-xs">{editingId ? 'Editando Usuário' : 'Novo Usuário'}</h3></div>
                        <input value={userName} onChange={e => setUserName(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase" placeholder="Nome Exibição" />
                        <input value={userLogin} onChange={e => setUserLogin(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase" placeholder="Login / Matrícula" />
                        <input type="text" value={userPass} onChange={e => setUserPass(e.target.value)} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase" placeholder="Senha" />
                        <select value={userRole} onChange={e => setUserRole(e.target.value as any)} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-xs font-bold uppercase">
                            <option value="OPERADOR">Operador</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                        {editingId ? (<div className="flex gap-2"><button onClick={resetForms} className="flex-1 bg-gray-200 text-gray-600 py-3 rounded font-bold text-xs uppercase">Cancelar</button><button onClick={handleAddUser} className="flex-1 bg-purple-600 text-white py-3 rounded font-bold text-xs uppercase">Atualizar</button></div>) : (<button onClick={handleAddUser} className="w-full bg-purple-600 text-white py-3 rounded font-bold text-xs uppercase">Criar Acesso</button>)}
                    </div>
                  )}

                  {/* NEW LIVE DB PANEL */}
                  {activeTab === 'DB_LIVE' && (
                      <div className="space-y-4">
                          <h3 className="font-bold text-gray-700 uppercase text-xs border-b pb-2">Banco de Dados (Online)</h3>
                          <div className="bg-gray-100 p-3 rounded-lg text-[10px] text-gray-600 border border-gray-200">
                              <p className="mb-2 font-bold flex items-center gap-1">
                                  STATUS: 
                                  {isConnected ? <span className="text-green-600">CONECTADO</span> : <span className="text-red-600">OFFLINE</span>}
                                  | REALTIME: 
                                  {realtimeStatus === 'SUBSCRIBED' ? <span className="text-green-600 flex items-center gap-1"><Zap size={10} fill="currentColor"/> ATIVO</span> : <span className="text-gray-400">{realtimeStatus}</span>}
                              </p>
                              <select 
                                value={liveTable} 
                                onChange={(e) => setLiveTable(e.target.value)}
                                className="w-full p-2 rounded border border-gray-300 uppercase font-bold"
                              >
                                  <option value="active_maintenance">Active Maintenance (Atividades)</option>
                                  <option value="schedule">Schedule (Programação)</option>
                                  <option value="oms">OMS (Ordens)</option>
                                  <option value="chat_messages">Chat (Mensagens)</option>
                                  <option value="availability">Availability (Disponibilidade)</option>
                                  <option value="users">Users</option>
                                  <option value="employees">Employees</option>
                                  <option value="history">History</option>
                                  <option value="documents">Documents</option>
                              </select>
                          </div>
                          
                          <button 
                            onClick={fetchLiveData} 
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded font-bold text-xs uppercase flex items-center justify-center gap-2"
                          >
                              <RefreshCw size={14} className={isLoadingLive ? 'animate-spin' : ''}/> Atualizar Tabela
                          </button>

                          <button 
                            onClick={() => setShowSqlModal(true)} 
                            className="w-full bg-gray-800 hover:bg-black text-white py-3 rounded font-bold text-xs uppercase flex items-center justify-center gap-2 mt-2"
                          >
                              <Terminal size={14}/> OBTER SQL (SETUP)
                          </button>
                      </div>
                  )}
              </div>
          </div>

          <div className="lg:col-span-8">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
                  
                  {/* ... (Existing List View for local data) ... */}
                  {activeTab !== 'DB_LIVE' && (
                      <>
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h4 className="text-sm font-bold text-gray-700 uppercase">
                                {activeTab === 'OMS' ? 'Biblioteca de OMs' : 'Registros Cadastrados'}
                            </h4>
                            <div className="relative w-64">
                                <input type="text" placeholder="Filtrar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value.toUpperCase())} className="w-full pl-3 pr-3 py-2 bg-white border border-gray-300 rounded text-xs font-bold uppercase outline-none focus:border-[#007e7a]" />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-white">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-100 sticky top-0 z-10 border-b border-gray-200">
                                    <tr>
                                        <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">Chave</th>
                                        <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">Detalhes</th>
                                        {activeTab !== 'OMS' && <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">Info Adicional</th>}
                                        <th className="p-3 text-[10px] font-bold text-gray-500 uppercase text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* ... (Existing Maps for OMS, EMPLOYEES, USERS, PROCEDURES, SCHEDULE) ... */}
                                    {activeTab === 'OMS' && oms.filter(om => om.omNumber.includes(searchQuery) || om.tag.includes(searchQuery)).map(om => (
                                        <tr key={om.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="p-3"><div className="font-bold text-sm text-gray-800">{om.omNumber}</div><div className={`text-[9px] font-bold px-1.5 py-0.5 rounded inline-block mt-1 ${om.type === 'CORRETIVA' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{om.type}</div></td>
                                            <td className="p-3"><div className="font-bold text-xs text-[#007e7a]">{om.tag}</div><div className="text-[10px] text-gray-500 truncate max-w-[200px]">{om.description}</div></td>
                                            <td className="p-3 text-right"><div className="flex justify-end gap-2">{om.pdfUrl && <button onClick={() => setViewingOM(om)} className="p-1.5 text-[#007e7a] hover:bg-teal-50 rounded" title="Ver PDF"><Eye size={14}/></button>}<button onClick={() => handleOpenEditOM(om)} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded" title="Editar"><Edit2 size={14}/></button><button onClick={() => { if(window.confirm('Excluir esta OM?')) StorageService.deleteOM(om.id).then(refresh) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button></div></td>
                                        </tr>
                                    ))}
                                    {/* ... (Keep other maps exactly as they were in previous version) ... */}
                                    {activeTab === 'USERS' && users.filter(u => u.name.includes(searchQuery)).map(user => (
                                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="p-3 font-bold text-xs">{user.login}</td>
                                            <td className="p-3 font-bold text-xs text-gray-700">{user.name}</td>
                                            <td className="p-3 text-xs"><span className={`px-2 py-0.5 rounded font-bold text-[9px] ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{user.role}</span></td>
                                            <td className="p-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => handleEditUser(user)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={14}/></button><button onClick={() => { if(window.confirm('Excluir?')) StorageService.deleteUser(user.id).then(refresh) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button></div></td>
                                        </tr>
                                    ))}
                                    {activeTab === 'EMPLOYEES' && employees.filter(e => e.name.includes(searchQuery)).map(emp => (
                                        <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="p-3 font-bold text-xs">{emp.matricula}</td>
                                            <td className="p-3 font-bold text-xs text-gray-700">{emp.name}</td>
                                            <td className="p-3 text-xs text-gray-500">{emp.function}</td>
                                            <td className="p-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => handleEditEmployee(emp)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={14}/></button><button onClick={() => { if(window.confirm('Excluir?')) StorageService.deleteEmployee(emp.id).then(refresh) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button></div></td>
                                        </tr>
                                    ))}
                                    {activeTab === 'PROCEDURES' && arts.filter(a => a.code.includes(searchQuery)).map(art => (
                                        <tr key={art.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="p-3 font-bold text-xs text-blue-600">{art.code}</td>
                                            <td className="p-3 font-bold text-xs text-gray-700">{art.taskName}</td>
                                            <td className="p-3 text-xs text-gray-500">{art.pdfUrl ? 'PDF Anexado' : 'Sem PDF'}</td>
                                            <td className="p-3 text-right"><div className="flex justify-end gap-2">{art.pdfUrl && (<button onClick={() => setViewingART(art)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Ver PDF Original"><Eye size={14}/></button>)}<button onClick={() => { if(window.confirm('Excluir ART?')) StorageService.deleteART(art.id).then(refresh) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button></div></td>
                                        </tr>
                                    ))}
                                    {activeTab === 'SCHEDULE' && scheduleItems.filter(i => i.frotaOm.includes(searchQuery)).slice(0, 50).map(item => (
                                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="p-3 font-bold text-xs">{item.frotaOm}</td>
                                            <td className="p-3 font-bold text-xs text-gray-700 truncate max-w-[200px]">{item.description}</td>
                                            <td className="p-3 text-xs text-gray-500">{item.dateStart}</td>
                                            <td className="p-3 text-right"><button onClick={() => { if(window.confirm('Excluir item?')) StorageService.deleteScheduleItem(item.id).then(refresh) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                      </>
                  )}

                  {/* NEW LIVE TABLE VIEWER */}
                  {activeTab === 'DB_LIVE' && (
                      <>
                        <div className="p-4 border-b border-gray-200 bg-indigo-50 flex justify-between items-center">
                            <h4 className="text-sm font-black text-indigo-900 uppercase">
                                VISUALIZAÇÃO DIRETA: <span className="text-indigo-600">{liveTable}</span>
                            </h4>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase">Lim. 50 registros</span>
                        </div>
                        <div className="flex-1 overflow-auto p-0 bg-gray-50 custom-scrollbar">
                            {isLoadingLive ? (
                                <div className="flex flex-col items-center justify-center h-full text-indigo-400">
                                    <Loader2 size={32} className="animate-spin mb-2" />
                                    <span className="font-bold text-xs uppercase">Carregando dados...</span>
                                </div>
                            ) : liveData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <Database size={32} className="mb-2 opacity-20" />
                                    <span className="font-bold text-xs uppercase">Tabela Vazia ou Sem Conexão</span>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead className="bg-gray-200 sticky top-0 z-10">
                                        <tr>
                                            {Object.keys(liveData[0]).map(key => (
                                                <th key={key} className="p-2 text-[9px] font-black text-gray-600 uppercase border border-gray-300">{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white font-mono text-[10px]">
                                        {liveData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-indigo-50 animate-fadeIn">
                                                {Object.values(row).map((val: any, vIdx) => (
                                                    <td key={vIdx} className="p-2 border border-gray-200 truncate max-w-[200px]">
                                                        {typeof val === 'object' ? JSON.stringify(val).slice(0, 30) + '...' : String(val)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                      </>
                  )}
              </div>
          </div>
      </div>

      {/* MODAL SQL GENERATOR */}
      {showSqlModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border-t-8 border-indigo-600">
                  <div className="bg-gray-50 p-6 border-b flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="text-xl font-black text-gray-800 uppercase flex items-center gap-2">
                              <Terminal size={24} className="text-indigo-600"/>
                              Script de Configuração SQL
                          </h3>
                          <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">
                              Copie este código e execute no Editor SQL do Supabase para criar as tabelas e habilitar REALTIME.
                          </p>
                      </div>
                      <button onClick={() => setShowSqlModal(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"><X size={24}/></button>
                  </div>
                  
                  <div className="flex-1 relative bg-gray-900 overflow-hidden">
                      <textarea 
                        readOnly 
                        className="w-full h-full bg-gray-900 text-green-400 font-mono text-xs p-6 outline-none resize-none custom-scrollbar"
                        value={GENERATED_SQL}
                      />
                      <button 
                        onClick={() => { navigator.clipboard.writeText(GENERATED_SQL); alert("SQL Copiado!"); }}
                        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase backdrop-blur-md flex items-center gap-2 border border-white/20 transition-all"
                      >
                          <Copy size={14}/> Copiar Código
                      </button>
                  </div>
                  
                  <div className="p-4 bg-gray-100 border-t text-center shrink-0">
                      <p className="text-[9px] font-bold text-gray-500 uppercase">
                          ATENÇÃO: Este script é seguro para rodar múltiplas vezes (IDEMPOTENTE).
                      </p>
                  </div>
              </div>
          </div>
      )}

      {/* EDIT MODAL AND PDF MODAL KEPT SAME AS BEFORE */}
      {isEditOmModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 border-b-4 border-orange-500">
                {/* ... (Existing Edit Modal Content) ... */}
                <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="text-lg font-bold text-gray-800 uppercase">Editar Ordem</h3><button onClick={() => setIsEditOmModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={20}/></button></div>
                <div className="mb-4"><div className="border border-dashed border-gray-300 bg-gray-50 rounded p-2 text-center cursor-pointer relative group transition-colors hover:bg-gray-100"><input type="file" accept=".pdf" onChange={(e) => handlePdfUpload(e, 'EDIT_OM')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />{isExtracting ? (<span className="text-[10px] font-bold text-orange-500 animate-pulse">REPROCESSANDO DOCUMENTO...</span>) : (<span className="text-[10px] font-bold text-gray-500 uppercase group-hover:text-orange-500">Trocar PDF (Re-extrair)</span>)}</div></div>
                <div className="space-y-3">
                    <input value={editingOmData.omNumber || ''} onChange={e => setEditingOmData({...editingOmData, omNumber: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm font-bold uppercase outline-none focus:border-orange-500" placeholder="Número OM" />
                    <input value={editingOmData.tag || ''} onChange={e => setEditingOmData({...editingOmData, tag: e.target.value.toUpperCase()})} className="w-full border border-gray-300 rounded p-2 text-sm font-bold uppercase outline-none focus:border-orange-500" placeholder="TAG" />
                    <select value={editingOmData.type || 'PREVENTIVA'} onChange={e => setEditingOmData({...editingOmData, type: e.target.value as any})} className="w-full border border-gray-300 rounded p-2 text-xs font-bold uppercase outline-none"><option value="PREVENTIVA">PREVENTIVA</option><option value="CORRETIVA">CORRETIVA</option></select>
                    <textarea value={editingOmData.description || ''} onChange={e => setEditingOmData({...editingOmData, description: e.target.value.toUpperCase()})} className="w-full border border-gray-300 rounded p-2 text-xs font-bold h-20 resize-none outline-none focus:border-orange-500" placeholder="DESCRIÇÃO..." />
                    <button onClick={handleSaveEditOM} disabled={isExtracting} className="w-full bg-orange-500 text-white py-3 rounded font-bold text-xs uppercase hover:bg-orange-600 flex items-center justify-center gap-2"><Save size={16}/> Salvar Alterações</button>
                </div>
            </div>
        </div>
      )}

      {(viewingOM || viewingART) && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
            <div className="w-full h-full max-w-4xl bg-white flex flex-col rounded-lg overflow-hidden">
                <div className="bg-gray-900 text-white p-2 flex justify-between items-center shrink-0">
                    <span className="font-bold text-xs">
                        VISUALIZAR DOCUMENTO - {viewingOM ? viewingOM.omNumber : viewingART?.code}
                    </span>
                    <button onClick={() => { setViewingOM(null); setViewingART(null); }} className="p-1 hover:bg-red-600 rounded"><X size={16}/></button>
                </div>
                <div className="flex-1 bg-gray-200 relative">
                    {pdfBlobUrl ? (
                        <iframe src={pdfBlobUrl} className="w-full h-full border-none bg-white" title="Viewer" />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 font-bold uppercase text-xs">Sem PDF Anexado</div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
