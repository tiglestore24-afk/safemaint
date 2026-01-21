
import React from 'react';
import { Logo } from './Logo';

interface StandbyScreenProps {
  onWake: () => void;
}

export const StandbyScreen: React.FC<StandbyScreenProps> = ({ onWake }) => {
  return (
    <div 
      className="fixed inset-0 z-[99999] bg-[#111827] flex flex-col items-center justify-center cursor-pointer animate-fadeIn overflow-hidden"
      onClick={onWake}
      onTouchStart={onWake}
      onMouseMove={onWake}
      onKeyDown={onWake}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#007e7a] rounded-full blur-[150px] opacity-5 animate-pulse-slow"></div>
      </div>

      {/* Main Object */}
      <div className="mb-12 relative z-10 transition-transform duration-700 hover:scale-110">
        <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
            <Logo size="xl" light showText={false} />
        </div>
      </div>

      {/* Text Branding */}
      <div className="text-center relative z-10">
         <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600 tracking-[0.2em] uppercase drop-shadow-2xl">
            SAFEMAINT
         </h2>
         <div className="flex items-center justify-center gap-3 mt-4 opacity-60">
             <div className="h-px w-12 bg-[#edb111]"></div>
             <p className="text-[10px] font-bold text-[#edb111] uppercase tracking-[0.3em] animate-pulse">
                Sistema em Espera
             </p>
             <div className="h-px w-12 bg-[#edb111]"></div>
         </div>
      </div>

      {/* Footer Hint */}
      <div className="absolute bottom-10 text-center opacity-30 animate-bounce">
          <p className="text-[9px] font-black text-white uppercase tracking-widest">Toque para retomar</p>
      </div>
    </div>
  );
};
