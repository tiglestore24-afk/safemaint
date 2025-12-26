
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  light?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, light = false }) => {
  const sizes = {
    sm: { icon: 32, font: 'text-lg', spacing: 'gap-2' },
    md: { icon: 48, font: 'text-2xl', spacing: 'gap-3' },
    lg: { icon: 64, font: 'text-4xl', spacing: 'gap-4' },
    xl: { icon: 96, font: 'text-6xl', spacing: 'gap-6' },
  };

  const currentSize = sizes[size];

  // Cores exatas
  const valeGreen = "#007e7a"; 
  const valeYellow = "#edb111"; 

  return (
    <div className={`flex items-center ${currentSize.spacing} select-none`}>
      <div 
        className="relative flex items-center justify-center transition-transform hover:scale-105 duration-300"
        style={{ width: currentSize.icon, height: currentSize.icon }}
      >
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          {/* 
             Ajuste de geometria para "fechamento" do logo.
             O V é formado pela união no ponto (50, 95).
          */}
          
          {/* Asa Esquerda (Verde) - Mais cheia e curva */}
          <path 
            d="M 10 25 C 10 25, 45 40, 50 95 L 50 60 C 45 45, 25 35, 10 25 Z" 
            fill={valeGreen}
          />
          
          {/* Onda Superior Direita (Amarela) */}
          <path 
            d="M 50 60 C 55 50, 75 35, 95 30 L 80 55 C 70 60, 55 65, 50 60 Z" 
            fill={valeYellow} 
          />

          {/* Preenchimento Inferior Direito (Verde) - Conectando para fechar o V */}
          <path 
            d="M 50 95 L 80 55 C 70 60, 55 65, 50 60 L 50 95 Z" 
            fill={valeGreen}
          />
        </svg>
      </div>
      
      {showText && (
        <div className="flex flex-col justify-center">
          <h1 className={`${currentSize.font} font-black tracking-wide leading-none ${light ? 'text-white' : 'text-[#666666]'}`}>
            VALE
          </h1>
        </div>
      )}
    </div>
  );
};
