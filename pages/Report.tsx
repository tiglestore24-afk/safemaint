
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { DocumentRecord } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { Printer, Camera, Upload, FileText, PenTool, CheckCircle, Lock, Clock } from 'lucide-react';
import { Logo } from '../components/Logo';
import { FeedbackModal } from '../components/FeedbackModal'; // Importado

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

    // Feedback State
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Form State (Digital)
    const [om, setOm] = useState('');
    const [type, setType] = useState('');
    const [equipment, setEquipment] = useState('');
    const [date, setDate] = useState('');
    const [executors, setExecutors] = useState('');
    const [timeStart, setTimeStart] = useState('');
    const [timeEnd, setTimeEnd] = useState('');
    const [duration, setDuration] = useState(''); 
    
    const [stopReason, setStopReason] = useState('');
    const [activities, setActivities] = useState('');
    const [pendings, setPendings] = useState('');
    const [status, setStatus] = useState('');
    
    // Manual State
    const [manualFile, setManualFile] = useState<string | null>(null);

    const calculateDuration = (start: string, end: string) => {
        if (!start || !end) return '';
        try {
            const [h1, m1] = start.split(':').map(Number);
            const [h2, m2] = end.split(':').map(Number);
            
            let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (diffMinutes < 0) diffMinutes += 24 * 60; 

            const h = Math.floor(diffMinutes / 60);
            const m = diffMinutes % 60;
            return `${h}h ${m}m`;
        } catch (e) {
            return '';
        }
    };

    useEffect(() => {
        if (location.state) {
            const data = location.state as any;
            setOm(data.om || '');
            setType(data.type || 'MECANICA');
            setEquipment(data.tag || '');
            setDate(data.date || new Date().toLocaleDateString('pt-BR'));
            
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

            if (data.duration) {
                setDuration(data.duration);
            } else if (data.startTime && data.endTime) {
                setDuration(calculateDuration(data.startTime, data.endTime));
            }
        } else {
             setDate(new Date().toLocaleDateString('pt-BR'));
        }
    }, [location]);

    useEffect(() => {
        if(timeStart && timeEnd) {
            setDuration(calculateDuration(timeStart, timeEnd));
        }
    }, [timeStart, timeEnd]);

    const generateText = () => {
        return `—————————————————
📝RETORNO OM ${om}
▪ TIPO: ${type}
🚜 ⁠EQUIPAMENTO: ${equipment}
🗓 DATA: ${date}
👥 EXECUTANTE: ${executors}
⏱⁠HORA INÍCIO: ${timeStart}
⏱⁠HORA FIM: ${timeEnd}
⏳ TEMPO TOTAL: ${duration}
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

    const handleSave = async () => {
        setIsProcessing(true);

        try {
            await new Promise(r => setTimeout(r, 1000)); // Visual delay

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
                    duration, 
                    startTime: timeStart,
                    endTime: timeEnd,
                    rawText: isManual ? 'Relatório em Anexo (Manual)' : generateText(),
                    manualFileUrl: manualFile,
                    isManualUpload: isManual
                },
                signatures: []
            };
            StorageService.saveDocument(doc);
            
            setIsProcessing(false);
            setIsSuccess(true);

            setTimeout(() => {
                navigate('/archive');
            }, 1500);

        } catch (e) {
            setIsProcessing(false);
            alert("Erro ao arquivar relatório.");
        }
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

    return (
        <div className="flex flex-col items-center bg-gray-100 min-h-screen py-8 px-4 print:bg-white print:p-0">
            
            <FeedbackModal 
                isOpen={isProcessing || isSuccess} 
                isSuccess={isSuccess} 
                loadingText="ARQUIVANDO RELATÓRIO..." 
                successText="ARQUIVADO NA BIBLIOTECA!"
            />

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

            {/* DOCUMENT PAPER CONTAINER (A4 Style) */}
            <div className="bg-white shadow-2xl w-full max-w-[21cm] min-h-[29.7cm] p-8 md:p-12 relative print:shadow-none print:w-full print:max-w-none print:p-4 animate-fadeIn flex flex-col border border-gray-200">
                
                {/* --- ABA DIGITAL --- */}
                {activeTab === 'DIGITAL' && (
                    <div className="flex-1 flex flex-col h-full">
                        {/* HEADER PROFISSIONAL */}
                        <div className="border-b-4 border-vale-green pb-4 mb-8 flex justify-between items-end">
                            <div className="flex items-center gap-4">
                                <Logo size="lg" />
                                <div className="border-l-2 border-gray-300 pl-4 h-12 flex flex-col justify-center">
                                    <h1 className="text-xl font-black text-vale-darkgray uppercase leading-none">RELATÓRIO DE MANUTENÇÃO</h1>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">RETORNO TÉCNICO DE SERVIÇO</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-gray-400 uppercase">DATA DO RELATÓRIO</p>
                                <p className="text-lg font-black text-gray-800">{new Date().toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* GRID DE INFORMAÇÕES TÉCNICAS */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                            <h3 className="font-black text-xs text-vale-green uppercase mb-4 border-b border-gray-200 pb-2">DADOS DA ORDEM</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">ORDEM (OM)</label>
                                    <input type="text" value={om} readOnly className="w-full bg-white border border-gray-300 rounded p-2 font-black text-lg text-blue-900" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">TIPO</label>
                                    <input type="text" value={type} readOnly className="w-full bg-white border border-gray-300 rounded p-2 font-bold text-sm text-gray-800" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">EQUIPAMENTO (TAG)</label>
                                    <input type="text" value={equipment} readOnly className="w-full bg-white border border-gray-300 rounded p-2 font-black text-lg text-vale-green" />
                                </div>
                            </div>
                        </div>

                        {/* EXECUÇÃO E TEMPOS (DESTACADO) */}
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 mb-6 relative shadow-inner">
                            <div className="absolute top-4 right-4 text-blue-300">
                                <Lock size={16} />
                            </div>
                            <h3 className="font-black text-xs text-blue-800 uppercase mb-4 border-b border-blue-200 pb-2">REGISTRO DE EXECUÇÃO E TEMPO</h3>
                            
                            {/* DESTAQUE TEMPO TOTAL */}
                            <div className="mb-6 bg-white border-2 border-blue-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-600 text-white p-3 rounded-lg">
                                        <Clock size={24} />
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-black text-blue-400 uppercase tracking-widest">TEMPO TOTAL DE MANUTENÇÃO</span>
                                        <span className="text-3xl font-black text-blue-900 tracking-tight">{duration || '0h 0m'}</span>
                                    </div>
                                </div>
                                <div className="text-right hidden md:block">
                                    <span className="text-xs font-bold text-blue-300 uppercase">Duração Calculada</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-3">
                                    <label className="block text-[9px] font-black text-blue-400 uppercase mb-1">EXECUTANTES (VINCULADOS)</label>
                                    <input type="text" value={executors} readOnly className="w-full bg-white border border-blue-200 rounded p-2 font-bold text-sm text-gray-700" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-blue-400 uppercase mb-1">HORA INÍCIO (REAL)</label>
                                    <input type="text" value={timeStart} readOnly className="w-full bg-white border border-blue-200 rounded p-2 font-mono font-black text-lg text-gray-800 text-center" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-blue-400 uppercase mb-1">HORA FIM (REAL)</label>
                                    <input type="text" value={timeEnd} readOnly className="w-full bg-white border border-blue-200 rounded p-2 font-mono font-black text-lg text-gray-800 text-center" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-blue-400 uppercase mb-1">STATUS FINAL</label>
                                    <select 
                                        value={status} 
                                        onChange={e => setStatus(e.target.value)} 
                                        className="w-full bg-white border-2 border-blue-300 rounded p-2 font-black text-sm text-blue-900 uppercase focus:outline-none"
                                    >
                                        <option value="FINALIZADO">FINALIZADO</option>
                                        <option value="PARCIAL">PARCIAL</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* CAMPOS DESCRITIVOS */}
                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase mb-1 bg-gray-100 p-1 pl-2 border-l-4 border-gray-400">MOTIVO DA PARADA</label>
                                <textarea 
                                    value={stopReason} 
                                    onChange={e => setStopReason(e.target.value)} 
                                    className="w-full border border-gray-300 p-3 rounded text-sm font-medium h-20 resize-none focus:ring-1 focus:ring-vale-green focus:border-vale-green outline-none"
                                    placeholder="Descreva o motivo principal..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase mb-1 bg-gray-100 p-1 pl-2 border-l-4 border-vale-green">ATIVIDADES REALIZADAS</label>
                                <textarea 
                                    value={activities} 
                                    onChange={e => setActivities(e.target.value)} 
                                    className="w-full border border-gray-300 p-3 rounded text-sm font-medium h-32 resize-none focus:ring-1 focus:ring-vale-green focus:border-vale-green outline-none"
                                    placeholder="Detalhamento do serviço..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase mb-1 bg-gray-100 p-1 pl-2 border-l-4 border-red-500">PENDÊNCIAS TÉCNICAS</label>
                                <textarea 
                                    value={pendings} 
                                    onChange={e => setPendings(e.target.value)} 
                                    className="w-full border border-gray-300 p-3 rounded text-sm font-medium h-20 resize-none text-red-800 focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none"
                                    placeholder="Liste se houver pendências..."
                                />
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
                                <input type="text" value={om} onChange={e => setOm(e.target.value)} className="w-full border-2 border-gray-300 rounded p-2 font-black text-lg text-blue-900" />
                             </div>
                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">TAG</label>
                                <input type="text" value={equipment} onChange={e => setEquipment(e.target.value.toUpperCase().replace(/^([0-9])/, 'CA$1'))} className="w-full border-2 border-gray-300 rounded p-2 font-black text-lg text-vale-green" />
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

                {/* Footer do Documento */}
                <div className="mt-auto pt-8 border-t-2 border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase">
                    <span>SAFEMAINT - SISTEMA DE GESTÃO INTEGRADA</span>
                    <span>{new Date().toISOString()}</span>
                </div>

                {/* Floating Actions */}
                <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50 print:hidden">
                    {activeTab === 'DIGITAL' && (
                        <button 
                            onClick={copyToWhatsapp}
                            className="bg-green-500 text-white px-6 py-4 rounded-full shadow-xl hover:bg-green-600 font-black flex items-center justify-center gap-3 transition-transform hover:scale-105 border-4 border-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            COPIAR (ZAP)
                        </button>
                    )}
                    <button 
                        onClick={handleSave}
                        className="bg-gray-800 text-white px-6 py-4 rounded-full shadow-xl hover:bg-black font-black flex items-center justify-center gap-3 transition-transform hover:scale-105 border-4 border-white"
                    >
                        <CheckCircle size={20} />
                        SALVAR E ARQUIVAR
                    </button>
                </div>
            </div>
        </div>
    );
};
