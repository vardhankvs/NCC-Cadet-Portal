import React, { useEffect, useState } from 'react';
import { ShieldCheck, User, XCircle, AlertCircle } from './Icons.jsx';
import { getCollectionRef } from '../firebase/firestoreService.js';
import { getDocs, query, where, limit, doc, getDoc } from 'firebase/firestore';

export const VerifyCadet = ({ verifyId }) => {
    const [loading, setLoading] = useState(true);
    const [cadet, setCadet] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCadet = async () => {
            try {
                // Fetch from public data cadets collection
                const cadetsRef = getCollectionRef('cadets');
                if (!cadetsRef) {
                    setError("Database connection error.");
                    setLoading(false);
                    return;
                }
                
                // Query by document ID directly using getDoc
                const docRef = doc(cadetsRef, verifyId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    setCadet(docSnap.data());
                } else {
                    // Try fallback by enrollmentId
                    const q2 = query(cadetsRef, where('enrollmentId', '==', verifyId), limit(1));
                    const snap2 = await getDocs(q2);
                    if (snap2.empty) {
                        setError("No cadet found with this verification ID.");
                    } else {
                        setCadet(snap2.docs[0].data());
                    }
                }
            } catch (err) {
                console.error("Verification error:", err);
                setError("Unable to verify ID. System error.");
            } finally {
                setLoading(false);
            }
        };
        fetchCadet();
    }, [verifyId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050b14] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 border-4 border-ncc-gold border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-xl font-bold text-white font-display tracking-widest uppercase">Verifying Cadet ID...</h2>
            </div>
        );
    }

    if (error || !cadet) {
        return (
            <div className="min-h-screen bg-[#050b14] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                    <XCircle className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="text-3xl font-display font-black text-white mb-2 uppercase tracking-widest">Verification Failed</h2>
                <p className="text-white/60 mb-8 max-w-md">{error || "Invalid or tampered QR code. This ID card is not recognized by the NCC database."}</p>
                <a href="/" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all">Return to Home</a>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050b14] flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
            <div className="absolute top-1/4 right-0 w-96 h-96 bg-ncc-gold/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            
            <div className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4 border border-green-500/30">
                        <ShieldCheck className="w-10 h-10 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-display font-black text-white text-center uppercase tracking-widest">Verified NCC Cadet</h2>
                    <p className="text-green-400 text-sm font-bold uppercase tracking-[0.2em] mt-1">Official Digital ID</p>
                </div>

                <div className="flex flex-col items-center mb-8">
                    {cadet.photoUrl ? (
                        <img src={cadet.photoUrl} alt="Cadet" className="w-32 h-32 rounded-2xl object-cover border-4 border-white/10 mb-4 shadow-xl" />
                    ) : (
                        <div className="w-32 h-32 bg-white/5 rounded-2xl border-4 border-white/10 flex items-center justify-center mb-4 shadow-xl">
                            <User className="w-12 h-12 text-white/30" />
                        </div>
                    )}
                    <h3 className="text-2xl font-display font-bold text-white text-center">{cadet.name}</h3>
                    <p className="text-ncc-gold font-black uppercase tracking-[0.15em] text-sm mt-1">{cadet.enrollmentId || cadet.regimentalNumber}</p>
                </div>

                <div className="space-y-4 bg-black/20 p-5 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Rank</span>
                        <span className="text-white font-bold">{cadet.rank || 'CDT'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Certificate</span>
                        <span className="text-white font-bold">{cadet.certificate || cadet.B || 'NA'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Blood Group</span>
                        <span className="text-red-400 font-black">{cadet.bloodGroup || 'O+'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Status</span>
                        <span className="text-green-400 font-bold flex items-center gap-1"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div> Active</span>
                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-white/30 flex items-center justify-center gap-2">
                    <AlertCircle className="w-3 h-3" />
                    Generated & Verified by NCC Portal
                </div>
            </div>
        </div>
    );
};
