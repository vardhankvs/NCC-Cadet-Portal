// src/features/References/ReferenceForm.jsx
import React, { useState } from 'react'; // Removed useEffect
import { InputField } from '../../components/ui/InputField.jsx';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { XCircle, Loader, LinkIcon } from '../../components/Icons.jsx';
import {
    saveReferenceLink,
    updateReferenceLink,
} from '../../firebase/firestoreService.js';

export const ReferenceForm = ({
    currentReference,
    onSaveSuccess,
    onCancel,
}) => {
    const [title, setTitle] = useState(currentReference?.title || '');
    const [downloadURL, setDownloadURL] = useState(
        currentReference?.downloadURL || ''
    );
    const [formError, setFormError] = useState(null);
    const [loading, setLoading] = useState(false);

    const isEditMode = !!currentReference;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        if (!title || !downloadURL) {
            setFormError('Title and a direct link (URL) are both required.');
            return;
        }
        if (!downloadURL.startsWith('http')) {
            setFormError(
                'The link must be a valid URL starting with http:// or https://.'
            );
            return;
        }
        setLoading(true);
        try {
            if (isEditMode) {
                await updateReferenceLink(
                    currentReference.id,
                    title,
                    downloadURL
                );
            } else {
                await saveReferenceLink(title, downloadURL);
            }
            onSaveSuccess();
        } catch (e) {
            setFormError(e.message);
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="p-6 bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto"
        >
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b pb-3">
                <h2 className="text-2xl font-bold text-gray-900">
                    {isEditMode
                        ? 'Edit Reference Link'
                        : 'Add New Reference Link'}
                </h2>
                <button type="button" onClick={onCancel} title="Close">
                    <XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                </button>
            </div>
            {formError && (
                <div className="mb-4">
                    <ErrorDisplay message={formError} />
                </div>
            )}

            {/* Input Fields */}
            <InputField
                label="Document Title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Rifle Drill Manual"
            />
            <InputField
                label="Direct Download Link (URL)"
                name="downloadURL"
                type="url"
                value={downloadURL}
                onChange={(e) => setDownloadURL(e.target.value)}
                placeholder="https://drive.google.com/..."
            />

            <p className="text-xs text-gray-500 mb-6 flex items-center">
                <LinkIcon className="w-3 h-3 mr-1" />
                Tip: Ensure the link is publicly shareable (e.g., Google Drive
                &quot;Anyone with link&quot;). {/* Fixed quotes */}
            </p>

            {/* Buttons */}
            <div className="flex justify-end space-x-4 mt-6">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:bg-gray-100"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center"
                >
                    {loading && (
                        <Loader className="animate-spin w-4 h-4 mr-2" />
                    )}
                    {loading
                        ? 'Saving...'
                        : isEditMode
                          ? 'Update Link'
                          : 'Save Link'}
                </button>
            </div>
        </form>
    );
};
