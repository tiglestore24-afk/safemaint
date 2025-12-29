
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { DocumentRecord, SignatureRecord } from '../types';
import { Eye, Download, Trash2, X, FileText, CheckCircle, Clipboard, Filter, QrCode, Cloud, Archive as ArchiveIcon, Calendar, Hash, Tag, Printer, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../components/BackButton';

interface ListItemProps {
  doc: DocumentRecord;
  isArchived: boolean;
  onView: (doc: DocumentRecord) => void;
  onShowQR: (e: React.MouseEvent, doc: DocumentRecord) => void;
  onDownload: (e: React.MouseEvent, doc: DocumentRecord) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

const ListItem: React.FC<ListItemProps> = ({ doc, isArchived, onView, onShowQR, onDownload, onDelete }) => {
    const getTypeStyles = () => {
        if (isArchived) return { text: 'text-gray-400', bg: 'bg-gray-400', border: 'border-gray-200' };
        switch(doc.type) {
            case 'ART_EMERGENCIAL': return { text: 'text-red-600', bg: 'bg-red-600', border: 'border-red-100', icon: <ShieldAlert size={14}/> };
            case 'ART_ATIVIDADE': return { text: 'text-blue-600', bg: 'bg-blue-600', border: 'border-blue-100', icon: <FileText size={14}/> };
            case 'CHECKLIST': return { text: 'text-vale-green', bg: 'bg-vale-green', border: 'border-vale-green/20', icon: <CheckCircle size={14}/> };
            case 'RELATORIO': return { text: 'text-orange-500', bg: 'bg-orange-500', border: 'border-orange-100', icon: <Clipboard size={14}/> };
            default: return { text: 'text-gray-600', bg: 'bg-gray-600', border: 'border-gray-100', icon: <FileText size={14}/> };
        }
    };

    const styles = getTypeStyles();

    return (
      <div 
          onClick={() => onView(doc)}
          className={`
            group bg-white rounded-xl p-3 md:p-4
            shadow-sm border transition-all duration-300 flex flex-col md:flex-row items-center gap-3 cursor-pointer
            hover:shadow-md hover:border-vale-green/30 relative overflow-hidden
            ${isArchived ? 'opacity-70 grayscale' : 'border-gray-100'}
          `}
      >
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.bg}`}></div>

          {/* Coluna 1 */}
          <div className="flex flex-row md:flex-col items-center md:items-start justify-between w-full md:w-28 shrink-0 gap-2">
              <div className={`px-2 py-0.5 rounded-md ${styles.bg} bg-opacity-10 flex items-center gap-1.5`}>
                  <span className={`${styles.text}`}>{styles.icon}</span>
                  <span className={`text-[8px] font-black uppercase tracking-wider ${styles.text}`}>
                      {doc.type.replace('ART_', '').replace('_', ' ')}
                  </span>
              </div>
              <span className="text-[9px] font-bold text-gray-400">{new Date(doc.createdAt).toLocaleDateString()}</span>
          </div>

          {/* Coluna 2 */}
          <div className="flex flex-row items-center gap-4 w-full md:w-56 shrink-0 border-y md:border-y-0 md:border-x border-gray-100 py-2 md:py-0 md:px-4">
              <div>
                  <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">OM</span>
                  <span className="block text-sm font-black text-vale-blue leading-none">{doc.header.om || '000000'}</span>
              </div>
              <div>
                  <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">TAG</span>
                  <span className="block text-sm font-black text-vale-green leading-none">{doc.header.tag || 'N/D'}</span>
              </div>
          </div>

          {/* Coluna 3 */}
          <div className="flex-1 w-full overflow-hidden">
              <p className="text-[10px] font-bold text-gray-500 uppercase truncate group-hover:text-gray-700 transition-colors">
                  {doc.header.description || 'Sem descrição registrada'}
              </p>
          </div>

          {/* Coluna 4 */}
          <div className="flex items-center gap-1 shrink-0 bg-gray-50 md:bg-transparent p-1.5 md:p-0 rounded-lg w-full md:w-auto justify-center">
              <button onClick={(e) => { e.stopPropagation(); onView(doc); }} className="p-2 text-gray-400 hover:text-vale-green rounded-lg hover:bg-gray-100"><Eye size={16} /></button>
              <button onClick={(e) => onDownload(e, doc)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100"><Printer size={16} /></button>
              <div className="w-px h-4 bg-gray-200 mx-1 hidden md:block"></div>
              <button onClick={(e) => onDelete(e, doc.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"><Trash2 size={16} /></button>
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
  const [docBlobUrl, setDocBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    refreshDocs();
    window.addEventListener('safemaint_storage_update', refreshDocs);
    return () => window.removeEventListener('safemaint_storage_update', refreshDocs);
  }, [activeTab]);

  useEffect(() => {
      // Logic for Relatorios with attached PDF (manualFileUrl)
      if (viewDoc?.content?.manualFileUrl) {
          try {
              if (viewDoc.content.manualFileUrl.startsWith('data:application/pdf;base64,')) {
                  const byteCharacters = atob(viewDoc.content.manualFileUrl.split(',')[1]);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], { type: 'application/pdf' });
                  const url = URL.createObjectURL(blob);
                  setDocBlobUrl(url);
                  return () => URL.revokeObjectURL(url);
              } else {
                  setDocBlobUrl(viewDoc.content.manualFileUrl);
              }
          } catch (e) {
              setDocBlobUrl(viewDoc.content.manualFileUrl);
          }
      } else {
          setDocBlobUrl(null);
      }
  }, [viewDoc]);

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
        StorageService.moveToTrash(id);
    }
  };

  const handleDeleteAllVisible = () => {
    const count = recentDocs.length + archivedDocs.length;
    if (count > 0 && window.confirm(`MOVER TODOS OS ${count} DOCUMENTOS PARA A LIXEIRA?`)) {
        const idsToDelete = [...recentDocs, ...archivedDocs].map(d => d.id);
        StorageService.moveManyToTrash(idsToDelete);
    }
  };

  const handleDownload = (e: React.MouseEvent, doc: DocumentRecord) => {
    e.stopPropagation();
    setViewDoc(doc);
    setTimeout(() => {
        alert("PREPARANDO IMPRESSÃO. USE A OPÇÃO 'SALVAR COMO PDF' DO NAVEGADOR.");
        window.print();
    }, 500);
  };

  const handleShowQR = (e: React.MouseEvent, doc: DocumentRecord) => { e.stopPropagation(); setShowQr(doc); };

  const renderFullDocument = (doc: DocumentRecord) => {
      // If manual upload exists (PDF/Image)
      if (doc.content?.manualFileUrl) {
          if (doc.content.manualFileUrl.includes('image')) {
              return <img src={doc.content.manualFileUrl} className="max-w-full mx-auto" alt="Anexo" />;
          }
          if (docBlobUrl) {
              return (
                  <div className="w-full h-[800px] bg-gray-200">
                      <iframe src={docBlobUrl} className="w-full h-full border-none" title="Visualizador"/>
                  </div>
              );
          }
      }

      const riskList = doc.type === 'ART_EMERGENCIAL' && doc.content?.checklistRisks 
        ? Object.entries(doc.content.checklistRisks).filter(([_, val]: any) => val.checked)
        : [];

      // Default HTML Render for Printing
      return (
          <div className="bg-white p-8 md:p-12 shadow-none max-w-[21cm] mx-auto font-sans text-gray-900 border border-gray-200 print:border-none print:p-0">
              {/* HEADER */}
              <div className="flex justify-between items-center border-b-4 border-[#007e7a] pb-4 mb-6">
                  <div>
                      <h1 className="text-2xl font-black text-[#111827] uppercase tracking-tight">SAFEMAINT</h1>
                      <p className="text-xs font-bold text-[#007e7a] tracking-[0.3em] uppercase">Documento Técnico</p>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase">DOC ID</p>
                      <p className="text-sm font-mono font-bold text-gray-800">{doc.id.slice(0,8).toUpperCase()}</p>
                  </div>
              </div>

              {/* INFO GERAL */}
              <div className="grid grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded border border-gray-200 text-xs">
                  <div><span className="block font-black text-gray-400 uppercase">DATA</span><span className="font-bold">{new Date(doc.createdAt).toLocaleDateString()}</span></div>
                  <div><span className="block font-black text-gray-400 uppercase">HORA</span><span className="font-bold">{new Date(doc.createdAt).toLocaleTimeString().slice(0,5)}</span></div>
                  <div><span className="block font-black text-gray-400 uppercase">OM</span><span className="font-black text-gray-800">{doc.header.om}</span></div>
                  <div><span className="block font-black text-gray-400 uppercase">TAG</span><span className="font-black text-gray-800">{doc.header.tag}</span></div>
                  <div className="col-span-4 border-t border-gray-200 pt-2 mt-1">
                      <span className="block font-black text-gray-400 uppercase">ATIVIDADE / DESCRIÇÃO</span>
                      <span className="font-bold text-gray-700 uppercase">{doc.header.description}</span>
                  </div>
              </div>

              <div className="mb-6">
                  <h2 className="font-black text-lg border-l-4 border-[#007e7a] pl-3 uppercase mb-4">{doc.type.replace('_', ' ')}</h2>
                  
                  {/* ART EMERGENCIAL CONTENT */}
                  {doc.type === 'ART_EMERGENCIAL' && (
                      <div className="space-y-6">
                          {/* Riscos Identificados */}
                          <div>
                              <h3 className="font-bold text-xs uppercase bg-gray-100 p-2 mb-2">Riscos Identificados & Controles</h3>
                              <table className="w-full text-xs border border-gray-300">
                                  <thead className="bg-gray-200 font-bold">
                                      <tr>
                                          <th className="p-2 text-left border-r border-gray-300 w-10">#</th>
                                          <th className="p-2 text-left border-r border-gray-300">Risco</th>
                                          <th className="p-2 text-left">Medida de Controle</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {riskList.length > 0 ? riskList.map(([id, val]: any) => (
                                          <tr key={id} className="border-t border-gray-300">
                                              <td className="p-2 border-r border-gray-300 text-center font-bold">{id}</td>
                                              <td className="p-2 border-r border-gray-300 font-bold text-red-700">RISCO #{id} (Ver Tabela Padrão)</td>
                                              <td className="p-2 uppercase">{val.control || 'N/A'}</td>
                                          </tr>
                                      )) : <tr><td colSpan={3} className="p-4 text-center italic">Nenhum risco marcado</td></tr>}
                                  </tbody>
                              </table>
                          </div>
                          {/* Mapa 360 */}
                          {doc.content?.quadrantRisks && (
                              <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold border border-gray-300 p-4 rounded">
                                  {Object.entries(doc.content.quadrantRisks).map(([quad, risks]: any) => (
                                      <div key={quad} className="bg-gray-50 p-2 rounded border border-gray-200">
                                          <div className="text-gray-400 text-[10px] mb-1">{quad}</div>
                                          <div className="text-red-600">{risks.length > 0 ? risks.join(', ') : '-'}</div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  )}

                  {/* CHECKLIST CONTENT */}
                  {doc.type === 'CHECKLIST' && doc.content?.checklistItems && (
                      <div>
                          <table className="w-full text-[10px] border border-gray-300">
                              <thead className="bg-gray-200 font-bold uppercase">
                                  <tr>
                                      <th className="p-2 text-left">Item</th>
                                      <th className="p-2 text-left">Descrição</th>
                                      <th className="p-2 text-center w-20">Status</th>
                                      <th className="p-2 text-left w-1/3">Observação</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {doc.content.checklistItems.map((item: any, idx: number) => (
                                      <tr key={idx} className="border-t border-gray-300">
                                          <td className="p-2 font-bold text-gray-500">{item.id}</td>
                                          <td className="p-2 uppercase font-bold">{item.desc}</td>
                                          <td className="p-2 text-center font-black">
                                              {item.status === 'ATENDE' ? <span className="text-green-600">OK</span> : 
                                               item.status === 'NAO_ATENDE' ? <span className="text-red-600">NOK</span> : '-'}
                                          </td>
                                          <td className="p-2 italic uppercase text-gray-600">{item.obs}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}

                  {/* REPORT CONTENT */}
                  {doc.type === 'RELATORIO' && doc.content && (
                      <div className="space-y-4 text-xs">
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded">
                              <span className="block font-black text-gray-400 mb-1">RAW TEXT / CONTEÚDO:</span>
                              <pre className="whitespace-pre-wrap font-mono">{doc.content.rawText}</pre>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 border rounded"><span className="block font-bold text-gray-400">INÍCIO</span>{doc.content.startTime}</div>
                              <div className="p-3 border rounded"><span className="block font-bold text-gray-400">FIM</span>{doc.content.endTime}</div>
                              <div className="p-3 border rounded col-span-2"><span className="block font-bold text-gray-400">MOTIVO PARADA</span>{doc.content.stopReason}</div>
                          </div>
                      </div>
                  )}
              </div>

              {/* ASSINATURAS */}
              <div className="mt-8 pt-6 border-t-2 border-gray-200 break-inside-avoid">
                  <h4 className="text-xs font-black mb-4 uppercase text-gray-400 tracking-widest">Assinaturas Digitais Validadas</h4>
                  <div className="grid grid-cols-3 gap-6">
                    {doc.signatures.map(sig => (
                        <div key={sig.id} className="text-center border border-gray-200 p-2 rounded bg-gray-50">
                            <img src={sig.signatureData} className="h-10 mx-auto mb-1 mix-blend-multiply" />
                            <div className="border-t border-gray-300 pt-1">
                                <p className="text-[9px] font-black uppercase">{sig.name}</p>
                                <p className="text-[8px] text-gray-500 uppercase">{sig.function} | {new Date(sig.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-20 px-4 animate-fadeIn">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 border-b border-gray-200 pb-4 pt-4">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
                <h2 className="text-2xl font-black text-vale-darkgray uppercase tracking-tighter">Arquivo</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Biblioteca Digital</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <button onClick={() => navigate('/trash')} className="bg-white text-vale-cherry px-4 py-2 rounded-xl text-[9px] font-black flex items-center gap-2 border border-vale-cherry/20 shadow-sm hover:bg-vale-cherry hover:text-white transition-all">
                  <Trash2 size={14} /> LIXEIRA ({trashCount})
              </button>
          </div>
      </div>
      
      {/* TABS */}
      <nav className="flex bg-gray-100 p-1 rounded-xl mb-6 shadow-inner overflow-x-auto gap-1 border border-gray-200">
        {[
          { id: 'ARTS', label: 'ARTs', icon: <FileText size={14}/> },
          { id: 'CHECKLISTS', label: 'Checklists', icon: <CheckCircle size={14}/> },
          { id: 'RELATORIOS', label: 'Relatórios', icon: <Clipboard size={14}/> }
        ].map((tab) => (
            <button 
                key={tab.id}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-black text-[10px] rounded-lg transition-all uppercase whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-vale-green shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} 
                onClick={() => setActiveTab(tab.id as any)}
            >
                {tab.icon} {tab.label}
            </button>
        ))}
      </nav>

      {/* LISTA */}
      <div className="space-y-8">
          <section>
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-vale-darkgray text-sm uppercase tracking-tight">Recentes</h3>
                  {recentDocs.length > 0 && (
                      <button onClick={handleDeleteAllVisible} className="text-[9px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-1">
                          <Trash2 size={12} /> Limpar Tudo
                      </button>
                  )}
              </div>
              
              <div className="space-y-2">
                  {recentDocs.length === 0 ? (
                      <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <ArchiveIcon size={32} className="mx-auto text-gray-300 mb-2" />
                          <p className="font-black text-[10px] text-gray-400 uppercase tracking-widest">Vazio.</p>
                      </div>
                  ) : (
                      recentDocs.map(doc => <ListItem key={doc.id} doc={doc} isArchived={false} onView={setViewDoc} onShowQR={handleShowQR} onDownload={handleDownload} onDelete={handleDelete} />)
                  )}
              </div>
          </section>

          {archivedDocs.length > 0 && (
              <section>
                  <h3 className="font-black text-gray-400 text-sm uppercase tracking-tight mb-4">Antigos</h3>
                  <div className="space-y-2">
                      {archivedDocs.map(doc => <ListItem key={doc.id} doc={doc} isArchived={true} onView={setViewDoc} onShowQR={handleShowQR} onDownload={handleDownload} onDelete={handleDelete} />)}
                  </div>
              </section>
          )}
      </div>

      {/* MODAL VISUALIZAÇÃO */}
      {viewDoc && (
        <div className="fixed inset-0 bg-vale-dark/95 flex items-center justify-center z-[100] p-0 md:p-4 backdrop-blur-md animate-fadeIn overflow-hidden">
            <div className="bg-white w-full h-full md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden relative">
                {/* Header Modal */}
                <div className="bg-gray-900 text-white p-4 flex justify-between items-center shrink-0 z-50 shadow-md">
                    <div className="flex items-center gap-3">
                        <FileText size={20} className="text-vale-green" />
                        <div>
                            <h3 className="font-black text-lg tracking-tighter uppercase leading-none">Visualização Profissional</h3>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">ID: {viewDoc.id.slice(0,8)}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {docBlobUrl && (
                            <a href={docBlobUrl} download className="px-3 py-2 bg-gray-700 text-white font-bold rounded-lg text-[9px] uppercase hover:bg-gray-600 transition-all flex items-center gap-1">
                                <Download size={14}/>
                            </a>
                        )}
                        <button onClick={() => window.print()} className="px-4 py-2 bg-vale-green text-white font-black rounded-lg text-[9px] uppercase shadow hover:bg-emerald-600 flex items-center gap-2 print:hidden">
                            <Printer size={16} /> Imprimir PDF
                        </button>
                        <button onClick={() => setViewDoc(null)} className="p-2 bg-white/10 hover:bg-red-500 rounded-full transition-all print:hidden"><X size={20}/></button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-gray-100 custom-scrollbar p-0 md:p-8 flex justify-center">
                     {renderFullDocument(viewDoc)}
                </div>
            </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQr && (
          <div className="fixed inset-0 bg-gray-950/90 flex items-center justify-center z-[110] p-4 backdrop-blur-lg animate-fadeIn" onClick={() => setShowQr(null)}>
               <div className="bg-white rounded-3xl p-8 max-w-xs w-full text-center relative shadow-2xl border-b-[8px] border-vale-yellow" onClick={e => e.stopPropagation()}>
                   <div className="bg-gray-50 p-4 inline-block rounded-xl border border-gray-200 mb-4 shadow-inner">
                       <img 
                           src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + '/#/doc/' + showQr.id)}`} 
                           alt="QR Code" 
                           className="mx-auto w-40 h-40"
                       />
                   </div>
                   <h3 className="text-xl font-black text-vale-darkgray uppercase tracking-tighter mb-1">Acesso Mobile</h3>
                   <button onClick={() => setShowQr(null)} className="mt-4 w-full py-3 bg-gray-900 text-white font-black rounded-xl text-[10px] uppercase tracking-widest">Fechar</button>
               </div>
          </div>
      )}
    </div>
  );
};
