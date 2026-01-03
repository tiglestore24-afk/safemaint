
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { DocumentRecord, SignatureRecord } from '../types';
import { Eye, Download, Trash2, X, FileText, CheckCircle, Clipboard, Filter, QrCode, Cloud, Archive as ArchiveIcon, Calendar, Hash, Tag, Printer, ShieldAlert, MapPin, AlertTriangle, AlertOctagon, Loader2 } from 'lucide-react';
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
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  useEffect(() => {
    refreshDocs();
    window.addEventListener('safemaint_storage_update', refreshDocs);
    return () => window.removeEventListener('safemaint_storage_update', refreshDocs);
  }, [activeTab]);

  useEffect(() => {
      let activeUrl: string | null = null;

      const loadContent = async () => {
          if (!viewDoc?.content?.manualFileUrl) {
              setDocBlobUrl(null);
              return;
          }

          let fileData = viewDoc.content.manualFileUrl;

          // SE NÃO TIVER DADOS OU FOR MARCADOR 'TRUE', BUSCA DO SUPABASE
          if (!fileData || fileData === 'TRUE') {
              setIsLoadingPdf(true);
              const remoteData = await StorageService.getRecordPdf('documents', viewDoc.id);
              if (remoteData) fileData = remoteData;
              setIsLoadingPdf(false);
          }

          if (fileData && fileData !== 'TRUE') {
              try {
                  if (fileData.startsWith('data:application/pdf;base64,')) {
                      const byteCharacters = atob(fileData.split(',')[1]);
                      const byteNumbers = new Array(byteCharacters.length);
                      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                      const byteArray = new Uint8Array(byteNumbers);
                      const blob = new Blob([byteArray], { type: 'application/pdf' });
                      const url = URL.createObjectURL(blob);
                      activeUrl = url;
                      setDocBlobUrl(url);
                  } else {
                      setDocBlobUrl(fileData);
                  }
              } catch (e) {
                  setDocBlobUrl(fileData);
              }
          } else {
              setDocBlobUrl(null);
          }
      };

      loadContent();

      return () => {
          if (activeUrl) URL.revokeObjectURL(activeUrl);
      };
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
                      {isLoadingPdf ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-500">
                              <Loader2 size={48} className="text-[#007e7a] animate-spin mb-4" />
                              <h4 className="font-black text-xs uppercase">BAIXANDO ORIGINAL DO SERVIDOR...</h4>
                          </div>
                      ) : docBlobUrl ? (
                          docBlobUrl.includes('image') || (doc.content.manualFileUrl.includes('image') && doc.content.manualFileUrl !== 'TRUE') ? (
                              <div className="flex items-center justify-center h-full overflow-auto">
                                  <img src={docBlobUrl} className="max-w-full max-h-full shadow-lg" alt="Anexo" />
                              </div>
                          ) : (
                              <iframe src={docBlobUrl} className="w-full h-full border-none" title="Visualizador" />
                          )
                      ) : (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400">
                              <ShieldAlert size={48} className="mx-auto mb-2 opacity-30" />
                              <span className="font-bold text-xs uppercase">Arquivo indisponível</span>
                          </div>
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
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-10 text-center">PRIOR</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-8 text-center">PES</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-8 text-center">H</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-16 text-center">INI</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-16 text-center">FIM</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-16 text-center">C. TRAB</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-10 text-center">H.INI</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase w-10 text-center">H.FIM</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase min-w-[80px]">RECURSOS</th>
                                  <th className="border border-gray-300 p-1 font-bold uppercase min-w-[80px]">RECURSOS 2</th>
                              </tr>
                          </thead>
                          <tbody>
                              {doc.content.scheduleItems.map((item: any, idx: number) => (
                                  <tr key={idx} className="even:bg-gray-50">
                                      <td className="border border-gray-300 p-1 text-center font-bold">{item.frotaOm}</td>
                                      <td className="border border-gray-300 p-1 font-bold truncate max-w-[300px]">{item.description}</td>
                                      <td className="border border-gray-300 p-1 text-center">{item.dateMin}</td>
                                      <td className="border border-gray-300 p-1 text-center">{item.dateMax}</td>
                                      <td className="border border-gray-300 p-1 text-center">{item.priority}</td>
                                      <td className="border border-gray-300 p-1 text-center">{item.peopleCount}</td>
                                      <td className="border border-gray-300 p-1 text-center">{item.hours}</td>
                                      <td className="border border-gray-300 p-1 text-center font-bold">{item.dateStart}</td>
                                      <td className="border border-gray-300 p-1 text-center">{item.dateEnd}</td>
                                      <td className="border border-gray-300 p-1 text-center">{item.workCenter}</td>
                                      <td className="border border-gray-300 p-1 text-center">{item.timeStart}</td>
                                      <td className="border border-gray-300 p-1 text-center">{item.timeEnd}</td>
                                      <td className="border border-gray-300 p-1 truncate max-w-[100px]">{item.resources}</td>
                                      <td className="border border-gray-300 p-1 truncate max-w-[100px]">{item.resources2}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              ) : (
                  <>
                      {/* Standard Report Header */}
                      <div className="border-b-4 border-vale-green pb-4 mb-8 flex justify-between items-end">
                          <div className="flex items-center gap-4">
                              <Logo size="lg" />
                              <div className="border-l-2 border-gray-300 pl-4 h-12 flex flex-col justify-center">
                                  <h1 className="text-xl font-black text-vale-darkgray uppercase leading-none">
                                      {doc.type.replace('_', ' ')}
                                  </h1>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">REGISTRO DIGITAL</p>
                              </div>
                          </div>
                          <div className="text-right">
                              <p className="text-[9px] font-black text-gray-400 uppercase">DATA REGISTRO</p>
                              <p className="text-lg font-black text-gray-800">{new Date(doc.createdAt).toLocaleDateString()}</p>
                          </div>
                      </div>

                      {/* Standard Content */}
                      <div className="space-y-6">
                          {/* Header Data */}
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-2 gap-4">
                              <div><span className="text-[9px] font-bold text-gray-400 block">OM</span><span className="font-black text-lg">{doc.header.om}</span></div>
                              <div><span className="text-[9px] font-bold text-gray-400 block">TAG</span><span className="font-black text-lg text-vale-green">{doc.header.tag}</span></div>
                              <div className="col-span-2"><span className="text-[9px] font-bold text-gray-400 block">DESCRIÇÃO</span><span className="font-bold text-sm">{doc.header.description}</span></div>
                          </div>

                          {/* Dynamic Content based on Type */}
                          {doc.type === 'RELATORIO' && (
                              <div className="whitespace-pre-wrap font-mono text-xs bg-gray-50 p-4 rounded border border-gray-200">
                                  {doc.content.rawText}
                              </div>
                          )}

                          {doc.type === 'CHECKLIST' && doc.content?.checklistItems && (
                              <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-xs">
                                      <thead className="bg-gray-100 font-bold uppercase">
                                          <tr>
                                              <th className="p-2 text-left">Item</th>
                                              <th className="p-2 text-center">Status</th>
                                              <th className="p-2 text-left">Observação</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                          {doc.content.checklistItems.map((item: any, idx: number) => (
                                              <tr key={idx}>
                                                  <td className="p-2 font-medium">{item.desc}</td>
                                                  <td className="p-2 text-center">
                                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${item.status === 'ATENDE' ? 'bg-green-100 text-green-700' : item.status === 'NAO_ATENDE' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                                          {item.status}
                                                      </span>
                                                  </td>
                                                  <td className="p-2 text-gray-500 italic">{item.obs}</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          )}

                          {/* Signatures */}
                          {doc.signatures && doc.signatures.length > 0 && (
                              <div className="mt-8 pt-8 border-t border-gray-200">
                                  <h4 className="font-black text-xs uppercase mb-4 text-gray-500">Assinaturas Digitais</h4>
                                  <div className="grid grid-cols-2 gap-8">
                                      {doc.signatures.map(sig => (
                                          <div key={sig.id} className="text-center">
                                              <img src={sig.signatureData} alt="Assinatura" className="h-12 mx-auto mb-2" />
                                              <div className="border-t border-gray-300 w-3/4 mx-auto pt-1">
                                                  <p className="font-bold text-xs uppercase">{sig.name}</p>
                                                  <p className="text-[9px] text-gray-500 uppercase">{sig.matricula} - {sig.role}</p>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  </>
              )}
          </div>
      );
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-20 px-4">
      {/* Viewer Overlay */}
      {viewDoc && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col animate-fadeIn overflow-hidden">
            {/* Toolbar */}
            <div className="bg-white p-2 flex justify-between items-center shrink-0 shadow-md">
                <div className="flex items-center gap-2">
                    <button onClick={() => setViewDoc(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                    <div>
                        <h3 className="font-black text-sm uppercase">{viewDoc.type} - {viewDoc.header.om}</h3>
                        <p className="text-[10px] text-gray-500 font-bold">{new Date(viewDoc.createdAt).toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => window.print()} className="bg-vale-green text-white px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 hover:bg-[#00605d] transition-colors">
                        <Printer size={16}/> Imprimir / Salvar PDF
                    </button>
                </div>
            </div>
            
            {/* Content Container (Scrollable) */}
            <div className="flex-1 overflow-auto bg-gray-500 p-4 md:p-8 flex justify-center">
                {renderFullDocument(viewDoc)}
            </div>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
              <BackButton />
              <div className="bg-[#007e7a]/10 p-2 rounded-lg">
                  <ArchiveIcon size={24} className="text-[#007e7a]" />
              </div>
              <div>
                  <h2 className="text-xl font-bold text-gray-800 uppercase leading-none">Arquivo Digital</h2>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Histórico de Documentos</p>
              </div>
          </div>
          
          <div className="flex gap-2 mt-4 md:mt-0">
              <button 
                onClick={() => navigate('/trash')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs uppercase transition-colors"
              >
                  <Trash2 size={16} /> Lixeira ({trashCount})
              </button>
              {trashCount > 0 && (
                  <button onClick={handleDeleteAllVisible} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs uppercase transition-colors border border-red-200">
                      <Trash2 size={16} /> Mover Tudo p/ Lixeira
                  </button>
              )}
          </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 custom-scrollbar">
          {[
              { id: 'ARTS', label: 'ARTs Padrão', icon: <FileText size={16}/> },
              { id: 'DEMANDAS', label: 'ARTs Emergenciais', icon: <AlertOctagon size={16}/> },
              { id: 'CHECKLISTS', label: 'Checklists', icon: <CheckCircle size={16}/> },
              { id: 'RELATORIOS', label: 'Relatórios', icon: <Clipboard size={16}/> },
          ].map(tab => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                      flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase whitespace-nowrap transition-all shadow-sm
                      ${activeTab === tab.id 
                          ? 'bg-[#007e7a] text-white ring-2 ring-[#007e7a] ring-offset-2' 
                          : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'}
                  `}
              >
                  {tab.icon} {tab.label}
              </button>
          ))}
      </div>

      {/* Document Grid */}
      <div className="space-y-8">
          {recentDocs.length > 0 && (
              <section>
                  <h3 className="font-black text-sm text-gray-500 uppercase mb-4 flex items-center gap-2">
                      <Calendar size={16}/> Recentes
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                      {recentDocs.map(doc => (
                          <ListItem 
                              key={doc.id} 
                              doc={doc} 
                              isArchived={false} 
                              onView={setViewDoc} 
                              onShowQR={handleShowQR} 
                              onDownload={handleDownload} 
                              onDelete={handleDelete}
                          />
                      ))}
                  </div>
              </section>
          )}

          {archivedDocs.length > 0 && (
              <section>
                  <h3 className="font-black text-sm text-gray-500 uppercase mb-4 flex items-center gap-2 mt-8 border-t pt-8">
                      <ArchiveIcon size={16}/> Arquivados Antigos
                  </h3>
                  <div className="grid grid-cols-1 gap-3 opacity-80">
                      {archivedDocs.map(doc => (
                          <ListItem 
                              key={doc.id} 
                              doc={doc} 
                              isArchived={true} 
                              onView={setViewDoc} 
                              onShowQR={handleShowQR} 
                              onDownload={handleDownload} 
                              onDelete={handleDelete}
                          />
                      ))}
                  </div>
              </section>
          )}

          {recentDocs.length === 0 && archivedDocs.length === 0 && (
              <div className="py-20 text-center text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                  <ArchiveIcon size={48} className="mx-auto mb-3 opacity-20"/>
                  <p className="font-bold text-sm uppercase">Nenhum documento encontrado</p>
              </div>
          )}
      </div>

      {/* QR Modal */}
      {showQr && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowQr(null)}>
              <div className="bg-white p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
                  <h3 className="font-black text-lg text-gray-800 mb-4 uppercase">Código QR do Documento</h3>
                  <div className="bg-gray-100 p-4 rounded-xl mb-4 inline-block">
                      <QrCode size={150} className="text-gray-800"/>
                  </div>
                  <p className="text-xs font-bold text-gray-500 uppercase break-all">{showQr.id}</p>
                  <button onClick={() => setShowQr(null)} className="mt-6 w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-xs uppercase text-gray-600">Fechar</button>
              </div>
          </div>
      )}
    </div>
  );
};
