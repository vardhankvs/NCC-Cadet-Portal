
import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { submitFeedback, getCollectionRef } from '../../firebase/firestoreService.js';
import { db } from '../../firebase/config.js';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where } from 'firebase/firestore';
import { Star, Send, Loader, CheckCircle, MessageSquare, BarChart2, Users, Trash2, Clock } from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils.js';

export const FeedbackView = () => {
    const { user, userRole, userEnrollmentId, userName } = useAuthContext();
    const { cadets } = useDataContext();
    const isAdmin = userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'officer';
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [previousFeedback, setPreviousFeedback] = useState(null);
    const [checkingPrevious, setCheckingPrevious] = useState(true);
    
    // Admin state
    const [feedbacks, setFeedbacks] = useState([]);
    const [stats, setStats] = useState({ average: 0, total: 0, distribution: [0,0,0,0,0] });

    // Check cadet's previous feedback
    useEffect(() => {
        if (isAdmin || !userEnrollmentId) { setCheckingPrevious(false); return; }
        const ref = getCollectionRef('feedback');
        const fbQuery = query(ref, where('enrollmentId', '==', userEnrollmentId));
        const unsubscribe = onSnapshot(fbQuery, (snapshot) => {
            if (!snapshot.empty) {
                setPreviousFeedback(snapshot.docs[0].data());
            } else {
                setPreviousFeedback(null);
            }
            setCheckingPrevious(false);
        });
        return () => unsubscribe();
    }, [isAdmin, userEnrollmentId]);

    useEffect(() => {
        if (!isAdmin) return;
        const fbQuery = query(getCollectionRef('feedback'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(fbQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFeedbacks(data);
            
            // Calculate stats
            if (data.length > 0) {
                const total = data.length;
                const sum = data.reduce((acc, f) => acc + (f.rating || 0), 0);
                const distribution = [0,0,0,0,0];
                data.forEach(f => { if(f.rating) distribution[f.rating - 1]++; });
                setStats({ average: (sum / total).toFixed(1), total, distribution });
            }
        });
        return () => unsubscribe();
    }, [isAdmin]);

    const handleDelete = async (id) => {
        if (!window.confirm("Remove this feedback entry?")) return;
        try {
            await deleteDoc(doc(getCollectionRef('feedback'), id));
            toast.success("Entry removed.");
        } catch (err) { toast.error("Failed to delete."); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) return toast.warning('Please select a rating');
        
        setLoading(true);
        try {
            await submitFeedback({
                cadetId: user?.uid,
                cadetName: userName || 'Anonymous Cadet',
                enrollmentId: userEnrollmentId,
                rating,
                message,
                timestamp: new Date().toISOString()
            });
            setSubmitted(true);
            toast.success('Thank you for your feedback!');
        } catch (err) {
            toast.error('Failed to submit feedback');
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin && checkingPrevious) {
        return (
            <div className="max-w-2xl mx-auto py-20 text-center">
                <div className="w-12 h-12 border-4 border-ncc-gold/30 border-t-ncc-gold rounded-full animate-spin mx-auto" />
            </div>
        );
    }

    if (!isAdmin && previousFeedback && !submitted) {
        const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
        return (
            <div className="max-w-2xl mx-auto py-10 fade-in">
                <header className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 rounded-full text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-4">
                        <CheckCircle className="w-3 h-3" /> Feedback Submitted
                    </div>
                    <h1 className="text-3xl font-display font-bold text-ncc-navy dark:text-white mb-2">Your Feedback</h1>
                    <p className="text-gray-400 dark:text-white/80 text-sm">You have already submitted your feedback for this cycle.</p>
                </header>

                <div className="bg-white dark:bg-[#050b14] rounded-[2rem] border-2 border-ncc-navy/5 p-10 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-ncc-gold/5 -mr-32 -mt-32 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative text-center space-y-6">
                        <div>
                            <p className="text-[10px] font-black text-ncc-navy dark:text-white/40 uppercase tracking-widest mb-4">Your Rating</p>
                            <div className="flex justify-center gap-3">
                                {[1,2,3,4,5].map(s => (
                                    <Star key={s} className={`w-10 h-10 transition-all ${previousFeedback.rating >= s ? 'text-ncc-gold fill-ncc-gold scale-110' : 'text-gray-200'}`} />
                                ))}
                            </div>
                            <p className="mt-3 text-lg font-display font-bold text-ncc-navy dark:text-white">
                                {ratingLabels[previousFeedback.rating] || ''}
                            </p>
                        </div>

                        {previousFeedback.message && (
                            <div className="bg-ncc-navy/5 rounded-2xl p-6 text-left">
                                <p className="text-[10px] font-black text-ncc-navy dark:text-white/40 uppercase tracking-widest mb-2">Your Comment</p>
                                <p className="text-sm text-gray-600 dark:text-white/80 leading-relaxed italic">"{previousFeedback.message}"</p>
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-ncc-navy dark:text-white/30 uppercase tracking-widest pt-2">
                            <Clock className="w-3 h-3" />
                            Submitted on {previousFeedback.timestamp ? new Date(previousFeedback.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="max-w-2xl mx-auto py-20 text-center fade-in">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <CheckCircle className="w-12 h-12 text-emerald-500" />
                </div>
                <h2 className="text-3xl font-display font-bold text-ncc-navy dark:text-white mb-4">Feedback Received</h2>
                <p className="text-gray-500 dark:text-white/70 mb-8 max-w-md mx-auto">Your insights help us build a better digital experience for the entire battalion. The staff will review your suggestions.</p>
            </div>
        );
    }

    if (isAdmin) {
        return (
            <div className="space-y-8 fade-in">
                <header className="bg-white dark:bg-[#050b14] p-8 rounded-[2rem] border border-ncc-navy/5 shadow-sm">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-display font-bold text-ncc-navy dark:text-white mb-1">Feedback Intelligence</h1>
                            <p className="text-sm text-gray-500 dark:text-white/70 font-medium">Monitoring cadet sentiment and system performance.</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-ncc-navy dark:text-white/30 uppercase tracking-[0.2em] mb-1">Overall Pulse</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex">
                                        {[1,2,3,4,5].map(s => (
                                            <Star key={s} className={`w-4 h-4 ${Math.round(stats.average) >= s ? 'text-ncc-gold fill-ncc-gold' : 'text-gray-200'}`} />
                                        ))}
                                    </div>
                                    <span className="text-2xl font-display font-bold text-ncc-navy dark:text-white">{stats.average}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="ncc-card p-8">
                            <div className="flex items-center gap-3 mb-8">
                                <BarChart2 className="w-5 h-5 text-ncc-gold" />
                                <h3 className="text-xs font-black text-ncc-navy dark:text-white uppercase tracking-widest">Rating Distribution</h3>
                            </div>
                            <div className="space-y-4">
                                {[5,4,3,2,1].map(r => (
                                    <div key={r} className="flex items-center gap-4">
                                        <span className="text-[10px] font-bold text-ncc-navy dark:text-white w-4">{r}★</span>
                                        <div className="flex-1 h-2 bg-ncc-navy/5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-ncc-gold transition-all duration-1000" 
                                                style={{ width: `${(stats.distribution[r-1] / stats.total * 100) || 0}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-ncc-navy dark:text-white/40 w-8 text-right">{stats.distribution[r-1]}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-8 pt-6 border-t border-ncc-navy/5 text-[10px] font-bold text-ncc-navy dark:text-white/40 uppercase tracking-widest text-center">Total Responses: {stats.total}</p>
                        </div>

                        <div className="ncc-card p-8 bg-ncc-navy text-white relative overflow-hidden">
                            <div className="relative z-10">
                                <h4 className="font-display font-bold text-xl mb-2">Unit Morale</h4>
                                <p className="text-xs text-white/60 mb-6 leading-relaxed">Systematic analysis of recent feedback indicates a {stats.average > 4 ? 'very positive' : 'stable'} unit morale.</p>
                                <div className="flex items-center gap-2 text-ncc-gold">
                                    <Users className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Active Monitoring</span>
                                </div>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white dark:bg-[#050b14]/5 rounded-full blur-3xl" />
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between px-4">
                            <h3 className="text-xs font-black text-ncc-navy dark:text-white uppercase tracking-widest">Individual Responses</h3>
                            <div className="text-[10px] font-bold text-ncc-navy dark:text-white/40 uppercase">Newest First</div>
                        </div>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 ncc-scrollbar">
                                    {feedbacks.map(f => {
                                        const linkedCadet = cadets.find(c => c.enrollmentId === f.enrollmentId);
                                        const displayName = f.cadetName !== 'Anonymous Cadet' ? f.cadetName : (linkedCadet?.fullName || linkedCadet?.name || 'Anonymous Cadet');
                                        
                                        return (
                                            <div key={f.id} className="bg-ncc-navy p-6 rounded-2xl border border-white/10 shadow-lg hover:shadow-ncc-navy/50 transition-all group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-xs uppercase">
                                                            {displayName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-white">{displayName}</h4>
                                                            <p className="text-[10px] font-bold text-ncc-gold uppercase tracking-widest">{f.enrollmentId || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex gap-0.5">
                                                            {[1,2,3,4,5].map(s => (
                                                                <Star key={s} className={`w-3 h-3 ${f.rating >= s ? 'text-ncc-gold fill-ncc-gold' : 'text-white/20'}`} />
                                                            ))}
                                                        </div>
                                                        <button onClick={() => handleDelete(f.id)} className="p-2 text-white/40 hover:text-ncc-red hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-white/80 leading-relaxed pl-13">{f.message || <span className="italic text-white/30">No comment provided.</span>}</p>
                                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest pl-13">
                                                    <Clock className="w-3 h-3" /> {formatDate(f.createdAt)}
                                                </div>
                                            </div>
                                        );
                                    })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-10 fade-in">
            <header className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-ncc-gold/10 rounded-full text-ncc-gold text-[10px] font-black uppercase tracking-widest mb-4">
                    <MessageSquare className="w-3 h-3" /> User Experience
                </div>
                <h1 className="text-4xl font-display font-bold text-ncc-navy dark:text-white mb-4">App Feedback</h1>
                <p className="text-gray-500 dark:text-white/70 max-w-lg mx-auto">Help us improve the GMRIT NCC Portal. Your feedback goes directly to the development and administrative team.</p>
            </header>

            <div className="bg-white dark:bg-[#050b14] rounded-[2.5rem] border-2 border-ncc-navy/5 p-10 shadow-xl shadow-ncc-navy/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-ncc-gold/5 -mr-32 -mt-32 rounded-full blur-3xl pointer-events-none" />
                
                <form onSubmit={handleSubmit} className="relative space-y-10">
                    {/* Rating Section */}
                    <div className="text-center">
                        <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-[0.3em] mb-6">Overall Experience</label>
                        <div className="flex justify-center gap-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHover(star)}
                                    onMouseLeave={() => setHover(0)}
                                    className="relative group p-2"
                                >
                                    <Star 
                                        className={`w-12 h-12 transition-all duration-300 ${
                                            (hover || rating) >= star 
                                                ? 'text-ncc-gold fill-ncc-gold scale-125' 
                                                : 'text-gray-200 scale-100'
                                        }`} 
                                    />
                                    <div className={`absolute inset-0 bg-ncc-gold/20 rounded-full blur-xl transition-opacity duration-500 ${rating === star ? 'opacity-100' : 'opacity-0'}`} />
                                </button>
                            ))}
                        </div>
                        <p className="mt-6 text-sm font-bold text-ncc-navy dark:text-white/40 italic">
                            {rating === 5 ? "Excellent - Simply Outstanding!" :
                             rating === 4 ? "Great - Very Helpful!" :
                             rating === 3 ? "Good - Meets Expectations" :
                             rating === 2 ? "Fair - Needs Improvement" :
                             rating === 1 ? "Poor - Not Satisfied" : "Select a star rating"}
                        </p>
                    </div>

                    {/* Message Section */}
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest px-2">How can we improve? (Optional)</label>
                        <textarea 
                            className="w-full bg-ncc-navy/5 border-2 border-transparent focus:border-ncc-gold/30 focus:bg-white dark:bg-[#050b14] rounded-[1.5rem] p-6 text-sm font-medium outline-none transition-all h-40 resize-none ncc-scrollbar placeholder:text-ncc-navy dark:text-white/20"
                            placeholder="Tell us about your experience, report bugs, or suggest new features for the battalion..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>

                    {/* Submit Button */}
                    <button 
                        type="submit" 
                        disabled={loading || rating === 0}
                        className="w-full ncc-btn ncc-btn-primary justify-center py-5 text-base shadow-2xl shadow-ncc-navy/20 group overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-white dark:bg-[#050b14]/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[-20deg]" />
                        {loading ? (
                            <><Loader className="animate-spin w-5 h-5 mr-2" /> Processing...</>
                        ) : (
                            <><Send className="w-5 h-5 mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Submit Feedback</>
                        )}
                    </button>
                </form>
            </div>

            <footer className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#050b14]/40 p-6 rounded-2xl border border-ncc-navy/5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-ncc-gold/10 rounded-xl flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5 text-ncc-gold" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-ncc-navy dark:text-white/40 uppercase tracking-widest">Active Listening</p>
                        <p className="text-xs font-bold text-ncc-navy dark:text-white">Every response is read by Staff.</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#050b14]/40 p-6 rounded-2xl border border-ncc-navy/5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-ncc-navy/10 rounded-xl flex items-center justify-center shrink-0">
                        <CheckCircle className="w-5 h-5 text-ncc-navy dark:text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-ncc-navy dark:text-white/40 uppercase tracking-widest">Digital Roadmap</p>
                        <p className="text-xs font-bold text-ncc-navy dark:text-white">Features added based on votes.</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#050b14]/40 p-6 rounded-2xl border border-ncc-navy/5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-ncc-red/10 rounded-xl flex items-center justify-center shrink-0">
                        <Star className="w-5 h-5 text-ncc-red" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-ncc-navy dark:text-white/40 uppercase tracking-widest">Privacy Focus</p>
                        <p className="text-xs font-bold text-ncc-navy dark:text-white">Your data is kept within the unit.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
