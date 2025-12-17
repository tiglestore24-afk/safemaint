
import React, { useState, useEffect } from 'react';
import { CommonHeader } from '../components/CommonHeader';
import { SignatureSection } from '../components/SignatureSection';
import { StorageService } from '../services/storage';
import { HeaderData, DocumentRecord, ActiveMaintenance, SignatureRecord } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowLeft } from 'lucide-react';

export const Checklist: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const maintenanceId = searchParams.get('maintenanceId');

  const [header, setHeader] = useState<HeaderData>({
    om: '', tag: '', date: new Date().toISOString().split('T')[0], time: '', type: 'MECANICA', description: ''
  });

  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  
  // Checklist State
  const [checks, setChecks] = useState<Record<number, { status: 'ATENDE' | 'NAO_ATENDE' | null; obs: string }>>({});

  useEffect(() => {
    if (maintenanceId) {
        const task = StorageService.getActiveMaintenanceById(maintenanceId);
        if (task) {
            setHeader(task.header); // Load header from the active task
        }
    }
  }, [maintenanceId]);

  const checklistItems = [
    { id: 1, section: "MOTOR", desc: "Vazamento de óleo em geral e próximo a partes quentes" },
    { id: 2, section: "MOTOR", desc: "Vazamento líquido de arrefecimento" },
    { id: 3, section: "MOTOR", desc: "Interferências entre tubos, mangueiras e cabos" },
    { id: 4, section: "MOTOR", desc: "Nível de óleo" },
    { id: 5, section: "SISTEMA HIDRÁULICO", desc: "Vazamento do óleo" },
    { id: 6, section: "SISTEMA HIDRÁULICO", desc: "Nível de óleo" },
    { id: 7, section: "SISTEMA HIDRÁULICO", desc: "Abraçadeiras de fixação" },
    { id: 8, section: "SISTEMA HIDRÁULICO", desc: "Interferências entre tubos, mangueiras e cabos" },
    { id: 9, section: "TRANSMISSÃO", desc: "Vazamento do óleo" },
    { id: 10, section: "TRANSMISSÃO", desc: "Parafusos folgados" },
    { id: 11, section: "TRANSMISSÃO", desc: "Abraçadeiras de fixação" },
    { id: 12, section: "TRANSMISSÃO", desc: "Interferências entre tubos, mangueiras e cabos" },
    { id: 13, section: "TRANSMISSÃO", desc: "Proteção do cardan" },
    { id: 14, section: "DIFERENCIAL", desc: "Bujão de dreno do diferencial (Fixação)" },
    { id: 15, section: "COMANDO FINAL", desc: "Bujão de dreno e inspeção comando direito (Fixação)" },
    { id: 16, section: "COMANDO FINAL", desc: "Bujão de dreno e inspeção comando esquerdo (Fixação)" },
    { id: 17, section: "CONVERSOR", desc: "Nível de óleo do conversor e transmissão" },
    { id: 18, section: "SISTEMA DE DIREÇÃO", desc: "Vazamento de óleo" },
    { id: 19, section: "SISTEMA DE DIREÇÃO", desc: "Nível de óleo" },
    { id: 20, section: "SISTEMA DE DIREÇÃO", desc: "Parafusos/pinos folgados" },
    { id: 21, section: "SISTEMA DE DIREÇÃO", desc: "Abraçadeiras de fixação" },
    { id: 22, section: "SISTEMA DE DIREÇÃO", desc: "Interferências entre tubos, mangueiras e cabos" },
    { id: 23, section: "ILUMINAÇÃO, AR CONDICIONADO", desc: "Farol de Alta e Baixa" },
    { id: 24, section: "ILUMINAÇÃO, AR CONDICIONADO", desc: "Setas" },
    { id: 25, section: "ILUMINAÇÃO, AR CONDICIONADO", desc: "Buzina" },
    { id: 26, section: "ILUMINAÇÃO, AR CONDICIONADO", desc: "Ar Condicionado" },
    { id: 27, section: "ESCADAS, CORRIMÃO, GUARDA CORPO", desc: "Escadas (Principal e de emergência)" },
    { id: 28, section: "ESCADAS, CORRIMÃO, GUARDA CORPO", desc: "Guarda Corpo (Plataforma)" },
    { id: 29, section: "ESCADAS, CORRIMÃO, GUARDA CORPO", desc: "Tag's laterais e traseiro" },
    { id: 30, section: "ESCADAS, CORRIMÃO, GUARDA CORPO", desc: "Corrimão das Escadas" },
    { id: 31, section: "CONDIÇÕES DE LIMPEZA E ORGANIZAÇÃO", desc: "Cabine" },
    { id: 32, section: "CONDIÇÕES DE LIMPEZA E ORGANIZAÇÃO", desc: "Plataforma" },
    { id: 33, section: "CONDIÇÕES DE LIMPEZA E ORGANIZAÇÃO", desc: "Escadas e Corrimões" },
    { id: 34, section: "CONDIÇÕES DE LIMPEZA E ORGANIZAÇÃO", desc: "Retrovisores" }
  ];

  // Group items by section
  const groupedItems = checklistItems.reduce((acc, item) => {
    (acc[item.section] = acc[item.section] || []).push(item);
    return acc;
  }, {} as Record<string, typeof checklistItems>);

  const handleStatus = (id: number, status: 'ATENDE' | 'NAO_ATENDE') => {
    setChecks(prev => ({ ...prev, [id]: { ...(prev[id] || { obs: '' }), status } }));
  };

  const handleObs = (id: number, obs: string) => {
    setChecks(prev => ({ ...prev, [id]: { ...(prev[id] || { status: null }), obs } }));
  };

  const handleSave = () => {
    if (signatures.length === 0) {
        alert("ASSINATURA OBRIGATÓRIA PARA FINALIZAR O CHECKLIST.");
        return;
    }

    const isComplete = signatures.length > 0;
    const status = isComplete ? 'ATIVO' : 'RASCUNHO';
    
    let startTimeFormatted = '';
    
    if (maintenanceId) {
        const activeTask = StorageService.getActiveMaintenanceById(maintenanceId);
        if(activeTask) {
            startTimeFormatted = new Date(activeTask.startTime).toLocaleTimeString().slice(0,5);
        }
    }

    // MAP FULL CHECKLIST CONTENT (DESCRIPTION + STATUS)
    // This allows Archive.tsx to render it correctly later
    const fullContent = checklistItems.map(item => ({
        id: item.id,
        section: item.section,
        desc: item.desc,
        status: checks[item.id]?.status || 'NAO_AVALIADO',
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
    StorageService.saveDocument(doc);

    // Finalizar Manutenção e Redirecionar para Relatório
    if (maintenanceId && status === 'ATIVO') {
        // Encerra a manutenção pois o checklist finaliza o fluxo operacional
        StorageService.completeMaintenance(maintenanceId, 'FINALIZADO');
        
        // Preparar dados para o Relatório Unificado
        const reportData = {
            om: header.om,
            tag: header.tag,
            type: header.type,
            date: new Date().toLocaleDateString('pt-BR'),
            startTime: startTimeFormatted,
            endTime: new Date().toLocaleTimeString().slice(0,5),
            executors: signatures.map(s => s.name), // Pega nomes das assinaturas
            activities: header.description,
            status: 'FINALIZADO',
            stopReason: 'MANUTENÇÃO CONCLUÍDA',
            pendings: '' // Usuário preencherá na próxima tela
        };

        alert('TEMPO PARADO. MANUTENÇÃO FINALIZADA. INDO PARA RELATÓRIO.');
        // Navega para o relatório passando os dados
        navigate('/report', { state: reportData });

    } else if (status === 'RASCUNHO') {
        alert('CHECKLIST SALVO COMO RASCUNHO (PENDENTE ASSINATURAS).');
        navigate('/archive');
    } else {
        navigate('/archive');
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6 border-b pb-4">
        <button onClick={() => navigate(-1)} className="mr-2 p-2 rounded-full hover:bg-gray-200">
            <ArrowLeft size={24} />
        </button>
        <div className="bg-green-600 p-2 rounded-lg text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </div>
        <h2 className="text-2xl font-black text-gray-800">
            CHECKLIST PÓS MANUTENÇÃO
        </h2>
      </div>
      
      {maintenanceId && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-r shadow-sm" role="alert">
            <p className="font-bold text-lg">FINALIZANDO ATIVIDADE</p>
            <p className="font-bold">O TEMPO SERÁ PARADO AO CONCLUIR.</p>
        </div>
      )}

      <CommonHeader data={header} onChange={setHeader} readOnly={!!maintenanceId} />

      <div className="bg-white rounded-lg shadow-md border-2 border-gray-100 mb-6 overflow-hidden">
        {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section}>
                <div className="bg-gray-200 px-4 py-2 border-y border-gray-300">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">{section}</h3>
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
                                    <td className="px-4 py-3 text-sm text-gray-900 font-bold w-12">{item.id}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700 font-bold">
                                        {item.desc}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex justify-center gap-1">
                                            <button 
                                                onClick={() => handleStatus(item.id, 'ATENDE')}
                                                className={`px-3 py-1 text-xs font-black rounded transition-colors ${checks[item.id]?.status === 'ATENDE' ? 'bg-green-500 text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
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
                                            className="w-full border-gray-300 rounded text-sm p-1.5 border-2 focus:ring-green-500 focus:border-green-500 font-bold"
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
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full shadow-xl font-black flex items-center justify-center gap-3 transform transition hover:scale-105 border-4 border-white"
        >
            <CheckCircle size={20} />
            CONCLUIR CHECKLIST
        </button>
      </div>
    </div>
  );
};
