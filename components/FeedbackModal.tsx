
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
  loadingText = "ENVIANDO...", 
  successText = "REALIZADO!" 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center max-w-sm w-full shadow-2xl text-center border-b-4 border-vale-green relative overflow-hidden">
        {/* Efeito de brilho no fundo */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-50 animate-shimmer"></div>

        {isSuccess ? (
          <div className="animate-fadeIn flex flex-col items-center scale-110 transition-transform">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce shadow-lg border-4 border-white ring-4 ring-green-50">
              <CheckCircle2 size={48} className="text-green-600" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-gray-800 uppercase mb-1 tracking-tight">Sucesso!</h3>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{successText}</p>
          </div>
        ) : (
          <div className="animate-fadeIn flex flex-col items-center">
            <div className="mb-6 scale-110">
                <LoadingSpinner text="" size={64} />
            </div>
            <p className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">
              {loadingText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
