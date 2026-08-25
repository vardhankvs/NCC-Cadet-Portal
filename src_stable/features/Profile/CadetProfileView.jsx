// src/features/Profile/CadetProfileView.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { ShieldCheck, Award, Calendar as CalendarIcon, Mail, Phone, List, Briefcase, MapPin, Droplet, CheckCircle, Shield, Download, X, GraduationCap, Lock } from '../../components/Icons.jsx';
import { format } from 'date-fns';
import { generateCertificateApplicationPDF } from '../../utils/pdfGenerator.js';
import { saveStaff } from '../../firebase/firestoreService.js';

import { QRCodeCanvas } from 'qrcode.react';


import { formatDate } from '../../utils/dateUtils.js';


export const CadetProfileView = () => {
    const { userEnrollmentId, user, userRole, userInstitutionId } = useAuthContext();
    const { cadets, staff, loading } = useDataContext();
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [imgError, setImgError] = useState(false);

    const isStaff = userRole === 'admin' || userRole === 'officer';

    const currentStaff = useMemo(() => {
        if (!isStaff || !user || !Array.isArray(staff) || staff.length === 0) return null;
        return staff.find((s) => (s.email || '').toLowerCase() === (user.email || '').toLowerCase());
    }, [isStaff, staff, user]);

    const effectiveStaff = useMemo(() => {
        if (!isStaff || !user) return null;
        if (currentStaff) return currentStaff;
        return {
            name: user.displayName || 'Associate NCC Officer',
            rank: userRole === 'admin' ? 'Unit Administrator' : 'ANO',
            email: user.email || 'N/A',
            phone: 'N/A',
            institutionId: userInstitutionId || 'gmrit',
            dob: '',
            doj: '',
            address: '',
            academicProfile: '',
            professionalExperience: '',
            photoUrl: ''
        };
    }, [isStaff, user, currentStaff, userRole, userInstitutionId]);

    const currentCadet = useMemo(() => {
        if (isStaff || !userEnrollmentId || !Array.isArray(cadets) || cadets.length === 0) return null;
        return cadets.find((c) => (c.enrollmentId || '').toLowerCase() === (userEnrollmentId || '').toLowerCase());
    }, [isStaff, cadets, userEnrollmentId]);

    const isCAndCampDeficient = useMemo(() => {
        if (!currentCadet) return false;
        const cert = currentCadet.certificate || currentCadet.B || '';
        const campCount = (currentCadet.campsAttended || []).length;
        return cert === 'C' && campCount < 2;
    }, [currentCadet]);

    if (loading) return null;

    if (isStaff) {
        if (!effectiveStaff) {
            return (
                <div className="ncc-card p-6 text-center text-gray-500 text-sm">
                    No profile details available.
                </div>
            );
        }

        const initials = effectiveStaff.name ? effectiveStaff.name.split(' ').map((s) => s[0] || '').join('').slice(0, 2).toUpperCase() : 'NA';
        const profileImage = effectiveStaff.photoURL || effectiveStaff.photoUrl || null;
        const experience = effectiveStaff.professionalExperience ? effectiveStaff.professionalExperience.split('\n').filter(l => l.trim()).map(line => {
            const parts = line.split('|').map(s => s.trim());
            return { designation: parts[0] || '---', employer: parts[1] || '---', length: parts[2] || '---' };
        }) : [];
        const academic = effectiveStaff.academicProfile ? effectiveStaff.academicProfile.split('\n').filter(l => l.trim()).map(line => {
            const parts = line.split('|').map(s => s.trim());
            return { qualification: parts[0] || '---', university: parts[1] || '---', result: parts[2] || '---' };
        }) : [];

        return (
            <>
                <div className="ncc-card overflow-hidden">
                    {/* ── Profile Header ── */}
                    <div className="bg-ncc-navy p-5 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                        <div className="flex items-end gap-5">
                            <div 
                                className="w-20 h-20 sm:w-28 sm:h-28 rounded-full ring-4 ring-ncc-gold/60 overflow-hidden bg-ncc-navy/40 flex items-center justify-center text-2xl sm:text-4xl font-bold text-white shrink-0 relative group cursor-pointer"
                                onClick={() => profileImage && !imgError && setIsImageModalOpen(true)}
                            >
                                {profileImage && !imgError ? (
                                    <>
                                        <img src={profileImage} alt="" onError={() => setImgError(true)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[10px] font-bold tracking-widest uppercase">View</span>
                                        </div>
                                    </>
                                ) : <span>{initials}</span>}
                            </div>
                            <div className="min-w-0 pb-1">
                                <h2 className="font-display text-xl sm:text-2xl font-bold text-white truncate">{effectiveStaff.name}</h2>
                                <p className="font-mono text-xs text-white/50 mt-0.5">{effectiveStaff.email}</p>
                                <div className="mt-2 flex items-center gap-2 flex-wrap">
                                    {effectiveStaff.rank && <span className="text-ncc-gold text-xs font-semibold uppercase tracking-widest">{effectiveStaff.rank}</span>}
                                    {effectiveStaff.institutionId && (
                                        <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-white/10 text-white rounded-md">
                                            {effectiveStaff.institutionId}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Detail Rows ── */}
                    <div className="divide-y divide-[#ddd8cc] dark:divide-white/10">
                        <DetailRow label="Designation / Rank" value={effectiveStaff.rank} icon={Award} />
                        <DetailRow label="Institution ID" value={effectiveStaff.institutionId} icon={Briefcase} />
                        <DetailRow label="Email" value={effectiveStaff.email} icon={Mail} />
                        <DetailRow label="Phone" value={effectiveStaff.phone} icon={Phone} />
                        <DetailRow label="Date of Birth" value={formatDate(effectiveStaff.dob, '—')} icon={CalendarIcon} />
                        <DetailRow label="Date of Joining" value={formatDate(effectiveStaff.doj, '—')} icon={CalendarIcon} />
                        <DetailRow label="Address" value={effectiveStaff.address} icon={MapPin} />
                    </div>
                </div>

                {/* Academic Profile */}
                {academic.length > 0 && (
                    <div className="ncc-card overflow-hidden mt-6">
                        <div className="bg-[#f5f0e8] dark:bg-[#0A1628] px-5 py-4 border-b border-[#ddd8cc] dark:border-white/10 flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-ncc-navy dark:text-white flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-ncc-gold" /> Academic Profile
                            </h3>
                        </div>
                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-[#fcfbfa] dark:bg-white/5 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-5 py-3">Qualification</th>
                                        <th className="px-5 py-3">University</th>
                                        <th className="px-5 py-3">Class/Result</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {academic.map((item, idx) => (
                                        <tr key={idx} className="dark:text-white/80 hover:bg-[#f5f0e8]/20 dark:hover:bg-white/3 transition-colors">
                                            <td className="px-5 py-3.5 font-bold">{item.qualification}</td>
                                            <td className="px-5 py-3.5 font-medium opacity-80">{item.university}</td>
                                            <td className="px-5 py-3.5">
                                                <span className="px-2 py-0.5 bg-ncc-gold/10 text-ncc-gold font-black rounded">
                                                    {item.result}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Professional Experience */}
                {experience.length > 0 && (
                    <div className="ncc-card overflow-hidden mt-6">
                        <div className="bg-[#f5f0e8] dark:bg-[#0A1628] px-5 py-4 border-b border-[#ddd8cc] dark:border-white/10 flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-ncc-navy dark:text-white flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-ncc-gold" /> Professional Experience
                            </h3>
                        </div>
                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-[#fcfbfa] dark:bg-white/5 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-5 py-3">Designation</th>
                                        <th className="px-5 py-3">Employer</th>
                                        <th className="px-5 py-3">Service Length</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {experience.map((item, idx) => (
                                        <tr key={idx} className="dark:text-white/80 hover:bg-[#f5f0e8]/20 dark:hover:bg-white/3 transition-colors">
                                            <td className="px-5 py-3.5 font-bold">{item.designation}</td>
                                            <td className="px-5 py-3.5 font-medium opacity-80">{item.employer}</td>
                                            <td className="px-5 py-3.5 font-black text-ncc-navy dark:text-ncc-gold">{item.length}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Image Modal */}
                {isImageModalOpen && profileImage && !imgError && (
                    <div 
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={() => setIsImageModalOpen(false)}
                    >
                        <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            <button 
                                onClick={() => setIsImageModalOpen(false)}
                                className="absolute -top-12 right-0 sm:-right-12 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <img 
                                src={profileImage} 
                                alt="Profile" 
                                className="w-auto h-auto max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain ring-4 ring-white/20"
                            />
                        </div>
                    </div>
                )}


            </>
        );
    }

    if (!isStaff && !currentCadet) {
        return (
            <div className="ncc-card p-6 text-center text-[#9c8965] dark:text-[#ccbda0] text-sm bg-[#fcfbfa] dark:bg-[#08121f] border border-[#ddd8cc] dark:border-white/10 rounded-lg">
                Cadet profile record not found for Enrollment ID: <span className="font-mono font-bold">{userEnrollmentId || 'N/A'}</span>.
            </div>
        );
    }

    const initials = currentCadet.name ? currentCadet.name.split(' ').map((s) => s[0] || '').join('').slice(0, 2).toUpperCase() : 'NA';
    const profileImage = currentCadet.photoURL || currentCadet.photoUrl || null;
    const cert = currentCadet.certificate || currentCadet.B;
    const certCls = cert === 'C' ? 'cert-c' : cert === 'B2' ? 'cert-b2' : cert ? 'cert-b1' : '';

    return (
        <>

            <div className="ncc-card overflow-hidden">
                {/* ── Profile Header ── */}
                <div className="bg-ncc-navy p-5 sm:p-8 flex items-end gap-5">
                    <div 
                        className="w-20 h-20 sm:w-28 sm:h-28 rounded-full ring-4 ring-ncc-gold/60 overflow-hidden bg-ncc-navy/40 flex items-center justify-center text-2xl sm:text-4xl font-bold text-white shrink-0 relative group cursor-pointer"
                        onClick={() => profileImage && setIsImageModalOpen(true)}
                    >
                        {profileImage ? (
                            <>
                                <img src={profileImage} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] font-bold tracking-widest uppercase">View</span>
                                </div>
                            </>
                        ) : <span>{initials}</span>}
                    </div>
                    <div className="min-w-0 pb-1">
                        <h2 className="font-display text-xl sm:text-2xl font-bold text-white truncate">{currentCadet.name}</h2>
                        <p className="font-mono text-xs text-white/50 mt-0.5">{currentCadet.enrollmentId}</p>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                            {cert && <span className={certCls}>{cert}</span>}
                            {currentCadet.rank && <span className="text-ncc-gold text-xs font-semibold uppercase tracking-widest">{currentCadet.rank}</span>}
                        </div>
                    </div>
                    <div className="ml-auto mb-1 flex flex-col sm:flex-row gap-2 shrink-0">
                        <button 
                            onClick={() => generateCertificateApplicationPDF(currentCadet)} 
                            disabled={isCAndCampDeficient}
                            className={`ncc-btn ncc-btn-sm flex items-center gap-2 transition-all shadow-lg ${
                                isCAndCampDeficient
                                    ? 'bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400 border border-red-500/20 cursor-not-allowed opacity-80'
                                    : 'bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white border-2 border-ncc-gold hover:bg-ncc-gold hover:text-white'
                            }`}
                            title={isCAndCampDeficient ? "Blocked: C certificate requires at least 2 camps." : "Download Exam Form"}
                        >
                            {isCAndCampDeficient ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                            {isCAndCampDeficient ? 'Exam Form Locked' : 'Exam Form'}
                        </button>
                    </div>

                </div>

                {/* ── Smart ID Quick Section ── */}
                <div className="border-t border-white/10 bg-ncc-navy/95 p-6 flex flex-col sm:flex-row items-center gap-8 shadow-inner">
                    <div className="bg-white dark:bg-[#050b14] p-3 rounded-xl shadow-2xl relative group">
                        <div className="absolute inset-0 border-2 border-ncc-gold/30 rounded-xl pointer-events-none group-hover:border-ncc-gold transition-colors"></div>
                        <QRCodeCanvas 
                            value={currentCadet.enrollmentId || 'GMRIT-NCC-UNKNOWN'} 
                            size={140}
                            bgColor={"#ffffff"}
                            fgColor={"#000080"}
                            level={"H"}
                            includeMargin={false}
                        />
                        <div className="mt-2 text-center text-[10px] font-black text-ncc-navy dark:text-white tracking-tighter uppercase">SCAN FOR ATTENDANCE</div>
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                            <Shield className="w-5 h-5 text-ncc-gold" />
                            <h3 className="text-white font-display text-lg font-bold tracking-wide">Digital Smart ID</h3>
                        </div>
                        <p className="text-white/60 text-sm max-w-md leading-relaxed mb-4">
                            This unique QR code is your verified digital signature. Use it at the parade ground or events for instant attendance recording.
                        </p>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                            <div className="bg-ncc-navy-mid/30 border border-white/10 px-4 py-2 rounded-lg">
                                <span className="block text-[8px] font-bold text-white/40 uppercase mb-0.5">Verified Status</span>
                                <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> ACTIVE CADET
                                </span>
                            </div>
                            <div className="bg-ncc-navy-mid/30 border border-white/10 px-4 py-2 rounded-lg">
                                <span className="block text-[8px] font-bold text-white/40 uppercase mb-0.5">Enrollment No.</span>
                                <span className="text-white text-xs font-mono font-bold">{currentCadet.enrollmentId}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Detail Rows ── */}
                <div className="divide-y divide-[#ddd8cc] dark:divide-white/10">
                    <DetailRow label="JNTU No." value={currentCadet.jntuNo} icon={List} />
                    <DetailRow label="Branch" value={currentCadet.branch} icon={Briefcase} />
                    <DetailRow label="Certificate" value={cert} icon={Award} />
                    <DetailRow label="Date of Birth" value={formatDate(currentCadet.dob)} icon={CalendarIcon} />
                    <DetailRow label="Blood Group" value={currentCadet.bloodGroup} icon={Droplet} textClass="text-red-600 font-bold" />
                    <DetailRow label="Personal Email" value={currentCadet.personalEmail} icon={Mail} />
                    <DetailRow label="Phone" value={currentCadet.phonePersonal || currentCadet.phone} icon={Phone} />
                    <DetailRow label="Address" value={currentCadet.addressPresent} icon={MapPin} />
                </div>
            </div>

            {/* ── Promotion History ── */}
            <div className="ncc-card overflow-hidden mt-6">
                <div className="bg-[#f5f0e8] dark:bg-[#0A1628] px-5 py-4 border-b border-[#ddd8cc] dark:border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-ncc-navy dark:text-white">Promotion & Rank History</h3>
                    <Award className="w-4 h-4 text-ncc-gold" />
                </div>
                <div className="p-0">
                    {(!currentCadet.rankHistory || currentCadet.rankHistory.length === 0) ? (
                        <div className="p-5 text-center text-xs font-semibold text-gray-500 dark:text-white/70">
                            No promotion history recorded.
                        </div>
                    ) : (
                        <div className="relative p-6 pl-10 space-y-6">
                            {/* Vertical Line */}
                            <div className="absolute left-[31px] top-6 bottom-6 w-0.5 bg-[#ddd8cc]" />
                            
                            {currentCadet.rankHistory.slice().reverse().map((history, idx) => (
                                <div key={idx} className="relative">
                                    {/* Dot */}
                                    <div className={`absolute -left-[14px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${idx === 0 ? 'bg-ncc-gold ring-4 ring-ncc-gold/20' : 'bg-gray-300'}`} />
                                    
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase ${idx === 0 ? 'bg-ncc-navy text-ncc-gold' : 'bg-gray-100 dark:bg-[#0d2137] text-gray-500 dark:text-white/70'}`}>
                                                {history.rank}
                                            </span>
                                        </div>
                                        <p className="text-xs font-semibold text-ncc-navy dark:text-white mt-1">{history.reason || 'Promotion'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Issued Property (Q-Store) ── */}
            <div className="ncc-card overflow-hidden mt-6">
                <div className="bg-[#f5f0e8] dark:bg-[#0A1628] px-5 py-4 border-b border-[#ddd8cc] dark:border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-ncc-navy dark:text-white">Issued Property (Q-Store)</h3>
                    <Briefcase className="w-4 h-4 text-ncc-gold" />
                </div>
                <div className="p-0">
                    {(!currentCadet.issuedItems || currentCadet.issuedItems.length === 0) ? (
                        <div className="p-5 text-center text-xs font-semibold text-gray-500 dark:text-white/70">
                            No property currently issued.
                        </div>
                    ) : (
                        <div className="divide-y divide-[#ede8df]">
                            {currentCadet.issuedItems.map((item, idx) => {
                                const issuedDate = formatDate(item.issuedAt);
                                return (
                                    <div key={idx} className={`px-5 py-3 flex justify-between items-center ${item.returned ? 'opacity-50' : ''}`}>
                                        <div>
                                            <p className={`text-sm font-bold ${item.returned ? 'line-through text-gray-500 dark:text-white/70' : 'text-ncc-navy dark:text-white'}`}>{item.itemName}</p>
                                            <p className="text-xs text-gray-500 dark:text-white/70 mt-0.5">Quantity: {item.quantity}   Issued: {issuedDate}</p>
                                        </div>
                                        <div>
                                            {item.returned ? (
                                                <span className="px-2 py-1 bg-gray-200 text-gray-600 dark:text-white/80 rounded text-xs font-bold">Returned</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-bold">Active</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Camp Deployments ── */}
            <div className="ncc-card overflow-hidden mt-6">
                <div className="bg-[#f5f0e8] dark:bg-[#0A1628] px-5 py-4 border-b border-[#ddd8cc] dark:border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-ncc-navy dark:text-white">Camp Deployments</h3>
                    <Award className="w-4 h-4 text-ncc-gold" />
                </div>
                <div className="p-0">
                    {(!currentCadet.campHistory || currentCadet.campHistory.length === 0) ? (
                        <div className="p-5 text-center text-xs font-semibold text-gray-500 dark:text-white/70">
                            No camp deployments logged yet.
                        </div>
                    ) : (
                        <div className="divide-y divide-[#ede8df]">
                            {currentCadet.campHistory.map((camp, idx) => (
                                <div key={idx} className="px-5 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-1.5 py-0.5 bg-ncc-navy text-white text-[9px] font-bold tracking-widest uppercase rounded">
                                                {camp.campType}
                                            </span>
                                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                                camp.status === 'Selected' ? 'bg-emerald-100 text-emerald-800' :
                                                camp.status === 'Attended' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 dark:bg-[#0d2137] text-gray-700 dark:text-white/90'
                                            }`}>
                                                {camp.status}
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-ncc-navy dark:text-white">{camp.campName}</p>
                                        <p className="text-xs text-gray-500 dark:text-white/70 mt-0.5">Start Date: {camp.startDate}</p>
                                        
                                        {/* Achievements */}
                                        {camp.achievements && camp.achievements.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {camp.achievements.map((ach, i) => (
                                                    <span key={i} className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                                        <Award className="w-3 h-3" /> {ach}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Exam History ── */}
            <div className="ncc-card overflow-hidden mt-6">
                <div className="bg-[#f5f0e8] dark:bg-[#0A1628] px-5 py-4 border-b border-[#ddd8cc] dark:border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-ncc-navy dark:text-white">Exam & Certifications</h3>
                    <CheckCircle className="w-4 h-4 text-ncc-gold" />
                </div>
                <div className="p-0">
                    {(!currentCadet.examHistory?.length && !currentCadet.certifications?.length) ? (
                        <div className="p-5 text-center text-xs font-semibold text-gray-500 dark:text-white/70">
                            No exams or certifications logged yet.
                        </div>
                    ) : (
                        <div className="divide-y divide-[#ede8df] dark:divide-white/10">
                            {/* Official Certifications */}
                            {currentCadet.certifications?.map((cert, idx) => (
                                <div key={`cert-${idx}`} className="px-5 py-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-amber-50/30 dark:bg-amber-900/10">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-amber-200 to-amber-400 dark:from-amber-600 dark:to-amber-800 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                                            <Award className="w-6 h-6 text-amber-900 dark:text-amber-100" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-0.5 bg-ncc-navy text-white text-[9px] font-black tracking-widest uppercase rounded">
                                                    Official Certificate
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-500 dark:text-white/60 uppercase tracking-widest">
                                                    {cert.year}
                                                </span>
                                            </div>
                                            <h4 className="text-lg font-display font-bold text-ncc-navy dark:text-white">{cert.certLevel}</h4>
                                            <div className="flex items-center gap-4 mt-2">
                                                <div className="text-[10px] font-bold text-gray-500 dark:text-white/70">
                                                    <span className="uppercase tracking-widest block opacity-70">Theory</span>
                                                    <span className="text-ncc-navy dark:text-white">{cert.theoryMarks} <span className="opacity-50">/ {cert.theoryMax}</span></span>
                                                </div>
                                                <div className="text-[10px] font-bold text-gray-500 dark:text-white/70 border-l border-gray-300 dark:border-white/20 pl-4">
                                                    <span className="uppercase tracking-widest block opacity-70">Practical</span>
                                                    <span className="text-ncc-navy dark:text-white">{cert.practicalMarks} <span className="opacity-50">/ {cert.practicalMax}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-white/10 pt-3 sm:pt-0 sm:pl-5 mt-2 sm:mt-0">
                                        <div className="text-center">
                                            <div className="text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest mb-1">Final Grade</div>
                                            <div className={`text-2xl font-display font-bold ${
                                                cert.finalGrade === 'Fail' ? 'text-red-500' : 
                                                cert.finalGrade === 'A' ? 'text-emerald-500' : 'text-ncc-gold'
                                            }`}>
                                                {cert.finalGrade === 'Fail' ? 'FAIL' : `${cert.finalGrade}`}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Digital Mock Exams */}
                            {currentCadet.examHistory?.map((exam, idx) => (
                                <div key={`exam-${idx}`} className="px-5 py-4 flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/80 text-[8px] font-black tracking-widest uppercase rounded">
                                                Mock Test
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-ncc-navy dark:text-white">{exam.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-white/70 mt-0.5">Attempted: {exam.date ? formatDate(exam.date) : 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-ncc-navy dark:text-white">{exam.score} <span className="text-gray-400 dark:text-white/80">/ {exam.maxScore}</span></div>
                                        <span className={`text-[10px] font-bold uppercase ${exam.score >= (exam.maxScore / 2) ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {exam.score >= (exam.maxScore / 2) ? 'PASS' : 'FAIL'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {/* ── Image Modal ── */}
            {isImageModalOpen && profileImage && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={() => setIsImageModalOpen(false)}
                >
                    <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={() => setIsImageModalOpen(false)}
                            className="absolute -top-12 right-0 sm:-right-12 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <img 
                            src={profileImage} 
                            alt="Profile" 
                            className="w-auto h-auto max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain ring-4 ring-white/20"
                        />
                    </div>
                </div>
            )}
        </>
    );
};

const DetailRow = ({ label, value, icon: Icon, textClass = 'text-gray-800 dark:text-white' }) => (
    <div className="flex items-start px-5 py-3.5 hover:bg-[#f5f0e8] dark:hover:bg-white/5 transition-colors">
        <div className="w-2/5 sm:w-1/3 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/80 flex items-center shrink-0 pr-2">
            {Icon && <Icon className="w-3.5 h-3.5 mr-1.5 opacity-60 shrink-0" />}
            <span className="truncate">{label}</span>
        </div>
        <div className={`w-3/5 sm:w-2/3 text-xs sm:text-sm font-semibold break-words ${textClass}`}>{value || '—'}</div>
    </div>
);

export default CadetProfileView;
