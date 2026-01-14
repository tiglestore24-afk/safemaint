
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
            localList = localList.filter((item: any) => item.id !== idToDelete);
        } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newItem = payload.new;
            // STRIP FIELDS FOR LOCAL STORAGE OPTIMIZATION
            if (config.strip.length > 0) {
                config.strip.forEach((f: string) => { if (newItem[f]) newItem[f] = 'TRUE'; });
                if (config.key === KEYS.DOCS && newItem.content?.manualFileUrl) newItem.content.manualFileUrl = 'TRUE';
            }
            
            const idx = localList.findIndex((item: any) => item.id === newItem.id);
            if (idx >= 0) localList[idx] = newItem;
            else localList.push(newItem);
        }
        
        localStorage.setItem(config.key, JSON.stringify(localList));
        triggerUpdate(config.key);
    };

    tablesToSubscribe.forEach(config => {
        channel.on('postgres_changes', { event: '*', schema: 'public', table: config.table }, (payload) => processPayload(payload, config));
    });

    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('SAFEMAINT: Sincronizado com a Nuvem.');
    });
  },

  initialSync: async () => {
      if (!navigator.onLine) return;
      const syncTable = async (key: string, table: string, strip: string[] = []) => {
          try {
              const { data, error } = await supabase.from(table).select('*');
              if (!error && data) {
                  trySaveLocal(key, data, strip);
                  triggerUpdate(key);
              }
          } catch (e) { console.error(`Erro sync ${table}`, e); }
      };

      await Promise.all([
          syncTable(KEYS.OMS, 'oms', ['pdfUrl']),
          syncTable(KEYS.ARTS, 'arts', ['pdfUrl']),
          syncTable(KEYS.SCHEDULE, 'schedule'),
          syncTable(KEYS.ACTIVE, 'active_maintenance'),
          syncTable(KEYS.DOCS, 'documents'), // Docs already handles deep strip in trySaveLocal
          syncTable(KEYS.EMPLOYEES, 'employees'),
          syncTable(KEYS.USERS, 'users'),
          syncTable(KEYS.HISTORY, 'history'),
          syncTable(KEYS.CHAT, 'chat_messages'),
          syncTable(KEYS.PENDING_DEMANDS, 'pending_extra_demands'),
          syncTable(KEYS.CHECKLIST_TEMPLATE, 'checklist_definitions'),
          syncTable(KEYS.AVAILABILITY, 'availability')
      ]);
  },

  // --- CRUD METHODS ---

  getDocuments: (): DocumentRecord[] => JSON.parse(localStorage.getItem(KEYS.DOCS) || '[]'),
  saveDocument: async (doc: DocumentRecord) => {
      const docs = StorageService.getDocuments();
      const updated = [doc, ...docs.filter(d => d.id !== doc.id)];
      trySaveLocal(KEYS.DOCS, updated); // Salva local otimizado
      
      // Salva Full na Nuvem
      if (navigator.onLine) await supabase.from('documents').upsert(doc);
      triggerUpdate(KEYS.DOCS);
  },
  moveToTrash: async (id: string) => {
      const docs = StorageService.getDocuments();
      const doc = docs.find(d => d.id === id);
      if(doc) { 
          doc.status = 'LIXEIRA'; 
          StorageService.saveDocument(doc); 
      }
  },
  restoreFromTrash: async (id: string) => {
      const docs = StorageService.getDocuments();
      const doc = docs.find(d => d.id === id);
      if(doc) { 
          doc.status = 'ATIVO'; 
          StorageService.saveDocument(doc); 
      }
  },
  deletePermanently: async (id: string) => {
      const docs = StorageService.getDocuments().filter(d => d.id !== id);
      trySaveLocal(KEYS.DOCS, docs);
      if(navigator.onLine) await supabase.from('documents').delete().eq('id', id);
      triggerUpdate(KEYS.DOCS);
  },
  emptyTrash: async () => {
      const docs = StorageService.getDocuments();
      const toKeep = docs.filter(d => d.status !== 'LIXEIRA');
      const toDelete = docs.filter(d => d.status === 'LIXEIRA').map(d => d.id);
      
      trySaveLocal(KEYS.DOCS, toKeep);
      if(navigator.onLine && toDelete.length > 0) await supabase.from('documents').delete().in('id', toDelete);
      triggerUpdate(KEYS.DOCS);
  },

  getEmployees: (): Employee[] => JSON.parse(localStorage.getItem(KEYS.EMPLOYEES) || '[]'),
  saveEmployee: async (emp: Employee) => {
      const emps = StorageService.getEmployees();
      const updated = [emp, ...emps.filter(e => e.id !== emp.id)];
      localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(updated));
      if (navigator.onLine) await supabase.from('employees').upsert(emp);
      triggerUpdate(KEYS.EMPLOYEES);
  },
  deleteEmployee: async (id: string) => {
      const emps = StorageService.getEmployees().filter(e => e.id !== id);
      localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(emps));
      if(navigator.onLine) await supabase.from('employees').delete().eq('id', id);
      triggerUpdate(KEYS.EMPLOYEES);
  },

  getUsers: (): User[] => {
      const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
      // GARANTE O ADMIN PADRÃO SE A LISTA ESTIVER VAZIA
      if (users.length === 0) {
          return [{
              id: 'default-admin',
              name: 'ADMINISTRADOR',
              matricula: '81025901',
              login: '81025901',
              password: '123',
              role: 'ADMIN'
          }];
      }
      return users;
  },
  saveUser: async (user: User) => {
      const users = StorageService.getUsers();
      const updated = [user, ...users.filter(u => u.id !== user.id)];
      localStorage.setItem(KEYS.USERS, JSON.stringify(updated));
      if (navigator.onLine) await supabase.from('users').upsert(user);
      triggerUpdate(KEYS.USERS);
  },
  deleteUser: async (id: string) => {
      const users = StorageService.getUsers().filter(u => u.id !== id);
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
      if(navigator.onLine) await supabase.from('users').delete().eq('id', id);
      triggerUpdate(KEYS.USERS);
  },
  validateUser: async (login: string, pass: string): Promise<User | null> => {
      const users = StorageService.getUsers();
      // Case insensitive login check
      const user = users.find(u => u.login.toUpperCase() === login.toUpperCase() && u.password === pass);
      return user || null;
  },
  registerUser: async (newUser: User) => {
      const users = StorageService.getUsers();
      if (users.some(u => u.login === newUser.login)) return { success: false, message: 'Login já existe' };
      await StorageService.saveUser(newUser);
      return { success: true };
  },
  logoutUser: async (login: string) => {
      // Logic for logout if needed (e.g. updating is_active_session)
  },

  getOMs: (): OMRecord[] => JSON.parse(localStorage.getItem(KEYS.OMS) || '[]'),
  saveOM: async (om: OMRecord) => {
      const oms = StorageService.getOMs();
      const updated = [om, ...oms.filter(o => o.id !== om.id)];
      trySaveLocal(KEYS.OMS, updated, ['pdfUrl']);
      if (navigator.onLine) await supabase.from('oms').upsert(om);
      triggerUpdate(KEYS.OMS);
  },
  deleteOM: async (id: string) => {
      const oms = StorageService.getOMs().filter(o => o.id !== id);
      trySaveLocal(KEYS.OMS, oms, ['pdfUrl']);
      if(navigator.onLine) await supabase.from('oms').delete().eq('id', id);
      triggerUpdate(KEYS.OMS);
  },

  getARTs: (): RegisteredART[] => JSON.parse(localStorage.getItem(KEYS.ARTS) || '[]'),
  saveART: async (art: RegisteredART) => {
      const arts = StorageService.getARTs();
      const updated = [art, ...arts.filter(a => a.id !== art.id)];
      trySaveLocal(KEYS.ARTS, updated, ['pdfUrl']);
      if (navigator.onLine) await supabase.from('arts').upsert(art);
      triggerUpdate(KEYS.ARTS);
  },
  deleteART: async (id: string) => {
      const arts = StorageService.getARTs().filter(a => a.id !== id);
      trySaveLocal(KEYS.ARTS, arts, ['pdfUrl']);
      if(navigator.onLine) await supabase.from('arts').delete().eq('id', id);
      triggerUpdate(KEYS.ARTS);
  },

  getSchedule: (): ScheduleItem[] => JSON.parse(localStorage.getItem(KEYS.SCHEDULE) || '[]'),
  saveScheduleItem: async (item: ScheduleItem) => {
      const items = StorageService.getSchedule();
      const updated = [item, ...items.filter(i => i.id !== item.id)];
      localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(updated));
      if (navigator.onLine) await supabase.from('schedule').upsert(item);
      triggerUpdate(KEYS.SCHEDULE);
  },
  deleteScheduleItem: async (id: string) => {
      const items = StorageService.getSchedule().filter(i => i.id !== id);
      localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(items));
      if(navigator.onLine) await supabase.from('schedule').delete().eq('id', id);
      triggerUpdate(KEYS.SCHEDULE);
  },
  archiveAndClearSchedule: async () => {
      // 1. Get current schedule
      const current = StorageService.getSchedule();
      // 2. Clear locally and remote
      localStorage.setItem(KEYS.SCHEDULE, '[]');
      if (navigator.onLine && current.length > 0) {
          // Instead of deleting all one by one, we could use a bulk delete if IDs are known, or just truncate concept
          // For supabase, delete all rows:
          const { error } = await supabase.from('schedule').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
      triggerUpdate(KEYS.SCHEDULE);
  },

  getActiveMaintenances: (): ActiveMaintenance[] => JSON.parse(localStorage.getItem(KEYS.ACTIVE) || '[]'),
  getActiveMaintenanceById: (id: string): ActiveMaintenance | undefined => {
      return StorageService.getActiveMaintenances().find(m => m.id === id);
  },
  startMaintenance: async (task: ActiveMaintenance) => {
      const active = StorageService.getActiveMaintenances();
      const updated = [task, ...active];
      localStorage.setItem(KEYS.ACTIVE, JSON.stringify(updated));
      if(navigator.onLine) await supabase.from('active_maintenance').upsert(task);
      
      // Update Schedule Status if linked
      if (task.scheduleId) {
          // Usually we remove from schedule view or mark as 'EM ANDAMENTO'
          // Logic: Remove from schedule list or update status?
          // Based on `Schedule.tsx` handleStartMaintenance: it passes scheduleId.
          // Let's assume we update the status locally for now or leave it. 
          // The Schedule page logic filters active items by ID so it's handled there.
      }
      
      // Update OM Status if linked
      if (task.omId) {
          const oms = StorageService.getOMs();
          const om = oms.find(o => o.id === task.omId);
          if (om) {
              om.status = 'EM_ANDAMENTO';
              await StorageService.saveOM(om);
          }
      }

      triggerUpdate(KEYS.ACTIVE);
  },
  pauseMaintenance: async (id: string) => {
      const active = StorageService.getActiveMaintenances();
      const task = active.find(t => t.id === id);
      if (task) {
          const now = new Date();
          const sessionStart = new Date(task.currentSessionStart || task.startTime);
          const sessionDuration = now.getTime() - sessionStart.getTime();
          
          task.accumulatedTime = (task.accumulatedTime || 0) + sessionDuration;
          task.status = 'PAUSADA';
          task.currentSessionStart = undefined;
          
          localStorage.setItem(KEYS.ACTIVE, JSON.stringify(active));
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
          task.openedBy = user; // Updates who resumed
          
          localStorage.setItem(KEYS.ACTIVE, JSON.stringify(active));
          if(navigator.onLine) await supabase.from('active_maintenance').upsert(task);
          triggerUpdate(KEYS.ACTIVE);
      }
  },
  setMaintenancePartial: async (id: string) => {
      const active = StorageService.getActiveMaintenances();
      const task = active.find(t => t.id === id);
      if (task) {
          // Calcula tempo antes de pausar
          if (task.status === 'ANDAMENTO' && task.currentSessionStart) {
              const now = new Date();
              const start = new Date(task.currentSessionStart);
              task.accumulatedTime = (task.accumulatedTime || 0) + (now.getTime() - start.getTime());
          }
          
          task.status = 'AGUARDANDO'; // Libera Lock
          task.currentSessionStart = undefined;
          
          localStorage.setItem(KEYS.ACTIVE, JSON.stringify(active));
          if(navigator.onLine) await supabase.from('active_maintenance').upsert(task);
          triggerUpdate(KEYS.ACTIVE);
      }
  },
  completeMaintenance: async (id: string, finalStatus: string, keepHistory: boolean) => {
      const active = StorageService.getActiveMaintenances();
      const task = active.find(t => t.id === id);
      if (!task) return;

      if (keepHistory) {
          // Calc total duration
          let totalMs = task.accumulatedTime || 0;
          if (task.status === 'ANDAMENTO' && task.currentSessionStart) {
              totalMs += (new Date().getTime() - new Date(task.currentSessionStart).getTime());
          }
          
          const h = Math.floor(totalMs / 3600000);
          const m = Math.floor((totalMs % 3600000) / 60000);
          const s = Math.floor((totalMs % 60000) / 1000);
          const durationStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;

          const log: MaintenanceLog = {
              id: crypto.randomUUID(),
              om: task.header.om,
              tag: task.header.tag,
              description: task.header.description,
              startTime: task.startTime,
              endTime: new Date().toISOString(),
              duration: durationStr,
              responsible: task.openedBy || 'SISTEMA',
              status: finalStatus,
              type: task.origin
          };
          StorageService.saveHistory([log, ...StorageService.getHistory()]);
      }

      // Update OM status to Completed
      if (task.omId) {
          const oms = StorageService.getOMs();
          const om = oms.find(o => o.id === task.omId);
          if (om) {
              om.status = 'CONCLUIDA';
              await StorageService.saveOM(om);
          }
      }

      // Remove from active
      const updated = active.filter(t => t.id !== id);
      localStorage.setItem(KEYS.ACTIVE, JSON.stringify(updated));
      if(navigator.onLine) await supabase.from('active_maintenance').delete().eq('id', id);
      triggerUpdate(KEYS.ACTIVE);
  },
  linkOmToMaintenance: async (taskId: string, omId: string, omNumber: string, omDesc: string, omTag: string) => {
      const active = StorageService.getActiveMaintenances();
      const task = active.find(t => t.id === taskId);
      if (task) {
          task.omId = omId;
          task.header.om = omNumber;
          // Only update tag if it was generic
          if (task.header.tag === 'TAG-INDEFINIDO' || task.header.tag === 'DEMANDA-EXTRA') {
              task.header.tag = omTag;
          }
          localStorage.setItem(KEYS.ACTIVE, JSON.stringify(active));
          if(navigator.onLine) await supabase.from('active_maintenance').upsert(task);
          
          // Update OM status
          const oms = StorageService.getOMs();
          const om = oms.find(o => o.id === omId);
          if(om) {
              om.status = 'EM_ANDAMENTO';
              await StorageService.saveOM(om);
          }
          
          triggerUpdate(KEYS.ACTIVE);
      }
  },

  getHistory: (): MaintenanceLog[] => JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]'),
  saveHistory: async (history: MaintenanceLog[]) => {
      localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
      // Save only new item to DB? For simplicity, we assume the caller appends locally and we sync all or rely on realtime. 
      // Ideally we upsert the new one. Since history is append-only usually.
      // We will sync the first item (newest) if online
      if (navigator.onLine && history.length > 0) {
          await supabase.from('history').upsert(history[0]);
      }
      triggerUpdate(KEYS.HISTORY);
  },

  getChatMessages: (): ChatMessage[] => JSON.parse(localStorage.getItem(KEYS.CHAT) || '[]'),
  sendChatMessage: async (msg: ChatMessage) => {
      const msgs = StorageService.getChatMessages();
      const updated = [...msgs, msg];
      localStorage.setItem(KEYS.CHAT, JSON.stringify(updated));
      if (navigator.onLine) await supabase.from('chat_messages').upsert(msg);
      window.dispatchEvent(new Event('safemaint_chat_update'));
  },
  clearChat: async () => {
      localStorage.setItem(KEYS.CHAT, '[]');
      if(navigator.onLine) await supabase.from('chat_messages').delete().neq('id', '0');
      window.dispatchEvent(new Event('safemaint_chat_update'));
  },

  getPendingExtraDemands: (): PendingExtraDemand[] => JSON.parse(localStorage.getItem(KEYS.PENDING_DEMANDS) || '[]'),
  savePendingExtraDemand: async (demand: PendingExtraDemand) => {
      const list = StorageService.getPendingExtraDemands();
      const updated = [demand, ...list.filter(d => d.id !== demand.id)];
      localStorage.setItem(KEYS.PENDING_DEMANDS, JSON.stringify(updated));
      if(navigator.onLine) await supabase.from('pending_extra_demands').upsert(demand);
      triggerUpdate(KEYS.PENDING_DEMANDS);
  },
  deletePendingExtraDemand: async (id: string) => {
      const list = StorageService.getPendingExtraDemands().filter(d => d.id !== id);
      localStorage.setItem(KEYS.PENDING_DEMANDS, JSON.stringify(list));
      if(navigator.onLine) await supabase.from('pending_extra_demands').delete().eq('id', id);
      triggerUpdate(KEYS.PENDING_DEMANDS);
  },

  getChecklistTemplate: (): ChecklistTemplateItem[] => {
      const stored = localStorage.getItem(KEYS.CHECKLIST_TEMPLATE);
      return stored ? JSON.parse(stored) : DEFAULT_CHECKLIST;
  },
  
  getNotifications: (): NotificationItem[] => {
      const notifs: NotificationItem[] = [];
      
      // 1. OMs Pendentes
      const oms = StorageService.getOMs().filter(o => o.status === 'PENDENTE');
      if (oms.length > 0) {
          notifs.push({
              id: 'notif-oms',
              type: 'URGENT',
              title: `${oms.length} ORDENS NA FILA`,
              message: `Existem ${oms.length} OMs aguardando início de execução.`,
              date: new Date().toLocaleDateString(),
              link: '/om-management'
          });
      }

      // 2. Demandas Extras
      const demands = StorageService.getPendingExtraDemands();
      if (demands.length > 0) {
          notifs.push({
              id: 'notif-demands',
              type: 'INFO',
              title: `${demands.length} DEMANDAS EXTRAS`,
              message: `Atividades não planejadas registradas.`,
              date: new Date().toLocaleDateString(),
              link: '/extra-demands'
          });
      }

      // 3. Atividades Pausadas
      const active = StorageService.getActiveMaintenances();
      const paused = active.filter(t => t.status === 'PAUSADA');
      if (paused.length > 0) {
          notifs.push({
              id: 'notif-paused',
              type: 'ACTIVE',
              title: `${paused.length} ATIVIDADES PAUSADAS`,
              message: `Retome as atividades paralisadas para evitar atrasos.`,
              date: new Date().toLocaleDateString(),
              link: '/dashboard'
          });
      }

      return notifs;
  },

  getAvailability: (): AvailabilityRecord[] => JSON.parse(localStorage.getItem(KEYS.AVAILABILITY) || '[]'),
  saveAvailability: async (records: AvailabilityRecord[]) => {
      localStorage.setItem(KEYS.AVAILABILITY, JSON.stringify(records));
      // Sync logic for availability is complex (bulk upsert), implementing basic sync for changed items would be ideal.
      // For now, we assume simple local storage + eventual consistency or manual sync triggers in settings.
      // If we want realtime, we should upsert each record.
      if (navigator.onLine && records.length > 0) {
          const { error } = await supabase.from('availability').upsert(records);
          if (error) console.error("Erro sync availability", error);
      }
      triggerUpdate(KEYS.AVAILABILITY);
  }
};
