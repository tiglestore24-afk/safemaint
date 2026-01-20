
import React, { useRef, useEffect, useState } from 'react';
// Fix: Import PenTool from lucide-react
import { PenTool } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  label: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, label }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const tempImage = hasSignature ? canvas.toDataURL() : null;
        
        canvas.width = container.clientWidth;
        canvas.height = 200; // Altura fixa para conforto
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            if (tempImage) {
                const img = new Image();
                img.onload = () => ctx.drawImage(img, 0, 0);
                img.src = tempImage;
            }
        }
      }
    };

    resizeCanvas();
    const timer = setTimeout(resizeCanvas, 300);
    window.addEventListener('resize', resizeCanvas);
    return () => {
        window.removeEventListener('resize', resizeCanvas);
        clearTimeout(timer);
    };
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setHasSignature(true);
    const ctx = canvasRef.current?.getContext('2d');
    const pos = getPos(e);
    if (ctx) {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }
    if(e.cancelable) e.preventDefault();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    const pos = getPos(e);
    if (ctx) {
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }
    if(e.cancelable) e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const handleConfirm = () => {
    if (canvasRef.current && hasSignature) {
        onSave(canvasRef.current.toDataURL());
    } else {
        alert("⚠️ Por favor, realize o traço da assinatura antes de confirmar.");
    }
  };

  return (
    <div className="border-2 border-gray-100 rounded-[2rem] p-6 bg-white shadow-sm" ref={containerRef}>
      <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest ml-1">{label}</label>
      <div className="border-2 border-dashed border-gray-200 bg-gray-50 mb-6 cursor-crosshair overflow-hidden relative rounded-2xl h-[200px]">
        <canvas
          ref={canvasRef}
          style={{ touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full block"
        />
        {!hasSignature && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-gray-300 select-none animate-pulse">
                <PenTool size={32} className="mb-2 opacity-20" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Assine Aqui</span>
            </div>
        )}
      </div>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={clear}
          className="px-8 py-4 text-[10px] bg-white text-red-500 border-2 border-red-50 rounded-xl font-black uppercase hover:bg-red-50 transition-all active:scale-95"
        >
          LIMPAR
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className={`flex-1 py-4 text-[10px] text-white rounded-xl font-black uppercase shadow-lg transition-all active:scale-95 ${hasSignature ? 'bg-vale-green hover:bg-[#00605d]' : 'bg-gray-300 cursor-not-allowed'}`}
          disabled={!hasSignature}
        >
          CONFIRMAR ASSINATURA
        </button>
      </div>
    </div>
  );
};
