
import React from 'react';
import { Settings, Cog } from 'lucide-react';

interface LoadingSpinnerProps {
  text?: string;
  size?: number;
  className?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  text = "Carregando...", 
  size = 48, 
  className = "",
  fullScreen = false
}) => {
  
  const spinnerContent = (
    <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
      <div className="relative mb-4">
        {/* Engrenagem Maior Externa - Gira Horário */}
        <Settings 
          size={size} 
          className="text-vale-green animate-spin-slow drop-shadow-lg" 
          strokeWidth={1.5} 
        />
        {/* Engrenagem Menor Interna - Gira Anti-Horário */}
        <div className="absolute inset-0 flex items-center justify-center">
             <Cog 
                size={size * 0.6} 
                className="text-vale-yellow animate-spin-reverse-slow" 
                strokeWidth={2} 
             />
        </div>
      </div>
      {text && (
        <p className="text-vale-darkgray font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white/90 backdrop-blur-sm flex items-center justify-center flex-col">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};
