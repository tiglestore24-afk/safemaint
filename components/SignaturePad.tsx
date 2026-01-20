
import React, { useRef, useEffect, useState } from 'react';

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
        // Mantém o conteúdo se já houver assinatura (salva temporariamente)
        const tempImage = hasSignature ? canvas.toDataURL() : null;
        
        canvas.width = container.clientWidth;
        canvas.height = 180; 
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = '#000';
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
    const timer = setTimeout(resizeCanvas, 300); // Aguarda animação do modal
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
    if ('touches' in e) {
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
    ctx?.beginPath();
    ctx?.moveTo(pos.x, pos.y);
    if(e.cancelable) e.preventDefault();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    const pos = getPos(e);
    ctx?.lineTo(pos.x, pos.y);
    ctx?.stroke();
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

  return (
    <div className="border-2 border-gray-200 rounded-2xl p-4 bg-gray-50 shadow-inner" ref={containerRef}>
      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">{label}</label>
      <div className="border-2 border-dashed border-gray-300 bg-white mb-4 cursor-crosshair overflow-hidden relative rounded-xl h-[180px]">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-gray-300 select-none">
                <span className="text-xs font-black uppercase tracking-widest">Assine Manualmente Aqui</span>
            </div>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={clear}
          className="px-6 py-3 text-[10px] bg-white text-red-500 border border-red-100 rounded-xl font-black uppercase hover:bg-red-50 transition-colors"
        >
          LIMPAR
        </button>
        <button
          type="button"
          onClick={() => {
              if (canvasRef.current && hasSignature) {
                  onSave(canvasRef.current.toDataURL());
              } else {
                  alert("Por favor, realize a assinatura antes de confirmar.");
              }
          }}
          className={`flex-1 py-3 text-[10px] text-white rounded-xl font-black uppercase shadow-lg transition-all active:scale-95 ${hasSignature ? 'bg-[#007e7a] hover:bg-[#00605d]' : 'bg-gray-300 cursor-not-allowed'}`}
          disabled={!hasSignature}
        >
          CONFIRMAR ASSINATURA
        </button>
      </div>
    </div>
  );
};
