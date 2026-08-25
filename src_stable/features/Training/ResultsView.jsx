// src/features/Training/ResultsView.jsx
import React, { useState, useMemo } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import {
    Award, Search, Upload, Download, Edit, Trash2,
    Star, Sparkles, GraduationCap, MapPin, ChevronLeft,
    Lock, Check, X, Users, Filter, FileText
} from '../../components/Icons.jsx';
import { CertificateUploadModal } from '../Cadets/CertificateUploadModal.jsx';
import { BulkResultsImportModal } from './BulkResultsImportModal.jsx';
import { generateResultCertificatePDF } from '../../utils/pdfGenerator.js';
import { updateDoc, doc } from 'firebase/firestore';
import { getCollectionRef } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';

// Grade rank label helpers
const GRADE_COLORS = {
    A:    'bg-gradient-to-r from-amber-400 to-yellow-500 text-ncc-navy font-black shadow-[0_0_16px_rgba(251,191,36,0.5)]',
    B:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    C:    'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    D:    'bg-red-500/10 text-red-600 dark:text-red-400',
    Fail: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const GradeBadge = ({ grade }) => (
    <span className={`px-3 py-1 rounded-lg text-xs font-black tracking-wider ${GRADE_COLORS[grade] || 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}>
        {grade === 'A' ? '★ GRADE A' : `GRADE ${grade}`}
    </span>
);

export const ResultsView = () => {
    const { cadets, units, selectedCollege, setSelectedCollege } = useDataContext();
    const { userRole, userEnrollmentId, userInstitutionId } = useAuthContext();

    const isBattalionAdmin = userRole === 'superadmin' || userRole === 'battalion_admin';
    const isANO = userRole === 'admin' || userRole === 'officer';
    const isCadet = userRole === 'cadet';

    // College selection state (admin only)
    const [selectedUnitSubdomain, setSelectedUnitSubdomain] = useState(
        isBattalionAdmin ? (selectedCollege !== 'All' ? selectedCollege : null) : (isANO ? userInstitutionId : null)
    );

    // Keep selectedUnitSubdomain in sync with top header selectedCollege dropdown
    React.useEffect(() => {
        if (isBattalionAdmin) {
            if (selectedCollege && selectedCollege !== 'All') {
                setSelectedUnitSubdomain(selectedCollege);
            } else {
                setSelectedUnitSubdomain(null);
            }
        }
    }, [selectedCollege, isBattalionAdmin]);

    const [collegeSearch, setCollegeSearch] = useState('');

    // Cadet list filters
    const [searchTerm, setSearchTerm]       = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedCertificate, setSelectedCertificate] = useState('All');

    // Modal state
    const [certModalData, setCertModalData] = useState(null);
    const [showBulkModal, setShowBulkModal] = useState(false);

    // College list for admin
    const collegesList = useMemo(() => units.filter(u => !u.isBattalion), [units]);
    const filteredColleges = useMemo(() => {
        const q = collegeSearch.toLowerCase();
        let list = collegesList;
        if (selectedCollege && selectedCollege !== 'All') {
            list = list.filter(u => u.subdomain === selectedCollege);
        }
        return list.filter(u =>
            (u.collegeName || '').toLowerCase().includes(q) ||
            (u.location || '').toLowerCase().includes(q)
        );
    }, [collegesList, collegeSearch, selectedCollege]);

    const currentUnit = useMemo(() => {
        if (!selectedUnitSubdomain) return null;
        return units.find(u => u.subdomain === selectedUnitSubdomain);
    }, [units, selectedUnitSubdomain]);

    // Downloads are allowed if the unit is approved in Firestore, OR if current user is Battalion Admin (bypasses restriction)
    const isDownloadAllowed = useMemo(() => {
        if (isBattalionAdmin) return true;
        
        const targetSubdomain = isCadet 
            ? (cadets.find(c => c.enrollmentId === userEnrollmentId)?.institutionId)
            : selectedUnitSubdomain;
            
        if (!targetSubdomain) return false;
        
        const unitObj = units.find(u => u.subdomain === targetSubdomain);
        return unitObj?.allowCertDownload === true;
    }, [isBattalionAdmin, isCadet, cadets, userEnrollmentId, selectedUnitSubdomain, units]);

    // Cadets to show
    const displayCadets = useMemo(() => {
        if (!cadets) return [];
        let list = cadets;

        if (isCadet) {
            return cadets.filter(c => c.enrollmentId === userEnrollmentId);
        }

        // ANO or Admin scoped to a college
        if (selectedUnitSubdomain) {
            list = list.filter(c => c.status !== 'alumni' && c.institutionId === selectedUnitSubdomain);
        }

        if (selectedCategory !== 'All') {
            list = list.filter(c => (c.enrollmentId || '').toUpperCase().includes(selectedCategory));
        }
        if (selectedCertificate !== 'All') {
            list = list.filter(c => {
                const rawCert = c.certificate || c.B || '';
                return String(rawCert).trim().toUpperCase() === selectedCertificate.toUpperCase();
            });
        }
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            list = list.filter(c => c.name?.toLowerCase().includes(q) || c.enrollmentId?.toLowerCase().includes(q));
        }

        return list;
    }, [cadets, isCadet, userEnrollmentId, selectedUnitSubdomain, selectedCategory, selectedCertificate, searchTerm]);

    const handleDeleteCert = async (cadet, certId) => {
        if (!window.confirm('Are you sure you want to delete these marks?')) return;
        try {
            const cadetRef = doc(getCollectionRef('cadets'), cadet.id);
            const updated = (cadet.certifications || []).filter(c => c.id !== certId);
            await updateDoc(cadetRef, { certifications: updated });
            toast.success('Marks deleted successfully!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete marks.');
        }
    };

    // ── Admin: College Selection Grid ───────────────────────────────────────
    if (isBattalionAdmin && !selectedUnitSubdomain) {
        return (
            <div className="w-full space-y-6 fade-in p-4 lg:p-8 lg:pt-2">
                {/* Header */}
                <header>
                    <h2 className="text-3xl font-display font-black text-ncc-navy dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 rounded-xl shadow-inner">
                            <Award className="w-8 h-8 text-amber-600 dark:text-ncc-gold" />
                        </div>
                        Results &amp; Certifications
                    </h2>
                    <p className="text-gray-500 dark:text-white/70 text-sm mt-1 font-medium">
                        Select a college to manage exam results and upload ranks for cadets.
                    </p>
                </header>

                {/* Search bar + count */}
                <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-ncc-navy dark:group-focus-within:text-ncc-gold transition-colors" />
                        <input
                            type="text"
                            placeholder="Search colleges by name or location..."
                            value={collegeSearch}
                            onChange={e => setCollegeSearch(e.target.value)}
                            className="w-full bg-transparent text-xs outline-none text-ncc-navy dark:text-white placeholder-gray-400 font-bold pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border dark:border-white/10 rounded-xl"
                        />
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-black uppercase tracking-wider pr-1">
                        Active College Units: {collegesList.length}
                    </span>
                </div>

                {/* College Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredColleges.map(unit => {
                        const collegeCadets = cadets.filter(c => c.status !== 'alumni' && c.institutionId === unit.subdomain);
                        const withResults = collegeCadets.filter(c => c.certifications?.length > 0).length;
                        const initials = (unit.collegeName || '??')
                            .split(' ').filter(w => w.length > 1).slice(0, 2)
                            .map(w => w[0].toUpperCase()).join('');

                        return (
                            <div
                                key={unit.subdomain}
                                onClick={() => {
                                    setSelectedUnitSubdomain(unit.subdomain);
                                    setSearchTerm('');
                                    setSelectedCategory('All');
                                    setSelectedCertificate('All');
                                }}
                                className="group bg-white dark:bg-slate-900 border dark:border-white/10 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                            >
                                <div className="p-5 space-y-4 flex-1">
                                    {/* Header Gradient */}
                                    <div
                                        className="h-20 rounded-2xl relative overflow-hidden flex items-center justify-center"
                                        style={{ background: `linear-gradient(135deg, ${unit.primaryColor || '#1B3A6B'} 0%, ${unit.secondaryColor || '#B8830E'} 100%)` }}
                                    >
                                        <span className="absolute text-3xl font-black text-white/10 font-display select-none">{initials}</span>
                                        <GraduationCap className="w-8 h-8 text-white/90 drop-shadow-md" />
                                        <div className="absolute top-2 right-2">
                                            <span className="text-[9px] font-mono font-bold bg-black/30 text-white/90 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                                /{unit.subdomain}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Text Info */}
                                    <div>
                                        <h4 className="font-bold text-base text-ncc-navy dark:text-white truncate" title={unit.collegeName}>
                                            {unit.collegeName}
                                        </h4>
                                        <p className="text-[10px] text-ncc-gold uppercase tracking-wider font-extrabold mt-0.5">{unit.unitName}</p>
                                        <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                            <MapPin className="w-3 h-3 text-red-500" />
                                            <span>{unit.location}</span>
                                        </div>
                                    </div>

                                    {/* Counts */}
                                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 flex justify-between items-center text-xs">
                                        <div className="text-center flex-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Cadets</p>
                                            <p className="font-black text-ncc-navy dark:text-white mt-0.5">{collegeCadets.length}</p>
                                        </div>
                                        <div className="w-px h-6 bg-gray-200 dark:bg-white/10" />
                                        <div className="text-center flex-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">With Results</p>
                                            <p className="font-black text-amber-600 dark:text-ncc-gold mt-0.5">{withResults}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="px-5 py-3 border-t dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                                        Results Portal
                                    </span>
                                    <span className="text-[10px] font-black text-ncc-navy dark:text-ncc-gold tracking-wider uppercase flex items-center gap-1">
                                        <FileText className="w-3 h-3" /> View &amp; Upload
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── Results detail view (Admin scoped to college, ANO, or Cadet) ─────────
    return (
        <div className="w-full space-y-6 fade-in p-4 lg:p-8 lg:pt-2 h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-start justify-between gap-4 shrink-0">
                <div>
                    {isBattalionAdmin && (
                        <button
                            onClick={() => {
                                if (selectedCollege !== 'All') setSelectedCollege('All');
                                setSelectedUnitSubdomain(null);
                                setSearchTerm('');
                                setSelectedCategory('All');
                                setSelectedCertificate('All');
                            }}
                            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-ncc-navy hover:text-ncc-red dark:text-white dark:hover:text-ncc-gold transition-colors mb-3"
                        >
                            <ChevronLeft className="w-4 h-4" /> Back to Colleges
                        </button>
                    )}
                    <h2 className="text-3xl font-display font-black text-ncc-navy dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 rounded-xl shadow-inner">
                            <Award className="w-8 h-8 text-amber-600 dark:text-ncc-gold" />
                        </div>
                        {isCadet ? 'My Results' : `Results — ${currentUnit?.collegeName || 'All Cadets'}`}
                    </h2>
                    <p className="text-gray-500 dark:text-white/70 text-sm mt-1 font-medium">
                        {isCadet
                            ? 'Your examination and certification results'
                            : isBattalionAdmin
                                ? 'Upload, edit or delete individual cadet results for this college.'
                                : 'View examination results for all cadets in your college.'}
                    </p>
                </div>

                {/* Filters — Admin & ANO only */}
                {!isCadet && (
                    <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-[#0a1628] p-1.5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm mt-2 md:mt-0">
                        <div className="flex items-center gap-2 px-3 border-r border-gray-200 dark:border-white/10">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filters</span>
                        </div>
                        <div className="flex gap-1">
                            {['All', 'SD', 'SW'].map(cat => (
                                <button key={cat} onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${selectedCategory === cat ? 'bg-gray-100 dark:bg-white/10 text-ncc-navy dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                                    {cat === 'All' ? 'All Div.' : cat}
                                </button>
                            ))}
                        </div>
                        <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1 hidden sm:block" />
                        <div className="flex gap-1">
                            {['All', 'B1', 'B2', 'C'].map(cert => (
                                <button key={cert} onClick={() => setSelectedCertificate(cert)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${selectedCertificate === cert ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                                    {cert === 'All' ? 'All Certs' : cert}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </header>

            {/* Search (admin & ANO) */}
            <div className="ncc-card overflow-hidden flex flex-col min-h-0 flex-1 border border-gray-200 dark:border-white/10 shadow-lg bg-white/50 dark:bg-[#0a1628]/50 backdrop-blur-xl">
                {!isCadet && (
                    <div className="p-4 border-b border-gray-200 dark:border-white/10 shrink-0 bg-white dark:bg-[#0a1628] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="relative w-full max-w-lg group flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-ncc-navy dark:group-focus-within:text-ncc-gold transition-colors" />
                            <input
                                type="text"
                                placeholder="Search cadet by name or reg no..."
                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ncc-navy/20 dark:focus:ring-ncc-gold/30 transition-all dark:text-white"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {isBattalionAdmin && (
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 shadow-md hover:shadow-lg shrink-0"
                            >
                                <Upload className="w-4 h-4" /> Bulk Upload Results
                            </button>
                        )}
                    </div>
                )}

                {/* Cadet Results List */}
                <div className="overflow-y-auto p-4 md:p-6 space-y-6 ncc-scrollbar">
                    {displayCadets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center fade-in">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-gray-300 dark:text-white/20" />
                            </div>
                            <p className="text-gray-500 dark:text-white/60 font-medium">No results found matching your criteria.</p>
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="mt-2 text-ncc-navy dark:text-ncc-gold text-sm font-bold hover:underline">
                                    Clear Search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {displayCadets.map(cadet => {
                                const hasCerts = Array.isArray(cadet.certifications) && cadet.certifications.length > 0;
                                const primaryCert = hasCerts ? cadet.certifications[0] : null;
                                const isDistinction = primaryCert?.finalGrade === 'A';

                                return (
                                    <div
                                        key={cadet.id}
                                        className={`rounded-3xl border p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden ${
                                            isDistinction
                                                ? 'bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-[#0a1628] border-amber-400 dark:border-amber-500 shadow-[0_0_30px_rgba(251,191,36,0.25)]'
                                                : 'bg-white dark:bg-[#0a1628] border-gray-200 dark:border-white/10'
                                        }`}
                                    >
                                        {/* Distinction glow effects */}
                                        {isDistinction && (
                                            <>
                                                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-400/20 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none animate-pulse" />
                                                <div className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/30 dark:via-amber-400/10 to-transparent pointer-events-none animate-[shine_4s_infinite_ease-in-out]" />
                                            </>
                                        )}

                                        {/* Cadet header row — admin & ANO */}
                                        {!isCadet && (
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 pb-5 border-b border-gray-100 dark:border-white/5 gap-4 relative z-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-ncc-navy to-blue-900 text-ncc-gold rounded-2xl flex items-center justify-center font-display font-black text-xl shadow-inner overflow-hidden border-2 border-ncc-navy/10 dark:border-white/10 shrink-0">
                                                        {(cadet.photoUrl || cadet.photoURL) ? (
                                                            <img src={cadet.photoUrl || cadet.photoURL} alt={cadet.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span>{cadet.name?.[0] || 'C'}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-lg text-ncc-navy dark:text-white tracking-tight flex items-center gap-2">
                                                            {cadet.name || 'Cadet'}
                                                            {isDistinction && (
                                                                <span className="flex items-center gap-1 text-[10px] bg-gradient-to-r from-amber-400 to-yellow-500 text-ncc-navy font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm animate-bounce-subtle">
                                                                    <Sparkles className="w-3 h-3" /> A Rank
                                                                </span>
                                                            )}
                                                        </h3>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">{cadet.enrollmentId || 'N/A'}</span>
                                                            {cadet.certificate && (
                                                                <span className="text-[10px] font-bold uppercase text-ncc-navy dark:text-ncc-gold bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-700/50">
                                                                    {cadet.certificate}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Upload / Edit / Delete — only Battalion Admin */}
                                                {isBattalionAdmin && (
                                                    hasCerts ? (
                                                        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                                            <button
                                                                onClick={() => setCertModalData({ cadet, existingCert: primaryCert })}
                                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                                            >
                                                                <Edit className="w-3.5 h-3.5" /> Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCert(cadet, primaryCert.id)}
                                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setCertModalData({ cadet, existingCert: null })}
                                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-ncc-navy to-blue-900 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:shadow-lg hover:shadow-blue-900/20 hover:-translate-y-0.5 transition-all duration-300 group"
                                                        >
                                                            <Upload className="w-4 h-4 text-ncc-gold" /> Upload Marks
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        )}

                                        {/* Result Cards */}
                                        <div className="grid grid-cols-1 gap-5 relative z-10">
                                            <div className="bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl p-5 border border-gray-100 dark:border-white/5">
                                                <h4 className="text-[11px] font-black uppercase text-gray-400 dark:text-white/40 mb-4 tracking-widest flex items-center gap-2">
                                                    <Award className="w-3.5 h-3.5" /> Official Certificates
                                                </h4>

                                                {!hasCerts ? (
                                                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                                                        <p className="text-sm text-gray-400 italic">
                                                            {isBattalionAdmin ? 'No results uploaded yet. Click "Upload Marks" to add.' : 'Results not yet uploaded by the Battalion Admin.'}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {cadet.certifications.map((cert, idx) => {
                                                            const isDist = cert.finalGrade === 'A';
                                                            return (
                                                                <div
                                                                    key={`cert-${idx}`}
                                                                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl relative overflow-hidden transition-all gap-4 ${
                                                                        isDist
                                                                            ? 'bg-gradient-to-r from-yellow-50 to-amber-100/50 dark:from-amber-900/40 dark:to-yellow-900/20 border-2 border-amber-400 dark:border-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.4)] hover:shadow-[0_0_30px_rgba(251,191,36,0.6)] hover:-translate-y-1 group'
                                                                            : 'bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 hover:shadow-md hover:-translate-y-0.5'
                                                                    }`}
                                                                >
                                                                    {isDist && (
                                                                        <>
                                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/30 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none animate-pulse" />
                                                                            <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 dark:via-amber-400/20 to-transparent pointer-events-none animate-[shine_3s_infinite_ease-in-out]" />
                                                                        </>
                                                                    )}

                                                                    <div className="relative z-10 flex-1">
                                                                        <div className="font-black text-ncc-navy dark:text-white flex items-center gap-2.5 text-base sm:text-lg flex-wrap">
                                                                            <div className={`p-1.5 rounded-lg shadow-inner ${isDist ? 'bg-amber-400 text-ncc-navy shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'}`}>
                                                                                <Award className={`w-4 h-4 ${isDist ? 'animate-bounce-subtle' : ''}`} />
                                                                            </div>
                                                                            <span className={isDist ? 'gold-shimmer drop-shadow-md' : ''}>
                                                                                {cert.certLevel.replace(' Certificate', '')} Certificate
                                                                            </span>
                                                                            {isDist && (
                                                                                <span className="flex items-center gap-1 text-[10px] bg-gradient-to-r from-amber-400 to-yellow-500 text-ncc-navy font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm ml-2 animate-bounce-subtle">
                                                                                    <Sparkles className="w-3 h-3" /> Distinction
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 dark:text-white/60 mt-3 font-medium flex flex-wrap items-center gap-2 sm:gap-3">
                                                                            <span className={`px-2.5 py-1 rounded-md border ${isDist ? 'bg-amber-100/50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
                                                                                Theory: <strong className="text-ncc-navy dark:text-white">{cert.theoryMarks}</strong>/{cert.theoryMax}
                                                                            </span>
                                                                            <span className={`px-2.5 py-1 rounded-md border ${isDist ? 'bg-amber-100/50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
                                                                                Prac: <strong className="text-ncc-navy dark:text-white">{cert.practicalMarks}</strong>/{cert.practicalMax}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="text-left sm:text-right relative z-10 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-0 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-amber-100 dark:border-white/5 sm:border-t-0">
                                                                        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-0">
                                                                            <div className={`text-xl sm:text-3xl font-black tracking-tight flex items-center gap-1 ${
                                                                                cert.finalGrade === 'Fail' ? 'text-red-500 drop-shadow-[0_2px_10px_rgba(239,68,68,0.2)]' :
                                                                                isDist ? 'text-amber-500 drop-shadow-[0_2px_15px_rgba(245,158,11,0.5)]' :
                                                                                'text-emerald-500 drop-shadow-[0_2px_10px_rgba(16,185,129,0.2)]'
                                                                            }`}>
                                                                                {cert.finalGrade === 'Fail' ? 'FAIL' : cert.finalGrade}
                                                                                {isDist && <Star className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />}
                                                                            </div>
                                                                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded text-center inline-block sm:mt-1 ${isDist ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' : 'text-gray-400 bg-gray-100 dark:bg-white/10'}`}>
                                                                                {cert.year}
                                                                            </div>
                                                                        </div>

                                                                        {cert.finalGrade !== 'Fail' && (
                                                                            isDownloadAllowed ? (
                                                                                <button
                                                                                    onClick={() => generateResultCertificatePDF(cadet, cert)}
                                                                                    className={`sm:mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-[10px] font-black uppercase tracking-wider shadow-sm hover:shadow-md ${isDist ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-ncc-navy hover:brightness-110' : 'bg-ncc-navy text-white hover:bg-blue-900'}`}
                                                                                >
                                                                                    <Download className="w-3 h-3" /> Download
                                                                                </button>
                                                                            ) : (
                                                                                <span className="sm:mt-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase flex items-center gap-1 border border-dashed dark:border-white/10 px-3 py-1.5 rounded-lg bg-gray-50/50 dark:bg-white/[0.02] inline-flex items-center">
                                                                                    <Lock className="w-3.5 h-3.5 text-red-500/50 mr-1" /> Locked
                                                                                </span>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
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

            {/* Upload/Edit Modal — admin only */}
            {certModalData && (
                <CertificateUploadModal
                    cadet={certModalData.cadet}
                    existingCert={certModalData.existingCert}
                    onClose={() => setCertModalData(null)}
                />
            )}

            {/* Bulk Upload Modal — admin only */}
            {showBulkModal && (
                <BulkResultsImportModal
                    institutionId={selectedUnitSubdomain}
                    onClose={() => setShowBulkModal(false)}
                />
            )}
        </div>
    );
};
