import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { DocumentRecord } from '../types';
import { Eye, Download, Trash2, X, FileText, CheckCircle, Clipboard, Filter, QrCode, Cloud, Archive as ArchiveIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CardItemProps {
  doc: DocumentRecord;
  isArchived: boolean;
  onView: (doc: DocumentRecord) => void;
  onShowQR: (e: React.MouseEvent, doc: DocumentRecord) => void;
  onDownload: (e: React.MouseEvent, doc: DocumentRecord) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

const CardItem: React.FC<CardItemProps> = ({ doc, isArchived, onView, onShowQR, onDownload, onDelete }) => {
    const isDraft = doc.status === 'RASCUNHO';
    
    // Mapeamento de cores baseado no tipo para uniformidade
    const getTypeStyles = () => {
        if (isArchived) return { border: 'border-vale-darkgray', text: 'text-vale-darkgray', bg: 'bg-vale-darkgray' };
        switch(doc.type) {
            case 'ART_EMERGENCIAL': return { border: 'border-vale-cherry', text: 'text-vale-cherry', bg: 'bg-vale-cherry' };
            case 'ART_ATIVIDADE': return { border: 'border-vale-aqua', text: 'text-vale-aqua', bg: 'bg-vale-aqua' };
            case 'CHECKLIST': return { border: 'border-vale-green', text: 'text-vale-green', bg: 'bg-vale-green' };
            case 'RELATORIO': return { border: 'border-vale-orange', text: 'text-vale-orange', bg: 'bg-vale-orange' };
            default: return { border: 'border-vale-blue', text: 'text-vale-blue', bg: 'bg-vale-blue' };
        }
    };

    const styles = getTypeStyles();
    const canDownload = !isDraft || doc.type === 'CHECKLIST';

    return (
      <div 
          onClick={() => onView(doc)}
          className={`
            group bg-gradient-to-b from-white to-gray-50 rounded-2xl 
            shadow-[0_4px_10px_rgba(0,0,0,0.05),_inset_0_-2px_4px_rgba(0,0,0,0.02)] 
            border-2 transition-all duration-300 flex flex-col relative cursor-pointer overflow-hidden
            hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.15)] hover:-translate-y-1
            ${isDraft ? 'border-vale-yellow' : isArchived ? 'border-gray-200 opacity-80' : 'border-gray-100'}
          `}
      >
          {/* Barra Superior Colorida por Tipo */}
          <div className={`h-2 w-full ${styles.bg}`}></div>

          {/* Badges de Status */}
          {isDraft && (
              <div className="absolute top-2 right-2 bg-vale-yellow text-vale-green text-[9px] font-black px-2 py-0.5 rounded-full z-10 shadow-sm">
                  RASCUNHO
              </div>
          )}
          {isArchived && (
              <div className="absolute top-2 right-2 bg-vale-darkgray text-white text-[9px] font-black px-2 py-0.5 rounded-full z-10 shadow-sm flex items-center gap-1">
                  <ArchiveIcon size={10} /> ARQUIVADO
              </div>
          )}

          <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${styles.text}`}>
                      {doc.type.replace('ART_', 'ART ').replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-vale-darkgray/40 font-mono font-bold">
                      {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
              </div>
              
              <div className="mb-4">
                  <p className="text-[9px] text-vale-darkgray/50 uppercase font-black mb-0.5 tracking-tighter">ORDEM DE MANUTENÇÃO</p>
                  <h3 className="font-black text-vale-darkgray text-lg leading-tight group-hover:text-vale-green transition-colors">
                      {doc.header.om || 'SEM OM'}
                  </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                      <p className="text-[9px] text-vale-darkgray/50 uppercase font-black tracking-tighter">TAG</p>
                      <p className="text-xs font-bold text-vale-darkgray/80 truncate">{doc.header.tag || 'N/D'}</p>
                  </div>
                  <div>
                      <p className="text-[9px] text-vale-darkgray/50 uppercase font-black tracking-tighter">TIPO</p>
                      <p className="text-xs font-bold text-vale-darkgray/80">{doc.header.type}</p>
                  </div>
              </div>

              <div className="mt-auto">
                  <p className="text-[9px] text-vale-darkgray/50 uppercase font-black tracking-tighter">DESCRIÇÃO</p>
                  <p className="text-xs font-bold text-vale-darkgray/60 italic line-clamp-1">
                      {doc.header.description || 'Sem descrição detalhada'}
                  </p>
              </div>
          </div>

          {/* Footer com Sombra Interna Sutil */}
          <div className="p-3 bg-gray-50/50 border-t border-gray-100 flex justify-between gap-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
              <div className="flex gap-1.5">
                  <button 
                      title="Visualizar Completo" 
                      onClick={(e) => { e.stopPropagation(); onView(doc); }} 
                      className="p-2.5 bg-white text-vale-green hover:bg-vale-green hover:text-white border border-gray-200 rounded-xl transition-all shadow-sm active:scale-95"
                  >
                      <Eye size={18} />
                  </button>
                  <button 
                      title="QR Code" 
                      onClick={(e) => onShowQR(e, doc)} 
                      className="p-2.5 bg-white text-vale-darkgray hover:bg-vale-darkgray hover:text-white border border-gray-200 rounded-xl transition-all shadow-sm active:scale-95"
                  >
                      <QrCode size={18} />
                  </button>
              </div>
              
              <div className="flex gap-1.5">
                  {canDownload && (
                      <button 
                          title="Baixar PDF" 
                          onClick={(e) => onDownload(e, doc)} 
                          className="p-2.5 bg-white text-vale-blue hover:bg-vale-blue hover:text-white border border-gray-200 rounded-xl transition-all shadow-sm active:scale-95"
                      >
                          <Download size={18} />
                      </button>
                  )}
                  <button 
                      title="Mover para Lixeira" 
                      onClick={(e) => onDelete(e, doc.id)} 
                      className="p-2.5 bg-white text-vale-cherry hover:bg-vale-cherry hover:text-white border border-gray-200 rounded-xl transition-all shadow-sm active:scale-95"
                  >
                      <Trash2 size={18} />
                  </button>
              </div>
          </div>
      </div>
    );
};

export const Archive: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ARTS' | 'CHECKLISTS' | 'RELATORIOS'>('ARTS');
  const [recentDocs, setRecentDocs] = useState<DocumentRecord[]>([]);
  const [archivedDocs, setArchivedDocs] = useState<DocumentRecord[]>([]);
  const [viewDoc, setViewDoc] = useState<DocumentRecord | null>(null);
  const [showQr, setShowQr] = useState<DocumentRecord | null>(null);
  const [trashCount, setTrashCount] = useState(0);

  useEffect(() => {
    StorageService.runRetentionPolicy();
    refreshDocs();
    window.addEventListener('safemaint_storage_update', refreshDocs);
    return () => window.removeEventListener('safemaint_storage_update', refreshDocs);
  }, [activeTab]);

  const refreshDocs = () => {
    const allDocs = StorageService.getDocuments();
    const trashItems = allDocs.filter(d => d.status === 'LIXEIRA');
    setTrashCount(trashItems.length);
    let filtered: DocumentRecord[] = allDocs.filter(d => d.status !== 'LIXEIRA');

    switch(activeTab) {
        case 'ARTS': filtered = filtered.filter(d => d.type === 'ART_EMERGENCIAL' || d.type === 'ART_ATIVIDADE'); break;
        case 'CHECKLISTS': filtered = filtered.filter(d => d.type === 'CHECKLIST'); break;
        case 'RELATORIOS': filtered = filtered.filter(d => d.type === 'RELATORIO'); break;
    }

    const recent = filtered.filter(d => d.status !== 'ARQUIVADO');
    const archived = filtered.filter(d => d.status === 'ARQUIVADO');
    setRecentDocs(recent.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setArchivedDocs(archived.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if(window.confirm("CONFIRMA MOVER PARA LIXEIRA?")) {
        setRecentDocs(prev => prev.filter(d => d.id !== id));
        setArchivedDocs(prev => prev.filter(d => d.id !== id));
        StorageService.moveToTrash(id);
        if(viewDoc?.id === id) setViewDoc(null);
    }
  };

  const handleDeleteAllVisible = () => {
    const count = recentDocs.length + archivedDocs.length;
    if (count > 0 && window.confirm(`MOVER TODOS OS ${count} DOCUMENTOS PARA A LIXEIRA?`)) {
        const idsToDelete = [...recentDocs, ...archivedDocs].map(d => d.id);
        setRecentDocs([]); setArchivedDocs([]);
        StorageService.moveManyToTrash(idsToDelete);
        setViewDoc(null);
    }
  };

  const handleDownload = (e: React.MouseEvent, doc: DocumentRecord) => {
    e.stopPropagation();
    setViewDoc(doc);
    setTimeout(() => alert("DICA: USE CTRL+P NA TELA DE VISUALIZAÇÃO PARA SALVAR COMO PDF."), 1000);
  };

  const handleShowQR = (e: React.MouseEvent, doc: DocumentRecord) => { e.stopPropagation(); setShowQr(doc); };

  const renderDocContent = (doc: DocumentRecord) => {
      return (
          <div className="text-sm font-mono bg-gray-50 p-6 rounded-xl border-2 border-dashed border-gray-200 mt-4 overflow-auto max-h-[400px]">
              <h4 className="font-black text-vale-darkgray mb-4 border-b pb-2 uppercase tracking-widest text-xs">Dados Estruturados do Documento</h4>
              <pre className="text-[10px] leading-relaxed text-vale-darkgray/80">{JSON.stringify(doc.content, null, 2)}</pre>
          </div>
      );
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 border-b border-gray-200 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-vale-green p-3 rounded-2xl text-white shadow-lg"><Filter size={28} /></div>
            <div>
                <h2 className="text-3xl font-black text-vale-darkgray uppercase tracking-tighter">Arquivo Digital</h2>
                <p className="text-[10px] font-bold text-vale-darkgray/40 uppercase tracking-widest">A VIDA EM PRIMEIRO LUGAR</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
              <button 
                  onClick={() => navigate('/trash')} 
                  className="bg-white text-vale-cherry px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 border-2 border-vale-cherry/20 shadow-sm hover:bg-vale-cherry hover:text-white transition-all active:scale-95"
              >
                  <Trash2 size={16} /> LIXEIRA {trashCount > 0 && <span className="bg-vale-cherry text-white px-2 py-0.5 rounded-full text-[9px]">{trashCount}</span>}
              </button>
              <div className="hidden md:flex bg-vale-aqua/10 text-vale-aqua px-4 py-2 rounded-xl text-[10px] font-black items-center gap-2 border border-vale-aqua/20 shadow-sm">
                  <Cloud size={14} className="animate-pulse" /> SISTEMA CONECTADO
              </div>
          </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8 bg-gray-200/50 p-1.5 rounded-2xl shadow-inner border border-gray-200">
        <button 
            className={`flex items-center justify-center gap-2 px-6 py-4 font-black text-xs rounded-xl transition-all ${activeTab === 'ARTS' ? 'bg-white text-vale-green shadow-md scale-[1.02]' : 'text-vale-darkgray/60 hover:text-vale-darkgray hover:bg-white/50'}`} 
            onClick={() => setActiveTab('ARTS')}
        >
            <FileText size={18}/> ARTs REGISTRADAS
        </button>
        <button 
            className={`flex items-center justify-center gap-2 px-6 py-4 font-black text-xs rounded-xl transition-all ${activeTab === 'CHECKLISTS' ? 'bg-white text-vale-green shadow-md scale-[1.02]' : 'text-vale-darkgray/60 hover:text-vale-darkgray hover:bg-white/50'}`} 
            onClick={() => setActiveTab('CHECKLISTS')}
        >
            <CheckCircle size={18}/> CHECKLISTS OPERACIONAIS
        </button>
        <button 
            className={`flex items-center justify-center gap-2 px-6 py-4 font-black text-xs rounded-xl transition-all ${activeTab === 'RELATORIOS' ? 'bg-white text-vale-green shadow-md scale-[1.02]' : 'text-vale-darkgray/60 hover:text-vale-darkgray hover:bg-white/50'}`} 
            onClick={() => setActiveTab('RELATORIOS')}
        >
            <Clipboard size={18}/> RELATÓRIOS DE RETORNO
        </button>
      </div>

      {(recentDocs.length > 0 || archivedDocs.length > 0) && (
          <div className="flex justify-end mb-8">
              <button 
                  onClick={handleDeleteAllVisible} 
                  className="group flex items-center gap-2 bg-gray-100 text-vale-darkgray/50 px-5 py-2.5 rounded-xl text-[10px] font-black border-2 border-transparent hover:border-vale-cherry/20 hover:text-vale-cherry transition-all active:scale-95"
              >
                  <Trash2 size={16} /> MOVER TODOS PARA A LIXEIRA
              </button>
          </div>
      )}

      {/* Seção Recentes */}
      <div className="mb-14">
          <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-8 bg-vale-green rounded-full shadow-sm"></div>
              <h3 className="font-black text-vale-darkgray text-xl uppercase tracking-tighter">Documentos Recentes</h3>
              <span className="bg-vale-green/10 text-vale-green text-[10px] px-3 py-1 rounded-full font-black border border-vale-green/20">{recentDocs.length} ITENS</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recentDocs.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center grayscale opacity-30">
                      <FileText size={64} className="mb-4" />
                      <p className="font-black text-sm uppercase">Nenhum documento encontrado nesta categoria.</p>
                  </div>
              )}
              {recentDocs.map(doc => <CardItem key={doc.id} doc={doc} isArchived={false} onView={setViewDoc} onShowQR={handleShowQR} onDownload={handleDownload} onDelete={handleDelete} />)}
          </div>
      </div>

      {/* Seção Arquivo Morto */}
      {archivedDocs.length > 0 && (
          <div className="mb-14">
              <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-8 bg-vale-darkgray rounded-full shadow-sm"></div>
                  <h3 className="font-black text-vale-darkgray/60 text-xl uppercase tracking-tighter">Arquivo Morto (Histórico)</h3>
                  <span className="bg-gray-100 text-vale-darkgray/60 text-[10px] px-3 py-1 rounded-full font-black border border-gray-200">{archivedDocs.length} ITENS</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {archivedDocs.map(doc => <CardItem key={doc.id} doc={doc} isArchived={true} onView={setViewDoc} onShowQR={handleShowQR} onDownload={handleDownload} onDelete={handleDelete} />)}
              </div>
          </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO */}
      {viewDoc && (
        <div className="fixed inset-0 bg-vale-darkgray/90 flex items-center justify-center z-[100] p-4 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-fade-in-up border-b-8 border-vale-green">
                <div className="bg-vale-green text-white p-6 flex justify-between items-center shrink-0 shadow-lg">
                    <div className="flex items-center gap-3">
                        <FileText size={24} className="text-vale-yellow" />
                        <div>
                            <h3 className="font-black text-xl leading-none uppercase tracking-tighter">Visualização Digital</h3>
                            <p className="text-[10px] font-bold text-white/70 uppercase mt-1 tracking-widest">{viewDoc.type} | {viewDoc.header.om}</p>
                        </div>
                    </div>
                    <button onClick={() => setViewDoc(null)} className="hover:bg-white/20 p-2 rounded-full transition-all active:scale-90 shadow-inner">
                        <X size={28}/>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 bg-gray-100 custom-scrollbar">
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-200 max-w-3xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <span className="text-[10px] text-vale-darkgray/40 font-black block mb-1 uppercase">Ordem de Manutenção</span>
                                <span className="font-black text-lg text-vale-darkgray uppercase">{viewDoc.header.om}</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <span className="text-[10px] text-vale-darkgray/40 font-black block mb-1 uppercase">TAG Equipamento</span>
                                <span className="font-black text-lg text-vale-darkgray uppercase">{viewDoc.header.tag}</span>
                            </div>
                            <div className="md:col-span-2 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <span className="text-[10px] text-vale-darkgray/40 font-black block mb-1 uppercase">Descrição da Atividade</span>
                                <span className="font-bold text-vale-darkgray/80 leading-relaxed uppercase">{viewDoc.header.description}</span>
                            </div>
                        </div>
                        
                        <div className="h-px bg-gray-200 mb-8"></div>
                        
                        {renderDocContent(viewDoc)}
                    </div>
                </div>
                <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button 
                        onClick={() => setViewDoc(null)} 
                        className="px-8 py-3 bg-gray-100 text-vale-darkgray font-black rounded-2xl hover:bg-gray-200 transition-all active:scale-95 text-xs uppercase"
                    >
                        FECHAR
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); window.print(); }} 
                        className="px-8 py-3 bg-vale-green text-white font-black rounded-2xl hover:bg-vale-blue transition-all active:scale-95 text-xs uppercase shadow-lg flex items-center gap-2"
                    >
                        <Download size={18} /> SALVAR PDF
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL QR CODE */}
      {showQr && (
          <div className="fixed inset-0 bg-vale-darkgray/95 flex items-center justify-center z-[110] p-4 backdrop-blur-lg animate-fadeIn" onClick={() => setShowQr(null)}>
               <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center relative shadow-2xl animate-fade-in-up border-b-8 border-vale-yellow" onClick={e => e.stopPropagation()}>
                   <div className="absolute top-4 right-6">
                        <button onClick={() => setShowQr(null)} className="text-vale-darkgray/20 hover:text-vale-cherry transition-colors"><X size={24}/></button>
                   </div>
                   <h3 className="font-black text-2xl text-vale-darkgray mb-6 uppercase tracking-tighter">Identidade Digital</h3>
                   <div className="bg-white p-4 inline-block border-8 border-gray-100 rounded-[2.5rem] mb-6 shadow-inner">
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(showQr.id)}&bgcolor=ffffff&color=007E7A&margin=10`} 
                            alt="QR" 
                            className="w-56 h-56 rounded-2xl"
                        />
                   </div>
                   <p className="text-[10px] text-vale-darkgray/40 font-mono font-black break-all uppercase px-4 bg-gray-50 py-2 rounded-full">ID: {showQr.id}</p>
                   <p className="mt-6 text-[9px] font-black text-vale-aqua uppercase tracking-widest animate-pulse">Scan para validação de segurança</p>
               </div>
          </div>
      )}
    </div>
  );
};