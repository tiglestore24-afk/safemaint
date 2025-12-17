
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { DocumentRecord } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { Printer, Camera, Upload, FileText, PenTool, CheckCircle } from 'lucide-react';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const Report: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'DIGITAL' | 'MANUAL'>('DIGITAL');

    // Form State (Digital)
    const [om, setOm] = useState('');
    const [type, setType] = useState('');
    const [equipment, setEquipment] = useState('');
    const [date, setDate] = useState('');
    const [executors, setExecutors] = useState('');
    const [timeStart, setTimeStart] = useState('');
    const [timeEnd, setTimeEnd] = useState('');
    
    // Fields to be edited by user
    const [stopReason, setStopReason] = useState('');
    const [activities, setActivities] = useState('');
    const [pendings, setPendings] = useState('');
    const [status, setStatus] = useState('');
    
    // Manual State
    const [manualFile, setManualFile] = useState<string | null>(null);

    useEffect(() => {
        // Load data passed from Checklist/Dashboard
        if (location.state) {
            const data = location.state;
            setOm(data.om || '');
            setType(data.type || 'MECANICA');
            setEquipment(data.tag || '');
            setDate(data.date || new Date().toLocaleDateString('pt-BR'));
            
            // Format executors if array
            if(Array.isArray(data.executors)) {
                setExecutors(data.executors.join(', '));
            } else {
                setExecutors(data.executors || '');
            }

            setTimeStart(data.startTime || '');
            setTimeEnd(data.endTime || '');
            setActivities(data.activities || '');
            setStopReason(data.stopReason || '');
            setStatus(data.status || 'FINALIZADO');
        } else {
             // Fallback: Just load date
             setDate(new Date().toLocaleDateString('pt-BR'));
        }
    }, [location]);

    // Template exato solicitado
    const generateText = () => {
        return `—————————————————
📝RETORNO OM ${om}
▪ TIPO: ${type}
🚜 ⁠EQUIPAMENTO: ${equipment}
🗓 DATA: ${date}
👥 EXECUTANTE: ${executors}
⏱⁠HORA INÍCIO: ${timeStart}
⏱⁠HORA FIM: ${timeEnd}
 MOTIVO DA PARADA 
 ${stopReason}
 ATIVIDADE REALIZADA :
 ${activities}
 PENDENCIAS:
 ${pendings}
▪ STATUS: ${status}
—————————————————`;
    };

    const copyToWhatsapp = () => {
        const text = generateText();
        navigator.clipboard.writeText(text).then(() => {
            alert("Relatório copiado para a área de transferência!");
        }).catch(err => {
            console.error(err);
            alert("Erro ao copiar.");
        });
    };

    const handleSave = () => {
        const isManual = activeTab === 'MANUAL';
        
        const doc: DocumentRecord = {
            id: crypto.randomUUID(),
            type: 'RELATORIO',
            header: {
                om, tag: equipment, date, time: timeEnd, type: isManual ? 'OUTROS' : 'OUTROS', description: activities.substring(0, 50) || 'Relatório Manual'
            },
            createdAt: new Date().toISOString(),
            status: 'ATIVO',
            content: {
                finalStatus: status,
                stopReason,
                activities,
                pendings,
                rawText: isManual ? 'Relatório em Anexo (Manual)' : generateText(),
                manualFileUrl: manualFile,
                isManualUpload: isManual
            },
            signatures: []
        };
        StorageService.saveDocument(doc);
        alert('Relatório arquivado com sucesso!');
        navigate('/archive');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const base64 = await fileToBase64(e.target.files[0]);
                setManualFile(base64);
            } catch(e) {
                console.error("Erro ao converter arquivo", e);
            }
        }
    };

    // Style for "Paper" Inputs
    const paperInputClass = "bg-transparent border-b border-gray-300 focus:border-black focus:ring-0 w-full px-1 py-0.5 text-gray-900 font-bold placeholder-gray-300 transition-colors uppercase";

    return (
        <div className="flex flex-col items-center bg-gray-200 min-h-screen py-8 px-4 print:bg-white print:p-0">
            
            {/* TABS HEADER */}
            <div className="bg-white rounded-full p-1 shadow-lg mb-6 flex w-full max-w-md print:hidden">
                <button 
                    onClick={() => setActiveTab('DIGITAL')}
                    className={`flex-1 py-3 px-6 rounded-full font-black text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'DIGITAL' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <FileText size={18} />
                    DIGITAL (PADRÃO)
                </button>
                <button 
                    onClick={() => setActiveTab('MANUAL')}
                    className={`flex-1 py-3 px-6 rounded-full font-black text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'MANUAL' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <PenTool size={18} />
                    MANUAL (FOTO)
                </button>
            </div>

            {/* PAPER CONTAINER */}
            <div className="bg-white shadow-2xl w-full max-w-[21cm] min-h-[20cm] p-8 md:p-12 relative print:shadow-none print:w-full print:max-w-none print:p-4 border-t-8 border-gray-800 animate-fadeIn">
                
                {/* Visual Header imitating the text lines */}
                <div className="border-b-2 border-dashed border-gray-400 pb-4 mb-6 text-center text-gray-400 font-mono text-xs">
                    —————————————————
                </div>

                {/* --- ABA DIGITAL --- */}
                {activeTab === 'DIGITAL' && (
                    <div className="space-y-4 font-mono text-sm md:text-base">
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl">📝</span>
                            <label className="font-black text-gray-800 whitespace-nowrap">RETORNO OM</label>
                            <input type="text" value={om} onChange={e => setOm(e.target.value)} className={paperInputClass} />
                        </div>

                        <div className="flex items-baseline gap-2">
                            <span className="font-black text-gray-800 whitespace-nowrap">▪ TIPO:</span>
                            <input type="text" value={type} onChange={e => setType(e.target.value)} className={paperInputClass} />
                        </div>

                        <div className="flex items-baseline gap-2">
                             <span className="text-xl">🚜</span>
                            <label className="font-black text-gray-800 whitespace-nowrap">EQUIPAMENTO:</label>
                            <input type="text" value={equipment} onChange={e => setEquipment(e.target.value)} className={paperInputClass} />
                        </div>

                        <div className="flex items-baseline gap-2">
                            <span className="text-xl">🗓</span>
                            <label className="font-black text-gray-800 whitespace-nowrap">DATA:</label>
                            <input type="text" value={date} onChange={e => setDate(e.target.value)} className={paperInputClass} />
                        </div>

                        <div className="flex items-baseline gap-2">
                            <span className="text-xl">👥</span>
                            <label className="font-black text-gray-800 whitespace-nowrap">EXECUTANTE:</label>
                            <input type="text" value={executors} onChange={e => setExecutors(e.target.value)} className={paperInputClass} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-baseline gap-2">
                                 <span className="text-xl">⏱</span>
                                <label className="font-black text-gray-800 whitespace-nowrap">HORA INÍCIO:</label>
                                <input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)} className={paperInputClass} />
                            </div>
                            <div className="flex items-baseline gap-2">
                                 <span className="text-xl">⏱</span>
                                <label className="font-black text-gray-800 whitespace-nowrap">HORA FIM:</label>
                                <input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} className={paperInputClass} />
                            </div>
                        </div>

                        {/* SECTIONS */}
                        <div className="pt-4 space-y-4">
                            <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                                <label className="font-black text-gray-800 block mb-1">MOTIVO DA PARADA</label>
                                <textarea 
                                    value={stopReason} 
                                    onChange={e => setStopReason(e.target.value)} 
                                    className="w-full bg-transparent border-b border-gray-400 focus:border-black focus:ring-0 p-1 font-bold h-16 resize-none"
                                    placeholder="Descreva o motivo..."
                                />
                            </div>

                            <div>
                                <label className="font-black text-gray-800 block mb-1">ATIVIDADE REALIZADA :</label>
                                <textarea 
                                    value={activities} 
                                    onChange={e => setActivities(e.target.value)} 
                                    className="w-full bg-gray-50 border border-gray-300 p-2 font-bold h-24 rounded"
                                />
                            </div>

                            <div className="bg-red-50 p-3 rounded border border-red-200">
                                <label className="font-black text-gray-800 block mb-1">PENDENCIAS:</label>
                                <textarea 
                                    value={pendings} 
                                    onChange={e => setPendings(e.target.value)} 
                                    className="w-full bg-transparent border-b border-gray-400 focus:border-black focus:ring-0 p-1 font-bold h-16 resize-none text-red-700"
                                    placeholder="Liste as pendências..."
                                />
                            </div>
                            
                            <div className="flex items-baseline gap-2 pt-2">
                                <span className="font-black text-gray-800 whitespace-nowrap">▪ STATUS:</span>
                                 <select 
                                    value={status} 
                                    onChange={e => setStatus(e.target.value)} 
                                    className="bg-transparent border-b-2 border-gray-800 font-bold text-lg focus:outline-none px-2 py-1 uppercase"
                                >
                                    <option value="FINALIZADO">FINALIZADO</option>
                                    <option value="PARCIAL">PARCIAL</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ABA MANUAL (UPLOAD) --- */}
                {activeTab === 'MANUAL' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-blue-900">
                            <h3 className="font-bold text-lg mb-1">RELATÓRIO MANUAL / FÍSICO</h3>
                            <p className="text-sm">Preencha os dados básicos e anexe uma foto do relatório preenchido manualmente.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">OM</label>
                                <input type="text" value={om} onChange={e => setOm(e.target.value)} className="w-full border-2 border-gray-300 rounded p-2 font-bold" />
                             </div>
                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">TAG</label>
                                <input type="text" value={equipment} onChange={e => setEquipment(e.target.value)} className="w-full border-2 border-gray-300 rounded p-2 font-bold" />
                             </div>
                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">DATA</label>
                                <input type="text" value={date} onChange={e => setDate(e.target.value)} className="w-full border-2 border-gray-300 rounded p-2 font-bold" />
                             </div>
                              <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">EXECUTANTES</label>
                                <input type="text" value={executors} onChange={e => setExecutors(e.target.value)} className="w-full border-2 border-gray-300 rounded p-2 font-bold" />
                             </div>
                        </div>

                        <div className="border-2 border-dashed border-gray-400 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 text-center hover:bg-gray-100 transition-colors cursor-pointer relative">
                            <input 
                                type="file" 
                                accept="image/*,.pdf" 
                                onChange={handleFileUpload} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {manualFile ? (
                                <div className="space-y-3">
                                    <div className="w-full h-48 bg-gray-200 rounded overflow-hidden flex items-center justify-center">
                                        {/* Simple preview logic */}
                                        <img src={manualFile} alt="Preview" className="max-h-full max-w-full object-contain" />
                                    </div>
                                    <p className="text-green-600 font-bold flex items-center justify-center gap-2">
                                        <CheckCircle size={20} /> ARQUIVO SELECIONADO (SALVO)
                                    </p>
                                    <p className="text-xs text-gray-500">Clique para alterar</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-blue-100 p-4 rounded-full text-blue-600 mb-3">
                                        <Camera size={32} />
                                    </div>
                                    <h4 className="font-bold text-gray-700">CLIQUE PARA TIRAR FOTO OU UPLOAD</h4>
                                    <p className="text-xs text-gray-500 mt-1">Formatos: JPG, PNG, PDF</p>
                                </>
                            )}
                        </div>

                         <div className="flex items-baseline gap-2 pt-2">
                            <span className="font-black text-gray-800 whitespace-nowrap">STATUS:</span>
                                <select 
                                value={status} 
                                onChange={e => setStatus(e.target.value)} 
                                className="bg-transparent border-b-2 border-gray-800 font-bold text-lg focus:outline-none px-2 py-1 uppercase"
                            >
                                <option value="FINALIZADO">FINALIZADO</option>
                                <option value="PARCIAL">PARCIAL</option>
                            </select>
                        </div>
                    </div>
                )}


                <div className="border-t-2 border-dashed border-gray-400 pt-4 mt-6 text-center text-gray-400 font-mono text-xs">
                    —————————————————
                </div>

                {/* Floating Actions */}
                <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50 print:hidden">
                    {activeTab === 'DIGITAL' && (
                        <button 
                            onClick={copyToWhatsapp}
                            className="bg-green-500 text-white px-6 py-4 rounded-full shadow-xl hover:bg-green-600 font-black flex items-center justify-center gap-3 transition-transform hover:scale-105 border-4 border-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            COPIAR RELATÓRIO
                        </button>
                    )}
                    <button 
                        onClick={handleSave}
                        className="bg-gray-800 text-white px-6 py-4 rounded-full shadow-xl hover:bg-black font-black flex items-center justify-center gap-3 transition-transform hover:scale-105 border-4 border-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        SALVAR E SAIR
                    </button>
                </div>
            </div>
        </div>
    );
};
