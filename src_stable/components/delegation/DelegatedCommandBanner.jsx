// src/components/delegation/DelegatedCommandBanner.jsx
import React from 'react';
import { Shield, Clock, AlertTriangle, CheckCircle, ChevronRight, Sparkles } from '../Icons.jsx';

export const DelegatedCommandBanner = ({
    moduleId,
    moduleName = 'Admin Module',
    cadetName,
    pendingCount = 0,
    changesRequestedCount = 0,
    onOpenSubmissions
}) => {
    return (
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#0a1628] via-[#10223e] to-[#0a1628] text-white p-4 sm:p-5 mb-6 border border-ncc-gold/30 shadow-xl">
            {/* Ambient Background Flare */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-ncc-gold/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-ncc-gold/20 border border-ncc-gold/40 flex items-center justify-center shrink-0 shadow-md">
                        <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-ncc-gold animate-pulse" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-ncc-gold/20 text-ncc-gold text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-ncc-gold/30 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" /> Chain of Command Active
                            </span>
                            <span className="text-white/60 text-xs hidden sm:inline">•</span>
                            <span className="text-white/80 text-xs font-bold truncate">
                                Authorized Duty: {moduleName}
                            </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-display font-bold text-white mt-1 leading-snug">
                            Delegated Admin Workspace
                        </h4>
                        <p className="text-xs text-white/70 mt-0.5 max-w-2xl leading-relaxed">
                            Tasks created or edited here enter a staged queue and require verification by your <span className="text-ncc-gold font-semibold">Institution ANO</span> before becoming live.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                    {changesRequestedCount > 0 && (
                        <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black px-3 py-1.5 rounded-xl animate-bounce">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span>{changesRequestedCount} Action Req.</span>
                        </div>
                    )}

                    {pendingCount > 0 && (
                        <div className="flex items-center gap-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-bold px-3 py-1.5 rounded-xl">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            <span>{pendingCount} Pending</span>
                        </div>
                    )}

                    <button
                        onClick={onOpenSubmissions}
                        className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border border-white/20 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm hover:border-ncc-gold"
                    >
                        <span>My Submissions</span>
                        <ChevronRight className="w-3.5 h-3.5 text-ncc-gold" />
                    </button>
                </div>
            </div>
        </div>
    );
};
