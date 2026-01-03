
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { AvailabilityRecord, AvailabilityStatus, ScheduleItem, MaintenanceLog, ActiveMaintenance } from '../types';
import { BackButton } from '../components/BackButton';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, X, Star, Eye, CheckCircle, Database, RefreshCw, AlertTriangle } from 'lucide-react';

const STATUS_OPTIONS: { id: AvailabilityStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'PREV', label: 'PREVENTIVA (PROG/CARD)', icon: <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[14px] border-b-black" title="Preventiva"></div>, color: 'text-black' },
    { id: 'CORRETIVA', label: 'CORRETIVA (CARD)', icon: <div className="w-4 h-4 rounded-full bg-red-600 shadow-sm border border-red-800" title="Corretiva"></div>, color: 'text-red-600' },
    { id: 'SEM_FALHA', label: 'SEM FALHA', icon: <div className="w-3 h-3 rounded-full bg-green-500/50" title="Disponível"></div>, color: 'text-[#007e7a]' },
    { id: 'META', label: 'META PÓS PREV.', icon: <Star size={16} fill="#007e7a" className="text-[#007e7a]" />, color: 'text-[#007e7a]' },
    { id: 'DEMANDA_EXTRA', label: 'DEMANDA EXTRA', icon: <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-red-600" title="Demanda Extra"></div>, color: 'text-red-600' },
    { id: 'PR', label: 'PARADA RELEVANTE', icon: <span className="text-red-600 font-black text-[9px] tracking-tighter border border-red-200 px-0.5 rounded bg-red-50">PR</span>, color: 'text-red-600' },
    { id: 'LS', label: 'LUB. SEMANAL', icon: <span className="text-blue-600 font-black text-[9px] tracking-tighter border border-blue-200 px-0.5 rounded bg-blue-50">LS</span>, color: 'text-blue-600' },
    { id: 'PNEUS', label: 'PNEUS', icon: <div className="w-4 h-4 rounded-full border-2 border-black flex items-center justify-center text-[8px] font-black bg-white" title="Pneus">P</div>, color: 'text-black' },
    { id: 'INSPECAO', label: 'INSPEÇÃO', icon: <Eye size={16} className="text-purple-600" />, color: 'text-purple-600' },
    { id: 'EMPTY', label: 'LIMPAR MANUAL', icon: <X size={16} className="text-gray-400"/>, color: 'text-gray-400' },
];

export const AvailabilityBoard: React.FC = () => {
    const [records, setRecords] = useState<AvailabilityRecord[]>([]);
    const [history, setHistory] = useState<MaintenanceLog[]>([]);
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [activeTasks, setActiveTasks] = useState<ActiveMaintenance[]>([]);
    const [displayRows, setDisplayRows] = useState<AvailabilityRecord[]>([]);
    
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
        setRecords(storedRecords);
    };

    // LÓGICA DE UNIFICAÇÃO (MANUAL + AUTOMÁTICO)
    useEffect(() => {
        // 1. Tags Manuais
        const manualTags = new Set(records.map(r => r.tag));
        
        // 2. Tags de Cards Ativos
        const activeTags = new Set<string>();
        activeTasks.forEach(t => {
            if(t.header.tag) activeTags.add(t.header.tag.trim().toUpperCase());
        });

        // 3. Tags de Histórico
        const historyTags = new Set<string>();
        history.forEach(h => {
            if(h.tag) historyTags.add(h.tag.trim().toUpperCase());
        });

        // 4. Tags de Agenda
        const scheduleTags = new Set<string>();
        schedule.forEach(s => {
            const tag = s.frotaOm.split(/[\/\n\s]/)[0].trim().toUpperCase();
            if (tag.length > 2) scheduleTags.add(tag);
        });

        // Merge de todas as fontes
        const allUniqueTags = Array.from(new Set([...manualTags, ...activeTags, ...historyTags, ...scheduleTags])).sort();

        // Cria registros virtuais para o que não está salvo manualmente
        const mergedRows: AvailabilityRecord[] = allUniqueTags.map(tag => {
            const existing = records.find(r => r.tag === tag);
            if (existing) return existing;
            return { id: `auto-${tag}`, tag: tag, statusMap: {} }; // Registro Virtual
        });

        setDisplayRows(mergedRows);
    }, [records, activeTasks, history, schedule]);

    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    
    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };

    // LÓGICA CENTRAL DE INDICADORES AUTOMÁTICOS
    const getAutoStatuses = (tag: string, day: number): AvailabilityStatus[] => {
        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        
        // Formatos de data para comparação
        const dateStrBR = targetDate.toLocaleDateString('pt-BR'); // DD/MM/YYYY (Usado na Programação - Coluna 8)
        const dateIso = targetDate.toISOString().split('T')[0];   // YYYY-MM-DD (Usado nos Cards/Histórico)
        
        const statuses: Set<AvailabilityStatus> = new Set();

        // Normaliza a Tag da linha para comparação (remove espaços e garante uppercase)
        const normalizedRowTag = tag.trim().toUpperCase();

        // 1. CORRETIVA (Cards Abertos ou Histórico)
        const hasActiveCorrective = activeTasks.some(t => 
            t.header.tag && t.header.tag.trim().toUpperCase() === normalizedRowTag && 
            (t.origin === 'CORRETIVA' || t.artType === 'ART_EMERGENCIAL') && 
            t.startTime.startsWith(dateIso)
        );
        const hasHistoryCorrective = history.some(h => 
            h.tag && h.tag.trim().toUpperCase() === normalizedRowTag && 
            h.type === 'CORRETIVA' && 
            h.startTime.startsWith(dateIso)
        );

        if (hasActiveCorrective || hasHistoryCorrective) {
            statuses.add('CORRETIVA');
        }

        // 2. PREVENTIVA (Cards Abertos - NOVA LÓGICA)
        // Se houver um CARD de preventiva aberto, também preenche o quadro
        const hasActivePreventiveCard = activeTasks.some(t => 
            t.header.tag && t.header.tag.trim().toUpperCase() === normalizedRowTag && 
            t.origin === 'PREVENTIVA' && 
            t.startTime.startsWith(dateIso)
        );
        const hasHistoryPreventive = history.some(h => 
            h.tag && h.tag.trim().toUpperCase() === normalizedRowTag && 
            h.type === 'PREVENTIVA' && 
            h.startTime.startsWith(dateIso)
        );

        if (hasActivePreventiveCard || hasHistoryPreventive) {
            statuses.add('PREV');
        }

        // 3. PROGRAMAÇÃO (Schedule)
        // Verifica se a agenda tem algum item para esta TAG e DATA
        const scheduleItemsForDay = schedule.filter(s => {
            const scheduleTag = s.frotaOm.split(/[\/\n\s]/)[0].trim().toUpperCase(); 
            return scheduleTag === normalizedRowTag && s.dateStart === dateStrBR;
        });

        if (scheduleItemsForDay.length > 0) {
            scheduleItemsForDay.forEach(item => {
                const desc = item.description ? item.description.toUpperCase() : '';
                if (desc.includes('PNEU')) statuses.add('PNEUS');
                else if (desc.includes('INSPE')) statuses.add('INSPECAO');
                else if (desc.includes('LUB')) statuses.add('LS');
                else statuses.add('PREV');
            });
        }

        // 4. SEM FALHA (Default para passado se não tiver nada)
        const today = new Date();
        today.setHours(0,0,0,0);
        if (statuses.size === 0 && targetDate < today) {
            statuses.add('SEM_FALHA');
        }

        return Array.from(statuses);
    };

    const renderCellContent = (manualStatuses: AvailabilityStatus[], autoStatuses: AvailabilityStatus[]) => {
        // MERGE: Combina manuais e automáticos
        let combined = Array.from(new Set([...manualStatuses, ...autoStatuses]));
        
        // Prioridade visual: Se houver evento real, remove o "Sem Falha"
        if (combined.length > 1 && combined.includes('SEM_FALHA')) {
            combined = combined.filter(s => s !== 'SEM_FALHA');
        }

        if (combined.length === 0) return null;

        return (
            <div className="flex flex-wrap justify-center items-center gap-0.5 w-full h-full p-0.5">
                {combined.map((s, idx) => {
                    const opt = STATUS_OPTIONS.find(o => o.id === s);
                    return opt ? <div key={s + idx} title={opt.label} className="transform hover:scale-125 transition-transform">{opt.icon}</div> : null;
                })}
            </div>
        );
    };

    const handleCellClick = (recId: string, day: number, currentStatuses: AvailabilityStatus[]) => {
        if(editMode) {
            setSelectedCell({ recId, day, currentStatuses });
        }
    };

    const handleStatusAction = (status: AvailabilityStatus) => {
        if (!selectedCell) return;
        const keyDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedCell.day).padStart(2, '0')}`;
        
        // Se for uma linha virtual (auto), cria registro real agora
        let targetRecords = [...records];
        if (selectedCell.recId.startsWith('auto-')) {
            const tag = selectedCell.recId.replace('auto-', '');
            targetRecords.push({ id: selectedCell.recId, tag: tag, statusMap: {} });
        }

        const updatedRecords = targetRecords.map(rec => {
            if (rec.id === selectedCell.recId) {
                const newStatusMap = { ...rec.statusMap };
                let currentList = [...(newStatusMap[keyDate] || [])];
                
                if (status === 'EMPTY') {
                    delete newStatusMap[keyDate];
                } else {
                    // Toggle status manual
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
        setRecords(updatedRecords); 
        
        // Atualiza seleção
        const updatedRec = updatedRecords.find(r => r.id === selectedCell.recId);
        if(updatedRec) {
            const autoStatuses = getAutoStatuses(updatedRec.tag, selectedCell.day);
            const manualStatuses = updatedRec.statusMap[keyDate] || [];
            const combined = Array.from(new Set([...manualStatuses, ...autoStatuses]));
            setSelectedCell({ ...selectedCell, currentStatuses: combined });
        }
    };

    const handleAddTag = () => {
        if (!newTag.trim()) return;
        // Verifica duplicidade
        if (records.some(r => r.tag === newTag.toUpperCase())) {
            alert('Este equipamento já existe na tabela.');
            return;
        }
        const newRecord: AvailabilityRecord = { id: crypto.randomUUID(), tag: newTag.toUpperCase(), statusMap: {} };
        const newRecs = [...records, newRecord];
        StorageService.saveAvailability(newRecs);
        setRecords(newRecs);
        setNewTag(''); setIsAddModalOpen(false);
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);

    return (
        <div className="max-w-[100%] mx-auto pb-10 px-4">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 uppercase flex items-center gap-2">
                            Disponibilidade Física
                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-black border border-gray-200 hidden md:inline-block">DF%</span>
                        </h2>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <button onClick={() => changeMonth(-1)} className="hover:bg-gray-200 rounded p-1"><ChevronLeft size={16} className="text-[#007e7a]"/></button>
                    <span className="font-black text-sm min-w-[140px] text-center text-[#007e7a] uppercase">{currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => changeMonth(1)} className="hover:bg-gray-200 rounded p-1"><ChevronRight size={16} className="text-[#007e7a]"/></button>
                </div>

                <div className="flex gap-2">
                    <button onClick={loadData} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded font-bold text-[10px] flex items-center gap-1 uppercase transition-colors" title="Recarregar Dados">
                        <RefreshCw size={14} />
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="bg-[#007e7a] text-white px-3 py-2 rounded font-bold text-[10px] flex items-center gap-1 uppercase hover:bg-[#00605d] transition-colors">
                        <Plus size={14} /> Equipamento
                    </button>
                    <button onClick={() => setEditMode(!editMode)} className={`px-3 py-2 rounded font-bold text-[10px] flex items-center gap-1 border uppercase transition-colors ${editMode ? 'bg-orange-50 text-orange-600 border-orange-200 animate-pulse' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        <Edit2 size={14} /> {editMode ? 'MODO EDIÇÃO' : 'EDITAR MANUAL'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden relative min-h-[200px]">
                <div className="bg-[#007e7a] text-white text-center py-1.5 font-bold uppercase text-[10px] tracking-widest flex justify-center items-center gap-2 shadow-md z-30 relative">
                    <Database size={12} /> Mapa de Ocorrências & Programação
                </div>

                {displayRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Database size={32} className="opacity-20 mb-2" />
                        <p className="font-bold text-xs uppercase tracking-widest">Nenhuma frota cadastrada</p>
                        <p className="text-[10px] mt-1">Adicione ou aguarde integração com Cards</p>
                        <button onClick={() => setIsAddModalOpen(true)} className="mt-4 text-[#007e7a] text-[10px] font-black uppercase hover:underline border border-[#007e7a] px-4 py-2 rounded-lg hover:bg-teal-50">
                            + Adicionar Equipamento
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-2 text-left text-[10px] font-black uppercase border border-gray-300 w-28 sticky left-0 bg-gray-100 z-20 text-gray-600 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Tag Frota</th>
                                    {daysArray.map(day => (
                                        <th key={day} className={`p-1 text-center text-[9px] font-bold border border-gray-300 w-9 min-w-[36px] ${day > daysInMonth ? 'bg-gray-200 text-gray-300' : 'text-gray-700'}`}>
                                            {day}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayRows.map((rec) => (
                                    <tr key={rec.id} className="hover:bg-teal-50/20 transition-colors group">
                                        <td className="p-2 border border-gray-300 font-black text-[10px] text-gray-700 bg-white sticky left-0 z-10 flex justify-between items-center shadow-[2px_0_5px_rgba(0,0,0,0.05)] group-hover:bg-teal-50/50">
                                            <span>{rec.tag}</span>
                                            {editMode && !rec.id.startsWith('auto-') && <button onClick={() => { 
                                                const newRecs = records.filter(r => r.id !== rec.id);
                                                StorageService.saveAvailability(newRecs);
                                                setRecords(newRecs);
                                            }} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={12}/></button>}
                                        </td>
                                        {daysArray.map(day => {
                                            const isActiveDay = day <= daysInMonth;
                                            // Key date for Manual overrides
                                            const keyDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                            
                                            const manualStatuses = rec.statusMap[keyDate] || [];
                                            const autoStatuses = isActiveDay ? getAutoStatuses(rec.tag, day) : [];
                                            
                                            // Combined for passing to click handler
                                            const combined = Array.from(new Set([...manualStatuses, ...autoStatuses]));

                                            return (
                                                <td 
                                                    key={day} 
                                                    onClick={() => isActiveDay && handleCellClick(rec.id, day, combined)} 
                                                    className={`
                                                        border border-gray-300 text-center align-middle relative
                                                        ${isActiveDay ? (editMode ? 'cursor-pointer hover:bg-orange-50' : 'hover:bg-gray-50') : 'bg-gray-100'}
                                                    `} 
                                                    style={{ height: '32px' }}
                                                >
                                                    {isActiveDay && renderCellContent(manualStatuses, autoStatuses)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {/* LEGENDA DE STATUS */}
            <div className="mt-4 flex flex-wrap gap-3 justify-center bg-white p-3 rounded-lg border border-gray-200">
                {STATUS_OPTIONS.filter(o => o.id !== 'EMPTY').map(opt => (
                    <div key={opt.id} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                        <div className="scale-75">{opt.icon}</div>
                        <span className={`text-[9px] font-bold uppercase ${opt.color}`}>{opt.label}</span>
                    </div>
                ))}
            </div>

            {/* MODAL EDIÇÃO MANUAL */}
             {selectedCell && editMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedCell(null)}>
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm border-t-4 border-orange-500 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <div>
                                <h3 className="text-lg font-black text-gray-800 uppercase leading-none">Apontamento Manual</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Dia {selectedCell.day} - Adicionar/Remover Eventos</p>
                            </div>
                            <button onClick={() => setSelectedCell(null)} className="hover:bg-gray-100 p-1 rounded-full"><X size={20} className="text-gray-400"/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {STATUS_OPTIONS.map(opt => {
                                const isSelected = selectedCell.currentStatuses.includes(opt.id);
                                return (
                                    <button 
                                        key={opt.id} 
                                        onClick={() => handleStatusAction(opt.id)} 
                                        className={`
                                            flex items-center gap-2 p-3 rounded-lg border transition-all text-[9px] font-black uppercase 
                                            ${opt.id === 'EMPTY' 
                                                ? 'col-span-2 border-red-100 text-red-500 bg-red-50 hover:bg-red-100' 
                                                : isSelected 
                                                    ? 'border-[#007e7a] bg-teal-50 ring-1 ring-[#007e7a] shadow-sm' 
                                                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-white hover:border-gray-300'
                                            }
                                        `}
                                    >
                                        <div className="scale-90">{opt.icon}</div>
                                        <span className={opt.color}>{opt.label}</span>
                                        {isSelected && opt.id !== 'EMPTY' && <CheckCircle size={12} className="ml-auto text-[#007e7a]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ADICIONAR TAG */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-xl p-6 max-w-xs w-full border-t-4 border-[#007e7a] shadow-2xl">
                        <h3 className="text-lg font-black mb-4 uppercase text-gray-800">Novo Equipamento</h3>
                        <input value={newTag} onChange={e => setNewTag(e.target.value.toUpperCase().replace(/^([0-9])/, 'CA$1'))} className="w-full border-2 border-gray-200 rounded-lg p-3 font-bold uppercase focus:border-[#007e7a] outline-none mb-4 text-sm" placeholder="DIGITE O TAG..." autoFocus />
                        <div className="flex gap-2">
                            <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold text-gray-500 rounded-lg text-xs uppercase hover:bg-gray-200">Cancelar</button>
                            <button onClick={handleAddTag} disabled={!newTag} className="flex-1 py-3 bg-[#007e7a] text-white font-bold rounded-lg text-xs uppercase hover:bg-[#00605d]">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
