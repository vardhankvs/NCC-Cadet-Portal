// src/features/Staff/StaffForm.jsx
import React, { useState } from 'react';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { X, Loader, User, Award, Phone, Mail, Camera, Shield, Calendar, MapPin, GraduationCap, Briefcase } from '../../components/Icons.jsx';
import { saveStaff } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';

export const StaffForm = ({ currentStaff, onSaveSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        name: currentStaff?.name || '',
        rank: currentStaff?.rank || '',
        phone: currentStaff?.phone || '',
        email: currentStaff?.email || '',
        photoUrl: currentStaff?.photoUrl || '',
        dob: currentStaff?.dob || '',
        address: currentStaff?.address || '',
        doj: currentStaff?.doj || '',
        academicProfile: currentStaff?.academicProfile || '',
        professionalExperience: currentStaff?.professionalExperience || '',
    });
    const [formError, setFormError] = useState(null);
    const [loading, setLoading] = useState(false);

    const isEditMode = !!currentStaff;

    const handleChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        if (!formData.name || !formData.rank) {
            setFormError('Staff name and rank/designation are required.');
            return;
        }

        setLoading(true);
        try {
            await saveStaff(formData, currentStaff?.id);
            toast.success(isEditMode ? 'Staff records updated successfully.' : 'New staff member added to the unit.');
            onSaveSuccess();
        } catch (e) {
            setFormError(e.message);
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-xl max-h-[90vh] overflow-y-auto ncc-scrollbar rounded-[2.5rem] bg-white dark:bg-[#050b14] p-8 shadow-2xl border border-[#ddd8cc] dark:border-white/10 relative"
        >
            {/* Tactical Header Decoration */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-ncc-gold" />
            
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="flex items-center text-2xl font-display font-black text-ncc-navy dark:text-white uppercase tracking-tight">
                        <Award className="mr-3 h-8 w-8 text-ncc-navy dark:text-ncc-gold" />
                        {isEditMode ? 'Edit Personnel' : 'Add Personnel'}
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-white/60 uppercase tracking-widest mt-1">Official Unit Staff Registry</p>
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

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                            <User className="w-3 h-3" /> Full Name <span className="text-ncc-red">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. Lt. Col. Rajesh Kumar"
                            className="ncc-input text-sm font-bold"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Shield className="w-3 h-3" /> Rank/Designation <span className="text-ncc-red">*</span>
                        </label>
                        <input
                            type="text"
                            name="rank"
                            value={formData.rank}
                            onChange={handleChange}
                            placeholder="e.g. Associate NCC Officer"
                            className="ncc-input text-sm font-bold"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Phone className="w-3 h-3" /> Contact Phone
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="+91 XXXXX XXXXX"
                            className="ncc-input text-xs font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Mail className="w-3 h-3" /> Email Address
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="staff@unit.ncc"
                            className="ncc-input text-xs font-bold"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Calendar className="w-3 h-3" /> Date of Birth
                        </label>
                        <input
                            type="text"
                            name="dob"
                            value={formData.dob}
                            onChange={handleChange}
                            placeholder="DD-MM-YYYY"
                            className="ncc-input text-sm font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Calendar className="w-3 h-3" /> Date of Joining
                        </label>
                        <input
                            type="text"
                            name="doj"
                            value={formData.doj}
                            onChange={handleChange}
                            placeholder="DD-MM-YYYY"
                            className="ncc-input text-sm font-bold"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                        <MapPin className="w-3 h-3" /> Residential Address
                    </label>
                    <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Full residential address..."
                        className="ncc-input text-xs font-bold"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                        <GraduationCap className="w-3 h-3" /> Academic Profile
                    </label>
                    <textarea
                        name="academicProfile"
                        value={formData.academicProfile}
                        onChange={handleChange}
                        placeholder="Ph.D. | Dravidian University | First Class&#10;B.A. | Andhra University | Distinction"
                        rows="3"
                        className="ncc-input text-xs font-mono leading-relaxed bg-ncc-navy/[0.02] dark:bg-white/5"
                    />
                    <p className="text-[9px] text-ncc-red dark:text-ncc-gold mt-1.5 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" /> CRITICAL: Use the "|" (pipe) symbol between columns for the table to work.
                    </p>
                </div>

                <div>
                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Briefcase className="w-3 h-3" /> Professional Experience
                    </label>
                    <textarea
                        name="professionalExperience"
                        value={formData.professionalExperience}
                        onChange={handleChange}
                        placeholder="Associate Professor | GMRIT | 4 Years&#10;Assistant Professor | GMRIT | 13 Years"
                        rows="3"
                        className="ncc-input text-xs font-mono leading-relaxed bg-ncc-navy/[0.02] dark:bg-white/5"
                    />
                    <p className="text-[9px] text-ncc-red dark:text-ncc-gold mt-1.5 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" /> CRITICAL: Use the "|" (pipe) symbol between columns for the table to work.
                    </p>
                </div>

                <div>
                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Camera className="w-3 h-3" /> Profile Photo URL
                    </label>
                    <input
                        type="url"
                        name="photoUrl"
                        value={formData.photoUrl}
                        onChange={handleChange}
                        placeholder="https://i.postimg.cc/image-hash..."
                        className="ncc-input text-xs font-mono"
                    />
                    <p className="text-[9px] text-gray-400 mt-2 italic">Use a direct image link from PostIMG or Imgur for best results.</p>
                </div>
            </div>

            <div className="mt-10 flex items-center justify-between gap-4">
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
                    className="flex-1 flex items-center justify-center rounded-2xl bg-ncc-navy dark:bg-ncc-gold text-white dark:text-ncc-navy px-8 py-4 text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-ncc-navy/20 dark:shadow-ncc-gold/10 disabled:opacity-50"
                >
                    {loading ? (
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Shield className="mr-2 h-4 w-4" />
                    )}
                    {loading ? 'Processing...' : isEditMode ? 'Update Staff Profile' : 'Commission New Staff'}
                </button>
            </div>
        </form>
    );
};
