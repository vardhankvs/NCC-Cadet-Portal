// src/features/Profile/IDCardGenerator.jsx
import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Loader, ShieldCheck, User } from '../../components/Icons.jsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';
import nccLogo from '../../assets/ncc_logo.png';

export const IDCardGenerator = ({ cadet }) => {
    const cardRef = useRef(null);
    const [generating, setGenerating] = useState(false);

    const downloadID = async () => {
        if (!cardRef.current) return;
        setGenerating(true);
        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 4, 
                useCORS: true,
                backgroundColor: null,
                logging: false
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', [85.6, 53.98]); 
            pdf.addImage(imgData, 'PNG', 0, 0, 53.98, 85.6);
            pdf.save(`${cadet.enrollmentId}_SmartID.pdf`);
            toast.success("ID Card generated successfully!");
        } catch (error) {
            console.error("ID Generation Error:", error);
            toast.error("Failed to generate ID card.");
        } finally {
            setGenerating(false);
        }
    };

    if (!cadet) return null;

    const officialLogo = nccLogo;

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="p-4 bg-gray-50 dark:bg-[#0a1628] rounded-2xl border border-dashed border-gray-300">
                <div 
                    ref={cardRef}
                    className="w-[240px] h-[380px] bg-[#0A1628] shadow-2xl relative overflow-hidden font-body"
                    style={{ borderRadius: '16px' }}
                >
                    {/* Background Texture */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '12px 12px' }} />
                    <div className="absolute top-0 right-0 w-full h-32 bg-ncc-gold/5 -skew-y-12 origin-top-right" />
                    
                    {/* Header */}
                    <div className="relative pt-6 px-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-white dark:bg-[#050b14] rounded-xl flex items-center justify-center p-1.5 shadow-xl ring-2 ring-white/10">
                                <img 
                                    src={officialLogo} 
                                    alt="NCC" 
                                    className="w-full h-full object-contain"
                                    crossOrigin="anonymous"
                                />
                            </div>
                            <div className="text-left">
                                <h4 className="text-[11px] font-black text-white leading-none tracking-tight">14(A) BN NCC</h4>
                                <p className="text-[8px] text-ncc-gold font-bold uppercase tracking-widest mt-0.5">Srikakulam</p>
                            </div>
                        </div>
                        <div className="w-full h-0.5 flex rounded-full overflow-hidden">
                            <div className="flex-1 bg-[#FF9933]" />
                            <div className="flex-1 bg-white dark:bg-[#050b14]" />
                            <div className="flex-1 bg-[#138808]" />
                        </div>
                    </div>

                    {/* Photo Area */}
                    <div className="relative mt-4 flex justify-center">
                        <div className="w-22 h-22 rounded-2xl border-2 border-ncc-gold/50 bg-white dark:bg-[#050b14]/5 overflow-hidden shadow-2xl p-1">
                            <div className="w-full h-full rounded-xl overflow-hidden bg-white dark:bg-[#050b14] flex items-center justify-center">
                                {cadet.photoURL ? (
                                    <img src={cadet.photoURL} alt="Cadet" className="w-full h-full object-cover" crossOrigin="anonymous" />
                                ) : (
                                    <User className="w-10 h-10 text-gray-200" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cadet Info - MOVED UP TO PREVENT OVERLAP */}
                    <div className="relative mt-3 text-center px-4">
                        <h3 className="text-white font-display font-bold text-sm tracking-wide mb-0.5 uppercase">
                            {cadet.name}
                        </h3>
                        <p className="text-ncc-gold font-black text-[9px] uppercase tracking-[0.3em] mb-3">
                            {cadet.rank || 'CADET'}
                        </p>
                        
                        {/* THE REGIMENTAL NUMBER BOX */}
                        <div className="bg-white dark:bg-[#050b14]/5 backdrop-blur-sm p-3 rounded-xl border border-white/10 space-y-2">
                            <div className="border-b border-white/5 pb-1.5">
                                <p className="text-[6px] text-ncc-gold uppercase font-black tracking-[0.2em] mb-0.5">Regimental Number</p>
                                <p className="text-[12px] text-white font-mono font-black tracking-widest leading-none">
                                    {cadet.enrollmentId}
                                </p>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <div className="text-left">
                                    <p className="text-[6px] text-white/40 uppercase font-black tracking-widest">Blood Group</p>
                                    <p className="text-[9px] text-white font-black">{cadet.bloodGroup || 'O+'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[6px] text-white/40 uppercase font-black tracking-widest">Unit</p>
                                    <p className="text-[9px] text-white font-black truncate max-w-[60px]">14(A) BN</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* QR Code Section - FIXED POSITION */}
                    <div className="absolute bottom-5 inset-x-0 flex flex-col items-center">
                        <div className="bg-white dark:bg-[#050b14] p-1.5 rounded-lg shadow-2xl">
                            <QRCodeCanvas 
                                value={cadet.enrollmentId} 
                                size={54}
                                level="H"
                            />
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 opacity-40">
                            <ShieldCheck className="w-2.5 h-2.5 text-white" />
                            <p className="text-[6px] font-black text-white tracking-[0.3em] uppercase">Smart ID Verified</p>
                        </div>
                    </div>
                    
                    {/* Bottom Border */}
                    <div className="absolute bottom-0 inset-x-0 h-1.5 flex">
                        <div className="flex-1 bg-[#FF9933]" />
                        <div className="flex-1 bg-white dark:bg-[#050b14]" />
                        <div className="flex-1 bg-[#138808]" />
                    </div>
                </div>
            </div>

            <div className="space-y-4 w-full max-w-[240px]">
                <button 
                    onClick={downloadID}
                    disabled={generating}
                    className="ncc-btn ncc-btn-primary w-full justify-center py-4 shadow-xl text-xs font-black uppercase tracking-widest"
                >
                    {generating ? <><Loader className="animate-spin w-4 h-4 mr-2" /> Syncing...</> : <><Download className="w-4 h-4 mr-2" /> Download ID</>}
                </button>
                
                <div className="bg-white dark:bg-[#050b14] p-4 rounded-2xl border border-[#ddd8cc] shadow-sm">
                    <p className="text-[9px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-ncc-gold animate-pulse" /> Scanner Utility
                    </p>
                    <p className="text-[9px] text-gray-500 dark:text-white/70 leading-relaxed">
                        The QR code is used for <strong>Instant Attendance</strong> and identity verification during battalion parades.
                    </p>
                </div>
            </div>
        </div>
    );
};
