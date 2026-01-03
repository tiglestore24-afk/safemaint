
import React, { useState, useEffect } from 'react';
import { CommonHeader } from '../components/CommonHeader';
import { SignatureSection } from '../components/SignatureSection';
import { StorageService } from '../services/storage';
import { HeaderData, DocumentRecord, ActiveMaintenance, SignatureRecord, ChecklistTemplateItem } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { FeedbackModal } from '../components/FeedbackModal'; // Importado

export const Checklist: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const maintenanceId = searchParams.get('maintenanceId');

  const [header, setHeader] = useState<HeaderData>({
    om: '', tag: '', date: new Date().toISOString().split('T')[0], time: '', type: 'MECANICA', description: ''
  });

  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistTemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checks, setChecks] = useState<Record<string, { status: 'ATENDE' | 'NAO_ATENDE' | null; obs: string }>>({});

  // Feedback States
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (maintenanceId) {
        const task = StorageService.getActiveMaintenanceById(maintenanceId);
        if (task) setHeader(task.header);
    }

    const loadItems = () => {
        const items = StorageService.getChecklistTemplate();
        setChecklistItems(items);
        setIsLoading(false);
    };

    loadItems();
    window.addEventListener('safemaint_storage_update', loadItems);
    return () => window.removeEventListener('safemaint_storage_update', loadItems);
  }, [maintenanceId]);

  const groupedItems = checklistItems.reduce((acc, item) => {
    (acc[item.section] = acc[item.section] || []).push(item);
    return acc;
  }, {} as Record<string, ChecklistTemplateItem[]>);

  const handleStatus = (id: string, status: 'ATENDE' | 'NAO_ATENDE') => {
    setChecks(prev => ({ ...prev, [id]: { ...(prev[id] || { obs: '' }), status } }));
  };

  const handleObs = (id: string, obs: string) => {
    setChecks(prev => ({ ...prev, [id]: { ...(prev[id] || { status: null }), obs } }));
  };

  const handleSave = async () => {
    if (signatures.length === 0) {
        alert("ASSINATURA OBRIGATÓRIA PARA FINALIZAR.");
        return;
    }

    setIsProcessing(true);

    try {
        await new Promise(r => setTimeout(r, 1000)); // Delay para feedback visual

        let startTimeFormatted = '';
        let endTimeFormatted = new Date().toLocaleTimeString().slice(0,5);

        if (maintenanceId) {
            const activeTask = StorageService.getActiveMaintenanceById(maintenanceId);
            if(activeTask) startTimeFormatted = new Date(activeTask.startTime).toLocaleTimeString().slice(0,5);
        } else {
            startTimeFormatted = new Date().toLocaleTimeString().slice(0,5);
        }

        const fullContent = checklistItems.map(item => ({
            id: item.legacyId,
            section: item.section,
            desc: item.description,
            status: checks[item.id]?.status || 'NAO_AVALIADO',
            obs: checks[item.id]?.obs || ''
        }));

        const doc: DocumentRecord = {
          id: crypto.randomUUID(),
          type: 'CHECKLIST',
          header,
          createdAt: new Date().toISOString(),
          status: 'ATIVO',
          content: { checklistItems: fullContent },
          signatures
        };
        await StorageService.saveDocument(doc);

        setIsProcessing(false);
        setIsSuccess(true);

        setTimeout(async () => {
            setIsSuccess(false);
            if (maintenanceId) {
                await StorageService.completeMaintenance(maintenanceId, 'CONCLUÍDO VIA CHECKLIST', true);
                const reportData = {
                    om: header.om, tag: header.tag, type: header.type,
                    date: new Date().toLocaleDateString('pt-BR'),
                    startTime: startTimeFormatted, endTime: endTimeFormatted,
                    executors: signatures.map(s => s.name), activities: header.description,
                    status: 'FINALIZADO', stopReason: 'CONFORMIDADE TÉCNICA'
                };
                navigate('/report', { state: reportData });
            } else {
                navigate('/archive');
            }
        }, 1500);

    } catch (e) {
        setIsProcessing(false);
        alert('Erro ao salvar checklist.');
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    // Largura aumentada para MAX-W-5XL para dar mais espaço ao CommonHeader
    <div className="max-w-5xl mx-auto pb-24 px-4">
      <FeedbackModal 
        isOpen={isProcessing || isSuccess} 
        isSuccess={isSuccess} 
        loadingText="PROCESSANDO INSPEÇÃO..." 
        successText="CHECKLIST SALVO COM SUCESSO!"
      />

      <div className="flex items-center gap-3 mb-6 border-b pb-4">
        <BackButton />
        <h2 className="text-2xl font-black text-vale-darkgray uppercase tracking-tighter">Checklist de Campo</h2>
      </div>
      
      <CommonHeader data={header} onChange={setHeader} readOnly={!!maintenanceId} />

      <div className="space-y-6">
        {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section} className="bg-white rounded-3xl shadow-lg border overflow-hidden">
                <div className="bg-vale-dark px-6 py-3 border-b border-vale-green">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">{section}</h3>
                </div>
                <div className="divide-y divide-gray-100">
                    {(items as ChecklistTemplateItem[]).map(item => (
                        <div key={item.id} className="p-4 flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex-1">
                                <p className="text-xs font-black text-gray-400 mb-1">ITEM {item.legacyId}</p>
                                <p className="text-sm font-bold text-gray-700 leading-tight uppercase">{item.description}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button onClick={() => handleStatus(item.id, 'ATENDE')} className={`px-4 py-2 rounded-xl font-black text-[10px] transition-all ${checks[item.id]?.status === 'ATENDE' ? 'bg-vale-green text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>CONFORME</button>
                                <button onClick={() => handleStatus(item.id, 'NAO_ATENDE')} className={`px-4 py-2 rounded-xl font-black text-[10px] transition-all ${checks[item.id]?.status === 'NAO_ATENDE' ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>FALHA</button>
                            </div>
                            <input 
                                placeholder="OBSERVAÇÕES..."
                                className="w-full md:w-48 bg-gray-50 border p-2 rounded-xl text-[10px] font-bold uppercase focus:border-vale-green outline-none"
                                value={checks[item.id]?.obs || ''}
                                onChange={(e) => handleObs(item.id, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        ))}
      </div>

      <div className="mt-8">
        <SignatureSection signatures={signatures} onUpdate={setSignatures} />
      </div>

      <div className="fixed bottom-6 right-6">
        <button onClick={handleSave} className="bg-vale-green text-white px-10 py-4 rounded-full shadow-2xl font-black flex items-center gap-3 border-4 border-white transform transition hover:scale-105 active:scale-95 uppercase">
            <CheckCircle size={20} /> Concluir Inspeção
        </button>
      </div>
    </div>
  );
};
