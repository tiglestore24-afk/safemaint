
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
    // Mapeamento de cores baseado no tipo para uniformidade
    const getTypeStyles = () => {
        if (isArchived) return { 
            border: 'border-vale-gray', 
            text: 'text-vale-gray', 
            bg: 'bg-vale-gray', 
            gradient: 'from-gray-500/10 to-transparent' 
        };
        switch(doc.type) {
            case 'ART_EMERGENCIAL': return { 
                border: 'border-vale-cherry', 
                text: 'text-vale-cherry', 
                bg: 'bg-vale-cherry', 
                gradient: 'from-vale-cherry/5 to-transparent' 
            };
            case 'ART_ATIVIDADE': return { 
                border: 'border-vale-blue', 
                text: 'text-vale-blue', 
                bg: 'bg-vale-blue', 
                gradient: 'from-vale-blue/5 to-transparent' 
            };
            case 'CHECKLIST': return { 
                border: 'border-vale-green', 
                text: 'text-vale-green', 
                bg: 'bg-vale-green', 
                gradient: 'from-vale-green/5 to-transparent' 
            };
            case 'RELATORIO': return { 
                border: 'border-vale-yellow', 
                text: 'text-vale-yellow', 
                bg: 'bg-vale-yellow', 
                gradient: 'from-vale-yellow/5 to-transparent' 
            };
            default: return { 
                border: 'border-vale-blue', 
                text: 'text-vale-blue', 
                bg: 'bg-vale-blue', 
                gradient: 'from-vale-blue/5 to-transparent' 
            };
        }
    };

    const styles = getTypeStyles();

    return (
      <div 
          onClick={() => onView(doc)}
          className={`
            group bg-white rounded-3xl
            shadow-[0_8px_30px_rgba(0,0,0,0.04)]
            border-2 transition-all duration-500 flex flex-col relative cursor-pointer overflow-hidden
            hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-2
            ${isArchived ? 'border-gray-200 opacity-80' : 'border-white'}
          `}
      >
          {/* Fundo gradiente sutil no hover */}
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br ${styles.gradient}`}></div>

          {/* Barra Superior de Identificação */}
          <div className={`h-1.5 w-full ${styles.bg}`}></div>

          {isArchived && (
              <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-md text-white text-[9px] font-black px-3 py-1 rounded-full z-10 shadow-lg flex items-center gap-1.5">
                  <ArchiveIcon size={12} className="text-vale-yellow" /> ARQUIVADO
              </div>
          )}

          <div className="p-6 flex-1 flex flex-col relative z-10">
              <div className="flex justify-between items-start mb-6">
                  <div className={`px-3 py-1 rounded-lg ${styles.bg} bg-opacity-10`}>
                    <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${styles.text}`}>
                        {doc.type.replace('ART_', 'ART ').replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono font-bold">
                      {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
              </div>
              
              <div className="mb-6">
                  <p className="text-[9px] text-gray-400 uppercase font-black mb-1.5 tracking-wider">Ordem de Manutenção</p>
                  <h3 className="font-black text-vale-blue text-3xl leading-none tracking-tight group-hover:text-vale-green transition-colors">
                      {doc.header.om || '000000'}
                  </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                  <div>
                      <p className="text-[9px] text-gray-400 uppercase font-black tracking-wider mb-1">Tag Equip.</p>
                      <p className="text-base font-black text-vale-green truncate uppercase">{doc.header.tag || 'CA-N/D'}</p>
                  </div>
                  <div>
                      <p className="text-[9px] text-gray-400 uppercase font-black tracking-wider mb-1">Tipo</p>
                      <p className="text-xs font-bold text-gray-700">{doc.header.type}</p>
                  </div>
              </div>

              <div className="mt-auto pt-4 border-t border-gray-50">
                  <p className="text-[9px] text-gray-400 uppercase font-black tracking-wider mb-1">Atividade</p>
                  <p className="text-xs font-bold text-gray-500 italic line-clamp-2">
                      {doc.header.description || 'Sem descrição detalhada registrada no sistema'}
                  </p>
              </div>
          </div>

          {/* Painel de Ações Estilizado */}
          <div className="p-4 bg-white border-t border-gray-50 flex justify-between gap-2 relative z-10">
              <div className="flex gap-2">
                  <button 
                      title="Visualizar" 
                      onClick={(e) => { e.stopPropagation(); onView(doc); }} 
                      className="p-3 bg-gray-50 text-vale-green hover:bg-vale-green hover:text-white rounded-2xl transition-all shadow-sm active:scale-90"
                  >
                      <Eye size={20} />
                  </button>
                  <button 
                      title="QR Code" 
                      onClick={(e) => onShowQR(e, doc)} 
                      className="p-3 bg-gray-50 text-gray-800 hover:bg-gray-800 hover:text-white rounded-2xl transition-all shadow-sm active:scale-90"
                  >
                      <QrCode size={20} />
                  </button>
              </div>
              
              <div className="flex gap-2">
                  <button 
                      title="PDF" 
                      onClick={(e) => onDownload(e, doc)} 
                      className="p-3 bg-gray-50 text-vale-blue hover:bg-vale-blue hover:text-white rounded-2xl transition-all shadow-sm active:scale-90"
                  >
                      <Download size={20} />
                  </button>
                  <button 
                      title="Remover" 
                      onClick={(e) => onDelete(e, doc.id)} 
                      className="p-3 bg-gray-50 text-vale-cherry hover:bg-vale-cherry hover:text-white rounded-2xl transition-all shadow-sm active:scale-90"
                  >
                      <Trash2 size={20} />
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
      // Duração se existir no conteúdo
      const duration = doc.content?.duration || '';

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

              {/* DADOS DO CABEÇALHO COM TEMPO TOTAL */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <div>
                      <span className="block text-[9px] font-black text-gray-400 uppercase mb-1">DATA</span>
                      <span className="font-bold text-sm">{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                      <span className="block text-[9px] font-black text-gray-400 uppercase mb-1">HORA</span>
                      <span className="font-bold text-sm">{new Date(doc.createdAt).toLocaleTimeString().slice(0,5)}</span>
                  </div>
                  
                  {/* DESTAQUE TEMPO TOTAL SE EXISTIR */}
                  {duration && (
                      <div className="col-span-2 bg-blue-100 rounded px-2 py-1 flex flex-col justify-center border-l-4 border-blue-500">
                          <span className="block text-[9px] font-black text-blue-500 uppercase">TEMPO TOTAL DE MANUTENÇÃO</span>
                          <span className="font-black text-sm text-blue-900">{duration}</span>
                      </div>
                  )}

                  <div>
                      <span className="block text-[9px] font-black text-gray-400 uppercase mb-1">ORDEM (OM)</span>
                      <span className="font-black text-sm text-gray-800">{doc.header.om}</span>
                  </div>
                  <div className={duration ? "" : "col-span-3"}>
                      <span className="block text-[9px] font-black text-gray-400 uppercase mb-1">TAG</span>
                      <span className="font-black text-sm text-gray-800">{doc.header.tag}</span>
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
              <div className="hidden md:flex bg-vale-blue/10 text-vale-blue px-4 py-2 rounded-xl text-[10px] font-black items-center gap-2 border border-vale-blue/20 shadow-sm">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
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
                  <div className="w-1.5 h-8 bg-gray-400 rounded-full shadow-sm"></div>
                  <h3 className="font-black text-gray-500 text-xl uppercase tracking-tighter">Arquivo Morto (Histórico)</h3>
                  <span className="bg-gray-100 text-gray-500 text-[10px] px-3 py-1 rounded-full font-black border border-gray-200">{archivedDocs.length} ITENS</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {archivedDocs.map(doc => <CardItem key={doc.id} doc={doc} isArchived={true} onView={setViewDoc} onShowQR={handleShowQR} onDownload={handleDownload} onDelete={handleDelete} />)}
              </div>
          </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO */}
      {viewDoc && (
        <div className="fixed inset-0 bg-vale-dark/95 flex items-center justify-center z-[100] p-4 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-fade-in-up border-b-8 border-vale-green relative">
                
                {/* Header do Modal */}
                <div className="bg-vale-green text-white p-6 flex justify-between items-center shrink-0 shadow-lg relative z-50">
                    <div className="flex items-center gap-3">
                        <FileText size={24} className="text-vale-yellow" />
                        <div>
                            <h3 className="font-black text-xl leading-none uppercase tracking-tighter">Visualização Digital</h3>
                            <p className="text-[10px] font-bold text-white/70 uppercase mt-1 tracking-widest">{viewDoc.type}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setViewDoc(null)} 
                        className="bg-white/20 hover:bg-white text-white hover:text-vale-green p-2 rounded-full transition-all active:scale-90 shadow-inner"
                        title="Fechar Visualização"
                    >
                        <X size={28}/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-200 custom-scrollbar">
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
          <div className="fixed inset-0 bg-gray-900/95 flex items-center justify-center z-[110] p-4 backdrop-blur-lg animate-fadeIn" onClick={() => setShowQr(null)}>
               <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center relative shadow-2xl animate-fade-in-up border-b-8 border-vale-yellow" onClick={e => e.stopPropagation()}>
                   <div className="absolute top-6 right-6">
                       <button onClick={() => setShowQr(null)} className="text-gray-300 hover:text-vale-cherry transition-colors"><X size={24} /></button>
                   </div>
                   <div className="bg-white p-2 inline-block rounded-2xl border-2 border-gray-50 mb-6">
                       <img 
                           src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/#/doc/' + showQr.id)}`} 
                           alt="QR Code do Documento" 
                           className="mx-auto w-48 h-48"
                       />
                   </div>
                   <h3 className="text-2xl font-black text-vale-darkgray uppercase tracking-tighter mb-2">Acesso Rápido</h3>
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Use a câmera para abrir este documento digitalmente.</p>
                   <p className="text-[10px] font-mono text-gray-300 mt-4">ID: {showQr.id.slice(0,8).toUpperCase()}</p>
               </div>
          </div>
      )}
    </div>
  );
};
