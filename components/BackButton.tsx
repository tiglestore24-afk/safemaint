
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const BackButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const navigate = useNavigate();
  return (
    <button 
        onClick={() => navigate(-1)} 
        className={`p-2 bg-white hover:bg-gray-100 rounded-full transition-colors shadow-sm border border-gray-200 text-gray-600 ${className}`}
        title="Voltar"
    >
        <ArrowLeft size={20} />
    </button>
  );
};
