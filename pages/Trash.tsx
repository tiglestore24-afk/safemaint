
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { DocumentRecord } from '../types';
import { Trash2, RotateCcw, XCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Trash: React.FC = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocumentRecord[]>([]);

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

  const handleRestore = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    // 1. Atualização Otimista (Visual Imediato)
    setDocs(prev => prev.filter(d => d.id !== id));

    // 2. Executa Lógica
    StorageService.restoreFromTrash(id);
  };

  const handlePermanentDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    // Confirmação de Segurança
    if(window.confirm("VOCÊ TEM CERTEZA QUE DESEJA EXCLUIR PERMANENTEMENTE?")) {
        // 1. Atualização Otimista (Visual Imediato)
        setDocs(prev => prev.filter(d => d.id !== id));
        
        // 2. Executa Lógica
        StorageService.deletePermanently(id);
    }
  };

  const handleEmptyTrash = () => {
      if(docs.length === 0) return;
      
      // Confirmação de Segurança
      if(window.confirm("VOCÊ TEM CERTEZA QUE DESEJA ESVAZIAR A LIXEIRA? ESSA AÇÃO NÃO PODE SER DESFEITA.")) {
          // 1. Atualização Otimista (Visual Imediato)
          setDocs([]);
          
          // 2. Executa Lógica
          StorageService.emptyTrash();
      }
  };

  return (
    <div className="max-w-6xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
        <div className="flex items-center gap-3">
             <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                    <Trash2 className="text-red-600" />
                    Lixeira
                </h2>
                <p className="text-xs font-bold text-gray-400 uppercase">Itens aguardando exclusão definitiva</p>
            </div>
        </div>
        
        {docs.length > 0 && (
            <button 
                onClick={handleEmptyTrash}
                className="bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 px-4 py-2 rounded-lg font-black text-xs flex items-center gap-2 transition-colors"
            >
                <XCircle size={16} />
                EXCLUIR LIXEIRA AGORA
            </button>
        )}
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200 mb-10">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Documento</th>
                    <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Detalhes</th>
                    <th className="px-6 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {docs.length === 0 && (
                    <tr>
                        <td colSpan={3} className="p-12 text-center text-gray-400 font-bold italic flex flex-col items-center justify-center gap-2">
                            <Trash2 size={48} className="opacity-20" />
                            LIXEIRA VAZIA
                        </td>
                    </tr>
                )}
                {docs.map(doc => (
                    <tr key={doc.id} className="hover:bg-red-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-black text-gray-800 bg-gray-200 px-2 py-1 rounded text-xs">{doc.type.replace('_', ' ')}</span>
                            <br/>
                            <span className="text-[10px] font-bold text-gray-400 mt-1 block">{new Date(doc.createdAt).toLocaleDateString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                             <div className="text-sm font-bold text-gray-900">{doc.header.om || 'SEM OM'}</div>
                             <div className="text-xs font-bold text-gray-500">{doc.header.tag}</div>
                             {doc.content?.isBackup && <span className="text-[10px] text-blue-600 font-black">BACKUP AUTOMÁTICO</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button 
                                onClick={(e) => handleRestore(e, doc.id)} 
                                className="text-green-600 hover:text-green-800 mr-4 font-bold flex items-center gap-1 inline-flex"
                                title="Restaurar"
                            >
                                <RotateCcw size={16} /> RECUPERAR
                            </button>
                            <button 
                                onClick={(e) => handlePermanentDelete(e, doc.id)} 
                                className="text-red-600 hover:text-red-800 font-black flex items-center gap-1 inline-flex"
                                title="Excluir Definitivamente"
                            >
                                <XCircle size={16} /> EXCLUIR
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* BOTÃO FLUTUANTE DE ESVAZIAR - MAIS PROEMINENTE */}
      {docs.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
            <button 
                onClick={handleEmptyTrash}
                className="bg-red-600 hover:bg-red-700 text-white px-6 md:px-8 py-4 rounded-full shadow-2xl font-black text-base md:text-lg flex items-center justify-center gap-3 transform transition hover:scale-105 border-4 border-white animate-pulse"
            >
                <Trash2 size={24} />
                EXCLUIR LIXEIRA (LIMPAR TUDO)
            </button>
        </div>
      )}
    </div>
  );
};