import React, { useState } from 'react';
import { X, UserPlus, LogIn } from '../../components/Icons.jsx';
import { issueItemToCadet, returnItemFromCadet } from '../../firebase/firestoreService.js';
import { useDataContext } from '../../context/DataContext.jsx';
import { toast } from 'react-toastify';

export const IssueReturnModal = ({ onClose }) => {
    const { cadets, inventory } = useDataContext();
    const [action, setAction] = useState('ISSUE'); // ISSUE or RETURN
    const [cadetId, setCadetId] = useState('');
    const [itemId, setItemId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!cadetId || !itemId || quantity < 1) return toast.error('Please fill all fields');

        setIsSubmitting(true);
        try {
            const selectedItem = inventory.find(i => i.id === itemId);
            if (action === 'ISSUE') {
                await issueItemToCadet(itemId, cadetId, quantity);
                toast.success('Item issued successfully!');
            } else {
                await returnItemFromCadet(itemId, cadetId, selectedItem?.name, quantity);
                toast.success('Item returned successfully!');
            }
            onClose();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 fade-in">
            <div className="bg-white dark:bg-[#050b14] rounded-xl shadow-2xl w-full max-w-md modal-in overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 bg-ncc-navy text-white">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-[#d4a83a] font-bold">
                            Q-Store Transaction
                        </p>
                        <h2 className="text-lg font-bold font-display">
                            Issue or Return
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-white/70 hover:text-white hover:bg-white dark:bg-[#050b14]/10 rounded-lg transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Action Toggle */}
                    <div className="flex p-1 bg-[#f5f0e8] dark:bg-[#0a1628] rounded-lg mb-6 border border-[#ddd8cc] dark:border-white/10">
                        <button
                            type="button"
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${
                                action === 'ISSUE' ? 'bg-white dark:bg-[#050b14] shadow-sm text-ncc-navy dark:text-white' : 'text-gray-500 dark:text-white/70 hover:bg-white dark:hover:bg-white/5'
                            }`}
                            onClick={() => setAction('ISSUE')}
                        >
                            <UserPlus className="w-3.5 h-3.5" /> Issue to Cadet
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${
                                action === 'RETURN' ? 'bg-white dark:bg-[#050b14] shadow-sm text-ncc-navy dark:text-white' : 'text-gray-500 dark:text-white/70 hover:bg-white dark:hover:bg-white/5'
                            }`}
                            onClick={() => setAction('RETURN')}
                        >
                            <LogIn className="w-3.5 h-3.5" /> Return to Store
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="ncc-label">Select Cadet</label>
                            <select
                                className="ncc-input dark:bg-[#0a1628]"
                                value={cadetId}
                                onChange={(e) => setCadetId(e.target.value)}
                                required
                            >
                                <option value="" className="dark:bg-[#0a1628]">-- Choose a Cadet --</option>
                                {cadets.map(c => (
                                    <option key={c.id} value={c.id} className="dark:bg-[#0a1628]">
                                        {c.enrollmentId} - {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="ncc-label">Select Item</label>
                            <select
                                className="ncc-input dark:bg-[#0a1628]"
                                value={itemId}
                                onChange={(e) => setItemId(e.target.value)}
                                required
                            >
                                <option value="" className="dark:bg-[#0a1628]">-- Choose an Item --</option>
                                {inventory.map(i => {
                                    const disabledInfo = action === 'ISSUE' && i.availableStock < 1 ? ' (Out of stock)' : '';
                                    return (
                                        <option key={i.id} value={i.id} disabled={action === 'ISSUE' && i.availableStock < 1} className="dark:bg-[#0a1628]">
                                            {i.name} - Available: {i.availableStock}{disabledInfo}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div>
                            <label className="ncc-label">Quantity</label>
                            <input
                                type="number"
                                min="1"
                                className="ncc-input w-24"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-[#ede8df] mt-6">
                            <button type="button" onClick={onClose} className="ncc-btn ncc-btn-ghost">
                                Cancel
                            </button>
                            <button type="submit" disabled={isSubmitting} className="ncc-btn ncc-btn-primary">
                                {isSubmitting ? 'Processing...' : `Confirm ${action}`}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
