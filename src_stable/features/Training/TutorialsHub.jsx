
import React, { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { 
    Play, Bookmark, Clock, Search, Filter, 
    ChevronRight, Star, History, CheckCircle, 
    X, ExternalLink, Loader, Plus, Trash2,
    BookOpen, VideoIcon
} from '../../components/Icons.jsx';
import { 
    getCollectionRef, addTutorial, toggleBookmark, 
    addToWatchHistory, deleteItem 
} from '../../firebase/firestoreService.js';
import { onSnapshot, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';

export const TutorialsHub = () => {
    const { currentUser, userRole, userEnrollmentId } = useAuthContext();
    const isAdmin = Boolean(userRole && userRole.toLowerCase() !== 'cadet');
    
    const [tutorials, setTutorials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [activeVideo, setActiveVideo] = useState(null);
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [viewMode, setViewMode] = useState('explore'); // 'explore', 'bookmarks', 'history'

    // Form state for adding tutorials
    const [newTutorial, setNewTutorial] = useState({
        title: '',
        category: 'Common Subjects',
        videoUrl: '',
        description: '',
        duration: '',
        sourceType: 'youtube'
    });

    const categories = ['All', 'Common Subjects', 'Specialized Subjects', 'Weapon Training', 'Drill', 'Map Reading', 'Field Craft'];

    useEffect(() => {
        const q = query(getCollectionRef('tutorials'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTutorials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const userBookmarks = currentUser?.bookmarks || [];
    const watchHistory = currentUser?.watchHistory || [];

    const filteredTutorials = useMemo(() => {
        let list = tutorials;
        
        if (viewMode === 'bookmarks') {
            list = list.filter(t => userBookmarks.includes(t.id));
        } else if (viewMode === 'history') {
            const historyIds = watchHistory.map(h => h.tutorialId);
            list = list.filter(t => historyIds.includes(t.id))
                .sort((a, b) => {
                    const timeA = new Date(watchHistory.find(h => h.tutorialId === a.id)?.timestamp).getTime();
                    const timeB = new Date(watchHistory.find(h => h.tutorialId === b.id)?.timestamp).getTime();
                    return timeB - timeA;
                });
        }

        return list.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 t.description?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [tutorials, searchTerm, selectedCategory, viewMode, userBookmarks, watchHistory]);

    const handlePlayVideo = async (tutorial) => {
        setActiveVideo(tutorial);
        if (currentUser) {
            await addToWatchHistory(currentUser.uid, tutorial.id);
        }
    };

    const handleToggleBookmark = async (e, tutorialId) => {
        e.stopPropagation();
        if (!currentUser) return;
        const isBookmarked = userBookmarks.includes(tutorialId);
        try {
            await toggleBookmark(currentUser.uid, tutorialId, isBookmarked);
            toast.info(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
        } catch (err) {
            toast.error('Failed to update bookmark');
        }
    };

    const handleAddTutorial = async (e) => {
        e.preventDefault();
        try {
            // Extract YouTube ID if it's a full URL
            let videoId = newTutorial.videoUrl;
            if (videoId.includes('youtube.com/watch?v=')) {
                videoId = videoId.split('v=')[1].split('&')[0];
            } else if (videoId.includes('youtu.be/')) {
                videoId = videoId.split('youtu.be/')[1].split('?')[0];
            }

            await addTutorial({
                ...newTutorial,
                videoUrl: videoId,
                createdAt: new Date().toISOString()
            });
            toast.success('Tutorial published successfully!');
            setIsAddingMode(false);
            setNewTutorial({ title: '', category: 'Common Subjects', videoUrl: '', description: '', duration: '', sourceType: 'youtube' });
        } catch (err) {
            toast.error('Failed to publish tutorial');
        }
    };

    return (
        <div className="space-y-8 fade-in">
            {/* ── Sub Navigation ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex bg-ncc-navy/5 p-1.5 rounded-2xl border border-ncc-navy/10">
                    <button 
                        onClick={() => setViewMode('explore')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'explore' ? 'bg-ncc-navy text-white shadow-lg' : 'text-ncc-navy dark:text-white/60 hover:text-ncc-navy dark:text-white'}`}
                    >
                        <VideoIcon className="w-4 h-4" /> Explore
                    </button>
                    <button 
                        onClick={() => setViewMode('bookmarks')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'bookmarks' ? 'bg-ncc-navy text-white shadow-lg' : 'text-ncc-navy dark:text-white/60 hover:text-ncc-navy dark:text-white'}`}
                    >
                        <Bookmark className="w-4 h-4" /> Bookmarks
                    </button>
                    <button 
                        onClick={() => setViewMode('history')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'history' ? 'bg-ncc-navy text-white shadow-lg' : 'text-ncc-navy dark:text-white/60 hover:text-ncc-navy dark:text-white'}`}
                    >
                        <History className="w-4 h-4" /> History
                    </button>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ncc-navy dark:text-white/30" />
                        <input 
                            type="text" 
                            placeholder="Search tutorials..." 
                            className="w-full bg-white dark:bg-[#050b14] border-2 border-ncc-navy/5 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:border-ncc-gold/50 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {isAdmin && (
                        <button 
                            onClick={() => setIsAddingMode(true)}
                            className="bg-ncc-navy text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-ncc-navy/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" /> Add New
                        </button>
                    )}
                </div>
            </div>

            {/* ── Category Filter ── */}
            {viewMode === 'explore' && (
                <div className="flex gap-2 overflow-x-auto pb-4 ncc-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${selectedCategory === cat ? 'bg-ncc-gold border-ncc-gold text-ncc-navy dark:text-white' : 'bg-white dark:bg-[#050b14] border-ncc-navy/5 text-ncc-navy dark:text-white/40 hover:border-ncc-navy/20'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Tutorials Grid ── */}
            {loading ? (
                <div className="py-32 text-center"><Loader className="animate-spin w-12 h-12 text-ncc-gold mx-auto" /></div>
            ) : filteredTutorials.length === 0 ? (
                <div className="py-32 text-center bg-white dark:bg-[#050b14] rounded-3xl border-2 border-dashed border-ncc-navy/5">
                    <div className="w-20 h-20 bg-ncc-navy/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <VideoIcon className="w-10 h-10 text-ncc-navy dark:text-white/20" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-ncc-navy dark:text-white mb-2">No tutorials found</h3>
                    <p className="text-gray-400 dark:text-white/80 max-w-sm mx-auto text-sm">We couldn't find any videos matching your current filter or view mode.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredTutorials.map((tutorial) => (
                        <div 
                            key={tutorial.id}
                            onClick={() => tutorial.sourceType === 'external' ? window.open(tutorial.videoUrl, '_blank') : handlePlayVideo(tutorial)}
                            className="group bg-white dark:bg-[#050b14] rounded-[2rem] border-2 border-ncc-navy/5 overflow-hidden hover:border-ncc-gold/50 transition-all cursor-pointer shadow-sm hover:shadow-2xl hover:shadow-ncc-navy/10 relative"
                        >
                            {/* Thumbnail Area */}
                            <div className="aspect-video relative overflow-hidden bg-ncc-navy flex items-center justify-center">
                                {tutorial.sourceType === 'external' ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <ExternalLink className="w-12 h-12 text-ncc-gold/20" />
                                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">External Resource</span>
                                    </div>
                                ) : (
                                    <img 
                                        src={`https://img.youtube.com/vi/${tutorial.videoUrl}/maxresdefault.jpg`} 
                                        alt={tutorial.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'; }}
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-ncc-navy/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                {/* Overlay Play Button */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-16 h-16 bg-white dark:bg-[#050b14]/10 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/30 group-hover:scale-125 group-hover:bg-ncc-gold group-hover:border-ncc-gold transition-all duration-500">
                                        <Play className="w-8 h-8 text-white group-hover:text-ncc-navy dark:text-white translate-x-0.5" />
                                    </div>
                                </div>

                                {/* Badge Category */}
                                <div className="absolute top-4 left-4 px-3 py-1 bg-ncc-navy/40 backdrop-blur-md border border-white/20 rounded-lg text-[9px] font-black text-white uppercase tracking-widest">
                                    {tutorial.category}
                                </div>

                                {/* Duration */}
                                <div className="absolute bottom-4 right-4 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-[9px] font-bold text-white">
                                    {tutorial.duration || 'Video'}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <div className="flex justify-between items-start gap-4 mb-3">
                                    <h3 className="font-display font-bold text-ncc-navy dark:text-white text-lg leading-snug line-clamp-2 group-hover:text-ncc-gold transition-colors">{tutorial.title}</h3>
                                    <button 
                                        onClick={(e) => handleToggleBookmark(e, tutorial.id)}
                                        className={`p-2 rounded-xl border transition-all ${userBookmarks.includes(tutorial.id) ? 'bg-ncc-gold border-ncc-gold text-ncc-navy dark:text-white shadow-lg shadow-ncc-gold/20' : 'bg-ncc-navy/5 border-transparent text-ncc-navy dark:text-white/40 hover:text-ncc-gold hover:bg-white dark:bg-[#050b14] hover:border-ncc-gold/20'}`}
                                    >
                                        <Bookmark className={`w-4 h-4 ${userBookmarks.includes(tutorial.id) ? 'fill-current' : ''}`} />
                                    </button>
                                </div>
                                <p className="text-gray-500 dark:text-white/70 text-xs line-clamp-2 mb-6 leading-relaxed">{tutorial.description}</p>
                                
                                <div className="flex items-center justify-between pt-4 border-t border-ncc-navy/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-ncc-gold/20 flex items-center justify-center">
                                            <BookOpen className="w-3 h-3 text-ncc-gold" />
                                        </div>
                                        <span className="text-[10px] font-black text-ncc-navy dark:text-white/40 uppercase tracking-widest">Syllabus Guided</span>
                                    </div>
                                    {isAdmin && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); if(confirm('Delete this tutorial?')) deleteItem('tutorials', tutorial.id); }}
                                            className="text-ncc-red/40 hover:text-ncc-red p-2 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Player Modal ── */}
            {activeVideo && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-ncc-navy/95 backdrop-blur-2xl" onClick={() => setActiveVideo(null)} />
                    
                    <div className="relative w-full max-w-5xl aspect-video bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/10 flex flex-col scale-in">
                        <div className="absolute top-6 right-6 z-10 flex gap-3">
                            <button 
                                onClick={() => setActiveVideo(null)}
                                className="bg-white dark:bg-[#050b14]/10 hover:bg-white dark:bg-[#050b14]/20 text-white p-3 rounded-2xl backdrop-blur-xl border border-white/20 transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <iframe 
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${activeVideo.videoUrl}?autoplay=1&rel=0`}
                            title={activeVideo.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                        
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/60 to-transparent p-12 pointer-events-none">
                            <span className="inline-block px-3 py-1 bg-ncc-gold text-ncc-navy dark:text-white rounded-lg text-[10px] font-black uppercase tracking-widest mb-4">NOW WATCHING</span>
                            <h2 className="text-4xl font-display font-bold text-white mb-2">{activeVideo.title}</h2>
                            <p className="text-white/60 text-lg max-w-2xl">{activeVideo.description}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add Tutorial Modal ── */}
            {isAddingMode && (
                <ModalOverlay onClose={() => setIsAddingMode(false)}>
                    <div className="p-10 w-[600px] max-w-[95vw] relative bg-white dark:bg-[#050b14]">
                        <button onClick={() => setIsAddingMode(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:bg-[#0d2137] rounded-full transition z-10"><X className="w-5 h-5 text-gray-400 dark:text-white/80" /></button>
                        <div className="mb-10">
                            <h3 className="text-3xl font-display font-bold text-ncc-navy dark:text-white">New Video Tutorial</h3>
                            <p className="text-sm text-gray-500 dark:text-white/70 font-medium">Publish training content from YouTube, G-Drive, or Cloudinary.</p>
                        </div>

                        <form onSubmit={handleAddTutorial} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 px-1">Tutorial Title</label>
                                <input 
                                    type="text" required 
                                    className="ncc-input text-sm py-4 bg-gray-50 dark:bg-[#0a1628] border-transparent focus:bg-white dark:bg-[#050b14]" 
                                    placeholder="e.g. Map Reading: Finding Grid References" 
                                    value={newTutorial.title} 
                                    onChange={e => setNewTutorial({...newTutorial, title: e.target.value})} 
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 px-1">Source Type</label>
                                <div className="flex bg-gray-100 dark:bg-[#0d2137] rounded-2xl p-1.5 mb-4">
                                    <button type="button" onClick={() => setNewTutorial({...newTutorial, sourceType: 'youtube'})} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${newTutorial.sourceType === 'youtube' ? 'bg-ncc-navy text-white shadow-lg' : 'text-gray-400 dark:text-white/80 hover:text-ncc-navy dark:text-white'}`}>YouTube</button>
                                    <button type="button" onClick={() => setNewTutorial({...newTutorial, sourceType: 'external'})} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${newTutorial.sourceType === 'external' ? 'bg-ncc-navy text-white shadow-lg' : 'text-gray-400 dark:text-white/80 hover:text-ncc-navy dark:text-white'}`}>External Link</button>
                                </div>
                                
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 px-1">
                                    {newTutorial.sourceType === 'youtube' ? 'Video URL (YouTube)' : 'Source URL (G-Drive / Cloudinary)'}
                                </label>
                                <input 
                                    type="text" required 
                                    className="ncc-input text-sm py-4 bg-gray-50 dark:bg-[#0a1628] border-transparent focus:bg-white dark:bg-[#050b14]" 
                                    placeholder={newTutorial.sourceType === 'youtube' ? "https://www.youtube.com/watch?v=..." : "Paste G-Drive or Cloudinary link..."}
                                    value={newTutorial.videoUrl} 
                                    onChange={e => setNewTutorial({...newTutorial, videoUrl: e.target.value})} 
                                />
                                <p className="text-[9px] text-gray-400 dark:text-white/80 mt-2 px-1">
                                    {newTutorial.sourceType === 'youtube' ? "Enter the full YouTube link or video ID." : "Ensure the file has 'Anyone with link' viewing permissions."}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 px-1">Category</label>
                                    <select 
                                        className="ncc-input text-sm py-4 bg-gray-50 dark:bg-[#0a1628] border-transparent focus:bg-white dark:bg-[#050b14]" 
                                        value={newTutorial.category} 
                                        onChange={e => setNewTutorial({...newTutorial, category: e.target.value})}
                                    >
                                        {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 px-1">Duration</label>
                                    <input 
                                        type="text" 
                                        className="ncc-input text-sm py-4 bg-gray-50 dark:bg-[#0a1628] border-transparent focus:bg-white dark:bg-[#050b14]" 
                                        placeholder="e.g. 12:45" 
                                        value={newTutorial.duration} 
                                        onChange={e => setNewTutorial({...newTutorial, duration: e.target.value})} 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 px-1">Description</label>
                                <textarea 
                                    className="ncc-input text-sm h-32 bg-gray-50 dark:bg-[#0a1628] border-transparent focus:bg-white dark:bg-[#050b14]" 
                                    placeholder="Briefly explain what this tutorial covers..." 
                                    value={newTutorial.description} 
                                    onChange={e => setNewTutorial({...newTutorial, description: e.target.value})} 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="flex items-end">
                                    <button type="submit" className="w-full h-12 ncc-btn ncc-btn-primary justify-center text-xs font-black uppercase tracking-widest shadow-xl">
                                        Publish to Dashboard
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </ModalOverlay>
            )}
        </div>
    );
};
