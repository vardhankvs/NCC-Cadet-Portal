
import React, { useState } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { updateKitSizes } from '../../firebase/firestoreService.js';
import { Package, Shield, User, CheckCircle, Clock, AlertCircle, Download } from '../../components/Icons.jsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { KitFitPredictor } from './KitFitPredictor.jsx';
import { Ruler } from '../../components/Icons.jsx';

export const KitManagementView = () => {
    const { user, userRole, userEnrollmentId } = useAuthContext();
    const { cadets = [] } = useDataContext();
    const isAdmin = userRole === 'admin' || userRole === 'officer';

    const currentCadet = cadets.find(c => c.enrollmentId === userEnrollmentId);
    const [loading, setLoading] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState('profile'); // 'profile' or 'predictor'
    
    // Admin Filters
    const [filterCert, setFilterCert] = useState('All');
    const [filterDiv, setFilterDiv] = useState('All');

    const filteredCadets = React.useMemo(() => {
        return cadets.filter(c => {
            const rawCert = c.certificate || c.B || '';
            const cadetCert = typeof rawCert === 'string' ? rawCert.trim().toUpperCase() : String(rawCert);
            const matchCert = filterCert === 'All' || cadetCert === filterCert.toUpperCase();
            
            const regId = (c.enrollmentId || c.regimentalNumber || '').toUpperCase();
            const rawDiv = c.division || (regId.includes('SD') ? 'SD' : regId.includes('SW') ? 'SW' : '');
            const cadetDiv = typeof rawDiv === 'string' ? rawDiv.trim().toUpperCase() : String(rawDiv);
            const matchDiv = filterDiv === 'All' || cadetDiv === filterDiv.toUpperCase();
            
            return matchCert && matchDiv;
        });
    }, [cadets, filterCert, filterDiv]);

    const exportExcel = () => {
        const data = filteredCadets.map(c => {
            const regId = (c.enrollmentId || c.regimentalNumber || '').toUpperCase();
            const inferredDiv = c.division || (regId.includes('SD') ? 'SD' : regId.includes('SW') ? 'SW' : '-');
            
            return {
                'Name': c.name,
                'Regimental No': c.enrollmentId || c.regimentalNumber || '-',
                'Certificate': c.certificate || c.B || '-',
                'Division': inferredDiv,
                'Beret': c.kitSizes?.beret || '-',
                'Shirt': c.kitSizes?.shirt || '-',
                'Pant': c.kitSizes?.pant || '-',
                'DMS Shoes': c.kitSizes?.boots || c.kitSizes?.dms_shoes || '-'
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Kit_Sizes");
        XLSX.writeFile(wb, `Kit_Sizes_Nominal_Roll.xlsx`);
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Kit Sizes Nominal Roll", 14, 15);
        doc.setFontSize(10);
        doc.text(`Certificate: ${filterCert} | Division: ${filterDiv} | Total: ${filteredCadets.length}`, 14, 22);
        
        const tableColumn = ["Cadet", "Reg No.", "Cert", "Div", "Beret", "Shirt", "Pant", "DMS Shoes"];
        const tableRows = filteredCadets.map(c => {
            const regId = (c.enrollmentId || c.regimentalNumber || '').toUpperCase();
            const inferredDiv = c.division || (regId.includes('SD') ? 'SD' : regId.includes('SW') ? 'SW' : '-');
            
            return [
                c.name,
                c.enrollmentId || c.regimentalNumber || '-',
                c.certificate || c.B || '-',
                inferredDiv,
                c.kitSizes?.beret || '-',
                c.kitSizes?.shirt || '-',
                c.kitSizes?.pant || '-',
                c.kitSizes?.boots || c.kitSizes?.dms_shoes || '-'
            ];
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 28,
            theme: 'grid',
            headStyles: { fillColor: [10, 22, 40] },
            styles: { fontSize: 8 }
        });

        doc.save(`Kit_Sizes_Nominal_Roll.pdf`);
    };
    const [sizes, setSizes] = useState(currentCadet?.kitSizes || {
        beret: '',
        shirt: '',
        pant: '',
        boots: '',
        belt: ''
    });

    const handleSaveSizes = async () => {
        setLoading(true);
        try {
            await updateKitSizes(currentCadet.id, sizes);
            toast.success('Sizing profile updated!');
        } catch (err) {
            toast.error('Failed to update sizing');
        } finally {
            setLoading(false);
        }
    };

    const TabButton = ({ id, name, icon: Icon }) => (
        <button
            onClick={() => setActiveSubTab(id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeSubTab === id 
                ? 'bg-ncc-navy text-white shadow-lg' 
                : 'bg-white dark:bg-white/5 text-gray-400 hover:text-ncc-navy dark:hover:text-white border border-gray-100 dark:border-white/10'
            }`}
        >
            <Icon className="w-4 h-4" />
            {name}
        </button>
    );

    const renderKitContent = () => {
        if (activeSubTab === 'predictor') return <KitFitPredictor />;

        if (isAdmin) {
            return (
                <div className="space-y-8 fade-in">
                    <header className="bg-white dark:bg-[#050b14] p-6 rounded-3xl border border-ncc-navy/5 shadow-sm">
                        <div className="flex flex-col gap-4">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-display font-bold text-ncc-navy dark:text-white mb-1">Unit Sizing Nominal Roll</h2>
                                <p className="text-gray-500 dark:text-white/70 text-sm">Aggregate size requirements for bulk equipment procurement.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <select 
                                    value={filterCert} 
                                    onChange={(e) => setFilterCert(e.target.value)}
                                    className="bg-ncc-navy/5 dark:bg-[#0a1628] border border-transparent focus:border-ncc-gold/30 rounded-xl px-3 py-2 text-xs font-bold text-ncc-navy dark:text-white outline-none flex-1 min-w-[120px]"
                                >
                                    <option value="All" className="dark:bg-[#0a1628]">All Certificates</option>
                                    <option value="B1" className="dark:bg-[#0a1628]">B1 Certificate</option>
                                    <option value="C" className="dark:bg-[#0a1628]">C Certificate</option>
                                </select>
                                <select 
                                    value={filterDiv} 
                                    onChange={(e) => setFilterDiv(e.target.value)}
                                    className="bg-ncc-navy/5 dark:bg-[#0a1628] border border-transparent focus:border-ncc-gold/30 rounded-xl px-3 py-2 text-xs font-bold text-ncc-navy dark:text-white outline-none flex-1 min-w-[120px]"
                                >
                                    <option value="All" className="dark:bg-[#0a1628]">All Divisions</option>
                                    <option value="SD" className="dark:bg-[#0a1628]">SD (Boys)</option>
                                    <option value="SW" className="dark:bg-[#0a1628]">SW (Girls)</option>
                                </select>
                                <div className="bg-ncc-gold/10 px-4 py-2 rounded-xl text-ncc-gold font-bold text-xs uppercase tracking-widest flex items-center whitespace-nowrap">
                                    {filteredCadets.length} Cadets Indexed
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {['beret', 'shirt', 'pant', 'boots'].map(item => {
                            const displayName = item === 'boots' ? 'DMS Shoes' : item;
                            const stats = {};
                            filteredCadets.forEach(c => {
                                const val = c.kitSizes?.[item];
                                if (val) stats[val] = (stats[val] || 0) + 1;
                            });

                            return (
                                <div key={item} className="ncc-card p-6">
                                    <h3 className="text-[10px] font-black text-ncc-navy dark:text-white/30 uppercase tracking-[0.2em] mb-4">{displayName} Distribution</h3>
                                    <div className="space-y-3">
                                        {Object.entries(stats).length > 0 ? Object.entries(stats).map(([size, count]) => (
                                            <div key={size} className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-ncc-navy dark:text-white">{size}</span>
                                                <div className="flex-1 mx-3 h-1.5 bg-ncc-navy/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-ncc-gold" style={{ width: `${(count / filteredCadets.length) * 100}%` }} />
                                                </div>
                                                <span className="text-xs font-mono text-gray-400 dark:text-white/80">{count}</span>
                                            </div>
                                        )) : <p className="text-[10px] italic text-gray-400 dark:text-white/80">No data available</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-white dark:bg-[#050b14] rounded-[2rem] border border-ncc-navy/5 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left min-w-[480px]">
                            <thead className="bg-ncc-navy text-white">
                                <tr>
                                    <th className="px-3 sm:px-6 py-4 font-display font-bold uppercase tracking-widest text-[10px]">Cadet</th>
                                    <th className="px-3 sm:px-6 py-4 font-display font-bold uppercase tracking-widest text-[10px]">Beret</th>
                                    <th className="px-3 sm:px-6 py-4 font-display font-bold uppercase tracking-widest text-[10px]">Shirt</th>
                                    <th className="px-3 sm:px-6 py-4 font-display font-bold uppercase tracking-widest text-[10px]">Pant</th>
                                    <th className="px-3 sm:px-6 py-4 font-display font-bold uppercase tracking-widest text-[10px]">DMS Shoes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ncc-navy/5">
                                {filteredCadets.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400 dark:text-white/80 font-medium italic">No cadets found matching the filters.</td></tr>
                                ) : (
                                    filteredCadets.map(cadet => {
                                        const regId = (cadet.enrollmentId || cadet.regimentalNumber || '').toUpperCase();
                                        const inferredDiv = cadet.division || (regId.includes('SD') ? 'SD' : regId.includes('SW') ? 'SW' : '-');
                                        
                                        return (
                                            <tr key={cadet.id} className="hover:bg-ncc-navy/[0.02] transition-colors">
                                                <td className="px-3 sm:px-6 py-4">
                                                    <div className="font-bold text-ncc-navy dark:text-white">{cadet.name}</div>
                                                    <div className="text-[10px] text-ncc-gold font-black uppercase tracking-widest flex items-center gap-2">
                                                        {cadet.enrollmentId || cadet.regimentalNumber || '-'}
                                                        <span className="bg-ncc-navy/5 px-1.5 py-0.5 rounded text-[8px] text-ncc-navy dark:text-white/50">{inferredDiv}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 font-mono text-gray-500 dark:text-white/70">{cadet.kitSizes?.beret || '-'}</td>
                                                <td className="px-3 sm:px-6 py-4 font-mono text-gray-500 dark:text-white/70">{cadet.kitSizes?.shirt || '-'}</td>
                                                <td className="px-3 sm:px-6 py-4 font-mono text-gray-500 dark:text-white/70">{cadet.kitSizes?.pant || '-'}</td>
                                                <td className="px-3 sm:px-6 py-4 font-mono text-gray-500 dark:text-white/70">{cadet.kitSizes?.boots || cadet.kitSizes?.dms_shoes || '-'}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 mt-6">
                        <button 
                            onClick={exportExcel}
                            className="px-6 py-2.5 bg-white dark:bg-[#050b14] border border-ncc-navy/10 text-ncc-navy dark:text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-ncc-navy hover:text-white transition-all flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" /> Export Excel
                        </button>
                        <button 
                            onClick={exportPDF}
                            className="px-6 py-2.5 bg-ncc-gold text-ncc-navy dark:text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-yellow-500 transition-all flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" /> Export PDF
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="max-w-2xl mx-auto space-y-8 fade-in">
                <header className="text-center space-y-4">
                    <div className="w-16 h-16 bg-ncc-navy rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-ncc-navy/20">
                        <Shield className="w-8 h-8 text-ncc-gold" />
                    </div>
                    <h2 className="text-3xl font-display font-bold text-ncc-navy dark:text-white">My Kit Sizing Profile</h2>
                    <p className="text-gray-500 dark:text-white/70">Ensure your equipment fits perfectly by keeping your sizing data up to date.</p>
                </header>

                <div className="ncc-card p-10 space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Beret Size</label>
                            <select 
                                value={sizes.beret}
                                onChange={(e) => setSizes({...sizes, beret: e.target.value})}
                                className="w-full bg-ncc-navy/5 dark:bg-[#0a1628] border-2 border-transparent focus:border-ncc-gold/30 dark:text-white rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all"
                            >
                                <option value="" className="dark:bg-[#0a1628]">Select Size</option>
                                {['6 3/4', '6 7/8', '7', '7 1/8', '7 1/4', '7 3/8', '7 1/2'].map(s => <option key={s} value={s} className="dark:bg-[#0a1628]">{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">DMS Shoes (UK/IND)</label>
                            <select 
                                value={sizes.boots}
                                onChange={(e) => setSizes({...sizes, boots: e.target.value})}
                                className="w-full bg-ncc-navy/5 dark:bg-[#0a1628] border-2 border-transparent focus:border-ncc-gold/30 dark:text-white rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all"
                            >
                                <option value="" className="dark:bg-[#0a1628]">Select Size</option>
                                {[6, 7, 8, 9, 10, 11, 12].map(s => <option key={s} value={s} className="dark:bg-[#0a1628]">{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Shirt Size</label>
                            <select 
                                value={sizes.shirt}
                                onChange={(e) => setSizes({...sizes, shirt: e.target.value})}
                                className="w-full bg-ncc-navy/5 dark:bg-[#0a1628] border-2 border-transparent focus:border-ncc-gold/30 dark:text-white rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all"
                            >
                                <option value="" className="dark:bg-[#0a1628]">Select Size</option>
                                {['36 (S)', '38 (M)', '40 (L)', '42 (XL)', '44 (XXL)'].map(s => <option key={s} value={s} className="dark:bg-[#0a1628]">{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Pant / Waist</label>
                            <select 
                                value={sizes.pant}
                                onChange={(e) => setSizes({...sizes, pant: e.target.value})}
                                className="w-full bg-ncc-navy/5 dark:bg-[#0a1628] border-2 border-transparent focus:border-ncc-gold/30 dark:text-white rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all"
                            >
                                <option value="" className="dark:bg-[#0a1628]">Select Size</option>
                                {[28, 30, 32, 34, 36, 38, 40].map(s => <option key={s} value={s} className="dark:bg-[#0a1628]">{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <button 
                        onClick={handleSaveSizes}
                        disabled={loading}
                        className="w-full ncc-btn ncc-btn-primary justify-center py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-ncc-navy/20"
                    >
                        {loading ? 'Updating Arsenal...' : 'Update Sizing Profile'}
                    </button>
                </div>

                <div className="bg-ncc-navy/5 p-6 rounded-2xl border border-ncc-navy/5 flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-ncc-gold shrink-0 mt-0.5" />
                    <p className="text-xs text-ncc-navy dark:text-white/60 leading-relaxed italic">
                        Note: Your sizing profile is used by the Quartermaster for bulk uniform orders. Please ensure these are measured according to standard unit protocols.
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {!isAdmin && (
                <div className="flex gap-4 p-2 bg-gray-50 dark:bg-white/5 rounded-2xl w-fit mx-auto shadow-inner border border-gray-100 dark:border-white/10">
                    <TabButton id="profile" name="Sizing Profile" icon={Package} />
                    <TabButton id="predictor" name="Size Predictor" icon={Ruler} />
                </div>
            )}

            <div className="fade-in">
                {renderKitContent()}
            </div>
        </div>
    );
};
