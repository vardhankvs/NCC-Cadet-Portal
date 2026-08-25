// src/features/Staff/StaffProfileModal.jsx
import React, { useState } from 'react';
import { Briefcase, User, Phone, Mail, MapPin, GraduationCap, X, Calendar, Award } from '../../components/Icons.jsx';

const parseExperience = (text) => {
    if (!text) return [];
    return text.split('\n').filter(l => l.trim()).map(line => {
        const parts = line.split('|').map(s => s.trim());
        return { 
            designation: parts[0] || '---', 
            employer: parts[1] || '---', 
            length: parts[2] || '---' 
        };
    });
};

const parseAcademic = (text) => {
    if (!text) return [];
    return text.split('\n').filter(l => l.trim()).map(line => {
        const parts = line.split('|').map(s => s.trim());
        return { 
            qualification: parts[0] || '---', 
            university: parts[1] || '---', 
            result: parts[2] || '---' 
        };
    });
};

const InfoBadge = ({ icon: Icon, label, value, highlight = false }) => (
    <div className="flex flex-col gap-0.5">
        <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1">
            {Icon && <Icon className="w-2.5 h-2.5" />}
            {label}
        </p>
        <p className={`text-sm font-bold leading-tight ${highlight ? 'text-ncc-gold' : 'text-ncc-navy dark:text-white'}`}>
            {value || <span className="text-gray-400 dark:text-gray-600 font-normal italic text-xs">Not provided</span>}
        </p>
    </div>
);

export const StaffProfileModal = ({ member, onClose }) => {
    const [imgError, setImgError] = useState(false);
    const experience = parseExperience(member.professionalExperience);
    const academic = parseAcademic(member.academicProfile);

    // Format initials for fallback avatar
    const initials = member.name
        ? member.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
        : '?';

    return (
        <div className="mx-auto w-full max-w-2xl max-h-[92vh] overflow-y-auto ncc-scrollbar rounded-[2.5rem] bg-white dark:bg-[#050b14] shadow-2xl border border-[#ddd8cc] dark:border-white/10 relative animate-modalIn">
            
            {/* Premium top accent strip */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ncc-navy via-ncc-gold to-ncc-red rounded-t-[2.5rem]" />

            {/* Hero Banner */}
            <div className="relative h-32 bg-gradient-to-br from-ncc-navy via-[#1a365d] to-[#0a1628] rounded-t-[2.5rem] overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)'}} />
                <div className="absolute top-0 right-0 w-40 h-40 bg-ncc-gold/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-ncc-red/15 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
                
                {/* Close button */}
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur-sm rounded-xl text-white/70 hover:text-white hover:bg-white/20 transition-all z-10" 
                    title="Close"
                >
                    <X className="h-5 w-5" />
                </button>

            </div>

            {/* Profile Section */}
            <div className="px-8 pt-0 pb-8">
                {/* Avatar (overlapping the hero) */}
                <div className="relative -mt-16 mb-4">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-ncc-gold/30 rounded-3xl blur-lg" />
                        {member.photoUrl && !imgError ? (
                            <img 
                                src={member.photoUrl} 
                                alt={member.name} 
                                onError={() => setImgError(true)}
                                className="relative w-24 h-24 rounded-3xl object-cover border-4 border-white dark:border-[#050b14] shadow-2xl" 
                            />
                        ) : (
                            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-ncc-navy to-[#1a365d] flex items-center justify-center border-4 border-white dark:border-[#050b14] shadow-2xl">
                                <span className="text-2xl font-black text-ncc-gold font-display">{initials}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Name & Title (Below avatar, completely avoiding banner overlaps and color clash in light mode) */}
                <div className="mb-5 space-y-1">
                    <h2 className="text-xl sm:text-2xl font-display font-black text-ncc-navy dark:text-white uppercase tracking-tight leading-tight">
                        {member.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-ncc-gold font-bold uppercase tracking-[0.2em] text-[10px]">
                            {member.rank || 'Associate NCC Officer'}
                        </span>
                        {member.institutionId && (
                            <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 bg-ncc-navy/10 dark:bg-white/10 text-ncc-navy dark:text-white rounded-md">
                                /{member.institutionId}
                            </span>
                        )}
                    </div>
                </div>

                {/* Contact strip */}
                <div className="flex flex-wrap gap-3 mb-6">
                    {member.phone && (
                        <a 
                            href={`tel:${member.phone}`}
                            className="flex items-center gap-2 px-4 py-2 bg-ncc-navy/5 dark:bg-white/5 hover:bg-ncc-navy/10 dark:hover:bg-white/10 rounded-2xl text-xs font-bold text-ncc-navy dark:text-white transition-colors group"
                        >
                            <Phone className="w-3.5 h-3.5 text-ncc-navy dark:text-ncc-gold group-hover:scale-110 transition-transform" />
                            {member.phone}
                        </a>
                    )}
                    {member.email && (
                        <a 
                            href={`mailto:${member.email}`}
                            className="flex items-center gap-2 px-4 py-2 bg-ncc-navy/5 dark:bg-white/5 hover:bg-ncc-navy/10 dark:hover:bg-white/10 rounded-2xl text-xs font-bold text-ncc-navy dark:text-white transition-colors group"
                        >
                            <Mail className="w-3.5 h-3.5 text-ncc-navy dark:text-ncc-gold group-hover:scale-110 transition-transform" />
                            {member.email}
                        </a>
                    )}
                    {!member.phone && !member.email && (
                        <p className="text-xs text-gray-400 italic">No contact info provided</p>
                    )}
                </div>

                {/* Key Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 bg-gradient-to-br from-ncc-cream/40 to-transparent dark:from-white/[0.03] dark:to-transparent p-5 rounded-3xl border border-[#ddd8cc]/40 dark:border-white/5">
                    <InfoBadge icon={Calendar} label="Date of Birth" value={member.dob} />
                    <InfoBadge icon={Calendar} label="Date of Joining" value={member.doj} />
                    <InfoBadge icon={MapPin} label="Address" value={member.address} />
                </div>

                {/* Academic Profile */}
                {academic.length > 0 && (
                    <section className="mb-6">
                        <h3 className="flex items-center gap-2 text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-[0.2em] mb-3">
                            <div className="p-1.5 bg-ncc-gold/10 rounded-lg">
                                <GraduationCap className="w-3.5 h-3.5 text-ncc-gold" />
                            </div>
                            Academic Profile
                        </h3>
                        <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 dark:bg-white/5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-4 py-3">Qualification</th>
                                        <th className="px-4 py-3">University</th>
                                        <th className="px-4 py-3">Class</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                    {academic.map((item, idx) => (
                                        <tr key={idx} className="dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                                            <td className="px-4 py-3 font-bold">{item.qualification}</td>
                                            <td className="px-4 py-3 font-medium opacity-80">{item.university}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 bg-ncc-gold/10 text-ncc-gold font-black rounded">
                                                    {item.result}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Professional Experience */}
                {experience.length > 0 && (
                    <section>
                        <h3 className="flex items-center gap-2 text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-[0.2em] mb-3">
                            <div className="p-1.5 bg-ncc-navy/10 dark:bg-white/10 rounded-lg">
                                <Briefcase className="w-3.5 h-3.5 text-ncc-navy dark:text-ncc-gold" />
                            </div>
                            Professional Experience
                        </h3>
                        <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 dark:bg-white/5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-4 py-3">Designation</th>
                                        <th className="px-4 py-3">Employer</th>
                                        <th className="px-4 py-3">Service</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                    {experience.map((item, idx) => (
                                        <tr key={idx} className="dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                                            <td className="px-4 py-3 font-bold">{item.designation}</td>
                                            <td className="px-4 py-3 font-medium opacity-80">{item.employer}</td>
                                            <td className="px-4 py-3">
                                                <span className="font-black text-ncc-navy dark:text-ncc-gold">{item.length}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* No data state */}
                {academic.length === 0 && experience.length === 0 && (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-600">
                        <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-xs font-medium">No academic or professional records added yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
