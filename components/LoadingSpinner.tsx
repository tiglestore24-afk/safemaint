
import React from 'react';
import { Settings } from 'lucide-react';

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
      <div className="relative mb-3">
        {/* Outer Gear */}
        <Settings 
          size={size} 
          className="text-vale-green animate-[spin_3s_linear_infinite]" 
          strokeWidth={1.5} 
        />
        {/* Inner Gear (smaller, reverse spin for mechanical effect) */}
        <div className="absolute inset-0 flex items-center justify-center">
             <Settings 
                size={size * 0.5} 
                className="text-vale-green/50 animate-[spin_4s_linear_infinite_reverse]" 
                strokeWidth={2} 
             />
        </div>
      </div>
      <p className="text-vale-darkgray font-black text-xs uppercase tracking-[0.2em] animate-pulse">
        {text}
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white/90 backdrop-blur-sm flex items-center justify-center">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};
