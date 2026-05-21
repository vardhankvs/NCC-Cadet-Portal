import React, { useState, useEffect } from 'react'; // Force Reload 1.0
import { 
    Settings, 
    Plus, 
    Trash2, 
    Upload, 
    Filter, 
    Search, 
    FileText, 
    Camera, 
    BarChart, 
    Zap, 
    User, 
    Shield,
    Clock,
    Award,
    Edit3
} from '../../components/Icons.jsx';
import { 
    saveExamSettings, 
    getExamSettings, 
    addExamQuestion, 
    addMultipleQuestions,
    getQuizQuestions, 
    bulkDeleteQuestions,
    deleteExamQuestion,
    deleteMultipleQuestions,
    updateExamQuestion,
    getExamAttempts,
    deleteExamAttempt 
} from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';
import { sendPushToAll } from '../../firebase/pushNotifications.js';

export const ExamManager = ({ initialView = 'dashboard' }) => {
    const [view, setView] = useState(initialView); // dashboard, questions, attempts, settings
    const [config, setConfig] = useState({ timer: 15, questionLimit: 10, negativeMarking: false, examTitle: 'General Knowledge' });
    const [questions, setQuestions] = useState([]);
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [certFilter, setCertFilter] = useState('All');
    const [divFilter, setDivFilter] = useState('All');

    // New Question Form
    const [newQ, setNewQ] = useState({
        question: '',
        options: ['', '', '', ''],
        correct: 0,
        explanation: '',
        imageUrl: '',
        marks: 1,
        negativeMarks: 0.5
    });
    const [editingId, setEditingId] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        loadAll();
    }, [certFilter, divFilter]);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [s, q, allAttempts] = await Promise.all([
                getExamSettings(),
                getQuizQuestions(),
                getExamAttempts(certFilter, divFilter)
            ]);
            
            const uniqueAttempts = [];
            const seen = new Set();
            for (const a of allAttempts) {
                const key = `${a.cadetId}-${a.examTitle || 'General Knowledge'}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueAttempts.push(a);
                }
            }
            
            setConfig(s);
            setQuestions(q);
            setAttempts(uniqueAttempts);
        } catch (err) {
            console.error("Exam Load Error:", err);
        }
        setLoading(false);
    };

    const handleSaveSettings = async () => {
        try {
            await saveExamSettings(config);
            toast.success("Command parameters updated.");
        } catch (err) {
            toast.error("Override failed.");
        }
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateExamQuestion(editingId, newQ);
                toast.success("Question updated successfully.");
                setEditingId(null);
            } else {
                await addExamQuestion(newQ);
                toast.success("Question encrypted and added.");
                sendPushToAll('📝 New Exam Question', `A new question has been added to the ${config.examTitle || 'NCC'} exam bank`);
            }
            setNewQ({
                question: '',
                options: ['', '', '', ''],
                correct: 0,
                explanation: '',
                imageUrl: '',
                marks: 1,
                negativeMarks: 0.25
            });
            loadAll();
        } catch (err) {
            toast.error("Transmission error.");
        }
    };

    const handleEditQuestion = (q) => {
        setNewQ({
            question: q.question || '',
            options: q.options || ['', '', '', ''],
            correct: q.correct !== undefined ? q.correct : 0,
            explanation: q.explanation || '',
            imageUrl: q.imageUrl || '',
            marks: q.marks || 1,
            negativeMarks: q.negativeMarks || 0.25
        });
        setEditingId(q.id);
    };

    const handleDeleteQuestion = async (id) => {
        if (!window.confirm("Permanently strike this question from the bank?")) return;
        try {
            await deleteExamQuestion(id);
            toast.success("Question purged.");
            loadAll();
        } catch (err) {
            toast.error("Purge failed.");
        }
    };

    const handleDeleteSelected = async () => {
        if (!window.confirm(`Permanently delete ${selectedIds.length} selected questions?`)) return;
        try {
            await deleteMultipleQuestions(selectedIds);
            toast.success("Batch purge complete.");
            setSelectedIds([]);
            loadAll();
        } catch (err) {
            toast.error("Batch purge failed.");
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleDeleteAttempt = async (id) => {
        if (!window.confirm("Permanently strike this record from the archives?")) return;
        try {
            await deleteExamAttempt(id);
            toast.success("Record purged.");
            loadAll();
        } catch (err) {
            toast.error("Purge failed.");
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm("CRITICAL: Wipe entire question bank?")) return;
        try {
            await bulkDeleteQuestions();
            toast.success("Question bank zeroed.");
            loadAll();
        } catch (err) {
            toast.error("Wipe failed.");
        }
    };

    const handleDownloadTemplate = () => {
        console.log("Triggering Bulk Template Download...");
        const headers = "question,option1,option2,option3,option4,correct_ans,image_url\n";
        const row1 = "What is the motto of NCC?,Unity and Discipline,Service Before Self,Always Alert,Honour and Glory,Unity and Discipline,\n";
        const row2 = "In which year was NCC founded?,1947,1948,1950,1942,1948,\n";
        const row3 = "Who is the current DG of NCC?,Lt Gen Gurbirpal Singh,Gen Manoj Pande,Gen Anil Chauhan,Lt Gen Tarun Kumar Aich,Lt Gen Gurbirpal Singh,\n";
        
        const csvContent = "data:text/csv;charset=utf-8," + headers + row1 + row2 + row3;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "NCC_Bulk_Import_Template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.info("Downloading Bulk Import Template...");
    };

    const handleBulkUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const rows = text.split('\n').slice(1); // Skip header
            const questionsToUpload = [];
            
            for (const row of rows) {
                if (!row.trim()) continue;
                // Basic CSV parsing splitting by comma (assumes no commas in question text for simplicity)
                const cols = row.split(',');
                if (cols.length < 6) continue;

                const options = [cols[1]?.trim() || '', cols[2]?.trim() || '', cols[3]?.trim() || '', cols[4]?.trim() || ''];
                const correctText = cols[5]?.trim() || '';
                
                // Intelligently find the correct option by matching the exact text
                let correctIndex = options.findIndex(opt => opt.toLowerCase() === correctText.toLowerCase());
                
                // Fallback: If text doesn't match, check if they inputted an old-style index (0-3)
                if (correctIndex === -1 && !isNaN(parseInt(correctText))) {
                    const parsedInt = parseInt(correctText);
                    if (parsedInt >= 0 && parsedInt <= 3) {
                        correctIndex = parsedInt;
                    }
                }
                
                // Failsafe: Default to Option 1 if completely unmatched
                if (correctIndex === -1) {
                    correctIndex = 0;
                }

                questionsToUpload.push({
                    question: cols[0]?.trim() || '',
                    options: options,
                    correct: correctIndex,
                    imageUrl: cols[6]?.trim() || '',
                    marks: 1
                });
            }

            if (questionsToUpload.length > 0) {
                try {
                    await addMultipleQuestions(questionsToUpload);
                    toast.success(`Successfully deployed ${questionsToUpload.length} questions in a single burst.`);
                    loadAll();
                } catch (err) {
                    console.error("Bulk Import Failed:", err);
                    toast.error("Transmission error during bulk upload.");
                }
            }
        };
        reader.readAsText(file);
    };

    if (loading) return <div className="p-20 text-center animate-pulse text-ncc-navy dark:text-white font-black tracking-[0.4em]">SYNCING COMMAND CENTER...</div>;

    return (
        <div className="space-y-8 fade-in">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-3">
                        <Shield className="w-10 h-10 text-ncc-navy dark:text-white" /> Exam Management Center
                    </h2>
                    <p className="text-gray-500 dark:text-white/70 font-medium">Coordinate unit-wide computer-based testing and performance tracking.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setView('dashboard')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'dashboard' ? 'bg-ncc-navy text-white shadow-lg' : 'bg-white dark:bg-[#050b14] text-gray-400 dark:text-white/80 hover:text-ncc-navy dark:text-white border border-gray-100 dark:border-white/5'}`}
                    >
                        <BarChart className="w-4 h-4 inline mr-2" /> Overview
                    </button>
                    <button 
                        onClick={() => setView('questions')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'questions' ? 'bg-ncc-navy text-white shadow-lg' : 'bg-white dark:bg-[#050b14] text-gray-400 dark:text-white/80 hover:text-ncc-navy dark:text-white border border-gray-100 dark:border-white/5'}`}
                    >
                        <FileText className="w-4 h-4 inline mr-2" /> Questions
                    </button>
                    <button 
                        onClick={() => setView('attempts')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'attempts' ? 'bg-ncc-navy text-white shadow-lg' : 'bg-white dark:bg-[#050b14] text-gray-400 dark:text-white/80 hover:text-ncc-navy dark:text-white border border-gray-100 dark:border-white/5'}`}
                    >
                        <User className="w-4 h-4 inline mr-2" /> Records
                    </button>
                </div>
            </header>

            {view === 'dashboard' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-[#050b14] p-8 rounded-[2.5rem] border border-[#ddd8cc] shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-2">Live Bank</p>
                            <h4 className="text-4xl font-black text-ncc-navy dark:text-white">{questions.length}</h4>
                            <p className="text-xs text-gray-500 dark:text-white/70 mt-2">Validated Questions</p>
                        </div>
                        <div className="bg-white dark:bg-[#050b14] p-8 rounded-[2.5rem] border border-[#ddd8cc] shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-2">Total Attempts</p>
                            <h4 className="text-4xl font-black text-ncc-gold">{attempts.length}</h4>
                            <p className="text-xs text-gray-500 dark:text-white/70 mt-2">Cadet Participations</p>
                        </div>
                        <div className="bg-white dark:bg-[#050b14] p-8 rounded-[2.5rem] border border-[#ddd8cc] shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-2">Avg. Performance</p>
                            <h4 className="text-4xl font-black text-emerald-500">
                                {attempts.length > 0 ? Math.round(attempts.reduce((a, b) => a + (b.score || 0), 0) / attempts.length) : 0}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-white/70 mt-2">Unit Merit Points</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#050b14] p-10 rounded-[3rem] border border-[#ddd8cc] shadow-sm">
                        <h3 className="text-xl font-bold text-ncc-navy dark:text-white mb-8 flex items-center gap-3">
                            <Settings className="w-6 h-6" /> Examination Parameters
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="lg:col-span-4 space-y-2">
                                <label className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest pl-1">Examination Topic / Title</label>
                                <input 
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-[#0a1628] border-gray-100 dark:border-white/5 rounded-xl p-4 text-sm font-bold text-ncc-navy dark:text-white"
                                    placeholder="e.g., Weapon Training, Map Reading..."
                                    value={config.examTitle}
                                    onChange={e => setConfig({...config, examTitle: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest pl-1">Timer (Minutes)</label>
                                <input 
                                    type="number"
                                    className="w-full bg-gray-50 dark:bg-[#0a1628] border-gray-100 dark:border-white/5 rounded-xl p-4 text-sm font-bold text-ncc-navy dark:text-white"
                                    value={config.timer}
                                    onChange={e => setConfig({...config, timer: parseInt(e.target.value)})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest pl-1">Question Limit</label>
                                <input 
                                    type="number"
                                    className="w-full bg-gray-50 dark:bg-[#0a1628] border-gray-100 dark:border-white/5 rounded-xl p-4 text-sm font-bold text-ncc-navy dark:text-white"
                                    value={config.questionLimit}
                                    onChange={e => setConfig({...config, questionLimit: parseInt(e.target.value)})}
                                />
                            </div>
                            <div className="lg:col-span-2 flex items-end">
                                <label className="flex items-center gap-4 bg-gray-50 dark:bg-[#0a1628] p-4 rounded-xl border border-gray-100 dark:border-white/5 w-full cursor-pointer hover:bg-gray-100 dark:bg-[#0d2137] transition-colors">
                                    <input 
                                        type="checkbox"
                                        className="w-5 h-5 rounded border-gray-300 text-ncc-navy dark:text-white focus:ring-ncc-navy"
                                        checked={config.negativeMarking}
                                        onChange={e => setConfig({...config, negativeMarking: e.target.checked})}
                                    />
                                    <span className="text-xs font-bold text-ncc-navy dark:text-white uppercase tracking-widest">Enable Negative Marking</span>
                                </label>
                            </div>
                        </div>
                        <button 
                            onClick={handleSaveSettings}
                            className="mt-10 px-10 py-4 bg-ncc-navy text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-ncc-navy/20"
                        >
                            Save Strategic Configuration
                        </button>
                    </div>
                </div>
            )}

            {view === 'questions' && (() => {
                const questionFormBlock = (
                    <form onSubmit={handleAddQuestion} className={`bg-white dark:bg-[#050b14] rounded-[2rem] border border-[#ddd8cc] relative overflow-hidden ${editingId ? 'p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl' : 'p-12 shadow-xl'}`}>
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-ncc-gold"></div>
                        
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
                            <div>
                                <h3 className="text-2xl font-display font-black text-ncc-navy dark:text-white flex items-center gap-3">
                                    <Plus className="w-8 h-8 text-ncc-gold" /> {editingId ? 'Edit Strategic Question' : 'Deploy New Question'}
                                </h3>
                                <p className="text-[10px] font-black text-ncc-gold uppercase tracking-widest mt-2 flex items-center gap-2">
                                    <Shield className="w-3 h-3" /> Target Topic: {config.examTitle || 'General Knowledge'}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {editingId && (
                                    <button 
                                        type="button"
                                        onClick={() => { setEditingId(null); setNewQ({ question: '', options: ['', '', '', ''], correct: 0, explanation: '', imageUrl: '', marks: 1, negativeMarks: 0.25 }); }}
                                        className="px-5 py-2.5 bg-gray-100 dark:bg-[#0d2137] text-gray-500 dark:text-white/70 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-200 transition-all shadow-sm"
                                    >
                                        Cancel Edit
                                    </button>
                                )}
                                <button 
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="px-5 py-2.5 bg-white dark:bg-[#050b14] border border-ncc-navy/20 text-ncc-navy dark:text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-ncc-navy/5 transition-all flex items-center gap-2 shadow-sm"
                                >
                                    <Upload className="w-3.5 h-3.5" /> Template
                                </button>
                                <label className="px-5 py-2.5 bg-ncc-gold text-ncc-navy dark:text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg cursor-pointer">
                                    <Plus className="w-3.5 h-3.5" /> Bulk Upload
                                    <input type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
                                </label>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="text-sm font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Question Content</label>
                                    <textarea 
                                        required
                                        className="w-full bg-gray-50 dark:bg-[#0a1628] border border-gray-100 dark:border-white/5 rounded-xl p-4 text-sm font-bold text-ncc-navy dark:text-white focus:ring-2 focus:ring-ncc-navy/5 focus:outline-none h-24 mt-1 transition-all"
                                        placeholder="Enter the official examination question text here..."
                                        value={newQ.question}
                                        onChange={e => setNewQ({...newQ, question: e.target.value})}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Visual Reference URL (Optional)</label>
                                    <input 
                                        type="url"
                                        className="w-full bg-gray-50 dark:bg-[#0a1628] border border-gray-100 dark:border-white/5 rounded-xl p-4 text-sm font-bold text-ncc-navy dark:text-white focus:outline-none mt-1"
                                        placeholder="Enter image URL if this is a visual question..."
                                        value={newQ.imageUrl}
                                        onChange={e => setNewQ({...newQ, imageUrl: e.target.value})}
                                    />
                                </div>
                                {newQ.options.map((opt, i) => (
                                    <div key={i} className="relative group">
                                        <label className="text-sm font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Option {i + 1}</label>
                                        <div className="relative mt-1">
                                            <input 
                                                required
                                                className={`w-full bg-gray-50 dark:bg-[#0a1628] border rounded-xl p-4 pr-12 text-sm font-bold text-ncc-navy dark:text-white focus:outline-none transition-all ${newQ.correct === i ? 'border-ncc-navy bg-ncc-navy/5' : 'border-gray-100 dark:border-white/5'}`}
                                                placeholder={`Answer choice ${i + 1}`}
                                                value={opt}
                                                onChange={e => {
                                                    const opts = [...newQ.options];
                                                    opts[i] = e.target.value;
                                                    setNewQ({...newQ, options: opts});
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setNewQ({...newQ, correct: i})}
                                                className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                                                    newQ.correct === i 
                                                        ? 'text-ncc-navy dark:text-white opacity-100 scale-110' 
                                                        : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-ncc-navy dark:text-white'
                                                }`}
                                                title="Mark as Correct Answer"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                            </button>
                                        </div>
                                        {newQ.correct === i && (
                                            <span className="absolute -top-1 -right-1 bg-ncc-navy text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Correct</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                    <div className="pt-4">
                        <button type="submit" className={`w-full py-5 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl active:scale-[0.98] ${editingId ? 'bg-ncc-gold text-ncc-navy dark:text-white' : 'bg-ncc-navy hover:bg-black'}`}>
                            {editingId ? 'Save' : 'Deploy to Question Bank'}
                        </button>
                    </div>
                        </div>
                    </form>
                );
                
                return (
                <div className="space-y-12 max-w-4xl mx-auto">
                    {/* Inline Form for New Questions */}
                    {!editingId && questionFormBlock}

                    {/* Modal Overlay for Editing Questions */}
                    {editingId && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ncc-navy/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            {questionFormBlock}
                        </div>
                    )}

                    {/* Question List Below */}
                    <div className="bg-white dark:bg-[#050b14] p-12 rounded-[3rem] border border-[#ddd8cc] shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                            <div>
                                <h3 className="text-xl font-bold text-ncc-navy dark:text-white">Current Question Bank</h3>
                                <p className="text-xs text-gray-400 dark:text-white/80 mt-1">{questions.length} Questions deployed to field</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {selectedIds.length > 0 && (
                                    <button 
                                        onClick={handleDeleteSelected}
                                        className="px-5 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100 hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
                                    >
                                        <Trash2 className="w-3 h-3" /> Delete Selected ({selectedIds.length})
                                    </button>
                                )}
                                <button onClick={handleBulkDelete} className="text-[10px] font-black text-gray-400 dark:text-white/80 hover:text-red-500 uppercase tracking-widest flex items-center gap-2 transition-colors">
                                    <Trash2 className="w-4 h-4" /> Clear All
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {questions.map((q, i) => (
                                <div key={q.id} className={`px-5 py-3 bg-gray-50 dark:bg-[#0a1628] rounded-xl border transition-all flex items-center gap-4 group relative ${selectedIds.includes(q.id) ? 'border-ncc-navy bg-ncc-navy/5 shadow-md' : 'border-gray-100 dark:border-white/5 hover:bg-gray-200 dark:hover:bg-white/10'}`}>
                                    <input 
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-gray-300 text-ncc-navy dark:text-white focus:ring-ncc-navy cursor-pointer"
                                        checked={selectedIds.includes(q.id)}
                                        onChange={() => toggleSelect(q.id)}
                                    />
                                    <div className="w-8 h-8 bg-white dark:bg-[#050b14] border border-ncc-navy/20 text-ncc-navy dark:text-white rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-24">
                                        <div className="flex flex-col md:flex-row md:items-center gap-x-6 gap-y-1">
                                            <p className="text-sm font-black text-ncc-navy dark:text-white">{q.question}</p>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black text-ncc-navy dark:text-white bg-white dark:bg-[#050b14] border border-ncc-navy/10 px-3 py-1 rounded-lg uppercase tracking-tight shadow-sm min-w-[150px]">
                                                    CORRECT ANSWER: <span className="text-ncc-gold ml-1">{q.options && q.options[q.correct] ? q.options[q.correct] : (q.correctAnswer || 'Not Set')}</span>
                                                </span>
                                                {q.imageUrl && <Camera className="w-3.5 h-3.5 text-ncc-navy dark:text-white/40" title="Visual Reference Included" />}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="absolute right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <button 
                                            type="button"
                                            onClick={() => handleEditQuestion(q)}
                                            className="w-8 h-8 rounded-lg bg-white dark:bg-[#050b14] border border-gray-100 dark:border-white/5 text-ncc-navy dark:text-white flex items-center justify-center hover:bg-ncc-navy hover:text-white transition-all shadow-sm"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => handleDeleteQuestion(q.id)}
                                            className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                );
            })()}

            {view === 'attempts' && (
                <div className="bg-white dark:bg-[#050b14] rounded-[3rem] border border-[#ddd8cc] shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-gray-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <h3 className="text-xl font-bold text-ncc-navy dark:text-white">Performance Records</h3>
                            <div className="flex gap-2">
                                <select 
                                    className="bg-gray-50 dark:bg-[#0a1628] border-gray-100 dark:border-white/5 rounded-xl text-[10px] font-black uppercase px-4 py-2"
                                    value={certFilter}
                                    onChange={e => setCertFilter(e.target.value)}
                                >
                                    <option value="All">All Certs</option>
                                    <option value="B">Cert B</option>
                                    <option value="C">Cert C</option>
                                </select>
                                <select 
                                    className="bg-gray-50 dark:bg-[#0a1628] border-gray-100 dark:border-white/5 rounded-xl text-[10px] font-black uppercase px-4 py-2"
                                    value={divFilter}
                                    onChange={e => setDivFilter(e.target.value)}
                                >
                                    <option value="All">All Divs</option>
                                    <option value="SD">SD</option>
                                    <option value="SW">SW</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-[#0a1628] text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest">
                                <tr>
                                    <th className="px-8 py-4">Cadet Name</th>
                                    <th className="px-8 py-4">ID / Enroll</th>
                                    <th className="px-8 py-4 text-center">Score</th>
                                    <th className="px-8 py-4 text-center">Attempted</th>
                                    <th className="px-8 py-4 text-center">Result</th>
                                    <th className="px-8 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {attempts.map((a, i) => (
                                    <tr key={i} className="hover:bg-gray-50 dark:bg-[#0a1628] transition-colors">
                                        <td className="px-8 py-5 font-bold text-ncc-navy dark:text-white">
                                            {a.cadetName === 'Unknown Cadet' ? `Cadet ${a.cadetId}` : a.cadetName}
                                        </td>
                                        <td className="px-8 py-5 text-xs text-gray-500 dark:text-white/70 font-mono">{a.cadetId}</td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`font-black ${a.score < 0 ? 'text-red-500' : 'text-ncc-navy dark:text-white'}`}>
                                                {a.score} / {a.totalPossible}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center text-xs font-bold text-gray-400 dark:text-white/80">
                                            {a.attempted} / {a.totalQuestions}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${a.score >= (a.totalPossible * 0.5) ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                {a.score >= (a.totalPossible * 0.5) ? 'Pass' : 'Fail'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button 
                                                onClick={() => handleDeleteAttempt(a.id)}
                                                className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all ml-auto"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
