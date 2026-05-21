// src/features/Analytics/CertificateGenerator.jsx
import React, { useMemo, useState } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { generateNominalRollPDF, generateCertificateApplicationPDF } from '../../utils/pdfGenerator.js';
import { Award, Download, Users, FileText, Filter } from '../../components/Icons.jsx';
import { toast } from 'react-toastify';

const CERT_OPTIONS = ['All', 'A', 'B1', 'B2', 'C'];
const DIV_OPTIONS  = ['All', 'SD', 'SW'];

export const CertificateGenerator = () => {
    const { cadets } = useDataContext();

    const [certFilter, setCertFilter] = useState('All');
    const [divFilter,  setDivFilter]  = useState('All');
    const [search,     setSearch]     = useState('');
    const [generating, setGenerating] = useState(null); // 'bulk' | cadetId
    const [venue,      setVenue]      = useState('');
    const [eventDate,  setEventDate]  = useState('');

    const activeCadets = useMemo(() => cadets.filter(c => c.status !== 'alumni'), [cadets]);

    const filtered = useMemo(() => {
        return activeCadets.filter(c => {
            const cert = c.certificate || c.B || '';
            const reg  = (c.enrollmentId || c.regimentalNumber || '').toUpperCase();
            const div  = reg.includes('SW') ? 'SW' : 'SD';

            const certMatch = certFilter === 'All' || cert === certFilter;
            const divMatch  = divFilter  === 'All' || div  === divFilter;
            const nameMatch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.enrollmentId?.toLowerCase().includes(search.toLowerCase());

            return certMatch && divMatch && nameMatch;
        });
    }, [activeCadets, certFilter, divFilter, search]);

    const handleBulkDownload = (numberType) => {
        if (filtered.length === 0) return;
        setGenerating('bulk');
        try {
            const title = [
                'Nominal Roll',
                certFilter !== 'All' ? `– Cert ${certFilter}` : '',
                divFilter  !== 'All' ? `(${divFilter})`       : '',
            ].filter(Boolean).join(' ');
            const filename = `NominalRoll_${certFilter}_${divFilter}_${Date.now()}.pdf`;
            generateNominalRollPDF(filtered, title, filename, numberType, venue, eventDate);
        } catch (err) {
            console.error('Nominal Roll PDF error:', err);
            toast.error('PDF generation failed. See console for details.');
        } finally {
            setTimeout(() => setGenerating(null), 1200);
        }
    };

    const handleIndividualDownload = (cadet) => {
        setGenerating(cadet.id);
        try {
            generateCertificateApplicationPDF(cadet);
        } catch (err) {
            console.error('Certificate PDF error:', err);
            toast.error('Certificate generation failed. See console for details.');
        } finally {
            setTimeout(() => setGenerating(null), 1200);
        }
    };

    const certColor = {
        'A':  'bg-gray-100 dark:bg-[#0d2137] text-gray-700 dark:text-white/90',
        'B1': 'bg-emerald-100 text-emerald-700',
        'B2': 'bg-blue-100 text-blue-700',
        'C':  'bg-amber-100 text-amber-800',
    };

    return (
        <div className="space-y-8 fade-in">
            {/* Header */}
            <header className="bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-[0.25em] mb-1">Admin Tool</p>
                        <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-3">
                            <Award className="w-7 h-7 text-ncc-gold" /> Certificate Generator
                        </h2>
                        <p className="text-gray-400 dark:text-white/80 text-sm mt-1">Generate exam application forms and nominal rolls for any subset of cadets.</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="Exam/Event Venue"
                                value={venue}
                                onChange={e => setVenue(e.target.value)}
                                className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ncc-navy/30 text-gray-800 dark:text-white bg-gray-50 dark:bg-[#0a1628] font-medium"
                            />
                            <input
                                type="date"
                                value={eventDate}
                                onChange={e => setEventDate(e.target.value)}
                                className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ncc-navy/30 text-gray-800 dark:text-white bg-gray-50 dark:bg-[#0a1628] font-medium"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => handleBulkDownload('regimental')}
                                disabled={filtered.length === 0 || generating === 'bulk'}
                                className="flex-1 flex items-center justify-center gap-2 bg-ncc-navy text-white font-black text-sm px-4 py-2.5 rounded-xl hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
                            >
                                <Download className="w-4 h-4" />
                                Regimental No
                            </button>
                            <button
                                onClick={() => handleBulkDownload('jntu')}
                                disabled={filtered.length === 0 || generating === 'bulk'}
                                className="flex-1 flex items-center justify-center gap-2 bg-ncc-navy text-white font-black text-sm px-4 py-2.5 rounded-xl hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
                            >
                                <Download className="w-4 h-4" />
                                JNTU No
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] shadow-sm">
                <div className="flex items-center justify-center gap-2 mb-6">
                    <Filter className="w-4 h-4 text-ncc-navy dark:text-white" />
                    <h3 className="text-xs font-black text-gray-500 dark:text-white/70 uppercase tracking-widest">Filter Cadets</h3>
                </div>
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                    {/* Certificate */}
                    <div className="flex flex-col items-center">
                        <label className="block text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-2">Certificate Level</label>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {CERT_OPTIONS.map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => setCertFilter(opt)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${certFilter === opt ? 'bg-ncc-navy text-white shadow' : 'bg-gray-100 dark:bg-[#0d2137] text-gray-600 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                                >
                                    {opt === 'All' ? 'All Certs' : `Cert ${opt}`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Division */}
                    <div className="flex flex-col items-center">
                        <label className="block text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-2">Division</label>
                        <div className="flex flex-col items-center gap-2">
                            <button
                                onClick={() => setDivFilter('All')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${divFilter === 'All' ? 'bg-ncc-navy text-white shadow' : 'bg-gray-100 dark:bg-[#0d2137] text-gray-600 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                            >
                                All Divisions
                            </button>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setDivFilter('SD')}
                                    className={`px-6 py-1.5 rounded-lg text-xs font-black transition-all ${divFilter === 'SD' ? 'bg-ncc-navy text-white shadow' : 'bg-gray-100 dark:bg-[#0d2137] text-gray-600 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                                >
                                    SD
                                </button>
                                <button
                                    onClick={() => setDivFilter('SW')}
                                    className={`px-6 py-1.5 rounded-lg text-xs font-black transition-all ${divFilter === 'SW' ? 'bg-ncc-navy text-white shadow' : 'bg-gray-100 dark:bg-[#0d2137] text-gray-600 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                                >
                                    SW
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center w-full max-w-xs">
                        <label className="block text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-2">Search</label>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Name or Reg. No…"
                            className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ncc-navy/30 text-black bg-white font-bold"
                        />
                    </div>
                </div>

                {/* Result count */}
                <div className="mt-6 flex justify-center items-center gap-2 text-xs text-gray-500 dark:text-white/70 font-bold">
                    <Users className="w-4 h-4" />
                    <span><span className="text-ncc-navy dark:text-white font-black">{filtered.length}</span> cadets match the current filters</span>
                </div>
            </div>

            {/* Cadet Table */}
            <div className="bg-white dark:bg-[#050b14] rounded-2xl border border-[#ddd8cc] shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#ddd8cc] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-ncc-navy dark:text-white" />
                    <h3 className="text-xs font-black text-gray-500 dark:text-white/70 uppercase tracking-widest">Eligible Cadets</h3>
                </div>

                {filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <Award className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 dark:text-white/80 font-bold text-sm">No cadets match the selected filters.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filtered.map((cadet, idx) => {
                            const cert = cadet.certificate || cadet.B || '—';
                            const reg  = (cadet.enrollmentId || '').toUpperCase();
                            const div  = reg.includes('SW') ? 'SW' : reg.includes('SD') ? 'SD' : '—';
                            const isLoading = generating === cadet.id;

                            return (
                                <div key={cadet.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 dark:bg-[#0a1628] transition-colors group">
                                    <span className="text-xs font-black text-gray-300 w-6 text-right shrink-0">{idx + 1}</span>

                                    <div className="w-9 h-9 rounded-xl bg-ncc-navy text-ncc-gold flex items-center justify-center text-xs font-black shrink-0">
                                        {cadet.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-ncc-navy dark:text-white truncate">{cadet.name}</p>
                                        <p className="text-[10px] font-mono text-gray-400 dark:text-white/80">{cadet.enrollmentId}</p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-ncc-navy/10 text-ncc-navy dark:text-white">{cadet.rank || 'CDT'}</span>
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${certColor[cert] || 'bg-gray-100 dark:bg-[#0d2137] text-gray-500 dark:text-white/70'}`}>
                                            {cert !== '—' ? `Cert ${cert}` : '—'}
                                        </span>
                                        <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-gray-100 dark:bg-[#0d2137] text-gray-600 dark:text-white/80">{div}</span>
                                    </div>

                                    <button
                                        onClick={() => handleIndividualDownload(cadet)}
                                        disabled={!!generating}
                                        className="flex items-center gap-1.5 text-xs font-black text-ncc-navy dark:text-white border border-ncc-navy/20 rounded-xl px-3 py-2 hover:bg-ncc-navy hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        {isLoading ? '…' : 'Form'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
