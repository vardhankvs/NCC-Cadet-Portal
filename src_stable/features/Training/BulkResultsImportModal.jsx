// src/features/Training/BulkResultsImportModal.jsx
import React, { useState } from 'react';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { XCircle, Loader, Award, Download, FileText } from '../../components/Icons.jsx';
import { bulkAddResults } from '../../firebase/firestoreService.js';
import Papa from 'papaparse';
import { toast } from 'react-toastify';

export const BulkResultsImportModal = ({ institutionId, onClose, onRefresh }) => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState(null);

    const REQUIRED_HEADERS = [
        'regimental number',
        'certificate',
        'theory marks',
        'practical marks'
    ];

    const OPTIONAL_HEADERS = [
        'year',
        'theory max',
        'practical max',
        'bonus marks'
    ];

    const downloadTemplate = () => {
        const headers = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS].map(h => h.toUpperCase()).join(',');
        const sampleData = '\nAP22SDA100101,B,280,120,2026,350,150,15';
        const blob = new Blob([headers + sampleData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cadet_exam_results_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
            setFile(selectedFile);
            setFormError(null);
        } else {
            setFile(null);
            setFormError('Please select a valid .csv file.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setFormError('No file selected.');
            return;
        }

        setLoading(true);
        setFormError(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.replace(/\s+/g, ' ').trim().toLowerCase(),
            complete: async (results) => {
                const rows = results.data;

                if (!rows || rows.length === 0) {
                    setFormError('File is empty or invalid.');
                    setLoading(false);
                    return;
                }

                const headers = Object.keys(rows[0]);
                const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));

                if (missingHeaders.length > 0) {
                    setFormError(`File is missing required columns: ${missingHeaders.join(', ')}`);
                    setLoading(false);
                    return;
                }

                try {
                    const { updatedCount, skippedCount } = await bulkAddResults(rows, institutionId);
                    
                    if (updatedCount > 0) {
                        toast.success(`Successfully uploaded results for ${updatedCount} cadets!`);
                    }
                    if (skippedCount > 0) {
                        toast.warning(`Skipped ${skippedCount} rows (unmatched cadets or invalid format).`);
                    }
                    if (updatedCount === 0 && skippedCount === 0) {
                        toast.error('No valid results found in file.');
                    }

                    setLoading(false);
                    if (onRefresh) onRefresh();
                    onClose();
                } catch (err) {
                    setFormError(`Import failed: ${err.message}`);
                    setLoading(false);
                }
            },
            error: (err) => {
                setFormError(`CSV Parsing Error: ${err.message}`);
                setLoading(false);
            }
        });
    };

    return (
        <ModalOverlay onClose={onClose}>
            <form
                onSubmit={handleSubmit}
                className="bg-white dark:bg-[#050b14] rounded-3xl shadow-2xl w-full max-w-2xl mx-auto border border-ncc-navy/5 dark:border-white/5 flex flex-col max-h-[92vh]"
            >
                <div className="p-8 pb-6 border-b border-ncc-navy/5 dark:border-white/5 shrink-0 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-3">
                            <div className="w-10 h-10 bg-ncc-navy/5 rounded-xl flex items-center justify-center text-ncc-gold">
                                <Award className="w-6 h-6 text-amber-600 dark:text-ncc-gold" />
                            </div>
                            Bulk Upload Results
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-white/70 mt-1 font-bold uppercase tracking-widest">Upload results for cadets of this college unit</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                        <XCircle className="w-6 h-6 text-gray-400 dark:text-white/80" />
                    </button>
                </div>

                <div className="p-8 py-6 flex-1 overflow-y-auto ncc-scrollbar">
                    {formError && (
                        <div className="mb-6">
                            <ErrorDisplay message={formError} />
                        </div>
                    )}

                    <div className="bg-ncc-navy/5 dark:bg-white/5 p-6 rounded-2xl mb-8 border border-ncc-navy/5 dark:border-white/10">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-sm font-black text-ncc-navy dark:text-white uppercase tracking-widest">
                                CSV Structure
                            </p>
                            <button 
                                type="button" 
                                onClick={downloadTemplate}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-ncc-navy text-white px-3 py-1.5 rounded-lg hover:bg-ncc-navy/90 transition-all"
                            >
                                <Download className="w-3 h-3" /> Template
                            </button>
                        </div>
                        <div className="bg-white dark:bg-[#0a1628] p-4 rounded-xl text-[10px] font-mono break-words border border-gray-200 dark:border-white/5 uppercase text-gray-600 dark:text-white/70 leading-relaxed shadow-inner overflow-y-auto max-h-32 ncc-scrollbar">
                            Required: <strong className="text-ncc-red">{REQUIRED_HEADERS.join(', ')}</strong>
                            <br />
                            Optional: {OPTIONAL_HEADERS.join(', ')}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-3 font-bold italic">
                            * Note: Results will be linked to cadets matching their regimental number.
                        </p>
                    </div>

                    <div className="mb-2">
                        <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-3">
                            Upload Data File <span className="text-ncc-red">*</span>
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-0 bg-ncc-navy/5 dark:bg-white/5 rounded-2xl border-2 border-dashed border-ncc-navy/20 dark:border-white/20 group-hover:border-ncc-navy dark:group-hover:border-white transition-colors pointer-events-none flex flex-col items-center justify-center">
                                <FileText className="w-8 h-8 text-ncc-navy/40 dark:text-white/40 mb-2" />
                                <span className="text-xs font-bold text-gray-500 dark:text-white/60">Click or drag CSV file here</span>
                            </div>
                            <input
                                id="csv-file-input"
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                required
                                className="w-full h-32 opacity-0 cursor-pointer"
                            />
                        </div>
                        {file && (
                            <div className="mt-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                <XCircle className="w-4 h-4" onClick={() => setFile(null)} style={{cursor: 'pointer'}} />
                                Selected: {file.name}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 shrink-0 border-t border-ncc-navy/5 dark:border-white/5 flex justify-end gap-4 rounded-b-3xl">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !file}
                        className="ncc-btn ncc-btn-primary px-8 py-3 text-xs shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader className="animate-spin w-4 h-4 mr-2 inline" />
                                Processing...
                            </>
                        ) : (
                            'Import Results'
                        )}
                    </button>
                </div>
            </form>
        </ModalOverlay>
    );
};
