import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storage';
import { OMRecord, ScheduleItem } from '../types';
import { useNavigate } from 'react-router-dom';
import { FileInput, FileText, AlertTriangle, PlayCircle, Trash2, CheckCircle, Calendar, Wifi, Bell, Loader2, Eye, Link as LinkIcon, X, Search, Filter, Eraser, CalendarDays } from 'lucide-react';

export const OMManagement: React.FC = () => {
  const navigate = useNavigate();
  const [oms, setOms] = useState<OMRecord[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [activeTab, setActiveTab] = useState<'PENDENTE' | 'CONCLUIDA'>('PENDENTE');
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewPdf, setViewPdf] = useState<OMRecord | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'info'} | null>(null);
  const prevOmsLength = useRef(0);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CORRETIVA' | 'PREVENTIVA'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA'>('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Check role for delete permission
  const userRole = localStorage.getItem('safemaint_role');

  useEffect(() => {
    refreshData();
    window.addEventListener('safemaint_storage_update', handleStorageUpdate);
    return () => window.removeEventListener('safemaint_storage_update', handleStorageUpdate);
  }, []);

  const handleStorageUpdate = () => {
      setIsSyncing(true);
      setTimeout(() => {
          refreshData();
          setIsSyncing(false);
      }, 500); 
  };

  const refreshData = () => {
    const allOms = StorageService.getOMs();
    const currentSchedule = StorageService.getSchedule();
    const sorted = allOms.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setOms(sorted);
    setSchedule(currentSchedule);

    if (sorted.length > prevOmsLength.current && prevOmsLength.current !== 0) {
        showToast("NOVA ORDEM DE MANUTENÇÃO RECEBIDA!", 'info');
    }
    prevOmsLength.current = sorted.length;
  };

  const showToast = (msg: string, type: 'success' | 'info') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 4000);
  };

  const handleDelete = (id: string) => {
      if(userRole !== 'ADMIN') {
          alert("APENAS ADMINISTRADORES PODEM EXCLUIR OMs.");
          return;
      }
      if(window.confirm("Remover esta OM da lista?")) {
          StorageService.deleteOM(id);
      }
  };

  const handleExecute = (om: OMRecord) => {
      if (om.type === 'CORRETIVA') {
          navigate('/art-emergencial', { state: { om: om.omNumber, tag: om.tag, description: om.description } });
      } else {
          navigate('/art-atividade', { state: { om: om.omNumber, tag: om.tag, description: om.description } });
      }
  };

  const clearFilters = () => {
      setSearchQuery('');
      setTypeFilter('ALL');
      setStatusFilter('ALL');
      setDateFilter('');
  };

  const getLinkedScheduleItem = (om: OMRecord): ScheduleItem | undefined => {
      if (om.type !== 'PREVENTIVA') return undefined;
      return schedule.find(item => item.frotaOm.includes(om.omNumber));
  };

  const filteredOms = oms.filter(o => {
      // High level Tab Filter
      const tabMatch = activeTab === 'PENDENTE' ? o.status !== 'CONCLUIDA' : o.status === 'CONCLUIDA';
      if (!tabMatch) return false;

      // Granular Filters
      const searchMatch = searchQuery === '' || 
          o.omNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.description.toLowerCase().includes(searchQuery.toLowerCase());
      if (!searchMatch) return false;

      const typeMatch = typeFilter === 'ALL' || o.type === typeFilter;
      if (!typeMatch) return false;

      const statusMatch = statusFilter === 'ALL' || o.status === statusFilter;
      if (!statusMatch) return false;

      if (dateFilter) {
          const omDate = new Date(o.createdAt).toISOString().split('T')[0];
          if (omDate !== dateFilter) return false;
      }

      return true;
  });

  return (
    <div className="max-w-7xl mx-auto pb-20 relative">
      
      {toast && (
          <div className="fixed top-20 right-4 z-[60] animate-bounce-in">
              <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl border-l-8 text-white ${toast.type === 'success' ? 'bg-gray-900 border-green-500' : 'bg-blue-900 border-blue-400'}`}>
                  <Bell className="animate-swing" size={24} />
                  <div>
                      <h4 className="font-black text-sm uppercase">{toast.type === 'success' ? 'SUCESSO' : 'NOVA ATIVIDADE'}</h4>
                      <p className="text-xs font-bold">{toast.msg}</p>
                  </div>
              </div>
          </div>
      )}

      <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
        <div>
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                <FileInput className="text-[#10b981]" size={28} />
                MENU DE OMs
                {isSyncing && <Loader2 size={18} className="animate-spin text-gray-400" />}
            </h2>
            <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-gray-400 uppercase">Tarefas Disponíveis para Execução</p>
                <span className="text-[10px] bg-green-100 text-green-700 px-2 rounded-full font-black flex items-center gap-1">
                    <Wifi size={10} /> SYNC
                </span>
            </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex gap-4 bg-gray-100 p-1 rounded-lg w-fit shrink-0">
              <button 
                onClick={() => setActiveTab('PENDENTE')}
                className={`px-6 py-2 rounded-md font-black text-sm uppercase transition-all ${activeTab === 'PENDENTE' ? 'bg-white text-[#10b981] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  PENDENTES ({oms.filter(o => o.status !== 'CONCLUIDA').length})
              </button>
              <button 
                onClick={() => setActiveTab('CONCLUIDA')}
                className={`px-6 py-2 rounded-md font-black text-sm uppercase transition-all ${activeTab === 'CONCLUIDA' ? 'bg-white text-[#10b981] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  HISTÓRICO
              </button>
          </div>

          {/* GRANULAR FILTERS BAR */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
              <div className="relative group">
                  <Search className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-[#10b981]" size={16} />
                  <input 
                      type="text" 
                      placeholder="OM, TAG, DESC..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs font-bold uppercase focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] outline-none"
                  />
              </div>

              <div className="relative group">
                  <Filter className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <select 
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as any)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs font-bold uppercase focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] outline-none appearance-none"
                  >
                      <option value="ALL">TODOS TIPOS</option>
                      <option value="CORRETIVA">CORRETIVA</option>
                      <option value="PREVENTIVA">PREVENTIVA</option>
                  </select>
              </div>

              <div className="relative group">
                  <CheckCircle className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs font-bold uppercase focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] outline-none appearance-none"
                  >
                      <option value="ALL">TODOS STATUS</option>
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="EM_ANDAMENTO">EM ANDAMENTO</option>
                      <option value="CONCLUIDA">CONCLUÍDA</option>
                  </select>
              </div>

              <div className="relative group">
                  <CalendarDays className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input 
                      type="date" 
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs font-bold uppercase focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] outline-none"
                  />
              </div>

              <button 
                  onClick={clearFilters}
                  className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded text-xs font-black transition-colors border border-gray-200"
              >
                  <Eraser size={16} />
                  LIMPAR
              </button>
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-fadeIn">
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">TIPO</th>
                          <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">OM / TAG</th>
                          <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">DESCRIÇÃO</th>
                          <th className="px-6 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">VÍNCULO</th>
                          <th className="px-6 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">AÇÕES</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {filteredOms.length === 0 && (
                          <tr>
                              <td colSpan={5} className="px-6 py-10 text-center text-gray-400 font-bold italic">
                                  NENHUMA OM ENCONTRADA COM OS FILTROS APLICADOS.
                              </td>
                          </tr>
                      )}
                      {filteredOms.map(om => {
                          const linkedSchedule = getLinkedScheduleItem(om);
                          const isLinked = !!linkedSchedule;

                          return (
                              <tr key={om.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-black rounded-full ${
                                          om.type === 'CORRETIVA' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                      }`}>
                                          {om.type}
                                      </span>
                                      <div className="text-[10px] text-gray-400 font-bold mt-1">
                                          {new Date(om.createdAt).toLocaleDateString()}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-black text-gray-900">{om.omNumber}</div>
                                      <div className="text-xs text-gray-500 font-bold">{om.tag}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="text-xs font-bold text-gray-600 line-clamp-2 uppercase" title={om.description}>
                                          {om.description}
                                      </div>
                                      <div className="text-[10px] text-gray-400 mt-1 font-mono">
                                          POR: {om.createdBy} | STATUS: {om.status}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      {isLinked ? (
                                          <div className="inline-flex flex-col items-center">
                                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-black flex items-center gap-1 border border-green-200">
                                                  <LinkIcon size={10} /> VINCULADO
                                              </span>
                                              <span className="text-[9px] text-gray-500 font-bold mt-0.5">PROG: {linkedSchedule.dateStart}</span>
                                          </div>
                                      ) : (
                                          <span className="text-[10px] text-gray-400 font-bold">-</span>
                                      )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                      <div className="flex items-center justify-center gap-2">
                                          <button 
                                              onClick={() => setViewPdf(om)}
                                              className="text-gray-500 hover:text-[#10b981] p-2 hover:bg-green-50 rounded-full transition-colors"
                                              title="VER DOCUMENTO (PDF)"
                                          >
                                              <Eye size={18} />
                                          </button>
                                          
                                          <button 
                                              onClick={() => handleExecute(om)}
                                              className={`p-2 rounded-full text-white shadow-sm transition-transform active:scale-95 ${om.type === 'CORRETIVA' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                              title="EXECUTAR MANUTENÇÃO"
                                          >
                                              <PlayCircle size={18} />
                                          </button>

                                          {userRole === 'ADMIN' && (
                                              <button 
                                                  onClick={() => handleDelete(om.id)}
                                                  className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"
                                                  title="EXCLUIR"
                                              >
                                                  <Trash2 size={18} />
                                              </button>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>

      {/* PDF VIEWER MODAL */}
      {viewPdf && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-[70] flex items-center justify-center p-2 md:p-6 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-xl w-full max-w-5xl h-full flex flex-col overflow-hidden relative shadow-2xl">
                  <div className="bg-gray-900 p-4 flex justify-between items-center text-white shrink-0 border-b-4 border-[#10b981]">
                      <div>
                          <h3 className="font-black text-lg flex items-center gap-2">
                              <FileText size={20} className="text-[#10b981]" /> 
                              OM DIGITAL: {viewPdf.omNumber}
                          </h3>
                          <p className="text-xs text-gray-400 font-bold">{viewPdf.description}</p>
                      </div>
                      <button onClick={() => setViewPdf(null)} className="hover:bg-gray-700 p-2 rounded-full transition-colors">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="flex-1 bg-gray-200 relative">
                      {viewPdf.pdfUrl ? (
                          <iframe src={viewPdf.pdfUrl} className="w-full h-full" title="PDF Viewer" />
                      ) : (
                          <div className="flex flex-col items-center justify-center h-full text-gray-500">
                              <AlertTriangle size={48} className="mb-2 opacity-50"/>
                              <p className="font-bold">ARQUIVO NÃO DISPONÍVEL</p>
                          </div>
                      )}
                  </div>
                  
                  <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3 shrink-0">
                      <button 
                        onClick={() => setViewPdf(null)} 
                        className="px-6 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                      >
                          FECHAR
                      </button>
                      <button 
                        onClick={() => { setViewPdf(null); handleExecute(viewPdf); }}
                        className="bg-[#10b981] hover:bg-[#059669] text-white px-6 py-3 rounded-lg font-black shadow-lg flex items-center gap-2 transition-transform active:scale-95"
                      >
                          <PlayCircle size={20} />
                          INICIAR EXECUÇÃO AGORA
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};