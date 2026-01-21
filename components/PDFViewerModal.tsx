
import React, { useEffect, useState, useRef } from 'react';
import { X, ExternalLink, Loader2, AlertTriangle, FileText, Download, CheckCircle, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { StorageService } from '../services/storage';
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do Worker do PDF.js
const pdfjs = (pdfjsLib as any).default || pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileUrl?: string; // Pode ser Base64, 'TRUE' (marcador) ou URL
  recordId?: string; // ID para buscar no banco se fileUrl for 'TRUE'
  table?: 'oms' | 'arts' | 'documents'; // Tabela para busca
  onConfirm?: () => void; // Ação de validação (Opcional)
  confirmLabel?: string; // Texto do botão de validação
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  fileUrl, 
  recordId, 
  table = 'oms',
  onConfirm,
  confirmLabel = "LI, COMPREENDI E VALIDO ESTE DOCUMENTO"
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null); // Para download externo

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // 1. CARREGAMENTO DO DOCUMENTO
  useEffect(() => {
    if (!isOpen) {
        // Reset states on close
        setPdfDoc(null);
        setPageNum(1);
        setScale(1.0);
        setRotation(0);
        setBlobUrl(null);
        return;
    }

    const loadPdf = async () => {
        setIsLoading(true);
        setError(false);
        try {
            let data = fileUrl;

            // Busca sob demanda se for apenas um marcador
            if ((!data || data === 'TRUE') && recordId) {
                const remoteData = await StorageService.getRecordPdf(table as 'oms' | 'arts' | 'documents', recordId);
                if (remoteData) data = remoteData;
                else throw new Error("Documento não encontrado no servidor.");
            }

            if (!data) throw new Error("Dados do arquivo vazios.");

            // Prepara dados para o PDF.js
            let loadingTask;
            if (data.startsWith('data:application/pdf;base64,')) {
                const base64 = data.split(',')[1];
                const binaryString = atob(base64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                loadingTask = pdfjs.getDocument({ data: bytes });
                
                // Cria Blob URL apenas para o botão de download
                const blob = new Blob([bytes], { type: 'application/pdf' });
                setBlobUrl(URL.createObjectURL(blob));
            } else {
                loadingTask = pdfjs.getDocument(data);
                setBlobUrl(data);
            }

            const doc = await loadingTask.promise;
            setPdfDoc(doc);
            setNumPages(doc.numPages);
            setPageNum(1);
        } catch (err) {
            console.error("Erro ao carregar PDF:", err);
            setError(true);
        } finally {
            setIsLoading(false);
        }
    };

    loadPdf();
  }, [isOpen, fileUrl, recordId, table]);

  // 2. RENDERIZAÇÃO DA PÁGINA
  useEffect(() => {
      const renderPage = async () => {
          if (!pdfDoc || !canvasRef.current) return;

          // Cancela renderização anterior se houver (para zoom rápido)
          if (renderTaskRef.current) {
              renderTaskRef.current.cancel();
          }

          try {
              const page = await pdfDoc.getPage(pageNum);
              
              // Ajusta escala para telas pequenas se for o zoom inicial
              const viewport = page.getViewport({ scale: scale, rotation: rotation });
              const canvas = canvasRef.current;
              const context = canvas.getContext('2d');

              canvas.height = viewport.height;
              canvas.width = viewport.width;

              const renderContext = {
                  canvasContext: context!,
                  viewport: viewport,
              };

              const renderTask = page.render(renderContext);
              renderTaskRef.current = renderTask;
              await renderTask.promise;
          } catch (e: any) {
              if (e.name !== 'RenderingCancelledException') {
                  console.error("Erro renderização:", e);
              }
          }
      };

      renderPage();
  }, [pdfDoc, pageNum, scale, rotation]);

  // 3. CONTROLES
  const changePage = (delta: number) => {
      const newPage = pageNum + delta;
      if (newPage >= 1 && newPage <= numPages) setPageNum(newPage);
  };

  const zoom = (factor: number) => {
      setScale(prev => Math.max(0.5, Math.min(3.0, prev + factor)));
  };

  const rotate = () => {
      setRotation(prev => (prev + 90) % 360);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col animate-fadeIn h-[100dvh] w-screen overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 px-4 py-3 flex justify-between items-center text-white shrink-0 border-b border-gray-700 shadow-md safe-area-top">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-[#007e7a] text-white p-2 rounded-lg shrink-0">
                    <FileText size={20} />
                </div>
                <div className="min-w-0">
                    <span className="font-black text-[10px] text-gray-400 uppercase tracking-wide block">VISUALIZADOR PDF</span>
                    <span className="font-bold text-sm text-white uppercase tracking-wider truncate block">{title}</span>
                </div>
            </div>
            <div className="flex gap-2 shrink-0">
                {blobUrl && (
                    <a 
                        href={blobUrl} 
                        download={`DOC-${title.replace(/[^a-z0-9]/gi, '_')}.pdf`}
                        className="p-2 bg-gray-800 hover:bg-blue-600 text-white rounded-lg transition-all"
                        title="Baixar Arquivo"
                    >
                        <Download size={20}/>
                    </a>
                )}
                <button onClick={onClose} className="p-2 bg-gray-800 hover:bg-red-600 text-white rounded-lg transition-all">
                    <X size={20}/>
                </button>
            </div>
        </div>
        
        {/* Toolbar */}
        {!isLoading && !error && (
            <div className="bg-gray-800 p-2 flex items-center justify-center gap-4 border-b border-gray-700 shrink-0 overflow-x-auto">
                <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1">
                    <button onClick={() => changePage(-1)} disabled={pageNum <= 1} className="p-2 text-white hover:bg-gray-700 rounded disabled:opacity-30"><ChevronLeft size={18}/></button>
                    <span className="text-xs font-bold text-white min-w-[60px] text-center">{pageNum} / {numPages}</span>
                    <button onClick={() => changePage(1)} disabled={pageNum >= numPages} className="p-2 text-white hover:bg-gray-700 rounded disabled:opacity-30"><ChevronRight size={18}/></button>
                </div>
                <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1">
                    <button onClick={() => zoom(-0.2)} className="p-2 text-white hover:bg-gray-700 rounded" title="Zoom Out"><ZoomOut size={18}/></button>
                    <span className="text-xs font-bold text-white min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={() => zoom(0.2)} className="p-2 text-white hover:bg-gray-700 rounded" title="Zoom In"><ZoomIn size={18}/></button>
                </div>
                <button onClick={rotate} className="p-2 bg-black/30 hover:bg-gray-700 text-white rounded-lg" title="Girar"><RotateCw size={18}/></button>
            </div>
        )}

        {/* Content Body */}
        <div className="flex-1 bg-gray-500/10 relative overflow-auto flex justify-center items-start p-4 custom-scrollbar">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Loader2 size={48} className="text-[#007e7a] animate-spin mb-4" />
                    <h4 className="font-black text-xs uppercase tracking-widest">PROCESSANDO ARQUIVO...</h4>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                    <div className="bg-red-500/10 p-4 rounded-full">
                        <AlertTriangle size={48} className="text-red-500" />
                    </div>
                    <div className="text-center">
                        <h4 className="font-black text-sm text-red-400 uppercase tracking-widest">ERRO AO CARREGAR</h4>
                        <p className="text-xs mt-1">O arquivo pode ter sido movido ou corrompido.</p>
                    </div>
                    <button onClick={onClose} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold text-xs uppercase">Fechar</button>
                </div>
            ) : (
                <div className="shadow-2xl transition-transform duration-200 ease-out">
                    <canvas ref={canvasRef} className="bg-white block max-w-none" />
                </div>
            )}
        </div>

        {/* Footer Action Bar (Validation) */}
        {onConfirm && !isLoading && !error && (
            <div className="bg-gray-900 border-t border-gray-800 p-4 shrink-0 flex justify-center safe-area-bottom">
                <button 
                    onClick={onConfirm}
                    className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-green-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <CheckCircle size={18} />
                    {confirmLabel}
                </button>
            </div>
        )}
    </div>
  );
};
