import React, { useState } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { Package, Plus, AlertCircle, Edit, Trash2 } from '../../components/Icons.jsx';
import { InventoryForm } from './InventoryForm.jsx';
import { IssueReturnModal } from './IssueReturnModal.jsx';
import { deleteItem } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';

export const InventoryView = () => {
    const { inventory = [], inventoryLogs = [] } = useDataContext();
    const [showForm, setShowForm] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const handleEdit = (item) => {
        setEditingItem(item);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this specific stock item entirely?")) {
            try {
                await deleteItem('inventory', id);
                toast.success('Deleted successfully');
            } catch (err) {
                toast.error(err.message);
            }
        }
    };

    return (
        <div className="space-y-6 fade-in">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-[#050b14] border border-[#ddd8cc] shadow-sm">
                        <Package className="w-5 h-5 text-ncc-navy dark:text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold font-display text-ncc-navy dark:text-white">Quartermaster (Q-Store)</h2>
                        <p className="text-sm text-gray-500 dark:text-white/70">Manage NCC uniforms, equipment and transactions</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowScanner(!showScanner)}
                        className={`ncc-btn ${showScanner ? 'bg-ncc-red text-white' : 'ncc-btn-ghost border-ncc-navy text-ncc-navy dark:text-white'}`}
                    >
                        {showScanner ? 'Close Scanner' : 'Barcode Scanner'}
                    </button>
                    <button
                        onClick={() => setShowIssueModal(true)}
                        className="ncc-btn ncc-btn-ghost border-[#b8830e] text-[#b8830e] hover:bg-[#b8830e] hover:text-white"
                    >
                        Issue / Return Gear
                    </button>
                    <button
                        onClick={() => { setEditingItem(null); setShowForm(true); }}
                        className="ncc-btn ncc-btn-primary"
                    >
                        <Plus className="w-4 h-4" /> Add New Stock
                    </button>
                </div>
            </div>
            {showScanner && (
                <div className="bg-ncc-navy p-8 rounded-3xl text-white text-center animate-pulse border-4 border-dashed border-ncc-gold/30">
                    <div className="w-20 h-20 bg-ncc-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-10 h-10 text-ncc-gold" />
                    </div>
                    <h3 className="text-xl font-bold font-display mb-2">Scanner Active</h3>
                    <p className="text-sm text-white/60 mb-6">Point your camera at a QR code or barcode on the equipment tag.</p>
                    <div className="w-64 h-48 bg-black/40 rounded-2xl mx-auto border-2 border-ncc-gold relative overflow-hidden">
                        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-ncc-red animate-scan shadow-[0_0_15px_rgba(255,0,0,0.8)]" />
                    </div>
                    <button onClick={() => setShowScanner(false)} className="mt-8 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white">Cancel Scanning</button>
                </div>
            )}
            {/* Inventory Table */}
            <div className="bg-white dark:bg-[#050b14] rounded-xl shadow-sm border border-[#ddd8cc] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="ncc-table-head">
                            <tr>
                                <th className="ncc-th">Item Name / Size</th>
                                <th className="ncc-th">Category</th>
                                <th className="ncc-th text-center">Available Stock</th>
                                <th className="ncc-th text-center">Total Stock</th>
                                <th className="ncc-th text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventory.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-white/70">
                                        No items in Q-Store. Add your first item!
                                    </td>
                                </tr>
                            ) : (
                                inventory.map(item => {
                                    const lowStock = item.availableStock < 5;
                                    return (
                                        <tr key={item.id} className="ncc-tr">
                                            <td className="ncc-td font-semibold text-ncc-navy dark:text-white">{item.name}</td>
                                            <td className="ncc-td">
                                                <span className="px-2 py-1 rounded bg-[#f5f0e8] dark:bg-[#0a1628] text-xs font-semibold text-gray-700 dark:text-white/90">
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="ncc-td text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className={`text-lg font-bold ${lowStock ? 'text-ncc-red' : 'text-emerald-600'}`}>
                                                        {item.availableStock !== undefined ? item.availableStock : '-'}
                                                    </span>
                                                    {lowStock && <AlertCircle className="w-4 h-4 text-ncc-red" title="Low Stock!" />}
                                                </div>
                                            </td>
                                            <td className="ncc-td text-center font-mono opacity-60 bg-[#f9f8f6]">
                                                {item.totalStock}
                                            </td>
                                            <td className="ncc-td relative">
                                                <div className="flex items-center justify-end gap-2 pr-2">
                                                    <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition" title="Edit">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition" title="Delete">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {showForm && (
                <InventoryForm
                    item={editingItem}
                    onClose={() => { setShowForm(false); setEditingItem(null); }}
                />
            )}

            {showIssueModal && (
                <IssueReturnModal
                    onClose={() => setShowIssueModal(false)}
                />
            )}
        </div>
    );
};
