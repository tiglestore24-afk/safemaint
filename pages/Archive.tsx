
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { DocumentRecord, RegisteredART, OMRecord } from '../types';
import { Eye, Download, Trash2, X, FileText, CheckCircle, Clipboard, Filter, QrCode, Cloud, Archive as ArchiveIcon, Calendar, Hash, Tag, Printer, ShieldAlert, MapPin, AlertTriangle, AlertOctagon, Loader2, ExternalLink, Info, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { Logo } from '../components/Logo';

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
  onDelete: (e: React.MouseEvent, id: string) => void;
}

const ListItem: React.FC<ListItemProps> = ({ doc, isArchived, onView, onDelete }) => {
    const getTypeStyles = () => {
        if (isArchived) return { text: 'text-gray-400', bg: 'bg-gray-400', border: 'border-gray-200' };
        switch(doc.type) {
            case 'ART_EMERGENCIAL': return { text: 'text-red-600', bg: 'bg-red-600', border: 'border-red-100', icon: <AlertOctagon size={14}/> };
            case 'ART_ATIVIDADE': return { text: 'text-blue-600', bg: 'bg-blue-600', border: 'border-blue-100', icon: <FileText size={14}/> };
            case 'CHECKLIST': return { text: 'text-vale-green', bg: 'bg-vale-green', border: 'border-vale-green/20', icon: <CheckCircle size={14}/> };
            case 'RELATORIO': return { text: 'text-orange-500', bg: 'bg-orange-500', border: 'border-orange-100', icon: <Clipboard size={14}/> };
            case 'CRONOGRAMA': return { text: 'text-purple-600', bg: 'bg-purple-600', border: 'border-purple-100', icon: <Calendar size={14}/> };
            default: return { text: 'text-gray-600', bg: 'bg-gray-600', border: 'border-gray-100', icon: <FileText size={14}/> };
        }
    };
    const styles = getTypeStyles();
    return (
      <div onClick={() => onView(doc)} className={`group bg-white rounded-xl p-3 md:p-4 shadow-sm border transition-all flex flex-col md:flex-row items-center gap-3 cursor-pointer hover:shadow-md ${isArchived ? 'opacity-70 grayscale' : 'border-gray-100'} relative overflow-hidden`}>
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.bg}`}></div>
          <div className="flex flex-row md:flex-col items-center md:items-start justify-between w-full md:w-28 shrink-0 gap-2">
              <div className={`px-2 py-0.5 rounded-md ${styles.bg} bg-opacity-10 flex items-center gap-1.5`}><span className={`${styles.text}`}>{styles.icon}</span><span className={`text-[8px] font-black uppercase tracking-wider ${styles.text}`}>{doc.type.replace('ART_', '').replace('_', ' ')}</span></div>
              <span className="text-[9px] font-bold text-gray-400">{new Date(doc.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex flex-row items-center gap-4 w-full md:w-56 shrink-0 border-y md:border-y-0 md:border-x border-gray-100 py-2 md:py-0 md:px-4">
              <div><span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">OM/ID</span><span className="block text-sm font-black text-vale-blue leading-none">{doc.header.om || '---'}</span></div>
              <div><span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">TAG</span><span className="block text-sm font-black text-vale-green leading-none">{doc.header.tag || 'N/D'}</span></div>
          </div>
          <div className="flex-1 w-full overflow-hidden"><p className="text-[10px] font-bold text-gray-500 uppercase truncate group-hover:text-gray-700 transition-colors">{doc.header.description || 'Sem descrição'}</p></div>
          <div className="flex items-center gap-1 shrink-0 bg-gray-50 md:bg-transparent p-1.5 rounded-lg w-full md:w-auto justify-center"><button onClick={(e) => { e.stopPropagation(); onView(doc); }} className="p-2 text-gray-400 hover:text-vale-green rounded-lg hover:bg-gray-100"><Eye size={16} /></button><button onClick={(e) => onDelete(e, doc.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"><Trash2 size={16} /></button></div>
      </div>
    );
};

export const Archive: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ARTS' | 'DEMANDAS' | 'CHECKLISTS' | 'RELATORIOS' | 'CRONOGRAMAS'>('ARTS');
  const [recentDocs, setRecentDocs] = useState<DocumentRecord[]>([]);
  const [archivedDocs, setArchivedDocs] = useState<DocumentRecord[]>([]);
  const [viewDoc, setViewDoc] = useState<DocumentRecord | null>(null);
  const [docBlobUrl, setDocBlobUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  // States for Linked Data in Viewer
  const [linkedOM, setLinkedOM] = useState<OMRecord | null>(null);
  const [linkedART, setLinkedART] = useState<RegisteredART | null>(null);
  const [secondaryPdfUrl, setSecondaryPdfUrl] = useState<string | null>(null);
  const [isLoadingSecondary, setIsLoadingSecondary] = useState(false);

  const refreshDocs = () => {
    const allDocs = StorageService.getDocuments();
    let filtered = allDocs.filter(d => d.status !== 'LIXEIRA' && d.status !== 'RASCUNHO');
    if (activeTab === 'ARTS') filtered = filtered.filter(d => d.type === 'ART_ATIVIDADE');
    else if (activeTab === 'DEMANDAS') filtered = filtered.filter(d => d.type === 'ART_EMERGENCIAL');
    else if (activeTab === 'CHECKLISTS') filtered = filtered.filter(d => d.type === 'CHECKLIST');
    else if (activeTab === 'CRONOGRAMAS') filtered = filtered.filter(d => d.type === 'CRONOGRAMA');
    else filtered = filtered.filter(d => d.type === 'RELATORIO');
    
    // Sort logic
    setRecentDocs(filtered.filter(d => d.status !== 'ARQUIVADO').sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    // For Cronogramas, they are usually archived by default, so we check both
    if(activeTab === 'CRONOGRAMAS') {
        setRecentDocs(filtered.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setArchivedDocs([]);
    } else {
        setArchivedDocs(filtered.filter(d => d.status === 'ARQUIVADO').sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }
  };

  useEffect(() => {
    refreshDocs();
    window.addEventListener('safemaint_storage_update', refreshDocs);
    return () => window.removeEventListener('safemaint_storage_update', refreshDocs);
  }, [activeTab]);

  useEffect(() => {
      let activeUrl: string | null = null;
      const load = async () => {
          if (!viewDoc) {
              setDocBlobUrl(null);
              setLinkedOM(null);
              setLinkedART(null);
              setSecondaryPdfUrl(null);
              return;
          }

          // 1. Load Main File (if exists, e.g. for reports or manual uploads)
          const fileData = viewDoc.content?.manualFileUrl;
          if (fileData) {
              let finalData = fileData;
              if (finalData === 'TRUE') {
                  setIsLoadingPdf(true);
                  const remote = await StorageService.getRecordPdf('documents', viewDoc.id);
                  if (remote) finalData = remote;
                  setIsLoadingPdf(false);
              }
              if (finalData && finalData !== 'TRUE' && finalData.startsWith('data:application/pdf;base64,')) {
                  const byteCharacters = atob(finalData.split(',')[1]);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                  const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
                  activeUrl = URL.createObjectURL(blob);
                  setDocBlobUrl(activeUrl);
              } else { setDocBlobUrl(finalData); }
          }

          // 2. Load Metadata
          const oms = StorageService.getOMs();
          const arts = StorageService.getARTs();
          const foundOM = oms.find(o => o.omNumber === viewDoc.header.om);
          const foundART = arts.find(a => a.id === viewDoc.content?.linkedArtId || a.id === viewDoc.content?.artId);
          setLinkedOM(foundOM || null);
          setLinkedART(foundART || null);
      };
      load();
      return () => { if (activeUrl) URL.revokeObjectURL(activeUrl); };
  }, [viewDoc]);

  const viewSecondaryPdf = async (type: 'OM' | 'ART') => {
      if (secondaryPdfUrl) { URL.revokeObjectURL(secondaryPdfUrl); setSecondaryPdfUrl(null); }
      setIsLoadingSecondary(true);
      
      const target = type === 'OM' ? linkedOM : linkedART;
      if (!target) { setIsLoadingSecondary(false); return; }

      let pdfData = target.pdfUrl;
      if (!pdfData || pdfData === 'TRUE') {
          const table = type === 'OM' ? 'oms' : 'arts';
          pdfData = await StorageService.getRecordPdf(table as any, target.id);
      }

      if (pdfData && pdfData.startsWith('data:application/pdf;base64,')) {
          const byteCharacters = atob(pdfData.split(',')[1]);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
          const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setSecondaryPdfUrl(url);
      } else if (pdfData) {
          setSecondaryPdfUrl(pdfData);
      }
      setIsLoadingSecondary(false);
  };

  const renderFullDocument = (doc: DocumentRecord) => {
      // Caso Relatório ou Upload Manual, mostramos o visualizador de PDF diretamente
      if (doc.content?.isManualUpload && docBlobUrl) {
          return (
              <div className="flex flex-col h-full w-full bg-gray-100">
                  <div className="bg-gray-900 text-white p-4 flex justify-between items-center shrink-0 border-b border-gray-700 no-print">
                      <div><span className="font-black text-sm uppercase tracking-widest text-vale-green block mb-1">ARQUIVO ANEXADO</span><span className="font-bold text-xs uppercase flex gap-4">{doc.header.om && <span>OM: {doc.header.om}</span>} TAG: {doc.header.tag}</span></div>
                  </div>
                  <div className="flex-1 relative bg-black overflow-hidden h-full">
                      <iframe src={docBlobUrl} className="w-full h-full border-none" title="View" />
                  </div>
              </div>
          );
      }

      // === LAYOUT DE DOCUMENTO OFICIAL (A4) ===
      return (
          <div className="bg-white shadow-2xl mx-auto font-sans text-gray-900 border border-gray-200 print:border-none p-10 max-w-[21cm] w-full min-h-[29.7cm] flex flex-col mb-10 print:mb-0 print:shadow-none print:w-[210mm] print:h-[297mm] print:absolute print:top-0 print:left-0 print-area">
              
              {/* HEADER OFICIAL */}
              <div className="border-b-4 border-vale-green pb-4 mb-6 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                      <Logo size="lg" />
                      <div className="border-l-2 border-gray-300 pl-4 flex flex-col justify-center h-10">
                          <h1 className="text-xl font-black text-vale-darkgray uppercase leading-none tracking-tight">{doc.type.replace('_', ' ')}</h1>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">SISTEMA INTEGRADO DE GESTÃO</p>
                      </div>
                  </div>
                  <div className="text-right">
                      <div className="bg-gray-100 px-3 py-1 rounded mb-1 inline-block">
                          <span className="font-mono font-black text-lg text-gray-700">{doc.header.om || 'S/N'}</span>
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">{new Date(doc.createdAt).toLocaleDateString()} • {new Date(doc.createdAt).toLocaleTimeString().slice(0,5)}</p>
                  </div>
              </div>

              {/* CONTEÚDO PRINCIPAL */}
              <div className="flex-1 space-y-6">
                  
                  {/* IDENTIFICAÇÃO (GRID DENSO) */}
                  <div className="bg-gray-50 p-4 border border-gray-300 rounded-none print:border-gray-300">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">DADOS DA ATIVIDADE</h4>
                      <div className="grid grid-cols-4 gap-4">
                          <div className="col-span-1"><span className="text-[8px] font-bold text-gray-500 block uppercase">EQUIPAMENTO (TAG)</span><span className="font-black text-base text-vale-green">{doc.header.tag}</span></div>
                          <div className="col-span-1"><span className="text-[8px] font-bold text-gray-500 block uppercase">TIPO</span><span className="font-bold text-sm uppercase">{doc.header.type}</span></div>
                          <div className="col-span-2"><span className="text-[8px] font-bold text-gray-500 block uppercase">DESCRIÇÃO TÉCNICA</span><span className="font-bold text-sm uppercase leading-tight">{doc.header.description}</span></div>
                      </div>
                  </div>

                  {/* REFERÊNCIAS EXTERNAS (BOTÕES PARA PDF DA OM/ART) - OCULTO NA IMPRESSÃO */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 no-print">
                      {linkedOM && (
                          <button onClick={() => viewSecondaryPdf('OM')} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-all text-left">
                              <div className="flex items-center gap-3"><FileText size={20} className="text-red-600"/><div className="leading-none"><span className="text-[8px] font-black text-red-400 uppercase block mb-1">Ver Ordem Original</span><span className="text-xs font-black text-gray-700">OM {linkedOM.omNumber}</span></div></div>
                              <ExternalLink size={14} className="text-red-300"/>
                          </button>
                      )}
                      {linkedART && (
                          <button onClick={() => viewSecondaryPdf('ART')} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all text-left">
                              <div className="flex items-center gap-3"><BookOpen size={20} className="text-blue-600"/><div className="leading-none"><span className="text-[8px] font-black text-blue-400 uppercase block mb-1">Ver Procedimento Original</span><span className="text-xs font-black text-gray-700">ART {linkedART.code}</span></div></div>
                              <ExternalLink size={14} className="text-blue-300"/>
                          </button>
                      )}
                  </div>

                  {/* CRONOGRAMA */}
                  {doc.type === 'CRONOGRAMA' && doc.content?.items && (
                      <div className="avoid-break">
                          <h4 className="text-xs font-black text-gray-700 uppercase mb-2">ITENS PROGRAMADOS</h4>
                          <table className="w-full text-[9px] border border-gray-300 font-mono">
                              <thead className="bg-gray-100 font-black uppercase text-gray-600">
                                  <tr>
                                      <th className="p-2 border-r border-gray-300 text-left">DATA</th>
                                      <th className="p-2 border-r border-gray-300 text-left">OM</th>
                                      <th className="p-2 border-r border-gray-300 text-left w-1/3">DESCRIÇÃO</th>
                                      <th className="p-2 text-left">EXEC</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {doc.content.items.map((item: any, i:number) => (
                                      <tr key={i} className="border-b border-gray-200">
                                          <td className="p-1.5 border-r border-gray-200">{item.dateStart}</td>
                                          <td className="p-1.5 border-r border-gray-200 font-bold">{item.frotaOm}</td>
                                          <td className="p-1.5 border-r border-gray-200">{item.description}</td>
                                          <td className="p-1.5">{item.resources}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}

                  {/* ART EMERGENCIAL (MAPA DE RISCO) */}
                  {doc.type === 'ART_EMERGENCIAL' && doc.content?.quadrantRisks && (
                      <div className="space-y-6 border border-gray-300 p-4 avoid-break">
                          <h4 className="font-black text-xs text-red-600 uppercase flex items-center gap-2 border-b pb-2"><MapPin size={16}/> Mapeamento de Risco (APR)</h4>
                          <div className="flex flex-row gap-8 items-start justify-center">
                              {/* Radar Visual */}
                              <div className="relative w-40 h-40 border-2 border-gray-300 rounded-full flex items-center justify-center shrink-0">
                                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                                      <div className="border-r border-b border-gray-200 flex flex-col items-center justify-center p-2"><span className="text-[7px] font-black text-gray-400 absolute top-2">FRENTE</span>{doc.content.quadrantRisks['FRENTE']?.map((r: number) => <span key={r} className="w-4 h-4 bg-red-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white m-0.5">{r}</span>)}</div>
                                      <div className="border-b border-gray-200 flex flex-col items-center justify-center p-2"><span className="text-[7px] font-black text-gray-400 absolute top-2 right-2">DIREITA</span>{doc.content.quadrantRisks['DIREITA']?.map((r: number) => <span key={r} className="w-4 h-4 bg-red-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white m-0.5">{r}</span>)}</div>
                                      <div className="border-r border-gray-200 flex flex-col items-center justify-center p-2"><span className="text-[7px] font-black text-gray-400 absolute bottom-2 left-2">ESQUERDA</span>{doc.content.quadrantRisks['ESQUERDA']?.map((r: number) => <span key={r} className="w-4 h-4 bg-red-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white m-0.5">{r}</span>)}</div>
                                      <div className="flex flex-col items-center justify-center p-2"><span className="text-[7px] font-black text-gray-400 absolute bottom-2">TRÁS</span>{doc.content.quadrantRisks['TRAS']?.map((r: number) => <span key={r} className="w-4 h-4 bg-red-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white m-0.5">{r}</span>)}</div>
                                  </div>
                                  <div className="w-4 h-4 bg-gray-800 rounded-full z-10 border-2 border-white"></div>
                              </div>
                              {/* Lista de Riscos */}
                              <div className="flex-1 grid grid-cols-2 gap-2">
                                  {Object.entries(doc.content.checklistRisks || {}).filter(([,v]:any) => v.checked).map(([id, v]:any) => (
                                      <div key={id} className="text-[9px] border border-red-200 p-2 rounded bg-red-50/50">
                                          <p className="font-black text-red-700 uppercase leading-tight">#{id} {RISK_LIST[parseInt(id)-1]}</p>
                                          {v.control && <p className="text-gray-600 font-bold mt-1 uppercase italic border-l-2 border-red-300 pl-1 ml-1">CTRL: {v.control}</p>}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}

                  {/* CHECKLIST - FORMATO 2 COLUNAS OTIMIZADO */}
                  {doc.type === 'CHECKLIST' && doc.content?.checklistItems && (
                      <div className="avoid-break">
                        <div className="bg-gray-100 p-2 font-black text-xs text-gray-700 uppercase border border-gray-300 border-b-0">VERIFICAÇÃO DE ITENS</div>
                        {/* Grid container para simular 2 colunas na impressão */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 border border-gray-300 p-0">
                            {/* Dividir itens em duas colunas lógicas se houver muitos */}
                            {Array.from({ length: 2 }).map((_, colIndex) => {
                                const itemsPerCol = Math.ceil(doc.content.checklistItems.length / 2);
                                const colItems = doc.content.checklistItems.slice(colIndex * itemsPerCol, (colIndex + 1) * itemsPerCol);
                                
                                return (
                                    <table key={colIndex} className="w-full text-[9px] border-collapse h-fit">
                                        <thead className="bg-gray-50 border-b border-gray-300">
                                            <tr>
                                                <th className="p-1.5 text-left border-r border-gray-200 w-8">ID</th>
                                                <th className="p-1.5 text-left border-r border-gray-200">ITEM</th>
                                                <th className="p-1.5 text-center w-12">ST</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {colItems.map((item: any, idx: number) => (
                                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                                                    <td className="p-1.5 font-bold text-gray-400 border-r border-gray-200 text-center">{item.id || item.legacyId}</td>
                                                    <td className="p-1.5 font-bold text-gray-700 border-r border-gray-200 leading-tight">
                                                        {item.desc}
                                                        {item.obs && <div className="text-[8px] text-red-600 italic mt-0.5 border-l-2 border-red-300 pl-1">{item.obs}</div>}
                                                    </td>
                                                    <td className="p-1.5 text-center">
                                                        {item.status === 'ATENDE' ? (
                                                            <span className="font-black text-green-700">OK</span>
                                                        ) : item.status === 'NAO_ATENDE' ? (
                                                            <span className="font-black text-white bg-red-600 px-1 rounded">NOK</span>
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                );
                            })}
                        </div>
                      </div>
                  )}

                  {/* RELATORIO DETALHADO */}
                  {doc.type === 'RELATORIO' && !doc.content?.isManualUpload && (
                      <div className="space-y-4 avoid-break">
                          <div className="p-4 border border-gray-300 bg-white rounded-none">
                              <h5 className="font-black text-[10px] text-gray-400 uppercase mb-2 border-b pb-1">DESCRIÇÃO DA ATIVIDADE</h5>
                              <div className="whitespace-pre-wrap font-mono text-[10px] text-gray-800 leading-relaxed uppercase">
                                  {doc.content.activities || doc.content.rawText}
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 border border-gray-300 bg-white">
                                  <h5 className="font-black text-[10px] text-gray-400 uppercase mb-1">MOTIVO PARADA</h5>
                                  <p className="font-bold text-[10px] uppercase">{doc.content.stopReason || 'N/A'}</p>
                              </div>
                              <div className="p-3 border border-gray-300 bg-white">
                                  <h5 className="font-black text-[10px] text-gray-400 uppercase mb-1">TEMPO TOTAL</h5>
                                  <p className="font-black text-sm uppercase">{doc.content.duration || '00:00'}</p>
                              </div>
                          </div>

                          {doc.content.pendings && (
                              <div className="p-3 border border-red-200 bg-red-50">
                                  <h4 className="text-[10px] font-black text-red-600 uppercase mb-1">PENDÊNCIAS TÉCNICAS</h4>
                                  <p className="text-[10px] font-bold text-red-800 uppercase leading-tight">{doc.content.pendings}</p>
                              </div>
                          )}
                      </div>
                  )}

                  {/* ASSINATURAS (LAYOUT COMPACTO DE RODAPÉ) */}
                  {doc.signatures && doc.signatures.length > 0 && (
                      <div className="mt-8 pt-4 border-t-2 border-gray-300 avoid-break">
                          <h4 className="font-black text-[9px] uppercase mb-4 text-gray-400 tracking-widest">RESPONSABILIDADE TÉCNICA E EXECUÇÃO</h4>
                          <div className="flex flex-wrap gap-8 justify-between items-end">
                              {doc.signatures.map(sig => (
                                  <div key={sig.id} className="text-center min-w-[120px]">
                                      <div className="h-10 flex items-end justify-center mb-1">
                                          <img src={sig.signatureData} alt="Sig" className="max-h-full opacity-90" />
                                      </div>
                                      <div className="border-t border-gray-400 pt-1">
                                          <p className="font-black text-[9px] uppercase text-gray-900 leading-none">{sig.name}</p>
                                          <p className="text-[7px] font-bold text-gray-500 uppercase">{sig.matricula} • {sig.function}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
              
              {/* FOOTER OFICIAL */}
              <div className="mt-auto pt-2 border-t border-gray-300 text-[8px] text-gray-400 font-bold uppercase flex justify-between shrink-0">
                  <span>SAFEMAINT V4 • SISTEMA DE GESTÃO DE ATIVOS</span>
                  <span>ID: {doc.id.split('-')[0].toUpperCase()} | PÁGINA 1/1</span>
              </div>
          </div>
      );
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-20 px-4">
      {/* MODAL PRINCIPAL DE VISUALIZAÇÃO */}
      {viewDoc && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-fadeIn h-[100dvh] overflow-hidden">
            <div className="bg-white p-3 flex justify-between items-center shrink-0 shadow-md border-b border-gray-200 relative z-[110] no-print">
                <div className="flex items-center gap-3">
                    <button onClick={() => setViewDoc(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} className="text-gray-600"/></button>
                    <div><h3 className="font-black text-sm uppercase text-gray-800 leading-tight">{viewDoc.type.replace('_', ' ')} - {viewDoc.header.om}</h3><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(viewDoc.createdAt).toLocaleString()}</p></div>
                </div>
                <div className="flex gap-2">
                    {docBlobUrl && (
                        <a href={docBlobUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white p-3 rounded-xl md:hidden shadow-lg" title="Abrir em Nova Aba">
                            <ExternalLink size={20}/>
                        </a>
                    )}
                    <button onClick={() => window.print()} className="bg-vale-green text-white px-8 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 hover:bg-[#00605d] shadow-lg active:scale-95 transition-all"><Printer size={18}/> Imprimir</button>
                </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-gray-100 p-2 md:p-10 flex flex-col items-center custom-scrollbar print:bg-white print:p-0 print:block">
                {isLoadingPdf ? (
                    <div className="flex flex-col items-center justify-center h-full text-vale-green">
                        <Loader2 size={64} className="animate-spin mb-4" />
                        <h4 className="font-black text-sm uppercase tracking-[0.2em]">Processando Arquivo...</h4>
                    </div>
                ) : renderFullDocument(viewDoc)}
            </div>

            {/* VIEWER SECUNDÁRIO (OM/ART ORIGINAIS) */}
            {secondaryPdfUrl && (
                <div className="absolute inset-0 z-[120] bg-black/90 flex flex-col animate-fadeIn h-full overflow-hidden no-print">
                    <div className="bg-gray-900 text-white p-3 flex justify-between items-center shrink-0 border-b border-gray-700">
                        <div className="flex items-center gap-3"><FileText size={20} className="text-vale-green"/><div><h3 className="font-black text-xs uppercase">Documento Original Vinculado</h3></div></div>
                        <div className="flex gap-2">
                            <a href={secondaryPdfUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-600 p-2 rounded hover:bg-blue-700 transition-colors"><ExternalLink size={16}/></a>
                            <button onClick={() => { setSecondaryPdfUrl(null); }} className="p-2 bg-white/10 rounded hover:bg-red-600 transition-colors"><X size={16}/></button>
                        </div>
                    </div>
                    <div className="flex-1 relative bg-black h-full">
                        <iframe src={secondaryPdfUrl} className="w-full h-full border-none" title="Secondary Viewer" />
                    </div>
                </div>
            )}
        </div>
      )}

      {/* CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-5 rounded-2xl shadow-sm border border-gray-200 gap-4 no-print">
          <div className="flex items-center gap-3">
              <BackButton />
              <div className="bg-[#007e7a]/10 p-2 rounded-xl"><ArchiveIcon size={28} className="text-[#007e7a]" /></div>
              <div><h2 className="text-2xl font-black text-gray-800 uppercase leading-none tracking-tighter">Arquivo Digital</h2><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Repositório de Liberações de Manutenção</p></div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
              <button onClick={() => navigate('/trash')} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-black text-[10px] uppercase transition-all shadow-sm border border-gray-200 hover:bg-gray-200">Gerenciar Lixeira</button>
          </div>
      </div>

      {/* NAVEGAÇÃO DE CATEGORIAS */}
      <div className="flex overflow-x-auto gap-2 mb-8 pb-2 custom-scrollbar no-print">
          {[
              { id: 'ARTS', label: 'ARTS PADRÃO', icon: <FileText size={16}/> },
              { id: 'DEMANDAS', label: 'ARTS EMERGENCIAIS', icon: <AlertTriangle size={16}/> },
              { id: 'CHECKLISTS', label: 'CHECKLISTS', icon: <CheckCircle size={16}/> },
              { id: 'RELATORIOS', label: 'RELATÓRIOS', icon: <Clipboard size={16}/> },
              { id: 'CRONOGRAMAS', label: 'PROGRAMAÇÃO', icon: <Calendar size={16}/> },
          ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-[10px] uppercase transition-all shadow-sm border whitespace-nowrap ${activeTab === tab.id ? 'bg-[#007e7a] text-white border-[#007e7a] shadow-lg shadow-teal-100 translate-y-[-2px]' : 'bg-white text-gray-400 border-gray-100 hover:text-gray-700 hover:border-gray-300'}`}
              >
                  {tab.icon} {tab.label}
              </button>
          ))}
      </div>

      {/* LISTAGEM DE DOCUMENTOS */}
      <div className="space-y-3 animate-fadeIn no-print">
          {recentDocs.length === 0 && archivedDocs.length === 0 ? (
              <div className="py-32 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-4">
                  <div className="bg-gray-50 p-6 rounded-full"><ArchiveIcon size={48} className="opacity-10 text-gray-800"/></div>
                  <div><p className="font-black text-sm text-gray-300 uppercase tracking-widest leading-none">Biblioteca Vazia</p><p className="text-[10px] font-bold text-gray-400 uppercase mt-2">Nenhum documento arquivado nesta categoria</p></div>
              </div>
          ) : (
              <div className="grid grid-cols-1 gap-3">
                {[...recentDocs, ...archivedDocs].map(doc => (
                    <ListItem 
                        key={doc.id} 
                        doc={doc} 
                        isArchived={doc.status === 'ARQUIVADO'} 
                        onView={setViewDoc} 
                        onDelete={(e,id) => {
                            e.stopPropagation(); 
                            if(confirm('MOVER DOCUMENTO PARA A LIXEIRA?')) StorageService.moveToTrash(id);
                        }} 
                    />
                ))}
              </div>
          )}
      </div>
    </div>
  );
};
