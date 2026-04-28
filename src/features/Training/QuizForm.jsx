import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle, Image as ImageIcon, FileText, Download } from '../../components/Icons.jsx';
import { saveQuiz } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

export const QuizForm = ({ onClose, quizToEdit }) => {
    const [quizData, setQuizData] = useState({
        title: '',
        certLevel: 'B',
        durationMins: 30,
        questionLimit: 0,
        questions: [
            { text: '', options: ['', '', '', ''], correctIndex: 0, imageUrl: '' }
        ]
    });

    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (quizToEdit) {
            setQuizData({
                ...quizToEdit,
                questions: quizToEdit.questions.map(q => ({
                    ...q,
                    imageUrl: q.imageUrl || '' // Ensure imageUrl exists
                }))
            });
        }
    }, [quizToEdit]);

    const downloadTemplate = () => {
        const headers = [['Question', 'Option1', 'Option2', 'Option3', 'Option4', 'CorrectIndex(0-3)', 'ImageUrl(optional)']];
        const example = [['What is the capital of India?', 'New Delhi', 'Mumbai', 'Chennai', 'Kolkata', '0', '']];
        const ws = XLSX.utils.aoa_to_sheet([...headers, ...example]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "ExamTemplate");
        XLSX.writeFile(wb, "NCC_Mock_Exam_Template.xlsx");
    };

    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                // Remove headers (row 0)
                const rows = data.slice(1).filter(row => row.length >= 6); 

                const parsed = rows.map(row => {
                    return {
                        text: String(row[0] || ''),
                        options: [String(row[1] || ''), String(row[2] || ''), String(row[3] || ''), String(row[4] || '')],
                        correctIndex: parseInt(row[5]) || 0,
                        imageUrl: String(row[6] || '')
                    };
                });

                if (parsed.length === 0) throw new Error("No valid data found in Excel");
                
                setQuizData({ ...quizData, questions: [...quizData.questions, ...parsed] });
                setIsBulkMode(false);
                toast.success(`Successfully imported ${parsed.length} questions from Excel!`);
            } catch (err) {
                toast.error("Import failed: " + err.message);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleAddQuestion = () => {
        setQuizData({
            ...quizData,
            questions: [...quizData.questions, { text: '', options: ['', '', '', ''], correctIndex: 0, imageUrl: '' }]
        });
    };

    const handleRemoveQuestion = (index) => {
        if (quizData.questions.length === 1) return;
        const newQs = quizData.questions.filter((_, i) => i !== index);
        setQuizData({ ...quizData, questions: newQs });
    };

    const handleQuestionChange = (index, field, value) => {
        const newQs = [...quizData.questions];
        newQs[index][field] = value;
        setQuizData({ ...quizData, questions: newQs });
    };

    const handleOptionChange = (qIndex, oIndex, value) => {
        const newQs = [...quizData.questions];
        newQs[qIndex].options[oIndex] = value;
        setQuizData({ ...quizData, questions: newQs });
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        
        // Validation
        if (!quizData.title.trim()) return toast.error("Quiz title is required");
        
        const invalidQ = quizData.questions.some(q => !q.text.trim() || q.options.some(o => !o.trim()));
        if (invalidQ) return toast.error("Please fill all questions and options");

        setIsSaving(true);
        try {
            await saveQuiz(quizData);
            toast.success("Mock Test created successfully!");
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden fade-in">
                <header className="bg-ncc-navy text-white px-6 py-4 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold font-display flex items-center gap-2">
                            {quizToEdit ? <CheckCircle className="w-5 h-5 text-ncc-gold" /> : <Plus className="w-5 h-5 text-ncc-gold" />}
                            {quizToEdit ? 'Edit Mock Examination' : 'Create Mock Examination'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            type="button" 
                            onClick={() => setIsBulkMode(!isBulkMode)}
                            className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                        >
                            <FileText className="w-3.5 h-3.5" /> {isBulkMode ? 'Hide Bulk Upload' : 'Bulk Import Questions'}
                        </button>
                        <button onClick={onClose} className="hover:rotate-90 transition p-1">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto ncc-scrollbar bg-gray-50 p-6 space-y-6">
                    {/* Bulk Mode View */}
                    {isBulkMode && (
                        <div className="bg-white p-6 rounded-xl border-2 border-emerald-200 shadow-sm fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-sm text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Excel Bulk Import
                                </h3>
                                <button 
                                    onClick={downloadTemplate}
                                    className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                                >
                                    <Download className="w-3.5 h-3.5" /> Download Excel Template
                                </button>
                            </div>
                            
                            <div className="border-2 border-dashed border-emerald-100 rounded-xl p-8 text-center bg-emerald-50/30">
                                <FileText className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
                                <p className="text-sm font-medium text-gray-700 mb-4">Upload the completed Excel file to import questions</p>
                                <input 
                                    type="file" 
                                    accept=".xlsx, .xls, .csv" 
                                    onChange={handleExcelUpload}
                                    className="hidden" 
                                    id="bulk-excel-upload" 
                                />
                                <label 
                                    htmlFor="bulk-excel-upload"
                                    className="ncc-btn bg-emerald-600 text-white px-8 py-2.5 rounded-lg text-sm font-bold shadow-lg hover:bg-emerald-700 cursor-pointer inline-flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Select Excel File
                                </label>
                            </div>
                        </div>
                    )}
                    {/* Basic Meta */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Exam Title</label>
                            <input 
                                required
                                type="text" 
                                className="ncc-input w-full" 
                                placeholder="e.g. C-Cert Mock Test 1"
                                value={quizData.title}
                                onChange={e => setQuizData({...quizData, title: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Target Certificate</label>
                            <select 
                                className="ncc-input w-full"
                                value={quizData.certLevel}
                                onChange={e => setQuizData({...quizData, certLevel: e.target.value})}
                            >
                                <option value="B">B-Certificate</option>
                                <option value="C">C-Certificate</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Duration (Mins)</label>
                            <input 
                                type="number" 
                                className="ncc-input w-full"
                                value={quizData.durationMins || ''}
                                onChange={e => {
                                    const val = parseFloat(e.target.value);
                                    setQuizData({...quizData, durationMins: isNaN(val) ? 0 : val});
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Question Limit</label>
                            <input 
                                type="number" 
                                className="ncc-input w-full"
                                placeholder="All (0)"
                                value={quizData.questionLimit || ''}
                                onChange={e => {
                                    const val = parseInt(e.target.value);
                                    setQuizData({...quizData, questionLimit: isNaN(val) ? 0 : val});
                                }}
                            />
                            <p className="text-[9px] text-gray-400 mt-1">Randomly select N questions for each cadet</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-ncc-navy uppercase tracking-widest flex items-center justify-between">
                            Questions ({quizData.questions.length})
                            <button 
                                type="button" 
                                onClick={handleAddQuestion}
                                className="text-xs bg-ncc-navy text-white px-3 py-1.5 rounded-lg hover:bg-ncc-navy/90 transition flex items-center gap-1 shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Question
                            </button>
                        </h3>

                        {quizData.questions.map((q, qIndex) => (
                            <div key={qIndex} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative group">
                                <button 
                                    type="button"
                                    onClick={() => handleRemoveQuestion(qIndex)}
                                    className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Question {qIndex + 1}</label>
                                            <textarea 
                                                required
                                                className="ncc-input w-full text-sm font-medium" 
                                                placeholder="Type your question here..."
                                                rows="2"
                                                value={q.text}
                                                onChange={e => handleQuestionChange(qIndex, 'text', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Question Image URL (Optional)</label>
                                            <div className="relative">
                                                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                                                <input 
                                                    type="url" 
                                                    className="ncc-input w-full text-xs pl-9" 
                                                    placeholder="Paste image link here..."
                                                    value={q.imageUrl || ''}
                                                    onChange={e => handleQuestionChange(qIndex, 'imageUrl', e.target.value)}
                                                />
                                            </div>
                                            {q.imageUrl && (
                                                <div className="mt-2 text-center bg-gray-50 rounded p-1 border border-gray-100">
                                                    <img src={q.imageUrl} alt="preview" className="h-20 max-w-full object-contain mx-auto rounded shadow-sm" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {q.options.map((opt, oIndex) => (
                                            <div key={oIndex} className="relative">
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="radio" 
                                                        name={`correct-${qIndex}`}
                                                        checked={q.correctIndex === oIndex}
                                                        onChange={() => handleQuestionChange(qIndex, 'correctIndex', oIndex)}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    <input 
                                                        required
                                                        type="text" 
                                                        className={`ncc-input w-full text-sm ${q.correctIndex === oIndex ? 'border-emerald-300 bg-emerald-50/50' : ''}`}
                                                        placeholder={`Option ${oIndex + 1}`}
                                                        value={opt}
                                                        onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 flex justify-center">
                        <button 
                            type="button" 
                            onClick={handleAddQuestion}
                            className="ncc-btn border-2 border-dashed border-gray-300 text-gray-500 hover:border-ncc-navy hover:text-ncc-navy w-full py-4 rounded-xl flex items-center justify-center gap-2 transition"
                        >
                            <Plus className="w-5 h-5" /> Add Another Question
                        </button>
                    </div>
                </form>

                <footer className="bg-white border-t p-4 flex justify-end gap-3 flex-shrink-0 shadow-inner">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                    <button 
                        disabled={isSaving}
                        onClick={handleSubmit}
                        type="button"
                        className="ncc-btn ncc-btn-primary px-10 shadow-lg disabled:opacity-50"
                    >
                        {isSaving ? (quizToEdit ? 'Updating Exam...' : 'Creating Exam...') : (quizToEdit ? 'Update Examination' : 'Create Examination')}
                    </button>
                </footer>
            </div>
        </div>
    );
};
