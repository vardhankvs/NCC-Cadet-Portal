// src/features/Ranks/UnitOrganogram.jsx
import React, { useMemo } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { Users, Shield, Award, Star } from '../../components/Icons.jsx';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator.jsx';

export const UnitOrganogram = () => {
    const { cadets, loading } = useDataContext();

    const rankHierarchy = [
        { id: 'SUO',   name: 'Senior Under Officer', icon: Star, color: 'bg-ncc-navy text-ncc-gold' },
        { id: 'JUO',   name: 'Junior Under Officer', icon: Star, color: 'bg-ncc-navy/90 text-ncc-gold' },
        { id: 'C-SGT', name: 'Company Sergeant',     icon: Award, color: 'bg-ncc-navy/80 text-white' },
        { id: 'CQMS',  name: 'Quartermaster',        icon: Shield, color: 'bg-ncc-navy/70 text-white' },
        { id: 'SGT',   name: 'Sergeant',             icon: Shield, color: 'bg-ncc-navy/60 text-white' },
        { id: 'CPL',   name: 'Corporal',             icon: Users, color: 'bg-ncc-navy/50 text-white' },
        { id: 'LCPL',  name: 'Lance Corporal',      icon: Users, color: 'bg-ncc-navy/40 text-white' },
        { id: 'CDT',   name: 'Cadet',                icon: Users, color: 'bg-ncc-navy/30 text-ncc-navy' },
    ];

    const groupedCadets = useMemo(() => {
        const groups = {};
        rankHierarchy.forEach(r => groups[r.id] = []);
        
        cadets.forEach(c => {
            const rank = c.rank || 'CDT';
            if (groups[rank]) {
                groups[rank].push(c);
            } else {
                // Fallback for non-standard ranks
                if (!groups['CDT']) groups['CDT'] = [];
                groups['CDT'].push(c);
            }
        });
        return groups;
    }, [cadets]);

    if (loading) return <div className="p-20 text-center"><LoadingIndicator /></div>;

    return (
        <div className="space-y-8 fade-in">
            <header className="text-center space-y-2 mb-12">
                <h2 className="text-3xl font-display font-bold text-ncc-navy tracking-tight">Unit Hierarchy</h2>
                <div className="w-24 h-1 bg-ncc-gold mx-auto" />
                <p className="text-gray-500 max-w-lg mx-auto">Visual command structure of the 2(A) ENGR COY NCC - VIZIANAGARAM.</p>
            </header>

            <div className="flex flex-col items-center gap-10">
                {rankHierarchy.map((level, idx) => {
                    const levelCadets = groupedCadets[level.id] || [];
                    if (levelCadets.length === 0 && level.id !== 'CDT') return null;

                    return (
                        <div key={level.id} className="w-full relative flex flex-col items-center">
                            {/* Connector Line */}
                            {idx < rankHierarchy.length - 1 && (
                                <div className="absolute top-full h-10 w-0.5 bg-ncc-gold/30" />
                            )}
                            
                            <div className="text-center mb-4">
                                <div className={`inline-flex items-center gap-2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${level.color} shadow-sm border border-black/5`}>
                                    <level.icon className="w-3 h-3" />
                                    {level.name} ({levelCadets.length})
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-center gap-3 max-w-5xl">
                                {levelCadets.length === 0 ? (
                                    <p className="text-gray-300 text-[10px] italic">No active appointments</p>
                                ) : (
                                    levelCadets.map(cadet => (
                                        <div 
                                            key={cadet.id}
                                            className="bg-white p-3 rounded-xl border border-[#ddd8cc] shadow-sm hover:shadow-md hover:border-ncc-gold transition-all group flex items-center gap-3 min-w-[180px]"
                                        >
                                            <div className="w-10 h-10 bg-ncc-navy text-ncc-gold rounded-lg flex items-center justify-center font-bold text-xs ring-2 ring-ncc-navy/5 group-hover:ring-ncc-gold/50 transition-all">
                                                {cadet.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-ncc-navy truncate group-hover:text-ncc-gold transition-colors">{cadet.name}</p>
                                                <p className="text-[9px] text-gray-400 font-mono">{cadet.enrollmentId}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
