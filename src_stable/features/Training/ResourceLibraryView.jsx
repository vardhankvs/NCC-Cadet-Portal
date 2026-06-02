// src/features/Training/ResourceLibraryView.jsx
import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { BookOpen as BookOpenIcon, Search, Download, FileText, Bookmark, Upload, Trash2, Plus, Loader, X, CheckCircle, BarChart2, Clock, Award, Play, ExternalLink, Users, Edit2, VideoIcon, History } from '../../components/Icons.jsx';
import { 
    getCollectionRef, addResource, deleteResource, deleteItem, uploadTrainingFile,
    addToWatchHistory, toggleBookmark, addTutorial
} from '../../firebase/firestoreService.js';
import { db, storage } from '../../firebase/config.js';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, query, orderBy, onSnapshot, where, doc, deleteDoc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { QuizEngine } from './QuizEngine.jsx';
import { QuizForm } from './QuizForm.jsx';
import { formatDate } from '../../utils/dateUtils.js';
import { sendPushToAll } from '../../firebase/pushNotifications.js';

export const ResourceLibraryView = ({ mode = 'library' }) => {
    const { user: currentUser, userRole, userEnrollmentId } = useAuthContext();
    const isAdmin = userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'officer';
    const { materials, quizzes, cadets } = useDataContext();
    const [userProfile, setUserProfile] = useState(null);
    
    // Internal tab state only if needed, but Dashboard handles main split
    const [viewTab, setViewTab] = useState(mode === 'exams' ? 'exams' : 'library');
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('All');
    
    // Manuals Upload State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newLink, setNewLink] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newCategory, setNewCategory] = useState('Common Subjects');
    const [adding, setAdding] = useState(false);
    const [uploadType, setUploadType] = useState('link'); // 'link' or 'file'
    const [isUploading, setIsUploading] = useState(false);

    // Quiz State
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [isAddingQuiz, setIsAddingQuiz] = useState(false);
    const [quizToEdit, setQuizToEdit] = useState(null);
    const [viewingResults, setViewingResults] = useState(null);
    const [quizResults, setQuizResults] = useState([]);
    const [reviewData, setReviewData] = useState(null);

    // Update viewTab when mode prop changes
    useEffect(() => {
        setViewTab(mode);
    }, [mode]);

    useEffect(() => {
        if (!currentUser) return;
        const unsubscribe = onSnapshot(doc(getCollectionRef('users'), currentUser.uid), (doc) => {
            if (doc.exists()) setUserProfile(doc.data());
        });
        return () => unsubscribe();
    }, [currentUser]);

    useEffect(() => {
        // Fetch Resources
        const q = query(getCollectionRef('resources'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setResources(data);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        // Fetch Quiz Results for Admin or Cadet
        if (isAdmin && viewingResults) {
            const q = query(getCollectionRef('quiz_results'), where('quizId', '==', viewingResults.id));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                setQuizResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            return () => unsubscribe();
        } else if (userRole === 'cadet' && userEnrollmentId) {
            const q = query(getCollectionRef('quiz_results'), where('cadetReg', '==', userEnrollmentId));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                setQuizResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            return () => unsubscribe();
        }
    }, [userRole, viewingResults, userEnrollmentId, isAdmin]);

    const handleAddResource = async (e) => {
        e.preventDefault();
        if (!newLink || !newTitle) return;
        setAdding(true);
        try {
            await addResource({
                title: newTitle,
                category: newCategory,
                link: newLink,
                description: newDescription,
                type: newLink.toLowerCase().includes('.pdf') ? 'PDF' : 
                      newLink.toLowerCase().includes('.pptx') ? 'PPT' : 
                      newLink.toLowerCase().includes('.ppt') ? 'PPT' : 'LINK',
                size: uploadType === 'file' ? 'Direct Upload' : 'Cloud Link',
                createdAt: new Date().toISOString()
            });
            toast.success("Resource added successfully!");
            setIsUploadModalOpen(false);
            setNewTitle('');
            setNewLink('');
            setNewDescription('');
            setAdding(false);
        } catch (error) {
            toast.error("Failed to add resource.");
            setAdding(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const isPdf = file.type === 'application/pdf';
        const isPpt = file.name.endsWith('.ppt') || file.name.endsWith('.pptx');
        
        if (!isPdf && !isPpt) {
            return toast.error("Only PDF or PPT files are allowed");
        }

        setIsUploading(true);
        try {
            const path = isPdf ? 'pdfs' : 'ppts';
            const downloadUrl = await uploadTrainingFile(file, path);
            setNewLink(downloadUrl);
            setNewTitle(prev => prev || file.name.split('.')[0]);
            toast.success("File uploaded to storage! Now click Publish.");
        } catch (err) {
            toast.error("Upload failed: " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        try { await deleteResource(id); toast.success("Deleted."); } catch (e) { toast.error("Failed."); }
    };

    const handleDeleteResult = async (resultId, cadetId, quizId) => {
        if (!window.confirm("Reset this attempt?")) return;
        try {
            await deleteDoc(doc(getCollectionRef('quiz_results'), resultId));
            const cadetRef = doc(getCollectionRef('cadets'), cadetId);
            const snap = await getDoc(cadetRef);
            if (snap.exists()) {
                const history = snap.data().examHistory || [];
                await updateDoc(cadetRef, { examHistory: history.filter(h => h.quizId !== quizId) });
            }
            toast.success("Result reset.");
        } catch (err) { toast.error("Error."); }
    };

    const filteredResources = resources.filter(res => {
        const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'All' || res.category === filter;
        return matchesSearch && matchesFilter;
    });

    const [tutorials, setTutorials] = useState([]);
    const filteredTutorials = tutorials.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             t.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'All' || t.category === filter;
        return matchesSearch && matchesFilter;
    });
    const [viewMode, setViewMode] = useState('manuals'); // manuals, tutorials, bookmarks, history
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [isAddingTutorial, setIsAddingTutorial] = useState(false);
    const [editingTutorialId, setEditingTutorialId] = useState(null);
    const [selectedCadetId, setSelectedCadetId] = useState('me');
    const [newTutorial, setNewTutorial] = useState({ 
        title: '', videoUrl: '', description: '', category: 'Common Subjects', 
        duration: '', sourceType: 'youtube' 
    });

    useEffect(() => {
        const q = query(getCollectionRef('tutorials'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTutorials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, []);

    const activeCadet = selectedCadetId === 'me' ? (userProfile || currentUser) : (cadets.find(c => c.id === selectedCadetId) || userProfile || currentUser);
    const userBookmarks = activeCadet?.bookmarks || [];
    const watchHistory = activeCadet?.watchHistory || [];

    const handlePlayVideo = async (tutorial) => {
        setSelectedVideo(tutorial);
        if (currentUser && selectedCadetId === 'me') await addToWatchHistory(currentUser.uid, tutorial.id);
    };

    const handleToggleBookmark = async (e, id, type='manual') => {
        e.stopPropagation();
        if (!currentUser) return;
        const isBookmarked = userBookmarks.includes(id);
        try {
            await toggleBookmark(currentUser.uid, id, isBookmarked);
            toast.info(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
        } catch (err) { toast.error('Failed to update bookmark'); }
    };

    const handleDeleteTutorial = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this tutorial?")) return;
        try {
            await deleteDoc(doc(getCollectionRef('tutorials'), id));
            toast.success("Tutorial deleted.");
        } catch (err) { toast.error("Failed to delete."); }
    };

    const handleEditTutorial = (e, tutorial) => {
        e.stopPropagation();
        setNewTutorial({
            title: tutorial.title,
            videoUrl: tutorial.sourceType === 'youtube' ? `https://www.youtube.com/watch?v=${tutorial.videoUrl}` : tutorial.videoUrl,
            description: tutorial.description || '',
            category: tutorial.category || 'Common Subjects',
            duration: tutorial.duration || '',
            sourceType: tutorial.sourceType || 'youtube'
        });
        setEditingTutorialId(tutorial.id);
        setIsAddingTutorial(true);
    };

    const bookmarkedManuals = resources.filter(r => userBookmarks.includes(r.id));
    const bookmarkedTutorials = tutorials.filter(t => userBookmarks.includes(t.id));

    const categories = ['All', 'Common Subjects', 'Special Subjects', 'Training', 'Circulars', 'References'];

    // Quiz history for current cadet
    const currentCadet = userRole === 'cadet' ? cadets.find(c => (c.enrollmentId || c.regNo) === userEnrollmentId) : null;
    const completedQuizzes = currentCadet?.examHistory || [];

    if (activeQuiz || reviewData) {
        return (
            <div className="p-4 sm:p-8">
                <QuizEngine 
                    quiz={activeQuiz || reviewData.quiz} 
                    currentCadet={currentCadet} 
                    reviewData={reviewData?.details}
                    onClose={() => { setActiveQuiz(null); setReviewData(null); }} 
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            <header className="bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-3">
                            <BookOpenIcon className="w-8 h-8 text-ncc-gold" /> Digital Library
                        </h2>
                        <p className="text-gray-500 dark:text-white/70 text-sm">Official manuals, training videos, and reference materials.</p>
                    </div>
                </div>

                {/* Sub-tabs */}
                <div className="flex bg-ncc-navy/5 dark:bg-white/5 p-1 rounded-xl mt-6 border border-ncc-navy/5 dark:border-white/5">
                    {['manuals', 'tutorials', 'bookmarks', 'history'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setViewMode(tab)}
                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all ${viewMode === tab ? 'bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white shadow-md' : 'text-ncc-navy dark:text-white/40 dark:hover:text-white hover:text-ncc-navy'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </header>

            {['bookmarks', 'history'].includes(viewMode) && isAdmin && (
                <div className="flex items-center gap-4 bg-ncc-navy/5 p-4 rounded-2xl border border-ncc-navy/10 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-ncc-navy flex items-center justify-center text-white">
                        <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black text-ncc-navy dark:text-white/40 uppercase tracking-widest mb-1">Observation Mode</p>
                        <select 
                            className="bg-white dark:bg-[#0a1628] text-sm font-bold text-ncc-navy dark:text-white focus:outline-none w-full border border-[#ddd8cc] dark:border-white/10 rounded-lg px-2 py-1"
                            value={selectedCadetId}
                            onChange={(e) => setSelectedCadetId(e.target.value)}
                        >
                            <option value="me" className="dark:bg-[#0a1628] dark:text-white">Viewing: My Activity</option>
                            <optgroup label="Cadet Activity Oversight" className="dark:bg-[#050b14] dark:text-white/60">
                                {cadets.filter(c => c.name).sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                                    <option key={c.id} value={c.id} className="dark:bg-[#0a1628] dark:text-white">
                                        {c.rank} {c.name} ({c.enrollmentId || c.regimentalNumber})
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                </div>
            )}

            {['manuals', 'tutorials'].includes(viewMode) && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex gap-2 overflow-x-auto pb-2 ncc-scrollbar w-full sm:w-auto">
                        {viewMode === 'manuals' ? (
                            categories.map(cat => (
                                <button
                                    key={cat} onClick={() => setFilter(cat)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${filter === cat ? 'bg-ncc-navy text-white shadow-lg' : 'bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white/60 hover:bg-gray-50 dark:hover:bg-[#0a1628] border border-[#ddd8cc] dark:border-white/10'}`}
                                >
                                    {cat}
                                </button>
                            ))
                        ) : (
                            ['All', 'Common Subjects', 'Specialized Subjects', 'Weapon Training', 'Drill', 'Map Reading', 'Field Craft'].map(cat => (
                                <button
                                    key={cat} onClick={() => setFilter(cat)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${filter === cat ? 'bg-ncc-navy text-white shadow-lg' : 'bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white/60 hover:bg-gray-50 dark:hover:bg-[#0a1628] border border-[#ddd8cc] dark:border-white/10'}`}
                                >
                                    {cat}
                                </button>
                            ))
                        )}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/80" />
                            <input type="text" placeholder="Search..." className="ncc-input pl-10 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        {isAdmin && (
                            <button onClick={() => viewMode === 'manuals' ? setIsUploadModalOpen(true) : setIsAddingTutorial(true)} className="ncc-btn ncc-btn-primary px-4">
                                <Plus className="w-4 h-4 mr-2" /> {viewMode === 'manuals' ? 'Upload' : 'Add Tutorial'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {viewMode === 'manuals' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredResources.map((res) => (
                        <div key={res.id} className="ncc-card group hover:border-ncc-gold transition-all relative overflow-hidden">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-ncc-gold/10 rounded-2xl group-hover:bg-ncc-gold transition-colors"><FileText className="w-6 h-6 text-ncc-gold group-hover:text-white" /></div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={(e) => handleToggleBookmark(e, res.id, 'manual')}
                                            className={`p-1 rounded ${userBookmarks.includes(res.id) ? 'text-ncc-gold' : 'text-gray-300'}`}
                                        >
                                            <Bookmark className={`w-4 h-4 ${userBookmarks.includes(res.id) ? 'fill-current' : ''}`} />
                                        </button>
                                        {isAdmin && <button onClick={() => handleDelete(res.id)} className="p-1 text-ncc-red hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>}
                                    </div>
                                </div>
                                <h3 className="font-display font-bold text-lg text-ncc-navy dark:text-white mb-2 group-hover:text-ncc-gold transition-colors truncate">{res.title}</h3>
                                <p className="text-xs font-bold text-ncc-gold/70 uppercase tracking-widest mb-6">{res.category}</p>
                                <div className="flex gap-3 mt-auto">
                                    <a href={res.link} target="_blank" rel="noopener noreferrer" className="flex-1 ncc-btn ncc-btn-primary py-2.5 justify-center text-xs"><Download className="w-3.5 h-3.5" /> Access</a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {viewMode === 'tutorials' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredTutorials.map(tutorial => (
                        <div 
                            key={tutorial.id} 
                            onClick={() => tutorial.sourceType === 'external' ? window.open(tutorial.videoUrl, '_blank') : handlePlayVideo(tutorial)}
                            className="ncc-card group hover:border-ncc-gold transition-all overflow-hidden cursor-pointer"
                        >
                            <div className="aspect-video relative group-hover:scale-105 transition-transform duration-500 bg-ncc-navy/10 flex items-center justify-center">
                            {tutorial.sourceType === 'youtube' ? (
                                <img 
                                    src={`https://img.youtube.com/vi/${tutorial.videoUrl}/hqdefault.jpg`} 
                                    alt={tutorial.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                        e.target.parentNode.innerHTML = '<div class="flex flex-col items-center gap-2 text-ncc-navy dark:text-white/20"><svg class="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg><span class="text-[10px] font-black uppercase tracking-widest">Preview Unavailable</span></div>';
                                    }}
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-ncc-navy dark:text-white/20">
                                    <ExternalLink className="w-12 h-12" />
                                    <span class="text-[10px] font-black uppercase tracking-widest">External Resource</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-ncc-navy/0 group-hover:bg-ncc-navy/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <div className="w-12 h-12 rounded-full bg-ncc-gold text-white flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                                    <Play className="w-6 h-6 fill-current" />
                                </div>
                            </div>
                        </div>
                            <div className="p-4">
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <h4 className="font-bold text-ncc-navy dark:text-white line-clamp-1">{tutorial.title}</h4>
                                    <div className="flex gap-1">
                                        {isAdmin && (
                                            <>
                                                <button onClick={(e) => handleEditTutorial(e, tutorial)} className="p-1 text-gray-400 dark:text-white/80 hover:text-ncc-navy dark:text-white transition"><Edit2 className="w-3.5 h-3.5" /></button>
                                                <button onClick={(e) => handleDeleteTutorial(e, tutorial.id)} className="p-1 text-gray-400 dark:text-white/80 hover:text-ncc-red transition"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </>
                                        )}
                                        <button onClick={(e) => handleToggleBookmark(e, tutorial.id, 'video')} className={`p-1 rounded ${userBookmarks.includes(tutorial.id) ? 'text-ncc-gold' : 'text-gray-300'}`}>
                                            <Bookmark className={`w-3.5 h-3.5 ${userBookmarks.includes(tutorial.id) ? 'fill-current' : ''}`} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-500 dark:text-white/70 line-clamp-2">{tutorial.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {viewMode === 'bookmarks' && (
                <div className="space-y-8">
                    {bookmarkedManuals.length > 0 && (
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-ncc-gold mb-4 px-2">Saved Manuals</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {bookmarkedManuals.map(res => (
                                    <div key={res.id} className="ncc-card p-4">
                                        <h4 className="font-bold text-sm mb-2">{res.title}</h4>
                                        <a href={res.link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-ncc-navy dark:text-white uppercase">Access Document →</a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {bookmarkedTutorials.length > 0 && (
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-ncc-gold mb-4 px-2">Saved Tutorials</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {bookmarkedTutorials.map(t => (
                                    <div key={t.id} onClick={() => handlePlayVideo(t)} className="ncc-card p-4 cursor-pointer">
                                        <h4 className="font-bold text-sm mb-2">{t.title}</h4>
                                        <span className="text-[10px] font-bold text-ncc-navy dark:text-white uppercase">Watch Video →</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {bookmarkedManuals.length === 0 && bookmarkedTutorials.length === 0 && (
                        <div className="py-20 text-center text-gray-400 dark:text-white/80 italic">No bookmarks found.</div>
                    )}
                </div>
            )}

            {viewMode === 'history' && (
                <div className="ncc-card p-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-ncc-gold mb-6">Recent Activity</h3>
                    <div className="space-y-4">
                        {watchHistory.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-white/80 italic">No activity history yet.</p>
                        ) : (
                            watchHistory.map((h, i) => {
                                const tutorial = tutorials.find(t => t.id === h.tutorialId);
                                if (!tutorial) return null;
                                return (
                                    <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-ncc-navy/5 flex items-center justify-center"><Play className="w-4 h-4 text-ncc-navy dark:text-white" /></div>
                                            <div>
                                                <p className="text-sm font-bold text-ncc-navy dark:text-white">{tutorial.title}</p>
                                                <p className="text-[10px] text-gray-400 dark:text-white/80">Watched on {formatDate(h.timestamp)}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handlePlayVideo(tutorial)} className="text-[10px] font-black text-ncc-gold uppercase">Replay</button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Video Player Modal */}
            {selectedVideo && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-ncc-navy/95 backdrop-blur-xl">
                    <div className="relative w-full max-w-4xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl">
                        <button onClick={() => setSelectedVideo(null)} className="absolute top-4 right-4 z-10 p-2 bg-white/10 dark:bg-[#050b14]/10 hover:bg-white/20 dark:hover:bg-[#050b14]/20 rounded-full text-white transition"><X className="w-6 h-6" /></button>
                        {selectedVideo.sourceType === 'external' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-white p-20 text-center">
                                <ExternalLink className="w-20 h-20 text-ncc-gold mb-6" />
                                <h2 className="text-3xl font-display font-bold mb-4">{selectedVideo.title}</h2>
                                <p className="text-white/60 mb-10 max-w-xl">This resource is hosted on an external platform. Please use the button below to access the full training material.</p>
                                <a href={selectedVideo.videoUrl} target="_blank" rel="noopener noreferrer" className="ncc-btn ncc-btn-primary px-10 py-4 text-sm font-black uppercase tracking-widest">Open External Resource</a>
                            </div>
                        ) : (
                            <iframe 
                                className="w-full h-full" 
                                src={`https://www.youtube.com/embed/${selectedVideo.videoUrl}?autoplay=1`} 
                                title={selectedVideo.title} 
                                frameBorder="0" 
                                allowFullScreen
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Add/Edit Tutorial Modal */}
            {isAddingTutorial && (
                <ModalOverlay onClose={() => { setIsAddingTutorial(false); setEditingTutorialId(null); }}>
                    <div className="p-10 w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto ncc-scrollbar relative bg-white dark:bg-[#050b14]">
                        <button onClick={() => { setIsAddingTutorial(false); setEditingTutorialId(null); }} className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition z-10"><X className="w-5 h-5 text-gray-400 dark:text-white/80" /></button>
                        <div className="mb-10">
                            <h3 className="text-3xl font-display font-bold text-ncc-navy dark:text-white">{editingTutorialId ? 'Edit Tutorial' : 'New Video Tutorial'}</h3>
                            <p className="text-sm text-gray-500 dark:text-white/70 font-medium">Update training content details and sources.</p>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                let vId = newTutorial.videoUrl;
                                if (newTutorial.sourceType === 'youtube') {
                                    // Robust YouTube ID extraction using Regex
                                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                                    const match = vId.match(regExp);
                                    vId = (match && match[2].length === 11) ? match[2] : vId;
                                }
                                
                                if (editingTutorialId) {
                                    await updateDoc(doc(getCollectionRef('tutorials'), editingTutorialId), { ...newTutorial, videoUrl: vId, updatedAt: new Date().toISOString() });
                                    toast.success("Tutorial updated!");
                                    try {
                                        sendPushToAll('▶️ Tutorial Updated', `The video tutorial "${newTutorial.title}" has been updated.`);
                                    } catch (err) { console.error(err); }
                                } else {
                                    await addTutorial({ ...newTutorial, videoUrl: vId });
                                    toast.success("Tutorial published!");
                                }
                                setIsAddingTutorial(false);
                                setEditingTutorialId(null);
                                setNewTutorial({ title: '', videoUrl: '', description: '', category: 'Common Subjects', duration: '', sourceType: 'youtube' });
                            } catch (err) { toast.error("Error saving tutorial."); }
                        }} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 px-1">Tutorial Title</label>
                                <input type="text" required className="ncc-input text-sm py-4" placeholder="e.g. Map Reading: Finding Grid References" value={newTutorial.title} onChange={e => setNewTutorial({...newTutorial, title: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 px-1">Source Type</label>
                                <div className="flex bg-gray-100 dark:bg-[#0d2137] rounded-2xl p-1.5 mb-4">
                                    <button type="button" onClick={() => setNewTutorial({...newTutorial, sourceType: 'youtube'})} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${newTutorial.sourceType === 'youtube' ? 'bg-ncc-navy text-white shadow-lg' : 'text-gray-400 dark:text-white/80'}`}>YouTube</button>
                                    <button type="button" onClick={() => setNewTutorial({...newTutorial, sourceType: 'external'})} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${newTutorial.sourceType === 'external' ? 'bg-ncc-navy text-white shadow-lg' : 'text-gray-400 dark:text-white/80'}`}>External Link</button>
                                </div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 px-1">{newTutorial.sourceType === 'youtube' ? 'Video URL (YouTube)' : 'Source URL (G-Drive / Cloudinary)'}</label>
                                <input type="text" required className="ncc-input text-sm py-4" placeholder={newTutorial.sourceType === 'youtube' ? "https://www.youtube.com/watch?v=..." : "Paste link..."} value={newTutorial.videoUrl} onChange={e => setNewTutorial({...newTutorial, videoUrl: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 px-1">Category</label>
                                    <select className="ncc-input text-sm h-12" value={newTutorial.category} onChange={e => setNewTutorial({...newTutorial, category: e.target.value})}>
                                        {['Common Subjects', 'Specialized Subjects', 'Weapon Training', 'Drill', 'Map Reading', 'Field Craft'].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 px-1">Duration</label>
                                    <input type="text" className="ncc-input text-sm h-12" placeholder="e.g. 12:45" value={newTutorial.duration} onChange={e => setNewTutorial({...newTutorial, duration: e.target.value})} />
                                </div>
                            </div>
                            <button type="submit" className="w-full h-14 ncc-btn ncc-btn-primary justify-center text-xs font-black uppercase tracking-widest shadow-xl">Publish to Dashboard</button>
                        </form>
                    </div>
                </ModalOverlay>
            )}

            {viewTab === 'exams' && (
                <div className="space-y-6">
                    {isAdmin && (
                        <div className="bg-white dark:bg-[#050b14] p-5 rounded-2xl border border-[#ddd8cc] shadow-sm flex items-center justify-between">
                            <p className="text-sm text-gray-600 dark:text-white/80 font-medium">Create and manage interactive Mock Tests for the unit.</p>
                            <button onClick={() => setIsAddingQuiz(true)} className="ncc-btn ncc-btn-primary text-sm font-bold">+ Create Quiz</button>
                        </div>
                    )}

                    {isAddingQuiz && <QuizForm quizToEdit={quizToEdit} onClose={() => { setIsAddingQuiz(false); setQuizToEdit(null); }} />}

                    {viewingResults && (
                        <ResultsModal quiz={viewingResults} results={quizResults} onDelete={(res) => handleDeleteResult(res.id, res.cadetId, res.quizId)} onClose={() => setViewingResults(null)} />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {quizzes.map(quiz => {
                            const completed = completedQuizzes.find(cq => cq.quizId === quiz.id);
                            return (
                                <div key={quiz.id} className="bg-white dark:bg-[#050b14] rounded-2xl shadow-sm border border-[#ddd8cc] p-6 flex flex-col relative overflow-hidden group hover:border-ncc-gold transition-all">
                                    {completed && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl">COMPLETED</div>}
                                    <div className="mb-6">
                                        <span className="text-[10px] font-black text-ncc-gold uppercase tracking-[0.2em]">{quiz.certLevel} CERT</span>
                                        <h3 className="text-xl font-display font-bold text-ncc-navy dark:text-white mt-1">{quiz.title}</h3>
                                        <p className="text-xs text-gray-500 dark:text-white/70 mt-2">{quiz.durationMins} Mins • {quiz.questions?.length || 0} Questions</p>
                                    </div>
                                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/5 flex flex-col gap-3">
                                        {isAdmin ? (
                                            <div className="flex gap-2">
                                                <button onClick={() => setViewingResults(quiz)} className="flex-1 ncc-btn bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs flex items-center justify-center gap-2"><BarChart2 className="w-4 h-4" /> Results</button>
                                                <button onClick={() => { setQuizToEdit(quiz); setIsAddingQuiz(true); }} className="p-2 text-gray-400 dark:text-white/80 hover:text-ncc-navy dark:text-white border border-gray-100 dark:border-white/5 rounded-xl"><FileText className="w-4 h-4" /></button>
                                                <button onClick={() => deleteItem('quizzes', quiz.id)} className="p-2 text-gray-400 dark:text-white/80 hover:text-red-500 border border-gray-100 dark:border-white/5 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ) : completed ? (
                                            <button onClick={() => {
                                                const resultRecord = quizResults.find(r => r.quizId === quiz.id && r.cadetId === currentCadet?.id);
                                                if (resultRecord?.reviewDetails) setReviewData({ quiz, details: resultRecord.reviewDetails });
                                                else toast.info("Review not available.");
                                            }} className="w-full text-left">
                                                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex justify-between items-center group-hover:shadow-md transition">
                                                    <div>
                                                        <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">PASSED</div>
                                                        <div className="text-sm font-bold text-emerald-700">Score: {completed.score}/{completed.maxScore}</div>
                                                    </div>
                                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                                </div>
                                            </button>
                                        ) : (
                                            <button onClick={() => setActiveQuiz(quiz)} className="w-full ncc-btn ncc-btn-primary py-3 justify-center text-sm">Start Exam</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {isUploadModalOpen && (
                <ModalOverlay onClose={() => setIsUploadModalOpen(false)}>
                    <div className="p-10 w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto ncc-scrollbar relative bg-white dark:bg-[#050b14]">
                        <button onClick={() => setIsUploadModalOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition z-10"><X className="w-5 h-5 text-gray-400 dark:text-white/80" /></button>
                        <div className="mb-10">
                            <h3 className="text-3xl font-display font-bold text-ncc-navy dark:text-white">Upload Resource</h3>
                            <p className="text-sm text-gray-500 dark:text-white/70 font-medium">Distribute manuals, circulars, or training materials to the unit.</p>
                        </div>
                        <form onSubmit={handleAddResource} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">Title</label>
                                <input type="text" required className="ncc-input text-sm" placeholder="e.g. Weapon Training Handout" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">Source Type</label>
                                <div className="flex bg-gray-100 dark:bg-[#0d2137] rounded-2xl p-1.5 mb-4">
                                    <button type="button" onClick={() => setUploadType('link')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${uploadType === 'link' ? 'bg-ncc-navy text-white shadow-lg' : 'text-gray-400 dark:text-white/80 hover:text-ncc-navy dark:text-white'}`}>External Link</button>
                                    <button type="button" onClick={() => setUploadType('file')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${uploadType === 'file' ? 'bg-ncc-navy text-white shadow-lg' : 'text-gray-400 dark:text-white/80 hover:text-ncc-navy dark:text-white'}`}>Direct Upload</button>
                                </div>

                                {uploadType === 'link' ? (
                                    <>
                                        <input type="url" required className="ncc-input text-sm" placeholder="Paste link from G-Drive or Cloudinary..." value={newLink} onChange={e => setNewLink(e.target.value)} />
                                        <p className="text-[9px] text-gray-400 dark:text-white/80 mt-2">Provide a direct link to the document.</p>
                                    </>
                                ) : (
                                    <div className="relative">
                                        <input type="file" accept=".pdf,.ppt,.pptx" onChange={handleFileUpload} className="hidden" id="lib-file-upload" disabled={isUploading} />
                                        <label htmlFor="lib-file-upload" className={`w-full h-12 px-4 border-2 border-dashed border-[#ddd8cc] rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:border-ncc-navy hover:bg-gray-50 dark:bg-[#0a1628] transition ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            {isUploading ? <Loader className="animate-spin w-4 h-4 text-ncc-navy dark:text-white" /> : <Upload className="w-4 h-4 text-ncc-navy dark:text-white" />}
                                            <span className="text-xs font-bold text-ncc-navy dark:text-white">{isUploading ? 'Uploading to Storage...' : newLink ? 'File Ready ✅' : 'Choose PDF or PPT'}</span>
                                        </label>
                                        {newLink && <p className="text-[9px] text-emerald-600 mt-2 font-bold">Successfully uploaded to secure storage.</p>}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">Summary / Key Topics</label>
                                <textarea className="ncc-input text-sm h-20" placeholder="e.g. Covers Grid References, Northings, and Conventional Signs..." value={newDescription} onChange={e => setNewDescription(e.target.value)} />
                                <p className="text-[9px] text-gray-400 dark:text-white/80 mt-2">Batra AI will use this summary to answer cadet questions.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">Category</label>
                                    <select className="ncc-input text-sm h-12" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                                        {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button type="submit" disabled={adding || isUploading || !newLink} className="w-full h-12 ncc-btn ncc-btn-primary justify-center text-xs font-black uppercase tracking-widest shadow-xl disabled:opacity-50">
                                        {adding ? <><Loader className="animate-spin w-4 h-4 mr-2" /> Publishing...</> : 'Publish to Library'}
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

const ResultsModal = ({ quiz, results, onDelete, onClose }) => {
    const { cadets } = useDataContext();
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#050b14] rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                <header className="bg-ncc-navy text-white px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold font-display">{quiz.title} - Results</h2>
                        <p className="text-xs text-ncc-gold">{results.length} Attempts</p>
                    </div>
                    <button onClick={onClose} className="hover:rotate-90 transition p-1"><X className="w-6 h-6"/></button>
                </header>
                <div className="flex-1 overflow-y-auto ncc-scrollbar p-6 bg-gray-50 dark:bg-[#0a1628]">
                    <table className="w-full text-left border-collapse bg-white dark:bg-[#050b14] rounded-xl overflow-hidden shadow-sm">
                        <thead className="bg-gray-50 dark:bg-[#0a1628] border-b border-gray-200 dark:border-white/10">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-white/80 uppercase tracking-widest">Cadet</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-white/80 uppercase tracking-widest">Reg No</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-white/80 uppercase tracking-widest text-center">Score</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-white/80 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {results.map((res, idx) => (
                                <tr key={idx} className="ncc-tr transition-all">
                                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-white text-sm">{res.cadetName || cadets.find(c => c.id === res.cadetId)?.name || 'Unknown'}</td>
                                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-white/70 font-mono">{res.cadetReg}</td>
                                    <td className="px-6 py-4 text-center font-black text-ncc-navy dark:text-white">{res.score}/{res.maxScore}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => onDelete(res)} className="p-2 text-gray-400 dark:text-white/80 hover:text-red-500 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <footer className="p-4 bg-white dark:bg-[#050b14] border-t flex justify-end">
                    <button onClick={onClose} className="ncc-btn ncc-btn-primary px-8">Close</button>
                </footer>
            </div>
        </div>
    );
};
