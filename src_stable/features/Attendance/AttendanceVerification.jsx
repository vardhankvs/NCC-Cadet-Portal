import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { getCollectionRef, verifyCadetAttendance, getCurrentUserInstitution } from '../../firebase/firestoreService.js';
import { query, where, onSnapshot, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { ShieldCheck, Target, MapPin, CheckCircle } from '../../components/Icons.jsx';
import { sendPushToUser } from '../../firebase/pushNotifications.js';
import { playNccNotificationSound } from '../../utils/notificationSound.js';

// Haversine formula to calculate distance in metres
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── Verifying GPS overlay ──────────────────────────────────────────────────────
const VerifyingOverlay = ({ message = "Verifying GPS Location…" }) => (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
         style={{ background: 'rgba(5,11,20,0.75)', backdropFilter: 'blur(4px)' }}>
        <div className="bg-white dark:bg-[#0a1628] rounded-2xl shadow-xl px-8 py-6 flex flex-col items-center gap-4 border border-[#ddd8cc] dark:border-orange-500/20">
            <div className="w-14 h-14 rounded-full border-4 border-orange-400/30 border-t-orange-500 animate-spin" />
            <p className="text-ncc-navy dark:text-white font-bold text-sm">{message}</p>
            <p className="text-gray-400 dark:text-white/50 text-xs text-center max-w-[200px]">
                Checking your proximity to the Parade Ground.
            </p>
        </div>
    </div>
);

export const AttendanceVerification = () => {
    const { userEnrollmentId, userRole } = useAuthContext();
    const { cadets } = useDataContext();
    
    // Prevent the admin side from rendering the Cadet verification UI
    if (userRole === 'admin') return null;

    const currentCadet = cadets?.find(c => c.enrollmentId === userEnrollmentId);

    const [pendingRequest, setPendingRequest] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [gpsVerifiedLocation, setGpsVerifiedLocation] = useState(null);
    const [showVerificationUI, setShowVerificationUI] = useState(false);
    
    const lastSeenRequestId = useRef(null);
    const checkingGpsRef = useRef(false);

    // Listen for real-time pending attendance requests for this cadet (must be created within last 3 minutes)
    useEffect(() => {
        if (!currentCadet?.enrollmentId) return;
        const ref = getCollectionRef('pending_attendance');
        if (!ref) return;

        const q = query(ref, where('enrollmentId', '==', currentCadet.enrollmentId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const now = Date.now();
                // Find a fresh pending document created in the last 3 minutes
                const pendingDoc = snapshot.docs.find(doc => {
                    const data = doc.data();
                    if (data.status !== 'pending') return false;
                    
                    if (!data.createdAt) {
                        return doc.metadata.hasPendingWrites; // Only accept if client just created it
                    }
                    const createdAtMs = data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt.seconds * 1000;
                    const diffMins = (now - createdAtMs) / 1000 / 60;
                    return diffMins <= 3;
                });

                if (pendingDoc) {
                    const req = { id: pendingDoc.id, ...pendingDoc.data() };
                    setPendingRequest(req);
                } else {
                    setPendingRequest(null);
                    setGpsVerifiedLocation(null);
                    setShowVerificationUI(false);
                    lastSeenRequestId.current = null;
                }
            } else {
                setPendingRequest(null);
                setGpsVerifiedLocation(null);
                setShowVerificationUI(false);
                lastSeenRequestId.current = null;
            }
        });

        return () => unsubscribe();
    }, [currentCadet]);

    // When a new pending request comes in, check GPS first
    useEffect(() => {
        if (!pendingRequest) return;

        const params = new URLSearchParams(window.location.search);
        const autoVerifyId = params.get('autoVerify');
        const isFromPush = (autoVerifyId === pendingRequest.id);

        if (pendingRequest.id === lastSeenRequestId.current && !isFromPush) return;
        if (checkingGpsRef.current) return; // Prevent multiple overlapping calls

        // If it was from push, we can clear the URL now so it doesn't re-trigger on unmount/remount
        if (isFromPush) {
            const url = new URL(window.location);
            url.searchParams.delete('autoVerify');
            url.searchParams.delete('adminLat');
            url.searchParams.delete('adminLng');
            window.history.replaceState({}, '', url);
        }

        const checkLocationFirst = () => {
            checkingGpsRef.current = true;
            
            if (!navigator.geolocation) {
                toast.error("Geolocation is not supported by your browser.");
                checkingGpsRef.current = false;
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    checkingGpsRef.current = false;
                    const cadetLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };

                    const adminLoc = pendingRequest.adminLocation;
                    if (!adminLoc) {
                        toast.error("Admin location not found. Cannot verify.");
                        return;
                    }

                    const dist = calculateDistance(
                        cadetLocation.latitude, cadetLocation.longitude,
                        adminLoc.latitude, adminLoc.longitude
                    );

                    if (dist <= 5000) {
                        // Cadet is within 5000m
                        setGpsVerifiedLocation(cadetLocation);
                        setShowVerificationUI(true);
                        lastSeenRequestId.current = pendingRequest.id;
                        // 🔊 Play branded NCC sound for in-app verification alert
                        playNccNotificationSound();

                        if (isFromPush) {
                            // Automatically mark attendance since they clicked the action button on the push notification
                            toast.success("Location Verified! Marking attendance...", { toastId: 'auto-mark', autoClose: 2000 });
                            handleMarkAttendanceTap(cadetLocation);
                        } else {
                            // Show the verification toast as per normal flow
                            toast.info(
                                <div className="flex flex-col gap-2">
                                    <strong className="block mb-1">📍 Location Verified!</strong>
                                    <p className="text-xs mb-2">You are within the Parade Ground perimeter.</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { toast.dismiss('verify-toast'); handleMarkAttendanceTap(); }}
                                            className="bg-emerald-500 text-white font-bold py-1.5 px-3 rounded text-xs shadow-sm hover:bg-emerald-600 transition-colors flex-1"
                                        >
                                            Mark Attendance
                                        </button>
                                        <button
                                            onClick={() => { toast.dismiss('verify-toast'); }}
                                            className="bg-gray-200 text-gray-700 font-bold py-1.5 px-3 rounded text-xs shadow-sm hover:bg-gray-300 transition-colors"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>,
                                { autoClose: false, closeOnClick: false, position: 'top-center', toastId: 'verify-toast' }
                            );
                        }
                    } else {
                        // IP Geolocation Mismatch Fallback: Show warning toast with In-Person Override option
                        setGpsVerifiedLocation(cadetLocation);
                        setShowVerificationUI(true);
                        lastSeenRequestId.current = pendingRequest.id;

                        toast.warning(
                            <div className="flex flex-col gap-2 p-1">
                                <strong className="block mb-0.5 text-xs">⚠️ Location Distance Warning ({Math.round(dist / 1000)} km)</strong>
                                <p className="text-[11px] leading-tight text-gray-200">
                                    Device GPS / Network IP mismatch detected. If you are standing near your ANO on the Parade Ground, tap below to confirm:
                                </p>
                                <div className="flex gap-2 mt-1">
                                    <button
                                        onClick={() => { toast.dismiss('dist-warning-toast'); handleMarkAttendanceTap(cadetLocation); }}
                                        className="bg-amber-500 hover:bg-amber-600 text-ncc-navy font-bold py-1.5 px-3 rounded text-xs shadow-md transition-colors flex-1"
                                    >
                                        ✅ Confirm In-Person Attendance
                                    </button>
                                    <button
                                        onClick={() => { toast.dismiss('dist-warning-toast'); }}
                                        className="bg-gray-700 text-white font-bold py-1.5 px-2.5 rounded text-xs shadow-sm hover:bg-gray-600 transition-colors"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>,
                            { autoClose: false, closeOnClick: false, position: 'top-center', toastId: 'dist-warning-toast' }
                        );
                    }
                },
                (error) => {
                    checkingGpsRef.current = false;
                    console.error("GPS error:", error);
                    let msg = `GPS Error (${error.code}): ${error.message}`;
                    if (error.code === error.PERMISSION_DENIED) {
                        msg = "Location permission denied. Please allow location access to mark attendance.";
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                        msg = "GPS signal unavailable. Move to an open area and try again.";
                    } else if (error.code === error.TIMEOUT) {
                        msg = "GPS request timed out. Please try again.";
                    }
                    toast.error(
                        <div className="flex flex-col gap-2">
                            <span>{msg}</span>
                            <button 
                                onClick={() => { toast.dismiss(); checkLocationFirst(); }}
                                className="bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm hover:bg-red-700 w-fit transition-colors"
                            >
                                🔄 Retry GPS
                            </button>
                        </div>, 
                        { autoClose: 10000, closeOnClick: false }
                    );
                },
                {
                    enableHighAccuracy: true,
                    timeout: 45000,
                    maximumAge: 30000,
                }
            );
        };

        checkLocationFirst();
    }, [pendingRequest]);

    const handleMarkAttendanceTap = useCallback(async (locOverride) => {
        const locationToUse = (locOverride && locOverride.latitude) ? locOverride : gpsVerifiedLocation;
        if (!pendingRequest || !locationToUse) return;
        
        setIsVerifying(true);
        
        try {
            await verifyCadetAttendance(pendingRequest.id, locationToUse);

            const attRef  = getCollectionRef('attendance');
            const today   = new Date().toISOString().split('T')[0];
            const division = (currentCadet.enrollmentId || '').toUpperCase().includes('SW') ? 'SW' : 'SD';

            await addDoc(attRef, {
                cadetId:      currentCadet.id,
                cadetName:    currentCadet.name,
                enrollmentId: currentCadet.enrollmentId,
                certificate:  currentCadet.certificate || 'NA',
                division,
                timestamp:    serverTimestamp(),
                markedBy:     'Verified (GPS)',
                institutionId: await getCurrentUserInstitution(),
                date: today,
            });

            const cadetRef = doc(getCollectionRef('cadets'), currentCadet.id);
            await updateDoc(cadetRef, {
                [`attendance.${today}`]: 'Present',
                updatedAt: serverTimestamp(),
            });

            toast.success("✅ Attendance Marked Successfully!");
            setPendingRequest(null);
            setGpsVerifiedLocation(null);
            setShowVerificationUI(false);

            if (currentCadet?.enrollmentId) {
                sendPushToUser(
                    currentCadet.enrollmentId,
                    "✅ Attendance Marked",
                    "Your Attendance was marked as Present for Today's class."
                );
            }

            window.history.replaceState({}, '', window.location.pathname + '?tab=attendance');
        } catch (err) {
            toast.error(`Error marking attendance: ${err.message}`);
            console.error(err);
        } finally {
            setIsVerifying(false);
        }
    }, [pendingRequest, gpsVerifiedLocation, currentCadet]);

    if (!pendingRequest || !showVerificationUI) return null;

    return (
        <>
            {isVerifying && <VerifyingOverlay message="Marking Attendance…" />}

            {/* In-app attendance banner */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden mb-8 animate-in slide-in-from-top-4">
                <Target className="absolute -right-10 -top-10 w-48 h-48 opacity-20" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-sm">
                            <CheckCircle className="w-8 h-8 text-white animate-bounce" />
                        </div>
                        <div>
                            <h3 className="font-display font-bold text-xl mb-1">Location Verified</h3>
                            <p className="text-white/80 text-sm">
                                You are within the Parade Ground. Tap to mark your attendance.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleMarkAttendanceTap}
                        disabled={isVerifying}
                        className="whitespace-nowrap px-8 py-4 bg-white text-emerald-600 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg disabled:opacity-50 flex items-center gap-2"
                    >
                        Mark Attendance <CheckCircle className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </>
    );
};

