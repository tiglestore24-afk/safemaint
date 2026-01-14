
import React, { useState, useEffect } from 'react';
import { StorageService, KEYS } from '../services/storage';
import { AvailabilityRecord, AvailabilityStatus } from '../types';
import { BackButton } from '../components/BackButton';
import { Plus, Trash2, X, RefreshCw, Activity, Save, CheckCircle2, Monitor, ArrowDownCircle, Info, Calendar } from 'lucide-react';

// Chave local para armazenar equipamentos excluídos (Blacklist)
const BLACKLIST_KEY = 'safemaint_avail_blacklist';

// --- CONFIGURAÇÃO VISUAL DOS MARCADORES ---
const STATUS_CONFIG: Record<string, { label: string, type: 'SHAPE' | 'TEXT', color: string, bgColor: string, symbol: any }> = {
    'SEM_FALHA': { label: 'SEM FALHA (OPERACIONAL)', type: 'SHAPE', color: 'text-green-600', bgColor: 'bg-green-100', symbol: '●' },
    'PREV': { label: 'PREVENTIVA', type: 'SHAPE', color: 'text-blue-600', bgColor: 'bg-blue-100', symbol: '▲' },
    'CORRETIVA': { label: 'CORRETIVA', type: 'SHAPE', color: 'text-red-600', bgColor: 'bg-red-100', symbol: '●' },
    'DEMANDA_EXTRA': { label: 'DEMANDA EXTRA', type: 'SHAPE', color: 'text-pink-600', bgColor: 'bg-pink-100', symbol: '▲' }, 
    'INSPECAO': { label: 'INSPEÇÃO', type: 'SHAPE', color: 'text-purple-600', bgColor: 'bg-purple-100', symbol: '●' }, 
    'PR': { label: 'PARADA RELEVANTE', type: 'TEXT', color: 'text-white', bgColor: 'bg-orange-500', symbol: 'PR' },
    'MOTOR': { label: 'MOTOR', type: 'TEXT', color: 'text-gray-800', bgColor: 'bg-gray-200', symbol: 'M' },
    'LB': { label: 'LUB. SEMANAL', type: 'TEXT', color: 'text-teal-800', bgColor: 'bg-teal-200', symbol: 'LB' },
    'PNEUS': { label: 'PNEUS', type: 'TEXT', color: 'text-blue-900', bgColor: 'bg-blue-300', symbol: 'P' },
    'META': { label: 'META BATIDA', type: 'SHAPE', color: 'text-yellow-600', bgColor: 'bg-yellow-100', symbol: '★' },
};

export const AvailabilityBoard: React.FC = () => {
  const [records, setRecords] = useState<AvailabilityRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Modal State
  const [editingCell, setEditingCell] = useState<{tag: string, dateKey: string} | null>(null);
  const [tempStatuses, setTempStatuses] = useState<AvailabilityStatus[]>([]);
  
  // Controls
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [daysInMonth, setDaysInMonth] = useState<Date[]>([]);
  
  // TV Mode State
  const [isTvMode, setIsTvMode] = useState(false);

  useEffect(() => {
    const date = new Date(selectedYear, selectedMonth, 1);
    const days = [];
    while (date.getMonth() === selectedMonth) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    setDaysInMonth(days);
    
    // Carga inicial
    const initialRecords = StorageService.getAvailability();
    setRecords(initialRecords);
    
    // Executa a limpeza e sincronização inicial
    setTimeout(() => syncEventsOnly(days), 500);
    
    const handleExternalUpdate = (e: any) => {
        if (e.detail?.key === KEYS.AVAILABILITY) {
            setRecords(StorageService.getAvailability());
        } else {
            // Se mudou Schedule, History, etc, resincroniza
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
      if (match) {
          return `CA${match[1]}`;
      }
      return null;
  };

  const getBlacklist = (): string[] => {
      try { return JSON.parse(localStorage.getItem(BLACKLIST_KEY) || '[]'); } catch (e) { return []; }
  };

  const addToBlacklist = (tag: string) => {
      const list = getBlacklist();
      if (!list.includes(tag)) {
          localStorage.setItem(BLACKLIST_KEY, JSON.stringify([...list, tag]));
      }
  };

  const removeFromBlacklist = (tag: string) => {
      const list = getBlacklist().filter(t => t !== tag);
      localStorage.setItem(BLACKLIST_KEY, JSON.stringify(list));
  };

  // --- CORE LOGIC: REMOVE DUPLICATES & SYNC ---
  const syncEventsOnly = async (currentDays?: Date[]) => {
      setIsSyncing(true);
      try {
          const schedule = StorageService.getSchedule();
          const history = StorageService.getHistory();
          const activeTasks = StorageService.getActiveMaintenances();
          
          const rawRecords = StorageService.getAvailability();
          const blacklist = getBlacklist();
          
          const uniqueRecordMap = new Map<string, AvailabilityRecord>();

          rawRecords.forEach(rec => {
              const cleanTag = extractTag(rec.tag);
              if (!cleanTag || blacklist.includes(cleanTag)) return; 

              if (uniqueRecordMap.has(cleanTag)) {
                  const existing = uniqueRecordMap.get(cleanTag)!;
                  Object.entries(rec.statusMap).forEach(([date, statuses]) => {
                      const currentStatuses = existing.statusMap[date] || [];
                      existing.statusMap[date] = Array.from(new Set([...currentStatuses, ...statuses]));
                  });
              } else {
                  rec.tag = cleanTag;
                  uniqueRecordMap.set(cleanTag, rec);
              }
          });

          const upsertStatus = (tagRaw: string, dateRaw: string, status: AvailabilityStatus) => {
              const tag = extractTag(tagRaw);
              const dateKey = normalizeDateKey(dateRaw);
              if (!tag || !dateKey) return;

              if (!uniqueRecordMap.has(tag) && blacklist.includes(tag)) return;

              if (!uniqueRecordMap.has(tag)) {
                  uniqueRecordMap.set(tag, { id: crypto.randomUUID(), tag, statusMap: {} });
              }

              const rec = uniqueRecordMap.get(tag)!;
              if (!rec.statusMap[dateKey]) rec.statusMap[dateKey] = [];
              
              if (rec.statusMap[dateKey].includes('SEM_FALHA')) {
                  rec.statusMap[dateKey] = rec.statusMap[dateKey].filter(s => s !== 'SEM_FALHA');
              }

              if (!rec.statusMap[dateKey].includes(status)) {
                  rec.statusMap[dateKey].push(status);
              }
          };

          schedule.forEach(item => {
              if(item.dateStart) {
                  const desc = (item.description || '').toUpperCase();
                  let type: AvailabilityStatus = 'PREV';
                  if (desc.includes('INSPE')) type = 'INSPECAO';
                  else if (desc.includes('MOTOR')) type = 'MOTOR';
                  else if (desc.includes('LUB') || desc.includes('SEMANAL')) type = 'LB';
                  else if (desc.includes('PNEU')) type = 'PNEUS';
                  else if (desc.includes('PARADA') || desc.includes('RELEVANTE') || desc.includes('CRITIC')) type = 'PR';
                  else if (desc.includes('META')) type = 'META';
                  upsertStatus(item.frotaOm, item.dateStart, type);
              }
          });

          history.forEach(log => {
              if(log.tag && log.endTime) {
                  if (log.type === 'CORRETIVA') upsertStatus(log.tag, log.endTime, 'CORRETIVA');
                  else if (log.type === 'DEMANDA_EXTRA') upsertStatus(log.tag, log.endTime, 'DEMANDA_EXTRA');
              }
          });

          activeTasks.forEach(task => {
              if(task.header.tag && task.startTime) {
                  if (task.origin === 'CORRETIVA') upsertStatus(task.header.tag, task.startTime, 'CORRETIVA');
                  else if (task.origin === 'DEMANDA_EXTRA') upsertStatus(task.header.tag, task.startTime, 'DEMANDA_EXTRA');
              }
          });

          const finalRecords = Array.from(uniqueRecordMap.values())
              .sort((a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true }));

          const currentStr = JSON.stringify(rawRecords);
          const newStr = JSON.stringify(finalRecords);

          if (currentStr !== newStr) {
              await StorageService.saveAvailability(finalRecords);
              setRecords(finalRecords);
          } else {
              setRecords(finalRecords);
          }

      } finally {
          setIsSyncing(false);
      }
  };

  const handleAutoFillGreen = async () => {
      if(!confirm("CONFIRMAR FECHAMENTO DE TURNO:\n\nPreencher 'SEM FALHA' (Verde) em todos os equipamentos que não tiveram nenhuma intervenção registrada até agora?")) return;
      
      setIsSyncing(true);
      const currentRecords = [...records];
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      daysInMonth.forEach(dayDate => {
          if (dayDate.getTime() <= todayEnd.getTime()) {
              const dateKey = normalizeDateKey(dayDate);
              currentRecords.forEach(rec => {
                  if(!rec.statusMap[dateKey]) rec.statusMap[dateKey] = [];
                  if (rec.statusMap[dateKey].length === 0) {
                      rec.statusMap[dateKey].push('SEM_FALHA');
                  }
              });
          }
      });

      await StorageService.saveAvailability(currentRecords);
      setRecords(currentRecords);
      setIsSyncing(false);
  };

  const handleFillColumnGreen = async (date: Date) => {
      const dateKey = normalizeDateKey(date);
      if (!confirm(`CONFIRMAÇÃO:\n\nDefinir "SEM FALHA" (Verde) para TODOS os equipamentos no dia ${dateKey}?\n\n⚠️ Isso substituirá qualquer status existente neste dia.`)) return;

      setIsSyncing(true);
      const currentRecords = [...records];
      currentRecords.forEach(rec => {
          rec.statusMap[dateKey] = ['SEM_FALHA'];
      });
      await StorageService.saveAvailability(currentRecords);
      setRecords(currentRecords);
      setIsSyncing(false);
  };

  const openModal = (tag: string, dateKey: string, currentStatuses: AvailabilityStatus[]) => {
      setEditingCell({ tag, dateKey });
      setTempStatuses([...currentStatuses]);
  };

  const toggleTempStatus = (status: AvailabilityStatus) => {
      let newStatuses = [...tempStatuses];
      if (status === 'SEM_FALHA') {
          if (newStatuses.includes('SEM_FALHA')) newStatuses = []; 
          else newStatuses = ['SEM_FALHA']; 
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
          await StorageService.saveAvailability(newRecords);
          setRecords(newRecords);
      }
      setEditingCell(null);
      setTempStatuses([]);
  };

  const handleClearCell = () => {
      setTempStatuses([]);
  };
  
  const addRow = async () => {
      const tag = prompt("DIGITE O TAG (Ex: CA530):");
      if (!tag) return;
      
      const cleanTag = extractTag(tag);

      if (!cleanTag) {
          alert("TAG Inválido. Apenas equipamentos começando com 'CA' são permitidos (Ex: CA530).");
          return;
      }
      
      removeFromBlacklist(cleanTag);

      if (records.find(r => r.tag === cleanTag)) {
          alert("Equipamento já existe na lista.");
          return;
      }

      const newRec: AvailabilityRecord = { id: crypto.randomUUID(), tag: cleanTag, statusMap: {} };
      const updated = [...records, newRec].sort((a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true }));
      
      setRecords(updated);
      await StorageService.saveAvailability(updated);
  };

  const handleDeleteRow = (record: AvailabilityRecord) => {
      if(confirm(`REMOVER ${record.tag}?\n\nO equipamento será movido para a lista de ignorados e NÃO será recriado automaticamente na próxima sincronização.\n\nPara restaurar, adicione-o manualmente pelo botão "Novo Equip."`)) {
          addToBlacklist(record.tag);
          const newRecs = records.filter(r => r.tag !== record.tag);
          setRecords(newRecs);
          StorageService.saveAvailability(newRecs);
      }
  };

  const renderCellContent = (statusList: AvailabilityStatus[], isTv = false) => {
      if(!statusList || statusList.length === 0) return null;
      const sorted = [...statusList].sort((a,b) => {
          const confA = STATUS_CONFIG[a] || { type: 'TEXT' };
          const confB = STATUS_CONFIG[b] || { type: 'TEXT' };
          if(confA.type === confB.type) return 0;
          return confA.type === 'SHAPE' ? -1 : 1;
      });

      return (
          <div className="flex flex-wrap items-center justify-center gap-0.5 h-full w-full p-0.5">
              {sorted.map((st, idx) => {
                  const conf = STATUS_CONFIG[st];
                  if(!conf) return null;
                  // Aumenta tamanho no modo TV
                  const fontSize = isTv ? 'text-[14px]' : 'text-[10px]';
                  const shapeSize = isTv ? 'w-8 h-8' : 'w-5 h-5';
                  
                  if (isTv) return <span key={idx} className={`${conf.color} ${fontSize} leading-none drop-shadow-md`}>{conf.symbol}</span>;
                  return (
                      <div key={idx} className={`flex items-center justify-center ${shapeSize} rounded-md shadow-sm border border-black/5 ${conf.bgColor}`}>
                          <span className={`${conf.color} ${fontSize} font-black leading-none`}>{conf.symbol}</span>
                      </div>
                  );
              })}
          </div>
      );
  };

  // --- TV MODE RENDER ---
  if (isTvMode) {
      return (
          <div className="fixed inset-0 z-[200] bg-gray-950 text-white flex flex-col overflow-hidden font-sans select-none animate-fadeIn cursor-none group">
              <div className="flex justify-between items-center px-6 py-2 border-b border-[#007e7a] bg-gray-900 shadow-xl relative z-20 h-14">
                  <div className="flex items-center gap-4">
                      <div className="bg-white p-1 rounded shadow-[0_0_10px_rgba(0,126,122,0.5)]">
                          <Activity size={24} className="text-[#007e7a]" />
                      </div>
                      <div>
                          <h1 className="text-xl font-black tracking-widest uppercase text-white drop-shadow-lg leading-none">
                              DISPONIBILIDADE
                          </h1>
                      </div>
                  </div>
                  <div className="flex items-center gap-6">
                      <div className="text-right border-r border-gray-700 pr-6">
                          <span className="block text-sm font-black text-gray-300">{new Date(selectedYear, selectedMonth).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()} {selectedYear}</span>
                      </div>
                      <button onClick={() => setIsTvMode(false)} className="p-2 bg-white/5 hover:bg-red-600 rounded-full transition-all text-gray-500 hover:text-white border border-gray-800 opacity-0 group-hover:opacity-100"><X size={20} /></button>
                  </div>
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar p-2 bg-gray-950">
                  <div className="border border-gray-800 rounded-lg overflow-hidden shadow-2xl">
                      <table className="w-full border-collapse">
                          <thead>
                              <tr className="bg-gray-900 text-gray-300 text-xs font-black uppercase sticky top-0 z-20 shadow-lg h-10">
                                  <th className="p-2 text-left border-b border-gray-800 bg-gray-900 sticky left-0 z-30 min-w-[80px] shadow-[2px_0_5px_rgba(0,0,0,0.5)] border-r border-r-gray-800">TAG</th>
                                  {daysInMonth.map(date => (
                                      <th key={date.toString()} className={`p-0 border-b border-r border-gray-800 min-w-[32px] text-center ${date.getDay() === 0 || date.getDay() === 6 ? 'bg-gray-800/80 text-gray-500' : ''}`}>{date.getDate()}</th>
                                  ))}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800 font-bold text-gray-200 text-sm">
                              {records.map((record, rIdx) => (
                                  <tr key={record.id} className={`${rIdx % 2 === 0 ? 'bg-gray-900/40' : 'bg-transparent'} h-[40px]`}>
                                      <td className="p-2 border-r border-gray-800 font-black text-[#007e7a] sticky left-0 z-10 bg-gray-950 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">{record.tag}</td>
                                      {daysInMonth.map(date => {
                                          const dateKey = normalizeDateKey(date);
                                          return <td key={dateKey} className="p-0 border-r border-gray-800 text-center relative align-middle">{renderCellContent(record.statusMap[dateKey], true)}</td>;
                                      })}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
              <div className="bg-gray-900 border-t border-gray-800 p-2 flex justify-center gap-6 shrink-0 flex-wrap h-12 overflow-hidden items-center">
                  {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
                      <div key={key} className="flex items-center gap-2"><span className={`${conf.color} text-sm leading-none`}>{conf.symbol}</span><span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{conf.label}</span></div>
                  ))}
              </div>
          </div>
      );
  }

  // --- STANDARD MODE (COMPACTO) ---
  return (
    <div className="max-w-[1920px] mx-auto pb-10 px-2 lg:px-4 animate-fadeIn">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-3 gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="bg-gradient-to-br from-[#007e7a] to-[#005c5a] p-2 rounded-xl text-white shadow-lg shadow-teal-100"><Activity size={20} /></div>
          <div><h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter leading-none">Painel de Disponibilidade</h2><p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5 tracking-widest">Mapa de Status da Frota</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-200 shadow-inner h-10">
                <button onClick={() => { if(selectedMonth===0) { setSelectedMonth(11); setSelectedYear(y=>y-1) } else setSelectedMonth(m=>m-1) }} className="p-2 hover:bg-white rounded-lg transition-all text-gray-600 hover:text-gray-900 shadow-sm hover:shadow"><Calendar size={14} className="rotate-180"/></button>
                <div className="px-4 text-center min-w-[140px]"><span className="block text-xs font-black text-gray-800 uppercase tracking-wide">{new Date(selectedYear, selectedMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span></div>
                <button onClick={() => { if(selectedMonth===11) { setSelectedMonth(0); setSelectedYear(y=>y+1) } else setSelectedMonth(m=>m+1) }} className="p-2 hover:bg-white rounded-lg transition-all text-gray-600 hover:text-gray-900 shadow-sm hover:shadow"><Calendar size={14}/></button>
            </div>
            <div className="h-6 w-px bg-gray-200 mx-2 hidden xl:block"></div>
            <button onClick={handleAutoFillGreen} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-md transition-all active:scale-95 border-b-4 border-green-800 active:border-b-0 active:translate-y-1"><CheckCircle2 size={14} className={isSyncing ? 'animate-spin' : ''} /> Fechamento Turno</button>
            <button onClick={() => syncEventsOnly(daysInMonth)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-md transition-all active:scale-95 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"><RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> Sincronizar</button>
            <button onClick={addRow} className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-sm transition-all active:scale-95"><Plus size={14} /> Novo Equip.</button>
            <button onClick={() => setIsTvMode(true)} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg hover:shadow-xl transition-all active:scale-95 border-b-4 border-black hover:bg-gray-800 ml-auto xl:ml-2"><Monitor size={14} /> TV MODE</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-300 overflow-hidden relative flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full border-collapse border-spacing-0 bg-white">
            <thead>
              <tr className="bg-gray-900 text-gray-400 text-[9px] font-black uppercase">
                <th className="p-2 text-left border-r border-gray-700 bg-gray-900 sticky left-0 z-30 min-w-[100px] shadow-[4px_0_5px_rgba(0,0,0,0.2)] text-white tracking-wider">TAG</th>
                {daysInMonth.map(date => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <th key={date.toString()} className={`p-1 border-r border-gray-800 min-w-[32px] text-center cursor-pointer hover:bg-gray-800 transition-colors group relative ${isWeekend ? 'bg-gray-800 text-gray-500' : 'text-gray-300'}`} onClick={() => handleFillColumnGreen(date)} title="CLIQUE PARA PREENCHER O DIA INTEIRO COM 'SEM FALHA'">
                        <span className="block text-[7px] font-bold opacity-50">{date.toLocaleDateString('pt-BR', {weekday: 'short'}).slice(0,3)}</span>
                        <span className="block text-xs font-bold">{date.getDate()}</span>
                        <ArrowDownCircle size={10} className="absolute bottom-0.5 right-0.5 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                        title="Excluir (Mover para Ignorados)"
                      >
                          <Trash2 size={12}/>
                      </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-1"><Info size={14} className="text-gray-400"/><span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Legenda de Status</span></div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
              {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
                  <div key={key} className="flex items-center gap-1.5"><div className={`w-4 h-4 rounded-md flex items-center justify-center border border-black/5 shadow-sm ${conf.bgColor}`}><span className={`${conf.color} font-black text-[8px]`}>{conf.symbol}</span></div><span className="text-[9px] font-bold text-gray-600 uppercase">{conf.label}</span></div>
              ))}
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
                              <button key={key} onClick={() => toggleTempStatus(key as AvailabilityStatus)} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all group ${isActive ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' : 'bg-gray-50 border-gray-100 hover:border-gray-300 hover:bg-white'}`}>
                                  <div className={`w-8 h-8 flex items-center justify-center shrink-0 rounded-lg ${conf.bgColor}`}><span className={`${conf.color} font-black text-sm`}>{conf.symbol}</span></div>
                                  <div className="text-left"><span className={`text-[10px] font-black uppercase block leading-tight ${isActive ? 'text-blue-900' : 'text-gray-500 group-hover:text-gray-700'}`}>{conf.label}</span>{key === 'SEM_FALHA' && <span className="text-[8px] text-green-600 font-bold uppercase">(EXCLUSIVO)</span>}</div>
                              </button>
                          );
                      })}
                  </div>
                  <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-3">
                      <button onClick={handleClearCell} className="flex-1 bg-white border border-red-200 text-red-600 px-4 py-3 rounded-xl font-black text-xs uppercase hover:bg-red-50 transition-colors flex items-center justify-center gap-2"><Trash2 size={16}/> Limpar</button>
                      <button onClick={handleConfirmEdit} className="flex-[2] bg-[#007e7a] hover:bg-[#00605d] text-white px-4 py-3 rounded-xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"><Save size={16}/> Salvar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
