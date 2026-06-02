import React, { useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { getCollectionRef } from '../../firebase/firestoreService.js';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { X, Award } from '../../components/Icons.jsx';
import { toast } from 'react-toastify';

export const CertificateUploadModal = ({ cadet, existingCert, onClose }) => {
    const [certLevel, setCertLevel] = useState(existingCert ? existingCert.certLevel.replace(' Certificate', '') : 'B');
    const [year, setYear] = useState(existingCert ? existingCert.year : new Date().getFullYear().toString());
    const [theoryMarks, setTheoryMarks] = useState(existingCert ? existingCert.theoryMarks.toString() : '');
    const [theoryMax, setTheoryMax] = useState(existingCert ? existingCert.theoryMax.toString() : '350');
    const [practicalMarks, setPracticalMarks] = useState(existingCert ? existingCert.practicalMarks.toString() : '');
    const [practicalMax, setPracticalMax] = useState(existingCert ? existingCert.practicalMax.toString() : '150');
    const [bonusMarks, setBonusMarks] = useState(existingCert && existingCert.bonusMarks ? existingCert.bonusMarks.toString() : '');
    const [saving, setSaving] = useState(false);

    const computeGrade = () => {
        const tScored = parseInt(theoryMarks);
        const tMax = parseInt(theoryMax) || 350;
        const pScored = parseInt(practicalMarks);
        const pMax = parseInt(practicalMax) || 150;
        const bMarks = parseInt(bonusMarks) || 0;

        if (isNaN(tScored) || isNaN(pScored)) return { grade: '-', agg: 0 };

        const tPercent = (tScored / tMax) * 100;
        const pPercent = (pScored / pMax) * 100;
        
        const totalScored = tScored + pScored + bMarks;
        const totalMax = tMax + pMax;
        const aggPercent = (totalScored / totalMax) * 100;

        let grade = 'Fail';
        if (tPercent < 45 || pPercent < 45 || aggPercent < 50) {
            grade = 'Fail';
        } else if (aggPercent >= 80) {
            grade = 'A';
        } else if (aggPercent >= 65) {
            grade = 'B';
        } else if (aggPercent >= 50) {
            grade = 'C';
        }
        
        return { grade, agg: aggPercent.toFixed(1) };
    };

    const { grade: finalGrade, agg: aggregatePercent } = computeGrade();

    const handleSave = async (e) => {
        e.preventDefault();
        if (!theoryMarks || !practicalMarks) return toast.error("Please enter all marks.");

        setSaving(true);
        try {
            const newCert = {
                id: existingCert ? existingCert.id : Date.now().toString(),
                type: 'certificate',
                certLevel: certLevel + ' Certificate',
                year,
                theoryMarks: parseInt(theoryMarks),
                theoryMax: parseInt(theoryMax),
                practicalMarks: parseInt(practicalMarks),
                practicalMax: parseInt(practicalMax),
                bonusMarks: parseInt(bonusMarks) || 0,
                totalScore: parseInt(theoryMarks) + parseInt(practicalMarks) + (parseInt(bonusMarks) || 0),
                totalMax: parseInt(theoryMax) + parseInt(practicalMax),
                finalGrade,
                dateAdded: existingCert && existingCert.dateAdded ? existingCert.dateAdded : new Date().toISOString(),
                dateModified: new Date().toISOString()
            };

            const cadetRef = doc(getCollectionRef('cadets'), cadet.id);
            let currentCerts = cadet.certifications || [];
            
            if (existingCert) {
                currentCerts = currentCerts.map(c => c.id === existingCert.id ? newCert : c);
            } else {
                currentCerts = [...currentCerts, newCert];
            }
            
            await updateDoc(cadetRef, {
                certifications: currentCerts
            });

            toast.success(existingCert ? "Marks updated successfully!" : "Certification marks uploaded successfully!");
            onClose();
        } catch (error) {
            console.error("Error saving cert:", error);
            toast.error("Failed to upload marks.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="bg-white dark:bg-[#050b14] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="bg-ncc-navy p-6 text-white relative">
                    <button 
                        onClick={onClose} 
                        className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4 text-ncc-gold">
                        <Award className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-display font-bold">{existingCert ? 'Edit Certification' : 'Upload Certification'}</h2>
                    <p className="text-sm text-white/70 mt-1">{existingCert ? 'Update' : 'Record'} offline exam marks for {cadet.name || 'Cadet'}</p>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">Certificate</label>
                            <select 
                                className="ncc-input text-sm h-11"
                                value={certLevel}
                                onChange={e => setCertLevel(e.target.value)}
                            >
                                <option value="B">B Certificate</option>
                                <option value="C">C Certificate</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">Exam Year</label>
                            <input 
                                type="number" 
                                required
                                className="ncc-input text-sm h-11"
                                value={year}
                                onChange={e => setYear(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-white/5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">Theory Marks</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" required className="ncc-input text-sm h-11" placeholder="e.g. 240" value={theoryMarks} onChange={e => setTheoryMarks(e.target.value)} />
                                    <span className="text-gray-400 dark:text-white/40">/</span>
                                    <input type="number" required className="ncc-input text-sm h-11 w-16 px-2 text-center" value={theoryMax} onChange={e => setTheoryMax(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">Practical Marks</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" required className="ncc-input text-sm h-11" placeholder="e.g. 100" value={practicalMarks} onChange={e => setPracticalMarks(e.target.value)} />
                                    <span className="text-gray-400 dark:text-white/40">/</span>
                                    <input type="number" required className="ncc-input text-sm h-11 w-16 px-2 text-center" value={practicalMax} onChange={e => setPracticalMax(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">Bonus Marks (Camps/Events)</label>
                            <input 
                                type="number" 
                                className="ncc-input text-sm h-11 w-full"
                                placeholder="e.g. 15 (Optional)"
                                value={bonusMarks}
                                onChange={e => setBonusMarks(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 p-4 rounded-xl flex items-center justify-between">
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 dark:text-white/60 uppercase tracking-widest mb-1">Calculated Aggregate</label>
                            <div className="text-sm font-bold text-ncc-navy dark:text-white">
                                {finalGrade !== '-' ? `${aggregatePercent}%` : '--%'}
                            </div>
                        </div>
                        <div className="text-right">
                            <label className="block text-[10px] font-black text-gray-500 dark:text-white/60 uppercase tracking-widest mb-1">Auto-Grade</label>
                            <div className={`text-2xl font-display font-bold ${
                                finalGrade === 'Fail' ? 'text-red-500' : 
                                finalGrade === '-' ? 'text-gray-400' : 'text-emerald-500'
                            }`}>
                                {finalGrade === 'Fail' ? 'FAIL' : finalGrade === '-' ? '-' : `GRADE ${finalGrade}`}
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={saving || finalGrade === '-'}
                        className="w-full ncc-btn ncc-btn-primary justify-center h-12 text-sm uppercase tracking-widest mt-6"
                    >
                        {saving ? 'Saving...' : 'Save Certification'}
                    </button>
                </form>
            </div>
        </ModalOverlay>
    );
};
