import { DocumentRecord, Employee, RegisteredART, User, ScheduleItem, ActiveMaintenance, MaintenanceLog, ChatMessage, OMRecord } from '../types';
import { supabase } from './supabase';

const KEYS = {
  DOCS: 'safemaint_docs',
  EMPLOYEES: 'safemaint_employees',
  // USERS removed from local storage for security
  ARTS: 'safemaint_arts',
  SCHEDULE: 'safemaint_schedule',
  ACTIVE: 'safemaint_active_tasks',
  HISTORY: 'safemaint_history',
  CHAT: 'safemaint_chat_history',
  OMS: 'safemaint_oms'
};

const chatChannel = new BroadcastChannel('safemaint_global_chat');

const triggerUpdate = () => {
    window.dispatchEvent(new Event('safemaint_storage_update'));
};

const triggerChatUpdate = () => {
    window.dispatchEvent(new Event('safemaint_chat_update'));
};

chatChannel.onmessage = (event) => {
    if (event.data.type === 'NEW_MESSAGE') {
        triggerChatUpdate();
    }
};

const seedEmployees: Employee[] = [];
// Seed Users removed. Authentication must go through Supabase.

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
    },
    {
        id: 'art-6134',
        code: '6134',
        company: 'Vale',
        taskName: 'TESTE E AJUSTE DAS SUSPENSÕES DE CAMINHÕES GRANDE PORTE',
        area: 'GER MANUT MINA PARAOPEBA SUL',
        omve: 'Não',
        emissionDate: '05/12/2025',
        risks: [
            { situation: 'QUEDA/ESCORREGÃO/TROPEÇO', total: 3, riskLevel: 'MÉDIA' },
            { situation: 'PRENSAMENTO DO CORPO', total: 3, riskLevel: 'MÉDIA' },
            { situation: 'CONTATOS CORTANTES', total: 3, riskLevel: 'MÉDIA' },
            { situation: 'PROJEÇÃO DE MATERIAIS', total: 2, riskLevel: 'MÉDIA' }
        ],
        controlMeasures: `MÉDIA: Manter área organizada. Usar luvas anti impacto. Não expor membros a prensamento. Inspecionar ferramentas. Utilizar caminho seguro. Descartar ferramentas defeituosas. Manter comunicação visual.`,
        steps: [
            { item: 1, step: 'Posicionar equipamento no box', riskLevel: 'MÉDIA' },
            { item: 8, step: 'BLOQUEAR / DESBLOQUEAR EQUIPAMENTO', riskLevel: 'MÉDIA' },
            { item: 13, step: 'Organizar / preparar ferramentas de trabalho', riskLevel: 'MÉDIA' },
            { item: 16, step: 'CALIBRAR SUSPENSÃO', riskLevel: 'MÉDIA' },
            { item: 22, step: 'Organização da área e liberação', riskLevel: 'MÉDIA' }
        ]
    },
    {
        id: 'art-22662',
        code: '22662',
        company: 'Vale',
        taskName: 'DIAGNÓSTICO DE FALHA/PANE DE EQUIPAMENTO EM MINA',
        area: 'SUP MANUT EQUIP PESADO MINERAC',
        omve: 'Não',
        emissionDate: '09/12/2025',
        risks: [
            { situation: 'PROJEÇÃO DE MATERIAIS', total: 3, riskLevel: 'MÉDIA' },
            { situation: 'CONTATO COM PARTES MÓVEIS', total: 2, riskLevel: 'MÉDIA' },
            { situation: 'QUEDA DE PESSOA', total: 2, riskLevel: 'MÉDIA' }
        ],
        controlMeasures: `MÉDIA: Garantir calços instalados. Utilizar luvas anti impacto. Não colocar mãos em inspeção sensitiva. Avaliar área. Usar 3 pontos de apoio. Desligar chave geral e inserir cadeado. Isolar área.`,
        steps: [
            { item: 1, step: 'ISOLAR AREA QUANDO EM CAMPO', riskLevel: 'MÉDIA' },
            { item: 2, step: 'AO ACESSAR O EQUIPAMENTO PARA TESTES', riskLevel: 'MÉDIA' },
            { item: 3, step: 'Posicionar equipamento em área apropriada', riskLevel: 'BAIXA' },
            { item: 4, step: 'Realizar bloqueio de energias', riskLevel: 'MÉDIA' },
            { item: 5, step: 'Realizar pré inspeção nos pontos de falhas', riskLevel: 'MÉDIA' },
            { item: 6, step: 'Realizar mudança temporária de estado zero', riskLevel: 'MÉDIA' }
        ]
    },
    {
        id: 'art-32634',
        code: '32634',
        company: 'Vale',
        taskName: 'REVISÃO SISTEMATICA LUBRIFICAÇÃO CAT 775 / 777 / 785 / 789',
        area: 'GER MINERACAO JGD CFJ',
        omve: 'Não',
        emissionDate: '09/12/2025',
        risks: [
            { situation: 'BATIDA CONTRA - ESTRUTURA', total: 8, riskLevel: 'MÉDIA' },
            { situation: 'CONTATO COM PRODUTOS QUÍMICOS', total: 7, riskLevel: 'MÉDIA' },
            { situation: 'QUEDA DE PESSOA', total: 4, riskLevel: 'MÉDIA' }
        ],
        controlMeasures: `MÉDIA: Utilizar creme protetor, macacão Tyvec, kit ambiental. Luvas de segurança. Manter área limpa. Check-list pré uso. Proteção anticorte. Fazer teste de efetividade de bloqueio.`,
        steps: [
            { item: 1, step: 'Preparar equipamentos e acessórios', riskLevel: 'MÉDIA' },
            { item: 3, step: 'BLOQUEAR SISTEMA HIDRÁULICO E DIREÇÃO', riskLevel: 'MÉDIA' },
            { item: 4, step: 'REALIZAR COLETA DE AMOSTRAS', riskLevel: 'MÉDIA' },
            { item: 5, step: 'BLOQUEAR EQUIPAMENTO CHAVE GERAL', riskLevel: 'MÉDIA' },
            { item: 6, step: 'TROCAR OLEO RODAS E SISTEMAS', riskLevel: 'MÉDIA' },
            { item: 12, step: 'REALIZAR LUBRIFICAÇÃO MANUAL', riskLevel: 'MÉDIA' }
        ]
    },
    {
        id: 'art-33854',
        code: '33854',
        company: 'Vale',
        taskName: 'REVISÃO SISTEMATICA ELETRICA CAT 775, 777, 785, 789',
        area: 'GER MANUTENCAO MUT/CPX',
        omve: 'Não',
        emissionDate: '09/12/2025',
        risks: [
            { situation: 'QUEDA/ESCORREGÃO', total: 6, riskLevel: 'MÉDIA' },
            { situation: 'BATIDA CONTRA ESTRUTURA', total: 5, riskLevel: 'MÉDIA' },
            { situation: 'QUEDA DE PESSOA', total: 5, riskLevel: 'MÉDIA' },
            { situation: 'CONTATO COM SUPERFÍCIE ENERGIZADA', total: 2, riskLevel: 'MÉDIA' }
        ],
        controlMeasures: `MÉDIA: Utilizar EPI's completos. Manter ferramentas limpas. Não deixar objetos soltos. Realizar FALAAD. Solicitar reparo de arestas. Utilizar ferramentas isoladas. Bloquear na chave geral.`,
        steps: [
            { item: 1, step: 'Preparar equipamentos', riskLevel: 'MÉDIA' },
            { item: 4, step: 'BLOQUEAR SISTEMA HIDRÁULICO E DIREÇÃO', riskLevel: 'MÉDIA' },
            { item: 5, step: 'Inspecionar circuito elétrico', riskLevel: 'MÉDIA' },
            { item: 6, step: 'BLOQUEAR EQUIPAMENTO CHAVE GERAL', riskLevel: 'MÉDIA' },
            { item: 7, step: 'Manutenir circuito de baixa tensão', riskLevel: 'MÉDIA' }
        ]
    },
    {
        id: 'art-37798',
        code: '37798',
        company: 'Vale',
        taskName: 'REMOVER E INSTALAR LINHAS HIDRAULICAS CAMINHÃO CAT',
        area: 'GER OPERAÇÕES E MANUT AG LIMPA',
        omve: 'Não',
        emissionDate: '09/12/2025',
        risks: [
            { situation: 'CONTATOS COM SUPERFÍCIES CORTANTES', total: 5, riskLevel: 'MÉDIA' },
            { situation: 'QUEDA DE PESSOA', total: 4, riskLevel: 'MÉDIA' },
            { situation: 'CONTATO COM PRODUTOS QUÍMICOS', total: 3, riskLevel: 'MÉDIA' }
        ],
        controlMeasures: `MÉDIA: Utilizar luvas anti-impacto. Utilizar escada plataforma e cinto. Usar EPIs conforme FISPQ. Organizar área. Verificar encaixe de ferramentas. Realizar despressurização.`,
        steps: [
            { item: 1, step: 'Bloquear equipamento e testar efetividade', riskLevel: 'MÉDIA' },
            { item: 2, step: 'Posicionar coletor para drenagem', riskLevel: 'MÉDIA' },
            { item: 3, step: 'Drenar oleo dos componentes', riskLevel: 'MÉDIA' },
            { item: 4, step: 'Remover/ instalar linhas hidraulicas', riskLevel: 'MÉDIA' },
            { item: 5, step: 'Recolher e descartar peças', riskLevel: 'MÉDIA' }
        ]
    }
];
const seedSchedule: ScheduleItem[] = [];

export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: 'URGENT' | 'WARNING' | 'INFO';
    date: string;
}

// --- SUPABASE SYNC HELPERS ---
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
  // Inicialização e Sincronização
  initialSync: async () => {
      console.log('Starting Supabase Sync...');
      
      // SECURITY FIX: 'users' removed from sync to prevent downloading passwords to browser
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
                  
                  const merged = [
                      ...data, 
                      ...localData.filter((l: any) => !serverIds.has(l.id))
                  ];
                  
                  localStorage.setItem(t.key, JSON.stringify(merged));
              }
          } catch (e) {
              console.log(`Sync skipped for ${t.name} (Table might not exist or network error)`);
          }
      }
      triggerUpdate();
      triggerChatUpdate();
  },

  // --- AUTHENTICATION (SECURITY FIX) ---
  validateUser: async (login: string, pass: string): Promise<User | null> => {
      try {
          // SECURITY FIX: Check credentials on server-side, do not download table
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('login', login)
            .eq('password', pass)
            .single();
            
          if (error || !data) {
              // Fallback only for Admin Seed if DB is empty/offline and matches hardcoded fallback (Emergency Only)
              if (login === 'ADMIN' && pass === '123') {
                  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
                  if (count === 0) {
                      return { id: 'admin', name: 'ADMINISTRADOR', matricula: '0000', login: 'ADMIN', password: '123', role: 'ADMIN' };
                  }
              }
              return null;
          }
          return data as User;
      } catch (e) {
          console.error("Auth Error", e);
          return null;
      }
  },

  // --- USER MANAGEMENT (DIRECT TO DB) ---
  // These functions now interact directly with Supabase to avoid local storage of sensitive data
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

  // --- CHAT SYSTEM ---
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
      chatChannel.postMessage({ type: 'NEW_MESSAGE', payload: msg });
      pushToSupabase('chat', msg); 
  },
  
  receiveExternalMessage: (msg: ChatMessage) => {
      const messages = StorageService.getChatMessages();
      if(messages.some(m => m.id === msg.id)) return;
      messages.push(msg);
      if(messages.length > 100) messages.shift();
      localStorage.setItem(KEYS.CHAT, JSON.stringify(messages));
      triggerChatUpdate();
  },

  clearChat: () => {
      localStorage.setItem(KEYS.CHAT, '[]');
      triggerChatUpdate();
      chatChannel.postMessage({ type: 'NEW_MESSAGE' });
  },

  // --- OMS MANAGEMENT ---
  getOMs: (): OMRecord[] => {
      const data = localStorage.getItem(KEYS.OMS);
      return data ? JSON.parse(data) : [];
  },

  saveOM: (om: OMRecord, broadcast = true) => {
      const oms = StorageService.getOMs();
      const index = oms.findIndex(o => o.id === om.id);
      if(index >= 0) {
          oms[index] = om;
      } else {
          oms.push(om);
      }
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

  runRetentionPolicy: () => {
    try {
        const data = localStorage.getItem(KEYS.DOCS);
        if (!data) return;
        let docs: DocumentRecord[] = JSON.parse(data);
        const now = new Date().getTime();
        const ONE_DAY = 24 * 60 * 60 * 1000;
        let changed = false;

        const updatedDocs = docs.filter(doc => {
            const created = new Date(doc.createdAt).getTime();
            const diffDays = (now - created) / ONE_DAY;
            if (diffDays > 60) {
                changed = true;
                deleteFromSupabase('documents', doc.id); // Also clean form DB
                return false;
            }
            return true;
        }).map(doc => {
            const created = new Date(doc.createdAt).getTime();
            const diffDays = (now - created) / ONE_DAY;
            if (diffDays > 7 && doc.status === 'ATIVO') {
                changed = true;
                const updated = { ...doc, status: 'ARQUIVADO' as const };
                pushToSupabase('documents', updated);
                return updated;
            }
            return doc;
        });

        if (changed) {
            localStorage.setItem(KEYS.DOCS, JSON.stringify(updatedDocs));
            triggerUpdate();
        }
    } catch (e) {
        console.error("Erro ao rodar política de retenção", e);
    }
  },

  getDocuments: (): DocumentRecord[] => {
    try {
      const data = localStorage.getItem(KEYS.DOCS);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  },

  saveDocument: (doc: DocumentRecord, broadcast = true) => {
    const docs = StorageService.getDocuments();
    const existingIndex = docs.findIndex(d => d.id === doc.id);
    if (existingIndex >= 0) {
      docs[existingIndex] = doc;
    } else {
      docs.push(doc);
    }
    localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
    triggerUpdate();
    pushToSupabase('documents', doc);
  },
  
  moveToTrash: (id: string) => {
    const docs = StorageService.getDocuments();
    const updatedDocs = docs.map(d => {
        if (d.id === id) {
            const updated = { ...d, status: 'LIXEIRA' as const };
            pushToSupabase('documents', updated);
            return updated;
        }
        return d;
    });
    localStorage.setItem(KEYS.DOCS, JSON.stringify(updatedDocs));
    triggerUpdate();
  },

  moveManyToTrash: (ids: string[]) => {
    const docs = StorageService.getDocuments();
    const updatedDocs = docs.map(d => {
        if (ids.includes(d.id)) {
            const updated = { ...d, status: 'LIXEIRA' as const };
            pushToSupabase('documents', updated);
            return updated;
        }
        return d;
    });
    localStorage.setItem(KEYS.DOCS, JSON.stringify(updatedDocs));
    triggerUpdate();
  },

  restoreFromTrash: (id: string) => {
    const docs = StorageService.getDocuments();
    let restoredDoc: DocumentRecord | null = null;
    const updatedDocs = docs.map(d => {
        if (d.id === id) {
            const created = new Date(d.createdAt).getTime();
            const now = new Date().getTime();
            const diffDays = (now - created) / (24 * 60 * 60 * 1000);
            const newStatus = diffDays > 7 ? 'ARQUIVADO' : 'ATIVO';
            restoredDoc = { ...d, status: newStatus as any };
            pushToSupabase('documents', restoredDoc);
            return restoredDoc;
        }
        return d;
    });
    localStorage.setItem(KEYS.DOCS, JSON.stringify(updatedDocs));
    triggerUpdate();
  },

  deletePermanently: (id: string) => {
    const docs = StorageService.getDocuments();
    const updatedDocs = docs.filter(d => d.id !== id);
    localStorage.setItem(KEYS.DOCS, JSON.stringify(updatedDocs));
    triggerUpdate();
    deleteFromSupabase('documents', id);
  },

  emptyTrash: () => {
    const docs = StorageService.getDocuments();
    const trashItems = docs.filter(doc => doc.status === 'LIXEIRA');
    trashItems.forEach(item => deleteFromSupabase('documents', item.id));
    
    const activeDocs = docs.filter(doc => doc.status !== 'LIXEIRA');
    localStorage.setItem(KEYS.DOCS, JSON.stringify(activeDocs));
    triggerUpdate();
  },

  getEmployees: (): Employee[] => {
    const data = localStorage.getItem(KEYS.EMPLOYEES);
    const emps: Employee[] = data ? JSON.parse(data) : seedEmployees;
    return emps.map(e => ({ ...e, status: e.status || 'ACTIVE' }));
  },
  
  addEmployee: (emp: Employee) => {
    const list = StorageService.getEmployees();
    const newEmp = { ...emp, status: 'ACTIVE' as const };
    list.push(newEmp);
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
    triggerUpdate();
    pushToSupabase('employees', newEmp);
  },

  updateEmployee: (updatedEmp: Employee) => {
    const list = StorageService.getEmployees();
    const index = list.findIndex(e => e.id === updatedEmp.id);
    if(index >= 0) {
        list[index] = { ...list[index], ...updatedEmp };
        localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
        triggerUpdate();
        pushToSupabase('employees', list[index]);
        return true;
    }
    return false;
  },

  deleteEmployee: (id: string) => {
    const list = StorageService.getEmployees();
    const updatedList = list.map(e => {
        if(e.id === id) {
            const updated = { ...e, status: 'TRASH' as const };
            pushToSupabase('employees', updated);
            return updated;
        }
        return e;
    });
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(updatedList));
    triggerUpdate();
  },

  restoreEmployee: (id: string) => {
    const list = StorageService.getEmployees();
    const updatedList = list.map(e => {
        if(e.id === id) {
            const updated = { ...e, status: 'ACTIVE' as const };
            pushToSupabase('employees', updated);
            return updated;
        }
        return e;
    });
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(updatedList));
    triggerUpdate();
  },

  deleteEmployeePermanently: (id: string) => {
    const list = StorageService.getEmployees();
    const newList = list.filter(e => e.id !== id);
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(newList));
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
    const list = StorageService.getARTs();
    const newList = list.filter(a => a.id !== id);
    localStorage.setItem(KEYS.ARTS, JSON.stringify(newList));
    triggerUpdate();
    deleteFromSupabase('arts', id);
  },

  getSchedule: (): ScheduleItem[] => {
    const data = localStorage.getItem(KEYS.SCHEDULE);
    return data ? JSON.parse(data) : seedSchedule;
  },
  updateSchedule: (items: ScheduleItem[], broadcast = true) => {
      localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(items));
      triggerUpdate();
      
      // Batch Upsert
      if(items.length > 0) pushToSupabase('schedule', items);
  },
  deleteScheduleItem: (id: string) => {
      const items = StorageService.getSchedule();
      const filtered = items.filter(i => i.id !== id);
      localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(filtered));
      triggerUpdate();
      deleteFromSupabase('schedule', id);
  },
  clearSchedule: () => {
      localStorage.setItem(KEYS.SCHEDULE, '[]');
      triggerUpdate();
  },
  
  archiveAndClearSchedule: () => {
    const schedule = StorageService.getSchedule();
    if (schedule.length === 0) return false; 

    const backupDoc: DocumentRecord = {
        id: crypto.randomUUID(),
        type: 'RELATORIO',
        header: {
            om: `PROGRAMAÇÃO SEMANAL`,
            tag: `BACKUP ${new Date().toLocaleDateString()}`,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0, 5),
            type: 'OUTROS',
            description: `Backup de ${schedule.length} itens da programação semanal.`
        },
        createdAt: new Date().toISOString(),
        status: 'LIXEIRA', 
        content: {
            isBackup: true,
            scheduleItems: schedule,
            rawText: `Backup da programação de ${new Date().toLocaleString()}`
        },
        signatures: []
    };

    StorageService.saveDocument(backupDoc);
    
    localStorage.setItem(KEYS.SCHEDULE, '[]');
    triggerUpdate();
    
    return true; 
  },
  
  getActiveMaintenances: (): ActiveMaintenance[] => {
    const data = localStorage.getItem(KEYS.ACTIVE);
    return data ? JSON.parse(data) : [];
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
    const tasks = StorageService.getActiveMaintenances();
    const taskIndex = tasks.findIndex(t => t.id === id);
    
    if (taskIndex !== -1) {
      const task = tasks[taskIndex];
      let totalMs = task.accumulatedTime || 0;
      if (task.status === 'ANDAMENTO' && task.currentSessionStart) {
          const sessionStart = new Date(task.currentSessionStart).getTime();
          totalMs += (Date.now() - sessionStart);
      }
      
      const hours = Math.floor(totalMs / (1000 * 60 * 60));
      const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);
      const durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      let responsible = "N/D";
      const docs = StorageService.getDocuments();
      const artDoc = docs.find(d => d.id === task.artId);
      if (artDoc && artDoc.signatures && artDoc.signatures.length > 0) {
        responsible = artDoc.signatures[0].name;
      }

      const log: MaintenanceLog = {
        id: crypto.randomUUID(),
        om: task.header.om,
        tag: task.header.tag,
        description: task.header.description,
        startTime: task.startTime,
        endTime: new Date().toISOString(),
        duration: durationStr,
        responsible: responsible,
        status: status
      };

      StorageService.addToHistory(log);
      tasks.splice(taskIndex, 1);
      localStorage.setItem(KEYS.ACTIVE, JSON.stringify(tasks));
      triggerUpdate();
      deleteFromSupabase('active_maintenance', id);
    }
  },
  
  getActiveMaintenanceById: (id: string): ActiveMaintenance | undefined => {
      const tasks = StorageService.getActiveMaintenances();
      return tasks.find(t => t.id === id);
  },

  getHistory: (): MaintenanceLog[] => {
    const data = localStorage.getItem(KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  },
  addToHistory: (log: MaintenanceLog) => {
    const logs = StorageService.getHistory();
    logs.unshift(log); 
    if (logs.length > 50) logs.pop();
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(logs));
    triggerUpdate();
    pushToSupabase('history', log);
  },

  getNotifications: (): NotificationItem[] => {
      const schedule = StorageService.getSchedule();
      const oms = StorageService.getOMs();
      
      const notifications: NotificationItem[] = [];
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Schedule Notifications
      if (schedule.length > 0) {
        schedule.forEach(item => {
            if(!item.dateStart) return;
            const parts = item.dateStart.trim().split('/');
            if(parts.length < 2) return;
            const year = parts.length === 3 ? parseInt(parts[2]) : today.getFullYear();
            const month = parseInt(parts[1]) - 1; 
            const day = parseInt(parts[0]);
            const itemDate = new Date(year, month, day);
            itemDate.setHours(0,0,0,0);

            let type: 'URGENT' | 'WARNING' | 'INFO' | null = null;
            let title = '';
            let msg = '';

            if (itemDate.getTime() < today.getTime()) {
                type = 'URGENT';
                title = 'ATIVIDADE ATRASADA';
                msg = `OM: ${item.frotaOm} estava agendada para ${item.dateStart}.`;
            } else if (itemDate.getTime() === today.getTime()) {
                type = 'WARNING';
                title = 'PROGRAMADO PARA HOJE';
                msg = `Preventiva: ${item.frotaOm} - ${item.description}`;
            } else if (itemDate.getTime() === tomorrow.getTime()) {
                type = 'INFO';
                title = 'PROGRAMADO PARA AMANHÃ';
                msg = `Prepare-se: ${item.frotaOm}`;
            }

            if (type) {
                notifications.push({ id: item.id, type, title, message: msg, date: item.dateStart });
            }
        });
      }

      // OM Notifications
      oms.forEach(om => {
          if (om.status === 'PENDENTE') {
              notifications.push({
                  id: om.id,
                  type: om.type === 'CORRETIVA' ? 'URGENT' : 'INFO',
                  title: `NOVA OM ${om.type}`,
                  message: `OM ${om.omNumber} - ${om.description} criada por ${om.createdBy}.`,
                  date: new Date(om.createdAt).toLocaleDateString()
              });
          }
      });

      return notifications.sort((a, b) => {
          const score = (t: string) => t === 'URGENT' ? 3 : t === 'WARNING' ? 2 : 1;
          return score(b.type) - score(a.type);
      });
  }
};