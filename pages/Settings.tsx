
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { supabase, checkConnection } from '../services/supabase';
import { Employee, User, OMRecord, RegisteredART, ScheduleItem, DocumentRecord, PendingExtraDemand } from '../types';
import { 
  Save, Database, Users, Shield, 
  BrainCircuit, Trash2,
  Eye, X, FileText, Cloud, Edit2, Calendar, Eraser, CheckCircle2, Sparkles, Loader2, Copy, Zap, Terminal, RefreshCw, BookOpen, Table, UploadCloud, ClipboardList, Plus
} from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { FeedbackModal } from '../components/FeedbackModal'; 
import * as pdfjsLib from 'pdfjs-dist';
import { useNavigate } from 'react-router-dom';

const pdfjs = (pdfjsLib as any).default || pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

const GENERATED_SQL = `
-- ============================================================
-- SCRIPT SETUP TOTAL SAFEMAINT V4 (ALL TABLES INCLUDED)
-- ============================================================

-- 1. CRIAÇÃO DAS TABELAS (TOTAL: 13 TABELAS)

-- Tabela: Usuários
CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY, 
    name text, 
    matricula text, 
    login text, 
    password text, 
    role text, 
    is_active_session boolean default false
);

-- Tabela: Funcionários (Assinaturas)
CREATE TABLE IF NOT EXISTS employees (
    id text PRIMARY KEY, 
    name text, 
    matricula text, 
    function text, 
    status text
);

-- Tabela: OMs (Ordens de Manutenção)
CREATE TABLE IF NOT EXISTS oms (
    id text PRIMARY KEY, 
    "omNumber" text, 
    tag text, 
    description text, 
    type text, 
    status text, 
    "createdAt" text, 
    "pdfUrl" text, 
    "createdBy" text,
    "linkedScheduleOm" text,
    "installationLocation" text
);

-- Tabela: ARTs (Modelos/Procedimentos)
CREATE TABLE IF NOT EXISTS arts (
    id text PRIMARY KEY, 
    code text, 
    company text, 
    "taskName" text, 
    area text, 
    "controlMeasures" text, 
    "pdfUrl" text
);

-- Tabela: Documentos (Relatórios, ARTs Preenchidas, Checklists)
CREATE TABLE IF NOT EXISTS documents (
    id text PRIMARY KEY, 
    type text, 
    "createdAt" text, 
    status text, 
    header jsonb, 
    content jsonb, 
    signatures jsonb
);

-- Tabela: Cronograma (Agenda)
CREATE TABLE IF NOT EXISTS schedule (
    id text PRIMARY KEY, 
    "frotaOm" text, 
    description text, 
    resources text, 
    "resources2" text, 
    "dateMin" text, 
    "dateMax" text, 
    priority text, 
    "peopleCount" numeric, 
    hours numeric, 
    "dateStart" text, 
    "dateEnd" text, 
    "workCenter" text, 
    "timeStart" text, 
    "timeEnd" text, 
    status text, 
    "weekNumber" text
);

-- Tabela: Manutenção Ativa (Em andamento no Dashboard)
CREATE TABLE IF NOT EXISTS active_maintenance (
    id text PRIMARY KEY, 
    "omId" text, 
    "scheduleId" text, 
    header jsonb, 
    "startTime" text, 
    "artId" text, 
    "artType" text, 
    origin text, 
    status text, 
    "currentSessionStart" text, 
    "accumulatedTime" numeric, 
    "openedBy" text
);

-- Tabela: Histórico (Logs de Finalização)
CREATE TABLE IF NOT EXISTS history (
    id text PRIMARY KEY, 
    om text, 
    tag text, 
    description text, 
    "startTime" text, 
    "endTime" text, 
    duration text, 
    responsible text, 
    status text, 
    type text
);

-- Tabela: Definições de Checklist (Template)
CREATE TABLE IF NOT EXISTS checklist_definitions (
    id text PRIMARY KEY, 
    "legacyId" numeric, 
    section text, 
    description text
);

-- Tabela: Demandas Extras Pendentes
CREATE TABLE IF NOT EXISTS pending_extra_demands (
    id text PRIMARY KEY, 
    tag text, 
    description text, 
    "createdAt" text, 
    status text
);

-- Tabela: Notificações
CREATE TABLE IF NOT EXISTS notifications (
    id text PRIMARY KEY, 
    type text, 
    title text, 
    message text, 
    date text, 
    "createdAt" text, 
    read boolean, 
    link text
);

-- Tabela: Chat (Mensagens Internas)
CREATE TABLE IF NOT EXISTS chat_messages (
    id text PRIMARY KEY, 
    sender text, 
    role text, 
    text text, 
    timestamp text
);

-- Tabela: Disponibilidade (Painel Indicadores)
CREATE TABLE IF NOT EXISTS availability (
    id text PRIMARY KEY, 
    tag text, 
    "statusMap" jsonb, 
    "statusCounts" jsonb, 
    "manualOverrides" jsonb
);

-- 2. HABILITAR REALTIME PARA TODAS AS TABELAS
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users', 
    'employees', 
    'oms', 
    'arts', 
    'documents', 
    'schedule', 
    'active_maintenance', 
    'history', 
    'checklist_definitions', 
    'pending_extra_demands',
    'notifications',
    'chat_messages',
    'availability'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    EXCEPTION 
      WHEN duplicate_object THEN NULL; 
      WHEN undefined_object THEN NULL; 
    END;
  END LOOP;
END $$;

-- 3. PERMISSÕES DE ACESSO (RLS - Enable All Access)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users', 'employees', 'oms', 'arts', 'documents', 'schedule', 
    'active_maintenance', 'history', 'checklist_definitions', 
    'pending_extra_demands', 'notifications', 'chat_messages', 'availability'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable All Access" ON %I', t);
    EXECUTE format('CREATE POLICY "Enable All Access" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- 4. INSERIR DADOS PADRÃO (BOOTSTRAP)
INSERT INTO users (id, name, matricula, login, password, role, is_active_session) VALUES
('default-admin', 'ADMINISTRADOR', '81025901', '81025901', '123', 'ADMIN', false)
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'OMS' | 'PROCEDURES' | 'SCHEDULE' | 'EMPLOYEES' | 'USERS' | 'DB_LIVE' | 'DEMANDS_REGISTER'>('OMS');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  
  // --- FEEDBACK STATES ---
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [processText, setProcessText] = useState('');
  const [successText, setSuccessText] = useState('');

  // View States
  const [viewingOM, setViewingOM] = useState<OMRecord | null>(null);
  const [viewingART, setViewingART] = useState<RegisteredART | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

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

  // Edit State (Demand)
  const [isEditDemandModalOpen, setIsEditDemandModalOpen] = useState(false);
  const [editingDemandData, setEditingDemandData] = useState<Partial<PendingExtraDemand>>({});

  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [oms, setOms] = useState<OMRecord[]>([]);
  const [arts, setArts] = useState<RegisteredART[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [pendingDemands, setPendingDemands] = useState<PendingExtraDemand[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Forms - OM
  const [newOmNumber, setNewOmNumber] = useState('');
  const [newOmTag, setNewOmTag] = useState('');
  const [newOmDesc, setNewOmDesc] = useState('');
  const [newOmType, setNewOmType] = useState<'PREVENTIVA' | 'CORRETIVA' | 'DEMANDA'>('PREVENTIVA');
  const [newOmPdf, setNewOmPdf] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  
  // Forms - Schedule (TABELA)
  const [weekNumber, setWeekNumber] = useState('');
  const [scheduleText, setScheduleText] = useState('');

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

  // Forms - Demands (New Tab)
  const [demandTag, setDemandTag] = useState('');
  const [demandActivities, setDemandActivities] = useState<string[]>(['']);

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
    let activeUrl: string | null = null;

    const loadPdf = async () => {
        const target = viewingOM || viewingART;
        if (!target) {
            setPdfBlobUrl(null);
            return;
        }

        let pdfData = target.pdfUrl;

        // SE NÃO TIVER PDF LOCAL (FOI REMOVIDO PELA LIMPEZA) OU FOR MARCADOR 'TRUE'
        if (!pdfData || pdfData === 'TRUE') {
            setIsLoadingPdf(true);
            const table = viewingOM ? 'oms' : 'arts';
            const remotePdf = await StorageService.getRecordPdf(table, target.id);
            if (remotePdf) {
                pdfData = remotePdf;
            }
            setIsLoadingPdf(false);
        }

        if (pdfData && pdfData !== 'TRUE') {
            try {
                if (pdfData.startsWith('data:application/pdf;base64,')) {
                    const parts = pdfData.split(',');
                    if (parts.length > 1) {
                        const byteCharacters = atob(parts[1]);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                        const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
                        const url = URL.createObjectURL(blob);
                        activeUrl = url;
                        setPdfBlobUrl(url);
                    }
                } else setPdfBlobUrl(pdfData);
            } catch (e) { setPdfBlobUrl(pdfData); }
        } else {
            setPdfBlobUrl(null);
        }
    };

    loadPdf();

    return () => {
        if (activeUrl) {
            URL.revokeObjectURL(activeUrl);
        }
    };
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

  const refresh = () => {
      setUsers(StorageService.getUsers());
      setEmployees(StorageService.getEmployees());
      setOms(StorageService.getOMs());
      setArts(StorageService.getARTs());
      setScheduleItems(StorageService.getSchedule());
      setPendingDemands(StorageService.getPendingExtraDemands());
  };

  // --- LÓGICA DE EXTRAÇÃO DE PDF MELHORADA ---
  const extractDataFromPdf = async (file: File, isEditMode = false) => {
    setIsExtracting(true);

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument(arrayBuffer).promise;
        let foundOm = ''; let foundDesc = ''; let foundTag = '';
        
        const maxPages = Math.min(pdf.numPages, 3);
        let fullText = '';
        
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += ' ' + pageText;
        }
        
        const omRegex = /(?:OM|ORDEM|Nº|NUMERO)[:.\s]*(\d{8,12})/i;
        const omMatch = fullText.match(omRegex);
        if (omMatch) foundOm = omMatch[1];
        else { const fallbackOm = fullText.match(/(\d{12})/); if (fallbackOm) foundOm = fallbackOm[1]; }
        
        const descRegex = /(?:DESCRIÇÃO|TEXTO BREVE|DESCRIÇÃO OM)[:.\s]*(.*?)(?:OBSERVAÇÕES|NOTA|EQUIPAMENTO|LOCAL|PERMISSÕES|$)/i;
        const descMatch = fullText.match(descRegex);
        if (descMatch) foundDesc = descMatch[1].trim().replace(/_+/g, ' ').replace(/\bCA\d+\b/i, '').trim(); 
        
        const localInstRegex = /(?:LOCAL DE INSTALAÇÃO|LOCAL INST.)[\s\S]*?\b(CA\d+)\b/i;
        let tagMatch = fullText.match(localInstRegex);

        if (!tagMatch) {
            const descOmRegex = /(?:DESCRIÇÃO OM)[\s\S]*?\b(CA\d+)\b/i;
            tagMatch = fullText.match(descOmRegex);
        }

        if (!tagMatch) {
            const genericCaRegex = /\b(CA\d+)\b/i;
            tagMatch = fullText.match(genericCaRegex);
        }

        if (tagMatch && tagMatch[1]) {
            foundTag = tagMatch[1].toUpperCase();
        } else {
            const labeledTagRegex = /(?:TAG|EQUIPAMENTO|ITEM TÉCNICO)[:.\s]*([A-Z0-9-]{5,})/i;
            const genericTagRegex = /([A-Z]{3,4}-?[A-Z0-9]{2,}-?[A-Z0-9-]{3,})/i;
            const labeledMatch = fullText.match(labeledTagRegex);
            const genericMatch = fullText.match(genericTagRegex);
            if (labeledMatch) foundTag = labeledMatch[1];
            else if (genericMatch) foundTag = genericMatch[1];
        }

        if (isEditMode) {
            setEditingOmData(prev => ({ ...prev, omNumber: foundOm || prev.omNumber, tag: foundTag || prev.tag, description: foundDesc || prev.description }));
        } else {
            if (foundOm) setNewOmNumber(foundOm); 
            if (foundTag) setNewOmTag(foundTag); 
            if (foundDesc) setNewOmDesc(foundDesc);
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
            
            const codePatterns = [
                /(?:CÓDIGO DA ART|CODIGO DA ART|ART|PT|PERMISSÃO)[\s.Nnº°]*([0-9A-Z.-]{4,})/i, 
                /(?:DOC|DOCUMENTO)[:\s]*([0-9A-Z.-]+)/i
            ];
            for (const pattern of codePatterns) { const match = text.match(pattern); if (match) { foundCode = match[1]; break; } }
            
            const taskPatterns = [
                /(?:TAREFA A SER EXECUTADA)[:\s]*(.*?)(?:GERÊNCIA|GERENCIA|CÓDIGO|CODIGO|LOCAL|DATA|OMVE|$)/i,
                /(?:ATIVIDADE|TAREFA|DESCRIÇÃO|OBJETIVO)[:\s.]+(.*?)(?:LOCAL|ÁREA|EXECUTANTE|DATA|$)/i, 
                /(?:SERVIÇO A EXECUTAR)[:\s.]+(.*?)(?:$|\.)/i
            ];
            for (const pattern of taskPatterns) { 
                const match = text.match(pattern); 
                if (match) { 
                    foundTask = match[1].trim(); 
                    foundTask = foundTask.replace(/^[_.-]+/, '').trim(); 
                    break; 
                } 
            }
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
      setWeekNumber('');
      setScheduleText('');
      setDemandTag(''); setDemandActivities(['']);
  };
  
  const withFeedback = async (action: () => Promise<void>, processingMsg: string, successMsg: string | (() => string)) => {
      setProcessText(processingMsg);
      setIsProcessing(true);
      try {
          await new Promise(r => setTimeout(r, 800)); // Visual delay
          await action();
          setIsProcessing(false);
          const msg = typeof successMsg === 'function' ? successMsg() : successMsg;
          setSuccessText(msg);
          setIsSuccess(true);
          setTimeout(() => {
              setIsSuccess(false);
          }, 1500);
      } catch (e) {
          setIsProcessing(false);
          alert('Erro na operação.');
          console.error(e);
      }
  };

  const handleAddOM = () => {
    if(!newOmNumber || !newOmTag) { alert("Preencha Número e Tag"); return; }
    withFeedback(async () => {
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
        resetForms();
    }, "SALVANDO OM...", "OM CADASTRADA!");
  };

  const handleOpenEditOM = (om: OMRecord) => {
      setEditingOmData({ ...om });
      setIsEditOmModalOpen(true);
  };

  const handleSaveEditOM = () => {
      if (!editingOmData.id || !editingOmData.omNumber || !editingOmData.tag) return;
      withFeedback(async () => {
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
      }, "ATUALIZANDO...", "OM ATUALIZADA!");
  };

  const handleImportSchedule = () => {
      if (!scheduleText || !weekNumber) {
          alert('Preencha o Número da Semana e cole a tabela.');
          return;
      }
      
      let count = 0;

      withFeedback(async () => {
          await StorageService.archiveAndClearSchedule();

          const rows = scheduleText.split('\n');
          
          let lastFrotaOm = '';

          for (const row of rows) {
              if (!row.trim()) continue;
              if (row.toUpperCase().includes('FROTA') && row.toUpperCase().includes('DESCRIÇÃO')) continue; 

              const cols = row.split('\t');
              if (cols.length < 2) continue;
              
              let frotaOm = cols[0]?.trim().toUpperCase() || '';
              
              if (frotaOm) {
                  lastFrotaOm = frotaOm;
              } else if (lastFrotaOm) {
                  frotaOm = lastFrotaOm;
              } else {
                  frotaOm = 'N/D';
              }

              const description = cols[1]?.trim().toUpperCase() || 'MANUTENÇÃO PROGRAMADA';
              const dateMin = cols[2]?.trim() || '';
              const dateMax = cols[3]?.trim() || '';
              const priority = cols[4]?.trim() || 'NORMAL';
              const peopleCount = parseInt(cols[5]?.trim() || '1') || 1;
              const hours = parseFloat(cols[6]?.trim().replace(',','.') || '1') || 1;
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
              count++;
          }

          setScheduleText('');
          setWeekNumber('');
          
          setTimeout(() => {
              navigate('/schedule');
          }, 1500);

      }, "ATUALIZANDO AGENDA...", () => `IMPORTADOS ${count} ITENS! INDO PARA AGENDA...`);
  };

  const handleEditEmployee = (emp: Employee) => {
      setEditingId(emp.id);
      setEmpName(emp.name);
      setEmpMatricula(emp.matricula);
      setEmpFunction(emp.function);
  };

  const handleAddEmployee = () => {
      if(!empName || !empMatricula) return;
      withFeedback(async () => {
          const emp: Employee = { 
              id: editingId || crypto.randomUUID(), 
              name: empName.toUpperCase(), 
              matricula: empMatricula.toUpperCase(), 
              function: empFunction.toUpperCase(), 
              status: 'ACTIVE' 
          };
          await StorageService.saveEmployee(emp);
          resetForms();
      }, "SALVANDO COLABORADOR...", "DADOS SALVOS!");
  };

  const handleEditUser = (user: User) => {
      setEditingId(user.id);
      setUserName(user.name);
      setUserLogin(user.login);
      setUserPass(user.password || '');
      setUserRole(user.role);
  };

  const handleAddUser = () => {
      if(!userLogin || !userPass) return;
      withFeedback(async () => {
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
      }, "PROCESSANDO ACESSO...", "USUÁRIO SALVO!");
  };

  const handleAddART = () => {
      if(!artCode || !artTask || !artPdf) return;
      withFeedback(async () => {
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
      }, "CADASTRANDO MODELO...", "ART NA BIBLIOTECA!");
  };

  const handleAddDemandActivity = () => {
      setDemandActivities([...demandActivities, '']);
  };

  const handleRemoveDemandActivity = (index: number) => {
      const newActivities = demandActivities.filter((_, i) => i !== index);
      setDemandActivities(newActivities.length ? newActivities : ['']);
  };

  const handleDemandActivityChange = (index: number, value: string) => {
      const newActivities = [...demandActivities];
      newActivities[index] = value.toUpperCase();
      setDemandActivities(newActivities);
  };

  const handleSaveDemand = () => {
      if (!demandTag) { alert('Tag obrigatório'); return; }
      const validActivities = demandActivities.filter(a => a.trim() !== '');
      if (validActivities.length === 0) { alert('Adicione ao menos uma atividade'); return; }

      withFeedback(async () => {
          for (const activity of validActivities) {
              const demand: PendingExtraDemand = {
                  id: crypto.randomUUID(),
                  tag: demandTag.toUpperCase(),
                  description: activity, 
                  createdAt: new Date().toISOString(),
                  status: 'PENDENTE'
              };
              await StorageService.savePendingExtraDemand(demand);
          }
          resetForms();
          refresh(); 
      }, "SALVANDO DEMANDAS...", "DEMANDAS EXPORTADAS!");
  };

  const handleOpenEditDemand = (demand: PendingExtraDemand) => {
      setEditingDemandData({ ...demand });
      setIsEditDemandModalOpen(true);
  };

  const handleSaveEditDemand = () => {
      if (!editingDemandData.id || !editingDemandData.tag || !editingDemandData.description) return;
      withFeedback(async () => {
          const updatedDemand = {
              ...editingDemandData,
              tag: editingDemandData.tag.toUpperCase(),
              description: editingDemandData.description.toUpperCase(),
              status: 'PENDENTE'
          } as PendingExtraDemand;
          await StorageService.savePendingExtraDemand(updatedDemand);
          setIsEditDemandModalOpen(false);
          setEditingDemandData({});
          refresh();
      }, "ATUALIZANDO DEMANDA...", "DEMANDA ATUALIZADA!");
  };

  return (
    <div className="max-w-7xl mx-auto pb-10 px-4">
      {/* GLOBAL FEEDBACK MODAL */}
      <FeedbackModal 
        isOpen={isProcessing || isSuccess} 
        isSuccess={isSuccess} 
        loadingText={processText}
        successText={successText}
      />

      <header className="flex flex-col md:flex-row items-center justify-between py-4 mb-4 bg-white px-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
              <BackButton />
              <h2 className="text-lg font-bold uppercase text-gray-800 flex items-center gap-2">
                <Database size={18} className="text-[#007e7a]"/> Central de Dados
              </h2>
          </div>
      </header>
      
      <nav className="flex bg-white p-1 rounded-lg mb-6 shadow-sm border border-gray-200 gap-1 overflow-x-auto">
        {[
          {id: 'OMS', label: 'Cadastro OM', icon: <BrainCircuit size={14}/>},
          {id: 'PROCEDURES', label: 'Biblioteca ARTs', icon: <BookOpen size={14}/>}, 
          {id: 'SCHEDULE', label: 'Programação', icon: <Calendar size={14}/>},
          {id: 'DEMANDS_REGISTER', label: 'Cadastro Demandas', icon: <ClipboardList size={14}/>},
          {id: 'EMPLOYEES', label: 'Equipe', icon: <Users size={14}/>},
          {id: 'USERS', label: 'Acessos', icon: <Shield size={14}/>},
          {id: 'DB_LIVE', label: 'DB LIVE', icon: <Terminal size={14}/>}
        ].map((tab) => (
            <button key={tab.id} className={`flex-1 px-4 py-2 font-bold text-xs rounded transition-all flex items-center justify-center gap-2 uppercase whitespace-nowrap ${activeTab === tab.id ? 'bg-[#007e7a] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => { setActiveTab(tab.id as any); setSearchQuery(''); resetForms(); }}> 
              {tab.icon} {tab.label} 
            </button>
        ))}
      </nav>

      {/* ... GRID ... */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
                  {/* ... Conteúdo das Abas ... */}
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
                            <input value={newOmNumber} onChange={e => setNewOmNumber(e.target.value)} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase focus:border-[#007e7a] outline-none" placeholder="NÚMERO" />
                            {newOmNumber && !isExtracting && newOmPdf && <Sparkles size={12} className="absolute right-2 top-2.5 text-yellow-500 animate-pulse" />}
                        </div>
                        <input value={newOmTag} onChange={e => setNewOmTag(e.target.value.toUpperCase().replace(/^([0-9])/, 'CA$1'))} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase text-[#007e7a] focus:border-[#007e7a] outline-none" placeholder="TAG" />
                        <select value={newOmType} onChange={e => setNewOmType(e.target.value as any)} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-xs font-bold uppercase focus:border-[#007e7a] outline-none">
                            <option value="PREVENTIVA">PREVENTIVA</option>
                            <option value="CORRETIVA">CORRETIVA</option>
                            <option value="DEMANDA">DEMANDA</option>
                        </select>
                        <textarea value={newOmDesc} onChange={e => setNewOmDesc(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-xs font-bold h-20 resize-none focus:border-[#007e7a] outline-none" placeholder="DESCRIÇÃO DA ATIVIDADE..." />
                        <button onClick={handleAddOM} disabled={isExtracting} className="w-full bg-[#007e7a] text-white py-3 rounded font-bold text-xs uppercase hover:bg-[#00605d] flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"><Save size={14}/> Salvar na Biblioteca</button>
                    </div>
                  )}
                  {activeTab === 'DEMANDS_REGISTER' && (
                      <div className="space-y-4 animate-fadeIn">
                          <h3 className="font-bold text-gray-700 uppercase text-xs border-b pb-2">Cadastrar Nova Demanda</h3>
                          <input value={demandTag} onChange={e => setDemandTag(e.target.value.toUpperCase().replace(/^([0-9])/, 'CA$1'))} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase focus:border-orange-500 outline-none" placeholder="TAG EQUIPAMENTO" />
                          <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Lista de Atividades (Cada Item = 1 Card)</label>
                              {demandActivities.map((act, idx) => (
                                  <div key={idx} className="flex gap-1">
                                      <input value={act} onChange={(e) => handleDemandActivityChange(idx, e.target.value)} className="flex-1 bg-gray-50 border border-gray-300 p-2 rounded text-xs font-bold uppercase focus:border-orange-500 outline-none" placeholder={`ITEM ${idx + 1}`}/>
                                      <button onClick={() => handleRemoveDemandActivity(idx)} className="text-gray-400 hover:text-red-500 p-2"><X size={14}/></button>
                                  </div>
                              ))}
                              <button onClick={handleAddDemandActivity} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded text-[10px] font-bold uppercase flex items-center justify-center gap-1"><Plus size={12}/> Adicionar Item</button>
                          </div>
                          <button onClick={handleSaveDemand} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg"><Save size={14}/> Exportar para Demandas</button>
                      </div>
                  )}
                  {activeTab === 'SCHEDULE' && (
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <h3 className="font-bold text-gray-700 uppercase text-xs border-b pb-2">Importação em Massa (Excel)</h3>
                            <input value={weekNumber} onChange={e => setWeekNumber(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase focus:border-blue-500 outline-none" placeholder="NÚMERO DA SEMANA" />
                            <div className="bg-blue-50 p-2 rounded text-[9px] text-blue-800">
                                <strong>COLE AS COLUNAS DO EXCEL (14 COLUNAS):</strong><br/>
                                FROTA/OM | DESC | D.MIN | D.MAX | PRIOR | PESSOAS | H | D.INI (REF) | D.FIM | CENTRO | H.INI | H.FIM | REC | REC2
                            </div>
                            <textarea value={scheduleText} onChange={e => setScheduleText(e.target.value)} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-xs font-mono h-64 resize-none" placeholder="Cole aqui os dados copiados do Excel..." />
                            <button onClick={handleImportSchedule} className="w-full bg-green-600 text-white py-3 rounded font-bold text-xs uppercase hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg"><Cloud size={14}/> Importar Programação</button>
                        </div>
                    </div>
                  )}
                  {activeTab === 'PROCEDURES' && (
                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-700 uppercase text-xs border-b pb-2">Novo Modelo de ART (Padrão)</h3>
                        <div className="border border-dashed border-blue-300 bg-blue-50/50 rounded p-4 text-center cursor-pointer relative hover:bg-blue-50 transition-colors">
                            <input type="file" accept=".pdf" onChange={(e) => handlePdfUpload(e, 'ART')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            {isExtracting ? <span className="text-[10px] font-bold text-blue-600">ANALISANDO ARQUIVO...</span> : <span className="text-[10px] font-bold text-blue-500 uppercase">Upload PDF ART</span>}
                        </div>
                        <input value={artCode} onChange={e => setArtCode(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase focus:border-blue-500 outline-none" placeholder="CÓDIGO" />
                        <input value={artTask} onChange={e => setArtTask(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase focus:border-blue-500 outline-none" placeholder="TAREFA PADRÃO" />
                        <button onClick={handleAddART} disabled={isExtracting} className="w-full bg-blue-600 text-white py-3 rounded font-bold text-xs uppercase hover:bg-blue-700 flex items-center justify-center gap-2"><Save size={14}/> Cadastrar Modelo</button>
                    </div>
                  )}
                  {activeTab === 'EMPLOYEES' && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b pb-2"><h3 className="font-bold text-gray-700 uppercase text-xs">{editingId ? 'Editando Colaborador' : 'Novo Colaborador'}</h3></div>
                        <input value={empName} onChange={e => setEmpName(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase" placeholder="NOME" />
                        <input value={empMatricula} onChange={e => setEmpMatricula(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase" placeholder="MATRÍCULA" />
                        <input value={empFunction} onChange={e => setEmpFunction(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase" placeholder="FUNÇÃO" />
                        {editingId ? (<div className="flex gap-2"><button onClick={resetForms} className="flex-1 bg-gray-200 text-gray-600 py-3 rounded font-bold text-xs uppercase">Cancelar</button><button onClick={handleAddEmployee} className="flex-1 bg-orange-500 text-white py-3 rounded font-bold text-xs uppercase">Atualizar</button></div>) : (<button onClick={handleAddEmployee} className="w-full bg-orange-500 text-white py-3 rounded font-bold text-xs uppercase">Salvar</button>)}
                    </div>
                  )}
                  {activeTab === 'USERS' && (
                    <div className="space-y-3">
                         <div className="flex justify-between items-center border-b pb-2"><h3 className="font-bold text-gray-700 uppercase text-xs">{editingId ? 'Editando Usuário' : 'Novo Usuário'}</h3></div>
                        <input value={userName} onChange={e => setUserName(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase" placeholder="NOME EXIBIÇÃO" />
                        <input value={userLogin} onChange={e => setUserLogin(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase" placeholder="LOGIN / MATRÍCULA" />
                        <input type="text" value={userPass} onChange={e => setUserPass(e.target.value)} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm font-bold uppercase" placeholder="SENHA" />
                        <select value={userRole} onChange={e => setUserRole(e.target.value as any)} className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-xs font-bold uppercase">
                            <option value="OPERADOR">Operador</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                        {editingId ? (<div className="flex gap-2"><button onClick={resetForms} className="flex-1 bg-gray-200 text-gray-600 py-3 rounded font-bold text-xs uppercase">Cancelar</button><button onClick={handleAddUser} className="flex-1 bg-purple-600 text-white py-3 rounded font-bold text-xs uppercase">Atualizar</button></div>) : (<button onClick={handleAddUser} className="w-full bg-purple-600 text-white py-3 rounded font-bold text-xs uppercase">Criar Acesso</button>)}
                    </div>
                  )}
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
                              <select value={liveTable} onChange={(e) => setLiveTable(e.target.value)} className="w-full p-2 rounded border border-gray-300 uppercase font-bold">
                                  <option value="notifications">Notifications (Alertas)</option>
                                  <option value="active_maintenance">Active Maintenance (Atividades)</option>
                                  <option value="schedule">Schedule (Programação)</option>
                                  <option value="oms">OMS (Ordens)</option>
                                  <option value="pending_extra_demands">Pending Demands (Demandas)</option>
                                  <option value="users">Users</option>
                                  <option value="employees">Employees</option>
                                  <option value="history">History</option>
                                  <option value="documents">Documents</option>
                                  <option value="chat_messages">Chat</option>
                                  <option value="availability">Disponibilidade</option>
                              </select>
                          </div>
                          
                          <button onClick={fetchLiveData} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded font-bold text-xs uppercase flex items-center justify-center gap-2"><RefreshCw size={14} className={isLoadingLive ? 'animate-spin' : ''}/> Atualizar Tabela</button>
                          <button onClick={() => setShowSqlModal(true)} className="w-full bg-gray-800 hover:bg-black text-white py-3 rounded font-bold text-xs uppercase flex items-center justify-center gap-2 mt-2"><Terminal size={14}/> OBTER SQL (SETUP)</button>
                      </div>
                  )}
              </div>
          </div>

          <div className="lg:col-span-8">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
                  {activeTab === 'SCHEDULE' ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-10 animate-fadeIn">
                          <UploadCloud size={64} className="mb-4 opacity-20 text-blue-500"/>
                          <p className="font-black text-sm uppercase tracking-widest text-gray-500">Área de Importação</p>
                          <p className="text-[10px] font-bold mt-2 max-w-sm text-center">
                              Utilize o formulário à esquerda para colar e processar a tabela de programação.
                              <br/>Esta visualização é exclusiva para inserção de dados em massa.
                          </p>
                      </div>
                  ) : (
                      <>
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h4 className="text-sm font-bold text-gray-700 uppercase">
                                {activeTab === 'OMS' ? 'Biblioteca de OMs' : activeTab === 'PROCEDURES' ? 'CADASTRO DE MODELOS (BIBLIOTECA)' : activeTab === 'DEMANDS_REGISTER' ? 'Demandas Pendentes' : 'Registros Cadastrados'}
                            </h4>
                            <div className="relative w-64">
                                <input type="text" placeholder="FILTRAR..." value={searchQuery} onChange={e => setSearchQuery(e.target.value.toUpperCase())} className="w-full pl-3 pr-3 py-2 bg-white border border-gray-300 rounded text-xs font-bold uppercase outline-none focus:border-[#007e7a]" />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse hidden lg:table">
                                <thead className="bg-gray-100 sticky top-0 z-10 border-b border-gray-200">
                                    <tr>
                                        {activeTab === 'PROCEDURES' ? (
                                            <>
                                                <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">CÓDIGO (MODELO)</th>
                                                <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">TAREFA PADRÃO</th>
                                                <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">ANEXO</th>
                                                <th className="p-3 text-[10px] font-bold text-gray-500 uppercase text-right">AÇÕES</th>
                                            </>
                                        ) : activeTab === 'DEMANDS_REGISTER' ? (
                                            <>
                                                <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">TAG</th>
                                                <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">ATIVIDADE PENDENTE</th>
                                                <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">DATA REGISTRO</th>
                                                <th className="p-3 text-[10px] font-bold text-gray-500 uppercase text-right">AÇÕES</th>
                                            </>
                                        ) : activeTab === 'DB_LIVE' ? (
                                            isLoadingLive || liveData.length === 0 ? <th></th> : Object.keys(liveData[0]).map(key => <th key={key} className="p-2 text-[9px] font-black text-gray-600 uppercase border border-gray-300">{key}</th>)
                                        ) : (
                                            <>
                                                <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">Chave</th>
                                                <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">Detalhes</th>
                                                <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">Info Adicional</th>
                                                <th className="p-3 text-[10px] font-bold text-gray-500 uppercase text-right">Ações</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeTab === 'OMS' && oms.filter(om => om.omNumber.includes(searchQuery) || om.tag.includes(searchQuery)).map(om => (
                                        <tr key={om.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="p-3"><div className="font-bold text-sm text-gray-800">{om.omNumber}</div><div className={`text-[9px] font-bold px-1.5 py-0.5 rounded inline-block mt-1 ${om.type === 'CORRETIVA' ? 'bg-red-50 text-red-600' : om.type === 'DEMANDA' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>{om.type}</div></td>
                                            <td className="p-3"><div className="font-bold text-xs text-[#007e7a]">{om.tag}</div><div className="text-[10px] text-gray-500 truncate max-w-[200px]">{om.description}</div></td>
                                            <td className="p-3 text-[10px] font-bold text-gray-500">{new Date(om.createdAt).toLocaleDateString('pt-BR')} <span className="text-gray-300">|</span> {new Date(om.createdAt).toLocaleTimeString('pt-BR').slice(0,5)}</td>
                                            <td className="p-3 text-right"><div className="flex justify-end gap-2">{om.pdfUrl && <button onClick={() => setViewingOM(om)} className="p-1.5 text-[#007e7a] hover:bg-teal-50 rounded" title="Ver PDF"><Eye size={14}/></button>}<button onClick={() => handleOpenEditOM(om)} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded" title="Editar"><Edit2 size={14}/></button><button onClick={() => { if(window.confirm('Excluir esta OM?')) StorageService.deleteOM(om.id).then(refresh) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button></div></td>
                                        </tr>
                                    ))}
                                    {activeTab === 'DEMANDS_REGISTER' && pendingDemands.filter(d => d.tag.includes(searchQuery) || d.description.includes(searchQuery)).map(demand => (
                                        <tr key={demand.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="p-3 font-black text-xs text-orange-600">{demand.tag}</td>
                                            <td className="p-3 font-bold text-xs text-gray-600 uppercase truncate max-w-[300px]">{demand.description}</td>
                                            <td className="p-3 text-[10px] font-bold text-gray-400">{new Date(demand.createdAt).toLocaleDateString()}</td>
                                            <td className="p-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => handleOpenEditDemand(demand)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="Editar"><Edit2 size={14}/></button><button onClick={() => { if(window.confirm('Excluir esta demanda?')) StorageService.deletePendingExtraDemand(demand.id).then(refresh) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button></div></td>
                                        </tr>
                                    ))}
                                    {activeTab === 'PROCEDURES' && arts.filter(a => a.code.includes(searchQuery)).map(art => (
                                        <tr key={art.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="p-3 font-black text-xs text-blue-600">{art.code}</td>
                                            <td className="p-3 font-bold text-xs text-gray-700">{art.taskName}</td>
                                            <td className="p-3 text-xs text-gray-500">{art.pdfUrl ? (<span className="flex items-center gap-1 text-[9px] font-black bg-green-50 text-green-600 px-2 py-0.5 rounded border border-green-100 w-fit"><CheckCircle2 size={10}/> PDF OK</span>) : <span className="text-[9px] text-gray-400">PENDENTE</span>}</td>
                                            <td className="p-3 text-right"><div className="flex justify-end gap-2">{art.pdfUrl && (<button onClick={() => setViewingART(art)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Ver Modelo Original"><Eye size={14}/></button>)}<button onClick={() => { if(window.confirm('Excluir ART?')) StorageService.deleteART(art.id).then(refresh) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button></div></td>
                                        </tr>
                                    ))}
                                    {activeTab === 'DB_LIVE' && (isLoadingLive ? (<tr><td colSpan={10} className="p-10 text-center"><Loader2 className="animate-spin text-indigo-500"/></td></tr>) : liveData.length === 0 ? (<tr><td colSpan={10} className="p-10 text-center text-gray-400 font-bold">TABELA VAZIA</td></tr>) : liveData.map((row, idx) => (<tr key={idx} className="hover:bg-indigo-50 animate-fadeIn font-mono text-[10px]"><td colSpan={Object.keys(row).length}>{Object.values(row).map((val: any, vIdx) => (<td key={vIdx} className="p-2 border border-gray-200 truncate max-w-[200px]">{typeof val === 'object' ? JSON.stringify(val).slice(0, 30) + '...' : String(val)}</td>))}</td></tr>)))}
                                </tbody>
                            </table>
                        </div>
                      </>
                  )}
              </div>
          </div>
      </div>

      {showSqlModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] h-[95vh] flex flex-col overflow-hidden border-t-8 border-indigo-600">
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
    </div>
  );
};
