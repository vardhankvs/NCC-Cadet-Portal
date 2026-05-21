// src/features/Profile/CadetProfileView.jsx
import React, { useMemo } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { ShieldCheck, Award, Calendar as CalendarIcon, Mail, Phone, List, Briefcase, MapPin, Droplet, CheckCircle, Shield, Download } from '../../components/Icons.jsx';
import { format } from 'date-fns';
import { generateCertificateApplicationPDF } from '../../utils/pdfGenerator.js';

import { QRCodeCanvas } from 'qrcode.react';


import { formatDate } from '../../utils/dateUtils.js';


export const CadetProfileView = () => {
    const { userEnrollmentId } = useAuthContext();
    const { cadets, loading } = useDataContext();


    const currentCadet = useMemo(() => {
        if (!userEnrollmentId || !Array.isArray(cadets) || cadets.length === 0) return null;
        return cadets.find((c) => (c.enrollmentId || '').toLowerCase() === (userEnrollmentId || '').toLowerCase());
    }, [cadets, userEnrollmentId]);

    if (loading) return null;

    if (!currentCadet) return (
        <div className="ncc-card p-6 text-center text-red-600 text-sm">Could not find your profile. Please contact an administrator.</div>
    );

    const initials = currentCadet.name ? currentCadet.name.split(' ').map((s) => s[0] || '').join('').slice(0, 2).toUpperCase() : 'NA';
    const profileImage = currentCadet.photoUrl || null;
    const cert = currentCadet.certificate || currentCadet.B;
    const certCls = cert === 'C' ? 'cert-c' : cert === 'B2' ? 'cert-b2' : cert ? 'cert-b1' : '';

    return (
        <>

            <div className="ncc-card overflow-hidden">
                {/* ── Profile Header ── */}
                <div className="bg-ncc-navy p-5 sm:p-8 flex items-end gap-5">
                    <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full ring-4 ring-ncc-gold/60 overflow-hidden bg-ncc-navy/40 flex items-center justify-center text-2xl sm:text-4xl font-bold text-white shrink-0">
                        {profileImage ? <img src={profileImage} alt="" className="w-full h-full object-cover" /> : <span>{initials}</span>}
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
                            className="ncc-btn bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white border-2 border-ncc-gold ncc-btn-sm flex items-center gap-2 hover:bg-ncc-gold hover:text-white transition-all shadow-lg"
                        >
                            <Download className="w-3.5 h-3.5" /> Exam Form
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
                                            <span className="text-[10px] font-bold text-gray-400 dark:text-white/80 font-mono">
                                                {formatDate(history.date)}
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
                    {(!currentCadet.examHistory || currentCadet.examHistory.length === 0) ? (
                        <div className="p-5 text-center text-xs font-semibold text-gray-500 dark:text-white/70">
                            No exams taken yet.
                        </div>
                    ) : (
                        <div className="divide-y divide-[#ede8df]">
                            {currentCadet.examHistory.map((exam, idx) => (
                                <div key={idx} className="px-5 py-4 flex justify-between items-center">
                                    <div>
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
