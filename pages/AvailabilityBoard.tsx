
import React, { useState, useEffect, useRef } from 'react';
import { StorageService, KEYS } from '../services/storage';
import { AvailabilityRecord, AvailabilityStatus } from '../types';
import { BackButton } from '../components/BackButton';
import { Plus, X, Activity, Save, Monitor, Calendar, RotateCcw, CheckCircle2, Trash2, Settings2, Minus, RefreshCw } from 'lucide-react';
import { FeedbackModal } from '../components/FeedbackModal';

const STATUS_CONFIG: Record<string, { label: string, color: string, bgColor: string, symbol: any }> = {
    'SEM_FALHA': { label: 'SEM FALHAS', color: 'text-green-700', bgColor: 'bg-green-100', symbol: '●' },
    'PREV': { label: 'PREVENTIVA', color: 'text-black', bgColor: 'bg-gray-200', symbol: '▲' },
    'CORRETIVA': { label: 'CORRETIVA', color: 'text-red-700', bgColor: 'bg-red-100', symbol: '●' },
    'DEMANDA_EXTRA': { label: 'DEMANDA', color: 'text-red-700', bgColor: 'bg-red-50', symbol: '▲' }, 
    'INSPECAO': { label: 'INSPEÇÃO', color: 'text-purple-700', bgColor: 'bg-purple-100', symbol: '●' }, 
    'PR': { label: 'PARADA REL.', color: 'text-orange-700', bgColor: 'bg-orange-100', symbol: 'PR' },
    'MOTOR': { label: 'MOTOR', color: 'text-gray-800', bgColor: 'bg-gray-200', symbol: 'M' },
    'LB': { label: 'LUBRIF.', color: 'text-teal-800', bgColor: 'bg-teal-200', symbol: 'LB' },
    'PNEUS': { label: 'PNEUS', color: 'text-blue-900', bgColor: 'bg-blue-300', symbol: 'P' },
    'META': { label: 'META', color: 'text-yellow-700', bgColor: 'bg-yellow-100', symbol: '★' },
};

interface AvailabilityBoardProps {
    variant?: 'DEFAULT' | 'TV' | 'SPLIT';
}

export const AvailabilityBoard: React.FC<AvailabilityBoardProps> = ({ variant = 'DEFAULT' }) => {
  const [records, setRecords] = useState<AvailabilityRecord[]>([]);
  const [editingCell, setEditingCell] = useState<{tag: string, dateKey: string} | null>(null);
  const [tempStatuses, setTempStatuses] = useState<AvailabilityStatus[]>([]);
  const [tempCounts, setTempCounts] = useState<Record<string, number>>({});
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [daysInMonth, setDaysInMonth] = useState<Date[]>([]);
  const [isTvMode, setIsTvMode] = useState(false);

  // Feedback states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const mode = variant !== 'DEFAULT' ? variant : (isTvMode ? 'TV' : 'DEFAULT');

  useEffect(() => {
    const date = new Date(selectedYear, selectedMonth, 1);
    const days = [];
    while (date.getMonth() === selectedMonth) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    setDaysInMonth(days);
    loadData(true);
  }, [selectedMonth, selectedYear]);

  // Normalização de Tag
  const normalizeTagFormat = (tag: string): string => {
      if (!tag) return '';
      const upper = tag.toUpperCase().trim();
      const match = upper.match(/CA[- ]*0*(\d+)/);
      if (match) return `CA${match[1]}`;
      return upper.replace(/[^A-Z0-9]/g, '');
  };

  const loadData = async (fetchServer = false) => {
      let recs: AvailabilityRecord[] = [];
      
      if (fetchServer) {
          setIsProcessing(true);
          recs = await StorageService.fetchAvailability();
          setIsProcessing(false);
      } else {
          recs = StorageService.getAvailability();
      }

      // FILTRO: Apenas equipamentos que começam com CA5
      const filteredRecs = recs.filter(r => r.tag.startsWith('CA5'));

      // Ordenar por TAG
      setRecords(filteredRecs.sort((a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true })));
  };

  const normalizeDateKey = (input: Date): string => input.toLocaleDateString('pt-BR');

  // Lógica de cálculo automático baseada em Schedule e History
  const getSystemEventsForCell = (tag: string, dateKey: string): { statuses: AvailabilityStatus[], counts: Record<string, number> } => {
      const schedule = StorageService.getSchedule();
      const history = StorageService.getHistory();
      const activeTasks = StorageService.getActiveMaintenances();
      const systemStatuses: Set<AvailabilityStatus> = new Set();
      const counts: Record<string, number> = {};

      const cleanTag = normalizeTagFormat(tag);

      // 1. Check Schedule (Preventivas)
      schedule.forEach(item => {
          if (normalizeTagFormat(item.frotaOm) === cleanTag && item.dateStart === dateKey) {
              const desc = (item.description || '').toUpperCase();
              let matched = false;
              if (desc.includes('PNEU')) { systemStatuses.add('PNEUS'); matched = true; }
              if (desc.includes('MOTOR')) { systemStatuses.add('MOTOR'); matched = true; }
              if (desc.includes('INSPE') || desc.includes('CHECK')) { systemStatuses.add('INSPECAO'); matched = true; }
              if (desc.includes('LUBRI')) { systemStatuses.add('LB'); matched = true; }
              if (!matched || desc.includes('PREV')) systemStatuses.add('PREV');
          }
      });

      // 2. Check History/Active (Corretivas/Demandas)
      [...history, ...activeTasks].forEach((task: any) => {
          const tTag = normalizeTagFormat(task.tag || task.header?.tag || '');
          const dateRef = task.endTime || task.startTime;
          if (!dateRef) return;
          const taskDate = new Date(dateRef).toLocaleDateString('pt-BR');
          
          if (taskDate === dateKey && tTag === cleanTag) {
              const origin = task.origin || task.type;
              if (origin === 'CORRETIVA' || origin === 'ART_EMERGENCIAL') {
                  systemStatuses.add('CORRETIVA');
                  counts['CORRETIVA'] = (counts['CORRETIVA'] || 0) + 1;
              }
              if (origin === 'DEMANDA_EXTRA') {
                  systemStatuses.add('DEMANDA_EXTRA');
              }
          }
      });
      
      const today = new Date();
      today.setHours(0,0,0,0);
      const [d, m, y] = dateKey.split('/').map(Number);
      const cellDate = new Date(y, m-1, d);

      // Se não tem evento e a data já passou, assume Sem Falha (Verde)
      if (systemStatuses.size === 0 && cellDate <= today) {
          systemStatuses.add('SEM_FALHA');
      }

      return { statuses: Array.from(systemStatuses), counts };
  };

  const handleSaveTable = async () => {
    setIsProcessing(true);
    try {
        await StorageService.saveAvailability(records);
        setIsProcessing(false);
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 1500);
    } catch (e: any) {
        setIsProcessing(false);
        alert(`FALHA AO SALVAR: ${e.message}`);
    }
  }

  const openModal = (record: AvailabilityRecord, dateKey: string) => {
      setEditingCell({ tag: record.tag, dateKey });
      // Se já tiver override manual, usa. Senão, calcula sistema.
      if (record.manualOverrides?.[dateKey]) {
          setTempStatuses([...(record.statusMap[dateKey] || [])]);
          setTempCounts({ ...(record.statusCounts?.[dateKey] || {}) });
      } else {
          const sys = getSystemEventsForCell(record.tag, dateKey);
          setTempStatuses(sys.statuses);
          setTempCounts(sys.counts);
      }
  };

  const updateCount = (status: string, delta: number) => {
      setTempCounts(prev => ({ ...prev, [status]: Math.max(1, (prev[status] || 1) + delta) }));
  };

  const saveManual = () => {
      if(!editingCell) return;
      const updated = records.map(r => {
          if (r.tag === editingCell.tag) {
              const newR = { ...r };
              newR.statusMap[editingCell.dateKey] = tempStatuses;
              if (!newR.statusCounts) newR.statusCounts = {};
              newR.statusCounts[editingCell.dateKey] = tempCounts;
              
              if (!newR.manualOverrides) newR.manualOverrides = {};
              newR.manualOverrides[editingCell.dateKey] = true;
              
              return newR;
          }
          return r;
      });
      setRecords(updated);
      setEditingCell(null);
  };

  const resetCell = () => {
      if(!editingCell) return;
      const updated = records.map(r => {
          if (r.tag === editingCell.tag) {
              const newR = { ...r };
              if (newR.manualOverrides) delete newR.manualOverrides[editingCell.dateKey];
              const sys = getSystemEventsForCell(r.tag, editingCell.dateKey);
              newR.statusMap[editingCell.dateKey] = sys.statuses;
              if (!newR.statusCounts) newR.statusCounts = {};
              newR.statusCounts[editingCell.dateKey] = sys.counts;
              return newR;
          }
          return r;
      });
      setRecords(updated);
      setEditingCell(null);
  };

  const addRow = () => {
      const tagInput = prompt("DIGITE O TAG (Ex: CA5302):")?.toUpperCase();
      if (!tagInput) return;
      const cleanTag = normalizeTagFormat(tagInput);
      
      // VALIDAÇÃO ESTRITA: Apenas CA5...
      if (!cleanTag.startsWith('CA5')) {
          alert("RESTRIÇÃO DE FROTA: Apenas equipamentos iniciados com 'CA5' podem ser adicionados a este indicador.");
          return;
      }

      if (records.some(r => r.tag === cleanTag)) { alert("Equipamento já existe."); return; }
      const newRec: AvailabilityRecord = { id: crypto.randomUUID(), tag: cleanTag, statusMap: {}, manualOverrides: {}, statusCounts: {} };
      const updated = [...records, newRec].sort((a,b) => a.tag.localeCompare(b.tag, undefined, { numeric: true }));
      setRecords(updated);
  };

  const deleteRow = (id: string) => {
      if (!window.confirm("Excluir equipamento do quadro?")) return;
      setRecords(records.filter(r => r.id !== id));
  };

  const renderCell = (record: AvailabilityRecord, dateKey: string) => {
      // Prioridade: Manual > Sistema
      let statuses = record.statusMap[dateKey];
      let counts = record.statusCounts?.[dateKey];

      if (!record.manualOverrides?.[dateKey]) {
          const sys = getSystemEventsForCell(record.tag, dateKey);
          statuses = sys.statuses;
          counts = sys.counts;
      }

      statuses = statuses || [];
      counts = counts || {};

      const isSplit = mode === 'SPLIT';
      
      const cellClass = isSplit ? 'min-w-[30px] h-9 text-[8px]' : 'min-w-[42px] h-8 text-[10px]';
      const iconSize = isSplit ? 'text-[8px]' : 'text-[10px]';

      return (
          <td 
            key={dateKey} 
            onClick={() => openModal(record, dateKey)}
            className={`p-0 border border-gray-400 bg-gray-50 hover:bg-white text-center cursor-pointer relative transition-colors ${cellClass}`}
          >
              <div className="flex flex-wrap items-center justify-center gap-0.5 w-full h-full content-center">
                  {statuses.map((s, idx) => {
                      const conf = STATUS_CONFIG[s];
                      if (!conf) return null;
                      const count = counts[s] || 1;
                      
                      // Renderiza Múltiplos símbolos se count > 1
                      const renderCount = Math.min(count, 3); // Max 3 visuais
                      
                      return Array.from({ length: renderCount }).map((_, i) => (
                          <span key={`${s}-${idx}-${i}`} className={`${conf.color} ${iconSize} font-black leading-none`}>{conf.symbol}</span>
                      ));
                  })}
              </div>
          </td>
      );
  };

  if (mode === 'TV' || mode === 'SPLIT') {
      return (
          <div className="bg-white h-full w-full flex flex-col overflow-hidden text-gray-800 font-sans animate-fadeIn">
              <div className="bg-[#007e7a] p-3 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                      <h2 className="font-black uppercase text-white leading-none text-xl tracking-widest">DIAS OPERANDO SEM CORRETIVA APÓS PREVENTIVA</h2>
                  </div>
                  {mode === 'TV' && <button onClick={() => setIsTvMode(false)} className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"><X size={18}/></button>}
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar p-2">
                  <table className="w-full border-collapse border border-gray-500">
                      <thead className="sticky top-0 z-20 bg-[#007e7a] text-white shadow-md">
                          <tr>
                              <th className="p-2 border border-gray-500 sticky left-0 z-30 bg-[#007e7a] font-black uppercase text-xs min-w-[120px]">Equipamento</th>
                              {daysInMonth.map(d => <th key={d.getTime()} className="p-1 border border-gray-500 font-black text-center text-xs min-w-[30px]">{d.getDate()}</th>)}
                          </tr>
                      </thead>
                      <tbody>
                          {records.map((r, idx) => (
                              <tr key={r.id} className="bg-gray-100">
                                  <td className="p-2 border border-gray-500 font-black text-gray-800 sticky left-0 z-10 bg-gray-200 text-sm">{r.tag}</td>
                                  {daysInMonth.map(d => renderCell(r, normalizeDateKey(d)))}
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  }

  return (
    <div className="w-full animate-fadeIn h-[calc(100vh-90px)] flex flex-col bg-gray-100 md:pr-2">
      <FeedbackModal 
        isOpen={isProcessing || isSuccess} 
        isSuccess={isSuccess} 
        loadingText="SALVANDO..." 
        successText="QUADRO ATUALIZADO!"
      />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <BackButton className="!py-1 !px-3" />
          <h2 className="text-base font-black text-gray-800 uppercase tracking-tighter">DIAS OPERANDO SEM CORRETIVA</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
            <div className="bg-gray-50 p-1 rounded-lg border flex items-center shadow-inner">
                <button onClick={() => { if(selectedMonth===0) { setSelectedMonth(11); setSelectedYear(y=>y-1) } else setSelectedMonth(m=>m-1) }} className="p-1 hover:bg-white rounded transition-all text-gray-400 hover:text-[#007e7a]"><Calendar size={16} className="rotate-180"/></button>
                <span className="px-3 text-[10px] font-black uppercase w-32 text-center text-gray-700">{new Date(selectedYear, selectedMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => { if(selectedMonth===11) { setSelectedMonth(0); setSelectedYear(y=>y+1) } else setSelectedMonth(m=>m+1) }} className="p-1 hover:bg-white rounded transition-all text-gray-400 hover:text-[#007e7a]"><Calendar size={16}/></button>
            </div>
            <button onClick={() => loadData(true)} className="flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase shadow-sm"><RefreshCw size={14}/> Atualizar</button>
            <button onClick={handleSaveTable} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg font-black text-[9px] uppercase shadow"><Save size={14}/> Salvar</button>
            <button onClick={addRow} className="flex items-center gap-1 bg-white border border-gray-300 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase shadow-sm"><Plus size={14}/> Add Tag</button>
            <button onClick={() => setIsTvMode(true)} className="flex items-center gap-1 bg-gray-800 text-white px-3 py-1.5 rounded-lg font-black text-[9px] uppercase shadow"><Monitor size={14}/> TV</button>
        </div>
      </div>

      {/* QUADRO (ESTILO FOTO) */}
      <div className="bg-white rounded-xl shadow-lg border-4 border-gray-300 overflow-hidden flex-1 flex flex-col relative p-2">
          {/* FAIXA VERDE SUPERIOR */}
          <div className="bg-[#007e7a] text-white text-center py-2 font-black uppercase text-sm tracking-widest shadow-md mb-2 rounded-t-lg">
              DIAS OPERANDO SEM CORRETIVA APÓS PREVENTIVA (FROTA CA5)
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full border-collapse border-2 border-gray-400">
                  <thead className="sticky top-0 z-20 bg-[#007e7a] text-white shadow-md">
                      <tr>
                          <th className="p-2 border border-gray-400 sticky left-0 z-30 bg-[#007e7a] font-black uppercase text-xs min-w-[120px] text-left">Equipamento</th>
                          {daysInMonth.map(d => (
                              <th key={d.getTime()} className="p-1 border border-gray-400 font-black text-center text-xs min-w-[35px]">
                                  {d.getDate()}
                              </th>
                          ))}
                      </tr>
                  </thead>
                  <tbody>
                      {records.map((r, rIdx) => (
                          <tr key={r.id} className="bg-gray-100 hover:bg-blue-50 transition-colors">
                              <td className="p-2 border border-gray-400 font-black text-gray-800 sticky left-0 z-10 bg-gray-300 text-sm flex justify-between items-center group">
                                  {r.tag}
                                  <button onClick={(e) => { e.stopPropagation(); deleteRow(r.id); }} className="opacity-0 group-hover:opacity-100 text-red-500"><Trash2 size={12}/></button>
                              </td>
                              {daysInMonth.map(d => renderCell(r, normalizeDateKey(d)))}
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
          
          {/* LEGENDA FOTO-REALISTA */}
          <div className="mt-2 bg-gray-200 p-2 rounded-lg border border-gray-300 flex flex-wrap justify-center gap-4 text-[10px] font-black uppercase text-gray-700">
              <span className="flex items-center gap-1"><span className="text-black text-xs">▲</span> PREV.</span>
              <span className="flex items-center gap-1"><span className="text-red-700 text-xs">●</span> CORRETIVA</span>
              <span className="flex items-center gap-1"><span className="text-green-700 text-xs">●</span> SEM FALHA</span>
              <span className="flex items-center gap-1"><span className="text-yellow-600 text-xs">★</span> META APÓS CORR.</span>
              <span className="flex items-center gap-1"><span className="text-red-700 text-xs">▲</span> DEMANDA EXTRA</span>
              <span className="flex items-center gap-1">PR - PARADA REL.</span>
              <span className="flex items-center gap-1">LS - LUB. SEMANAL</span>
              <span className="flex items-center gap-1">P - PNEUS</span>
          </div>
      </div>

      {editingCell && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border-t-8 border-[#007e7a]">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-black text-lg text-gray-800 uppercase">{editingCell.tag} - {editingCell.dateKey}</h3>
                      <button onClick={() => setEditingCell(null)}><X size={24}/></button>
                  </div>
                  
                  <div className="p-6 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                      {Object.entries(STATUS_CONFIG).map(([key, conf]) => {
                          const isSelected = tempStatuses.includes(key as AvailabilityStatus);
                          return (
                            <div key={key} className="space-y-1">
                                <button 
                                    onClick={() => {
                                        setTempStatuses(prev => {
                                            if (['SEM_FALHA', 'CORRETIVA'].includes(key)) {
                                                return isSelected && prev.length === 1 ? [] : [key as AvailabilityStatus];
                                            }
                                            let newS = prev.filter(s => !['SEM_FALHA', 'CORRETIVA'].includes(s));
                                            if (newS.includes(key as AvailabilityStatus)) newS = newS.filter(s => s !== key);
                                            else newS.push(key as AvailabilityStatus);
                                            return newS;
                                        });
                                    }}
                                    className={`w-full flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${isSelected ? 'border-[#007e7a] bg-teal-50' : 'border-gray-200 bg-white'}`}
                                >
                                    <span className={`${conf.color} font-black text-lg`}>{conf.symbol}</span>
                                    <span className="text-xs font-black uppercase text-gray-600">{conf.label}</span>
                                </button>
                                {isSelected && key === 'CORRETIVA' && (
                                    <div className="flex justify-center gap-2 items-center bg-red-50 p-1 rounded">
                                        <button onClick={() => updateCount('CORRETIVA', -1)}><Minus size={14}/></button>
                                        <span className="font-bold">{tempCounts['CORRETIVA'] || 1}</span>
                                        <button onClick={() => updateCount('CORRETIVA', 1)}><Plus size={14}/></button>
                                    </div>
                                )}
                            </div>
                          );
                      })}
                  </div>

                  <div className="p-4 border-t flex gap-2">
                      <button onClick={saveManual} className="flex-1 py-3 bg-[#007e7a] text-white rounded-xl font-black uppercase">Salvar</button>
                      <button onClick={resetCell} className="flex-1 py-3 bg-gray-200 text-gray-600 rounded-xl font-black uppercase">Auto Sistema</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
