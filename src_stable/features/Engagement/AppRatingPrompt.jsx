import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { submitFeedback, getCollectionRef } from '../../firebase/firestoreService.js';
import { query, onSnapshot, where } from 'firebase/firestore';
import { Star, Send, Loader, X, MessageSquare } from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';

export const AppRatingPrompt = () => {
    const { user, userRole, userEnrollmentId, userName } = useAuthContext();
    const [showModal, setShowModal] = useState(false);
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        if (userRole !== 'cadet' || !userEnrollmentId) return;

        if (localStorage.getItem('ncc_has_rated') === 'true' || localStorage.getItem('ncc_rating_dismissed') === 'true') {
            return;
        }

        const ref = getCollectionRef('feedback');
        if (!ref) return;
        const fbQuery = query(ref, where('enrollmentId', '==', userEnrollmentId));
        
        const unsubscribe = onSnapshot(fbQuery, (snapshot) => {
            if (!snapshot.empty) {
                localStorage.setItem('ncc_has_rated', 'true');
            } else {
                // If not already rated, check the opens counter.
                // We use a simple time-based debounce to prevent rapid refreshes from counting.
                const lastOpen = parseInt(localStorage.getItem('ncc_last_open_time') || '0', 10);
                let opens = parseInt(localStorage.getItem('ncc_app_opens') || '0', 10);
                
                const now = Date.now();
                if (now - lastOpen > 10000) { // 10 seconds debounce
                    opens += 1;
                    localStorage.setItem('ncc_app_opens', opens.toString());
                    localStorage.setItem('ncc_last_open_time', now.toString());
                }
                
                if (opens >= 3) {
                    setShowModal(true);
                }
            }
        });

        return () => unsubscribe();
    }, [userRole, userEnrollmentId]);

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
            localStorage.setItem('ncc_has_rated', 'true');
            setShowModal(false);
            toast.success('Thank you for rating the app!');
        } catch (err) {
            toast.error('Failed to submit rating');
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        // Maybe don't ask again for a while, or never
        localStorage.setItem('ncc_rating_dismissed', 'true');
        setShowModal(false);
    };

    if (!showModal) return null;

    return (
        <ModalOverlay onClose={() => {}}>
            <div className="w-full max-w-md mx-auto bg-white dark:bg-[#050b14] rounded-3xl p-8 shadow-2xl relative border border-[#ddd8cc] dark:border-white/10 animate-modalIn">
                <button 
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 p-2 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-ncc-red transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-ncc-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Star className="w-8 h-8 text-ncc-gold fill-ncc-gold" />
                    </div>
                    <h2 className="text-2xl font-display font-black text-ncc-navy dark:text-white mb-2">Enjoying the NCC App?</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Your feedback helps us improve the app for the entire battalion.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHover(star)}
                                onMouseLeave={() => setHover(0)}
                                className="p-1 transition-transform hover:scale-110"
                            >
                                <Star 
                                    className={`w-10 h-10 transition-colors ${
                                        (hover || rating) >= star 
                                            ? 'text-ncc-gold fill-ncc-gold' 
                                            : 'text-gray-200 dark:text-white/10'
                                    }`} 
                                />
                            </button>
                        ))}
                    </div>

                    {rating > 0 && (
                        <div className="space-y-2 animate-fadeIn">
                            <label className="block text-xs font-bold text-ncc-navy dark:text-white uppercase tracking-widest">Any Comments? (Optional)</label>
                            <textarea 
                                className="w-full bg-gray-50 border border-gray-200 focus:border-ncc-gold/50 focus:bg-white dark:bg-[#0a1628] dark:border-white/10 rounded-xl p-3 text-sm outline-none transition-all h-24 resize-none ncc-scrollbar placeholder:text-gray-400"
                                placeholder="Tell us what you like or what could be better..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={loading || rating === 0}
                            className="w-full ncc-btn ncc-btn-primary justify-center py-4 shadow-xl"
                        >
                            {loading ? (
                                <><Loader className="animate-spin w-4 h-4 mr-2" /> Submitting...</>
                            ) : (
                                <><Send className="w-4 h-4 mr-2" /> Submit Rating</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </ModalOverlay>
    );
};
