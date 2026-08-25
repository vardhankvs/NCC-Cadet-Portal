// src/features/Staff/StaffForm.jsx
import React, { useState, useRef } from 'react';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { X, Loader, User, Award, Camera, Shield, Mail, Phone, Calendar, MapPin, GraduationCap, Briefcase } from '../../components/Icons.jsx';
import { saveStaff } from '../../firebase/firestoreService.js';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { toast } from 'react-toastify';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, appId, firebaseConfig, auth } from '../../firebase/config.js';

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

export const StaffForm = ({ currentStaff, onSaveSuccess, onCancel, targetInstitutionId }) => {
    const { userInstitutionId } = useAuthContext();

    const effectiveInstitutionId = 
        targetInstitutionId || 
        currentStaff?.institutionId || 
        (userInstitutionId && userInstitutionId !== '14a-bn-srikakulam' ? userInstitutionId : null) || 
        '14a-bn-srikakulam';

    const isBattalionStaff = effectiveInstitutionId === '14a-bn-srikakulam';

    const [formData, setFormData] = useState({
        name: currentStaff?.name || '',
        rank: currentStaff?.rank || '',
        email: currentStaff?.email || '',
        phone: currentStaff?.phone || '',
        dob: currentStaff?.dob || '',
        doj: currentStaff?.doj || '',
        address: currentStaff?.address || '',
        academicProfile: currentStaff?.academicProfile || '',
        professionalExperience: currentStaff?.professionalExperience || '',
        photoUrl: currentStaff?.photoUrl || '',
    });

    const [formError, setFormError] = useState(null);
    const [loading, setLoading] = useState(false);

    // Credentials Setup States
    const [createLoginAccount, setCreateLoginAccount] = useState(true);
    const [loginPassword, setLoginPassword] = useState('');

    // Photo Upload States
    const fileInputRef = useRef(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(currentStaff?.photoUrl || '');
    const [photoFileName, setPhotoFileName] = useState('');
    const [photoUploading, setPhotoUploading] = useState(false);

    const isEditMode = !!currentStaff?.id;

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setFormError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setFormError('Image file size must be less than 5MB.');
            return;
        }
        setFormError(null);
        setPhotoFile(file);
        setPhotoFileName(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => setPhotoPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = () => {
        setPhotoFile(null);
        setPhotoPreview('');
        setPhotoFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setFormData(prev => ({ ...prev, photoUrl: '' }));
    };

    const handleChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSendResetEmail = async () => {
        if (!formData.email.trim()) {
            toast.error('Email address is required to send a reset email.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, formData.email.trim().toLowerCase());
            toast.success(`Password reset email successfully sent to ${formData.email.trim().toLowerCase()}`);
        } catch (err) {
            toast.error('Failed to send reset email: ' + err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        if (!formData.name.trim() || !formData.rank.trim()) {
            setFormError('Name and Rank are required.');
            return;
        }

        setLoading(true);
        try {
            let uploadedPhotoUrl = formData.photoUrl;
            if (photoFile) {
                setPhotoUploading(true);
                toast.info('Compressing photo…', { autoClose: false, toastId: 'photo-upload' });
                uploadedPhotoUrl = await compressImageToBase64(photoFile);
                toast.dismiss('photo-upload');
                setPhotoUploading(false);
            }

            // Create login credentials if requested
            let createdAuthUid = null;
            if (!isBattalionStaff && !isEditMode && createLoginAccount) {
                if (!formData.email || !formData.email.trim()) {
                    throw new Error('Email address is required to create a portal login account.');
                }
                if (!loginPassword || loginPassword.length < 6) {
                    throw new Error('Password must be at least 6 characters long.');
                }

                const cleanEmail = formData.email.trim().toLowerCase();

                // Initialize secondary Firebase app to avoid signing out the current admin
                const appName = `temp-ano-signup-${Date.now()}`;
                const tempApp = initializeApp(firebaseConfig, appName);
                const tempAuth = getAuth(tempApp);

                try {
                    const userCredential = await createUserWithEmailAndPassword(
                        tempAuth,
                        cleanEmail,
                        loginPassword
                    );
                    createdAuthUid = userCredential.user.uid;
                    await deleteApp(tempApp);
                } catch (authError) {
                    await deleteApp(tempApp);

                    // If email is already registered in Firebase Auth, automatically reclaim / reassign via Admin API
                    if (authError.code === 'auth/email-already-in-use') {
                        const apiUrl = window.location.hostname.includes('vercel.app') 
                            ? '/api/updateUserCredentials' 
                            : 'https://ncc-portal-redesign.vercel.app/api/updateUserCredentials';

                        try {
                            const apiRes = await fetch(apiUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    action: 'reclaim',
                                    currentEmail: cleanEmail,
                                    newPassword: loginPassword,
                                    institutionId: effectiveInstitutionId,
                                    role: 'admin'
                                })
                            });

                            const apiData = await apiRes.json();
                            if (apiRes.ok && apiData.success) {
                                createdAuthUid = apiData.uid;
                                toast.info(`Account credentials for ${cleanEmail} re-assigned and ready.`);
                            } else {
                                throw new Error(apiData.error || 'The email address is in use and could not be reclaimed.');
                            }
                        } catch (reclaimErr) {
                            throw new Error(`Auth Account Error: ${reclaimErr.message}`);
                        }
                    } else {
                        let friendlyMessage = authError.message;
                        if (authError.code === 'auth/invalid-email') {
                            friendlyMessage = 'The email address is invalid.';
                        } else if (authError.code === 'auth/weak-password') {
                            friendlyMessage = 'The password is too weak.';
                        }
                        throw new Error(`Auth Account Creation Failed: ${friendlyMessage}`);
                    }
                }

                // Write/merge user document to Firestore users collection
                if (createdAuthUid) {
                    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
                    await setDoc(doc(usersRef, createdAuthUid), {
                        role: 'admin',
                        email: cleanEmail,
                        institutionId: effectiveInstitutionId,
                    }, { merge: true });
                }
            }

            // Sync email/password changes in Edit Mode if requested
            if (!isBattalionStaff && isEditMode) {
                const emailChanged = formData.email.trim().toLowerCase() !== (currentStaff.email || '').trim().toLowerCase();
                const passwordChanged = !!(loginPassword && loginPassword.length >= 6);

                if (passwordChanged && loginPassword.length < 6) {
                    throw new Error('New password must be at least 6 characters long.');
                }

                if (emailChanged || passwordChanged) {
                    let apiSuccess = false;
                    try {
                        // Call backend Vercel API which uses Firebase Admin SDK to update password/email in Firebase Auth
                        const apiUrl = window.location.hostname.includes('vercel.app') 
                            ? '/api/updateUserCredentials' 
                            : 'https://ncc-portal-redesign.vercel.app/api/updateUserCredentials';

                        const apiRes = await fetch(apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                currentEmail: (currentStaff.email || '').trim().toLowerCase(),
                                newEmail: formData.email.trim().toLowerCase(),
                                newPassword: passwordChanged ? loginPassword : undefined,
                                institutionId: effectiveInstitutionId,
                                role: 'admin'
                            })
                        });

                        const contentType = apiRes.headers.get('content-type') || '';
                        if (contentType.includes('application/json')) {
                            const apiData = await apiRes.json();
                            if (apiRes.ok && apiData.success) {
                                apiSuccess = true;
                                toast.success('ANO login credentials updated and old email released!');
                            }
                        }
                    } catch (apiErr) {
                        console.warn('API Credential update notice:', apiErr);
                    }

                    // Backup: Client-side Firestore sync
                    try {
                        const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
                        const q = query(usersRef, where('email', '==', (currentStaff.email || '').trim().toLowerCase()));
                        const querySnapshot = await getDocs(q);

                        if (!querySnapshot.empty) {
                            for (const userDoc of querySnapshot.docs) {
                                const updatePayload = {
                                    institutionId: effectiveInstitutionId,
                                    lastLogoutTime: serverTimestamp(),
                                    credentialsChangedAt: serverTimestamp(),
                                    sessionRevokedReason: 'credentials_changed',
                                    updatedAt: serverTimestamp()
                                };
                                if (emailChanged) {
                                    updatePayload.email = formData.email.trim().toLowerCase();
                                }
                                if (passwordChanged) {
                                    updatePayload.passwordUpdate = loginPassword;
                                }
                                await setDoc(userDoc.ref, updatePayload, { merge: true });
                            }
                        }
                    } catch (fsErr) {
                        console.warn('Client-side Firestore sync notice:', fsErr);
                    }
                }
            }

            const payload = {
                name: formData.name.trim(),
                rank: formData.rank.trim(),
                email: (formData.email || '').trim().toLowerCase(),
                phone: (formData.phone || '').trim(),
                dob: (formData.dob || '').trim(),
                doj: (formData.doj || '').trim(),
                address: (formData.address || '').trim(),
                academicProfile: (formData.academicProfile || '').trim(),
                professionalExperience: (formData.professionalExperience || '').trim(),
                photoUrl: uploadedPhotoUrl || '',
                priority: currentStaff?.priority ?? 999,
                institutionId: effectiveInstitutionId,
                category: isBattalionStaff ? 'battalion_staff' : 'ano',
                role: isBattalionStaff ? 'battalion_staff' : 'ano',
                staffType: isBattalionStaff ? 'battalion_staff' : 'ano',
            };

            await saveStaff(payload, currentStaff?.id);
            toast.success(isBattalionStaff ? 'Staff record saved successfully.' : (isEditMode ? 'Staff record updated.' : 'Staff member and login credentials registered successfully.'));
            onSaveSuccess();
        } catch (e) {
            toast.dismiss('photo-upload');
            setPhotoUploading(false);
            setFormError(e.message);
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-xl max-h-[90vh] overflow-y-auto ncc-scrollbar rounded-[2.5rem] bg-white dark:bg-[#050b14] p-8 shadow-2xl border border-[#ddd8cc] dark:border-white/10 relative"
        >
            {/* Gold accent bar */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-ncc-gold rounded-t-[2.5rem]" />

            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="flex items-center text-2xl font-display font-black text-ncc-navy dark:text-white uppercase tracking-tight">
                        <Award className="mr-3 h-7 w-7 text-ncc-navy dark:text-ncc-gold" />
                        {isBattalionStaff 
                            ? (isEditMode ? 'Edit Staff Member' : 'Add Staff Member') 
                            : (isEditMode ? 'Edit ANO Profile' : 'Register ANO')}
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-white/60 uppercase tracking-widest mt-1">
                        {isBattalionStaff ? '14(A) BN NCC Staff Registry' : 'Associate NCC Officer Registry'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-ncc-red transition-colors"
                >
                    <X className="h-6 w-6" />
                </button>
            </div>

            {formError && (
                <div className="mb-6">
                    <ErrorDisplay message={formError} />
                </div>
            )}

            {/* Two Column Grid */}
            <div className={isBattalionStaff ? "grid grid-cols-1 max-w-sm mx-auto gap-6 mb-6" : "grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"}>
                
                {/* Left Column: Personal details */}
                <div className="space-y-4">
                    {/* Profile Photo */}
                    <div className="flex flex-col items-center justify-center bg-gray-50/50 dark:bg-white/[0.02] p-4 rounded-3xl border border-gray-100 dark:border-white/5">
                        <div className="relative group">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-24 h-24 rounded-full overflow-hidden border-4 border-ncc-navy dark:border-ncc-gold/45 bg-gray-100 dark:bg-white/5 flex items-center justify-center shadow-xl cursor-pointer hover:scale-[1.03] transition-transform duration-200"
                            >
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <Camera className="w-8 h-8 text-gray-400 dark:text-white/45 group-hover:text-ncc-gold transition-colors" />
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full duration-200">
                                    <span className="text-[9px] font-black text-white uppercase tracking-widest">Change</span>
                                </div>
                            </div>
                            {photoPreview && (
                                <button
                                    type="button"
                                    onClick={handleRemovePhoto}
                                    className="absolute -top-1 -right-1 w-6 h-6 bg-ncc-red hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors border border-white/10"
                                    title="Remove Photo"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                            {photoFileName ? `Selected: ${photoFileName}` : 'Strategic Photo (Optional)'}
                        </p>
                        {photoUploading && (
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-ncc-navy dark:text-ncc-gold uppercase tracking-wider mt-1">
                                <Loader className="w-3 h-3 animate-spin" /> Uploading...
                            </div>
                        )}
                    </div>

                    {/* Grid for Name & Designation */}
                    <div className={isBattalionStaff ? "space-y-4" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
                        {/* Name */}
                        <div>
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                <User className="w-3 h-3 text-ncc-gold" /> Full Name <span className="text-ncc-red">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g. Col. Sashank Kushwah"
                                className="ncc-input text-xs font-bold"
                                required
                            />
                        </div>

                        {/* Rank */}
                        <div>
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                <Shield className="w-3 h-3 text-ncc-gold" /> Designation / Rank <span className="text-ncc-red">*</span>
                            </label>
                            <input
                                type="text"
                                name="rank"
                                value={formData.rank}
                                onChange={handleChange}
                                placeholder="e.g. Commanding Officer"
                                className="ncc-input text-xs font-bold"
                                required
                            />
                        </div>
                    </div>

                    {!isBattalionStaff && (
                        <>
                            {/* Grid for Email & Phone */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Email */}
                                <div>
                                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                        <Mail className="w-3 h-3 text-ncc-gold" /> Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="e.g. staffgmrit@ncc.unit"
                                        className="ncc-input text-xs font-bold"
                                    />
                                    <p className="text-[8px] text-gray-400 dark:text-white/40 mt-0.5">Used for ANO profile matching on login</p>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                        <Phone className="w-3 h-3 text-ncc-gold" /> Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="e.g. +91 9876543210"
                                        className="ncc-input text-xs font-bold"
                                    />
                                </div>
                            </div>

                            {/* Portal Login Credentials (only visible when adding a new staff/ANO) */}
                            {!isEditMode && (
                                <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-3xl space-y-3">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={createLoginAccount}
                                            onChange={(e) => setCreateLoginAccount(e.target.checked)}
                                            className="rounded border-gray-300 text-ncc-navy focus:ring-ncc-navy h-4 w-4"
                                        />
                                        <span className="text-xs font-black text-ncc-navy dark:text-white uppercase tracking-widest">
                                            Enable Portal Login Account
                                        </span>
                                    </label>
                                    
                                    {createLoginAccount && (
                                        <div className="space-y-3">
                                            <p className="text-[10px] text-gray-400 dark:text-white/40 leading-normal">
                                                An authentication account will be created directly using the email address provided above. Specify the initial login password below.
                                            </p>
                                            <div>
                                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                                    <Shield className="w-3 h-3 text-ncc-gold" /> Initial Password <span className="text-ncc-red">*</span>
                                                </label>
                                                <input
                                                    type="password"
                                                    value={loginPassword}
                                                    onChange={(e) => setLoginPassword(e.target.value)}
                                                    placeholder="Enter login password (min 6 characters)"
                                                    className="ncc-input text-xs font-bold"
                                                    required={createLoginAccount}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Portal Login Credentials (visible when editing an existing staff/ANO) */}
                            {isEditMode && (
                                <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-3xl space-y-3">
                                    <h4 className="text-xs font-black text-ncc-navy dark:text-white uppercase tracking-widest flex items-center gap-2">
                                        <Shield className="w-3 h-3 text-ncc-gold" /> Update Login Credentials
                                    </h4>
                                    <p className="text-[10px] text-gray-400 dark:text-white/40 leading-normal">
                                        Changing the email address above will automatically sync to their login credentials. You can also specify a new password below or send a password reset email.
                                    </p>
                                    
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                                <Shield className="w-3 h-3 text-ncc-gold" /> New Login Password
                                            </label>
                                            <input
                                                type="password"
                                                value={loginPassword}
                                                onChange={(e) => setLoginPassword(e.target.value)}
                                                placeholder="Leave blank to keep current password"
                                                className="ncc-input text-xs font-bold"
                                            />
                                            <p className="text-[8px] text-gray-400 dark:text-white/40 mt-0.5">Min 6 characters. Will sync automatically via cloud function.</p>
                                        </div>
                                        
                                        <div className="pt-2 border-t border-[#ddd8cc]/40 dark:border-white/5 flex items-center justify-between">
                                            <span className="text-[10px] text-gray-400 dark:text-white/40">Forgot or need a link?</span>
                                            <button
                                                type="button"
                                                onClick={handleSendResetEmail}
                                                className="px-3 py-1.5 text-[9px] font-black bg-ncc-navy dark:bg-ncc-gold text-white dark:text-ncc-navy rounded-lg uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-transform shadow"
                                            >
                                                Send Reset Email
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Grid for DOB & DOJ */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* DOB */}
                                <div>
                                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                        <Calendar className="w-3 h-3 text-ncc-gold" /> Date of Birth
                                    </label>
                                    <input
                                        type="text"
                                        name="dob"
                                        value={formData.dob}
                                        onChange={handleChange}
                                        placeholder="YYYY-MM-DD"
                                        className="ncc-input text-xs font-bold"
                                    />
                                </div>

                                {/* DOJ */}
                                <div>
                                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                        <Calendar className="w-3 h-3 text-ncc-gold" /> Date of Joining
                                    </label>
                                    <input
                                        type="text"
                                        name="doj"
                                        value={formData.doj}
                                        onChange={handleChange}
                                        placeholder="YYYY-MM-DD"
                                        className="ncc-input text-xs font-bold"
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <MapPin className="w-3 h-3 text-ncc-gold" /> Home Address
                                </label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Enter permanent address..."
                                    rows={2}
                                    className="ncc-input text-xs font-medium py-2"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Right Column: Academic Profile & Experience */}
                {!isBattalionStaff && (
                    <div className="space-y-4">
                        {/* Academic Profile */}
                        <div className="flex flex-col h-[calc(50%-8px)]">
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                <GraduationCap className="w-3.5 h-3.5 text-ncc-gold" /> Academic Profile
                            </label>
                            <textarea
                                name="academicProfile"
                                value={formData.academicProfile}
                                onChange={handleChange}
                                placeholder="Format (one per line): Qualification | University | Class/Result&#10;e.g. M.Tech | JNTUK | First Class"
                                rows={5}
                                className="ncc-input text-xs font-mono py-2 flex-1 min-h-[120px]"
                            />
                        </div>

                        {/* Professional Experience */}
                        <div className="flex flex-col h-[calc(50%-8px)]">
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                <Briefcase className="w-3.5 h-3.5 text-ncc-navy dark:text-ncc-gold" /> Professional Experience
                            </label>
                            <textarea
                                name="professionalExperience"
                                value={formData.professionalExperience}
                                onChange={handleChange}
                                placeholder="Format (one per line): Designation | Employer | Service Length&#10;e.g. Asst. Professor | GMRIT | 10 Years"
                                rows={5}
                                className="ncc-input text-xs font-mono py-2 flex-1 min-h-[120px]"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 border-t border-[#ddd8cc]/40 dark:border-white/5 pt-5 mt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="px-6 py-3 text-xs font-black text-gray-500 hover:text-ncc-navy dark:text-white/60 dark:hover:text-white uppercase tracking-widest transition-all"
                >
                    Discard
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center rounded-2xl bg-ncc-navy dark:bg-ncc-gold text-white dark:text-ncc-navy px-8 py-4 text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-ncc-navy/20 dark:shadow-ncc-gold/10 disabled:opacity-50 min-w-[180px]"
                >
                    {loading ? (
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Shield className="mr-2 h-4 w-4" />
                    )}
                    {loading ? 'Saving...' : isBattalionStaff ? (isEditMode ? 'Update Staff' : 'Add Staff Member') : (isEditMode ? 'Update ANO' : 'Register ANO')}
                </button>
            </div>
        </form>
    );
};
