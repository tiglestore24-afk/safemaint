
import React, { useState, useEffect, useRef } from 'react';
import { StorageService, KEYS } from '../services/storage';
import { AvailabilityRecord, AvailabilityStatus } from '../types';
import { BackButton } from '../components/BackButton';
import { Plus, Trash2, X, RefreshCw, Activity, Save, Monitor, Info, Calendar, Lock } from 'lucide-react';

const BLACKLIST_KEY = 'safemaint_avail_blacklist';

const STATUS_CONFIG: Record<string, { label: string, type: 'SHAPE' | 'TEXT', color: string, bgColor: string, symbol: any }> = {
    'SEM_FALHA': { label: 'SEM FALHA (OPERACIONAL)', type: 'SHAPE', color: 'text-green-600', bgColor: 'bg-green-100', symbol: '●' },
    'PREV': { label: 'PREVENTIVA', type: 'SHAPE', color: 'text-blue-600', bgColor: 'bg-blue-100', symbol: '▲' },
    'CORRETIVA': { label: 'CORRETIVA', type: 'SHAPE', color: 'text-red-600', bgColor: 'bg-red-100', symbol: '●' },
    'DEMANDA_EXTRA': { label: 'DEMANDA EXTRA', type: 'SHAPE', color: 'text-pink-600', bgColor: 'bg-pink-100', symbol: '▲' }, 
    'INSPECAO': { label: 'INSPEÇÃO', type: 'SHAPE', color: 'text-purple-600', bgColor: 'bg-purple-100', symbol: '●' }, 
    'PR': { label: 'PARADA RELEVANTE', type: 'TEXT', color: 'text-orange-600', bgColor: 'bg-orange-100', symbol: 'PR' },
    'MOTOR': { label: 'MOTOR', type: 'TEXT', color: 'text-gray-800', bgColor: 'bg-gray-200', symbol: 'M' },
    'LB': { label: 'LUB. SEMANAL', type: 'TEXT', color: 'text-teal-800', bgColor: 'bg-teal-200', symbol: 'LB' },
    'PNEUS': { label: 'PNEUS', type: 'TEXT', color: 'text-blue-900', bgColor: 'bg-blue-300', symbol: 'P' },
    'META': { label: 'META BATIDA', type: 'SHAPE', color: 'text-yellow-600', bgColor: 'bg-yellow-100', symbol: '★' },
};

// Interface Props Atualizada
interface AvailabilityBoardProps {
    variant?: 'DEFAULT' | 'TV' | 'SPLIT';
}

export const AvailabilityBoard: React.FC<AvailabilityBoardProps> = ({ variant = 'DEFAULT' }) => {
  const [records, setRecords] = useState<AvailabilityRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const recordsRef = useRef<AvailabilityRecord[]>([]); // Ref para evitar flicker
  
  const [editingCell, setEditingCell] = useState<{tag: string, dateKey: string} | null>(null);
  const [tempStatuses, setTempStatuses] = useState<AvailabilityStatus[]>([]);
  const [lockedStatuses, setLockedStatuses] = useState<AvailabilityStatus[]>([]); // Status que não podem ser removidos
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [daysInMonth, setDaysInMonth] = useState<Date[]>([]);
  
  const [isTvModeInternal, setIsTvModeInternal] = useState(false);

  // Determina o modo real (Props tem prioridade sobre estado interno)
  const mode = variant !== 'DEFAULT' ? variant : (isTvModeInternal ? 'TV' : 'DEFAULT');

  useEffect(() => {
    const date = new Date(selectedYear, selectedMonth, 1);
    const days = [];
    while (date.getMonth() === selectedMonth) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    setDaysInMonth(days);
    
    const initialRecords = StorageService.getAvailability();
    if (JSON.stringify(initialRecords) !== JSON.stringify(recordsRef.current)) {
        recordsRef.current = initialRecords;
        setRecords(initialRecords);
    }
    
    // Pequeno delay para garantir que a UI carregue antes do sync pesado
    setTimeout(() => syncEventsOnly(days), 500);
    
    const handleExternalUpdate = (e: any) => {
        if (e.detail?.key === KEYS.AVAILABILITY) {
            const newRecs = StorageService.getAvailability();
            if (JSON.stringify(newRecs) !== JSON.stringify(recordsRef.current)) {
                recordsRef.current = newRecs;
                setRecords(newRecs);
            }
        } else {
            // Se mudou Schedule/History, força sync
            syncEventsOnly(daysInMonth.length > 0 ? daysInMonth : days);
        }
    };

    window.addEventListener('safemaint_storage_update', handleExternalUpdate);
    return () => window.removeEventListener('safemaint_storage_update', handleExternalUpdate);
  }, [selectedMonth, selectedYear]);

  const normalizeDateKey = (input: string | Date): string => {
      if (!input) return '';
      if (input instanceof Date) return input.toLocaleDateString('pt-BR');
      let dateStr = String(input).trim();
      if (dateStr.includes('-') && dateStr.length >= 10) {
          const parts = dateStr.split('T')[0].split('-');
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if(parts.length === 3) return `${parts[0].padStart(2,'0')}/${parts[1].padStart(2,'0')}/${parts[2].length===2 ? '20'+parts[2] : parts[2]}`;
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
      return dateStr;
  };

  const extractTag = (text: string): string | null => {
      if (!text) return null;
      const clean = text.toUpperCase().trim().replace(/\s/g, '');
      const match = clean.match(/CA-?(\d+)/); 
      if (match) return `CA${match[1]}`;
      return null;
  };

  const getBlacklist = (): string[] => {
      try { return JSON.parse(localStorage.getItem(BLACKLIST_KEY) || '[]'); } catch (e) { return []; }
  };

  const addToBlacklist = (tag: string) => {
      const list = getBlacklist();
      if (!list.includes(tag)) localStorage.setItem(BLACKLIST_KEY, JSON.stringify([...list, tag]));
  };

  const removeFromBlacklist = (tag: string) => {
      const list = getBlacklist().filter(t => t !== tag);
      localStorage.setItem(BLACKLIST_KEY, JSON.stringify(list));
  };

  // Helper para calcular eventos automáticos de um dia específico
  const getSystemEventsForCell = (tag: string, dateKey: string): AvailabilityStatus[] => {
      const schedule = StorageService.getSchedule();
      const history = StorageService.getHistory();
      const activeTasks = StorageService.getActiveMaintenances();
      const systemStatuses: Set<AvailabilityStatus> = new Set();

      // Check Schedule
      schedule.forEach(item => {
          if (item.dateStart === dateKey && extractTag(item.frotaOm) === tag) {
              const desc = (item.description || '').toUpperCase();
              if (desc.includes('INSPE')) systemStatuses.add('INSPECAO');
              else if (desc.includes('MOTOR')) systemStatuses.add('MOTOR');
              else if (desc.includes('LUB') || desc.includes('SEMANAL')) systemStatuses.add('LB');
              else if (desc.includes('PNEU')) systemStatuses.add('PNEUS');
              else if (desc.includes('PARADA') || desc.includes('RELEVANTE') || desc.includes('CRITIC')) systemStatuses.add('PR');
              else if (desc.includes('META')) systemStatuses.add('META');
              else systemStatuses.add('PREV');
          }
      });

      // Check History
      history.forEach(log => {
          if (normalizeDateKey(log.endTime) === dateKey && extractTag(log.tag) === tag) {
              if (log.type === 'CORRETIVA') systemStatuses.add('CORRETIVA');
              else if (log.type === 'DEMANDA_EXTRA') systemStatuses.add('DEMANDA_EXTRA');
          }
      });

      // Check Active
      activeTasks.forEach(task => {
          if (normalizeDateKey(task.startTime) === dateKey && extractTag(task.header.tag) === tag) {
              if (task.origin === 'CORRETIVA') systemStatuses.add('CORRETIVA');
              else if (task.origin === 'DEMANDA_EXTRA') systemStatuses.add('DEMANDA_EXTRA');
          }
      });

      return Array.from(systemStatuses);
  };

  const syncEventsOnly = async (currentDays?: Date[]) => {
      if (mode !== 'SPLIT') setIsSyncing(true);
      
      try {
          const rawRecords = StorageService.getAvailability();
          const blacklist = getBlacklist();
          const uniqueRecordMap = new Map<string, AvailabilityRecord>();

          // 1. Carrega estrutura existente
          rawRecords.forEach(rec => {
              const cleanTag = extractTag(rec.tag);
              if (!cleanTag || blacklist.includes(cleanTag)) return; 
              if (uniqueRecordMap.has(cleanTag)) {
                  const existing = uniqueRecordMap.get(cleanTag)!;
                  Object.entries(rec.statusMap).forEach(([date, statuses]) => { existing.statusMap[date] = statuses; });
                  if (rec.manualOverrides) existing.manualOverrides = { ...existing.manualOverrides, ...rec.manualOverrides };
              } else {
                  rec.tag = cleanTag;
                  if(!rec.manualOverrides) rec.manualOverrides = {};
                  uniqueRecordMap.set(cleanTag, rec);
              }
          });

          // 2. Garante que todas as OMs da agenda/ativos existam como linhas
          const allOms = [...StorageService.getSchedule(), ...StorageService.getActiveMaintenances()];
          allOms.forEach(item => {
              const tagRaw = (item as any).frotaOm || (item as any).header?.tag || '';
              const t = extractTag(tagRaw);
              if (t && !uniqueRecordMap.has(t) && !blacklist.includes(t)) {
                  uniqueRecordMap.set(t, { id: crypto.randomUUID(), tag: t, statusMap: {}, manualOverrides: {} });
              }
          });

          // 3. Processa dias visíveis
          if (currentDays) {
              uniqueRecordMap.forEach((rec) => {
                  currentDays.forEach(day => {
                      const dateKey = normalizeDateKey(day);
                      const systemEvents = getSystemEventsForCell(rec.tag, dateKey);
                      
                      // LÓGICA DE MERGE INTELIGENTE (PERSISTÊNCIA):
                      // - NÃO limpamos o array existente (isso garante que se sair da agenda, fique no quadro)
                      // - Adicionamos obrigatoriamente os eventos do sistema atuais.
                      
                      let newStatuses = [...(rec.statusMap[dateKey] || [])];

                      // Garante que todos os eventos do sistema estejam presentes
                      systemEvents.forEach(sysEvt => {
                          if (!newStatuses.includes(sysEvt)) newStatuses.push(sysEvt);
                      });

                      // Auto-fill Sem Falha APENAS se estiver vazio e for passado/hoje
                      const today = new Date(); today.setHours(23, 59, 59, 999);
                      if (day <= today && newStatuses.length === 0) {
                          newStatuses = ['SEM_FALHA'];
                      }
                      
                      // Limpeza de 'SEM_FALHA' se houver qualquer outro evento
                      if (newStatuses.length > 1 && newStatuses.includes('SEM_FALHA')) {
                          newStatuses = newStatuses.filter(s => s !== 'SEM_FALHA');
                      }

                      rec.statusMap[dateKey] = newStatuses;
                  });
              });
          }

          const finalRecords = Array.from(uniqueRecordMap.values()).sort((a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true }));

          if (JSON.stringify(rawRecords) !== JSON.stringify(finalRecords)) {
              await StorageService.saveAvailability(finalRecords);
              recordsRef.current = finalRecords;
              setRecords(finalRecords);
          } else {
              recordsRef.current = finalRecords;
              setRecords(finalRecords);
          }

      } finally {
          setIsSyncing(false);
      }
  };

  const openModal = (tag: string, dateKey: string, currentStatuses: AvailabilityStatus[]) => {
      // Calcula quais status são mandatórios do sistema neste momento (LIVE)
      // Se sumiu da agenda, systemLocked será vazio, permitindo edição manual.
      const systemLocked = getSystemEventsForCell(tag, dateKey);
      
      setEditingCell({ tag, dateKey });
      setTempStatuses([...currentStatuses]);
      setLockedStatuses(systemLocked);
  };

  const toggleTempStatus = (status: AvailabilityStatus) => {
      if (!editingCell) return;
      
      // BLOQUEIO: Se o status está na lista de travados (Agenda/Sistema), não permite retirar
      if (lockedStatuses.includes(status)) {
          alert("Este status é gerenciado pelo sistema (Agenda/Histórico) e não pode ser removido manualmente.");
          return;
      }

      let newStatuses = [...tempStatuses];
      if (status === 'SEM_FALHA') {
          if (newStatuses.includes('SEM_FALHA')) newStatuses = []; // Toggle off
          else {
              // Só permite ativar SEM FALHA se não houver itens travados (sistema)
              if (lockedStatuses.length === 0) newStatuses = ['SEM_FALHA'];
              else alert("Não é possível marcar SEM FALHA pois existem eventos do sistema ativos neste dia.");
          }
      } else {
          newStatuses = newStatuses.filter(s => s !== 'SEM_FALHA');
          if (newStatuses.includes(status)) newStatuses = newStatuses.filter(s => s !== status);
          else newStatuses.push(status);
      }
      setTempStatuses(newStatuses);
  };

  const handleConfirmEdit = async () => {
      if(!editingCell) return;
      const newRecords = [...records];
      const rec = newRecords.find(r => r.tag === editingCell.tag);
      if(rec) {
          rec.statusMap[editingCell.dateKey] = tempStatuses;
          if (!rec.manualOverrides) rec.manualOverrides = {};
          rec.manualOverrides[editingCell.dateKey] = true;
          await StorageService.saveAvailability(newRecords);
          setRecords(newRecords);
      }
      setEditingCell(null);
      setTempStatuses([]);
      setLockedStatuses([]);
  };

  const handleClearCell = () => { 
      // Ao limpar, mantemos apenas os travados pelo sistema
      setTempStatuses([...lockedStatuses]); 
  };
  
  const addRow = async () => {
      const tag = prompt("DIGITE O TAG (Ex: CA530):");
      if (!tag) return;
      const cleanTag = extractTag(tag);
      if (!cleanTag) { alert("TAG Inválido."); return; }
      removeFromBlacklist(cleanTag);
      if (records.find(r => r.tag === cleanTag)) { alert("Já existe."); return; }
      const newRec: AvailabilityRecord = { id: crypto.randomUUID(), tag: cleanTag, statusMap: {}, manualOverrides: {} };
      const updated = [...records, newRec].sort((a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true }));
      setRecords(updated);
      await StorageService.saveAvailability(updated);
      setTimeout(() => syncEventsOnly(daysInMonth), 100);
  };

  const handleDeleteRow = (record: AvailabilityRecord) => {
      if(confirm(`REMOVER ${record.tag}?`)) {
          addToBlacklist(record.tag);
          const newRecs = records.filter(r => r.tag !== record.tag);
          setRecords(newRecs);
          StorageService.saveAvailability(newRecs);
      }
  };

  const renderCellContent = (statusList: AvailabilityStatus[]) => {
      if(!statusList || statusList.length === 0) return null;
      const sorted = [...statusList].sort((a,b) => {
          const confA = STATUS_CONFIG[a] || { type: 'TEXT' };
          const confB = STATUS_CONFIG[b] || { type: 'TEXT' };
          if(confA.type === confB.type) return 0;
          return confA.type === 'SHAPE' ? -1 : 1;
      });

      const isSplit = mode === 'SPLIT';
      const shapeSize = isSplit ? 'w-4 h-4' : (mode === 'TV' ? 'w-6 h-6' : 'w-5 h-5');
      const fontSize = isSplit ? 'text-[9px]' : (mode === 'TV' ? 'text-[12px]' : 'text-[10px]');

      return (
          <div className="flex flex-wrap items-center justify-center gap-0.5 h-full w-full p-0.5">
              {sorted.map((st, idx) => {
                  const conf = STATUS_CONFIG[st];
                  if(!conf) return null;
                  return (
                      <div key={idx} className={`flex items-center justify-center ${shapeSize} rounded-md shadow-sm border border-black/5 ${conf.bgColor}`}>
                          <span className={`${conf.color} ${fontSize} font-black leading-none`}>{conf.symbol}</span>
                      </div>
                  );
              })}
          </div>
      );
  };

  const isViewOnly = mode === 'TV' || mode === 'SPLIT';
  
  if (isViewOnly) {
      return (
          <div className={`${mode === 'TV' ? 'fixed inset-0 z-[200]' : 'h-full w-full relative'} bg-gray-100 text-gray-800 flex flex-col overflow-hidden font-sans select-none animate-fadeIn cursor-none group`}>
              {mode === 'TV' && (
                  <div className="flex justify-between items-center px-4 py-1 border-b-2 border-[#007e7a] bg-white shadow-xl relative z-20 h-12 shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="bg-[#007e7a] p-1 rounded shadow-md"><Activity size={20} className="text-white" /></div>
                          <div><h1 className="text-lg font-black tracking-widest uppercase text-gray-800 leading-none">DISPONIBILIDADE</h1></div>
                      </div>
                      <div className="flex items-center gap-6">
                          <div className="text-right border-r border-gray-300 pr-4">
                              <span className="block text-xs font-black text-gray-500">{new Date(selectedYear, selectedMonth).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()} {selectedYear}</span>
                          </div>
                          <button onClick={() => setIsTvModeInternal(false)} className="p-1.5 bg-gray-200 hover:bg-red-600 hover:text-white rounded-full transition-all text-gray-500 border border-gray-300 opacity-0 group-hover:opacity-100"><X size={18} /></button>
                      </div>
                  </div>
              )}

              <div className={`flex-1 overflow-auto custom-scrollbar bg-gray-100 ${mode === 'TV' ? 'pb-14 p-1' : 'pb-0 p-0'}`}>
                  <div className={`border border-gray-300 overflow-hidden shadow-2xl bg-white min-h-full ${mode === 'SPLIT' ? 'border-none shadow-none rounded-none' : 'rounded-lg'}`}>
                      <table className="w-full border-collapse h-full">
                          <thead>
                              <tr className={`bg-gray-50 text-gray-600 font-black uppercase sticky top-0 z-20 shadow-md border-b-2 border-gray-200 ${mode === 'SPLIT' ? 'text-[8px] h-8' : 'text-[10px] h-10'}`}>
                                  <th className={`p-1 text-left border-r border-gray-200 bg-gray-50 sticky left-0 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.1)] ${mode === 'SPLIT' ? 'min-w-[50px]' : 'min-w-[70px]'}`}>TAG</th>
                                  {daysInMonth.map(date => (
                                      <th key={date.toString()} className={`p-0 border-r border-gray-200 text-center ${mode === 'SPLIT' ? 'min-w-[20px]' : 'min-w-[28px]'} ${date.getDay() === 0 || date.getDay() === 6 ? 'bg-gray-100 text-gray-400' : ''}`}>{date.getDate()}</th>
                                  ))}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-bold text-gray-700 text-sm">
                              {records.map((record, rIdx) => (
                                  <tr key={record.id} className={`${rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${mode === 'SPLIT' ? 'h-[30px]' : 'h-[40px]'}`}>
                                      <td className={`p-1 border-r border-gray-200 font-black text-[#007e7a] sticky left-0 z-10 bg-inherit shadow-[2px_0_5px_rgba(0,0,0,0.05)] ${mode === 'SPLIT' ? 'text-xs' : 'text-sm'}`}>{record.tag}</td>
                                      {daysInMonth.map(date => {
                                          const dateKey = normalizeDateKey(date);
                                          return <td key={dateKey} className="p-0 border-r border-gray-200 text-center relative align-middle">{renderCellContent(record.statusMap[dateKey])}</td>;
                                      })}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
              
              {mode === 'TV' && (
                  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 flex justify-center gap-4 shrink-0 flex-wrap h-14 overflow-hidden items-center shadow-[0_-5px_15px_rgba(0,0,0,0.1)] z-50">
                      {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
                          <div key={key} className="flex items-center gap-1.5">
                              <div className={`w-4 h-4 flex items-center justify-center rounded ${conf.bgColor} border border-black/10 shadow-sm`}><span className={`${conf.color} text-[10px] font-black`}>{conf.symbol}</span></div>
                              <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">{conf.label}</span>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      );
  }

  return (
    <div className="w-full pb-0 px-1 animate-fadeIn h-[calc(100vh-20px)] flex flex-col">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-2 gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="bg-gradient-to-br from-[#007e7a] to-[#005c5a] p-2 rounded-xl text-white shadow-lg shadow-teal-100"><Activity size={20} /></div>
          <div><h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter leading-none">Painel de Disponibilidade</h2></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-200 shadow-inner h-9">
                <button onClick={() => { if(selectedMonth===0) { setSelectedMonth(11); setSelectedYear(y=>y-1) } else setSelectedMonth(m=>m-1) }} className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-600 hover:text-gray-900 shadow-sm hover:shadow"><Calendar size={14} className="rotate-180"/></button>
                <div className="px-4 text-center min-w-[120px]"><span className="block text-xs font-black text-gray-800 uppercase tracking-wide">{new Date(selectedYear, selectedMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span></div>
                <button onClick={() => { if(selectedMonth===11) { setSelectedMonth(0); setSelectedYear(y=>y+1) } else setSelectedMonth(m=>m+1) }} className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-600 hover:text-gray-900 shadow-sm hover:shadow"><Calendar size={14}/></button>
            </div>
            <button onClick={() => syncEventsOnly(daysInMonth)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-black text-[10px] uppercase shadow-md transition-all active:scale-95 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"><RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> Atualizar</button>
            <button onClick={addRow} className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-3 py-2 rounded-xl font-black text-[10px] uppercase shadow-sm transition-all active:scale-95"><Plus size={14} /> Novo</button>
            <button onClick={() => setIsTvModeInternal(true)} className="flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg hover:shadow-xl transition-all active:scale-95 border-b-4 border-black hover:bg-gray-800 ml-auto xl:ml-1"><Monitor size={14} /> TV</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xl border border-gray-300 overflow-hidden relative flex flex-col h-full">
        <div className="overflow-auto custom-scrollbar flex-1 pb-16">
          <table className="w-full border-collapse border-spacing-0 bg-white">
            <thead>
              <tr className="bg-gray-900 text-gray-400 text-[9px] font-black uppercase sticky top-0 z-30">
                <th className="p-2 text-left border-r border-gray-700 bg-gray-900 sticky left-0 z-30 min-w-[80px] shadow-[4px_0_5px_rgba(0,0,0,0.2)] text-white tracking-wider">TAG</th>
                {daysInMonth.map(date => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <th key={date.toString()} className={`p-1 border-r border-gray-800 min-w-[32px] text-center ${isWeekend ? 'bg-gray-800 text-gray-500' : 'text-gray-300'}`}>
                        <span className="block text-[7px] font-bold opacity-50">{date.toLocaleDateString('pt-BR', {weekday: 'short'}).slice(0,3)}</span>
                        <span className="block text-xs font-bold">{date.getDate()}</span>
                    </th>
                  );
                })}
                <th className="p-1 w-8 bg-gray-900 border-l border-gray-800"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-bold text-gray-800 text-xs">
              {records.map((record, rIdx) => (
                <tr key={record.id} className={`${rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors group h-[32px]`}>
                  <td className="p-2 border-r border-gray-200 text-xs font-black text-[#007e7a] sticky left-0 z-20 bg-white group-hover:bg-blue-50/50 shadow-[4px_0_5px_rgba(0,0,0,0.05)] border-b border-gray-100">{record.tag}</td>
                  {daysInMonth.map(date => {
                    const dateKey = normalizeDateKey(date);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    return <td key={dateKey} onClick={() => openModal(record.tag, dateKey, record.statusMap[dateKey] || [])} className={`p-0 border-r border-gray-200 text-center cursor-pointer hover:brightness-95 transition-all relative ${isWeekend ? 'bg-gray-100/50' : ''}`}>{renderCellContent(record.statusMap[dateKey])}</td>;
                  })}
                  <td className="p-0 text-center border-l border-gray-200">
                      <button 
                        onClick={() => handleDeleteRow(record)} 
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      >
                          <Trash2 size={12}/>
                      </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 bg-white p-2 border-t border-gray-200 shadow-[0_-5px_10px_rgba(0,0,0,0.05)] z-40">
            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
                {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
                    <div key={key} className="flex items-center gap-1"><div className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border border-black/5 shadow-sm ${conf.bgColor}`}><span className={`${conf.color} font-black text-[8px]`}>{conf.symbol}</span></div><span className="text-[9px] font-bold text-gray-600 uppercase">{conf.label}</span></div>
                ))}
            </div>
        </div>
      </div>

      {editingCell && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-t-4 border-[#007e7a]">
                  <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-b border-gray-200">
                      <div><h3 className="font-black text-xl text-gray-800 uppercase leading-none">{editingCell.tag}</h3><p className="text-[10px] font-bold text-gray-400 uppercase mt-1 flex items-center gap-1"><Calendar size={10}/> {editingCell.dateKey}</p></div>
                      <button onClick={() => setEditingCell(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"><X size={20}/></button>
                  </div>
                  <div className="p-6 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      {Object.entries(STATUS_CONFIG).map(([key, conf]) => {
                          const isActive = tempStatuses.includes(key as AvailabilityStatus);
                          const isLocked = lockedStatuses.includes(key as AvailabilityStatus);
                          
                          return (
                              <button 
                                key={key} 
                                onClick={() => toggleTempStatus(key as AvailabilityStatus)} 
                                disabled={isLocked}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all group relative 
                                    ${isLocked ? 'bg-gray-100 border-gray-200 opacity-80 cursor-not-allowed' : 
                                      isActive ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' : 'bg-gray-50 border-gray-100 hover:border-gray-300 hover:bg-white'}`}
                              >
                                  <div className={`w-8 h-8 flex items-center justify-center shrink-0 rounded-lg ${conf.bgColor}`}><span className={`${conf.color} font-black text-sm`}>{conf.symbol}</span></div>
                                  <div className="text-left"><span className={`text-[10px] font-black uppercase block leading-tight ${isActive ? 'text-blue-900' : 'text-gray-500 group-hover:text-gray-700'}`}>{conf.label}</span>
                                    {key === 'SEM_FALHA' && <span className="text-[8px] text-green-600 font-bold uppercase">(AUTO)</span>}
                                    {isLocked && <span className="text-[8px] text-red-500 font-bold uppercase flex items-center gap-1 mt-0.5"><Lock size={8}/> BLOQUEADO</span>}
                                  </div>
                              </button>
                          );
                      })}
                  </div>
                  <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-3">
                      <button onClick={handleClearCell} className="flex-1 bg-white border border-red-200 text-red-600 px-4 py-3 rounded-xl font-black text-xs uppercase hover:bg-red-50 transition-colors flex items-center justify-center gap-2"><Trash2 size={16}/> Limpar (Manuais)</button>
                      <button onClick={handleConfirmEdit} className="flex-[2] bg-[#007e7a] hover:bg-[#00605d] text-white px-4 py-3 rounded-xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"><Save size={16}/> Salvar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
