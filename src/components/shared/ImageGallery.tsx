import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Images,
    FileText,
    Maximize2,
    Download,
    Trash2,
    X,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
// import { downloadImageUtil } from '../../api_services/download_api/downloadApi'; // Adjust path if needed

export interface IFileUpload {
    type: "image" | "pdf" | "video";
    key?: string;
    url?: string;
    originalName?: string;
    uploadedAt: Date | string;
}

interface ImageGalleryProps {
    images: IFileUpload[];
    handleDelete?: (image: IFileUpload) => void;
    heightClass?: string;
    widthClass?: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
    images,
    handleDelete,
    heightClass = "h-32 sm:h-40 md:h-48",
    widthClass = "w-32 sm:w-40 md:w-48"
}) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    // --- Keyboard Navigation ---
    useEffect(() => {
        if (selectedIndex === null) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') handleClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden'; // Prevent body scrolling

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [selectedIndex, images.length]);

    // --- Handlers ---
    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedIndex((prev) =>
            prev !== null ? (prev === images.length - 1 ? 0 : prev + 1) : null
        );
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedIndex((prev) =>
            prev !== null ? (prev === 0 ? images.length - 1 : prev - 1) : null
        );
    };

    const handleClose = () => {
        setSelectedIndex(null);
    };

    const handleDownloadClick = async (e: React.MouseEvent, image: IFileUpload) => {
        e.stopPropagation();
        if (!image.key) return;

        // await downloadImageUtil({
        //     fileKey: image.key,
        // });
    };

    const onDeleteClick = (e: React.MouseEvent, image: IFileUpload) => {
        e.stopPropagation();
        if (handleDelete && selectedIndex !== null) {
            handleDelete(image);

            if (images.length <= 1) {
                handleClose();
            } else if (selectedIndex === images.length - 1) {
                setSelectedIndex(selectedIndex - 1);
            }
        }
    };

    if (!images || images.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted border border-dashed border-border rounded-xl bg-surface-hover/50">
                <Images size={48} className="mb-3 opacity-50 stroke-[1.5]" />
                <p className="text-sm font-medium">No files uploaded yet.</p>
            </div>
        );
    }

    return (
        <>
            {/* --- GRID GALLERY VIEW --- */}
            <div className="flex flex-wrap gap-3 items-center justify-start">
                {images.map((img, idx) => (
                    <div
                        key={img.key || idx}
                        onClick={() => setSelectedIndex(idx)}
                        className={`${heightClass} ${widthClass} relative group cursor-pointer overflow-hidden rounded-lg border border-border bg-surface transition-all shadow-sm hover:shadow-md`}
                    >
                        {img.type === 'image' ? (
                            <img
                                src={img.url}
                                alt={img.originalName || 'Uploaded Image'}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-danger/5 text-danger group-hover:bg-danger/10 transition-colors">
                                <FileText size={36} className="mb-2 stroke-[1.5]" />
                                <span className="text-[10px] sm:text-xs font-semibold px-3 truncate w-full text-center">
                                    {img.originalName || 'PDF Document'}
                                </span>
                            </div>
                        )}

                        {/* Hover Overlay indicator */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <Maximize2 size={24} className="text-primary-text opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                        </div>
                    </div>
                ))}
            </div>

            {/* --- FULLSCREEN LIGHTBOX (PORTAL) --- */}
            {selectedIndex !== null && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={handleClose}
                >
                    {/* Top Right Actions */}
                    <div className="absolute top-4 sm:top-6 right-4 sm:right-6 flex items-center gap-4 sm:gap-6 z-50 bg-black/40 px-4 py-2.5 rounded-full backdrop-blur-sm border border-white/10">

                        {/* Download */}
                        <button
                            onClick={(e) => handleDownloadClick(e, images[selectedIndex])}
                            className="text-primary-text/70 hover:text-primary-text transition-colors"
                            title="Download"
                        >
                            <Download size={20} />
                        </button>

                        {/* Delete */}
                        {handleDelete && (
                            <button
                                onClick={(e) => onDeleteClick(e, images[selectedIndex])}
                                className="text-primary-text/70 hover:text-danger transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}

                        {/* Close */}
                        <div className="w-px h-5 bg-white/20 mx-1"></div>
                        <button
                            onClick={handleClose}
                            className="text-primary-text/70 hover:text-danger transition-colors"
                            title="Close"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={handlePrev}
                                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 text-primary-text/50 hover:text-primary-text transition-all p-2 sm:p-4 z-50 hover:scale-110"
                            >
                                <ChevronLeft size={48} className="drop-shadow-lg" />
                            </button>
                            <button
                                onClick={handleNext}
                                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 text-primary-text/50 hover:text-primary-text transition-all p-2 sm:p-4 z-50 hover:scale-110"
                            >
                                <ChevronRight size={48} className="drop-shadow-lg" />
                            </button>
                        </>
                    )}

                    {/* Content Display */}
                    <div className="relative max-w-[95vw] sm:max-w-[85vw] max-h-[85vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>

                        {images[selectedIndex].type === 'image' ? (
                            <img
                                src={images[selectedIndex].url}
                                alt={images[selectedIndex].originalName}
                                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl select-none"
                                draggable={false}
                            />
                        ) : (
                            <div className="w-[80vw] sm:w-[500px] h-[50vh] bg-surface rounded-xl flex flex-col items-center justify-center p-8 text-center shadow-2xl">
                                <FileText size={64} className="text-danger mb-4 stroke-[1.5]" />
                                <h3 className="text-xl font-bold text-heading mb-2 break-all">{images[selectedIndex].originalName}</h3>
                                <p className="text-muted text-sm mb-8">Preview is not available for PDF documents.</p>
                                <button
                                    onClick={(e) => handleDownloadClick(e, images[selectedIndex])}
                                    className="flex items-center bg-primary text-primary-text px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-hover transition-colors shadow-sm"
                                >
                                    <Download size={18} className="mr-2" /> Download File
                                </button>
                            </div>
                        )}

                        {/* Image Counter */}
                        {images.length > 1 && (
                            <div className="absolute -bottom-12 text-primary-text/90 text-xs sm:text-sm font-bold bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10 tracking-widest uppercase shadow-lg">
                                {selectedIndex + 1} of {images.length}
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};