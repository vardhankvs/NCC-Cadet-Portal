// src/features/Cadets/CadetForm.jsx
import React, { useState, useRef } from 'react';
import {
    XCircle, Loader, Mail, Phone, List, Briefcase, User,
    ImageIcon, Trash2, Shield, Calendar, Droplet, MapPin,
    Upload, CheckCircle,
} from '../../components/Icons.jsx';
import { saveCadet } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';
import { sendPushToAll } from '../../firebase/pushNotifications.js';

/**
 * Compresses an image File to a Base64 JPEG string using canvas.
 * Max dimension: 300px. Quality: 0.72. Result is ~15-40KB — safe for Firestore.
 */
const compressImageToBase64 = (file, maxDim = 300, quality = 0.72) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = url;
    });

const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// ── Reusable Field Components ────────────────────────────────────────────────

const Field = ({ label, icon: Icon, children, className = '' }) => (
    <div className={`space-y-1.5 ${className}`}>
        <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-ncc-navy/50 dark:text-white/40">
            {Icon && <Icon className="w-3 h-3" />}
            {label}
        </label>
        {children}
    </div>
);

const inputCls = `w-full bg-white dark:bg-[#0a1628] border border-ncc-navy/10 dark:border-white/10
    focus:border-ncc-gold/60 focus:ring-2 focus:ring-ncc-gold/10 outline-none
    rounded-xl px-4 py-3 text-sm font-semibold text-ncc-navy dark:text-white
    placeholder:text-gray-300 dark:placeholder:text-white/20
    transition-all duration-200`;

const TextInput = ({ name, value, onChange, placeholder = '', type = 'text', required = false }) => (
    <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={inputCls}
    />
);

const TextArea = ({ name, value, onChange, placeholder = '' }) => (
    <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={2}
        className={`${inputCls} resize-none`}
    />
);

const PillSelect = ({ name, value, onChange, options, colorMap = {} }) => (
    <div className="flex flex-wrap gap-2">
        {options.map(opt => {
            const active = value === opt;
            const color = colorMap[opt] || 'ncc-navy';
            return (
                <button
                    key={opt}
                    type="button"
                    onClick={() => onChange({ target: { name, value: opt } })}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border-2 transition-all duration-150 ${
                        active
                            ? 'bg-ncc-navy text-ncc-gold border-ncc-navy shadow-lg shadow-ncc-navy/20 scale-105'
                            : 'bg-transparent text-ncc-navy/50 dark:text-white/40 border-ncc-navy/10 dark:border-white/10 hover:border-ncc-navy/30 dark:hover:border-white/30'
                    }`}
                >
                    {opt}
                </button>
            );
        })}
    </div>
);

const NativeSelect = ({ name, value, onChange, options }) => (
    <select name={name} value={value} onChange={onChange} className={inputCls}>
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
);

// ── Section header ───────────────────────────────────────────────────────────
const SectionHeading = ({ icon: Icon, label }) => (
    <div className="flex items-center gap-3 mb-5">
        <div className="w-7 h-7 bg-ncc-navy rounded-lg flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-ncc-gold" />
        </div>
        <h3 className="text-xs font-black text-ncc-navy dark:text-white uppercase tracking-[0.2em]">{label}</h3>
        <div className="flex-1 h-px bg-ncc-navy/5 dark:bg-white/5" />
    </div>
);

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'identity', label: 'Identity' },
    { id: 'contact',  label: 'Contact'  },
    { id: 'medical',  label: 'Medical'  },
];

// ── Main Component ────────────────────────────────────────────────────────────
export const CadetForm = ({ currentCadet, onSaveSuccess, onCancel }) => {
    const isEditMode = !!currentCadet;
    const fileInputRef = useRef(null);
    const [activeTab, setActiveTab] = useState('identity');

    const [formData, setFormData] = useState({
        name:             currentCadet?.name || '',
        enrollmentId:     currentCadet?.enrollmentId || currentCadet?.regimentalNumber || '',
        jntuNo:           currentCadet?.jntuNo || '',
        rank:             currentCadet?.rank || 'CDT',
        certificate:      currentCadet?.certificate || currentCadet?.B || 'NA',
        fatherName:       currentCadet?.fatherName || '',
        motherName:       currentCadet?.motherName || '',
        year:             currentCadet?.year || '',
        branch:           currentCadet?.branch || '',
        aadhaarNumber:    currentCadet?.aadhaarNumber || '',
        phonePersonal:    currentCadet?.phonePersonal || currentCadet?.phone || '',
        phoneParents:     currentCadet?.phoneParents || '',
        personalEmail:    currentCadet?.personalEmail || '',
        collegeEmail:     currentCadet?.collegeEmail || '',
        bloodGroup:       currentCadet?.bloodGroup || '',
        addressPresent:   currentCadet?.addressPresent || currentCadet?.address || '',
        addressPermanent: currentCadet?.addressPermanent || '',
        hostelerType:     currentCadet?.hostelerType || 'Days scholar',
        ecaCca:           currentCadet?.ecaCca || '',
        dob:              formatDateForInput(currentCadet?.dob),
    });

    // Photo
    const [photoFile, setPhotoFile]         = useState(null);
    const [photoPreview, setPhotoPreview]   = useState(currentCadet?.photoUrl || currentCadet?.photoURL || '');
    const [photoFileName, setPhotoFileName] = useState('');
    const [isDragging, setIsDragging]       = useState(false);

    const [formError, setFormError] = useState(null);
    const [loading, setLoading]     = useState(false);
    const [saved, setSaved]         = useState(false);

    const ranks         = ['CDT', 'LCPL', 'CPL', 'SGT', 'CSM', 'JUO', 'SUO'];
    const certificates  = ['NA', 'B1', 'B2', 'C'];
    const years         = ['1st', '2nd', '3rd', '4th'];
    const hostelerOpts  = ['Days scholar', 'Hosteler'];
    const bloodGroups   = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const processImageFile = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) { setFormError('Please choose a valid image (JPG, PNG, WEBP).'); return; }
        if (file.size > 5 * 1024 * 1024)    { setFormError('Image must be under 5 MB.'); return; }
        setFormError(null);
        setPhotoFile(file);
        setPhotoFileName(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => setPhotoPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); processImageFile(e.dataTransfer.files?.[0]); };
    const handleRemovePhoto = () => {
        setPhotoFile(null); setPhotoPreview(''); setPhotoFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        if (!isEditMode && (!formData.name || !formData.enrollmentId)) {
            setFormError('Name and Regimental Number are required.');
            setActiveTab('identity');
            return;
        }
        setLoading(true);
        try {
            let photoUrl = currentCadet?.photoUrl || currentCadet?.photoURL || '';
            if (photoFile) {
                toast.info('Compressing photo…', { autoClose: false, toastId: 'photo-upload' });
                photoUrl = await compressImageToBase64(photoFile);
                toast.dismiss('photo-upload');
            }
            await saveCadet({ ...formData, photoUrl }, currentCadet?.id);
            setSaved(true);
            toast.success(isEditMode ? 'Cadet updated!' : 'Cadet added!');
            if (!isEditMode) sendPushToAll('👤 Roster Updated', 'A new cadet has been added to the unit roster', 'hierarchy');
            setTimeout(() => onSaveSuccess(), 600);
        } catch (err) {
            toast.dismiss('photo-upload');
            setFormError(err.message);
            toast.error(`Error: ${err.message}`);
            setLoading(false);
        }
    };


    const initials = formData.name
        ? formData.name.split(' ').map(s => s[0] || '').join('').slice(0, 2).toUpperCase()
        : '?';

    const certColor = { C: 'text-yellow-400', B2: 'text-blue-300', B1: 'text-green-300', NA: 'text-white/40' };

    return (
        <div className="w-full max-w-xl mx-auto bg-white dark:bg-[#050b14] rounded-3xl shadow-2xl max-h-[92vh] flex flex-col">

            {/* ── Hero Header ──────────────────────────────────────────────── */}
            <div className="relative bg-ncc-navy px-6 pt-6 pb-10 shrink-0 rounded-t-3xl overflow-hidden">
                {/* Close */}
                <button
                    type="button" onClick={onCancel}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                >
                    <XCircle className="w-4 h-4 text-white/70" />
                </button>

                <div className="flex items-center gap-5">
                    {/* Photo / Initials */}
                    <div className="relative shrink-0">
                        <div
                            className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-ncc-gold/40 bg-ncc-navy/60 flex items-center justify-center shadow-xl cursor-pointer group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {photoPreview
                                ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover group-hover:opacity-70 transition-opacity" />
                                : <span className="text-white font-bold text-2xl group-hover:opacity-50 transition-opacity">{initials}</span>
                            }
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Upload className="w-5 h-5 text-ncc-gold" />
                            </div>
                        </div>
                        {photoPreview && (
                            <button
                                type="button" onClick={handleRemovePhoto}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow"
                            >
                                <XCircle className="w-3 h-3 text-white" />
                            </button>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*"
                            onChange={e => processImageFile(e.target.files?.[0])} className="hidden" />
                    </div>

                    {/* Name & Meta */}
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-3.5 h-3.5 text-ncc-gold shrink-0" />
                            <span className="text-[10px] font-black text-ncc-gold uppercase tracking-[0.2em]">
                                {isEditMode ? 'Edit Cadet Record' : 'New Cadet Enrolment'}
                            </span>
                        </div>
                        <h2 className="text-xl font-display font-bold text-white truncate">
                            {formData.name || <span className="text-white/30 italic">Full Name</span>}
                        </h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {formData.enrollmentId && (
                                <span className="font-mono text-xs text-white/50">{formData.enrollmentId}</span>
                            )}
                            {formData.rank && (
                                <span className="px-2 py-0.5 bg-ncc-gold/10 rounded text-ncc-gold text-[10px] font-black uppercase tracking-widest">
                                    {formData.rank}
                                </span>
                            )}
                            {formData.certificate && (
                                <span className={`text-[10px] font-black uppercase tracking-widest ${certColor[formData.certificate] || 'text-white/40'}`}>
                                    {formData.certificate}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Drag-drop hint */}
                {isDragging && (
                    <div
                        className="absolute inset-0 bg-ncc-gold/20 border-4 border-dashed border-ncc-gold rounded-3xl flex items-center justify-center z-20"
                        onDragOver={e => e.preventDefault()}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        <p className="text-ncc-gold font-bold text-sm">Drop photo here</p>
                    </div>
                )}
            </div>

            {/* ── Tab Bar ──────────────────────────────────────────────────── */}
            <div
                className="shrink-0 -mt-5 mx-4 bg-white dark:bg-[#0a1628] rounded-2xl shadow-lg border border-ncc-navy/5 dark:border-white/5 flex overflow-hidden z-10 relative"
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            >
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${
                            activeTab === tab.id
                                ? 'bg-ncc-navy text-ncc-gold'
                                : 'text-ncc-navy/40 dark:text-white/30 hover:text-ncc-navy dark:hover:text-white'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Error ────────────────────────────────────────────────────── */}
            {formError && (
                <div className="mx-4 mt-3 shrink-0 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
            )}

            {/* ── Scrollable Content ────────────────────────────────────────── */}
            <form id="cadet-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-6">

                {/* ── TAB: IDENTITY ── */}
                {activeTab === 'identity' && (
                    <div className="space-y-5 fade-in">
                        <SectionHeading icon={User} label="Core Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Full Name" icon={User} className="sm:col-span-2">
                                <TextInput name="name" value={formData.name} onChange={handleChange}
                                    placeholder="e.g. Ravi Kumar" required={!isEditMode} />
                            </Field>
                            <Field label="Regimental Number">
                                <TextInput name="enrollmentId" value={formData.enrollmentId} onChange={handleChange}
                                    placeholder="e.g. AP18SD0001" required={!isEditMode} />
                            </Field>
                            <Field label="JNTU Number" icon={List}>
                                <TextInput name="jntuNo" value={formData.jntuNo} onChange={handleChange}
                                    placeholder="e.g. 23341A05A7" />
                            </Field>
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-ncc-navy/50 dark:text-white/40 mb-3">Rank</p>
                            <PillSelect name="rank" value={formData.rank} onChange={handleChange} options={ranks} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-ncc-navy/50 dark:text-white/40 mb-3">Certificate</p>
                            <PillSelect name="certificate" value={formData.certificate} onChange={handleChange} options={certificates} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-ncc-navy/50 dark:text-white/40 mb-3">Year</p>
                            <PillSelect name="year" value={formData.year} onChange={handleChange} options={years} />
                        </div>

                        <SectionHeading icon={Briefcase} label="Academic" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Branch" icon={Briefcase}>
                                <TextInput name="branch" value={formData.branch} onChange={handleChange} placeholder="e.g. CSE" />
                            </Field>
                            <Field label="Date of Birth" icon={Calendar}>
                                <TextInput name="dob" value={formData.dob} onChange={handleChange} type="date" />
                            </Field>
                        </div>

                        <SectionHeading icon={User} label="Family" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Father's Name">
                                <TextInput name="fatherName" value={formData.fatherName} onChange={handleChange} placeholder="Father's full name" />
                            </Field>
                            <Field label="Mother's Name">
                                <TextInput name="motherName" value={formData.motherName} onChange={handleChange} placeholder="Mother's full name" />
                            </Field>
                            <Field label="Aadhaar Number" className="sm:col-span-2">
                                <TextInput name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} placeholder="12-digit Aadhaar" />
                            </Field>
                        </div>
                    </div>
                )}

                {/* ── TAB: CONTACT ── */}
                {activeTab === 'contact' && (
                    <div className="space-y-5 fade-in">
                        <SectionHeading icon={Phone} label="Phone Numbers" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Personal Phone" icon={Phone}>
                                <TextInput name="phonePersonal" value={formData.phonePersonal} onChange={handleChange} type="tel" placeholder="9876543210" />
                            </Field>
                            <Field label="Parents Phone" icon={Phone}>
                                <TextInput name="phoneParents" value={formData.phoneParents} onChange={handleChange} type="tel" placeholder="9876543210" />
                            </Field>
                        </div>

                        <SectionHeading icon={Mail} label="Email Addresses" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Personal Email" icon={Mail}>
                                <TextInput name="personalEmail" value={formData.personalEmail} onChange={handleChange} type="email" placeholder="you@gmail.com" />
                            </Field>
                            <Field label="College Email" icon={Mail}>
                                <TextInput name="collegeEmail" value={formData.collegeEmail} onChange={handleChange} type="email" placeholder="you@institution.ac.in" />
                            </Field>
                        </div>

                        <SectionHeading icon={MapPin} label="Addresses" />
                        <div className="space-y-4">
                            <Field label="Present Address" icon={MapPin}>
                                <TextArea name="addressPresent" value={formData.addressPresent} onChange={handleChange} placeholder="Current residential address" />
                            </Field>
                            <Field label="Permanent Address" icon={MapPin}>
                                <TextArea name="addressPermanent" value={formData.addressPermanent} onChange={handleChange} placeholder="Permanent / hometown address" />
                            </Field>
                        </div>
                    </div>
                )}

                {/* ── TAB: MEDICAL ── */}
                {activeTab === 'medical' && (
                    <div className="space-y-5 fade-in">
                        <SectionHeading icon={Droplet} label="Medical Info" />
                        <Field label="Blood Group" icon={Droplet}>
                            <div className="flex flex-wrap gap-2">
                                {bloodGroups.map(bg => (
                                    <button
                                        key={bg} type="button"
                                        onClick={() => handleChange({ target: { name: 'bloodGroup', value: bg } })}
                                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest border-2 transition-all ${
                                            formData.bloodGroup === bg
                                                ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20 scale-105'
                                                : 'bg-transparent text-ncc-navy/50 dark:text-white/40 border-ncc-navy/10 dark:border-white/10 hover:border-red-300'
                                        }`}
                                    >
                                        {bg}
                                    </button>
                                ))}
                            </div>
                        </Field>

                        <SectionHeading icon={Shield} label="Status" />
                        <Field label="Accommodation Type">
                            <div className="flex gap-3">
                                {hostelerOpts.map(opt => (
                                    <button
                                        key={opt} type="button"
                                        onClick={() => handleChange({ target: { name: 'hostelerType', value: opt } })}
                                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all ${
                                            formData.hostelerType === opt
                                                ? 'bg-ncc-navy text-ncc-gold border-ncc-navy shadow-lg'
                                                : 'bg-transparent text-ncc-navy/50 dark:text-white/40 border-ncc-navy/10 dark:border-white/10 hover:border-ncc-navy/30'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </Field>

                        <Field label="ECA / CCA Activities">
                            <TextInput name="ecaCca" value={formData.ecaCca} onChange={handleChange}
                                placeholder="e.g. Basketball, Debate Club" />
                        </Field>
                    </div>
                )}
            </form>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <div className="shrink-0 px-4 py-4 border-t border-ncc-navy/5 dark:border-white/5 bg-white dark:bg-[#050b14] flex items-center justify-between gap-3 rounded-b-3xl">
                {/* Tab navigation arrows */}
                <div className="flex gap-2">
                    {TABS.findIndex(t => t.id === activeTab) > 0 && (
                        <button
                            type="button"
                            onClick={() => setActiveTab(TABS[TABS.findIndex(t => t.id === activeTab) - 1].id)}
                            className="px-4 py-2.5 text-xs font-bold text-ncc-navy/60 dark:text-white/40 hover:text-ncc-navy dark:hover:text-white border border-ncc-navy/10 dark:border-white/10 rounded-xl transition-all hover:bg-ncc-navy/5"
                        >
                            ← Back
                        </button>
                    )}
                    {TABS.findIndex(t => t.id === activeTab) < TABS.length - 1 && (
                        <button
                            type="button"
                            onClick={() => setActiveTab(TABS[TABS.findIndex(t => t.id === activeTab) + 1].id)}
                            className="px-4 py-2.5 text-xs font-bold text-ncc-navy/60 dark:text-white/40 hover:text-ncc-navy dark:hover:text-white border border-ncc-navy/10 dark:border-white/10 rounded-xl transition-all hover:bg-ncc-navy/5"
                        >
                            Next →
                        </button>
                    )}
                </div>

                <div className="flex gap-2 ml-auto">
                    <button
                        type="button" onClick={onCancel} disabled={loading}
                        className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-ncc-navy/60 dark:text-white/40 border border-ncc-navy/10 dark:border-white/10 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 disabled:opacity-40 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit" form="cadet-form" disabled={loading || saved}
                        className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all shadow-lg disabled:opacity-60 ${
                            saved
                                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                : 'bg-ncc-navy text-ncc-gold shadow-ncc-navy/20 hover:shadow-ncc-navy/40 hover:scale-[1.02]'
                        }`}
                    >
                        {loading ? (
                            <><Loader className="w-3.5 h-3.5 animate-spin" /> {photoFile ? 'Uploading…' : 'Saving…'}</>
                        ) : saved ? (
                            <><CheckCircle className="w-3.5 h-3.5" /> Saved!</>
                        ) : (
                            isEditMode ? 'Update Cadet' : 'Add Cadet'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
