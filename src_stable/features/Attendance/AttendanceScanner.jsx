import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { getCollectionRef, createPendingAttendance } from '../../firebase/firestoreService.js';
import { query, where, getDocs, doc, addDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { sendAttendancePush } from '../../firebase/pushNotifications.js';
import { getTodayDateString } from '../../utils/dateUtils.js';
import {
    ShieldCheck, UserCheck, Clock, X, Camera,
    History, MapPin, Target, AlertTriangle, Shield, CheckCircle
} from '../../components/Icons.jsx';
import { toast } from 'react-toastify';

// ── Haversine Distance (meters) ───────────────────────────────────────────────
const haversineMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const toRad = d => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── Parse "HH:MM" to today's Date ────────────────────────────────────────────
const parseTimeToday = (hhmm) => {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
};

// ── GPS Consent Modal ──────────────────────────────────────────────────────────
const GpsConsentModal = ({ onAllow, onDeny }) => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
         style={{ background: 'rgba(5,11,20,0.85)', backdropFilter: 'blur(6px)' }}>
        <div className="bg-white dark:bg-[#0a1628] rounded-3xl shadow-2xl max-w-sm w-full p-8 border border-[#ddd8cc] dark:border-ncc-gold/20">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-ncc-gold/20 to-orange-500/20 flex items-center justify-center mx-auto mb-6 border-4 border-ncc-gold/30">
                <MapPin className="w-10 h-10 text-ncc-gold" />
            </div>
            <h2 className="text-xl font-display font-black text-ncc-navy dark:text-white text-center mb-2">
                Allow Location Access?
            </h2>
            <p className="text-sm text-gray-500 dark:text-white/60 text-center mb-6 leading-relaxed">
                The scanner needs your <strong className="text-ncc-navy dark:text-white">current GPS location</strong> to
                set the Parade Ground perimeter. Cadets must be within{' '}
                <strong className="text-ncc-navy dark:text-white">200 metres</strong> of this position.
            </p>
            <div className="bg-[#f5f0e8] dark:bg-[#050b14] rounded-2xl p-4 mb-6 space-y-2 text-xs text-gray-600 dark:text-white/60">
                {['Location is only used for this session',
                  'Not stored or shared beyond attendance records',
                  'Session ends when you tap "Stop Scanner"'].map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 text-[10px] font-bold shrink-0">✓</span>
                        {t}
                    </div>
                ))}
            </div>
            <div className="flex gap-3">
                <button onClick={onDeny}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/50 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    Cancel
                </button>
                <button onClick={onAllow}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-ncc-gold to-amber-500 text-ncc-navy font-black text-sm hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2">
                    <MapPin className="w-4 h-4" /> Allow Location
                </button>
            </div>
        </div>
    </div>
);

// ── Acquiring GPS overlay ──────────────────────────────────────────────────────
const AcquiringGpsOverlay = () => (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
         style={{ background: 'rgba(5,11,20,0.75)', backdropFilter: 'blur(4px)' }}>
        <div className="bg-white dark:bg-[#0a1628] rounded-2xl shadow-xl px-8 py-6 flex flex-col items-center gap-4 border border-[#ddd8cc] dark:border-ncc-gold/20">
            <div className="w-14 h-14 rounded-full border-4 border-ncc-gold/30 border-t-ncc-gold animate-spin" />
            <p className="text-ncc-navy dark:text-white font-bold text-sm">Acquiring GPS Signal…</p>
            <p className="text-gray-400 dark:text-white/50 text-xs text-center max-w-[200px]">
                Please ensure location is enabled on your device.
            </p>
        </div>
    </div>
);

// ── Session Timer Panel ────────────────────────────────────────────────────────
const SessionTimerPanel = ({ startTime, endTime, onStartChange, onEndChange, windowStatus, timeLeft, isScanning }) => {
    const isExpired = windowStatus === 'expired';
    const isActive  = windowStatus === 'active';
    const isPending = windowStatus === 'pending';
    const isIdle    = windowStatus === 'idle' || windowStatus === 'no-window';

    let borderColor = 'border-gray-200 dark:border-white/10';
    let bgColor     = 'bg-white dark:bg-[#0a1628]';
    let badgeColor  = 'bg-gray-400';
    let badgeLabel  = startTime && endTime ? '⏳ Not Started' : '⚙️ Set Window';

    if (isActive)  { borderColor = 'border-emerald-400'; bgColor = 'bg-emerald-50 dark:bg-emerald-900/10'; badgeColor = 'bg-emerald-500'; badgeLabel = '✅ Window Open'; }
    if (isExpired) { borderColor = 'border-red-400';     bgColor = 'bg-red-50 dark:bg-red-900/10';         badgeColor = 'bg-red-500';     badgeLabel = '⛔ Expired'; }
    if (isPending) { borderColor = 'border-yellow-400';  bgColor = 'bg-yellow-50 dark:bg-yellow-900/10';   badgeColor = 'bg-yellow-500';  badgeLabel = '⏳ Not Open Yet'; }

    return (
        <div className={`rounded-2xl border-2 ${borderColor} ${bgColor} p-4 transition-all duration-300`}>
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-ncc-navy dark:text-white flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-ncc-gold" /> Attendance Window
                </h4>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white ${badgeColor} ${isActive ? 'animate-pulse' : ''}`}>
                    {badgeLabel}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-white/50 uppercase mb-1">Open At</label>
                    <input
                        type="time"
                        value={startTime}
                        onChange={e => onStartChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white font-bold text-sm focus:outline-none focus:border-ncc-gold/50"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-white/50 uppercase mb-1">Close At</label>
                    <input
                        type="time"
                        value={endTime}
                        onChange={e => onEndChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white font-bold text-sm focus:outline-none focus:border-ncc-gold/50"
                    />
                </div>
            </div>

            {!startTime && !endTime && (
                <p className="text-[10px] text-gray-400 dark:text-white/40 italic">
                    Optional: set a window to auto-flag late arrivals. Leave blank to always mark <strong>Present</strong>.
                </p>
            )}

            {isActive && timeLeft && (
                <div className="flex items-center gap-2 bg-emerald-500/10 rounded-xl px-3 py-2">
                    <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Window closes in <strong className="font-black tabular-nums">{timeLeft}</strong>
                    </span>
                </div>
            )}
            {isPending && startTime && (
                <div className="flex items-center gap-2 bg-yellow-500/10 rounded-xl px-3 py-2">
                    <Clock className="w-4 h-4 text-yellow-500 shrink-0" />
                    <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400">
                        Window opens at <strong className="font-black">{startTime}</strong>
                    </span>
                </div>
            )}
            {isExpired && (
                <div className="flex items-center gap-2 bg-red-500/10 rounded-xl px-3 py-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">
                        New scans flagged as <strong className="font-black">LATE</strong>
                    </span>
                </div>
            )}
        </div>
    );
};

// ── Live Map Panel (Leaflet) — self-contained ──────────────────────────────────
const LiveMapPanel = ({ adminLocation, scannedCadets }) => {
    const containerRef   = useRef(null);
    const mapInstanceRef = useRef(null);   // Leaflet map instance
    const LRef           = useRef(null);   // Leaflet library ref
    const adminMarkerRef = useRef(null);
    const cadetMarkersRef= useRef([]);
    const circleRef      = useRef(null);
    const [mapReady, setMapReady] = useState(false);

    // ── Step 1: Load Leaflet CSS + JS from CDN (once globally) ───────────────
    useEffect(() => {
        // CSS
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id   = 'leaflet-css';
            link.rel  = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            link.crossOrigin = '';
            document.head.appendChild(link);
        }

        // JS — load only if not already loaded
        if (window.L) {
            LRef.current = window.L;
            return;
        }

        if (document.getElementById('leaflet-js')) {
            // Script tag exists but L not ready yet — wait for it
            const poll = setInterval(() => {
                if (window.L) { LRef.current = window.L; clearInterval(poll); }
            }, 100);
            return () => clearInterval(poll);
        }

        const script = document.createElement('script');
        script.id  = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.crossOrigin = '';
        script.onload = () => { LRef.current = window.L; };
        document.head.appendChild(script);
    }, []);

    // ── Step 2: Initialize map when adminLocation arrives and container is ready
    useEffect(() => {
        if (!adminLocation || mapInstanceRef.current) return;

        const tryInit = () => {
            const L = LRef.current || window.L;
            if (!L || !containerRef.current) return false;

            // Guard: container might already have a Leaflet instance
            if (containerRef.current._leaflet_id) return false;

            try {
                const map = L.map(containerRef.current, {
                    center: [adminLocation.latitude, adminLocation.longitude],
                    zoom: 18,
                    zoomControl: true,
                    attributionControl: false,
                });

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    crossOrigin: true,
                }).addTo(map);

                // Admin marker — pulsing blue circle
                const adminIcon = L.divIcon({
                    className: '',
                    html: `<div style="
                        width:20px;height:20px;
                        background:#1d4ed8;
                        border:3px solid white;
                        border-radius:50%;
                        box-shadow:0 0 0 8px rgba(29,78,216,0.2),0 0 0 16px rgba(29,78,216,0.08);
                    "></div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                });

                adminMarkerRef.current = L.marker(
                    [adminLocation.latitude, adminLocation.longitude],
                    { icon: adminIcon }
                ).bindPopup('<b>📍 Admin (You)</b>').addTo(map);

                // 200m boundary circle
                circleRef.current = L.circle(
                    [adminLocation.latitude, adminLocation.longitude],
                    {
                        radius: 200,
                        color: '#22c55e',
                        weight: 2.5,
                        fillColor: '#22c55e',
                        fillOpacity: 0.07,
                        dashArray: '8 6',
                    }
                ).addTo(map);

                // Force a resize after render so tiles load properly
                setTimeout(() => map.invalidateSize(), 300);

                mapInstanceRef.current = map;
                LRef.current = L;
                setMapReady(true);
                return true;
            } catch (e) {
                console.error('Leaflet init error:', e);
                return false;
            }
        };

        // Retry until Leaflet JS is loaded and container is mounted
        if (!tryInit()) {
            const retry = setInterval(() => { if (tryInit()) clearInterval(retry); }, 200);
            return () => clearInterval(retry);
        }
    }, [adminLocation]);

    // ── Step 3: Plot cadet markers whenever scannedCadets changes ────────────
    useEffect(() => {
        const L = LRef.current || window.L;
        if (!mapInstanceRef.current || !L || !adminLocation) return;

        // Remove old cadet markers
        cadetMarkersRef.current.forEach(m => m.remove());
        cadetMarkersRef.current = [];

        scannedCadets.forEach(cadet => {
            if (cadet.lat == null || cadet.lng == null) return;
            const dist    = haversineMeters(adminLocation.latitude, adminLocation.longitude, cadet.lat, cadet.lng);
            const inRange = dist <= 200;
            const color   = inRange ? '#22c55e' : '#ef4444';
            const label   = inRange ? '✅ In range' : '❌ Out of range';

            const icon = L.divIcon({
                className: '',
                html: `<div style="
                    width:14px;height:14px;
                    background:${color};
                    border:2px solid white;
                    border-radius:50%;
                    box-shadow:0 0 6px ${color}99;
                " title="${cadet.name}"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
            });

            const marker = L.marker([cadet.lat, cadet.lng], { icon })
                .bindPopup(`<b>${cadet.name}</b><br>${label}<br><small>${Math.round(dist)} m from admin</small>`)
                .addTo(mapInstanceRef.current);

            cadetMarkersRef.current.push(marker);
        });
    }, [scannedCadets, adminLocation]);

    // ── Step 4: Destroy map when adminLocation is cleared (scanner stopped) ──
    useEffect(() => {
        if (adminLocation) return; // only run when it becomes null
        if (mapInstanceRef.current) {
            try { mapInstanceRef.current.remove(); } catch (_) {}
            mapInstanceRef.current = null;
            cadetMarkersRef.current = [];
            adminMarkerRef.current  = null;
            circleRef.current       = null;
            setMapReady(false);
        }
    }, [adminLocation]);

    return (
        <div className="ncc-card overflow-hidden">
            {/* Header */}
            <div className="bg-[#f5f0e8] dark:bg-[#0a1628] px-5 py-3 border-b border-[#ddd8cc] flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-ncc-navy dark:text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-ncc-gold" /> Live Parade Ground Map
                </h3>
                <div className="flex items-center gap-4 text-[10px] font-bold text-gray-500 dark:text-white/60">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600 inline-block shadow" /> Admin</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow" /> In Range</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block shadow" /> Out</span>
                </div>
            </div>

            {/* Map container */}
            <div className="relative" style={{ height: '320px' }}>
                {/* Placeholder shown when GPS not locked */}
                {!adminLocation && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-100 dark:bg-[#050b14]">
                        <div className="w-16 h-16 rounded-full bg-ncc-navy/10 dark:bg-white/5 flex items-center justify-center">
                            <MapPin className="w-8 h-8 text-gray-300 dark:text-white/20" />
                        </div>
                        <p className="text-xs font-semibold text-gray-400 dark:text-white/30">
                            Start the scanner to activate the live map
                        </p>
                    </div>
                )}

                {/* Leaflet renders INTO this div — keep it always in the DOM */}
                <div
                    ref={containerRef}
                    style={{ height: '100%', width: '100%', zIndex: 1, position: 'relative' }}
                />
            </div>

            {/* Footer status bar */}
            <div className="px-4 py-2 bg-white dark:bg-[#050b14] border-t border-gray-100 dark:border-white/5 text-[10px] text-gray-400 dark:text-white/40 font-mono flex items-center justify-between">
                {adminLocation ? (
                    <>
                        <span>📍 {adminLocation.latitude.toFixed(6)}, {adminLocation.longitude.toFixed(6)} · ±{adminLocation.accuracy}m</span>
                        <span className="font-bold text-emerald-500">{scannedCadets.length} cadet{scannedCadets.length !== 1 ? 's' : ''} plotted</span>
                    </>
                ) : (
                    <span>Awaiting GPS lock…</span>
                )}
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// Main AttendanceScanner Component
// ══════════════════════════════════════════════════════════════════════════════
export const AttendanceScanner = () => {
    const { userProfile, userRole, actualRole, isDelegatedCadet, userInstitutionId, userEnrollmentId, userName, user } = useAuthContext();
    const isCadetUser = isDelegatedCadet || userRole === 'cadet' || actualRole === 'cadet';
    const { cadets }      = useDataContext();

    const [isScanning,      setIsScanning]      = useState(false);
    const [recentLogs,      setRecentLogs]      = useState([]);
    const [adminLocation,   setAdminLocation]   = useState(null);
    const [gpsStatus,       setGpsStatus]       = useState('idle');
    const [showConsentModal,setShowConsentModal]= useState(false);
    const [scannedMapCadets,setScannedMapCadets]= useState([]);
    const [delegatedScans,  setDelegatedScans]  = useState([]);
    const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

    // ── Time-Window state ──────────────────────────────────────────────────────
    const [sessionStart, setSessionStart] = useState('');
    const [sessionEnd,   setSessionEnd]   = useState('');
    const [windowStatus, setWindowStatus] = useState('idle');
    const [timeLeft,     setTimeLeft]     = useState(null);

    // ── Refs ───────────────────────────────────────────────────────────────────
    const scannerRef      = useRef(null);
    const isProcessingRef = useRef(false);
    const lastScanRef     = useRef(null);
    const cadetsRef       = useRef(cadets);
    const sessionStartRef = useRef(sessionStart);  // ← always-fresh refs for stale closures
    const sessionEndRef   = useRef(sessionEnd);
    const adminLocRef     = useRef(adminLocation);
    const windowTimerRef  = useRef(null);

    // Keep refs in sync with state
    useEffect(() => { cadetsRef.current     = cadets;         }, [cadets]);
    useEffect(() => { sessionStartRef.current = sessionStart; }, [sessionStart]);
    useEffect(() => { sessionEndRef.current   = sessionEnd;   }, [sessionEnd]);
    useEffect(() => { adminLocRef.current     = adminLocation;}, [adminLocation]);

    // ── Time-window live ticker (runs always when times are set) ──────────────
    useEffect(() => {
        // Clear any running ticker
        clearInterval(windowTimerRef.current);

        // Only start ticker if both times are configured
        if (!sessionStart || !sessionEnd) {
            setWindowStatus('idle');
            setTimeLeft(null);
            return;
        }

        const tick = () => {
            const now   = new Date();
            const open  = parseTimeToday(sessionStart);
            const close = parseTimeToday(sessionEnd);

            if (!open || !close) return;

            if (now < open) {
                setWindowStatus('pending');
                setTimeLeft(null);
            } else if (now >= open && now < close) {
                setWindowStatus('active');
                const diffMs = close - now;
                const m = Math.floor(diffMs / 60000);
                const s = Math.floor((diffMs % 60000) / 1000);
                setTimeLeft(`${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
            } else {
                setWindowStatus('expired');
                setTimeLeft(null);
            }
        };

        tick(); // immediate first run
        windowTimerRef.current = setInterval(tick, 1000);
        return () => clearInterval(windowTimerRef.current);
    }, [sessionStart, sessionEnd]); // runs whenever times change — not gated on isScanning

    // ── QR scanner camera lifecycle ───────────────────────────────────────────
    useEffect(() => {
        if (!isScanning) return;

        const html5QrCode = new Html5Qrcode('reader');
        scannerRef.current = html5QrCode;

        html5QrCode.start(
            { facingMode: 'environment' },
            {
                fps: 10,
                qrbox: (vw, vh) => {
                    const s = Math.min(vw, vh) * 0.7;
                    return { width: s, height: s };
                },
            },
            handleScanSuccess,
            () => {} // per-frame failures silently ignored
        ).catch(err => {
            console.error('Camera start error:', err);
            toast.error('Failed to start camera. Check camera permissions.');
            setIsScanning(false);
        });

        return () => {
            scannerRef.current?.stop()
                .then(() => scannerRef.current?.clear())
                .catch(e => console.error('Scanner stop error:', e));
        };
    }, [isScanning]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── GPS sequence ──────────────────────────────────────────────────────────
    const startScannerSequence = () => {
        setShowConsentModal(true);
        setGpsStatus('consent');
    };

    const handleConsentAllow = () => {
        setShowConsentModal(false);
        setGpsStatus('acquiring');
        acquireGps();
    };

    const handleConsentDeny = () => {
        setShowConsentModal(false);
        setGpsStatus('idle');
    };

    const acquireGps = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser.');
            setGpsStatus('error');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => {
                const loc = {
                    latitude:  pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy:  Math.round(pos.coords.accuracy),
                };
                setAdminLocation(loc);
                adminLocRef.current = loc;
                setGpsStatus('locked');
                setIsScanning(true);
                setScannedMapCadets([]);
                toast.success(`📍 GPS Locked · ±${loc.accuracy} m accuracy`, { autoClose: 3000 });
            },
            err => {
                setGpsStatus('error');
                let msg = 'GPS access required to start the scanner.';
                if (err.code === 1) msg = 'Location permission denied. Enable it in browser Site Settings → Location.';
                else if (err.code === 2) msg = 'GPS signal unavailable. Move to an open area and try again.';
                else if (err.code === 3) msg = 'GPS timed out. Please try again.';
                toast.error(msg, { autoClose: 7000 });
            },
            { enableHighAccuracy: true, timeout: 45000, maximumAge: 0 }
        );
    };

    const stopScanner = () => {
        setIsScanning(false);
        setAdminLocation(null);
        setGpsStatus('idle');
        setRecentLogs([]);
        setScannedMapCadets([]);
        // Keep time window config so admin can reuse it
    };

    // ── Compute scan status from refs (safe inside stale QR callback) ────────
    const computeScanStatus = () => {
        const start = sessionStartRef.current;
        const end   = sessionEndRef.current;
        if (!start || !end) return 'Present'; // no window → always Present

        const now   = new Date();
        const open  = parseTimeToday(start);
        const close = parseTimeToday(end);
        if (!open || !close) return 'Present';

        if (now < open)              return 'Pending';
        if (now >= open && now < close) return 'Present';
        return 'Late';
    };

    // ── QR decode handler ─────────────────────────────────────────────────────
    const handleScanSuccess = async (decodedText) => {
        if (isProcessingRef.current) return;

        const now = Date.now();
        if (lastScanRef.current?.id === decodedText && now - lastScanRef.current.time < 5000) return;

        isProcessingRef.current = true;
        lastScanRef.current = { id: decodedText, time: now };

        const today = getTodayDateString();
        const cadet = cadetsRef.current.find(
            c => (c.enrollmentId === decodedText || c.regimentalNumber === decodedText || c.id === decodedText) && c.status !== 'alumni'
        );

        if (!cadet) {
            toast.error(`Unknown QR: ${decodedText}`);
            isProcessingRef.current = false;
            return;
        }

        const loc = adminLocRef.current;
        if (!loc) {
            toast.error('GPS location lost. Restart the scanner.');
            isProcessingRef.current = false;
            return;
        }

        const scanStatus = computeScanStatus();

        if (scanStatus === 'Pending') {
            const start = sessionStartRef.current;
            toast.warning(`⏳ Window not open yet — opens at ${start}`, { autoClose: 4000 });
            isProcessingRef.current = false;
            return;
        }

        // 🛡️ If user is a delegated cadet, stage scan in local batch for ANO verification instead of directly modifying live records
        if (isCadetUser) {
            if (delegatedScans.some(s => s.id === cadet.id)) {
                toast.warning(`${cadet.name} is already in the current scan batch.`);
                isProcessingRef.current = false;
                return;
            }

            const newScan = {
                id: cadet.id,
                name: cadet.name,
                enrollmentId: cadet.enrollmentId || cadet.regimentalNumber,
                time: new Date().toLocaleTimeString(),
                status: scanStatus
            };

            setDelegatedScans(prev => [...prev, newScan]);
            setRecentLogs(prev => [{
                name: cadet.name,
                time: new Date().toLocaleTimeString(),
                id: cadet.enrollmentId || cadet.regimentalNumber,
                status: scanStatus
            }, ...prev].slice(0, 15));

            // Add cadet dot near admin on map
            const angle  = Math.random() * 2 * Math.PI;
            const radius = Math.random() * 0.0014;
            setScannedMapCadets(prev => [...prev, {
                name: cadet.name,
                lat:  loc.latitude  + radius * Math.sin(angle),
                lng:  loc.longitude + radius * Math.cos(angle),
            }]);

            toast.success(`✅ Scanned ${cadet.name} (${cadet.enrollmentId || cadet.regimentalNumber}) — Staged in Batch`);
            if (window.navigator.vibrate) window.navigator.vibrate(150);
            isProcessingRef.current = false;
            return;
        }

        try {
            const attRef = getCollectionRef('attendance');
            const cadetsCol = getCollectionRef('cadets');
            if (!attRef || !cadetsCol) throw new Error('Database not ready');

            // 1. Directly update Cadet document in 'cadets' collection
            const cadetDocRef = doc(cadetsCol, cadet.id);
            await updateDoc(cadetDocRef, {
                [`attendance.${today}`]: scanStatus,
                updatedAt: serverTimestamp(),
            });

            // 2. Set attendance log with deterministic document ID (cadetId_date) to prevent duplicates completely
            const logDocId = `${cadet.id}_${today}`;
            const logDocRef = doc(attRef, logDocId);
            await setDoc(logDocRef, {
                cadetId: cadet.id,
                cadetName: cadet.name,
                enrollmentId: cadet.enrollmentId || cadet.regimentalNumber,
                certificate: cadet.certificate || cadet.B || 'NA',
                division: (cadet.enrollmentId || cadet.regimentalNumber || '').toUpperCase().includes('SW') ? 'SW' : 'SD',
                timestamp: serverTimestamp(),
                markedBy: `${userName || 'ANO'} (Parade QR Scanner)`,
                status: scanStatus,
                location: loc,
                institutionId: cadet.institutionId || userInstitutionId || 'gmrit',
                date: today,
            }, { merge: true });

            // 3. Send optional push / pending record for cadet verification history
            try {
                const pendingDoc = await createPendingAttendance(
                    cadet.id, cadet.name, cadet.enrollmentId || cadet.regimentalNumber, loc, scanStatus
                );
                sendAttendancePush([cadet.id], pendingDoc.id, loc);
            } catch (pErr) {
                console.warn('Push record skipped:', pErr);
            }

            toast.success(`✅ ${cadet.name} marked ${scanStatus.toUpperCase()} for today!`);

            setRecentLogs(prev => [{
                name:   cadet.name,
                time:   new Date().toLocaleTimeString(),
                id:     cadet.enrollmentId,
                status: scanStatus,
            }, ...prev].slice(0, 8));

            // Add cadet dot near admin on map (slight random offset within 200m)
            const angle  = Math.random() * 2 * Math.PI;
            const radius = Math.random() * 0.0014; // ~140m max offset in degrees
            setScannedMapCadets(prev => [...prev, {
                name: cadet.name,
                lat:  loc.latitude  + radius * Math.sin(angle),
                lng:  loc.longitude + radius * Math.cos(angle),
            }]);

            if (window.navigator.vibrate) window.navigator.vibrate(200);

        } catch (err) {
            console.error('Attendance scan failed:', err);
            toast.error(`Attendance update error: ${err.message || 'Please try again.'}`);
        } finally {
            isProcessingRef.current = false;
        }
    };

    const handleSubmitScanBatchToAno = async () => {
        if (delegatedScans.length === 0) return toast.warning("No cadets scanned in this session yet.");
        setIsSubmittingBatch(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const cadetIds = delegatedScans.map(s => s.id);
            const cadetNames = delegatedScans.map(s => `${s.name} (${s.enrollmentId})`);
            const { submitDelegatedTask } = await import('../../firebase/delegationWorkflowService.js');
            await submitDelegatedTask({
                institutionId: userInstitutionId,
                cadetEnrollmentId: userEnrollmentId,
                cadetName: userName,
                cadetUid: user?.uid,
                moduleId: 'att_logs',
                moduleName: 'Parade Attendance Scanner',
                actionType: 'create',
                title: `Parade Scan: ${delegatedScans.length} Cadet(s) Scanned on ${today}`,
                payload: {
                    action: 'bulk_mark_present',
                    date: today,
                    cadetIds: cadetIds,
                    cadetNames: cadetNames,
                    status: 'Present',
                    scannedCount: delegatedScans.length
                }
            });
            toast.success(`Parade scan batch of ${delegatedScans.length} cadets submitted to ANO for verification & sanctioning!`);
            setDelegatedScans([]);
        } catch (err) {
            console.error("Batch submission error:", err);
            toast.error(`Failed to submit scan batch: ${err.message}`);
        } finally {
            setIsSubmittingBatch(false);
        }
    };

    // ── GPS status badge config ───────────────────────────────────────────────
    const gpsDisplay = ({
        idle:      { label: 'GPS Offline',       color: 'text-gray-400 dark:text-white/30' },
        consent:   { label: 'Awaiting consent…', color: 'text-yellow-400' },
        acquiring: { label: 'Acquiring GPS…',    color: 'text-yellow-400 animate-pulse' },
        locked:    { label: '📍 GPS Locked',     color: 'text-emerald-400' },
        error:     { label: 'GPS Error',          color: 'text-red-400' },
    })[gpsStatus] || { label: 'GPS Offline', color: 'text-gray-400' };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            {showConsentModal && (
                <GpsConsentModal onAllow={handleConsentAllow} onDeny={handleConsentDeny} />
            )}
            {gpsStatus === 'acquiring' && <AcquiringGpsOverlay />}

            <div className="max-w-5xl mx-auto space-y-6 fade-in">

                {/* ── Header ── */}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] shadow-sm">
                    <div>
                        <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-2">
                            <UserCheck className="w-6 h-6 text-ncc-gold" /> Smart Parade Ground
                        </h2>
                        <p className="text-gray-500 dark:text-white/70 text-sm">GPS-verified QR attendance with live map.</p>
                        <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${gpsDisplay.color}`}>
                            <MapPin className="w-3 h-3" /> {gpsDisplay.label}
                            {gpsStatus === 'locked' && adminLocation && (
                                <span className="font-mono opacity-60 ml-1 text-[10px]">
                                    (±{adminLocation.accuracy} m)
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={() => isScanning ? stopScanner() : startScannerSequence()}
                        className={`ncc-btn ${isScanning ? 'bg-red-500 text-white hover:bg-red-600' : 'ncc-btn-primary'} px-6 shrink-0`}
                    >
                        {isScanning
                            ? <><X className="w-4 h-4 mr-2" /> Stop Scanner</>
                            : <><Camera className="w-4 h-4 mr-2" /> Start Scanner (GPS)</>
                        }
                    </button>
                </header>

                {/* ── Scanner + Sidebar ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* QR Camera Box */}
                    <div className={`bg-ncc-navy relative rounded-3xl overflow-hidden aspect-square flex flex-col items-center justify-center border-4 shadow-xl transition-all duration-500 ${
                        windowStatus === 'expired' ? 'border-red-400/60' :
                        windowStatus === 'active'  ? 'border-emerald-400/60' :
                        'border-[#ede8df] dark:border-ncc-gold/20'
                    }`}>
                        {!isScanning ? (
                            <div className="text-center p-12">
                                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Camera className="w-10 h-10 text-ncc-gold/50" />
                                </div>
                                <h3 className="text-white font-bold text-lg mb-2">Scanner Offline</h3>
                                <p className="text-white/40 text-sm">Tap 'Start Scanner (GPS)' to begin.</p>
                                <p className="text-white/25 text-xs mt-2">Location consent required each session.</p>
                            </div>
                        ) : (
                            <div className="w-full h-full relative">
                                <div id="reader" className="w-full h-full" />
                                {/* Scan frame overlay */}
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className={`w-48 h-48 border-4 rounded-2xl animate-pulse ${
                                        windowStatus === 'expired' ? 'border-red-400/70' :
                                        windowStatus === 'active'  ? 'border-emerald-400/70' :
                                        'border-ncc-gold/50'
                                    }`} />
                                </div>
                                {/* Late banner */}
                                {windowStatus === 'expired' && (
                                    <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                                        <span className="bg-red-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg animate-pulse">
                                            ⛔ LATE WINDOW ACTIVE
                                        </span>
                                    </div>
                                )}
                                {/* Active banner */}
                                {windowStatus === 'active' && timeLeft && (
                                    <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none">
                                        <span className="bg-emerald-500/90 text-white text-[10px] font-black px-3 py-1 rounded-full">
                                            ✅ {timeLeft} remaining
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">

                        {/* Time Window Panel — always visible */}
                        <SessionTimerPanel
                            startTime={sessionStart}
                            endTime={sessionEnd}
                            onStartChange={setSessionStart}
                            onEndChange={setSessionEnd}
                            windowStatus={windowStatus}
                            timeLeft={timeLeft}
                            isScanning={isScanning}
                        />

                        {/* 🛡️ Delegated Parade Scan Batch Card for Cadets */}
                        {isCadetUser && (
                            <div className="ncc-card p-5 border-amber-300 dark:border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        Delegated Parade Scan Batch
                                    </h4>
                                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800/80 text-amber-950 dark:text-white border border-amber-300 dark:border-amber-700">
                                        {delegatedScans.length} Staged
                                    </span>
                                </div>
                                <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                                    Cadets scanned during this duty are staged in this verification batch. Submit the batch to your ANO for final verification and sanctioning.
                                </p>
                                <button
                                    onClick={handleSubmitScanBatchToAno}
                                    disabled={isSubmittingBatch || delegatedScans.length === 0}
                                    className="w-full py-3 px-4 rounded-xl bg-ncc-navy hover:bg-ncc-navy-mid text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <CheckCircle className="w-4 h-4 text-ncc-gold" />
                                    {isSubmittingBatch ? 'Submitting to ANO...' : `Submit ${delegatedScans.length} Scanned Cadet(s) to ANO`}
                                </button>
                            </div>
                        )}

                        {/* Recent Scans */}
                        <div className="ncc-card">
                            <div className="bg-[#f5f0e8] dark:bg-[#0a1628] px-5 py-4 border-b border-[#ddd8cc] flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-ncc-navy dark:text-white flex items-center gap-2">
                                    <History className="w-4 h-4 text-ncc-gold" /> Recent Scans
                                </h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    isScanning
                                        ? 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                                        : 'text-gray-400 bg-white dark:bg-[#050b14] border-[#ddd8cc]'
                                }`}>
                                    {isScanning ? 'Session Active' : 'Offline'}
                                </span>
                            </div>
                            <div className="max-h-[220px] overflow-y-auto ncc-scrollbar">
                                {recentLogs.length === 0 ? (
                                    <div className="p-10 text-center text-gray-400 dark:text-white/30">
                                        <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                        <p className="text-xs font-semibold">Waiting for scans…</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-[#ede8df] dark:divide-white/5">
                                        {recentLogs.map((log, idx) => (
                                            <div key={idx} className="p-3 flex items-center gap-3 bg-white dark:bg-[#050b14] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                                                    log.status === 'Late'
                                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600'
                                                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                                }`}>
                                                    <UserCheck className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-ncc-navy dark:text-white truncate">{log.name}</p>
                                                    <p className="text-[10px] text-gray-500 dark:text-white/50 font-mono">{log.id}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xs font-black text-ncc-navy dark:text-white">{log.time}</p>
                                                    <span className={`text-[9px] font-bold uppercase ${
                                                        log.status === 'Late' ? 'text-yellow-500' : 'text-emerald-500'
                                                    }`}>
                                                        {log.status === 'Late' ? '🟡 Late' : '✅ Present'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* How It Works */}
                        <div className="bg-ncc-gold/10 border border-ncc-gold/20 p-5 rounded-2xl relative overflow-hidden">
                            <ShieldCheck className="absolute -right-4 -bottom-4 w-28 h-28 text-ncc-gold/10 rotate-12" />
                            <h4 className="text-ncc-navy dark:text-white font-bold text-sm mb-2 relative z-10">How It Works</h4>
                            <ul className="text-ncc-navy dark:text-white/60 text-xs leading-relaxed relative z-10 space-y-1 list-disc list-inside">
                                <li>Location consent requested every session.</li>
                                <li>Set <strong>Open/Close</strong> times for the window — scans after = <strong>Late</strong>.</li>
                                <li>Cadets receive a push with <strong>"✅ Mark Attendance"</strong> button.</li>
                                <li>Live map shows all scanned cadets on the parade ground.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* ── Live Parade Map ── full-width below scanner */}
                <LiveMapPanel
                    adminLocation={adminLocation}
                    scannedCadets={scannedMapCadets}
                />
            </div>
        </>
    );
};
