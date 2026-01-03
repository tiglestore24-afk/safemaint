
import React from 'react';
import { Logo } from './Logo';

interface Cube3DProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'; // sm: Sidebar, xl: Splash
}

export const Cube3D: React.FC<Cube3DProps> = ({ size = 'xl' }) => {
  
  // Escalas baseadas no tamanho original de 150px do CSS
  const getScale = () => {
      switch(size) {
          case 'sm': return 0.35; // Para Sidebar (aprox 50px)
          case 'md': return 0.6;
          case 'lg': return 0.8;
          case 'xl': return 1.5; // Para Splash (grande)
          default: return 1;
      }
  };

  const scale = getScale();

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: 150 * scale, height: 150 * scale }}>
      <div className="perspective-container" style={{ transform: `scale(${scale})` }}>
        <div className="cube-spinner">
            {/* FACE 1: LOGO */}
            <div className="face face-front bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(0,126,122,0.3)]">
               <div className="transform translate-z-[20px]">
                   <Logo size="xl" showText={false} />
               </div>
            </div>
            
            {/* FACE 2: A VIDA EM PRIMEIRO LUGAR */}
            <div className="face face-back bg-gradient-to-br from-[#007e7a] to-[#005c5a] rounded-2xl flex flex-col items-center justify-center shadow-[0_0_30px_rgba(0,126,122,0.5)] border border-[#edb111]/30 p-2 text-center">
               <h3 className="text-[12px] font-black text-white leading-tight tracking-wide uppercase drop-shadow-md">
                 A VIDA EM<br/>
                 <span className="text-[#edb111] text-[16px]">PRIMEIRO</span><br/>
                 LUGAR
               </h3>
            </div>
            
            {/* FACE 3: VALE TEXT (Verde no Amarelo) */}
            <div className="face face-right bg-[#edb111] rounded-2xl flex items-center justify-center border border-white/20 shadow-[0_0_20px_rgba(237,177,17,0.4)]">
               <h2 className="text-4xl font-black text-[#007e7a] tracking-tighter drop-shadow-sm">VALE</h2>
            </div>

            {/* FACE 4: SAFEMAINT */}
            <div className="face face-left bg-gray-900 rounded-2xl flex items-center justify-center border border-gray-700">
               <h2 className="text-2xl font-black text-white tracking-widest uppercase text-center leading-none">SAFE<br/>MAINT</h2>
            </div>
        </div>
      </div>

      <style>{`
        .perspective-container {
          perspective: 1000px;
          width: 150px;
          height: 150px;
          position: absolute;
          top: 50%;
          left: 50%;
          margin-top: -75px;
          margin-left: -75px;
        }

        .cube-spinner {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          animation: spin-cube 12s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }

        .face {
          position: absolute;
          width: 150px;
          height: 150px;
          backface-visibility: visible;
          opacity: 0.95;
        }

        .face-front { transform: translateZ(75px); }
        .face-back  { transform: rotateY(180deg) translateZ(75px); }
        .face-right { transform: rotateY(90deg) translateZ(75px); }
        .face-left  { transform: rotateY(-90deg) translateZ(75px); }

        @keyframes spin-cube {
          0% { transform: rotateY(0deg) rotateX(0deg); }
          20% { transform: rotateY(0deg) rotateX(0deg); }
          25% { transform: rotateY(-90deg) rotateX(5deg); }
          45% { transform: rotateY(-90deg) rotateX(5deg); }
          50% { transform: rotateY(-180deg) rotateX(0deg); }
          70% { transform: rotateY(-180deg) rotateX(0deg); }
          75% { transform: rotateY(-270deg) rotateX(-5deg); }
          95% { transform: rotateY(-270deg) rotateX(-5deg); }
          100% { transform: rotateY(-360deg) rotateX(0deg); }
        }
      `}</style>
    </div>
  );
};
