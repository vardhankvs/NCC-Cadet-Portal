// src/features/SocialService/SocialGalleryModal.jsx
import React, { useState } from 'react';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { 
    X, 
    Trash2, 
    Image as ImageIcon, 
    Loader,
    Plus,
    LinkIcon,
    Camera,
    ExternalLink
} from '../../components/Icons.jsx';
import { addImageToSocialActivity, deleteImageFromSocialActivity } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';

export const SocialGalleryModal = ({ activity, onClose, userRole }) => {
    const [newLink, setNewLink] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [deletingUrl, setDeletingUrl] = useState(null);

    const imageUrls = Array.isArray(activity?.imageUrls) ? activity.imageUrls : [];

    const handleAddLink = async (e) => {
        if (e) e.preventDefault();
        if (!newLink.trim()) {
            toast.info("Please paste a Google Drive or Image link.");
            return;
        }

        setSubmitting(true);
        try {
            await addImageToSocialActivity(activity.id, newLink.trim());
            toast.success("Photo link added!");
            setNewLink('');
        } catch (err) {
            toast.error(err.message || "Failed to add link");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (url) => {
        if (!window.confirm("Remove this photo/link?")) return;
        setDeletingUrl(url);
        try {
            await deleteImageFromSocialActivity(activity.id, url);
            toast.success("Removed successfully.");
        } catch (err) {
            toast.error("Removal failed.");
        } finally {
            setDeletingUrl(null);
        }
    };

    const isDirectImage = (url) => {
        try {
            return url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || url.includes('firebasestorage');
        } catch (e) { return false; }
    };

    return (
        <ModalOverlay wide={true}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="px-6 py-4 bg-ncc-navy text-white flex items-center justify-between shadow-md">
                    <div>
                        <h3 className="text-xl font-bold font-display">{activity.title}</h3>
                        <p className="text-xs text-white/70">Activity Gallery • {imageUrls.length} Items</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Simplified Link Toolbar (Admin Only) */}
                {userRole === 'admin' && (
                    <div className="px-6 py-6 border-b border-gray-100 bg-gray-50">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <span className="p-2 bg-ncc-navy rounded-lg">
                                    <Camera className="w-5 h-5 text-ncc-gold" />
                                </span>
                                <h4 className="font-bold text-ncc-navy text-sm">Add Activity Photo via Drive Link</h4>
                            </div>
                            
                            <form onSubmit={handleAddLink} className="flex flex-col sm:flex-row gap-2">
                                <div className="flex-1 relative">
                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ncc-gold" />
                                    <input 
                                        type="url"
                                        required
                                        placeholder="Paste Google Drive / Image Link here..."
                                        className="ncc-input pl-10 w-full h-[46px]"
                                        value={newLink}
                                        onChange={(e) => setNewLink(e.target.value)}
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="ncc-btn bg-ncc-gold text-ncc-navy hover:bg-[#d4a83a] flex items-center justify-center gap-2 py-2 px-8 shadow-sm font-bold min-w-[140px] h-[46px]"
                                >
                                    {submitting ? <Loader className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Add</>}
                                </button>
                            </form>
                            
                            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                                <p className="text-xs text-blue-800 leading-relaxed font-medium">
                                    <strong>How to share from Google Drive:</strong> Upload your photo to Drive, right-click it, select "Share", set access to <strong>"Anyone with the link can view"</strong>, then paste the link above.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Gallery Content */}
                <div className="flex-1 overflow-y-auto p-6 ncc-scrollbar bg-white">
                    {imageUrls.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                            <ImageIcon className="w-16 h-16 mb-4 opacity-10" />
                            <p className="font-bold text-gray-500">No photos shared yet.</p>
                            {userRole === 'admin' && (
                                <p className="text-xs mt-2 text-center max-w-xs">
                                    Document the social impact by adding Drive links to photos taken during the activity.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                            {imageUrls.map((url, idx) => {
                                const directImage = isDirectImage(url);
                                return (
                                    <div 
                                        key={idx} 
                                        className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300"
                                    >
                                        <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                                            {directImage ? (
                                                <img 
                                                    src={url} 
                                                    alt="Activity" 
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                                />
                                            ) : (
                                                <>
                                                    <div className="w-14 h-14 rounded-full bg-ncc-navy/5 flex items-center justify-center mb-3">
                                                        <ExternalLink className="w-7 h-7 text-ncc-gold/40" />
                                                    </div>
                                                    <p className="text-[10px] font-black text-ncc-navy/50 tracking-tighter uppercase mb-1">
                                                        {new URL(url).hostname.replace('www.', '')}
                                                    </p>
                                                    <span className="text-[9px] text-gray-400 italic truncate max-w-full">
                                                        Click View to Expand
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-ncc-navy/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                            <a 
                                                href={url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="w-12 h-12 bg-ncc-gold rounded-full text-ncc-navy flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                                                title="Open Original"
                                            >
                                                <ExternalLink className="w-6 h-6" />
                                            </a>
                                            {userRole === 'admin' && (
                                                <button 
                                                    onClick={() => handleDelete(url)}
                                                    disabled={deletingUrl === url}
                                                    className="w-12 h-12 bg-red-500 rounded-full text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                                                    title="Remove Link"
                                                >
                                                    {deletingUrl === url ? <Loader className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-8 py-2.5 bg-white border border-gray-300 text-ncc-navy font-black rounded-xl hover:bg-gray-100 transition-all text-xs uppercase tracking-widest"
                    >
                        Close Gallery
                    </button>
                </div>
            </div>
        </ModalOverlay>
    );
};
