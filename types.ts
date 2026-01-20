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

export interface ChatMessage {
  id: string;
  sender: string;
  role: string;
  text: string;
  timestamp: string;
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
  pdfUrl?: string;
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
  type: 'ART_EMERGENCIAL' | 'ART_ATIVIDADE' | 'CHECKLIST' | 'RELATORIO' | 'CRONOGRAMA';
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
  weekNumber?: string;
}

export interface ActiveMaintenance {
  id: string;
  omId?: string;
  scheduleId?: string;
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
  type?: 'PREVENTIVA' | 'CORRETIVA' | 'DEMANDA_EXTRA';
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
  linkedScheduleOm?: string;
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

export interface NotificationRecord {
    id: string;
    type: 'URGENT' | 'INFO' | 'SCHEDULE' | 'ACTIVE' | 'SYSTEM';
    title: string;
    message: string;
    date: string;
    createdAt: string;
    read: boolean;
    link?: string;
}

export type AvailabilityStatus = 
  | 'SEM_FALHA'      // Bolinha Verde
  | 'PREV'           // Triangulo Preto
  | 'CORRETIVA'      // Bolinha Vermelha
  | 'DEMANDA_EXTRA'  // Triangulo Vermelho
  | 'INSPECAO'       // Bolinha/Texto
  | 'PR'             // Texto PR (Parada Relevante)
  | 'MOTOR'          // Texto
  | 'LB'             // Texto LS (Lub Semanal)
  | 'PNEUS'          // Texto
  | 'META';          // Estrela

export interface AvailabilityRecord {
    id: string;
    tag: string;
    // Mapeia data "DD/MM/YYYY" para lista de status
    statusMap: Record<string, AvailabilityStatus[]>; 
    // Contagem de eventos por dia (ex: 2 corretivas no dia 5)
    statusCounts?: Record<string, Record<string, number>>;
    manualOverrides?: Record<string, boolean>; // Se true, não sobrescreve com dados do sistema
}