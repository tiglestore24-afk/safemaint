
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { AvailabilityRecord, AvailabilityStatus } from '../types';
import { BackButton } from '../components/BackButton';
import { Plus, Save, Trash2, RefreshCw, CheckCircle2, AlertCircle, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { FeedbackModal } from '../components/FeedbackModal';

const STATUS_CONFIG: Record<AvailabilityStatus, { label: string, color: string, bgColor: string, symbol: string }> = {
    'SEM_FALHA': { label: 'SEM FALHAS', color: 'text-green-600', bgColor: 'bg-green-100', symbol: '●' },
    'PREV': { label: 'PREVENTIVA', color: 'text-black', bgColor: 'bg-gray-200', symbol: '▲' },
    'CORRETIVA': { label: 'CORRETIVA', color: 'text-red-600', bgColor: 'bg-red-100', symbol: '●' },
    'DEMANDA_EXTRA': { label: 'DEMANDA', color: 'text-orange-600', bgColor: 'bg-orange-100', symbol: '▲' }, 
    'INSPECAO': { label: 'INSPEÇÃO', color: 'text-purple-600', bgColor: 'bg-purple-100', symbol: 'I' }, 
    'PR': { label: 'PARADA REL.', color: 'text-blue-700', bgColor: 'bg-blue-100', symbol: 'PR' },
    'MOTOR': { label: 'MOTOR', color: 'text-gray-800', bgColor: 'bg-gray-300', symbol: 'M' },
    'LB': { label: 'LUBRIF.', color: 'text-teal-700', bgColor: 'bg-teal-100', symbol: 'LB' },
    'PNEUS': { label: 'PNEUS', color: 'text-indigo-700', bgColor: 'bg-indigo-100', symbol: 'P' },
    'META': { label: 'META', color: 'text-yellow-600', bgColor: 'bg-yellow-100', symbol: '★' },
};

export const AvailabilityBoard: React.FC = () => {
  const [records, setRecords] = useState<AvailabilityRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [daysInMonth, setDaysInMonth] = useState<Date[]>([]);
  
  // UI States
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [menuOpen, setMenuOpen] = useState<{ recId: string, date: string } | null>(null);

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

  const loadData = async (fetchServer = false) => {
      let recs = fetchServer ? await StorageService.fetchAvailability() : StorageService.getAvailability();
      
      // REGRA: SOMENTE EQUIPAMENTOS CA5
      const filtered = recs.filter(r => r.tag.toUpperCase().startsWith('CA5'));
      
      // GARANTE UNICIDADE
      const unique = filtered.reduce((acc: AvailabilityRecord[], current) => {
          if (!acc.find(item => item.tag === current.tag)) acc.push(current);
          return acc;
      }, []);
      
      setRecords(unique.sort((a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true })));
  };

  const addRow = () => {
      const input = prompt("DIGITE O TAG DO EQUIPAMENTO (Deve iniciar com CA5...):");
      if (!input) return;
      
      const tagInput = input.toUpperCase().trim();
      
      if (!tagInput.startsWith('CA5')) {
          alert("⛔ ERRO: Apenas equipamentos da série CA5 são permitidos neste quadro.");
          return;
      }

      if (records.some(r => r.tag === tagInput)) {
          alert(`⛔ EQUIPAMENTO DUPLICADO: ${tagInput} já existe.`);
          return;
      }

      const newRec: AvailabilityRecord = { 
          id: crypto.randomUUID(), 
          tag: tagInput, 
          statusMap: {}, 
          manualOverrides: {}, 
          statusCounts: {} 
      };
      
      setRecords(prev => [...prev, newRec].sort((a,b) => a.tag.localeCompare(b.tag, undefined, { numeric: true })));
  };

  const handleStatusToggle = (recId: string, dateStr: string, status: AvailabilityStatus) => {
      setRecords(prev => prev.map(rec => {
          if (rec.id !== recId) return rec;
          
          const currentDayStatuses = rec.statusMap[dateStr] || [];
          let newStatuses = [...currentDayStatuses];

          // REGRA DE EXCLUSÃO MÚTUA: SEM FALHA vs CORRETIVA
          if (status === 'SEM_FALHA') {
              // Se adicionar Sem Falha, remove todas as Corretivas
              if (newStatuses.includes('SEM_FALHA')) {
                  newStatuses = newStatuses.filter(s => s !== 'SEM_FALHA');
              } else {
                  newStatuses = ['SEM_FALHA']; // Exclui todo o resto para garantir pureza
              }
          } else if (status === 'CORRETIVA') {
              // Se adicionar Corretiva, remove Sem Falha
              newStatuses = newStatuses.filter(s => s !== 'SEM_FALHA');
              newStatuses.push('CORRETIVA'); // Adiciona (permite múltiplas)
          } else {
              // Outros status apenas alternam
              if (newStatuses.includes(status)) {
                  newStatuses = newStatuses.filter(s => s !== status);
              } else {
                  newStatuses.push(status);
              }
          }

          return {
              ...rec,
              statusMap: { ...rec.statusMap, [dateStr]: newStatuses }
          };
      }));
  };

  const clearDay = (recId: string, dateStr: string) => {
      setRecords(prev => prev.map(rec => rec.id === recId ? { ...rec, statusMap: { ...rec.statusMap, [dateStr]: [] } } : rec));
      setMenuOpen(null);
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
  };

  return (
    <div className="w-full animate-fadeIn h-[calc(100vh-90px)] flex flex-col bg-gray-50 p-4">
      <FeedbackModal isOpen={isProcessing || isSuccess} isSuccess={isSuccess} />
      
      <div className="flex justify-between items-center mb-4 bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter leading-none">Indicadores de Disponibilidade</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Série CA5 - Gestão à Vista</p>
          </div>
        </div>
        <div className="flex gap-2">
            <div className="flex items-center bg-gray-100 rounded-xl p-1 border border-gray-200 mr-2">
                <button onClick={() => setSelectedMonth(m => m === 0 ? 11 : m - 1)} className="p-1.5 hover:bg-white rounded-lg transition-all"><ChevronLeft size={16}/></button>
                <span className="px-4 text-[10px] font-black uppercase w-28 text-center">{new Date(selectedYear, selectedMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => setSelectedMonth(m => m === 11 ? 0 : m + 1)} className="p-1.5 hover:bg-white rounded-lg transition-all"><ChevronRight size={16}/></button>
            </div>
            <button onClick={() => loadData(true)} className="flex items-center gap-1 bg-gray-100 text-gray-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-gray-200 transition-all"><RefreshCw size={14}/> Sincronizar</button>
            <button onClick={addRow} className="flex items-center gap-1 bg-[#007e7a] text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95 transition-all"><Plus size={14}/> Novo Tag CA5</button>
            <button onClick={handleSaveTable} className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95 transition-all"><Save size={14}/> Salvar Quadro</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border-4 border-gray-200 overflow-hidden flex-1 flex flex-col relative p-2">
          <div className="bg-[#007e7a] text-white text-center py-2.5 font-black uppercase text-xs rounded-t-xl tracking-[0.2em] shadow-inner mb-2">
              DISPONIBILIDADE OPERACIONAL - EQUIPAMENTOS CA5
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-30 bg-[#007e7a] text-white">
                      <tr className="divide-x divide-white/20">
                          <th className="p-2 border-b border-white/20 sticky left-0 z-40 bg-[#007e7a] font-black uppercase text-[10px] min-w-[140px] text-left shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Equipamento</th>
                          {daysInMonth.map(d => (
                              <th key={d.getTime()} className="p-1 border-b border-white/20 font-black text-center text-[10px] min-w-[38px]">{d.getDate()}</th>
                          ))}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {records.map(r => (
                          <tr key={r.id} className="hover:bg-teal-50/30 transition-colors group">
                              <td className="p-2 sticky left-0 z-20 bg-gray-100 font-black text-gray-700 text-xs flex justify-between items-center shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                  {r.tag}
                                  <button onClick={() => { if(confirm(`Remover ${r.tag}?`)) setRecords(records.filter(item => item.id !== r.id)) }} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1"><Trash2 size={12}/></button>
                              </td>
                              {daysInMonth.map(d => {
                                  const dateStr = d.toLocaleDateString('pt-BR');
                                  const statuses = r.statusMap[dateStr] || [];
                                  return (
                                    <td 
                                        key={dateStr} 
                                        onClick={() => setMenuOpen({ recId: r.id, date: dateStr })}
                                        className="p-0.5 border-x border-gray-100 bg-white h-11 text-center cursor-pointer hover:bg-blue-50 transition-all relative"
                                    >
                                        <div className="flex flex-wrap items-center justify-center gap-0.5 overflow-hidden max-h-full">
                                            {statuses.map((st, idx) => (
                                                <span key={idx} className={`${STATUS_CONFIG[st].color} font-black text-xs leading-none`} title={STATUS_CONFIG[st].label}>
                                                    {STATUS_CONFIG[st].symbol}
                                                </span>
                                            ))}
                                            {statuses.filter(s => s === 'CORRETIVA').length > 1 && (
                                                <span className="text-[8px] bg-red-600 text-white px-1 rounded-full font-black absolute top-0.5 right-0.5">
                                                    {statuses.filter(s => s === 'CORRETIVA').length}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                  );
                              })}
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* POPUP SELETOR DE STATUS */}
      {menuOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setMenuOpen(null)}>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200" onClick={e => e.stopPropagation()}>
                  <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                      <div>
                          <h4 className="font-black text-gray-800 text-sm uppercase">Editar Status</h4>
                          <p className="text-[10px] font-bold text-[#007e7a] uppercase tracking-widest">{menuOpen.date}</p>
                      </div>
                      <button onClick={() => setMenuOpen(null)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all"><X size={20}/></button>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2">
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                          <button 
                            key={key}
                            onClick={() => handleStatusToggle(menuOpen.recId, menuOpen.date, key as AvailabilityStatus)}
                            className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all group ${records.find(rec => rec.id === menuOpen.recId)?.statusMap[menuOpen.date]?.includes(key as any) ? 'bg-teal-50 border-[#007e7a]' : 'border-gray-100 hover:border-teal-200 bg-white'}`}
                          >
                              <span className={`${cfg.color} text-xl font-black shrink-0`}>{cfg.symbol}</span>
                              <span className="text-[10px] font-black text-gray-700 uppercase leading-none">{cfg.label}</span>
                          </button>
                      ))}
                      <button 
                        onClick={() => clearDay(menuOpen.recId, menuOpen.date)}
                        className="col-span-2 mt-2 p-3 bg-red-50 text-red-600 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-red-100 transition-all border-2 border-red-100"
                      >
                          <Trash2 size={14}/> Limpar Dia
                      </button>
                  </div>
                  <div className="p-4 bg-gray-50 border-t flex gap-2">
                      <button onClick={() => setMenuOpen(null)} className="flex-1 bg-[#007e7a] text-white py-3 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all">Concluir</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
