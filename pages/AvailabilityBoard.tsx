
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { AvailabilityRecord, AvailabilityStatus } from '../types';
import { BackButton } from '../components/BackButton';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, X, AlertTriangle, CheckCircle, Eye, Star, Camera, CheckSquare } from 'lucide-react';

const STATUS_OPTIONS: { id: AvailabilityStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'OK', label: 'SEM FALHA', icon: <div className="w-4 h-4 rounded-full bg-vale-green"></div>, color: 'text-vale-green' },
    { id: 'CORRETIVA', label: 'CORRETIVA', icon: <div className="w-4 h-4 rounded-full bg-red-600"></div>, color: 'text-red-600' },
    { id: 'PREVENTIVA', label: 'PREVENTIVA', icon: <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[14px] border-b-black"></div>, color: 'text-black' },
    { id: 'PR', label: 'PARADA RELEVANTE', icon: <span className="text-red-500 font-black text-xs">PR</span>, color: 'text-red-500' },
    { id: 'LS', label: 'LUB. SEMANAL', icon: <span className="text-blue-500 font-black text-xs">LS</span>, color: 'text-blue-500' },
    { id: 'META', label: 'META APÓS CORR.', icon: <Star size={16} fill="black" className="text-black"/>, color: 'text-black' },
    { id: 'INSPECAO', label: 'INSPEÇÃO', icon: <Eye size={16} className="text-gray-600"/>, color: 'text-gray-600' },
    { id: 'EMPTY', label: 'LIMPAR (REMOVER TUDO)', icon: <X size={16} className="text-gray-400"/>, color: 'text-gray-400' },
];

export const AvailabilityBoard: React.FC = () => {
    const [records, setRecords] = useState<AvailabilityRecord[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [editMode, setEditMode] = useState(false);
    
    // Modal State
    const [selectedCell, setSelectedCell] = useState<{ recId: string, day: number, currentStatuses: AvailabilityStatus[] } | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newTag, setNewTag] = useState('');

    useEffect(() => {
        loadData();
        window.addEventListener('safemaint_storage_update', loadData);
        return () => window.removeEventListener('safemaint_storage_update', loadData);
    }, []);

    const loadData = () => {
        setRecords(StorageService.getAvailability());
    };

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const handleCellClick = (recId: string, day: number, currentStatuses: AvailabilityStatus[]) => {
        setSelectedCell({ recId, day, currentStatuses: currentStatuses || [] });
    };

    const handleStatusAction = (status: AvailabilityStatus) => {
        if (!selectedCell) return;
        
        const keyDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedCell.day).padStart(2, '0')}`;
        
        const updatedRecords = records.map(rec => {
            if (rec.id === selectedCell.recId) {
                const newStatusMap = { ...rec.statusMap };
                let currentList = newStatusMap[keyDate] || [];

                if (status === 'EMPTY') {
                    delete newStatusMap[keyDate];
                } else {
                    // Toggle logic: If exists, remove. If not, add.
                    if (currentList.includes(status)) {
                        currentList = currentList.filter(s => s !== status);
                    } else {
                        currentList = [...currentList, status];
                    }
                    
                    // If 'OK' is selected, it should ideally clear others or stand alone, but prompt implies multiple problems. 
                    // However, 'OK' usually implies 'No Problems'. Let's strictly enforce: If OK is added, clear others. If others added, clear OK.
                    if (status === 'OK') {
                        currentList = ['OK'];
                    } else if (currentList.includes('OK')) {
                        currentList = currentList.filter(s => s !== 'OK');
                    }

                    if (currentList.length === 0) {
                        delete newStatusMap[keyDate];
                    } else {
                        newStatusMap[keyDate] = currentList;
                    }
                }
                return { ...rec, statusMap: newStatusMap };
            }
            return rec;
        });

        StorageService.saveAvailability(updatedRecords);
        // Do not close modal immediately to allow multi-select
        // Update local selected state to reflect changes visually in modal
        const updatedRec = updatedRecords.find(r => r.id === selectedCell.recId);
        if (updatedRec) {
            const newList = updatedRec.statusMap[keyDate] || [];
            setSelectedCell({ ...selectedCell, currentStatuses: newList });
        }
    };

    const handleAddTag = () => {
        if (!newTag.trim()) return;
        const newRecord: AvailabilityRecord = {
            id: crypto.randomUUID(),
            tag: newTag.toUpperCase(),
            statusMap: {}
        };
        StorageService.saveAvailability([...records, newRecord]);
        setNewTag('');
        setIsAddModalOpen(false);
    };

    const handleDeleteTag = (id: string) => {
        if (window.confirm('Excluir este equipamento da lista?')) {
            StorageService.saveAvailability(records.filter(r => r.id !== id));
        }
    };

    // New Feature: Fill empty days with OK
    const handleFillEmptyDays = () => {
        if (!window.confirm("Preencher todos os dias vazios passados com 'SEM FALHA' (OK)?")) return;

        const today = new Date();
        const daysInCurrentView = getDaysInMonth(currentDate);
        const updatedRecords = records.map(rec => {
            const newStatusMap = { ...rec.statusMap };
            
            for (let d = 1; d <= daysInCurrentView; d++) {
                const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                // Only fill past/today, not future
                if (checkDate <= today) {
                    const keyDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    if (!newStatusMap[keyDate] || newStatusMap[keyDate].length === 0) {
                        newStatusMap[keyDate] = ['OK'];
                    }
                }
            }
            return { ...rec, statusMap: newStatusMap };
        });
        StorageService.saveAvailability(updatedRecords);
    };

    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };

    const renderCellContent = (statuses?: AvailabilityStatus[]) => {
        if (!statuses || statuses.length === 0) return null;

        // Render mini icons in a grid/flex
        return (
            <div className="flex flex-wrap justify-center items-center gap-0.5 w-full h-full p-0.5">
                {statuses.map((s, idx) => {
                    let content = null;
                    switch (s) {
                        case 'OK': content = <div className="w-3 h-3 rounded-full bg-vale-green shadow-sm"></div>; break;
                        case 'CORRETIVA': content = <div className="w-3 h-3 rounded-full bg-red-600 shadow-sm" title="Corretiva"></div>; break;
                        case 'PREVENTIVA': content = <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-black" title="Preventiva"></div>; break;
                        case 'PR': content = <span className="text-[8px] font-black text-red-500 leading-none">PR</span>; break;
                        case 'LS': content = <span className="text-[8px] font-black text-blue-500 leading-none">LS</span>; break;
                        case 'META': content = <Star size={10} fill="black" className="text-black"/>; break;
                        case 'INSPECAO': content = <Eye size={10} className="text-gray-600"/>; break;
                        default: content = null;
                    }
                    return <div key={idx}>{content}</div>;
                })}
            </div>
        );
    };

    const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
    const daysInMonth = getDaysInMonth(currentDate);
    const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);

    return (
        <div className="max-w-[98%] mx-auto pb-20">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <div>
                        <h2 className="text-2xl font-black text-vale-darkgray uppercase tracking-tighter">HISTÓRICO DE EQUIPAMENTOS</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ACOMPANHAMENTO DE DISPONIBILIDADE</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20}/></button>
                    <span className="font-black text-lg min-w-[180px] text-center text-vale-green">{monthName}</span>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={20}/></button>
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                    <button 
                        onClick={handleFillEmptyDays}
                        className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-black text-xs flex items-center gap-2 hover:bg-blue-200 shadow-sm border border-blue-200"
                        title="Preencher dias vazios passados com OK"
                    >
                        <CheckSquare size={16} /> AUTO-FILL (OK)
                    </button>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-vale-green text-white px-4 py-2 rounded-lg font-black text-xs flex items-center gap-2 hover:bg-emerald-700 shadow-md"
                    >
                        <Plus size={16} /> INCLUIR TAG
                    </button>
                    <button 
                        onClick={() => setEditMode(!editMode)}
                        className={`px-4 py-2 rounded-lg font-black text-xs flex items-center gap-2 border shadow-sm transition-colors ${editMode ? 'bg-red-100 text-red-600 border-red-200' : 'bg-white text-gray-600 border-gray-200'}`}
                    >
                        <Edit2 size={16} /> {editMode ? 'CONCLUIR' : 'EDITAR'}
                    </button>
                </div>
            </div>

            {/* BOARD CONTAINER */}
            <div className="bg-white rounded-lg shadow-2xl border-4 border-gray-300 overflow-hidden relative">
                {/* Board Header Bar */}
                <div className="bg-vale-green text-white text-center py-2 font-black uppercase text-sm md:text-base tracking-wider border-b-4 border-white">
                    MAPA DE OCORRÊNCIAS DIÁRIAS (MÚLTIPLOS STATUS PERMITIDOS)
                </div>

                <div className="overflow-x-auto pb-2">
                    <table className="w-full border-collapse min-w-[1000px]">
                        <thead>
                            <tr>
                                <th className="bg-vale-dark text-white p-2 text-left text-xs font-black uppercase tracking-wider w-32 border-r border-gray-600 sticky left-0 z-10">
                                    Equipamento
                                </th>
                                {daysArray.map(day => (
                                    <th key={day} className={`p-1 text-center text-xs font-bold border-r border-gray-200 w-8 ${day > daysInMonth ? 'bg-gray-100 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((rec, idx) => (
                                <tr key={rec.id} className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                    <td className="p-2 border-r border-gray-300 font-black text-xs text-gray-800 bg-white sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] flex justify-between items-center group">
                                        {rec.tag}
                                        {editMode && (
                                            <button onClick={() => handleDeleteTag(rec.id)} className="text-red-400 hover:text-red-600 ml-2">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </td>
                                    {daysArray.map(day => {
                                        const keyDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const statuses = rec.statusMap[keyDate];
                                        const isActiveDay = day <= daysInMonth;

                                        return (
                                            <td 
                                                key={day} 
                                                className={`
                                                    border-r border-gray-200 text-center relative
                                                    ${isActiveDay ? 'cursor-pointer hover:bg-gray-200' : 'bg-gray-100 cursor-not-allowed'}
                                                `}
                                                onClick={() => isActiveDay && handleCellClick(rec.id, day, statuses)}
                                                style={{ height: '36px' }}
                                            >
                                                <div className="flex items-center justify-center h-full w-full">
                                                    {renderCellContent(statuses)}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* LEGEND */}
                <div className="bg-gray-100 border-t border-gray-300 p-4 flex flex-wrap gap-6 justify-center items-center">
                    <span className="font-black text-xs text-gray-500 uppercase mr-2">LEGENDA:</span>
                    
                    <div className="flex items-center gap-2">
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-black"></div>
                        <span className="text-[10px] font-bold">PREV.</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-600"></div>
                        <span className="text-[10px] font-bold">CORRETIVA</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-vale-green"></div>
                        <span className="text-[10px] font-bold">SEM FALHA</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Star size={14} fill="black" className="text-black"/>
                        <span className="text-[10px] font-bold">META APÓS CORRETIVA</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-red-500">PR</span>
                        <span className="text-[10px] font-bold text-gray-500">- Parada Relevante</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-blue-500">LS</span>
                        <span className="text-[10px] font-bold text-gray-500">- Lub. Semanal</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <Eye size={14} className="text-gray-600"/>
                        <span className="text-[10px] font-bold text-gray-500">Inspeção</span>
                    </div>
                </div>
            </div>

            {/* STATUS SELECTOR MODAL (MULTI-SELECT) */}
            {selectedCell && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedCell(null)}>
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm border-t-4 border-vale-green animate-fadeIn" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-gray-800 text-center">DIA {selectedCell.day}: ADICIONAR OCORRÊNCIAS</h3>
                            <button onClick={() => setSelectedCell(null)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
                        </div>
                        
                        <p className="text-xs text-gray-500 mb-4 text-center">Clique para marcar/desmarcar múltiplos status.</p>

                        <div className="grid grid-cols-2 gap-3">
                            {STATUS_OPTIONS.map(opt => {
                                const isSelected = selectedCell.currentStatuses.includes(opt.id);
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleStatusAction(opt.id)}
                                        className={`
                                            flex items-center gap-3 p-3 rounded-lg border-2 transition-all relative
                                            ${opt.id === 'EMPTY' ? 'border-gray-200 hover:bg-red-50 text-gray-500 col-span-2 justify-center mt-2' : 
                                              isSelected ? 'border-vale-green bg-green-50 ring-2 ring-vale-green ring-offset-1' : 'border-gray-100 hover:border-vale-green/30 hover:bg-gray-50'}
                                        `}
                                    >
                                        <div className="flex items-center justify-center w-6 h-6">
                                            {opt.icon}
                                        </div>
                                        <span className={`text-xs font-black uppercase ${opt.color}`}>{opt.label}</span>
                                        {isSelected && <CheckCircle size={14} className="absolute top-1 right-1 text-vale-green" />}
                                    </button>
                                );
                            })}
                        </div>
                        <button 
                            onClick={() => setSelectedCell(null)}
                            className="mt-6 w-full py-3 bg-vale-green text-white font-black rounded-lg text-xs hover:bg-emerald-700 shadow-lg"
                        >
                            CONCLUIR / FECHAR
                        </button>
                    </div>
                </div>
            )}

            {/* ADD TAG MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
                            <Plus size={20} className="text-vale-green"/> NOVO EQUIPAMENTO
                        </h3>
                        <input 
                            value={newTag}
                            onChange={e => setNewTag(e.target.value.toUpperCase())}
                            className="w-full border-2 border-gray-300 rounded-lg p-3 font-bold uppercase text-lg focus:border-vale-green focus:ring-2 focus:ring-green-100 outline-none mb-4"
                            placeholder="EX: CA5332"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold text-gray-600 rounded-lg text-xs hover:bg-gray-200">CANCELAR</button>
                            <button onClick={handleAddTag} disabled={!newTag} className="flex-1 py-3 bg-vale-green font-black text-white rounded-lg text-xs hover:bg-emerald-700 disabled:opacity-50">ADICIONAR</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
