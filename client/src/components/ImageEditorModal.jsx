import React, { useRef, useState, useEffect } from 'react';
import { X, Check, Pencil, Crop, Undo, Maximize } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

export function ImageEditorModal({ file, onConfirm, onCancel }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [history, setHistory] = useState([]);
  const [cropStart, setCropStart] = useState(null);
  const [cropEnd, setCropEnd] = useState(null);

  useEffect(() => {
    if (!file) return;
    console.log('[EDITOR] Loading file:', file.name);

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      
      const maxWidth = window.innerWidth * 0.9;
      const maxHeight = window.innerHeight * 0.7;
      let width = img.width;
      let height = img.height;

      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width *= ratio;
      height *= ratio;

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      saveToHistory();
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      toast.error('Failed to load image for editing');
      onCancel();
    };
  }, [file]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      setHistory(prev => [...prev, canvas.toDataURL()]);
    }
  };

  const startAction = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    if (isCropping) {
      setCropStart({ x, y });
      setCropEnd({ x, y });
    } else {
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      setIsDrawing(true);
    }
  };

  const moveAction = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    if (isCropping && cropStart) {
      setCropEnd({ x, y });
    } else if (isDrawing) {
      const ctx = canvas.getContext('2d');
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopAction = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    } else if (isCropping && cropStart && cropEnd) {
      applyCrop();
    }
  };

  const applyCrop = () => {
    const canvas = canvasRef.current;
    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const width = Math.abs(cropStart.x - cropEnd.x);
    const height = Math.abs(cropStart.y - cropEnd.y);

    if (width < 20 || height < 20) {
      setCropStart(null);
      setCropEnd(null);
      return;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(tempCanvas, 0, 0);
    
    setCropStart(null);
    setCropEnd(null);
    setIsCropping(false);
    saveToHistory();
    toast.success('Cropped successfully');
  };

  const undo = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop();
    const lastState = newHistory[newHistory.length - 1];
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = lastState;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      setHistory(newHistory);
    };
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      const editedFile = new File([blob], file.name, { type: 'image/jpeg' });
      onConfirm(editedFile);
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 touch-none overflow-hidden animate-in zoom-in-95 duration-200">
      {/* Top Bar */}
      <div className="absolute top-6 w-full max-w-5xl flex items-center justify-between px-8">
        <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/10 h-12 w-12" onClick={onCancel}>
          <X className="w-8 h-8" />
        </Button>
        
        <div className="flex items-center gap-6 bg-white/5 backdrop-blur-2xl px-6 py-2 rounded-full border border-white/10 shadow-2xl">
          <div className="flex gap-3 pr-4 border-r border-white/10">
            {['#ffffff', '#ff3b30', '#4cd964', '#007aff', '#ffcc00'].map(c => (
              <button 
                key={c} 
                onClick={() => { setColor(c); setIsCropping(false); }}
                className={`w-7 h-7 rounded-full border-2 ${color === c && !isCropping ? 'border-white scale-125' : 'border-transparent'} transition-all`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-10 w-10 rounded-full ${isCropping ? 'bg-primary text-white' : 'text-white/60 hover:text-white'}`}
            onClick={() => setIsCropping(!isCropping)}
          >
            <Crop className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-white/60 hover:text-white" onClick={undo} disabled={history.length <= 1}>
            <Undo className="w-6 h-6" />
          </Button>
        </div>

        <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/80 text-white rounded-full px-8 py-6 text-lg font-semibold shadow-xl hover:scale-105 active:scale-95 transition-all">
          <Check className="w-6 h-6 mr-2" /> Done
        </Button>
      </div>

      {/* Viewport */}
      <div className="relative group p-4">
        <div className="relative shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/10 rounded-sm overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={startAction}
            onMouseMove={moveAction}
            onMouseUp={stopAction}
            onTouchStart={startAction}
            onTouchMove={moveAction}
            onTouchEnd={stopAction}
            className={`max-w-full max-h-[70vh] ${isCropping ? 'cursor-nwse-resize' : 'cursor-crosshair'}`}
          />
          
          {/* Crop Selection Overlay */}
          {isCropping && cropStart && cropEnd && (
            <div 
              className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
              style={{
                left: Math.min(cropStart.x, cropEnd.x),
                top: Math.min(cropStart.y, cropEnd.y),
                width: Math.abs(cropStart.x - cropEnd.x),
                height: Math.abs(cropStart.y - cropEnd.y)
              }}
            >
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white -translate-x-1 -translate-y-1" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white translate-x-1 -translate-y-1" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white -translate-x-1 translate-y-1" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white translate-x-1 translate-y-1" />
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-12 flex flex-col items-center gap-2">
        <p className="text-white/40 text-sm font-medium tracking-wide">
          {isCropping ? 'DRAG TO SELECT CROP AREA' : 'DRAW DIRECTLY ON IMAGE'}
        </p>
        <div className="flex gap-4 opacity-20">
            <Maximize className="w-4 h-4 text-white" />
            <Pencil className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
}
