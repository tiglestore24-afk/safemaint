
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { DocumentRecord } from '../types';
import { Trash2, RotateCcw, XCircle, ArrowLeft, Eye, X, Printer, Loader2, ExternalLink, MapPin, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';

const RISK_LIST = [
    "CONTATO COM SUPERFÍCIES CORTANTES/PERFURANTE", "PRENSAMENTO DE DEDOS OU MÃOS", "QUEDA DE PEÇAS/ESTRUTURAS/EQUIPAMENTOS",
    "PRENSAMENTO OU AGARRAMENTO DO CORPO", "ATROPELAMENTO/ESMAGAMENTO POR VEÍCULOS", "QUEDA, TROPEÇO OU ESCORREGÃO",
    "ANIMAIS PEÇONHENTOS/INSETOS", "DESMORONAMENTOS DE PILHAS", "QUEDA DE PLATAFORMA OU ESCADAS", "ARCO E/OU CHOQUE ELÉTRICO",
    "FONTES DE ENERGIA (HIDRÁULICA, PNEUMÁTICA)", "EXPOSIÇÃO A VAPORES, CONDENSADOS OU QUENTES", "GASES, VAPORES, POEIRAS OU FUMOS",
    "PRODUTOS QUÍMICOS OU QUEIMADURAS", "PROJEÇÃO DE MATERIAIS NA FACE/OLHOS", "CONDIÇÕES CLIMÁTICAS ADVERSAS",
    "QUEDA DE HOMEM AO MAR/AFOGAMENTO", "INTERFERÊNCIA ENTRE EQUIPES", "EXCESSO OU DEFICIÊNCIA DE ILUMINAÇÃO", "OUTRAS SITUAÇÕES DE RISCO"
];

export const Trash: React.FC = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  
  // View States
  const [viewDoc, setViewDoc] = useState<DocumentRecord | null>(null);
  const [docBlobUrl, setDocBlobUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  useEffect(() => {
    refreshDocs();
    window.addEventListener('safemaint_storage_update', refreshDocs);
    return () => window.removeEventListener('safemaint_storage_update', refreshDocs);
  }, []);

  const refreshDocs = () => {
    const allDocs = StorageService.getDocuments();
    const trashDocs = allDocs.filter(d => d.status === 'LIXEIRA');
    setDocs(trashDocs);
  };

  // Carregamento de PDF para visualização
  useEffect(() => {
      let activeUrl: string | null = null;
      const load = async () => {
          if (!viewDoc) {
              setDocBlobUrl(null);
              return;
          }

          // Load Manual File if exists
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
      };
      load();
      return () => { if (activeUrl) URL.revokeObjectURL(activeUrl); };
  }, [viewDoc]);

  const handleRestore = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(window.confirm("Restaurar este documento para o arquivo?")) {
        setDocs(prev => prev.filter(d => d.id !== id));
        StorageService.restoreFromTrash(id);
        if(viewDoc?.id === id) setViewDoc(null);
    }
  };

  const handlePermanentDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(window.confirm("ATENÇÃO: EXCLUSÃO PERMANENTE.\n\nDeseja realmente apagar este registro para sempre?")) {
        setDocs(prev => prev.filter(d => d.id !== id));
        StorageService.deletePermanently(id);
        if(viewDoc?.id === id) setViewDoc(null);
    }
  };

  const handleEmptyTrash = () => {
      if(docs.length === 0) return;
      if(window.confirm("VOCÊ TEM CERTEZA QUE DESEJA ESVAZIAR A LIXEIRA?\n\nTODOS os arquivos serão excluídos permanentemente. Essa ação NÃO pode ser desfeita.")) {
          setDocs([]);
          StorageService.emptyTrash();
          setViewDoc(null);
      }
  };

  const renderFullDocument = (doc: DocumentRecord) => {
      // Reutiliza lógica de visualização (Simplificada para a Lixeira)
      const primarySigner = doc.signatures && doc.signatures.length > 0 ? doc.signatures[0] : null;

      if (doc.content?.isManualUpload && docBlobUrl) {
          return (
              <div className="flex flex-col h-full w-full bg-gray-100">
                  <div className="bg-red-900 text-white p-4 flex justify-between items-center shrink-0 border-b border-red-700">
                      <div><span className="font-black text-sm uppercase tracking-widest text-white block mb-1">VISUALIZAÇÃO DE LIXEIRA</span></div>
                  </div>
                  <div className="flex-1 relative bg-black overflow-hidden h-full">
                      <iframe src={docBlobUrl} className="w-full h-full border-none" title="View" />
                  </div>
              </div>
          );
      }

      return (
          <div className="bg-white shadow-2xl mx-auto font-sans text-gray-900 border border-gray-200 p-10 max-w-[21cm] w-full min-h-[29.7cm] flex flex-col mb-10 relative opacity-90">
              {/* Marca d'água LIXEIRA */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <span className="text-[120px] font-black text-red-500 opacity-10 rotate-45 border-4 border-red-500 p-10 rounded-xl">LIXEIRA</span>
              </div>

              <div className="border-b-4 border-gray-400 pb-4 mb-6 flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-4 grayscale opacity-70">
                      <Logo size="lg" />
                      <div className="border-l-2 border-gray-300 pl-4 flex flex-col justify-center h-10">
                          <h1 className="text-xl font-black text-gray-600 uppercase leading-none tracking-tight">{doc.type.replace('_', ' ')}</h1>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">DOCUMENTO DESCARTADO</p>
                      </div>
                  </div>
                  <div className="text-right">
                      <div className="bg-red-100 px-3 py-1 rounded mb-1 inline-block">
                          <span className="font-mono font-black text-lg text-red-700">{doc.header.om || 'S/N'}</span>
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">{new Date(doc.createdAt).toLocaleDateString()}</p>
                  </div>
              </div>

              <div className="flex-1 space-y-6 relative z-10">
                  <div className="bg-gray-50 p-4 border border-gray-300 rounded-none">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">DADOS ORIGINAIS</h4>
                      <div className="grid grid-cols-4 gap-4">
                          <div className="col-span-1"><span className="text-[8px] font-bold text-gray-500 block uppercase">TAG</span><span className="font-black text-base text-gray-700">{doc.header.tag}</span></div>
                          <div className="col-span-3"><span className="text-[8px] font-bold text-gray-500 block uppercase">DESCRIÇÃO</span><span className="font-bold text-sm uppercase leading-tight">{doc.header.description}</span></div>
                      </div>
                  </div>

                  {/* Conteúdo Simplificado para Visualização Rápida */}
                  <div className="p-4 border border-gray-200">
                      <p className="text-center text-gray-400 text-xs font-bold uppercase italic">Detalhes completos disponíveis após restauração.</p>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="max-w-6xl mx-auto pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-gray-300 pb-4 gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
             <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                    <Trash2 className="text-red-600" />
                    Lixeira
                </h2>
                <p className="text-xs font-bold text-gray-400 uppercase">Itens excluídos (Recuperáveis)</p>
            </div>
        </div>
        
        {docs.length > 0 && (
            <button 
                onClick={handleEmptyTrash}
                className="w-full md:w-auto bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 px-6 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
                <XCircle size={18} />
                EXCLUIR TUDO (ESVAZIAR)
            </button>
        )}
      </div>
      
      {/* TABLE */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200 mb-10">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Documento</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Detalhes</th>
                    <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {docs.length === 0 && (
                    <tr>
                        <td colSpan={3} className="p-20 text-center text-gray-400 font-bold italic">
                            <div className="flex flex-col items-center justify-center gap-4">
                                <Trash2 size={64} className="opacity-10" />
                                <span className="text-sm uppercase tracking-widest">A lixeira está vazia</span>
                            </div>
                        </td>
                    </tr>
                )}
                {docs.map(doc => (
                    <tr key={doc.id} className="hover:bg-red-50/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <span className="font-black text-gray-800 text-xs block">{doc.type.replace('_', ' ')}</span>
                                    <span className="text-[10px] font-bold text-gray-400">{new Date(doc.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                             <div className="text-sm font-bold text-gray-900">{doc.header.om || 'SEM OM'}</div>
                             <div className="text-xs font-bold text-gray-500">{doc.header.tag}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                                <button 
                                    onClick={() => setViewDoc(doc)} 
                                    className="p-2 bg-gray-100 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Visualizar"
                                >
                                    <Eye size={18} />
                                </button>
                                <button 
                                    onClick={(e) => handleRestore(e, doc.id)} 
                                    className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                    title="Restaurar"
                                >
                                    <RotateCcw size={18} />
                                </button>
                                <button 
                                    onClick={(e) => handlePermanentDelete(e, doc.id)} 
                                    className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                    title="Excluir Definitivamente"
                                >
                                    <XCircle size={18} />
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* VIEWER MODAL */}
      {viewDoc && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-fadeIn h-[100dvh] overflow-hidden">
            <div className="bg-gray-900 p-3 flex justify-between items-center shrink-0 border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <button onClick={() => setViewDoc(null)} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"><X size={24}/></button>
                    <div>
                        <h3 className="font-black text-sm uppercase text-white leading-tight">LIXEIRA: {viewDoc.type.replace('_', ' ')}</h3>
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">DOCUMENTO EM PROCESSO DE EXCLUSÃO</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={(e) => handleRestore(e, viewDoc.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-black text-xs uppercase flex items-center gap-2"
                    >
                        <RotateCcw size={16}/> RESTAURAR
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-gray-800 p-2 md:p-10 flex flex-col items-center custom-scrollbar">
                {isLoadingPdf ? (
                    <div className="flex flex-col items-center justify-center h-full text-white">
                        <Loader2 size={64} className="animate-spin mb-4 text-red-500" />
                        <h4 className="font-black text-sm uppercase tracking-[0.2em]">Carregando Pré-visualização...</h4>
                    </div>
                ) : renderFullDocument(viewDoc)}
            </div>
        </div>
      )}
    </div>
  );
};
