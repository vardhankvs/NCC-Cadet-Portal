import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock, Shield, Star, Zap, User, FileText, Brain, ImageIcon, CheckCircle, XCircle } from '../../components/Icons.jsx';

const SRT_QUESTIONS = [
    { id: 1, scenario: "While on a night patrol during a camp, you see a group of suspicious people moving near the ammunition store. What will you do?", category: "SRT" },
    { id: 2, scenario: "You are the leader of a trekking group. One of your members twists their ankle in a remote area with no mobile signal. What is your plan?", category: "SRT" },
    { id: 3, scenario: "A senior officer gives you a task that you believe is technically incorrect and might lead to failure. How do you respond?", category: "SRT" },
    { id: 4, scenario: "While going for your final SSB interview, your bus meets with an accident and you are still 5km away from the center with only 20 minutes left.", category: "SRT" },
    { id: 5, scenario: "You are home on leave and a massive fire breaks out in the neighboring house. People are trapped inside.", category: "SRT" },
    { id: 6, scenario: "Your father is insistently against you joining the Armed Forces and wants you to handle the family business. You have just cleared the written exam.", category: "SRT" },
    { id: 7, scenario: "While returning from a movie late at night, you see three men harassing a girl in a lonely street. You are alone.", category: "SRT" },
    { id: 8, scenario: "You are the captain of your college football team. In the final match, your star player gets injured and the team's morale is down.", category: "SRT" },
    { id: 9, scenario: "You find that your best friend is involved in some illegal activities which can ruin his career. How will you handle this?", category: "SRT" },
    { id: 10, scenario: "During a mountain expedition, the weather suddenly turns bad and your team members are panicking. You are the second-in-command.", category: "SRT" }
];

const WAT_WORDS = [
    "INTEGRITY", "COMMAND", "SACRIFICE", "DISCIPLINE", "COUNTRY", 
    "FAILURE", "COOPERATION", "RESPONSIBILITY", "COURAGE", "LOYALTY", 
    "PROGRESS", "MOTIVATION", "SYSTEM", "JUSTICE", "ATTACK", 
    "SOCIETY", "CHALLENGE", "FRIEND", "WEAPON", "DEFEAT"
];

const PI_QUESTIONS = [
    "Tell me about yourself, your educational background, your family structure, and your hobbies.",
    "Why do you specifically want to join the Armed Forces instead of pursuing other careers?",
    "What do you consider your greatest strengths and weaknesses? What are you doing to improve your weaknesses?",
    "How do you organize your daily routine? Tell me how you spend your weekends.",
    "Who is your role model and what qualities of theirs inspire you?",
    "Describe a time you faced a significant failure or a highly stressful situation. How did you overcome it?",
    "What are your alternate plans if you do not get recommended in this SSB attempt?",
    "Tell me about your friends. What qualities do you like in them, and what do you dislike?",
    "Describe your relationship with your parents and siblings. Whom do you confide in the most?",
    "Tell me about any position of responsibility you have held in school/college/NCC and what you learned from it."
];

const SDT_QUESTIONS = [
    "What is your parents' opinion about you?",
    "What do your teachers/employers think about you?",
    "What do your friends think about you?",
    "What is your own opinion about yourself?",
    "What are the qualities you would like to develop in yourself?"
];

const OIR_QUESTIONS = [
    { id: 1, question: "If DANCE is coded as GXQZH, then how will RIGHT be coded?", options: ["UKJEW", "VKJDW", "UKJDW", "UJKDW"], answer: 2 },
    { id: 2, question: "Find the odd one out: 2, 5, 10, 17, 26, 37, 50, 64", options: ["17", "26", "37", "64"], answer: 3 },
    { id: 3, question: "A man is facing West. He turns 45 degrees in the clockwise direction and then another 180 degrees in the same direction and then 270 degrees in the anticlockwise direction. Which direction is he facing now?", options: ["South-West", "North-West", "West", "South"], answer: 0 },
    { id: 4, question: "If A is the brother of B; B is the sister of C; and C is the father of D, how is D related to A?", options: ["Brother", "Sister", "Nephew/Niece", "Cannot be determined"], answer: 3 },
    { id: 5, question: "Insert the missing number: 1, 4, 9, 16, 25, 36, ?", options: ["48", "49", "52", "56"], answer: 1 }
];

const PPDT_IMAGES = [
    "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=800&q=80"
];

export const SSBSimulator = () => {
    const [mode, setMode] = useState('menu'); // menu, srt, wat, pi, sdt, oir, ppdt
    const [currentIdx, setCurrentIdx] = useState(0);
    const [response, setResponse] = useState('');
    
    // OIR State
    const [oirScore, setOirScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);

    // PPDT State
    const [ppdtPhase, setPpdtPhase] = useState('image'); // 'image' or 'writing'
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (mode === 'ppdt') {
            if (timeLeft > 0) {
                const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
                return () => clearTimeout(timerId);
            } else if (timeLeft === 0) {
                if (ppdtPhase === 'image') {
                    setPpdtPhase('writing');
                    setTimeLeft(240); // 4 minutes
                }
            }
        }
    }, [timeLeft, mode, ppdtPhase]);

    const startPPDT = () => {
        setMode('ppdt');
        setCurrentIdx(0);
        setPpdtPhase('image');
        setTimeLeft(30); // 30 seconds for image perception
        setResponse('');
    };

    const handleNext = () => {
        let maxIdx = 0;
        if (mode === 'srt') maxIdx = SRT_QUESTIONS.length;
        if (mode === 'wat') maxIdx = WAT_WORDS.length;
        if (mode === 'pi') maxIdx = PI_QUESTIONS.length;
        if (mode === 'sdt') maxIdx = SDT_QUESTIONS.length;
        if (mode === 'oir') maxIdx = OIR_QUESTIONS.length;
        if (mode === 'ppdt') maxIdx = PPDT_IMAGES.length;

        if (mode === 'oir' && selectedOption === OIR_QUESTIONS[currentIdx].answer) {
            setOirScore(prev => prev + 1);
        }

        if (currentIdx < maxIdx - 1) {
            setCurrentIdx(prev => prev + 1);
            setResponse('');
            setSelectedOption(null);
            if (mode === 'ppdt') {
                setPpdtPhase('image');
                setTimeLeft(30);
            }
        } else {
            if (mode === 'oir') {
                alert(`OIR Completed! Score: ${mode === 'oir' && selectedOption === OIR_QUESTIONS[currentIdx].answer ? oirScore + 1 : oirScore} / ${OIR_QUESTIONS.length}`);
            }
            setMode('menu');
            setCurrentIdx(0);
            setOirScore(0);
            setSelectedOption(null);
        }
    };

    if (mode === 'menu') {
        return (
            <div className="space-y-8 fade-in">
                <header>
                    <h2 className="text-3xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-3">
                        <Shield className="w-10 h-10 text-ncc-navy dark:text-white" /> SSB Interview Simulator
                    </h2>
                    <p className="text-gray-500 dark:text-white/70 font-medium">Prepare for the Services Selection Board with psychological testing modules.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    
                    {/* Screening: OIR */}
                    <div 
                        onClick={() => { setMode('oir'); setCurrentIdx(0); setOirScore(0); setSelectedOption(null); }}
                        className="bg-white dark:bg-[#050b14] p-8 rounded-[2.5rem] border border-[#ddd8cc] shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Brain className="w-8 h-8 text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-bold text-ncc-navy dark:text-white mb-2">Officer Intelligence Rating (OIR)</h3>
                        <p className="text-sm text-gray-400 dark:text-white/80 leading-relaxed">Verbal and non-verbal reasoning tests for Day 1 Screening.</p>
                        <div className="mt-8 flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest">
                            Start Module <Zap className="w-3 h-3" />
                        </div>
                    </div>

                    {/* Screening: PPDT */}
                    <div 
                        onClick={startPPDT}
                        className="bg-white dark:bg-[#050b14] p-8 rounded-[2.5rem] border border-[#ddd8cc] shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <ImageIcon className="w-8 h-8 text-teal-600" />
                        </div>
                        <h3 className="text-xl font-bold text-ncc-navy dark:text-white mb-2">Picture Perception (PPDT)</h3>
                        <p className="text-sm text-gray-400 dark:text-white/80 leading-relaxed">Observe a blurry image for 30s and write a story in 4 minutes.</p>
                        <div className="mt-8 flex items-center gap-2 text-teal-600 font-black text-[10px] uppercase tracking-widest">
                            Start Module <Zap className="w-3 h-3" />
                        </div>
                    </div>

                    {/* SRT */}
                    <div 
                        onClick={() => setMode('srt')}
                        className="bg-white dark:bg-[#050b14] p-8 rounded-[2.5rem] border border-[#ddd8cc] shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <MessageSquare className="w-8 h-8 text-orange-600" />
                        </div>
                        <h3 className="text-xl font-bold text-ncc-navy dark:text-white mb-2">Situation Reaction Test (SRT)</h3>
                        <p className="text-sm text-gray-400 dark:text-white/80 leading-relaxed">Test your spontaneous common sense and decision-making under pressure.</p>
                        <div className="mt-8 flex items-center gap-2 text-orange-600 font-black text-[10px] uppercase tracking-widest">
                            Start Module <Zap className="w-3 h-3" />
                        </div>
                    </div>

                    {/* WAT */}
                    <div 
                        onClick={() => setMode('wat')}
                        className="bg-white dark:bg-[#050b14] p-8 rounded-[2.5rem] border border-[#ddd8cc] shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Clock className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-ncc-navy dark:text-white mb-2">Word Association Test (WAT)</h3>
                        <p className="text-sm text-gray-400 dark:text-white/80 leading-relaxed">Formulate positive and meaningful sentences in 15 seconds per word.</p>
                        <div className="mt-8 flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest">
                            Start Module <Zap className="w-3 h-3" />
                        </div>
                    </div>

                    {/* PI */}
                    <div 
                        onClick={() => setMode('pi')}
                        className="bg-white dark:bg-[#050b14] p-8 rounded-[2.5rem] border border-[#ddd8cc] shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <User className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-bold text-ncc-navy dark:text-white mb-2">Personal Interview (PI)</h3>
                        <p className="text-sm text-gray-400 dark:text-white/80 leading-relaxed">Practice comprehensive real-life interview questions asked by the IO.</p>
                        <div className="mt-8 flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest">
                            Start Module <Zap className="w-3 h-3" />
                        </div>
                    </div>

                    {/* SDT */}
                    <div 
                        onClick={() => setMode('sdt')}
                        className="bg-white dark:bg-[#050b14] p-8 rounded-[2.5rem] border border-[#ddd8cc] shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <FileText className="w-8 h-8 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-bold text-ncc-navy dark:text-white mb-2">Self Description Test (SDT)</h3>
                        <p className="text-sm text-gray-400 dark:text-white/80 leading-relaxed">Write down opinions about yourself from the perspective of parents, teachers, and friends.</p>
                        <div className="mt-8 flex items-center gap-2 text-purple-600 font-black text-[10px] uppercase tracking-widest">
                            Start Module <Zap className="w-3 h-3" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const getModuleConfig = () => {
        switch(mode) {
            case 'srt': return { title: SRT_QUESTIONS[currentIdx].scenario, length: SRT_QUESTIONS.length, icon: <MessageSquare className="w-32 h-32 text-ncc-navy dark:text-white" /> };
            case 'wat': return { title: `WORD: ${WAT_WORDS[currentIdx]}`, length: WAT_WORDS.length, icon: <Clock className="w-32 h-32 text-ncc-navy dark:text-white" /> };
            case 'pi': return { title: PI_QUESTIONS[currentIdx], length: PI_QUESTIONS.length, icon: <User className="w-32 h-32 text-ncc-navy dark:text-white" /> };
            case 'sdt': return { title: SDT_QUESTIONS[currentIdx], length: SDT_QUESTIONS.length, icon: <FileText className="w-32 h-32 text-ncc-navy dark:text-white" /> };
            case 'oir': return { title: OIR_QUESTIONS[currentIdx].question, length: OIR_QUESTIONS.length, icon: <Brain className="w-32 h-32 text-ncc-navy dark:text-white" /> };
            case 'ppdt': return { title: ppdtPhase === 'image' ? "Observe the Image Carefully" : "Write your story", length: PPDT_IMAGES.length, icon: <ImageIcon className="w-32 h-32 text-ncc-navy dark:text-white" /> };
            default: return { title: '', length: 0, icon: null };
        }
    };

    const config = getModuleConfig();

    return (
        <div className="max-w-3xl mx-auto space-y-8 fade-in">
            <button onClick={() => { setMode('menu'); setCurrentIdx(0); setResponse(''); }} className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest hover:text-ncc-navy dark:text-white transition-colors">
                ← Back to Simulation Menu
            </button>

            <div className="bg-white dark:bg-[#050b14] p-12 rounded-[3rem] border border-[#ddd8cc] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
                    {config.icon}
                </div>
                
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <span className="bg-gray-100 dark:bg-[#0d2137] px-4 py-1 rounded-full text-[10px] font-black text-gray-500 dark:text-white/70 uppercase tracking-[0.2em]">
                        Question {currentIdx + 1} of {config.length}
                    </span>
                    {(mode === 'ppdt') ? (
                        <div className="flex items-center gap-2 text-ncc-navy dark:text-white">
                            <Clock className="w-4 h-4 animate-pulse text-ncc-red" />
                            <span className="text-xs font-mono font-bold text-ncc-red">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')} remaining</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-ncc-navy dark:text-white">
                            <Clock className="w-4 h-4 animate-pulse text-ncc-red" />
                            <span className="text-xs font-mono font-bold">Timer Active</span>
                        </div>
                    )}
                </div>

                <h3 className="text-2xl md:text-3xl font-display font-bold leading-tight mb-12 text-ncc-navy dark:text-white relative z-10">
                    {config.title}
                </h3>

                {mode === 'oir' ? (
                    <div className="space-y-3 relative z-10">
                        {OIR_QUESTIONS[currentIdx].options.map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedOption(i)}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedOption === i ? 'border-ncc-navy bg-ncc-navy/5 dark:bg-white/10 dark:border-white' : 'border-[#ddd8cc] hover:border-ncc-gold dark:border-white/10 dark:hover:border-ncc-gold'}`}
                            >
                                <span className="font-bold mr-3">{String.fromCharCode(65 + i)}.</span> {opt}
                            </button>
                        ))}
                    </div>
                ) : mode === 'ppdt' ? (
                    <div className="relative z-10">
                        {ppdtPhase === 'image' ? (
                            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-gray-200 border-4 border-[#ddd8cc] blur-[2px]">
                                <img src={PPDT_IMAGES[currentIdx]} alt="PPDT" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <textarea 
                                className="w-full bg-gray-50 dark:bg-[#0a1628] border border-gray-100 dark:border-white/5 rounded-2xl p-6 text-ncc-navy dark:text-white text-lg focus:outline-none focus:ring-2 focus:ring-ncc-navy/10 h-64 placeholder:text-gray-300"
                                placeholder="Start writing your PPDT story here... Include what led to the situation, what is currently happening, and what the final outcome will be."
                                value={response}
                                onChange={e => setResponse(e.target.value)}
                            />
                        )}
                    </div>
                ) : (
                    <textarea 
                        className="w-full bg-gray-50 dark:bg-[#0a1628] border border-gray-100 dark:border-white/5 rounded-2xl p-6 text-ncc-navy dark:text-white text-lg focus:outline-none focus:ring-2 focus:ring-ncc-navy/10 h-40 placeholder:text-gray-300 relative z-10"
                        placeholder="Type your spontaneous response here..."
                        value={response}
                        onChange={e => setResponse(e.target.value)}
                    />
                )}

                <div className="mt-12 flex justify-end relative z-10">
                    <button 
                        onClick={handleNext}
                        disabled={mode === 'oir' && selectedOption === null}
                        className="px-10 py-4 bg-ncc-navy text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-ncc-navy/20 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        Next Challenge
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-ncc-gold/10 flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5 text-ncc-gold" />
                </div>
                <p className="text-xs text-gray-500 dark:text-white/70 italic">
                    Tip: Be spontaneous and positive. Don't overthink; the first reaction usually reveals your true character traits. For the Personal Interview, be completely honest and concise.
                </p>
            </div>
        </div>
    );
};
