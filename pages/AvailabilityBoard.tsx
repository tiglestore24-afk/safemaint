
import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../services/storage';
import { AvailabilityRecord, AvailabilityStatus, ScheduleItem, MaintenanceLog, ActiveMaintenance } from '../types';
import { BackButton } from '../components/BackButton';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, X, Star, Eye, CheckCircle, Database } from 'lucide-react';

const INITIAL_FLEET = [
    'CA5302', 'CA5304', 'CA5305', 'CA5306', 'CA5307', 'CA5309', 'CA5310', 
    'CA5312', 'CA5316', 'CA5317', 'CA5318', 'CA5322', 'CA5324', 'CA5330'
];

const STATUS_OPTIONS: { id: AvailabilityStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'PREV', label: 'PREVENTIVA', icon: <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[14px] border-b-black"></div>, color: 'text-black' },
    { id: 'CORRETIVA', label: 'CORRETIVA', icon: <div className="w-4 h-4 rounded-full bg-red-600 shadow-sm"></div>, color: 'text-red-600' },
    { id: 'SEM_FALHA', label: 'SEM FALHA', icon: <div className="w-4 h-4 rounded-full bg-[#007e7a] shadow-sm"></div>, color: 'text-[#007e7a]' },
    { id: 'META', label: 'META PÓS PREV.', icon: <Star size={18} fill="#007e7a" className="text-[#007e7a]"/>, color: 'text-[#007e7a]' },
    { id: 'DEMANDA_EXTRA', label: 'DEMANDA EXTRA', icon: <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-red-600"></div>, color: 'text-red-600' },
    { id: 'PR', label: 'PARADA RELEVANTE', icon: <span className="text-red-600 font-black text-[10px] tracking-tighter">PR</span>, color: 'text-red-600' },
    { id: 'LS', label: 'LUB. SEMANAL', icon: <span className="text-blue-600 font-black text-[10px] tracking-tighter">LS</span>, color: 'text-blue-600' },
    { id: 'PNEUS', label: 'PNEUS', icon: <div className="w-4 h-4 rounded-full border-2 border-black flex items-center justify-center text-[9px] font-black">P</div>, color: 'text-black' },
    { id: 'INSPECAO', label: 'INSPEÇÃO', icon: <Eye size={18} className="text-gray-500"/>, color: 'text-gray-500' },
    { id: 'EMPTY', label: 'REMOVER MARCA', icon: <X size={18} className="text-gray-400"/>, color: 'text-gray-400' },
];

export const AvailabilityBoard: React.FC = () => {
    const [records, setRecords] = useState<AvailabilityRecord[]>([]);
    const [history, setHistory] = useState<MaintenanceLog[]>([]);
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [activeTasks, setActiveTasks] = useState<ActiveMaintenance[]>([]);
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [editMode, setEditMode] = useState(false);
    const [selectedCell, setSelectedCell] = useState<{ recId: string, day: number, currentStatuses: AvailabilityStatus[] } | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newTag, setNewTag] = useState('');

    useEffect(() => {
        loadData();
        window.addEventListener('safemaint_storage_update', loadData);
        return () => window.removeEventListener('safemaint_storage_update', loadData);
    }, []);

    const loadData = () => {
        const storedRecords = StorageService.getAvailability();
        const storedHistory = StorageService.getHistory();
        const storedSchedule = StorageService.getSchedule();
        const storedActive = StorageService.getActiveMaintenances();

        setHistory(storedHistory);
        setSchedule(storedSchedule);
        setActiveTasks(storedActive);

        // Se estiver vazio, popula com a frota inicial
        if (storedRecords.length === 0) {
            const initial = INITIAL_FLEET.map(tag => ({
                id: crypto.randomUUID(),
                tag,
                statusMap: {}
            }));
            StorageService.saveAvailability(initial);
            setRecords(initial);
        } else {
            setRecords(storedRecords);
        }
    };

    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };

    // --- LÓGICA DE AUTOMAÇÃO ---
    const getStatusForDay = (tag: string, day: number): AvailabilityStatus[] => {
        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateStr = targetDate.toLocaleDateString('pt-BR');
        const isoDate = targetDate.toISOString().split('T')[0];
        
        // Prioridade 1: Corretiva (Card Vermelho ou Histórico)
        const hasCorrective = activeTasks.some(t => t.header.tag === tag && t.origin === 'CORRETIVA' && t.startTime.startsWith(isoDate)) ||
                              history.some(h => h.tag === tag && h.type === 'CORRETIVA' && h.startTime.startsWith(isoDate));
        
        if (hasCorrective) return ['CORRETIVA'];

        // Prioridade 2: Programação (Agenda Semanal)
        const scheduleItem = schedule.find(s => s.frotaOm.includes(tag) && s.dateStart === dateStr);
        if (scheduleItem) {
            const desc = scheduleItem.description.toUpperCase();
            if (desc.includes('PNEU')) return ['PNEUS'];
            if (desc.includes('INSPE')) return ['INSPECAO'];
            // Se for preventiva padrão da agenda
            return ['PREV'];
        }

        // Prioridade 3: Sem Falha (Passado, dias úteis/corridos sem ocorrência)
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (targetDate < today) {
            return ['SEM_FALHA'];
        }

        return [];
    };

    const renderCellContent = (statuses?: AvailabilityStatus[]) => {
        if (!statuses || statuses.length === 0) return null;
        return (
            <div className="flex flex-wrap justify-center items-center gap-0.5 w-full h-full animate-fadeIn">
                {statuses.map((s, idx) => {
                    const opt = STATUS_OPTIONS.find(o => o.id === s);
                    return opt ? <div key={idx} title={opt.label}>{opt.icon}</div> : null;
                })}
            </div>
        );
    };

    const handleCellClick = (recId: string, day: number, currentStatuses: AvailabilityStatus[]) => {
        // Se estiver em modo edição, permite override manual
        if(editMode) {
            setSelectedCell({ recId, day, currentStatuses: currentStatuses || [] });
        } else {
            alert("O preenchimento é automático baseada na operação. Ative 'Editar Quadro' para ajustes manuais.");
        }
    };

    // Ação Manual (Override)
    const handleStatusAction = (status: AvailabilityStatus) => {
        if (!selectedCell) return;
        const keyDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedCell.day).padStart(2, '0')}`;
        const updatedRecords = records.map(rec => {
            if (rec.id === selectedCell.recId) {
                const newStatusMap = { ...rec.statusMap };
                let currentList = [...(newStatusMap[keyDate] || [])];

                if (status === 'EMPTY') {
                    delete newStatusMap[keyDate];
                } else {
                    if (currentList.includes(status)) {
                        currentList = currentList.filter(s => s !== status);
                    } else {
                        currentList.push(status);
                    }
                    if (currentList.length === 0) delete newStatusMap[keyDate];
                    else newStatusMap[keyDate] = currentList;
                }
                return { ...rec, statusMap: newStatusMap };
            }
            return rec;
        });

        StorageService.saveAvailability(updatedRecords);
        const updatedRec = updatedRecords.find(r => r.id === selectedCell.recId);
        if (updatedRec) {
            setSelectedCell({ ...selectedCell, currentStatuses: updatedRec.statusMap[keyDate] || [] });
        }
    };

    const handleAddTag = () => {
        if (!newTag.trim()) return;
        const newRecord: AvailabilityRecord = { id: crypto.randomUUID(), tag: newTag.toUpperCase(), statusMap: {} };
        StorageService.saveAvailability([...records, newRecord]);
        setNewTag(''); setIsAddModalOpen(false);
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);

    return (
        <div className="max-w-[100%] mx-auto pb-20 px-4 md:px-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b-2 border-gray-200 pb-4 bg-white p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <div>
                        <h2 className="text-xl font-black text-vale-darkgray uppercase tracking-tighter">Histórico Operacional</h2>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em]">Gestão de Disponibilidade Industrial</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-xl shadow-inner border border-gray-100">
                    <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-white hover:shadow-md rounded-lg transition-all"><ChevronLeft size={20} className="text-vale-green"/></button>
                    <span className="font-black text-sm min-w-[150px] text-center text-vale-green uppercase tracking-widest">{currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-white hover:shadow-md rounded-lg transition-all"><ChevronRight size={20} className="text-vale-green"/></button>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setIsAddModalOpen(true)} className="bg-[#007e7a] text-white px-4 py-2.5 rounded-xl font-black text-[10px] flex items-center gap-2 shadow-lg hover:bg-[#00605d] transition-all uppercase active:scale-95">
                        <Plus size={16} /> Incluir Equipamento
                    </button>
                    <button onClick={() => setEditMode(!editMode)} className={`px-4 py-2.5 rounded-xl font-black text-[10px] flex items-center gap-2 border shadow-sm transition-all uppercase active:scale-95 ${editMode ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        <Edit2 size={16} /> {editMode ? 'Concluir' : 'Editar'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-2xl border-[8px] border-[#d1d5db] overflow-hidden relative group">
                <div className="bg-[#007e7a] text-white text-center py-2 font-black uppercase text-sm tracking-[0.3em] shadow-lg relative z-10 flex justify-center items-center gap-3">
                    <Database size={16} />
                    DIAS OPERANDO SEM CORRETIVA APÓS PREVENTIVA
                </div>

                <div className="overflow-x-auto custom-scrollbar scroll-smooth">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-[#f8fafc]">
                                <th className="p-2 text-left text-[10px] font-black uppercase border border-gray-300 w-32 sticky left-0 bg-[#f8fafc] z-30 shadow-r shadow-black/5">Equipamento</th>
                                {daysArray.map(day => (
                                    <th key={day} className={`p-1 text-center text-[9px] font-black border border-gray-300 w-8 ${day > daysInMonth ? 'bg-gray-200 text-gray-400' : 'text-gray-700'}`}>
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((rec) => (
                                <tr key={rec.id} className="hover:bg-[#f0fdfa] transition-colors group/row">
                                    <td className="p-2 border border-gray-300 font-black text-[11px] text-gray-800 bg-white sticky left-0 z-20 flex justify-between items-center shadow-r shadow-black/5">
                                        <span className="tracking-tighter">{rec.tag.replace(/(\D+)(\d+)/, '$1 $2')}</span>
                                        {editMode && <button onClick={() => StorageService.saveAvailability(records.filter(r => r.id !== rec.id))} className="text-red-400 hover:text-red-600 transform scale-0 group-hover/row:scale-100 transition-transform"><Trash2 size={14}/></button>}
                                    </td>
                                    {daysArray.map(day => {
                                        const isActiveDay = day <= daysInMonth;
                                        const keyDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const manualStatuses = rec.statusMap[keyDate] || [];
                                        const autoStatuses = isActiveDay ? getStatusForDay(rec.tag, day) : [];
                                        const displayStatuses = manualStatuses.length > 0 ? manualStatuses : autoStatuses;

                                        return (
                                            <td 
                                                key={day} 
                                                onClick={() => isActiveDay && handleCellClick(rec.id, day, displayStatuses)} 
                                                className={`border border-gray-300 text-center transition-all ${isActiveDay ? 'cursor-pointer hover:bg-[#e6fffa]' : 'bg-gray-50'}`} 
                                                style={{ height: '28px' }}
                                            >
                                                {isActiveDay && renderCellContent(displayStatuses)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-[#f1f5f9] p-4 flex flex-wrap gap-x-6 gap-y-2 justify-center items-center border-t border-gray-300 relative z-10">
                    <span className="font-black text-[10px] text-gray-400 uppercase tracking-[0.2em] mr-2 border-r border-gray-300 pr-6">Legenda:</span>
                    {STATUS_OPTIONS.filter(o => o.id !== 'EMPTY').map(opt => (
                        <div key={opt.id} className="flex items-center gap-2">
                            <div className="transform scale-90">{opt.icon}</div>
                            <span className={`text-[9px] font-bold uppercase ${opt.color}`}>{opt.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {selectedCell && editMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-vale-dark/80 backdrop-blur-md" onClick={() => setSelectedCell(null)}>
                    <div className="bg-white rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.4)] p-8 w-full max-w-sm border-b-[8px] border-[#007e7a] animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter leading-none">Marcar Dia {selectedCell.day}</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Status de Disponibilidade</p>
                            </div>
                            <button onClick={() => setSelectedCell(null)} className="p-2 bg-gray-100 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={20}/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {STATUS_OPTIONS.map(opt => {
                                const isSelected = selectedCell.currentStatuses.includes(opt.id);
                                return (
                                    <button 
                                        key={opt.id} 
                                        onClick={() => handleStatusAction(opt.id)} 
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all relative group/btn ${opt.id === 'EMPTY' ? 'border-red-100 text-red-400 col-span-2 mt-2 bg-red-50/30' : isSelected ? 'border-[#007e7a] bg-[#f0fdfa] scale-[1.02] shadow' : 'border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-white'}`}
                                    >
                                        <div className="w-6 flex justify-center transform group-hover/btn:scale-110 transition-transform">{opt.icon}</div>
                                        <span className={`text-[9px] font-black uppercase tracking-tight ${opt.color}`}>{opt.label}</span>
                                        {isSelected && <div className="absolute -top-1.5 -right-1.5 bg-[#007e7a] text-white p-0.5 rounded-full shadow border border-white"><CheckCircle size={10} /></div>}
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={() => setSelectedCell(null)} className="mt-6 w-full py-3 bg-gray-900 text-white font-black rounded-xl text-[10px] tracking-[0.2em] shadow-xl uppercase hover:bg-black transition-all active:scale-95">Salvar Condição</button>
                    </div>
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-vale-dark/80 backdrop-blur-md">
                    <div className="bg-white rounded-[2rem] p-8 max-w-xs w-full shadow-[0_0_80px_rgba(0,0,0,0.4)] animate-fade-in-up border-b-[8px] border-vale-green">
                        <h3 className="text-xl font-black mb-6 uppercase text-vale-dark tracking-tighter">Incluir Equipamento</h3>
                        <div className="space-y-1 mb-6">
                            <label className="text-[9px] font-black text-gray-400 ml-2 uppercase tracking-widest">TAG (EX: CA5302)</label>
                            <input 
                                value={newTag} 
                                onChange={e => setNewTag(e.target.value.toUpperCase())} 
                                className="w-full border-2 border-gray-100 rounded-2xl p-4 font-black text-2xl uppercase focus:border-[#007e7a] focus:bg-white bg-gray-50 outline-none transition-all shadow-inner" 
                                placeholder="CA53XX" 
                                autoFocus 
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-gray-100 font-black text-gray-400 rounded-xl text-[10px] uppercase hover:bg-gray-200 transition-all">Cancelar</button>
                            <button onClick={handleAddTag} disabled={!newTag} className="flex-1 py-3 bg-[#007e7a] text-white font-black rounded-xl text-[10px] uppercase shadow hover:bg-[#00605d] transition-all disabled:opacity-50 active:scale-95">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
