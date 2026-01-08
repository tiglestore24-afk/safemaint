
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { DocumentRecord } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { Printer, Camera, Upload, FileText, PenTool, CheckCircle, Lock, Clock, Copy, Share2, Users, AlertTriangle, Wrench, Activity, MessageSquare } from 'lucide-react';
import { Logo } from '../components/Logo';
import { FeedbackModal } from '../components/FeedbackModal';

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
    
    // Detailed Fields
    const [executors, setExecutors] = useState('');
    const [timeStart, setTimeStart] = useState('');
    const [timeEnd, setTimeEnd] = useState('');
    const [duration, setDuration] = useState(''); 
    
    // Novos Campos
    const [deviation, setDeviation] = useState('');
    const [observation, setObservation] = useState('');

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
            
            // Logic to get all executors from signatures if passed as array
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
            setDeviation(data.deviation || '');
            setObservation(data.observation || '');

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

    // GERAÇÃO DO TEXTO PADRÃO COMPLETO (OLD STYLE BUT MODERN TEXT)
    const generateText = () => {
        return `*RELATÓRIO TÉCNICO - SAFEMAINT*
──────────────────────
*DADOS DA ORDEM*
🆔 OM: ${om}
🏷 TAG: ${equipment}
🔧 TIPO: ${type}
📅 DATA: ${date}

*EQUIPE EXECUTANTE*
👥 ${executors}

*REGISTRO DE TEMPO*
⏰ INÍCIO: ${timeStart}
🏁 TÉRMINO: ${timeEnd}
⏳ DURAÇÃO: ${duration}
📊 STATUS FINAL: ${status}
📉 DESVIO: ${deviation || 'NENHUM'}
📝 OBS: ${observation || '---'}

*DETALHAMENTO TÉCNICO*
🛑 *MOTIVO DA INTERVENÇÃO:*
${stopReason}

🛠 *ATIVIDADES REALIZADAS:*
${activities}

⚠️ *PENDÊNCIAS:*
${pendings || 'NENHUMA'}
──────────────────────`;
    };

    const copyToWhatsapp = () => {
        const text = generateText();
        if (navigator.share) {
            navigator.share({
                title: `Relatório OM ${om}`,
                text: text
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(text).then(() => {
                alert("Relatório copiado! Cole no WhatsApp ou E-mail.");
            }).catch(err => {
                console.error(err);
                alert("Erro ao copiar.");
            });
        }
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
                    deviation,    // SAVED
                    observation,  // SAVED
                    executorsList: executors, 
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

            {/* DOCUMENT PAPER CONTAINER (A4 Style - Auto Height for Print) */}
            <div className="bg-white shadow-2xl w-full max-w-[21cm] min-h-[29.7cm] p-8 md:p-12 relative print:shadow-none print:w-full print:max-w-none print:p-0 animate-fadeIn flex flex-col border border-gray-200 print:border-none print-area">
                
                {/* --- ABA DIGITAL --- */}
                {activeTab === 'DIGITAL' && (
                    <div className="flex-1 flex flex-col h-full space-y-6">
                        {/* HEADER PROFISSIONAL */}
                        <div className="border-b-4 border-vale-green pb-4 flex justify-between items-end avoid-break">
                            <div className="flex items-center gap-4">
                                <Logo size="lg" />
                                <div className="border-l-2 border-gray-300 pl-4 h-12 flex flex-col justify-center">
                                    <h1 className="text-xl font-black text-vale-darkgray uppercase leading-none">RELATÓRIO DE MANUTENÇÃO</h1>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">RETORNO TÉCNICO DE SERVIÇO</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-gray-400 uppercase">EMISSÃO</p>
                                <p className="text-lg font-black text-gray-800">{new Date().toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* 1. DADOS DA ORDEM */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 avoid-break">
                            <h3 className="font-black text-xs text-vale-green uppercase mb-4 border-b border-gray-200 pb-2 flex items-center gap-2">
                                <Wrench size={14}/> DADOS DA ORDEM
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">ORDEM (OM)</label>
                                    <input type="text" value={om} readOnly className="w-full bg-white border border-gray-300 rounded p-2 font-black text-lg text-blue-900 print:border-0 print:p-0 print:bg-transparent" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">TIPO MANUTENÇÃO</label>
                                    <input type="text" value={type} readOnly className="w-full bg-white border border-gray-300 rounded p-2 font-bold text-sm text-gray-800 print:border-0 print:p-0 print:bg-transparent" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">EQUIPAMENTO (TAG)</label>
                                    <input type="text" value={equipment} readOnly className="w-full bg-white border border-gray-300 rounded p-2 font-black text-lg text-vale-green print:border-0 print:p-0 print:bg-transparent" />
                                </div>
                            </div>
                        </div>

                        {/* 2. REGISTRO DE EXECUÇÃO (TEMPOS & EQUIPE) */}
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 avoid-break">
                            <h3 className="font-black text-xs text-blue-800 uppercase mb-4 border-b border-blue-200 pb-2 flex items-center gap-2">
                                <Clock size={14}/> REGISTRO DE EXECUÇÃO
                            </h3>
                            
                            {/* LINHA DE TEMPO E STATUS */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                    <label className="block text-[8px] font-black text-blue-400 uppercase mb-1">INÍCIO</label>
                                    <input type="text" value={timeStart} onChange={e => setTimeStart(e.target.value)} className="w-full font-black text-lg text-gray-800 bg-transparent outline-none" />
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                    <label className="block text-[8px] font-black text-blue-400 uppercase mb-1">TÉRMINO</label>
                                    <input type="text" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} className="w-full font-black text-lg text-gray-800 bg-transparent outline-none" />
                                </div>
                                <div className="bg-blue-600 p-3 rounded-lg shadow-sm text-white">
                                    <label className="block text-[8px] font-black text-blue-200 uppercase mb-1">DURAÇÃO TOTAL</label>
                                    <div className="font-black text-xl">{duration || '00:00'}</div>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                    <label className="block text-[8px] font-black text-blue-400 uppercase mb-1">STATUS FINAL</label>
                                    <select 
                                        value={status} 
                                        onChange={e => setStatus(e.target.value)} 
                                        className="w-full font-black text-sm text-blue-900 uppercase bg-transparent outline-none"
                                    >
                                        <option value="FINALIZADO">FINALIZADO</option>
                                        <option value="PARCIAL">PARCIAL</option>
                                    </select>
                                </div>
                            </div>

                            {/* LINHA DE DESVIO E OBSERVAÇÃO (NOVOS CAMPOS) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                    <label className="block text-[8px] font-black text-red-400 uppercase mb-1 flex items-center gap-1">
                                        <Activity size={10}/> DESVIO (SE HOUVER)
                                    </label>
                                    <input 
                                        type="text" 
                                        value={deviation} 
                                        onChange={e => setDeviation(e.target.value)} 
                                        className="w-full font-bold text-sm text-gray-700 bg-transparent outline-none uppercase placeholder-gray-300"
                                        placeholder="Ex: Atraso por chuva..."
                                    />
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                    <label className="block text-[8px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1">
                                        <MessageSquare size={10}/> OBSERVAÇÃO GERAL
                                    </label>
                                    <input 
                                        type="text" 
                                        value={observation} 
                                        onChange={e => setObservation(e.target.value)} 
                                        className="w-full font-bold text-sm text-gray-700 bg-transparent outline-none uppercase placeholder-gray-300"
                                        placeholder="Obs. adicionais..."
                                    />
                                </div>
                            </div>

                            {/* EQUIPE EXECUTANTE */}
                            <div>
                                <label className="block text-[9px] font-black text-blue-400 uppercase mb-2 flex items-center gap-1">
                                    <Users size={10}/> EQUIPE TÉCNICA (EXECUTANTES QUE ASSINARAM)
                                </label>
                                <textarea 
                                    rows={2} 
                                    value={executors} 
                                    onChange={e => setExecutors(e.target.value)}
                                    className="w-full bg-white border border-blue-200 rounded p-3 font-bold text-sm text-gray-700 focus:ring-2 focus:ring-blue-300 outline-none resize-none uppercase" 
                                    placeholder="Nomes dos executantes..."
                                />
                            </div>
                        </div>

                        {/* 3. DETALHAMENTO TÉCNICO (MOTIVOS E ATIVIDADES) */}
                        <div className="space-y-6 flex-1 avoid-break">
                            <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                                <label className="block text-xs font-black text-gray-700 uppercase p-3 bg-gray-100 border-b border-gray-300 flex items-center gap-2">
                                    <AlertTriangle size={14}/> MOTIVO DA INTERVENÇÃO
                                </label>
                                <textarea 
                                    value={stopReason} 
                                    onChange={e => setStopReason(e.target.value)} 
                                    className="w-full p-4 text-sm font-medium h-24 resize-none focus:outline-none uppercase bg-white print:h-auto print:overflow-hidden"
                                    placeholder="Descreva o motivo principal da parada ou intervenção..."
                                />
                            </div>

                            <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                                <label className="block text-xs font-black text-gray-700 uppercase p-3 bg-gray-100 border-b border-gray-300 flex items-center gap-2">
                                    <Wrench size={14}/> DESCRIÇÃO DAS ATIVIDADES REALIZADAS
                                </label>
                                <textarea 
                                    value={activities} 
                                    onChange={e => setActivities(e.target.value)} 
                                    className="w-full p-4 text-sm font-medium h-48 resize-none focus:outline-none uppercase bg-white print:h-auto print:overflow-hidden"
                                    placeholder="Detalhamento do serviço executado..."
                                />
                            </div>

                            <div className="border border-red-200 rounded-lg overflow-hidden border-l-4 border-l-red-500 bg-red-50/30">
                                <label className="block text-xs font-black text-red-700 uppercase p-3 bg-red-50 border-b border-red-200">
                                    PENDÊNCIAS TÉCNICAS (SE HOUVER)
                                </label>
                                <textarea 
                                    value={pendings} 
                                    onChange={e => setPendings(e.target.value)} 
                                    className="w-full p-4 text-sm font-medium h-20 resize-none text-red-800 focus:outline-none uppercase bg-transparent placeholder-red-300 print:h-auto print:overflow-hidden"
                                    placeholder="Liste se houver pendências..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ABA MANUAL (UPLOAD) --- */}
                {activeTab === 'MANUAL' && (
                    <div className="space-y-6 avoid-break">
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-blue-900 no-print">
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

                        <div className="border-2 border-dashed border-gray-400 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 text-center hover:bg-gray-100 transition-colors cursor-pointer relative min-h-[400px]">
                            <input 
                                type="file" 
                                accept="image/*,.pdf" 
                                onChange={handleFileUpload} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer no-print"
                            />
                            {manualFile ? (
                                <div className="space-y-3 w-full h-full flex flex-col items-center">
                                    <div className="w-full bg-white border border-gray-200 rounded overflow-hidden flex items-center justify-center p-2">
                                        <img src={manualFile} alt="Preview" className="max-h-[600px] w-auto object-contain" />
                                    </div>
                                    <p className="text-green-600 font-bold flex items-center justify-center gap-2 no-print">
                                        <CheckCircle size={20} /> ARQUIVO SELECIONADO (SALVO)
                                    </p>
                                    <p className="text-xs text-gray-500 no-print">Clique para alterar</p>
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
                <div className="mt-auto pt-8 border-t-2 border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase print:border-gray-300 avoid-break">
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
                            <Share2 size={24}/>
                            COMPARTILHAR TEXTO
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
