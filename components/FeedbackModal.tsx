
import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { CheckCircle2 } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  isSuccess: boolean;
  loadingText?: string;
  successText?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ 
  isOpen, 
  isSuccess, 
  loadingText = "PROCESSANDO SOLICITAÇÃO...", 
  successText = "OPERAÇÃO REALIZADA COM SUCESSO!" 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center max-w-sm w-full shadow-2xl text-center border-b-4 border-vale-green">
        {isSuccess ? (
          <div className="animate-fadeIn flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce shadow-inner">
              <CheckCircle2 size={40} className="text-green-600" strokeWidth={3} />
            </div>
            <h3 className="text-xl font-black text-gray-800 uppercase mb-2 tracking-tight">Tudo Pronto!</h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{successText}</p>
          </div>
        ) : (
          <div className="animate-fadeIn">
            <LoadingSpinner text={loadingText} size={56} />
          </div>
        )}
      </div>
    </div>
  );
};
