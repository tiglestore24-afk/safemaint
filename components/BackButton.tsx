
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const BackButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const navigate = useNavigate();
  return (
    <button 
        onClick={() => navigate(-1)} 
        className={`group flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-xl transition-all shadow-sm border border-gray-300 text-vale-darkgray active:scale-95 ${className}`}
        title="Voltar para página anterior"
    >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform text-vale-green" strokeWidth={3} />
        <span className="font-black text-xs uppercase tracking-wider hidden md:inline-block">Voltar</span>
    </button>
  );
};
