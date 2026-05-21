// src/features/Events/GalleryModal.jsx
import React, { useState } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { InputField } from '../../components/ui/InputField.jsx';
import {
    addImageToEvent,
    deleteImageFromEvent,
} from '../../firebase/firestoreService.js';
import {
    ImageIcon,
    XCircle,
    Plus,
    Loader,
    Trash2,
    LinkIcon,
} from '../../components/Icons.jsx';

export const GalleryModal = ({ event, onClose }) => {
    const { userRole } = useAuthContext();
    const [newImageUrl, setNewImageUrl] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [deletingUrl, setDeletingUrl] = useState(null);
    const [error, setError] = useState(null);

    const handleAddClick = async () => {
        const url = newImageUrl.trim();
        if (!url) {
            setError('Please paste a link to an image or file.');
            return;
        }

        setIsAdding(true);
        setError(null);
        try {
            await addImageToEvent(event.id, url);
            setNewImageUrl(''); // Clear input on success
        } catch (e) {
            setError(e.message);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteImage = async (url) => {
        setDeletingUrl(url);
        setError(null);
        try {
            await deleteImageFromEvent(event.id, url);
        } catch (e) {
            setError(e.message);
        } finally {
            setDeletingUrl(null);
        }
    };

    // Ensure imageUrls is always an array
    const imageUrls = Array.isArray(event?.imageUrls) ? event.imageUrls : [];

    return (
        <ModalOverlay wide={true}>
            <div className="flex max-h-[80vh] flex-col rounded-xl bg-white dark:bg-[#050b14] p-6 shadow-2xl">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between border-b pb-3">
                    <h2 className="flex items-center text-2xl font-bold text-gray-900 dark:text-white">
                        <ImageIcon className="mr-2 h-6 w-6 text-indigo-600" /> Event
                        Gallery: {event.name}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        title="Close Gallery"
                        className="text-gray-400 dark:text-white/80 hover:text-gray-600 dark:text-white/80"
                    >
                        <XCircle className="h-6 w-6" />
                    </button>
                </div>

                {/* URL Input Section - Only for Admin */}
                {userRole === 'admin' && (
                    <div className="mb-4 flex flex-col space-y-2 sm:flex-row sm:items-start sm:space-x-2 sm:space-y-0">
                        <InputField
                            label=""
                            name="imageUrl"
                            type="url"
                            placeholder="Paste link here (Image, Drive Share Link, etc.)"
                            value={newImageUrl}
                            onChange={(e) => {
                                setNewImageUrl(e.target.value);
                                setError(null);
                            }}
                            required={false}
                            className="mb-0 flex-grow"
                        />
                        <button
                            onClick={handleAddClick}
                            disabled={isAdding || !newImageUrl.trim()}
                            className={`flex w-full items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-white shadow transition duration-150 sm:w-auto ${
                                isAdding || !newImageUrl.trim()
                                    ? 'cursor-not-allowed bg-gray-400'
                                    : 'bg-green-500 hover:bg-green-600'
                            }`}
                        >
                            {isAdding ? (
                                <Loader className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="mr-1 h-4 w-4" />
                            )}
                            Add
                        </button>
                    </div>
                )}

                {/* Admin Note */}
                {userRole === 'admin' && (
                    <p className="mb-4 flex items-center text-xs text-gray-500 dark:text-white/70">
                        <LinkIcon className="mr-1 h-3 w-3" /> Note: For Google
                        Drive, ensure the link is set to &quot;Anyone with the
                        link can view.&quot;
                    </p>
                )}

                {/* Error Display */}
                {error && (
                    <div className="mb-4">
                        <ErrorDisplay message={error} />
                    </div>
                )}

                {/* Image Grid */}
                <div className="flex-grow overflow-y-auto">
                    {imageUrls.length === 0 ? (
                        <p className="py-8 text-center text-gray-500 dark:text-white/70">
                            No images added yet.
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                            {imageUrls.map((url, index) => (
                                <div
                                    key={`${url}-${index}`} // Use URL + index for a more stable key
                                    className="group relative aspect-square overflow-hidden rounded-lg bg-gray-200 shadow"
                                >
                                    <img
                                        src={url}
                                        alt={`Event content ${index + 1}`} // Generic alt text
                                        className={`h-full w-full object-cover transition duration-300 ${
                                            // Heuristic check for common image extensions
                                            /\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i.test(
                                                url
                                            )
                                                ? 'group-hover:opacity-75'
                                                : 'flex items-center justify-center bg-gray-700 p-4 text-white' // Style for non-image links
                                        }`}
                                        onError={(e) => {
                                            e.target.onerror = null; // Prevent infinite loop
                                            e.target.src =
                                                'https://placehold.co/300x300/e2e8f0/94a3b8?text=Invalid+Link';
                                        }}
                                    />

                                    {/* Link Icon Overlay for non-image files */}
                                    {!/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i.test(
                                        url
                                    ) && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/80 p-2 text-center text-white">
                                            <LinkIcon className="mb-1 h-6 w-6" />
                                            <span className="text-xs font-medium">
                                                External Link
                                            </span>
                                        </div>
                                    )}

                                    {/* Link Button (always clickable) */}
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute bottom-1 left-1 rounded-lg bg-indigo-600 px-2 py-1 text-xs text-white shadow-md transition hover:bg-indigo-700"
                                    >
                                        View
                                    </a>

                                    {/* Delete Button - Only for Admin */}
                                    {userRole === 'admin' && (
                                        <button
                                            onClick={() =>
                                                handleDeleteImage(url)
                                            }
                                            disabled={deletingUrl === url}
                                            className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white shadow-md opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-700 disabled:bg-gray-400"
                                            title="Delete Link"
                                        >
                                            {deletingUrl === url ? (
                                                <Loader className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                        </button>
                                    )}
                                    {/* Deleting Overlay */}
                                    {deletingUrl === url && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-[#050b14]/50">
                                            <Loader className="h-6 w-6 animate-spin text-red-600" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Close Button */}
                <div className="mt-6 flex justify-end border-t pt-4">
                    <button
                        onClick={onClose}
                        className="rounded bg-gray-200 px-4 py-2 text-sm transition hover:bg-gray-300"
                    >
                        Close
                    </button>
                </div>
            </div>
        </ModalOverlay>
    );
};
