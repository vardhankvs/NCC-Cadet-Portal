import React, { useState, useEffect } from 'react';
import { X } from '../../components/Icons.jsx';
import { saveInventoryItem } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';

export const InventoryForm = ({ item, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        category: 'Clothing',
        totalStock: 0,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (item) {
            setFormData({
                name: item.name || '',
                category: item.category || 'Clothing',
                totalStock: item.totalStock || 0,
            });
        }
    }, [item]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) return toast.error('Name is required');

        setIsSubmitting(true);
        try {
            await saveInventoryItem(formData, item ? item.id : null);
            toast.success(item ? 'Item updated!' : 'Item added!');
            onClose();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 fade-in">
            <div className="bg-white dark:bg-[#050b14] rounded-xl shadow-2xl w-full max-w-md modal-in overflow-hidden flex flex-col max-h-full">
                <div className="flex items-center justify-between px-6 py-4 bg-ncc-navy text-white">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-[#d4a83a] font-bold">
                            Q-Store
                        </p>
                        <h2 className="text-lg font-bold font-display">
                            {item ? 'Edit Item' : 'Add Inventory Item'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/70 hover:text-white hover:bg-white dark:bg-[#050b14]/10 rounded-lg transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="ncc-label">Item / Size Name</label>
                        <input
                            type="text"
                            required
                            className="ncc-input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Khaki Uniform Size 38"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="ncc-label">Category</label>
                            <select
                                className="ncc-input"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="Clothing">Clothing</option>
                                <option value="Equipment">Equipment</option>
                                <option value="Accoutrements">Accoutrements</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="ncc-label">Total Stock</label>
                            <input
                                type="number"
                                min="0"
                                required
                                className="ncc-input"
                                value={formData.totalStock}
                                onChange={(e) => setFormData({ ...formData, totalStock: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-white/70 bg-[#f5f0e8] dark:bg-[#0a1628] p-3 rounded-lg border border-[#ddd8cc]">
                        {item
                            ? "Notice: Updating total stock will automatically adjust the 'available store' count accordingly."
                            : "New items will have their 'available stock' set to match the total stock automatically."}
                    </p>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#ede8df] mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="ncc-btn ncc-btn-ghost"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="ncc-btn ncc-btn-primary"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
