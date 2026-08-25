import React, { useState, useMemo } from 'react';
import { X, ChevronRight, ChevronLeft, Users, GraduationCap } from '../../components/Icons.jsx';
import { saveCamp } from '../../firebase/firestoreService.js';
import { submitDelegatedTask } from '../../firebase/delegationWorkflowService.js';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { toast } from 'react-toastify';
import { sendPushToAll } from '../../firebase/pushNotifications.js';

const CAMP_TYPES = ['ATC', 'CATC', 'EBSB', 'RDC', 'TSC', 'NSC', 'VSC', 'SNIC', 'ALC', 'BLC', 'Trekking', 'Other'];

export const CampForm = ({ onClose, initialData = null }) => {
    const { userRole, actualRole, isDelegatedCadet, userInstitutionId, userEnrollmentId, userName, user } = useAuthContext();
    const isCadetUser = isDelegatedCadet || userRole === 'cadet' || actualRole === 'cadet';
    const { units = [] } = useDataContext();
    const colleges = useMemo(() => units.filter(u => !u.isBattalion), [units]);

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Step 1 — basic info
    const [formData, setFormData] = useState(initialData ? {
        name: initialData.name || '',
        type: initialData.type || 'ATC',
        location: initialData.location || '',
        startDate: initialData.startDate || '',
        endDate: initialData.endDate || '',
    } : {
        name: '',
        type: 'ATC',
        location: '',
        startDate: '',
        endDate: '',
    });

    // Step 2 — vacancies per college: { [subdomain]: number }
    const [vacancies, setVacancies] = useState(() => {
        if (initialData?.vacancies) return { ...initialData.vacancies };
        // Default 0 for each college
        const v = {};
        return v;
    });

    const [disallowedColleges, setDisallowedColleges] = useState(() => {
        if (initialData?.disallowedColleges) return [...initialData.disallowedColleges];
        return [];
    });

    const totalVacancies = useMemo(
        () => Object.values(vacancies).reduce((s, n) => s + (parseInt(n) || 0), 0),
        [vacancies]
    );

    const handleStep1Submit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.startDate || !formData.endDate || !formData.location) {
            toast.error('Please fill all required fields.');
            return;
        }
        setStep(2);
    };

    const handleFinalSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Convert vacancy values to integers, remove 0s, and ignore excluded colleges
            const cleanVacancies = {};
            Object.entries(vacancies).forEach(([k, v]) => {
                if (!disallowedColleges.includes(k)) {
                    const n = parseInt(v) || 0;
                    if (n > 0) cleanVacancies[k] = n;
                }
            });

            if (isCadetUser) {
                await submitDelegatedTask({
                    institutionId: userInstitutionId,
                    cadetEnrollmentId: userEnrollmentId,
                    cadetName: userName,
                    cadetUid: user?.uid,
                    moduleId: 'camps',
                    moduleName: 'Camps & Deployments',
                    actionType: initialData ? 'update' : 'create',
                    targetDocId: initialData?.id || null,
                    title: `Camp: ${formData.name} (${formData.type})`,
                    payload: {
                        ...formData,
                        vacancies: cleanVacancies,
                        disallowedColleges,
                        id: initialData?.id || null
                    }
                });
                toast.success('Camp draft submitted! Sent to Institution ANO for verification.');
                onClose();
                return;
            }

            await saveCamp({ ...formData, vacancies: cleanVacancies, disallowedColleges }, initialData?.id || null);
            toast.success(initialData ? 'Camp updated successfully!' : 'Camp created successfully!');
            if (!initialData) {
                sendPushToAll(
                    '🏕️ New Camp',
                    `${formData.name} (${formData.type}) has been announced. Check the Camps tab.`,
                    'camps'
                );
            }
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalWidth = step === 1 ? 'max-w-xl' : 'max-w-5xl';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 fade-in">
            <div className={`bg-white dark:bg-[#050b14] rounded-[2rem] shadow-2xl w-full ${modalWidth} modal-in overflow-hidden flex flex-col border border-gray-200 dark:border-white/10 max-h-[92vh] transition-all duration-300`}>

                {/* ── Header ── */}
                <div className="relative px-8 py-5 bg-gradient-to-r from-ncc-navy via-[#1a365d] to-ncc-navy flex-shrink-0 border-b border-white/10">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
                    <div className="relative z-10 pr-12">
                        {/* Step indicator */}
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${step === 1 ? 'bg-ncc-gold text-ncc-navy' : 'bg-white/20 text-white'}`}>1</div>
                            <div className={`flex-1 h-0.5 ${step === 2 ? 'bg-ncc-gold' : 'bg-white/20'}`} />
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${step === 2 ? 'bg-ncc-gold text-ncc-navy' : 'bg-white/20 text-white'}`}>2</div>
                        </div>
                        <p className="text-[10px] uppercase tracking-widest text-ncc-gold font-bold border border-ncc-gold/50 bg-ncc-gold/10 inline-block px-2 py-0.5 rounded mb-1 shadow-sm">
                            {step === 1 ? 'Step 1 of 2 — Camp Details' : 'Step 2 of 2 — College Vacancies'}
                        </p>
                        <h2 className="text-xl font-black font-display text-white tracking-tight">
                            {initialData ? 'Edit Camp' : (step === 1 ? 'Create New Camp' : 'Assign Vacancies')}
                        </h2>
                        {step === 2 && (
                            <p className="text-white/50 text-xs mt-0.5">Set the number of cadet slots for each college. ANOs will fill these slots.</p>
                        )}
                    </div>
                    <button onClick={onClose} className="absolute top-5 right-5 p-2.5 bg-white/5 hover:bg-red-500/20 rounded-full transition-colors group z-20">
                        <X className="w-4 h-4 text-white/60 group-hover:text-red-400 transition-colors" />
                    </button>
                </div>

                {/* ── Step 1: Camp Details ── */}
                {step === 1 && (
                    <form onSubmit={handleStep1Submit} className="p-7 space-y-5 overflow-y-auto flex-1 bg-gray-50 dark:bg-[#0a1628]">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1" htmlFor="campName">Camp Name *</label>
                            <input
                                id="campName"
                                type="text" required
                                className="w-full bg-white dark:bg-[#050b14] border-2 border-gray-200 dark:border-white/10 focus:border-ncc-gold rounded-xl px-4 py-3 text-sm font-bold text-ncc-navy dark:text-white transition-colors focus:outline-none shadow-sm"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Pre-RDC Phase I"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1" htmlFor="campType">Type</label>
                                <select id="campType"
                                    className="w-full bg-white dark:bg-[#050b14] border-2 border-gray-200 dark:border-white/10 focus:border-ncc-gold rounded-xl px-4 py-3 text-sm font-bold text-ncc-navy dark:text-white transition-colors focus:outline-none shadow-sm"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                    {CAMP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1" htmlFor="campLocation">Location *</label>
                                <input
                                    id="campLocation"
                                    type="text" required
                                    className="w-full bg-white dark:bg-[#050b14] border-2 border-gray-200 dark:border-white/10 focus:border-ncc-gold rounded-xl px-4 py-3 text-sm font-bold text-ncc-navy dark:text-white transition-colors focus:outline-none shadow-sm"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="City/Venue"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1" htmlFor="campStart">Start Date *</label>
                                <input id="campStart" type="date" required
                                    className="w-full bg-white dark:bg-[#050b14] border-2 border-gray-200 dark:border-white/10 focus:border-ncc-gold rounded-xl px-4 py-3 text-sm font-bold text-ncc-navy dark:text-white transition-colors focus:outline-none shadow-sm dark:[color-scheme:dark]"
                                    value={formData.startDate}
                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1" htmlFor="campEnd">End Date *</label>
                                <input id="campEnd" type="date" required
                                    className="w-full bg-white dark:bg-[#050b14] border-2 border-gray-200 dark:border-white/10 focus:border-ncc-gold rounded-xl px-4 py-3 text-sm font-bold text-ncc-navy dark:text-white transition-colors focus:outline-none shadow-sm dark:[color-scheme:dark]"
                                    value={formData.endDate}
                                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={onClose}
                                className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                Cancel
                            </button>
                            <button type="submit"
                                className="flex items-center gap-2 bg-ncc-gold hover:bg-[#d4a83a] text-ncc-navy px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-ncc-gold/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                Next — Set Vacancies <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                )}

                {/* ── Step 2: College Vacancies ── */}
                {step === 2 && (
                    <div className="flex flex-col flex-1 overflow-hidden bg-gray-50 dark:bg-[#0a1628]">
                        {/* Total badge */}
                        <div className="px-7 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
                            <p className="text-xs text-gray-500 dark:text-white/60">
                                Set <span className="font-black text-ncc-navy dark:text-white">0</span> to skip a college.
                            </p>
                            <div className="flex items-center gap-2 bg-ncc-navy dark:bg-white/10 text-white px-4 py-2 rounded-xl">
                                <Users className="w-4 h-4 text-ncc-gold" />
                                <span className="text-sm font-black">{totalVacancies} total slots</span>
                            </div>
                        </div>

                        {/* College list */}
                        <div className="overflow-y-auto flex-1 px-7 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
                            {colleges.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 text-sm col-span-full">
                                    No colleges found in this battalion.
                                </div>
                            ) : (
                                colleges.map(college => {
                                    const subdomain = college.subdomain || college.id;
                                    const val = vacancies[subdomain] ?? '';
                                    const isExcluded = disallowedColleges.includes(subdomain);
                                    return (
                                        <div key={subdomain}
                                            className={`flex items-center gap-4 bg-white dark:bg-[#050b14] border rounded-2xl px-5 py-4 shadow-sm transition-all duration-300 ${
                                                isExcluded 
                                                    ? 'border-red-200 dark:border-red-950/30 bg-red-50/10 dark:bg-red-950/5' 
                                                    : 'border-[#ddd8cc] dark:border-white/10'
                                            }`}>
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                isExcluded ? 'bg-red-500/10 text-red-500' : 'bg-ncc-navy/10 dark:bg-white/10 text-ncc-navy dark:text-white'
                                            }`}>
                                                <GraduationCap className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-black truncate ${isExcluded ? 'text-gray-400 dark:text-white/40 line-through' : 'text-ncc-navy dark:text-white'}`}>
                                                    {college.collegeName || college.name || subdomain}
                                                </p>
                                                {college.location && (
                                                    <p className="text-[10px] text-gray-400 dark:text-white/50 truncate">{college.location}</p>
                                                )}
                                            </div>

                                            {/* Exclude / Allow Toggle */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDisallowedColleges(prev => {
                                                        if (prev.includes(subdomain)) {
                                                            return prev.filter(id => id !== subdomain);
                                                        } else {
                                                            setVacancies(v => ({ ...v, [subdomain]: 0 }));
                                                            return [...prev, subdomain];
                                                        }
                                                    });
                                                }}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                                                    isExcluded 
                                                        ? 'bg-red-500 text-white shadow-sm shadow-red-500/20' 
                                                        : 'bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white'
                                                }`}
                                            >
                                                {isExcluded ? 'Excluded' : 'Allowed'}
                                            </button>

                                            {!isExcluded ? (
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setVacancies(v => ({ ...v, [subdomain]: Math.max(0, (parseInt(v[subdomain]) || 0) - 1) }))}
                                                        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-ncc-navy dark:text-white font-black text-lg hover:bg-gray-200 dark:hover:bg-white/20 transition"
                                                    >−</button>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="99"
                                                        value={val}
                                                        onChange={e => setVacancies(v => ({ ...v, [subdomain]: e.target.value }))}
                                                        onBlur={e => setVacancies(v => ({ ...v, [subdomain]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                                        className="w-14 text-center bg-white dark:bg-[#0a1628] border-2 border-gray-200 dark:border-white/10 focus:border-ncc-gold rounded-xl py-1.5 text-sm font-black text-ncc-navy dark:text-white focus:outline-none"
                                                        placeholder="0"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setVacancies(v => ({ ...v, [subdomain]: (parseInt(v[subdomain]) || 0) + 1 }))}
                                                        className="w-8 h-8 rounded-lg bg-ncc-navy dark:bg-white/10 flex items-center justify-center text-white font-black text-lg hover:bg-ncc-navy/80 dark:hover:bg-white/20 transition"
                                                    >+</button>
                                                </div>
                                            ) : (
                                                <div className="w-[110px] text-center text-xs text-red-500 font-bold uppercase tracking-wider italic">
                                                    Excluded
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-7 py-5 border-t border-[#ddd8cc] dark:border-white/10 flex gap-3 flex-shrink-0 bg-gray-50 dark:bg-[#0a1628]">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                            <button
                                type="button"
                                onClick={handleFinalSubmit}
                                disabled={isSubmitting}
                                className="flex-1 bg-ncc-gold hover:bg-[#d4a83a] disabled:opacity-70 text-ncc-navy px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-ncc-gold/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isSubmitting
                                    ? (initialData ? 'Updating...' : 'Creating...')
                                    : (isDelegatedCadet ? '✓ Submit for ANO Verification' : (initialData ? '✓ Update Camp' : '✓ Publish Camp'))}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
