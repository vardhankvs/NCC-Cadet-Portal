import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ruler, ShoppingBag, CheckCircle, Info, ChevronRight, AlertCircle, RefreshCcw, Search, Filter } from '../../components/Icons.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { updateKitSizes } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';

const InputField = ({ label, value, onChange, min, max, unit }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-gray-400 dark:text-white/50 uppercase tracking-widest">{label}</label>
            <div className="flex items-center gap-2">
                <input 
                    type="number" 
                    value={value}
                    onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
                    className="w-16 bg-transparent text-right text-sm font-black text-ncc-navy dark:text-ncc-gold focus:outline-none border-b border-ncc-navy/20 dark:border-ncc-gold/20"
                />
                <span className="text-[10px] font-bold text-gray-400 uppercase">{unit}</span>
            </div>
        </div>
        <input 
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-100 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-ncc-navy dark:accent-ncc-gold"
        />
    </div>
);

const SizeCard = ({ title, size, description }) => (
    <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 group hover:border-ncc-gold transition-all">
        <p className="text-[10px] font-black text-gray-400 dark:text-white/50 uppercase tracking-[0.2em] mb-1">{title}</p>
        <h4 className="text-3xl font-black text-ncc-navy dark:text-white mb-2 group-hover:text-ncc-gold transition-colors">{size}</h4>
        <p className="text-[10px] font-bold text-gray-400 leading-relaxed">{description}</p>
    </div>
);

export const KitFitPredictor = () => {
    const { userRole, userEnrollmentId } = useAuthContext();
    const { cadets = [] } = useDataContext();
    const isAdmin = userRole === 'admin' || userRole === 'officer';

    const [height, setHeight] = useState(170); // cm
    const [chest, setChest] = useState(95);   // cm
    const [waist, setWaist] = useState(80);   // cm
    const [gender, setGender] = useState('SD'); // SD/SW
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const predictions = useMemo(() => {
        // Mock NCC sizing logic
        const getTunicSize = (c) => {
            if (c < 85) return '36 (S)';
            if (c < 95) return '38 (M)';
            if (c < 105) return '40 (L)';
            if (c < 115) return '42 (XL)';
            return '44 (XXL)';
        };

        const getTrouserSize = (w) => {
            if (w < 75) return '28';
            if (w < 85) return '30';
            if (w < 95) return '32';
            if (w < 105) return '34';
            return '36';
        };

        const getBeretSize = (h) => {
            if (h < 165) return '6.5';
            if (h < 175) return '7';
            return '7.5';
        };

        const getShoeSize = (h) => {
            if (h < 165) return '7';
            if (h < 175) return '8';
            if (h < 185) return '9';
            return '10';
        };

        return {
            shirt: getTunicSize(chest),
            pant: getTrouserSize(waist),
            beret: getBeretSize(height),
            dms_shoes: getShoeSize(height)
        };
    }, [height, chest, waist]);

    const handleSaveToKit = async () => {
        const cadet = cadets.find(c => c.enrollmentId === userEnrollmentId);
        if (!cadet) {
            toast.error('Cadet profile not found');
            return;
        }

        setLoading(true);
        try {
            await updateKitSizes(cadet.id, {
                ...predictions,
                boots: '9', // Default or asked elsewhere
                updatedAt: new Date().toISOString()
            });
            toast.success('Size prediction saved to your kit profile!');
        } catch (err) {
            toast.error('Failed to save sizes');
        } finally {
            setLoading(false);
        }
    };

    const filteredCadets = useMemo(() => {
        if (!searchTerm) return cadets;
        const q = searchTerm.toLowerCase();
        return cadets.filter(c => 
            c.name.toLowerCase().includes(q) || 
            c.enrollmentId.toLowerCase().includes(q)
        );
    }, [cadets, searchTerm]);

    if (isAdmin) {
        return (
            <div className="space-y-8 fade-in">
                {/* Admin Header */}
                <div className="bg-white dark:bg-[#050b14] p-10 rounded-[3rem] border border-[#ddd8cc] shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-ncc-navy dark:text-white italic mb-2">Sizing <span className="text-ncc-gold">Intelligence</span></h2>
                        <p className="text-gray-400 dark:text-white/60 text-sm">Monitor predicted kit requirements across the unit roster.</p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search cadets..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-ncc-gold/30 rounded-2xl text-sm outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Cadet List */}
                <div className="bg-white dark:bg-[#050b14] rounded-[2.5rem] border border-[#ddd8cc] overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cadet</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Beret</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Shirt</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Pant</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                            {filteredCadets.map(c => (
                                <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-all">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-ncc-navy dark:text-white text-sm">{c.name}</div>
                                        <div className="text-[10px] font-black text-ncc-gold uppercase tracking-widest">{c.enrollmentId}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-3 py-1 bg-gray-100 dark:bg-white/10 rounded-lg text-xs font-mono font-bold text-gray-600 dark:text-white/70">
                                            {c.kitSizes?.beret || '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-3 py-1 bg-gray-100 dark:bg-white/10 rounded-lg text-xs font-mono font-bold text-gray-600 dark:text-white/70">
                                            {c.kitSizes?.shirt || '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-3 py-1 bg-gray-100 dark:bg-white/10 rounded-lg text-xs font-mono font-bold text-gray-600 dark:text-white/70">
                                            {c.kitSizes?.pant || '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {c.kitSizes ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                <CheckCircle className="w-3 h-3" /> Predicted
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                <AlertCircle className="w-3 h-3" /> Pending
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 fade-in">
            {/* Header */}
            <div className="bg-white dark:bg-[#050b14] p-10 rounded-[3rem] border border-[#ddd8cc] shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-full bg-ncc-gold/10 -skew-x-12 translate-x-16"></div>
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-ncc-navy text-white rounded-full mb-6">
                        <Ruler className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Smart Sizing Engine</span>
                    </div>
                    <h2 className="text-3xl font-black text-ncc-navy dark:text-white italic mb-2">Kit-Fit <span className="text-ncc-gold">Predictor</span></h2>
                    <p className="text-gray-400 dark:text-white/60 text-sm max-w-md">
                        Enter your measurements to predict your ideal NCC uniform sizes. This reduces exchange time during kit issuance.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="bg-white dark:bg-[#050b14] p-8 rounded-[2.5rem] border border-[#ddd8cc] shadow-sm space-y-8">
                    <div className="flex gap-4 p-1 bg-gray-50 dark:bg-white/5 rounded-2xl">
                        {['SD', 'SW'].map(g => (
                            <button
                                key={g}
                                onClick={() => setGender(g)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    gender === g ? 'bg-white dark:bg-white/10 shadow-md text-ncc-navy dark:text-ncc-gold' : 'text-gray-400'
                                }`}
                            >
                                {g === 'SD' ? 'Senior Division (SD)' : 'Senior Wing (SW)'}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-6">
                        <InputField label="Height" value={height} onChange={setHeight} min={140} max={200} unit="cm" />
                        <InputField label="Chest" value={chest} onChange={setChest} min={70} max={130} unit="cm" />
                        <InputField label="Waist" value={waist} onChange={setWaist} min={60} max={120} unit="cm" />
                    </div>

                    <div className="p-4 bg-amber-50 dark:bg-amber-500/5 rounded-2xl border border-amber-100 dark:border-amber-500/10 flex gap-3">
                        <Info className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                            Measurements are for guideline purposes only. Actual fit may vary based on uniform manufacturer (DGS&D/Private).
                        </p>
                    </div>
                </div>

                {/* Results */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 dark:text-white/80 uppercase tracking-[0.2em] px-4">Predicted Sizes</h3>
                    
                    <SizeCard 
                        title="Ceremonial Tunic / Shirt" 
                        size={predictions.shirt} 
                        description="Based on chest circumference. Includes allowance for drill movements." 
                    />
                    
                    <SizeCard 
                        title="Trouser / Slacks" 
                        size={predictions.pant} 
                        description="Based on waist measurement at the naval point." 
                    />
                    
                    <SizeCard 
                        title="Beret / Cap" 
                        size={predictions.beret} 
                        description="Standardized based on height and estimated head circumference." 
                    />

                    <SizeCard 
                        title="DMS Shoes / Boots" 
                        size={predictions.dms_shoes} 
                        description="Standard UK/IND sizing. Based on height-to-foot proportionality guidelines." 
                    />

                    <button 
                        onClick={handleSaveToKit}
                        disabled={loading}
                        className="w-full flex items-center justify-between p-6 bg-ncc-navy text-white rounded-[2.5rem] hover:bg-ncc-navy/90 transition-all group shadow-xl active:scale-95 disabled:opacity-50"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Inventory Action</p>
                                <p className="font-bold text-sm">{loading ? 'Saving...' : 'Save to Kit Request'}</p>
                            </div>
                        </div>
                        {!loading && <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default KitFitPredictor;
