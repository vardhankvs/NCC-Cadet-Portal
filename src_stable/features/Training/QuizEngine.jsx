import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, FileText } from '../../components/Icons.jsx';
import { doc, runTransaction, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase/config.js';
import { getCollectionRef } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';

export const QuizEngine = ({ quiz, currentCadet, onClose, reviewData = null }) => {
    // If in review mode, we jump to step 2 immediately
    const [currentStep, setCurrentStep] = useState(reviewData ? 2 : 0); 
    const [processedQuestions, setProcessedQuestions] = useState(reviewData?.questions || []);
    const [answers, setAnswers] = useState(reviewData?.answers || {});
    const [score, setScore] = useState(reviewData?.score || 0);

    const hasAlreadyAttempted = !reviewData && currentCadet?.examHistory?.some(h => h.quizId === quiz.id);
    
    if (hasAlreadyAttempted && currentStep === 0) {
        return (
            <div className="bg-white dark:bg-[#050b14] rounded-xl shadow-sm border border-[#ddd8cc] p-8 max-w-xl mx-auto text-center fade-in">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
                <p className="text-gray-500 dark:text-white/70 mb-6">You have already attempted this examination. Only one attempt is permitted.</p>
                <button onClick={onClose} className="ncc-btn ncc-btn-primary px-8">Return to Dashboard</button>
            </div>
        );
    }

    const [timeLeft, setTimeLeft] = useState(quiz.durationMins * 60);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (currentStep === 0 || processedQuestions.length === 0) {
            const shuffleArray = (array) => {
                const newArr = [...array];
                for (let i = newArr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
                }
                return newArr;
            };

            // 1. Shuffle and Limit
            let shuffled = shuffleArray(quiz.questions || []);
            const limit = parseInt(quiz.questionLimit) || 0;

            if (limit > 0) {
                shuffled = shuffled.slice(0, limit);
            }

            // 2. Shuffle Answers
            const finalized = shuffled.map(q => {
                const optionsWithMeta = q.options.map((opt, idx) => ({
                    text: opt,
                    isCorrect: idx === q.correctIndex
                }));
                
                const shuffledOptions = shuffleArray(optionsWithMeta);
                const newCorrectIndex = shuffledOptions.findIndex(o => o.isCorrect);
                
                return {
                    ...q,
                    options: shuffledOptions.map(o => o.text),
                    correctIndex: newCorrectIndex
                };
            });

            setProcessedQuestions(finalized);
            // Reset timer based on potentially new duration (supporting seconds if decimals used)
            setTimeLeft(Math.round(quiz.durationMins * 60));
        }
    }, [quiz, currentStep]);

    useEffect(() => {
        let timer;
        if (currentStep === 1 && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0 && currentStep === 1) {
            handleSubmit();
        }
        return () => clearInterval(timer);
    }, [currentStep, timeLeft]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswer = (qIndex, optionIndex) => {
        setAnswers({ ...answers, [qIndex]: optionIndex });
    };

    const calculateScore = () => {
        let sc = 0;
        processedQuestions.forEach((q, idx) => {
            const userAns = answers[idx];
            if (userAns !== undefined) {
                if (userAns === q.correctIndex) {
                    sc += 1;
                } else {
                    sc -= 0.25;
                }
            }
        });
        // Ensure score doesn't go below 0 for better UX, though mathematically it could
        return Math.max(0, sc);
    };

    const handleSubmit = async () => {
        const finalScore = calculateScore();
        setScore(finalScore);
        setCurrentStep(2);
        
        if (currentCadet) {
            setIsSubmitting(true);
            try {
                const cadetRef = doc(getCollectionRef('cadets'), currentCadet.id);
                const passMarks = Math.ceil(processedQuestions.length * 0.5);
                const status = finalScore >= passMarks ? 'PASS' : 'FAIL';

                await runTransaction(db, async (trans) => {
                    const cadetDoc = await trans.get(cadetRef);
                    if (!cadetDoc.exists()) throw new Error("Cadet record not found");

                    trans.update(cadetRef, {
                        examHistory: arrayUnion({
                            quizId: quiz.id,
                            title: quiz.title,
                            score: finalScore,
                            maxScore: processedQuestions.length,
                            status,
                            date: new Date().toISOString()
                        })
                    });

                    const resultsRef = doc(getCollectionRef('quiz_results'));
                    const institutionId = cadetDoc.data().institutionId || '14a-bn-srikakulam';
                    
                    trans.set(resultsRef, {
                        quizId: quiz.id,
                        quizTitle: quiz.title,
                        cadetId: currentCadet.id,
                        cadetName: currentCadet.name || 'Unknown Cadet',
                        cadetReg: currentCadet.enrollmentId || '',
                        score: finalScore,
                        maxScore: processedQuestions.length,
                        status,
                        institutionId,
                        timestamp: new Date().toISOString(),
                        // Save details for review mode
                        reviewDetails: {
                            questions: processedQuestions,
                            answers: answers,
                            score: finalScore
                        }
                    });
                });

                toast.success("Exam results saved!");
            } catch (err) {
                toast.error("Failed to save results: " + err.message);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    if (currentStep === 0) {
        return (
            <div className="bg-white dark:bg-[#050b14] rounded-xl shadow-sm border border-[#ddd8cc] p-8 max-w-2xl mx-auto text-center fade-in">
                <div className="flex justify-between items-start mb-6">
                    <span className="bg-ncc-navy text-white text-xs font-bold px-3 py-1 rounded">MOCK EXAM</span>
                    <button onClick={onClose} className="text-gray-400 dark:text-white/80 hover:text-gray-600 dark:text-white/80"><X className="w-6 h-6"/></button>
                </div>
                <h2 className="text-3xl font-display font-bold text-ncc-navy dark:text-white mb-4">{quiz.title}</h2>
                <div className="flex justify-center gap-6 text-gray-600 dark:text-white/80 mb-8 font-medium">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#0a1628] px-4 py-2 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-ncc-gold"/> 
                        {parseInt(quiz.questionLimit) > 0 ? `${quiz.questionLimit} (of ${quiz.questions.length})` : quiz.questions.length} Questions
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#0a1628] px-4 py-2 rounded-lg">
                        <Clock className="w-5 h-5 text-blue-500"/> 
                        {quiz.durationMins < 1 ? `${Math.round(quiz.durationMins * 60)} Seconds` : `${quiz.durationMins} Minutes`}
                    </div>
                </div>
                <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-lg mb-8 text-left border border-blue-100 shadow-sm">
                    <strong className="text-ncc-navy dark:text-white">Marking Scheme:</strong>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>+1</strong> for every Correct Answer</li>
                        <li><strong>-0.25</strong> for every Wrong Answer (Negative Marking)</li>
                        <li><strong>0</strong> for Not Attempted questions</li>
                        <li>Do not refresh the page or you will lose progress.</li>
                    </ul>
                </div>
                <button onClick={() => setCurrentStep(1)} className="ncc-btn ncc-btn-primary px-12 py-3 text-lg font-bold shadow-md">
                    Start Examination
                </button>
            </div>
        );
    }

    if (currentStep === 2) {
        const passMarks = Math.ceil(processedQuestions.length * 0.5);
        const passed = score >= passMarks;
        
        return (
            <div className="bg-white dark:bg-[#050b14] fixed inset-0 z-[200] flex flex-col animate-in fade-in zoom-in duration-300">
                <header className="bg-ncc-navy text-white px-8 py-4 flex justify-between items-center flex-shrink-0 shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${passed ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-xl font-display font-bold leading-none">Examination Result</h2>
                            <p className="text-ncc-gold font-bold uppercase text-[9px] tracking-widest mt-1">{quiz.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white dark:bg-[#050b14]/10 rounded-full transition"><X className="w-6 h-6" /></button>
                </header>

                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0a1628] ncc-scrollbar">
                    <div className="max-w-6xl mx-auto p-4 sm:p-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                            <div className="bg-white dark:bg-[#050b14] p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 text-center flex flex-col justify-center">
                                <div className="text-sm font-bold text-gray-400 dark:text-white/80 uppercase tracking-widest mb-2">Final Score</div>
                                <div className="text-7xl font-black text-ncc-navy dark:text-white mb-2">{score} <span className="text-2xl text-gray-300">/ {processedQuestions.length}</span></div>
                                <div className={`text-lg font-bold px-4 py-1 rounded-full inline-block mx-auto ${passed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                    {passed ? 'PASSED' : 'FAILED'} • {processedQuestions.length > 0 ? Math.round((score/processedQuestions.length)*100) : 0}%
                                </div>
                            </div>
                            
                            <div className="bg-white dark:bg-[#050b14] p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 md:col-span-2">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 text-lg">
                                    <FileText className="w-5 h-5 text-ncc-gold" /> Performance Summary
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                        <span className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Correct Answers (+1.00)</span>
                                        <span className="text-2xl font-black text-emerald-700">
                                            {processedQuestions.filter((q, i) => answers[i] === q.correctIndex).length}
                                        </span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                                        <span className="block text-[10px] font-bold text-red-600 uppercase mb-1">Wrong Answers (-0.25)</span>
                                        <span className="text-2xl font-black text-red-700">
                                            {processedQuestions.filter((q, i) => answers[i] !== undefined && answers[i] !== q.correctIndex).length}
                                        </span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#0a1628] border border-gray-200 dark:border-white/10">
                                        <span className="block text-[10px] font-bold text-gray-500 dark:text-white/70 uppercase mb-1">Not Attempted (0.00)</span>
                                        <span className="text-2xl font-black text-gray-700 dark:text-white/90">
                                            {processedQuestions.filter((q, i) => answers[i] === undefined).length}
                                        </span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                        <span className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Pass Requirement</span>
                                        <span className="text-2xl font-black text-blue-700">50% ({passMarks})</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mb-6">
                            <h3 className="text-2xl font-bold text-ncc-navy dark:text-white">Detailed Review</h3>
                            <div className="h-px flex-1 bg-gray-200"></div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {processedQuestions.map((q, idx) => {
                                const userAns = answers[idx];
                                const isCorrect = userAns === q.correctIndex;
                                return (
                                    <div key={idx} className={`p-8 rounded-2xl border-l-[6px] bg-white dark:bg-[#050b14] shadow-sm transition hover:shadow-md ${isCorrect ? 'border-l-emerald-500 shadow-emerald-50' : 'border-l-red-500 shadow-red-50'}`}>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="bg-gray-100 dark:bg-[#0d2137] text-gray-500 dark:text-white/70 text-[10px] font-black px-2 py-0.5 rounded">QUESTION {idx + 1}</span>
                                                    {userAns === undefined ? (
                                                        <span className="text-gray-400 dark:text-white/80 flex items-center gap-1 text-[10px] font-bold">Not Attempted (0 Marks)</span>
                                                    ) : isCorrect ? (
                                                        <span className="text-emerald-500 flex items-center gap-1 text-[10px] font-bold"><CheckCircle className="w-3 h-3"/> +1.00 Mark</span>
                                                    ) : (
                                                        <span className="text-red-500 flex items-center gap-1 text-[10px] font-bold"><X className="w-3 h-3"/> -0.25 Mark</span>
                                                    )}
                                                </div>
                                                <h5 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{q.text}</h5>
                                            </div>
                                            <span className={`px-4 py-1 rounded-full text-[10px] font-black tracking-widest ${isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {isCorrect ? 'CORRECT' : 'WRONG'}
                                            </span>
                                        </div>

                                        {q.imageUrl && (
                                            <div className="mb-6 bg-gray-50 dark:bg-[#0a1628] rounded-xl p-3 border border-gray-100 dark:border-white/5 inline-block">
                                                <img src={q.imageUrl} alt="question" className="max-h-80 rounded-lg shadow-sm" />
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className={`p-4 rounded-xl border ${isCorrect ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'}`}>
                                                <div className="text-[10px] font-bold text-gray-400 dark:text-white/80 uppercase mb-2">Your Answer</div>
                                                <div className={`text-base font-bold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                                                    {userAns !== undefined ? q.options[userAns] : 'Not Answered'}
                                                </div>
                                            </div>
                                            {!isCorrect && (
                                                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                                                    <div className="text-[10px] font-bold text-emerald-600 uppercase mb-2">Correct Answer</div>
                                                    <div className="text-base font-black text-emerald-800">{q.options[q.correctIndex]}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                
                <footer className="p-6 border-t bg-white dark:bg-[#050b14] shadow-2xl flex justify-center flex-shrink-0">
                    <button onClick={onClose} className="ncc-btn ncc-btn-primary px-20 py-4 text-xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all">
                        Exit Review
                    </button>
                </footer>
            </div>
        );
    }

    return (
        <div 
            className="bg-white dark:bg-[#050b14] rounded-xl shadow-sm border border-[#ddd8cc] max-w-4xl mx-auto fade-in flex flex-col h-[85vh] select-none"
            onCopy={e => { e.preventDefault(); toast.warning("Copying is disabled during exam"); }}
            onPaste={e => { e.preventDefault(); toast.warning("Pasting is disabled during exam"); }}
            onCut={e => { e.preventDefault(); }}
            onContextMenu={e => { e.preventDefault(); }}
        >
            <div className="bg-ncc-navy text-white px-6 py-4 flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold font-display truncate pr-4">{quiz.title}</h3>
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 font-mono font-bold px-3 py-1 rounded bg-white dark:bg-[#050b14]/10 ${timeLeft < 60 ? 'text-red-400 animate-pulse' : ''}`}>
                        <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-[#0a1628] space-y-8 ncc-scrollbar">
                {processedQuestions.map((q, qIndex) => (
                    <div key={qIndex} className="bg-white dark:bg-[#050b14] p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                        <div className="flex gap-4">
                            <div className="font-bold text-gray-400 dark:text-white/80">Q{qIndex + 1}</div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white mb-4">{q.text}</p>
                                {q.imageUrl && (
                                    <div className="mb-4 bg-gray-50 dark:bg-[#0a1628] rounded-lg p-2 border border-gray-100 dark:border-white/5 inline-block overflow-hidden max-w-full">
                                        <img src={q.imageUrl} alt="question illustration" className="max-h-60 rounded mx-auto object-contain shadow-sm" />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    {q.options.map((option, optIdx) => (
                                        <label key={optIdx} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-blue-50 transition ${answers[qIndex] === optIdx ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 dark:border-white/10'}`}>
                                            <input 
                                                type="radio" 
                                                name={`q-${qIndex}`} 
                                                checked={answers[qIndex] === optIdx}
                                                onChange={() => handleAnswer(qIndex, optIdx)}
                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-white/90">{option}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="p-4 border-t bg-white dark:bg-[#050b14] flex justify-between items-center flex-shrink-0">
                <span className="text-sm font-bold text-gray-500 dark:text-white/70">{Object.keys(answers).length} of {processedQuestions.length} answered</span>
                <button 
                    onClick={() => {
                        if (window.confirm("Are you sure you want to submit the exam?")) {
                            handleSubmit();
                        }
                    }} 
                    className="ncc-btn ncc-btn-primary"
                    disabled={isSubmitting}
                >
                    Submit Exam
                </button>
            </div>
        </div>
    );
};
