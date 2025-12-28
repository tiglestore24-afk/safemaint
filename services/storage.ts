
import { DocumentRecord, Employee, RegisteredART, User, ScheduleItem, ActiveMaintenance, MaintenanceLog, ChatMessage, OMRecord, ChecklistTemplateItem, AvailabilityRecord, AvailabilityStatus } from '../types';
import { supabase } from './supabase';

/*
  === ATENÇÃO: SCRIPT SQL PARA O SUPABASE ===
  Para habilitar o checklist dinâmico:
  create table if not exists checklist_definitions (
    id uuid primary key default uuid_generate_v4(),
    "legacyId" integer,
    section text not null,
    description text not null,
    "createdAt" timestamptz default now()
  );
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
  CHECKLIST_TEMPLATE: 'safemaint_checklist_template',
  AVAILABILITY: 'safemaint_availability', // NEW KEY
  SYNC_QUEUE: 'safemaint_sync_queue'
};

const DB_SCHEMA: Record<string, string[]> = {
    'documents': ['id', 'type', 'header', 'createdAt', 'status', 'content', 'signatures'],
    'active_maintenance': ['id', 'header', 'startTime', 'artId', 'artType', 'origin', 'status', 'currentSessionStart', 'accumulatedTime', 'omId', 'openedBy'],
    'history': ['id', 'om', 'tag', 'description', 'startTime', 'endTime', 'duration', 'responsible', 'status'],
    'employees': ['id', 'name', 'matricula', 'function', 'status'],
    'users': ['id', 'name', 'matricula', 'login', 'password', 'role'],
    'arts': ['id', 'code', 'company', 'taskName', 'area', 'omve', 'emissionDate', 'pdfUrl', 'risks', 'controlMeasures', 'steps'],
    'schedule': ['id', 'frotaOm', 'description', 'resources', 'resources2', 'dateMin', 'dateMax', 'priority', 'peopleCount', 'hours', 'dateStart', 'dateEnd', 'workCenter', 'timeStart', 'timeEnd', 'status'],
    'oms': ['id', 'omNumber', 'description', 'tag', 'type', 'status', 'createdAt', 'createdBy', 'pdfUrl', 'linkedScheduleId', 'installationLocation', 'maintenanceHistory'],
    'chat': ['id', 'sender', 'role', 'text', 'timestamp', 'isSystem'],
    'checklist_definitions': ['id', 'legacyId', 'section', 'description']
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

// --- AGGRESSIVE CLEANUP LOGIC ---
const aggressiveCleanup = () => {
    console.warn('[STORAGE] Storage full. Executing aggressive cleanup...');
    let freedSpace = false;

    // 1. Remove non-essential keys
    if (localStorage.getItem(KEYS.CHAT)) {
        localStorage.removeItem(KEYS.CHAT);
        freedSpace = true;
    }

    // 2. Trim History drastically
    try {
        const history = JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]');
        if (history.length > 20) {
            localStorage.setItem(KEYS.HISTORY, JSON.stringify(history.slice(0, 20)));
            freedSpace = true;
        }
    } catch(e) {}

    // 3. Strip heavy content (Images/PDFs) from cached Documents
    try {
        const docs = JSON.parse(localStorage.getItem(KEYS.DOCS) || '[]');
        let strippedCount = 0;
        const lightweightDocs = docs.map((doc: any) => {
            let modified = false;
            const newDoc = { ...doc };

            // Strip root PDF if exists
            if (newDoc.pdfUrl) {
                delete newDoc.pdfUrl;
                modified = true;
            }
            
            // Strip manual file images from Reports
            if (newDoc.content && newDoc.content.manualFileUrl) {
                newDoc.content = { ...newDoc.content }; // Shallow copy content
                delete newDoc.content.manualFileUrl;
                newDoc.content.isOfflinePlaceholder = true; // Marker
                modified = true;
            }

            if (modified) strippedCount++;
            return newDoc;
        });

        if (strippedCount > 0) {
            localStorage.setItem(KEYS.DOCS, JSON.stringify(lightweightDocs));
            console.log(`[STORAGE] Stripped large data from ${strippedCount} documents.`);
            freedSpace = true;
        }
    } catch(e) {}

    // 4. Strip PDFs from ARTs
    try {
        const arts = JSON.parse(localStorage.getItem(KEYS.ARTS) || '[]');
        let strippedArts = 0;
        const lightArts = arts.map((art: any) => {
            if (art.pdfUrl) {
                strippedArts++;
                const newArt = { ...art };
                delete newArt.pdfUrl;
                return newArt;
            }
            return art;
        });
        if (strippedArts > 0) {
            localStorage.setItem(KEYS.ARTS, JSON.stringify(lightArts));
            freedSpace = true;
        }
    } catch(e) {}

    // 5. Strip PDFs from OMs
    try {
        const oms = JSON.parse(localStorage.getItem(KEYS.OMS) || '[]');
        let strippedOms = 0;
        const lightOms = oms.map((om: any) => {
            if (om.pdfUrl) {
                strippedOms++;
                const newOm = { ...om };
                delete newOm.pdfUrl;
                return newOm;
            }
            return om;
        });
        if (strippedOms > 0) {
            localStorage.setItem(KEYS.OMS, JSON.stringify(lightOms));
            freedSpace = true;
        }
    } catch(e) {}

    return freedSpace;
};

// --- SYNC QUEUE LOGIC ---

const getSyncQueue = (): SyncTask[] => {
    try {
        return JSON.parse(localStorage.getItem(KEYS.SYNC_QUEUE) || '[]');
    } catch(e) { return []; }
};

const addToSyncQueue = (task: SyncTask) => {
    const queue = getSyncQueue();
    // Remove duplicatas para o mesmo ID e Tabela (mantém o mais recente)
    const filtered = queue.filter(t => !(t.recordId === task.recordId && t.table === task.table));
    filtered.push(task);
    
    try {
        localStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(filtered));
        triggerUpdate();
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            
            // Execute Aggressive Cleanup
            aggressiveCleanup();
            
            // Retry saving
            try {
                localStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(filtered));
                triggerUpdate();
                console.log('[SYNC] Saved to queue after cleanup.');
            } catch (retryError) {
                console.error('[SYNC] Critical: Cannot save to sync queue even after aggressive cleanup.', retryError);
                if (typeof window !== 'undefined') {
                    alert("ERRO CRÍTICO DE ARMAZENAMENTO: O dispositivo está sem espaço. Conecte-se à internet para sincronizar e limpar dados.");
                }
            }
        }
    }
};

const removeFromSyncQueue = (taskId: string) => {
    const queue = getSyncQueue();
    const filtered = queue.filter(t => t.id !== taskId);
    try {
        localStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(filtered));
        triggerUpdate();
    } catch (e) { console.error('[SYNC] Remove error', e); }
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

// --- HELPER FOR SAFE LOCAL STORAGE SAVING ---
const trySaveLocal = (key: string, data: any, stripFields: string[] = []) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.warn(`[STORAGE] Quota exceeded for ${key}. Attempting aggressive cleanup.`);
            
            // 1. Run global cleanup first
            aggressiveCleanup();

            // 2. Try saving again without stripping first (maybe cleanup was enough)
            try {
                localStorage.setItem(key, JSON.stringify(data));
                return;
            } catch(e2) {}

            // 3. If still failing, strip fields from the current data payload
            if (Array.isArray(data) && stripFields.length > 0) {
                const lighterData = data.map(item => {
                    const clone = { ...item };
                    // Handle direct properties
                    stripFields.forEach(field => {
                        if (clone.hasOwnProperty(field)) {
                            delete clone[field];
                        }
                        // Handle nested content properties (common in DocumentRecord)
                        if (clone.content && clone.content.hasOwnProperty(field)) {
                            delete clone.content[field];
                        }
                    });
                    return clone;
                });

                try {
                    localStorage.setItem(key, JSON.stringify(lighterData));
                    console.log(`[STORAGE] Saved ${key} after stripping large fields.`);
                } catch (retryError) {
                    console.error('[STORAGE] Critical: Could not save even after optimization.', retryError);
                }
            }
        } else {
            console.error('[STORAGE] Error saving to localStorage', e);
        }
    }
};

// --- DEFAULT FALLBACK DATA (Caso o DB esteja vazio ou offline na primeira vez) ---
const DEFAULT_CHECKLIST: ChecklistTemplateItem[] = [
    { id: '1', legacyId: 1, section: "MOTOR", description: "Vazamento de óleo em geral e próximo a partes quentes" },
    { id: '2', legacyId: 2, section: "MOTOR", description: "Vazamento líquido de arrefecimento" },
    { id: '3', legacyId: 3, section: "MOTOR", description: "Interferências entre tubos, mangueiras e cabos" },
    { id: '4', legacyId: 4, section: "MOTOR", description: "Nível de óleo" },
    { id: '5', legacyId: 5, section: "SISTEMA HIDRÁULICO", description: "Vazamento do óleo" },
    { id: '6', legacyId: 6, section: "SISTEMA HIDRÁULICO", description: "Nível de óleo" },
    { id: '7', legacyId: 7, section: "SISTEMA HIDRÁULICO", description: "Abraçadeiras de fixação" },
    { id: '8', legacyId: 8, section: "SISTEMA HIDRÁULICO", description: "Interferências entre tubos, mangueiras e cabos" },
    { id: '9', legacyId: 9, section: "TRANSMISSÃO", description: "Vazamento do óleo" },
    { id: '10', legacyId: 10, section: "TRANSMISSÃO", description: "Parafusos folgados" },
    { id: '11', legacyId: 11, section: "TRANSMISSÃO", description: "Abraçadeiras de fixação" },
    { id: '12', legacyId: 12, section: "TRANSMISSÃO", description: "Interferências entre tubos, mangueiras e cabos" },
    { id: '13', legacyId: 13, section: "TRANSMISSÃO", description: "Proteção do cardan" },
    { id: '14', legacyId: 14, section: "DIFERENCIAL", description: "Bujão de dreno do diferencial (Fixação)" },
    { id: '15', legacyId: 15, section: "COMANDO FINAL", description: "Bujão de dreno e inspeção comando direito (Fixação)" },
    { id: '16', legacyId: 16, section: "COMANDO FINAL", description: "Bujão de dreno e inspeção comando esquerdo (Fixação)" },
    { id: '17', legacyId: 17, section: "CONVERSOR", description: "Nível de óleo do conversor e transmissão" },
    { id: '18', legacyId: 18, section: "SISTEMA DE DIREÇÃO", description: "Vazamento de óleo" },
    { id: '19', legacyId: 19, section: "SISTEMA DE DIREÇÃO", description: "Nível de óleo" },
    { id: '20', legacyId: 20, section: "SISTEMA DE DIREÇÃO", description: "Parafusos/pinos folgados" },
    { id: '21', legacyId: 21, section: "SISTEMA DE DIREÇÃO", description: "Abraçadeiras de fixação" },
    { id: '22', legacyId: 22, section: "SISTEMA DE DIREÇÃO", description: "Interferências entre tubos, mangueiras e cabos" },
    { id: '23', legacyId: 23, section: "ILUMINAÇÃO, AR CONDICIONADO", description: "Farol de Alta e Baixa" },
    { id: '24', legacyId: 24, section: "ILUMINAÇÃO, AR CONDICIONADO", description: "Setas" },
    { id: '25', legacyId: 25, section: "ILUMINAÇÃO, AR CONDICIONADO", description: "Buzina" },
    { id: '26', legacyId: 26, section: "ILUMINAÇÃO, AR CONDICIONADO", description: "Ar Condicionado" },
    { id: '27', legacyId: 27, section: "ESCADAS, CORRIMÃO, GUARDA CORPO", description: "Escadas (Principal e de emergência)" },
    { id: '28', legacyId: 28, section: "ESCADAS, CORRIMÃO, GUARDA CORPO", description: "Guarda Corpo (Plataforma)" },
    { id: '29', legacyId: 29, section: "ESCADAS, CORRIMÃO, GUARDA CORPO", description: "Tag's laterais e traseiro" },
    { id: '30', legacyId: 30, section: "ESCADAS, CORRIMÃO, GUARDA CORPO", description: "Corrimão das Escadas" },
    { id: '31', legacyId: 31, section: "CONDIÇÕES DE LIMPEZA E ORGANIZAÇÃO", description: "Cabine" },
    { id: '32', legacyId: 32, section: "CONDIÇÕES DE LIMPEZA E ORGANIZAÇÃO", description: "Plataforma" },
    { id: '33', legacyId: 33, section: "CONDIÇÕES DE LIMPEZA E ORGANIZAÇÃO", description: "Escadas e Corrimões" },
    { id: '34', legacyId: 34, section: "CONDIÇÕES DE LIMPEZA E ORGANIZAÇÃO", description: "Retrovisores" }
];

// Initial Seed for Availability
const DEFAULT_AVAILABILITY: AvailabilityRecord[] = [
    'CA5302', 'CA5304', 'CA5305', 'CA5306', 'CA5307', 'CA5309', 
    'CA5310', 'CA5312', 'CA5316', 'CA5317', 'CA5318', 'CA5322', 
    'CA5324', 'CA5330'
].map(tag => ({
    id: crypto.randomUUID(),
    tag,
    statusMap: {}
}));

export const StorageService = {
  initialSync: async () => {
      // 1. Tenta processar fila pendente primeiro
      await processSyncQueue();

      // Defines tables and fields to strip if quota is exceeded
      const tables: { local: string, remote: string, strip?: string[] }[] = [
          { local: KEYS.DOCS, remote: 'documents', strip: ['manualFileUrl'] },
          { local: KEYS.EMPLOYEES, remote: 'employees' },
          { local: KEYS.OMS, remote: 'oms', strip: ['pdfUrl'] },
          { local: KEYS.ARTS, remote: 'arts', strip: ['pdfUrl'] },
          { local: KEYS.SCHEDULE, remote: 'schedule' },
          { local: KEYS.HISTORY, remote: 'history' },
          { local: KEYS.ACTIVE, remote: 'active_maintenance' },
          { local: KEYS.CHAT, remote: 'chat' },
          { local: KEYS.CHECKLIST_TEMPLATE, remote: 'checklist_definitions' }
      ];

      for (const t of tables) {
          try {
              const { data, error } = await supabase.from(t.remote).select('*');
              if (!error && data) {
                  const camelData = data.map(mapFromDb);
                  
                  // LÓGICA DE MERGE PARA TAREFAS ATIVAS (CORREÇÃO DE BUG DE DESAPARECIMENTO)
                  if (t.local === KEYS.ACTIVE) {
                      const localItems = JSON.parse(localStorage.getItem(KEYS.ACTIVE) || '[]');
                      const remoteMap = new Map(camelData.map((i: any) => [i.id, i]));
                      
                      // Mantém itens remotos E itens locais que ainda não estão no remoto (recém-criados)
                      const combined = [...camelData];
                      localItems.forEach((lItem: any) => {
                          if (!remoteMap.has(lItem.id)) {
                              // Item existe localmente mas não no remoto. 
                              // Mantemos ele, assumindo que é uma criação recente ainda não sincronizada.
                              combined.push(lItem);
                          }
                      });
                      trySaveLocal(t.local, combined, t.strip || []);
                  } 
                  // LOGICA PADRÃO PARA OUTRAS TABELAS
                  else if (t.remote === 'checklist_definitions' && data.length === 0) {
                      // Se template vazio no server, não sobrescreve local (mantém default)
                  } else {
                      trySaveLocal(t.local, camelData, t.strip || []);
                  }
              }
          } catch (e) {}
      }
      
      // Ensure Availability Data exists (Local only for now, can be synced later)
      if (!localStorage.getItem(KEYS.AVAILABILITY)) {
          trySaveLocal(KEYS.AVAILABILITY, DEFAULT_AVAILABILITY);
      }

      triggerUpdate();
      triggerChatUpdate();
  },

  getPendingSyncCount: (): number => {
      return getSyncQueue().length;
  },

  validateUser: async (login: string, pass: string): Promise<User | null> => {
      // Login via Database Only
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
    trySaveLocal(KEYS.EMPLOYEES, list);
    await pushToSupabase('employees', emp);
    triggerUpdate();
  },

  updateEmployee: async (emp: Employee) => {
    const list = StorageService.getEmployees();
    const idx = list.findIndex(e => e.id === emp.id);
    if (idx > -1) {
        list[idx] = emp;
        trySaveLocal(KEYS.EMPLOYEES, list);
        await pushToSupabase('employees', emp);
        triggerUpdate();
    }
  },

  deleteEmployee: async (id: string) => {
    const list = StorageService.getEmployees();
    const emp = list.find(e => e.id === id);
    if (emp) {
        emp.status = 'TRASH';
        trySaveLocal(KEYS.EMPLOYEES, list);
        await pushToSupabase('employees', emp);
        triggerUpdate();
    }
  },

  restoreEmployee: async (id: string) => {
    const list = StorageService.getEmployees();
    const emp = list.find(e => e.id === id);
    if (emp) {
        emp.status = 'ACTIVE';
        trySaveLocal(KEYS.EMPLOYEES, list);
        await pushToSupabase('employees', emp);
        triggerUpdate();
    }
  },

  deleteEmployeePermanently: async (id: string) => {
    const list = StorageService.getEmployees().filter(e => e.id !== id);
    trySaveLocal(KEYS.EMPLOYEES, list);
    await deleteFromSupabase('employees', id);
    triggerUpdate();
  },

  getARTs: (): RegisteredART[] => JSON.parse(localStorage.getItem(KEYS.ARTS) || '[]'),

  addART: async (art: RegisteredART) => {
    const list = StorageService.getARTs();
    list.push(art);
    // Protect against large PDFs in ARTs
    trySaveLocal(KEYS.ARTS, list, ['pdfUrl']);
    await pushToSupabase('arts', art);
    triggerUpdate();
  },

  deleteART: async (id: string) => {
    const list = StorageService.getARTs().filter(a => a.id !== id);
    trySaveLocal(KEYS.ARTS, list);
    await deleteFromSupabase('arts', id);
    triggerUpdate();
  },

  getSchedule: (): ScheduleItem[] => JSON.parse(localStorage.getItem(KEYS.SCHEDULE) || '[]'),

  updateSchedule: async (items: ScheduleItem[]) => {
    trySaveLocal(KEYS.SCHEDULE, items);
    for (const item of items) {
        await pushToSupabase('schedule', item);
    }
    triggerUpdate();
  },

  deleteScheduleItem: async (id: string) => {
    const list = StorageService.getSchedule().filter(item => item.id !== id);
    trySaveLocal(KEYS.SCHEDULE, list);
    await deleteFromSupabase('schedule', id);
    triggerUpdate();
  },

  archiveAndClearSchedule: async (): Promise<boolean> => {
    localStorage.setItem(KEYS.SCHEDULE, '[]');
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
    // Protect against large manual file uploads in reports
    trySaveLocal(KEYS.DOCS, list, ['manualFileUrl']);
    await pushToSupabase('documents', doc);
    triggerUpdate();
  },

  moveToTrash: async (id: string) => {
    const list = StorageService.getDocuments();
    const doc = list.find(d => d.id === id);
    if (doc) {
        doc.status = 'LIXEIRA';
        trySaveLocal(KEYS.DOCS, list, ['manualFileUrl']);
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
          pushToSupabase('documents', doc);
      }
    });
    trySaveLocal(KEYS.DOCS, list, ['manualFileUrl']);
    triggerUpdate();
  },

  restoreFromTrash: async (id: string) => {
    const list = StorageService.getDocuments();
    const doc = list.find(d => d.id === id);
    if (doc) {
        doc.status = 'ATIVO';
        trySaveLocal(KEYS.DOCS, list, ['manualFileUrl']);
        await pushToSupabase('documents', doc);
        triggerUpdate();
    }
  },

  deletePermanently: async (id: string) => {
    const list = StorageService.getDocuments().filter(d => d.id !== id);
    trySaveLocal(KEYS.DOCS, list, ['manualFileUrl']);
    await deleteFromSupabase('documents', id);
    triggerUpdate();
  },

  emptyTrash: async () => {
    const allDocs = StorageService.getDocuments();
    const trashItems = allDocs.filter(d => d.status === 'LIXEIRA');
    const filtered = allDocs.filter(d => d.status !== 'LIXEIRA');
    trySaveLocal(KEYS.DOCS, filtered, ['manualFileUrl']);
    for (const doc of trashItems) {
        await deleteFromSupabase('documents', doc.id);
    }
    triggerUpdate();
  },

  getActiveMaintenances: (): ActiveMaintenance[] => JSON.parse(localStorage.getItem(KEYS.ACTIVE) || '[]'),

  getActiveMaintenanceById: (id: string) => StorageService.getActiveMaintenances().find(m => m.id === id),
  
  startMaintenance: async (task: ActiveMaintenance) => {
    // CAPTURA USUÁRIO LOGADO
    const currentUser = localStorage.getItem('safemaint_user') || 'ANONIMO';
    task.openedBy = currentUser; // Define o dono
    
    const tasks = StorageService.getActiveMaintenances();
    tasks.push(task);
    trySaveLocal(KEYS.ACTIVE, tasks);
    await pushToSupabase('active_maintenance', task);
    
    if (task.omId) {
        await StorageService.updateOMStatus(task.omId, 'EM_ANDAMENTO');
    }

    triggerUpdate();
  },

  // NOVA FUNÇÃO: DEIXAR OM EM ESPERA (CARD AZUL) E LIBERAR POSSE
  setMaintenancePartial: async (id: string) => {
    const tasks = StorageService.getActiveMaintenances();
    const task = tasks.find(t => t.id === id);
    if (task) {
        const now = Date.now();
        const start = task.currentSessionStart ? new Date(task.currentSessionStart).getTime() : now;
        
        // Atualiza tempo acumulado
        task.accumulatedTime = (task.accumulatedTime || 0) + (now - start);
        
        // Define status AGUARDANDO e REMOVE dono
        task.status = 'AGUARDANDO';
        task.openedBy = ''; // Libera para outros
        task.currentSessionStart = undefined;

        // Registra log de "passagem de turno" ou parada parcial
        const currentUser = localStorage.getItem('safemaint_user') || 'ANONIMO';
        const log: MaintenanceLog = {
            id: crypto.randomUUID(), om: task.header.om, tag: task.header.tag, description: task.header.description,
            startTime: task.startTime, endTime: new Date().toISOString(), duration: 'PARCIAL',
            responsible: currentUser, status: 'PARADA PARCIAL / TROCA'
        };
        await pushToSupabase('history', log);

        trySaveLocal(KEYS.ACTIVE, tasks);
        await pushToSupabase('active_maintenance', task);
        triggerUpdate();
    }
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
        trySaveLocal(KEYS.ACTIVE, tasks);
        await pushToSupabase('active_maintenance', task);
        triggerUpdate();
    }
  },

  resumeMaintenance: async (id: string) => {
    const tasks = StorageService.getActiveMaintenances();
    const task = tasks.find(t => t.id === id);
    if (task) {
        // Se outro usuário retomar (ex: troca de turno), ele vira o novo dono da execução ativa
        const currentUser = localStorage.getItem('safemaint_user') || 'ANONIMO';
        task.openedBy = currentUser;
        
        task.status = 'ANDAMENTO';
        task.currentSessionStart = new Date().toISOString();
        trySaveLocal(KEYS.ACTIVE, tasks);
        await pushToSupabase('active_maintenance', task);
        triggerUpdate();
    }
  },

  completeMaintenance: async (id: string, statusLabel: string = 'FINALIZADO', closeOM: boolean = true) => {
    const active = StorageService.getActiveMaintenances();
    const task = active.find(t => t.id === id);
    if (task) {
        const now = new Date();
        const start = task.currentSessionStart ? new Date(task.currentSessionStart).getTime() : now.getTime();
        const totalMs = (task.accumulatedTime || 0) + (now.getTime() - start);
        const log: MaintenanceLog = {
            id: crypto.randomUUID(), om: task.header.om, tag: task.header.tag, description: task.header.description,
            startTime: task.startTime, endTime: now.toISOString(), duration: `${Math.floor(totalMs / 3600000)}h ${Math.floor((totalMs % 3600000) / 60000)}m`,
            responsible: task.openedBy || 'EQUIPE', status: statusLabel
        };
        await pushToSupabase('history', log);
        
        // --- AUTO-FILL AVAILABILITY BOARD ---
        // Based on OM Type (Corrective/Preventive) or Status
        if (task.header.tag) {
            let statusToAdd: AvailabilityStatus | null = null;
            
            if (task.origin === 'CORRETIVA' || task.artType === 'ART_EMERGENCIAL') {
                statusToAdd = 'CORRETIVA';
            } else if (task.origin === 'PREVENTIVA' || task.artType === 'ART_ATIVIDADE') {
                statusToAdd = 'PREVENTIVA';
            }
            
            // If explicitly "INSPECAO" in type (assuming customized type field) or specific header type
            // Note: HeaderData type is broad, checking for 'INSPECAO' keyword if possible or custom logic
            if (task.header.type === 'OUTROS' && task.header.description.toUpperCase().includes('INSPE')) {
                statusToAdd = 'INSPECAO';
            }

            if (statusToAdd) {
                // Use endTime date for the board
                const dateKey = now.toISOString().split('T')[0];
                StorageService.addAvailabilityStatus(task.header.tag, dateKey, statusToAdd);
            }
        }
        // -------------------------------------

        if (task.omId) {
            // Se closeOM for false (ex: Parcial), volta para Pendente para ser pega novamente
            const omStatus = closeOM ? 'CONCLUIDA' : 'PENDENTE';
            await StorageService.updateOMStatus(task.omId, omStatus);
        }

        const filtered = active.filter(t => t.id !== id);
        trySaveLocal(KEYS.ACTIVE, filtered);
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
    // Protect against large PDF files
    trySaveLocal(KEYS.OMS, list, ['pdfUrl']);
    await pushToSupabase('oms', om);
    triggerUpdate();
  },

  updateOMStatus: async (id: string, status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA') => {
      const list = StorageService.getOMs();
      const om = list.find(o => o.id === id);
      if (om) {
          om.status = status;
          trySaveLocal(KEYS.OMS, list, ['pdfUrl']);
          await pushToSupabase('oms', om); 
          triggerUpdate();
      }
  },

  deleteOM: async (id: string) => {
    const list = StorageService.getOMs().filter(o => o.id !== id);
    trySaveLocal(KEYS.OMS, list, ['pdfUrl']);
    await deleteFromSupabase('oms', id);
    triggerUpdate();
  },

  getChatMessages: (): ChatMessage[] => JSON.parse(localStorage.getItem(KEYS.CHAT) || '[]'),

  sendChatMessage: async (msg: ChatMessage) => {
    const list = StorageService.getChatMessages();
    list.push(msg);
    trySaveLocal(KEYS.CHAT, list);
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
  },

  // --- CHECKLIST DYNAMIC METHODS ---
  getChecklistTemplate: (): ChecklistTemplateItem[] => {
      const stored = localStorage.getItem(KEYS.CHECKLIST_TEMPLATE);
      if (stored) {
          const parsed = JSON.parse(stored) as ChecklistTemplateItem[];
          if(parsed.length > 0) return parsed.sort((a,b) => a.legacyId - b.legacyId);
      }
      return DEFAULT_CHECKLIST; // Fallback se DB estiver vazio ou primeira vez
  },

  // --- AVAILABILITY METHODS ---
  getAvailability: (): AvailabilityRecord[] => {
      const data = localStorage.getItem(KEYS.AVAILABILITY);
      let parsed = data ? JSON.parse(data) : DEFAULT_AVAILABILITY;
      
      // Migration check: Ensure records have array statusMap (if coming from old format)
      // This protects against breaking changes if user had data stored
      if (parsed.length > 0 && typeof Object.values(parsed[0].statusMap)[0] === 'string') {
          parsed = parsed.map((rec: any) => {
              const newMap: Record<string, AvailabilityStatus[]> = {};
              Object.entries(rec.statusMap).forEach(([date, status]) => {
                  newMap[date] = [status as AvailabilityStatus];
              });
              return { ...rec, statusMap: newMap };
          });
          trySaveLocal(KEYS.AVAILABILITY, parsed);
      }
      
      return parsed;
  },

  saveAvailability: (records: AvailabilityRecord[]) => {
      trySaveLocal(KEYS.AVAILABILITY, records);
      triggerUpdate();
  },

  // Helper to append a status to a specific date/tag without overwriting existing ones
  addAvailabilityStatus: (tag: string, date: string, status: AvailabilityStatus) => {
      const records = StorageService.getAvailability();
      const recIndex = records.findIndex(r => r.tag === tag);
      
      // If tag doesn't exist, create it
      if (recIndex === -1) {
          records.push({
              id: crypto.randomUUID(),
              tag: tag,
              statusMap: { [date]: [status] }
          });
      } else {
          const currentStatuses = records[recIndex].statusMap[date] || [];
          // Avoid duplicates of exact same status on same day
          if (!currentStatuses.includes(status)) {
              records[recIndex].statusMap[date] = [...currentStatuses, status];
          }
      }
      trySaveLocal(KEYS.AVAILABILITY, records);
      triggerUpdate();
  }
};
