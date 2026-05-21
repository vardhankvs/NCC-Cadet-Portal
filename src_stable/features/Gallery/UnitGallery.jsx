// src/features/Gallery/UnitGallery.jsx
import React, { useState } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { VisibilityIcon, X, ImageIcon, Camera, MapPin, Calendar } from '../../components/Icons.jsx';

export const UnitGallery = () => {
    const { events } = useDataContext();
    const [selectedImage, setSelectedImage] = useState(null);

    // Extract all images from events
    const allImages = events.reduce((acc, event) => {
        if (event.imageUrls && event.imageUrls.length > 0) {
            event.imageUrls.forEach(url => {
                acc.push({
                    url,
                    eventTitle: event.title,
                    date: event.date?.toDate ? new Date(event.date.toDate()).toLocaleDateString() : 'N/A',
                    location: event.location || 'Unit HQ'
                });
            });
        }
        return acc;
    }, []);

    return (
        <div className="ncc-page">
            <header className="mb-8">
                <h2 className="text-3xl font-display font-black text-main flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-ncc-gold/10 flex items-center justify-center text-ncc-gold">
                        <ImageIcon className="w-6 h-6" />
                    </div>
                    Unit Gallery
                </h2>
                <p className="text-text-dim mt-2 max-w-xl">A visual record of our unit's legacy, camps, and strategic achievements.</p>
            </header>

            {allImages.length === 0 ? (
                <div className="ncc-card p-20 text-center">
                    <Camera className="w-16 h-16 text-text-dim/20 mx-auto mb-4" />
                    <p className="text-text-dim font-bold text-lg">The gallery is currently being curated.</p>
                    <p className="text-text-dim/60 text-sm mt-1">Photos from upcoming camps will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {allImages.map((img, idx) => (
                        <div 
                            key={idx} 
                            className="group relative aspect-square rounded-[2rem] overflow-hidden bg-gray-200 dark:bg-white dark:bg-[#050b14]/5 border border-border-main reveal fade-in"
                            onClick={() => setSelectedImage(img)}
                        >
                            <img 
                                src={img.url} 
                                alt={img.eventTitle} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
                                <h4 className="text-white font-bold text-sm leading-tight mb-1">{img.eventTitle}</h4>
                                <div className="flex items-center gap-3 text-[10px] text-white/70 font-bold uppercase tracking-widest">
                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {img.date}</span>
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {img.location}</span>
                                </div>
                                <button className="mt-4 w-full py-2 bg-white dark:bg-[#050b14]/20 backdrop-blur-md rounded-xl text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white dark:bg-[#050b14]/30 transition-all">
                                    View Full Resolution
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox */}
            {selectedImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10">
                    <div 
                        className="absolute inset-0 bg-black/95 backdrop-blur-sm"
                        onClick={() => setSelectedImage(null)}
                    />
                    <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-6 right-6 w-12 h-12 bg-white dark:bg-[#050b14]/10 hover:bg-white dark:bg-[#050b14]/20 rounded-full flex items-center justify-center text-white z-10 transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    
                    <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center animate-in zoom-in duration-300">
                        <img 
                            src={selectedImage.url} 
                            alt={selectedImage.eventTitle} 
                            className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                        />
                        <div className="mt-8 text-center">
                            <h3 className="text-white text-2xl font-display font-black">{selectedImage.eventTitle}</h3>
                            <div className="flex items-center justify-center gap-6 mt-2 text-white/50 text-xs font-bold uppercase tracking-[0.2em]">
                                <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-ncc-gold" /> {selectedImage.date}</span>
                                <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-ncc-gold" /> {selectedImage.location}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
