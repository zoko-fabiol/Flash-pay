import React, { useEffect, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

type Props = {
  images: string[];
  startIndex?: number;
  onClose: () => void;
  labels?: string[]; // optional label per image e.g. "Pièce d'identité"
};

const ImageLightbox: React.FC<Props> = ({
  images,
  startIndex = 0,
  onClose,
  labels,
}) => {
  const [index, setIndex]   = useState(startIndex);
  const [zoom, setZoom]     = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [visible, setVisible] = useState(false);

  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDelta  = useRef<number>(0);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const showPrev = useCallback(() => {
    if (index > 0) { setIndex(i => i - 1); resetZoom(); }
  }, [index, resetZoom]);

  const showNext = useCallback(() => {
    if (index < images.length - 1) { setIndex(i => i + 1); resetZoom(); }
  }, [index, images.length, resetZoom]);

  const handleZoomIn  = () => setZoom(z => Math.min(z + 0.5, 4));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.5, 0.5));

  // Keyboard nav
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape')      handleClose();
      if (e.key === 'ArrowLeft')   showPrev();
      if (e.key === 'ArrowRight')  showNext();
      if (e.key === '+')           handleZoomIn();
      if (e.key === '-')           handleZoomOut();
    },
    [handleClose, showPrev, showNext]
  );

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onKey]);

  useEffect(() => setIndex(startIndex), [startIndex]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDelta.current  = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    touchDelta.current = e.touches[0].clientX - touchStartX.current;
  };
  const onTouchEnd = () => {
    if (touchDelta.current >  60) showPrev();
    if (touchDelta.current < -60) showNext();
    touchStartX.current = null;
    touchDelta.current  = 0;
  };

  // Mouse drag (when zoomed)
  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return;
    setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const onMouseUp = () => {
    setIsDragging(false);
    dragStart.current = null;
  };

  // Double-click to zoom
  const onDoubleClick = () => {
    if (zoom > 1) { resetZoom(); } else { setZoom(2); }
  };

  if (!images || images.length === 0) return null;

  const currentLabel = labels?.[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const lightboxContent = (
    <div
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center"
      style={{
        opacity:    visible ? 1 : 0,
        transition: 'opacity 200ms ease',
      }}
    >
      {/* ── Glassmorphism backdrop ── */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(103,80,164,0.35) 0%, rgba(29,27,32,0.92) 60%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
        onClick={handleClose}
      />

      {/* ── Top toolbar ── */}
      <div
        className="relative z-10 w-full max-w-5xl flex items-center justify-between px-6 py-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Label + counter */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-2">
            <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">
              {index + 1}/{images.length}
            </span>
          </div>
          {currentLabel && (
            <div className="px-4 py-2 rounded-full bg-[#470B37]/40 backdrop-blur-md border border-[#470B37]/40">
              <span className="text-white text-[10px] font-black uppercase tracking-widest">
                {currentLabel}
              </span>
            </div>
          )}
        </div>

        {/* Zoom controls + download + close */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="hidden sm:flex p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white transition-all disabled:opacity-30"
            title="Dézoomer (−)"
          >
            <ZoomOut size={16} />
          </button>

          <button
            onClick={resetZoom}
            className="hidden sm:block px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white transition-all font-black text-[11px] tracking-widest"
            title="Réinitialiser le zoom"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            onClick={handleZoomIn}
            disabled={zoom >= 4}
            className="hidden sm:flex p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white transition-all disabled:opacity-30"
            title="Zoomer (+)"
          >
            <ZoomIn size={16} />
          </button>

          <div className="hidden sm:block w-px h-6 bg-white/20 mx-1" />

          <a
            href={images[index]}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="p-2.5 rounded-2xl bg-[#470B37]/50 hover:bg-[#470B37] border border-[#470B37]/50 text-white transition-all"
            title="Télécharger"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={16} />
          </a>

          <button
            onClick={handleClose}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-rose-500/80 border border-white/15 text-white transition-all"
            title="Fermer (Échap)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Image viewer area ── */}
      <div
        className="relative z-10 flex-1 w-full flex items-center justify-center px-20 py-4 overflow-hidden"
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        onClick={(e) => { e.stopPropagation(); if (zoom <= 1) return; }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img
          key={images[index]}
          src={images[index]}
          alt={`preview-${index}`}
          onDoubleClick={onDoubleClick}
          draggable={false}
          className="max-w-full max-h-[70vh] object-contain select-none"
          style={{
            transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
            transition: isDragging ? 'none' : 'transform 250ms cubic-bezier(0.34,1.56,0.64,1)',
            borderRadius: '24px',
            boxShadow: '0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
          }}
        />

        {/* Hint double-clic */}
        {zoom === 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest pointer-events-none select-none">
            Double-clic pour zoomer
          </div>
        )}
      </div>

      {/* ── Prev / Next arrows ── */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); showPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full bg-white/10 hover:bg-[#470B37]/60 backdrop-blur-md border border-white/20 text-white transition-all hover:scale-110 shadow-2xl"
          aria-label="Précédent"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); showNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full bg-white/10 hover:bg-[#470B37]/60 backdrop-blur-md border border-white/20 text-white transition-all hover:scale-110 shadow-2xl"
          aria-label="Suivant"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* ── Thumbnail strip (multi-image) ── */}
      {images.length > 1 && (
        <div
          className="relative z-10 flex items-center gap-3 pb-6 pt-2 px-6 overflow-x-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => { setIndex(i); resetZoom(); }}
              className="shrink-0 transition-all"
              style={{
                width:   i === index ? 64 : 48,
                height:  i === index ? 64 : 48,
                borderRadius: 16,
                border: i === index ? '2px solid #470B37' : '2px solid rgba(255,255,255,0.15)',
                boxShadow: i === index ? '0 0 0 4px rgba(103,80,164,0.35)' : 'none',
                overflow: 'hidden',
                opacity: i === index ? 1 : 0.5,
                transform: i === index ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 200ms ease',
              }}
            >
              <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return createPortal(lightboxContent, document.body);
};

export default ImageLightbox;
