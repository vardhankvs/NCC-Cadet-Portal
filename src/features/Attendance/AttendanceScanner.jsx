import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { db } from '../../firebase/config.js';
import { getCollectionRef } from '../../firebase/firestoreService.js';
import { doc, addDoc, query, where, getDocs, Timestamp, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { ShieldCheck, UserCheck, Clock, X, Camera, History } from '../../components/Icons.jsx';
import { toast } from 'react-toastify';

export const AttendanceScanner = () => {
    const { userProfile } = useAuthContext();
    const { cadets } = useDataContext();
    const [isScanning, setIsScanning] = useState(false);
    const [recentLogs, setRecentLogs] = useState([]);
    const scannerRef = useRef(null);
    const isProcessingRef = useRef(false);
    const lastScanRef = useRef(null);
    const cadetsRef = useRef(cadets);

    // Keep cadets ref updated for the stale closure
    useEffect(() => {
        cadetsRef.current = cadets;
    }, [cadets]);

    useEffect(() => {
        if (isScanning) {
            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            html5QrCode.start(
                { facingMode: "environment" }, 
                config, 
                onScanSuccess,
                (errorMessage) => {
                    // Silently ignore failures during scanning as they happen often
                }
            ).catch(err => {
                console.error("Camera start error:", err);
                toast.error("Failed to start camera. Please check permissions.");
                setIsScanning(false);
            });

            return () => {
                if (scannerRef.current) {
                    scannerRef.current.stop()
                        .then(() => scannerRef.current.clear())
                        .catch(e => console.error("Stop/Clear error", e));
                }
            };
        }
    }, [isScanning]);

    const onScanSuccess = async (decodedText) => {
        // 1. Processing Lock
        if (isProcessingRef.current) return;
        
        // 2. Local Debounce (using Ref to avoid stale closure)
        const now = Date.now();
        if (lastScanRef.current?.id === decodedText && now - lastScanRef.current.time < 5000) {
            return;
        }

        isProcessingRef.current = true;
        lastScanRef.current = { id: decodedText, time: now };
        
        const today = new Date().toISOString().split('T')[0];

        // 3. Lookup cadet from latest ref
        const cadet = cadetsRef.current.find(c => c.enrollmentId === decodedText);
        
        if (!cadet) {
            toast.error(`Unknown ID: ${decodedText}`);
            isProcessingRef.current = false;
            return;
        }

        try {
            const attRef = getCollectionRef('attendance');
            if (!attRef) throw new Error("Database not ready");

            // Check for duplicate scan today
            const q = query(
                attRef, 
                where('enrollmentId', '==', cadet.enrollmentId), 
                where('date', '==', today)
            );
            const existing = await getDocs(q);
            
            if (!existing.empty) {
                toast.warning(`${cadet.name} is already marked for today.`);
                isProcessingRef.current = false; // Important: unlock but don't proceed
                return;
            }

            // 1. Create Log Entry
            const division = cadet.enrollmentId.toUpperCase().includes('SW') ? 'SW' : 'SD';
            await addDoc(attRef, {
                cadetId: cadet.id,
                cadetName: cadet.name,
                enrollmentId: cadet.enrollmentId,
                certificate: cadet.certificate || 'NA',
                division: division,
                timestamp: serverTimestamp(),
                markedBy: userProfile?.name || 'ANO',
                institutionId: cadet.institutionId || 'gmrit',
                date: today
            });

            // 2. Sync to Cadet Document (Legacy support & Dashboard)
            const cadetRef = doc(getCollectionRef('cadets'), cadet.id);
            await updateDoc(cadetRef, {
                [`attendance.${today}`]: 'Present',
                updatedAt: serverTimestamp()
            });

            toast.success(`Attendance marked for ${cadet.name}`);
            
            // Add to local recent logs
            setRecentLogs(prev => [{
                name: cadet.name,
                time: new Date().toLocaleTimeString(),
                id: cadet.enrollmentId
            }, ...prev].slice(0, 5));

            // Optional: Haptic feedback if supported
            if (window.navigator.vibrate) window.navigator.vibrate(200);

        } catch (err) {
            console.error("Attendance log failed", err);
            toast.error("Database error. Please try again.");
        } finally {
            isProcessingRef.current = false;
        }
    };

    const onScanFailure = (error) => {
        // Silently ignore failures (it happens many times per second)
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 fade-in">
            <header className="flex justify-between items-center bg-white p-6 rounded-2xl border border-[#ddd8cc] shadow-sm">
                <div>
                    <h2 className="text-2xl font-display font-bold text-ncc-navy flex items-center gap-2">
                        <UserCheck className="w-6 h-6 text-ncc-gold" /> Smart Parade Ground
                    </h2>
                    <p className="text-gray-500 text-sm">Scan cadet QR codes to mark digital attendance.</p>
                </div>
                <button 
                    onClick={() => setIsScanning(!isScanning)}
                    className={`ncc-btn ${isScanning ? 'bg-red-500 text-white hover:bg-red-600' : 'ncc-btn-primary'} px-6`}
                >
                    {isScanning ? (
                        <><X className="w-4 h-4 mr-2" /> Stop Scanner</>
                    ) : (
                        <><Camera className="w-4 h-4 mr-2" /> Start Scanner</>
                    )}
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Scanner View */}
                <div className="bg-ncc-navy relative rounded-3xl overflow-hidden aspect-square flex flex-col items-center justify-center border-4 border-white shadow-xl">
                    {!isScanning ? (
                        <div className="text-center p-12">
                            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Camera className="w-10 h-10 text-ncc-gold/50" />
                            </div>
                            <h3 className="text-white font-bold text-lg mb-2">Scanner Offline</h3>
                            <p className="text-white/40 text-sm">Tap 'Start Scanner' to begin attendance session.</p>
                        </div>
                    ) : (
                        <div className="w-full h-full relative">
                            <div id="reader" className="w-full h-full"></div>
                            {/* Scanning Guide Overlay */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="w-48 h-48 border-4 border-ncc-gold/50 rounded-2xl animate-pulse"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="space-y-6">
                    <div className="ncc-card">
                        <div className="bg-[#f5f0e8] px-5 py-4 border-b border-[#ddd8cc] flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-ncc-navy flex items-center gap-2">
                                <History className="w-4 h-4 text-ncc-gold" /> Recent Scans
                            </h3>
                            <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded-full border border-[#ddd8cc]">Session Active</span>
                        </div>
                        <div className="p-0">
                            {recentLogs.length === 0 ? (
                                <div className="p-10 text-center text-gray-400">
                                    <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-xs font-semibold">Waiting for scans...</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-[#ede8df]">
                                    {recentLogs.map((log, idx) => (
                                        <div key={idx} className="p-4 flex items-center gap-4 bg-white hover:bg-[#f9f7f2] transition-colors">
                                            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                                                <UserCheck className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-ncc-navy truncate">{log.name}</p>
                                                <p className="text-[10px] text-gray-500 font-mono">{log.id}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xs font-black text-ncc-navy">{log.time}</p>
                                                <span className="text-[9px] font-bold text-emerald-500 uppercase">Verified</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-ncc-gold/10 border border-ncc-gold/20 p-6 rounded-2xl relative overflow-hidden">
                        <ShieldCheck className="absolute -right-4 -bottom-4 w-32 h-32 text-ncc-gold/10 rotate-12" />
                        <h4 className="text-ncc-navy font-bold text-sm mb-2 relative z-10">Pro-Tip for ANOs</h4>
                        <p className="text-ncc-navy/60 text-xs leading-relaxed relative z-10">
                            Hold the camera steady approximately 6-8 inches from the cadet's phone. Ensure there is adequate lighting for faster scanning.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
