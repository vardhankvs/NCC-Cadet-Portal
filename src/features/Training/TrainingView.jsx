import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { BookOpen, FileText, CheckCircle, ExternalLink, Plus, Trash2, BarChart2, X, Clock } from '../../components/Icons.jsx';
import { QuizEngine } from './QuizEngine.jsx';
import { QuizForm } from './QuizForm.jsx';
import { saveMaterial, deleteItem, getCollectionRef } from '../../firebase/firestoreService.js';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config.js';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils.js';

export const TrainingView = () => {
    const { userRole, userProfile, userEnrollmentId } = useAuthContext();
    const { materials, quizzes, cadets } = useDataContext();
    const [activeTab, setActiveTab] = useState('library');
    const [activeQuiz, setActiveQuiz] = useState(null);

    const [isAddingMode, setIsAddingMode] = useState(false);
    const [isAddingQuiz, setIsAddingQuiz] = useState(false);
    const [quizToEdit, setQuizToEdit] = useState(null);
    const [viewingResults, setViewingResults] = useState(null); // stores quiz object
    const [quizResults, setQuizResults] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadType, setUploadType] = useState('link'); // 'link' or 'file'
    const [newMaterial, setNewMaterial] = useState({ title: '', category: 'Common Subjects', type: 'PDF', url: '' });
    const [reviewData, setReviewData] = useState(null);

    const categories = ['Common Subjects', 'Specialized Subjects', 'Weapon Training', 'Drill Manuals', 'Miscellaneous'];

    useEffect(() => {
        if (userRole === 'admin' && viewingResults) {
            const q = query(getCollectionRef('quiz_results'), where('quizId', '==', viewingResults.id));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                setQuizResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            return () => unsubscribe();
        } else if (userRole === 'cadet' && userEnrollmentId) {
            // For cadets, we want to know their results for ALL quizzes to show pass/fail and allow reviews
            const q = query(getCollectionRef('quiz_results'), where('cadetReg', '==', userEnrollmentId));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                setQuizResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            return () => unsubscribe();
        }
    }, [userRole, viewingResults, userEnrollmentId]);

    const handleDeleteResult = async (resultId, cadetId, quizId) => {
        if (!window.confirm("Are you sure you want to delete this result? The cadet will be able to retake the exam.")) return;
        
        try {
            // 1. Delete from Central Results
            const resultRef = doc(getCollectionRef('quiz_results'), resultId);
            await deleteDoc(resultRef);

            // 2. Remove from Cadet's history
            const cadetRef = doc(getCollectionRef('cadets'), cadetId);
            const cadetDoc = await getDoc(cadetRef);
            
            if (cadetDoc.exists()) {
                const history = cadetDoc.data().examHistory || [];
                const updatedHistory = history.filter(h => h.quizId !== quizId);
                await updateDoc(cadetRef, { examHistory: updatedHistory });
            }
            
            toast.success("Result deleted successfully. Cadet can now retake the exam.");
        } catch (err) {
            toast.error("Deletion failed: " + err.message);
        }
    };

    // Process quiz access history for cadets using Enrollment ID link
    const currentCadet = userRole === 'cadet' ? cadets.find(c => (c.enrollmentId || c.regNo) === userEnrollmentId) : null;
    const completedQuizzes = currentCadet?.examHistory || [];

    const handleAddMaterial = async (e) => {
        e.preventDefault();
        if (!newMaterial.url && uploadType === 'link') return toast.error("Please provide a link");
        
        try {
            await saveMaterial(newMaterial);
            toast.success("Material added successfully");
            setIsAddingMode(false);
            setNewMaterial({ title: '', category: 'Common Subjects', type: 'PDF', url: '' });
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation
        const isPdf = file.type === 'application/pdf';
        const isPpt = file.name.endsWith('.ppt') || file.name.endsWith('.pptx');
        
        if (!isPdf && !isPpt) {
            return toast.error("Only PDF or PPT files are allowed");
        }

        setIsUploading(true);
        try {
            const path = isPdf ? 'pdfs' : 'ppts';
            const downloadUrl = await uploadTrainingFile(file, path);
            setNewMaterial({
                ...newMaterial,
                title: newMaterial.title || file.name.split('.')[0],
                url: downloadUrl,
                type: isPdf ? 'PDF' : 'PPT'
            });
            toast.success("File uploaded successfully! You can now save.");
        } catch (err) {
            toast.error("Upload failed: " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    if (activeQuiz || reviewData) {
        return (
            <div className="p-4 sm:p-8">
                <QuizEngine 
                    quiz={activeQuiz || reviewData.quiz} 
                    currentCadet={currentCadet} 
                    reviewData={reviewData?.details}
                    onClose={() => {
                        setActiveQuiz(null);
                        setReviewData(null);
                    }} 
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-ncc-navy">Training & E-Learning</h1>
                    <p className="text-gray-500">Access digital syllabus and attempt mock examinations.</p>
                </div>
                <div className="flex bg-gray-200 rounded-lg p-1">
                    <button 
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${activeTab === 'library' ? 'bg-white text-ncc-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('library')}
                    >
                        Digital Library
                    </button>
                    <button 
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${activeTab === 'exams' ? 'bg-white text-ncc-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('exams')}
                    >
                        Mock Exams
                    </button>
                </div>
            </header>

            {activeTab === 'library' && (
                <div className="space-y-6">
                    {userRole === 'admin' && (
                        <div className="bg-white p-5 rounded-xl border border-[#ddd8cc] shadow-sm">
                            <button 
                                onClick={() => setIsAddingMode(!isAddingMode)}
                                className="ncc-btn ncc-btn-primary text-sm font-bold w-full sm:w-auto"
                            >
                                {isAddingMode ? 'Cancel' : '+ Add Study Material'}
                            </button>
                            {isAddingMode && (
                                <form onSubmit={handleAddMaterial} className="mt-4 bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Material Title</label>
                                            <input required placeholder="E.g. Weapon Training Note 1" className="ncc-input text-sm w-full" value={newMaterial.title} onChange={e => setNewMaterial({...newMaterial, title: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                            <select className="ncc-input text-sm w-full" value={newMaterial.category} onChange={e => setNewMaterial({...newMaterial, category: e.target.value})}>
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Source Type</label>
                                            <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                                                <button type="button" onClick={() => setUploadType('link')} className={`flex-1 py-1 text-[10px] font-bold rounded ${uploadType === 'link' ? 'bg-ncc-navy text-white' : 'text-gray-500'}`}>Link</button>
                                                <button type="button" onClick={() => setUploadType('file')} className={`flex-1 py-1 text-[10px] font-bold rounded ${uploadType === 'file' ? 'bg-ncc-navy text-white' : 'text-gray-500'}`}>Upload</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                                        <div className="flex-1 w-full">
                                            {uploadType === 'link' ? (
                                                <input required={uploadType === 'link'} type="url" placeholder="Paste Drive/External Link here..." className="ncc-input text-sm w-full" value={newMaterial.url} onChange={e => setNewMaterial({...newMaterial, url: e.target.value})} />
                                            ) : (
                                                <div className="relative">
                                                    <input 
                                                        type="file" 
                                                        accept=".pdf,.ppt,.pptx" 
                                                        onChange={handleFileUpload}
                                                        className="hidden" 
                                                        id="training-file-upload" 
                                                        disabled={isUploading}
                                                    />
                                                    <label 
                                                        htmlFor="training-file-upload"
                                                        className={`w-full h-10 px-4 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:border-ncc-navy hover:bg-white transition ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <Plus className={`w-4 h-4 ${isUploading ? 'animate-spin' : ''}`} />
                                                        <span className="text-sm font-medium">{isUploading ? 'Uploading...' : newMaterial.url ? 'File Ready ✅' : 'Choose PDF or PPT File'}</span>
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            type="submit" 
                                            disabled={isUploading || (uploadType === 'link' && !newMaterial.url) || (uploadType === 'file' && !newMaterial.url)}
                                            className="ncc-btn ncc-btn-primary text-sm whitespace-nowrap min-w-[120px]"
                                        >
                                            Save Material
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map(category => {
                            const catMaterials = materials.filter(m => m.category === category);
                            if (catMaterials.length === 0) return null;
                            return (
                                <div key={category} className="bg-white rounded-xl shadow-sm border border-[#ddd8cc] overflow-hidden">
                                    <div className="bg-ncc-navy text-white px-4 py-3 font-bold flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-ncc-gold" />
                                        {category}
                                    </div>
                                    <ul className="divide-y divide-gray-100">
                                        {catMaterials.map(m => (
                                            <li key={m.id} className="p-4 hover:bg-gray-50 flex items-start gap-3 group">
                                                <div className="bg-red-100 text-red-600 p-2 rounded-lg shrink-0">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <a href={m.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-gray-900 hover:text-blue-600 truncate block group-hover:underline flex items-center gap-1">
                                                        {m.title} <ExternalLink className="w-3 h-3 opacity-50" />
                                                    </a>
                                                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(m.createdAt)}</p>
                                                </div>
                                                {userRole === 'admin' && (
                                                    <button onClick={() => deleteItem('materials', m.id)} className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )
                        })}
                        {materials.length === 0 && (
                            <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="font-medium">No study materials uploaded yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'exams' && (
                <div className="space-y-6">
                    {userRole === 'admin' && (
                        <div className="bg-white p-5 rounded-xl border border-[#ddd8cc] shadow-sm flex items-center justify-between">
                            <p className="text-sm text-gray-600 font-medium">Create interactive Mock Tests for cadets.</p>
                            <button 
                                onClick={() => setIsAddingQuiz(true)}
                                className="ncc-btn ncc-btn-primary text-sm font-bold whitespace-nowrap"
                            >
                                + Create Quiz
                            </button>
                        </div>
                    )}

                    {isAddingQuiz && (
                        <QuizForm 
                            quizToEdit={quizToEdit}
                            onClose={() => {
                                setIsAddingQuiz(false);
                                setQuizToEdit(null);
                            }} 
                        />
                    )}

                    {viewingResults && (
                        <ResultsModal 
                            quiz={viewingResults} 
                            results={quizResults} 
                            onDelete={(res) => handleDeleteResult(res.id, res.cadetId, res.quizId)}
                            onClose={() => setViewingResults(null)} 
                        />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {quizzes.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                <CheckCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="font-medium">No exams scheduled.</p>
                            </div>
                        ) : (
                            quizzes.map(quiz => {
                                const completed = completedQuizzes.find(cq => cq.quizId === quiz.id);
                                return (
                                    <div key={quiz.id} className="bg-white rounded-xl shadow-sm border border-[#ddd8cc] p-5 flex flex-col relative overflow-hidden">
                                        {completed && (
                                            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> COMPLETED
                                            </div>
                                        )}
                                        <div className="mb-4">
                                            <span className="text-[10px] font-bold text-ncc-gold uppercase tracking-wider">{quiz.certLevel} CERT</span>
                                            <h3 className="text-lg font-bold text-ncc-navy mt-1 leading-tight">{quiz.title}</h3>
                                            <p className="text-xs text-gray-500 mt-2">
                                                {parseInt(quiz.questionLimit) > 0 ? quiz.questionLimit : (quiz.questions?.length || 0)} Questions • {quiz.durationMins < 1 ? Math.round(quiz.durationMins * 60) + ' Secs' : quiz.durationMins + ' Mins'}
                                            </p>
                                        </div>
                                        <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-3">
                                            {userRole === 'admin' ? (
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => setViewingResults(quiz)}
                                                        className="flex-1 ncc-btn bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-sm flex items-center justify-center gap-2"
                                                    >
                                                        <BarChart2 className="w-4 h-4" /> View Results
                                                    </button>
                                                    <div className="flex gap-1">
                                                        <button 
                                                            onClick={() => {
                                                                setQuizToEdit(quiz);
                                                                setIsAddingQuiz(true);
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-ncc-navy transition border border-gray-100 rounded-lg"
                                                            title="Edit Quiz"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => deleteItem('quizzes', quiz.id)}
                                                            className="p-2 text-gray-400 hover:text-red-500 transition border border-gray-100 rounded-lg"
                                                            title="Delete Quiz"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : completed ? (
                                                <button 
                                                    onClick={() => {
                                                        // Find the specific result record for this cadet and quiz
                                                        const resultRecord = quizResults.find(r => r.quizId === quiz.id && r.cadetId === currentCadet?.id);
                                                        if (resultRecord?.reviewDetails) {
                                                            setReviewData({
                                                                quiz,
                                                                details: resultRecord.reviewDetails
                                                            });
                                                        } else {
                                                            toast.info("Detailed review is only available for exams completed after the recent update.");
                                                        }
                                                    }}
                                                    className="w-full text-left"
                                                >
                                                    {(() => {
                                                        const score = completed.score || 0;
                                                        const max = completed.maxScore || (quiz.questions?.length || 1);
                                                        const status = completed.status || (Math.round((score/max)*100) >= 50 ? 'PASS' : 'FAIL');
                                                        const passed = status === 'PASS';
                                                        
                                                        return (
                                                            <div className={`p-3 rounded-lg border flex justify-between items-center hover:shadow-md transition ${passed ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                                                                <div>
                                                                    <div className={`text-[10px] font-bold uppercase ${passed ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                        {status} (Click to Review)
                                                                    </div>
                                                                    <div className={`text-sm font-bold ${passed ? 'text-emerald-700' : 'text-red-700'}`}>
                                                                        Score: {score}/{max}
                                                                    </div>
                                                                </div>
                                                                <CheckCircle className={`w-5 h-5 ${passed ? 'text-emerald-500' : 'text-red-500'}`} />
                                                            </div>
                                                        );
                                                    })()}
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => setActiveQuiz(quiz)}
                                                    className="w-full ncc-btn bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-sm"
                                                >
                                                    Start Exam
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ResultsModal = ({ quiz, results, onDelete, onClose }) => {
    const { cadets } = useDataContext();
    
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden fade-in">
                <header className="bg-emerald-700 text-white px-6 py-4 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold font-display">{quiz.title} - Performance Dashboard</h2>
                        <p className="text-xs text-emerald-100 opacity-80">{results.length} Total Attempts Found</p>
                    </div>
                    <button onClick={onClose} className="hover:rotate-90 transition p-1"><X className="w-6 h-6"/></button>
                </header>
                
                <div className="flex-1 overflow-y-auto ncc-scrollbar p-6 bg-gray-50">
                    {results.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No results found yet. Cadets have not started this exam.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cadet Name</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reg No</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Score</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Percentage</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map((res, idx) => {
                                        const percentage = Math.round((res.score / res.maxScore) * 100);
                                        const passed = percentage >= 50;
                                        // Fallback name lookup if cadetName is missing
                                        const displayName = res.cadetName || cadets.find(c => c.id === res.cadetId)?.name || 'Unknown Cadet';
                                        
                                        return (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition">
                                                <td className="px-6 py-4 font-bold text-gray-800 text-sm whitespace-nowrap">{displayName}</td>
                                                <td className="px-6 py-4 text-xs text-gray-500 font-mono">{res.cadetReg}</td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-ncc-navy text-sm">{res.score}</span>
                                                    <span className="text-gray-400 text-xs"> / {res.maxScore}</span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-sm text-gray-600">{percentage}%</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tight ${passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                        {passed ? 'PASSED' : 'FAILED'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-gray-400">{formatDate(res.timestamp)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => onDelete(res)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                        title="Delete Result & Reset Attempt"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                
                <footer className="p-4 bg-white border-t flex justify-end">
                    <button onClick={onClose} className="ncc-btn ncc-btn-primary px-8">Close Dashboard</button>
                </footer>
            </div>
        </div>
    );
};
