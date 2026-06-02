import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Clock, CheckCircle, AlertCircle, Award, Trophy, Zap, List, Shield, Camera } from '../../components/Icons.jsx';
import { getExams, getQuizQuestions, submitExamAttempt, getExamAttempts } from '../../firebase/firestoreService.js';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { toast } from 'react-toastify';

export const ExamEngine = () => {
    const { user, userRole, userEnrollmentId, userName, userInstitutionId } = useAuthContext();
    const [status, setStatus] = useState('dashboard'); // dashboard, ready, active, finished
    
    // Multi-topic states
    const [exams, setExams] = useState([]);
    
    // Active exam state
    const [config, setConfig] = useState(null);
    const [allQuestions, setAllQuestions] = useState([]);
    const [examQuestions, setExamQuestions] = useState([]);
    
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [pastAttempts, setPastAttempts] = useState([]); // Array of all past attempts

    useEffect(() => {
        const loadData = async () => {
            try {
                const fetchedExams = await getExams();
                setExams(fetchedExams);

                const uid = userEnrollmentId || user?.uid;
                if (!uid) return;

                // Load all attempts for the dashboard
                const allUserAttemptsRef = getExamAttempts('All', 'All').then(all => 
                    all.filter(a => a.cadetId === uid)
                );
                const userAttempts = await allUserAttemptsRef;
                setPastAttempts(userAttempts);

                setLoading(false);
            } catch (err) {
                console.error("Exam Load Error:", err);
            }
        };
        loadData();
    }, [user, userEnrollmentId]);

    // Anti-Cheating
    useEffect(() => {
        if (status === 'active') {
            const preventCopy = (e) => e.preventDefault();
            document.addEventListener('copy', preventCopy);
            document.addEventListener('paste', preventCopy);
            document.addEventListener('contextmenu', preventCopy);
            return () => {
                document.removeEventListener('copy', preventCopy);
                document.removeEventListener('paste', preventCopy);
                document.removeEventListener('contextmenu', preventCopy);
            };
        }
    }, [status]);

    useEffect(() => {
        let timer;
        if (status === 'active' && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (status === 'active' && timeLeft === 0) {
            handleFinalSubmit();
        }
        return () => clearInterval(timer);
    }, [status, timeLeft]);

    const handleSelectExam = async (exam) => {
        setLoading(true);
        try {
            const questions = await getQuizQuestions(exam.id);
            setConfig(exam);
            setAllQuestions(questions);
            setStatus('ready');
        } catch(err) {
            toast.error("Failed to load questions for this topic");
        }
        setLoading(false);
    };

    const handleStart = () => {
        if (allQuestions.length === 0) {
            toast.warning("No questions available in the test bank for this topic.");
            return;
        }

        const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, config.questionLimit || 10);
        
        setExamQuestions(selected);
        setTimeLeft((config.timer || 15) * 60);
        setStatus('active');
        setCurrentIdx(0);
        setAnswers({});
    };

    const handleSelect = (optIdx) => {
        setAnswers({ ...answers, [currentIdx]: optIdx });
    };

    const handleFinalSubmit = useCallback(async (requireConfirmation = false) => {
        if (status === 'finished') return;
        
        if (requireConfirmation === true) {
            if (!window.confirm("FINAL SUBMISSION\n\nAre you sure you want to lock in your answers? You cannot return to this exam.")) {
                return;
            }
        }
        
        let score = 0;
        let attempted = 0;

        examQuestions.forEach((q, idx) => {
            const userAns = answers[idx];
            if (userAns !== undefined) {
                attempted++;
                if (userAns === q.correct) {
                    score += (q.marks || 1);
                } else if (config?.negativeMarking) {
                    score -= (q.negativeMarks || 0.25);
                }
            }
        });

        const attemptData = {
            cadetId: userEnrollmentId || user.uid,
            cadetName: userName || user.displayName || (userEnrollmentId ? `Cadet ${userEnrollmentId}` : 'Unknown Cadet'),
            score,
            totalPossible: examQuestions.reduce((acc, q) => acc + (q.marks || 1), 0),
            attempted,
            totalQuestions: examQuestions.length,
            certificate: user.certificate || 'N/A',
            division: userEnrollmentId?.includes('SW') ? 'SW' : 'SD',
            institutionId: userInstitutionId || '14a-bn-srikakulam',
            examTitle: config?.examTitle || 'General Knowledge',
            examId: config?.id || 'default',
            answers: answers,
            examQuestions: examQuestions,
            timestamp: new Date() // Fallback timestamp
        };

        try {
            await submitExamAttempt(attemptData);
            setStatus('finished');
            toast.success("Examination results recorded successfully.");
            
            // Add new attempt to dashboard list
            setPastAttempts(prev => [...prev, {id: 'new', ...attemptData}]);
        } catch (err) {
            console.error("Submit Error:", err);
            toast.error("Failed to record results. Contact Admin.");
            setStatus('finished'); // Still finish but with error
        }
    }, [status, answers, examQuestions, config, user, userEnrollmentId, userName]);

    if (loading) return <div className="p-20 text-center animate-pulse text-ncc-navy dark:text-white uppercase tracking-widest font-black">Establishing Command Link...</div>;

    if (status === 'dashboard') {
        return (
            <div className="space-y-8 fade-in">
                <header>
                    <h2 className="text-3xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-3">
                        <Shield className="w-10 h-10 text-ncc-navy dark:text-white" /> Mock Exam Hub
                    </h2>
                    <p className="text-gray-500 dark:text-white/70 font-medium">Access your official examination deployments and historical performance records.</p>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">
                    {/* Render Available Exams */}
                    {exams.map(exam => {
                        // Check if cadet has taken this exam
                        const hasTaken = pastAttempts.some(a => a.examTitle === exam.examTitle);
                        if (hasTaken) return null; // Hide if already taken, or you can allow retakes. Wait, usually we don't hide, or maybe we do? Let's hide active card if taken.

                        return (
                            <div 
                                key={exam.id}
                                onClick={() => handleSelectExam(exam)}
                                className="bg-white dark:bg-[#0d2137] p-6 rounded-2xl shadow-sm border border-blue-100 dark:border-white/10 cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-blue-300 dark:hover:border-white/30 transition-all group relative overflow-hidden flex flex-col h-full min-h-[12rem]"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-white/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                                <div className="w-10 h-10 bg-blue-50 dark:bg-[#0a1628] rounded-xl flex items-center justify-center mb-4 shadow-sm border border-blue-100/50 dark:border-white/10 relative z-10 shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-[#112a46] transition-colors">
                                    <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="text-base font-bold text-ncc-navy dark:text-white mb-4 leading-tight relative z-10 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">{exam.examTitle}</h3>
                                <div className="mt-auto flex items-center justify-between border-t border-blue-100 dark:border-white/10 pt-3 relative z-10">
                                    <span className="text-[9px] font-black bg-blue-50 dark:bg-white/10 text-blue-700 dark:text-white/80 px-2 py-0.5 rounded uppercase tracking-widest shrink-0">Active</span>
                                    <div className="flex items-center text-[9px] font-black text-blue-700 dark:text-white/80 uppercase tracking-widest group-hover:text-blue-900 dark:group-hover:text-white transition-colors">
                                        Commence <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Render Past Attempts */}
                    {pastAttempts.map((attempt, idx) => (
                            <div 
                                key={idx}
                                onClick={() => {
                                    setConfig({ 
                                        examTitle: attempt.examTitle,
                                        negativeMarking: false // past attempt view doesn't rely on config settings much
                                    });
                                    setExamQuestions(attempt.examQuestions || []);
                                    setAnswers(attempt.answers || {});
                                    setStatus('finished');
                                }}
                                className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm cursor-pointer hover:shadow-md hover:border-ncc-navy/30 dark:hover:border-white/30 hover:-translate-y-1 transition-all group flex flex-col h-full min-h-[12rem]"
                            >
                                <div className="flex justify-between items-start mb-4 shrink-0">
                                    <div className="w-10 h-10 bg-gray-50 dark:bg-[#1f2937] rounded-xl flex items-center justify-center border border-gray-100 dark:border-white/10 shadow-sm group-hover:bg-ncc-navy/5 dark:group-hover:bg-[#374151] transition-colors">
                                        <Award className="w-5 h-5 text-gray-400 dark:text-gray-400 group-hover:text-ncc-navy dark:group-hover:text-white transition-colors" />
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${attempt.score >= (attempt.totalPossible * 0.5) ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/50'}`}>
                                        {attempt.score >= (attempt.totalPossible * 0.5) ? 'Passed' : 'Failed'}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4 leading-tight group-hover:text-ncc-navy dark:group-hover:text-white transition-colors">{attempt.examTitle || 'General Knowledge'}</h3>
                                
                                <div className="mt-auto pt-3 border-t border-gray-100 dark:border-white/10 flex flex-col gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400">{attempt.score} <span className="text-[8px]">/ {attempt.totalPossible} Points</span></span>
                                    <div className="flex items-center justify-between text-[9px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest group-hover:text-ncc-navy dark:group-hover:text-white transition-colors">
                                        Review <span className="text-lg leading-none group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                </div>
                            </div>
                    ))}

                    {exams.length === 0 && pastAttempts.length === 0 && (
                         <div className="col-span-full p-8 text-center bg-gray-50 dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-white/10 border-dashed">
                             <p className="text-gray-400 dark:text-white/80 font-bold uppercase tracking-widest text-[10px] mb-1">No Active Deployments</p>
                             <p className="text-[10px] text-gray-400 dark:text-white/80">Await further instructions from command.</p>
                         </div>
                    )}
                </div>
            </div>
        );
    }

    if (status === 'ready') {
        return (
            <div className="space-y-8 fade-in">
                <header>
                    <h2 className="text-3xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-3">
                        <Shield className="w-10 h-10 text-ncc-navy dark:text-white" /> {config?.examTitle || 'Command Examination Engine'}
                    </h2>
                    <p className="text-gray-500 dark:text-white/70 font-medium">Standardized CBT platform for NCC B and C Certificate Theory Papers.</p>
                </header>

                <div className="bg-white dark:bg-[#050b14] p-8 max-w-2xl mx-auto rounded-3xl border border-[#ddd8cc] shadow-sm text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <FileText className="w-24 h-24" />
                    </div>
                    <div className="w-14 h-14 bg-ncc-navy/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Award className="w-6 h-6 text-ncc-navy dark:text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-ncc-navy dark:text-white mb-4">Official Mock Test Session</h3>
                    <div className="flex flex-wrap justify-center gap-4 mb-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/80">
                        <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#0a1628] px-3 py-1.5 rounded-full"><Clock className="w-3 h-3 text-ncc-navy dark:text-white" /> {config?.timer} Mins</span>
                        <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#0a1628] px-3 py-1.5 rounded-full"><List className="w-3 h-3 text-ncc-navy dark:text-white" /> {config?.questionLimit} Qs</span>
                        <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#0a1628] px-3 py-1.5 rounded-full"><Zap className="w-3 h-3 text-ncc-gold" /> {config?.negativeMarking ? 'Neg. Marking Active' : 'No Neg. Marks'}</span>
                    </div>
                    
                    <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 mb-8 text-left">
                        <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2">Examination Rules:</p>
                        <ul className="text-xs text-amber-900 space-y-1.5 list-disc pl-4 font-medium">
                            <li>Switching tabs or minimizing the window will be logged.</li>
                            <li>Copy-paste and right-click features are disabled.</li>
                            <li>Attempt finality: Once submitted, results are permanent.</li>
                            <li>Ensure a stable power and data connection.</li>
                        </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button 
                            onClick={() => setStatus('dashboard')}
                            className="px-6 py-3 bg-gray-100 dark:bg-[#0d2137] text-gray-500 dark:text-white/70 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                        >
                            Back to Hub
                        </button>
                        <button 
                            onClick={handleStart}
                            className="px-8 py-3 bg-ncc-navy text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl shadow-ncc-navy/20 active:scale-95"
                        >
                            Commence Attempt
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'finished') {
        const totalPossible = examQuestions.reduce((acc, q) => acc + (q.marks || 1), 0);
        const score = Object.keys(answers).reduce((acc, idx) => {
            const q = examQuestions[idx];
            if (answers[idx] === q.correct) return acc + (q.marks || 1);
            if (config?.negativeMarking) return acc - (q.negativeMarks || 0.25);
            return acc;
        }, 0);
        
        const percent = totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 0;
        const isPass = percent >= 50;

        return (
            <div className="max-w-2xl mx-auto space-y-8 fade-in">
                <div className="bg-white dark:bg-[#050b14] p-12 rounded-[3rem] border border-[#ddd8cc] shadow-2xl text-center relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-3 ${isPass ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    <h3 className="text-3xl font-display font-black text-ncc-navy dark:text-white mb-2">Attempt Recorded</h3>
                    <p className="text-gray-400 dark:text-white/80 font-bold uppercase tracking-widest text-xs mb-10">Unit Performance Scorecard</p>
                    
                    <div className="flex justify-center items-center gap-12 mb-10">
                        <div className="text-center">
                            <p className={`text-6xl font-black ${score < 0 ? 'text-red-600' : 'text-ncc-navy dark:text-white'}`}>{score} <span className="text-2xl text-gray-300">/ {totalPossible}</span></p>
                            <p className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mt-2">Final Score</p>
                        </div>
                        <div className="w-px h-16 bg-gray-100 dark:bg-[#0d2137]"></div>
                        <div className="text-center">
                            <div className={`inline-block px-4 py-2 rounded-xl text-lg font-black uppercase tracking-widest ${isPass ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                                {isPass ? 'PASSED' : 'FAILED'}
                            </div>
                            <p className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mt-2">Status ({percent}%)</p>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-[#0a1628] rounded-2xl border border-gray-100 dark:border-white/5 mb-6">
                        <p className="text-xs font-black text-gray-500 dark:text-white/70 uppercase tracking-widest">This is a historical record. You cannot retake this exam.</p>
                    </div>

                    <button 
                        onClick={() => setStatus('dashboard')}
                        className="w-full py-4 bg-gray-100 dark:bg-[#0d2137] text-gray-500 dark:text-white/70 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                    >
                        Return to Hub Dashboard
                    </button>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-[0.3em] pl-2">Detailed Feedback</h4>
                    {examQuestions.map((q, idx) => (
                        <div key={idx} className="bg-white dark:bg-[#050b14] p-6 rounded-3xl border border-[#ddd8cc] shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-start gap-4">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${answers[idx] === q.correct ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    {answers[idx] === q.correct ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-ncc-navy dark:text-white mb-3">{q.question}</p>
                                    
                                    {answers[idx] !== q.correct && (
                                        <div className="mb-4 bg-red-50 p-4 rounded-xl border border-red-100">
                                            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Your Answer:</p>
                                            <p className="text-xs font-bold text-red-800 mb-3">{answers[idx] !== undefined && q.options ? q.options[answers[idx]] : 'Skipped'}</p>
                                            <div className="pt-3 border-t border-red-200/50">
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Correct Answer:</p>
                                                <p className="text-xs font-bold text-emerald-800">{q.options ? q.options[q.correct] : 'Not Set'}</p>
                                            </div>
                                        </div>
                                    )}

                                    {q.imageUrl && (
                                        <img src={q.imageUrl} alt="Ref" className="w-full max-h-48 object-cover rounded-xl mb-4 border border-gray-100 dark:border-white/5 shadow-sm" />
                                    )}
                                    <div className="bg-gray-50 dark:bg-[#0a1628] p-4 rounded-xl border border-gray-100 dark:border-white/5">
                                        <p className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest block mb-2">Rational Explanation:</p>
                                        <p className="text-xs text-gray-500 dark:text-white/70 leading-relaxed italic">{q.explanation}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const q = examQuestions[currentIdx];

    return (
        <div className="max-w-3xl mx-auto space-y-4 fade-in select-none">
            <div className="flex justify-between items-center bg-ncc-navy p-4 rounded-2xl shadow-md">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white dark:bg-[#050b14]/10 text-ncc-gold rounded-xl flex items-center justify-center text-lg font-black border border-white/10">
                        {currentIdx + 1}
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-0.5">Assessment Progress</p>
                        <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-white dark:bg-[#050b14]/10 rounded-full overflow-hidden">
                                <div className="h-full bg-ncc-gold" style={{ width: `${((currentIdx + 1) / examQuestions.length) * 100}%` }} />
                            </div>
                            <span className="text-xs font-bold text-white/80">{currentIdx + 1}/{examQuestions.length}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Time to Auto-Submit</p>
                    <div className={`flex items-center gap-2 font-mono text-2xl font-black ${timeLeft < 60 ? 'text-ncc-red animate-pulse' : 'text-ncc-gold'}`}>
                        <Clock className="w-5 h-5" />
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#050b14] p-6 md:p-8 rounded-2xl border border-[#ddd8cc] shadow-xl relative overflow-hidden min-h-[250px] flex flex-col">
                <div className="mb-4 flex-1">
                    <h3 className="text-lg md:text-xl font-display font-bold text-ncc-navy dark:text-white mb-4 leading-snug">
                        {q.question}
                    </h3>
                    
                    {q.imageUrl && (
                        <div className="mb-4 rounded-xl overflow-hidden border border-gray-100 dark:border-white/5 shadow-sm bg-gray-50 dark:bg-[#0a1628] group">
                            <img 
                                src={q.imageUrl} 
                                alt="Visual Reference" 
                                className="w-full max-h-[200px] object-contain transition-transform duration-500 group-hover:scale-105" 
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options.map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => handleSelect(i)}
                                className={`p-3 rounded-lg border text-left transition-all flex justify-between items-center group relative overflow-hidden ${
                                    answers[currentIdx] === i 
                                        ? 'border-ncc-navy bg-ncc-navy/5 shadow-sm' 
                                        : 'border-gray-200 dark:border-white/10 hover:border-ncc-navy/30 hover:bg-gray-50 dark:bg-[#0a1628]'
                                }`}
                            >
                                <span className={`text-sm font-bold z-10 ${answers[currentIdx] === i ? 'text-ncc-navy dark:text-white' : 'text-gray-600 dark:text-white/80'}`}>{opt}</span>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all z-10 ${
                                    answers[currentIdx] === i ? 'border-ncc-navy bg-ncc-navy' : 'border-gray-200 dark:border-white/10 group-hover:border-ncc-navy/30'
                                }`}>
                                    {answers[currentIdx] === i && <CheckCircle className="w-3 h-3 text-white" />}
                                </div>
                                {answers[currentIdx] === i && <div className="absolute inset-0 bg-ncc-navy/5 animate-pulse" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-white/5 mt-auto mb-4">
                    <button 
                        disabled={currentIdx === 0}
                        onClick={() => setCurrentIdx(prev => prev - 1)}
                        className="px-5 py-2.5 bg-gray-100 dark:bg-[#0d2137] text-gray-500 dark:text-white/70 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 disabled:opacity-30 transition-all"
                    >
                        Previous Station
                    </button>
                    
                    <button 
                        disabled={currentIdx === examQuestions.length - 1}
                        onClick={() => setCurrentIdx(prev => prev + 1)}
                        className="px-6 py-2.5 bg-ncc-gold text-ncc-navy dark:text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-sm disabled:opacity-30 disabled:hover:scale-100"
                    >
                        Next Station
                    </button>
                </div>

                {/* Question Navigator Grid & Final Submit INSIDE the Box Model */}
                <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex flex-col gap-3 bg-gray-50 dark:bg-[#0a1628] -mx-6 md:-mx-8 -mb-6 md:-mb-8 p-6 md:p-8 rounded-b-2xl">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest">Question Navigator</span>
                        <button 
                            onClick={() => handleFinalSubmit(true)}
                            className="px-6 py-2.5 bg-ncc-navy text-white rounded-lg font-black text-[9px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-md flex items-center gap-2"
                        >
                            <Shield className="w-4 h-4" /> Final Submit
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {examQuestions.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentIdx(i)}
                                className={`w-8 h-8 rounded-lg font-black text-[10px] transition-all flex items-center justify-center ${
                                    currentIdx === i 
                                        ? 'bg-ncc-navy text-white shadow-md ring-2 ring-ncc-gold ring-offset-2' 
                                        : answers[i] !== undefined
                                            ? 'bg-ncc-gold text-ncc-navy dark:text-white shadow-sm border border-transparent'
                                            : 'bg-white dark:bg-[#050b14] text-gray-400 dark:text-white/80 hover:bg-gray-100 dark:bg-[#0d2137] border border-gray-200 dark:border-white/10'
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest">Caution: Navigating away from this tab will result in automatic disqualification.</p>
            </div>
        </div>
    );
};
