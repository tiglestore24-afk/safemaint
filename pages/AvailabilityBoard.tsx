
import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../services/storage';
import { AvailabilityRecord, AvailabilityStatus, ActiveMaintenance, MaintenanceLog, OMRecord } from '../types';
import { BackButton } from '../components/BackButton';
import { Plus, Trash2, X, Star, RefreshCw, AlertTriangle, Info, Calendar, Hammer, Activity, Save, CheckCircle2, Maximize2, Monitor, Filter, ArrowDownCircle } from 'lucide-react';

// --- CONFIGURAÇÃO VISUAL DOS MARCADORES ---
const STATUS_CONFIG: Record<string, { label: string, type: 'SHAPE' | 'TEXT', color: string, bgColor: string, symbol: any }> = {
    'PREV': { label: 'PREVENTIVA', type: 'SHAPE', color: 'text-blue-600', bgColor: 'bg-blue-100', symbol: '▲' },
    'CORRETIVA': { label: 'CORRETIVA', type: 'SHAPE', color: 'text-red-600', bgColor: 'bg-red-100', symbol: '●' },
    'DEMANDA_EXTRA': { label: 'DEMANDA EXTRA', type: 'SHAPE', color: 'text-pink-600', bgColor: 'bg-pink-100', symbol: '▲' }, 
    'SEM_FALHA': { label: 'SEM FALHA', type: 'SHAPE', color: 'text-green-600', bgColor: 'bg-green-100', symbol: '●' },
    'INSPECAO': { label: 'INSPEÇÃO', type: 'SHAPE', color: 'text-purple-600', bgColor: 'bg-purple-100', symbol: '●' }, 
    'MOTOR': { label: 'MOTOR', type: 'TEXT', color: 'text-gray-800', bgColor: 'bg-gray-200', symbol: 'M' },
    'PR': { label: 'PARADA RELEVANTE', type: 'TEXT', color: 'text-orange-700', bgColor: 'bg-orange-100', symbol: 'PR' },
    'LB': { label: 'LUB. SEMANAL', type: 'TEXT', color: 'text-teal-700', bgColor: 'bg-teal-100', symbol: 'LB' },
    'PNEUS': { label: 'PNEUS', type: 'TEXT', color: 'text-blue-800', bgColor: 'bg-blue-200', symbol: 'P' },
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
    
    // Carrega dados e sincroniza eventos
    syncEventsOnly();
    
    const handleExternalUpdate = () => syncEventsOnly();
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

  const syncEventsOnly = async () => {
      setIsSyncing(true);
      try {
          const schedule = StorageService.getSchedule();
          const history = StorageService.getHistory();
          const activeTasks = StorageService.getActiveMaintenances();
          const oms = StorageService.getOMs();
          
          let currentRecords = StorageService.getAvailability().filter(r => r.tag.startsWith('CA'));
          
          const uniqueTags = new Set<string>();
          const collect = (raw: string) => { const t = extractTag(raw); if(t) uniqueTags.add(t); };
          
          schedule.forEach(i => collect(i.frotaOm));
          history.forEach(i => collect(i.tag));
          activeTasks.forEach(i => collect(i.header.tag));
          oms.forEach(i => collect(i.tag));

          uniqueTags.forEach(tag => {
              if (!currentRecords.find(r => r.tag === tag)) {
                  currentRecords.push({ id: crypto.randomUUID(), tag, statusMap: {} });
              }
          });

          const pushStatus = (tagRaw: string, dateRaw: string, status: AvailabilityStatus) => {
              const tag = extractTag(tagRaw);
              const dateKey = normalizeDateKey(dateRaw);
              if(!tag || !dateKey) return;
              
              const rec = currentRecords.find(r => r.tag === tag);
              if(rec) {
                  if(!rec.statusMap[dateKey]) rec.statusMap[dateKey] = [];
                  if(!rec.statusMap[dateKey].includes(status)) {
                    // Remove SEM_FALHA se for adicionar outro status
                    rec.statusMap[dateKey] = rec.statusMap[dateKey].filter(s => s !== 'SEM_FALHA');
                    rec.statusMap[dateKey].push(status);
                  }
              }
          };

          schedule.forEach(item => {
              if(item.dateStart) {
                  const desc = (item.description || '').toUpperCase();
                  if (desc.includes('INSPE')) pushStatus(item.frotaOm, item.dateStart, 'INSPECAO');
                  else pushStatus(item.frotaOm, item.dateStart, 'PREV');
              }
          });

          history.forEach(log => {
            if(log.tag && log.endTime) {
                if (log.type === 'CORRETIVA') pushStatus(log.tag, log.endTime, 'CORRETIVA');
                else if (log.type === 'DEMANDA_EXTRA') pushStatus(log.tag, log.endTime, 'DEMANDA_EXTRA');
                else pushStatus(log.tag, log.endTime, 'PREV');
            }
          });

          activeTasks.forEach(task => {
              if(task.header.tag && task.startTime) {
                if (task.origin === 'CORRETIVA') pushStatus(task.header.tag, task.startTime, 'CORRETIVA');
                else if (task.origin === 'DEMANDA_EXTRA') pushStatus(task.header.tag, task.startTime, 'DEMANDA_EXTRA');
                else pushStatus(task.header.tag, task.startTime, 'PREV');
              }
          });

          currentRecords.sort((a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true }));
          await StorageService.saveAvailability(currentRecords);
          setRecords(currentRecords);

      } finally {
          setIsSyncing(false);
      }
  };

  const handleAutoFillGreen = async () => {
      if(!confirm("CONFIRMAR: Preencher 'SEM FALHA' (Verde) em todos os dias passados onde não houve manutenção registrada?\n\nEsta ação preenche as lacunas até o dia de hoje (23:59) mantendo os dados existentes.")) return;
      
      setIsSyncing(true);
      const currentRecords = [...records];
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      daysInMonth.forEach(dayDate => {
          if (dayDate.getTime() <= todayEnd.getTime()) {
              const dateKey = normalizeDateKey(dayDate);
              currentRecords.forEach(rec => {
                  if(!rec.statusMap[dateKey]) rec.statusMap[dateKey] = [];
                  const hasAnyStatus = rec.statusMap[dateKey].length > 0;
                  if (!hasAnyStatus) {
                      rec.statusMap[dateKey].push('SEM_FALHA');
                  }
              });
          }
      });

      await StorageService.saveAvailability(currentRecords);
      setRecords(currentRecords);
      setIsSyncing(false);
  };

  // --- NOVA FUNÇÃO: PREENCHER COLUNA INTEIRA (DIA) ---
  const handleFillColumnGreen = async (date: Date) => {
      const dateKey = normalizeDateKey(date);
      if (!confirm(`CONFIRMAÇÃO:\n\nDefinir "SEM FALHA" (Verde) para TODOS os equipamentos no dia ${dateKey}?\n\n⚠️ Isso substituirá qualquer status existente neste dia.`)) return;

      setIsSyncing(true);
      const currentRecords = [...records];
      
      currentRecords.forEach(rec => {
          // Define diretamente como SEM_FALHA, sobrescrevendo o que havia antes (mutual exclusive)
          rec.statusMap[dateKey] = ['SEM_FALHA'];
      });

      await StorageService.saveAvailability(currentRecords);
      setRecords(currentRecords);
      setIsSyncing(false);
  };

  // --- MODAL LOGIC (UPDATED MUTUAL EXCLUSIVITY) ---
  const openModal = (tag: string, dateKey: string, currentStatuses: AvailabilityStatus[]) => {
      setEditingCell({ tag, dateKey });
      setTempStatuses([...currentStatuses]);
  };

  const toggleTempStatus = (status: AvailabilityStatus) => {
      let newStatuses = [...tempStatuses];

      if (status === 'SEM_FALHA') {
          // SELECIONOU VERDE: LIMPA TUDO E DEIXA SÓ O VERDE
          if (newStatuses.includes('SEM_FALHA')) {
              newStatuses = []; // Toggle off
          } else {
              newStatuses = ['SEM_FALHA']; // Exclusivo
          }
      } else {
          // SELECIONOU OUTRO: REMOVE O VERDE SE EXISTIR
          newStatuses = newStatuses.filter(s => s !== 'SEM_FALHA');
          
          if (newStatuses.includes(status)) {
              newStatuses = newStatuses.filter(s => s !== status);
          } else {
              newStatuses.push(status);
          }
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
      const cleanTag = extractTag(tag) || tag.toUpperCase();
      const newRec: AvailabilityRecord = { id: crypto.randomUUID(), tag: cleanTag, statusMap: {} };
      const updated = [...records, newRec].sort((a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true }));
      setRecords(updated);
      await StorageService.saveAvailability(updated);
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
                  
                  if (isTv) {
                      // Visual Compacto para TV
                      return <span key={idx} className={`${conf.color} text-[14px] leading-none drop-shadow-sm`}>{conf.symbol}</span>;
                  }

                  // Visual Normal
                  return (
                      <div key={idx} className={`flex items-center justify-center w-5 h-5 rounded-md shadow-sm border border-black/5 ${conf.bgColor}`}>
                          <span className={`${conf.color} text-[10px] font-black leading-none`}>{conf.symbol}</span>
                      </div>
                  );
              })}
          </div>
      );
  };

  // --- TV MODE RENDER (COMPACTO) ---
  if (isTvMode) {
      return (
          <div className="fixed inset-0 z-[200] bg-gray-950 text-white flex flex-col overflow-hidden font-sans select-none animate-fadeIn cursor-none group">
              {/* Header TV Compacto */}
              <div className="flex justify-between items-center px-4 py-2 border-b border-[#007e7a] bg-gray-900 shadow-xl relative z-20 h-14">
                  <div className="flex items-center gap-4">
                      <div className="bg-white p-1 rounded shadow-[0_0_15px_rgba(0,126,122,0.5)]">
                          <Activity size={20} className="text-[#007e7a]" />
                      </div>
                      <div>
                          <h1 className="text-xl font-black tracking-widest uppercase text-white drop-shadow-lg leading-none">
                              DISPONIBILIDADE
                          </h1>
                          <p className="text-[#007e7a] font-bold text-[9px] tracking-[0.4em]">FROTA ESTRATÉGICA CA</p>
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                      <div className="text-right border-r border-gray-700 pr-4">
                          <span className="block text-lg font-black">{new Date(selectedYear, selectedMonth).toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()} {selectedYear}</span>
                      </div>
                      <button 
                          onClick={() => setIsTvMode(false)}
                          className="p-2 bg-white/5 hover:bg-red-600 rounded-full transition-all text-gray-500 hover:text-white border border-gray-800 opacity-0 group-hover:opacity-100"
                      >
                          <X size={18} />
                      </button>
                  </div>
              </div>

              {/* Table Content TV - Compacto */}
              <div className="flex-1 overflow-auto custom-scrollbar p-2 bg-gray-950">
                  <div className="border-2 border-gray-800 rounded-lg overflow-hidden shadow-2xl">
                      <table className="w-full border-collapse">
                          <thead>
                              <tr className="bg-gray-900 text-gray-400 text-[10px] font-black uppercase sticky top-0 z-20 shadow-lg">
                                  <th className="p-2 text-left border-b border-gray-700 bg-gray-900 sticky left-0 z-30 min-w-[80px] shadow-[4px_0_10px_rgba(0,0,0,0.5)] border-r border-r-gray-700">TAG</th>
                                  {daysInMonth.map(date => (
                                      <th key={date.toString()} className={`p-1 border-b border-r border-gray-800 min-w-[30px] text-center ${date.getDay() === 0 || date.getDay() === 6 ? 'bg-gray-800/50 text-gray-500' : ''}`}>
                                          {date.getDate()}
                                      </th>
                                  ))}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800 font-bold text-gray-300 text-xs">
                              {records.map((record, rIdx) => (
                                  <tr key={record.id} className={`${rIdx % 2 === 0 ? 'bg-gray-900/40' : 'bg-transparent'} hover:bg-white/5 transition-colors h-[35px]`}>
                                      <td className="p-2 border-r border-gray-700 font-black text-[#007e7a] text-sm sticky left-0 z-10 bg-gray-900 shadow-[4px_0_10px_rgba(0,0,0,0.5)]">{record.tag}</td>
                                      {daysInMonth.map(date => {
                                          const dateKey = normalizeDateKey(date);
                                          const statusList = record.statusMap[dateKey] || [];
                                          return (
                                              <td key={dateKey} className="p-0 border-r border-gray-800 text-center relative align-middle">
                                                  {renderCellContent(statusList, true)} 
                                              </td>
                                          );
                                      })}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
              
              {/* Footer Legend TV - Compacto */}
              <div className="bg-gray-900 border-t border-gray-800 p-2 flex justify-center gap-4 shrink-0 flex-wrap">
                  {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
                      <div key={key} className="flex items-center gap-1">
                          <span className={`${conf.color} text-sm leading-none`}>{conf.symbol}</span>
                          <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider">{conf.label}</span>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  // --- STANDARD MODE RENDER (PROFESSIONAL LAYOUT) ---
  return (
    <div className="max-w-[1920px] mx-auto pb-20 px-2 lg:px-6 animate-fadeIn">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <BackButton />
          <div className="bg-gradient-to-br from-[#007e7a] to-[#005c5a] p-3 rounded-xl text-white shadow-lg shadow-teal-100">
              <Activity size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-none">Painel de Disponibilidade</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-widest">Mapa de Status da Frota</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Date Navigator */}
            <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-200 shadow-inner">
                <button onClick={() => { if(selectedMonth===0) { setSelectedMonth(11); setSelectedYear(y=>y-1) } else setSelectedMonth(m=>m-1) }} className="p-2.5 hover:bg-white rounded-lg transition-all text-gray-600 hover:text-gray-900 shadow-sm hover:shadow"><Calendar size={16} className="rotate-180"/></button>
                <div className="px-6 text-center min-w-[160px]">
                    <span className="block text-sm font-black text-gray-800 uppercase tracking-wide">{new Date(selectedYear, selectedMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                </div>
                <button onClick={() => { if(selectedMonth===11) { setSelectedMonth(0); setSelectedYear(y=>y+1) } else setSelectedMonth(m=>m+1) }} className="p-2.5 hover:bg-white rounded-lg transition-all text-gray-600 hover:text-gray-900 shadow-sm hover:shadow"><Calendar size={16}/></button>
            </div>
            
            <div className="h-8 w-px bg-gray-200 mx-2 hidden xl:block"></div>

            <button onClick={handleAutoFillGreen} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase shadow-md transition-all active:scale-95 border-b-4 border-green-800 active:border-b-0 active:translate-y-1">
                <CheckCircle2 size={16} className={isSyncing ? 'animate-spin' : ''} /> Preencher Vazio (Passado)
            </button>
            <button onClick={() => syncEventsOnly()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase shadow-md transition-all active:scale-95 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1">
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> Sincronizar
            </button>
            <button onClick={addRow} className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-5 py-3 rounded-xl font-black text-[10px] uppercase shadow-sm transition-all active:scale-95">
                <Plus size={16} /> Novo Equip.
            </button>
            
            <button onClick={() => setIsTvMode(true)} className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:shadow-xl transition-all active:scale-95 border-b-4 border-black hover:bg-gray-800 ml-auto xl:ml-2">
                <Monitor size={16} /> TV MODE
            </button>
        </div>
      </div>

      {/* TABLE CONTAINER - PROFESSIONAL LOOK */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-300 overflow-hidden relative flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full border-collapse border-spacing-0 bg-white">
            <thead>
              <tr className="bg-gray-900 text-gray-400 text-[10px] font-black uppercase">
                {/* STICKY HEADER COLUMN */}
                <th className="p-4 text-left border-r border-gray-700 bg-gray-900 sticky left-0 z-30 min-w-[140px] shadow-[4px_0_5px_rgba(0,0,0,0.2)] text-white tracking-wider">
                    Equipamento (Tag)
                </th>
                {daysInMonth.map(date => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <th 
                        key={date.toString()} 
                        className={`p-1 border-r border-gray-800 min-w-[38px] text-center cursor-pointer hover:bg-gray-800 transition-colors group relative ${isWeekend ? 'bg-gray-800 text-gray-500' : 'text-gray-300'}`}
                        onClick={() => handleFillColumnGreen(date)}
                        title="CLIQUE PARA PREENCHER O DIA INTEIRO COM 'SEM FALHA'"
                    >
                        <span className="block text-[8px] font-bold opacity-50">{date.toLocaleDateString('pt-BR', {weekday: 'short'}).slice(0,3)}</span>
                        <span className="block text-sm font-bold">{date.getDate()}</span>
                        <ArrowDownCircle size={10} className="absolute bottom-0.5 right-0.5 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </th>
                  );
                })}
                <th className="p-1 w-10 bg-gray-900 border-l border-gray-800"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-bold text-gray-800 text-xs">
              {records.map((record, rIdx) => (
                <tr key={record.id} className={`${rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors group h-[50px]`}>
                  {/* STICKY TAG COLUMN */}
                  <td className="p-3 border-r border-gray-200 text-sm font-black text-[#007e7a] sticky left-0 z-20 bg-white group-hover:bg-blue-50/50 shadow-[4px_0_5px_rgba(0,0,0,0.05)] border-b border-gray-100">
                      {record.tag}
                  </td>
                  {daysInMonth.map(date => {
                    const dateKey = normalizeDateKey(date);
                    const statusList = record.statusMap[dateKey] || [];
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    return (
                        <td 
                            key={dateKey} 
                            onClick={() => openModal(record.tag, dateKey, statusList)} 
                            className={`p-0 border-r border-gray-200 text-center cursor-pointer hover:brightness-95 transition-all relative ${isWeekend ? 'bg-gray-100/50' : ''}`}
                        >
                            {renderCellContent(statusList)}
                        </td>
                    );
                  })}
                  <td className="p-1 text-center border-l border-gray-200">
                      <button onClick={() => { if(confirm("Remover linha?")) setRecords(records.filter(r => r.id !== record.id)) }} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                          <Trash2 size={14}/>
                      </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FLOATING LEGEND - CLEANER */}
      <div className="mt-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
              <Info size={16} className="text-gray-400"/>
              <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Legenda de Status</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
              {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
                  <div key={key} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border border-black/5 shadow-sm ${conf.bgColor}`}>
                          <span className={`${conf.color} font-black text-[10px]`}>{conf.symbol}</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-600 uppercase">{conf.label}</span>
                  </div>
              ))}
          </div>
      </div>

      {/* EDIT MODAL */}
      {editingCell && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-t-4 border-[#007e7a]">
                  <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-b border-gray-200">
                      <div>
                          <h3 className="font-black text-xl text-gray-800 uppercase leading-none">{editingCell.tag}</h3>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 flex items-center gap-1">
                              <Calendar size={10}/> {editingCell.dateKey}
                          </p>
                      </div>
                      <button onClick={() => setEditingCell(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      {Object.entries(STATUS_CONFIG).map(([key, conf]) => {
                          const isActive = tempStatuses.includes(key as AvailabilityStatus);
                          return (
                              <button 
                                key={key}
                                onClick={() => toggleTempStatus(key as AvailabilityStatus)}
                                className={`
                                    flex items-center gap-3 p-3 rounded-xl border-2 transition-all group
                                    ${isActive 
                                        ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' 
                                        : 'bg-gray-50 border-gray-100 hover:border-gray-300 hover:bg-white'}
                                `}
                              >
                                  <div className={`w-8 h-8 flex items-center justify-center shrink-0 rounded-lg ${conf.bgColor}`}>
                                      <span className={`${conf.color} font-black text-sm`}>{conf.symbol}</span>
                                  </div>
                                  <div className="text-left">
                                      <span className={`text-[10px] font-black uppercase block leading-tight ${isActive ? 'text-blue-900' : 'text-gray-500 group-hover:text-gray-700'}`}>
                                          {conf.label}
                                      </span>
                                      {key === 'SEM_FALHA' && <span className="text-[8px] text-green-600 font-bold uppercase">(EXCLUSIVO)</span>}
                                  </div>
                              </button>
                          );
                      })}
                  </div>
                  
                  <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-3">
                      <button onClick={handleClearCell} className="flex-1 bg-white border border-red-200 text-red-600 px-4 py-3 rounded-xl font-black text-xs uppercase hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                          <Trash2 size={16}/> Limpar
                      </button>
                      <button onClick={handleConfirmEdit} className="flex-[2] bg-[#007e7a] hover:bg-[#00605d] text-white px-4 py-3 rounded-xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                          <Save size={16}/> Salvar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
