
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { DocumentRecord, SignatureRecord } from '../types';
import { Eye, Download, Trash2, X, FileText, CheckCircle, Clipboard, Filter, QrCode, Cloud, Archive as ArchiveIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../components/BackButton';

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

  // --- RENDERIZADORES DE DOCUMENTOS ---

  const renderSignatures = (signatures: SignatureRecord[]) => (
      <div className="mt-8 border-t-2 border-gray-300 pt-6 break-inside-avoid">
          <h4 className="font-black text-xs uppercase mb-4 text-gray-700">Assinaturas Registradas</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {signatures.map(sig => (
                  <div key={sig.id} className="text-center">
                      <div className="h-16 flex items-end justify-center mb-1">
                          <img src={sig.signatureData} alt="Assinatura" className="max-h-full max-w-full" />
                      </div>
                      <div className="border-t border-gray-400 pt-1">
                          <p className="font-bold text-[10px] text-gray-900 uppercase">{sig.name}</p>
                          <p className="text-[9px] text-gray-500 uppercase">{sig.matricula} - {sig.function}</p>
                          <p className="text-[8px] text-gray-400">{new Date(sig.date).toLocaleString()}</p>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderARTContent = (doc: DocumentRecord) => {
      const isEmergencial = doc.type === 'ART_EMERGENCIAL';
      const content = doc.content;

      return (
          <div className="space-y-6">
              {/* Cabeçalho Específico ART */}
              <div className="bg-gray-100 p-4 border border-gray-300 rounded text-center">
                  <h2 className="font-black text-xl text-gray-800">ANÁLISE DE RISCO DA TAREFA (ART)</h2>
                  <p className="text-xs font-bold text-gray-600">{isEmergencial ? 'EMERGENCIAL / CORRETIVA' : 'ATIVIDADE / ROTINA'}</p>
                  {content.artNumber && <p className="text-xs font-black mt-2">ART BASE: {content.artNumber} - {content.artName}</p>}
              </div>

              {/* Tabela de Riscos */}
              {isEmergencial ? (
                  <div className="border border-gray-300">
                      <div className="bg-gray-800 text-white p-2 text-xs font-black text-center">RISCOS IDENTIFICADOS E MEDIDAS (CHECKLIST DE CAMPO)</div>
                      <table className="w-full text-xs">
                          <thead className="bg-gray-200 font-bold">
                              <tr>
                                  <th className="p-2 border text-left">RISCO</th>
                                  <th className="p-2 border text-left">MEDIDA DE CONTROLE APLICADA</th>
                              </tr>
                          </thead>
                          <tbody>
                              {Object.entries(content.checklistRisks || {}).map(([key, val]: any) => (
                                  val.checked && (
                                    <tr key={key}>
                                        <td className="p-2 border font-bold text-gray-800">{key} (ITEM LISTA)</td>
                                        <td className="p-2 border text-gray-600">{val.control || 'PADRÃO'}</td>
                                    </tr>
                                  )
                              ))}
                          </tbody>
                      </table>
                  </div>
              ) : (
                  <div className="p-4 bg-gray-50 border border-gray-200 text-sm">
                      <p className="font-bold text-gray-700 mb-2">PROCEDIMENTO PADRÃO VINCULADO:</p>
                      <p className="text-gray-600 italic">Esta ART segue os riscos e controles definidos no procedimento padrão da biblioteca.</p>
                  </div>
              )}
              
              {renderSignatures(doc.signatures)}
          </div>
      );
  };

  const renderChecklistContent = (doc: DocumentRecord) => {
      const items = doc.content.checklistItems || [];
      return (
          <div className="space-y-6">
               <div className="bg-gray-100 p-4 border border-gray-300 rounded text-center">
                  <h2 className="font-black text-xl text-gray-800">CHECKLIST DE EQUIPAMENTO</h2>
                  <p className="text-xs font-bold text-gray-600">INSPEÇÃO PÓS-MANUTENÇÃO</p>
              </div>

              <table className="w-full text-xs border border-gray-300">
                  <thead className="bg-gray-800 text-white font-black">
                      <tr>
                          <th className="p-2 border border-gray-600 text-left w-10">#</th>
                          <th className="p-2 border border-gray-600 text-left">ITEM / DESCRIÇÃO</th>
                          <th className="p-2 border border-gray-600 text-center w-24">STATUS</th>
                          <th className="p-2 border border-gray-600 text-left">OBSERVAÇÃO</th>
                      </tr>
                  </thead>
                  <tbody>
                      {items.map((item: any) => (
                          <tr key={item.id} className={item.status === 'NAO_ATENDE' ? 'bg-red-50' : 'bg-white'}>
                              <td className="p-2 border font-bold text-center">{item.id}</td>
                              <td className="p-2 border font-bold text-gray-700">
                                  <span className="block text-[9px] text-gray-400">{item.section}</span>
                                  {item.desc}
                              </td>
                              <td className="p-2 border text-center font-bold">
                                  {item.status === 'ATENDE' ? 
                                    <span className="text-green-700">OK</span> : 
                                    item.status === 'NAO_ATENDE' ? <span className="text-red-600">FALHA</span> : '-'}
                              </td>
                              <td className="p-2 border text-gray-600 italic">{item.obs}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>

              {renderSignatures(doc.signatures)}
          </div>
      );
  };

  const renderReportContent = (doc: DocumentRecord) => {
      const content = doc.content;
      return (
          <div className="space-y-6">
               <div className="bg-gray-100 p-4 border border-gray-300 rounded text-center">
                  <h2 className="font-black text-xl text-gray-800">RELATÓRIO DE MANUTENÇÃO</h2>
                  <p className="text-xs font-bold text-gray-600">{content.isManualUpload ? 'REGISTRO MANUAL DIGITALIZADO' : 'REGISTRO DIGITAL'}</p>
              </div>

              {content.isManualUpload ? (
                  <div className="border-2 border-dashed border-gray-300 p-4 bg-gray-50 text-center">
                      <p className="font-bold text-gray-700 mb-4">ANEXO ORIGINAL:</p>
                      {content.manualFileUrl ? (
                          <img src={content.manualFileUrl} alt="Relatório" className="max-w-full h-auto mx-auto shadow-lg" />
                      ) : (
                          <p className="text-red-500 font-bold">IMAGEM NÃO DISPONÍVEL</p>
                      )}
                  </div>
              ) : (
                  <div className="grid grid-cols-1 gap-4 border border-gray-300 p-6 bg-white">
                      <div className="bg-gray-50 p-3 border-l-4 border-gray-800">
                          <span className="block text-[10px] font-black uppercase text-gray-500">MOTIVO DA PARADA</span>
                          <p className="font-bold text-sm text-gray-800 whitespace-pre-wrap">{content.stopReason || 'N/A'}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-3 border-l-4 border-blue-600">
                          <span className="block text-[10px] font-black uppercase text-gray-500">ATIVIDADES REALIZADAS</span>
                          <p className="font-bold text-sm text-gray-800 whitespace-pre-wrap">{content.activities || 'N/A'}</p>
                      </div>

                      <div className="bg-red-50 p-3 border-l-4 border-red-600">
                          <span className="block text-[10px] font-black uppercase text-gray-500 text-red-800">PENDÊNCIAS</span>
                          <p className="font-bold text-sm text-red-900 whitespace-pre-wrap">{content.pendings || 'NENHUMA'}</p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                          <span className="font-black text-gray-500">STATUS FINAL:</span>
                          <span className="px-4 py-1 bg-black text-white font-black rounded uppercase">{content.finalStatus}</span>
                      </div>
                  </div>
              )}
          </div>
      );
  };

  const renderFullDocument = (doc: DocumentRecord) => {
      return (
          <div className="bg-white p-8 md:p-12 shadow-none max-w-4xl mx-auto print:p-0 print:shadow-none font-sans text-gray-900">
              {/* HEADER PADRÃO VALE */}
              <div className="flex justify-between items-center border-b-4 border-[#007e7a] pb-6 mb-8">
                  <div>
                      <h1 className="text-3xl font-black text-[#111827] uppercase tracking-tight">SAFEMAINT</h1>
                      <p className="text-xs font-bold text-[#007e7a] tracking-[0.3em] uppercase">Gestão de Manutenção Integrada</p>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase">DOCUMENTO Nº</p>
                      <p className="text-xl font-mono font-bold text-gray-800">{doc.id.slice(0,8).toUpperCase()}</p>
                  </div>
              </div>

              {/* DADOS DO CABEÇALHO */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <div>
                      <span className="block text-[9px] font-black text-gray-400 uppercase mb-1">DATA</span>
                      <span className="font-bold text-sm">{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                      <span className="block text-[9px] font-black text-gray-400 uppercase mb-1">HORA</span>
                      <span className="font-bold text-sm">{new Date(doc.createdAt).toLocaleTimeString().slice(0,5)}</span>
                  </div>
                  <div>
                      <span className="block text-[9px] font-black text-gray-400 uppercase mb-1">ORDEM (OM)</span>
                      <span className="font-bold text-sm">{doc.header.om}</span>
                  </div>
                  <div>
                      <span className="block text-[9px] font-black text-gray-400 uppercase mb-1">TAG</span>
                      <span className="font-bold text-sm">{doc.header.tag}</span>
                  </div>
                  <div className="col-span-2 md:col-span-4 border-t pt-4 mt-2">
                       <span className="block text-[9px] font-black text-gray-400 uppercase mb-1">DESCRIÇÃO DA ATIVIDADE</span>
                       <span className="font-bold text-sm">{doc.header.description}</span>
                  </div>
              </div>

              {/* CONTEÚDO ESPECÍFICO */}
              {doc.type.includes('ART') && renderARTContent(doc)}
              {doc.type === 'CHECKLIST' && renderChecklistContent(doc)}
              {doc.type === 'RELATORIO' && renderReportContent(doc)}

              {/* RODAPÉ */}
              <div className="mt-12 pt-6 border-t border-gray-200 text-center">
                  <p className="text-[9px] font-black text-gray-400 uppercase">GERADO AUTOMATICAMENTE PELO SISTEMA SAFEMAINT</p>
                  <p className="text-[8px] text-gray-300 font-mono mt-1">{doc.id}</p>
              </div>
          </div>
      );
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4">
      {/* ... (Header e Tabs permanecem iguais, focar na alteração do Modal abaixo) ... */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 border-b border-gray-200 pb-6">
          <div className="flex items-center gap-4">
            <BackButton />
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

      {/* MODAL DE VISUALIZAÇÃO COM CORREÇÃO DO BOTÃO FECHAR */}
      {viewDoc && (
        <div className="fixed inset-0 bg-vale-dark/95 flex items-center justify-center z-[100] p-4 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-fade-in-up border-b-8 border-vale-green relative">
                
                {/* Header do Modal com Botão Fechar Garantido */}
                <div className="bg-vale-green text-white p-6 flex justify-between items-center shrink-0 shadow-lg relative z-50">
                    <div className="flex items-center gap-3">
                        <FileText size={24} className="text-vale-yellow" />
                        <div>
                            <h3 className="font-black text-xl leading-none uppercase tracking-tighter">Visualização Digital</h3>
                            <p className="text-[10px] font-bold text-white/70 uppercase mt-1 tracking-widest">{viewDoc.type}</p>
                        </div>
                    </div>
                    {/* Botão Fechar com Contraste e Z-Index */}
                    <button 
                        onClick={() => setViewDoc(null)} 
                        className="bg-white/20 hover:bg-white text-white hover:text-vale-green p-2 rounded-full transition-all active:scale-90 shadow-inner"
                        title="Fechar Visualização"
                    >
                        <X size={28}/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-200 custom-scrollbar">
                     {/* Conteúdo Renderizado Estilo PDF */}
                     {renderFullDocument(viewDoc)}
                </div>

                <div className="p-4 bg-white border-t border-gray-100 flex justify-end gap-3 shrink-0">
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
                        <Download size={18} /> IMPRIMIR / PDF
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL QR CODE */}
      {showQr && (
          <div className="fixed inset-0 bg-vale-darkgray/95 flex items-center justify-center z-[110] p-4 backdrop-blur-lg animate-fadeIn" onClick={() => setShowQr(null)}>
               <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center relative shadow-2xl animate-fade-in-up border-b-8 border-vale-yellow" onClick={e => e.stopPropagation()}>
                   <div className="absolute top-4 right-4">
                       <button onClick={() => setShowQr(null)} className="text-gray-400 hover:text-vale-cherry"><X size={24} /></button>
                   </div>
                   <QrCode size={120} className="mx-auto text-vale-darkgray mb-6" />
                   <h3 className="text-2xl font-black text-vale-darkgray uppercase tracking-tighter mb-2">QR Code Gerado</h3>
                   <p className="text-xs font-bold text-gray-500 uppercase">Use o leitor para acessar o documento {showQr.id.slice(0,8)}</p>
               </div>
          </div>
      )}
    </div>
  );
};
