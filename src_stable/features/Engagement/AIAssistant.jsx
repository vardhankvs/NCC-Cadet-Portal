import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, Send, Sparkles, User, X, BookOpen } from '../../components/Icons.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { buildCadetContextPrompt, getSuggestionLibrary } from './cadetContextBuilder.js';
import { SuggestionLibrary } from './SuggestionLibrary.jsx';

const BASE_SYSTEM_PROMPT = `You are Vanguard AI, an expert, highly disciplined, and helpful assistant for the National Cadet Corps (NCC). 
Your primary duty is to answer questions related strictly to NCC, military, defense forces, leadership, camps (like RDC, TSC, ATC), ranks, uniform, exams ('B' and 'C' certificates), and related topics.

CRITICAL INSTRUCTION: You are also the official guide for the "NCC Vanguard Portal" web app! If a user asks how to use the app, where to find something, or what the app can do, guide them to the correct sidebar tab:
- "My Hub": Contains NCC Knowledge, My Profile, Attendance, Kit Sizes, Apply Leave.
- "Intelligence": Contains Unit Hierarchy, Honour Roll (Leaderboard), Unit Excellence, Staff, Alumni.
- "Training": Contains Calendar, Mock Exams, My Fitness (PFT Tracker), My Camps, Digital Library.
- "Engagement": Contains Notice Board, Broadcasts, Messages, Events, Unit Gallery, Social Service, Blood Bank.
- "Services": Contains Career Hub, Career Bridge, Report Issue, Feedback, AI Assistant.

EXCEPTION & MANDATE: If the user asks to summarize their performance, attendance, camps, or exam eligibility, DO NOT give generic tab navigation advice. Refer directly to the "CURRENT LOGGED-IN CADET PROFILE CONTEXT" and present their actual attendance %, parade count, rank, camp count, and cutoff status!

Keep your answers concise, respectful, structured, and informative. Always address the user politely.
If a user asks about anything completely unrelated (like coding, cooking, celebrity gossip, or general chitchat), you MUST politely decline and remind them that your operational scope is limited to NCC and Defense matters. 
Format your responses using Markdown (bolding, bullet points, numbered lists) to make them easy to read. Keep your responses under 200 words if possible.`;

export const AIAssistant = () => {
    const authCtx = useAuthContext();
    const dataCtx = useDataContext();
    const { userName, userRole } = authCtx;

    const [isOpen, setIsOpen] = useState(false);
    const [isSuggestionLibraryOpen, setIsSuggestionLibraryOpen] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);

    // Multilingual Language State
    const [selectedLang, setSelectedLang] = useState('en-IN'); // 'en-IN', 'hi-IN'

    // Live Cadet Context Prompt
    const liveContextPrompt = useMemo(() => {
        return buildCadetContextPrompt({
            ...authCtx,
            ...dataCtx
        });
    }, [authCtx, dataCtx]);

    // Categorized Suggestion Library Data
    const suggestionLibraryData = useMemo(() => {
        return getSuggestionLibrary({
            ...authCtx,
            ...dataCtx
        });
    }, [authCtx, dataCtx]);

    const fullSystemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${liveContextPrompt}`;

    const [conversation, setConversation] = useState([
        { role: 'system', content: fullSystemPrompt },
        { 
            role: 'assistant', 
            content: `**Jai Hind, ${userName?.split(' ')[0] || (userRole === 'cadet' ? 'Cadet' : 'Officer')}!** 🎖️\n\nI am **Vanguard AI** — your profile-trained NCC assistant.\n\nClick **Suggestions** or ask me anything!` 
        }
    ]);

    const handleLanguageChange = (langCode) => {
        setSelectedLang(langCode);
    };

    // Sync updated system prompt on user change
    useEffect(() => {
        setConversation(prev => {
            const hasSystem = prev.some(m => m.role === 'system');
            if (hasSystem) {
                return prev.map(m => m.role === 'system' ? { ...m, content: fullSystemPrompt } : m);
            }
            return [{ role: 'system', content: fullSystemPrompt }, ...prev];
        });
    }, [fullSystemPrompt]);

    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const constraintsRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [conversation, isTyping, isOpen]);

    const handleSend = async (text) => {
        const msgText = text || input;
        if (!msgText.trim() || isTyping) return;

        const userMessage = { role: 'user', content: msgText };
        const updatedConversation = [...conversation, userMessage];
        
        setConversation(updatedConversation);
        setInput('');
        setIsTyping(true);

        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            
            if (!apiKey) {
                throw new Error("API Key is missing. Using local profile intelligence fallback.");
            }

            let conversationPayload = [...updatedConversation];
            if (selectedLang === 'hi-IN') {
                conversationPayload.push({
                    role: 'system',
                    content: 'CRITICAL MULTILINGUAL MANDATE: The user has selected HINDI language mode (HI). You MUST generate your entire response in clear, fluent Hindi (Devanagari script).'
                });
            }

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: conversationPayload,
                    temperature: 0.5,
                    max_tokens: 1024,
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || "Failed to fetch from Groq");
            }

            const data = await response.json();
            const botResponse = data.choices[0]?.message?.content || "I am currently unable to process that request.";
            setConversation([...updatedConversation, { role: 'assistant', content: botResponse }]);
        } catch (error) {
            console.warn("Groq API Fallback:", error.message);
            // Local Profile Fallback Response Generator
            const fallbackReply = generateLocalProfileFallback(msgText, authCtx, dataCtx, selectedLang);
            setConversation([...updatedConversation, { role: 'assistant', content: fallbackReply }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleCopy = (content, index) => {
        navigator.clipboard.writeText(content.replace(/\*\*/g, '')).catch(() => {});
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    // Quick local profile fallback for key queries when offline/no API key
    const generateLocalProfileFallback = (query, auth, data, lang = 'en-IN') => {
        const isHindi = lang === 'hi-IN';
        const q = query.toLowerCase();
        const normId = String(auth.userEnrollmentId || '').trim().toUpperCase();
        const cadet = (data.cadets || []).find(c => String(c.enrollmentId || c.regNo || '').trim().toUpperCase() === normId) || {};
        const att = data.attendanceData?.personalSummary?.percentage ?? cadet.attendancePercentage ?? 75;
        const rank = cadet.rank || 'Cadet (CDT)';
        const cert = cadet.currentCertificate || cadet.certificate || 'B Certificate';

        // Next rank mapping
        const nextRankMap = {
            'Cadet': 'Lance Corporal (L/Cpl)',
            'Cadet (CDT)': 'Lance Corporal (L/Cpl)',
            'Lance Corporal': 'Corporal (Cpl)',
            'Corporal': 'Sergeant (Sgt)',
            'Sergeant': 'CQMS',
            'Company Quartermaster Sergeant (CQMS)': 'Under Officer (UO)',
            'Under Officer': 'Senior Under Officer (SUO)'
        };
        const nextRank = nextRankMap[rank] || 'Under Officer (UO)';

        // 1. Attendance & Overall Summary
        if (q.includes('attendance') || q.includes('summarize') || q.includes('performance') || q.includes('उपस्थिति') || q.includes('रिपोर्ट')) {
            if (isHindi) {
                return `**जय हिंद, ${cadet.name || auth.userName || 'कैडेट'}!** 📊\n\nआपकी लाइव प्रोफ़ाइल रिपोर्ट:\n• **परेड उपस्थिति (Attendance):** ${att}% (${att >= 75 ? 'कटऑफ पूरी ✅' : '75% कटऑफ से कम ⚠️'})\n• **वर्तमान रैंक:** ${rank}\n• **अगली लक्ष्य रैंक:** ${nextRank}\n• **प्रमाणपत्र ट्रैक:** ${cert}\n• **दर्ज किए गए कैंप:** ${(cadet.campHistory?.length || 0)} कैंप\n\n*परीक्षा पात्रता बनाए रखने के लिए परेड में नियमित रूप से उपस्थित रहें!*`;
            }
            return `**Jai Hind, ${cadet.name || auth.userName || 'Cadet'}!** 📊\n\nHere is your live profile summary:\n• **Parade Attendance:** ${att}% (${att >= 75 ? 'Cutoff Met ✅' : 'Below 75% Cutoff ⚠️'})\n• **Current Rank:** ${rank}\n• **Next Rank Target:** ${nextRank}\n• **Certificate Track:** ${cert}\n• **Camps Recorded:** ${(cadet.campHistory?.length || 0)} Camp(s)\n\n*Keep attending parades consistently to maintain your exam eligibility!*`;
        }

        // 3. Rank & Promotion
        if (q.includes('rank') || q.includes('promotion') || q.includes('suo') || q.includes('uo') || q.includes('रैंक') || q.includes('प्रमोशन')) {
            if (isHindi) {
                return `**रैंक और पदोन्नति मार्गदर्शन:** 🎖️\n\n• **वर्तमान रैंक:** ${rank}\n• **अगली लक्ष्य रैंक:** **${nextRank}**\n\n**मुख्य पदोन्नति मानदंड:**\n1. **उपस्थिति:** न्यूनतम 75% परेड उपस्थिति।\n2. **ड्रिल दक्षता:** स्क्वाड ड्रिल और कमांड आवाज में महारत हासिल करें।\n3. **हथियार प्रशिक्षण:** .22 राइफल ग्रुपिंग और लोडिंग ड्रिल का अभ्यास करें।`;
            }
            return `**Rank & Promotion Guidance:** 🎖️\n\n• **Current Rank:** ${rank}\n• **Next Rank Target:** **${nextRank}**\n\n**Key Promotion Criteria:**\n1. **Attendance:** Minimum 75% parade attendance.\n2. **Drill Proficiency:** Master Squad Drill, Arms Drill, and Command voice.\n3. **Weapon Training:** Practice .22 rifle grouping & loading drills.\n4. **Leadership & Discipline:** Active role in unit activities & ANO recommendation.`;
        }

        // 4. Exam Eligibility
        if (q.includes('eligible') || q.includes('c cert') || q.includes('b cert') || q.includes('cutoff') || q.includes('पात्रता') || q.includes('परीक्षा')) {
            if (isHindi) {
                return `**परीक्षा पात्रता विश्लेषण:** 📜\n\n• **आपकी परेड उपस्थिति:** **${att}%**\n• **स्थिति:** ${att >= 75 ? '✅ परीक्षाओं के लिए **पात्र (ELIGIBLE)**!' : '⚠️ **अपात्र (INELIGIBLE)।** न्यूनतम 75% उपस्थिति आवश्यक है।'}\n\n**अनिवार्य मानदंड:**\n1. 75% परेड उपस्थिति\n2. कम से कम 1 एटीसी (ATC) कैंप में अनिवार्य उपस्थिति`;
            }
            return `**Exam Eligibility Analysis:** 📜\n\n• **Your Parade Attendance:** **${att}%**\n• **Status:** ${att >= 75 ? '✅ **ELIGIBLE** for written & practical exams!' : '⚠️ **INELIGIBLE.** Minimum 75% parade attendance required.'}\n\n**Mandatory Criteria:**\n1. 75% Parade Attendance\n2. Mandatory Attendance in at least 1 Annual Training Camp (ATC)\n3. Recommendation from Unit ANO`;
        }

        // 5. Camps (RDC, TSC, ATC, NIC, YEP)
        if (q.includes('camp') || q.includes('rdc') || q.includes('tsc') || q.includes('atc') || q.includes('yep') || q.includes('कैंप')) {
            if (isHindi) {
                return `**एनसीसी कैंप और प्रशिक्षण गाइड:** ⛺\n\n• **RDC (गणतंत्र दिवस शिविर):** नई दिल्ली में आयोजित, राजपथ परेड और पीएम रैली शामिल है।\n• **TSC (थल सैनिक शिविर):** बाधा दौड़, शूटिंग और मैप रीडिंग पर केंद्रित।\n• **ATC (वार्षिक प्रशिक्षण शिविर):** 10-दिवसीय यूनिट कैंप, परीक्षाओं के लिए अनिवार्य।\n\n*आपके दर्ज कैंप:* ${(cadet.campHistory?.length || 0)} कैंप`;
            }
            return `**NCC Camps & Training Guide:** ⛺\n\n• **RDC (Republic Day Camp):** Held at New Delhi, features Rajpath Parade & PM Rally.\n• **TSC (Thal Sainik Camp):** Focuses on Obstacle Course, Shooting, Map Reading & Field Craft.\n• **ATC (Annual Training Camp):** 10-day unit camp, mandatory for 'B' & 'C' cert exams.\n• **YEP (Youth Exchange Programme):** International representation in friendly nations.\n\n*Your Recorded Camps:* ${(cadet.campHistory?.length || 0)} Camp(s)`;
        }

        // 6. Weapons & Study Topics (.22, INSAS, Map, Camouflage, First Aid, Drill Quiz)
        if (q.includes('rifle') || q.includes('.22') || q.includes('insas') || q.includes('weapon')) {
            return `**NCC Weapon Specifications:** 🔫\n\n• **.22 Deluxe Rifle:** Caliber: 0.22", Mag: 5 rounds, Weight: 1.7 kg, Range: 25 yards.\n• **5.56mm INSAS Rifle:** Caliber: 5.56mm, Mag: 20 rounds, Range: 400 meters, Modes: Single & 3-round burst.`;
        }
        if (q.includes('map') || q.includes('grid')) {
            return `**Map Reading Guide:** 🗺️\n\n• **6-Figure Grid Reference:** Read **Eastings** first (left-to-right), then **Northings** (bottom-to-top) — *"Eastings before Northings" (Eer before Nor)*.\n• **Contour Lines:** Lines joining points of equal elevation; closer lines mean steeper slope.`;
        }
        if (q.includes('camouflage') || q.includes('concealment') || q.includes('5 c')) {
            return `**5 'C's of Camouflage & Concealment:** 🌲\n1. **Shape:** Alter artificial outlines.\n2. **Shadow:** Avoid standing in open sun.\n3. **Silhouette:** Never skyline against clear sky.\n4. **Surface:** Break up shine and contrast.\n5. **Spacing:** Maintain tactical distance between cadets.`;
        }
        if (q.includes('first aid') || q.includes('cpr') || q.includes('abc')) {
            return `**First Aid ABC Rule:** 🚑\n• **A - Airway:** Clear any blockage in throat.\n• **B - Breathing:** Check chest movement & air flow.\n• **C - Circulation:** Check pulse and stop severe bleeding.`;
        }
        if (q.includes('quiz') || q.includes('drill')) {
            return `**Quick 5-Question Drill Quiz:** 🫡\n1. *Degree of Dahine Mur (Right Turn)?* → 90°\n2. *Degree of Aage Laut (About Turn)?* → 180°\n3. *Paces in Vishram?* → 12 inches between heels.\n4. *Paces per minute in Tez Chal?* → 120 paces/min (SD/JD).\n5. *Salute on Dahine Dekh?* → Head turns right while arms swing.`;
        }

        // 7. SSB & Defence Career
        if (q.includes('ssb') || q.includes('olq') || q.includes('direct entry') || q.includes('upsc')) {
            return `**SSB & Defence Career Guide:** 🛡️\n\n• **Direct SSB Entry:** 'C' Certificate holders with 'A' or 'B' grade get direct SSB interview calls for CDSE without UPSC written exam!\n• **15 OLQs:** Evaluated across Planning & Reasoning, Social Adjustment, Social Effectiveness, and Dynamic Courage.\n• **5-Day Procedure:** Day 1 (OIR & PP&DT Screening), Day 2 (Psychology Tests), Day 3-4 (GTO Tasks & Interview), Day 5 (Conference).`;
        }

        // 8. Portal Navigation & Tools
        if (q.includes('kit') || q.includes('size')) {
            return `**Kit Sizes & Uniform:** 👔\nYour uniform recommendations can be updated under **My Hub → Kit Sizes**.\nRecommended Shirt: ${cadet.shirtSize || '38'}, Pant: ${cadet.pantSize || '32'}, Boots: ${cadet.shoeSize || '8'}.`;
        }
        if (q.includes('blood')) {
            return `**Blood Registry:** 🩸\nYou can request blood or register as a donor under **Engagement → Blood Bank**.`;
        }
        if (q.includes('grievance') || q.includes('report') || q.includes('issue')) {
            return `**Grievance Cell:** 💬\nYou can submit feedback or unit grievances under **Engagement → Grievance Cell**.`;
        }

        if (isHindi) {
            return `**जय हिंद, कैडेट ${cadet.name || auth.userName || ''}!** 🫡\n\nमैं Vanguard AI हूँ — आपका एनसीसी प्रोफाइल गाइड। अपनी **उपस्थिति**, **शुल्क बकाया**, **रैंक पदोन्नति**, या **परीक्षा पात्रता** के बारे में पूछें!`;
        }

        return `**Jai Hind, Cadet ${cadet.name || auth.userName || ''}!** 🫡\n\nI am Vanguard AI — your profile-trained NCC guide. Ask me about your **attendance**, **fee dues**, **rank promotions**, **camps**, **'B'/'C' cert exam eligibility**, **weapons**, or **SSB interview tips**!`;
    };

    const quickChips = suggestionLibraryData[0]?.suggestions.slice(0, 3) || [
        "Summarize my attendance & performance",
        "Am I eligible for C Certificate?",
        "Check my registered camps"
    ];

    return (
        <>
            <div ref={constraintsRef} className="fixed inset-4 z-[998] pointer-events-none" />
            <motion.div 
                drag
                dragConstraints={constraintsRef}
                dragMomentum={false}
                className="fixed bottom-6 right-6 z-[999] flex flex-col items-end pointer-events-auto"
                style={{ touchAction: "none" }}
            >
                <AnimatePresence>
                    {isOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="mb-4 w-[350px] sm:w-[460px] h-[580px] max-h-[85vh] flex flex-col bg-white dark:bg-[#050b14] rounded-[2rem] border border-[#ddd8cc] dark:border-white/10 shadow-2xl overflow-hidden relative"
                        >
                            {/* YouTube Studio Style Suggestion Library Drawer Component */}
                            <SuggestionLibrary
                                isOpen={isSuggestionLibraryOpen}
                                onClose={() => setIsSuggestionLibraryOpen(false)}
                                onSelectSuggestion={(text) => handleSend(text)}
                                suggestionsData={suggestionLibraryData}
                            />

                            {/* Header */}
                            <div className="bg-ncc-navy p-4 flex items-center justify-between shadow-md z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                                        <Sparkles className="w-5 h-5 text-ncc-gold" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-display font-black text-white flex items-center gap-2">
                                            Vanguard AI
                                        </h2>
                                        <p className="text-white/60 text-[10px]">NCC Profile-Aware AI Assistant</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    {/* YouTube Studio Style Suggestion Library Button */}
                                    <button
                                        onClick={() => setIsSuggestionLibraryOpen(true)}
                                        className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-ncc-gold hover:text-white rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all border border-white/10"
                                        title="Open YouTube Studio style prompt suggestion library"
                                    >
                                        <BookOpen className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Suggestions</span>
                                    </button>

                                    <button 
                                        onClick={() => setIsOpen(false)}
                                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-[#02050A] ncc-scrollbar">
                                <AnimatePresence initial={false}>
                                    {conversation.filter(msg => msg.role !== 'system').map((msg, idx) => (
                                        <motion.div 
                                            key={idx}
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}
                                        >
                                            {msg.role === 'assistant' && (
                                                <div className="w-7 h-7 rounded-full bg-ncc-navy flex-shrink-0 flex items-center justify-center shadow-md border border-ncc-gold/30 mt-1">
                                                    <Bot className="w-3.5 h-3.5 text-ncc-gold" />
                                                </div>
                                            )}
                                            
                                            <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm relative ${
                                                msg.role === 'user' 
                                                    ? 'bg-ncc-navy text-white rounded-br-none' 
                                                    : 'bg-white dark:bg-[#0a1628] border border-gray-100 dark:border-white/10 text-gray-700 dark:text-gray-200 rounded-bl-none prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-gray-100 dark:prose-pre:bg-white/5'
                                            }`}>
                                                <div className="text-[13px] leading-relaxed break-words">
                                                    {msg.role === 'assistant' ? (
                                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                    ) : (
                                                        msg.content
                                                    )}
                                                </div>

                                                {msg.role === 'assistant' && (
                                                    <div className="absolute -bottom-2.5 right-2 flex items-center gap-1 z-10">
                                                        {/* Copy Button */}
                                                        <button
                                                            onClick={() => handleCopy(msg.content, idx)}
                                                            className="px-2 py-0.5 bg-white dark:bg-[#112238] hover:bg-ncc-gold hover:text-ncc-navy text-[9px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-all text-gray-600 dark:text-white/70 shadow-md border border-gray-200 dark:border-white/10"
                                                        >
                                                            {copiedIndex === idx ? 'Copied ✓' : 'Copy'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {msg.role === 'user' && (
                                                <div className="w-7 h-7 rounded-full bg-ncc-gold/20 border border-ncc-gold/30 flex-shrink-0 flex items-center justify-center mt-1">
                                                    <User className="w-3.5 h-3.5 text-ncc-gold" />
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {isTyping && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex gap-3 justify-start"
                                    >
                                        <div className="w-7 h-7 rounded-full bg-ncc-navy flex-shrink-0 flex items-center justify-center shadow-md border border-ncc-gold/30 mt-1">
                                            <Bot className="w-3.5 h-3.5 text-ncc-gold" />
                                        </div>
                                        <div className="bg-white dark:bg-[#0a1628] border border-gray-100 dark:border-white/10 rounded-2xl rounded-bl-none p-3 flex items-center gap-2">
                                            <div className="flex gap-1">
                                                <span className="w-1.5 h-1.5 bg-ncc-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-1.5 h-1.5 bg-ncc-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-1.5 h-1.5 bg-ncc-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Footer Input Controls */}
                            <div className="p-3 bg-white dark:bg-[#050b14] border-t border-gray-100 dark:border-white/10 space-y-2">
                                {/* Language Selector Bar */}
                                <div className="flex items-center justify-between gap-2 px-1">
                                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-0.5 rounded-lg border border-gray-200 dark:border-white/10">
                                        {[
                                            { code: 'en-IN', label: 'EN (English)' },
                                            { code: 'hi-IN', label: 'HI (हिन्दी)' }
                                        ].map(lang => (
                                            <button
                                                key={lang.code}
                                                onClick={() => handleLanguageChange(lang.code)}
                                                className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${
                                                    selectedLang === lang.code 
                                                        ? 'bg-ncc-navy text-ncc-gold shadow-sm' 
                                                        : 'text-gray-400 hover:text-ncc-navy dark:hover:text-white'
                                                }`}
                                            >
                                                {lang.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Dynamic YouTube Studio Quick Chips */}
                                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                                    {quickChips.map((sug, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => handleSend(sug)}
                                            className="px-2.5 py-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-ncc-gold hover:text-ncc-gold transition-colors rounded-full text-[9px] font-bold text-gray-500 dark:text-gray-400 truncate max-w-[220px]"
                                        >
                                            {sug}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setIsSuggestionLibraryOpen(true)}
                                        className="px-2.5 py-1 bg-ncc-gold/10 border border-ncc-gold/30 text-ncc-gold hover:bg-ncc-gold hover:text-ncc-navy transition-colors rounded-full text-[9px] font-bold flex items-center gap-1 shrink-0"
                                    >
                                        <Sparkles className="w-2.5 h-2.5" />
                                        More Suggestions →
                                    </button>
                                </div>
                                
                                {/* Input Box & Send Button */}
                                <div className="relative flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                                        placeholder="Ask Vanguard AI..."
                                        className="flex-1 bg-gray-50 dark:bg-[#02050A] border border-gray-200 dark:border-white/10 focus:border-ncc-gold rounded-xl py-3 px-4 text-xs outline-none transition-all text-ncc-navy dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30"
                                    />

                                    <button 
                                        onClick={() => handleSend(input)}
                                        disabled={!input.trim() || isTyping}
                                        className="w-10 h-10 bg-ncc-gold text-ncc-navy rounded-xl flex items-center justify-center hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shrink-0"
                                    >
                                        <Send className="w-4 h-4 -ml-0.5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating Action Button (FAB) */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-14 h-14 bg-ncc-navy rounded-full shadow-2xl flex items-center justify-center border-2 border-ncc-gold overflow-hidden relative group"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-ncc-navy via-ncc-navy to-ncc-gold/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Bot className={`w-6 h-6 text-ncc-gold transition-transform duration-300 ${isOpen ? 'rotate-180 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
                    <X className={`w-6 h-6 text-ncc-gold absolute transition-transform duration-300 ${isOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-180 scale-0 opacity-0'}`} />
                </motion.button>
            </motion.div>
        </>
    );
};
