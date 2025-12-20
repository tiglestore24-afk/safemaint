import { DocumentRecord, Employee, RegisteredART, User, ScheduleItem, ActiveMaintenance, MaintenanceLog, ChatMessage, OMRecord } from '../types';
import { supabase } from './supabase';

const KEYS = {
  DOCS: 'safemaint_docs',
  EMPLOYEES: 'safemaint_employees',
  ARTS: 'safemaint_arts',
  SCHEDULE: 'safemaint_schedule',
  ACTIVE: 'safemaint_active_tasks',
  HISTORY: 'safemaint_history',
  CHAT: 'safemaint_chat_history',
  OMS: 'safemaint_oms'
};

// Safe BroadcastChannel initialization to prevent "Illegal constructor" in SSR/Build environments
let chatChannel: any = null;
try {
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
        chatChannel = new BroadcastChannel('safemaint_global_chat');
        chatChannel.onmessage = (event: MessageEvent) => {
            if (event.data.type === 'NEW_MESSAGE') {
                triggerChatUpdate();
            }
        };
    }
} catch (e) {
    console.warn('BroadcastChannel initialization failed or not supported');
}

// Safe Event creation for environments where "new Event()" might fail
const createSafeEvent = (name: string) => {
    try {
        return new Event(name);
    } catch (e) {
        if (typeof document !== 'undefined') {
            const ev = document.createEvent('Event');
            ev.initEvent(name, true, true);
            return ev;
        }
        return { type: name } as Event;
    }
};

const triggerUpdate = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(createSafeEvent('safemaint_storage_update'));
    }
};

const triggerChatUpdate = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(createSafeEvent('safemaint_chat_update'));
    }
};

const seedEmployees: Employee[] = [];

// ARTs DO PDF (SEED DATA)
const seedARTs: RegisteredART[] = [
    {
        id: 'art-155574',
        code: '155574',
        company: 'Vale',
        taskName: 'REALIZAR DIAGNÓSTICO DE FALHA EM MOTOR DIESEL EM CAMINHÕES DE GRANDE PORTE',
        area: 'GER MANUT EQUIP TRANSPORTE',
        omve: 'Não',
        emissionDate: '31/10/2025',
        risks: [
            { situation: 'BATIDA CONTRA - ESTRUTURA E EQUIPAMENTOS', total: 7, riskLevel: 'MÉDIA' },
            { situation: 'CONTATOS COM SUPERFÍCIES CORTANTES', total: 6, riskLevel: 'MÉDIA' },
            { situation: 'ATINGIDO POR PROJEÇÃO DE MATERIAIS', total: 5, riskLevel: 'MÉDIA' },
            { situation: 'PRENSAMENTO DO CORPO', total: 5, riskLevel: 'MÉDIA' },
            { situation: 'ATINGIDO POR QUEDA DE PEÇAS', total: 4, riskLevel: 'MÉDIA' },
            { situation: 'QUEDA/ESCORREGÃO/TROPEÇO', total: 4, riskLevel: 'MÉDIA' }
        ],
        controlMeasures: `MÉDIA: Utilizar EPI's (capacete com jugular, óculos, botina, luva). Evitar ficar no raio de ação. Manter local organizado. Utilizar método FALAAD. Seguir recomendações de alerta atmosférico. Inspecionar local quanto a arestas. Não improvisar acessos. Utilizar 3 pontos de apoio.`,
        steps: [
            { item: 1, step: 'Utilizar notebook para download e avaliação de falhas', riskLevel: 'MÉDIA' },
            { item: 2, step: 'Realizar bloqueio parcial da fonte de energia', riskLevel: 'MÉDIA' },
            { item: 3, step: 'Inspecionar componentes do motor diesel (turbinas, tubulações)', riskLevel: 'MÉDIA' },
            { item: 4, step: 'Realizar bloqueio da fonte de energia / Chave geral', riskLevel: 'MÉDIA' },
            { item: 5, step: 'Realizar substituição dos componentes em falha', riskLevel: 'MÉDIA' },
            { item: 6, step: 'Realizar desbloqueio do equipamento', riskLevel: 'MÉDIA' },
            { item: 7, step: 'Realizar testes finais', riskLevel: 'MÉDIA' }
        ]
    }
];

export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: 'URGENT' | 'WARNING' | 'INFO';
    date: string;
}

const pushToSupabase = async (table: string, data: any) => {
    try {
        const { error } = await supabase.from(table).upsert(data);
        if (error) console.warn(`Supabase Sync Error [${table}]:`, error.message);
    } catch (e) {
        console.warn('Supabase offline or config error');
    }
};

const deleteFromSupabase = async (table: string, id: string) => {
    try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) console.warn(`Supabase Delete Error [${table}]:`, error.message);
    } catch (e) {
        console.warn('Supabase offline or config error');
    }
};

export const StorageService = {
  initialSync: async () => {
      const tables = [
          { name: 'documents', key: KEYS.DOCS },
          { name: 'employees', key: KEYS.EMPLOYEES },
          { name: 'oms', key: KEYS.OMS },
          { name: 'arts', key: KEYS.ARTS },
          { name: 'schedule', key: KEYS.SCHEDULE },
          { name: 'active_maintenance', key: KEYS.ACTIVE },
          { name: 'history', key: KEYS.HISTORY },
          { name: 'chat', key: KEYS.CHAT }
      ];

      for (const t of tables) {
          try {
              const { data, error } = await supabase.from(t.name).select('*');
              if (!error && data && data.length > 0) {
                  const localData = JSON.parse(localStorage.getItem(t.key) || '[]');
                  const serverIds = new Set(data.map((d: any) => d.id));
                  const merged = [...data, ...localData.filter((l: any) => !serverIds.has(l.id))];
                  localStorage.setItem(t.key, JSON.stringify(merged));
              }
          } catch (e) {
              console.log(`Sync skipped for ${t.name}`);
          }
      }
      triggerUpdate();
      triggerChatUpdate();
  },

  validateUser: async (login: string, pass: string): Promise<User | null> => {
      try {
          const { data, error } = await supabase.from('users').select('*').eq('login', login).eq('password', pass).single();
          if (error || !data) {
              if (login === 'ADMIN' && pass === '123') {
                  return { id: 'admin', name: 'ADMINISTRADOR', matricula: '0000', login: 'ADMIN', password: '123', role: 'ADMIN' };
              }
              return null;
          }
          return data as User;
      } catch (e) {
          return null;
      }
  },

  getUsers: async (): Promise<User[]> => {
      const { data } = await supabase.from('users').select('*');
      return data || [];
  },
  
  addUser: async (user: User) => {
      const { error } = await supabase.from('users').insert(user);
      return !error;
  },

  updateUser: async (user: User) => {
      const { error } = await supabase.from('users').update(user).eq('id', user.id);
      return !error;
  },

  deleteUser: async (id: string) => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      return !error;
  },

  getChatMessages: (): ChatMessage[] => {
      const data = localStorage.getItem(KEYS.CHAT);
      return data ? JSON.parse(data) : [];
  },

  sendChatMessage: (msg: ChatMessage) => {
      const messages = StorageService.getChatMessages();
      messages.push(msg);
      if(messages.length > 100) messages.shift();
      localStorage.setItem(KEYS.CHAT, JSON.stringify(messages));
      triggerChatUpdate();
      if (chatChannel) chatChannel.postMessage({ type: 'NEW_MESSAGE', payload: msg });
      pushToSupabase('chat', msg); 
  },
  
  clearChat: () => {
      localStorage.setItem(KEYS.CHAT, '[]');
      triggerChatUpdate();
      if (chatChannel) chatChannel.postMessage({ type: 'NEW_MESSAGE' });
  },

  getOMs: (): OMRecord[] => {
      const data = localStorage.getItem(KEYS.OMS);
      return data ? JSON.parse(data) : [];
  },

  saveOM: (om: OMRecord) => {
      const oms = StorageService.getOMs();
      const index = oms.findIndex(o => o.id === om.id);
      if(index >= 0) oms[index] = om;
      else oms.push(om);
      localStorage.setItem(KEYS.OMS, JSON.stringify(oms));
      triggerUpdate();
      pushToSupabase('oms', om);
  },

  deleteOM: (id: string) => {
      const oms = StorageService.getOMs();
      const filtered = oms.filter(o => o.id !== id);
      localStorage.setItem(KEYS.OMS, JSON.stringify(filtered));
      triggerUpdate();
      deleteFromSupabase('oms', id);
  },

  getDocuments: (): DocumentRecord[] => {
      const data = localStorage.getItem(KEYS.DOCS);
      return data ? JSON.parse(data) : [];
  },

  saveDocument: (doc: DocumentRecord) => {
    const docs = StorageService.getDocuments();
    const existingIndex = docs.findIndex(d => d.id === doc.id);
    if (existingIndex >= 0) docs[existingIndex] = doc;
    else docs.push(doc);
    localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
    triggerUpdate();
    pushToSupabase('documents', doc);
  },
  
  moveToTrash: (id: string) => {
    const docs = StorageService.getDocuments();
    const updatedDocs = docs.map(d => d.id === id ? { ...d, status: 'LIXEIRA' as const } : d);
    localStorage.setItem(KEYS.DOCS, JSON.stringify(updatedDocs));
    triggerUpdate();
  },

  moveManyToTrash: (ids: string[]) => {
    const docs = StorageService.getDocuments();
    const updatedDocs = docs.map(d => ids.includes(d.id) ? { ...d, status: 'LIXEIRA' as const } : d);
    localStorage.setItem(KEYS.DOCS, JSON.stringify(updatedDocs));
    triggerUpdate();
  },

  restoreFromTrash: (id: string) => {
    const docs = StorageService.getDocuments();
    const updatedDocs = docs.map(d => d.id === id ? { ...d, status: 'ATIVO' as const } : d);
    localStorage.setItem(KEYS.DOCS, JSON.stringify(updatedDocs));
    triggerUpdate();
  },

  deletePermanently: (id: string) => {
    const docs = StorageService.getDocuments().filter(d => d.id !== id);
    localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
    triggerUpdate();
    deleteFromSupabase('documents', id);
  },

  emptyTrash: () => {
    const docs = StorageService.getDocuments().filter(d => d.status !== 'LIXEIRA');
    localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
    triggerUpdate();
  },

  runRetentionPolicy: () => {
    const docs = StorageService.getDocuments();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    let changed = false;
    const updated = docs.map(doc => {
        if (doc.status === 'ATIVO' && new Date(doc.createdAt) < thirtyDaysAgo) {
            changed = true;
            return { ...doc, status: 'ARQUIVADO' as const };
        }
        return doc;
    });
    if (changed) {
        localStorage.setItem(KEYS.DOCS, JSON.stringify(updated));
        triggerUpdate();
    }
  },

  getEmployees: (): Employee[] => {
    const data = localStorage.getItem(KEYS.EMPLOYEES);
    return data ? JSON.parse(data) : seedEmployees;
  },
  
  addEmployee: (emp: Employee) => {
    const list = StorageService.getEmployees();
    list.push(emp);
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
    triggerUpdate();
    pushToSupabase('employees', emp);
  },

  updateEmployee: (emp: Employee) => {
    const list = StorageService.getEmployees();
    const index = list.findIndex(e => e.id === emp.id);
    if (index >= 0) {
        list[index] = emp;
        localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
        triggerUpdate();
        pushToSupabase('employees', emp);
    }
  },

  deleteEmployee: (id: string) => {
    const list = StorageService.getEmployees().map(e => e.id === id ? { ...e, status: 'TRASH' as const } : e);
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
    triggerUpdate();
  },

  restoreEmployee: (id: string) => {
    const list = StorageService.getEmployees().map(e => e.id === id ? { ...e, status: 'ACTIVE' as const } : e);
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
    triggerUpdate();
  },

  deleteEmployeePermanently: (id: string) => {
    const list = StorageService.getEmployees().filter(e => e.id !== id);
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
    triggerUpdate();
    deleteFromSupabase('employees', id);
  },

  getARTs: (): RegisteredART[] => {
    const data = localStorage.getItem(KEYS.ARTS);
    return data ? JSON.parse(data) : seedARTs;
  },

  addART: (art: RegisteredART) => {
    const list = StorageService.getARTs();
    list.push(art);
    localStorage.setItem(KEYS.ARTS, JSON.stringify(list));
    triggerUpdate();
    pushToSupabase('arts', art);
  },

  deleteART: (id: string) => {
    const list = StorageService.getARTs().filter(a => a.id !== id);
    localStorage.setItem(KEYS.ARTS, JSON.stringify(list));
    triggerUpdate();
    deleteFromSupabase('arts', id);
  },

  getSchedule: (): ScheduleItem[] => {
    const data = localStorage.getItem(KEYS.SCHEDULE);
    return data ? JSON.parse(data) : [];
  },

  updateSchedule: (items: ScheduleItem[]) => {
    localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(items));
    triggerUpdate();
    items.forEach(item => pushToSupabase('schedule', item));
  },

  deleteScheduleItem: (id: string) => {
    const items = StorageService.getSchedule().filter(i => i.id !== id);
    localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(items));
    triggerUpdate();
    deleteFromSupabase('schedule', id);
  },

  archiveAndClearSchedule: (): boolean => {
    const items = StorageService.getSchedule();
    if (items.length === 0) return false;
    const docs = StorageService.getDocuments();
    items.forEach(item => {
        const doc: DocumentRecord = {
            id: crypto.randomUUID(),
            type: 'CHECKLIST',
            header: { 
                om: item.frotaOm, 
                tag: item.frotaOm, 
                date: new Date().toLocaleDateString(), 
                time: '', 
                type: 'OUTROS', 
                description: item.description 
            },
            createdAt: new Date().toISOString(),
            status: 'LIXEIRA',
            content: { ...item, isBackup: true },
            signatures: []
        };
        docs.push(doc);
    });
    localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
    localStorage.setItem(KEYS.SCHEDULE, '[]');
    triggerUpdate();
    return true;
  },

  getActiveMaintenances: (): ActiveMaintenance[] => {
    const data = localStorage.getItem(KEYS.ACTIVE);
    return data ? JSON.parse(data) : [];
  },

  getActiveMaintenanceById: (id: string): ActiveMaintenance | undefined => {
    return StorageService.getActiveMaintenances().find(m => m.id === id);
  },
  
  startMaintenance: (task: ActiveMaintenance) => {
    const tasks = StorageService.getActiveMaintenances();
    task.status = 'ANDAMENTO';
    task.currentSessionStart = new Date().toISOString();
    task.accumulatedTime = 0;
    tasks.push(task);
    localStorage.setItem(KEYS.ACTIVE, JSON.stringify(tasks));
    triggerUpdate();
    pushToSupabase('active_maintenance', task);
  },

  pauseMaintenance: (id: string) => {
    const tasks = StorageService.getActiveMaintenances();
    const task = tasks.find(t => t.id === id);
    if (task && task.status !== 'PAUSADA') {
        const now = Date.now();
        const sessionStart = task.currentSessionStart ? new Date(task.currentSessionStart).getTime() : now;
        const sessionDuration = now - sessionStart;
        task.accumulatedTime = (task.accumulatedTime || 0) + sessionDuration;
        task.status = 'PAUSADA';
        task.currentSessionStart = undefined;
        localStorage.setItem(KEYS.ACTIVE, JSON.stringify(tasks));
        triggerUpdate();
        pushToSupabase('active_maintenance', task);
    }
  },

  resumeMaintenance: (id: string) => {
    const tasks = StorageService.getActiveMaintenances();
    const task = tasks.find(t => t.id === id);
    if (task && task.status === 'PAUSADA') {
        task.status = 'ANDAMENTO';
        task.currentSessionStart = new Date().toISOString();
        localStorage.setItem(KEYS.ACTIVE, JSON.stringify(tasks));
        triggerUpdate();
        pushToSupabase('active_maintenance', task);
    }
  },

  completeMaintenance: (id: string, status: string = 'FINALIZADO') => {
    const active = StorageService.getActiveMaintenances();
    const task = active.find(t => t.id === id);
    if (task) {
        const history = StorageService.getHistory();
        const duration = task.currentSessionStart 
            ? ((new Date().getTime() - new Date(task.currentSessionStart).getTime()) + (task.accumulatedTime || 0))
            : (task.accumulatedTime || 0);
        const h = Math.floor(duration / 3600000);
        const m = Math.floor((duration % 3600000) / 60000);
        const log: MaintenanceLog = {
            id: crypto.randomUUID(),
            om: task.header.om,
            tag: task.header.tag,
            description: task.header.description,
            startTime: task.startTime,
            endTime: new Date().toISOString(),
            duration: `${h}h ${m}m`,
            responsible: 'EQUIPE',
            status: status
        };
        history.push(log);
        localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
        pushToSupabase('history', log);
        const remaining = active.filter(t => t.id !== id);
        localStorage.setItem(KEYS.ACTIVE, JSON.stringify(remaining));
        deleteFromSupabase('active_maintenance', id);
        triggerUpdate();
    }
  },

  getHistory: (): MaintenanceLog[] => {
    const data = localStorage.getItem(KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  },

  getNotifications: (): any[] => {
      const oms = StorageService.getOMs();
      return oms.filter(om => om.status === 'PENDENTE').map(om => ({
          id: om.id,
          type: om.type === 'CORRETIVA' ? 'URGENT' : 'INFO',
          title: `NOVA OM ${om.type}`,
          message: `${om.omNumber} - ${om.description}`,
          date: new Date(om.createdAt).toLocaleDateString()
      }));
  }
};