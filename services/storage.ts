
import { DocumentRecord, Employee, RegisteredART, User, ScheduleItem, ActiveMaintenance, MaintenanceLog, ChatMessage, OMRecord, ChecklistTemplateItem, AvailabilityRecord, PendingExtraDemand } from '../types';
import { supabase } from './supabase';

export interface NotificationItem {
    id: string;
    type: 'URGENT' | 'INFO';
    title: string;
    message: string;
    date: string;
    source?: 'OM' | 'DEMAND'; // Added to distinguish source
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
  USERS: 'safemaint_users',
  PENDING_DEMANDS: 'safemaint_pending_demands'
};

const triggerUpdate = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('safemaint_storage_update'));
    }
};

const trySaveLocal = (key: string, data: any, stripFields: string[] = []) => {
    try {
        let cleanData = data;
        // Se houver campos para remover (como pdfUrl), cria uma cópia limpa
        if (stripFields.length > 0 && Array.isArray(data)) {
            cleanData = data.map(item => {
                const copy = { ...item };
                stripFields.forEach(f => delete copy[f]);
                return copy;
            });
        }
        localStorage.setItem(key, JSON.stringify(cleanData));
    } catch (e) {
        console.error(`[STORAGE] Erro de cota ao salvar ${key}. Dados pesados foram omitidos.`, e);
        // Fallback: Tenta salvar array vazio se falhar, para não quebrar a app
        try {
             if (Array.isArray(data)) localStorage.setItem(key, '[]');
        } catch (e2) { console.error("Falha crítica no storage", e2); }
    }
};

const stripDataIfNeeded = (key: string, data: any) => {
    if (key === KEYS.OMS || key === KEYS.ARTS) {
        if(data.pdfUrl) delete data.pdfUrl;
    }
    if (key === KEYS.DOCS) {
        if(data.manualFileUrl) delete data.manualFileUrl;
        if(data.content?.manualFileUrl) delete data.content.manualFileUrl;
    }
    return data;
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
  // CONFIGURAÇÃO DO REALTIME (AUTO-UPDATE)
  setupSubscriptions: () => {
      if (typeof window === 'undefined') return;
      supabase.removeAllChannels(); // Limpa anteriores para não duplicar

      const channel = supabase.channel('global-app-changes');
      
      const tablesMap = [
          { key: KEYS.OMS, table: 'oms' },
          { key: KEYS.ARTS, table: 'arts' },
          { key: KEYS.SCHEDULE, table: 'schedule' },
          { key: KEYS.ACTIVE, table: 'active_maintenance' },
          { key: KEYS.DOCS, table: 'documents' },
          { key: KEYS.EMPLOYEES, table: 'employees' },
          { key: KEYS.USERS, table: 'users' },
          { key: KEYS.HISTORY, table: 'history' },
          { key: KEYS.AVAILABILITY, table: 'availability' },
          { key: KEYS.CHAT, table: 'chat_messages' },
          { key: KEYS.PENDING_DEMANDS, table: 'pending_extra_demands' },
          { key: KEYS.CHECKLIST_TEMPLATE, table: 'checklist_definitions' } // Adicionado
      ];

      tablesMap.forEach(config => {
          channel.on(
              'postgres_changes',
              { event: '*', schema: 'public', table: config.table },
              (payload) => {
                  // CASO CHAT: Tratamento especial
                  if (config.key === KEYS.CHAT) {
                      const list = JSON.parse(localStorage.getItem(KEYS.CHAT) || '[]');
                      if (payload.eventType === 'INSERT') {
                          list.push(payload.new);
                          localStorage.setItem(KEYS.CHAT, JSON.stringify(list));
                      } else if (payload.eventType === 'DELETE') {
                          const newList = list.filter((m: any) => m.id !== payload.old.id);
                          localStorage.setItem(KEYS.CHAT, JSON.stringify(newList));
                      }
                      window.dispatchEvent(new Event('safemaint_chat_update'));
                      return;
                  }

                  // CASO GERAL
                  const localList = JSON.parse(localStorage.getItem(config.key) || '[]');
                  
                  if (payload.eventType === 'DELETE') {
                      // EXCLUSÃO AUTOMÁTICA
                      const idToDelete = payload.old.id;
                      const newList = localList.filter((item: any) => item.id !== idToDelete);
                      localStorage.setItem(config.key, JSON.stringify(newList));
                      triggerUpdate(); // Atualiza a tela
                  } 
                  else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                      // INSERÇÃO/ATUALIZAÇÃO AUTOMÁTICA
                      let item = payload.new;
                      item = stripDataIfNeeded(config.key, item); // Remove campos pesados (PDFs)
                      
                      const idx = localList.findIndex((i: any) => i.id === item.id);
                      if (idx > -1) {
                          // Preserva campos locais se necessário, mas aqui sobrescrevemos para garantir sync
                          localList[idx] = { ...localList[idx], ...item };
                      } else {
                          localList.push(item);
                      }
                      localStorage.setItem(config.key, JSON.stringify(localList));
                      triggerUpdate(); // Atualiza a tela
                  }
              }
          );
      });

      channel.subscribe((status) => {
          if(status === 'SUBSCRIBED') console.log('SAFEMAINT: Realtime Ativo');
      });
  },

  initialSync: async () => {
      if (!navigator.onLine) return;

      const tables = [
          { local: KEYS.DOCS, remote: 'documents', strip: ['manualFileUrl'] },
          { local: KEYS.EMPLOYEES, remote: 'employees' },
          { local: KEYS.OMS, remote: 'oms', strip: ['pdfUrl'] }, // Strip PDF for local storage
          { local: KEYS.ARTS, remote: 'arts', strip: ['pdfUrl'] }, // Strip PDF for local storage
          { local: KEYS.SCHEDULE, remote: 'schedule' },
          { local: KEYS.HISTORY, remote: 'history' },
          { local: KEYS.ACTIVE, remote: 'active_maintenance' },
          { local: KEYS.USERS, remote: 'users' },
          { local: KEYS.CHECKLIST_TEMPLATE, remote: 'checklist_definitions' },
          { local: KEYS.AVAILABILITY, remote: 'availability' },
          { local: KEYS.CHAT, remote: 'chat_messages' },
          { local: KEYS.PENDING_DEMANDS, remote: 'pending_extra_demands' }
      ];

      for (const t of tables) {
          try {
              const { data, error } = await supabase.from(t.remote).select('*');
              
              if (!error && data) {
                  const localData = JSON.parse(localStorage.getItem(t.local) || '[]');
                  const remoteIds = new Set(data.map((item: any) => item.id));
                  
                  const merged = [...data];
                  
                  // Preserva itens locais que ainda não subiram (opcional, mas seguro)
                  localData.forEach((lItem: any) => {
                      if (!remoteIds.has(lItem.id)) {
                          // merged.push(lItem); // Comentado para forçar a verdade do servidor na inicialização
                      }
                  });

                  trySaveLocal(t.local, merged, t.strip || []);
                  
                  if (t.local === KEYS.CHECKLIST_TEMPLATE && merged.length === 0) {
                      trySaveLocal(KEYS.CHECKLIST_TEMPLATE, DEFAULT_CHECKLIST);
                  }
              }
          } catch (e) {
              console.warn(`[SYNC] Falha leve ao sincronizar ${t.remote}`, e);
          }
      }
      triggerUpdate();
  },

  getPendingSyncCount: () => 0,

  // VALIDAÇÃO DE LOGIN ÚNICO
  validateUser: async (login: string, pass: string): Promise<User | null> => {
      try {
          if (navigator.onLine) {
              // Verifica se usuário existe e senha confere
              const { data, error } = await supabase.from('users').select('*').eq('login', login.toUpperCase()).eq('password', pass).single();
              
              if (!error && data) {
                  // VERIFICAÇÃO DE SESSÃO ATIVA (Login Único)
                  if (data.is_active_session) {
                      throw new Error("ALREADY_LOGGED_IN");
                  }

                  // Marca como logado
                  await supabase.from('users').update({ is_active_session: true }).eq('id', data.id);

                  StorageService.saveUser(data); 
                  return data as User;
              }

              if (!data) {
                  // Fallback para admin inicial
                  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
                  if (count === 0 && login.toUpperCase() === '81025901' && pass === '123') {
                      const defaultAdmin: User = {
                          id: 'default-admin',
                          name: 'ADMINISTRADOR',
                          matricula: '81025901',
                          login: '81025901',
                          password: '123',
                          role: 'ADMIN'
                      };
                      await supabase.from('users').insert(defaultAdmin);
                      return defaultAdmin;
                  }
              }
          }
      } catch (e: any) {
          if (e.message === "ALREADY_LOGGED_IN") throw e;
          console.error("Login offline fallback", e);
      }

      // Offline fallback
      const localUsers = StorageService.getUsers();
      return localUsers.find(u => u.login === login.toUpperCase() && u.password === pass) || null;
  },

  // LOGOUT COM LIBERAÇÃO DE SESSÃO
  logoutUser: async (login: string) => {
      if (navigator.onLine && login) {
          try {
              // Libera a flag is_active_session
              await supabase.from('users').update({ is_active_session: false }).eq('login', login.toUpperCase());
          } catch(e) {
              console.error("Erro ao fazer logout remoto", e);
          }
      }
  },

  registerUser: async (newUser: User): Promise<{ success: boolean; message: string }> => {
        if (!newUser.login || !newUser.password || !newUser.matricula || !newUser.name) {
            return { success: false, message: 'Preencha todos os campos obrigatórios.' };
        }

        if (navigator.onLine) {
            try {
                const { data } = await supabase.from('users').select('id')
                    .or(`login.eq.${newUser.login},matricula.eq.${newUser.matricula}`);
                
                if (data && data.length > 0) {
                    return { success: false, message: 'Usuário ou Matrícula já cadastrados no sistema.' };
                }
            } catch (e) {}
        }

        const localUsers = StorageService.getUsers();
        if (localUsers.some(u => u.login === newUser.login || u.matricula === newUser.matricula)) {
            return { success: false, message: 'Usuário já existe localmente.' };
        }

        await StorageService.saveUser(newUser);
        return { success: true, message: 'Cadastro realizado com sucesso!' };
  },

  getUsers: (): User[] => {
      const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
      if (users.length === 0) {
          const defaultUser: User = {
              id: 'default-admin',
              name: 'ADMINISTRADOR',
              matricula: '81025901',
              login: '81025901',
              password: '123',
              role: 'ADMIN'
          };
          users.push(defaultUser);
          localStorage.setItem(KEYS.USERS, JSON.stringify(users));
      }
      return users;
  },

  saveUser: async (user: User) => {
      const list = StorageService.getUsers();
      const idx = list.findIndex(u => u.id === user.id);
      if(idx > -1) list[idx] = user; else list.push(user);
      trySaveLocal(KEYS.USERS, list);
      triggerUpdate();
      try { await supabase.from('users').upsert(user); } catch(e) {}
  },
  deleteUser: async (id: string) => {
      const list = StorageService.getUsers().filter(u => u.id !== id);
      trySaveLocal(KEYS.USERS, list);
      triggerUpdate();
      try { await supabase.from('users').delete().eq('id', id); } catch(e) {}
  },

  getEmployees: (): Employee[] => JSON.parse(localStorage.getItem(KEYS.EMPLOYEES) || '[]'),
  saveEmployee: async (emp: Employee) => {
      const list = StorageService.getEmployees();
      const idx = list.findIndex(e => e.id === emp.id);
      if(idx > -1) list[idx] = emp; else list.push(emp);
      trySaveLocal(KEYS.EMPLOYEES, list);
      triggerUpdate();
      try { await supabase.from('employees').upsert(emp); } catch(e) {}
  },
  deleteEmployee: async (id: string) => {
      const list = StorageService.getEmployees().filter(e => e.id !== id);
      trySaveLocal(KEYS.EMPLOYEES, list);
      triggerUpdate();
      try { await supabase.from('employees').delete().eq('id', id); } catch(e) {}
  },

  getSchedule: (): ScheduleItem[] => JSON.parse(localStorage.getItem(KEYS.SCHEDULE) || '[]'),
  saveScheduleItem: async (item: ScheduleItem) => {
      const list = StorageService.getSchedule();
      const idx = list.findIndex(i => i.id === item.id);
      if(idx > -1) list[idx] = item; else list.push(item);
      trySaveLocal(KEYS.SCHEDULE, list);
      triggerUpdate();
      try { await supabase.from('schedule').upsert(item); } catch(e) {}
  },
  deleteScheduleItem: async (id: string) => {
      const list = StorageService.getSchedule().filter(i => i.id !== id);
      trySaveLocal(KEYS.SCHEDULE, list);
      triggerUpdate();
      try { await supabase.from('schedule').delete().eq('id', id); } catch(e) {}
  },
  archiveAndClearSchedule: async () => {
    localStorage.setItem(KEYS.SCHEDULE, '[]');
    triggerUpdate();
    try { await supabase.from('schedule').delete().neq('id', '0'); } catch(e) {}
  },

  getOMs: (): OMRecord[] => JSON.parse(localStorage.getItem(KEYS.OMS) || '[]'),
  saveOM: async (om: OMRecord) => {
    const list = StorageService.getOMs();
    const idx = list.findIndex(o => o.id === om.id);
    if (idx > -1) list[idx] = om; else list.push(om);
    
    // IMPORTANT: Strip PDF from local storage to avoid Quota Exceeded
    trySaveLocal(KEYS.OMS, list, ['pdfUrl']); 
    triggerUpdate();

    try { await supabase.from('oms').upsert(om); } catch(e) {}
  },
  updateOMStatus: async (id: string, status: any) => {
      const list = StorageService.getOMs();
      const om = list.find(o => o.id === id);
      if (om) {
          om.status = status;
          trySaveLocal(KEYS.OMS, list, ['pdfUrl']);
          triggerUpdate();
          try { await supabase.from('oms').update({ status }).eq('id', id); } catch(e) {}
      }
  },
  deleteOM: async (id: string) => {
    const list = StorageService.getOMs().filter(o => o.id !== id);
    trySaveLocal(KEYS.OMS, list, ['pdfUrl']);
    triggerUpdate();
    try { await supabase.from('oms').delete().eq('id', id); } catch(e) {}
  },

  getARTs: (): RegisteredART[] => JSON.parse(localStorage.getItem(KEYS.ARTS) || '[]'),
  saveART: async (art: RegisteredART) => {
    const list = StorageService.getARTs();
    const idx = list.findIndex(a => a.id === art.id);
    if (idx > -1) list[idx] = art; else list.push(art);
    trySaveLocal(KEYS.ARTS, list, ['pdfUrl']); // Strip PDF
    triggerUpdate();
    try { await supabase.from('arts').upsert(art); } catch(e) {}
  },
  deleteART: async (id: string) => {
      const list = StorageService.getARTs().filter(a => a.id !== id);
      trySaveLocal(KEYS.ARTS, list, ['pdfUrl']);
      triggerUpdate();
      try { await supabase.from('arts').delete().eq('id', id); } catch(e) {}
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
    triggerUpdate();
    
    try { await supabase.from('active_maintenance').upsert(task); } catch(e) {}
    if (task.omId) await StorageService.updateOMStatus(task.omId, 'EM_ANDAMENTO');
  },
  
  linkOmToMaintenance: async (taskId: string, omId: string, omNumber: string, omDesc: string) => {
      const tasks = StorageService.getActiveMaintenances();
      const task = tasks.find(t => t.id === taskId);
      
      if (task) {
          // Atualiza a Tarefa
          task.omId = omId;
          task.header.om = omNumber;
          // Preserva descrição manual da demanda extra se necessário, ou concatena
          task.header.description = `${task.header.description} | ${omDesc}`; 
          
          trySaveLocal(KEYS.ACTIVE, tasks);
          
          // Atualiza o Documento (ART) vinculado à tarefa
          if (task.artId) {
              const docs = StorageService.getDocuments();
              const doc = docs.find(d => d.id === task.artId);
              if (doc) {
                  doc.header.om = omNumber;
                  doc.header.description = task.header.description;
                  trySaveLocal(KEYS.DOCS, docs, ['manualFileUrl']);
                  try { await supabase.from('documents').upsert(doc); } catch(e) {}
              }
          }

          triggerUpdate();
          
          // Atualiza o Status da OM para Em Andamento
          await StorageService.updateOMStatus(omId, 'EM_ANDAMENTO');
          
          // Sincroniza a task
          try { await supabase.from('active_maintenance').upsert(task); } catch(e) {}
      }
  },

  resumeMaintenance: async (id: string, newOwner?: string) => {
      const tasks = StorageService.getActiveMaintenances();
      const task = tasks.find(t => t.id === id);
      if (task) {
          task.status = 'ANDAMENTO';
          task.currentSessionStart = new Date().toISOString();
          
          // SE fornecido um novo dono (quem clicou retomar), atualiza a propriedade da task
          if (newOwner) {
              task.openedBy = newOwner;
          }
          
          trySaveLocal(KEYS.ACTIVE, tasks);
          triggerUpdate();
          try { await supabase.from('active_maintenance').upsert(task); } catch(e) {}
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
          triggerUpdate();
          try { await supabase.from('active_maintenance').upsert(task); } catch(e) {}
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
              endTime: new Date().toISOString(), duration: 'REGISTRADO',
              responsible: task.openedBy || 'SISTEMA', status: statusText,
              type: task.origin
          };
          const history = StorageService.getHistory();
          history.push(log);
          trySaveLocal(KEYS.HISTORY, history);
          triggerUpdate();
          try { await supabase.from('history').upsert(log); } catch(e) {}

          if (statusText === 'PARCIAL') {
              if (task.status === 'ANDAMENTO' && task.currentSessionStart) {
                  const now = new Date().getTime();
                  const start = new Date(task.currentSessionStart).getTime();
                  task.accumulatedTime = (task.accumulatedTime || 0) + (now - start);
              }
              task.status = 'AGUARDANDO';
              task.currentSessionStart = undefined;
              trySaveLocal(KEYS.ACTIVE, tasks);
              triggerUpdate();
              try { await supabase.from('active_maintenance').upsert(task); } catch(e) {}
              if (task.omId) await StorageService.updateOMStatus(task.omId, 'EM_ANDAMENTO');
              return;
          }

          if (task.artId) {
              const allDocs = StorageService.getDocuments();
              const artDoc = allDocs.find(d => d.id === task.artId);
              if (artDoc && artDoc.status === 'RASCUNHO') {
                  artDoc.status = 'ATIVO';
                  trySaveLocal(KEYS.DOCS, allDocs, ['manualFileUrl']);
                  try { await supabase.from('documents').upsert(artDoc); } catch(e) {}
              }
          }

          const newTasks = tasks.filter(t => t.id !== id);
          trySaveLocal(KEYS.ACTIVE, newTasks);
          triggerUpdate();
          try { await supabase.from('active_maintenance').delete().eq('id', id); } catch(e) {}
          
          if (task.omId) {
              if (closeOM) {
                  await StorageService.updateOMStatus(task.omId, 'CONCLUIDA');
              } else {
                  await StorageService.updateOMStatus(task.omId, 'EM_ANDAMENTO');
              }
          }
      }
  },

  getHistory: (): MaintenanceLog[] => JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]'),
  getDocuments: (): DocumentRecord[] => JSON.parse(localStorage.getItem(KEYS.DOCS) || '[]'),
  saveDocument: async (doc: DocumentRecord) => {
      const list = StorageService.getDocuments();
      list.push(doc);
      trySaveLocal(KEYS.DOCS, list, ['manualFileUrl']);
      triggerUpdate();
      try { await supabase.from('documents').upsert(doc); } catch(e) {}
  },
  moveManyToTrash: async (ids: string[]) => {
      const docs = StorageService.getDocuments();
      docs.forEach(d => { if (ids.includes(d.id)) d.status = 'LIXEIRA'; });
      trySaveLocal(KEYS.DOCS, docs);
      triggerUpdate();
      try { await supabase.from('documents').update({ status: 'LIXEIRA' }).in('id', ids); } catch(e) {}
  },
  restoreFromTrash: async (id: string) => {
      const docs = StorageService.getDocuments();
      const doc = docs.find(d => d.id === id);
      if (doc) {
          doc.status = 'ATIVO';
          trySaveLocal(KEYS.DOCS, docs);
          triggerUpdate();
          try { await supabase.from('documents').update({ status: 'ATIVO' }).eq('id', id); } catch(e) {}
      }
  },
  deletePermanently: async (id: string) => {
      const docs = StorageService.getDocuments().filter(d => d.id !== id);
      trySaveLocal(KEYS.DOCS, docs);
      triggerUpdate();
      try { await supabase.from('documents').delete().eq('id', id); } catch(e) {}
  },
  emptyTrash: async () => {
      const allDocs = StorageService.getDocuments();
      const trashIds = allDocs.filter(d => d.status === 'LIXEIRA').map(d => d.id);
      const remaining = allDocs.filter(d => d.status !== 'LIXEIRA');
      trySaveLocal(KEYS.DOCS, remaining);
      triggerUpdate();
      if (trashIds.length > 0) {
          try { await supabase.from('documents').delete().in('id', trashIds); } catch(e) {}
      }
  },
  getNotifications: (): NotificationItem[] => {
      const oms = StorageService.getOMs();
      const demands = StorageService.getPendingExtraDemands();

      const omNotifs: NotificationItem[] = oms.filter(o => o.status === 'PENDENTE').map(o => ({
          id: o.id, 
          type: (o.type === 'CORRETIVA' || o.type === 'DEMANDA' ? 'URGENT' : 'INFO') as 'URGENT' | 'INFO',
          title: `OM: ${o.omNumber}`, 
          message: `${o.tag} - ${o.description || 'Sem descrição'}`, // Mensagem com TAG e Desc
          date: o.createdAt, 
          source: 'OM'
      }));

      const demandNotifs: NotificationItem[] = demands.map(d => ({
          id: d.id,
          type: 'URGENT' as 'URGENT' | 'INFO',
          title: `DEMANDA EXTRA`,
          message: `${d.tag} - ${d.description || 'Sem descrição'}`,
          date: d.createdAt,
          source: 'DEMAND'
      }));

      const all = [...demandNotifs, ...omNotifs];
      // Ordenação correta por data (mais recente primeiro)
      return all.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(n => ({
          ...n,
          date: new Date(n.date).toLocaleDateString('pt-BR') // Formata para exibição
      }));
  },
  getAvailability: (): AvailabilityRecord[] => JSON.parse(localStorage.getItem(KEYS.AVAILABILITY) || '[]'),
  saveAvailability: async (recs: AvailabilityRecord[]) => {
      trySaveLocal(KEYS.AVAILABILITY, recs);
      triggerUpdate();
      try { await supabase.from('availability').upsert(recs); } catch(e) {}
  },
  moveToTrash: async (id: string) => {
      const docs = StorageService.getDocuments();
      const doc = docs.find(d => d.id === id);
      if (doc) { 
          doc.status = 'LIXEIRA'; 
          trySaveLocal(KEYS.DOCS, docs); 
          triggerUpdate();
          try { await supabase.from('documents').update({ status: 'LIXEIRA' }).eq('id', id); } catch(e) {}
      }
  },
  getChatMessages: (): ChatMessage[] => JSON.parse(localStorage.getItem(KEYS.CHAT) || '[]').sort((a: ChatMessage, b: ChatMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
  sendChatMessage: async (msg: ChatMessage) => {
      const list = StorageService.getChatMessages();
      list.push(msg);
      trySaveLocal(KEYS.CHAT, list);
      window.dispatchEvent(new Event('safemaint_chat_update'));
      
      try {
          await supabase.from('chat_messages').upsert({
              id: msg.id,
              sender: msg.sender,
              role: msg.role,
              text: msg.text,
              timestamp: msg.timestamp,
              is_system: msg.isSystem || false
          });
      } catch(e) {}
  },
  clearChat: async () => {
      localStorage.setItem(KEYS.CHAT, '[]');
      window.dispatchEvent(new Event('safemaint_chat_update'));
      try { await supabase.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch(e) {}
  },
  
  // --- DEMANDAS EXTRAS PENDENTES ---
  getPendingExtraDemands: (): PendingExtraDemand[] => JSON.parse(localStorage.getItem(KEYS.PENDING_DEMANDS) || '[]'),
  savePendingExtraDemand: async (demand: PendingExtraDemand) => {
      const list = StorageService.getPendingExtraDemands();
      list.push(demand);
      trySaveLocal(KEYS.PENDING_DEMANDS, list);
      triggerUpdate();
      try { await supabase.from('pending_extra_demands').upsert(demand); } catch(e) {}
  },
  deletePendingExtraDemand: async (id: string) => {
      const list = StorageService.getPendingExtraDemands().filter(d => d.id !== id);
      trySaveLocal(KEYS.PENDING_DEMANDS, list);
      triggerUpdate();
      try { await supabase.from('pending_extra_demands').delete().eq('id', id); } catch(e) {}
  },

  runRetentionPolicy: () => {}
};
