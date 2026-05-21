import React, { useState } from 'react';
import { BookOpen, Shield, Award, Zap, ChevronRight } from '../../components/Icons.jsx';
import { SSBSimulator } from './SSBSimulator.jsx';
import { ExamEngine } from './ExamEngine.jsx';
import { ExamManager } from './ExamManager.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
export const TrainingHub = () => {
    const { userRole } = useAuthContext();
    const [activeSubTab, setActiveSubTab] = useState('menu'); // menu, exams, ssb
    const [examView, setExamView] = useState('dashboard');

    if (activeSubTab === 'exams') {
        return (
            <div className="fade-in">
                <button onClick={() => setActiveSubTab('menu')} className="mb-6 text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest hover:text-ncc-navy dark:text-white">← Back to Hub</button>
                {userRole === 'admin' ? <ExamManager initialView={examView} /> : <ExamEngine />}
            </div>
        );
    }
    if (activeSubTab === 'ssb') return <div className="fade-in"><button onClick={() => setActiveSubTab('menu')} className="mb-6 text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest hover:text-ncc-navy dark:text-white">← Back to Hub</button><SSBSimulator /></div>;

    return (
        <div className="space-y-8 fade-in">
            <header>
                <h2 className="text-3xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-3">
                    <Award className="w-10 h-10 text-ncc-gold" /> Cadet Training Hub
                </h2>
                <p className="text-gray-500 dark:text-white/70 font-medium">Access specialized modules for certificate exams and military selection boards.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Mock Exams Card */}
                <div 
                    onClick={() => setActiveSubTab('exams')}
                    className="bg-white dark:bg-[#050b14] p-10 rounded-[3rem] border border-[#ddd8cc] shadow-sm hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-ncc-red/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-110" />
                    <div className="w-16 h-16 rounded-2xl bg-ncc-red/10 flex items-center justify-center mb-8">
                        <BookOpen className="w-8 h-8 text-ncc-red dark:text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-ncc-navy dark:text-white mb-3">Mock Exam Engine</h3>
                    <p className="text-sm text-gray-400 dark:text-white/80 leading-relaxed mb-8">Practice for B & C certificate theory papers with timed simulations and instant scoring.</p>
                    <div className="flex items-center gap-3 text-white font-black text-[10px] uppercase tracking-[0.2em]">
                        <span>Enter Module</span> <ChevronRight className="w-4 h-4" />
                    </div>
                </div>

                {/* SSB Simulator Card */}
                <div 
                    onClick={() => setActiveSubTab('ssb')}
                    className="bg-white dark:bg-[#050b14] p-10 rounded-[3rem] border border-[#ddd8cc] shadow-sm hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-ncc-navy/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-110" />
                    <div className="w-16 h-16 rounded-2xl bg-ncc-navy/10 flex items-center justify-center mb-8">
                        <Shield className="w-8 h-8 text-ncc-navy dark:text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-ncc-navy dark:text-white mb-3">SSB Interview Simulator</h3>
                    <p className="text-sm text-gray-400 dark:text-white/80 leading-relaxed mb-8">Psychological testing modules including SRT and WAT to prepare for the selection board.</p>
                    <div className="flex items-center gap-3 text-white font-black text-[10px] uppercase tracking-[0.2em]">
                        <span>Enter Module</span> <ChevronRight className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* Quick Stats/Tip */}
            <div className="bg-ncc-navy p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-[#050b14]/10 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-ncc-gold" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-white/50">Pro Tip</p>
                        <p className="text-sm font-medium">Daily practice improves retention for C-Certificate exams by up to 40%.</p>
                    </div>
                </div>
                <button 
                    onClick={() => {
                        setExamView(userRole === 'admin' ? 'attempts' : 'dashboard');
                        setActiveSubTab('exams');
                    }}
                    className="px-6 py-3 bg-white text-ncc-navy dark:bg-white dark:text-ncc-navy rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:bg-ncc-gold hover:text-ncc-navy"
                >
                    View Progress Report
                </button>
            </div>
        </div>
    );
};
