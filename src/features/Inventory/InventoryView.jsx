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
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-[#ddd8cc] shadow-sm">
                        <Package className="w-5 h-5 text-ncc-navy" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold font-display text-ncc-navy">Quartermaster (Q-Store)</h2>
                        <p className="text-sm text-gray-500">Manage NCC uniforms, equipment and transactions</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
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

            {/* Inventory Table */}
            <div className="bg-white rounded-xl shadow-sm border border-[#ddd8cc] overflow-hidden">
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
                                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                                        No items in Q-Store. Add your first item!
                                    </td>
                                </tr>
                            ) : (
                                inventory.map(item => {
                                    const lowStock = item.availableStock < 5;
                                    return (
                                        <tr key={item.id} className="ncc-tr">
                                            <td className="ncc-td font-semibold text-ncc-navy">{item.name}</td>
                                            <td className="ncc-td">
                                                <span className="px-2 py-1 rounded bg-[#f5f0e8] text-xs font-semibold text-gray-700">
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
