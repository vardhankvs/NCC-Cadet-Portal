// src_stable/components/AIAssistant.jsx
// Feature 9 — Extended AI Cadet Chatbot with rich NCC knowledge base
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Sparkles, MessageSquare } from './Icons.jsx';
import { useDataContext } from '../context/DataContext.jsx';

// ─── NCC Knowledge Base ────────────────────────────────────────────────────────
const NCC_KNOWLEDGE = {
    // ── RANKS ──────────────────────────────────────────────────────────────────
    ranks: {
        keywords: ['rank', 'ranks', 'promotion', 'lance corporal', 'corporal', 'sergeant', 'warrant', 'juo', 'suo', 'cwo', 'cdt', 'cadet'],
        respond: () => `**NCC Rank Hierarchy (Army Wing)**\n\n| Rank | Abbr | Notes |\n|------|------|-------|\n| Cadet | CDT | Entry rank |\n| Lance Corporal | L/CPL | 1st promotion |\n| Corporal | CPL | Section 2IC |\n| Sergeant | SGT | Section Commander |\n| Company Quarter Master Sergeant | CQMS | Admin role |\n| Junior Under Officer | JUO | B2/C certificate |\n| Senior Under Officer | SUO | Senior JUO |\n| Cadet Wing Commander | CWO | Highest cadet rank |\n\n**How to Get Promoted:** Attend parades regularly (min 75%), score well in written exams, show leadership in drill. Promotions are recommended by the ANO.`
    },
    // ── AIMS & HISTORY ─────────────────────────────────────────────────────────
    aims: {
        keywords: ['aim', 'motto', 'history', 'ncc founded', 'national cadet corps', 'ekta', 'unity', 'discipline', 'vision', 'mission'],
        respond: () => `**NCC: Aims, Motto & History**\n\n🎖️ **Motto:** *Unity and Discipline* (Ekta aur Anushasan)\n\n📅 **Founded:** 16 April 1948 (National Cadet Corps Act)\n\n**Three Aims of NCC:**\n• Develop character, comradeship, discipline, a secular outlook, the spirit of adventure and ideals of selfless service among young citizens\n• Create a pool of organised, trained and motivated youth to provide leadership in all walks of life\n• Provide a suitable environment to motivate the youth to join the Armed Forces\n\n**14(A) BN NCC** is headquartered at Srikakulam and covers institutions in the GMRIT area under the Andhra Pradesh Directorate.`
    },
    // ── CERTIFICATES ───────────────────────────────────────────────────────────
    certificates: {
        keywords: ['certificate', 'cert', 'b1', 'b2', 'c cert', 'exam syllabus', 'written test', 'theory', 'a cert'],
        respond: () => `**NCC Certificate System**\n\n📋 **'A' Certificate** — Given to Junior Division/Wing cadets (Class 8–12)\n\n📋 **'B' Certificate (B1 → B2):**\n• 1st year cadets (B1): Basic drill, map reading, obstacle course\n• Exam: Written + Practical at unit level\n• Min attendance: 75% of total parades\n\n📋 **'C' Certificate:**\n• Senior cadets (B2 to C promotion)\n• Subjects: NCC Aims, Map Reading, Field Craft, Weapon Training, First Aid, Guard Duty, Communication, Disaster Management, Leadership\n• Exam conducted by State Directorate\n• Required for bonus marks in UPSC/SSB/Defence services\n\n**Grace Marks:** 'C' cert holders get extra marks in UPSC (5 marks), SSB Bonus, and college merit lists.`
    },
    // ── WEAPON TRAINING ─────────────────────────────────────────────────────────
    weapons: {
        keywords: ['.22', 'rifle', 'weapon', 'insas', 'firing', '5.56', 'lmg', 'slr', 'shooting', 'aim', 'trigger', 'ammunition'],
        respond: () => `**NCC Weapon Training**\n\n🎯 **.22 Deluxe Rifle (Indoor)**\n• Weight: ~2.8 kg\n• Effective range: 25 yards\n• Magazine capacity: 5 rounds\n• Used for: Initial firing practice\n\n🎯 **5.56mm INSAS Rifle (Field)**\n• Weight: 3.2 kg\n• Effective range: 400 m\n• Rate of fire: 650 RPM (auto)\n• Used in: RDC, TSC firing\n\n**Firing Positions:** Standing, Kneeling, Prone\n**Grouping Test:** 5 rounds within a 6-inch circle at 25m\n\n**Safety Rules (Always apply):**\n1. Treat every weapon as loaded\n2. Never point at anything you don't intend to shoot\n3. Keep finger off trigger until ready to fire\n4. Be aware of target and what's beyond it\n\n**For 'C' Cert:** Theory on mechanism + IWT (Indoor Weapon Training) mandatory`
    },
    // ── DRILL ──────────────────────────────────────────────────────────────────
    drill: {
        keywords: ['drill', 'parade', 'command', 'attention', 'stand at ease', 'open order', 'close order', 'left turn', 'right turn', 'salute', 'march', 'slow march'],
        respond: () => `**NCC Drill Commands Reference**\n\n**Basic Positions:**\n• *Savdhan* (Attention) — Heels together, toes 45°, arms at sides\n• *Vishram* (Stand Easy) — Left foot out, hands behind back\n• *Aaraam Se* (Stand at Ease) — Feet shoulder-width apart\n\n**Movements:**\n• *Dahine Mud* (Right Turn) — Pivot on right heel + left toe\n• *Baayen Mud* (Left Turn) — Opposite\n• *Peeche Mud* (About Turn) — 180° pivot on right heel\n• *Tez Chal* (Quick March) — 120 paces/min, 30-inch step\n• *Dheere Chal* (Slow March) — 70 paces/min, 30-inch step\n\n**Open/Close Order:**\n• *Khol Order Chal* (Open Order March) — 3 paces forward\n• *Band Order Chal* (Close Order March) — 3 paces back\n\n**Saluting:**\n• Moving salute: 6 paces before, 6 paces after the officer\n• Longest way up, shortest way down\n\n💡 *Practice tip: Count your paces aloud during slow march — it synchronises the squad.*`
    },
    // ── SSB / DEFENCE ──────────────────────────────────────────────────────────
    ssb: {
        keywords: ['ssb', 'service selection board', 'officer', 'defence', 'army officer', 'upsc', 'cds', 'afcat', 'nda', 'gto', 'psychology', 'interview', 'lecturette', 'group discussion', 'thematic apperception', 'tat', 'wat', 'srt', 'pp&dt', 'command task', 'obstacle'],
        respond: () => `**SSB (Service Selection Board) — Complete Guide**\n\n📅 **5-Day Process:**\n\n**Day 1 — Screening:**\n• Officer Intelligence Rating (OIR) Test — Verbal + Non-verbal\n• Picture Perception & Discussion Test (PP&DT)\n• ~50% candidates screened out\n\n**Day 2 — Psychology Tests:**\n• TAT (Thematic Apperception Test) — 12 pictures, write stories\n• WAT (Word Association Test) — 60 words, 15 sec each\n• SRT (Situation Reaction Test) — 60 situations, written responses\n• Self Description Test (SDT) — What you, parents, friends think of you\n\n**Day 3-4 — GTO (Group Testing Officer):**\n• Group Discussion × 2\n• Group Planning Exercise (Military Planning)\n• Progressive Group Tasks (PGT) — Outdoor obstacles\n• Half Group Task\n• Individual Obstacles — 10 obstacles\n• Command Task — Lead your group through an obstacle\n• Final Group Task (FGT)\n• Lecturette — 3-minute talk on a topic\n\n**Day 4-5 — Interview:**\n• Personal Interview with Board President / IO\n• ~45-60 minutes\n• PIQ Form (Personal Information Questionnaire) used as basis\n\n**15 Officer Like Qualities (OLQs):** Effective Intelligence, Reasoning Ability, Organising Ability, Power of Expression, Social Adaptability, Cooperation, Sense of Responsibility, Initiative, Self-Confidence, Speed of Decision, Ability to Influence the Group, Liveliness, Determination, Courage, Stamina\n\n💡 **NCC 'C' Certificate Advantage:** Direct entry to Conference after clearing Stage 1 (no Day 1 screening). Plus 5 bonus marks in UPSC.`
    },
    // ── MAP READING ─────────────────────────────────────────────────────────────
    mapReading: {
        keywords: ['map', 'grid', 'northing', 'easting', 'contour', 'conventional sign', 'scale', 'magnetic', 'north', 'compass', 'bearing', 'six figure', 'four figure', 'grid reference'],
        respond: () => `**Map Reading — NCC Study Notes**\n\n🗺️ **Types of North:**\n• True North — Geographic North Pole\n• Magnetic North — Where compass points (varies by location)\n• Grid North — Vertical grid lines on map\n\n**Grid References:**\n• 4-Figure: e.g., 4572 → Easting 45, Northing 72 (identifies a 1 km² square)\n• 6-Figure: e.g., 456723 → More precise (100m × 100m square)\n• *Rule:* Read EAST then NORTH — "Along the corridor, up the stairs"\n\n**Contour Lines:**\n• Lines joining points of equal elevation\n• Close together = steep slope\n• Far apart = gentle slope\n• Concentric circles = hill/depression (check spot heights)\n\n**Conventional Signs:**\n• Church with tower: □ with cross\n• School: □ with 'Sch'\n• Metalled road: Red/orange solid line\n• Unmetalled road: Dashed line\n• River: Blue wavy line\n• Plantation: Green dots\n\n**Scale:** 1:50,000 means 1cm on map = 500m on ground\n\n💡 *Exam tip: Always verify the grid reference by identifying at least 2 known features in the grid square.*`
    },
    // ── CAMPS ──────────────────────────────────────────────────────────────────
    camps: {
        keywords: ['camp', 'rdc', 'national integration camp', 'nic', 'trekking', 'republic day', 'rdcamp', 'yep', 'youth exchange', 'all india camp', 'annual training', 'atc'],
        respond: () => `**NCC Camps — Types & Benefits**\n\n🏕️ **Annual Training Camp (ATC):**\n• Mandatory for all cadets\n• 10 days, held at unit/company level\n• Activities: Drill, weapon training, map reading, social service\n• Required for 'B' and 'C' certificate eligibility\n\n🏕️ **Republic Day Camp (RDC) — Delhi:**\n• Most prestigious NCC camp\n• Selection: Battalion → Directorate → National level\n• Held at Delhi Cantonment every Jan\n• Activities: Guard of Honour at Rajpath, PM's rally, inter-directorate competitions\n• Best Cadet: Selected from RDC for PM's Banner\n\n🏕️ **National Integration Camp (NIC):**\n• Cadets from multiple directorates\n• Cultural exchange, folk dances, adventure activities\n\n🏕️ **Trekking Camps:**\n• Himalayan, Western Ghats, etc.\n• Develops physical endurance and teamwork\n\n🏕️ **Youth Exchange Programme (YEP):**\n• International exchange with 20+ countries\n• Requires 'C' cert + ANO recommendation\n• Provides global NCC exposure\n\n💡 **Selection Process for Higher Camps:** Unit-level selection → BN Commander approval → State Directorate → National HQ`
    },
    // ── FIRST AID ──────────────────────────────────────────────────────────────
    firstAid: {
        keywords: ['first aid', 'cpr', 'bandage', 'wound', 'fracture', 'bleeding', 'burns', 'snake bite', 'heat stroke', 'rescue', 'abc'],
        respond: () => `**First Aid — NCC Syllabus**\n\n🩺 **ABC of First Aid:**\n• **A** — Airway (Clear the airway)\n• **B** — Breathing (Check & assist breathing)\n• **C** — Circulation (Control bleeding, check pulse)\n\n**Common Scenarios:**\n\n*Bleeding:* Apply direct pressure with a clean cloth. Elevate limb. Tourniquet only for life-threatening limb bleeding (note the time applied).\n\n*Fractures:* Immobilise with improvised splint. Do NOT try to realign. Support above and below the fracture.\n\n*Burns:* Cool with running water for 10 min. Do NOT apply ice, butter, or toothpaste. Cover with sterile dressing.\n\n*Snake Bite:* Keep victim calm and still. Immobilise bitten limb. Do NOT cut, suck, or apply tourniquet. Rush to hospital.\n\n*Heat Stroke:* Move to shade. Remove excess clothing. Apply cool, wet cloths to neck, armpits, groin. Fan. Give sips of water if conscious.\n\n*CPR:* 30 chest compressions (2 inches deep, 100-120/min) → 2 rescue breaths. Repeat.\n\n💡 *Remember: Your role is to keep the casualty alive until professional medical help arrives.*`
    },
    // ── COMMUNICATION ──────────────────────────────────────────────────────────
    communication: {
        keywords: ['communication', 'radio', 'phonetic alphabet', 'morse', 'signal', 'semaphore', 'walkie talkie', 'proword', 'net', 'sitrep'],
        respond: () => `**Communication — NCC Training Notes**\n\n📡 **NATO Phonetic Alphabet:**\nAlpha, Bravo, Charlie, Delta, Echo, Foxtrot, Golf, Hotel, India, Juliet, Kilo, Lima, Mike, November, Oscar, Papa, Quebec, Romeo, Sierra, Tango, Uniform, Victor, Whiskey, X-ray, Yankee, Zulu\n\n**Radio Prowords (Procedure Words):**\n• *Over* — My transmission is complete, expect reply\n• *Out* — Conversation complete, no reply expected\n• *Roger* — Message received and understood\n• *Wilco* — Will comply\n• *Say Again* — Repeat your last message\n• *Wait Out* — I must pause (long wait)\n• *Figures* — Numbers follow\n\n**Phonetic Numbers:** Zero, Wun, Too, Tree, Fower, Fife, Six, Seven, Ait, Niner\n\n**SITREP Format:**\n1. Own location\n2. Enemy (if any)\n3. Own situation\n4. Actions taken\n5. Future intentions\n\n**Semaphore:** Flag signalling system using arm positions for each letter — used in field exercises.`
    },
    // ── UNIT SPECIFIC ──────────────────────────────────────────────────────────
    unit: {
        keywords: ['14', 'ano', 'bnc', 'battalion', 'gmrit', 'srikakulam', 'andhra', 'unit', '14a', 'officer'],
        respond: () => `**14(A) BN NCC — Unit Details**\n\n🏛️ **Unit:** 14(A) Army Battalion NCC\n📍 **HQ:** Srikakulam, Andhra Pradesh\n🎓 **Associated College:** GMRIT (GMR Institute of Technology), Rajam\n🪖 **Wing:** Army\n📋 **Directorate:** Andhra Pradesh NCC Directorate, Hyderabad\n\n**Chain of Command:**\n• National HQ → State Directorate (Hyderabad) → Group HQ → BN HQ (Srikakulam) → Company (GMRIT) → Platoon → Section\n\n**Contact:** Reach the ANO (Associate NCC Officer) at the NCC office for camp applications, certificate requests, and leave approvals.\n\n**Key Dates to Remember:**\n• NCC Day: 4th Saturday of November\n• Republic Day Camp nominations: October\n• C Certificate Exam: Usually March/April`
    },
    // ── FIELD CRAFT ──────────────────────────────────────────────────────────────
    fieldCraft: {
        keywords: ['field craft', 'cover', 'camouflage', 'movement', 'recce', 'observation', 'stalking', 'concealment', 'field signal'],
        respond: () => `**Field Craft — NCC Syllabus**\n\n🌿 **The 5 'C's of Camouflage:**\n• **Colour** — Match surroundings\n• **Contrast** — Avoid shadow/shine\n• **Cover** — Use natural cover\n• **Concealment** — Hide from enemy view\n• **Consistency** — Maintain throughout movement\n\n**Types of Ground Movement:**\n• Walk — Open ground, no enemy\n• Monkey Run — On hands and knees\n• Leopard Crawl — Body close to ground, propel with elbows/knees\n• Roll — Under intense fire, no other option\n\n**Observation:**\n• Scan ground in overlapping arcs (near to far)\n• Use binoculars in short bursts\n• *SALUTE:* Size, Activity, Location, Unit, Time, Equipment\n\n**Section Battle Drills:**\n1. Locate the enemy\n2. Win the firefight\n3. Win the assault\n4. Reorganise\n\n💡 *Key principle: Ground and Observation — always choose ground that gives you cover AND the ability to observe the enemy.*`
    },
};

// ─── Topic Categories ──────────────────────────────────────────────────────────
const TOPIC_CHIPS = [
    { label: '⚔️ Weapons', key: 'weapons' },
    { label: '🎖️ Ranks', key: 'ranks' },
    { label: '🪖 Drill', key: 'drill' },
    { label: '🏕️ Camps', key: 'camps' },
    { label: '🗺️ Map Reading', key: 'mapReading' },
    { label: '🎯 SSB Guide', key: 'ssb' },
    { label: '📋 Certificates', key: 'certificates' },
    { label: '🩺 First Aid', key: 'firstAid' },
    { label: '📡 Communication', key: 'communication' },
    { label: '🏛️ Unit Info', key: 'unit' },
    { label: '🌿 Field Craft', key: 'fieldCraft' },
    { label: '🏅 NCC Aims', key: 'aims' },
];

// ─── Resolve query to knowledge entry ─────────────────────────────────────────
const resolveResponse = (input, materials = []) => {
    const lower = input.toLowerCase();

    // Check against all knowledge sections
    for (const [, entry] of Object.entries(NCC_KNOWLEDGE)) {
        if (entry.keywords.some(kw => lower.includes(kw))) {
            return entry.respond();
        }
    }

    // Search materials
    const relevantDoc = materials.find(m =>
        lower.includes((m.title || '').toLowerCase()) ||
        lower.includes((m.category || '').toLowerCase()) ||
        (m.tags && m.tags.some(t => lower.includes(t.toLowerCase())))
    );
    if (relevantDoc) {
        return `I've found **"${relevantDoc.title}"** in the library. It covers ${relevantDoc.description || 'military training topics'}. Check the **Digital Library → ${relevantDoc.category}** section for full details.`;
    }

    // Greetings
    if (/^(hi|hello|hey|jai hind|good morning|namaste)/i.test(lower)) {
        return `**Jai Hind, Cadet!** 🫡\n\nI'm **Batra**, your 14(A) BN AI Study Assistant. I know about:\n• NCC Ranks, Drill Commands, Weapon Training\n• 'B' & 'C' Certificate Syllabus\n• SSB Preparation Guide\n• Map Reading, Field Craft, First Aid\n• Camps (RDC, ATC, NIC, YEP)\n• Unit-specific information\n\nAsk me anything or click a topic below!`;
    }

    return `I don't have specific information on that yet. You can:\n• Try a **topic chip** below for quick answers\n• Check the **E-Manuals** in the Digital Library\n• Ask your ANO for official clarification\n\nIs there something about NCC drill, weapons, SSB, or certificates I can help with?`;
};

// ─── Render markdown-like text ─────────────────────────────────────────────────
const RichText = ({ text }) => {
    const lines = text.split('\n');
    return (
        <div className="text-sm leading-relaxed space-y-1">
            {lines.map((line, i) => {
                if (!line.trim()) return <div key={i} className="h-1" />;
                // Table row
                if (line.startsWith('|')) {
                    const cells = line.split('|').filter(c => c.trim() && !c.match(/^[-\s]+$/));
                    if (cells.length === 0) return null;
                    return (
                        <div key={i} className="flex gap-2 text-[11px] font-mono border-b border-gray-100 dark:border-white/5 py-0.5">
                            {cells.map((cell, j) => (
                                <span key={j} className={`flex-1 ${j === 0 ? 'font-bold text-ncc-navy dark:text-white' : 'text-gray-500 dark:text-white/60'}`}>
                                    {cell.trim()}
                                </span>
                            ))}
                        </div>
                    );
                }
                // Heading
                if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={i} className="font-black text-ncc-navy dark:text-white text-xs uppercase tracking-wide mt-2">{line.replace(/\*\*/g, '')}</p>;
                }
                // Process inline bold
                const parts = line.split(/(\*\*[^*]+\*\*)/g);
                return (
                    <p key={i} className="text-gray-700 dark:text-white/80">
                        {parts.map((part, j) =>
                            part.startsWith('**') && part.endsWith('**')
                                ? <strong key={j} className="font-bold text-ncc-navy dark:text-white">{part.slice(2, -2)}</strong>
                                : part
                        )}
                    </p>
                );
            })}
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export const AIAssistant = () => {
    const [isOpen, setIsOpen]     = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "**Jai Hind, Cadet! 🫡**\n\nI'm **Batra**, your 14(A) BN AI Study Assistant. Ask me anything about NCC syllabus, weapon training, drill commands, SSB preparation, or unit history.\n\nClick a topic below to get started!" }
    ]);
    const [input, setInput]       = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [displayedMsg, setDisplayedMsg] = useState('');
    const [isStreaming, setIsStreaming]   = useState(false);
    const scrollRef   = useRef(null);
    const inputRef    = useRef(null);
    const { materials } = useDataContext();

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isTyping, displayedMsg]);

    // Character-by-character streaming effect
    const streamResponse = useCallback((text) => {
        setIsStreaming(true);
        setDisplayedMsg('');
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                setDisplayedMsg(prev => prev + text[i]);
                i++;
            } else {
                clearInterval(interval);
                setIsStreaming(false);
                setMessages(prev => {
                    const copy = [...prev];
                    if (copy[copy.length - 1]?.role === 'streaming') {
                        copy[copy.length - 1] = { role: 'assistant', content: text };
                    } else {
                        copy.push({ role: 'assistant', content: text });
                    }
                    return copy;
                });
                setDisplayedMsg('');
            }
        }, 8); // ~8ms per char ≈ ~125 chars/sec
    }, []);

    const sendMessage = useCallback((text) => {
        if (!text.trim()) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: text.trim() }, { role: 'streaming', content: '' }]);
        setIsTyping(true);

        // Simulate processing delay
        setTimeout(() => {
            const response = resolveResponse(text.trim(), materials);
            setIsTyping(false);
            streamResponse(response);
        }, 600);
    }, [materials, streamResponse]);

    const handleSubmit = (e) => { e.preventDefault(); sendMessage(input); };

    const handleChip = (key) => {
        const entry = NCC_KNOWLEDGE[key];
        if (!entry) return;
        const chipLabel = TOPIC_CHIPS.find(c => c.key === key)?.label || key;
        sendMessage(`Tell me about: ${chipLabel}`);
        inputRef.current?.focus();
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text.replace(/\*\*/g, '')).catch(() => {});
        const btn = document.activeElement;
        if (btn) { btn.textContent = '✓'; setTimeout(() => { btn.textContent = '⎘'; }, 1500); }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[200]">
            {/* Toggle Button */}
            <button
                id="ai-assistant-toggle"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 ${isOpen ? 'bg-red-500 rotate-90' : 'bg-ncc-navy'}`}
            >
                {isOpen ? <X className="text-white w-6 h-6" /> : <MessageSquare className="text-ncc-gold w-7 h-7" />}
                {!isOpen && <span className="absolute -top-1 -right-1 w-4 h-4 bg-ncc-gold rounded-full animate-ping opacity-75" />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[420px] max-w-[calc(100vw-2rem)] h-[580px] bg-white dark:bg-[#0a1628] rounded-3xl shadow-2xl border border-[#ddd8cc] dark:border-ncc-gold/10 flex flex-col overflow-hidden"
                     style={{ animation: 'slideUp 0.2s ease-out' }}>

                    {/* Header */}
                    <div className="bg-ncc-navy p-4 flex items-center gap-3 shrink-0">
                        <div className="w-10 h-10 bg-ncc-gold rounded-xl flex items-center justify-center shrink-0">
                            <Bot className="text-ncc-navy w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white font-display font-bold text-sm">Batra AI Assistant</h4>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest truncate">14(A) BN · NCC Knowledge Base</span>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0">
                            <X className="text-white w-4 h-4" />
                        </button>
                    </div>

                    {/* Topic Chips */}
                    <div className="px-3 pt-3 pb-2 flex flex-wrap gap-1.5 shrink-0 border-b border-gray-100 dark:border-white/5 overflow-x-auto">
                        {TOPIC_CHIPS.map(chip => (
                            <button
                                key={chip.key}
                                onClick={() => handleChip(chip.key)}
                                disabled={isTyping || isStreaming}
                                className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-ncc-navy dark:text-white/80 hover:bg-ncc-gold/20 hover:text-ncc-navy dark:hover:text-white transition-all whitespace-nowrap disabled:opacity-40"
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fcfaf7] dark:bg-[#050b14] ncc-scrollbar">
                        {messages.map((msg, i) => {
                            if (msg.role === 'streaming') {
                                return (
                                    <div key={i} className="flex justify-start">
                                        <div className="max-w-[90%] p-3.5 rounded-2xl rounded-tl-none bg-white dark:bg-[#0a1628] border border-[#ddd8cc] dark:border-white/10 shadow-sm">
                                            <RichText text={displayedMsg || '…'} />
                                            <span className="inline-block w-1 h-4 bg-ncc-gold animate-pulse ml-0.5 align-middle" />
                                        </div>
                                    </div>
                                );
                            }
                            return (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                                    <div className={`max-w-[90%] relative ${msg.role === 'user'
                                        ? 'bg-ncc-navy text-white rounded-2xl rounded-tr-none p-3.5'
                                        : 'bg-white dark:bg-[#0a1628] border border-[#ddd8cc] dark:border-white/10 rounded-2xl rounded-tl-none shadow-sm p-3.5'
                                    }`}>
                                        {msg.role === 'user'
                                            ? <p className="text-sm">{msg.content}</p>
                                            : <RichText text={msg.content} />
                                        }
                                        {msg.role === 'assistant' && (
                                            <button
                                                onClick={() => copyToClipboard(msg.content)}
                                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-white/40 text-[10px] font-black hidden group-hover:flex items-center justify-center hover:bg-ncc-gold/20 transition-all"
                                                title="Copy response"
                                            >⎘</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-[#0a1628] border border-[#ddd8cc] dark:border-white/10 p-3 rounded-2xl rounded-tl-none flex gap-1 shadow-sm">
                                    {[0, 0.2, 0.4].map((delay, i) => (
                                        <div key={i} className="w-1.5 h-1.5 bg-ncc-gold rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="p-3 bg-white dark:bg-[#0a1628] border-t border-gray-100 dark:border-white/5 shrink-0">
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Ask about ranks, SSB, drill, weapons…"
                                className="w-full bg-gray-50 dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-ncc-gold/50 text-ncc-navy dark:text-white placeholder-gray-400 dark:placeholder-white/30"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                disabled={isTyping || isStreaming}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isTyping || isStreaming}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-ncc-navy text-white rounded-xl flex items-center justify-center hover:bg-ncc-gold hover:text-ncc-navy transition disabled:opacity-30"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[9px] text-center text-gray-400 dark:text-white/30 mt-1.5 flex items-center justify-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-ncc-gold" />
                            Powered by 14(A) BN NCC Knowledge Base
                        </p>
                    </form>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(16px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};
