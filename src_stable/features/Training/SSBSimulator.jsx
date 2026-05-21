import React, { useState } from 'react';
import { MessageSquare, Clock, Shield, Star, Award, Zap } from '../../components/Icons.jsx';

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

export const SSBSimulator = () => {
    const [mode, setMode] = useState('menu'); // menu, srt, wat
    const [currentIdx, setCurrentIdx] = useState(0);
    const [response, setResponse] = useState('');
    const [completed, setCompleted] = useState([]);

    const handleNext = () => {
        if (mode === 'srt' && currentIdx < SRT_QUESTIONS.length - 1) {
            setCurrentIdx(prev => prev + 1);
            setResponse('');
        } else if (mode === 'wat' && currentIdx < WAT_WORDS.length - 1) {
            setCurrentIdx(prev => prev + 1);
            setResponse('');
        } else {
            setMode('menu');
            setCurrentIdx(0);
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 fade-in">
            <button onClick={() => setMode('menu')} className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest hover:text-ncc-navy dark:text-white transition-colors">
                ← Back to Simulation Menu
            </button>

            <div className="bg-white dark:bg-[#050b14] p-12 rounded-[3rem] border border-[#ddd8cc] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
                    {mode === 'srt' ? <Shield className="w-32 h-32 text-ncc-navy dark:text-white" /> : <Clock className="w-32 h-32 text-ncc-navy dark:text-white" />}
                </div>
                
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <span className="bg-gray-100 dark:bg-[#0d2137] px-4 py-1 rounded-full text-[10px] font-black text-gray-500 dark:text-white/70 uppercase tracking-[0.2em]">
                        Question {currentIdx + 1} of {mode === 'srt' ? SRT_QUESTIONS.length : WAT_WORDS.length}
                    </span>
                    <div className="flex items-center gap-2 text-ncc-navy dark:text-white">
                        <Clock className="w-4 h-4 animate-pulse text-ncc-red" />
                        <span className="text-xs font-mono font-bold">Timer Active</span>
                    </div>
                </div>

                <h3 className="text-2xl md:text-3xl font-display font-bold leading-tight mb-12 text-ncc-navy dark:text-white relative z-10">
                    {mode === 'srt' ? SRT_QUESTIONS[currentIdx].scenario : `WORD: ${WAT_WORDS[currentIdx]}`}
                </h3>

                <textarea 
                    className="w-full bg-gray-50 dark:bg-[#0a1628] border border-gray-100 dark:border-white/5 rounded-2xl p-6 text-ncc-navy dark:text-white text-lg focus:outline-none focus:ring-2 focus:ring-ncc-navy/10 h-40 placeholder:text-gray-300 relative z-10"
                    placeholder="Type your spontaneous response here..."
                    value={response}
                    onChange={e => setResponse(e.target.value)}
                />

                <div className="mt-12 flex justify-end relative z-10">
                    <button 
                        onClick={handleNext}
                        className="px-10 py-4 bg-ncc-navy text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-ncc-navy/20"
                    >
                        Next Challenge
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-ncc-gold/10 flex items-center justify-center">
                    <Star className="w-5 h-5 text-ncc-gold" />
                </div>
                <p className="text-xs text-gray-500 dark:text-white/70 italic">
                    Tip: Be spontaneous and positive. Don't overthink; the first reaction usually reveals your true character traits.
                </p>
            </div>
        </div>
    );
};
