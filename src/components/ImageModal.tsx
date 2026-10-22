import React from 'react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  id?: string;
}

export default function ImageModal({ isOpen, onClose, imageUrl, title, id }: ImageModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md cursor-pointer" 
        id={id ? `${id}-overlay` : "image-modal-overlay"}
        onClick={onClose}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative max-w-[95vw] max-h-[90vh] w-fit flex flex-col items-center cursor-default bg-white/5 p-2 rounded-2xl border border-white/10"
          id={id ? `${id}-content` : "image-modal-content"}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-4 right-4 flex gap-2">
            <button 
              onClick={handleDownload}
              className="p-3 bg-black/50 hover:bg-black/70 text-white rounded-xl transition-all shadow-2xl backdrop-blur-md border border-white/10 group"
              title="Download Image"
              id={id ? `${id}-download-btn` : "image-modal-download-btn"}
            >
              <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            <button 
              onClick={onClose}
              className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-2xl border border-white/10 group"
              title="Close"
              id={id ? `${id}-close-btn` : "image-modal-close-btn"}
            >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            </button>
          </div>
          
          {title && (
            <div className="absolute top-6 left-6 text-white font-black text-sm uppercase tracking-widest bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/5" id={id ? `${id}-title` : "image-modal-title"}>
              {title}
            </div>
          )}

          {imageUrl && (
            <img 
              src={imageUrl} 
              alt={title || "Full size view"} 
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              referrerPolicy="no-referrer"
              id={id ? `${id}-img` : "image-modal-img"}
            />
          )}
          
          <div className="mt-4 flex justify-center">
            <button 
              onClick={onClose}
              className="px-8 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-white/10 transition-all"
            >
              Click background to close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
