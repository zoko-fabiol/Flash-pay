import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ isOpen, onClose, src, alt = 'Image' }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when opened/closed or src changes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, src]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `flashpay-image-${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || !src) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200">
      {/* Top bar controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-slate-950/80 to-transparent z-10">
        <div className="text-white/70 text-sm font-medium px-2">{alt}</div>
        <div className="flex items-center gap-2">
          <button onClick={handleDownload} className="p-2 text-white/70 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-full transition-all" title="Télécharger">
            <Download size={20} />
          </button>
          <button onClick={handleZoomIn} className="p-2 text-white/70 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-full transition-all" title="Zoom avant">
            <ZoomIn size={20} />
          </button>
          <button onClick={handleZoomOut} className="p-2 text-white/70 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-full transition-all" title="Zoom arrière">
            <ZoomOut size={20} />
          </button>
          <button onClick={handleReset} className="p-2 text-white/70 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-full transition-all" title="Réinitialiser">
            <RotateCcw size={20} />
          </button>
          <div className="w-px h-6 bg-slate-700 mx-2"></div>
          <button onClick={onClose} className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 bg-slate-800/50 rounded-full transition-all" title="Fermer">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Image container */}
      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img 
          src={src} 
          alt={alt}
          draggable="false"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
          }}
          className="max-w-[90vw] max-h-[90vh] object-contain select-none"
          onClick={scale === 1 ? handleZoomIn : undefined}
        />
      </div>
      
      {/* Zoom indicator */}
      {scale !== 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 text-white px-4 py-2 rounded-full text-xs font-bold tracking-widest backdrop-blur-sm border border-slate-700/50">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
};
