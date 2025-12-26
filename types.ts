
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
  code: string; // Código da ART (ex: 33777)
  company: string;
  taskName: string; // Tarefa a ser executada
  area: string; // Gerência
  omve?: string; 
  emissionDate?: string;
  pdfUrl?: string; // Original PDF URL
  
  // PDF Content Structures
  risks: ARTRiskItem[];
  controlMeasures: string; // Texto corrido ou HTML das medidas
  steps: ARTStep[]; // Passo a passo da tarefa
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
}

export interface ActiveMaintenance {
  id: string;
  omId?: string; // Link para a OM no banco de dados
  header: HeaderData;
  startTime: string;
  artId: string;
  artType: 'ART_EMERGENCIAL' | 'ART_ATIVIDADE';
  origin: 'PREVENTIVA' | 'CORRETIVA';
  status?: 'ANDAMENTO' | 'PAUSADA';
  currentSessionStart?: string;
  accumulatedTime?: number;
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
  type: 'CORRETIVA' | 'PREVENTIVA';
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA';
  createdAt: string;
  pdfUrl?: string; // Simulação do arquivo
  createdBy: string;
  linkedScheduleId?: string; // ID do item da programação vinculado
}
