'use client';
import type { Dispatch, SetStateAction } from 'react';

interface ImagePreviewModalProps {
  selectedPreviewImage: string | null;
  setSelectedPreviewImage: Dispatch<SetStateAction<string | null>>;
}

export default function ImagePreviewModal({
  selectedPreviewImage,
  setSelectedPreviewImage,
}: ImagePreviewModalProps) {
  return (
    <>
      {selectedPreviewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedPreviewImage(null)}></div>
          <div className="relative bg-card border border-slate-800 rounded-3xl p-4 max-w-xl w-full shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute top-3 right-3 text-slate-300 hover:text-white text-xl font-bold bg-slate-900/80 rounded-full w-8 h-8 flex items-center justify-center border border-slate-700"
            >
              &times;
            </button>
            <img src={selectedPreviewImage} alt="Ảnh món ăn đầy đủ" className="w-full h-auto max-h-[75vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </>
  );
}
