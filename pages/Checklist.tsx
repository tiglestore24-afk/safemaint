
import React, { useState, useEffect } from 'react';
import { CommonHeader } from '../components/CommonHeader';
import { SignatureSection } from '../components/SignatureSection';
import { StorageService } from '../services/storage';
import { HeaderData, DocumentRecord, ActiveMaintenance, SignatureRecord, ChecklistTemplateItem } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { BackButton } from '../components/BackButton';

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
  
  // Checklist State
  // Usaremos string (UUID) ou number (Legacy) como chave, dependendo do que vier
  const [checks, setChecks] = useState<Record<string, { status: 'ATENDE' | 'NAO_ATENDE' | null; obs: string }>>({});

  useEffect(() => {
    // 1. Carregar cabeçalho da manutenção ativa (se houver)
    if (maintenanceId) {
        const task = StorageService.getActiveMaintenanceById(maintenanceId);
        if (task) {
            setHeader(task.header);
        }
    }

    // 2. Carregar Itens do Checklist (Template)
    const loadItems = () => {
        const items = StorageService.getChecklistTemplate();
        setChecklistItems(items);
        setIsLoading(false);
    };

    loadItems();
    
    // Opcional: ouvir atualizações caso o admin mude o template em tempo real
    window.addEventListener('safemaint_storage_update', loadItems);
    return () => window.removeEventListener('safemaint_storage_update', loadItems);
  }, [maintenanceId]);

  // Group items by section
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
        alert("ASSINATURA OBRIGATÓRIA PARA FINALIZAR O CHECKLIST.");
        return;
    }

    // SEM RASCUNHOS - SEMPRE ATIVO
    const status = 'ATIVO';
    
    // --- LÓGICA DE CÁLCULO DE TEMPO REAL ---
    let startTimeFormatted = '';
    let endTimeFormatted = new Date().toLocaleTimeString().slice(0,5); // Hora atual é a hora de fim
    let activeTask: ActiveMaintenance | undefined;

    if (maintenanceId) {
        activeTask = StorageService.getActiveMaintenanceById(maintenanceId);
        if(activeTask) {
            // Pega o horário real de quando a OM foi iniciada no sistema
            startTimeFormatted = new Date(activeTask.startTime).toLocaleTimeString().slice(0,5);
        }
    } else {
        // Fallback se não tiver ID (ex: checklist avulso)
        startTimeFormatted = new Date().toLocaleTimeString().slice(0,5);
    }

    // MAP FULL CHECKLIST CONTENT (DESCRIPTION + STATUS)
    const fullContent = checklistItems.map(item => ({
        id: item.legacyId, // Mantendo legacyId para compatibilidade visual nos relatórios antigos
        dbId: item.id,     // ID real do banco
        section: item.section,
        desc: item.description,
        status: checks[item.id]?.status || 'NAO_AVALIADO', // Usa ID string como chave do state
        obs: checks[item.id]?.obs || ''
    }));

    // Salvar Documento Checklist
    const doc: DocumentRecord = {
      id: crypto.randomUUID(),
      type: 'CHECKLIST',
      header,
      createdAt: new Date().toISOString(),
      status: status,
      content: { checklistItems: fullContent }, // Saving full array
      signatures
    };
    await StorageService.saveDocument(doc);

    // Finalizar Manutenção e Redirecionar para Relatório
    if (maintenanceId) {
        // Encerra a manutenção com status "VIA CHECKLIST" e fecha a OM
        await StorageService.completeMaintenance(maintenanceId, 'VIA CHECKLIST', true);
        
        // Preparar dados para o Relatório Unificado
        const reportData = {
            om: header.om,
            tag: header.tag,
            type: header.type,
            date: new Date().toLocaleDateString('pt-BR'),
            startTime: startTimeFormatted, // Início Real da Atividade
            endTime: endTimeFormatted,     // Fim Real da Atividade
            executors: signatures.map(s => s.name), // Nomes extraídos das assinaturas
            activities: header.description,
            status: 'FINALIZADO',
            stopReason: 'MANUTENÇÃO CONCLUÍDA',
            pendings: '' // Usuário preencherá na próxima tela
        };

        alert('TEMPO PARADO. MANUTENÇÃO FINALIZADA. INDO PARA RELATÓRIO.');
        // Navega para o relatório passando os dados
        navigate('/report', { state: reportData });

    } else {
        navigate('/archive');
    }
  };

  if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen text-vale-green">
              <Loader2 size={48} className="animate-spin mb-4" />
              <p className="font-bold uppercase tracking-widest">Carregando Checklist...</p>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6 border-b pb-4">
        <BackButton className="mr-2" />
        <div className="bg-vale-green p-2 rounded-lg text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </div>
        <h2 className="text-2xl font-black text-vale-darkgray">
            CHECKLIST PÓS MANUTENÇÃO
        </h2>
      </div>
      
      {maintenanceId && (
        <div className="bg-green-100 border-l-4 border-vale-green text-green-700 p-4 mb-6 rounded-r shadow-sm" role="alert">
            <p className="font-bold text-lg">FINALIZANDO ATIVIDADE</p>
            <p className="font-bold">O TEMPO SERÁ PARADO AO CONCLUIR.</p>
        </div>
      )}

      <CommonHeader data={header} onChange={setHeader} readOnly={!!maintenanceId} />

      <div className="bg-white rounded-lg shadow-md border-2 border-gray-100 mb-6 overflow-hidden">
        {Object.entries(groupedItems).map(([section, items]: [string, ChecklistTemplateItem[]]) => (
            <div key={section}>
                <div className="bg-vale-dark px-4 py-2 border-y border-gray-700">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">{section}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 hidden md:table-header-group">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-black text-gray-600 uppercase w-12">#</th>
                                <th className="px-4 py-2 text-left text-xs font-black text-gray-600 uppercase">DESCRIÇÃO</th>
                                <th className="px-4 py-2 text-center text-xs font-black text-gray-600 uppercase w-36">STATUS</th>
                                <th className="px-4 py-2 text-left text-xs font-black text-gray-600 uppercase">OBSERVAÇÃO</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {items.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-sm text-gray-900 font-bold w-12">{item.legacyId}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700 font-bold">
                                        {item.description}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex justify-center gap-1">
                                            <button 
                                                onClick={() => handleStatus(item.id, 'ATENDE')}
                                                className={`px-3 py-1 text-xs font-black rounded transition-colors ${checks[item.id]?.status === 'ATENDE' ? 'bg-vale-green text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                            >SIM</button>
                                            <button 
                                                onClick={() => handleStatus(item.id, 'NAO_ATENDE')}
                                                className={`px-3 py-1 text-xs font-black rounded transition-colors ${checks[item.id]?.status === 'NAO_ATENDE' ? 'bg-red-500 text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                            >NÃO</button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input 
                                            type="text" 
                                            className="w-full border-gray-300 rounded text-sm p-1.5 border-2 focus:ring-vale-green focus:border-vale-green font-bold"
                                            placeholder="OBS..."
                                            value={checks[item.id]?.obs || ''}
                                            onChange={(e) => handleObs(item.id, e.target.value)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        ))}
      </div>

       <SignatureSection signatures={signatures} onUpdate={setSignatures} />

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <button 
            onClick={handleSave}
            className="bg-vale-green hover:bg-[#00605d] text-white px-8 py-4 rounded-full shadow-xl font-black flex items-center justify-center gap-3 transform transition hover:scale-105 border-4 border-white"
        >
            <CheckCircle size={20} />
            CONCLUIR CHECKLIST
        </button>
      </div>
    </div>
  );
};
