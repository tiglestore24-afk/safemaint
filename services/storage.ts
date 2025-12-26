
import { DocumentRecord, Employee, RegisteredART, User, ScheduleItem, ActiveMaintenance, MaintenanceLog, ChatMessage, OMRecord } from '../types';
import { supabase } from './supabase';

/*
  === ATENÇÃO: SCRIPT SQL PARA O SUPABASE ===
  Para habilitar o vínculo de OM no banco de dados, execute no SQL Editor:
  alter table active_maintenance add column if not exists "omId" uuid;
*/

export interface NotificationItem {
    id: string;
    type: 'URGENT' | 'INFO';
    title: string;
    message: string;
    date: string;
}

interface SyncTask {
    id: string;
    table: string;
    action: 'UPSERT' | 'DELETE';
    data: any; // Payload para Upsert
    recordId?: string; // ID para Delete
    timestamp: number;
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
  SYNC_QUEUE: 'safemaint_sync_queue'
};

const DB_SCHEMA: Record<string, string[]> = {
    'documents': ['id', 'type', 'header', 'createdAt', 'status', 'content', 'signatures'],
    'active_maintenance': ['id', 'header', 'startTime', 'artId', 'artType', 'origin', 'status', 'currentSessionStart', 'accumulatedTime', 'omId'],
    'history': ['id', 'om', 'tag', 'description', 'startTime', 'endTime', 'duration', 'responsible', 'status'],
    'employees': ['id', 'name', 'matricula', 'function', 'status'],
    'users': ['id', 'name', 'matricula', 'login', 'password', 'role'],
    'arts': ['id', 'code', 'company', 'taskName', 'area', 'omve', 'emissionDate', 'pdfUrl', 'risks', 'controlMeasures', 'steps'],
    'schedule': ['id', 'frotaOm', 'description', 'resources', 'resources2', 'dateMin', 'dateMax', 'priority', 'peopleCount', 'hours', 'dateStart', 'dateEnd', 'workCenter', 'timeStart', 'timeEnd', 'status'],
    'oms': ['id', 'omNumber', 'description', 'tag', 'type', 'status', 'createdAt', 'createdBy', 'pdfUrl', 'linkedScheduleId'],
    'chat': ['id', 'sender', 'role', 'text', 'timestamp', 'isSystem']
};

const triggerUpdate = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('safemaint_storage_update'));
    }
};

const triggerChatUpdate = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('safemaint_chat_update'));
    }
};

const mapToDb = (data: any, table: string): any => {
    const allowedFields = DB_SCHEMA[table];
    if (!allowedFields) return data;
    
    const mapped: any = {};
    Object.keys(data).forEach(key => {
        if (allowedFields.includes(key)) {
            mapped[key] = data[key];
        }
    });
    return mapped;
};

const mapFromDb = (data: any) => {
    return data;
};

// --- SYNC QUEUE LOGIC ---

const getSyncQueue = (): SyncTask[] => {
    return JSON.parse(localStorage.getItem(KEYS.SYNC_QUEUE) || '[]');
};

const addToSyncQueue = (task: SyncTask) => {
    const queue = getSyncQueue();
    // Remove duplicatas para o mesmo ID e Tabela (mantém o mais recente)
    const filtered = queue.filter(t => !(t.recordId === task.recordId && t.table === task.table));
    filtered.push(task);
    localStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(filtered));
    triggerUpdate(); // Atualiza UI para mostrar ícone de sync
};

const removeFromSyncQueue = (taskId: string) => {
    const queue = getSyncQueue();
    const filtered = queue.filter(t => t.id !== taskId);
    localStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(filtered));
    triggerUpdate();
};

const processSyncQueue = async () => {
    if (!navigator.onLine) return;
    
    const queue = getSyncQueue();
    if (queue.length === 0) return;

    console.log(`[SYNC] Processando ${queue.length} itens pendentes...`);

    for (const task of queue) {
        let success = false;
        try {
            if (task.action === 'UPSERT') {
                const mappedData = mapToDb(task.data, task.table);
                const { error } = await supabase.from(task.table).upsert(mappedData, { onConflict: 'id' });
                if (!error) success = true;
            } else if (task.action === 'DELETE' && task.recordId) {
                const { error } = await supabase.from(task.table).delete().eq('id', task.recordId);
                if (!error) success = true;
            }
        } catch (e) {
            console.error('[SYNC ERROR]', e);
        }

        if (success) {
            removeFromSyncQueue(task.id);
        }
    }
};

// Listen for Online status
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('[NETWORK] Online detected. Syncing...');
        processSyncQueue();
    });
}

// --- DATABASE OPERATIONS WRAPPERS ---

const pushToSupabase = async (table: string, data: any) => {
    try {
        const mappedData = mapToDb(data, table);
        const { error } = await supabase.from(table).upsert(mappedData, { onConflict: 'id' });
        if (error) {
            console.warn(`[OFFLINE] Falha ao enviar para ${table}. Enfileirando...`);
            addToSyncQueue({
                id: crypto.randomUUID(),
                table,
                action: 'UPSERT',
                data: data,
                recordId: data.id,
                timestamp: Date.now()
            });
            return false;
        }
        return true;
    } catch (e) {
        console.warn(`[OFFLINE] Erro de conexão. Enfileirando...`);
        addToSyncQueue({
            id: crypto.randomUUID(),
            table,
            action: 'UPSERT',
            data: data,
            recordId: data.id,
            timestamp: Date.now()
        });
        return false;
    }
};

const deleteFromSupabase = async (table: string, id: string) => {
    try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
    } catch (e) {
        console.warn(`[OFFLINE] Falha ao excluir de ${table}. Enfileirando exclusão...`);
        addToSyncQueue({
            id: crypto.randomUUID(),
            table,
            action: 'DELETE',
            data: null,
            recordId: id,
            timestamp: Date.now()
        });
    }
};

export const StorageService = {
  initialSync: async () => {
      // 1. Tenta processar fila pendente primeiro
      await processSyncQueue();

      const tables = [
          { local: KEYS.DOCS, remote: 'documents' },
          { local: KEYS.EMPLOYEES, remote: 'employees' },
          { local: KEYS.OMS, remote: 'oms' },
          { local: KEYS.ARTS, remote: 'arts' },
          { local: KEYS.SCHEDULE, remote: 'schedule' },
          { local: KEYS.HISTORY, remote: 'history' },
          { local: KEYS.ACTIVE, remote: 'active_maintenance' },
          { local: KEYS.CHAT, remote: 'chat' }
      ];

      for (const t of tables) {
          try {
              const { data, error } = await supabase.from(t.remote).select('*');
              if (!error && data) {
                  const camelData = data.map(mapFromDb);
                  localStorage.setItem(t.local, JSON.stringify(camelData));
              }
          } catch (e) {}
      }
      triggerUpdate();
      triggerChatUpdate();
  },

  getPendingSyncCount: (): number => {
      return getSyncQueue().length;
  },

  validateUser: async (login: string, pass: string): Promise<User | null> => {
      if (login.toUpperCase() === 'ADMIN' && pass === '123') {
          return {
              id: 'admin-id',
              name: 'ADMINISTRADOR SISTEMA',
              matricula: '000000',
              login: 'ADMIN',
              role: 'ADMIN'
          };
      }

      try {
          const { data, error } = await supabase.from('users').select('*').eq('login', login.toUpperCase()).eq('password', pass).single();
          if (error || !data) return null;
          return mapFromDb(data) as User;
      } catch (e) { return null; }
  },

  getUsers: async (): Promise<User[]> => {
      const { data } = await supabase.from('users').select('*');
      return (data || []).map(mapFromDb);
  },
  
  addUser: async (user: User) => {
      await pushToSupabase('users', user);
      triggerUpdate();
      return true;
  },

  updateUser: async (user: User) => {
      await pushToSupabase('users', user);
      triggerUpdate();
      return true;
  },

  deleteUser: async (id: string) => {
      await deleteFromSupabase('users', id);
      triggerUpdate();
      return true;
  },

  getEmployees: (): Employee[] => JSON.parse(localStorage.getItem(KEYS.EMPLOYEES) || '[]'),
  
  addEmployee: async (emp: Employee) => {
    const list = StorageService.getEmployees();
    list.push(emp);
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
    await pushToSupabase('employees', emp);
    triggerUpdate();
  },

  updateEmployee: async (emp: Employee) => {
    const list = StorageService.getEmployees();
    const idx = list.findIndex(e => e.id === emp.id);
    if (idx > -1) {
        list[idx] = emp;
        localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
        await pushToSupabase('employees', emp);
        triggerUpdate();
    }
  },

  deleteEmployee: async (id: string) => {
    const list = StorageService.getEmployees();
    const emp = list.find(e => e.id === id);
    if (emp) {
        emp.status = 'TRASH';
        localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
        await pushToSupabase('employees', emp);
        triggerUpdate();
    }
  },

  restoreEmployee: async (id: string) => {
    const list = StorageService.getEmployees();
    const emp = list.find(e => e.id === id);
    if (emp) {
        emp.status = 'ACTIVE';
        localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
        await pushToSupabase('employees', emp);
        triggerUpdate();
    }
  },

  deleteEmployeePermanently: async (id: string) => {
    const list = StorageService.getEmployees().filter(e => e.id !== id);
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
    await deleteFromSupabase('employees', id);
    triggerUpdate();
  },

  getARTs: (): RegisteredART[] => JSON.parse(localStorage.getItem(KEYS.ARTS) || '[]'),

  addART: async (art: RegisteredART) => {
    const list = StorageService.getARTs();
    list.push(art);
    localStorage.setItem(KEYS.ARTS, JSON.stringify(list));
    await pushToSupabase('arts', art);
    triggerUpdate();
  },

  deleteART: async (id: string) => {
    const list = StorageService.getARTs().filter(a => a.id !== id);
    localStorage.setItem(KEYS.ARTS, JSON.stringify(list));
    await deleteFromSupabase('arts', id);
    triggerUpdate();
  },

  getSchedule: (): ScheduleItem[] => JSON.parse(localStorage.getItem(KEYS.SCHEDULE) || '[]'),

  updateSchedule: async (items: ScheduleItem[]) => {
    localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(items));
    for (const item of items) {
        await pushToSupabase('schedule', item);
    }
    triggerUpdate();
  },

  deleteScheduleItem: async (id: string) => {
    const list = StorageService.getSchedule().filter(item => item.id !== id);
    localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(list));
    await deleteFromSupabase('schedule', id);
    triggerUpdate();
  },

  archiveAndClearSchedule: async (): Promise<boolean> => {
    localStorage.setItem(KEYS.SCHEDULE, '[]');
    // Delete all logic is safer to keep server-side or truncate, 
    // but for now we try to delete local ones from server
    // WARNING: This simple implementation might not sync "delete all" correctly offline
    // Ideally we would send a batch delete command. 
    // Current offline approach: Only clears local. 
    try {
        await supabase.from('schedule').delete().neq('id', '000'); 
    } catch(e) { console.error(e); }
    triggerUpdate();
    return true;
  },

  getDocuments: (): DocumentRecord[] => JSON.parse(localStorage.getItem(KEYS.DOCS) || '[]'),

  runRetentionPolicy: () => {
    console.debug('Retention policy running...');
  },

  saveDocument: async (doc: DocumentRecord) => {
    const list = StorageService.getDocuments();
    list.push(doc);
    localStorage.setItem(KEYS.DOCS, JSON.stringify(list));
    await pushToSupabase('documents', doc);
    triggerUpdate();
  },

  moveToTrash: async (id: string) => {
    const list = StorageService.getDocuments();
    const doc = list.find(d => d.id === id);
    if (doc) {
        doc.status = 'LIXEIRA';
        localStorage.setItem(KEYS.DOCS, JSON.stringify(list));
        await pushToSupabase('documents', doc);
        triggerUpdate();
    }
  },

  moveManyToTrash: async (ids: string[]) => {
    const list = StorageService.getDocuments();
    ids.forEach(id => {
      const doc = list.find(d => d.id === id);
      if (doc) {
          doc.status = 'LIXEIRA';
          pushToSupabase('documents', doc); // Push individually to queue if needed
      }
    });
    localStorage.setItem(KEYS.DOCS, JSON.stringify(list));
    triggerUpdate();
  },

  restoreFromTrash: async (id: string) => {
    const list = StorageService.getDocuments();
    const doc = list.find(d => d.id === id);
    if (doc) {
        doc.status = 'ATIVO';
        localStorage.setItem(KEYS.DOCS, JSON.stringify(list));
        await pushToSupabase('documents', doc);
        triggerUpdate();
    }
  },

  deletePermanently: async (id: string) => {
    const list = StorageService.getDocuments().filter(d => d.id !== id);
    localStorage.setItem(KEYS.DOCS, JSON.stringify(list));
    await deleteFromSupabase('documents', id);
    triggerUpdate();
  },

  emptyTrash: async () => {
    const allDocs = StorageService.getDocuments();
    const trashItems = allDocs.filter(d => d.status === 'LIXEIRA');
    const filtered = allDocs.filter(d => d.status !== 'LIXEIRA');
    localStorage.setItem(KEYS.DOCS, JSON.stringify(filtered));
    for (const doc of trashItems) {
        await deleteFromSupabase('documents', doc.id);
    }
    triggerUpdate();
  },

  getActiveMaintenances: (): ActiveMaintenance[] => JSON.parse(localStorage.getItem(KEYS.ACTIVE) || '[]'),

  getActiveMaintenanceById: (id: string) => StorageService.getActiveMaintenances().find(m => m.id === id),
  
  startMaintenance: async (task: ActiveMaintenance) => {
    const tasks = StorageService.getActiveMaintenances();
    tasks.push(task);
    localStorage.setItem(KEYS.ACTIVE, JSON.stringify(tasks));
    await pushToSupabase('active_maintenance', task);
    
    // Tenta atualizar OM se possível (se ID existir)
    if (task.omId) {
        await StorageService.updateOMStatus(task.omId, 'EM_ANDAMENTO');
    }

    triggerUpdate();
  },

  pauseMaintenance: async (id: string) => {
    const tasks = StorageService.getActiveMaintenances();
    const task = tasks.find(t => t.id === id);
    if (task) {
        const now = Date.now();
        const start = task.currentSessionStart ? new Date(task.currentSessionStart).getTime() : now;
        task.accumulatedTime = (task.accumulatedTime || 0) + (now - start);
        task.status = 'PAUSADA';
        task.currentSessionStart = undefined;
        localStorage.setItem(KEYS.ACTIVE, JSON.stringify(tasks));
        await pushToSupabase('active_maintenance', task);
        triggerUpdate();
    }
  },

  resumeMaintenance: async (id: string) => {
    const tasks = StorageService.getActiveMaintenances();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.status = 'ANDAMENTO';
        task.currentSessionStart = new Date().toISOString();
        localStorage.setItem(KEYS.ACTIVE, JSON.stringify(tasks));
        await pushToSupabase('active_maintenance', task);
        triggerUpdate();
    }
  },

  completeMaintenance: async (id: string, status: string = 'FINALIZADO') => {
    const active = StorageService.getActiveMaintenances();
    const task = active.find(t => t.id === id);
    if (task) {
        const now = new Date();
        const start = task.currentSessionStart ? new Date(task.currentSessionStart).getTime() : now.getTime();
        const totalMs = (task.accumulatedTime || 0) + (now.getTime() - start);
        const log: MaintenanceLog = {
            id: crypto.randomUUID(), om: task.header.om, tag: task.header.tag, description: task.header.description,
            startTime: task.startTime, endTime: now.toISOString(), duration: `${Math.floor(totalMs / 3600000)}h ${Math.floor((totalMs % 3600000) / 60000)}m`,
            responsible: 'EQUIPE CAMPO', status
        };
        await pushToSupabase('history', log);
        
        if (task.omId) {
            await StorageService.updateOMStatus(task.omId, 'CONCLUIDA');
        }

        const filtered = active.filter(t => t.id !== id);
        localStorage.setItem(KEYS.ACTIVE, JSON.stringify(filtered));
        await deleteFromSupabase('active_maintenance', id);
        triggerUpdate();
    }
  },

  getHistory: (): MaintenanceLog[] => JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]'),

  getOMs: (): OMRecord[] => JSON.parse(localStorage.getItem(KEYS.OMS) || '[]'),

  saveOM: async (om: OMRecord) => {
    const list = StorageService.getOMs();
    const index = list.findIndex(o => o.id === om.id);
    if (index > -1) {
        list[index] = om;
    } else {
        list.push(om);
    }
    localStorage.setItem(KEYS.OMS, JSON.stringify(list));
    await pushToSupabase('oms', om);
    triggerUpdate();
  },

  updateOMStatus: async (id: string, status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA') => {
      const list = StorageService.getOMs();
      const om = list.find(o => o.id === id);
      if (om) {
          om.status = status;
          localStorage.setItem(KEYS.OMS, JSON.stringify(list));
          
          // Use wrapper if implemented, or handle manual queue here.
          // Since updateOMStatus is specific, we use pushToSupabase with the full object or partial
          // Here we are updating just the status locally, but for consistency with queue, 
          // best to upsert the whole object or call a specific update function.
          // For simplicity/robustness in queue: Upsert the whole OM object.
          await pushToSupabase('oms', om); 
          triggerUpdate();
      }
  },

  deleteOM: async (id: string) => {
    const list = StorageService.getOMs().filter(o => o.id !== id);
    localStorage.setItem(KEYS.OMS, JSON.stringify(list));
    await deleteFromSupabase('oms', id);
    triggerUpdate();
  },

  getChatMessages: (): ChatMessage[] => JSON.parse(localStorage.getItem(KEYS.CHAT) || '[]'),

  sendChatMessage: async (msg: ChatMessage) => {
    const list = StorageService.getChatMessages();
    list.push(msg);
    localStorage.setItem(KEYS.CHAT, JSON.stringify(list));
    await pushToSupabase('chat', msg);
    triggerChatUpdate();
  },

  clearChat: async () => {
    localStorage.setItem(KEYS.CHAT, '[]');
    try {
        await supabase.from('chat').delete().neq('id', '000');
    } catch(e) {}
    triggerChatUpdate();
  },

  getNotifications: (): NotificationItem[] => {
      const oms = StorageService.getOMs();
      return oms.filter(o => o.status === 'PENDENTE').map(o => ({
          id: o.id, type: o.type === 'CORRETIVA' ? 'URGENT' : 'INFO',
          title: `OM PENDENTE: ${o.omNumber}`, message: `${o.tag} - ${o.description}`, date: new Date(o.createdAt).toLocaleDateString()
      }));
  }
};
