import React, { useState, useMemo } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { Award, Search, CheckCircle, XCircle, Filter, Upload, Download, Edit, Trash2, Star, Sparkles } from '../../components/Icons.jsx';
import { CertificateUploadModal } from '../Cadets/CertificateUploadModal.jsx';
import { generateResultCertificatePDF } from '../../utils/pdfGenerator.js';
import { updateDoc, doc } from 'firebase/firestore';
import { getCollectionRef } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';

export const ResultsView = () => {
    const { cadets, quizAttempts } = useDataContext();
    const { userRole, userEnrollmentId } = useAuthContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedCertificate, setSelectedCertificate] = useState('All');
    
    // Holds { cadet, existingCert }
    const [certModalData, setCertModalData] = useState(null);

    const displayCadets = useMemo(() => {
        if (!cadets) return [];
        let list = cadets;
        
        if (userRole === 'cadet') {
            list = cadets.filter(c => c.enrollmentId === userEnrollmentId);
        } else {
            // Apply Filters for Admin/Officer
            if (selectedCategory !== 'All') {
                list = list.filter((c) => (c.enrollmentId || c.regimentalNumber || '').toUpperCase().includes(selectedCategory));
            }
            if (selectedCertificate !== 'All') {
                list = list.filter((c) => {
                    const rawCert = c.certificate || c.B || '';
                    const cadetCert = typeof rawCert === 'string' ? rawCert.trim().toUpperCase() : String(rawCert);
                    return cadetCert === selectedCertificate.toUpperCase();
                });
            }
        }

        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            list = list.filter(c => c.name?.toLowerCase().includes(q) || c.enrollmentId?.toLowerCase().includes(q));
        }
        return list;
    }, [cadets, userRole, userEnrollmentId, searchTerm, selectedCategory, selectedCertificate]);

    const handleDeleteCert = async (cadet, certId) => {
        if (!window.confirm("Are you sure you want to delete these marks?")) return;
        try {
            const cadetRef = doc(getCollectionRef('cadets'), cadet.id);
            const updatedCerts = cadet.certifications.filter(c => c.id !== certId);
            await updateDoc(cadetRef, { certifications: updatedCerts });
            toast.success("Marks deleted successfully!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete marks.");
        }
    };

    return (
        <div className="w-full space-y-6 fade-in p-4 lg:p-8 lg:pt-2 h-[calc(100vh-100px)] flex flex-col">
            <header className="flex flex-col md:flex-row md:items-start justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-3xl font-display font-black text-ncc-navy dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 rounded-xl shadow-inner">
                            <Award className="w-8 h-8 text-amber-600 dark:text-ncc-gold" />
                        </div>
                        Results & Certifications
                    </h2>
                    <p className="text-gray-500 dark:text-white/70 text-sm mt-1 font-medium">
                        {userRole === 'admin' || userRole === 'officer' ? 'View and filter examination results for all cadets' : 'Your examination and certification results'}
                    </p>
                </div>
                
                {(userRole === 'admin' || userRole === 'officer') && (
                    <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-[#0a1628] p-1.5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm mt-2 md:mt-0">
                        <div className="flex items-center gap-2 px-3 border-r border-gray-200 dark:border-white/10">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filters</span>
                        </div>
                        <div className="ncc-filter-group !mb-0 !bg-transparent border-none p-0 flex gap-1">
                            {['All', 'SD', 'SW'].map((cat) => (
                                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${selectedCategory === cat ? 'bg-gray-100 dark:bg-white/10 text-ncc-navy dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                                    {cat === 'All' ? 'All Div.' : cat}
                                </button>
                            ))}
                        </div>
                        <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1 hidden sm:block"></div>
                        <div className="ncc-filter-group !mb-0 !bg-transparent border-none p-0 flex gap-1">
                            {['All', 'B1', 'B2', 'C'].map((cert) => (
                                <button key={cert} onClick={() => setSelectedCertificate(cert)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${selectedCertificate === cert ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                                    {cert === 'All' ? 'All Certs' : cert}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </header>

            <div className="ncc-card overflow-hidden flex flex-col min-h-0 flex-1 border border-gray-200 dark:border-white/10 shadow-lg bg-white/50 dark:bg-[#0a1628]/50 backdrop-blur-xl">
                {(userRole === 'admin' || userRole === 'officer') && (
                    <div className="p-4 border-b border-gray-200 dark:border-white/10 shrink-0 bg-white dark:bg-[#0a1628]">
                        <div className="relative w-full max-w-lg group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-ncc-navy dark:group-focus-within:text-ncc-gold transition-colors" />
                            <input
                                type="text"
                                placeholder="Search cadet by name or reg no..."
                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ncc-navy/20 dark:focus:ring-ncc-gold/30 transition-all dark:text-white"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                )}
                
                <div className="overflow-y-auto p-4 md:p-6 space-y-6 ncc-scrollbar">
                    {displayCadets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center fade-in">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-gray-300 dark:text-white/20" />
                            </div>
                            <p className="text-gray-500 dark:text-white/60 font-medium">No results found matching your criteria.</p>
                            {searchTerm && <button onClick={() => setSearchTerm('')} className="mt-2 text-ncc-navy dark:text-ncc-gold text-sm font-bold hover:underline">Clear Search</button>}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {displayCadets.map(cadet => {
                                const hasCerts = cadet.certifications && Array.isArray(cadet.certifications) && cadet.certifications.length > 0;
                                const primaryCert = hasCerts ? cadet.certifications[0] : null;

                                return (
                                <div key={cadet.id} className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-white/10 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-1 transition-all duration-300">
                                    {(userRole === 'admin' || userRole === 'officer') && (
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 pb-5 border-b border-gray-100 dark:border-white/5 gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-ncc-navy to-blue-900 text-ncc-gold rounded-2xl flex items-center justify-center font-display font-black text-xl shadow-inner overflow-hidden border-2 border-ncc-navy/10 dark:border-white/10 shrink-0">
                                                    {(cadet.photoUrl || cadet.photoURL) ? (
                                                        <img src={cadet.photoUrl || cadet.photoURL} alt={cadet.name || 'Cadet'} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>{cadet.name?.[0] || 'C'}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-lg text-ncc-navy dark:text-white tracking-tight">{cadet.name || 'Cadet'}</h3>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">{cadet.enrollmentId || 'N/A'}</span>
                                                        {cadet.certificate && <span className="text-[10px] font-bold uppercase text-ncc-navy dark:text-ncc-gold bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-700/50">{cadet.certificate}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Action Buttons */}
                                            {hasCerts ? (
                                                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                                    <button 
                                                        onClick={() => setCertModalData({ cadet, existingCert: primaryCert })}
                                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                        Edit
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteCert(cadet, primaryCert.id)}
                                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Delete
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => setCertModalData({ cadet, existingCert: null })}
                                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-ncc-navy to-blue-900 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:shadow-lg hover:shadow-blue-900/20 hover:-translate-y-0.5 transition-all duration-300 group"
                                                >
                                                    <div className="bg-white/10 p-1 rounded-md group-hover:bg-white/20 transition-colors hidden sm:block">
                                                        <Upload className="w-3.5 h-3.5 text-ncc-gold" />
                                                    </div>
                                                    <Upload className="w-4 h-4 text-ncc-gold sm:hidden" />
                                                    Upload Marks
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    
                                    <div className="grid grid-cols-1 md:max-w-3xl gap-8">
                                        {/* Official Certifications */}
                                        <div className="bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl p-5 border border-gray-100 dark:border-white/5">
                                            <h4 className="text-[11px] font-black uppercase text-gray-400 dark:text-white/40 mb-4 tracking-widest flex items-center gap-2">
                                                <Award className="w-3.5 h-3.5" /> Official Certificates
                                            </h4>
                                            {(!cadet.certifications || !Array.isArray(cadet.certifications) || cadet.certifications.length === 0) ? (
                                                <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                                                    <p className="text-sm text-gray-400 italic">No official certificates recorded.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {cadet.certifications.map((cert, idx) => {
                                                        const isDistinction = cert.finalGrade === 'A' || cert.finalGrade === 'A+';
                                                        return (
                                                        <div key={`cert-${idx}`} className={isDistinction ? 
                                                            "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-100/50 dark:from-amber-900/40 dark:to-yellow-900/20 border-2 border-amber-400 dark:border-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.4)] relative overflow-hidden group transition-all gap-4 transform hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(251,191,36,0.6)]" :
                                                            "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/20 dark:to-[#0a1628] border border-amber-200/60 dark:border-amber-700/30 shadow-sm relative overflow-hidden group hover:shadow-md transition-all gap-4 hover:-translate-y-1"
                                                        }>
                                                            {/* Background glow and shine for Distinction */}
                                                            {isDistinction && (
                                                                <>
                                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/30 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none animate-pulse"></div>
                                                                    <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 dark:via-amber-400/20 to-transparent pointer-events-none animate-[shine_3s_infinite_ease-in-out]"></div>
                                                                </>
                                                            )}
                                                            {!isDistinction && (
                                                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/10 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                                                            )}
                                                            
                                                            <div className="relative z-10 flex-1">
                                                                <div className="font-black text-ncc-navy dark:text-white flex items-center gap-2.5 text-base sm:text-lg flex-wrap">
                                                                    <div className={`p-1.5 rounded-lg shadow-inner ${isDistinction ? 'bg-amber-400 text-ncc-navy shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'}`}>
                                                                        <Award className={`w-4 h-4 ${isDistinction ? 'animate-bounce-subtle' : ''}`} />
                                                                    </div>
                                                                    <span className={isDistinction ? "gold-shimmer drop-shadow-md" : ""}>{cert.certLevel.replace(' Certificate', '')} Certificate</span>
                                                                    {isDistinction && (
                                                                        <span className="flex items-center gap-1 text-[10px] bg-gradient-to-r from-amber-400 to-yellow-500 text-ncc-navy font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm ml-2 animate-bounce-subtle">
                                                                            <Sparkles className="w-3 h-3" />
                                                                            Distinction
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-gray-500 dark:text-white/60 mt-3 font-medium flex flex-wrap items-center gap-2 sm:gap-3">
                                                                    <span className={`px-2 py-1 rounded-md border ${isDistinction ? 'bg-amber-100/50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5'}`}>Theory: <strong className="text-ncc-navy dark:text-white">{cert.theoryMarks}</strong>/{cert.theoryMax}</span>
                                                                    <span className={`px-2 py-1 rounded-md border ${isDistinction ? 'bg-amber-100/50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5'}`}>Prac: <strong className="text-ncc-navy dark:text-white">{cert.practicalMarks}</strong>/{cert.practicalMax}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-left sm:text-right relative z-10 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-0 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-amber-100 dark:border-white/5 sm:border-t-0">
                                                                <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-0">
                                                                    <div className={`text-xl sm:text-3xl font-black tracking-tight flex items-center gap-1 ${
                                                                        cert.finalGrade === 'Fail' ? 'text-red-500 drop-shadow-[0_2px_10px_rgba(239,68,68,0.2)]' : 
                                                                        isDistinction ? 'text-amber-500 drop-shadow-[0_2px_15px_rgba(245,158,11,0.5)]' :
                                                                        'text-emerald-500 drop-shadow-[0_2px_10px_rgba(16,185,129,0.2)]'
                                                                    }`}>
                                                                        {cert.finalGrade === 'Fail' ? 'FAIL' : `${cert.finalGrade}`}
                                                                        {isDistinction && <Star className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />}
                                                                    </div>
                                                                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded text-center inline-block sm:mt-1 ${isDistinction ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' : 'text-gray-400 bg-gray-100 dark:bg-white/10'}`}>{cert.year}</div>
                                                                </div>
                                                                
                                                                {cert.finalGrade !== 'Fail' && (
                                                                    <button 
                                                                        onClick={() => generateResultCertificatePDF(cadet, cert)}
                                                                        className={`sm:mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-[10px] font-black uppercase tracking-wider shadow-sm hover:shadow-md ${isDistinction ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-ncc-navy hover:brightness-110' : 'bg-ncc-navy text-white hover:bg-blue-900'}`}
                                                                    >
                                                                        <Download className="w-3 h-3" />
                                                                        Download
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )})}
                                                </div>
                                            )}
                                        </div>


                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            {certModalData && (
                <CertificateUploadModal 
                    cadet={certModalData.cadet} 
                    existingCert={certModalData.existingCert} 
                    onClose={() => setCertModalData(null)} 
                />
            )}
        </div>
    );
};
