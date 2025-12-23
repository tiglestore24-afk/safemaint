
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
  OMS: 'safemaint_oms',
  NOTIFICATIONS: 'safemaint_notifications'
};

const triggerUpdate = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('safemaint_storage_update'));
    }
};

const pushToSupabase = async (table: string, data: any) => {
    try {
        const { error } = await supabase.from(table).upsert(data);
        if (error) console.error(`[SUPABASE SYNC ERROR] ${table}:`, error.message);
    } catch (e) {
        console.error(`[CRITICAL SYNC ERROR]`, e);
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
          { local: KEYS.SCHEDULE, remote: 'schedule' },
          { local: KEYS.HISTORY, remote: 'history' },
          { local: KEYS.ACTIVE, remote: 'active_maintenance' }
      ];

      for (const t of tables) {
          try {
              const { data, error } = await supabase.from(t.remote).select('*');
              if (!error && data) {
                  localStorage.setItem(t.local, JSON.stringify(data));
              }
          } catch (e) {}
      }
      triggerUpdate();
  },

  validateUser: async (login: string, pass: string): Promise<User | null> => {
      try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('login', login.toUpperCase())
            .eq('password', pass)
            .single();
        
        if (error || !data) {
            // Se falha a rede, verifica se o admin padrão está no localStorage do último login
            // mas nunca permitir login "123" sem banco de dados por segurança.
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
      const { error } = await supabase.from('users').insert({
          ...user,
          login: user.login.toUpperCase()
      });
      return !error;
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
    pushToSupabase('employees', emp);
    triggerUpdate();
  },

  deleteEmployee: (id: string) => {
    const list = StorageService.getEmployees().filter(e => e.id !== id);
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
    deleteFromSupabase('employees', id);
    triggerUpdate();
  },

  getARTs: (): RegisteredART[] => {
    const data = localStorage.getItem(KEYS.ARTS);
    return data ? JSON.parse(data) : [];
  },

  addART: (art: RegisteredART) => {
    const list = StorageService.getARTs();
    list.push(art);
    localStorage.setItem(KEYS.ARTS, JSON.stringify(list));
    pushToSupabase('arts', art);
    triggerUpdate();
  },

  deleteART: (id: string) => {
    const list = StorageService.getARTs().filter(a => a.id !== id);
    localStorage.setItem(KEYS.ARTS, JSON.stringify(list));
    deleteFromSupabase('arts', id);
    triggerUpdate();
  },

  getSchedule: async (): Promise<ScheduleItem[]> => {
      const { data } = await supabase.from('schedule').select('*').order('dateStart', { ascending: true });
      if (data) localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(data));
      return data || JSON.parse(localStorage.getItem(KEYS.SCHEDULE) || '[]');
  },

  updateSchedule: (items: ScheduleItem[]) => {
    localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(items));
    items.forEach(item => pushToSupabase('schedule', item));
    triggerUpdate();
  },

  deleteScheduleItem: (id: string) => {
    const list = JSON.parse(localStorage.getItem(KEYS.SCHEDULE) || '[]') as ScheduleItem[];
    localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(list.filter(i => i.id !== id)));
    deleteFromSupabase('schedule', id);
    triggerUpdate();
  },

  archiveAndClearSchedule: async () => {
    const { data: items } = await supabase.from('schedule').select('*');
    if (!items || items.length === 0) return true;
    
    for (const item of items) {
        await pushToSupabase('documents', {
            id: crypto.randomUUID(),
            type: 'CHECKLIST',
            header: { om: item.frotaOm, tag: item.frotaOm, date: new Date().toISOString().split('T')[0], time: '00:00', type: 'OUTROS', description: `BACKUP: ${item.description}` },
            createdAt: new Date().toISOString(),
            status: 'ARQUIVADO',
            content: { ...item, isBackup: true }
        });
        await deleteFromSupabase('schedule', item.id);
    }
    localStorage.setItem(KEYS.SCHEDULE, '[]');
    triggerUpdate();
    return true;
  },

  getOMs: (): OMRecord[] => {
      const data = localStorage.getItem(KEYS.OMS);
      return data ? JSON.parse(data) : [];
  },

  deleteOM: (id: string) => {
    const list = StorageService.getOMs().filter(o => o.id !== id);
    localStorage.setItem(KEYS.OMS, JSON.stringify(list));
    deleteFromSupabase('oms', id);
    triggerUpdate();
  },

  getDocuments: (): DocumentRecord[] => {
      const data = localStorage.getItem(KEYS.DOCS);
      return data ? JSON.parse(data) : [];
  },

  saveDocument: (doc: DocumentRecord) => {
    const docs = StorageService.getDocuments();
    docs.push(doc);
    localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
    pushToSupabase('documents', doc);
    triggerUpdate();
  },

  moveToTrash: (id: string) => {
    const docs = StorageService.getDocuments();
    const doc = docs.find(d => d.id === id);
    if (doc) {
        doc.status = 'LIXEIRA';
        localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
        pushToSupabase('documents', doc);
        triggerUpdate();
    }
  },

  moveManyToTrash: (ids: string[]) => {
    const docs = StorageService.getDocuments();
    docs.forEach(doc => { if (ids.includes(doc.id)) doc.status = 'LIXEIRA'; });
    localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
    docs.filter(d => ids.includes(d.id)).forEach(d => pushToSupabase('documents', d));
    triggerUpdate();
  },

  restoreFromTrash: (id: string) => {
    const docs = StorageService.getDocuments();
    const doc = docs.find(d => d.id === id);
    if (doc) {
        doc.status = 'ATIVO';
        localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
        pushToSupabase('documents', doc);
        triggerUpdate();
    }
  },

  deletePermanently: (id: string) => {
    const docs = StorageService.getDocuments().filter(d => d.id !== id);
    localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
    deleteFromSupabase('documents', id);
    triggerUpdate();
  },

  emptyTrash: () => {
    const docs = StorageService.getDocuments();
    const trashIds = docs.filter(d => d.status === 'LIXEIRA').map(d => d.id);
    const remaining = docs.filter(d => d.status !== 'LIXEIRA');
    localStorage.setItem(KEYS.DOCS, JSON.stringify(remaining));
    trashIds.forEach(id => deleteFromSupabase('documents', id));
    triggerUpdate();
  },

  runRetentionPolicy: () => {
    const docs = StorageService.getDocuments();
    const now = new Date();
    let changed = false;
    docs.forEach(doc => {
        if (doc.status === 'ATIVO') {
            const diffDays = (now.getTime() - new Date(doc.createdAt).getTime()) / (1000 * 3600 * 24);
            if (diffDays > 30) { doc.status = 'ARQUIVADO'; changed = true; }
        }
    });
    if (changed) {
        localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
        docs.forEach(d => pushToSupabase('documents', d));
        triggerUpdate();
    }
  },

  getActiveMaintenances: async (): Promise<ActiveMaintenance[]> => {
      const { data } = await supabase.from('active_maintenance').select('*');
      if (data) localStorage.setItem(KEYS.ACTIVE, JSON.stringify(data));
      return data || JSON.parse(localStorage.getItem(KEYS.ACTIVE) || '[]');
  },

  getActiveMaintenanceById: (id: string) => {
    const active = JSON.parse(localStorage.getItem(KEYS.ACTIVE) || '[]') as ActiveMaintenance[];
    return active.find(m => m.id === id);
  },
  
  startMaintenance: (task: ActiveMaintenance) => {
    const tasks = JSON.parse(localStorage.getItem(KEYS.ACTIVE) || '[]');
    task.status = 'ANDAMENTO';
    task.currentSessionStart = new Date().toISOString();
    task.accumulatedTime = Number(task.accumulatedTime) || 0;
    tasks.push(task);
    localStorage.setItem(KEYS.ACTIVE, JSON.stringify(tasks));
    pushToSupabase('active_maintenance', task);
    triggerUpdate();
  },

  pauseMaintenance: (id: string) => {
    const tasks = JSON.parse(localStorage.getItem(KEYS.ACTIVE) || '[]') as ActiveMaintenance[];
    const task = tasks.find(t => t.id === id);
    if (task) {
        const now = new Date().getTime();
        if (task.currentSessionStart) {
            const sessionDuration = now - new Date(task.currentSessionStart).getTime();
            if (sessionDuration > 0) {
                task.accumulatedTime = (Number(task.accumulatedTime) || 0) + sessionDuration;
            }
        }
        task.status = 'PAUSADA';
        task.currentSessionStart = undefined;
        localStorage.setItem(KEYS.ACTIVE, JSON.stringify(tasks));
        pushToSupabase('active_maintenance', task);
        triggerUpdate();
    }
  },

  resumeMaintenance: (id: string) => {
    const tasks = JSON.parse(localStorage.getItem(KEYS.ACTIVE) || '[]') as ActiveMaintenance[];
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.status = 'ANDAMENTO';
        task.currentSessionStart = new Date().toISOString();
        localStorage.setItem(KEYS.ACTIVE, JSON.stringify(tasks));
        pushToSupabase('active_maintenance', task);
        triggerUpdate();
    }
  },

  completeMaintenance: async (id: string) => {
    const active = JSON.parse(localStorage.getItem(KEYS.ACTIVE) || '[]') as ActiveMaintenance[];
    const task = active.find(t => t.id === id);
    if (task) {
        const log: MaintenanceLog = {
            id: crypto.randomUUID(), om: task.header.om, tag: task.header.tag, description: task.header.description,
            startTime: task.startTime, endTime: new Date().toISOString(), duration: 'CONCLUÍDO', responsible: 'EQUIPE CAMPO', status: 'FINALIZADO'
        };
        await pushToSupabase('history', log);
        await deleteFromSupabase('active_maintenance', id);
        localStorage.setItem(KEYS.ACTIVE, JSON.stringify(active.filter(t => t.id !== id)));
        triggerUpdate();
    }
  },

  getHistory: async (): Promise<MaintenanceLog[]> => {
      const { data } = await supabase.from('history').select('*').order('endTime', { ascending: false }).limit(30);
      return data || JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]');
  },

  getChatMessages: (): ChatMessage[] => {
    return JSON.parse(localStorage.getItem(KEYS.CHAT) || '[]');
  },

  sendChatMessage: (msg: ChatMessage) => {
    const messages = StorageService.getChatMessages();
    messages.push(msg);
    localStorage.setItem(KEYS.CHAT, JSON.stringify(messages));
    pushToSupabase('chat', msg);
    window.dispatchEvent(new Event('safemaint_chat_update'));
  },

  clearChat: () => {
    localStorage.removeItem(KEYS.CHAT);
    window.dispatchEvent(new Event('safemaint_chat_update'));
  },

  getNotifications: (): NotificationItem[] => {
    const oms = StorageService.getOMs();
    return oms.filter(om => om.status === 'PENDENTE').map(om => ({
      id: om.id,
      type: om.type === 'CORRETIVA' ? 'URGENT' : 'INFO',
      title: `OM ${om.type}: ${om.omNumber}`,
      message: `${om.tag} - ${om.description}`,
      date: new Date(om.createdAt).toLocaleDateString()
    }));
  }
};
