import React, { useRef } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

interface SwipeableGalleryProps {
  images: string[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  aspectClass?: string; // e.g. "aspect-[16/10]" or "aspect-[16/9]"
  showControls?: boolean;
  showDots?: boolean;
  showCounter?: boolean;
  tagText?: string;
  className?: string;
}

export default function SwipeableGallery({
  images,
  activeIndex,
  onChangeIndex,
  aspectClass = "aspect-[16/10]",
  showControls = true,
  showDots = true,
  showCounter = true,
  tagText,
  className = "",
}: SwipeableGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // If there's only 1 image, don't allow drag or controls
  const isMulti = images && images.length > 1;
  const listImages = images && images.length > 0 ? images : ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=640&q=80"];

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const nextIdx = (activeIndex - 1 + listImages.length) % listImages.length;
    onChangeIndex(nextIdx);
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const nextIdx = (activeIndex + 1) % listImages.length;
    onChangeIndex(nextIdx);
  };

  const handleDragEnd = (_event: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (!isMulti) return;
    
    const swipeThreshold = 50; // px
    const velocityThreshold = 100; // px/s
    
    const { x: offsetX } = info.offset;
    const { x: velocityX } = info.velocity;

    // Swipe left (next image)
    if (offsetX < -swipeThreshold || velocityX < -velocityThreshold) {
      handleNext();
    }
    // Swipe right (prev image)
    else if (offsetX > swipeThreshold || velocityX > velocityThreshold) {
      handlePrev();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${aspectClass} bg-slate-900 select-none group/gallery ${className}`}
    >
      {/* Slide Container with standard Framer Motion drag and spring transitions */}
      <motion.div
        drag={isMulti ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="w-full h-full flex cursor-grab active:cursor-grabbing"
        animate={{ x: `-${activeIndex * 100}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{ touchAction: "pan-y" }} // Enable vertical browser scrolling but drag horizontally
      >
        {listImages.map((img, i) => (
          <div key={i} className="w-full h-full shrink-0 overflow-hidden relative">
            <img
              src={img || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=640&q=80"}
              alt={`Aperçu ${i + 1}`}
              className="w-full h-full object-cover pointer-events-none select-none mb-0"
              referrerPolicy="no-referrer"
            />
          </div>
        ))}
      </motion.div>

      {/* Selected/Custom Badge */}
      {tagText && (
        <div className="absolute top-3.5 left-3.5 px-2.5 py-1 bg-blue-600 rounded-lg text-[9px] font-black uppercase tracking-wider text-white border border-blue-500 shadow-sm font-mono z-10 pointer-events-none select-none">
          {tagText}
        </div>
      )}

      {/* Slider Navigation controls */}
      {showControls && isMulti && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-900/60 hover:bg-slate-900/85 text-white flex items-center justify-center transition-all opacity-0 group-hover/gallery:opacity-100 cursor-pointer shadow-md z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-900/60 hover:bg-slate-900/85 text-white flex items-center justify-center transition-all opacity-0 group-hover/gallery:opacity-100 cursor-pointer shadow-md z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Slide counter bubble */}
      {showCounter && isMulti && (
        <div className="absolute top-3.5 right-3.5 bg-slate-900/75 backdrop-blur-md text-[10px] text-white font-mono px-2.5 py-1 rounded-lg flex items-center gap-1.5 z-10 border border-white/10 shadow-sm pointer-events-none select-none">
          <ImageIcon className="w-3.5 h-3.5 text-blue-300" />
          <span>{activeIndex + 1} / {listImages.length}</span>
        </div>
      )}

      {/* Bottom dots */}
      {showDots && isMulti && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-slate-900/35 backdrop-blur-xs px-2 py-1 rounded-full">
          {listImages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChangeIndex(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === activeIndex 
                  ? "w-4 bg-blue-500" 
                  : "w-1.5 bg-white/60 hover:bg-white"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
