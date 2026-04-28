import React, { useRef, useState, useEffect } from 'react';
import { X, Check, Pencil, Crop, RotateCcw, Undo } from 'lucide-react';
import { Button } from './ui/button';

export function ImageEditorModal({ file, onConfirm, onCancel }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [history, setHistory] = useState([]);
  const [imageObj, setImageObj] = useState(null);

  useEffect(() => {
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Calculate dimensions to fit screen but maintain aspect ratio
      const maxWidth = window.innerWidth * 0.8;
      const maxHeight = window.innerHeight * 0.7;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      setImageObj(img);
      saveToHistory();
    };
  }, [file]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    setHistory(prev => [...prev, canvas.toDataURL()]);
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHistory(newHistory);
    };
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      const editedFile = new File([blob], file.name, { type: 'image/jpeg' });
      onConfirm(editedFile);
    }, 'image/jpeg', 0.8);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-300">
      {/* Toolbar */}
      <div className="absolute top-6 w-full max-w-4xl flex items-center justify-between px-6">
        <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/10" onClick={onCancel}>
          <X className="w-6 h-6" />
        </Button>
        
        <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-2xl">
          <div className="flex gap-2 mr-2">
            {['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00'].map(c => (
              <button 
                key={c} 
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-white scale-125' : 'border-transparent'} transition-all`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-white hover:bg-white/10" onClick={undo}>
            <Undo className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-white hover:bg-white/10">
            <Crop className="w-5 h-5" />
          </Button>
        </div>

        <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/80 text-white rounded-full px-6 gap-2">
          <Check className="w-5 h-5" /> Done
        </Button>
      </div>

      {/* Canvas Area */}
      <div className="relative group cursor-crosshair shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-lg overflow-hidden border border-white/5">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="touch-none"
        />
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-[10px] px-2 py-1 rounded pointer-events-none">
          Scribble Mode Active
        </div>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-10 text-white/40 text-xs flex gap-6">
        <span className="flex items-center gap-1"><Pencil className="w-3 h-3" /> Draw on image</span>
        <span>Tap Done to send</span>
      </div>
    </div>
  );
}
