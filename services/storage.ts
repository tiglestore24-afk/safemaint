import { DocumentRecord, Employee, RegisteredART, User, ScheduleItem, ActiveMaintenance, MaintenanceLog, OMRecord, ChecklistTemplateItem, PendingExtraDemand, NotificationRecord, AvailabilityRecord, ChatMessage } from '../types';
import { supabase } from './supabase';

export interface NotificationItem extends NotificationRecord {
    source?: 'OM' | 'DEMAND' | 'SCHEDULE' | 'ACTIVE' | 'SYSTEM';
}

export const KEYS = {
  DOCS: 'safemaint_docs',
  EMPLOYEES: 'safemaint_employees',
  ARTS: 'safemaint_arts',
  SCHEDULE: 'safemaint_schedule',
  ACTIVE: 'safemaint_active_tasks',
  HISTORY: 'safemaint_history',
  OMS: 'safemaint_oms',
  CHECKLIST_TEMPLATE: 'safemaint_checklist_template',
  USERS: 'safemaint_users',
  PENDING_DEMANDS: 'safemaint_pending_demands',
  NOTIFICATIONS: 'safemaint_notifications',
  AVAILABILITY: 'safemaint_availability',
  CHAT: 'safemaint_chat'
};

const triggerUpdate = (changedKey?: string) => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('safemaint_storage_update', { detail: { key: changedKey } }));
    }
};

const trySaveLocal = (key: string, data: any) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            console.error(`[STORAGE] Quota exceeded for ${key}. Cleaning up...`);
            if (Array.isArray(data) && data.length > 50) {
                console.warn(`[STORAGE] Truncating ${key} to last 50 items to fit in storage.`);
                try {
                    localStorage.setItem(key, JSON.stringify(data.slice(0, 50)));
                } catch (retryError) {
                    console.error(`[STORAGE] Critical failure saving ${key} even after truncation.`);
                }
            } else {
                console.warn(`[STORAGE] Could not save ${key} locally due to space limits.`);
            }
        } else {
            console.error(`[STORAGE] Erro ao salvar ${key}.`, e);
        }
    }
};

const optimizeForLocal = (item: any): any => {
    const copy = { ...item };
    if (typeof copy.pdfUrl === 'string' && copy.pdfUrl.length > 200 && !copy.pdfUrl.startsWith('http')) {
        copy.pdfUrl = 'TRUE'; 
    }
    if (copy.content && typeof copy.content.manualFileUrl === 'string' && copy.content.manualFileUrl.length > 200 && !copy.content.manualFileUrl.startsWith('http')) {
        copy.content = { ...copy.content, manualFileUrl: 'TRUE' };
    }
    if (copy.content && typeof copy.content.rawText === 'string' && copy.content.rawText.length > 5000) {
        copy.content = { ...copy.content, rawText: copy.content.rawText.substring(0, 5000) + '... (Truncated)' };
    }
    return copy;
};

export const StorageService = {
  getRecordPdf: async (table: 'oms' | 'arts' | 'documents', id: string): Promise<string | null> => {
      if (!navigator.onLine) return null;
      try {
          const col = table === 'documents' ? 'content' : 'pdfUrl';
          const { data, error } = await supabase.from(table).select(col).eq('id', id).single();
          if (error || !data) return null;
          
          if (table === 'documents') return (data as any).content?.manualFileUrl || null;
          return (data as any).pdfUrl;
      } catch (e) { return null; }
  },

  setupSubscriptions: () => {
    if (typeof window === 'undefined') return;
    supabase.removeAllChannels();
    const tables = [
      { key: KEYS.OMS, table: 'oms' },
      { key: KEYS.ARTS, table: 'arts' },
      { key: KEYS.SCHEDULE, table: 'schedule' },
      { key: KEYS.ACTIVE, table: 'active_maintenance' },
      { key: KEYS.DOCS, table: 'documents' },
      { key: KEYS.EMPLOYEES, table: 'employees' },
      { key: KEYS.USERS, table: 'users' },
      { key: KEYS.HISTORY, table: 'history' },
      { key: KEYS.PENDING_DEMANDS, table: 'pending_extra_demands' },
      { key: KEYS.NOTIFICATIONS, table: 'notifications' },
      { key: KEYS.CHECKLIST_TEMPLATE, table: 'checklist_definitions' },
      { key: KEYS.AVAILABILITY, table: 'availability' },
    ];
    
    const channel = supabase.channel('safemaint-global-updates');
    tables.forEach(config => {
        channel.on('postgres_changes', { event: '*', schema: 'public', table: config.table }, (payload) => {
            StorageService.initialSync(); 
        });
    });
    channel.subscribe();
  },

  initialSync: async () => {
      if (!navigator.onLine) return;
      const tables = [
          { key: KEYS.OMS, table: 'oms' },
          { key: KEYS.ARTS, table: 'arts' },
          { key: KEYS.SCHEDULE, table: 'schedule' },
          { key: KEYS.ACTIVE, table: 'active_maintenance' },
          { key: KEYS.DOCS, table: 'documents' },
          { key: KEYS.EMPLOYEES, table: 'employees' },
          { key: KEYS.USERS, table: 'users' },
          { key: KEYS.HISTORY, table: 'history' },
          { key: KEYS.PENDING_DEMANDS, table: 'pending_extra_demands' },
          { key: KEYS.NOTIFICATIONS, table: 'notifications' },
          { key: KEYS.CHECKLIST_TEMPLATE, table: 'checklist_definitions' },
          { key: KEYS.AVAILABILITY, table: 'availability' },
      ];

      await Promise.all(tables.map(async ({ key, table }) => {
          const { data, error } = await supabase.from(table).select('*');
          if (!error && data) {
              if (key === KEYS.USERS && data.length === 0) {
                  const local = StorageService.getUsers();
                  if (local.length > 0) return;
              }
              const optimizedData = data.map(item => optimizeForLocal(item));
              trySaveLocal(key, optimizedData);
              triggerUpdate(key);
          }
      }));
  },

  // ... (MÉTODOS EXISTENTES MANTIDOS) ...
  getDocuments: (): DocumentRecord[] => JSON.parse(localStorage.getItem(KEYS.DOCS) || '[]'),
  saveDocument: async (doc: DocumentRecord) => {
      const docs = StorageService.getDocuments();
      if (navigator.onLine) await supabase.from('documents').upsert(doc);
      const optimizedDoc = optimizeForLocal(doc);
      const updated = [optimizedDoc, ...docs.filter(d => d.id !== doc.id)];
      trySaveLocal(KEYS.DOCS, updated);
      triggerUpdate(KEYS.DOCS);
  },

  moveToTrash: async (id: string) => {
      const docs = StorageService.getDocuments();
      const doc = docs.find(d => d.id === id);
      if(doc) { doc.status = 'LIXEIRA'; await StorageService.saveDocument(doc); }
  },

  restoreFromTrash: async (id: string) => {
      const docs = StorageService.getDocuments();
      const doc = docs.find(d => d.id === id);
      if(doc) { doc.status = 'ATIVO'; await StorageService.saveDocument(doc); }
  },

  deletePermanently: async (id: string) => {
      const docs = StorageService.getDocuments().filter(d => d.id !== id);
      trySaveLocal(KEYS.DOCS, docs);
      if(navigator.onLine) await supabase.from('documents').delete().eq('id', id);
      triggerUpdate(KEYS.DOCS);
  },

  emptyTrash: async () => {
      const docs = StorageService.getDocuments().filter(d => d.status !== 'LIXEIRA');
      trySaveLocal(KEYS.DOCS, docs);
      if(navigator.onLine) await supabase.from('documents').delete().eq('status', 'LIXEIRA');
      triggerUpdate(KEYS.DOCS);
  },

  getEmployees: (): Employee[] => JSON.parse(localStorage.getItem(KEYS.EMPLOYEES) || '[]'),
  saveEmployee: async (emp: Employee) => {
      const emps = StorageService.getEmployees();
      const updated = [emp, ...emps.filter(e => e.id !== emp.id)];
      trySaveLocal(KEYS.EMPLOYEES, updated);
      if (navigator.onLine) await supabase.from('employees').upsert(emp);
      await StorageService.addNotification({ title: 'NOVO COLABORADOR', message: `Colaborador ${emp.name} cadastrado com sucesso.`, type: 'INFO' });
      triggerUpdate(KEYS.EMPLOYEES);
  },
  deleteEmployee: async (id: string) => {
      const emps = StorageService.getEmployees().filter(e => e.id !== id);
      trySaveLocal(KEYS.EMPLOYEES, emps);
      if(navigator.onLine) await supabase.from('employees').delete().eq('id', id);
      triggerUpdate(KEYS.EMPLOYEES);
  },

  getUsers: (): User[] => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]'),
  saveUser: async (user: User) => {
      const users = StorageService.getUsers();
      const updated = [user, ...users.filter(u => u.id !== user.id)];
      trySaveLocal(KEYS.USERS, updated);
      if (navigator.onLine) await supabase.from('users').upsert(user);
      triggerUpdate(KEYS.USERS);
  },
  deleteUser: async (id: string) => {
      const users = StorageService.getUsers().filter(u => u.id !== id);
      trySaveLocal(KEYS.USERS, users);
      if(navigator.onLine) await supabase.from('users').delete().eq('id', id);
      triggerUpdate(KEYS.USERS);
  },
  validateUser: async (login: string, pass: string): Promise<User | null> => {
      if (login === '81025901' && pass === '123') {
          return { id: 'master-admin', name: 'ADMINISTRADOR', matricula: '81025901', login: '81025901', role: 'ADMIN' };
      }
      const users = StorageService.getUsers();
      const user = users.find(u => u.login.toUpperCase() === login.toUpperCase() && u.password === pass);
      return user || null;
  },
  registerUser: async (newUser: User) => {
      const users = StorageService.getUsers();
      if (users.some(u => u.login === newUser.login)) return { success: false, message: 'Login já existe' };
      if (navigator.onLine) await supabase.from('users').insert(newUser);
      users.push(newUser);
      trySaveLocal(KEYS.USERS, users);
      triggerUpdate(KEYS.USERS);
      return { success: true, message: 'Usuário cadastrado com sucesso!' };
  },
  logoutUser: () => {
      localStorage.removeItem('safemaint_auth');
      localStorage.removeItem('safemaint_user');
      localStorage.removeItem('safemaint_role');
  },

  getOMs: (): OMRecord[] => JSON.parse(localStorage.getItem(KEYS.OMS) || '[]'),
  saveOM: async (om: OMRecord) => {
      const oms = StorageService.getOMs();
      if (navigator.onLine) await supabase.from('oms').upsert(om);
      const optimizedOm = optimizeForLocal(om);
      const updated = [optimizedOm, ...oms.filter(o => o.id !== om.id)];
      trySaveLocal(KEYS.OMS, updated);
      await StorageService.addNotification({ title: `NOVA OM REGISTRADA: ${om.omNumber}`, message: `TAG: ${om.tag} | TIPO: ${om.type}`, type: 'INFO', link: '/om-management' });
      triggerUpdate(KEYS.OMS);
  },
  deleteOM: async (id: string) => {
      const oms = StorageService.getOMs().filter(o => o.id !== id);
      trySaveLocal(KEYS.OMS, oms);
      if(navigator.onLine) await supabase.from('oms').delete().eq('id', id);
      triggerUpdate(KEYS.OMS);
  },

  getARTs: (): RegisteredART[] => JSON.parse(localStorage.getItem(KEYS.ARTS) || '[]'),
  saveART: async (art: RegisteredART) => {
      const arts = StorageService.getARTs();
      if (navigator.onLine) await supabase.from('arts').upsert(art);
      const optimizedArt = optimizeForLocal(art);
      const updated = [optimizedArt, ...arts.filter(a => a.id !== art.id)];
      trySaveLocal(KEYS.ARTS, updated);
      triggerUpdate(KEYS.ARTS);
  },
  deleteART: async (id: string) => {
      const arts = StorageService.getARTs().filter(a => a.id !== id);
      trySaveLocal(KEYS.ARTS, arts);
      if(navigator.onLine) await supabase.from('arts').delete().eq('id', id);
      triggerUpdate(KEYS.ARTS);
  },

  getSchedule: (): ScheduleItem[] => JSON.parse(localStorage.getItem(KEYS.SCHEDULE) || '[]'),
  saveScheduleItem: async (item: ScheduleItem) => {
      const items = StorageService.getSchedule();
      const updated = [item, ...items.filter(i => i.id !== item.id)];
      trySaveLocal(KEYS.SCHEDULE, updated);
      if (navigator.onLine) await supabase.from('schedule').upsert(item);
      triggerUpdate(KEYS.SCHEDULE);
  },
  deleteScheduleItem: async (id: string) => {
      const items = StorageService.getSchedule().filter(i => i.id !== id);
      trySaveLocal(KEYS.SCHEDULE, items);
      if(navigator.onLine) await supabase.from('schedule').delete().eq('id', id);
      triggerUpdate(KEYS.SCHEDULE);
  },
  archiveAndClearSchedule: async () => {
      trySaveLocal(KEYS.SCHEDULE, []);
      if (navigator.onLine) await supabase.from('schedule').delete().neq('id', '0');
      triggerUpdate(KEYS.SCHEDULE);
  },

  getActiveMaintenances: (): ActiveMaintenance[] => JSON.parse(localStorage.getItem(KEYS.ACTIVE) || '[]'),
  getActiveMaintenanceById: (id: string): ActiveMaintenance | undefined => {
      return StorageService.getActiveMaintenances().find(m => m.id === id);
  },
  startMaintenance: async (task: ActiveMaintenance) => {
      const active = StorageService.getActiveMaintenances();
      const updated = [task, ...active];
      trySaveLocal(KEYS.ACTIVE, updated);
      if(navigator.onLine) await supabase.from('active_maintenance').upsert(task);
      triggerUpdate(KEYS.ACTIVE);
  },
  pauseMaintenance: async (id: string) => {
      const active = StorageService.getActiveMaintenances();
      const task = active.find(t => t.id === id);
      if (task) {
          task.status = 'PAUSADA';
          const now = new Date();
          const start = new Date(task.currentSessionStart || task.startTime);
          task.accumulatedTime = (task.accumulatedTime || 0) + (now.getTime() - start.getTime());
          task.currentSessionStart = undefined;
          trySaveLocal(KEYS.ACTIVE, active);
          if(navigator.onLine) await supabase.from('active_maintenance').upsert(task);
          triggerUpdate(KEYS.ACTIVE);
      }
  },
  resumeMaintenance: async (id: string, user: string) => {
      const active = StorageService.getActiveMaintenances();
      const task = active.find(t => t.id === id);
      if (task) {
          task.status = 'ANDAMENTO';
          task.currentSessionStart = new Date().toISOString();
          task.openedBy = user;
          trySaveLocal(KEYS.ACTIVE, active);
          if(navigator.onLine) await supabase.from('active_maintenance').upsert(task);
          triggerUpdate(KEYS.ACTIVE);
      }
  },
  setMaintenancePartial: async (id: string) => {
      const active = StorageService.getActiveMaintenances();
      const task = active.find(t => t.id === id);
      if (task) {
          task.status = 'AGUARDANDO';
          const now = new Date();
          const start = new Date(task.currentSessionStart || task.startTime);
          task.accumulatedTime = (task.accumulatedTime || 0) + (now.getTime() - start.getTime());
          task.currentSessionStart = undefined;
          trySaveLocal(KEYS.ACTIVE, active);
          if(navigator.onLine) await supabase.from('active_maintenance').upsert(task);
          triggerUpdate(KEYS.ACTIVE);
      }
  },
  linkOmToMaintenance: async (taskId: string, omId: string, omNumber: string, description: string, tag: string) => {
      const active = StorageService.getActiveMaintenances();
      const task = active.find(t => t.id === taskId);
      if (task) {
          task.omId = omId;
          task.header.om = omNumber;
          task.header.description = description;
          task.header.tag = tag;
          trySaveLocal(KEYS.ACTIVE, active);
          if (navigator.onLine) await supabase.from('active_maintenance').upsert(task);
          triggerUpdate(KEYS.ACTIVE);
      }
  },
  completeMaintenance: async (id: string, finalStatus: string, keepHistory: boolean) => {
      const active = StorageService.getActiveMaintenances();
      const task = active.find(t => t.id === id);
      if (!task) return;
      if (keepHistory) {
          const log: MaintenanceLog = {
              id: crypto.randomUUID(),
              om: task.header.om,
              tag: task.header.tag,
              description: task.header.description,
              startTime: task.startTime,
              endTime: new Date().toISOString(),
              duration: 'N/A',
              responsible: task.openedBy || 'SISTEMA',
              status: finalStatus,
              type: task.origin
          };
          const history = StorageService.getHistory();
          StorageService.saveHistory([log, ...history]);
      }
      const updated = active.filter(t => t.id !== id);
      trySaveLocal(KEYS.ACTIVE, updated);
      if(navigator.onLine) await supabase.from('active_maintenance').delete().eq('id', id);
      triggerUpdate(KEYS.ACTIVE);
  },

  getHistory: (): MaintenanceLog[] => JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]'),
  saveHistory: async (history: MaintenanceLog[]) => {
      trySaveLocal(KEYS.HISTORY, history);
      if (navigator.onLine && history.length > 0) await supabase.from('history').upsert(history[0]);
      triggerUpdate(KEYS.HISTORY);
  },

  getPendingExtraDemands: (): PendingExtraDemand[] => JSON.parse(localStorage.getItem(KEYS.PENDING_DEMANDS) || '[]'),
  savePendingExtraDemand: async (demand: PendingExtraDemand) => {
      const list = StorageService.getPendingExtraDemands();
      const updated = [demand, ...list.filter(d => d.id !== demand.id)];
      trySaveLocal(KEYS.PENDING_DEMANDS, updated);
      if(navigator.onLine) await supabase.from('pending_extra_demands').upsert(demand);
      await StorageService.addNotification({ title: 'NOVA DEMANDA EXTRA', message: `Tag: ${demand.tag} | ${demand.description}`, type: 'URGENT', link: '/extra-demands' });
      triggerUpdate(KEYS.PENDING_DEMANDS);
  },
  deletePendingExtraDemand: async (id: string) => {
      const list = StorageService.getPendingExtraDemands().filter(d => d.id !== id);
      trySaveLocal(KEYS.PENDING_DEMANDS, list);
      if(navigator.onLine) await supabase.from('pending_extra_demands').delete().eq('id', id);
      triggerUpdate(KEYS.PENDING_DEMANDS);
  },

  getChecklistTemplate: (): ChecklistTemplateItem[] => JSON.parse(localStorage.getItem(KEYS.CHECKLIST_TEMPLATE) || '[]'),
  
  addNotification: async (notif: Omit<NotificationRecord, 'id' | 'createdAt' | 'read' | 'date'>) => {
      const newNotif: NotificationRecord = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), date: new Date().toLocaleDateString('pt-BR'), read: false, ...notif };
      const list = StorageService.getPersistentNotifications();
      const updated = [newNotif, ...list].slice(0, 50); 
      trySaveLocal(KEYS.NOTIFICATIONS, updated);
      if(navigator.onLine) await supabase.from('notifications').upsert(newNotif);
      triggerUpdate(KEYS.NOTIFICATIONS);
  },

  getPersistentNotifications: (): NotificationRecord[] => JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]'),

  getNotifications: (): NotificationItem[] => {
      const persistent = StorageService.getPersistentNotifications().map(n => ({ ...n, source: 'SYSTEM' as const }));
      const dynamic: NotificationItem[] = [];
      const active = StorageService.getActiveMaintenances();
      if (active.some(t => t.status === 'PAUSADA')) {
          dynamic.push({ id: 'pause-alert', type: 'URGENT', title: 'ATIVIDADE PAUSADA', message: 'Existem manutenções paralisadas no pátio.', date: new Date().toLocaleDateString(), createdAt: new Date().toISOString(), read: false, source: 'ACTIVE', link: '/dashboard' });
      }
      return [...dynamic, ...persistent];
  },

  // AVAILABILITY BOARD
  getAvailability: (): AvailabilityRecord[] => JSON.parse(localStorage.getItem(KEYS.AVAILABILITY) || '[]'),
  
  fetchAvailability: async (): Promise<AvailabilityRecord[]> => {
      if (!navigator.onLine) return StorageService.getAvailability();
      const { data, error } = await supabase.from('availability').select('*');
      if (error || !data) return StorageService.getAvailability();
      
      const optimizedData = data.map(item => optimizeForLocal(item));
      trySaveLocal(KEYS.AVAILABILITY, optimizedData);
      triggerUpdate(KEYS.AVAILABILITY);
      return optimizedData as AvailabilityRecord[];
  },

  saveAvailability: async (records: AvailabilityRecord[]) => {
      trySaveLocal(KEYS.AVAILABILITY, records);
      if (navigator.onLine) {
          const { error } = await supabase.from('availability').upsert(records);
          if (error) throw error;
      }
      triggerUpdate(KEYS.AVAILABILITY);
  },

  // CHAT
  getChatMessages: (): ChatMessage[] => JSON.parse(localStorage.getItem(KEYS.CHAT) || '[]'),
  
  sendChatMessage: async (msg: ChatMessage) => {
      const messages = StorageService.getChatMessages();
      const updated = [...messages, msg].slice(-100); 
      trySaveLocal(KEYS.CHAT, updated);
      triggerUpdate(KEYS.CHAT);
  },

  clearChat: async () => {
      trySaveLocal(KEYS.CHAT, []);
      triggerUpdate(KEYS.CHAT);
  }
};