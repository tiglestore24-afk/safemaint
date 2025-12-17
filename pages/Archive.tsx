
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
    const isChecklist = doc.type === 'CHECKLIST';
    const canDownload = !isDraft || isChecklist;

    return (
      <div 
          onClick={() => onView(doc)}
          className={`bg-white rounded-xl shadow-sm border hover:shadow-xl transition-all duration-200 flex flex-col relative cursor-pointer ${isDraft ? 'border-yellow-400' : isArchived ? 'border-gray-300 bg-gray-50 opacity-90' : 'border-gray-200'}`}
      >
          {isDraft && (
              <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-1 rounded-bl-lg rounded-tr-lg z-10">
                  RASCUNHO
              </div>
          )}
           {isArchived && (
              <div className="absolute top-0 right-0 bg-gray-600 text-white text-[10px] font-black px-2 py-1 rounded-bl-lg rounded-tr-lg z-10 flex items-center gap-1">
                  <ArchiveIcon size={10} /> ARQUIVO MORTO
              </div>
          )}

          <div className={`p-4 border-b rounded-t-xl flex justify-between items-center ${isDraft ? 'bg-yellow-50 border-yellow-200' : isArchived ? 'bg-gray-100 border-gray-200' : 'bg-gray-50 border-gray-100'}`}>
              <span className={`text-[10px] font-black px-2 py-1 rounded-md text-white uppercase tracking-wider ${
                  isArchived ? 'bg-gray-500' :
                  doc.type === 'ART_EMERGENCIAL' ? 'bg-red-500' :
                  doc.type === 'CHECKLIST' ? 'bg-green-600' :
                  doc.type === 'RELATORIO' ? 'bg-orange-500' : 'bg-green-600'
              }`}>
                  {doc.type.replace('ART_', 'ART ').replace('_', ' ')}
              </span>
              <span className="text-xs text-gray-500 font-mono font-bold">{new Date(doc.createdAt).toLocaleDateString()}</span>
          </div>
          
          <div className="p-5 flex-1">
              <div className="mb-4">
                  <p className="text-[10px] text-gray-400 uppercase font-black mb-1">ORDEM DE MANUTENÇÃO</p>
                  <h3 className="font-black text-gray-800 text-lg leading-tight">{doc.header.om || 'SEM OM'}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                      <p className="text-[10px] text-gray-400 uppercase font-black">TAG</p>
                      <p className="text-sm font-bold text-gray-700">{doc.header.tag || 'N/D'}</p>
                  </div>
                  <div>
                      <p className="text-[10px] text-gray-400 uppercase font-black">TIPO</p>
                      <p className="text-sm font-bold text-gray-700">{doc.header.type}</p>
                  </div>
              </div>
              <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black">DESCRIÇÃO</p>
                  <p className="text-xs font-bold text-gray-600 truncate">{doc.header.description || '-'}</p>
              </div>
          </div>

          <div className={`p-3 border-t border-gray-100 flex justify-between gap-2 rounded-b-xl ${isArchived ? 'bg-gray-100' : 'bg-gray-50'}`}>
              <div className="flex gap-1">
                  <button 
                      title="Visualizar Completo" 
                      onClick={(e) => { e.stopPropagation(); onView(doc); }} 
                      className="p-2 bg-white text-green-700 hover:bg-green-600 hover:text-white border border-gray-200 rounded-lg transition-colors shadow-sm"
                  >
                      <Eye size={18} />
                  </button>
                  <button 
                      title="QR Code" 
                      onClick={(e) => onShowQR(e, doc)} 
                      className="p-2 bg-white text-gray-600 hover:bg-gray-800 hover:text-white border border-gray-200 rounded-lg transition-colors shadow-sm"
                  >
                      <QrCode size={18} />
                  </button>
              </div>
              
              <div className="flex gap-1">
                  {canDownload && (
                      <button 
                          title="Baixar PDF (Visualização)" 
                          onClick={(e) => onDownload(e, doc)} 
                          className={`p-2 bg-white border border-gray-200 rounded-lg transition-colors shadow-sm text-green-600 hover:bg-green-600 hover:text-white`}
                      >
                          <Download size={18} />
                      </button>
                  )}
                  <button 
                      title="Mover para Lixeira" 
                      onClick={(e) => onDelete(e, doc.id)} 
                      className="p-2 bg-white text-red-500 hover:bg-red-500 hover:text-white border border-gray-200 rounded-lg transition-colors shadow-sm"
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
    setTimeout(() => alert("USE CTRL+P PARA IMPRIMIR OU SALVAR COMO PDF."), 500);
  };

  const handleShowQR = (e: React.MouseEvent, doc: DocumentRecord) => { e.stopPropagation(); setShowQr(doc); };

  const renderDocContent = (doc: DocumentRecord) => {
      return (
          <div className="text-sm">
              <p>Visualização de {doc.type}</p>
              <pre className="whitespace-pre-wrap bg-gray-100 p-2 rounded mt-2 text-xs">{JSON.stringify(doc.content, null, 2)}</pre>
          </div>
      );
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6 border-b border-gray-300 pb-4">
          <div className="flex items-center gap-2">
            <div className="bg-gray-800 p-2 rounded text-white"><Filter size={24} /></div>
            <div>
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Arquivo Digital</h2>
                <p className="text-xs font-bold text-gray-400 uppercase">Gestão Documental</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <button onClick={() => navigate('/trash')} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-2 border border-gray-300">
                  <Trash2 size={14} /> LIXEIRA {trashCount > 0 && <span className="bg-red-600 text-white px-1.5 rounded-full">{trashCount}</span>}
              </button>
              <div className="hidden md:flex bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-[10px] font-black items-center gap-1"><Cloud size={12} /> ONLINE</div>
          </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
        <button className={`flex justify-center gap-2 px-4 py-3 font-black text-sm rounded ${activeTab === 'ARTS' ? 'bg-white text-green-700 shadow' : 'text-gray-500'}`} onClick={() => setActiveTab('ARTS')}><FileText size={18}/> ARTs</button>
        <button className={`flex justify-center gap-2 px-4 py-3 font-black text-sm rounded ${activeTab === 'CHECKLISTS' ? 'bg-white text-green-700 shadow' : 'text-gray-500'}`} onClick={() => setActiveTab('CHECKLISTS')}><CheckCircle size={18}/> CHECKLISTS</button>
        <button className={`flex justify-center gap-2 px-4 py-3 font-black text-sm rounded ${activeTab === 'RELATORIOS' ? 'bg-white text-green-700 shadow' : 'text-gray-500'}`} onClick={() => setActiveTab('RELATORIOS')}><Clipboard size={18}/> RELATÓRIOS</button>
      </div>

      {(recentDocs.length > 0 || archivedDocs.length > 0) && (
          <div className="flex justify-end mb-6">
              <button onClick={handleDeleteAllVisible} className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-xs font-black border border-red-200"><Trash2 size={16} /> MOVER TUDO P/ LIXEIRA</button>
          </div>
      )}

      <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-6 bg-green-600 rounded"></div>
              <h3 className="font-black text-gray-800 text-lg uppercase">Recentes</h3>
              <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-bold">{recentDocs.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentDocs.length === 0 && <div className="col-span-3 text-center py-10 text-gray-400 font-bold text-sm">Vazio.</div>}
              {recentDocs.map(doc => <CardItem key={doc.id} doc={doc} isArchived={false} onView={setViewDoc} onShowQR={handleShowQR} onDownload={handleDownload} onDelete={handleDelete} />)}
          </div>
      </div>

      <div>
          <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-6 bg-gray-500 rounded"></div>
              <h3 className="font-black text-gray-600 text-lg uppercase">Arquivo Morto</h3>
              <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">{archivedDocs.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80">
               {archivedDocs.length === 0 && <div className="col-span-3 text-center py-10 text-gray-400 font-bold text-sm">Vazio.</div>}
              {archivedDocs.map(doc => <CardItem key={doc.id} doc={doc} isArchived={true} onView={setViewDoc} onShowQR={handleShowQR} onDownload={handleDownload} onDelete={handleDelete} />)}
          </div>
      </div>

      {viewDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-2 md:p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
                <div className="bg-gray-900 text-white p-5 flex justify-between items-center shrink-0">
                    <h3 className="font-black text-xl">VISUALIZAR {viewDoc.type}</h3>
                    <button onClick={() => setViewDoc(null)}><X size={28}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <div className="bg-white p-4 rounded shadow border border-gray-200">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div><span className="text-xs text-gray-400 font-black block">OM</span><span className="font-bold">{viewDoc.header.om}</span></div>
                            <div><span className="text-xs text-gray-400 font-black block">TAG</span><span className="font-bold">{viewDoc.header.tag}</span></div>
                            <div className="col-span-2"><span className="text-xs text-gray-400 font-black block">DESCRIÇÃO</span><span className="font-bold">{viewDoc.header.description}</span></div>
                        </div>
                        {renderDocContent(viewDoc)}
                    </div>
                </div>
                <div className="p-4 bg-gray-100 border-t flex justify-end gap-2">
                    <button onClick={() => setViewDoc(null)} className="px-4 py-2 bg-white border font-bold rounded">FECHAR</button>
                    <button onClick={(e) => handleDownload(e, viewDoc)} className="px-4 py-2 bg-green-600 text-white font-bold rounded">BAIXAR PDF</button>
                </div>
            </div>
        </div>
      )}
      {showQr && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4 backdrop-blur-sm" onClick={() => setShowQr(null)}>
               <div className="bg-white rounded-xl p-8 max-w-sm w-full text-center relative">
                   <h3 className="font-black text-xl text-gray-800 mb-4">QR CODE DIGITAL</h3>
                   <div className="bg-white p-2 inline-block border-4 border-gray-900 rounded-lg mb-4">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(showQr.id)}`} alt="QR" className="w-48 h-48"/>
                   </div>
                   <p className="text-xs text-gray-400 font-mono">{showQr.id}</p>
               </div>
          </div>
      )}
    </div>
  );
};
