
import { DocumentRecord, Employee, RegisteredART, User, ScheduleItem, ActiveMaintenance, MaintenanceLog, ChatMessage, OMRecord, ChecklistTemplateItem, AvailabilityRecord, AvailabilityStatus } from '../types';
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
  CHECKLIST_TEMPLATE: 'safemaint_checklist_template',
  AVAILABILITY: 'safemaint_availability', 
  SYNC_QUEUE: 'safemaint_sync_queue',
  USERS: 'safemaint_users'
};

const triggerUpdate = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('safemaint_storage_update'));
    }
};

const trySaveLocal = (key: string, data: any, stripFields: string[] = []) => {
    try {
        let cleanData = data;
        if (stripFields.length > 0 && Array.isArray(data)) {
            cleanData = data.map(item => {
                const copy = { ...item };
                stripFields.forEach(f => delete copy[f]);
                return copy;
            });
        }
        localStorage.setItem(key, JSON.stringify(cleanData));
    } catch (e) {
        console.error('[STORAGE] Erro de espaço.', e);
    }
};

// CHECKLIST MESTRE - EXATAMENTE CONFORME PDF FORNECIDO (33 ITENS)
const DEFAULT_CHECKLIST: ChecklistTemplateItem[] = [
    { id: '1', legacyId: 1, section: 'MOTOR', description: 'VAZAMENTO DE ÓLEO EM GERAL E PRÓXIMO A PARTES QUENTES' },
    { id: '2', legacyId: 2, section: 'MOTOR', description: 'VAZAMENTO LÍQUIDO DE ARREFECIMENTO' },
    { id: '3', legacyId: 3, section: 'MOTOR', description: 'INTERFERÊNCIAS ENTRE TUBOS, MANGUEIRAS E CABOS' },
    { id: '4', legacyId: 4, section: 'MOTOR', description: 'NÍVEL DE ÓLEO' },
    { id: '5', legacyId: 5, section: 'SISTEMA HIDRÁULICO', description: 'VAZAMENTO DO ÓLEO' },
    { id: '6', legacyId: 6, section: 'SISTEMA HIDRÁULICO', description: 'NÍVEL DE ÓLEO' },
    { id: '7', legacyId: 7, section: 'SISTEMA HIDRÁULICO', description: 'ABRAÇADEIRAS DE FIXAÇÃO' },
    { id: '8', legacyId: 8, section: 'SISTEMA HIDRÁULICO', description: 'INTERFERÊNCIAS ENTRE TUBOS, MANGUEIRAS E CABOS' },
    { id: '9', legacyId: 9, section: 'TRANSMISSÃO', description: 'VAZAMENTO DO ÓLEO' },
    { id: '10', legacyId: 10, section: 'TRANSMISSÃO', description: 'PARAFUSOS FOLGADOS' },
    { id: '11', legacyId: 11, section: 'TRANSMISSÃO', description: 'ABRAÇADEIRAS DE FIXAÇÃO' },
    { id: '12', legacyId: 12, section: 'TRANSMISSÃO', description: 'INTERFERÊNCIAS ENTRE TUBOS, MANGUEIRAS E CABOS' },
    { id: '13', legacyId: 13, section: 'TRANSMISSÃO', description: 'PROTEÇÃO DO CARDAN' },
    { id: '14', legacyId: 14, section: 'DIFERENCIAL', description: 'BUJÃO DE DRENO DO DIFERENCIAL (FIXAÇÃO)' },
    { id: '15', legacyId: 15, section: 'COMANDO FINAL', description: 'BUJÃO DE DRENO E INSPEÇÃO COMANDO DIREITO (FIXAÇÃO)' },
    { id: '16', legacyId: 16, section: 'COMANDO FINAL', description: 'BUJÃO DE DRENO E INSPEÇÃO COMANDO ESQUERDO (FIXAÇÃO)' },
    { id: '17', legacyId: 17, section: 'CONVERSOR', description: 'NÍVEL DE ÓLEO DO CONVERSOR E TRANSMISSÃO' },
    { id: '18', legacyId: 18, section: 'SISTEMA DE DIREÇÃO', description: 'VAZAMENTO DE ÓLEO' },
    { id: '19', legacyId: 19, section: 'SISTEMA DE DIREÇÃO', description: 'NÍVEL DE ÓLEO' },
    { id: '20', legacyId: 20, section: 'SISTEMA DE DIREÇÃO', description: 'PARAFUSOS/PINOS FOLGADOS' },
    { id: '21', legacyId: 21, section: 'SISTEMA DE DIREÇÃO', description: 'ABRAÇADEIRAS DE FIXAÇÃO' },
    { id: '22', legacyId: 22, section: 'SISTEMA DE DIREÇÃO', description: 'INTERFERÊNCIAS ENTRE TUBOS, MANGUEIRAS E CABOS' },
    { id: '23', legacyId: 23, section: 'ILUMINAÇÃO, AR CONDICIONADO', description: 'FAROL DE ALTA E BAIXA' },
    { id: '24', legacyId: 24, section: 'ILUMINAÇÃO, AR CONDICIONADO', description: 'SETAS' },
    { id: '25', legacyId: 25, section: 'ILUMINAÇÃO, AR CONDICIONADO', description: 'BUZINA' },
    { id: '26', legacyId: 26, section: 'ILUMINAÇÃO, AR CONDICIONADO', description: 'AR CONDICIONADO' },
    { id: '27', legacyId: 27, section: 'ESCADAS, CORRIMÃO, GUARDA CORPO', description: 'ESCADAS (PRINCIPAL E DE EMERGÊNCIA)' },
    { id: '28', legacyId: 28, section: 'ESCADAS, CORRIMÃO, GUARDA CORPO', description: 'GUARDA CORPO (PLATAFORMA)' },
    { id: '29', legacyId: 29, section: 'ESCADAS, CORRIMÃO, GUARDA CORPO', description: 'TAGS LATERAIS E TRASEIRO' },
    { id: '30', legacyId: 30, section: 'ESCADAS, CORRIMÃO, GUARDA CORPO', description: 'CORRIMÃO DAS ESCADAS' },
    { id: '31', legacyId: 31, section: 'LIMPEZA E ORGANIZAÇÃO', description: 'CABINE' },
    { id: '32', legacyId: 32, section: 'LIMPEZA E ORGANIZAÇÃO', description: 'PLATAFORMA' },
    { id: '33', legacyId: 33, section: 'LIMPEZA E ORGANIZAÇÃO', description: 'ESCADAS E CORRIMÕES' },
    { id: '34', legacyId: 34, section: 'LIMPEZA E ORGANIZAÇÃO', description: 'RETROVISORES' }
];

export const StorageService = {
  initialSync: async () => {
      const tables = [
          { local: KEYS.DOCS, remote: 'documents', strip: ['manualFileUrl'] },
          { local: KEYS.EMPLOYEES, remote: 'employees' },
          { local: KEYS.OMS, remote: 'oms', strip: [] }, // MANTÉM PDFUrl
          { local: KEYS.ARTS, remote: 'arts', strip: [] }, // MANTÉM PDFUrl
          { local: KEYS.SCHEDULE, remote: 'schedule' },
          { local: KEYS.HISTORY, remote: 'history' },
          { local: KEYS.ACTIVE, remote: 'active_maintenance' },
          { local: KEYS.USERS, remote: 'users' },
          { local: KEYS.CHECKLIST_TEMPLATE, remote: 'checklist_definitions' },
          { local: KEYS.AVAILABILITY, remote: 'availability' }
      ];

      for (const t of tables) {
          try {
              const { data, error } = await supabase.from(t.remote).select('*');
              if (!error && data) {
                  const localData = JSON.parse(localStorage.getItem(t.local) || '[]');
                  const merged = [...data];
                  localData.forEach((lItem: any) => {
                      if (!merged.find((mItem: any) => mItem.id === lItem.id)) {
                          merged.push(lItem);
                      }
                  });
                  trySaveLocal(t.local, merged, t.strip || []);
                  if (t.local === KEYS.CHECKLIST_TEMPLATE && merged.length === 0) {
                      trySaveLocal(KEYS.CHECKLIST_TEMPLATE, DEFAULT_CHECKLIST);
                  }
              }
          } catch (e) {
              console.error(`Erro ao sincronizar ${t.remote}:`, e);
          }
      }
      triggerUpdate();
  },

  getPendingSyncCount: () => 0,

  validateUser: async (login: string, pass: string): Promise<User | null> => {
      const { data } = await supabase.from('users').select('*').eq('login', login.toUpperCase()).eq('password', pass).single();
      if (data) return data as User;
      const localUsers = StorageService.getUsers();
      return localUsers.find(u => u.login === login.toUpperCase() && u.password === pass) || null;
  },

  getUsers: (): User[] => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]'),
  saveUser: async (user: User) => {
      const list = StorageService.getUsers();
      const idx = list.findIndex(u => u.id === user.id);
      if(idx > -1) list[idx] = user; else list.push(user);
      trySaveLocal(KEYS.USERS, list);
      await supabase.from('users').upsert(user);
      triggerUpdate();
  },
  deleteUser: async (id: string) => {
      const list = StorageService.getUsers().filter(u => u.id !== id);
      trySaveLocal(KEYS.USERS, list);
      await supabase.from('users').delete().eq('id', id);
      triggerUpdate();
  },

  getEmployees: (): Employee[] => JSON.parse(localStorage.getItem(KEYS.EMPLOYEES) || '[]'),
  saveEmployee: async (emp: Employee) => {
      const list = StorageService.getEmployees();
      const idx = list.findIndex(e => e.id === emp.id);
      if(idx > -1) list[idx] = emp; else list.push(emp);
      trySaveLocal(KEYS.EMPLOYEES, list);
      await supabase.from('employees').upsert(emp);
      triggerUpdate();
  },
  deleteEmployee: async (id: string) => {
      const list = StorageService.getEmployees().filter(e => e.id !== id);
      trySaveLocal(KEYS.EMPLOYEES, list);
      await supabase.from('employees').delete().eq('id', id);
      triggerUpdate();
  },

  getSchedule: (): ScheduleItem[] => JSON.parse(localStorage.getItem(KEYS.SCHEDULE) || '[]'),
  saveScheduleItem: async (item: ScheduleItem) => {
      const list = StorageService.getSchedule();
      list.push(item);
      trySaveLocal(KEYS.SCHEDULE, list);
      await supabase.from('schedule').upsert(item);
      triggerUpdate();
  },
  deleteScheduleItem: async (id: string) => {
      const list = StorageService.getSchedule().filter(i => i.id !== id);
      trySaveLocal(KEYS.SCHEDULE, list);
      await supabase.from('schedule').delete().eq('id', id);
      triggerUpdate();
  },
  archiveAndClearSchedule: async () => {
    localStorage.setItem(KEYS.SCHEDULE, '[]');
    await supabase.from('schedule').delete().neq('id', '0');
    triggerUpdate();
  },

  getOMs: (): OMRecord[] => JSON.parse(localStorage.getItem(KEYS.OMS) || '[]'),
  saveOM: async (om: OMRecord) => {
    const list = StorageService.getOMs();
    const idx = list.findIndex(o => o.id === om.id);
    if (idx > -1) list[idx] = om; else list.push(om);
    trySaveLocal(KEYS.OMS, list, []); // REMOVIDO 'pdfUrl' do strip
    await supabase.from('oms').upsert(om);
    triggerUpdate();
  },
  updateOMStatus: async (id: string, status: any) => {
      const list = StorageService.getOMs();
      const om = list.find(o => o.id === id);
      if (om) {
          om.status = status;
          trySaveLocal(KEYS.OMS, list, []);
          await supabase.from('oms').update({ status }).eq('id', id);
          triggerUpdate();
      }
  },
  deleteOM: async (id: string) => {
    const list = StorageService.getOMs().filter(o => o.id !== id);
    trySaveLocal(KEYS.OMS, list, []);
    await supabase.from('oms').delete().eq('id', id);
    triggerUpdate();
  },

  getARTs: (): RegisteredART[] => JSON.parse(localStorage.getItem(KEYS.ARTS) || '[]'),
  saveART: async (art: RegisteredART) => {
    const list = StorageService.getARTs();
    const idx = list.findIndex(a => a.id === art.id);
    if (idx > -1) list[idx] = art; else list.push(art);
    trySaveLocal(KEYS.ARTS, list, []); // REMOVIDO 'pdfUrl' do strip
    await supabase.from('arts').upsert(art);
    triggerUpdate();
  },
  deleteART: async (id: string) => {
      const list = StorageService.getARTs().filter(a => a.id !== id);
      trySaveLocal(KEYS.ARTS, list, []);
      await supabase.from('arts').delete().eq('id', id);
      triggerUpdate();
  },

  getChecklistTemplate: (): ChecklistTemplateItem[] => {
      const data = JSON.parse(localStorage.getItem(KEYS.CHECKLIST_TEMPLATE) || '[]');
      return data.length > 0 ? data : DEFAULT_CHECKLIST;
  },

  getActiveMaintenances: (): ActiveMaintenance[] => JSON.parse(localStorage.getItem(KEYS.ACTIVE) || '[]'),
  getActiveMaintenanceById: (id: string) => StorageService.getActiveMaintenances().find(m => m.id === id),
  startMaintenance: async (task: ActiveMaintenance) => {
    const tasks = StorageService.getActiveMaintenances();
    tasks.push(task);
    trySaveLocal(KEYS.ACTIVE, tasks);
    await supabase.from('active_maintenance').upsert(task);
    if (task.omId) await StorageService.updateOMStatus(task.omId, 'EM_ANDAMENTO');
    triggerUpdate();
  },
  resumeMaintenance: async (id: string) => {
      const tasks = StorageService.getActiveMaintenances();
      const task = tasks.find(t => t.id === id);
      if (task && task.status !== 'ANDAMENTO') {
          task.status = 'ANDAMENTO';
          task.currentSessionStart = new Date().toISOString();
          trySaveLocal(KEYS.ACTIVE, tasks);
          await supabase.from('active_maintenance').upsert(task);
          triggerUpdate();
      }
  },
  pauseMaintenance: async (id: string) => {
      const tasks = StorageService.getActiveMaintenances();
      const task = tasks.find(t => t.id === id);
      if (task && task.status === 'ANDAMENTO' && task.currentSessionStart) {
          const now = new Date().getTime();
          const start = new Date(task.currentSessionStart).getTime();
          task.accumulatedTime = (task.accumulatedTime || 0) + (now - start);
          task.status = 'PAUSADA';
          task.currentSessionStart = undefined;
          trySaveLocal(KEYS.ACTIVE, tasks);
          await supabase.from('active_maintenance').upsert(task);
          triggerUpdate();
      }
  },
  setMaintenancePartial: async (id: string) => {
      await StorageService.completeMaintenance(id, 'PARCIAL', false);
  },
  completeMaintenance: async (id: string, statusText: string, closeOM: boolean) => {
      const tasks = StorageService.getActiveMaintenances();
      const task = tasks.find(t => t.id === id);
      if (task) {
          const log: MaintenanceLog = {
              id: crypto.randomUUID(), om: task.header.om, tag: task.header.tag,
              description: task.header.description, startTime: task.startTime,
              endTime: new Date().toISOString(), duration: 'CONCLUÍDO',
              responsible: task.openedBy || 'SISTEMA', status: statusText,
              type: task.origin // SALVA A ORIGEM (CORRETIVA OU PREVENTIVA) NO LOG
          };
          const history = StorageService.getHistory();
          history.push(log);
          trySaveLocal(KEYS.HISTORY, history);
          await supabase.from('history').upsert(log);
          const newTasks = tasks.filter(t => t.id !== id);
          trySaveLocal(KEYS.ACTIVE, newTasks);
          await supabase.from('active_maintenance').delete().eq('id', id);
          if (closeOM && task.omId) await StorageService.updateOMStatus(task.omId, 'CONCLUIDA');
          triggerUpdate();
      }
  },

  getHistory: (): MaintenanceLog[] => JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]'),
  getDocuments: (): DocumentRecord[] => JSON.parse(localStorage.getItem(KEYS.DOCS) || '[]'),
  saveDocument: async (doc: DocumentRecord) => {
      const list = StorageService.getDocuments();
      list.push(doc);
      trySaveLocal(KEYS.DOCS, list, ['manualFileUrl']);
      await supabase.from('documents').upsert(doc);
      triggerUpdate();
  },
  moveManyToTrash: async (ids: string[]) => {
      const docs = StorageService.getDocuments();
      docs.forEach(d => { if (ids.includes(d.id)) d.status = 'LIXEIRA'; });
      trySaveLocal(KEYS.DOCS, docs);
      await supabase.from('documents').update({ status: 'LIXEIRA' }).in('id', ids);
      triggerUpdate();
  },
  restoreFromTrash: async (id: string) => {
      const docs = StorageService.getDocuments();
      const doc = docs.find(d => d.id === id);
      if (doc) {
          doc.status = 'ATIVO';
          trySaveLocal(KEYS.DOCS, docs);
          await supabase.from('documents').update({ status: 'ATIVO' }).eq('id', id);
          triggerUpdate();
      }
  },
  deletePermanently: async (id: string) => {
      const docs = StorageService.getDocuments().filter(d => d.id !== id);
      trySaveLocal(KEYS.DOCS, docs);
      await supabase.from('documents').delete().eq('id', id);
      triggerUpdate();
  },
  emptyTrash: async () => {
      const allDocs = StorageService.getDocuments();
      const trashIds = allDocs.filter(d => d.status === 'LIXEIRA').map(d => d.id);
      const remaining = allDocs.filter(d => d.status !== 'LIXEIRA');
      trySaveLocal(KEYS.DOCS, remaining);
      if (trashIds.length > 0) {
          await supabase.from('documents').delete().in('id', trashIds);
      }
      triggerUpdate();
  },
  getNotifications: (): NotificationItem[] => {
      const oms = StorageService.getOMs();
      return oms.filter(o => o.status === 'PENDENTE').map(o => ({
          id: o.id, type: o.type === 'CORRETIVA' ? 'URGENT' : 'INFO',
          title: `OM: ${o.omNumber}`, message: `${o.tag} - ${o.description}`, date: new Date(o.createdAt).toLocaleDateString()
      }));
  },
  getAvailability: (): AvailabilityRecord[] => JSON.parse(localStorage.getItem(KEYS.AVAILABILITY) || '[]'),
  saveAvailability: async (recs: AvailabilityRecord[]) => {
      trySaveLocal(KEYS.AVAILABILITY, recs);
      await supabase.from('availability').upsert(recs);
      triggerUpdate();
  },
  moveToTrash: async (id: string) => {
      const docs = StorageService.getDocuments();
      const doc = docs.find(d => d.id === id);
      if (doc) { doc.status = 'LIXEIRA'; trySaveLocal(KEYS.DOCS, docs); await supabase.from('documents').update({ status: 'LIXEIRA' }).eq('id', id); triggerUpdate(); }
  },
  getChatMessages: (): ChatMessage[] => JSON.parse(localStorage.getItem(KEYS.CHAT) || '[]'),
  sendChatMessage: (msg: ChatMessage) => {
      const list = StorageService.getChatMessages();
      list.push(msg);
      trySaveLocal(KEYS.CHAT, list);
      window.dispatchEvent(new Event('safemaint_chat_update'));
  },
  clearChat: () => {
      localStorage.setItem(KEYS.CHAT, '[]');
      window.dispatchEvent(new Event('safemaint_chat_update'));
  },
  runRetentionPolicy: () => {}
};
