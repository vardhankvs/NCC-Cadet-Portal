// src_stable/features/Training/MapReadingSimulator.jsx
import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Compass, Map, Shield, Layers, Target, BookOpen, Award, CheckCircle2, 
    XCircle, HelpCircle, Navigation, Crosshair, ArrowRight, Eye, RefreshCw, ZoomIn, ZoomOut, Maximize2
} from '../../components/Icons.jsx';

// 6 Core Map Types Configuration
const MAP_TYPES = [
    {
        id: 'relief',
        name: 'Relief Map (धरातलीय)',
        category: 'Physical',
        description: 'Shows physical features, contour lines, elevation slopes, spot heights, and land relief.',
        color: 'from-amber-600 to-yellow-700',
        accent: '#D97706',
        bg: '#1A140A'
    },
    {
        id: 'geographical',
        name: 'Geographical Map (भौगोलिक)',
        category: 'Natural',
        description: 'Displays major river basins, forest cover, natural landforms, and terrain ecology.',
        color: 'from-emerald-600 to-teal-700',
        accent: '#059669',
        bg: '#061D15'
    },
    {
        id: 'political',
        name: 'Political Map (राजनीतिक)',
        category: 'Administrative',
        description: 'Delineates state & district boundaries, administrative headquarters, and civil sectors.',
        color: 'from-blue-600 to-indigo-700',
        accent: '#2563EB',
        bg: '#0A1329'
    },
    {
        id: 'historical',
        name: 'Historical Map (ऐतिहासिक)',
        category: 'Military History',
        description: 'Highlights ancient forts, historical defense lines, battlefields, and heritage routes.',
        color: 'from-purple-600 to-rose-700',
        accent: '#9333EA',
        bg: '#180B24'
    },
    {
        id: 'statistical',
        name: 'Statistical Map (सांख्यिकी)',
        category: 'Analytics',
        description: 'Visualizes population density distribution, tactical troop ratios, and weather overlays.',
        color: 'from-cyan-600 to-blue-700',
        accent: '#0891B2',
        bg: '#071824'
    },
    {
        id: 'economical',
        name: 'Economical Map (आर्थिक)',
        category: 'Resources',
        description: 'Shows industrial complexes, supply chain routes, agricultural belts, and resource hubs.',
        color: 'from-orange-600 to-amber-700',
        accent: '#EA580C',
        bg: '#1C1007'
    }
];

// Conventional Signs Library (रूढ़िगत चिह्न)
const CONVENTIONAL_SIGNS = [
    { id: 'cs1', name: 'Metalled Road (पक्की सड़क)', category: 'Conventional', icon: '🛣️', detail: 'Parallel solid red/black lines representing paved highway.' },
    { id: 'cs2', name: 'Unmetalled Road (कच्ची सड़क)', category: 'Conventional', icon: '🛤️', detail: 'Parallel broken lines indicating unpaved dirt track.' },
    { id: 'cs3', name: 'Railway Single Track (रेलवे लाइन)', category: 'Conventional', icon: '🚂', detail: 'Black line with single perpendicular ticks.' },
    { id: 'cs4', name: 'Bridge (पुल)', category: 'Conventional', icon: '🌉', detail: 'H-shape symbol over river or canal crossing.' },
    { id: 'cs5', name: 'Fort / Citadel (किला)', category: 'Conventional', icon: '🏰', detail: 'Black crenellated wall outline representing fort structure.' },
    { id: 'cs6', name: 'Temple (मंदिर)', category: 'Conventional', icon: '🛕', detail: 'Small building outline with dome and flag spire.' },
    { id: 'cs7', name: 'Church (गिरजाघर)', category: 'Conventional', icon: '⛪', detail: 'Building outline with cross on roof top.' },
    { id: 'cs8', name: 'Contour Lines (समुच्च रेखाएं)', category: 'Conventional', icon: '〰️', detail: 'Brown concentric lines joining points of equal elevation.' },
    { id: 'cs9', name: 'Spot Height (स्थानिक ऊंचाई)', category: 'Conventional', icon: '📍', detail: 'Dot with height in meters (e.g. .205) indicating exact peak elevation.' },
    { id: 'cs10', name: 'Post Office (डाकघर - PO)', category: 'Conventional', icon: '📮', detail: 'Abbreviation PO in black near village cluster.' }
];

// Military Symbols Library (सैन्य संकेत)
const MILITARY_SYMBOLS = [
    { id: 'ms1', name: 'Infantry Section (पैदल सेना सेक्शन)', category: 'Military', icon: '🪖', detail: 'Single dot over rectangle representing 8-10 infantry soldiers.' },
    { id: 'ms2', name: 'Infantry Platoon (प्लैटून)', category: 'Military', icon: '💂‍♂️', detail: 'Two dots over rectangle representing 30-36 soldiers commanded by JCO/UO.' },
    { id: 'ms3', name: 'Infantry Company (कंपनी)', category: 'Military', icon: '🛡️', detail: 'Single vertical line over rectangle (~120 soldiers commanded by Major/Captain).' },
    { id: 'ms4', name: 'Infantry Battalion (बटालियन)', category: 'Military', icon: '🎖️', detail: 'Two vertical lines over rectangle (~800-1000 soldiers commanded by Colonel).' },
    { id: 'ms5', name: 'Artillery Battery (तोपखाना)', category: 'Military', icon: '💣', detail: 'Rectangle with crossed cannons representing field guns/howitzers.' },
    { id: 'ms6', name: 'Armoured Regiment (टैंक रेजीमेंट)', category: 'Military', icon: '🚜', detail: 'Oval inside rectangle representing main battle tanks.' },
    { id: 'ms7', name: 'Headquarters (HQ - मुख्यालय)', category: 'Military', icon: '🚩', detail: 'Flag pole attached to unit rectangle showing command post.' },
    { id: 'ms8', name: 'Observation Post (OP - अवलोकन पोस्ट)', category: 'Military', icon: '🔭', detail: 'Triangle with eye/line for artillery/tactical spotters.' },
    { id: 'ms9', name: 'Minefield (सुरंग क्षेत्र)', category: 'Military', icon: '⚠️', detail: 'Zigzag line with encircled dots denoting antitank/antipersonnel mines.' },
    { id: 'ms10', name: 'Tactical Trench (मोर्चा)', category: 'Military', icon: '🧱', detail: 'Notched line representing defensive dugouts & fire trenches.' }
];

// Practical Exam Quiz Data
const QUIZ_QUESTIONS = [
    {
        q: "What is the formula to calculate Back Bearing (BB) when Forward Bearing (FB) is 65°?",
        options: ["BB = 65° + 180° = 245°", "BB = 65° - 180° = -115°", "BB = 360° - 65° = 295°", "BB = 65° × 2 = 130°"],
        ans: 0,
        explanation: "Since FB (65°) is LESS than 180°, add 180°: BB = 65° + 180° = 245°."
    },
    {
        q: "In a 6-figure Grid Reference (e.g. GR 458712), which numbers represent the Eastings?",
        options: ["First 3 digits (458)", "Last 3 digits (712)", "Middle 2 digits (58)", "The entire 6 digits"],
        ans: 0,
        explanation: "Grid References are read 'Eastings before Northings' (Eer before Nor). The first 3 digits (458) are Eastings."
    },
    {
        q: "Which North direction is indicated by the vertical grid lines on a military map?",
        options: ["Grid North (GN)", "True North (TN)", "Magnetic North (MN)", "Compass North (CN)"],
        ans: 0,
        explanation: "Grid North (GN) is the direction of vertical grid lines drawn on a topographical map."
    },
    {
        q: "If Forward Bearing is 210°, what is the Back Bearing?",
        options: ["30°", "390°", "180°", "120°"],
        ans: 0,
        explanation: "Since FB (210°) is GREATER than 180°, subtract 180°: BB = 210° - 180° = 30°."
    },
    {
        q: "Which conventional sign represents a Metalled Road on a military map?",
        options: ["Parallel solid red lines", "Broken black lines", "Blue wavy line", "Yellow dotted line"],
        ans: 0,
        explanation: "Metalled (tarred/paved) roads are represented by parallel solid red lines."
    }
];

export const MapReadingSimulator = () => {
    const [activeTab, setActiveTab] = useState('simulator'); // 'simulator', 'symbols', 'compass', 'quiz'
    const [selectedMap, setSelectedMap] = useState(MAP_TYPES[0]);
    const [showGridOverlay, setShowGridOverlay] = useState(true);
    const [showSymbolsOverlay, setShowSymbolsOverlay] = useState(true);

    // Interactive Map State
    const [hoverPos, setHoverPos] = useState({ x: 240, y: 180 });
    const [pinnedPointA, setPinnedPointA] = useState({ x: 120, y: 140, label: 'Target A (Bridge)' });
    const [pinnedPointB, setPinnedPointB] = useState({ x: 380, y: 260, label: 'Target B (Fort)' });
    const [compassAngle, setCompassAngle] = useState(45);
    const [selectedSymbolCategory, setSelectedSymbolCategory] = useState('All');

    // Quiz State
    const [quizIdx, setQuizIdx] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);

    // Calculated 6-Figure Grid Reference (e.g. GR 458712)
    const gridRef = useMemo(() => {
        const eastingBase = 42;
        const northingBase = 68;

        const eastingOffset = Math.floor((hoverPos.x / 500) * 100);
        const northingOffset = Math.floor(((400 - hoverPos.y) / 400) * 100);

        const e1 = String(eastingBase + Math.floor(eastingOffset / 10)).padStart(2, '0');
        const e2 = String(eastingOffset % 10);

        const n1 = String(northingBase + Math.floor(northingOffset / 10)).padStart(2, '0');
        const n2 = String(northingOffset % 10);

        return `GR ${e1}${e2} ${n1}${n2}`;
    }, [hoverPos]);

    // Distance Calculation in meters (Scale 1:50,000 => 1px = 5m)
    const measuredDistance = useMemo(() => {
        const dx = pinnedPointB.x - pinnedPointA.x;
        const dy = pinnedPointB.y - pinnedPointA.y;
        const distPx = Math.sqrt(dx * dx + dy * dy);
        const meters = Math.round(distPx * 5);
        return {
            px: Math.round(distPx),
            meters: meters,
            km: (meters / 1000).toFixed(2)
        };
    }, [pinnedPointA, pinnedPointB]);

    // Calculated Forward Bearing & Back Bearing between A and B
    const bearings = useMemo(() => {
        const dx = pinnedPointB.x - pinnedPointA.x;
        const dy = pinnedPointB.y - pinnedPointA.y;
        
        // Angle in radians (0 is North)
        let rad = Math.atan2(dx, -dy);
        let deg = Math.round((rad * 180) / Math.PI);
        if (deg < 0) deg += 360;

        const fb = deg;
        const bb = fb >= 180 ? fb - 180 : fb + 180;

        return { fb, bb };
    }, [pinnedPointA, pinnedPointB]);

    const handleMapMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(500, e.clientX - rect.left));
        const y = Math.max(0, Math.min(400, e.clientY - rect.top));
        setHoverPos({ x, y });
    };

    const handleMapClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(500, e.clientX - rect.left));
        const y = Math.max(0, Math.min(400, e.clientY - rect.top));

        // Toggle pinning Point A and Point B
        if (Math.abs(x - pinnedPointA.x) < 20 && Math.abs(y - pinnedPointA.y) < 20) return;

        setPinnedPointB({ x, y, label: `Custom Target (GR ${gridRef})` });
    };

    const handleAnswerSelect = (optIdx) => {
        setUserAnswers(prev => ({ ...prev, [quizIdx]: optIdx }));
    };

    const calculateScore = () => {
        let score = 0;
        QUIZ_QUESTIONS.forEach((q, i) => {
            if (userAnswers[i] === q.ans) score++;
        });
        return score;
    };

    const combinedSymbols = [...CONVENTIONAL_SIGNS, ...MILITARY_SYMBOLS];
    const filteredSymbols = useMemo(() => {
        if (selectedSymbolCategory === 'All') return combinedSymbols;
        return combinedSymbols.filter(s => s.category === selectedSymbolCategory);
    }, [selectedSymbolCategory, combinedSymbols]);

    return (
        <div className="space-y-6 fade-in pb-12">
            {/* Top Header Banner */}
            <div className="bg-gradient-to-r from-ncc-navy via-[#0d1e38] to-[#152a4a] text-white rounded-3xl p-6 shadow-2xl border border-ncc-gold/30 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-ncc-gold/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-ncc-gold/20 border border-ncc-gold/40 flex items-center justify-center shadow-lg">
                            <Compass className="w-8 h-8 text-ncc-gold animate-spin-slow" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-display font-black tracking-tight text-white uppercase">
                                    Military Map Reading Simulator
                                </h1>
                                <span className="px-2.5 py-0.5 rounded-full bg-ncc-gold/20 text-ncc-gold text-[10px] font-black uppercase tracking-widest border border-ncc-gold/30">
                                    PRACTICAL ENGINE
                                </span>
                            </div>
                            <p className="text-xs text-white/70 mt-1 font-medium">
                                Real-World Topography • 6 Map Types • 6-Figure Grid Reference • Prismatic Compass & Bearings
                            </p>
                        </div>
                    </div>

                    {/* Navigation Mode Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/10">
                        {[
                            { id: 'simulator', label: 'Map Sandbox', icon: Map },
                            { id: 'symbols', label: 'Signs & Symbols', icon: Shield },
                            { id: 'compass', label: 'Compass & Bearing', icon: Compass },
                            { id: 'quiz', label: 'Practical Quiz', icon: Award }
                        ].map(t => {
                            const IconComp = t.icon;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                                        activeTab === t.id
                                            ? 'bg-ncc-gold text-ncc-navy shadow-md font-black'
                                            : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <IconComp className="w-3.5 h-3.5" />
                                    <span>{t.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* TAB 1: INTERACTIVE MAP SANDBOX */}
            {activeTab === 'simulator' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Sidebar: 6 Map Types Selector & Map Controls */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-white dark:bg-[#050b14] p-4 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-lg space-y-3">
                            <h3 className="text-xs font-bold text-gray-400 dark:text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-ncc-gold" /> Select Map Classification (6 Types):
                            </h3>

                            <div className="space-y-2">
                                {MAP_TYPES.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSelectedMap(m)}
                                        className={`w-full text-left p-3 rounded-2xl transition-all border flex items-start gap-3 ${
                                            selectedMap.id === m.id
                                                ? 'bg-ncc-navy text-white border-ncc-gold shadow-md ring-2 ring-ncc-gold/30'
                                                : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:border-ncc-gold/50'
                                        }`}
                                    >
                                        <div 
                                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 shadow-inner mt-0.5"
                                            style={{ backgroundColor: m.accent }}
                                        >
                                            {m.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold truncate">{m.name}</h4>
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-ncc-gold border border-ncc-gold/20">
                                                    {m.category}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 dark:text-white/50 line-clamp-2 mt-0.5">
                                                {m.description}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Map Layer Toggles */}
                        <div className="bg-white dark:bg-[#050b14] p-4 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-lg space-y-3">
                            <h3 className="text-xs font-bold text-gray-400 dark:text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                                <Crosshair className="w-4 h-4 text-ncc-gold" /> Overlay Display Toggles:
                            </h3>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setShowGridOverlay(!showGridOverlay)}
                                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                                        showGridOverlay 
                                            ? 'bg-ncc-navy text-ncc-gold border-ncc-gold/40' 
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-400 border-gray-200 dark:border-white/10'
                                    }`}
                                >
                                    <span>Grid Lines (GR)</span>
                                    <span className="text-[10px]">{showGridOverlay ? 'ON' : 'OFF'}</span>
                                </button>

                                <button
                                    onClick={() => setShowSymbolsOverlay(!showSymbolsOverlay)}
                                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                                        showSymbolsOverlay 
                                            ? 'bg-ncc-navy text-ncc-gold border-ncc-gold/40' 
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-400 border-gray-200 dark:border-white/10'
                                    }`}
                                >
                                    <span>Military Signs</span>
                                    <span className="text-[10px]">{showSymbolsOverlay ? 'ON' : 'OFF'}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Canvas: Interactive Map Visualization Sandbox */}
                    <div className="lg:col-span-8 space-y-4">
                        <div className="bg-white dark:bg-[#050b14] rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-xl overflow-hidden p-4">
                            {/* Live Target & GR Telemetry Bar */}
                            <div className="flex flex-wrap items-center justify-between bg-ncc-navy text-white p-3 rounded-2xl mb-3 shadow-md gap-2 border border-ncc-gold/30">
                                <div className="flex items-center gap-3">
                                    <div className="px-3 py-1 rounded-xl bg-ncc-gold/20 border border-ncc-gold/40 text-ncc-gold font-mono font-bold text-xs tracking-wider">
                                        📍 {gridRef}
                                    </div>
                                    <div className="text-xs font-medium text-white/80 hidden sm:block">
                                        Scale 1:50,000 (1 cm = 500m)
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs font-mono">
                                    <div>
                                        <span className="text-gray-400 text-[10px] uppercase">FB:</span>{' '}
                                        <strong className="text-ncc-gold">{bearings.fb}°</strong>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-[10px] uppercase">BB:</span>{' '}
                                        <strong className="text-emerald-400">{bearings.bb}°</strong>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-[10px] uppercase">Dist:</span>{' '}
                                        <strong className="text-cyan-400">{measuredDistance.km} km ({measuredDistance.meters}m)</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Map Canvas Frame */}
                            <div 
                                onMouseMove={handleMapMouseMove}
                                onClick={handleMapClick}
                                className="relative w-full h-[400px] rounded-2xl overflow-hidden cursor-crosshair border-2 border-gray-800 shadow-inner select-none"
                                style={{ backgroundColor: selectedMap.bg }}
                            >
                                {/* Topographical Contour Patterns SVG Background */}
                                <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none">
                                    <defs>
                                        <pattern id="contourPattern" width="100" height="100" patternUnits="userSpaceOnUse">
                                            <path d="M 0 50 Q 25 20, 50 50 T 100 50" fill="none" stroke={selectedMap.accent} strokeWidth="1" />
                                            <path d="M 0 30 Q 30 70, 70 30 T 100 80" fill="none" stroke={selectedMap.accent} strokeWidth="0.7" strokeDasharray="3,3" />
                                            <circle cx="50" cy="50" r="35" fill="none" stroke={selectedMap.accent} strokeWidth="0.5" />
                                        </pattern>
                                    </defs>
                                    <rect width="100%" height="100%" fill="url(#contourPattern)" />
                                </svg>

                                {/* River / Water Feature Line */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                    <path 
                                        d="M 50 0 C 150 100, 200 250, 450 400" 
                                        fill="none" 
                                        stroke="#0284C7" 
                                        strokeWidth="8" 
                                        strokeOpacity="0.6" 
                                    />
                                    <path 
                                        d="M 0 200 Q 150 180, 500 320" 
                                        fill="none" 
                                        stroke="#DC2626" 
                                        strokeWidth="3" 
                                        strokeDasharray="6,4" 
                                        strokeOpacity="0.7" 
                                    />
                                </svg>

                                {/* Grid Lines Overlay (Eastings & Northings) */}
                                {showGridOverlay && (
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                        {/* Vertical Eastings */}
                                        {[50, 100, 150, 200, 250, 300, 350, 400, 450].map((x, i) => (
                                            <g key={`e-${i}`}>
                                                <line x1={x} y1="0" x2={x} y2="400" stroke="#FFFFFF" strokeOpacity="0.15" strokeWidth="1" />
                                                <text x={x + 3} y="15" fill="#F59E0B" fontSize="9" fontWeight="bold" opacity="0.8">
                                                    {42 + i}
                                                </text>
                                            </g>
                                        ))}

                                        {/* Horizontal Northings */}
                                        {[50, 100, 150, 200, 250, 300, 350].map((y, i) => (
                                            <g key={`n-${i}`}>
                                                <line x1="0" y1={y} x2="500" y2={y} stroke="#FFFFFF" strokeOpacity="0.15" strokeWidth="1" />
                                                <text x="5" y={y - 3} fill="#F59E0B" fontSize="9" fontWeight="bold" opacity="0.8">
                                                    {75 - i}
                                                </text>
                                            </g>
                                        ))}
                                    </svg>
                                )}

                                {/* Military Symbols & Conventional Signs Overlay */}
                                {showSymbolsOverlay && (
                                    <>
                                        {/* Target A: Bridge */}
                                        <div 
                                            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
                                            style={{ left: `${pinnedPointA.x}px`, top: `${pinnedPointA.y}px` }}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-lg text-amber-300 animate-pulse">
                                                🌉
                                            </div>
                                            <span className="text-[9px] font-bold text-white bg-black/80 px-1.5 py-0.5 rounded mt-1 border border-amber-400/40">
                                                {pinnedPointA.label}
                                            </span>
                                        </div>

                                        {/* Target B: Fort */}
                                        <div 
                                            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
                                            style={{ left: `${pinnedPointB.x}px`, top: `${pinnedPointB.y}px` }}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-lg text-emerald-300">
                                                🏰
                                            </div>
                                            <span className="text-[9px] font-bold text-white bg-black/80 px-1.5 py-0.5 rounded mt-1 border border-emerald-400/40">
                                                {pinnedPointB.label}
                                            </span>
                                        </div>

                                        {/* Additional Military OP Marker */}
                                        <div 
                                            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                                            style={{ left: '260px', top: '100px' }}
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500 flex items-center justify-center text-xs">
                                                🪖
                                            </div>
                                            <span className="text-[8px] text-red-300 bg-black/70 px-1 rounded">Infantry Coy (GR 468 735)</span>
                                        </div>
                                    </>
                                )}

                                {/* Distance Line between Point A and Point B */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                    <line 
                                        x1={pinnedPointA.x} 
                                        y1={pinnedPointA.y} 
                                        x2={pinnedPointB.x} 
                                        y2={pinnedPointB.y} 
                                        stroke="#F59E0B" 
                                        strokeWidth="2" 
                                        strokeDasharray="5,5" 
                                    />
                                </svg>

                                {/* Mouse Hover Reticle Crosshair */}
                                <div 
                                    className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                                    style={{ left: `${hoverPos.x}px`, top: `${hoverPos.y}px` }}
                                >
                                    <div className="w-6 h-6 border border-ncc-gold/80 rounded-full flex items-center justify-center">
                                        <div className="w-1 h-1 bg-ncc-gold rounded-full" />
                                    </div>
                                </div>

                                {/* Compass Rose Indicator in Top Right */}
                                <div className="absolute top-3 right-3 bg-black/70 p-2 rounded-2xl border border-white/20 flex flex-col items-center">
                                    <span className="text-[10px] font-black text-red-500">N (TN/MN/GN)</span>
                                    <Navigation className="w-6 h-6 text-ncc-gold transform -rotate-45 my-1" />
                                    <span className="text-[8px] text-gray-300 font-mono">Var: 1°15' W</span>
                                </div>
                            </div>

                            {/* Bearing Math Explanation Footer Card */}
                            <div className="mt-3 bg-ncc-navy/20 dark:bg-white/5 border border-ncc-gold/30 rounded-2xl p-3 text-xs text-gray-600 dark:text-gray-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-ncc-gold shrink-0" />
                                    <span>
                                        <strong>Forward Bearing (FB):</strong> {bearings.fb}° → 
                                        <strong> Back Bearing (BB):</strong> {bearings.bb}° 
                                        {bearings.fb < 180 ? ` (${bearings.fb}° + 180°)` : ` (${bearings.fb}° - 180°)`}
                                    </span>
                                </div>
                                <span className="text-[10px] text-ncc-gold font-bold bg-ncc-gold/10 px-2.5 py-1 rounded-full border border-ncc-gold/30">
                                    Click map to set Target B
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: CONVENTIONAL SIGNS & MILITARY SYMBOLS LIBRARY */}
            {activeTab === 'symbols' && (
                <div className="space-y-4">
                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#050b14] p-4 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-md">
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-ncc-gold" />
                            <h2 className="text-sm font-bold text-ncc-navy dark:text-white uppercase tracking-wider">
                                Conventional Signs & Military Symbols Reference (रूढ़िगत चिह्न एवं सैन्य संकेत)
                            </h2>
                        </div>

                        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/10">
                            {['All', 'Conventional', 'Military'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedSymbolCategory(cat)}
                                    className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                                        selectedSymbolCategory === cat
                                            ? 'bg-ncc-navy text-ncc-gold shadow-sm font-black'
                                            : 'text-gray-400 hover:text-ncc-navy dark:hover:text-white'
                                    }`}
                                >
                                    {cat} ({cat === 'All' ? combinedSymbols.length : cat === 'Conventional' ? CONVENTIONAL_SIGNS.length : MILITARY_SYMBOLS.length})
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Symbols Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSymbols.map(sym => (
                            <motion.div
                                key={sym.id}
                                whileHover={{ scale: 1.02 }}
                                className="bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 p-4 rounded-3xl shadow-lg flex items-start gap-4"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-ncc-navy text-2xl flex items-center justify-center shrink-0 border border-ncc-gold/30 shadow-inner">
                                    {sym.icon}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xs font-bold text-ncc-navy dark:text-white">{sym.name}</h3>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                            sym.category === 'Military'
                                                ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                                                : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                        }`}>
                                            {sym.category}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                        {sym.detail}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: COMPASS & BEARING TRAINER */}
            {activeTab === 'compass' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-5 bg-white dark:bg-[#050b14] p-6 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-xl flex flex-col items-center justify-center space-y-6">
                        <div className="text-center">
                            <h2 className="text-base font-bold text-ncc-navy dark:text-white uppercase tracking-wider">
                                Service Prismatic Compass Simulator
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-white/60 mt-1">
                                Drag or adjust the dial below to practice reading magnetic bearings.
                            </p>
                        </div>

                        {/* Interactive Rotating Compass Dial */}
                        <div className="relative w-64 h-64 flex items-center justify-center">
                            <motion.div 
                                animate={{ rotate: compassAngle }}
                                transition={{ type: "spring", stiffness: 100 }}
                                className="w-56 h-56 rounded-full border-4 border-ncc-gold bg-gradient-to-tr from-[#0b1628] via-ncc-navy to-[#182e4f] shadow-2xl relative flex items-center justify-center"
                            >
                                {/* Graduation Ticks */}
                                <div className="absolute inset-0 rounded-full border-2 border-white/20 m-2" />
                                <span className="absolute top-2 text-xs font-black text-red-500">N (0°)</span>
                                <span className="absolute right-3 text-xs font-black text-white">E (90°)</span>
                                <span className="absolute bottom-2 text-xs font-black text-white">S (180°)</span>
                                <span className="absolute left-3 text-xs font-black text-white">W (270°)</span>

                                {/* Needle */}
                                <div className="w-1 h-44 bg-gradient-to-b from-red-500 via-white to-silver rounded-full shadow-lg transform" />
                            </motion.div>

                            {/* Fixed Hairline Marker */}
                            <div className="absolute top-0 w-0.5 h-8 bg-red-500 rounded-full z-10" />
                        </div>

                        {/* Angle Slider Control */}
                        <div className="w-full space-y-2">
                            <div className="flex justify-between text-xs font-bold text-ncc-navy dark:text-white">
                                <span>Adjust Angle:</span>
                                <span className="text-ncc-gold font-mono">{compassAngle}°</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="360" 
                                value={compassAngle} 
                                onChange={(e) => setCompassAngle(Number(e.target.value))}
                                className="w-full accent-ncc-gold cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Right side: Bearing Calculations Guide */}
                    <div className="lg:col-span-7 bg-white dark:bg-[#050b14] p-6 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-xl space-y-5">
                        <div className="border-b border-gray-200 dark:border-white/10 pb-4">
                            <h3 className="text-sm font-bold text-ncc-navy dark:text-white uppercase tracking-wider">
                                Bearing Conversion Rules ('B' & 'C' Cert Exam)
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-white/60 mt-1">
                                Formulas to convert between Forward Bearing (FB) and Back Bearing (BB):
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                                <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Rule 1: If FB &lt; 180°</span>
                                <div className="text-lg font-mono font-black text-ncc-navy dark:text-white">
                                    BB = FB + 180°
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Example: If FB = 45°, then BB = 45° + 180° = <strong>225°</strong>.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Rule 2: If FB ≥ 180°</span>
                                <div className="text-lg font-mono font-black text-ncc-navy dark:text-white">
                                    BB = FB - 180°
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Example: If FB = 240°, then BB = 240° - 180° = <strong>60°</strong>.
                                </p>
                            </div>
                        </div>

                        {/* Live Calculation Output Card */}
                        <div className="p-4 rounded-2xl bg-ncc-navy text-white space-y-3 shadow-lg border border-ncc-gold/30">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-ncc-gold">
                                Live Dial Calculation for {compassAngle}°:
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-gray-400">Forward Bearing:</span>
                                    <p className="text-lg font-bold font-mono text-ncc-gold">{compassAngle}°</p>
                                </div>
                                <div>
                                    <span className="text-gray-400">Back Bearing:</span>
                                    <p className="text-lg font-bold font-mono text-emerald-400">
                                        {compassAngle < 180 ? compassAngle + 180 : compassAngle - 180}°
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: PRACTICAL EXAM QUIZ */}
            {activeTab === 'quiz' && (
                <div className="max-w-3xl mx-auto bg-white dark:bg-[#050b14] p-6 sm:p-8 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-2xl space-y-6">
                    {!showResults ? (
                        <>
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-4">
                                <div className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-ncc-gold" />
                                    <h2 className="text-base font-bold text-ncc-navy dark:text-white uppercase tracking-wider">
                                        Map Reading Practical Quiz ({quizIdx + 1}/{QUIZ_QUESTIONS.length})
                                    </h2>
                                </div>
                                <span className="text-xs font-bold text-ncc-gold bg-ncc-gold/10 px-3 py-1 rounded-full border border-ncc-gold/30">
                                    Question {quizIdx + 1}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-ncc-navy dark:text-white leading-relaxed">
                                    {QUIZ_QUESTIONS[quizIdx].q}
                                </h3>

                                <div className="space-y-2.5">
                                    {QUIZ_QUESTIONS[quizIdx].options.map((opt, oIdx) => (
                                        <button
                                            key={oIdx}
                                            onClick={() => handleAnswerSelect(oIdx)}
                                            className={`w-full text-left p-4 rounded-2xl text-xs font-semibold border transition-all flex items-center justify-between ${
                                                userAnswers[quizIdx] === oIdx
                                                    ? 'bg-ncc-navy text-white border-ncc-gold shadow-md font-bold'
                                                    : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:border-ncc-gold/40'
                                            }`}
                                        >
                                            <span>{opt}</span>
                                            {userAnswers[quizIdx] === oIdx && <CheckCircle2 className="w-4 h-4 text-ncc-gold shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-white/10">
                                <button
                                    disabled={quizIdx === 0}
                                    onClick={() => setQuizIdx(prev => prev - 1)}
                                    className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 disabled:opacity-40"
                                >
                                    ← Previous
                                </button>

                                {quizIdx < QUIZ_QUESTIONS.length - 1 ? (
                                    <button
                                        onClick={() => setQuizIdx(prev => prev + 1)}
                                        className="ncc-btn ncc-btn-primary py-2 px-5 text-xs shadow-md"
                                    >
                                        Next Question →
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setShowResults(true)}
                                        className="ncc-btn ncc-btn-primary py-2 px-5 text-xs shadow-md"
                                    >
                                        Submit Practical Quiz
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-center space-y-6 py-6">
                            <div className="w-20 h-20 rounded-full bg-ncc-gold/20 border-2 border-ncc-gold flex items-center justify-center mx-auto text-ncc-gold">
                                <Award className="w-10 h-10" />
                            </div>

                            <div>
                                <h2 className="text-xl font-bold text-ncc-navy dark:text-white uppercase tracking-wide">
                                    Quiz Results
                                </h2>
                                <p className="text-3xl font-black text-ncc-gold mt-2 font-display">
                                    {calculateScore()} / {QUIZ_QUESTIONS.length} Correct
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {calculateScore() >= 4 ? ' Excellent score! You are well-prepared for your B/C cert practical exam.' : ' Keep practicing bearing math and grid references!'}
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    setShowResults(false);
                                    setQuizIdx(0);
                                    setUserAnswers({});
                                }}
                                className="ncc-btn ncc-btn-primary py-2.5 px-6 text-xs shadow-md"
                            >
                                Try Quiz Again
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
