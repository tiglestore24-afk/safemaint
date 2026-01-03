
import React, { useEffect, useState } from 'react';
import { Cube3D } from './Cube3D';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const timerFade = setTimeout(() => {
      setFade(true);
    }, 3500);

    const timerFinish = setTimeout(() => {
      onFinish();
    }, 4000);

    return () => {
      clearTimeout(timerFade);
      clearTimeout(timerFinish);
    };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-[#111827] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700 ${fade ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#007e7a] rounded-full blur-[120px] opacity-10 animate-pulse"></div>
      </div>

      {/* 3D SCENE CONTAINER */}
      <div className="mb-12 relative z-10">
          <Cube3D size="xl" />
      </div>

      {/* 3D TEXT PHRASE */}
      <div className="text-center relative z-10 perspective-text">
        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 uppercase tracking-tighter leading-tight animate-slide-up drop-shadow-2xl">
          A VIDA EM
        </h1>
        <h1 className="text-4xl md:text-6xl font-black text-[#edb111] uppercase tracking-tighter leading-none animate-slide-up-delay drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">
          PRIMEIRO LUGAR
        </h1>
        
        <div className="mt-8 flex justify-center gap-2 animate-bounce opacity-50">
            <div className="w-2 h-2 bg-[#007e7a] rounded-full"></div>
            <div className="w-2 h-2 bg-[#edb111] rounded-full animation-delay-200"></div>
            <div className="w-2 h-2 bg-white rounded-full animation-delay-400"></div>
        </div>
      </div>

      <style>{`
        .animate-slide-up {
          animation: slideUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
          transform: translateY(40px) rotateX(20deg);
        }

        .animate-slide-up-delay {
          animation: slideUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
          opacity: 0;
          transform: translateY(40px) rotateX(20deg);
        }

        @keyframes slideUp {
          to {
            opacity: 1;
            transform: translateY(0) rotateX(0deg);
          }
        }

        .perspective-text {
            perspective: 500px;
        }
      `}</style>
    </div>
  );
};
