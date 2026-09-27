// src_stable/features/Engagement/AIAssistantPage.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, Send, Sparkles, User, X, BookOpen } from '../../components/Icons.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import ReactMarkdown from 'react-markdown';
import { buildCadetContextPrompt, getSuggestionLibrary } from './cadetContextBuilder.js';
import { SuggestionLibrary } from './SuggestionLibrary.jsx';

const BASE_SYSTEM_PROMPT = `You are Vanguard AI, an expert, highly disciplined, and helpful assistant for the National Cadet Corps (NCC). 
Your primary duty is to answer questions related strictly to NCC, military, defense forces, leadership, camps (like RDC, TSC, ATC), ranks, uniform, exams ('B' and 'C' certificates), and related topics.

CRITICAL INSTRUCTION: You are also the official guide for the "NCC Vanguard Portal" web app! If a user asks how to use the app, where to find something, or what the app can do, guide them to the correct sidebar tab:
- "My Hub": Contains NCC Knowledge, My Profile, Attendance, Kit Sizes, Apply Leave.
- "Intelligence": Contains Unit Hierarchy, Honour Roll (Leaderboard), Unit Excellence, Staff, Alumni.
- "Training": Contains Calendar, Mock Exams, My Fitness (PFT Tracker), My Camps, Digital Library.
- "Engagement": Contains Notice Board, Broadcasts, Messages, Grievance Cell, Events, Unit Gallery, Social Service, Blood Bank.
- "Services": Contains Career Hub, Career Bridge, Feedback, AI Assistant.

EXCEPTION & MANDATE: If the user asks to summarize their performance, attendance, camps, or exam eligibility, DO NOT give generic tab navigation advice. Refer directly to the "CURRENT LOGGED-IN CADET PROFILE CONTEXT" and present their actual attendance %, parade count, rank, camp count, and cutoff status!

Keep your answers concise, respectful, structured, and informative. Always address the user politely.
If a user asks about anything completely unrelated (like coding, cooking, celebrity gossip, or general chitchat), you MUST politely decline and remind them that your operational scope is limited to NCC and Defense matters. 
Format your responses using Markdown (bolding, bullet points, numbered lists) to make them easy to read. Keep your responses under 200 words if possible.`;

export const AIAssistantPage = () => {
    const authCtx = useAuthContext();
    const dataCtx = useDataContext();
    const { userName, userRole } = authCtx;

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
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [conversation, isTyping]);

    const handleSend = async (text) => {
        const msgText = text || input;
        if (!msgText.trim() || isTyping) return;

        // Build the updated conversation by appending the user's new message
        const updatedConversation = [...conversation, { role: 'user', content: msgText }];

        setConversation(updatedConversation);
        setInput('');
        setIsTyping(true);

        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) throw new Error('API Key not configured. Using local profile intelligence fallback.');

            let conversationPayload = [...updatedConversation];
            if (selectedLang === 'hi-IN') {
                conversationPayload.push({
                    role: 'system',
                    content: 'CRITICAL MULTILINGUAL MANDATE: The user has selected HINDI language mode (HI). You MUST generate your entire response in clear, fluent Hindi (Devanagari script).'
                });
            }

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: conversationPayload,
                    temperature: 0.5,
                    max_tokens: 1024,
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || 'Failed to reach Vanguard AI.');
            }

            const data = await response.json();
            const botResponse = data.choices[0]?.message?.content || 'I am currently unable to process that request.';
            setConversation([...updatedConversation, { role: 'assistant', content: botResponse }]);
        } catch (error) {
            console.warn('Groq API Fallback:', error.message);
            const fallbackReply = generateLocalProfileFallback(msgText, authCtx, dataCtx, selectedLang);
            setConversation([...updatedConversation, { role: 'assistant', content: fallbackReply }]);
        } finally {
            setIsTyping(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

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

        if (q.includes('attendance') || q.includes('summarize') || q.includes('performance') || q.includes('उपस्थिति') || q.includes('रिपोर्ट')) {
            if (isHindi) {
                return `**जय हिंद, ${cadet.name || auth.userName || 'कैडेट'}!** 📊\n\nआपकी लाइव प्रोफ़ाइल रिपोर्ट:\n• **परेड उपस्थिति (Attendance):** ${att}% (${att >= 75 ? 'कटऑफ पूरी ✅' : '75% कटऑफ से कम ⚠️'})\n• **वर्तमान रैंक:** ${rank}\n• **अगली लक्ष्य रैंक:** ${nextRank}\n• **प्रमाणपत्र ट्रैक:** ${cert}\n• **दर्ज किए गए कैंप:** ${(cadet.campHistory?.length || 0)} कैंप\n\n*परीक्षा पात्रता बनाए रखने के लिए परेड में नियमित रूप से उपस्थित रहें!*`;
            }
            return `**Jai Hind, ${cadet.name || auth.userName || 'Cadet'}!** 📊\n\nHere is your live profile summary:\n• **Parade Attendance:** ${att}% (${att >= 75 ? 'Cutoff Met ✅' : 'Below 75% Cutoff ⚠️'})\n• **Current Rank:** ${rank}\n• **Next Rank Target:** ${nextRank}\n• **Certificate Track:** ${cert}\n• **Camps Recorded:** ${(cadet.campHistory?.length || 0)} Camp(s)\n\n*Keep attending parades consistently to maintain your exam eligibility!*`;
        }
        if (q.includes('rank') || q.includes('promotion') || q.includes('रैंक') || q.includes('प्रमोशन')) {
            if (isHindi) {
                return `**रैंक और पदोन्नति मार्गदर्शन:** 🎖️\n\n• **वर्तमान रैंक:** ${rank}\n• **अगली लक्ष्य रैंक:** **${nextRank}**\n\n**मुख्य पदोन्नति मानदंड:**\n1. **उपस्थिति:** न्यूनतम 75% परेड उपस्थिति।\n2. **ड्रिल दक्षता:** स्क्वाड ड्रिल और कमांड आवाज में महारत हासिल करें।\n3. **हथियार प्रशिक्षण:** .22 राइफल ग्रुपिंग और लोडिंग ड्रिल का अभ्यास करें।`;
            }
            return `**Rank & Promotion Guidance:** 🎖️\n\n• **Current Rank:** ${rank}\n• **Next Rank Target:** **${nextRank}**\n\n**Key Promotion Criteria:**\n1. **Attendance:** Minimum 75% parade attendance.\n2. **Drill Proficiency:** Master Squad Drill, Arms Drill, and Command voice.\n3. **Weapon Training:** Practice .22 rifle grouping & loading drills.\n4. **Leadership & Discipline:** Active role in unit activities & ANO recommendation.`;
        }
        if (q.includes('eligible') || q.includes('c cert') || q.includes('b cert') || q.includes('पात्रता') || q.includes('परीक्षा')) {
            if (isHindi) {
                return `**परीक्षा पात्रता विश्लेषण:** 📜\n\n• **आपकी परेड उपस्थिति:** **${att}%**\n• **स्थिति:** ${att >= 75 ? '✅ परीक्षाओं के लिए **पात्र (ELIGIBLE)**!' : '⚠️ **अपात्र (INELIGIBLE)।** न्यूनतम 75% उपस्थिति आवश्यक है।'}\n\n**अनिवार्य मानदंड:**\n1. 75% परेड उपस्थिति\n2. कम से कम 1 एटीसी (ATC) कैंप में अनिवार्य उपस्थिति`;
            }
            return `**Exam Eligibility Analysis:** 📜\n\n• **Your Parade Attendance:** **${att}%**\n• **Status:** ${att >= 75 ? '✅ **ELIGIBLE** for written & practical exams!' : '⚠️ **INELIGIBLE.** Minimum 75% parade attendance required.'}\n\n**Mandatory Criteria:**\n1. 75% Parade Attendance\n2. Mandatory Attendance in at least 1 Annual Training Camp (ATC)\n3. Recommendation from Unit ANO`;
        }
        if (q.includes('camp') || q.includes('rdc') || q.includes('tsc') || q.includes('atc') || q.includes('कैंप')) {
            if (isHindi) {
                return `**एनसीसी कैंप और प्रशिक्षण गाइड:** ⛺\n\n• **RDC (गणतंत्र दिवस शिविर):** नई दिल्ली में आयोजित, राजपथ परेड और पीएम रैली शामिल है।\n• **TSC (थल सैनिक शिविर):** बाधा दौड़, शूटिंग और मैप रीडिंग पर केंद्रित।\n• **ATC (वार्षिक प्रशिक्षण शिविर):** 10-दिवसीय यूनिट कैंप, परीक्षाओं के लिए अनिवार्य।\n\n*आपके दर्ज कैंप:* ${(cadet.campHistory?.length || 0)} कैंप`;
            }
            return `**NCC Camps & Training Guide:** ⛺\n\n• **RDC (Republic Day Camp):** Held at New Delhi, features Rajpath Parade & PM Rally.\n• **TSC (Thal Sainik Camp):** Focuses on Obstacle Course, Shooting, Map Reading & Field Craft.\n• **ATC (Annual Training Camp):** 10-day unit camp, mandatory for 'B' & 'C' cert exams.\n• **YEP (Youth Exchange Programme):** International representation in friendly nations.\n\n*Your Recorded Camps:* ${(cadet.campHistory?.length || 0)} Camp(s)`;
        }

        if (isHindi) {
            return `**जय हिंद, कैडेट ${cadet.name || auth.userName || ''}!** 🫡\n\nमैं Vanguard AI हूँ — आपका एनसीसी प्रोफाइल गाइड। अपनी **उपस्थिति**, **रैंक पदोन्नति**, या **परीक्षा पात्रता** के बारे में पूछें!`;
        }

        return `**Jai Hind, Cadet ${cadet.name || auth.userName || ''}!** 🫡\n\nI am Vanguard AI — your profile-trained NCC guide. Ask me about your **attendance**, **rank promotions**, **camps**, **'B'/'C' cert exam eligibility**, **weapons**, or **SSB interview tips**!`;
    };

    const handleCopy = (content, index) => {
        navigator.clipboard.writeText(content.replace(/\*\*/g, '')).catch(() => {});
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleClear = () => {
        setConversation([
            { role: 'system', content: fullSystemPrompt },
            { role: 'assistant', content: `**Jai Hind, ${userName?.split(' ')[0] || 'Cadet'}!** 🎖️\n\nConversation cleared. How can I assist you?` }
        ]);
    };

    const personalizedCategory = suggestionLibraryData[0] || { suggestions: [] };

    return (
        <div className="h-[calc(100vh-6rem)] max-h-[850px] flex flex-col bg-gray-50 dark:bg-[#02050A] rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-2xl p-4 sm:p-6 relative overflow-hidden">
            <SuggestionLibrary
                isOpen={isSuggestionLibraryOpen}
                onClose={() => setIsSuggestionLibraryOpen(false)}
                onSelectSuggestion={(text) => handleSend(text)}
                suggestionsData={suggestionLibraryData}
            />

            {/* Top Header Bar */}
            <div className="flex-shrink-0 flex items-center justify-between pb-4 border-b border-[#ddd8cc] dark:border-white/10 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-ncc-navy text-ncc-gold flex items-center justify-center shadow-lg border border-ncc-gold/30">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-display font-black text-ncc-navy dark:text-white uppercase tracking-tight">
                                Vanguard AI Assistant
                            </h1>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-white/60 font-medium">
                            Live Cadet Performance Intelligence & Support
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Language Selector */}
                    <div className="flex items-center gap-1 bg-white dark:bg-white/5 p-1 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                        {[
                            { code: 'en-IN', label: 'EN (English)' },
                            { code: 'hi-IN', label: 'HI (हिन्दी)' }
                        ].map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang.code)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                    selectedLang === lang.code 
                                        ? 'bg-ncc-navy text-ncc-gold shadow-sm' 
                                        : 'text-gray-400 hover:text-ncc-navy dark:hover:text-white'
                                }`}
                            >
                                {lang.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setIsSuggestionLibraryOpen(true)}
                        className="bg-ncc-gold text-ncc-navy px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 active:scale-95"
                    >
                        <BookOpen className="w-4 h-4" />
                        Suggestion Library
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 ncc-scrollbar mb-4">
                {conversation.filter(msg => msg.role !== 'system').map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}
                    >
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-ncc-navy flex-shrink-0 flex items-center justify-center shadow-md border border-ncc-gold/30 mt-1">
                                <Bot className="w-4 h-4 text-ncc-gold" />
                            </div>
                        )}
                        <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm relative ${
                            msg.role === 'user'
                                ? 'bg-ncc-navy text-white rounded-br-none'
                                : 'bg-white dark:bg-[#0a1628] border border-gray-100 dark:border-white/10 text-gray-700 dark:text-gray-200 rounded-bl-none prose prose-sm dark:prose-invert max-w-none'
                        }`}>
                            {msg.role === 'assistant' ? (
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            ) : (
                                <span>{msg.content}</span>
                            )}

                            {msg.role === 'assistant' && (
                                <div className="absolute -bottom-2.5 right-3 flex items-center gap-1 z-10">
                                    {/* Copy Button */}
                                    <button
                                        onClick={() => handleCopy(msg.content, idx)}
                                        className="px-2 py-0.5 bg-white dark:bg-[#112238] hover:bg-ncc-gold hover:text-ncc-navy text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-all text-gray-600 dark:text-white/60 shadow-sm border border-gray-200 dark:border-white/10"
                                    >
                                        {copiedIndex === idx ? 'Copied ✓' : 'Copy'}
                                    </button>
                                </div>
                            )}
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-ncc-gold/20 border border-ncc-gold/30 flex-shrink-0 flex items-center justify-center mt-1">
                                <User className="w-4 h-4 text-ncc-gold" />
                            </div>
                        )}
                    </div>
                ))}

                {isTyping && (
                    <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-ncc-navy flex-shrink-0 flex items-center justify-center shadow-md border border-ncc-gold/30 mt-1">
                            <Bot className="w-4 h-4 text-ncc-gold" />
                        </div>
                        <div className="bg-white dark:bg-[#0a1628] border border-gray-100 dark:border-white/10 rounded-2xl rounded-bl-none p-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-ncc-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-ncc-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-ncc-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Pills */}
            <div className="flex-shrink-0 flex flex-wrap items-center gap-2 mb-3">
                {personalizedCategory.suggestions.slice(0, 4).map((sug, i) => (
                    <button
                        key={i}
                        onClick={() => handleSend(sug)}
                        className="px-3 py-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-ncc-gold hover:text-ncc-gold transition-all rounded-full text-[11px] font-semibold text-gray-600 dark:text-gray-300 shadow-sm"
                    >
                        {sug}
                    </button>
                ))}
            </div>

            {/* Input Bar */}
            <div className="flex-shrink-0 bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 rounded-2xl p-3 shadow-sm flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                    <textarea
                        ref={inputRef}
                        rows={1}
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Ask Vanguard AI a question..."
                        className="flex-1 bg-transparent outline-none resize-none text-sm text-ncc-navy dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 leading-relaxed py-1 max-h-[120px] overflow-y-auto"
                        style={{ height: '36px' }}
                        disabled={isTyping}
                    />

                    {/* Send Button */}
                    <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isTyping}
                        className="w-10 h-10 bg-ncc-gold text-ncc-navy rounded-xl flex items-center justify-center hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 shrink-0"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
