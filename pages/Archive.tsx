
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { DocumentRecord, SignatureRecord } from '../types';
import { Eye, Download, Trash2, X, FileText, CheckCircle, Clipboard, Filter, QrCode, Cloud, Archive as ArchiveIcon, Calendar, Hash, Tag, Printer, ShieldAlert, MapPin, AlertTriangle, AlertOctagon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { Logo } from '../components/Logo';

// LISTA DE RISCOS PADRÃO PARA TRADUÇÃO DOS IDS NA VISUALIZAÇÃO
const RISK_LIST = [
    "CONTATO COM SUPERFÍCIES CORTANTES/PERFURANTE", "PRENSAMENTO DE DEDOS OU MÃOS", "QUEDA DE PEÇAS/ESTRUTURAS/EQUIPAMENTOS",
    "PRENSAMENTO OU AGARRAMENTO DO CORPO", "ATROPELAMENTO/ESMAGAMENTO POR VEÍCULOS", "QUEDA, TROPEÇO OU ESCORREGÃO",
    "ANIMAIS PEÇONHENTOS/INSETOS", "DESMORONAMENTOS DE PILHAS", "QUEDA DE PLATAFORMA OU ESCADAS", "ARCO E/OU CHOQUE ELÉTRICO",
    "FONTES DE ENERGIA (HIDRÁULICA, PNEUMÁTICA)", "EXPOSIÇÃO A VAPORES, CONDENSADOS OU QUENTES", "GASES, VAPORES, POEIRAS OU FUMOS",
    "PRODUTOS QUÍMICOS OU QUEIMADURAS", "PROJEÇÃO DE MATERIAIS NA FACE/OLHOS", "CONDIÇÕES CLIMÁTICAS ADVERSAS",
    "QUEDA DE HOMEM AO MAR/AFOGAMENTO", "INTERFERÊNCIA ENTRE EQUIPES", "EXCESSO OU DEFICIÊNCIA DE ILUMINAÇÃO", "OUTRAS SITUAÇÕES DE RISCO"
];

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
            case 'ART_EMERGENCIAL': return { text: 'text-pink-600', bg: 'bg-pink-600', border: 'border-pink-100', icon: <AlertOctagon size={14}/> };
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
  const [activeTab, setActiveTab] = useState<'ARTS' | 'DEMANDAS' | 'CHECKLISTS' | 'RELATORIOS'>('ARTS');
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
    // Filtrar LIXEIRA e RASCUNHO (só mostra RASCUNHO quando virar ATIVO)
    let filtered: DocumentRecord[] = allDocs.filter(d => d.status !== 'LIXEIRA' && d.status !== 'RASCUNHO');

    switch(activeTab) {
        case 'ARTS': 
            // Mostra apenas ART_ATIVIDADE (Padrão)
            filtered = filtered.filter(d => d.type === 'ART_ATIVIDADE'); 
            break;
        case 'DEMANDAS': 
            // Mostra apenas ART_EMERGENCIAL (Gerado por Demandas/Corretivas)
            filtered = filtered.filter(d => d.type === 'ART_EMERGENCIAL'); 
            break;
        case 'CHECKLISTS': 
            filtered = filtered.filter(d => d.type === 'CHECKLIST'); 
            break;
        case 'RELATORIOS': 
            filtered = filtered.filter(d => d.type === 'RELATORIO'); 
            break;
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
      // If manual upload exists (PDF/Image) AND it is a RELATORIO type, show full screen.
      // NOTE: ART_ATIVIDADE manualFileUrl is handled differently (embedded in layout below)
      if (doc.type === 'RELATORIO' && doc.content?.manualFileUrl) {
          return (
              <div className="flex flex-col h-full bg-gray-200">
                  <div className="bg-gray-900 text-white p-3 flex justify-between items-center shrink-0 border-b border-gray-700">
                      <div>
                          <span className="font-black text-sm uppercase tracking-widest text-vale-green block mb-1">DOCUMENTO ORIGINAL ANEXO</span>
                          <span className="font-bold text-xs uppercase flex gap-4">
                              {doc.header.om && <span>OM: <span className="text-white">{doc.header.om}</span></span>}
                              {doc.header.tag && <span>TAG: <span className="text-white">{doc.header.tag}</span></span>}
                          </span>
                      </div>
                  </div>
                  <div className="flex-1 relative bg-gray-200 overflow-hidden">
                      {doc.content.manualFileUrl.includes('image') ? (
                          <div className="flex items-center justify-center h-full overflow-auto">
                              <img src={doc.content.manualFileUrl} className="max-w-full max-h-full shadow-lg" alt="Anexo" />
                          </div>
                      ) : (
                          docBlobUrl && <iframe src={docBlobUrl} className="w-full h-full border-none" title="Visualizador" />
                      )}
                  </div>
              </div>
          );
      }

      // Default HTML Render for Printing
      return (
          <div className={`bg-white shadow-none mx-auto font-sans text-gray-900 border border-gray-200 print:border-none print:p-0 ${doc.content?.scheduleItems ? 'max-w-[98%] p-4 landscape:w-full' : 'max-w-[21cm] p-8 md:p-12'}`}>
              
              {/* SPECIAL RENDER FOR SCHEDULE REPORT (PROGRAMAÇÃO) */}
              {doc.type === 'RELATORIO' && doc.content?.scheduleItems ? (
                  <div className="w-full overflow-x-auto">
                      {/* Custom Header matching image */}
                      <div className="flex border border-gray-300 mb-0 bg-gray-100">
                          <div className="w-48 p-1 flex items-center justify-center border-r border-gray-300 bg-white">
                              <Logo size="md" showText={true} />
                          </div>
                          <div className="flex-1 bg-gray-200 flex items-center justify-center text-gray-800 font-black text-2xl uppercase border-r border-gray-300">
                              PROGRAMAÇÃO SEMANAL - SEMANA {doc.content.weekNumber}
                          </div>
                          <div className="w-32 bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm uppercase border-r border-gray-300">
                              SEMANA:
                          </div>
                          <div className="w-24 bg-white flex items-center justify-center text-gray-800 font-bold text-2xl border-r border-gray-300">
                              {doc.content.weekNumber}
                          </div>
                      </div>

                      <table className="w-full text-[9px] border-collapse border border-gray-300 font-sans">
                          <thead>
                              <tr className="bg-gray-100 text-gray-700">
                                  <th className="border border-gray-300 p-1 font-bold uppercase min-w-[80px]">FROTA/OM</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase min-w-[200px]">DESCRIÇÃO DA ATIVIDADE</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-16 text-center">DATA MIN</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-16 text-center">DATA MAX</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-16 text-center">PRIORIDADE</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-10 text-center">N DE PESSOAS</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-8 text-center">H</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-16 text-center">DATA INICIO</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-16 text-center">DATA FIM</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-20 text-center">CENTRO DE TRABALHO</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-12 text-center">HORA INICIO</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-12 text-center">HORA FIM</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase min-w-[100px] text-center">RECURSOS</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase min-w-[100px] text-center">RECURSOS 2</th>
                              </tr>
                          </thead>
                          <tbody>
                              {doc.content.scheduleItems.map((item: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-gray-50 border-b border-gray-200">
                                      <td className="border border-gray-300 p-1 text-center font-bold text-black">{item.frotaOm}</td>
                                      <td className="border border-gray-300 p-1 uppercase">{item.description}</td>
                                      <td className="border border-gray-300 p-1 text-center whitespace-nowrap">{item.dateMin}</td>
                                      <td className="border border-gray-300 p-1 text-center whitespace-nowrap">{item.dateMax}</td>
                                      <td className="border border-gray-300 p-1 text-center">{item.priority}</td>
                                      <td className="border border-gray-300 p-1 text-center">{item.peopleCount}</td>
                                      <td className="border border-gray-300 p-1 text-center">{item.hours}</td>
                                      <td className="border border-gray-300 p-1 text-center font-bold whitespace-nowrap">{item.dateStart}</td>
                                      <td className="border border-gray-300 p-1 text-center whitespace-nowrap">{item.dateEnd}</td>
                                      <td className="border border-gray-300 p-1 text-center">{item.workCenter}</td>
                                      <td className="border border-gray-300 p-1 text-center">{item.timeStart}</td>
                                      <td className="border border-gray-300 p-1 text-center">{item.timeEnd}</td>
                                      <td className="border border-gray-300 p-1 text-center text-[8px]">{item.resources}</td>
                                      <td className="border border-gray-300 p-1 text-center text-[8px]">{item.resources2}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              ) : (
                  // STANDARD DOCUMENT RENDER (ARTs, CHECKLISTS)
                  <>
                    {/* Common Header */}
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

                    {/* Data Block */}
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
                        
                        {/* --- RENDERIZAÇÃO ESPECÍFICA: ART EMERGENCIAL (COM TODOS OS DETALHES) --- */}
                        {doc.type === 'ART_EMERGENCIAL' && (
                            <div className="space-y-6">
                                {/* 1. RISCOS IDENTIFICADOS (DETALHADO) */}
                                <div>
                                    <h3 className="font-black text-xs uppercase bg-gray-100 p-2 mb-2 flex items-center gap-2 border-b-2 border-red-200">
                                        <ShieldAlert size={14} className="text-red-600"/> 
                                        Análise Preliminar de Risco (APR) - Detalhado
                                    </h3>
                                    <table className="w-full text-xs border border-gray-300">
                                        <thead className="bg-gray-100 font-bold">
                                            <tr>
                                                <th className="p-2 text-left border-r border-gray-300 w-10">ID</th>
                                                <th className="p-2 text-left border-r border-gray-300">Descrição do Risco (Padrão)</th>
                                                <th className="p-2 text-left">Medida de Controle Aplicada</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {doc.content?.checklistRisks && Object.entries(doc.content.checklistRisks).filter(([_, val]: any) => val.checked).length > 0 ? (
                                                Object.entries(doc.content.checklistRisks)
                                                    .filter(([_, val]: any) => val.checked)
                                                    .map(([idStr, val]: any) => {
                                                        const id = parseInt(idStr);
                                                        const riskDesc = RISK_LIST[id - 1] || "RISCO NÃO CATALOGADO";
                                                        return (
                                                            <tr key={id} className="border-t border-gray-300">
                                                                <td className="p-2 border-r border-gray-300 text-center font-bold">{id}</td>
                                                                <td className="p-2 border-r border-gray-300 font-bold text-gray-800">{riskDesc}</td>
                                                                <td className="p-2 uppercase font-mono text-gray-600">{val.control || 'PADRÃO'}</td>
                                                            </tr>
                                                        );
                                                    })
                                            ) : (
                                                <tr><td colSpan={3} className="p-4 text-center italic">Nenhum risco crítico selecionado.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* 2. MAPEAMENTO 360 (TEXTUAL) */}
                                {doc.content?.quadrantRisks && (
                                    <div>
                                        <h3 className="font-black text-xs uppercase bg-gray-100 p-2 mb-2 flex items-center gap-2 border-b-2 border-blue-200">
                                            <MapPin size={14} className="text-blue-600"/> 
                                            Mapeamento de Entorno (Radar 360º)
                                        </h3>
                                        <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold border border-gray-300 p-4 rounded bg-white">
                                            {Object.entries(doc.content.quadrantRisks).map(([quad, risks]: any) => (
                                                <div key={quad} className="bg-gray-50 p-3 rounded border border-gray-200 flex flex-col justify-between h-full">
                                                    <div className="text-gray-400 text-[10px] uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">{quad}</div>
                                                    <div className="text-red-600 font-black text-sm">
                                                        {risks.length > 0 ? risks.map((r: number) => `#${r}`).join(', ') : '-'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[9px] text-gray-400 mt-1 uppercase text-center">* Números correspondem aos IDs da tabela de riscos acima.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- RENDERIZAÇÃO ESPECÍFICA: ART ATIVIDADE (COM PDF DESTACADO) --- */}
                        {doc.type === 'ART_ATIVIDADE' && (
                            <div className="space-y-6">
                                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center shadow-sm">
                                    <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-2">DOCUMENTO ORIGINAL VINCULADO</h3>
                                    
                                    <div className="flex flex-col items-center gap-2 mb-4">
                                        <span className="text-4xl font-black text-blue-900 tracking-tighter">
                                            {doc.content?.artNumber || 'N/D'}
                                        </span>
                                        <span className="text-sm font-bold text-gray-600 uppercase bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                                            {doc.content?.artName || 'PROCEDIMENTO PADRÃO'}
                                        </span>
                                    </div>

                                    <div className="flex justify-center gap-4">
                                        <div className="flex items-center gap-2 text-green-600 bg-green-100 px-4 py-2 rounded-lg border border-green-200">
                                            <CheckCircle size={18} />
                                            <span className="text-[10px] font-black uppercase">ARQUIVADO & LIDO</span>
                                        </div>
                                        
                                        {doc.content?.manualFileUrl && (
                                            <a href={doc.content.manualFileUrl} download className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg border border-blue-800 transition-colors shadow-sm no-print">
                                                <Download size={18} />
                                                <span className="text-[10px] font-black uppercase">BAIXAR PDF ORIGINAL</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* RENDERIZAÇÃO: CHECKLIST */}
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

                        {/* RENDERIZAÇÃO: RELATÓRIO GERAL */}
                        {doc.type === 'RELATORIO' && !doc.content?.scheduleItems && doc.content && (
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
                        <h4 className="text-xs font-black mb-4 uppercase text-gray-400 tracking-widest flex items-center gap-2">
                            <CheckCircle size={14} /> Assinaturas Digitais Validadas
                        </h4>
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
                  </>
              )}
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
          { id: 'DEMANDAS', label: 'Demandas', icon: <AlertOctagon size={14}/> },
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
                          <p className="font-black text-[10px] text-gray-400 uppercase tracking-widest">Nenhum documento finalizado.</p>
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
