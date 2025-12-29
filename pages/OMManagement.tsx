
import React, { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/storage';
import { OMRecord, ScheduleItem } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  FileInput, PlayCircle, Trash2, Search, CalendarDays, User,
  Wrench, AlertOctagon, Clock, CheckCircle2, Eye, X, Info, FileText, Download
} from 'lucide-react';
import { BackButton } from '../components/BackButton';

export const OMManagement: React.FC = () => {
  const navigate = useNavigate();
  const [oms, setOms] = useState<OMRecord[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [activeTab, setActiveTab] = useState<'PENDENTE' | 'CONCLUIDA' | 'TODAS'>('PENDENTE');
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [viewingOM, setViewingOM] = useState<OMRecord | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  
  const refreshData = useCallback(() => {
    setIsSyncing(true);
    const allOms = StorageService.getOMs();
    setOms(allOms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setScheduleItems(StorageService.getSchedule());
    setIsSyncing(false);
  }, []);

  useEffect(() => {
    refreshData();
    window.addEventListener('safemaint_storage_update', refreshData);
    return () => window.removeEventListener('safemaint_storage_update', refreshData);
  }, [refreshData]);

  useEffect(() => {
    if (viewingOM?.pdfUrl) {
        try {
            if (viewingOM.pdfUrl.startsWith('data:application/pdf;base64,')) {
                const byteCharacters = atob(viewingOM.pdfUrl.split(',')[1]);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                setPdfBlobUrl(url);
                return () => URL.revokeObjectURL(url);
            } else {
                setPdfBlobUrl(viewingOM.pdfUrl);
            }
        } catch (e) {
            console.error("Erro conversão PDF:", e);
            setPdfBlobUrl(viewingOM.pdfUrl);
        }
    } else {
        setPdfBlobUrl(null);
    }
  }, [viewingOM]);

  const handleExecute = (om: OMRecord) => {
    if (om.status === 'CONCLUIDA') return;
    const route = om.type === 'CORRETIVA' ? '/art-emergencial' : '/art-atividade';
    navigate(route, { state: { omId: om.id, om: om.omNumber, tag: om.tag, description: om.description, type: om.type } });
  };

  const filteredOms = oms.filter(o => {
      let tabMatch = true;
      if (activeTab === 'PENDENTE') tabMatch = o.status !== 'CONCLUIDA';
      if (activeTab === 'CONCLUIDA') tabMatch = o.status === 'CONCLUIDA';
      const searchMatch = searchQuery === '' || o.omNumber.includes(searchQuery) || o.tag.includes(searchQuery.toUpperCase());
      return tabMatch && searchMatch;
  });

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-fadeIn pb-20 relative px-4">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b-2 border-vale-green pb-4">
        <div className="flex items-center gap-3">
            <BackButton />
            <div>
                <h2 className="text-2xl font-black text-vale-darkgray flex items-center gap-2 uppercase tracking-tighter">
                    <div className="bg-vale-green text-white p-1.5 rounded-lg shadow"><FileInput size={20} /></div>
                    Gestão de Ordens
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Fila de espera para execução</p>
            </div>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl shadow border border-gray-100 flex flex-col xl:flex-row gap-3 justify-between items-center sticky top-2 z-30">
          <div className="flex bg-gray-100 p-1 rounded-lg w-full xl:w-auto">
              <button onClick={() => setActiveTab('PENDENTE')} className={`flex-1 xl:flex-none px-6 py-2 rounded-md font-black text-[10px] uppercase transition-all flex items-center gap-2 ${activeTab === 'PENDENTE' ? 'bg-vale-green text-white shadow-sm' : 'text-gray-500'}`}><Clock size={14} /> Pendentes ({oms.filter(o => o.status !== 'CONCLUIDA').length})</button>
              <button onClick={() => setActiveTab('CONCLUIDA')} className={`flex-1 xl:flex-none px-6 py-2 rounded-md font-black text-[10px] uppercase transition-all flex items-center gap-2 ${activeTab === 'CONCLUIDA' ? 'bg-vale-green text-white shadow-sm' : 'text-gray-500'}`}><CheckCircle2 size={14} /> Finalizadas</button>
          </div>
          <div className="flex-1 relative group w-full xl:max-w-md">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input type="text" placeholder="BUSCAR POR OM OU TAG..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value.toUpperCase())} className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-transparent focus:bg-white focus:border-vale-green rounded-xl text-xs font-bold uppercase outline-none transition-all" />
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOms.map((om) => (
            <div key={om.id} className={`relative rounded-xl p-4 shadow border transition-all duration-300 hover:-translate-y-0.5 border-gray-100 border-l-[6px] ${om.type === 'CORRETIVA' ? 'border-l-red-500' : 'border-l-vale-blue'} ${om.status === 'EM_ANDAMENTO' ? 'bg-green-50/30 ring-2 ring-green-50' : 'bg-white'}`}>
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border mb-2 ${om.type === 'CORRETIVA' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{om.type === 'CORRETIVA' ? <AlertOctagon size={10}/> : <Wrench size={10}/>} {om.type}</span>
                        <h3 className="text-xl font-black text-vale-blue leading-none tracking-tight">{om.omNumber}</h3>
                        <p className="text-sm font-black text-vale-green mt-0.5 uppercase">{om.tag}</p>
                    </div>
                    {om.pdfUrl && (
                        <button onClick={() => setViewingOM(om)} className="bg-gray-100 text-gray-500 p-2 rounded-lg hover:bg-vale-green hover:text-white transition-all shadow-sm" title="Visualizar PDF"><Eye size={18}/></button>
                    )}
                </div>
                <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-100"><p className="text-[10px] font-bold text-slate-600 uppercase leading-relaxed line-clamp-3">{om.description}</p></div>
                <div className="flex items-center gap-3 text-[9px] font-black text-gray-400 uppercase mb-4">
                    <span className="flex items-center gap-1"><CalendarDays size={12}/> {new Date(om.createdAt).toLocaleDateString()}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span className="flex items-center gap-1"><User size={12}/> {om.createdBy}</span>
                </div>
                <div className="flex gap-2">
                    {om.status === 'CONCLUIDA' ? (
                        <button disabled className="flex-1 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest bg-gray-100 text-gray-400 cursor-not-allowed">ENCERRADA</button>
                    ) : (
                        <button onClick={() => handleExecute(om)} className={`flex-1 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow active:scale-95 transition-all border-b-2 ${om.type === 'CORRETIVA' ? 'bg-red-600 text-white border-red-800' : 'bg-vale-green text-white border-[#00605d]'}`}><PlayCircle size={14}/> {om.status === 'EM_ANDAMENTO' ? 'CONTINUAR' : 'INICIAR'}</button>
                    )}
                    <button onClick={() => { if(window.confirm('Excluir?')) StorageService.deleteOM(om.id).then(refreshData) }} className="px-3 bg-slate-100 text-slate-400 rounded-lg hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={16}/></button>
                </div>
            </div>
          ))}
      </div>

      {viewingOM && (
        <div className="fixed inset-0 z-[100] bg-[#000000]/95 flex items-center justify-center p-0 backdrop-blur-xl animate-fadeIn">
            <div className="w-full h-full flex flex-col relative">
                <div className="bg-gray-900 text-white p-3 flex justify-between items-center shadow-2xl border-b border-gray-800 shrink-0 z-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-vale-green p-1.5 rounded"><FileText size={18}/></div>
                        <div>
                            <h3 className="font-black text-sm tracking-tight uppercase text-gray-100">Visualização de OM</h3>
                            <p className="text-[9px] font-bold text-vale-green tracking-widest uppercase">OM: {viewingOM.omNumber}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setViewingOM(null)} className="p-2 bg-gray-800 hover:bg-red-600 text-white rounded-full transition-all shadow-inner"><X size={18}/></button>
                    </div>
                </div>

                <div className="flex-1 bg-[#1a1a1a] relative overflow-hidden flex items-center justify-center p-0">
                    {pdfBlobUrl ? (
                        <div className="w-full h-full bg-white relative">
                             <iframe
                                src={pdfBlobUrl}
                                className="w-full h-full border-none"
                                title="Visualizador OM"
                            />
                        </div>
                    ) : (
                        <div className="text-center p-10 max-w-lg">
                            <Info size={48} className="text-gray-600 mx-auto mb-4" />
                            <h4 className="text-xl font-black text-gray-400 uppercase tracking-widest">Documento Não Digitalizado</h4>
                            <p className="text-gray-500 font-bold mt-2 text-xs">Esta ordem foi aberta sem anexo PDF.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
