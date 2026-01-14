
// FIX: Add AvailabilityRecord to import for new feature
import { DocumentRecord, Employee, RegisteredART, User, ScheduleItem, ActiveMaintenance, MaintenanceLog, ChatMessage, OMRecord, ChecklistTemplateItem, PendingExtraDemand, AvailabilityRecord } from '../types';
import { supabase } from './supabase';

export interface NotificationItem {
    id: string;
    type: 'URGENT' | 'INFO' | 'SCHEDULE' | 'ACTIVE';
    title: string;
    message: string;
    date: string;
    source?: 'OM' | 'DEMAND' | 'SCHEDULE' | 'ACTIVE'; // Added types
    link?: string;
}

export const KEYS = {
  DOCS: 'safemaint_docs',
  EMPLOYEES: 'safemaint_employees',
  ARTS: 'safemaint_arts',
  SCHEDULE: 'safemaint_schedule',
  ACTIVE: 'safemaint_active_tasks',
  HISTORY: 'safemaint_history',
  CHAT: 'safemaint_chat_history',
  OMS: 'safemaint_oms',
  CHECKLIST_TEMPLATE: 'safemaint_checklist_template',
  USERS: 'safemaint_users',
  PENDING_DEMANDS: 'safemaint_pending_demands',
  // FIX: Add AVAILABILITY key for new feature
  AVAILABILITY: 'safemaint_availability'
};

// MODIFICADO: Dispara CustomEvent com a chave que mudou para controle fino na UI
const triggerUpdate = (changedKey?: string) => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('safemaint_storage_update', { detail: { key: changedKey } }));
    }
};

const trySaveLocal = (key: string, data: any, stripFields: string[] = []) => {
    try {
        let cleanData = data;
        // Se houver campos para remover (como pdfUrl), substitui por marcador 'TRUE' para manter a flag na UI
        if (Array.isArray(data)) {
            cleanData = data.map(item => {
                const copy = { ...item };
                
                // 1. Generic strip (replace with TRUE to keep flag)
                if (stripFields.length > 0) {
                    stripFields.forEach(f => {
                        if (copy[f]) copy[f] = 'TRUE'; 
                    });
                }

                // 2. Special handling for DOCS content (Deep Strip)
                if (key === KEYS.DOCS && copy.content?.manualFileUrl) {
                    copy.content = { ...copy.content, manualFileUrl: 'TRUE' };
                }

                return copy;
            });
        }
        localStorage.setItem(key, JSON.stringify(cleanData));
    } catch (e) {
        console.error(`[STORAGE] Erro de cota ao salvar ${key}.`, e);
        try {
             if (Array.isArray(data)) localStorage.setItem(key, '[]');
        } catch (e2) { console.error("Falha crítica no storage", e2); }
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
    { id: '23', legacyId: 23, section: 'ILUMINAÇÃO, AR CONDICIONADO', 'description': 'FAROL DE ALTA E BAIXA' },
    { id: '24', legacyId: 24, section: 'ILUMINAÇÃO, AR CONDICIONADO', 'description': 'SETAS' },
    { id: '25', legacyId: 25, section: 'ILUMINAÇÃO, AR CONDICIONADO', 'description': 'BUZINA' },
    { id: '26', legacyId: 26, section: 'ILUMINAÇÃO, AR CONDICIONADO', 'description': 'AR CONDICIONADO' },
    { id: '27', legacyId: 27, section: 'ESCADAS, CORRIMÃO, GUARDA CORPO', 'description': 'ESCADAS (PRINCIPAL E DE EMERGÊNCIA)' },
    { id: '28', legacyId: 28, section: 'ESCADAS, CORRIMÃO, GUARDA CORPO', 'description': 'GUARDA CORPO (PLATAFORMA)' },
    { id: '29', legacyId: 29, section: 'ESCADAS, CORRIMÃO, GUARDA CORPO', 'description': 'TAGS LATERAIS E TRASEIRO' },
    { id: '30', legacyId: 30, section: 'ESCADAS, CORRIMÃO, GUARDA CORPO', 'description': 'CORRIMÃO DAS ESCADAS' },
    { id: '31', legacyId: 31, section: 'LIMPEZA E ORGANIZAÇÃO', 'description': 'CABINE' },
    { id: '32', legacyId: 32, section: 'LIMPEZA E ORGANIZAÇÃO', 'description': 'PLATAFORMA' },
    { id: '33', legacyId: 33, section: 'LIMPEZA E ORGANIZAÇÃO', 'description': 'ESCADAS E CORRIMÕES' },
    { id: '34', legacyId: 34, section: 'LIMPEZA E ORGANIZAÇÃO', 'description': 'RETROVISORES' }
];

export const StorageService = {
  // RECUPERAÇÃO DE PDF SOB DEMANDA (Evita LocalStorage Cheio)
  getRecordPdf: async (table: 'oms' | 'arts' | 'documents', id: string): Promise<string | null> => {
      if (!navigator.onLine) return null;
      try {
          const col = table === 'documents' ? 'content' : 'pdfUrl';
          const { data, error } = await supabase.from(table).select(col).eq('id', id).single();
          if (error || !data) return null;
          if (table === 'documents') return data.content?.manualFileUrl || null;
          return data.pdfUrl;
      } catch (e) { 
          console.error("Erro ao baixar PDF:", e);
          return null; 
      }
  },

  setupSubscriptions: () => {
    if (typeof window === 'undefined') return;
    supabase.removeAllChannels();
    console.log('SAFEMAINT REALTIME: Iniciando subscrição em canal único...');

    const tablesToSubscribe = [
      { key: KEYS.OMS, table: 'oms', strip: ['pdfUrl'] },
      { key: KEYS.ARTS, table: 'arts', strip: ['pdfUrl'] },
      { key: KEYS.SCHEDULE, table: 'schedule', strip: [] },
      { key: KEYS.ACTIVE, table: 'active_maintenance', strip: [] },
      { key: KEYS.DOCS, table: 'documents', strip: [] },
      { key: KEYS.EMPLOYEES, table: 'employees', strip: [] },
      { key: KEYS.USERS, table: 'users', strip: [] },
      { key: KEYS.HISTORY, table: 'history', strip: [] },
      { key: KEYS.CHAT, table: 'chat_messages', strip: [] },
      { key: KEYS.PENDING_DEMANDS, table: 'pending_extra_demands', strip: [] },
      { key: KEYS.CHECKLIST_TEMPLATE, table: 'checklist_definitions', strip: [] },
      { key: KEYS.AVAILABILITY, table: 'availability', strip: [] },
    ];
    
    const channel = supabase.channel('safemaint-global-updates');

    const processPayload = (payload: any, config: any) => {
        if (config.key === KEYS.CHAT) {
            let list = JSON.parse(localStorage.getItem(KEYS.CHAT) || '[]');
            if (payload.eventType === 'INSERT') {
                if (!list.some((m: any) => m.id === (payload.new as any).id)) list.push(payload.new);
            } else if (payload.eventType === 'DELETE') {
                const idToDelete = (payload.old as any)?.id;
                list = list.filter((m: any) => m.id !== idToDelete);
            }
            localStorage.setItem(KEYS.CHAT, JSON.stringify(list));
            window.dispatchEvent(new Event('safemaint_chat_update'));
            return;
        }

        let localList = JSON.parse(localStorage.getItem(config.key) || '[]');

        if (payload.eventType === 'DELETE') {
            const idToDelete = (payload.old as any)?.id;
            if (idToDelete) localList = localList.filter((item: any) => item.id !== idToDelete);
        } else if (payload.eventType === 'INSERT') {
            if (!localList.some((item: any) => item.id === (payload.new as any).id)) localList.push(payload.new);
        } else if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new as any;
            const idx = localList.findIndex((i: any) => i.id === updatedItem.id);
            if (idx > -1) localList[idx] = updatedItem; 
            else localList.push(updatedItem);
        }

        trySaveLocal(config.key, localList, config.strip);
        triggerUpdate(config.key);
    };

    tablesToSubscribe.forEach(config => {
        channel.on('postgres_changes', { event: '*', schema: 'public', table: config.table }, (payload) => processPayload(payload, config));
    });
      
    channel.subscribe();
  },

  initialSync: async () => {
      if (!navigator.onLine) return;
      const tables = [
          { local: KEYS.DOCS, remote: 'documents', strip: ['manualFileUrl'] },
          { local: KEYS.EMPLOYEES, remote: 'employees' },
          { local: KEYS.OMS, remote: 'oms', strip: ['pdfUrl'] },
          { local: KEYS.ARTS, remote: 'arts', strip: ['pdfUrl'] },
          { local: KEYS.SCHEDULE, remote: 'schedule' },
          { local: KEYS.HISTORY, remote: 'history' },
          { local: KEYS.ACTIVE, remote: 'active_maintenance' },
          { local: KEYS.USERS, remote: 'users' },
          { local: KEYS.CHECKLIST_TEMPLATE, remote: 'checklist_definitions' },
          { local: KEYS.CHAT, remote: 'chat_messages' },
          { local: KEYS.PENDING_DEMANDS, remote: 'pending_extra_demands' },
          { local: KEYS.AVAILABILITY, remote: 'availability' },
      ];

      for (const t of tables) {
          try {
              const { data, error } = await supabase.from(t.remote).select('*');
              if (!error && data) {
                  const localData = JSON.parse(localStorage.getItem(t.local) || '[]');
                  const remoteIds = new Set(data.map((item: any) => item.id));
                  const merged = [...data];
                  localData.forEach((lItem: any) => {
                      if (!remoteIds.has(lItem.id) && t.local === KEYS.ACTIVE) merged.push(lItem);
                  });
                  trySaveLocal(t.local, merged, t.strip || []);
                  if (t.local === KEYS.CHECKLIST_TEMPLATE && merged.length === 0) trySaveLocal(KEYS.CHECKLIST_TEMPLATE, DEFAULT_CHECKLIST);
              }
          } catch (e) { console.warn(`[SYNC] Falha leve ao sincronizar ${t.remote}`, e); }
      }
      triggerUpdate();
  },

  validateUser: async (login: string, pass: string): Promise<User | null> => {
      try {
          if (navigator.onLine) {
              const { data, error } = await supabase.from('users').select('*').eq('login', login.toUpperCase()).eq('password', pass).single();
              if (!error && data) {
                  if (data.is_active_session) throw new Error("ALREADY_LOGGED_IN");
                  await supabase.from('users').update({ is_active_session: true }).eq('id', data.id);
                  StorageService.saveUser(data); 
                  return data as User;
              }
              if (!data) {
                  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
                  if (count === 0 && login.toUpperCase() === '81025901' && pass === '123') {
                      const defaultAdmin: User = { id: 'default-admin', name: 'ADMINISTRADOR', matricula: '81025901', login: '81025901', password: '123', role: 'ADMIN' };
                      await supabase.from('users').insert(defaultAdmin);
                      return defaultAdmin;
                  }
              }
          }
      } catch (e: any) { if (e.message === "ALREADY_LOGGED_IN") throw e; }
      const localUsers = StorageService.getUsers();
      return localUsers.find(u => u.login === login.toUpperCase() && u.password === pass) || null;
  },

  logoutUser: async (login: string) => {
      if (navigator.onLine && login) {
          try { await supabase.from('users').update({ is_active_session: false }).eq('login', login.toUpperCase()); } catch(e) {}
      }
  },

  registerUser: async (newUser: User): Promise<{ success: boolean; message: string }> => {
        if (!newUser.login || !newUser.password || !newUser.matricula || !newUser.name) return { success: false, message: 'Preencha todos os campos obrigatórios.' };
        if (navigator.onLine) {
            try {
                const { data } = await supabase.from('users').select('id').or(`login.eq.${newUser.login},matricula.eq.${newUser.matricula}`);
                if (data && data.length > 0) return { success: false, message: 'Usuário ou Matrícula já cadastrados no sistema.' };
            } catch (e) {}
        }
        await StorageService.saveUser(newUser);
        return { success: true, message: 'Cadastro realizado com sucesso!' };
  },

  getUsers: (): User[] => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]'),
  saveUser: async (user: User) => {
      const users = StorageService.getUsers();
      const idx = users.findIndex(u => u.id === user.id);
      if (idx >= 0) users[idx] = user; else users.push(user);
      trySaveLocal(KEYS.USERS, users);
      if (navigator.onLine) await supabase.from('users').upsert(user);
      triggerUpdate(KEYS.USERS);
  },
  deleteUser: async (id: string) => {
      const users = StorageService.getUsers().filter(u => u.id !== id);
      trySaveLocal(KEYS.USERS, users);
      if (navigator.onLine) await supabase.from('users').delete().eq('id', id);
      triggerUpdate(KEYS.USERS);
  },

  getEmployees: (): Employee[] => JSON.parse(localStorage.getItem(KEYS.EMPLOYEES) || '[]'),
  saveEmployee: async (emp: Employee) => {
      const list = StorageService.getEmployees();
      const idx = list.findIndex(e => e.id === emp.id);
      if (idx >= 0) list[idx] = emp; else list.push(emp);
      trySaveLocal(KEYS.EMPLOYEES, list);
      if (navigator.onLine) await supabase.from('employees').upsert(emp);
      triggerUpdate(KEYS.EMPLOYEES);
  },
  deleteEmployee: async (id: string) => {
      const list = StorageService.getEmployees().filter(e => e.id !== id);
      trySaveLocal(KEYS.EMPLOYEES, list);
      if (navigator.onLine) await supabase.from('employees').delete().eq('id', id);
      triggerUpdate(KEYS.EMPLOYEES);
  },

  getOMs: (): OMRecord[] => JSON.parse(localStorage.getItem(KEYS.OMS) || '[]'),
  saveOM: async (om: OMRecord) => {
      const list = StorageService.getOMs();
      const idx = list.findIndex(o => o.id === om.id);
      if (idx >= 0) list[idx] = om; else list.push(om);
      trySaveLocal(KEYS.OMS, list, ['pdfUrl']);
      if (navigator.onLine) await supabase.from('oms').upsert(om);
      triggerUpdate(KEYS.OMS);
  },
  deleteOM: async (id: string) => {
      const list = StorageService.getOMs().filter(o => o.id !== id);
      trySaveLocal(KEYS.OMS, list, ['pdfUrl']);
      if (navigator.onLine) await supabase.from('oms').delete().eq('id', id);
      triggerUpdate(KEYS.OMS);
  },

  getARTs: (): RegisteredART[] => JSON.parse(localStorage.getItem(KEYS.ARTS) || '[]'),
  saveART: async (art: RegisteredART) => {
      const list = StorageService.getARTs();
      const idx = list.findIndex(a => a.id === art.id);
      if (idx >= 0) list[idx] = art; else list.push(art);
      trySaveLocal(KEYS.ARTS, list, ['pdfUrl']);
      if (navigator.onLine) await supabase.from('arts').upsert(art);
      triggerUpdate(KEYS.ARTS);
  },
  deleteART: async (id: string) => {
      const list = StorageService.getARTs().filter(a => a.id !== id);
      trySaveLocal(KEYS.ARTS, list, ['pdfUrl']);
      if (navigator.onLine) await supabase.from('arts').delete().eq('id', id);
      triggerUpdate(KEYS.ARTS);
  },

  getSchedule: (): ScheduleItem[] => JSON.parse(localStorage.getItem(KEYS.SCHEDULE) || '[]'),
  saveScheduleItem: async (item: ScheduleItem) => {
      const list = StorageService.getSchedule();
      const idx = list.findIndex(i => i.id === item.id);
      if (idx >= 0) list[idx] = item; else list.push(item);
      trySaveLocal(KEYS.SCHEDULE, list);
      if (navigator.onLine) await supabase.from('schedule').upsert(item);
      triggerUpdate(KEYS.SCHEDULE);
  },
  deleteScheduleItem: async (id: string) => {
      const list = StorageService.getSchedule().filter(i => i.id !== id);
      trySaveLocal(KEYS.SCHEDULE, list);
      if (navigator.onLine) await supabase.from('schedule').delete().eq('id', id);
      triggerUpdate(KEYS.SCHEDULE);
  },
  archiveAndClearSchedule: async () => {
      trySaveLocal(KEYS.SCHEDULE, []);
      if (navigator.onLine) {
          const { data } = await supabase.from('schedule').select('id');
          if (data && data.length > 0) {
              const ids = data.map(d => d.id);
              await supabase.from('schedule').delete().in('id', ids);
          }
      }
      triggerUpdate(KEYS.SCHEDULE);
  },

  getActiveMaintenances: (): ActiveMaintenance[] => JSON.parse(localStorage.getItem(KEYS.ACTIVE) || '[]'),
  startMaintenance: async (task: ActiveMaintenance) => {
      const list = StorageService.getActiveMaintenances();
      list.push(task);
      trySaveLocal(KEYS.ACTIVE, list);
      if (navigator.onLine) await supabase.from('active_maintenance').upsert(task);
      // Remove from schedule if linked
      if (task.scheduleId) {
          const sched = StorageService.getSchedule().filter(s => s.id !== task.scheduleId);
          trySaveLocal(KEYS.SCHEDULE, sched);
          if (navigator.onLine) await supabase.from('schedule').delete().eq('id', task.scheduleId);
          triggerUpdate(KEYS.SCHEDULE);
      }
      // Update OM Status if linked
      if (task.omId) {
          const oms = StorageService.getOMs();
          const om = oms.find(o => o.id === task.omId);
          if (om) {
              om.status = 'EM_ANDAMENTO';
              StorageService.saveOM(om);
          }
      }
      triggerUpdate(KEYS.ACTIVE);
  },
  pauseMaintenance: async (id: string) => {
      const list = StorageService.getActiveMaintenances();
      const task = list.find(t => t.id === id);
      if (task) {
          const now = new Date();
          const sessionStart = new Date(task.currentSessionStart || now);
          const elapsed = now.getTime() - sessionStart.getTime();
          task.status = 'PAUSADA';
          task.accumulatedTime = (task.accumulatedTime || 0) + elapsed;
          task.currentSessionStart = undefined;
          trySaveLocal(KEYS.ACTIVE, list);
          if (navigator.onLine) await supabase.from('active_maintenance').upsert(task);
          triggerUpdate(KEYS.ACTIVE);
      }
  },
  resumeMaintenance: async (id: string, user: string) => {
      const list = StorageService.getActiveMaintenances();
      const task = list.find(t => t.id === id);
      if (task) {
          task.status = 'ANDAMENTO';
          task.currentSessionStart = new Date().toISOString();
          task.openedBy = user;
          trySaveLocal(KEYS.ACTIVE, list);
          if (navigator.onLine) await supabase.from('active_maintenance').upsert(task);
          triggerUpdate(KEYS.ACTIVE);
      }
  },
  setMaintenancePartial: async (id: string) => {
      const list = StorageService.getActiveMaintenances();
      const task = list.find(t => t.id === id);
      if (task) {
          const now = new Date();
          if (task.status === 'ANDAMENTO' && task.currentSessionStart) {
              const sessionStart = new Date(task.currentSessionStart);
              const elapsed = now.getTime() - sessionStart.getTime();
              task.accumulatedTime = (task.accumulatedTime || 0) + elapsed;
          }
          task.status = 'AGUARDANDO';
          task.currentSessionStart = undefined;
          
          trySaveLocal(KEYS.ACTIVE, list);
          if (navigator.onLine) await supabase.from('active_maintenance').upsert(task);
          triggerUpdate(KEYS.ACTIVE);
      }
  },
  completeMaintenance: async (id: string, reason: string, isTotal: boolean) => {
      const list = StorageService.getActiveMaintenances();
      const task = list.find(t => t.id === id);
      if (!task) return;

      const now = new Date();
      let totalMs = task.accumulatedTime || 0;
      if (task.status === 'ANDAMENTO' && task.currentSessionStart) {
          totalMs += (now.getTime() - new Date(task.currentSessionStart).getTime());
      }

      const h = Math.floor(totalMs / 3600000);
      const m = Math.floor((totalMs % 3600000) / 60000);
      const durationStr = `${h}h ${m}m`;

      const log: MaintenanceLog = {
          id: crypto.randomUUID(),
          om: task.header.om,
          tag: task.header.tag,
          description: task.header.description,
          startTime: task.startTime,
          endTime: now.toISOString(),
          duration: durationStr,
          responsible: task.openedBy || 'SISTEMA',
          status: reason,
          type: task.origin // PREVENTIVA, CORRETIVA, DEMANDA_EXTRA
      };

      // Save History
      const hist = StorageService.getHistory();
      hist.unshift(log);
      trySaveLocal(KEYS.HISTORY, hist);
      if (navigator.onLine) await supabase.from('history').insert(log);

      // Update OM Status if linked
      if (task.omId) {
          const oms = StorageService.getOMs();
          const om = oms.find(o => o.id === task.omId);
          if (om) {
              om.status = 'CONCLUIDA';
              StorageService.saveOM(om);
          }
      }

      // Remove from Active
      const newList = list.filter(t => t.id !== id);
      trySaveLocal(KEYS.ACTIVE, newList);
      if (navigator.onLine) await supabase.from('active_maintenance').delete().eq('id', id);
      
      triggerUpdate(KEYS.ACTIVE);
      triggerUpdate(KEYS.HISTORY);
  },
  getActiveMaintenanceById: (id: string) => StorageService.getActiveMaintenances().find(t => t.id === id),
  
  getHistory: (): MaintenanceLog[] => JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]'),

  getDocuments: (): DocumentRecord[] => JSON.parse(localStorage.getItem(KEYS.DOCS) || '[]'),
  saveDocument: async (doc: DocumentRecord) => {
      const list = StorageService.getDocuments();
      list.push(doc);
      trySaveLocal(KEYS.DOCS, list, ['manualFileUrl']);
      if (navigator.onLine) await supabase.from('documents').upsert(doc);
      triggerUpdate(KEYS.DOCS);
  },
  moveToTrash: async (id: string) => {
      const list = StorageService.getDocuments();
      const doc = list.find(d => d.id === id);
      if (doc) {
          doc.status = 'LIXEIRA';
          trySaveLocal(KEYS.DOCS, list, ['manualFileUrl']);
          if (navigator.onLine) await supabase.from('documents').upsert(doc);
          triggerUpdate(KEYS.DOCS);
      }
  },
  restoreFromTrash: async (id: string) => {
      const list = StorageService.getDocuments();
      const doc = list.find(d => d.id === id);
      if (doc) {
          doc.status = 'ARQUIVADO';
          trySaveLocal(KEYS.DOCS, list, ['manualFileUrl']);
          if (navigator.onLine) await supabase.from('documents').upsert(doc);
          triggerUpdate(KEYS.DOCS);
      }
  },
  deletePermanently: async (id: string) => {
      const list = StorageService.getDocuments().filter(d => d.id !== id);
      trySaveLocal(KEYS.DOCS, list, ['manualFileUrl']);
      if (navigator.onLine) await supabase.from('documents').delete().eq('id', id);
      triggerUpdate(KEYS.DOCS);
  },
  emptyTrash: async () => {
      let list = StorageService.getDocuments();
      const trashIds = list.filter(d => d.status === 'LIXEIRA').map(d => d.id);
      list = list.filter(d => d.status !== 'LIXEIRA');
      trySaveLocal(KEYS.DOCS, list, ['manualFileUrl']);
      if (navigator.onLine && trashIds.length > 0) await supabase.from('documents').delete().in('id', trashIds);
      triggerUpdate(KEYS.DOCS);
  },

  getChatMessages: (): ChatMessage[] => JSON.parse(localStorage.getItem(KEYS.CHAT) || '[]'),
  sendChatMessage: async (msg: ChatMessage) => {
      const list = StorageService.getChatMessages();
      list.push(msg);
      trySaveLocal(KEYS.CHAT, list); // Chat doesn't strip anything
      if (navigator.onLine) await supabase.from('chat_messages').insert(msg);
      window.dispatchEvent(new Event('safemaint_chat_update'));
  },
  clearChat: async () => {
      trySaveLocal(KEYS.CHAT, []);
      if (navigator.onLine) {
          const { data } = await supabase.from('chat_messages').select('id');
          if(data && data.length) {
              const ids = data.map(m => m.id);
              await supabase.from('chat_messages').delete().in('id', ids);
          }
      }
      window.dispatchEvent(new Event('safemaint_chat_update'));
  },

  getChecklistTemplate: (): ChecklistTemplateItem[] => JSON.parse(localStorage.getItem(KEYS.CHECKLIST_TEMPLATE) || '[]'),

  getPendingExtraDemands: (): PendingExtraDemand[] => JSON.parse(localStorage.getItem(KEYS.PENDING_DEMANDS) || '[]'),
  savePendingExtraDemand: async (demand: PendingExtraDemand) => {
      const list = StorageService.getPendingExtraDemands();
      const idx = list.findIndex(d => d.id === demand.id);
      if(idx >= 0) list[idx] = demand; else list.push(demand);
      trySaveLocal(KEYS.PENDING_DEMANDS, list);
      if(navigator.onLine) await supabase.from('pending_extra_demands').upsert(demand);
      triggerUpdate(KEYS.PENDING_DEMANDS);
  },
  deletePendingExtraDemand: async (id: string) => {
      const list = StorageService.getPendingExtraDemands().filter(d => d.id !== id);
      trySaveLocal(KEYS.PENDING_DEMANDS, list);
      if(navigator.onLine) await supabase.from('pending_extra_demands').delete().eq('id', id);
      triggerUpdate(KEYS.PENDING_DEMANDS);
  },

  getAvailability: (): AvailabilityRecord[] => JSON.parse(localStorage.getItem(KEYS.AVAILABILITY) || '[]'),
  saveAvailability: async (records: AvailabilityRecord[]) => {
      trySaveLocal(KEYS.AVAILABILITY, records);
      if(navigator.onLine) {
          for(const rec of records) {
              await supabase.from('availability').upsert(rec);
          }
      }
      triggerUpdate(KEYS.AVAILABILITY);
  },

  linkOmToMaintenance: async (maintenanceId: string, omId: string, omNumber: string, description: string, tag: string) => {
      const tasks = StorageService.getActiveMaintenances();
      const task = tasks.find(t => t.id === maintenanceId);
      if(task) {
          task.omId = omId;
          task.header.om = omNumber;
          task.header.description = description || task.header.description;
          task.header.tag = tag || task.header.tag;
          
          const oms = StorageService.getOMs();
          const om = oms.find(o => o.id === omId);
          if(om) {
              om.status = 'EM_ANDAMENTO';
              StorageService.saveOM(om);
          }

          trySaveLocal(KEYS.ACTIVE, tasks);
          if(navigator.onLine) await supabase.from('active_maintenance').upsert(task);
          triggerUpdate(KEYS.ACTIVE);
      }
  },

  // NOVA FUNÇÃO: NOTIFICAÇÕES GERAIS
  getNotifications: (): NotificationItem[] => {
      const notifs: NotificationItem[] = [];
      const todayStr = new Date().toLocaleDateString('pt-BR'); // DD/MM/YYYY

      // 1. OMs Pendentes (CORRETIVAS são URGENT)
      const oms = StorageService.getOMs().filter(o => o.status === 'PENDENTE');
      oms.forEach(om => {
          notifs.push({
              id: `om-${om.id}`,
              type: om.type === 'CORRETIVA' ? 'URGENT' : 'INFO',
              title: `OM PENDENTE: ${om.omNumber}`,
              message: `${om.tag} - ${om.description}`,
              date: new Date(om.createdAt).toLocaleDateString(),
              source: 'OM',
              link: '/om-management'
          });
      });

      // 2. Demandas Extras
      const demands = StorageService.getPendingExtraDemands();
      demands.forEach(d => {
          notifs.push({
              id: `dem-${d.id}`,
              type: 'URGENT',
              title: `DEMANDA EXTRA: ${d.tag}`,
              message: d.description,
              date: new Date(d.createdAt).toLocaleDateString(),
              source: 'DEMAND',
              link: '/extra-demands'
          });
      });

      // 3. Agenda Hoje (Verifica data exata DD/MM/YYYY)
      const schedule = StorageService.getSchedule().filter(s => s.dateStart === todayStr);
      schedule.forEach(s => {
          notifs.push({
              id: `sch-${s.id}`,
              type: 'SCHEDULE',
              title: `AGENDA HOJE: ${s.frotaOm}`,
              message: s.description,
              date: s.dateStart,
              source: 'SCHEDULE',
              link: '/schedule'
          });
      });

      // 4. Atividades em Andamento
      const active = StorageService.getActiveMaintenances().filter(a => a.status === 'ANDAMENTO' || a.status === 'AGUARDANDO');
      active.forEach(a => {
          notifs.push({
              id: `act-${a.id}`,
              type: 'ACTIVE',
              title: `EM EXECUÇÃO: ${a.header.tag}`,
              message: `${a.header.om} - ${a.header.description}`,
              date: new Date(a.startTime).toLocaleTimeString().slice(0,5),
              source: 'ACTIVE',
              link: '/dashboard'
          });
      });

      // Ordenação: Urgente > Active > Schedule > Info
      return notifs.sort((a,b) => {
          const score = (t: string) => {
              if (t === 'URGENT') return 0;
              if (t === 'ACTIVE') return 1;
              if (t === 'SCHEDULE') return 2;
              return 3;
          };
          return score(a.type) - score(b.type);
      });
  }
};
