
import React, { useEffect, useState } from 'react';
import { Logo } from './Logo';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const timerFade = setTimeout(() => {
      setFade(true);
    }, 3000);

    const timerFinish = setTimeout(() => {
      onFinish();
    }, 3500);

    return () => {
      clearTimeout(timerFade);
      clearTimeout(timerFinish);
    };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-[#111827] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700 ${fade ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#007e7a] rounded-full blur-[150px] opacity-10 animate-pulse-slow"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      </div>

      {/* PROFESSIONAL LOGO ANIMATION */}
      <div className="mb-12 relative z-10 animate-logo-enter">
          <div className="p-8 bg-white/5 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,126,122,0.4)] backdrop-blur-lg">
             <Logo size="xl" light showText={false} />
          </div>
      </div>

      {/* TEXT PHRASE */}
      <div className="text-center relative z-10 perspective-text">
        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 uppercase tracking-tighter leading-tight animate-slide-up drop-shadow-2xl">
          A VIDA EM
        </h1>
        <h1 className="text-4xl md:text-6xl font-black text-[#edb111] uppercase tracking-tighter leading-none animate-slide-up-delay drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">
          PRIMEIRO LUGAR
        </h1>
        
        <div className="mt-8 flex justify-center gap-2 opacity-50">
            <div className="w-2 h-2 bg-[#007e7a] rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-[#edb111] rounded-full animate-bounce animation-delay-200"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce animation-delay-400"></div>
        </div>
      </div>

      <style>{`
        .animate-logo-enter {
            animation: logoEnter 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes logoEnter {
            0% { transform: scale(0.5); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }

        .animate-slide-up {
          animation: slideUp 1s ease-out forwards;
          opacity: 0;
          transform: translateY(20px);
        }

        .animate-slide-up-delay {
          animation: slideUp 1s ease-out 0.3s forwards;
          opacity: 0;
          transform: translateY(20px);
        }

        @keyframes slideUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
