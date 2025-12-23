
import { DocumentRecord, Employee, RegisteredART, User, ScheduleItem, ActiveMaintenance, MaintenanceLog, ChatMessage, OMRecord } from '../types';
import { supabase } from './supabase';

export interface NotificationItem {
    id: string;
    type: 'URGENT' | 'INFO';
    title: string;
    message: string;
    date: string;
}

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

const triggerUpdate = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('safemaint_storage_update'));
    }
};

const pushToSupabase = async (table: string, data: any) => {
    try {
        const { error } = await supabase.from(table).upsert(data);
        if (error) {
            console.warn(`[SUPABASE SYNC ERROR] ${table}:`, error.message);
            // Se o erro for 401, sabemos que a chave está errada
            if (error.message.includes('401') || error.message.includes('JWT')) {
                console.error("ERRO CRÍTICO: CHAVE API INVÁLIDA NO STORAGE SERVICE.");
            }
        }
    } catch (e) {
        console.warn('Sync failed: Offline or Config Error');
    }
};

const deleteFromSupabase = async (table: string, id: string) => {
    try {
        await supabase.from(table).delete().eq('id', id);
    } catch (e) {}
};

export const StorageService = {
  initialSync: async () => {
      const tables = [
          { local: KEYS.DOCS, remote: 'documents' },
          { local: KEYS.EMPLOYEES, remote: 'employees' },
          { local: KEYS.OMS, remote: 'oms' },
          { local: KEYS.ARTS, remote: 'arts' },
          { local: KEYS.SCHEDULE, remote: 'schedule' },
          { local: KEYS.HISTORY, remote: 'history' }
      ];

      for (const t of tables) {
          try {
              const { data, error } = await supabase.from(t.remote).select('*');
              if (!error && data) {
                  localStorage.setItem(t.local, JSON.stringify(data));
              }
          } catch (e) {
              console.warn(`Sync failed for ${t.remote}`);
          }
      }
      triggerUpdate();
  },

  validateUser: async (login: string, pass: string): Promise<User | null> => {
      // Fallback Admin
      if (login === 'ADMIN' && pass === '123') {
          return { id: 'admin', name: 'ADMINISTRADOR', matricula: '0000', login: 'ADMIN', role: 'ADMIN' };
      }
      try {
        const { data, error } = await supabase.from('users').select('*').eq('login', login).eq('password', pass).single();
        if (error) return null;
        return data as User;
      } catch (e) {
        return null;
      }
  },

  getUsers: async (): Promise<User[]> => {
      try {
        const { data } = await supabase.from('users').select('*');
        return data || [];
      } catch (e) { return []; }
  },
  
  addUser: async (user: User) => {
      try {
        const { error } = await supabase.from('users').insert(user);
        return !error;
      } catch (e) { return false; }
  },

  getEmployees: (): Employee[] => {
    const data = localStorage.getItem(KEYS.EMPLOYEES);
    return data ? JSON.parse(data) : [];
  },
  
  addEmployee: (emp: Employee) => {
    const list = StorageService.getEmployees();
    const idx = list.findIndex(e => e.id === emp.id);
    if (idx > -1) list[idx] = emp; else list.push(emp);
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
    triggerUpdate();
    pushToSupabase('employees', emp);
  },

  deleteEmployee: (id: string) => {
    const list = StorageService.getEmployees().filter(e => e.id !== id);
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
    triggerUpdate();
    deleteFromSupabase('employees', id);
  },

  getARTs: (): RegisteredART[] => {
    const data = localStorage.getItem(KEYS.ARTS);
    return data ? JSON.parse(data) : [];
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

  archiveAndClearSchedule: () => {
      localStorage.removeItem(KEYS.SCHEDULE);
      triggerUpdate();
      return true;
  },

  getOMs: (): OMRecord[] => {
      const data = localStorage.getItem(KEYS.OMS);
      return data ? JSON.parse(data) : [];
  },

  deleteOM: (id: string) => {
    const oms = StorageService.getOMs().filter(o => o.id !== id);
    localStorage.setItem(KEYS.OMS, JSON.stringify(oms));
    triggerUpdate();
    deleteFromSupabase('oms', id);
  },

  getDocuments: (): DocumentRecord[] => {
      const data = localStorage.getItem(KEYS.DOCS);
      return data ? JSON.parse(data) : [];
  },

  saveDocument: (doc: DocumentRecord) => {
    const docs = StorageService.getDocuments();
    docs.push(doc);
    localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
    triggerUpdate();
    pushToSupabase('documents', doc);
  },

  moveToTrash: (id: string) => {
    const docs = StorageService.getDocuments();
    const doc = docs.find(d => d.id === id);
    if (doc) {
        doc.status = 'LIXEIRA';
        localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
        triggerUpdate();
        pushToSupabase('documents', doc);
    }
  },

  moveManyToTrash: (ids: string[]) => {
    const docs = StorageService.getDocuments();
    let changed = false;
    docs.forEach(doc => {
      if (ids.includes(doc.id)) {
        doc.status = 'LIXEIRA';
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
      triggerUpdate();
      ids.forEach(id => {
        const d = docs.find(doc => doc.id === id);
        if (d) pushToSupabase('documents', d);
      });
    }
  },

  restoreFromTrash: (id: string) => {
    const docs = StorageService.getDocuments();
    const doc = docs.find(d => d.id === id);
    if (doc) {
        doc.status = 'ATIVO';
        localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
        triggerUpdate();
        pushToSupabase('documents', doc);
    }
  },

  deletePermanently: (id: string) => {
    const docs = StorageService.getDocuments().filter(d => d.id !== id);
    localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
    triggerUpdate();
    deleteFromSupabase('documents', id);
  },

  emptyTrash: () => {
    const docs = StorageService.getDocuments();
    const trashIds = docs.filter(d => d.status === 'LIXEIRA').map(d => d.id);
    const remaining = docs.filter(d => d.status !== 'LIXEIRA');
    localStorage.setItem(KEYS.DOCS, JSON.stringify(remaining));
    triggerUpdate();
    trashIds.forEach(id => deleteFromSupabase('documents', id));
  },

  runRetentionPolicy: () => {
    const docs = StorageService.getDocuments();
    const limit = new Date();
    limit.setDate(limit.getDate() - 30);
    
    let changed = false;
    docs.forEach(doc => {
      if (doc.status === 'ATIVO' && new Date(doc.createdAt) < limit) {
        doc.status = 'ARQUIVADO';
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
      triggerUpdate();
    }
  },

  getActiveMaintenances: (): ActiveMaintenance[] => {
    const data = localStorage.getItem(KEYS.ACTIVE);
    return data ? JSON.parse(data) : [];
  },

  getActiveMaintenanceById: (id: string) => StorageService.getActiveMaintenances().find(m => m.id === id),
  
  startMaintenance: (task: ActiveMaintenance) => {
    const tasks = StorageService.getActiveMaintenances();
    task.status = 'ANDAMENTO';
    task.currentSessionStart = new Date().toISOString();
    tasks.push(task);
    localStorage.setItem(KEYS.ACTIVE, JSON.stringify(tasks));
    triggerUpdate();
    pushToSupabase('active_maintenance', task);
  },

  pauseMaintenance: (id: string) => {
    const tasks = StorageService.getActiveMaintenances();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.status = 'PAUSADA';
        localStorage.setItem(KEYS.ACTIVE, JSON.stringify(tasks));
        triggerUpdate();
        pushToSupabase('active_maintenance', task);
    }
  },

  resumeMaintenance: (id: string) => {
    const tasks = StorageService.getActiveMaintenances();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.status = 'ANDAMENTO';
        task.currentSessionStart = new Date().toISOString();
        localStorage.setItem(KEYS.ACTIVE, JSON.stringify(tasks));
        triggerUpdate();
        pushToSupabase('active_maintenance', task);
    }
  },

  completeMaintenance: (id: string) => {
    const active = StorageService.getActiveMaintenances();
    const task = active.find(t => t.id === id);
    if (task) {
        const history = StorageService.getHistory();
        const log: MaintenanceLog = {
            id: crypto.randomUUID(),
            om: task.header.om,
            tag: task.header.tag,
            description: task.header.description,
            startTime: task.startTime,
            endTime: new Date().toISOString(),
            duration: '0h',
            responsible: 'EQUIPE',
            status: 'FINALIZADO'
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

  getNotifications: (): NotificationItem[] => {
      const oms = StorageService.getOMs();
      return oms.filter(om => om.status === 'PENDENTE').map(om => ({
          id: om.id,
          type: om.type === 'CORRETIVA' ? 'URGENT' : 'INFO',
          title: `NOVA OM ${om.type}`,
          message: `${om.omNumber} - ${om.description}`,
          date: new Date(om.createdAt).toLocaleDateString()
      }));
  },

  getChatMessages: (): ChatMessage[] => {
    const data = localStorage.getItem(KEYS.CHAT);
    return data ? JSON.parse(data) : [];
  },

  sendChatMessage: (msg: ChatMessage) => {
    const messages = StorageService.getChatMessages();
    messages.push(msg);
    localStorage.setItem(KEYS.CHAT, JSON.stringify(messages));
    window.dispatchEvent(new Event('safemaint_chat_update'));
    pushToSupabase('chat', msg);
  },

  clearChat: () => {
    localStorage.removeItem(KEYS.CHAT);
    window.dispatchEvent(new Event('safemaint_chat_update'));
  }
};
