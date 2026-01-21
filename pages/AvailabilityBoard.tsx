
import React, { useState, useEffect, useRef } from 'react';
import { StorageService, KEYS } from '../services/storage';
import { AvailabilityRecord, AvailabilityStatus } from '../types';
import { BackButton } from '../components/BackButton';
import { Plus, Trash2, X, RefreshCw, Activity, Save, Monitor, Calendar, Lock, AlertCircle, Eraser, CheckCircle2 } from 'lucide-react';

const BLACKLIST_KEY = 'safemaint_avail_blacklist';

// LEGENDA AJUSTADA (REMOVIDO FILMAGEM E LB)
const STATUS_CONFIG: Record<string, { label: string, type: 'SHAPE' | 'TEXT', color: string, bgColor: string, symbol: any }> = {
    'PREV': { label: 'PREV.', type: 'SHAPE', color: 'text-gray-900', bgColor: 'bg-transparent', symbol: '▲' },
    'CORRETIVA': { label: 'CORRETIVA', type: 'SHAPE', color: 'text-red-600', bgColor: 'bg-transparent', symbol: '●' },
    'SEM_FALHA': { label: 'SEM FALHA', type: 'SHAPE', color: 'text-green-600', bgColor: 'bg-transparent', symbol: '●' },
    'META': { label: 'META APÓS CORRETIVA', type: 'SHAPE', color: 'text-gray-900', bgColor: 'bg-transparent', symbol: '★' },
    'DEMANDA_EXTRA': { label: 'DEMANDA EXTRA', type: 'SHAPE', color: 'text-red-500', bgColor: 'bg-transparent', symbol: '▲' }, 
    'PR': { label: 'PARADA RELEVANTE', type: 'TEXT', color: 'text-red-500', bgColor: 'bg-transparent', symbol: 'PR' },
    'INSPECAO': { label: 'INSPEÇÃO', type: 'SHAPE', color: 'text-gray-500', bgColor: 'bg-transparent', symbol: '⧫' }, 
    'MOTOR': { label: 'MOTOR', type: 'TEXT', color: 'text-gray-800', bgColor: 'bg-transparent', symbol: 'M' },
    'PNEUS': { label: 'PNEUS', type: 'TEXT', color: 'text-gray-600', bgColor: 'bg-transparent', symbol: 'Pn' },
};

// ORDEM DE PRIORIDADE (REMOVIDO FILMAGEM E LB)
const PRIORITY_ORDER: AvailabilityStatus[] = [
    'PREV', 'PR', 'DEMANDA_EXTRA', 'MOTOR', 'INSPECAO', 'PNEUS', 'META', 'SEM_FALHA'
];

interface AvailabilityBoardProps {
    variant?: 'DEFAULT' | 'TV' | 'SPLIT';
}

export const AvailabilityBoard: React.FC<AvailabilityBoardProps> = ({ variant = 'DEFAULT' }) => {
  const [records, setRecords] = useState<AvailabilityRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const recordsRef = useRef<AvailabilityRecord[]>([]);
  
  const [editingCell, setEditingCell] = useState<{tag: string, dateKey: string} | null>(null);
  const [tempStatuses, setTempStatuses] = useState<AvailabilityStatus[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [daysInMonth, setDaysInMonth] = useState<Date[]>([]);
  
  const [isTvModeInternal, setIsTvModeInternal] = useState(false);

  const mode = variant !== 'DEFAULT' ? variant : (isTvModeInternal ? 'TV' : 'DEFAULT');

  useEffect(() => {
    const date = new Date(selectedYear, selectedMonth, 1);
    const days = [];
    while (date.getMonth() === selectedMonth) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    setDaysInMonth(days);
    
    // Initial Load
    const initialRecords = StorageService.getAvailability();
    syncWithSystem(days, initialRecords); 
    
    const handleExternalUpdate = (e: any) => {
        if (e.detail?.key === KEYS.AVAILABILITY) {
            const newRecs = StorageService.getAvailability();
            if (JSON.stringify(newRecs) !== JSON.stringify(recordsRef.current)) {
                recordsRef.current = newRecs;
                setRecords(newRecs);
            }
        } else {
            syncWithSystem(daysInMonth.length > 0 ? daysInMonth : days);
        }
    };

    window.addEventListener('safemaint_storage_update', handleExternalUpdate);
    return () => window.removeEventListener('safemaint_storage_update', handleExternalUpdate);
  }, [selectedMonth, selectedYear]);

  // Helpers
  const normalizeDateKey = (input: string | Date): string => {
      if (!input) return '';
      if (input instanceof Date) return input.toLocaleDateString('pt-BR');
      if (typeof input === 'string' && input.includes('-') && input.includes('T')) {
          return new Date(input).toLocaleDateString('pt-BR');
      }
      return String(input); 
  };

  const extractTag = (text: string): string | null => {
      if (!text) return null;
      const clean = text.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
      const match = clean.match(/CA(\d+)/); 
      if (match) {
          const normalizedTag = `CA${match[1]}`;
          if (normalizedTag.startsWith('CA5')) {
              return normalizedTag;
          }
      }
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

  // --- LÓGICA DE NEGÓCIO PRINCIPAL ---
  const getSystemEventsForCell = (tag: string, dateKey: string): AvailabilityStatus[] => {
      const schedule = StorageService.getSchedule();
      const history = StorageService.getHistory();
      const activeTasks = StorageService.getActiveMaintenances();
      const rawStatuses: AvailabilityStatus[] = [];

      // 1. PROGRAMAÇÃO (AGENDA)
      const dailySchedule = schedule.filter(item => item.dateStart === dateKey && extractTag(item.frotaOm) === tag);
      dailySchedule.forEach(item => {
          const desc = (item.description || '').toUpperCase();
          if (desc.includes('MOTOR')) rawStatuses.push('MOTOR');
          else if (desc.includes('PNEU')) rawStatuses.push('PNEUS');
          else if (desc.includes('INSPE')) rawStatuses.push('INSPECAO');
          else rawStatuses.push('PREV');
      });

      // 2. CARDS REALIZADOS OU EM ANDAMENTO
      const combinedCards = [
          ...history.map(h => ({ type: h.type, tag: h.tag, date: normalizeDateKey(h.endTime) })),
          ...activeTasks.map(a => ({ type: a.origin, tag: a.header.tag, date: normalizeDateKey(a.startTime) }))
      ];

      combinedCards.forEach(card => {
          if (card.date === dateKey && extractTag(card.tag) === tag) {
              if (card.type === 'CORRETIVA' || (card.type as any) === 'ART_EMERGENCIAL') rawStatuses.push('CORRETIVA');
              if (card.type === 'DEMANDA_EXTRA') rawStatuses.push('DEMANDA_EXTRA');
          }
      });

      // 3. APLICAÇÃO DAS REGRAS (FILTRO)
      const corretivas = rawStatuses.filter(s => s === 'CORRETIVA'); 
      const others = rawStatuses.filter(s => s !== 'CORRETIVA');
      
      const finalStatuses: AvailabilityStatus[] = [...corretivas];

      if (others.length > 0) {
          others.sort((a, b) => {
              const idxA = PRIORITY_ORDER.indexOf(a);
              const idxB = PRIORITY_ORDER.indexOf(b);
              return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
          });
          finalStatuses.push(others[0]);
      }

      return finalStatuses;
  };

  const syncWithSystem = async (currentDays?: Date[], forceRecords?: AvailabilityRecord[]) => {
      if (mode !== 'SPLIT') setIsSyncing(true);
      
      try {
          const rawRecords = forceRecords || StorageService.getAvailability();
          const blacklist = getBlacklist();
          const uniqueRecordMap = new Map<string, AvailabilityRecord>();

          // 1. Carrega e Sanitiza
          rawRecords.forEach(rec => {
              const cleanTag = extractTag(rec.tag);
              if (!cleanTag || blacklist.includes(cleanTag)) return; 
              
              if (uniqueRecordMap.has(cleanTag)) {
                  const existing = uniqueRecordMap.get(cleanTag)!;
                  existing.manualOverrides = { ...existing.manualOverrides, ...rec.manualOverrides };
                  Object.entries(rec.statusMap).forEach(([d, s]) => existing.statusMap[d] = s);
              } else {
                  rec.tag = cleanTag; 
                  if(!rec.manualOverrides) rec.manualOverrides = {};
                  uniqueRecordMap.set(cleanTag, rec);
              }
          });

          // 2. Auto-Discovery
          const allSystemTags = [
              ...StorageService.getSchedule().map(i => i.frotaOm), 
              ...StorageService.getActiveMaintenances().map(i => i.header.tag),
              ...StorageService.getOMs().map(i => i.tag)
          ];

          allSystemTags.forEach(tagRaw => {
              const t = extractTag(tagRaw || '');
              if (t && !uniqueRecordMap.has(t) && !blacklist.includes(t)) {
                  uniqueRecordMap.set(t, { id: crypto.randomUUID(), tag: t, statusMap: {}, manualOverrides: {} });
              }
          });

          // 3. Lógica Automática
          const today = new Date();
          today.setHours(23, 59, 59, 999); 

          if (currentDays) {
              uniqueRecordMap.forEach((rec) => {
                  currentDays.forEach(day => {
                      const dateKey = normalizeDateKey(day);
                      if (rec.manualOverrides && rec.manualOverrides[dateKey]) return; 

                      let autoEvents = getSystemEventsForCell(rec.tag, dateKey);
                      
                      if (autoEvents.length === 0 && day <= today) {
                          autoEvents = ['SEM_FALHA'];
                      } else if (autoEvents.length > 0) {
                          autoEvents = autoEvents.filter(s => s !== 'SEM_FALHA');
                      }

                      rec.statusMap[dateKey] = autoEvents;
                  });
              });
          }

          const finalRecords = Array.from(uniqueRecordMap.values())
                .sort((a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true }));

          if (JSON.stringify(rawRecords) !== JSON.stringify(finalRecords) || !forceRecords) {
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

  const saveAll = async () => {
      setIsSyncing(true);
      try {
          // FORCE SYNC TO BACKEND
          await StorageService.saveAvailability(records);
          alert("TODOS OS DADOS FORAM SINCRONIZADOS COM O BANCO DE DADOS!");
      } catch(e) {
          alert("ERRO AO SALVAR NO BANCO. DADOS SALVOS LOCALMENTE.");
      } finally {
          setIsSyncing(false);
      }
  };

  const openModal = (tag: string, dateKey: string, currentStatuses: AvailabilityStatus[]) => {
      setEditingCell({ tag, dateKey });
      setTempStatuses([...currentStatuses]);
  };

  const handleStatusClick = (status: AvailabilityStatus) => {
      if (!editingCell) return;
      let newStatuses = [...tempStatuses];
      
      if (status === 'SEM_FALHA') {
          newStatuses = ['SEM_FALHA'];
      } else if (status === 'CORRETIVA') {
          newStatuses = newStatuses.filter(s => s !== 'SEM_FALHA');
          newStatuses.push('CORRETIVA');
      } else {
          newStatuses = newStatuses.filter(s => s !== 'SEM_FALHA');
          newStatuses = newStatuses.filter(s => s === 'CORRETIVA');
          newStatuses.push(status);
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

          setRecords(newRecords);
          // GARANTE SALVAMENTO IMEDIATO NO BANCO
          await StorageService.saveAvailability(newRecords);
      }
      setEditingCell(null);
      setTempStatuses([]);
  };

  const handleWipeDay = async () => {
      // LIMPA O DIA E TRAVA COMO MANUAL (VAZIO)
      if(!editingCell) return;
      const newRecords = [...records];
      const rec = newRecords.find(r => r.tag === editingCell.tag);
      if(rec) {
          rec.statusMap[editingCell.dateKey] = []; // Vazio
          if (!rec.manualOverrides) rec.manualOverrides = {};
          rec.manualOverrides[editingCell.dateKey] = true; // Trava

          setRecords(newRecords);
          // GARANTE SALVAMENTO IMEDIATO NO BANCO
          await StorageService.saveAvailability(newRecords);
      }
      setEditingCell(null);
      setTempStatuses([]);
  };

  const handleClearCell = async () => { 
      // RESTAURA PARA AUTOMÁTICO (REMOVE A TRAVA)
      if(!editingCell) return;
      const newRecords = [...records];
      const rec = newRecords.find(r => r.tag === editingCell.tag);
      if (rec) {
          if (rec.manualOverrides) delete rec.manualOverrides[editingCell.dateKey];
          
          const autoEvents = getSystemEventsForCell(rec.tag, editingCell.dateKey);
          const day = new Date(editingCell.dateKey.split('/').reverse().join('-')); 
          const today = new Date();
          
          let finalEvents = autoEvents;
          if (finalEvents.length === 0 && day <= today) {
              finalEvents = ['SEM_FALHA'];
          }

          rec.statusMap[editingCell.dateKey] = finalEvents;

          setRecords(newRecords);
          // GARANTE SALVAMENTO IMEDIATO NO BANCO
          await StorageService.saveAvailability(newRecords);
      }
      setEditingCell(null);
      setTempStatuses([]);
  };
  
  const addRow = async () => {
      const tag = prompt("DIGITE O TAG (Ex: CA5302):");
      if (!tag) return;
      const cleanTag = extractTag(tag);
      
      if (!cleanTag) { 
          alert("TAG INVÁLIDO. Deve começar com CA5 seguido de números (Ex: CA5302)."); 
          return; 
      }
      
      removeFromBlacklist(cleanTag);
      if (records.some(r => r.tag === cleanTag)) { 
          alert(`O equipamento ${cleanTag} JÁ EXISTE no quadro.`); 
          return; 
      }
      
      const newRec: AvailabilityRecord = { id: crypto.randomUUID(), tag: cleanTag, statusMap: {}, manualOverrides: {} };
      const updated = [...records, newRec].sort((a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true }));
      setRecords(updated);
      await StorageService.saveAvailability(updated);
  };

  const handleDeleteRow = (record: AvailabilityRecord) => {
      if(confirm(`REMOVER LINHA ${record.tag} DO QUADRO?`)) {
          addToBlacklist(record.tag);
          const newRecs = records.filter(r => r.tag !== record.tag);
          setRecords(newRecs);
          StorageService.saveAvailability(newRecs);
      }
  };

  const renderCellContent = (statusList: AvailabilityStatus[]) => {
      if(!statusList || statusList.length === 0) return null;
      
      const corretivaCount = statusList.filter(s => s === 'CORRETIVA').length;
      const otherStatuses = statusList.filter(s => s !== 'CORRETIVA');
      
      const sorted = [...otherStatuses].sort((a,b) => {
          const confA = STATUS_CONFIG[a] || { type: 'TEXT' };
          const confB = STATUS_CONFIG[b] || { type: 'TEXT' };
          if(confA.type === confB.type) return 0;
          return confA.type === 'SHAPE' ? -1 : 1;
      });

      return (
          <div className="flex flex-wrap items-center justify-center gap-0.5 w-full h-full relative">
              {corretivaCount > 0 && (
                  <div className="relative inline-flex items-center justify-center">
                      <span className="text-red-600 font-black text-sm drop-shadow-sm">●</span>
                      {corretivaCount > 1 && (
                          <span className="absolute -top-1 -right-1 bg-white text-red-600 text-[8px] font-black rounded-full w-3 h-3 flex items-center justify-center border border-red-200 shadow-sm leading-none">
                              {corretivaCount}
                          </span>
                      )}
                  </div>
              )}

              {sorted.map((st, idx) => {
                  const conf = STATUS_CONFIG[st];
                  if(!conf) return null;
                  return (
                      <span key={idx} className={`${conf.color} font-black leading-none text-xs md:text-sm drop-shadow-sm`} title={conf.label}>
                          {conf.symbol}
                      </span>
                  );
              })}
          </div>
      );
  };

  const isViewOnly = mode === 'TV' || mode === 'SPLIT';
  
  if (isViewOnly) {
      return (
          <div className={`${mode === 'TV' ? 'fixed inset-0 z-[200]' : 'h-full w-full relative'} bg-white text-gray-800 flex flex-col overflow-hidden font-sans select-none animate-fadeIn cursor-none group`}>
              {mode === 'TV' && (
                  <div className="flex justify-between items-center px-4 py-2 border-b-4 border-[#007e7a] bg-gray-50 shadow-md relative z-20 shrink-0">
                      <div className="flex items-center gap-4">
                          <div><h1 className="text-2xl font-black tracking-tight uppercase text-[#007e7a] leading-none">DIAS OPERANDO SEM CORRETIVA APÓS PREVENTIVA</h1></div>
                      </div>
                      <div className="flex items-center gap-6">
                          <button onClick={() => setIsTvModeInternal(false)} className="p-1.5 bg-gray-200 hover:bg-red-600 hover:text-white rounded-full transition-all text-gray-500 border border-gray-300 opacity-0 group-hover:opacity-100"><X size={18} /></button>
                      </div>
                  </div>
              )}

              <div className="flex-1 overflow-auto custom-scrollbar bg-white p-2">
                  <div className="border-2 border-gray-400">
                      <table className="w-full border-collapse">
                          <thead>
                              <tr className="bg-[#007e7a] text-white font-black uppercase text-sm h-12">
                                  <th className="p-1 text-left border border-gray-400 pl-4 w-32">Equipamento</th>
                                  {daysInMonth.map(date => (
                                      <th key={date.toString()} className="p-0 border border-gray-400 text-center w-10">{date.getDate()}</th>
                                  ))}
                              </tr>
                          </thead>
                          <tbody className="font-bold text-gray-800 text-sm">
                              {records.map((record, rIdx) => (
                                  <tr key={record.id} className="h-8">
                                      <td className="p-1 border border-gray-400 font-black pl-4 bg-gray-100 flex justify-between items-center h-8">
                                          <span>{record.tag}</span>
                                          {record.manualOverrides && Object.keys(record.manualOverrides).length > 0 && <span className="text-[8px] text-gray-400 mr-1" title="Contém edições manuais">*</span>}
                                      </td>
                                      {daysInMonth.map(date => {
                                          const dateKey = normalizeDateKey(date);
                                          return <td key={dateKey} className="p-0 border border-gray-400 text-center relative align-middle bg-white">{renderCellContent(record.statusMap[dateKey])}</td>;
                                      })}
                                  </tr>
                              ))}
                              {Array.from({ length: Math.max(0, 15 - records.length) }).map((_, i) => (
                                  <tr key={`empty-${i}`} className="h-8">
                                      <td className="border border-gray-400 bg-gray-50"></td>
                                      {daysInMonth.map(d => <td key={d.toString()} className="border border-gray-400"></td>)}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
              
              <div className="bg-gray-100 border-t-2 border-gray-300 p-2 flex justify-center gap-8 shrink-0 items-center">
                  <span className="font-black text-xs uppercase mr-4">LEGENDA:</span>
                  {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
                      <div key={key} className="flex items-center gap-1">
                          <span className={`${conf.color} font-black text-sm`}>{conf.symbol}</span>
                          <span className="text-[10px] font-black text-gray-600 uppercase">{conf.label}</span>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  const modalCorretivaCount = tempStatuses.filter(s => s === 'CORRETIVA').length;

  return (
    <div className="w-full pb-0 px-1 animate-fadeIn h-[calc(100vh-20px)] flex flex-col">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-2 gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="bg-[#007e7a] p-2 rounded-lg text-white"><Activity size={20} /></div>
          <div><h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter leading-none">Quadro de Disponibilidade</h2></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-200 shadow-inner h-9">
                <button onClick={() => { if(selectedMonth===0) { setSelectedMonth(11); setSelectedYear(y=>y-1) } else setSelectedMonth(m=>m-1) }} className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-600"><Calendar size={14} className="rotate-180"/></button>
                <div className="px-4 text-center min-w-[120px]"><span className="block text-xs font-black text-gray-800 uppercase tracking-wide">{new Date(selectedYear, selectedMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span></div>
                <button onClick={() => { if(selectedMonth===11) { setSelectedMonth(0); setSelectedYear(y=>y+1) } else setSelectedMonth(m=>m+1) }} className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-600"><Calendar size={14}/></button>
            </div>
            <button onClick={saveAll} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95 border-b-2 border-green-800 active:border-b-0 active:translate-y-0.5"><Save size={14} /> SALVAR ALTERAÇÕES (BANCO)</button>
            <button onClick={() => syncWithSystem(daysInMonth)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95"><RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> Atualizar</button>
            <button onClick={addRow} className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-3 py-2 rounded-xl font-black text-[10px] uppercase shadow-sm active:scale-95"><Plus size={14} /> Add Linha</button>
            <button onClick={() => setIsTvModeInternal(true)} className="flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg hover:shadow-xl active:scale-95 border-b-4 border-black"><Monitor size={14} /> Modo TV</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xl border border-gray-300 overflow-hidden relative flex flex-col h-full">
        <div className="overflow-auto custom-scrollbar flex-1 pb-20">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-30">
              <tr className="bg-[#007e7a] text-white text-xs font-black uppercase">
                <th className="p-2 text-left border-r border-white/20 bg-[#007e7a] sticky left-0 z-30 min-w-[100px] shadow-md">Equipamento</th>
                {daysInMonth.map(date => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <th key={date.toString()} className={`p-1 border-r border-white/20 min-w-[36px] text-center ${isWeekend ? 'bg-[#00605d]' : ''}`}>
                        <span className="block text-sm">{date.getDate()}</span>
                    </th>
                  );
                })}
                <th className="p-1 w-8 bg-[#007e7a]"></th>
              </tr>
            </thead>
            <tbody className="font-bold text-gray-800 text-xs">
              {records.map((record, rIdx) => (
                <tr key={record.id} className={`${rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors h-10 border-b border-gray-200`}>
                  <td className="p-2 border-r border-gray-300 text-xs font-black text-gray-800 sticky left-0 z-20 bg-inherit shadow-sm flex items-center justify-between h-10">
                      <span>{record.tag}</span>
                      {record.manualOverrides && Object.keys(record.manualOverrides).length > 0 && <span className="text-[8px] text-blue-400" title="Editado Manualmente"><Lock size={8}/></span>}
                  </td>
                  {daysInMonth.map(date => {
                    const dateKey = normalizeDateKey(date);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const isManual = record.manualOverrides && record.manualOverrides[dateKey];
                    
                    return (
                        <td key={dateKey} onClick={() => openModal(record.tag, dateKey, record.statusMap[dateKey] || [])} className={`p-0 border-r border-gray-300 text-center cursor-pointer hover:bg-blue-100 transition-all relative ${isManual ? 'bg-yellow-50' : isWeekend ? 'bg-gray-100' : ''}`}>
                            {renderCellContent(record.statusMap[dateKey])}
                        </td>
                    );
                  })}
                  <td className="p-0 text-center border-l border-gray-200">
                      <button onClick={() => handleDeleteRow(record)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1"><Trash2 size={12}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 bg-gray-50 p-2 border-t-2 border-gray-300 shadow-[0_-5px_10px_rgba(0,0,0,0.05)] z-40">
            <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest self-center">LEGENDA:</span>
                {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
                    <div key={key} className="flex items-center gap-1.5">
                        <span className={`${conf.color} font-black text-sm`}>{conf.symbol}</span>
                        <span className="text-[9px] font-black text-gray-600 uppercase">{conf.label}</span>
                    </div>
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
                          
                          return (
                              <button 
                                key={key} 
                                onClick={() => handleStatusClick(key as AvailabilityStatus)} 
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all group relative 
                                    ${isActive ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' : 'bg-gray-50 border-gray-100 hover:border-gray-300 hover:bg-white'}`}
                              >
                                  <div className={`w-8 h-8 flex items-center justify-center shrink-0 rounded-lg bg-gray-100`}><span className={`${conf.color} font-black text-sm`}>{conf.symbol}</span></div>
                                  <div className="text-left flex-1">
                                      <span className={`text-[10px] font-black uppercase block leading-tight ${isActive ? 'text-blue-900' : 'text-gray-500 group-hover:text-gray-700'}`}>{conf.label}</span>
                                      {key === 'CORRETIVA' && isActive && <span className="text-[8px] bg-red-100 text-red-600 px-1.5 rounded-full font-bold mt-1 inline-block">QTD: {modalCorretivaCount}</span>}
                                  </div>
                              </button>
                          );
                      })}
                  </div>
                  <div className="bg-yellow-50 p-3 text-[9px] text-yellow-800 font-bold border-t border-yellow-100 flex items-center justify-center gap-2">
                      <AlertCircle size={12}/> Ao salvar ou limpar, este dia ficará travado em MANUAL.
                  </div>
                  <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-2">
                      <button onClick={handleWipeDay} className="flex-1 bg-white border border-gray-300 text-gray-700 px-3 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"><Eraser size={16}/> Limpar Dia</button>
                      <button onClick={handleClearCell} className="flex-1 bg-white border border-red-200 text-red-600 px-3 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-red-50 transition-colors flex items-center justify-center gap-2"><RefreshCw size={16}/> Restaurar Auto</button>
                      <button onClick={handleConfirmEdit} className="flex-[2] bg-[#007e7a] hover:bg-[#00605d] text-white px-3 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"><Save size={16}/> Salvar Manual</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
