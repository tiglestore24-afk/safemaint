
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { DocumentRecord, SignatureRecord } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { Printer, Camera, Upload, FileText, PenTool, CheckCircle, Lock, Clock, Copy, Share2, Users, AlertTriangle, Wrench, Activity, MessageSquare, Briefcase } from 'lucide-react';
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
    const [actionTaken, setActionTaken] = useState(''); // O que foi realizado para sanar

    const [stopReason, setStopReason] = useState('');
    const [activities, setActivities] = useState(''); // Descrição da Atividade (Contexto)
    const [pendings, setPendings] = useState('');
    const [status, setStatus] = useState('');
    const [originalArtId, setOriginalArtId] = useState<string | undefined>(undefined);
    const [checklistId, setChecklistId] = useState<string | undefined>(undefined);
    
    // Signatures from Checklist (For visual rendering)
    const [signatures, setSignatures] = useState<SignatureRecord[]>([]);

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
            
            setExecutors(data.executors || '');
            
            // Import Signatures for visual display
            if (data.signatures) {
                setSignatures(data.signatures);
            }

            setTimeStart(data.startTime || '');
            setTimeEnd(data.endTime || '');
            setActivities(data.activities || '');
            setStopReason(data.stopReason || '');
            setStatus(data.status || 'FINALIZADO');
            setDeviation(data.deviation || '');
            setObservation(data.observation || '');
            setActionTaken(data.actionTaken || '');
            
            if (data.artId) setOriginalArtId(data.artId);
            if (data.checklistId) setChecklistId(data.checklistId);

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

    // GERAÇÃO DO TEXTO PADRÃO COMPLETO
    const generateText = () => {
        return `*RELATÓRIO TÉCNICO - SAFEMAINT*
──────────────────────
*DADOS DA ORDEM*
🆔 OM: ${om}
🏷 TAG: ${equipment}
🔧 TIPO: ${type}
📅 DATA: ${date}

*EQUIPE EXECUTANTE*
${executors}

*REGISTRO DE TEMPO*
⏰ INÍCIO (ART): ${timeStart}
🏁 TÉRMINO (CHK): ${timeEnd}
⏳ DURAÇÃO: ${duration}
📊 STATUS FINAL: ${status}

*DETALHAMENTO TÉCNICO*
📝 *DESCRIÇÃO DA ATIVIDADE:*
${activities}

🛑 *MOTIVO DA FALHA / CONTEXTO:*
${stopReason}

🛠 *O QUE FOI REALIZADO (SOLUÇÃO):*
${actionTaken}

⚠️ *PENDÊNCIAS:*
${pendings || 'NENHUMA'}
──────────────────────`;
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
                    actionTaken, // Nova info
                    pendings,
                    duration, 
                    startTime: timeStart,
                    endTime: timeEnd,
                    deviation,    
                    observation,  
                    executorsList: executors, 
                    rawText: isManual ? 'Relatório em Anexo (Manual)' : generateText(),
                    manualFileUrl: manualFile,
                    isManualUpload: isManual
                },
                signatures: signatures // Salva as assinaturas visuais
            };
            await StorageService.saveDocument(doc);
            
            // --- AUTOMAÇÃO DE ARQUIVAMENTO (LIMPEZA VISUAL) ---
            if (status === 'FINALIZADO') {
                const allDocs = StorageService.getDocuments();
                
                // 1. Arquiva ART Original
                if (originalArtId) {
                    const artDoc = allDocs.find(d => d.id === originalArtId);
                    if (artDoc) {
                        artDoc.status = 'ARQUIVADO';
                        await StorageService.saveDocument(artDoc);
                    }
                }

                // 2. Arquiva Checklist Vinculado (Se existir)
                if (checklistId) {
                    const checkDoc = allDocs.find(d => d.id === checklistId);
                    if (checkDoc) {
                        checkDoc.status = 'ARQUIVADO';
                        await StorageService.saveDocument(checkDoc);
                    }
                }
            } else if (status === 'PARCIAL' && originalArtId) {
                 // Move a ART parcial para Arquivado para limpar o painel ativo
                 const allDocs = StorageService.getDocuments();
                 const artDoc = allDocs.find(d => d.id === originalArtId);
                 if (artDoc) {
                    artDoc.status = 'ARQUIVADO';
                    await StorageService.saveDocument(artDoc);
                 }
            }
            
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
                                    <label className="block text-[8px] font-black text-blue-400 uppercase mb-1">INÍCIO (ART)</label>
                                    <input type="text" value={timeStart} readOnly className="w-full font-black text-lg text-gray-800 bg-transparent outline-none" />
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                    <label className="block text-[8px] font-black text-blue-400 uppercase mb-1">TÉRMINO (CHK)</label>
                                    <input type="text" value={timeEnd} readOnly className="w-full font-black text-lg text-gray-800 bg-transparent outline-none" />
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

                            {/* EQUIPE EXECUTANTE */}
                            <div>
                                <label className="block text-[9px] font-black text-blue-400 uppercase mb-2 flex items-center gap-1">
                                    <Users size={10}/> EQUIPE TÉCNICA (NOME - MATRÍCULA)
                                </label>
                                <textarea 
                                    rows={3} 
                                    value={executors} 
                                    readOnly // Automático do Checklist
                                    className="w-full bg-gray-100 border border-blue-200 rounded p-3 font-bold text-sm text-gray-700 outline-none resize-none uppercase" 
                                />
                            </div>
                        </div>

                        {/* 3. DETALHAMENTO TÉCNICO (MOTIVOS E ATIVIDADES) */}
                        <div className="space-y-6 flex-1 avoid-break">
                            {/* Descrição da Atividade */}
                            <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                                <label className="block text-xs font-black text-gray-700 uppercase p-3 bg-gray-100 border-b border-gray-300 flex items-center gap-2">
                                    <Wrench size={14}/> DESCRIÇÃO DA ATIVIDADE (PROBLEMA/SOLICITAÇÃO)
                                </label>
                                <textarea 
                                    value={activities} 
                                    onChange={e => setActivities(e.target.value)} 
                                    className="w-full p-4 text-sm font-medium h-24 resize-none focus:outline-none uppercase bg-white print:h-auto print:overflow-hidden"
                                    placeholder="Descrição da atividade planejada..."
                                />
                            </div>

                            {/* O que foi realizado (Solução) */}
                            <div className="border-2 border-green-300 rounded-lg overflow-hidden bg-green-50/20 shadow-sm">
                                <label className="block text-xs font-black text-green-700 uppercase p-3 bg-green-100 border-b border-green-300 flex items-center gap-2">
                                    <Briefcase size={14}/> O QUE FOI REALIZADO PARA SANAR A FALHA (SOLUÇÃO TÉCNICA)
                                </label>
                                <textarea 
                                    value={actionTaken} 
                                    onChange={e => setActionTaken(e.target.value)} 
                                    className="w-full p-4 text-sm font-bold h-32 resize-none focus:outline-none uppercase bg-white text-green-900 print:h-auto print:overflow-hidden placeholder-green-300"
                                    placeholder="Descreva detalhadamente a intervenção técnica realizada..."
                                />
                            </div>

                            {/* Pendências */}
                            <div className="border border-red-200 rounded-lg overflow-hidden border-l-4 border-l-red-500 bg-red-50/30">
                                <label className="block text-xs font-black text-red-700 uppercase p-3 bg-red-50 border-b border-red-200">
                                    PENDÊNCIAS TÉCNICAS (SE HOUVER)
                                </label>
                                <textarea 
                                    value={pendings} 
                                    onChange={e => setPendings(e.target.value)} 
                                    className="w-full p-4 text-sm font-medium h-20 resize-none text-red-800 bg-transparent focus:outline-none uppercase placeholder-red-300"
                                    placeholder="Peças pendentes, testes futuros..."
                                />
                            </div>
                        </div>

                        {/* 4. RODAPÉ DE ASSINATURAS (VISUAL) */}
                        {signatures.length > 0 && (
                            <div className="mt-8 pt-6 border-t-2 border-gray-300 avoid-break">
                                <h4 className="font-black text-[10px] uppercase mb-6 text-gray-400 tracking-widest text-center">VALIDAÇÃO TÉCNICA E ENCERRAMENTO</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 items-end justify-center">
                                    {signatures.map(sig => (
                                        <div key={sig.id} className="text-center">
                                            <div className="h-12 flex items-end justify-center mb-1">
                                                <img src={sig.signatureData} alt="Assinatura" className="max-h-full opacity-90 object-contain" />
                                            </div>
                                            <div className="border-t border-gray-400 pt-1">
                                                <p className="font-black text-[9px] uppercase text-gray-900 leading-none">{sig.name}</p>
                                                <p className="text-[7px] font-bold text-gray-500 uppercase">{sig.matricula} • {sig.function}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- ABA MANUAL --- */}
                {activeTab === 'MANUAL' && (
                    <div className="flex flex-col items-center justify-center h-full space-y-6 animate-fadeIn">
                        <div className="text-center">
                            <h2 className="text-2xl font-black text-gray-800 uppercase">ANEXAR RELATÓRIO MANUAL</h2>
                            <p className="text-xs text-gray-500 font-bold uppercase mt-1">FOTO DO RELATÓRIO EM PAPEL</p>
                        </div>

                        {manualFile ? (
                            <div className="relative w-full max-w-md aspect-[3/4] border-4 border-gray-800 rounded-xl overflow-hidden shadow-2xl group">
                                <img src={manualFile} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setManualFile(null)} className="bg-red-600 text-white px-6 py-3 rounded-full font-black text-xs uppercase flex items-center gap-2 hover:scale-105 transition-transform">
                                        REMOVER IMAGEM
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <label className="w-full max-w-md aspect-video border-4 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all group">
                                <Camera size={64} className="text-gray-300 group-hover:text-gray-500 transition-colors mb-4" />
                                <span className="font-black text-gray-400 group-hover:text-gray-600 uppercase">CLIQUE PARA FOTOGRAFAR</span>
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                            </label>
                        )}
                    </div>
                )}
            </div>

            {/* ACTION BAR */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-center gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] print:hidden z-50">
                <button onClick={() => window.print()} className="bg-gray-800 hover:bg-black text-white px-8 py-4 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg transition-all active:scale-95">
                    <Printer size={18}/> IMPRIMIR
                </button>
                <button 
                    onClick={handleSave} 
                    className="bg-vale-green hover:bg-[#00605d] text-white px-10 py-4 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg transition-all active:scale-95 border-b-4 border-[#004d4a] active:border-b-0 active:translate-y-1"
                >
                    <CheckCircle size={18}/> ARQUIVAR RELATÓRIO
                </button>
            </div>
            
            <div className="h-20 print:hidden"></div>
        </div>
    );
};
