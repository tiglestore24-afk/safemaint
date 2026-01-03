
export type MaintenanceType = 'MECANICA' | 'ELETRICA' | 'LUBRIFICACAO' | 'SOLDA' | 'OUTROS';

export interface Employee {
  id: string;
  name: string;
  matricula: string;
  function: string;
  status?: 'ACTIVE' | 'TRASH';
}

export interface User {
  id: string;
  name: string;
  matricula: string;
  login: string;
  password?: string;
  role: 'ADMIN' | 'OPERADOR';
}

export interface ARTStep {
  item: number;
  step: string;
  riskLevel: string;
}

export interface ARTRiskItem {
  situation: string;
  total: number;
  riskLevel: string;
}

export interface RegisteredART {
  id: string;
  code: string;
  company: string;
  taskName: string;
  area: string;
  controlMeasures: string;
  pdfUrl?: string; // Para visualização em PDF
  risks?: ARTRiskItem[];
  steps?: ARTStep[];
}

export interface HeaderData {
  om: string;
  tag: string;
  date: string;
  time: string;
  type: MaintenanceType;
  description: string;
}

export interface SignatureRecord {
    id: string;
    name: string;
    matricula: string;
    function: string;
    role: string;
    signatureData: string;
    date: string;
}

export interface DocumentRecord {
  id: string;
  type: 'ART_EMERGENCIAL' | 'ART_ATIVIDADE' | 'CHECKLIST' | 'RELATORIO';
  header: HeaderData;
  createdAt: string;
  status: 'ATIVO' | 'LIXEIRA' | 'RASCUNHO' | 'ARQUIVADO';
  content: any;
  signatures: SignatureRecord[];
}

export interface ScheduleItem {
  id: string;
  frotaOm: string;
  description: string;
  resources: string;
  resources2: string;
  dateMin: string;
  dateMax: string;
  priority: string;
  peopleCount: number;
  hours: number;
  dateStart: string;
  dateEnd: string;
  workCenter: string;
  timeStart: string;
  timeEnd: string;
  status: string;
  weekNumber?: string; // Adicionado para controle de semanas
}

export interface ActiveMaintenance {
  id: string;
  omId?: string;
  header: HeaderData;
  startTime: string;
  artId: string;
  artType: 'ART_EMERGENCIAL' | 'ART_ATIVIDADE';
  origin: 'PREVENTIVA' | 'CORRETIVA' | 'DEMANDA_EXTRA';
  status?: 'ANDAMENTO' | 'PAUSADA' | 'AGUARDANDO';
  currentSessionStart?: string;
  accumulatedTime?: number;
  openedBy?: string;
}

export interface MaintenanceLog {
  id: string;
  om: string;
  tag: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: string;
  responsible: string;
  status: string;
  type?: 'PREVENTIVA' | 'CORRETIVA' | 'DEMANDA_EXTRA'; // Adicionado para automação do quadro
}

export interface ChatMessage {
  id: string;
  sender: string;
  role: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface OMRecord {
  id: string;
  omNumber: string;
  description: string;
  tag: string;
  type: 'CORRETIVA' | 'PREVENTIVA' | 'DEMANDA';
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA';
  createdAt: string;
  pdfUrl?: string;
  createdBy: string;
  installationLocation?: string;
  linkedScheduleOm?: string; // Novo campo para vínculo com programação
}

export interface ChecklistTemplateItem {
  id: string;
  legacyId: number;
  section: string;
  description: string;
}

export interface PendingExtraDemand {
    id: string;
    tag: string;
    description: string;
    createdAt: string;
    status: 'PENDENTE';
}

// Novos status baseados na foto do quadro branco
export type AvailabilityStatus = 
  | 'SEM_FALHA' 
  | 'CORRETIVA' 
  | 'PREV' 
  | 'META' 
  | 'DEMANDA_EXTRA' 
  | 'LS' 
  | 'PR' 
  | 'PNEUS' 
  | 'INSPECAO' 
  | 'EMPTY';

export interface AvailabilityRecord {
  id: string;
  tag: string;
  statusMap: Record<string, AvailabilityStatus[]>; 
}
